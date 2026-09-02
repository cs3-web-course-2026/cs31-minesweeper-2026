#!/usr/bin/env zsh
set -euo pipefail

SOURCE_REPO="/Users/ReDL/Documents/Universty/Teaching/Projects/Practices/cs31-minesweeper-2026"

TARGET_REPOS=(
  "/Users/ReDL/Documents/Universty/Teaching/Projects/Practices/cs32-minesweeper-2026"
)

COMMIT_MESSAGE="chore: sync .github config from cs31-minesweeper-2026"

# Snapshot .github into a temp directory BEFORE touching any repo.
# This ensures the source is never affected by rm -rf in the loop.
SNAPSHOT_DIR=$(mktemp -d)
cp -r "$SOURCE_REPO/.github/." "$SNAPSHOT_DIR/"
echo "Snapshot created at: $SNAPSHOT_DIR"

sync_repo() {
  local repoPath="$1"
  local repoName="${repoPath:t}"

  echo ""
  echo "========================================="
  echo "Syncing: $repoName"
  echo "========================================="

  if [[ ! -d "$repoPath" ]]; then
    echo "ERROR: Directory not found: $repoPath"
    return 1
  fi

  pushd "$repoPath" > /dev/null

  echo "→ Switching to main branch..."
  git checkout main

  echo "→ Pulling latest changes..."
  git pull origin main

  echo "→ Copying .github folder..."
  rm -rf ".github"
  cp -r "$SNAPSHOT_DIR" ".github"

  echo "→ Staging changes..."
  git add .github

  if git diff --cached --quiet; then
    echo "→ No changes detected, skipping commit."
  else
    echo "→ Committing..."
    git commit -m "$COMMIT_MESSAGE"

    echo "→ Pushing..."
    git push origin main
  fi

  popd > /dev/null
  echo "Done: $repoName"
}

for repoPath in "${TARGET_REPOS[@]}"; do
  sync_repo "$repoPath"
done

rm -rf "$SNAPSHOT_DIR"

echo ""
echo "========================================="
echo "All repos synced successfully."
echo "========================================="
