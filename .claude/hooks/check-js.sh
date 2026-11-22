#!/usr/bin/env bash
# PostToolUse: değişen JS dosyasının sözdizimini ve ilgili testini kontrol eder.
f=$(jq -r '.tool_input.file_path // empty')
case "$f" in *.js|*.cjs|*.mjs) ;; *) exit 0 ;; esac
[ -f "$f" ] || exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0
if ! out=$(node --check "$f" 2>&1); then
  echo "Sözdizimi hatası: $f" >&2; echo "$out" | head -20 >&2; exit 2
fi
base=$(basename "$f"); base="${base%.*}"; base="${base%.test}"
case "$base" in
  sw) t=tests/service-worker.test.cjs ;;
  auth|reserve) t=tests/auth-reserve.test.cjs ;;
  *) t="tests/$base.test.cjs" ;;
esac
[ -f "$t" ] || exit 0
if ! out=$(timeout 60 node --test "$t" 2>&1); then
  echo "Test başarısız: $t" >&2; echo "$out" | grep -E "not ok|Error|expected|actual" | head -25 >&2; exit 2
fi
exit 0
