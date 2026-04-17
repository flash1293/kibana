# Agent Loop Protocol - Reference

This document describes the agent loop concepts for both local and GitHub Actions contexts.

**For context-specific guidance:**
- **Local execution (ralph.sh):** See `AGENT_LOOP_PROTOCOL_LOCAL.md`
- **GitHub Actions (gh-ralph):** See `AGENT_LOOP_PROTOCOL_GHRALPH.md`

---

## Overview

You are executing work in an iterative loop. The specific mechanisms depend on your execution context:

## Important paths and metadata
- **Spec file path**: Provided below - you MUST update this file after completing each task
- **Reference files**: Located in the "Reference files directory" provided below - use absolute paths when reading these
- **GitHub username**: Provided below - use this when creating PRs or leaving comments (e.g., "wait for @username to chime in")

## Required behavior
- Pick the **first unchecked** task in `## Tasks`.
- Implement **exactly one task** (including its acceptance checks).
- **PR-only workflow policy:** use `gh` for PR operations (create/view/edit/comment) and work through PR branches only. **NEVER push to upstream (`elastic/kibana`) — always push to the user's fork.** Use `git push <fork-remote> HEAD:<branch>` (e.g., `git push origin HEAD:ralph/issue-123`). When updating an existing PR, check where the PR head lives with `gh pr view <N> --repo elastic/kibana --json headRepository,headRefName` and push to that fork remote. Creating a new PR from your fork branch to `elastic/kibana:main` is allowed and encouraged for new work.
- **Commit authorship (CRITICAL):** All commits **MUST** be authored by the GitHub username provided below — never by `cursor` or any other identity. Before every `git push`, run `git log -1 --format='%an <%ae>'` and verify the author matches the GitHub user. If it doesn't, amend with `git commit --amend --author="Name <email>"` before pushing. See `spec/pr_creation.md` and `spec/github_fetching.md` for details.
- Update the spec file (at the path provided below):
  - Mark the task complete (`[x]`).
  - Append discoveries/gotchas to `## Additional Context`.
  - Adjust remaining tasks if reality differs (split/merge/reword as needed).
  - Update `## Status`:
    - `in-progress` when the first implementation task begins
    - `done` only when the spec's "Definition of done" is met (and all tasks needed to satisfy it are complete)
- Exit after updating the spec so the next fresh session can continue.
- **Lessons learned:** If you have generic lessons learned (e.g. updates to shared guidance in `spec/` or discoveries worth recording), create an issue in the coordination repo titled **"generic lessons learned"**, add the **wontfix** label, and put your notes in the body. This works without push/PR permissions and keeps the issue from being picked up by workers.

## Automatic retry behavior (GitHub Actions workflow)

When running in the GitHub Actions workflow (`gh-ralph`), the agent loop is **wrapped in an automatic retry mechanism**:

- **Max 10 attempts**: The workflow will run `opencode` up to 10 times automatically.
- **Status detection**: After each run, the workflow checks for task completion:
  - If `.ralph_status` file exists with `done` → Task succeeded, workflow exits successfully ✅
  - If `.ralph_status` file exists with `aborted` → Task was explicitly abandoned, workflow exits with error ❌
  - Otherwise → Continue to next attempt (up to 10 total)
- **⚠️ CRITICAL - How to signal completion in gh-ralph**: 
  - When your work is complete, **create a file named `.ralph_status`** with the single word: `done`
  - Example: `echo "done" > .ralph_status`
  - This signals to the workflow that the task is complete and it should exit the retry loop
  - Without this file, the workflow will keep retrying until max attempts (10) are exhausted
- **Failure context**: Between attempts, the workflow appends feedback from the previous attempt to `.ralph_task.md`. This gives you visibility into what failed so you can adjust your approach.

### Why this matters

If you encounter an invalid tool call, network error, or other transient failure, you don't need to stop. The workflow will:
1. Capture the error context
2. Feed it back to you
3. Let you retry with the error information

This makes the automated workflow much more resilient than a single run.

