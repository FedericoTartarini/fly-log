---
description: Full review, fix, test, and PR summary generation.
---

1. **Review**: Run `coderabbit --prompt-only --base main`.
2. **Fix**: Apply fixes for CodeRabbit suggestions.
3. **Verify**: Run the project's test suite. Self-heal if tests fail.
4. **Cleanup**:
   - Identify and delete temporary files generated during tests (e.g., `coverage/`, `*.log`, `dist/`).
   - Run a linter (e.g., `eslint --fix` or `ruff check --fix`) to polish formatting.
5. **Summarize**:
   - Analyze all changes made during this session.
   - Generate a concise Markdown summary including:
      - **What was changed**: Bullet points of key fixes.
      - **Why**: The CodeRabbit reasoning.
      - **Verification**: Confirmation that tests passed.
6. **Finalize**: Show me the summary, run `git status`, and I will then manually commit the changes.