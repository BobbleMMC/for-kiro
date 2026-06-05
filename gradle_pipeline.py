"""
Minecraft Mod Generator - Gradle Pipeline System
================================================
Build, Clean, Run, Test komandalarni boshqaruvchi tizim.
Multi-Agent bilan to'liq integratsiya.

Tuzilma:
  GradleCommand      - Bitta komanda (build/clean/run/test)
  GradleResult       - Komanda natijasi (stdout, stderr, exit_code)
  BuildLogAnalyzer   - Log'lardan xatolarni ajratib oladi
  GradlePipeline     - Asosiy pipeline (komandalarni ketma-ket bajaradi)
  PipelineIntegrator - Multi-Agent bilan ko'prik
"""

import os
import json
import time
import subprocess
import threading
import re
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Callable
from enum import Enum
from pathlib import Path


# ─────────────────────────────────────────────
#  ENUMS
# ─────────────────────────────────────────────

class CommandType(Enum):
    CLEAN     = "clean"
    BUILD     = "build"
    TEST      = "test"
    RUN       = "runClient"
    COMPILE   = "compileJava"
    JAR       = "jar"
    DEPS      = "dependencies"
    CUSTOM    = "custom"


class BuildStatus(Enum):
    PENDING   = "pending"
    RUNNING   = "running"
    SUCCESS   = "success"
    FAILED    = "failed"
    CANCELLED = "cancelled"


class IssueLevel(Enum):
    ERROR   = "error"
    WARNING = "warning"
    INFO    = "info"


# ─────────────────────────────────────────────
#  DATACLASSES
# ─────────────────────────────────────────────

@dataclass
class GradleCommand:
    """Bitta Gradle komandasi"""
    type:        CommandType
    extra_args:  List[str] = field(default_factory=list)
    timeout_sec: int       = 300          # default 5 daqiqa
    description: str       = ""

    def to_args(self) -> List[str]:
        base = self.type.value if self.type != CommandType.CUSTOM else ""
        parts = (["./gradlew"] if os.name != "nt" else ["gradlew.bat"])
        if base:
            parts.append(base)
        parts.extend(self.extra_args)
        return parts


@dataclass
class BuildIssue:
    """Bitta xato yoki ogohlantirish"""
    level:      IssueLevel
    message:    str
    file:       Optional[str] = None
    line:       Optional[int] = None
    column:     Optional[int] = None
    suggestion: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            "level":      self.level.value,
            "message":    self.message,
            "file":       self.file,
            "line":       self.line,
            "column":     self.column,
            "suggestion": self.suggestion,
        }


@dataclass
class GradleResult:
    """Komanda natijasi"""
    command:       GradleCommand
    status:        BuildStatus
    stdout:        str          = ""
    stderr:        str          = ""
    exit_code:     int          = -1
    duration_sec:  float        = 0.0
    issues:        List[BuildIssue] = field(default_factory=list)
    started_at:    float        = field(default_factory=time.time)
    finished_at:   float        = 0.0

    @property
    def success(self) -> bool:
        return self.status == BuildStatus.SUCCESS

    @property
    def error_count(self) -> int:
        return sum(1 for i in self.issues if i.level == IssueLevel.ERROR)

    @property
    def warning_count(self) -> int:
        return sum(1 for i in self.issues if i.level == IssueLevel.WARNING)

    def summary(self) -> str:
        icon = "✅" if self.success else "❌"
        return (
            f"{icon} [{self.command.type.value}] "
            f"{'SUCCESS' if self.success else 'FAILED'} "
            f"| {self.duration_sec:.1f}s "
            f"| errors={self.error_count} warnings={self.warning_count}"
        )


# ─────────────────────────────────────────────
#  TASK 1 – BUILDLOGANALYZER
# ─────────────────────────────────────────────

