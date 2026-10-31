// Speech bubbles drawn above characters.

function roundRectPath(g, x, y, w, h, r) {
  g.beginPath();
  if (typeof g.roundRect === "function") {
    g.roundRect(x, y, w, h, r);
    return;
  }
  g.rect(x, y, w, h);
}

export function drawSpeechBubble(g, x, y, text, { maxW = 120, fontSize = 11 } = {}) {
  g.font = `${fontSize}px ui-monospace, Menlo, monospace`;
  g.textAlign = "left";
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (cur && g.measureText(test).width > maxW) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  const lh = fontSize + 5;
  const widths = lines.map((l) => g.measureText(l).width);
  const w = Math.min(maxW, Math.max(...widths) + 16);
  const h = lines.length * lh + 10;
  const bx = Math.round(x - w / 2);
  const by = Math.round(y - h - 8);
  g.fillStyle = "rgba(250,250,245,0.95)";
  g.strokeStyle = "#2b2f38";
  g.lineWidth = 2;
  roundRectPath(g, bx, by, w, h, 5);
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(x - 5, by + h);
  g.lineTo(x + 5, by + h);
  g.lineTo(x, by + h + 6);
  g.closePath();
  g.fill();
  g.fillStyle = "#22262e";
  g.textAlign = "center";
  lines.forEach((l, i) => g.fillText(l, x, by + 13 + i * lh));
}

export function drawIconBubble(g, x, y, icon, state) {
  const colors = {
    idle: "#8fb3ff",
    writing: "#35d07f",
    researching: "#6a9fe8",
    thinking: "#8fb3ff",
    waiting: "#ffb454",
    error: "#ff6b6b",
  };
  const r = 11;
  const by = y - r * 2 - 4;
  g.fillStyle = colors[state] ?? "#cfd6e4";
  g.beginPath();
  g.arc(x, by + r, r, 0, Math.PI * 2);
  g.fill();
  g.font = "13px ui-monospace, Menlo, monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(icon, x, by + r + 1);
  g.textBaseline = "alphabetic";
}
