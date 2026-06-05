"""
test_gradle_pipeline.py
=======================
GradlePipeline, BuildLogAnalyzer, GradleAwareReviewerAgent
va PipelineIntegrator uchun to'liq test suite.

Ishlatish:
    python3 test_gradle_pipeline.py
"""

import sys
import time
import traceback
from typing import List, Tuple

# ── import ────────────────────────────────────────────────────────────
from gradle_pipeline import (
    CommandType,
    BuildStatus,
    IssueLevel,
    GradleCommand,
    GradleResult,
    BuildIssue,
    BuildLogAnalyzer,
    GradlePipeline,
    GradleAwareReviewerAgent,
    PipelineIntegrator,
)

# ─────────────────────────────────────────────────────────────────────
#  Minimal test runner (stdlib only – unittest yo'q)
# ─────────────────────────────────────────────────────────────────────

_PASS: List[str] = []
_FAIL: List[Tuple[str, str]] = []


def test(name: str):
    """Dekorator: test funksiyasini ro'yxatga oladi."""
    def decorator(fn):
        def wrapper():
            try:
                fn()
                _PASS.append(name)
                print(f"  ✅  {name}")
            except AssertionError as e:
                _FAIL.append((name, str(e)))
                print(f"  ❌  {name}  →  {e}")
            except Exception as e:
                _FAIL.append((name, traceback.format_exc()))
                print(f"  💥  {name}  →  {e}")
        wrapper()          # darhol chaqiriladi
        return wrapper
    return decorator


def assert_eq(a, b, msg=""):
    assert a == b, msg or f"expected {b!r}, got {a!r}"


def assert_true(cond, msg=""):
    assert cond, msg or "condition is False"


def assert_false(cond, msg=""):
    assert not cond, msg or "condition is True"


def assert_in(item, container, msg=""):
    assert item in container, msg or f"{item!r} not in {container!r}"


# ─────────────────────────────────────────────────────────────────────
#  1 – GradleCommand
# ─────────────────────────────────────────────────────────────────────
print("\n── GradleCommand ─────────────────────────────────────────────")

@test("GradleCommand.to_args() BUILD")
def _():
    cmd  = GradleCommand(CommandType.BUILD)
    args = cmd.to_args()
    assert_in("build", args)

@test("GradleCommand.to_args() extra_args qo'shiladi")
def _():
    cmd  = GradleCommand(CommandType.BUILD, extra_args=["--parallel"])
    args = cmd.to_args()
    assert_in("--parallel", args)

@test("GradleCommand.to_args() CLEAN")
def _():
    cmd  = GradleCommand(CommandType.CLEAN)
    assert_in("clean", cmd.to_args())

@test("GradleCommand.to_args() TEST")
def _():
    cmd = GradleCommand(CommandType.TEST)
    assert_in("test", cmd.to_args())

@test("GradleCommand.to_args() RUN (runClient)")
def _():
    cmd = GradleCommand(CommandType.RUN)
    assert_in("runClient", cmd.to_args())

# ─────────────────────────────────────────────────────────────────────
#  2 – GradleResult
# ─────────────────────────────────────────────────────────────────────
print("\n── GradleResult ──────────────────────────────────────────────")

@test("GradleResult.success → True when SUCCESS")
def _():
    r = GradleResult(
        command=GradleCommand(CommandType.BUILD),
        status=BuildStatus.SUCCESS,
        exit_code=0,
    )
    assert_true(r.success)

@test("GradleResult.success → False when FAILED")
def _():
    r = GradleResult(
        command=GradleCommand(CommandType.BUILD),
        status=BuildStatus.FAILED,
        exit_code=1,
    )
    assert_false(r.success)

@test("GradleResult.error_count va warning_count to'g'ri hisoblanadi")
def _():
    r = GradleResult(
        command=GradleCommand(CommandType.BUILD),
        status=BuildStatus.FAILED,
        issues=[
            BuildIssue(IssueLevel.ERROR,   "err1"),
            BuildIssue(IssueLevel.ERROR,   "err2"),
            BuildIssue(IssueLevel.WARNING, "warn1"),
        ],
    )
    assert_eq(r.error_count,   2)
    assert_eq(r.warning_count, 1)

