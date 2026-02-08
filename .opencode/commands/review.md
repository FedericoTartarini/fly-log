---
description: Run CodeRabbit review, fix issues, and validate with tests.
---

1. **Review**: Run `coderabbit --prompt-only --type uncommitted`.
2. **Fix**: For every suggestion found:
    - Apply the fix using the appropriate tool.
    - If a suggestion is ambiguous, pause and ask me.
3. **Verify**: Once all fixes are applied, run the project's test suite (e.g., `npm test`, `pytest`, or `go test`).
4. **Iterate**:
    - If tests fail: Analyze the error, fix the regression, and re-run tests.
    - If tests pass: Provide a summary of changes and the test results.
5. **Finalize**: Run `git status` and ask me if I'd like to commit these changes.