/**
 * Pixel Office — adaptador OpenCode → Agent Office (oficina pixel art)
 *
 * Un personaje por SESIÓN de OpenCode (no por proceso) y un personaje
 * temporal por cada SUBAGENTE (sesión hija con parentID). Solo observa:
 * nunca bloquea herramientas, nunca lanza errores y nunca espera a la red
 * dentro de un hook. Si la oficina está cerrada, no pasa nada; cuando se
 * abre, las sesiones vuelven a entrar solas en el siguiente latido.
 *
 * Backend: Agent-Office (Hono, http://127.0.0.1:4099), instalado por
 * oficina/instalar.sh o instalar.ps1 del repo Agentes-OC.
 * Documentación: https://github.com/DuvanP11/Agentes-OC/blob/main/oficina/README.md
 *
 * Variables opcionales:
 *   OFFICE_URL           default http://127.0.0.1:4099
 *   OFFICE_JOIN_KEY      default ocj_local_01
 *   PIXEL_OFFICE_DEBUG   ruta de un archivo de log (solo para diagnóstico)
 *   PIXEL_OFFICE_OFF=1   desactiva el adaptador sin tocar archivos
 */

import type { PluginInput } from "@opencode-ai/plugin"
import { appendFileSync } from "node:fs"
import * as path from "node:path"

type State = "idle" | "writing" | "researching" | "executing" | "thinking" | "waiting" | "error"

interface Seat {
  id: string
  agentId?: string
  token?: string
  joining?: Promise<void>
  parentID?: string
  agent?: string
  state: State
  detail: string
  sent?: string
  lastPush: number
  lastActivity: number
  flushTimer?: ReturnType<typeof setTimeout>
  beforePermission?: { state: State; detail: string }
  task?: string
  gone?: boolean
}

const URL_BASE = (process.env.OFFICE_URL ?? "http://127.0.0.1:4099").replace(/\/+$/, "")
const JOIN_KEY = process.env.OFFICE_JOIN_KEY ?? "ocj_local_01"
const DEBUG_FILE = process.env.PIXEL_OFFICE_DEBUG

const TIMEOUT_MS = 1_500
const MIN_PUSH_GAP_MS = 300 // el backend limita a 4 push/s por agente
const HEARTBEAT_MS = 15_000 // el backend pasa a idle a los 60 s y saca a los 120 s
const IDLE_KEEP_MS = 15 * 60_000 // una sesión quieta deja de latir y sale de la oficina
const CHILD_LEAVE_MS = 8_000 // el subagente se queda un momento tras terminar
const DETAIL_MAX = 78
const THOUGHT_GAP_MS = 2_000 // como mucho una frase de pensamiento cada 2 s
const HELPER_TITLES = new Set(["memory-consolidation", "memory-surfacing"])

const TOOL_STATE: Record<string, State> = {
  read: "researching",
  grep: "researching",
  glob: "researching",
  list: "researching",
  webfetch: "researching",
  websearch: "researching",
  codesearch: "researching",
  lsp: "researching",
  skill: "researching",
  edit: "writing",
  write: "writing",
  patch: "writing",
  multiedit: "writing",
  apply_patch: "writing",
  bash: "executing",
  task: "executing",
  todowrite: "thinking",
  todoread: "thinking",
  question: "waiting",
}

function log(msg: string) {
  if (!DEBUG_FILE) return
  try {
    appendFileSync(DEBUG_FILE, `${new Date().toISOString()} ${msg}\n`)
  } catch {
    /* solo diagnóstico */
  }
}

