// Character: sprite pose animation + state->zone tweening + speech bubbles
// (milestone M3, issues #12 and #13). Zone map per PLAN.md section 5.1.

import { clampText, pickSpot, stepToward, WALK_SPEED } from "./logic.js";
import { drawIconBubble, drawSpeechBubble } from "./bubbles.js";

const STATE_ICON = {
  idle: "💤",
  writing: "⌨️",
  researching: "🔍",
  thinking: "💭",
  waiting: "❗",
  error: "🔥",
};

const STATE_POSE = {
  idle: "sit",
  writing: "type",
  researching: "read",
  executing: "type",
  thinking: "think",
  waiting: "wait",
  error: "error",
};

export class Character {
  constructor({ id, name, sprite, layout }) {
    this.id = id;
    this.name = name;
    this.sprite = sprite;
    this.layout = layout;
    this.state = "idle";
    this.detail = null;
    this.zone = null;
    // Populated from backend agent state when available (P1-4); stays null
    // otherwise so the mobile sheet never renders fabricated values.
    this.joinedAt = null;
    this.lastSeen = null;
    const spot = pickSpot(layout, layout.stateZone?.idle ?? "sofa", id) ?? { x: 480, y: 270 };
    this.x = spot.x;
    this.y = spot.y;
    this.target = spot;
    this.dir = "down";
    this.pose = "sit";
    this.frame = 0;
    this.animTime = 0;
    this.moving = false;
    // pixel-office-opencode: rato de oficina mientras está en reposo (main.js)
    this.ambient = null;
    this.idleSince = performance.now();
  }

  setState(state, detail, zone) {
    if (state === "idle" && this.state !== "idle") this.idleSince = performance.now();
    // trabajo real: se acaba la simulación al instante
    if (state !== "idle" && this.ambient) {
      this.ambient = null;
      this.zone = null;
    }
    this.state = state;
    this.detail = detail ?? null;
    const z = zone ?? this.layout.stateZone?.[state] ?? this.zone ?? "sofa";
    if (z !== this.zone) {
      this.zone = z;
      const spot = pickSpot(this.layout, z, this.id, z === "desk" ? this.deskIndex : undefined);
      if (spot) this.target = spot;
    }
  }

  // pixel-office-opencode: las salas de abajo tienen pared; para entrar o salir
  // se pasa por su puerta (layout.routing) en vez de atravesar el muro
  waypoint() {
    const r = this.layout.routing;
    const t = this.target;
    if (!r) return t;
    const room = (p) => (p.y < r.lowerY ? -1 : r.rooms.findIndex((m) => p.x >= m.x0 && p.x < m.x1));
    const here = room(this);
    const there = room(t);
    if (here === there) return t;
    if (here >= 0) {
      const d = r.rooms[here].door;
      return Math.abs(this.x - d) > 2 ? { x: d, y: r.inY } : { x: d, y: r.outY };
    }
    const d = r.rooms[there]?.door ?? t.x;
    const atDoor = Math.abs(this.x - d) <= 2;
    // recién salido por otra puerta: terminar de cruzarla antes de girar
    if (!atDoor && this.y > r.outY + 2) return { x: this.x, y: r.outY };
    return !atDoor || this.y < r.outY - 2 ? { x: d, y: r.outY } : { x: d, y: r.inY };
  }

  update(dt) {
    let goal = this.waypoint();
    if (goal !== this.target && Math.hypot(goal.x - this.x, goal.y - this.y) <= 2) {
      this.x = goal.x;
      this.y = goal.y;
      goal = this.waypoint();
    }
    const dx = goal.x - this.x;
    const dy = goal.y - this.y;
    if (goal !== this.target || Math.hypot(dx, dy) > 2) {
      const step = stepToward({ x: this.x, y: this.y }, goal, WALK_SPEED, dt);
      this.x = step.x;
      this.y = step.y;
      this.moving = true;
      if (step.dir) this.dir = step.dir;
      this.pose = `walk-${this.dir}`;
    } else {
      this.x = this.target.x;
      this.y = this.target.y;
      this.moving = false;
      this.pose = this.ambient?.pose ?? STATE_POSE[this.state] ?? "sit";
    }
    const frames = this.sprite.frames(this.pose);
    if (frames > 1) {
      this.animTime += dt;
      // pixel-office-opencode: quieto en su puesto anima a 2 fps (a 8 fps los
      // muñecos de 32 px parecían parpadear); caminando conserva su ritmo
      const fps = this.moving ? this.sprite.fps(this.pose) : 2;
      this.frame = Math.floor(this.animTime * fps) % frames;
    } else {
      this.frame = 0;
    }
  }

  draw(g, time) {
    const fw = this.sprite.frameW;
    const fh = this.sprite.frameH;
    const x = Math.round(this.x - fw / 2);
    let y = Math.round(this.y) - fh;
    this.sprite.draw(g, this.pose, this.frame, x, y);
    if (this.state === "error" && !this.moving) {
      // tinte rojo fijo en vez de intermitente
      g.fillStyle = "rgba(255,60,60,0.22)";
      g.fillRect(x, y, fw, fh);
    }
    if (this.state === "executing" && !this.moving) {
      const pulse = 0.25 + 0.08 * Math.sin(time * 1.5);
      const grad = g.createRadialGradient(this.x, this.y, 2, this.x, this.y, 26);
      grad.addColorStop(0, `rgba(53,208,127,${pulse.toFixed(2)})`);
      grad.addColorStop(1, "rgba(53,208,127,0)");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(this.x, this.y, 26, 0, Math.PI * 2);
      g.fill();
    }
    // name tag
    g.font = "10px ui-monospace, Menlo, monospace";
    const nw = g.measureText(this.name).width + 8;
    // pixel-office-opencode: etiqueta verde = sesión real de OpenCode conectada
    g.fillStyle = this.real ? "rgba(22,110,62,0.9)" : "rgba(10,12,16,0.75)";
    g.fillRect(Math.round(this.x - nw / 2), this.y + 2, nw, 12);
    g.fillStyle = "#fff";
    g.textAlign = "center";
    g.fillText(this.name, this.x, this.y + 12);
    // bubble
    if (!this.moving) {
      if (this.ambient) {
        drawIconBubble(g, this.x, y, this.ambient.icon, "ambient");
      } else if (this.detail) {
        drawSpeechBubble(g, this.x, y, clampText(this.detail));
      } else {
        const icon = STATE_ICON[this.state];
        if (icon) drawIconBubble(g, this.x, y, icon, this.state);
      }
    }
  }

}
