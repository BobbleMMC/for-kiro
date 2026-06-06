#!/usr/bin/env python3
"""
Remove unused imports/variables flagged by `tsc --noUnusedLocals --noUnusedParameters`.

Conservatively edits the declaration line for each TS6133 error: only removes
the exact identifier, never whole statements. Handles imports, destructures,
and useState pairs (replaced with `_` to keep state setter ergonomics).
"""
import os
import re
import subprocess
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)


def collect_errors():
    out = subprocess.run(
        ["npx", "tsc", "--noEmit", "--project", "tsconfig.app.json",
         "--noUnusedLocals", "--noUnusedParameters"],
        capture_output=True, text=True,
    )
    pat = re.compile(r"^([^()]+)\((\d+),(\d+)\): error TS6133: '([^']+)'")
    errs = defaultdict(list)
    for line in out.stdout.splitlines():
        m = pat.match(line)
        if m:
            errs[m.group(1)].append((int(m.group(2)), int(m.group(3)), m.group(4)))
    return errs


def remove_id(line, name):
    for pat in (rf",\s*{re.escape(name)}\b", rf"\b{re.escape(name)}\s*,\s*", rf"\b{re.escape(name)}\b"):
        new, n = re.subn(pat, "", line, count=1)
        if n > 0:
            return new
    return line


def fix_file(path, errs):
    fp = ROOT / path
    if not fp.exists():
        return 0
    text = fp.read_text()
    lines = text.splitlines(keepends=True)
    by_line = defaultdict(list)
    for ln, _, name in errs:
        by_line[ln].append(name)
    fixed = 0
    for ln, names in by_line.items():
        if ln - 1 >= len(lines):
            continue
        line = lines[ln - 1]
        for name in names:
            if "useState" in line and re.search(rf"\[\s*{re.escape(name)}\s*,", line):
                line = re.sub(rf"\[\s*{re.escape(name)}\s*,", "[_, ", line, 1); fixed += 1; continue
            if "useState" in line and re.search(rf",\s*{re.escape(name)}\s*\]", line):
                line = re.sub(rf",\s*{re.escape(name)}\s*\]", ", _]", line, 1); fixed += 1; continue
            new = remove_id(line, name)
            if new != line:
                line, fixed = new, fixed + 1
        line = re.sub(r"import\s*{\s*}\s*from\s*[^;]+;?\s*\n?", "", line)
        line = re.sub(r"{\s*,", "{ ", line)
        line = re.sub(r",\s*}", " }", line)
        line = re.sub(r",\s*,", ",", line)
        lines[ln - 1] = line
    new_text = "".join(lines)
    if new_text != text:
        fp.write_text(new_text)
    return fixed


def main():
    errors = collect_errors()
    total = 0
    for path, errs in sorted(errors.items()):
        n = fix_file(path, errs)
        if n:
            total += n
            print(f"  fixed {path}: {n} unused name(s)")
    print(f"\nTotal: {total} unused identifiers removed across {len(errors)} files")


if __name__ == "__main__":
    main()
