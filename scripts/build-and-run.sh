#!/usr/bin/env bash
set -euo pipefail
MODE="${1:-run}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
pkill -x FieldForge >/dev/null 2>&1 || true
npm run package:mac
APP_BUNDLE="$ROOT_DIR/dist/字段工坊.app"
case "$MODE" in
  run) /usr/bin/open -n "$APP_BUNDLE" ;;
  --verify|verify)
    /usr/bin/open -n "$APP_BUNDLE"
    sleep 2
    pgrep -x FieldForge >/dev/null
    ;;
  --debug|debug) lldb -- "$APP_BUNDLE/Contents/MacOS/FieldForge" ;;
  --logs|logs)
    /usr/bin/open -n "$APP_BUNDLE"
    /usr/bin/log stream --info --style compact --predicate 'process == "FieldForge"'
    ;;
  *) echo "用法：$0 [run|--verify|--debug|--logs]" >&2; exit 2 ;;
esac
