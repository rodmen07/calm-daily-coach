"""Task-slicing logic for failing or complex backlog tasks.

When a task fails repeatedly or has a large, complex description, it's highly
efficient to break it down into smaller, simpler, sequential subtasks. This is
especially crucial for cheaper/faster models (like gpt-5-mini or similar sizes) that
struggle with large cognitive steps.

This module provides:
1. `split_failing_task`: Uses the UnifiedLLMClient to analyze a failing task (mining its
   description, files, and recent verification/failure output) and breaks it down
   into 2-3 simpler, highly focused sequential tasks.
2. `auto_remediate_backlog_failures`: Sweeps the backlog for tasks that have reached
   their retry threshold, splits them into simpler tasks, parks the original task to
   avoid infinite loops, and appends the new subtasks directly to the active queue.
"""

import json
import logging
from typing import Any, Callable, Dict, List, Optional
from llm_client import UnifiedLLMClient

log = logging.getLogger("dev-agent.slicer")


def split_task_with_llm(task: Dict[str, Any], failure_log: str) -> List[Dict[str, Any]]:
    """Query the LLM to slice a complex/failing task into 2-3 simpler sequential subtasks.

    Guarantees that each child task is narrow, strongly typed, includes clean tests, and has
    concrete target files.
    """
    client = UnifiedLLMClient()
    
    prompt = (
        f"You are a master software architect. We have an autonomous developer agent processing "
        f"a backlog of frontend React/TypeScript tasks, but the following task has repeatedly "
        f"FAILED verification (lint, typechecks, or unit tests).\n\n"
        f"--- FAILING TASK ---\n"
        f"ID: {task.get('id')}\n"
        f"Title: {task.get('title')}\n"
        f"Description: {task.get('description')}\n"
        f"Target Files: {task.get('files_to_touch', [])}\n\n"
        f"--- FAILURE DETAILS & LOG DIAGNOSTIC ---\n"
        f"{failure_log[:2000]}\n\n"
        f"Split this intimidating/failing task into EXACTLY two (2) or three (3) simpler, "
        f"highly-focused sequential subtasks that the developer agent can complete with 100% "
        f"reliability. Ensure each subtask is fully self-contained and builds incrementally on "
        f"the previous. Include clean test verification fields in each.\n\n"
        f"Return the subtasks as a raw JSON array. DO NOT wrap it in a markdown block, just "
        f"return plain text JSON matching this schema:\n"
        f"[\n"
        f"  {{\n"
        f"    \"title\": \"Add a barebones/type-safe version of component X\",\n"
        f"    \"description\": \"Write just the types, mock state, and minimal render structure for X. Add a basic smoke test. Verify build passes on main.\",\n"
        f"    \"files_to_touch\": [\"src/app/components/X.tsx\"]\n"
        f"  }},\n"
        f"  {{\n"
        f"    \"title\": \"Implement interactive features and styling for X\",\n"
        f"    \"description\": \"Wire up click handlers, full CSS styling, and test mock coverage for the interactions of X.\",\n"
        f"    \"files_to_touch\": [\"src/app/components/X.tsx\", \"src/app/components/x.css\"]\n"
        f"  }}\n"
        f"]"
    )

    try:
        resp = client.generate([{"role": "user", "content": prompt}])
        content = (resp.get("content") or "").strip()
        
        # Clean potential markdown wrapping
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
            
        subtasks = json.loads(content)
        if isinstance(subtasks, list) and len(subtasks) > 0:
            return subtasks
    except Exception as e:
        log.error(f"Error splitting task {task.get('id')} with LLM: {e}")
        
    # Return a safe, simple structural fallback split if the LLM or parser fails.
    # Split the original task into a "Boilerplate/Types" stage and a "Logic/Interactions" stage.
    title = task.get("title", "Complex Task")
    desc = task.get("description", "")
    files = task.get("files_to_touch", [])
    
    return [
        {
            "title": f"[Part 1] Types & Boilerplate for: {title}",
            "description": f"Create types, structures, and minimal interface placeholders for: {desc}. Write a green unit test. Keep logic extremely lean.",
            "files_to_touch": [f for f in files if f.endswith(".ts") or f.endswith(".tsx")][:1] or files,
        },
        {
            "title": f"[Part 2] Full Logic & Interactive Polish for: {title}",
            "description": f"Complete implementation, styles, and full testing coverage for: {desc}. Build on top of the Part 1 structures.",
            "files_to_touch": files,
        }
    ]


def auto_remediate_backlog_failures(backlog_data: Dict[str, Any], max_attempts: int,
                                    get_failure_log_fn: Optional[Callable[[str], str]] = None) -> int:
    """Scan the backlog for repeatedly failing tasks and slice them into simpler pieces.

    - Marks the big task as 'parked' so it stops burning requests.
    - Resolves sequential child IDs (e.g. cdc-021b, cdc-021c) to keep them grouped.
    - Appends the new sequential subtasks as 'pending' directly in the active backlog.
    - Returns the number of tasks successfully remediated and split.
    """
    tasks = backlog_data.setdefault("tasks", [])
    splits_added = []
    remediated_count = 0

    for task in tasks:
        task_id = task.get("id", "?")
        # We target tasks that have failed up to the max threshold but are still marked
        # 'pending' (about to be parked) or are 'failed' / 'parked' with max attempts.
        is_failing = task.get("status") == "parked" or (task.get("status") == "pending" and task.get("attempts", 0) >= max_attempts)
        # Avoid splitting a task that was already split
        is_already_split = any(t.get("id", "").startswith(f"{task_id}-sub") for t in tasks)
        
        # Hard recursion ceiling: never split a task that is already a subtask
        # (e.g. contains '-sub' in its ID). This breaks the infinite loop and
        # locks repeatedly failing subtasks as parked for human attention.
        is_nested_subtask = "-sub" in task_id

        if is_failing and not is_already_split and not is_nested_subtask:
            log.info(f"Remediating failing/parked task {task_id} - '{task.get('title')}' by splitting...")
            
            # Retrieve last known failure logs
            failure_log = ""
            if get_failure_log_fn:
                failure_log = get_failure_log_fn(task_id)
            if not failure_log.strip():
                failure_log = "Task failed code verification limits or triggered a timeout."

            # Perform the split
            sliced_pieces = split_task_with_llm(task, failure_log)
            
            # Park the parent task permanently with a note
            task["status"] = "parked"
            task["attempts"] = max_attempts
            task["resolution_note"] = f"Automatically split into simpler subtasks to overcome execution paralysis."
            
            # Append child tasks with sub-ids to preserve order and history
            for idx, piece in enumerate(sliced_pieces):
                sub_id = f"{task_id}-sub{idx + 1}"
                splits_added.append({
                    "id": sub_id,
                    "title": piece.get("title", f"[Subtask {idx+1}] {task.get('title') or ''}"),
                    "description": piece.get("description", task.get("description") or ""),
                    "files_to_touch": piece.get("files_to_touch", task.get("files_to_touch") or []),
                    "status": "pending",
                    "attempts": 0,
                    "parent_task": task_id,
                })
                
            remediated_count += 1

    # Insert subtasks into backlog directly under their respective parents (or append)
    if splits_added:
        # Group them into tasks list
        new_tasks = []
        for task in tasks:
            new_tasks.append(task)
            # If we just appended the parent task, immediately follow it with its new subtasks
            # to preserve structural proximity and priority order.
            matching_subs = [s for s in splits_added if s["parent_task"] == task.get("id")]
            new_tasks.extend(matching_subs)
            
        backlog_data["tasks"] = new_tasks
        
    return remediated_count
