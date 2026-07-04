"""Shared, cross-process-safe backlog store for scaling to N concurrent agents.

The single-agent runner ``run_autonomous.py`` owned ``backlog.json`` outright: it
read the file, mutated it, and wrote it back with no coordination beyond atomic
file replacement. That is safe for one process but races the moment two or more
workers share a backlog - both can read the same "pending" task and grab it.

This module centralizes every backlog mutation behind a cross-process file lock
so any number of workers can safely share one backlog file. The key primitive is
:func:`claim_next_pending`, which atomically flips the first pending task to
``claimed`` and stamps it with the worker id, guaranteeing no two workers ever
pick up the same task.

The backlog path is resolved from ``AUTOMATION_BACKLOG_PATH`` so the orchestrator
can point every worker (each running inside its own git worktree) at one shared
queue, while a solo runner keeps using the local ``backlog.json`` unchanged.
"""

import json
import os
import time
import contextlib
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

_DEFAULT_BACKLOG = Path(__file__).parent / "backlog.json"


def backlog_path() -> Path:
    override = os.environ.get("AUTOMATION_BACKLOG_PATH")
    return Path(override) if override else _DEFAULT_BACKLOG


def _lock_path() -> Path:
    return backlog_path().with_suffix(".lock")


# A lock older than this many seconds is presumed abandoned by a crashed worker
# and forcibly broken so the queue can never wedge permanently.
STALE_LOCK_SECONDS = int(os.environ.get("AUTOMATION_LOCK_STALE_SECONDS", "120"))
LOCK_ACQUIRE_TIMEOUT = int(os.environ.get("AUTOMATION_LOCK_TIMEOUT", "60"))


@contextlib.contextmanager
def backlog_lock():
    """Cross-process mutex around the shared backlog via atomic lockfile creation.

    Uses ``O_CREAT | O_EXCL`` which is atomic on both Windows and POSIX: exactly
    one process can create the lockfile; everyone else spins until it is released
    or judged stale. Always released in a finally block, even on error.
    """
    lock = _lock_path()
    deadline = time.time() + LOCK_ACQUIRE_TIMEOUT
    fd = None
    while True:
        try:
            fd = os.open(str(lock), os.O_CREAT | os.O_EXCL | os.O_RDWR)
            os.write(fd, f"{os.getpid()} {time.time()}".encode("utf-8"))
            break
        except FileExistsError:
            # Break a stale lock left behind by a crashed worker.
            try:
                age = time.time() - lock.stat().st_mtime
                if age > STALE_LOCK_SECONDS:
                    lock.unlink(missing_ok=True)
                    continue
            except OSError:
                pass
            if time.time() > deadline:
                raise TimeoutError(f"Could not acquire backlog lock within {LOCK_ACQUIRE_TIMEOUT}s")
            time.sleep(0.1)
    try:
        yield
    finally:
        if fd is not None:
            os.close(fd)
        with contextlib.suppress(OSError):
            lock.unlink(missing_ok=True)


def _read_unlocked() -> Dict[str, Any]:
    path = backlog_path()
    for _ in range(10):
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (PermissionError, json.JSONDecodeError):
            time.sleep(0.1)
        except FileNotFoundError:
            return {"tasks": []}
    return json.loads(path.read_text(encoding="utf-8"))


def _write_unlocked(data: Dict[str, Any]) -> None:
    path = backlog_path()
    payload = json.dumps(data, indent=2)
    tmp = path.with_suffix(f".tmp.{os.getpid()}")
    for _ in range(10):
        try:
            tmp.write_text(payload, encoding="utf-8")
            os.replace(tmp, path)
            return
        except PermissionError:
            time.sleep(0.1)
        finally:
            if tmp.exists():
                with contextlib.suppress(OSError):
                    tmp.unlink()
    tmp.write_text(payload, encoding="utf-8")
    os.replace(tmp, path)


def read_backlog() -> Dict[str, Any]:
    """Lock-free snapshot read - fine for reporting/metrics, not for claiming."""
    return _read_unlocked()


def mutate(fn: Callable[[Dict[str, Any]], Any]) -> Any:
    """Run ``fn(data)`` under the lock and persist the result atomically.

    Returns whatever ``fn`` returns, so callers can both mutate and extract a
    value (e.g. the claimed task) inside a single critical section.
    """
    with backlog_lock():
        data = _read_unlocked()
        result = fn(data)
        _write_unlocked(data)
        return result


def claim_next_pending(worker_id: str) -> Optional[Dict[str, Any]]:
    """Atomically claim the first pending task for ``worker_id``.

    Returns a copy of the claimed task, or None if nothing is pending. Because
    the read-modify-write happens under the lock, concurrent workers can never
    claim the same task.
    """
    def _claim(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for task in data.get("tasks", []):
            if task.get("status") == "pending":
                task["status"] = "claimed"
                task["worker"] = worker_id
                task["claimed_at"] = time.time()
                return dict(task)
        return None

    return mutate(_claim)


def finalize_task(task_id: str, success: bool, max_attempts: int) -> str:
    """Record a task's outcome under the lock. Returns the resulting status."""
    def _finalize(data: Dict[str, Any]) -> str:
        for task in data.get("tasks", []):
            if task.get("id") == task_id:
                if success:
                    task["status"] = "completed"
                else:
                    task["attempts"] = task.get("attempts", 0) + 1
                    task["status"] = "parked" if task["attempts"] >= max_attempts else "pending"
                task.pop("worker", None)
                task.pop("claimed_at", None)
                return task["status"]
        return "unknown"

    return mutate(_finalize)


def requeue_stale_claims(lease_seconds: int) -> int:
    """Return claimed-but-abandoned tasks to pending (crashed-worker recovery)."""
    def _requeue(data: Dict[str, Any]) -> int:
        now = time.time()
        count = 0
        for task in data.get("tasks", []):
            if task.get("status") == "claimed":
                claimed_at = task.get("claimed_at", 0)
                if now - claimed_at > lease_seconds:
                    task["status"] = "pending"
                    task.pop("worker", None)
                    task.pop("claimed_at", None)
                    count += 1
        return count

    return mutate(_requeue)


def count_by_status(status: str) -> int:
    data = _read_unlocked()
    return sum(1 for t in data.get("tasks", []) if t.get("status") == status)


def append_tasks(new_tasks: List[Dict[str, Any]]) -> None:
    def _append(data: Dict[str, Any]) -> None:
        data.setdefault("tasks", []).extend(new_tasks)

    mutate(_append)
