#!/usr/bin/env bash
# Oficina pixel de OpenCode (Agentes-OC) · macOS / Linux
#   oficina            arranca si hace falta y abre el navegador
#   oficina start      arranca el servidor en segundo plano (127.0.0.1:4099)
#   oficina stop       la detiene (OpenCode sigue funcionando igual)
#   oficina status     estado y agentes conectados
#   oficina log        últimas líneas del log
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP="$HERE/app"
RUNTIME="$HERE/runtime"
PORT="${PORT:-4099}"
URL="http://127.0.0.1:$PORT"
PIDFILE="$HERE/logs/oficina.pid"
LOG="$HERE/logs/oficina.log"
NODE="${NODE:-$(command -v node)}"

running() { [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; }

start() {
  if running; then echo "La oficina ya está corriendo en $URL"; return 0; fi
  if [ ! -f "$APP/backend/dist/index.js" ]; then
    echo "Falta instalar la oficina: ejecuta oficina/instalar.sh del repo Agentes-OC"; return 1
  fi
  mkdir -p "$HERE/logs"
  OFFICE_ROOT="$RUNTIME" PORT="$PORT" HOST=127.0.0.1 \
    nohup "$NODE" "$APP/backend/dist/index.js" >>"$LOG" 2>&1 &
  echo $! >"$PIDFILE"
  for _ in $(seq 1 20); do
    curl -fs "$URL/health" >/dev/null 2>&1 && { echo "Oficina lista en $URL"; return 0; }
    sleep 0.25
  done
  echo "No arrancó; mira: $LOG"; return 1
}

stop() {
  if running; then kill "$(cat "$PIDFILE")" && rm -f "$PIDFILE" && echo "Oficina detenida"
  else echo "La oficina no estaba corriendo"; fi
}

abrir() {
  if command -v open >/dev/null 2>&1; then open "$URL/?demo=0"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL/?demo=0"
  else echo "Abre en tu navegador: $URL/?demo=0"; fi
}

case "${1:-abrir}" in
  start) start ;;
  stop) stop ;;
  status)
    if running; then
      echo "Corriendo (pid $(cat "$PIDFILE")) en $URL"
      curl -fs "$URL/status" | "$NODE" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=Object.values(JSON.parse(s).agents);console.log(a.length+" sesión(es) conectada(s)");for(const x of a)console.log(` - ${x.name}  [${x.state}] ${x.detail??""}`)})'
    else echo "Detenida"; fi ;;
  log) tail -n 40 "$LOG" ;;
  abrir|open) start && abrir ;;
  *) sed -n 2,7p "$0" ;;
esac
