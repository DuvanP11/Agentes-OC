// pixel-office-opencode: ficha del agente. Clic en un personaje → panel con
// quién es, qué está haciendo ahora y el historial de lo que ha hecho y
// pensado mientras la página está abierta. Todo viene de eventos reales de
// OpenCode (plugin pixel-office.ts); la simulación de reposo se marca aparte.

const ESTADO = {
  idle: ["💤", "En reposo"],
  writing: ["⌨️", "Escribiendo código"],
  researching: ["🔍", "Investigando"],
  executing: ["⚙️", "Ejecutando"],
  thinking: ["💭", "Pensando"],
  waiting: ["❗", "Esperando"],
  error: ["🔥", "Con un error"],
};

const AMBIENTE = {
  desk: "pensando en su escritorio",
  biblioteca: "leyendo en la biblioteca",
  agua: "tomando agua",
  puff: "escuchando música en un puff",
  nevera: "sacando algo de la nevera",
  descanso: "viendo TV en la sala de descanso",
  arcade: "jugando en las máquinas",
  pingpong: "jugando ping-pong",
  cafe: "tomando café",
  mesa: "comiendo algo en la cocina",
  chat: "charlando con un compañero",
};

const MAX_LOG = 60;

function hora(ms) {
  return new Date(ms).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function hace(ms) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return `hace ${s} s`;
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  return `hace ${Math.round(s / 3600)} h`;
}

