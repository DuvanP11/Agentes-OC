# Oficina pixel de OpenCode (Agentes-OC) · Windows (PowerShell)
#   .\oficina.ps1            arranca si hace falta y abre el navegador
#   .\oficina.ps1 start      arranca el servidor en segundo plano (127.0.0.1:4099)
#   .\oficina.ps1 stop       la detiene (OpenCode sigue funcionando igual)
#   .\oficina.ps1 status     estado y agentes conectados
#   .\oficina.ps1 log        últimas líneas del log
param([string]$Accion = "abrir")
$ErrorActionPreference = "Stop"

$Here    = Split-Path -Parent $MyInvocation.MyCommand.Path
$App     = Join-Path $Here "app"
$Runtime = Join-Path $Here "runtime"
$Port    = if ($env:PORT) { $env:PORT } else { "4099" }
$Url     = "http://127.0.0.1:$Port"
$Logs    = Join-Path $Here "logs"
$PidFile = Join-Path $Logs "oficina.pid"
$Log     = Join-Path $Logs "oficina.log"

function Test-Running {
  if (-not (Test-Path $PidFile)) { return $false }
  $p = Get-Process -Id (Get-Content $PidFile) -ErrorAction SilentlyContinue
  return [bool]$p
}

function Start-Oficina {
  if (Test-Running) { Write-Host "La oficina ya está corriendo en $Url"; return $true }
  $entry = Join-Path $App "backend\dist\index.js"
  if (-not (Test-Path $entry)) { Write-Host "Falta instalar la oficina: ejecuta oficina\instalar.ps1 del repo Agentes-OC"; return $false }
  New-Item -ItemType Directory -Force -Path $Logs | Out-Null
  $env:OFFICE_ROOT = $Runtime; $env:PORT = $Port; $env:HOST = "127.0.0.1"
  $p = Start-Process -FilePath "node" -ArgumentList "`"$entry`"" -WindowStyle Hidden -PassThru `
         -RedirectStandardOutput $Log -RedirectStandardError "$Log.err"
  Set-Content -Path $PidFile -Value $p.Id
  for ($i = 0; $i -lt 20; $i++) {
    try { Invoke-WebRequest -UseBasicParsing "$Url/health" -TimeoutSec 1 | Out-Null; Write-Host "Oficina lista en $Url"; return $true } catch { Start-Sleep -Milliseconds 250 }
  }
  Write-Host "No arrancó; mira: $Log"; return $false
}

switch ($Accion) {
  "start" { Start-Oficina | Out-Null }
  "stop" {
    if (Test-Running) { Stop-Process -Id (Get-Content $PidFile); Remove-Item $PidFile; Write-Host "Oficina detenida" }
    else { Write-Host "La oficina no estaba corriendo" }
  }
  "status" {
    if (Test-Running) {
      Write-Host "Corriendo (pid $(Get-Content $PidFile)) en $Url"
      $s = Invoke-RestMethod "$Url/status"
      $agents = @($s.agents.PSObject.Properties | ForEach-Object { $_.Value })
      Write-Host "$($agents.Count) sesión(es) conectada(s)"
      foreach ($a in $agents) { Write-Host " - $($a.name)  [$($a.state)] $($a.detail)" }
    } else { Write-Host "Detenida" }
  }
  "log" { Get-Content $Log -Tail 40 }
  default { if (Start-Oficina) { Start-Process "$Url/?demo=0" } }
}
