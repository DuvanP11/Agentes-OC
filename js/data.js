/* ============================================================
   Agentes-OC · Inventario del ecosistema OpenCode
   Datos verificados al 2026-10-15 desde `opencode agent list`,
   `opencode debug skill`, `opencode debug config` y `opencode mcp list`.
   ============================================================ */

const INVENTORY = {
  generatedAt: "2026-10-15",
  opencodeVersion: "1.19.0",
  stats: {
    primaryAgents: 7,
    subagents: 50,
    skills: 246,
    plugins: 5,
    mcpServers: 1,
    securityLayers: 6
  }
};

/* ------------------------------------------------------------
   AGENTES PRIMARIOS (modo primary)
   ------------------------------------------------------------ */
const PRIMARY_AGENTS = [
  {
    name: "director",
    role: "Director general y orquestador",
    description: "Comprende solicitudes en lenguaje natural, las descompone en tareas y coordina especialistas. Decide cuándo actuar directo, delegar o paralelizar. Incluye puerta de seguridad antes de aceptar entregables.",
    when: "Siempre que quieras un resultado completo: pídele el objetivo y él orquesta al equipo.",
    prompt: "Necesito <objetivo>. Insumos: <archivos/rutas>. Resultado esperado: <entregable>. Organízalo y ejecútalo."
  },
  {
    name: "fullstack-product-engineer",
    role: "Equipo de producto digital",
    description: "Coordina el equipo completo de producto: product-architect, ui-ux-designer, frontend-developer, backend-developer, database-architect, crm-builder, mobile-app-developer, automation-engineer, qa-engineer, security-reviewer, devops-developer y technical-documentation.",
    when: "Para construir productos digitales: web, landing, SaaS, CRM, paneles, APIs, automatizaciones, apps móviles o sistemas empresariales.",
    prompt: "Construye <producto> con <stack preferido>. Requisitos: <funcionalidades>. Criterio de éxito: <aceptación>."
  },
  {
    name: "build",
    role: "Agente principal de construcción (nativo)",
    description: "Agente por defecto de OpenCode para tareas de código y archivos. Es el 'primary' estándar con permisos amplios.",
    when: "Tareas directas de código sin necesidad de orquestación.",
    prompt: "<Instrucción directa de código/archivos>"
  },
  {
    name: "plan",
    role: "Planificador (nativo)",
    description: "Agente primario de planificación de OpenCode. Analiza y propone un plan antes de ejecutar.",
    when: "Antes de cambios grandes, para revisar el enfoque propuesto.",
    prompt: "Planifica: <objetivo>"
  },
  {
    name: "summary",
    role: "Resumidor de sesiones (nativo)",
    description: "Genera resúmenes de sesión de OpenCode.",
    when: "Para cerrar sesiones con resumen.",
    prompt: "Resume la sesión."
  },
  {
    name: "title",
    role: "Titulador de sesiones (nativo)",
    description: "Genera títulos para las sesiones de OpenCode.",
    when: "Uso interno del sistema.",
    prompt: "—"
  },
  {
    name: "compaction",
    role: "Compactor de contexto (nativo)",
    description: "Compacta el contexto cuando la sesión se acerca al límite.",
    when: "Uso interno del sistema.",
    prompt: "—"
  }
];

/* ------------------------------------------------------------
   SUBAGENTES (modo subagent) — catálogo completo
   ------------------------------------------------------------ */
