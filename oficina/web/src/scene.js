// Canvas scene renderer (milestone M3, issue #11).
// Fixed 960x540 logical canvas; CSS scales it with image-rendering: pixelated.
// Background + furniture layers come from the JSON layout (assets/scene.json).

const WALL_TOP = "#4a5a72";
const WALL_BOTTOM = "#3d4a5e";
const FLOOR_A = "#3a2f22";
const FLOOR_B = "#352b20";
const WALL_H = 150;

export class Scene {
  constructor(canvas, { debug = false } = {}) {
    this.canvas = canvas;
    this.g = canvas.getContext("2d");
    this.g.imageSmoothingEnabled = false;
    this.debug = debug;
    this.layout = null;
  }

  async loadLayout(url) {
    this.layout = await (await fetch(url)).json();
    const [w, h] = this.layout.size;
    this.canvas.width = w;
    this.canvas.height = h;
  }

  px(v) {
    return Math.round(v) + 0.5;
  }

  draw({ characters, mode, time }) {
    const g = this.g;
    const [w, h] = this.layout.size;
    g.clearRect(0, 0, w, h);
    this.drawShell(g);
    for (const f of this.layout.furniture) this.drawFurniture(g, f, time);
    const sorted = [...characters].sort((a, b) => a.y - b.y);
    for (const c of sorted) c.draw(g, time);
    if (this.debug) this.drawDebug(g);
    this.drawStatus(g, mode, time);
  }

  drawShell(g) {
    const [w, h] = this.layout.size;
    g.fillStyle = WALL_TOP;
    g.fillRect(0, 0, w, WALL_H);
    g.fillStyle = WALL_BOTTOM;
    g.fillRect(0, 0, w, 8);
    g.fillStyle = FLOOR_A;
    g.fillRect(0, WALL_H, w, h - WALL_H);
    g.fillStyle = FLOOR_B;
    let row = 0;
    for (let y = WALL_H + 2; y < h; y += 26, row++) {
      g.fillRect(0, this.px(y), w, 1);
      for (let x = (row % 2) * 60; x < w; x += 120) g.fillRect(x, y + 1, 1, 24);
    }
    g.fillStyle = "#2b3038";
    g.fillRect(0, WALL_H - 4, w, 4);
  }

  drawFurniture(g, f, time) {
    switch (f.type) {
      case "window":
        this.fWindow(g, f);
        break;
      case "clock":
        this.fClock(g, f);
        break;
      case "poster":
        this.fPoster(g, f);
        break;
      case "rug":
        this.fRug(g, f);
        break;
      case "sofa":
        this.fSofa(g, f);
        break;
      case "plant":
        this.fPlant(g, f);
        break;
      case "desk":
        this.fDesk(g, f);
        break;
      case "monitor":
        this.fMonitor(g, f);
        break;
      case "chair":
        this.fChair(g, f);
        break;
      case "server":
        this.fServer(g, f, time);
        break;
      case "door":
        this.fDoor(g, f);
        break;
      default:
        this.fExtra(g, f, time);
    }
  }

  fWindow(g, f) {
    const { x, y, w, h } = f;
    g.fillStyle = "#5a4632";
    g.fillRect(x, y, w, h);
    g.fillStyle = "#a8d0f0";
    g.fillRect(x + 6, y + 6, w - 12, h - 12);
    g.fillStyle = "rgba(255,255,255,0.35)";
    g.fillRect(x + 6, y + 6, w - 12, Math.floor((h - 12) / 3));
    g.fillStyle = "#5a4632";
    g.fillRect(x + w / 2 - 3, y + 6, 6, h - 12);
    g.fillRect(x + 6, y + h / 2 - 3, w - 12, 6);
  }

