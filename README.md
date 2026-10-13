# Agentes-OC

**Paquete de Agentes y SubAgentes IA para complementar OpenCode** — sitio web visual con el inventario completo de tu ecosistema: agentes, subagentes, skills, seguridad, plugins, MCP y el guion de llamada por tarea.

![Stack](https://img.shields.io/badge/stack-HTML%20%2B%20CSS%20%2B%20JS-6c8cff) ![Vercel](https://img.shields.io/badge/deploy-Vercel-000000) ![OpenCode](https://img.shields.io/badge/OpenCode-1.19.0-38d9a9)

---

## 🚀 Desplegar en Vercel

El sitio es **100% estático** (HTML + CSS + JS, sin build). Conectarlo a Vercel toma menos de 2 minutos:

### Opción A — Desde el dashboard de Vercel (recomendada)

1. Ve a [vercel.com/new](https://vercel.com/new).
2. Importa el repositorio `DuvanP11/Agentes-OC` (conecta tu cuenta de GitHub si no lo está).
3. Vercel detecta automáticamente que es un proyecto estático (framework: **Other**).
4. Haz clic en **Deploy**. Listo: obtienes una URL `https://agentes-oc.vercel.app`.

### Opción B — Desde la CLI de Vercel

```bash
npm i -g vercel
vercel            # primer deploy (preview)
vercel --prod     # deploy a producción
```

### Opción C — Conectar repo existente

1. En Vercel: **Add New → Project** → importa `DuvanP11/Agentes-OC`.
2. Framework preset: **Other** (no requiere build command ni output directory).
3. Deploy. Cada `git push` a `main` genera un deploy automático.

> No se necesitan variables de entorno ni funciones serverless: es un sitio estático puro.

---

## 🧠 ¿Qué contiene la web?

| Sección | Qué muestra |
|---|---|
| **Esquema** | Diagrama visual (Mermaid) del ecosistema: director → equipo de producto → especialistas → build → revisión → seguridad |
| **Agentes** | 49 subagentes + 7 primarios con descripción, categoría y cuándo usarlos. Filtros por categoría y búsqueda |
| **Guion de llamada** | Tabla tarea → agente → prompt sugerido para invocar cada especialista |
| **Skills** | Las ~150 skills instaladas, agrupadas por dominio, con búsqueda y filtros |
| **Seguridad** | Agentes de seguridad, runtime antimalware (sentinel), políticas y capas de defensa |
| **Recursos** | Paquetes y comandos para que OpenCode funcione bien en **macOS** y **Windows** |

---

## 🛠️ Recursos para OpenCode

### macOS

```bash
# opencode CLI
curl -fsSL https://opencode.ai/install -o install.sh && bash install.sh

# Base del sistema
brew install node python jq git gh

# Seguridad (opcional pero recomendado)
brew install semgrep
pip3 install pytest
```

### Windows (PowerShell)

```powershell
# opencode CLI
irm https://opencode.ai/install.ps1 | iex

# Base del sistema
winget install OpenJS.NodeJS.LTS
winget install Python.Python.3.12
winget install Git.Git
winget install Microsoft.WindowsTerminal
winget install jqlang.jq
winget install GitHub.cli

# Seguridad (opcional)
pip install semgrep
```

### Configuración clave

| Ruta | Qué es |
|---|---|
| `~/.config/opencode/opencode.json` | Config principal: agentes, plugins, MCP, permisos |
| `~/.config/opencode/agent/` | Definiciones de agentes |
| `~/.config/opencode/skills/` | Skills instaladas (`SKILL.md` por carpeta) |
| `~/.config/opencode/plugins/` | Plugins locales (`security-agent.ts`, `ecc-hooks.ts`, …) |
| `~/.config/opencode/AGENTS.md` | Instrucciones globales del entorno |

---

## 🔒 Seguridad incluida

- **`security-engineer`** — subagente AppSec integral (código, dependencias, secretos, auth, skills/MCP, CI/CD).
- **`security-reviewer`** — revisión focalizada post-diff.
- **Runtime antimalware** — plugin `security-agent.ts` + hooks Python `sentinel_preflight.py` / `sentinel_postflight.py` + `skill_scanner.py` + `skill_validator.py` + IOCs firmados.
- **Puertas de seguridad** en `director` y `fullstack-product-engineer` antes de aceptar entregables.

---

## 📁 Estructura del repo

```
Agentes-OC/
├── index.html          # Página principal (esquema + secciones)
├── css/styles.css      # Tema oscuro profesional
├── js/data.js          # Inventario: agentes, guion, seguridad, plugins, MCP, recursos
├── js/skills.js        # Inventario de skills
├── js/app.js           # Renderizado, búsqueda, filtros, tabs
└── README.md
```

---

## ✏️ Cómo actualizar el inventario

Los datos viven en `js/data.js` y `js/skills.js`. Para regenerar el inventario real desde tu OpenCode:

```bash
opencode agent list          # lista de agentes
opencode debug skill         # lista de skills
opencode debug config        # config resuelta (agentes, plugins, MCP)
opencode mcp list            # servidores MCP
```

Edita los arrays correspondientes y haz push: Vercel redeploya automáticamente.

---

## 📄 Licencia

MIT — úsalo, adáptalo y compártelo.