const SUBAGENTS = [
  // --- Orquestación y gestión ---
  { name: "project-manager", category: "Gestión", description: "Divide proyectos en etapas y tareas, gestiona dependencias, prioridades, plazos y riesgos; prepara cronogramas, agendas, minutas y próximos pasos.", when: "Planes, cronogramas, minutas, organización de proyectos." },
  { name: "planner", category: "Gestión", description: "Especialista en planificación de features complejas y refactors. Plan de implementación, cambios arquitectónicos.", when: "Antes de implementar algo complejo o refactorizar." },
  { name: "loop-operator", category: "Gestión", description: "Opera loops de agentes autónomos, monitorea progreso e interviene si se estancan.", when: "Loops autónomos, procesos continuos con agentes." },
  { name: "legal-advisor", category: "Legal", description: "Asistente jurídico IA (Legal Advisor AI). Análisis y comparación de contratos, detección de riesgos, investigación normativa y jurisprudencial colombiana, orientación jurídica básica en lenguaje claro y borradores documentales. No es un abogado ni sustituye asesoría profesional.", when: "Revisar contratos, comparar T&C, evaluar riesgos, investigar normas colombianas con fuentes oficiales, preparar borradores." },
  { name: "harness-optimizer", category: "Gestión", description: "Analiza y mejora la configuración local del harness de agentes: confiabilidad, costo y throughput.", when: "Optimizar tu setup de OpenCode/agentes." },
  { name: "architect", category: "Gestión", description: "Especialista en arquitectura de software: diseño de sistemas, escalabilidad y decisiones técnicas.", when: "Diseño de arquitectura, decisiones de escalabilidad." },
  { name: "refactor-cleaner", category: "Gestión", description: "Limpieza de código muerto y consolidación: elimina código no usado, duplicados y refactoriza.", when: "Limpiar código muerto, consolidar duplicados." },

  // --- Ingeniería general ---
  { name: "engineer", category: "Ingeniería", description: "Ingeniero universal: SQL, Python, Ruby, JS/TS, React/Next, Node, C/C++, Java, Kotlin, Go, Rust, PHP, Bash y APIs. Cambios mínimos y reversibles.", when: "Cualquier tarea de código, debug o refactor." },
  { name: "explore", category: "Ingeniería", description: "Exploración rápida de codebases: busca archivos por patrón, keywords, responde cómo funciona algo.", when: "Entender un repo, encontrar dónde vive algo." },
  { name: "general", category: "Ingeniería", description: "Agente de propósito general para investigar preguntas complejas y ejecutar tareas multi-paso.", when: "Tareas variadas en paralelo." },

  // --- Frontend / UI ---
  { name: "frontend-developer", category: "Frontend", description: "React, Next.js, HTML, CSS, JavaScript, TypeScript y tecnologías compatibles.", when: "Componentes, páginas, interfaces, rendimiento frontend." },
  { name: "ui-ux-designer", category: "Frontend", description: "Dirección visual, interfaces modernas, responsive, accesibilidad y estados de interfaz.", when: "Diseño UX/UI, sistemas de diseño, accesibilidad." },

  // --- Backend / Datos ---
  { name: "backend-developer", category: "Backend", description: "APIs, lógica empresarial, autenticación, autorización, integraciones y servicios.", when: "Endpoints, servicios, auth, integraciones." },
  { name: "database-architect", category: "Backend", description: "SQL, PostgreSQL, MySQL, SQLite, modelado, migraciones e índices.", when: "Modelar BD, migraciones, optimizar esquemas." },
  { name: "database-reviewer", category: "Backend", description: "Especialista PostgreSQL: optimización de queries, diseño de esquemas, seguridad y performance (Supabase best practices).", when: "Revisar queries lentas, RLS, esquemas Postgres." },
  { name: "docs-lookup", category: "Backend", description: "Documentación actual de librerías y frameworks vía Context7 MCP.", when: "Setup de librerías, APIs, ejemplos de código actuales." },

  // --- Resolución de errores de build ---
  { name: "build-error-resolver", category: "Build", description: "Resuelve errores de build y TypeScript con diffs mínimos.", when: "Build falla o hay type errors." },
  { name: "cpp-build-resolver", category: "Build", description: "Errores de build C++, CMake y compilación: linker, template errors.", when: "Build C++/CMake falla." },
  { name: "go-build-resolver", category: "Build", description: "Errores de build Go, vet y compilación.", when: "Build Go falla." },
  { name: "java-build-resolver", category: "Build", description: "Errores de build Java/Maven/Gradle, compilación y dependencias.", when: "Build Java/Maven/Gradle falla." },
  { name: "kotlin-build-resolver", category: "Build", description: "Errores de build Kotlin/Gradle, compilación y dependencias.", when: "Build Kotlin/Gradle falla." },
  { name: "rust-build-resolver", category: "Build", description: "Errores de build Rust/Cargo y compilación.", when: "Build Rust/Cargo falla." },

  // --- Revisión de código ---
  { name: "code-reviewer", category: "Revisión", description: "Revisión experta de código: calidad, seguridad y mantenibilidad. Úsalo justo después de escribir o modificar código.", when: "Tras escribir/modificar código." },
  { name: "cpp-reviewer", category: "Revisión", description: "Revisor C++: memory safety, idioms modernos, concurrencia y performance.", when: "Cambios en C++." },
  { name: "go-reviewer", category: "Revisión", description: "Revisor Go: idioms, concurrencia, manejo de errores y performance.", when: "Cambios en Go." },
  { name: "java-reviewer", category: "Revisión", description: "Revisor Java/Spring Boot: arquitectura en capas, JPA, seguridad y concurrencia.", when: "Cambios en Java/Spring." },
  { name: "kotlin-reviewer", category: "Revisión", description: "Revisor Kotlin/Android/KMP: idioms, coroutines, Compose.", when: "Cambios en Kotlin/Android." },
  { name: "php-reviewer", category: "Revisión", description: "Revisor PHP: PSR-12, sistema de tipos, Eloquent, seguridad y performance.", when: "Cambios en PHP/Laravel." },
  { name: "python-reviewer", category: "Revisión", description: "Revisor Python: PEP 8, idioms, type hints, seguridad y performance.", when: "Cambios en Python." },
  { name: "rust-reviewer", category: "Revisión", description: "Revisor Rust: idioms, ownership, lifetimes, concurrencia y performance.", when: "Cambios en Rust." },

  // --- QA / Testing ---
  { name: "qa-engineer", category: "QA", description: "Pruebas unitarias, integración, navegador, flujos completos y regresiones.", when: "Escribir/ejecutar pruebas, validar flujos." },
  { name: "e2e-runner", category: "QA", description: "Pruebas E2E con Playwright: genera, mantiene y ejecuta tests de flujos críticos.", when: "Tests E2E de flujos de usuario." },
  { name: "tdd-guide", category: "QA", description: "Test-Driven Development: escribe el test primero, coverage 80%+.", when: "Nuevas features, bugs, refactors con TDD." },

  // --- Seguridad ---
  { name: "security-engineer", category: "Seguridad", description: "AppSec integral: vulnerabilidades de código, dependencias, secretos, authn/authz, análisis de skills/MCP antes de instalar, CI/CD, informes con evidencia y correcciones verificadas.", when: "Auditorías completas de seguridad, antes de instalar skills/MCP, revisión pre-producción." },
  { name: "security-reviewer", category: "Seguridad", description: "Revisión de seguridad focalizada de un cambio (post-diff). Delega auditorías grandes a security-engineer.", when: "Revisar seguridad de un diff/cambio reciente." },

  // --- Datos / Documentos ---
  { name: "data-analyst", category: "Datos", description: "Analiza CSV/Excel y datos tabulares, crea y valida SQL, detecta anomalías y tendencias, calcula KPIs, evalúa hipótesis con evidencia.", when: "Análisis de datos, métricas, SQL, calidad de datos." },
  { name: "doc-analyst", category: "Datos", description: "Extrae y estructura información de PDF, DOCX, XLSX, CSV, capturas, diagramas y escaneados (OCR); resume, compara versiones y produce matrices de hallazgos.", when: "Documentos, OCR, extracción de información." },

  // --- Documentación / Reportes ---
  { name: "technical-documentation", category: "Documentación", description: "Documentación de instalación, uso, arquitectura y mantenimiento.", when: "Manuales, guías, docs de arquitectura." },
  { name: "doc-updater", category: "Documentación", description: "Actualiza codemaps y documentación del repo.", when: "Mantener docs/codemaps al día." },
  { name: "reports", category: "Documentación", description: "Informes, documentos y presentaciones: ejecutivo, técnico, comercial, auditoría; DOCX, XLSX, CSV, PPTX, propuestas y planes.", when: "Entregables formales en Word/Excel/PPT." },

  // --- Comercial / Producto / Mejora ---
  { name: "commercial-director", category: "Comercial", description: "Estrategia comercial, segmentos, prospección, tarifas, márgenes y escenarios de rentabilidad, negociación y cierre.", when: "Precios, márgenes, estrategia de ventas, cierre." },
  { name: "product-architect", category: "Comercial", description: "Requisitos, arquitectura, decisiones tecnológicas y planificación por fases (prototipo/MVP/producción).", when: "Definir producto, arquitectura, fases." },
  { name: "improvement", category: "Comercial", description: "Mejora continua: cuellos de botella, causa raíz (5 porqués, Ishikawa), automatización, PDCA/Lean/Pareto y planes de acción priorizados.", when: "Optimizar procesos, encontrar causa raíz." },

  // --- CRM / Móvil / Automatización / DevOps / Media / Sistema ---
  { name: "crm-builder", category: "CRM", description: "Constructor de CRM: clientes, contactos, empresas, oportunidades, embudos, actividades, tareas, permisos y reportes.", when: "Construir o ampliar un CRM." },
  { name: "mobile-app-developer", category: "Móvil", description: "Apps móviles: Android nativo (Kotlin), Flutter y alternativas multiplataforma; compilación y verificación de APK.", when: "Apps Android/Flutter/multiplataforma." },
  { name: "automation-engineer", category: "Automatización", description: "Integraciones, procesos automáticos, webhooks, tareas programadas y conectores.", when: "Automatizar procesos, integrar sistemas." },
  { name: "devops-developer", category: "DevOps", description: "Contenedores, variables de entorno, compilación, CI/CD y despliegue.", when: "Docker, CI/CD, deploys." },
  { name: "media-producer", category: "Media", description: "Guiones, storyboards, videos demo y tutoriales, subtítulos y voz; monta con Remotion/FFmpeg/Playwright.", when: "Videos, demos, tutoriales audiovisuales." },
  { name: "doctor", category: "Sistema", description: "Diagnostica SO, versión y configuración de OpenCode, dependencias, plugins, MCP, modelos/proveedores, logs y conflictos. Solo lectura.", when: "Algo falla en tu entorno OpenCode/sistema." },
  { name: "quality-auditor", category: "Sistema", description: "Auditor independiente: verifica código, configuraciones, pruebas, regresiones, riesgos de seguridad, documentos y cálculos; emite veredicto de aceptación con evidencia. Solo lectura.", when: "Validación final antes de aceptar un entregable." }
];

