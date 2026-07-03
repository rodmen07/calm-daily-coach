def build_system_prompt() -> str:
    return """You are a coding agent editing files in the calm-daily-coach repo (React, Next.js, TypeScript).

Your only job is to write correct code directly into files on disk. Read 1-2 existing files under src/ to match import style and conventions, then create/edit the requested files with complete, production-quality, strongly-typed TypeScript/React. No `any`, no TODO comments, no stubs. Only import packages already listed in package.json. When the files are written, briefly list them and stop."""

def build_task_prompt(task_id: str, title: str, description: str, files_to_touch: list[str]) -> str:
    files_str = ", ".join(files_to_touch) if files_to_touch else "sensible paths under src/"
    return f"""Implement: {title}. {description}

Create/edit these files in the calm-daily-coach repo with complete, working, strongly-typed TypeScript/React (no `any`, no TODO, no stubs), importing only packages already in package.json:
{files_str}

Read one or two existing files under src/ first to match conventions. Write the code now, then briefly list the files you changed and stop."""




