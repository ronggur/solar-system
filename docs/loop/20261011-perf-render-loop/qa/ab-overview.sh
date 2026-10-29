#!/usr/bin/env bash
# Interleaved A/B of scenario (a) overview: BASE worktree build vs branch build, one run each per round.
# Usage: PW_DIR=<playwright dir> BASE_DIR=<base worktree> BRANCH_DIR=<repo> ROUNDS=3 ab-overview.sh <outdir>
set -u
OUT=${1:?outdir}; ROUNDS=${ROUNDS:-3}; PORT=4174
HERE=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$OUT"
for i in $(seq 1 "$ROUNDS"); do
  for v in base branch; do
    dir=$BASE_DIR; [ "$v" = branch ] && dir=$BRANCH_DIR
    (cd "$dir" && npx vite preview --port $PORT --strictPort >/dev/null 2>&1 & echo $! > "$OUT/pid")
    sleep 4
    node "$HERE/measure.mjs" perf --port $PORT --scenario overview --runs 1 > "$OUT/$v-$i.json" 2>"$OUT/$v-$i.err"
    pkill -f "vite preview --port $PORT" ; sleep 2
  done
done
rm -f "$OUT/pid"
