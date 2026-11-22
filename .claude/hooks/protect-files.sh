#!/usr/bin/env bash
# PreToolUse: gizli ve üretilmiş dosyalara yazmayı engeller.
f=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')
[ -z "$f" ] && exit 0
rel="${f#"$CLAUDE_PROJECT_DIR"/}"
case "$rel" in
  .env.example) exit 0 ;;
  .env|.env.*|*/.env|*/.env.*|keys/*|*.pem|*.key|*.p12|*.pfx|*.jks|*.keystore)
    echo "Engellendi: '$rel' gizli/anahtar dosyası; düzenlenmez." >&2; exit 2 ;;
  package-lock.json)
    echo "Engellendi: package-lock.json elle düzenlenmez; npm install kullan." >&2; exit 2 ;;
  tarif/*.html)
    echo "Engellendi: tarif/ sayfaları üretilir; scripts/build-recipe-pages.js veya cocktails.json'u değiştirip 'npm run build:recipes' çalıştır." >&2; exit 2 ;;
  tailwind.css)
    echo "Engellendi: tailwind.css üretilir; tailwind.input.css'i değiştirip 'npm run build:css' çalıştır." >&2; exit 2 ;;
esac
exit 0
