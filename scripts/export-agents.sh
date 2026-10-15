#!/usr/bin/env bash
# ============================================================
# Agentes-OC · Exportador
# Regenera el paquete agents/ desde la configuración real de
# OpenCode de la máquina actual.
# Uso:  bash scripts/export-agents.sh
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENTS_DIR="$SCRIPT_DIR/agents"
TMP_DIR="$(mktemp -d)"

echo "=============================================="
echo "  Agentes-OC · Exportador de agentes"
echo "=============================================="

if ! command -v opencode >/dev/null 2>&1; then
  echo "❌ opencode no está en PATH. Usa la ruta completa (~/.opencode/bin/opencode)." >&2
  exit 1
fi

OPCODE="$(command -v opencode)"

# Listar agentes (NOTA: la salida va primero a un archivo porque al canalizar
# `opencode agent list | grep` directamente la tubería trunca la salida y solo
# llegan ~15 nombres; con redirección a archivo se obtienen los N completos).
echo "📋 Listando agentes…"
$OPCODE agent list 2>/dev/null > "$TMP_DIR/list.txt" || true
AGENTS="$(grep -E '^\s*[a-z][a-z0-9-]*\s*\(' "$TMP_DIR/list.txt" | awk '{print $1}' | sort -u)"

if [ -z "$AGENTS" ]; then
  echo "❌ No se pudieron listar agentes." >&2
  exit 1
fi

COUNT=0
for agent in $AGENTS; do
  $OPCODE debug agent "$agent" > "$TMP_DIR/$agent.json" 2>/dev/null || true
  if [ -s "$TMP_DIR/$agent.json" ]; then
    COUNT=$((COUNT + 1))
  fi
done

echo "✅ Exportados $COUNT agentes a $TMP_DIR"

LISTED=$(printf '%s\n' $AGENTS | wc -l | tr -d ' ')
if [ "$COUNT" -ne "$LISTED" ]; then
  echo "⚠️ Se exportaron $COUNT de $LISTED agentes listados. Revisa los fallos de 'opencode debug agent'." >&2
fi

# Procesar a formato limpio
mkdir -p "$AGENTS_DIR"
export TMP_DIR AGENTS_DIR
python3 << 'PYEOF'
import json, os, glob

SRC = os.environ["TMP_DIR"]
DST = os.environ["AGENTS_DIR"]
manifest = []

for f in sorted(glob.glob(os.path.join(SRC, "*.json"))):
    name = os.path.basename(f).replace(".json", "")
    try:
        d = json.load(open(f))
    except Exception:
        continue

    clean = {
        "name": d.get("name", name),
        "mode": d.get("mode", "subagent"),
        "description": d.get("description", ""),
        "temperature": d.get("temperature"),
        "tools": d.get("tools", {}),
        "prompt": d.get("prompt", ""),
    }

    with open(os.path.join(DST, f"{name}.json"), "w") as out:
        json.dump(clean, out, indent=2, ensure_ascii=False)

    tools_str = ", ".join(sorted(k for k, v in clean["tools"].items() if v)) if isinstance(clean["tools"], dict) else "(por defecto)"
    md = f"""# {name}

- **Modo**: `{clean['mode']}`
- **Temperatura**: {clean['temperature'] if clean['temperature'] is not None else 'por defecto'}
- **Herramientas**: {tools_str}

## Descripción

{clean['description']}

## Prompt / Instrucciones

```markdown
{clean['prompt']}
```
"""
    with open(os.path.join(DST, f"{name}.md"), "w") as out:
        out.write(md)

    manifest.append({
        "name": name,
        "mode": clean["mode"],
        "description": clean["description"][:120],
        "file": f"{name}.json",
    })

with open(os.path.join(DST, "manifest.json"), "w") as out:
    json.dump({"total": len(manifest), "generated": __import__("datetime").date.today().isoformat(), "agents": manifest}, out, indent=2, ensure_ascii=False)

print(f"✅ Paquete regenerado: {len(manifest)} agentes en {DST}")
PYEOF

rm -rf "$TMP_DIR"
echo "=============================================="
echo "  Listo. Revisa git status y haz commit si cambió algo."
echo "=============================================="