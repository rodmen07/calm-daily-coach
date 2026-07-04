def build_system_prompt() -> str:
    base = """You are a coding agent editing files in the calm-daily-coach repo (React, Next.js, TypeScript).

Your only job is to write correct code directly into files on disk. Read 1-2 existing files under src/ to match import style and conventions, then create/edit the requested files with complete, production-quality, strongly-typed TypeScript/React. No `any`, no TODO comments, no stubs. Only import packages already listed in package.json. When the files are written, briefly list them and stop."""
    digest = _memory_digest()
    if digest:
        base += (
            "\n\nProject knowledge learned from past tasks (apply it; do not repeat these mistakes):\n"
            + digest
        )
    return base


def _memory_digest() -> str:
    """Best-effort load of the cumulative project memory. Never fail the run."""
    try:
        import memory
        return memory.build_memory_digest()
    except Exception:
        return ""


def build_task_prompt(task_id: str, title: str, description: str, files_to_touch: list[str]) -> str:
    if files_to_touch:
        if len(files_to_touch) == 1:
            files_phrase = files_to_touch[0]
        else:
            files_phrase = ", ".join(files_to_touch[:-1]) + " and " + files_to_touch[-1]
        files_sentence = f" Create these files: {files_phrase}."
    else:
        files_sentence = ""
    prompt = (
        f"Implement: {title}. {description}{files_sentence} "
        f"Write complete, strongly-typed, working TypeScript/React code (no `any`, no TODO) "
        f"directly into the files, importing only packages already in package.json. Then stop."
    )
    # Fold learned knowledge into the task prompt itself. The Copilot CLI path
    # drops the system prompt, so the task prompt is the only reliable carrier.
    digest = _memory_digest()
    if digest:
        prompt += (
            "\n\nProject knowledge learned from past tasks (apply it; do not repeat these mistakes):\n"
            + digest
        )
    return prompt





