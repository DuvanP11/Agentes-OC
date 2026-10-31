# 🚀 Cómo instalar OpenCode + el paquete Agentes-OC

Guía paso a paso para **macOS** y **Windows**. Al final hay **prompts listos para pegar** en **Claude Code** o en **OpenCode** que instalan todo el paquete automáticamente, incluida la **oficina pixel** para ver a tu equipo trabajando.

---

## 📋 Resumen del proceso

```
1. Instalar prerrequisitos (git, node, python, jq, gh)
2. Instalar OpenCode CLI
3. Clonar el repo Agentes-OC
4. Ejecutar el instalador de agentes (install.sh / install.ps1)
5. Instalar skills, plugins y MCP recomendados
6. Verificar con opencode agent list
7. (Nuevo) Instalar la oficina pixel y ver a tu equipo
```

---

## 🍎 macOS — paso a paso

### Paso 1 · Prerrequisitos

Abre **Terminal** y ejecuta:

```bash
# 1. Homebrew (gestor de paquetes) — si no lo tienes
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Herramientas base
brew install git node python jq gh

# 3. Verifica versiones
git --version && node --version && python3 --version && jq --version && gh --version
```

> Si algo ya está instalado, Homebrew lo omite. No pasa nada.

### Paso 2 · Instalar OpenCode

```bash
# Descarga el instalador y ejecútalo
curl -fsSL https://opencode.ai/install -o /tmp/opencode-install.sh
bash /tmp/opencode-install.sh

# Verifica
~/.opencode/bin/opencode --version
```

> Si quieres usarlo desde cualquier terminal, agrega al final de `~/.zshrc`:
> ```bash
> export PATH="$HOME/.opencode/bin:$PATH"
> ```

### Paso 3 · Clonar el paquete

```bash
git clone https://github.com/DuvanP11/Agentes-OC.git ~/dev/Agentes-OC
cd ~/dev/Agentes-OC
```

### Paso 4 · Instalar los agentes

```bash
bash install.sh
```

Esto hace **backup** de tu `opencode.json` y agrega los **56 agentes** (7 primarios + 49 subagentes) sin borrar los que ya tengas.

### Paso 5 · Instalar skills, plugins y MCP

Los archivos de configuración de OpenCode viven en la carpeta `opencode` dentro de `.config` de tu home. Para no escribirla a mano, la derivamos en el comando:

```bash
# Ubicar la carpeta de config de OpenCode
OC_CFG="$(printf '%s/%s' "$HOME/.config" "opencode")"
echo "Config en: $OC_CFG"

# Skills de seguridad (recomendado)
mkdir -p "$OC_CFG/skills"
# (copia las skills que quieras desde el repo o instala el ecosistema ECC)

# Plugin de memoria persistente
opencode plugin @cioffi_ai/opencode-memory

# MCP de documentos (docling)
pip3 install docling-mcp-server
```

> 💡 **Nota**: las ~237 skills de tu entorno actual provienen del ecosistema ECC.
> Para replicarlas en otra máquina, copia la carpeta `skills` de tu config de
> OpenCode o reinstala ECC. El catálogo completo está en la web (`js/skills.js`)
> y en la sección Skills del sitio.

### Paso 6 · Verificar

```bash
opencode agent list | grep -E '^\s*[a-z]' | head -20
# Deberías ver: director, fullstack-product-engineer, security-engineer, etc.
```

### Paso 7 · Oficina pixel: ve a tu equipo (nuevo)

Además de tener los agentes, puedes **verlos** en una oficina pixel art con su
nombre, su escritorio y lo que están haciendo en vivo. Necesita **Node 20+**
(ya lo instalaste en el paso 1).

```bash
cd ~/dev/Agentes-OC
bash oficina/instalar.sh          # descarga Agent-Office, compila y agrega el plugin
~/.agentes-oc/oficina/oficina     # arranca y abre http://127.0.0.1:4099/?demo=0
```