@test("GradleResult.summary() muvaffaqiyatli holatda '✅' o'z ichiga oladi")
def _():
    r = GradleResult(
        command=GradleCommand(CommandType.BUILD),
        status=BuildStatus.SUCCESS,
        exit_code=0,
    )
    assert_in("✅", r.summary())

@test("GradleResult.summary() muvaffaqiyatsiz holatda '❌' o'z ichiga oladi")
def _():
    r = GradleResult(
        command=GradleCommand(CommandType.BUILD),
        status=BuildStatus.FAILED,
        exit_code=1,
    )
    assert_in("❌", r.summary())

# ─────────────────────────────────────────────────────────────────────
#  3 – BuildIssue
# ─────────────────────────────────────────────────────────────────────
print("\n── BuildIssue ────────────────────────────────────────────────")

@test("BuildIssue.to_dict() barcha kalitlarni o'z ichiga oladi")
def _():
    issue = BuildIssue(
        level=IssueLevel.ERROR,
        message="cannot find symbol",
        file="Main.java",
        line=10,
        column=5,
        suggestion="Check imports",
    )
    d = issue.to_dict()
    for key in ("level", "message", "file", "line", "column", "suggestion"):
        assert_in(key, d, f"'{key}' key topilmadi")

@test("BuildIssue.to_dict()['level'] qiymati string")
def _():
    issue = BuildIssue(IssueLevel.WARNING, "unused import")
    assert_eq(issue.to_dict()["level"], "warning")

# ─────────────────────────────────────────────────────────────────────
#  4 – BuildLogAnalyzer
# ─────────────────────────────────────────────────────────────────────
print("\n── BuildLogAnalyzer ──────────────────────────────────────────")

def _make_result(stdout="", stderr="", exit_code=0) -> GradleResult:
    status = BuildStatus.SUCCESS if exit_code == 0 else BuildStatus.FAILED
    return GradleResult(
        command=GradleCommand(CommandType.BUILD),
        status=status,
        stdout=stdout,
        stderr=stderr,
        exit_code=exit_code,
    )

analyzer = BuildLogAnalyzer()

@test("Analyzer: 'cannot find symbol' xatosini topadi")
def _():
    r = _make_result(
        stdout="src/Foo.java:12: error: cannot find symbol\nBUILD FAILED",
        exit_code=1,
    )
    issues = analyzer.analyze(r)
    assert_true(any("cannot find symbol" in i.message for i in issues))

@test("Analyzer: xato uchun to'g'ri fayl va qator belgilanadi")
def _():
    r = _make_result(
        stdout="src/Bar.java:42: error: incompatible types",
        exit_code=1,
    )
    issues = analyzer.analyze(r)
    err = next((i for i in issues if "incompatible" in i.message), None)
    assert_true(err is not None, "incompatible types xatosi topilmadi")
    assert_eq(err.file, "src/Bar.java")
    assert_eq(err.line, 42)

@test("Analyzer: 'incompatible types' uchun tavsiya beradi")
def _():
    r = _make_result(
        stdout="src/Bar.java:5: error: incompatible types",
        exit_code=1,
    )
    issues = analyzer.analyze(r)
    err = next((i for i in issues if "incompatible" in i.message), None)
    assert_true(err is not None)
    assert_true(err.suggestion is not None, "Tavsiya bo'lishi kerak")

@test("Analyzer: OutOfMemoryError xatosini topadi")
def _():
    r = _make_result(stderr="java.lang.OutOfMemoryError: Java heap space", exit_code=1)
    issues = analyzer.analyze(r)
    assert_true(any("OutOfMemory" in i.message for i in issues))

@test("Analyzer: Dependency conflict xatosini topadi")
def _():
    r = _make_result(
        stderr="Could not resolve com.example:library:1.0.0",
        exit_code=1,
    )
    issues = analyzer.analyze(r)
    assert_true(any("Dependency" in i.message for i in issues))

@test("Analyzer: Gradle daemon muammosini topadi")
def _():
    r = _make_result(
        stderr="Gradle daemon unexpectedly stopped",
        exit_code=1,
    )
    issues = analyzer.analyze(r)
    assert_true(any("daemon" in i.message.lower() for i in issues))

@test("Analyzer: toza build'da issues bo'sh")
def _():
    r = _make_result(stdout="BUILD SUCCESSFUL in 3s", exit_code=0)
    issues = analyzer.analyze(r)
    errors = [i for i in issues if i.level == IssueLevel.ERROR]
    assert_eq(len(errors), 0)

