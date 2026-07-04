"""Cumulative project-memory / learning layer for the autonomous dev agent.

The agent gets smarter over time by remembering what it learns while working the
backlog. Two tiers of memory back this:

- ``knowledge.json`` (git-ignored, like backlog.json/state.json): the durable
  on-disk brain. It survives the per-loop ``git reset --hard origin/main`` because
  it is ignored, so lessons accumulate across every run - successes and failures.
- ``PROJECT_MEMORY.md`` (git-tracked): a human-readable digest regenerated from
  the knowledge store and committed alongside successful task PRs, so the learned
  knowledge lands on ``main`` and is visible on GitHub.

Every task calls :func:`record_task_outcome`, which mines verification output for
known pitfalls, infers directory conventions from the files that were touched, and
(optionally) asks the model to distill a one-line lesson. :func:`build_memory_digest`
renders a compact block that :mod:`prompts` folds into each task prompt so future
runs stop repeating past mistakes.
"""

import json
import os
import re
import time
import pathlib
from typing import Any, Dict, List, Optional

ROOT = pathlib.Path(__file__).parent
KNOWLEDGE_PATH = ROOT / "knowledge.json"
PROJECT_MEMORY_PATH = ROOT / "PROJECT_MEMORY.md"

# Keep the store bounded so the prompt never bloats and the file stays reviewable.
MAX_LESSONS = 40
MAX_TASK_LOG = 60
MAX_DIGEST_CHARS = int(os.environ.get("AUTOMATION_MEMORY_DIGEST_CHARS", "1400"))

# Known failure fingerprints for this repo. Each entry maps a regex over the
# verification output to a stable signature (for dedup/counting) and a durable
# lesson the agent should apply going forward.
PITFALL_CATALOG = [
    (
        re.compile(r"bg-\[--|text-\[--|border-\[--", re.IGNORECASE),
        "tailwind-css-var",
        "Tailwind v4: use bg-(--var) or bg-[var(--var)] for CSS-variable utilities; the bg-[--var] form compiles to invalid CSS and renders nothing.",
    ),
    (
        re.compile(r"JSX\.Element|namespace ['\"]?JSX['\"]?|Cannot find namespace 'JSX'", re.IGNORECASE),
        "jsx-namespace",
        "Type React elements as React.ReactElement (or import JSX from react); the global JSX.Element namespace is not available under this TS/React config.",
    ),
    (
        re.compile(r"no-explicit-any|Unexpected any|type 'any'", re.IGNORECASE),
        "no-any",
        "Never use `any`; declare explicit interfaces/types - the lint config rejects `any`.",
    ),
    (
        re.compile(r"is declared but its value is never read|no-unused-vars|defined but never used", re.IGNORECASE),
        "unused-symbol",
        "Remove unused variables, imports, and parameters; the lint config forbids them.",
    ),
    (
        re.compile(r"Cannot find module|Module not found|Cannot find name '", re.IGNORECASE),
        "missing-import",
        "Verify import paths against real files and only import packages already listed in package.json.",
    ),
    (
        re.compile(r"set-?state.*(effect|render)|react-hooks/|called conditionally|exhaustive-deps", re.IGNORECASE),
        "react-hooks",
        "Follow the Rules of Hooks: no setState in a render/effect body without a guard, keep hook calls unconditional, and satisfy exhaustive-deps.",
    ),
    (
        re.compile(r"Property '[^']+' does not exist on type|is not assignable to type", re.IGNORECASE),
        "type-mismatch",
        "Check exact prop/field names and shapes against the type definitions before using them.",
    ),
    (
        re.compile(r"'use client'|use client directive|only works in a Client Component|useState.*Server Component", re.IGNORECASE),
        "client-component",
        "Add the 'use client' directive at the top of any component that uses hooks, state, or browser APIs.",
    ),
]

# Seeded on first run (knowledge.json is git-ignored, so seeds live in code). This
# gives the very first task a useful head start instead of an empty brain.
SEED_PITFALLS = [
    {"signature": s, "text": t, "hits": 1, "example_task": "seed"}
    for _r, s, t in PITFALL_CATALOG
]
SEED_CONVENTIONS = [
    {"text": "React components live under src/app/components/.", "hits": 1, "source_task": "seed"},
    {"text": "Shared logic and helpers live under src/lib/.", "hits": 1, "source_task": "seed"},
    {"text": "Route pages are src/app/<route>/page.tsx (Next.js App Router).", "hits": 1, "source_task": "seed"},
    {"text": "Only import packages already listed in package.json.", "hits": 1, "source_task": "seed"},
]


def _now() -> int:
    return int(time.time())


def _empty_knowledge() -> Dict[str, Any]:
    return {
        "version": 1,
        "conventions": [dict(c) for c in SEED_CONVENTIONS],
        "pitfalls": [dict(p) for p in SEED_PITFALLS],
        "lessons": [],
        "task_log": [],
    }


