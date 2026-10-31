// Sprite registry + sheet loader (milestone M3, issue #12).
//
// Each sprite is defined by a JSON entry in assets/sprites.json. Entries with
// a "sheet" path load a real PNG sprite sheet (drop a file + JSON entry);
// entries without one get an original procedurally-drawn placeholder
// (CC0-clean, offline-safe, PLAN.md section 11 Option A intent).
//
// Sheet layout: rows = poses (walk-down/up/left/right, sit, type, read,
// think, wait, error), columns = animation frames. Both real and placeholder
// sheets share this layout, so a single draw() path serves both.

const DEFAULT_POSE_ORDER = [
  "walk-down",
  "walk-up",
  "walk-left",
  "walk-right",
  "sit",
  "type",
  "read",
  "think",
  "wait",
  "error",
];

const DEFAULT_FRAMES = {
  "walk-down": 4,
  "walk-up": 4,
  "walk-left": 4,
  "walk-right": 4,
  sit: 1,
  type: 2,
  read: 2,
  think: 2,
  wait: 2,
  error: 2,
};

export function parseManifest(json) {
  const defaults = {
    frameW: json.frameW ?? 32,
    frameH: json.frameH ?? 40,
    fps: json.fps ?? 8,
  };
  const sprites = {};
  for (const [id, spec] of Object.entries(json.sprites ?? {})) {
    const frames = { ...DEFAULT_FRAMES, ...(spec.frames ?? {}) };
    const rows = spec.rows ?? DEFAULT_POSE_ORDER.reduce((o, r, i) => ({ ...o, [r]: i }), {});
    const frameW = spec.frameW ?? defaults.frameW;
    const frameH = spec.frameH ?? defaults.frameH;
    const rowCount = Math.max(...Object.values(rows)) + 1;
    const maxFrames = Math.max(...Object.values(frames));
    sprites[id] = {
      id,
      sheet: spec.sheet ?? null,
      palette: spec.palette ?? {},
      rows,
      frames,
      fps: spec.fps ?? defaults.fps,
      frameW,
      frameH,
      sheetW: maxFrames * frameW,
      sheetH: rowCount * frameH,
    };
  }
  return { default: json.default ?? Object.keys(sprites)[0] ?? null, sprites };
}

export async function loadSprites(url) {
  const json = await (await fetch(url)).json();
  return createRegistry(parseManifest(json));
}

export async function createRegistry(manifest) {
  const cache = new Map();
  await Promise.all(
    Object.values(manifest.sprites).map(async (spec) => {
      cache.set(spec.id, await makeSprite(spec));
    }),
  );
  return {
    get: (id) => cache.get(id) ?? cache.get(manifest.default) ?? null,
    has: (id) => cache.has(id),
    defaultId: manifest.default,
  };
}

function loadSheetImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function makeSprite(spec) {
  let sheet = null;
  let placeholder = true;
  if (spec.sheet) {
    try {
      sheet = await loadSheetImage(spec.sheet);
      placeholder = false;
    } catch {
      sheet = null;
    }
  }
  if (!sheet) sheet = buildPlaceholder(spec);
  return {
    id: spec.id,
    spec,
    sheet,
    placeholder,
    frameW: spec.frameW,
    frameH: spec.frameH,
    frames(pose) {
      return spec.frames[pose] ?? 1;
    },
    fps(_pose) {
      return spec.fps ?? 8;
    },
    row(pose) {
      return spec.rows[pose] ?? 0;
    },
    draw(g, pose, frame, x, y) {
      const fw = spec.frameW;
      const fh = spec.frameH;
      g.drawImage(sheet, (frame % this.frames(pose)) * fw, this.row(pose) * fh, fw, fh, x, y, fw, fh);
    },
  };
}

// ---------------------------------------------------------------------------
// Procedural placeholder sheets
// ---------------------------------------------------------------------------

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const PALETTE_DEFAULTS = {
  skin: "#f0c8a0",
  hair: "#4a3728",
  shirt: "#3a7bd5",
  pants: "#2f2f3a",
  shoes: "#1c1c22",
};

