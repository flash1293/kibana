# Agent Loop Protocol - GitHub Actions (gh-ralph)

You are running in GitHub Actions. **There are no spec files.** Work directly with code and use `.ralph_status` file to signal completion.

## Task Types

### For NEW tasks (creating new PR)

1. Make your code changes directly
2. Create `.ralph_pr_title.md` with PR title (one line, no markdown)
3. Create `.ralph_pr_body.md` with PR description (summary of changes, context, testing notes)
4. Create `.ralph_status` with content: `done`

Example:
```bash
echo "Fix: Add dark mode toggle to settings" > .ralph_pr_title.md
cat > .ralph_pr_body.md <<EOF
## Summary
Added dark mode toggle to the application settings.

## Changes
- Added toggle component in Settings page
- Implemented theme state management

## Testing
- All tests pass
- Manual testing confirms toggle works
EOF
echo "done" > .ralph_status
```

### For ADJUST tasks (updating existing PR)

1. Make your code changes directly
2. Commit and push changes to your branch
3. Create `.ralph_status` with content: `done`

The workflow will automatically comment on the PR with a summary.

## Automatic Retry Mechanism

The workflow will run `opencode` up to **10 times** automatically:

- If `.ralph_status` exists with `done` → Task succeeded, workflow exits ✅
- If `.ralph_status` exists with `aborted` → Task failed, workflow exits ❌
- Otherwise → Continue to next attempt (up to 10 total)

**⚠️ CRITICAL:** You **MUST** create `.ralph_status` file with `done` to exit the loop. Without it, the workflow will retry until max attempts are exhausted, even if work is complete.

Between attempts, the workflow appends failure context from the previous run to your task prompt, so you can see what went wrong and try a different approach.

## Important Reminders

- You are running in CI. Do NOT attempt interactive git operations.
- All commits will be pushed by the workflow after you finish.
- Focus on making code changes. Update files directly.
- For type checking: use `node x-pack/solutions/observability/packages/kbn-ts-type-check-oblt-cli/type_check.js --project path/to/tsconfig.json` or fall back to `yarn test:type_check --project path/to/tsconfig.json`
- If validation fails, fix the issues and try again.

## Handling Failures

If you encounter errors (invalid tool calls, network issues, etc.):

1. The workflow captures the error context automatically
2. Next attempt includes the error in your task prompt as feedback
3. Try a different approach based on the error information
4. Keep working until successful or explicitly abort

The retry mechanism exists for exactly this reason - don't give up on transient failures.