/* ------------------------------------------------------------
   GUION DE LLAMADA — tarea → agente → prompt sugerido
   ------------------------------------------------------------ */
const CALL_SCRIPT = [
  { task: "Quiero un resultado completo orquestado (web, análisis, informe, plan)", agent: "director", prompt: "Necesito <objetivo>. Insumos: <rutas>. Resultado: <entregable>. Organízalo y ejecútalo." },
  { task: "Construir un producto digital (web, SaaS, CRM, panel, API, app)", agent: "fullstack-product-engineer", prompt: "Construye <producto> con <stack>. Requisitos: <funcionalidades>. Criterio de éxito: <aceptación>." },
  { task: "Código general, debug o refactor en cualquier lenguaje", agent: "engineer", prompt: "<Descripción del cambio>. Verifica con <tests/comandos>." },
  { task: "Entender un repo o encontrar dónde vive algo", agent: "explore", prompt: "Explora <repo> y dime cómo funciona <X>. Nivel: <quick|medium|very thorough>." },
  { task: "Planificar una feature compleja o refactor antes de tocar código", agent: "planner", prompt: "Planifica la implementación de <feature/refactor> con pasos y dependencias." },
  { task: "Organizar proyecto: etapas, cronograma, minutas, riesgos", agent: "project-manager", prompt: "Organiza <proyecto> en etapas con plazos, dependencias y riesgos." },
  { task: "Interfaz o componente frontend (React/Next)", agent: "frontend-developer", prompt: "Crea/arregla <componente/página> con <requisitos UI>." },
  { task: "Diseño UX/UI, accesibilidad, sistema visual", agent: "ui-ux-designer", prompt: "Diseña la interfaz de <X> con <dirección visual>." },
  { task: "API, lógica de negocio, auth, integraciones", agent: "backend-developer", prompt: "Implementa <endpoint/servicio> con <requisitos>." },
  { task: "Modelar BD, migraciones, índices", agent: "database-architect", prompt: "Modela <esquema> / crea migración para <cambio>." },
  { task: "Query lenta o esquema Postgres a optimizar", agent: "database-reviewer", prompt: "Revisa y optimiza <query/esquema>." },
  { task: "El build falla o hay type errors", agent: "build-error-resolver", prompt: "El build falla con <error>. Corrígelo con diff mínimo." },
  { task: "Build C++/Go/Java/Kotlin/Rust falla", agent: "<lang>-build-resolver", prompt: "El build de <lenguaje> falla con <error>. Corrígelo." },
  { task: "Revisar calidad/seguridad de código recién escrito", agent: "code-reviewer", prompt: "Revisa <diff/archivos>: calidad, seguridad, mantenibilidad." },
  { task: "Revisar código en lenguaje específico", agent: "<lang>-reviewer", prompt: "Revisa <diff> en <lenguaje>." },
  { task: "Escribir pruebas (unitarias, integración, E2E)", agent: "qa-engineer", prompt: "Escribe/ejecuta pruebas para <feature>." },
  { task: "Tests E2E con Playwright", agent: "e2e-runner", prompt: "Genera y ejecuta tests E2E para <flujo>." },
  { task: "Desarrollo con TDD (test primero, 80%+ coverage)", agent: "tdd-guide", prompt: "Implementa <feature> con TDD: test primero, luego código." },
  { task: "Auditoría de seguridad completa (código, dependencias, secretos, CI/CD)", agent: "security-engineer", prompt: "Audita <repo/scope>: código, dependencias, secretos, auth, CI/CD. Informe con evidencia y severidad." },
  { task: "Revisar seguridad de un cambio reciente (post-diff)", agent: "security-reviewer", prompt: "Revisa la seguridad de <diff>." },
  { task: "¿Es seguro instalar esta skill/MCP/plugin?", agent: "security-engineer", prompt: "Analiza <skill/MCP/plugin> antes de instalarlo: riesgos, inyección, exfiltración." },
  { task: "Analizar datos (CSV/Excel), KPIs, SQL, tendencias", agent: "data-analyst", prompt: "Analiza <archivo/datos>: KPIs, anomalías, tendencias. Con evidencia." },
  { task: "Extraer info de PDF/DOCX/XLSX/escaneos (OCR)", agent: "doc-analyst", prompt: "Extrae y estructura la información de <documento>." },
  { task: "Documentación técnica (instalación, uso, arquitectura)", agent: "technical-documentation", prompt: "Escribe la documentación de <X>." },
  { task: "Informe formal en Word/Excel/PPT", agent: "reports", prompt: "Genera <informe/propuesta> en <formato> con <contenido>." },
  { task: "Estrategia comercial, tarifas, márgenes, cierre", agent: "commercial-director", prompt: "Define <estrategia/tarifa> con supuestos explícitos y escenarios." },
  { task: "Definir producto, arquitectura y fases (MVP)", agent: "product-architect", prompt: "Define <producto>: requisitos, arquitectura, fases prototipo/MVP/producción." },
  { task: "Mejora de procesos, causa raíz, plan de acción", agent: "improvement", prompt: "Encuentra la causa raíz de <problema> y propón plan priorizado." },
  { task: "Construir o ampliar un CRM", agent: "crm-builder", prompt: "Construye/amplía el CRM con <módulos>." },
  { task: "App móvil Android/Flutter", agent: "mobile-app-developer", prompt: "Crea la app <X> en <Kotlin/Flutter> y verifica el APK." },
  { task: "Automatizar procesos, webhooks, tareas programadas", agent: "automation-engineer", prompt: "Automatiza <proceso> con <integración>." },
  { task: "Docker, CI/CD, despliegue", agent: "devops-developer", prompt: "Prepara <Dockerfile/CI/CD/deploy> para <proyecto>." },
  { task: "Video demo, tutorial, guion audiovisual", agent: "media-producer", prompt: "Produce <video/demo> de <X> y verifica el archivo final." },
  { task: "Diagnosticar el sistema o la config de OpenCode", agent: "doctor", prompt: "Diagnostica <problema> en mi entorno OpenCode. Solo lectura, con severidad y evidencia." },
  { task: "Validación final independiente antes de aceptar", agent: "quality-auditor", prompt: "Audita <entregable> y emite veredicto de aceptación con evidencia." }
];