class BuildLogAnalyzer:
    """
    Gradle log chiqishidan xatolar, ogohlantirishlar va
    foydali ma'lumotlarni ajratib oladi.
    """

    # Java kompilyator xatosi:  path/File.java:12: error: ...
    _JAVA_ERROR_RE   = re.compile(
        r"(?P<file>[^\s:]+\.java):(?P<line>\d+):\s*"
        r"(?P<level>error|warning):\s*(?P<msg>.+)"
    )

    # Gradle o'zining xabarlari
    _GRADLE_FAIL_RE  = re.compile(r"BUILD FAILED")
    _GRADLE_OK_RE    = re.compile(r"BUILD SUCCESSFUL")
    _TASK_FAILED_RE  = re.compile(r"FAILED\s*$", re.MULTILINE)

    # Dependency conflict
    _DEP_CONFLICT_RE = re.compile(
        r"Could not resolve (?P<dep>[^\s]+)"
    )

    # Out of memory
    _OOM_RE          = re.compile(r"OutOfMemoryError")

    # Timeout / daemon
    _DAEMON_RE       = re.compile(r"Gradle daemon.*stopped|Could not connect to Gradle daemon")

    def analyze(self, result: GradleResult) -> List[BuildIssue]:
        """stdout + stderr ni tahlil qilib, issues ro'yxatini qaytaradi."""
        issues: List[BuildIssue] = []
        combined = result.stdout + "\n" + result.stderr

        # Java compiler xatolar / ogohlantirishlar
        for m in self._JAVA_ERROR_RE.finditer(combined):
            level = IssueLevel.ERROR if m.group("level") == "error" else IssueLevel.WARNING
            issues.append(BuildIssue(
                level   = level,
                message = m.group("msg").strip(),
                file    = m.group("file"),
                line    = int(m.group("line")),
                suggestion = self._suggest_java(m.group("msg")),
            ))

        # Dependency conflict
        for m in self._DEP_CONFLICT_RE.finditer(combined):
            issues.append(BuildIssue(
                level      = IssueLevel.ERROR,
                message    = f"Dependency resolve failed: {m.group('dep')}",
                suggestion = "Check build.gradle dependencies block and version catalog.",
            ))

        # Out of memory
        if self._OOM_RE.search(combined):
            issues.append(BuildIssue(
                level      = IssueLevel.ERROR,
                message    = "OutOfMemoryError: JVM heap too small.",
                suggestion = 'Add  org.gradle.jvmargs=-Xmx2g  in gradle.properties',
            ))

        # Daemon problem
        if self._DAEMON_RE.search(combined):
            issues.append(BuildIssue(
                level      = IssueLevel.WARNING,
                message    = "Gradle daemon problem detected.",
                suggestion = "Run:  ./gradlew --stop  then retry.",
            ))

        # Agar hech narsa topilmagan, lekin exit_code != 0 bo'lsa
        if result.exit_code != 0 and not issues:
            issues.append(BuildIssue(
                level   = IssueLevel.ERROR,
                message = f"Build exited with code {result.exit_code}. Check full log.",
            ))

        result.issues = issues
        return issues

    # ── Kontekstga qarab oddiy tavsiya ──────────────────────────────────
    def _suggest_java(self, msg: str) -> Optional[str]:
        msg_l = msg.lower()
        if "cannot find symbol"    in msg_l:
            return "Check imports or class/method name spelling."
        if "incompatible types"    in msg_l:
            return "Verify variable types and casts."
        if "unchecked"             in msg_l:
            return "Add @SuppressWarnings(\"unchecked\") or use generics properly."
        if "does not override"     in msg_l:
            return "Confirm the parent class has this method signature."
        if "unreachable statement" in msg_l:
            return "Remove code after return/throw/break."
        if "missing return"        in msg_l:
            return "Add return statement to all code paths."
        return None


# ─────────────────────────────────────────────
#  TASK 1 – GRADLEPIPELINE
# ─────────────────────────────────────────────

