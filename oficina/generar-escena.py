#!/usr/bin/env python3
"""Genera runtime/frontend/dist/assets/scene.json (oficina pixel de OpenCode).

Arriba: recepción (puerta, espera, biblioteca, agua, servidor) y una planta de
FILAS x COLS escritorios. Los primeros escritorios son de los agentes de
nombres.json (en ese orden: la placa con el nombre la pone main.js); los
sobrantes son libres. Abajo: sala de juegos, cocina y descanso con muro y
puerta. Uso: python3 generar-escena.py
"""
import json, pathlib

FILAS, COLS = 8, 8
W = 960
DESK_W, PITCH_X, PITCH_Y, ROW0 = 92, 117, 100, 285
OUT = pathlib.Path(__file__).parent / "web/assets/scene.json"

F = []
def add(t, x, y, w, h, **k): F.append(dict(type=t, x=x, y=y, w=w, h=h, **k))

# ---- planta de trabajo
desk_spots = []
for r in range(FILAS):
    D = ROW0 + r * PITCH_Y
    for c in range(COLS):
        cx = 70 + c * PITCH_X
        add("monitor", cx - 32, D - 30, 64, 30)
        add("desk", cx - DESK_W // 2, D, DESK_W, 34)
        add("chair", cx - 14, D + 40, 28, 30)
        desk_spots.append([cx, D + 62])
work_bottom = ROW0 + (FILAS - 1) * PITCH_Y + 80

# ---- salas de abajo (desplazadas según el tamaño de la planta)
WALL_Y = work_bottom + 20
LY = WALL_Y + 18            # suelo de las salas
H_ROOMS = 322
H = LY + H_ROOMS
dy = LY - 558               # las coordenadas de abajo se diseñaron con LY=558
def A(t, x, y, w, h, **k): add(t, x, y + dy, w, h, **k)

pre = F; F = []
A("floor", 0, 558, 316, 322, color="#3b3355", color2="#4a4068", pattern="carpet")
A("floor", 324, 558, 312, 322, color="#cfc8b8", color2="#bdb6a5", pattern="tile", tile=26)
A("floor", 644, 558, 316, 322, color="#4a3a2a", color2="#3f3123", pattern="wood")
for x0, x1 in [(0, 140), (180, 460), (500, 780), (820, 960)]: add("wall", x0, WALL_Y, x1 - x0, 18)
add("wall", 316, WALL_Y, 8, H - WALL_Y); add("wall", 636, WALL_Y, 8, H - WALL_Y)
floors = F; F = []

# ---- recepción y pared
add("window", 360, 40, 300, 70); add("clock", 720, 36, 46, 46); add("poster", 160, 50, 80, 64)
add("door", 50, 62, 70, 90)
add("bookshelf", 300, 165, 130, 56); add("cooler", 450, 168, 30, 56)
add("plant", 520, 160, 40, 70)
add("server", 838, 160, 104, 62)
F += pre
# sala de juegos
A("arcade", 30, 590, 44, 76, color="#c0392b"); A("arcade", 84, 590, 44, 76, color="#2e6fd0"); A("arcade", 250, 590, 44, 76, color="#8e44ad")
A("pingpong", 130, 700, 130, 62)
A("beanbag", 24, 800, 46, 34, color="#e2555a"); A("beanbag", 250, 812, 46, 34, color="#ffd166")
# cocina
A("counter", 340, 596, 210, 40); A("coffee", 420, 570, 28, 30); A("vending", 500, 566, 40, 30)
A("fridge", 574, 566, 46, 90)
A("table", 420, 750, 130, 48)
for sx, sy in [(392, 768), (556, 768)]: A("stool", sx, sy, 22, 28)
A("plant", 590, 810, 40, 70)
# descanso
A("rug", 664, 630, 276, 200); A("sofa", 690, 650, 200, 56)
A("tv", 735, 800, 130, 60)
A("beanbag", 676, 770, 46, 34, color="#6a9fe8"); A("beanbag", 882, 770, 46, 34, color="#35d07f")
A("bookshelf", 880, 566, 64, 56)
for x, t in [(14, "SALA DE JUEGOS"), (338, "COCINA"), (658, "DESCANSO")]: A("sign", x, 578, 0, 0, text=t)

def Z(i, x, y, w, h, spots, lower=False):
    o = dy if lower else 0
    return dict(id=i, x=x, y=y + o, w=w, h=h, spots=[[a, b + o] for a, b in spots])

scene = {
    "size": [W, H],
    "stateZone": {"idle": "descanso", "writing": "desk", "researching": "desk", "executing": "desk",
                  "thinking": "desk", "waiting": "door", "error": "server"},
    "routing": {"lowerY": WALL_Y + 16, "inY": LY + 42, "outY": WALL_Y - 16,
                "rooms": [{"x0": 0, "x1": 316, "door": 160}, {"x0": 324, "x1": 636, "door": 480},
                          {"x0": 644, "x1": 960, "door": 800}]},
    "zones": [
        Z("desk", 20, ROW0 - 40, 920, work_bottom - ROW0 + 40, desk_spots),
        Z("door", 20, 160, 260, 100, [[85, 205], [140, 205], [195, 205], [250, 205], [110, 245], [170, 245], [230, 245]]),
        Z("server", 700, 160, 250, 100, [[870, 252], [920, 252], [820, 252], [770, 252], [720, 252]]),
        Z("biblioteca", 300, 200, 130, 50, [[320, 250], [365, 250], [410, 250]]),
        Z("agua", 440, 200, 50, 50, [[465, 250]]),
        Z("arcade", 20, 580, 290, 110, [[52, 700], [106, 700], [272, 700]], True),
        Z("pingpong", 110, 690, 180, 90, [[118, 745], [272, 745]], True),
        Z("puff", 20, 790, 290, 80, [[47, 836], [273, 850]], True),
        Z("cafe", 330, 600, 290, 90, [[380, 676], [440, 676], [500, 676]], True),
        Z("nevera", 560, 660, 70, 50, [[597, 690]], True),
        Z("mesa", 380, 740, 200, 110, [[403, 800], [567, 800], [460, 840], [515, 840]], True),
        Z("descanso", 660, 620, 280, 120, [[735, 690], [790, 690], [845, 690]], True),
        Z("tv", 660, 740, 280, 80, [[760, 772], [840, 772], [699, 806], [905, 806]], True),
    ],
    "furniture": floors + F,
}
OUT.write_text(json.dumps(scene, ensure_ascii=False, indent=1))
print(f"{len(desk_spots)} escritorios, escena {W}x{H}")