function esc(t) {
  return String(t ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
}

export class Ficha {
  constructor() {
    // historial por tipo de agente (o por sesión si no tiene tipo): así el
    // residente y su sesión real comparten la misma hoja de vida
    this.logs = new Map();
    this.sel = null;
    this.el = document.createElement("aside");
    this.el.className = "ficha";
    this.el.hidden = true;
    this.el.innerHTML = `
      <style>
        .ficha { position: fixed; top: 12px; right: 12px; bottom: 12px; width: min(360px, calc(100vw - 24px));
          background: #151922; border: 2px solid #2c3444; border-radius: 8px; z-index: 300;
          display: flex; flex-direction: column; font: 12px ui-monospace, Menlo, monospace; color: #e7e9ee;
          box-shadow: 0 8px 30px rgba(0,0,0,.5); }
        .ficha[hidden] { display: none; }
        .ficha header { display: block; padding: 12px 14px 10px; border-bottom: 1px solid #262d3b; position: relative; }
        .ficha h2 { display: block; margin: 0; padding-right: 24px; font-size: 16px; }
        .ficha .rol { display: block; color: #8b94a8; margin-top: 2px; }
        .ficha .x { position: absolute; top: 8px; right: 10px; background: none; border: 0; color: #8b94a8;
          font-size: 18px; cursor: pointer; }
        .ficha .chip { display: block; width: fit-content; margin-top: 8px; padding: 2px 8px; border-radius: 10px; font-size: 11px; }
        .ficha .real { background: #16603a; }
        .ficha .equipo { background: #2a3142; color: #b9c1d3; }
        .ficha section { padding: 10px 14px; border-bottom: 1px solid #262d3b; }
        .ficha .ahora { font-size: 14px; line-height: 1.4; }
        .ficha .det { margin-top: 4px; color: #cfd6e4; white-space: pre-wrap; word-break: break-word; }
        .ficha .sim { color: #9aa3b5; font-style: italic; }
        .ficha .meta { color: #7c8496; margin-top: 6px; }
        .ficha .pedir code { background: #222836; padding: 3px 6px; border-radius: 3px; display: inline-block; margin: 4px 0; }
        .ficha .pedir button { font: inherit; font-size: 11px; margin-left: 6px; padding: 2px 8px; background: #1d2330;
          color: #cfd6e4; border: 1px solid #333c4d; border-radius: 4px; cursor: pointer; }
        .ficha .log { flex: 1; overflow-y: auto; padding: 8px 14px 14px; }
        .ficha .log h3 { margin: 0 0 6px; font-size: 12px; color: #8b94a8; font-weight: normal; }
        .ficha .log ol { list-style: none; margin: 0; padding: 0; }
        .ficha .log li { padding: 4px 0; border-bottom: 1px dashed #232a37; display: grid; grid-template-columns: 62px 18px 1fr; gap: 4px; }
        .ficha .log .t { color: #6b7385; }
        .ficha .log .vacio { color: #7c8496; display: block; }
      </style>
      <header>
        <button class="x" title="Cerrar (Esc)">×</button>
        <h2></h2><div class="rol"></div><span class="chip"></span>
      </header>
      <section class="ahora"></section>
      <section class="pedir"></section>
      <div class="log"><h3>Lo que ha hecho y pensado (desde que abriste la página)</h3><ol></ol></div>`;
    document.body.appendChild(this.el);
    this.q = (s) => this.el.querySelector(s);
    this.q(".x").addEventListener("click", () => this.close());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });
    setInterval(() => this.render(), 1000);
  }

  keyOf(c) {
    return c.role ?? c.id;
  }

  // se llama con cada actualización real que llega de la oficina
  record(c, state, detail) {
    const k = this.keyOf(c);
    const sig = `${state}|${detail ?? ""}`;
    let log = this.logs.get(k);
    if (!log) this.logs.set(k, (log = []));
    if (log.length && log[0].sig === sig) return;
    log.unshift({ t: Date.now(), state, detail, sig, child: String(c.name).startsWith("↳") });
    if (log.length > MAX_LOG) log.length = MAX_LOG;
    if (this.sel && this.keyOf(this.sel) === k) this.render();
  }

  open(c) {
    this.sel = c;
    this.el.hidden = false;
    this.render();
  }

  close() {
    this.sel = null;
    this.el.hidden = true;
  }

  // el personaje seleccionado puede cambiar de objeto (residente → sesión real)
  follow(find) {
    if (!this.sel) return;
    const next = find(this.sel);
    if (next && next !== this.sel) {
      this.sel = next;
      this.render();
    }
  }

  render() {
    const c = this.sel;
    if (!c || this.el.hidden) return;
    this.q("h2").textContent = c.human ?? c.name;
    this.q(".rol").textContent = c.role ? `Agente: ${c.role}` : "Agente sin tipo conocido";
    const chip = this.q(".chip");
    chip.className = `chip ${c.real ? "real" : "equipo"}`;
    chip.textContent = c.real ? "● Sesión real de OpenCode conectada" : "Equipo · sin sesión abierta";

    const [icon, label] = ESTADO[c.state] ?? ["•", c.state];
    let ahora;
    if (c.ambient) {
      ahora = `<div>☕ Descansando</div><div class="det sim">${esc(c.ambient.icon)} ${esc(AMBIENTE[c.ambient.where] ?? "rato libre")}
(simulación de oficina: no es trabajo real)</div>`;
    } else {
      ahora = `<div>${icon} ${esc(label)}</div>${c.detail ? `<div class="det">${esc(c.detail)}</div>` : ""}`;
    }
    const meta = [];
    if (c.real && c.joinedAt) meta.push(`entró ${hace(c.joinedAt)}`);
    if (c.real && c.lastSeen) meta.push(`última señal ${hace(c.lastSeen)}`);
    this.q(".ahora").innerHTML = `${ahora}${meta.length ? `<div class="meta">${meta.join(" · ")}</div>` : ""}`;

    const pedir = this.q(".pedir");
    if (c.role && c.role !== "director") {
      const cmd = `@${c.role} `;
      pedir.innerHTML = `Para pedirle algo directamente, escribe en OpenCode:<br><code>${esc(cmd)}tu pedido…</code><button>Copiar</button>`;
      pedir.querySelector("button").onclick = (e) => {
        navigator.clipboard?.writeText(cmd).then(
          () => (e.target.textContent = "¡Copiado!"),
          () => (e.target.textContent = "No se pudo copiar"),
        );
      };
      pedir.hidden = false;
    } else if (c.role === "director") {
      pedir.innerHTML = "Es el agente principal: lo que escribas en OpenCode le llega a él.";
      pedir.hidden = false;
    } else {
      pedir.hidden = true;
    }

    const log = this.logs.get(this.keyOf(c)) ?? [];
    this.q(".log ol").innerHTML = log.length
      ? log
          .map((e) => {
            const [i] = ESTADO[e.state] ?? ["•"];
            const txt = e.detail || (ESTADO[e.state]?.[1] ?? e.state);
            return `<li><span class="t">${hora(e.t)}</span><span>${i}</span><span>${e.child ? "↳ " : ""}${esc(txt)}</span></li>`;
          })
          .join("")
      : `<li class="vacio">Todavía nada. Cuando este agente trabaje en OpenCode, aquí verás cada paso y lo que va pensando.</li>`;
  }
}