class GradlePipeline:
    """
    Gradle komandalarini ketma-ket yoki parallel bajaradi.

    Misol:
        pipeline = GradlePipeline(project_root="/path/to/mod")
        result   = pipeline.run(CommandType.BUILD)
    """

    def __init__(
        self,
        project_root: str = ".",
        on_log: Optional[Callable[[str], None]] = None,
    ):
        self.project_root = Path(project_root).resolve()
        self.on_log       = on_log or print
        self.analyzer     = BuildLogAnalyzer()
        self.history:     List[GradleResult] = []

    # ── Yordamchi: loglash ────────────────────────────────────────────
    def _log(self, msg: str) -> None:
        self.on_log(msg)

    # ── Bitta komandani bajarish ───────────────────────────────────────
    def run(
        self,
        command_type: CommandType,
        extra_args:   List[str] = None,
        timeout_sec:  int       = 300,
    ) -> GradleResult:

        cmd = GradleCommand(
            type        = command_type,
            extra_args  = extra_args or [],
            timeout_sec = timeout_sec,
            description = f"{command_type.value} task",
        )

        result = GradleResult(command=cmd, status=BuildStatus.RUNNING)
        self._log(f"\n{'─'*60}")
        self._log(f"▶  {' '.join(cmd.to_args())}")
        self._log(f"{'─'*60}")

        # Haqiqiy Gradle mavjudligini tekshirish
        gradle_wrapper = self.project_root / (
            "gradlew" if os.name != "nt" else "gradlew.bat"
        )
        if not gradle_wrapper.exists():
            # Gradle yo'q → simulyatsiya rejimi
            return self._simulate(result)

        try:
            t0 = time.time()
            proc = subprocess.Popen(
                cmd.to_args(),
                cwd    = self.project_root,
                stdout = subprocess.PIPE,
                stderr = subprocess.PIPE,
                text   = True,
            )

            # stdout ni real-vaqtda chiqarish
            stdout_lines: List[str] = []
            def _stream(pipe, buf):
                for line in iter(pipe.readline, ""):
                    self._log(f"  {line.rstrip()}")
                    buf.append(line)
                pipe.close()

            t_out = threading.Thread(target=_stream, args=(proc.stdout, stdout_lines))
            t_out.start()

            try:
                proc.wait(timeout=timeout_sec)
            except subprocess.TimeoutExpired:
                proc.kill()
                result.status    = BuildStatus.FAILED
                result.stderr    = "TIMEOUT"
                result.exit_code = -9
                result.issues.append(BuildIssue(
                    level      = IssueLevel.ERROR,
                    message    = f"Build timed out after {timeout_sec}s",
                    suggestion = "Increase timeout or optimize the build.",
                ))
                self._finalize(result, t0)
                self.history.append(result)
                return result

            t_out.join()
            result.stdout    = "".join(stdout_lines)
            result.stderr    = proc.stderr.read()
            result.exit_code = proc.returncode
            result.status    = (
                BuildStatus.SUCCESS if proc.returncode == 0 else BuildStatus.FAILED
            )

        except FileNotFoundError:
            result.status    = BuildStatus.FAILED
            result.stderr    = "gradlew not found"
            result.exit_code = 127
            result.issues.append(BuildIssue(
                level      = IssueLevel.ERROR,
                message    = "gradlew executable not found.",
                suggestion = "Run `gradle wrapper` to generate gradlew.",
            ))

        # Log tahlili
        self.analyzer.analyze(result)
        self._finalize(result, time.time() - (result.started_at or time.time()))
        self.history.append(result)
        self._print_summary(result)
        return result

    def _finalize(self, result: GradleResult, t0: float) -> None:
        result.finished_at  = time.time()
        result.duration_sec = result.finished_at - result.started_at

    def _print_summary(self, result: GradleResult) -> None:
        self._log("")
        self._log(result.summary())
        if result.issues:
            self._log(f"  Issues ({len(result.issues)}):")
            for issue in result.issues:
                icon = "❌" if issue.level == IssueLevel.ERROR else "⚠️ "
                self._log(f"    {icon}  {issue.message}")
                if issue.file:
                    self._log(f"        📄 {issue.file}:{issue.line}")
                if issue.suggestion:
                    self._log(f"        💡 {issue.suggestion}")

    # ── Simulyatsiya (Gradle wrapper yo'q bo'lganda) ───────────────────
    def _simulate(self, result: GradleResult) -> GradleResult:
        """
        Haqiqiy Gradle o'rnatilmagan muhitlar uchun simulyatsiya.
        Natijalar pipeline logic'ini sinovdan o'tkazish uchun.
        """
        cmd_type = result.command.type
        self._log(f"  [SIM] gradlew not found → simulation mode")
        time.sleep(0.3)          # "kompilatsiya" ni taqlid qilamiz

        fake_outputs = {
            CommandType.CLEAN: (
                "BUILD SUCCESSFUL in 0s\n1 actionable task: 1 executed",
                BuildStatus.SUCCESS, 0,
            ),
            CommandType.COMPILE: (
                "src/main/java/com/mymod/blocks/EmeraldOre.java:15: "
                "error: cannot find symbol\n"
                "BUILD FAILED\n2 actionable tasks: 2 executed",
                BuildStatus.FAILED, 1,
            ),
            CommandType.BUILD: (
                "BUILD SUCCESSFUL in 4s\n5 actionable tasks: 5 executed",
                BuildStatus.SUCCESS, 0,
            ),
            CommandType.TEST: (
                "tests passed: 12, failed: 0, skipped: 0\n"
                "BUILD SUCCESSFUL in 2s",
                BuildStatus.SUCCESS, 0,
            ),
            CommandType.RUN: (
                "[main/INFO]: Minecraft running\n"
                "[main/INFO]: Mod EmeraldMod loaded\n"
                "BUILD SUCCESSFUL in 6s",
                BuildStatus.SUCCESS, 0,
            ),
            CommandType.JAR: (
                "BUILD SUCCESSFUL in 3s\n"
                "Output: build/libs/EmeraldMod-1.0.jar",
                BuildStatus.SUCCESS, 0,
            ),
        }

        stdout, status, exit_code = fake_outputs.get(
            cmd_type,
            ("BUILD SUCCESSFUL in 1s", BuildStatus.SUCCESS, 0),
        )

        result.stdout    = stdout
        result.stderr    = ""
        result.exit_code = exit_code
        result.status    = status

        self.analyzer.analyze(result)
        result.finished_at  = time.time()
        result.duration_sec = result.finished_at - result.started_at
        self.history.append(result)
        self._print_summary(result)
        return result

    # ── Oldindan belgilangan pipeline'lar ─────────────────────────────
    def full_build(self) -> List[GradleResult]:
        """clean → compileJava → build"""
        results = []
        for cmd in [CommandType.CLEAN, CommandType.COMPILE, CommandType.BUILD]:
            r = self.run(cmd)
            results.append(r)
            if not r.success and cmd != CommandType.CLEAN:
                self._log("⛔ Pipeline stopped due to failure.")
                break
        return results

    def quick_build(self) -> GradleResult:
        """Faqat build (tezkor)"""
        return self.run(CommandType.BUILD, extra_args=["--parallel", "--build-cache"])

    def test_and_build(self) -> List[GradleResult]:
        """test → build"""
        results = []
        for cmd in [CommandType.TEST, CommandType.BUILD]:
            r = self.run(cmd)
            results.append(r)
            if not r.success:
                break
        return results

    # ── Statistika ────────────────────────────────────────────────────
    def stats(self) -> Dict:
        total   = len(self.history)
        success = sum(1 for r in self.history if r.success)
        failed  = total - success
        return {
            "total_runs":       total,
            "success":          success,
            "failed":           failed,
            "success_rate_pct": round(success / total * 100, 1) if total else 0,
            "total_issues":     sum(len(r.issues) for r in self.history),
            "last_status":      self.history[-1].status.value if self.history else "none",
        }



