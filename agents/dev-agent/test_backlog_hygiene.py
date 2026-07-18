"""Regression tests for backlog replenishment hygiene and task_slicer imports.

Run from this directory:  python -m unittest test_backlog_hygiene -v

No LLM calls are made: replenishment logic is pure backlog manipulation, and
task_slicer is only imported (its client is constructed lazily per slice).
"""

import json
import os
import tempfile
import typing
import unittest
from pathlib import Path

import backlog_store
import run_autonomous
import task_slicer


ALLOWED_PATH_PREFIXES = ("src/app/components/", "src/app/hooks/", "src/lib/")


class TaskSlicerImportTest(unittest.TestCase):
    def test_annotations_resolve(self):
        # Deferred annotations (PEP 649) hide a missing typing import until the
        # annotation is evaluated; force evaluation so a bad name fails here.
        hints = typing.get_type_hints(task_slicer.auto_remediate_backlog_failures)
        self.assertIn("get_failure_log_fn", hints)


class PoolConventionsTest(unittest.TestCase):
    def test_pool_paths_follow_repo_conventions(self):
        for title, _description, files in run_autonomous.FRONTEND_TASK_POOL:
            for f in files:
                self.assertTrue(
                    f.startswith(ALLOWED_PATH_PREFIXES),
                    f"{title!r} seeds non-conventional path {f!r}",
                )
                self.assertFalse(f.endswith(".css"), f"{title!r} seeds a CSS file {f!r}; styling is Tailwind-in-component")

    def test_pool_titles_are_unique(self):
        titles = [t for t, _d, _f in run_autonomous.FRONTEND_TASK_POOL]
        self.assertEqual(len(titles), len(set(titles)))

    def test_pool_has_no_streak_mechanics(self):
        for title, description, _files in run_autonomous.FRONTEND_TASK_POOL:
            self.assertNotIn("streak", (title + description).lower(), f"{title!r} violates the no-streak product promise")


class SelectFreshPoolTasksTest(unittest.TestCase):
    POOL = [
        ("Add widget A", "desc a", ["src/app/components/A.tsx"]),
        ("Add widget B", "desc b", ["src/app/components/B.tsx"]),
        ("Add widget C", "desc c", ["src/app/components/C.tsx"]),
    ]

    def test_skips_titles_already_in_backlog_regardless_of_status(self):
        existing = [
            {"id": "cdc-001", "title": "Add widget A", "status": "completed"},
            {"id": "cdc-002", "title": "add  widget b", "status": "parked"},
        ]
        picks = run_autonomous.select_fresh_pool_tasks(existing, self.POOL, batch=8)
        self.assertEqual([p[0] for p in picks], ["Add widget C"])

    def test_returns_empty_when_pool_is_exhausted(self):
        existing = [{"id": f"cdc-{i}", "title": t, "status": "pending"} for i, (t, _d, _f) in enumerate(self.POOL)]
        self.assertEqual(run_autonomous.select_fresh_pool_tasks(existing, self.POOL, batch=8), [])

    def test_respects_batch_limit(self):
        picks = run_autonomous.select_fresh_pool_tasks([], self.POOL, batch=2)
        self.assertEqual(len(picks), 2)


class ReplenishBacklogTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.backlog_file = Path(self._tmp.name) / "backlog.json"
        self.backlog_file.write_text(json.dumps({"tasks": []}), encoding="utf-8")
        self._old_env = os.environ.get("AUTOMATION_BACKLOG_PATH")
        os.environ["AUTOMATION_BACKLOG_PATH"] = str(self.backlog_file)

    def tearDown(self):
        if self._old_env is None:
            os.environ.pop("AUTOMATION_BACKLOG_PATH", None)
        else:
            os.environ["AUTOMATION_BACKLOG_PATH"] = self._old_env
        self._tmp.cleanup()

    def _titles(self):
        data = json.loads(self.backlog_file.read_text(encoding="utf-8"))
        return [t["title"] for t in data["tasks"]]

    def test_repeated_replenish_never_duplicates_titles(self):
        for _ in range(4):
            run_autonomous.replenish_backlog()
        titles = self._titles()
        self.assertEqual(len(titles), len(set(titles)), f"duplicate titles found: {sorted(titles)}")
        self.assertLessEqual(len(titles), len(run_autonomous.FRONTEND_TASK_POOL))

    def test_replenished_ids_are_unique(self):
        run_autonomous.replenish_backlog()
        run_autonomous.replenish_backlog()
        data = json.loads(self.backlog_file.read_text(encoding="utf-8"))
        ids = [t["id"] for t in data["tasks"]]
        self.assertEqual(len(ids), len(set(ids)))

    def test_requeue_stale_claims_releases_expired_lease(self):
        self.backlog_file.write_text(json.dumps({
            "tasks": [
                {"id": "cdc-001", "title": "Old claim", "status": "claimed", "worker": "worker-2", "claimed_at": 1.0},
                {"id": "cdc-002", "title": "Fresh claim", "status": "claimed", "worker": "worker-3", "claimed_at": 10**12},
            ]
        }), encoding="utf-8")
        released = backlog_store.requeue_stale_claims(lease_seconds=60)
        self.assertEqual(released, 1)
        data = json.loads(self.backlog_file.read_text(encoding="utf-8"))
        by_id = {t["id"]: t for t in data["tasks"]}
        self.assertEqual(by_id["cdc-001"]["status"], "pending")
        self.assertNotIn("worker", by_id["cdc-001"])
        self.assertEqual(by_id["cdc-002"]["status"], "claimed")


if __name__ == "__main__":
    unittest.main()