/* ------------------------------------------------------------
   SEGURIDAD — capas activas
   ------------------------------------------------------------ */
const SECURITY = {
  agents: [
    { name: "security-engineer", type: "Subagente AppSec integral", detail: "Audita código, dependencias, secretos, authn/authz, skills/MCP, CI/CD. Informes con evidencia, severidad y correcciones verificadas. Permisos mínimos (subagent, temp 0.1)." },
    { name: "security-reviewer", type: "Subagente post-diff", detail: "Revisión focalizada de cambios recientes que manejan input de usuario, auth, endpoints o datos sensibles. Delega auditorías grandes a security-engineer." },
    { name: "security-agent (skill)", type: "Skill de monitoreo", detail: "Escanea skills/MCP instalados contra bases de vulnerabilidades (GitHub Advisory, vulnerablemcp.info, CVE, Snyk, VirusTotal) y alertas comunitarias; análisis de coherencia y diff de actualizaciones." },
    { name: "legal-advisor", type: "Subagente jurídico", detail: "Análisis y comparación de contratos, detección de riesgos, investigación normativa y jurisprudencial colombiana, orientación jurídica básica en lenguaje claro y borradores documentales. No es un abogado ni sustituye asesoría profesional." },
  ],
  runtime: [
    { name: "security-agent.ts", type: "Plugin runtime", detail: "Auto-carga en OpenCode. Capa tool.execute.before que bloquea llamadas maliciosas (exfiltración de credenciales, dominios conocidos-bad, reverse shells, curl|bash) con cero costo de LLM." },
    { name: "sentinel_preflight.py", type: "Hook Python", detail: "Valida cada tool call antes de ejecutarse contra IOCs firmados. Permite benigno, bloquea malicioso." },
    { name: "sentinel_postflight.py", type: "Hook Python", detail: "Verifica la salida de tool calls (detección de inyección indirecta de prompt)." },
    { name: "skill_scanner.py", type: "Scanner", detail: "Escanea directorios de skills/plugins y puntúa riesgo (benigna 14/LOW, maliciosa 100/CRITICAL)." },
    { name: "skill_validator.py", type: "Validador", detail: "Valida integridad y estructura de skills." },
    { name: "iocs.json (firmado)", type: "Base de IOCs", detail: "Indicadores de compromiso firmados; verificación con scripts/sign_iocs.py --verify." },
    { name: "rules/semgrep/", type: "Reglas semgrep", detail: "Reglas de análisis estático (requiere semgrep instalado)." }
  ],
  layers: [
    "Puerta de seguridad en director y fullstack-product-engineer (revisión antes de aceptar entregables)",
    "Bloqueo de rutas sensibles (~/.config/opencode/, credenciales, API keys)",
    "Detección de inyección indirecta de prompt en salidas de bash/read",
    "Análisis de skills/MCP antes de instalar (security-engineer)",
    "Revisión post-diff obligatoria en cambios que tocan auth/datos sensibles",
    "Backup del security-agent: backups/security-agent-20261012-194400/"
  ]
};

