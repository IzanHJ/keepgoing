#!/bin/bash
# Prepara la CLI de Codex para el plugin codex@openai-codex en las sesiones en la nube.
# En local no hace nada: ahí se usa la instalación y el login propios de Codex.
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0

if ! command -v codex >/dev/null 2>&1; then
  npm install -g @openai/codex >/dev/null 2>&1 || { echo "codex-setup: no se pudo instalar @openai/codex" >&2; exit 0; }
fi

# La clave de OpenAI llega como "secreto de red" (el proxy la añade a las
# peticiones a api.openai.com) o, si no, como variable OPENAI_API_KEY.
# Con secreto de red basta un login con una clave de relleno.
if ! codex login status >/dev/null 2>&1; then
  printf '%s' "${OPENAI_API_KEY:-sk-proxy-injected}" | codex login --with-api-key >/dev/null 2>&1 \
    || echo "codex-setup: falló el login de Codex" >&2
fi
exit 0