function buildPlaceholder(spec) {
  const sheet = document.createElement("canvas");
  sheet.width = spec.sheetW;
  sheet.height = spec.sheetH;
  const g = sheet.getContext("2d");
  g.imageSmoothingEnabled = false;
  const pal = { ...PALETTE_DEFAULTS, ...spec.palette };
  for (const pose of Object.keys(spec.rows)) {
    const row = spec.rows[pose];
    const n = spec.frames[pose] ?? 1;
    for (let f = 0; f < n; f++) {
      // pixel-office-opencode: cada cuadro va en SU columna. El original los
      // dibujaba todos en la columna 0 y los cuadros 1…3 quedaban vacíos: el
      // personaje desaparecía en cada cuadro impar (el "parpadeo").
      g.save();
      g.translate(f * spec.frameW, 0);
      drawPoseFrame(g, pal, pose, f, row * spec.frameH, spec.frameW, spec.frameH);
      g.restore();
    }
  }
  return sheet;
}

function drawPoseFrame(g, pal, pose, frame, top, fw, _fh) {
  const cx = fw / 2;
  if (pose === "walk-left" || pose === "walk-right") {
    if (pose === "walk-right") {
      g.save();
      g.translate(fw, 0);
      g.scale(-1, 1);
    }
    drawProfile(g, pal, frame, cx, top);
    if (pose === "walk-right") g.restore();
    return;
  }
  const bob = pose.startsWith("walk-") ? [0, 1, 0, 1][frame] : 0;
  if (pose === "walk-up") drawBack(g, pal, frame, cx, top + bob);
  else drawFront(g, pal, pose, frame, cx, top + bob);
}

function drawFront(g, pal, pose, frame, cx, y0) {
  const shift = pose === "sit" ? 4 : 0;
  const y = y0 + shift;
  // head
  g.fillStyle = pal.hair;
  g.fillRect(cx - 7, y + 2, 14, 4);
  g.fillRect(cx - 8, y + 4, 2, 5);
  g.fillRect(cx + 6, y + 4, 2, 5);
  g.fillStyle = pal.skin;
  g.fillRect(cx - 6, y + 6, 12, 8);
  g.fillStyle = "#22262e";
  g.fillRect(cx - 4, y + 9, 2, 2);
  g.fillRect(cx + 2, y + 9, 2, 2);
  // arms per pose
  if (pose === "type") {
    g.fillStyle = pal.shirt;
    g.fillRect(cx - 11, y + 10, 4, 10);
    g.fillRect(cx + 7, y + 10, 4, 10);
    g.fillStyle = pal.skin;
    g.fillRect(cx - 11, y + 8 - frame, 4, 3);
    g.fillRect(cx + 7, y + 8 - frame, 4, 3);
  } else if (pose === "read") {
    g.fillStyle = pal.shirt;
    g.fillRect(cx - 11, y + 14, 3, 8);
    g.fillRect(cx + 8, y + 14, 3, 8);
    g.fillStyle = "#ece3c9";
    g.fillRect(cx - 5 + frame, y + 12, 10, 6);
    g.fillStyle = "#c9bfa4";
    g.fillRect(cx - 5 + frame, y + 14, 10, 1);
  } else if (pose === "think") {
    g.fillStyle = pal.shirt;
    g.fillRect(cx - 11, y + 14, 3, 8);
    g.fillRect(cx + 4, y + 8, 3, 6);
    g.fillStyle = pal.skin;
    g.fillRect(cx - 1, y + 10, 3, 3);
  } else if (pose === "wait") {
    g.fillStyle = pal.shirt;
    g.fillRect(cx - 11, y + 14, 3, 8);
    g.fillRect(cx + 5, y + 6, 3, 12);
    g.fillStyle = pal.skin;
    g.fillRect(cx + 4, y + 3, 5, 3);
  } else if (pose === "error") {
    g.fillStyle = pal.shirt;
    g.fillRect(cx - 13, y + 6, 4, 12);
    g.fillRect(cx + 9, y + 6, 4, 12);
    g.fillStyle = pal.skin;
    g.fillRect(cx - 13, y + 3, 4, 3);
    g.fillRect(cx + 9, y + 3, 4, 3);
  } else {
    g.fillStyle = pal.shirt;
    g.fillRect(cx - 10, y + 14, 3, 9);
    g.fillRect(cx + 7, y + 14, 3, 9);
    g.fillStyle = pal.skin;
    g.fillRect(cx - 10, y + 22, 3, 2);
    g.fillRect(cx + 7, y + 22, 3, 2);
  }
  // torso
  g.fillStyle = pal.shirt;
  g.fillRect(cx - 7, y + 14, 14, 10);
  g.fillStyle = pal.pants;
  g.fillRect(cx - 6, y + 23, 12, 3);
  // legs
  if (pose === "sit") {
    g.fillStyle = pal.pants;
    g.fillRect(cx - 7, y + 25, 14, 4);
    g.fillRect(cx - 6, y + 29, 5, 6);
    g.fillRect(cx + 1, y + 29, 5, 6);
    g.fillStyle = pal.shoes;
    g.fillRect(cx - 7, y + 35, 6, 3);
    g.fillRect(cx + 1, y + 35, 6, 3);
  } else {
    const walking = pose.startsWith("walk-");
    const liftL = walking ? [0, -2, 0, 0][frame] : 0;
    const liftR = walking ? [0, 0, 0, -2][frame] : 0;
    g.fillStyle = pal.pants;
    g.fillRect(cx - 6, y + 26 + liftL, 5, 6);
    g.fillRect(cx + 1, y + 26 + liftR, 5, 6);
    g.fillStyle = pal.shoes;
    g.fillRect(cx - 6, y + 32 + liftL, 5, 3);
    g.fillRect(cx + 1, y + 32 + liftR, 5, 3);
  }
}