@test("Analyzer: exit_code != 0 va hech narsa topilmasa umumiy xato qo'shiladi")
def _():
    r = _make_result(stdout="", stderr="", exit_code=2)
    issues = analyzer.analyze(r)
    assert_true(len(issues) > 0, "Kamida 1 ta issue kutilgan")

# ─────────────────────────────────────────────────────────────────────
#  5 – GradlePipeline (simulyatsiya rejimi)
# ─────────────────────────────────────────────────────────────────────
print("\n── GradlePipeline (simulyatsiya) ─────────────────────────────")

logs: List[str] = []
pipeline = GradlePipeline(project_root="/tmp/nonexistent_mod", on_log=logs.append)

@test("Pipeline.run(BUILD) → simulyatsiyada SUCCESS qaytaradi")
def _():
    result = pipeline.run(CommandType.BUILD)
    assert_eq(result.status, BuildStatus.SUCCESS)

@test("Pipeline.run(CLEAN) → simulyatsiyada SUCCESS qaytaradi")
def _():
    result = pipeline.run(CommandType.CLEAN)
    assert_eq(result.status, BuildStatus.SUCCESS)

@test("Pipeline.run(COMPILE) → simulyatsiyada FAILED qaytaradi (ataylab)")
def _():
    result = pipeline.run(CommandType.COMPILE)
    assert_eq(result.status, BuildStatus.FAILED)

@test("Pipeline.run(TEST) → simulyatsiyada SUCCESS qaytaradi")
def _():
    result = pipeline.run(CommandType.TEST)
    assert_eq(result.status, BuildStatus.SUCCESS)

@test("Pipeline.run(RUN) → simulyatsiyada SUCCESS qaytaradi")
def _():
    result = pipeline.run(CommandType.RUN)
    assert_eq(result.status, BuildStatus.SUCCESS)

@test("Pipeline.run(JAR) → simulyatsiyada SUCCESS qaytaradi")
def _():
    result = pipeline.run(CommandType.JAR)
    assert_eq(result.status, BuildStatus.SUCCESS)

@test("Pipeline.full_build() COMPILE xato bo'lgach to'xtaydi")
def _():
    results = pipeline.full_build()
    # CLEAN muvaffaqiyatli, COMPILE muvaffaqiyatsiz → pipeline to'xtashi kerak
    statuses = [r.status for r in results]
    assert_in(BuildStatus.FAILED, statuses, "FAILED kutilgan edi")

@test("Pipeline.quick_build() bitta natija qaytaradi")
def _():
    result = pipeline.quick_build()
    assert_true(isinstance(result, GradleResult))

@test("Pipeline.test_and_build() kamida 1 natija qaytaradi")
def _():
    results = pipeline.test_and_build()
    assert_true(len(results) >= 1)

@test("Pipeline.stats() to'g'ri tuzilmaga ega")
def _():
    stats = pipeline.stats()
    for key in ("total_runs", "success", "failed", "success_rate_pct"):
        assert_in(key, stats, f"'{key}' key topilmadi")

@test("Pipeline.stats() total_runs > 0 (testlar bajarilgandan keyin)")
def _():
    assert_true(pipeline.stats()["total_runs"] > 0)

@test("Pipeline log callback ishlaydi")
def _():
    assert_true(len(logs) > 0, "Loglar bo'sh bo'lmasligi kerak")

# ─────────────────────────────────────────────────────────────────────
#  6 – GradleAwareReviewerAgent
# ─────────────────────────────────────────────────────────────────────
print("\n── GradleAwareReviewerAgent ──────────────────────────────────")

reviewer = GradleAwareReviewerAgent()

@test("ReviewerAgent: muvaffaqiyatli build'da passed=True")
def _():
    r = _make_result(stdout="BUILD SUCCESSFUL in 3s", exit_code=0)
    report = reviewer.review_build(r)
    assert_true(report["passed"])

@test("ReviewerAgent: muvaffaqiyatsiz build'da passed=False")
def _():
    r = _make_result(
        stdout="src/A.java:1: error: cannot find symbol\nBUILD FAILED",
        exit_code=1,
    )
    report = reviewer.review_build(r)
    assert_false(report["passed"])

