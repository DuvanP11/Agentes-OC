// Entry point: canvas scene, sprite registry, live character management,
// demo mode, set-state toolbar, debug overlay toggle, asset manager sidebar
// (M5 #21).

import { Scene } from "./scene.js";
import { loadSprites, parseManifest, createRegistry } from "./sprites.js";
import { Character } from "./character.js";
import { connectOffice } from "./api.js";
import { hashId, hasFreeSpot, pickSpot, releaseAgent, zoneById } from "./logic.js";
import { MemoCard } from "./memo.js";
import { initMobileSheet } from "./mobile.js";
import { AssetManager, STORAGE_KEYS, loadOverride } from "./assetmanager.js";

const params = new URLSearchParams(location.search);
const debugFlag = params.get("debug") === "1";
const demoEnabled = params.get("demo") !== "0";

const canvas = document.getElementById("scene");
const scene = new Scene(canvas, { debug: debugFlag });

// P1-3: visible loading + error states instead of a blank canvas on failure.
function showStatus(message, isError = false) {
  let el = document.getElementById("office-status");
  if (!el) {
    el = document.createElement("div");
    el.id = "office-status";
    el.style.cssText = "position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:300;padding:8px 14px;border-radius:4px;font:12px ui-monospace,Menlo,monospace;background:#141824;border:1px solid #333c4d;color:#9aa4b2;max-width:80vw;text-align:center;";
    document.body.appendChild(el);
  }
  el.style.color = isError ? "#ff8a8a" : "#9aa4b2";
  el.style.borderColor = isError ? "#5a2626" : "#333c4d";
  el.textContent = message;
}

const FALLBACK_LAYOUT = {
  size: [960, 540],
  stateZone: {
    idle: "sofa",
    writing: "desk",
    researching: "desk",
    executing: "desk",
    thinking: "desk",
    waiting: "door",
    error: "server",
  },
  zones: [
    { id: "sofa", x: 60, y: 310, w: 240, h: 150, spots: [[180, 390]] },
    { id: "desk", x: 340, y: 260, w: 280, h: 140, spots: [[390, 390], [560, 390]] },
    { id: "door", x: 40, y: 430, w: 140, h: 100, spots: [[95, 500]] },
    { id: "server", x: 790, y: 160, w: 130, h: 130, spots: [[855, 252]] },
  ],
  furniture: [],
};

showStatus("Loading office…");
const startupErrors = [];
try {
  await scene.loadLayout("assets/scene.json");
} catch (e) {
  startupErrors.push(`scene: ${e.message}`);
  scene.layout = FALLBACK_LAYOUT;
}
const builtinLayout = scene.layout;
const builtinManifest = await (await fetch("assets/sprites.json")).json().catch(() => null);
let registry;
try {
  registry = await loadSprites("assets/sprites.json");
} catch (e) {
  startupErrors.push(`sprites: ${e.message}`);
  registry = await createRegistry(parseManifest({ default: "worker", sprites: { worker: {} } }));
}
if (startupErrors.length) {
  showStatus(`⚠ Startup issue — ${startupErrors.join("; ")} (using fallback assets)`, true);
} else {
  showStatus("");
}

// M5 #21: apply persisted asset overrides before the first frame so a swap
// survives reloads without a redeploy.
function applyStoredOverrides() {
  const sceneOverride = loadOverride(localStorage, STORAGE_KEYS.scene);
  if (sceneOverride) scene.layout = sceneOverride.data;
  const spritesOverride = loadOverride(localStorage, STORAGE_KEYS.sprites);
  return spritesOverride?.data ?? null;
}

const storedManifest = applyStoredOverrides();
if (storedManifest) {
  try {
    registry = await createRegistry(parseManifest(storedManifest));
  } catch {
    registry = await loadSprites("assets/sprites.json");
  }
}
const [sw, sh] = scene.layout.size;
canvas.width = sw;
canvas.height = sh;

const characters = new Map();
let mode = "offline";

const SPRITE_IDS = ["worker", "sam", "dino"];

function pickSprite(registry, agentId) {
  const available = SPRITE_IDS.filter((id) => registry.has(id));
  if (available.length === 0) return registry.get(registry.defaultId);
  return registry.get(available[hashId(agentId) % available.length]);
}

// pixel-office-opencode: nombre humano por tipo de agente (assets/nombres.json).
// El plugin manda "proyecto/agente xxxx" o "↳ agente xxxx"; se muestra
// "Laura · director" y, en subagentes, "↳ Sofía · data-analyst".
let nombres = { agentes: {}, otros: [] };
try {
  nombres = await (await fetch("assets/nombres.json", { cache: "no-store" })).json();
} catch {}

