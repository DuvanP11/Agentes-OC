# ============================================================
# Agentes-OC · Instalador para Windows (PowerShell)
# Instala los agentes del paquete en la configuración de OpenCode
# sin borrar tus agentes existentes (hace backup primero).
# Uso:  powershell -ExecutionPolicy Bypass -File install.ps1
# ============================================================
$ErrorActionPreference = "Stop"

# --- Rutas ---
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AgentsDir = Join-Path $ScriptDir "agents"
$ConfigDir = Join-Path $env:USERPROFILE ".config\opencode"
$ConfigFile = Join-Path $ConfigDir "opencode.json"
$BackupFile = Join-Path $ConfigDir ("opencode.json.backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Agentes-OC · Instalador (Windows)" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Paquete de agentes : $AgentsDir"
Write-Host "Config de OpenCode : $ConfigFile"

# --- Pre-requisitos ---
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Se requiere Python. Instálalo con: winget install Python.Python.3.12" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $AgentsDir)) {
    Write-Host "ERROR: No se encontró la carpeta agents/ junto al instalador." -ForegroundColor Red
    exit 1
}

# --- Backup ---
if (Test-Path $ConfigFile) {
    Copy-Item $ConfigFile $BackupFile
    Write-Host "Backup creado: $BackupFile" -ForegroundColor Green
}

# --- Merge de agentes ---
$pythonScript = @"
import json, os, glob

agents_dir = r"$AgentsDir"
config_file = r"$ConfigFile"
os.makedirs(os.path.dirname(config_file), exist_ok=True)

if os.path.exists(config_file):
    with open(config_file) as f:
        cfg = json.load(f)
else:
    cfg = {}

cfg.setdefault("agent", {})

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
    definition = {
        "name": name,
        "mode": a.get("mode", "subagent"),
        "description": a.get("description", ""),
        "temperature": a.get("temperature"),
        "tools": a.get("tools", {}),
        "prompt": a.get("prompt", ""),
    }
    cfg["agent"][name] = definition
    installed.append(name)

with open(config_file, "w") as f:
    json.dump(cfg, f, indent=2, ensure_ascii=False)

print(f"Instalados: {len(installed)} agentes")
if skipped:
    print(f"Omitidos (sin nombre): {', '.join(skipped)}")
print(f"Config actualizada: {config_file}")
"@

$pythonScript | python -

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Listo. Reinicia OpenCode para cargar los agentes." -ForegroundColor Green
Write-Host "  Verifica con: opencode agent list" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Cyan