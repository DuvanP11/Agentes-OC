#!/usr/bin/env bash
# ============================================================
# Agentes-OC · Oficina pixel · instalador para macOS / Linux
# Ver a tu equipo de agentes de OpenCode trabajando en una oficina pixel art.
#
# Qué hace (no borra nada tuyo):
#  1. Descarga Agent-Office (MIT, github.com/shreyashp47/Agent-Office) en una
#     versión fija y la compila. Sin scripts de instalación de npm.
#  2. Copia la web de la oficina de este repo (escena, nombres, arreglos).
#  3. Copia el plugin pixel-office.ts a ~/.config/opencode/plugins/
#     (si ya había uno distinto, lo respalda antes).
#  4. Deja el lanzador en ~/.agentes-oc/oficina/oficina
# Todo queda en ~/.agentes-oc/oficina (cámbialo con AGENTES_OC_OFICINA).
# ============================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${AGENTES_OC_OFICINA:-$HOME/.agentes-oc/oficina}"
AO_REPO="https://github.com/shreyashp47/Agent-Office.git"
AO_COMMIT="61fddba7f32a4c3dda894f20248d4caec9972a4e"
PLUGINS="${XDG_CONFIG_HOME:-$HOME/.config}/opencode/plugins"
STAMP="$(date +%Y%m%d-%H%M%S)"

echo "=============================================="
echo "  Agentes-OC · Oficina pixel (macOS/Linux)"
echo "=============================================="
echo "Destino : $DEST"
echo "Plugin  : $PLUGINS/pixel-office.ts"

# --- 0. Requisitos
for cmd in git node npm curl; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "❌ Falta '$cmd'. Instálalo primero (macOS: brew install git node)." >&2; exit 1; }
done
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || { echo "❌ Se necesita Node 20 o superior (tienes $(node -v))." >&2; exit 1; }

# --- 1. Agent-Office en versión fija
mkdir -p "$DEST"
if [ ! -d "$DEST/app/.git" ]; then
  echo "→ Descargando Agent-Office…"
  git clone --quiet "$AO_REPO" "$DEST/app"
fi
git -C "$DEST/app" fetch --quiet origin || true
git -C "$DEST/app" checkout --quiet "$AO_COMMIT"
echo "→ Instalando dependencias y compilando (1-2 min)…"
( cd "$DEST/app" && npm ci --ignore-scripts --no-audit --no-fund --loglevel=error && npm run build --silent >/dev/null )
[ -f "$DEST/app/backend/dist/index.js" ] || { echo "❌ La compilación no generó backend/dist/index.js" >&2; exit 1; }
echo "✅ Agent-Office compilado ($AO_COMMIT)"

# --- 2. Web de la oficina (la de este repo reemplaza a la anterior instalada)
mkdir -p "$DEST/runtime/frontend"
if [ -d "$DEST/runtime/frontend/dist" ]; then
  mv "$DEST/runtime/frontend/dist" "$DEST/runtime/frontend/dist.backup-$STAMP"
fi
cp -R "$REPO_DIR/web" "$DEST/runtime/frontend/dist"
[ -f "$DEST/runtime/join-keys.json" ] || cp "$REPO_DIR/join-keys.json" "$DEST/runtime/join-keys.json"
echo "✅ Web de la oficina copiada"

# --- 3. Plugin de OpenCode
mkdir -p "$PLUGINS"
if [ -f "$PLUGINS/pixel-office.ts" ] && ! cmp -s "$PLUGINS/pixel-office.ts" "$REPO_DIR/plugin/pixel-office.ts"; then
  cp "$PLUGINS/pixel-office.ts" "$DEST/pixel-office.ts.backup-$STAMP"
  echo "ℹ️  Había otro pixel-office.ts: respaldo en $DEST/pixel-office.ts.backup-$STAMP"
fi
cp "$REPO_DIR/plugin/pixel-office.ts" "$PLUGINS/pixel-office.ts"
echo "✅ Plugin instalado"

# --- 4. Lanzador
cp "$REPO_DIR/oficina.sh" "$DEST/oficina"
chmod +x "$DEST/oficina"

echo ""
echo "=============================================="
echo "  Listo. Para ver la oficina:"
echo "    $DEST/oficina          (arranca y abre el navegador)"
echo "    $DEST/oficina status   (quién está conectado)"
echo "    $DEST/oficina stop"
echo "  Reinicia OpenCode una vez para que cargue el plugin."
echo "=============================================="
