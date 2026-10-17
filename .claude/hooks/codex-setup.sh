#!/bin/bash
# Prepara la CLI de Codex para el plugin codex@openai-codex en las sesiones en la nube.
# En local no hace nada: ahí se usa la instalación y el login propios de Codex.
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0

if ! command -v codex >/dev/null 2>&1; then
  npm install -g @openai/codex >/dev/null 2>&1 || { echo "codex-setup: no se pudo instalar @openai/codex" >&2; exit 0; }
fi

if [ -n "$OPENAI_API_KEY" ] && ! codex login status >/dev/null 2>&1; then
  printenv OPENAI_API_KEY | codex login --with-api-key >/dev/null 2>&1 \
    || echo "codex-setup: falló el login de Codex con OPENAI_API_KEY" >&2
fi
exit 0