# ─────────────────────────────────────────────
#  TASK 3 – MULTI-AGENT INTEGRATSIYA
# ─────────────────────────────────────────────

# multi_agent_system moduli import
try:
    from multi_agent_system import (
        MultiAgentOrchestrator,
        AgentType,
        AgentStatus,
        Task,
        ReviewerAgent as _BaseReviewerAgent,
        AgentConfig,
        BaseAgent,
    )
    _AGENTS_AVAILABLE = True
except ImportError:
    _AGENTS_AVAILABLE = False


class GradleAwareReviewerAgent(_BaseReviewerAgent if _AGENTS_AVAILABLE else object):
    """
    ReviewerAgent + Gradle Pipeline integratsiyasi.

    Qo'shimcha qobiliyatlar:
      • Gradle build natijasini (GradleResult) qabul qilib tahlil qiladi
      • BuildLogAnalyzer topgan xatolarni AI formatiga o'tkazadi
      • Xatolar uchun Java kodi darajasida tavsiyalar beradi
    """

    def __init__(self):
        if _AGENTS_AVAILABLE:
            super().__init__()
            self.config.name = "Gradle-Aware Reviewer Agent"

        self._log_analyzer = BuildLogAnalyzer()

    # ── Asosiy yangi metod ────────────────────────────────────────────
    def review_build(self, gradle_result: "GradleResult") -> Dict:
        """
        GradleResult obyektini qabul qiladi va:
          1. BuildLogAnalyzer orqali xatolarni ajratadi
          2. Har bir xato uchun tavsiya shakllantiradi
          3. Umumiy baho (PASS / FAIL) qaytaradi
        """
        # Analyzer allaqachon ishlatilgan bo'lishi mumkin; qayta ishlatamiz
        issues = self._log_analyzer.analyze(gradle_result)

        report = {
            "build_status":   gradle_result.status.value,
            "exit_code":      gradle_result.exit_code,
            "duration_sec":   round(gradle_result.duration_sec, 2),
            "passed":         gradle_result.success,
            "error_count":    gradle_result.error_count,
            "warning_count":  gradle_result.warning_count,
            "issues":         [i.to_dict() for i in issues],
            "ai_suggestions": self._ai_suggestions(issues),
            "agent":          getattr(self, "config", type("c", (), {"name": "Reviewer"})()).name,
            "timestamp":      time.time(),
        }

        self._print_report(report)
        return report

    # ── AI tavsiyalar ─────────────────────────────────────────────────
    def _ai_suggestions(self, issues: List["BuildIssue"]) -> List[str]:
        """
        Xatolar ro'yxatiga qarab umumiy harakatlar tavsiya qiladi.
        Real tizimda bu yerda Claude / Llama API chaqiruvi bo'ladi.
        """
        suggestions = []
        errors   = [i for i in issues if i.level == IssueLevel.ERROR]
        warnings = [i for i in issues if i.level == IssueLevel.WARNING]

        if not issues:
            suggestions.append("✅ No issues found. Build is clean.")
            return suggestions

        if any("cannot find symbol" in (i.message or "") for i in errors):
            suggestions.append(
                "🔧 'cannot find symbol' errors detected. "
                "Check that all Minecraft Forge API imports match your MC version "
                "(e.g. 1.19.x uses net.minecraft.world.level.block.Block)."
            )

        if any("OutOfMemory" in (i.message or "") for i in errors):
            suggestions.append(
                "💾 JVM heap exhausted. "
                "Add  org.gradle.jvmargs=-Xmx2g -XX:MaxMetaspaceSize=512m  "
                "to gradle.properties."
            )

        if any("dependency" in (i.message or "").lower() for i in errors):
            suggestions.append(
                "📦 Dependency conflict. Run  ./gradlew dependencies  "
                "to inspect the tree, then pin the conflicting version in build.gradle."
            )

        if any("daemon" in (i.message or "").lower() for i in warnings):
            suggestions.append(
                "⚙️  Gradle daemon issue. Run  ./gradlew --stop  "
                "to kill stale daemons, then retry."
            )

        if len(errors) > 5:
            suggestions.append(
                "⚠️  Many errors detected. Consider running  ./gradlew compileJava  "
                "alone first to isolate compilation problems before full build."
            )

        return suggestions

    # ── Chiroyli chiqarish ─────────────────────────────────────────────
    def _print_report(self, report: Dict) -> None:
        icon = "✅" if report["passed"] else "❌"
        print(f"\n{'═'*60}")
        print(f"  {icon}  REVIEWER REPORT  |  {report['build_status'].upper()}")
        print(f"{'═'*60}")
        print(f"  Duration : {report['duration_sec']}s")
        print(f"  Errors   : {report['error_count']}")
        print(f"  Warnings : {report['warning_count']}")
        if report["issues"]:
            print(f"\n  Issues:")
            for issue in report["issues"]:
                lvl  = "❌" if issue["level"] == "error" else "⚠️ "
                loc  = f"  {issue['file']}:{issue['line']}" if issue.get("file") else ""
                print(f"    {lvl} {issue['message']}{loc}")
                if issue.get("suggestion"):
                    print(f"       💡 {issue['suggestion']}")
        if report["ai_suggestions"]:
            print(f"\n  AI Suggestions:")
            for s in report["ai_suggestions"]:
                print(f"    • {s}")
        print(f"{'═'*60}\n")