  fClock(g, f) {
    const { x, y, w, h } = f;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = w / 2 - 4;
    g.fillStyle = "#2b2f38";
    g.beginPath();
    g.arc(cx, cy, r + 3, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#f4ead8";
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#333";
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillRect(cx + Math.cos(a) * (r - 3) - 1, cy + Math.sin(a) * (r - 3) - 1, 2, 2);
    }
    g.fillStyle = "#222";
    g.fillRect(cx - 1, cy - r + 2, 2, r * 0.6);
    g.fillRect(cx - 1, cy - 1, r * 0.55, 2);
  }

  fPoster(g, f) {
    const { x, y, w, h } = f;
    g.fillStyle = "#efe6cd";
    g.fillRect(x, y, w, h);
    g.fillStyle = "#e2555a";
    g.beginPath();
    g.moveTo(x + 8, y + h - 8);
    g.lineTo(x + w / 2, y + 10);
    g.lineTo(x + w - 8, y + h - 8);
    g.fill();
    g.fillStyle = "#3f9b4f";
    g.beginPath();
    g.moveTo(x + w / 2 - 12, y + h - 8);
    g.lineTo(x + w / 2, y + h - 26);
    g.lineTo(x + w / 2 + 12, y + h - 8);
    g.fill();
    g.fillStyle = "#5a4632";
    g.fillRect(x, y + h - 8, w, 3);
  }

  fRug(g, f) {
    const { x, y, w, h } = f;
    g.fillStyle = "#8a4b34";
    g.fillRect(x, y, w, h);
    g.fillStyle = "#d9a05b";
    g.fillRect(x, y, w, 3);
    g.fillRect(x, y + h - 3, w, 3);
    g.fillRect(x, y, 3, h);
    g.fillRect(x + w - 3, y, 3, h);
    g.fillStyle = "#a9684a";
    g.fillRect(x + 12, y + 12, w - 24, h - 24);
  }

  fSofa(g, f) {
    const { x, y, w, h } = f;
    g.fillStyle = "#5d4a86";
    g.fillRect(x + 10, y, w - 20, 16);
    g.fillStyle = "#6f58a0";
    g.fillRect(x, y, 12, h - 8);
    g.fillRect(x + w - 12, y, 12, h - 8);
    g.fillStyle = "#7b5aa6";
    g.fillRect(x + 12, y + 10, w - 24, h - 18);
    g.fillStyle = "#8a6ac0";
    g.fillRect(x + 16, y + 14, (w - 24) / 2 - 4, h - 24);
    g.fillRect(x + 16 + (w - 24) / 2, y + 14, (w - 24) / 2 - 4, h - 24);
    g.fillStyle = "#3c3350";
    g.fillRect(x + 6, y + h - 6, 6, 6);
    g.fillRect(x + w - 12, y + h - 6, 6, 6);
  }

  fPlant(g, f) {
    const { x, y, w, h } = f;
    g.fillStyle = "#a05a2c";
    g.fillRect(x + 6, y + h - 26, w - 12, 26);
    g.fillStyle = "#7d4520";
    g.fillRect(x + 2, y + h - 30, w - 4, 6);
    const greens = ["#3f9b4f", "#4fc06a", "#379144"];
    const leaves = [
      [x + w / 2, y + h - 44, 16],
      [x + 8, y + h - 36, 12],
      [x + w - 8, y + h - 36, 12],
      [x + w / 2 - 10, y + h - 52, 12],
      [x + w / 2 + 8, y + h - 50, 12],
    ];
    leaves.forEach(([lx, ly, r], i) => {
      g.fillStyle = greens[i % 3];
      g.beginPath();
      g.arc(lx, ly, r, 0, Math.PI * 2);
      g.fill();
    });
  }

  fDesk(g, f) {
    const { x, y, w, h } = f;
    g.fillStyle = "#a9743f";
    g.fillRect(x, y, w, 10);
    g.fillStyle = "#8a5c33";
    g.fillRect(x + 6, y + 10, w - 12, h - 10);
    g.fillStyle = "#5b3d22";
    g.fillRect(x + 2, y + h - 6, 6, 6);
    g.fillRect(x + w - 8, y + h - 6, 6, 6);
    g.fillStyle = "rgba(0,0,0,0.25)";
    g.fillRect(x, y + h, w, 4);
  }