/* ------------------------------------------------------------
   PLUGINS Y MCP
   ------------------------------------------------------------ */
const PLUGINS = [
  { name: "@cioffi_ai/opencode-memory", type: "Plugin npm", detail: "Memoria persistente de largo plazo (facts del usuario y proyecto)." },
  { name: "obsidian-memory-sync.ts", type: "Plugin local", detail: "Sincroniza memoria con el vault Obsidian (AI-Memory)." },
  { name: "index.ts", type: "Plugin local", detail: "Plugin principal del entorno (carga de skills/reglas)." },
  { name: "ecc-hooks.ts", type: "Plugin local", detail: "Hooks del ecosistema ECC (eventos de sesión)." },
  { name: "security-agent.ts", type: "Plugin seguridad", detail: "Runtime antimalware: bloquea tool calls maliciosas antes de ejecutarse." }
];

const MCP_SERVERS = [
  { name: "docling", type: "MCP server", detail: "Conversión de documentos (PDF, DOCX, HTML, imágenes) a Docling documents con caché local. Binario: docling-mcp-server." }
];

/* ------------------------------------------------------------
   RECURSOS / PAQUETES PARA OPENCODE (Windows y macOS)
   ------------------------------------------------------------ */
const RESOURCES = {
  mac: [
    { pkg: "opencode CLI", cmd: "curl -fsSL https://opencode.ai/install -o install.sh && bash install.sh", note: "Instala en ~/.opencode/bin/opencode. Versión actual: 1.19.0." },
    { pkg: "Homebrew (gestor de paquetes)", cmd: '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"', note: "Base para instalar herramientas del sistema." },
    { pkg: "Node.js LTS + npm", cmd: "brew install node", note: "Requerido para plugins npm y tooling JS/TS." },
    { pkg: "Python 3", cmd: "brew install python", note: "Requerido para hooks sentinel (sentinel_preflight.py, skill_scanner.py)." },
    { pkg: "jq", cmd: "brew install jq", note: "Procesar JSON de config y salidas CLI." },
    { pkg: "semgrep (opcional)", cmd: "brew install semgrep", note: "Activa rules/semgrep/ del security-agent." },
    { pkg: "pytest (opcional)", cmd: "pip3 install pytest", note: "Activa tests del security-agent." },
    { pkg: "gh CLI (GitHub)", cmd: "brew install gh", note: "Gestión de repos, PRs, issues." },
    { pkg: "git", cmd: "brew install git", note: "Control de versiones." }
  ],
  windows: [
    { pkg: "opencode CLI", cmd: "irm https://opencode.ai/install.ps1 | iex", note: "Instala opencode en Windows (PowerShell)." },
    { pkg: "Node.js LTS + npm", cmd: "winget install OpenJS.NodeJS.LTS", note: "Requerido para plugins npm y tooling JS/TS." },
    { pkg: "Python 3", cmd: "winget install Python.Python.3.12", note: "Requerido para hooks sentinel." },
    { pkg: "Git for Windows", cmd: "winget install Git.Git", note: "Control de versiones + Git Bash." },
    { pkg: "Windows Terminal", cmd: "winget install Microsoft.WindowsTerminal", note: "Terminal recomendada para la TUI de opencode." },
    { pkg: "jq", cmd: "winget install jqlang.jq", note: "Procesar JSON de config y salidas CLI." },
    { pkg: "semgrep (opcional)", cmd: "pip install semgrep", note: "Activa rules/semgrep/ del security-agent." },
    { pkg: "gh CLI (GitHub)", cmd: "winget install GitHub.cli", note: "Gestión de repos, PRs, issues." },
    { pkg: "WSL2 (opcional)", cmd: "wsl --install", note: "Entorno Linux para scripts Python/Bash si prefieres." }
  ],
  config: [
    { file: "~/.config/opencode/opencode.json", note: "Config principal: agentes, plugins, MCP, permisos." },
    { file: "~/.config/opencode/agent/", note: "Definiciones de agentes (markdown/JSON)." },
    { file: "~/.config/opencode/skills/", note: "Skills instaladas (SKILL.md por carpeta)." },
    { file: "~/.config/opencode/plugins/", note: "Plugins locales (security-agent.ts, ecc-hooks.ts, etc.)." },
    { file: "~/.config/opencode/AGENTS.md", note: "Instrucciones globales del entorno (memoria Obsidian, reglas)." },
    { file: "~/.opencode/bin/opencode", note: "Binario del CLI (macOS)." }
  ]
};