function humanName(raw, id) {
  const m = /^(↳ )?(?:[^/ ]+\/)?(\S+) (\S{4})$/.exec(String(raw ?? ""));
  if (!m) return raw;
  const [, child, role] = m;
  const agentes = nombres.agentes ?? {};
  // el plugin recorta los nombres largos con "…"
  const key = role.endsWith("…")
    ? Object.keys(agentes).find((k) => k.startsWith(role.slice(0, -1)))
    : role in agentes ? role : undefined;
  const pool = nombres.otros?.length ? nombres.otros : ["Agente"];
  let human = key ? agentes[key] : pool[hashId(role) % pool.length];
  // dos sesiones del mismo agente a la vez: la segunda lleva número
  const twins = [...characters.values()].filter((c) => c.id !== id && c.human === human).length;
  if (twins) human = `${human} ${twins + 1}`;
  // solo el nombre: con 27 personas las etiquetas largas se montaban
  return { label: `${child ?? ""}${human}`, human, role: key };
}

// cada tipo de agente con su propia ropa (assets/sprites.json p0…p15): el
// residente y su sesión real se ven iguales
function roleSprite(role) {
  const id = `p${hashId(role) % 16}`;
  return role && registry.has(id) ? registry.get(id) : null;
}

// pixel-office-opencode: EQUIPO RESIDENTE. Los tipos de agente de
// nombres.json → "equipo" viven en la oficina aunque no tengan sesión abierta:
// están siempre en reposo y solo hacen vida de oficina (globos grises). Cuando
// OpenCode abre una sesión de ese agente, el residente "se convierte" en ella
// (la sesión real aparece donde estaba él y su etiqueta es verde); al cerrarse,
// vuelve a ser residente en ese mismo sitio.
// cada tipo de agente de nombres.json tiene SU escritorio (mismo orden) con
// una placa con su nombre; los que sobran quedan libres (zone.reserved)
const deskOf = new Map(Object.keys(nombres.agentes ?? {}).map((role, i) => [role, i]));
{
  const deskZone = zoneById(scene.layout, "desk");
  if (deskZone) {
    deskZone.reserved = Math.min(deskOf.size, deskZone.spots.length);
    for (const [role, i] of deskOf) {
      const s = deskZone.spots[i];
      if (s) scene.layout.furniture.push({ type: "plate", x: s[0], y: s[1] - 36, w: 0, h: 0, text: nombres.agentes[role] });
    }
  }
}

const residents = new Map();
{
  const equipo = nombres.equipo === "todos" ? Object.keys(nombres.agentes ?? {}) : nombres.equipo ?? [];
  for (const role of equipo) {
    const human = nombres.agentes?.[role];
    if (!human) continue;
    const r = new Character({
      id: `equipo:${role}`,
      name: human,
      sprite: roleSprite(role) ?? pickSprite(registry, role),
      layout: scene.layout,
    });
    r.role = role;
    r.deskIndex = deskOf.get(role);
    r.human = human;
    r.resident = true;
    r.fresh = true;
    r.idleSince = -Infinity;
    residents.set(role, r);
  }
}

function visibleResidents() {
  const busy = new Set([...characters.values()].map((c) => c.role).filter(Boolean));
  const out = [];
  for (const [role, r] of residents) {
    if (busy.has(role)) {
      if (!r.hidden) {
        r.hidden = true;
        r.ambient = null;
        releaseAgent(r.id);
      }
    } else {
      r.hidden = false;
      out.push(r);
    }
  }
  return out;
}

function upsertAgent(agent) {
  let c = characters.get(agent.id);
  if (!c) {
    // pixel-office-opencode: el sprite "dino" (verde) parece dañado; los
    // OpenCode con el plugin viejo aún lo piden, así que se cambia aquí
    const spriteId = agent.sprite === "dino" ? "sam" : agent.sprite;
    const n = humanName(agent.name, agent.id);
    const role = typeof n === "object" ? n.role : undefined;
    const sprite = roleSprite(role) ?? (spriteId ? registry.get(spriteId) : pickSprite(registry, agent.id));
    c = new Character({ id: agent.id, name: agent.name ?? agent.id, sprite, layout: scene.layout });
    c.real = true;
    if (typeof n === "object") {
      c.name = n.label;
      c.human = n.human;
      c.role = role;
    }
    // la primera sesión de cada agente va a su escritorio; una segunda, a uno libre
    if (role && ![...characters.values()].some((o) => o.role === role)) c.deskIndex = deskOf.get(role);
    // el residente de ese agente pasa a ser esta sesión: arranca donde él estaba
    const r = role && residents.get(role);
    if (r && !r.hidden && ![...characters.values()].some((o) => o.role === role)) {
      c.x = r.x;
      c.y = r.y;
    }
    characters.set(agent.id, c);
    // el residente suelta YA su escritorio, antes de que la sesión lo pida
    visibleResidents();
  }
  // pixel-office-opencode: el aviso de cuota del proveedor es largo y tapa a
  // los vecinos; se resume igual que hace el plugin nuevo
  const quota = /^reintento (\d+): .*(usage|quota|limit|exceeded|subscribe)/i.exec(agent.detail ?? "");
  const detail = quota ? `sin cuota · reintento ${quota[1]}` : agent.detail;
  c.setState(agent.state, detail, agent.zone);
  if (agent.joinedAt) c.joinedAt = agent.joinedAt;
  if (agent.lastSeen) c.lastSeen = agent.lastSeen;
}