**Reinicia OpenCode una vez** para que cargue el plugin. Más detalles en
[`oficina/README.md`](oficina/README.md).

---

## 🪟 Windows — paso a paso

### Paso 1 · Prerrequisitos

Abre **PowerShell** (como usuario normal) y ejecuta:

```powershell
# 1. Herramientas base (winget instala lo que falte)
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install Python.Python.3.12
winget install jqlang.jq
winget install GitHub.cli
winget install Microsoft.WindowsTerminal

# 2. Verifica versiones
git --version; node --version; python --version; jq --version; gh --version
```

> Si algo ya está instalado, winget lo omite.

### Paso 2 · Instalar OpenCode

```powershell
# Descarga y ejecuta el instalador
irm https://opencode.ai/install.ps1 | iex

# Verifica
opencode --version
```

### Paso 3 · Clonar el paquete

```powershell
git clone https://github.com/DuvanP11/Agentes-OC.git $HOME\dev\Agentes-OC
cd $HOME\dev\Agentes-OC
```

### Paso 4 · Instalar los agentes

```powershell
powershell -ExecutionPolicy Bypass -File install.ps1
```

Esto hace **backup** de tu `opencode.json` y agrega los **56 agentes** sin borrar los existentes.

### Paso 5 · Instalar skills, plugins y MCP

```powershell
# Plugin de memoria persistente
opencode plugin @cioffi_ai/opencode-memory

# MCP de documentos (docling)
pip install docling-mcp-server
```

### Paso 6 · Verificar

```powershell
opencode agent list
# Deberías ver: director, fullstack-product-engineer, security-engineer, etc.
```

### Paso 7 · Oficina pixel: ve a tu equipo (nuevo)

```powershell
cd $HOME\dev\Agentes-OC
powershell -ExecutionPolicy Bypass -File oficina\instalar.ps1
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.agentes-oc\oficina\oficina.ps1"
```

**Reinicia OpenCode una vez** para que cargue el plugin. Para cerrarla, añade
`stop` al final del último comando; para ver quién está conectado, `status`.

---

## 🤖 Instalación automática con un prompt

Copia y pega el siguiente prompt en **Claude Code** o en **OpenCode** (en la
máquina nueva). Detectará el sistema operativo, instalará lo que falte,
clonará el repo y configurará todo el paquete, incluida la oficina:

```text
Actúa como instalador del paquete Agentes-OC. Ejecuta este plan completo y
verifica cada paso con evidencia real (salida de comandos):

1. DETECTA el sistema operativo (macOS, Windows o Linux) con uname o ver.
2. VERIFICA e INSTALA los prerrequisitos que falten:
   - git, node (LTS), python3, jq, gh (GitHub CLI)
   - En macOS usa Homebrew (brew install ...). Si Homebrew no existe, instálalo.
   - En Windows usa winget (winget install ...).
   - En Linux usa el gestor nativo (apt/dnf/pacman).
   No instales nada que ya esté instalado. Muestra qué instalaste y qué ya existía.
3. VERIFICA si OpenCode está instalado (opencode --version). Si no:
   - macOS/Linux: descarga el instalador oficial a /tmp y ejecútalo con bash.
   - Windows: usa el instalador oficial de PowerShell.
   Verifica con opencode --version.
4. CLONA el repo https://github.com/DuvanP11/Agentes-OC.git en ~/dev/Agentes-OC
   (si ya existe, haz git pull).
5. EJECUTA el instalador de agentes:
   - macOS/Linux: bash install.sh
   - Windows: powershell -ExecutionPolicy Bypass -File install.ps1
   Verifica que el backup se creó y que opencode.json contiene los agentes.
6. INSTALA el plugin de memoria: opencode plugin @cioffi_ai/opencode-memory
7. INSTALA el MCP docling si es posible (pip install docling-mcp-server).
8. INSTALA la oficina pixel para ver al equipo:
   - Lee primero oficina/instalar.sh (Windows: oficina\instalar.ps1) y resume
     qué hará; luego ejecútalo. Necesita Node 20 o superior.
   - Arráncala: ~/.agentes-oc/oficina/oficina start
     (Windows: oficina.ps1 start en %USERPROFILE%\.agentes-oc\oficina).
   - Verifica que http://127.0.0.1:4099/health responde y que existe
     ~/.config/opencode/plugins/pixel-office.ts.
9. VERIFICA el resultado final:
   - opencode agent list → deben aparecer director, fullstack-product-engineer,
     security-engineer, security-reviewer y los demás.
   - Cuenta cuántos agentes quedaron instalados.
10. ENTREGA un resumen final con: SO detectado, prerrequisitos instalados,
   versión de OpenCode, número de agentes instalados, estado de la oficina y
   cualquier paso que requiriera acción manual del usuario. Recuérdale que
   reinicie OpenCode y abra http://127.0.0.1:4099/?demo=0 para ver a su equipo.

Regla de seguridad: no ejecutes nada destructivo, no borres configuraciones
existentes sin backup, y si un paso requiere sudo/administrador pídelo al
usuario en lugar de forzarlo.
```

