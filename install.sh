#!/usr/bin/env bash
# ============================================================
# Agentes-OC · Instalador para macOS / Linux
# Instala los agentes del paquete en la configuración de OpenCode
# sin borrar tus agentes existentes (hace backup primero).
# ============================================================
set -euo pipefail

# --- Rutas ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENTS_DIR="$SCRIPT_DIR/agents"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
CONFIG_FILE="$CONFIG_DIR/opencode.json"
BACKUP_FILE="$CONFIG_DIR/opencode.json.backup-$(date +%Y%m%d-%H%M%S)"

echo "=============================================="
echo "  Agentes-OC · Instalador (macOS/Linux)"
echo "=============================================="
echo "Paquete de agentes : $AGENTS_DIR"
echo "Config de OpenCode : $CONFIG_FILE"

# --- Pre-requisitos ---
if ! command -v python3 >/dev/null 2>&1; then
  echo "❌ Se requiere python3. Instálalo primero (brew install python)." >&2
  exit 1
fi

if [ ! -d "$AGENTS_DIR" ]; then
  echo "❌ No se encontró la carpeta agents/ junto al instalador." >&2
  exit 1
fi

# --- Backup ---
if [ -f "$CONFIG_FILE" ]; then
  cp "$CONFIG_FILE" "$BACKUP_FILE"
  echo "✅ Backup creado: $BACKUP_FILE"
fi

# --- Merge de agentes ---
python3 << PYEOF
import json, os, glob, sys

agents_dir = "$AGENTS_DIR"
config_file = "$CONFIG_FILE"
os.makedirs(os.path.dirname(config_file), exist_ok=True)

# Cargar config existente o crear nueva
if os.path.exists(config_file):
    with open(config_file) as f:
        cfg = json.load(f)
else:
    cfg = {}

cfg.setdefault("agent", {})

# Cargar agentes del paquete
agent_files = sorted(glob.glob(os.path.join(agents_dir, "*.json")))
agent_files = [f for f in agent_files if os.path.basename(f) != "manifest.json"]
installed, skipped = [], []

for f in agent_files:
    with open(f) as fh:
        a = json.load(fh)
    name = a.get("name")
    if not name:
        skipped.append(os.path.basename(f))
        continue
    # Construir definición en el formato de OpenCode
    definition = {
        "name": name,
        "mode": a.get("mode", "subagent"),
        "description": a.get("description", ""),
        "temperature": a.get("temperature"),
        "tools": a.get("tools", {}),
        "prompt": a.get("prompt", ""),
    }
    # No sobrescribir un agente existente con el mismo nombre (a menos que venga del paquete)
    cfg["agent"][name] = definition
    installed.append(name)

with open(config_file, "w") as f:
    json.dump(cfg, f, indent=2, ensure_ascii=False)

print(f"✅ Instalados: {len(installed)} agentes")
if skipped:
    print(f"⚠️  Omitidos (sin nombre): {', '.join(skipped)}")
print(f"📄 Config actualizada: {config_file}")
PYEOF

echo ""
echo "=============================================="
echo "  Listo. Reinicia OpenCode para cargar los agentes."
echo "  Verifica con: opencode agent list"
echo "=============================================="