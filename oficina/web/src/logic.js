// Pure logic — no DOM access, unit-testable in vitest.

export const WALK_SPEED = 120; // px/s
export const TWEEN_EPS = 2; // px, arrival tolerance
export const DETAIL_MAX = 80; // speech bubble char cap

export function hashId(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function zoneById(layout, id) {
  return (layout.zones ?? []).find((z) => z.id === id) ?? null;
}

export function zoneForState(layout, state) {
  return (layout.stateZone ?? {})[state] ?? null;
}

// Deterministic fan-out offsets for zones that only declare a single spot
// (P1-2): several agents sharing a zone stay legible instead of stacking
// perfectly. Offsets stay inside the zone bounds around the declared spot.
export function spreadOffsets(zone) {
  const ox = Math.min(26, Math.max(8, zone.w / 4));
  const oy = Math.min(18, Math.max(6, zone.h / 6));
  return [
    [0, 0],
    [-ox, 0],
    [ox, 0],
    [0, -oy],
    [0, oy],
    [-ox, oy],
    [ox, -oy],
  ];
}

// pixel-office-opencode: cada agente ocupa un puesto LIBRE de la zona en vez
// de caer donde diga el hash (antes dos o más se apilaban en el mismo sitio).
// El escritorio es suyo mientras esté en la oficina: al volver del sofá o de
// la puerta se sienta en la misma silla. Si la zona se llena, se reparte
// alrededor de los puestos con los desplazamientos de siempre.
const seats = new Map(); // zoneId -> Map(spotIndex -> agentId)
const KEEP_SEAT = new Set(["desk"]);

export function releaseAgent(agentId, exceptZone = null) {
  for (const [zoneId, taken] of seats) {
    if (zoneId === exceptZone || (exceptZone !== null && KEEP_SEAT.has(zoneId))) continue;
    for (const [i, a] of taken) if (a === agentId) taken.delete(i);
  }
}

// ¿queda un puesto libre (o ya es suyo) en la zona?
export function hasFreeSpot(layout, zoneId, agentId) {
  const spots = zoneById(layout, zoneId)?.spots ?? [];
  const taken = seats.get(zoneId);
  if (!taken) return spots.length > 0;
  return spots.some((_, i) => !taken.has(i) || taken.get(i) === agentId);
}

// prefer: índice del puesto propio (escritorio con su nombre). Los agentes sin
// puesto propio usan primero los puestos desde zone.reserved en adelante.
export function pickSpot(layout, zoneId, agentId, prefer) {
  const zone = zoneById(layout, zoneId);
  if (!zone) return null;
  const spots = zone.spots ?? [];
  if (spots.length === 0) {
    return { x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 };
  }
  const id = hashId(agentId ?? "");
  releaseAgent(agentId, zoneId);
  if (!seats.has(zoneId)) seats.set(zoneId, new Map());
  const taken = seats.get(zoneId);
  for (const [i, a] of taken) {
    if (a === agentId && spots[i]) return { x: spots[i][0], y: spots[i][1] };
  }
  if (prefer != null && spots[prefer] && (!taken.has(prefer) || taken.get(prefer) === agentId)) {
    taken.set(prefer, agentId);
    return { x: spots[prefer][0], y: spots[prefer][1] };
  }
  const first = prefer == null ? Math.min(zone.reserved ?? 0, spots.length - 1) : 0;
  for (let k = 0; k < spots.length; k++) {
    const i = (first + k) % spots.length; // en orden: primero los libres sin dueño
    if (!taken.has(i)) {
      taken.set(i, agentId);
      return { x: spots[i][0], y: spots[i][1] };
    }
  }
  const [sx, sy] = spots[id % spots.length];
  const offs = spreadOffsets(zone);
  const [ox, oy] = offs[1 + ((id >>> 3) % (offs.length - 1))];
  return { x: sx + ox, y: sy + oy };
}

export function stepToward(pos, target, speed, dt) {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= TWEEN_EPS) return { x: target.x, y: target.y, arrived: true, dir: null };
  const step = Math.min(speed * dt, dist);
  const nx = (dx / dist) * step;
  const ny = (dy / dist) * step;
  const dir = Math.abs(nx) >= Math.abs(ny) ? (nx >= 0 ? "right" : "left") : ny >= 0 ? "down" : "up";
  return { x: pos.x + nx, y: pos.y + ny, arrived: false, dir };
}

export function clampText(text, max = DETAIL_MAX) {
  const s = String(text ?? "").trim();
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}