def _atomic_write(path: pathlib.Path, text: str) -> None:
    """Write via a unique temp file + os.replace, retrying transient Windows locks."""
    tmp = path.with_suffix(f".tmp.{os.getpid()}")
    for _ in range(10):
        try:
            tmp.write_text(text, encoding="utf-8")
            os.replace(tmp, path)
            return
        except PermissionError:
            time.sleep(0.2)
        finally:
            if tmp.exists():
                try:
                    tmp.unlink()
                except OSError:
                    pass
    tmp.write_text(text, encoding="utf-8")
    os.replace(tmp, path)


def load_knowledge() -> Dict[str, Any]:
    if KNOWLEDGE_PATH.exists():
        try:
            data = json.loads(KNOWLEDGE_PATH.read_text(encoding="utf-8"))
            base = _empty_knowledge()
            for key in base:
                if key in data:
                    base[key] = data[key]
            return base
        except (json.JSONDecodeError, OSError):
            return _empty_knowledge()
    return _empty_knowledge()


def save_knowledge(data: Dict[str, Any]) -> None:
    _atomic_write(KNOWLEDGE_PATH, json.dumps(data, indent=2))


def _upsert(items: List[Dict[str, Any]], match_key: str, match_value: str,
            extra: Optional[Dict[str, Any]] = None) -> None:
    """Increment ``hits`` on an existing entry (matched by ``match_key``) or append."""
    for it in items:
        if it.get(match_key) == match_value:
            it["hits"] = it.get("hits", 1) + 1
            return
    entry = {match_key: match_value, "hits": 1}
    if extra:
        entry.update(extra)
    items.append(entry)


def _add_lesson(data: Dict[str, Any], text: str, task_id: str, kind: str) -> None:
    text = (text or "").strip()
    if not text:
        return
    lowered = text.lower()
    for lesson in data["lessons"]:
        if lesson.get("text", "").lower() == lowered:
            lesson["hits"] = lesson.get("hits", 1) + 1
            return
    data["lessons"].append({"text": text, "task": task_id, "kind": kind, "hits": 1, "ts": _now()})
    data["lessons"] = data["lessons"][-MAX_LESSONS:]


def _record_conventions(data: Dict[str, Any], files: List[str], task_id: str) -> None:
    hints = set()
    for raw in files:
        f = (raw or "").replace("\\", "/")
        if "src/app/components/" in f:
            hints.add("React components live under src/app/components/.")
        elif "src/lib/" in f:
            hints.add("Shared logic and helpers live under src/lib/.")
        if f.endswith("page.tsx") and "src/app/" in f:
            hints.add("Route pages are src/app/<route>/page.tsx (Next.js App Router).")
        if f.endswith(".css"):
            hints.add("Component styles are colocated .css files imported by the component.")
    for h in hints:
        _upsert(data["conventions"], "text", h, {"source_task": task_id})


def _extract_pitfalls(data: Dict[str, Any], verification_text: str, task_id: str) -> bool:
    matched = False
    for pattern, signature, lesson in PITFALL_CATALOG:
        if pattern.search(verification_text):
            _upsert(data["pitfalls"], "signature", signature, {"text": lesson, "example_task": task_id})
            matched = True
    return matched


def _record_generic_failure(data: Dict[str, Any], verification_text: str, task_id: str) -> None:
    """Capture the first meaningful error line when no known fingerprint matched."""
    for line in verification_text.splitlines():
        line = line.strip()
        if not line:
            continue
        if re.search(r"error|failed|cannot|unexpected|invalid", line, re.IGNORECASE):
            signature = "generic:" + re.sub(r"\s+", " ", line.lower())[:80]
            _upsert(data["pitfalls"], "signature", signature,
                    {"text": f"Past failure: {line[:200]}", "example_task": task_id})
            return


def distill_lesson_with_llm(task: Dict[str, Any], success: bool,
                            verification: Optional[Dict[str, Any]]) -> Optional[str]:
    """Ask the model for one durable, generalizable lesson. Best-effort; may return None."""
    from llm_client import UnifiedLLMClient

    outcome = "succeeded" if success else "failed"
    err = ""
    if verification and not success:
        err = ((verification.get("stdout", "") or "") + "\n" + (verification.get("stderr", "") or ""))[:1500]
    prompt = (
        f"A code task titled '{task.get('title', '')}' {outcome} in the calm-daily-coach "
        f"Next.js/TypeScript repo. "
        + (f"Verification output:\n{err}\n" if err else "")
        + "In ONE short sentence, state a durable, generalizable lesson for future tasks in this "
        "repo (a convention to follow or a specific mistake to avoid). "
        "If there is no useful general lesson, reply with exactly NONE."
    )
    resp = UnifiedLLMClient().generate([{"role": "user", "content": prompt}], tools=None, system_prompt=None)
    text = (resp.get("content") or "").strip()
    if not text:
        return None
    line = text.splitlines()[0].strip().lstrip("-*# ").strip()
    if not line or line.upper().startswith("NONE"):
        return None
    return line[:280]