  fMonitor(g, f) {
    const { x, y, w, h } = f;
    g.fillStyle = "#1f222a";
    g.fillRect(x, y, w, h - 8);
    g.fillStyle = "#10141c";
    g.fillRect(x + 5, y + 5, w - 10, h - 18);
    g.fillStyle = "#35d07f";
    g.fillRect(x + 9, y + 10, 26, 3);
    g.fillRect(x + 9, y + 17, 40, 3);
    g.fillRect(x + 9, y + 24, 18, 3);
    g.fillStyle = "#3a3a44";
    g.fillRect(x + w / 2 - 3, y + h - 8, 6, 4);
    g.fillRect(x + w / 2 - 10, y + h - 4, 20, 4);
  }

  fChair(g, f) {
    const { x, y, w } = f;
    g.fillStyle = "#6b5b8c";
    g.fillRect(x + 2, y, w - 4, 6);
    g.fillRect(x + 2, y + 8, w - 4, 8);
    g.fillStyle = "#7b6a9e";
    g.fillRect(x, y + 16, w, 8);
    g.fillStyle = "#3a3a44";
    g.fillRect(x + w / 2 - 2, y + 24, 4, 8);
    g.fillStyle = "#2c2c34";
    g.fillRect(x - 4, y + 32, w + 8, 4);
  }

  fServer(g, f, time) {
    const { x, y, w, h } = f;
    g.fillStyle = "#26262e";
    g.fillRect(x, y, w, h);
    g.fillStyle = "#1c1c24";
    g.fillRect(x + 4, y + 4, w - 8, h - 8);
    const slotH = (h - 12) / 3;
    for (let i = 0; i < 3; i++) {
      const sy = y + 6 + i * slotH;
      g.fillStyle = "#12141a";
      g.fillRect(x + 8, sy + 2, w - 26, slotH - 6);
      const blink = Math.sin(time * (4 + i * 2)) > 0.2 ? "#ff5a5a" : "#7a2525";
      g.fillStyle = blink;
      g.fillRect(x + w - 18, sy + 4, 6, 3);
      g.fillStyle = i < 2 ? "#35d07f" : "#d9a05b";
      g.fillRect(x + w - 18, sy + 10, 6, 3);
    }
  }

  fDoor(g, f) {
    const { x, y, w, h } = f;
    g.fillStyle = "#5a4632";
    g.fillRect(x - 4, y - 4, w + 8, h + 4);
    g.fillStyle = "#6b4f2e";
    g.fillRect(x, y, w, h - 8);
    g.fillStyle = "#8a6a41";
    g.fillRect(x + 6, y + 8, w - 12, h - 30);
    g.fillStyle = "#d9a05b";
    g.fillRect(x + w - 14, y + h - 36, 4, 8);
  }

