#!/usr/bin/env bash
# Maintains per-PR Storybook builds on the shared `sb-previews` branch.
#
#   sb-previews.sh publish <pr-number> <build-dir>   copy a build to sb/pr-<n>/
#   sb-previews.sh remove <pr-number>                delete sb/pr-<n>/
#   sb-previews.sh reap                              delete sb/pr-*/ whose PR is closed or merged (needs GH_TOKEN)
#
# Many PR workflows push to this one branch, so each attempt starts from the latest remote
# state and re-applies its change before pushing. Run it from a checkout of this repo.
set -euo pipefail

BRANCH=sb-previews
MODE="${1:?mode required: publish | remove | reap}"
PR="${2:-}"
SRC="${3:-}"

case "$MODE" in
  publish) [[ -n "$PR" && -d "$SRC" ]] || { echo "usage: $0 publish <pr> <build-dir>" >&2; exit 2; } ;;
  remove) [[ -n "$PR" ]] || { echo "usage: $0 remove <pr>" >&2; exit 2; } ;;
  reap) ;;
  *) echo "unknown mode: $MODE" >&2; exit 2 ;;
esac
[[ -z "$SRC" ]] || SRC="$(cd "$SRC" && pwd)"

export GIT_AUTHOR_NAME="github-actions[bot]"
export GIT_AUTHOR_EMAIL="41898282+github-actions[bot]@users.noreply.github.com"
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME"
export GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"

WORK="$(mktemp -d)"
trap 'git worktree remove --force "$WORK" >/dev/null 2>&1 || true' EXIT
git worktree add --quiet --detach "$WORK"
cd "$WORK"

reset_to_remote() {
  if git fetch --quiet --depth 1 origin "$BRANCH" 2>/dev/null; then
    git checkout --quiet -B "$BRANCH" FETCH_HEAD
  elif [[ "$MODE" == publish ]]; then
    git checkout --quiet --orphan "$BRANCH"
    git rm -rf --quiet . >/dev/null 2>&1 || true
    git clean -fdxq
  else
    echo "$BRANCH does not exist yet; nothing to do."
    exit 0
  fi
}

apply_change() {
  case "$MODE" in
    publish)
      rm -rf "sb/pr-$PR"
      mkdir -p sb
      cp -R "$SRC" "sb/pr-$PR"
      MESSAGE="chore: storybook preview for #$PR"
      ;;
    remove)
      rm -rf "sb/pr-$PR"
      MESSAGE="chore: remove storybook preview for #$PR"
      ;;
    reap)
      local removed=()
      for dir in sb/pr-*/; do
        [[ -d "$dir" ]] || continue
        local n="${dir#sb/pr-}"
        n="${n%/}"
        local state
        state="$(gh pr view "$n" --json state -q .state 2>/dev/null || echo UNKNOWN)"
        if [[ "$state" == CLOSED || "$state" == MERGED ]]; then
          rm -rf "$dir"
          removed+=("#$n")
        fi
      done
      MESSAGE="chore: reap storybook previews ${removed[*]:-}"
      ;;
  esac
  git add -A -f sb 2>/dev/null || true
}

for attempt in 1 2 3 4 5; do
  reset_to_remote
  apply_change
  if git diff --cached --quiet; then
    echo "No changes for $BRANCH."
    exit 0
  fi
  git commit --quiet --no-verify -m "$MESSAGE"
  if git push --quiet --no-verify origin "HEAD:refs/heads/$BRANCH"; then
    echo "Pushed: $MESSAGE"
    exit 0
  fi
  echo "Push rejected (attempt $attempt); retrying on top of the latest $BRANCH."
  sleep $((attempt * 3))
done

echo "Could not push to $BRANCH after 5 attempts." >&2
exit 1