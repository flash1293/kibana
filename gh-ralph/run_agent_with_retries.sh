#!/bin/bash
set -o pipefail

MAX_ATTEMPTS=10
TASK_FILE=".ralph_task.md"
OUTPUT_LOG="ralph-output.md"
ATTEMPT=0

# Function to check task status from spec
get_task_status() {
  # Extract the first non-empty line after "## Status"
  awk '
    BEGIN { in_status = 0 }
    /^##[[:space:]]+Status[[:space:]]*$/ { in_status = 1; next }
    in_status {
      if ($0 ~ /^[[:space:]]*$/) next
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", $0)
      print tolower($0)
      exit
    }
  ' "$TASK_FILE" 2>/dev/null || echo "unknown"
}

> "$OUTPUT_LOG"

while [[ $ATTEMPT -lt $MAX_ATTEMPTS ]]; do
  ATTEMPT=$((ATTEMPT + 1))
  echo ""
  echo "=============================================="
  echo "Agent attempt $ATTEMPT / $MAX_ATTEMPTS"
  echo "Time: $(date +'%Y-%m-%d %H:%M:%S')"
  echo "=============================================="
  echo ""

  # Run opencode with the current task
  RUN_EXIT_CODE=0
  if ! opencode run "$(cat "$TASK_FILE")" --model "$MODEL" 2>&1 | tee -a "$OUTPUT_LOG"; then
    RUN_EXIT_CODE=$?
    echo ""
    echo "[Attempt $ATTEMPT: opencode run failed with exit code $RUN_EXIT_CODE]"
  else
    echo ""
    echo "[Attempt $ATTEMPT: opencode run completed]"
  fi

  # Check task status
  STATUS=$(get_task_status)
  echo "[Task status: $STATUS]"

  if [[ "$STATUS" == "done" ]]; then
    echo ""
    echo "=============================================="
    echo "SUCCESS: Task completed on attempt $ATTEMPT"
    echo "=============================================="
    exit 0
  elif [[ "$STATUS" == "aborted" ]]; then
    echo ""
    echo "=============================================="
    echo "ABORTED: Task was explicitly aborted"
    echo "=============================================="
    exit 1
  fi

  # If we haven't reached max attempts and task isn't done, prepare for retry
  if [[ $ATTEMPT -lt $MAX_ATTEMPTS ]]; then
    echo ""
    echo "Task not complete. Preparing retry with feedback..."
    
    # Capture recent output for feedback
    FAILURE_CONTEXT=$(tail -300 "$OUTPUT_LOG" 2>/dev/null | tail -c 2000 || echo "No output captured")
    
    # Append feedback to task file for next iteration
    cat >> "$TASK_FILE" <<RETRY_FEEDBACK

---

## Attempt $ATTEMPT Feedback

The previous attempt ($ATTEMPT) did not complete the task. Here is context from the last part of that run:

\`\`\`
${FAILURE_CONTEXT}
\`\`\`

Continue working on the task. Try a different approach if the previous one failed. Remember to update the \`## Status\` section when done.

RETRY_FEEDBACK
    
    echo "[Appended retry feedback to task spec]"
  fi

  echo ""
done

echo ""
echo "=============================================="
echo "FAILURE: Max attempts ($MAX_ATTEMPTS) reached without completion"
echo "=============================================="
exit 1