  // pixel-office-opencode: muebles de las salas de juegos, cocina y descanso
  fExtra(g, f, time) {
    const { x, y, w, h } = f;
    const R = (c, rx, ry, rw, rh) => {
      g.fillStyle = c;
      g.fillRect(Math.round(rx), Math.round(ry), Math.round(rw), Math.round(rh));
    };
    switch (f.type) {
      case "floor": {
        R(f.color, x, y, w, h);
        const t = f.tile ?? 32;
        if (f.pattern === "tile") {
          for (let ty = 0; ty < h; ty += t)
            for (let tx = ((ty / t) % 2) * t; tx < w; tx += t * 2) R(f.color2, x + tx, y + ty, Math.min(t, w - tx), Math.min(t, h - ty));
        } else if (f.pattern === "carpet") {
          for (let ty = 6; ty < h; ty += 12) for (let tx = (ty % 24 ? 6 : 0); tx < w; tx += 12) R(f.color2, x + tx, y + ty, 2, 2);
        } else {
          for (let ty = 0; ty < h; ty += 18) R(f.color2, x, y + ty, w, 1);
        }
        break;
      }
      case "wall":
        R("#2b3038", x, y, w, h);
        R("#4a5a72", x, y, w, Math.min(6, h));
        break;
      case "plate": {
        g.font = "8px ui-monospace, Menlo, monospace";
        g.textAlign = "center";
        const pw = g.measureText(f.text).width + 6;
        R("#efe6cd", x - pw / 2, y - 7, pw, 10);
        g.fillStyle = "#3d2f22";
        g.fillText(f.text, x, y + 1);
        break;
      }
      case "sign":
        g.font = "bold 11px ui-monospace, Menlo, monospace";
        g.textAlign = "left";
        R("rgba(10,12,16,0.55)", x - 4, y - 11, g.measureText(f.text).width + 8, 15);
        g.fillStyle = "#f4ead8";
        g.fillText(f.text, x, y);
        break;
      case "arcade":
        R("#1f222a", x, y, w, h);
        R(f.color ?? "#c0392b", x + 3, y + 3, w - 6, h - 6);
        R("#10141c", x + 7, y + 10, w - 14, h * 0.32);
        R(Math.sin(time * 3 + x) > 0 ? "#35d07f" : "#6a9fe8", x + 11, y + 14, w - 22, h * 0.32 - 8);
        R("#2b2f38", x + 3, y + h * 0.55, w - 6, 8);
        R("#ffd166", x + 10, y + h * 0.55 + 2, 4, 4);
        R("#ff6b6b", x + w - 16, y + h * 0.55 + 2, 4, 4);
        break;
      case "pingpong":
        R("rgba(0,0,0,0.25)", x + 4, y + h, w - 8, 6);
        R("#1e6b4a", x, y, w, h);
        R("#f4ead8", x, y, w, 2);
        R("#f4ead8", x, y + h - 2, w, 2);
        R("#f4ead8", x + w / 2 - 1, y, 2, h);
        R("#f4ead8", x, y + h / 2 - 1, w, 1);
        R("#3a3a44", x + 6, y + h, 4, 10);
        R("#3a3a44", x + w - 10, y + h, 4, 10);
        R("#ffffff", x + w / 2 + Math.sin(time * 4) * (w / 2 - 10), y + h / 2 - 8, 4, 4);
        break;
      case "beanbag":
        g.fillStyle = f.color ?? "#d9a05b";
        g.beginPath();
        g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "rgba(255,255,255,0.18)";
        g.beginPath();
        g.ellipse(x + w / 2 - 4, y + h / 2 - 4, w / 4, h / 5, 0, 0, Math.PI * 2);
        g.fill();
        break;
      case "tv":
        R("#5a4632", x, y + h - 14, w, 14);
        R("#1f222a", x + 8, y, w - 16, h - 16);
        R("#2a3550", x + 12, y + 4, w - 24, h - 24);
        R(`hsl(${(time * 40) % 360},45%,55%)`, x + 16, y + 8, (w - 32) * 0.6, h - 32);
        break;
      case "counter":
        R("#8a5c33", x, y + 8, w, h - 8);
        R("#d9d4c8", x - 2, y, w + 4, 10);
        for (let cx = x + 10; cx < x + w - 20; cx += 46) R("#6b4f2e", cx, y + 16, 36, h - 22);
        break;
      case "fridge":
        R("#cfd6e4", x, y, w, h);
        R("#aab2c2", x, y + h * 0.38, w, 2);
        R("#7a8496", x + w - 8, y + 10, 3, 14);
        R("#7a8496", x + w - 8, y + h * 0.45, 3, 18);
        break;
      case "coffee":
        R("#26262e", x, y, w, h);
        R("#3a3a44", x + 4, y + 4, w - 8, 8);
        R(Math.sin(time * 2) > 0 ? "#ff6b6b" : "#35d07f", x + w - 8, y + 6, 3, 3);
        R("#f4ead8", x + w / 2 - 5, y + h - 12, 10, 9);
        if (Math.sin(time * 1.3) > 0) R("rgba(255,255,255,0.5)", x + w / 2 - 1, y - 6 - (time * 6) % 6, 2, 4);
        break;
      case "table":
        R("rgba(0,0,0,0.25)", x + 4, y + h, w - 8, 5);
        R("#a9743f", x, y, w, h - 8);
        R("#8a5c33", x, y + h - 8, w, 8);
        R("#f4ead8", x + 16, y + 8, 14, 10);
        R("#e2555a", x + w - 34, y + 10, 12, 8);
        break;
      case "stool":
        R("#e2555a", x, y, w, 8);
        R("#3a3a44", x + w / 2 - 2, y + 8, 4, h - 8);
        break;
      case "bookshelf":
        R("#5a4632", x, y, w, h);
        for (let ry = y + 6, i = 0; ry < y + h - 10; ry += 20, i++) {
          R("#3d2f22", x + 4, ry, w - 8, 16);
          for (let bx = x + 6, j = 0; bx < x + w - 10; bx += 7, j++)
            R(["#e2555a", "#6a9fe8", "#35d07f", "#ffd166", "#b38ad8"][(i * 3 + j) % 5], bx, ry + 3 + ((i + j) % 3), 5, 13 - ((i + j) % 3));
        }
        break;
      case "cooler":
        R("#cfd6e4", x, y + h * 0.4, w, h * 0.6);
        R("rgba(120,180,240,0.8)", x + 3, y, w - 6, h * 0.42);
        R("#e2555a", x + 5, y + h * 0.55, 4, 4);
        R("#6a9fe8", x + w - 9, y + h * 0.55, 4, 4);
        break;
      case "vending":
        R("#2b2f38", x, y, w, h);
        R("#a8d0f0", x + 4, y + 4, w * 0.62, h - 20);
        for (let ry = y + 10; ry < y + h - 22; ry += 12)
          for (let bx = x + 7; bx < x + w * 0.62; bx += 9) R(["#e2555a", "#ffd166", "#35d07f"][(ry + bx) % 3], bx, ry, 6, 7);
        R("#3a3a44", x + w * 0.7, y + 10, w * 0.22, 20);
        break;
    }
  }