### Solo la oficina (si ya tienes los agentes)

```text
Actúa como instalador de la Oficina pixel de Agentes-OC
(https://github.com/DuvanP11/Agentes-OC). Verifica cada paso con la salida
real de los comandos:

1. DETECTA el sistema operativo.
2. VERIFICA que existan git y Node 20 o superior (node -v). Si falta alguno,
   dime qué comando lo instala (macOS: brew install git node · Windows:
   winget install Git.Git OpenJS.NodeJS.LTS) y pide mi permiso antes.
3. CLONA el repo en ~/dev/Agentes-OC (si ya existe, haz git pull).
4. LEE oficina/instalar.sh (Windows: oficina\instalar.ps1) antes de ejecutarlo
   y resúmeme en 3 líneas qué va a hacer.
5. EJECÚTALO: macOS/Linux bash oficina/instalar.sh · Windows
   powershell -ExecutionPolicy Bypass -File oficina\instalar.ps1
6. ARRANCA la oficina: ~/.agentes-oc/oficina/oficina start (Windows:
   powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.agentes-oc\oficina\oficina.ps1" start).
7. VERIFICA: http://127.0.0.1:4099/health responde, existe
   ~/.config/opencode/plugins/pixel-office.ts y
   http://127.0.0.1:4099/assets/nombres.json trae los nombres del equipo.
8. INDÍCAME que reinicie OpenCode una vez y abra http://127.0.0.1:4099/?demo=0
   (en VS Code: Simple Browser: Show). Cuando lo haya hecho, ejecuta
   ~/.agentes-oc/oficina/oficina status y confirma que aparece mi sesión.

Reglas: no borres ni sobrescribas configuraciones (el instalador respalda lo
que reemplaza), no modifiques opencode.json, no muestres tokens ni claves, y
si algo pide sudo/administrador, pregúntame primero.
```

---

## ✅ Checklist final

| Check | Comando |
|---|---|
| OpenCode instalado | `opencode --version` |
| Agentes instalados | `opencode agent list` (56 agentes) |
| Backup creado | existe `opencode.json.backup-*` en tu carpeta de config de OpenCode |
| Plugin memoria | `opencode plugin list` muestra `@cioffi_ai/opencode-memory` |
| MCP docling | `opencode mcp list` muestra `docling` |
| Oficina pixel | `~/.agentes-oc/oficina/oficina status` → "Corriendo" y tu sesión en la lista |
| Web desplegada | `https://agentes-oc.vercel.app` (o tu dominio Vercel) |

---

## 🔄 Regenerar el paquete desde tu OpenCode

Si modificas agentes en tu OpenCode y quieres actualizar el paquete del repo:

```bash
bash scripts/export-agents.sh
git add agents/ && git commit -m "chore: actualizar paquete de agentes" && git push
```