function clip(text: string, max = DETAIL_MAX): string {
  const t = text.replace(/\s+/g, " ").trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

// Nunca se muestra el comando de bash ni los patrones de búsqueda: pueden
// llevar tokens o datos. Solo el nombre de archivo o la descripción corta.
function describeTool(tool: string, args: any): string {
  const file = args?.filePath ?? args?.path ?? args?.file
  switch (tool) {
    case "read":
      return file ? `leyendo ${path.basename(String(file))}` : "leyendo"
    case "edit":
    case "write":
    case "patch":
    case "multiedit":
    case "apply_patch":
      return file ? `editando ${path.basename(String(file))}` : "editando archivos"
    case "grep":
    case "glob":
    case "list":
    case "codesearch":
      return "buscando en el código"
    case "webfetch":
      try {
        return `consultando ${new URL(String(args?.url)).hostname}`
      } catch {
        return "consultando la web"
      }
    case "websearch":
      return "buscando en la web"
    case "bash":
      return args?.description ? `$ ${args.description}` : "ejecutando un comando"
    case "task":
      return `delegando a ${args?.subagent_type ?? "subagente"}${args?.description ? `: ${args.description}` : ""}`
    case "todowrite":
    case "todoread":
      return "organizando tareas"
    case "question":
      return "te está haciendo una pregunta"
    case "skill":
      return args?.name ? `skill ${args.name}` : "usando una skill"
    default:
      return `usando ${tool}`
  }
}

function errorText(error: any): string {
  if (!error) return "error"
  const name = String(error.name ?? "Error")
  const msg = String(error.data?.message ?? error.message ?? "").split("\n")[0]
  return clip(`${name}${msg ? `: ${msg}` : ""}`, 48)
}

// la última frase de lo que el modelo va pensando o escribiendo; si la que
// se está escribiendo aún es muy corta, la anterior
function lastSentence(text: string): string {
  const tail = text.slice(-400).replace(/[*`#>_|]+/g, "")
  const pieces = tail
    .split(/(?<=[.!?:;])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8)
  let s = pieces.at(-1) ?? tail.trim()
  if (pieces.length > 1 && s.length < 30 && !/[.!?:;]$/.test(s)) s = pieces.at(-2)!
  return s
}

// globo corto: el mensaje completo del proveedor tapa a los vecinos
function retryText(status: any): string {
  const msg = String(status?.message ?? "")
  if (/usage|quota|cuota|limit|exceeded|subscribe|rate/i.test(msg)) return `sin cuota · reintento ${status.attempt}`
  return clip(`reintento ${status.attempt}${msg ? `: ${msg}` : ""}`, 40)
}

export const PixelOfficePlugin = async ({ client, directory }: PluginInput) => {
  if (process.env.PIXEL_OFFICE_OFF === "1") return {}

  const project = path.basename(directory || process.cwd()) || "opencode"
  const seats = new Map<string, Seat>()
  const parents = new Map<string, string | undefined>()
  const titles = new Map<string, string>()
  let officeDown = false

  log(`cargado en ${directory}`)

  async function call(route: string, body: unknown): Promise<Response | undefined> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(`${URL_BASE}${route}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (officeDown) log("oficina disponible otra vez")
      officeDown = false
      return res
    } catch {
      if (!officeDown) log("oficina no disponible")
      officeDown = true
      return undefined
    } finally {
      clearTimeout(timer)
    }
  }

  async function parentOf(id: string): Promise<string | undefined> {
    if (parents.has(id)) return parents.get(id)
    try {
      const res: any = await (client as any).session.get({ path: { id } })
      const parentID = res?.data?.parentID
      parents.set(id, parentID)
      return parentID
    } catch {
      return undefined
    }
  }

  function nameFor(seat: Seat): string {
    const tag = seat.id.slice(-4)
    // subagentes de plugins (p. ej. memory-consolidation) no traen agente: usar el título
    const agent = seat.agent ?? titles.get(seat.id) ?? "agente"
    return seat.parentID ? `↳ ${clip(agent, 16)} ${tag}` : `${clip(project, 14)}/${clip(agent, 12)} ${tag}`
  }

  async function join(seat: Seat) {
    if (seat.agentId || seat.gone) return
    if (seat.joining) return seat.joining
    seat.joining = (async () => {
      seat.parentID ??= await parentOf(seat.id)
      const res = await call("/join-agent", {
        key: JOIN_KEY,
        name: nameFor(seat),
        sprite: seat.parentID ? "sam" : "worker",
      })
      if (res?.status === 201) {
        const body = (await res.json()) as { agentId: string; token: string }
        seat.agentId = body.agentId
        seat.token = body.token
        seat.sent = undefined
        log(`join ${seat.id} → ${body.agentId} (${nameFor(seat)})`)
      } else if (res) {
        log(`join ${seat.id} rechazado: HTTP ${res.status}`)
      }
    })().finally(() => {
      seat.joining = undefined
    })
    return seat.joining
  }

  async function flush(seat: Seat, force = false) {
    seat.flushTimer = undefined
    if (seat.gone) return
    if (!seat.agentId) await join(seat)
    if (!seat.agentId) return
    const own = /^(💭|💬) /.test(seat.detail) // un pensamiento ya ocupa todo el globo
    const detail = seat.task && seat.state !== "error" && !own ? clip(`${seat.detail} · ${seat.task}`) : seat.detail
    const key = `${seat.state}|${detail}`
    if (!force && key === seat.sent) return
    seat.lastPush = Date.now()
    const res = await call("/agent-push", { agentId: seat.agentId, token: seat.token, state: seat.state, detail })
    if (res?.ok) {
      seat.sent = key
      log(`push ${seat.id} ${seat.state} "${detail}"`)
    } else if (res?.status === 401) {
      // la oficina se reinició o el barrido sacó al agente: volver a entrar
      seat.agentId = seat.token = seat.sent = undefined
      await join(seat)
      if (seat.agentId) return flush(seat, true)
    } else if (res?.status === 429) {
      schedule(seat)
    }
  }

  function schedule(seat: Seat) {
    if (seat.flushTimer || seat.gone) return
    const wait = Math.max(0, MIN_PUSH_GAP_MS - (Date.now() - seat.lastPush))
    seat.flushTimer = setTimeout(() => void flush(seat), wait)
  }

  function seatFor(id: string): Seat {
    let seat = seats.get(id)
    if (!seat || seat.gone) {
      seat = { id, state: "thinking", detail: "pensando…", lastPush: 0, lastActivity: Date.now() }
      seats.set(id, seat)
    }
    return seat
  }

  // subagentes bloqueados (reintento o error): se ven 8 s y salen; vuelven
  // solo si retoman trabajo real. Así no se apilan en la puerta.
  const muted = new Set<string>()
  function muteChild(id: string) {
    if (!(seats.get(id)?.parentID ?? parents.get(id)) || muted.has(id)) return
    muted.add(id)
    setTimeout(() => {
      const s = seats.get(id)
      if (s && muted.has(id)) void leave(s)
    }, CHILD_LEAVE_MS)
  }

  function set(id: string | undefined, state: State, detail: string) {
    if (!id) return
    if (muted.has(id)) {
      if (state === "waiting" || state === "error" || state === "idle") return
      muted.delete(id)
    }
    const seat = seatFor(id)
    seat.state = state
    seat.detail = clip(detail)
    seat.lastActivity = Date.now()
    schedule(seat)
  }

  // lo que el agente va pensando (reasoning) o respondiendo (text), en una
  // frase corta para el globo y la ficha de la oficina. Solo mensajes del
  // asistente: nunca se repite lo que escribe el usuario.
  const userMsgs = new Set<string>()
  const parts = new Map<string, { sessionID: string; kind: string; text: string }>()
  const lastThought = new Map<string, number>()
  const lastSaid = new Map<string, string>()
  function cap<T>(c: Set<T> | Map<T, unknown>) {
    if (c.size > 300) c.delete(c.keys().next().value as T)
  }
  function thought(sessionID: string | undefined, kind: string, text: string, force = false) {
    if (!sessionID || muted.has(sessionID) || HELPER_TITLES.has(titles.get(sessionID) ?? "")) return
    const seat = seats.get(sessionID)
    // no tapa una herramienta en curso ni una pregunta de permiso
    if (seat && seat.state !== "thinking") return
    const now = Date.now()
    if (!force && now - (lastThought.get(sessionID) ?? 0) < THOUGHT_GAP_MS) return
    const s = lastSentence(text)
    if (s.length < 8) return
    lastThought.set(sessionID, now)
    cap(lastThought)
    set(sessionID, "thinking", `${kind === "reasoning" ? "💭" : "💬"} ${s}`)
  }

  async function leave(seat: Seat) {
    if (seat.gone) return
    seat.gone = true
    if (seat.flushTimer) clearTimeout(seat.flushTimer)
    seats.delete(seat.id)
    if (seat.agentId) {
      await call("/leave-agent", { agentId: seat.agentId, token: seat.token })
      log(`leave ${seat.id}`)
    }
  }

  const heartbeat = setInterval(() => {
    const now = Date.now()
    for (const seat of seats.values()) {
      if (seat.state === "idle" && now - seat.lastActivity > IDLE_KEEP_MS) {
        void leave(seat)
        continue
      }
      void flush(seat, true)
    }
  }, HEARTBEAT_MS)
  ;(heartbeat as any).unref?.()

  return {
    dispose: async () => {
      clearInterval(heartbeat)
      // enviar el último estado pendiente; una sesión en error se queda a la
      // vista (el barrido de la oficina la retira solo) para que se note
      await Promise.all(
        [...seats.values()].map(async (s) => {
          if (s.flushTimer) {
            clearTimeout(s.flushTimer)
            await flush(s)
          }
          if (s.state !== "error") await leave(s)
        }),
      )
    },

    "chat.message": async (input: { sessionID: string; agent?: string }) => {
      try {
        const seat = seatFor(input.sessionID)
        if (input.agent && !seat.agent) seat.agent = input.agent
        set(input.sessionID, "thinking", "pensando…")
      } catch {
        /* solo observa */
      }
    },

    "permission.ask": async (input: any) => {
      try {
        const seat = seatFor(input.sessionID)
        if (seat.state !== "waiting") seat.beforePermission = { state: seat.state, detail: seat.detail }
        set(input.sessionID, "waiting", `pide permiso: ${input.title ?? input.permission ?? input.type ?? "acción"}`)
      } catch {
        /* solo observa */
      }
    },

    "tool.execute.before": async (input: { tool: string; sessionID: string }, output: { args: any }) => {
      try {
        const args = output?.args
        if (input.tool === "todowrite" && Array.isArray(args?.todos)) {
          const current = args.todos.find((t: any) => t?.status === "in_progress")
          seatFor(input.sessionID).task = current?.content ? clip(String(current.content), 40) : undefined
        }
        set(input.sessionID, TOOL_STATE[input.tool] ?? "executing", describeTool(input.tool, args))
      } catch {
        /* solo observa */
      }
    },

    "tool.execute.after": async (input: { tool: string; sessionID: string }) => {
      try {
        set(input.sessionID, "thinking", `terminó ${input.tool}`)
      } catch {
        /* solo observa */
      }
    },

    event: async ({ event }: { event: any }) => {
      try {
        const p = event?.properties ?? {}
        if (DEBUG_FILE && /^(session\.(created|idle|error|deleted|status)|permission\.)/.test(event?.type ?? ""))
          log(`evento ${event.type} ${p.sessionID ?? p.info?.id ?? ""} ${p.status?.type ?? p.error?.name ?? ""}`)
        switch (event?.type) {
          case "session.created":
          case "session.updated":
            if (p.info?.id) {
              parents.set(p.info.id, p.info.parentID)
              if (p.info.title) titles.set(p.info.id, String(p.info.title))
            }
            break
          case "message.updated":
            if (p.info?.role === "user" && p.info.id) {
              userMsgs.add(p.info.id)
              cap(userMsgs)
            }
            break
          case "message.part.updated": {
            const part = p.part
            if (!part?.id || (part.type !== "reasoning" && part.type !== "text")) break
            if (part.synthetic || userMsgs.has(part.messageID)) break
            const text = String(part.text ?? "")
            parts.set(part.id, { sessionID: part.sessionID, kind: part.type, text })
            cap(parts)
            const ended = Boolean(part.time?.end)
            thought(part.sessionID, part.type, text, ended)
            if (ended) {
              parts.delete(part.id)
              // lo último que respondió acompaña al "listo ✓"
              if (part.type === "text") {
                lastSaid.set(part.sessionID, lastSentence(text))
                cap(lastSaid)
              }
            }
            break
          }
          case "message.part.delta": {
            // OpenCode nuevo manda el texto en trozos
            const rec = parts.get(p.partID)
            if (!rec || p.field !== "text" || userMsgs.has(p.messageID)) break
            rec.text = (rec.text + String(p.delta ?? "")).slice(-2000)
            thought(rec.sessionID, rec.kind, rec.text)
            break
          }
          case "session.status": {
            const status = p.status
            if (status?.type === "busy") {
              // un reintento vuelve a pasar por busy: eso no es trabajo nuevo
              if (muted.has(p.sessionID)) break
              const seat = seatFor(p.sessionID)
              if (seat.state === "idle" || seat.state === "error") set(p.sessionID, "thinking", "pensando…")
            } else if (status?.type === "retry") {
              set(p.sessionID, "waiting", retryText(status))
              muteChild(p.sessionID)
            }
            break
          }
          case "session.idle": {
            const seat = seats.get(p.sessionID)
            if (!seat) break
            seat.task = undefined
            // un error reciente se queda visible hasta el siguiente mensaje
            const said = lastSaid.get(p.sessionID)
            lastSaid.delete(p.sessionID)
            const done = seat.parentID ? "subtarea terminada ✓" : "listo ✓"
            if (seat.state !== "error") set(p.sessionID, "idle", said && !HELPER_TITLES.has(titles.get(p.sessionID) ?? "") ? `${done} 💬 ${said}` : done)
            if (seat.parentID) setTimeout(() => void leave(seat), CHILD_LEAVE_MS)
            break
          }
          case "session.error": {
            if (!p.sessionID) break
            if (p.error?.name === "MessageAbortedError") set(p.sessionID, "idle", "cancelada por el usuario")
            else {
              set(p.sessionID, "error", errorText(p.error))
              muteChild(p.sessionID)
            }
            break
          }
          case "permission.updated":
          case "permission.asked": {
            const seat = seatFor(p.sessionID)
            if (seat.state !== "waiting") seat.beforePermission = { state: seat.state, detail: seat.detail }
            set(p.sessionID, "waiting", `pide permiso: ${p.title ?? p.permission ?? p.type ?? "acción"}`)
            break
          }
          case "permission.replied": {
            const seat = seats.get(p.sessionID)
            if (!seat) break
            const back = seat.beforePermission ?? { state: "thinking" as State, detail: "continúa" }
            seat.beforePermission = undefined
            set(p.sessionID, back.state, back.detail)
            break
          }
          case "session.deleted": {
            const seat = p.info?.id ? seats.get(p.info.id) : undefined
            if (p.info?.id) titles.delete(p.info.id)
            if (seat) await leave(seat)
            break
          }
        }
      } catch {
        /* solo observa */
      }
    },
  }
}
