# ============================================================
# Agentes-OC · Oficina pixel · instalador para Windows (PowerShell)
# Uso: powershell -ExecutionPolicy Bypass -File oficina\instalar.ps1
#
# Qué hace (no borra nada tuyo):
#  1. Descarga Agent-Office (MIT, github.com/shreyashp47/Agent-Office) en una
#     versión fija y la compila. Sin scripts de instalación de npm.
#  2. Copia la web de la oficina de este repo (escena, nombres, arreglos).
#  3. Copia el plugin pixel-office.ts a %USERPROFILE%\.config\opencode\plugins
#     (si ya había uno distinto, lo respalda antes).
#  4. Deja el lanzador en %USERPROFILE%\.agentes-oc\oficina\oficina.ps1
# ============================================================
$ErrorActionPreference = "Stop"

$RepoDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$Dest     = if ($env:AGENTES_OC_OFICINA) { $env:AGENTES_OC_OFICINA } else { Join-Path $env:USERPROFILE ".agentes-oc\oficina" }
$AoRepo   = "https://github.com/shreyashp47/Agent-Office.git"
$AoCommit = "61fddba7f32a4c3dda894f20248d4caec9972a4e"
$Plugins  = Join-Path $env:USERPROFILE ".config\opencode\plugins"
$Stamp    = Get-Date -Format "yyyyMMdd-HHmmss"

Write-Host "=============================================="
Write-Host "  Agentes-OC · Oficina pixel (Windows)"
Write-Host "=============================================="
Write-Host "Destino : $Dest"
Write-Host "Plugin  : $Plugins\pixel-office.ts"

# --- 0. Requisitos
foreach ($cmd in "git", "node", "npm") {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    throw "Falta '$cmd'. Instálalo primero: winget install Git.Git / winget install OpenJS.NodeJS.LTS"
  }
}
$nodeMajor = [int](node -p "process.versions.node.split('.')[0]")
if ($nodeMajor -lt 20) { throw "Se necesita Node 20 o superior (tienes $(node -v))." }

# --- 1. Agent-Office en versión fija
New-Item -ItemType Directory -Force -Path $Dest | Out-Null
$App = Join-Path $Dest "app"
if (-not (Test-Path (Join-Path $App ".git"))) {
  Write-Host "→ Descargando Agent-Office…"
  git clone --quiet $AoRepo $App
}
git -C $App fetch --quiet origin
git -C $App checkout --quiet $AoCommit
Write-Host "→ Instalando dependencias y compilando (1-2 min)…"
Push-Location $App
try {
  npm ci --ignore-scripts --no-audit --no-fund --loglevel=error
  if ($LASTEXITCODE -ne 0) { throw "npm ci falló" }
  npm run build --silent | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "npm run build falló" }
} finally { Pop-Location }
if (-not (Test-Path (Join-Path $App "backend\dist\index.js"))) { throw "La compilación no generó backend\dist\index.js" }
Write-Host "✅ Agent-Office compilado ($AoCommit)"

# --- 2. Web de la oficina
$Front = Join-Path $Dest "runtime\frontend"
New-Item -ItemType Directory -Force -Path $Front | Out-Null
$Dist = Join-Path $Front "dist"
if (Test-Path $Dist) { Rename-Item $Dist "dist.backup-$Stamp" }
Copy-Item -Recurse (Join-Path $RepoDir "web") $Dist
$Keys = Join-Path $Dest "runtime\join-keys.json"
if (-not (Test-Path $Keys)) { Copy-Item (Join-Path $RepoDir "join-keys.json") $Keys }
Write-Host "✅ Web de la oficina copiada"

# --- 3. Plugin de OpenCode
New-Item -ItemType Directory -Force -Path $Plugins | Out-Null
$Target = Join-Path $Plugins "pixel-office.ts"
$Source = Join-Path $RepoDir "plugin\pixel-office.ts"
if ((Test-Path $Target) -and ((Get-FileHash $Target).Hash -ne (Get-FileHash $Source).Hash)) {
  Copy-Item $Target (Join-Path $Dest "pixel-office.ts.backup-$Stamp")
  Write-Host "ℹ️  Había otro pixel-office.ts: respaldo en $Dest\pixel-office.ts.backup-$Stamp"
}
Copy-Item $Source $Target -Force
Write-Host "✅ Plugin instalado"

# --- 4. Lanzador
Copy-Item (Join-Path $RepoDir "oficina.ps1") (Join-Path $Dest "oficina.ps1") -Force

Write-Host ""
Write-Host "=============================================="
Write-Host "  Listo. Para ver la oficina:"
Write-Host "    powershell -ExecutionPolicy Bypass -File `"$Dest\oficina.ps1`""
Write-Host "    (añade 'status' o 'stop' al final para ver quién está o cerrarla)"
Write-Host "  Reinicia OpenCode una vez para que cargue el plugin."
Write-Host "=============================================="