  drawDebug(g) {
    g.font = "11px ui-monospace, Menlo, monospace";
    for (const z of this.layout.zones) {
      g.strokeStyle = "rgba(53,208,127,0.9)";
      g.lineWidth = 1;
      g.strokeRect(this.px(z.x), this.px(z.y), z.w, z.h);
      g.fillStyle = "rgba(53,208,127,0.9)";
      g.textAlign = "left";
      g.fillText(`${z.id} (${z.w}x${z.h})`, z.x + 4, z.y + 14);
      for (const [sx, sy] of z.spots ?? []) {
        g.strokeStyle = "#ffd166";
        g.beginPath();
        g.moveTo(sx - 4, sy);
        g.lineTo(sx + 4, sy);
        g.moveTo(sx, sy - 4);
        g.lineTo(sx, sy + 4);
        g.stroke();
      }
    }
  }

  drawStatus(g, mode, time) {
    const colors = { live: "#35d07f", polling: "#e0a63b", offline: "#e05555" };
    const labels = { live: "LIVE · SSE", polling: "POLL · 2s", offline: "OFFLINE" };
    const c = colors[mode] ?? colors.offline;
    const [w] = this.layout.size;
    const cx = w - 92;
    g.fillStyle = "rgba(14,16,22,0.72)";
    g.fillRect(cx - 46, 6, 104, 24);
    g.fillStyle = c;
    g.beginPath();
    g.arc(cx - 28, 18, 5 + Math.sin(time * 4) * 0.8, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#e7e9ee";
    g.font = "11px ui-monospace, Menlo, monospace";
    g.textAlign = "left";
    g.fillText(labels[mode] ?? "…", cx - 16, 22);
  }
}