@test("ReviewerAgent: report kalitlari to'liq")
def _():
    r = _make_result(stdout="BUILD SUCCESSFUL in 2s", exit_code=0)
    report = reviewer.review_build(r)
    for key in ("build_status", "exit_code", "duration_sec",
                "passed", "error_count", "warning_count",
                "issues", "ai_suggestions", "agent", "timestamp"):
        assert_in(key, report, f"'{key}' key topilmadi")

@test("ReviewerAgent: 'cannot find symbol' uchun AI suggestion beradi")
def _():
    r = _make_result(
        stdout="src/Foo.java:7: error: cannot find symbol\nBUILD FAILED",
        exit_code=1,
    )
    report = reviewer.review_build(r)
    combined = " ".join(report["ai_suggestions"])
    assert_in("cannot find symbol", combined)

@test("ReviewerAgent: toza build'da AI suggestion 'No issues' o'z ichiga oladi")
def _():
    r = _make_result(stdout="BUILD SUCCESSFUL in 1s", exit_code=0)
    report = reviewer.review_build(r)
    combined = " ".join(report["ai_suggestions"])
    assert_in("No issues", combined)

@test("ReviewerAgent: OOM xatosi uchun jvmargs tavsiya beradi")
def _():
    r = _make_result(stderr="java.lang.OutOfMemoryError", exit_code=1)
    report = reviewer.review_build(r)
    combined = " ".join(report["ai_suggestions"])
    assert_true("jvmargs" in combined or "Xmx" in combined)

# ─────────────────────────────────────────────────────────────────────
#  7 – PipelineIntegrator
# ─────────────────────────────────────────────────────────────────────
print("\n── PipelineIntegrator ────────────────────────────────────────")

integrator = PipelineIntegrator(project_root="/tmp/nonexistent_mod", max_retries=2)

PROJECT_DATA = {
    "project_name":      "TestMod",
    "minecraft_version": "1.19.3",
    "mod_loader":        "Forge",
    "blocks": [
        {"name": "ruby_ore", "properties": {"hardness": 3.0, "resistance": 3.0}}
    ],
    "textures": [
        {"name": "ruby_ore", "description": "Red ore block"}
    ],
}

@test("PipelineIntegrator.run_full_cycle() natija qaytaradi")
def _():
    result = integrator.run_full_cycle(PROJECT_DATA)
    assert_true(isinstance(result, dict))

@test("PipelineIntegrator.run_full_cycle() natijada 'project' kalit bor")
def _():
    result = integrator.run_full_cycle(PROJECT_DATA)
    assert_in("project", result)
    assert_eq(result["project"], "TestMod")

@test("PipelineIntegrator.run_full_cycle() 'attempts' >= 1")
def _():
    result = integrator.run_full_cycle(PROJECT_DATA)
    assert_true(result["attempts"] >= 1)

@test("PipelineIntegrator.run_full_cycle() 'pipeline_stats' mavjud")
def _():
    result = integrator.run_full_cycle(PROJECT_DATA)
    assert_in("pipeline_stats", result)

@test("PipelineIntegrator.quick_review() report qaytaradi")
def _():
    report = integrator.quick_review(CommandType.BUILD)
    assert_in("passed", report)

@test("PipelineIntegrator.history_summary() to'g'ri tuzilmaga ega")
def _():
    summary = integrator.history_summary()
    for key in ("total_cycles", "passed", "failed", "run_log", "pipeline"):
        assert_in(key, summary, f"'{key}' key topilmadi")

@test("PipelineIntegrator.history_summary() total_cycles > 0")
def _():
    summary = integrator.history_summary()
    assert_true(summary["total_cycles"] > 0)

# ─────────────────────────────────────────────────────────────────────
#  YAKUNIY NATIJA
# ─────────────────────────────────────────────────────────────────────
total  = len(_PASS) + len(_FAIL)
passed = len(_PASS)
failed = len(_FAIL)
rate   = round(passed / total * 100) if total else 0

print(f"\n{'═'*60}")
print(f"  NATIJA:  {passed}/{total} test o'tdi  ({rate}%)")
print(f"{'═'*60}")

if _FAIL:
    print(f"\n  Muvaffaqiyatsiz testlar ({failed}):")
    for name, msg in _FAIL:
        short = msg.splitlines()[-1] if msg else "?"
        print(f"    ❌  {name}")
        print(f"        {short}")

print()
sys.exit(0 if failed == 0 else 1)