function drawBack(g, pal, frame, cx, y0) {
  const liftL = [0, -2, 0, 0][frame];
  const liftR = [0, 0, 0, -2][frame];
  g.fillStyle = pal.hair;
  g.fillRect(cx - 7, y0 + 2, 14, 11);
  g.fillStyle = shade(pal.shirt, -18);
  g.fillRect(cx - 7, y0 + 14, 14, 10);
  g.fillRect(cx - 10, y0 + 14, 3, 9);
  g.fillRect(cx + 7, y0 + 14, 3, 9);
  g.fillStyle = pal.pants;
  g.fillRect(cx - 6, y0 + 23, 12, 3);
  g.fillRect(cx - 6, y0 + 26 + liftL, 5, 6);
  g.fillRect(cx + 1, y0 + 26 + liftR, 5, 6);
  g.fillStyle = pal.shoes;
  g.fillRect(cx - 6, y0 + 32 + liftL, 5, 3);
  g.fillRect(cx + 1, y0 + 32 + liftR, 5, 3);
}

function drawProfile(g, pal, frame, cx, y0) {
  const scissor = [0, -2, 0, -2][frame];
  g.fillStyle = pal.hair;
  g.fillRect(cx - 4, y0 + 2, 11, 4);
  g.fillRect(cx + 2, y0 + 4, 4, 9);
  g.fillStyle = pal.skin;
  g.fillRect(cx - 4, y0 + 6, 9, 8);
  g.fillStyle = "#22262e";
  g.fillRect(cx - 3, y0 + 9, 2, 2);
  g.fillStyle = pal.shirt;
  g.fillRect(cx - 9, y0 + 13, 4, 10);
  g.fillStyle = pal.skin;
  g.fillRect(cx - 9, y0 + 22, 4, 2);
  g.fillStyle = shade(pal.shirt, -15);
  g.fillRect(cx + 1, y0 + 13, 3, 8);
  g.fillStyle = pal.shirt;
  g.fillRect(cx - 4, y0 + 14, 11, 10);
  g.fillStyle = pal.pants;
  g.fillRect(cx - 3, y0 + 24, 9, 3);
  g.fillRect(cx - 3, y0 + 26 + scissor, 4, 6);
  g.fillRect(cx + 2, y0 + 26 - scissor, 4, 6);
  g.fillStyle = pal.shoes;
  g.fillRect(cx - 3, y0 + 32 + scissor, 4, 3);
  g.fillRect(cx + 2, y0 + 32 - scissor, 4, 3);
}