connectOffice({
  onSnapshot: (snap) => {
    const seen = new Set();
    for (const [id, agent] of Object.entries(snap.agents ?? {})) {
      seen.add(id);
      upsertAgent(agent);
    }
    for (const id of [...characters.keys()]) {
      if (!seen.has(id)) {
        const c = characters.get(id);
        const r = c.role && residents.get(c.role);
        if (r) {
          r.x = c.x;
          r.y = c.y;
          r.target = { x: c.x, y: c.y };
          r.ambient = null;
          r.idleSince = -Infinity;
        }
        characters.delete(id);
        releaseAgent(id);
      }
    }
    syncMobile();
  },
  onModeChange: (m) => {
    mode = m;
  },
});

// Mobile agent sheet (M5 #20)
const mobileSheet = initMobileSheet({
  characters,
  onSelect: (agentId) => {
    const char = characters.get(agentId);
    if (char) {
      // Center camera on selected agent (future enhancement)
    }
  },
});

// Demo character (PLAN.md #12: "a test character idles and walks between two
// points"). Takes over when the office is empty; real agents hide it.
const DEMO_LOOP = [
  { state: "idle", zone: "sofa", detail: null, hold: 3500 },
  { state: "writing", zone: "desk", detail: "writing README.md — adding the pixel office docs", hold: 4500 },
  { state: "thinking", zone: "desk", detail: null, hold: 2500 },
  { state: "researching", zone: "desk", detail: "reading hive/PROTOCOL.md for context…", hold: 3500 },
  { state: "waiting", zone: "door", detail: "Waiting for permission to run npm install", hold: 4000 },
  { state: "error", zone: "server", detail: "TypeError: cannot read property of undefined", hold: 3000 },
];

function makeDemo() {
  const sprite = registry.get(registry.defaultId);
  const char = new Character({ id: "__demo__", name: "Demo", sprite, layout: scene.layout });
  let i = 0;
  let t = 0;
  return {
    list() {
      return characters.size === 0 ? [char] : [];
    },
    getChar() {
      return char;
    },
    update(dt, _time) {
      if (characters.size > 0) return;
      const step = DEMO_LOOP[i];
      char.setState(step.state, step.detail, step.zone);
      char.update(dt);
      t += dt * 1000;
      if (t >= step.hold) {
        t = 0;
        i = (i + 1) % DEMO_LOOP.length;
        syncMobile();
      }
    },
  };
}
const demo = demoEnabled ? makeDemo() : null;

// P1-5: mirror what the canvas shows in the mobile sheet — the demo character
// when the office is empty, the real agent map otherwise.
function syncMobile() {
  const demoChars = demo ? demo.list() : [];
  mobileSheet.sheet.update(demoChars.length ? new Map(demoChars.map((c) => [c.id, c])) : characters);
}
syncMobile();

// pixel-office-opencode: ambiente de oficina. SOLO los agentes en reposo
// (idle desde hace 15 s) piensan o juegan en su escritorio, toman café en el
// sofá o charlan con otro que también esté libre. Los globos van en gris para
// no confundirse con los estados reales, y cualquier evento real de OpenCode
// los devuelve a su estado verdadero (Character.setState borra la simulación).
const AMBIENT_DELAY_MS = 15000;
const AMBIENT = [
  { icon: "🤔", pose: "think", where: "desk", weight: 4 },
  { icon: "📖", pose: "read", where: "biblioteca", weight: 2 },
  { icon: "💧", pose: "think", where: "agua", weight: 1 },
  { icon: "🎧", pose: "sit", where: "puff", weight: 1 },
  { icon: "🧃", pose: "think", where: "nevera", weight: 1 },
  { icon: "📺", pose: "sit", where: "tv", weight: 2 },
  { icon: "🕹️", pose: "type", where: "arcade", weight: 2 },
  { icon: "🏓", pose: "wait", where: "pingpong", weight: 2 },
  { icon: "☕", pose: "think", where: "cafe", weight: 2 },
  { icon: "🥪", pose: "think", where: "mesa", weight: 1 },
  { icon: "📺", pose: "sit", where: "descanso", weight: 2 },
  { icon: "💬", pose: "wait", where: "chat", weight: 3 },
];