class PipelineIntegrator:
    """
    GradlePipeline  +  MultiAgentOrchestrator  ko'prigi.

    Hayot tsikli:
      1. MultiAgentOrchestrator kod generatsiya qiladi
      2. GradlePipeline yordamida build/test bajaradi
      3. GradleAwareReviewerAgent build natijasini tahlil qiladi
      4. Xatolar topilsa → LogicAgent kodning tegishli qismini tuzatadi
      5. Tozalik tekshiruvi o'tgunicha qayta urinadi (max_retries)
    """

    def __init__(
        self,
        project_root: str = ".",
        max_retries:  int = 3,
        on_log: Optional[Callable[[str], None]] = None,
    ):
        self.pipeline  = GradlePipeline(project_root=project_root, on_log=on_log or print)
        self.reviewer  = GradleAwareReviewerAgent()
        self.max_retries = max_retries

        # MultiAgentOrchestrator faqat agents mavjud bo'lsa yaratiladi
        self.orchestrator = MultiAgentOrchestrator() if _AGENTS_AVAILABLE else None

        self._run_log: List[Dict] = []   # har bir urinishning natijasi

    # ── To'liq integratsion pipeline ─────────────────────────────────
    def run_full_cycle(self, project_data: Dict) -> Dict:
        """
        Kod generatsiya → Build → Review → (Retry) siklini bajaradi.
        """
        print(f"\n{'█'*65}")
        print(f"  🚀  FULL INTEGRATION CYCLE  |  {project_data.get('project_name','?')}")
        print(f"{'█'*65}\n")

        # ── 1. Kod generatsiya (Multi-Agent) ──────────────────────────
        agent_results = {}
        if self.orchestrator:
            print("🤖 Step 1/3 — Multi-Agent kod generatsiyasi...")
            agent_results = self.orchestrator.execute_pipeline(project_data)
        else:
            print("⚠️  Multi-Agent mavjud emas, build to'g'ridan bajariladi.")

        # ── 2. Build (Gradle) ─────────────────────────────────────────
        attempt   = 0
        last_report: Dict = {}

        while attempt < self.max_retries:
            attempt += 1
            print(f"\n🏗️  Step 2/3 — Build urinish #{attempt} ...")

            build_results = self.pipeline.full_build()   # clean → compile → build
            last_build    = build_results[-1]            # oxirgi natija

            # ── 3. Review (Reviewer Agent) ────────────────────────────
            print(f"\n🔍 Step 3/3 — Reviewer Agent tahlili (urinish #{attempt})...")
            last_report = self.reviewer.review_build(last_build)

            self._run_log.append({
                "attempt":      attempt,
                "build_status": last_build.status.value,
                "passed":       last_report["passed"],
                "error_count":  last_report["error_count"],
                "timestamp":    time.time(),
            })

            # Muvaffaqiyatli bo'lsa → to'xtatamiz
            if last_report["passed"]:
                print(f"✅ Build PASSED on attempt #{attempt}!")
                break

            # Xato bor → LogicAgent tuzatishga urinadi
            if attempt < self.max_retries and self.orchestrator:
                print(f"\n🔄 LogicAgent xatolarni tuzatishga urinmoqda...")
                self._request_fix(last_report, project_data)
            else:
                print(f"❌ Max retries ({self.max_retries}) reached. Build FAILED.")

        return {
            "project":       project_data.get("project_name"),
            "attempts":      attempt,
            "final_passed":  last_report.get("passed", False),
            "agent_results": agent_results,
            "review_report": last_report,
            "run_log":       self._run_log,
            "pipeline_stats": self.pipeline.stats(),
        }

    # ── Xatolarni LogicAgent ga yuborish ─────────────────────────────
    def _request_fix(self, report: Dict, project_data: Dict) -> None:
        """
        Reviewer topgan xatolarni LogicAgent ga taqdim etadi.
        Real tizimda bu yerda AI API chaqiruvi bo'ladi.
        """
        errors = [i for i in report.get("issues", []) if i["level"] == "error"]
        if not errors or not self.orchestrator:
            return

        fix_task = self.orchestrator.create_task(
            description = "Fix build errors reported by ReviewerAgent",
            agent_type  = AgentType.LOGIC,
            input_data  = {
                "type":         "fix",
                "errors":       errors,
                "suggestions":  report.get("ai_suggestions", []),
                "project_data": project_data,
            },
        )
        self.orchestrator.agents[AgentType.LOGIC].process_task(fix_task)

    # ── Tezkor yordamchi metodlar ─────────────────────────────────────
    def quick_review(self, command: CommandType = CommandType.BUILD) -> Dict:
        """Faqat bitta komanda ishlatib review qiladi (to'liq tsikl emas)."""
        result = self.pipeline.run(command)
        return self.reviewer.review_build(result)

    def history_summary(self) -> Dict:
        """Barcha urinishlar tarixi."""
        return {
            "total_cycles": len(self._run_log),
            "passed":       sum(1 for r in self._run_log if r["passed"]),
            "failed":       sum(1 for r in self._run_log if not r["passed"]),
            "run_log":      self._run_log,
            "pipeline":     self.pipeline.stats(),
        }