def record_task_outcome(task: Dict[str, Any], success: bool,
                        verification: Optional[Dict[str, Any]] = None,
                        rounds: Optional[int] = None,
                        reflect: Optional[bool] = None) -> Dict[str, Any]:
    """Fold the result of one task into the durable knowledge store."""
    data = load_knowledge()
    task_id = task.get("id", "?")
    title = task.get("title", "")
    files = task.get("files_to_touch", []) or []

    data["task_log"].append({
        "id": task_id,
        "title": title,
        "status": "success" if success else "failure",
        "files": files,
        "rounds": rounds,
        "ts": _now(),
    })
    data["task_log"] = data["task_log"][-MAX_TASK_LOG:]

    if success:
        _record_conventions(data, files, task_id)
    else:
        text = ""
        if verification:
            text = (verification.get("stdout", "") or "") + "\n" + (verification.get("stderr", "") or "")
        if not _extract_pitfalls(data, text, task_id) and text.strip():
            _record_generic_failure(data, text, task_id)

    if reflect is None:
        reflect = os.environ.get("AUTOMATION_REFLECT", "0") == "1"
    if reflect:
        try:
            lesson = distill_lesson_with_llm(task, success, verification)
            if lesson:
                _add_lesson(data, lesson, task_id, "success" if success else "failure")
        except Exception:
            pass

    save_knowledge(data)
    return data


def build_memory_digest(max_chars: int = MAX_DIGEST_CHARS) -> str:
    """Compact markdown block of the most valuable lessons, for prompt injection."""
    data = load_knowledge()
    lines: List[str] = []

    pitfalls = sorted(data.get("pitfalls", []), key=lambda p: p.get("hits", 0), reverse=True)[:6]
    if pitfalls:
        lines.append("Pitfalls to avoid:")
        for p in pitfalls:
            text = p.get("text", p.get("signature", ""))
            hits = p.get("hits", 1)
            lines.append(f"- {text}" + (f" (seen {hits}x)" if hits > 1 else ""))

    conventions = sorted(data.get("conventions", []), key=lambda c: c.get("hits", 0), reverse=True)[:5]
    if conventions:
        lines.append("Conventions:")
        for c in conventions:
            lines.append(f"- {c.get('text', '')}")

    lessons = list(reversed(data.get("lessons", [])))[:5]
    if lessons:
        lines.append("Recent lessons:")
        for lesson in lessons:
            lines.append(f"- {lesson.get('text', '')}")

    digest = "\n".join(lines).strip()
    if len(digest) > max_chars:
        digest = digest[:max_chars].rsplit("\n", 1)[0]
    return digest


def render_project_memory_md() -> str:
    data = load_knowledge()
    completed = sum(1 for t in data.get("task_log", []) if t.get("status") == "success")
    failed = sum(1 for t in data.get("task_log", []) if t.get("status") == "failure")

    out: List[str] = [
        "# Project Memory - Autonomous Dev Agent",
        "",
        "Auto-generated by `memory.py`. This is the cumulative knowledge the agent has",
        "learned while working the backlog. It is injected into future task prompts so the",
        "agent avoids repeating past mistakes. Do not edit by hand - it is regenerated each run.",
        "",
        f"_Tasks recorded: {completed} succeeded, {failed} failed._",
        "",
        "## Pitfalls to avoid",
        "",
    ]
    pitfalls = sorted(data.get("pitfalls", []), key=lambda p: p.get("hits", 0), reverse=True)
    if pitfalls:
        for p in pitfalls:
            hits = p.get("hits", 1)
            out.append(f"- {p.get('text', p.get('signature', ''))} _(seen {hits}x)_")
    else:
        out.append("- _None recorded yet._")

    out += ["", "## Conventions", ""]
    conventions = sorted(data.get("conventions", []), key=lambda c: c.get("hits", 0), reverse=True)
    if conventions:
        for c in conventions:
            out.append(f"- {c.get('text', '')}")
    else:
        out.append("- _None recorded yet._")

    lessons = list(reversed(data.get("lessons", [])))
    if lessons:
        out += ["", "## Lessons", ""]
        for lesson in lessons:
            out.append(f"- {lesson.get('text', '')} _({lesson.get('task', '?')})_")

    out.append("")
    return "\n".join(out)


def refresh_project_memory_file() -> None:
    """Regenerate the git-tracked PROJECT_MEMORY.md from the durable knowledge store."""
    try:
        _atomic_write(PROJECT_MEMORY_PATH, render_project_memory_md())
    except OSError:
        pass