function ambientTick() {
  const now = performance.now();
  const free = [...characters.values(), ...visibleResidents()].filter(
    (c) => c.state === "idle" && now - c.idleSince > AMBIENT_DELAY_MS,
  );
  for (const c of free) {
    const a = c.ambient;
    if (a && now < a.until && !(a.partner && a.partner.state !== "idle")) continue;
    // solo eligen actividades con sitio libre (si no, se amontonan); su
    // escritorio siempre está libre para ellos
    const options = AMBIENT.filter(
      (x) => x.where === "chat" || (x.where === "desk" && c.deskIndex != null) || hasFreeSpot(scene.layout, x.where, c.id),
    );
    if (!options.length) continue;
    let pick = null;
    let r = Math.random() * options.reduce((s, x) => s + x.weight, 0);
    for (const x of options) if ((r -= x.weight) < 0 && !pick) pick = x;
    if (pick.where === "chat" && c.fresh) pick = options.find((x) => x.where !== "chat") ?? pick;
    const until = now + 10000 + Math.random() * 15000;
    if (pick.where === "chat") {
      const partner = free.find(
        (o) => o !== c && !o.moving && !(o.ambient?.partner) && o.ambient?.where !== "chat",
      );
      if (!partner) pick = options.find((x) => x.where !== "chat");
      if (!pick) continue;
      else {
        c.target = { x: partner.x + (partner.x > 800 ? -34 : 34), y: partner.y };
        c.ambient = { ...pick, until, partner };
        partner.ambient = { ...pick, until, partner: c };
        continue;
      }
    }
    const spot = pickSpot(scene.layout, pick.where, c.id, pick.where === "desk" ? c.deskIndex : undefined);
    if (spot) c.target = spot;
    // al abrir la página el equipo ya está repartido, no sale todo del sofá
    if (c.fresh && spot) {
      c.x = spot.x;
      c.y = spot.y;
    }
    c.fresh = false;
    c.ambient = { ...pick, until };
  }
}
setInterval(ambientTick, 1000);
ambientTick();

let last = 0;
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  if (demo) demo.update(dt, t / 1000);
  const team = visibleResidents();
  for (const c of characters.values()) c.update(dt);
  for (const c of team) c.update(dt);
  const visible = demo && characters.size === 0 ? demo.list() : [...characters.values(), ...team];
  scene.draw({ characters: visible, mode, time: t / 1000 });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Set-state toolbar (PLAN.md #13 acceptance: POST /set_state reflects on screen).
const STATE_BUTTONS = [
  ["idle", "Idle", null],
  ["writing", "Writing", "writing frontend/src/main.js — wiring the SSE client"],
  ["researching", "Researching", "reading hive/PROTOCOL.md for context…"],
  ["executing", "Executing", "npm run build && npm test"],
  ["thinking", "Thinking", null],
  ["waiting", "Waiting", "Permission needed: npm install"],
  ["error", "Error", "TypeError: Cannot read properties of undefined"],
];
const toolbar = document.getElementById("toolbar");
for (const [state, label, detail] of STATE_BUTTONS) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.addEventListener("click", async () => {
    const body = { state };
    if (detail) body.detail = detail;
    try {
      await fetch("/set_state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      // backend offline; demo keeps the office alive
    }
  });
  toolbar.appendChild(btn);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "d" || e.key === "D") scene.debug = !scene.debug;
});

// Memo card (M5 #18)
const memo = new MemoCard({ container: document.body, fetchUrl: "/api/memo" });
memo.mount();
memo.show();

// Asset manager sidebar (M5 #21): password-protected, hot-swaps scene/sprites
// and persists overrides in localStorage.
const assetManager = new AssetManager({
  scene,
  registry,
  builtins: { scene: builtinLayout, sprites: builtinManifest },
  storage: localStorage,
  onChange: {
    scene: (layout) => {
      for (const c of characters.values()) {
        c.layout = layout;
        let zone = c.zone;
        if (!zoneById(layout, zone)) zone = layout.stateZone?.idle ?? layout.zones[0]?.id;
        const spot = zone ? pickSpot(layout, zone, c.id) : null;
        if (spot) c.target = spot;
      }
      if (demo) demo.getChar().layout = layout;
    },
    sprites: (next) => {
      for (const c of characters.values()) c.sprite = pickSprite(next, c.id);
      if (demo) demo.getChar().sprite = next.get(next.defaultId);
    },
  },
});
assetManager.mount();
