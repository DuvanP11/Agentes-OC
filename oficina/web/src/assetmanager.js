// Asset manager sidebar (milestone M5, issue #21).
//
// Password-protected panel that swaps the scene layout and sprite manifest
// at runtime — no redeploy, no backend involvement. Swapped assets are
// validated against the same shapes Scene/loadSprites expect, then persisted
// in localStorage so the override survives reloads.
//
// The password gate is a light admin lock, not real security: the hash is
// stored client-side, so anyone with browser access can read the panel. Use
// it to keep casual visitors out, and pair with the server-side reverse
// proxy auth for anything sensitive (PLAN.md section 10).

export const STORAGE_KEYS = {
  scene: "office.asset.scene",
  sprites: "office.asset.sprites",
  password: "office.asset.password",
};

export const DEFAULT_PASSWORD = "office";

// ---------------------------------------------------------------------------
// Pure logic (unit-tested in frontend/test/assetmanager.test.js)
// ---------------------------------------------------------------------------

export function validateSceneJson(json) {
  const errors = [];
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return { ok: false, errors: ["scene must be a JSON object"] };
  }
  const size = json.size;
  if (!Array.isArray(size) || size.length !== 2 || !size.every((n) => Number.isFinite(n) && n > 0)) {
    errors.push("size must be [width, height] of positive numbers");
  }
  if (!Array.isArray(json.zones) || json.zones.length === 0) {
    errors.push("zones must be a non-empty array");
  } else {
    const bad = json.zones.filter(
      (z) =>
        !z ||
        typeof z.id !== "string" ||
        !z.id ||
        !Number.isFinite(z.x) ||
        !Number.isFinite(z.y) ||
        !Number.isFinite(z.w) ||
        !Number.isFinite(z.h),
    );
    if (bad.length) errors.push(`zones[${json.zones.indexOf(bad[0])}] must have id/x/y/w/h numbers`);
  }
  if (json.furniture !== undefined && !Array.isArray(json.furniture)) {
    errors.push("furniture must be an array");
  }
  return { ok: errors.length === 0, errors };
}

export function validateSpritesJson(json) {
  const errors = [];
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return { ok: false, errors: ["sprites manifest must be a JSON object"] };
  }
  const sprites = json.sprites;
  if (!sprites || typeof sprites !== "object" || Object.keys(sprites).length === 0) {
    errors.push("sprites must be a non-empty object of sprite id -> spec");
  } else {
    for (const [id, spec] of Object.entries(sprites)) {
      if (!spec || typeof spec !== "object") {
        errors.push(`sprite "${id}" spec must be an object`);
        continue;
      }
      if (spec.frames && typeof spec.frames === "object") {
        for (const [pose, n] of Object.entries(spec.frames)) {
          if (!Number.isInteger(n) || n < 1) {
            errors.push(`sprite "${id}" frames.${pose} must be a positive integer`);
          }
        }
      }
      if (spec.frameW !== undefined && (!Number.isFinite(spec.frameW) || spec.frameW < 1)) {
        errors.push(`sprite "${id}" frameW must be a positive number`);
      }
      if (spec.frameH !== undefined && (!Number.isFinite(spec.frameH) || spec.frameH < 1)) {
        errors.push(`sprite "${id}" frameH must be a positive number`);
      }
    }
  }
  if (json.default !== undefined && !(json.default in (sprites ?? {}))) {
    errors.push(`default sprite "${json.default}" is not in sprites`);
  }
  return { ok: errors.length === 0, errors };
}

export async function hashPassword(pw) {
  const subtle = globalThis.crypto?.subtle ?? (await import("node:crypto")).webcrypto.subtle;
  const data = new TextEncoder().encode(String(pw));
  const digest = await subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function checkPassword(input, storedHash) {
  if (!storedHash) return input === DEFAULT_PASSWORD;
  return (await hashPassword(input)) === storedHash;
}

export function loadOverride(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || typeof entry.json !== "string") return null;
    entry.data = JSON.parse(entry.json);
    return entry;
  } catch {
    return null;
  }
}

export function saveOverride(storage, key, data, name) {
  const entry = {
    name: name ?? "custom",
    json: JSON.stringify(data),
    savedAt: new Date().toISOString(),
  };
  storage.setItem(key, JSON.stringify(entry));
  return entry;
}

export function clearOverride(storage, key) {
  storage.removeItem(key);
}

export function defaultStorage() {
  return globalThis.localStorage ?? null;
}

// Focus-trap helper (pure): returns the wrapped index for a list of focusable
// elements so Tab/Shift+Tab cycles within the open dialog instead of leaking
// into the page behind it.
export function wrapIndex(length, index, delta) {
  if (length <= 0) return -1;
  return ((index + delta) % length + length) % length;
}

// ---------------------------------------------------------------------------
// DOM sidebar
// ---------------------------------------------------------------------------

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function getFocusables(container) {
  return [...container.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
}

const STYLE = `
  .asset-manager-btn {
    position: fixed;
    right: 14px;
    bottom: 14px;
    z-index: 90;
    font: inherit;
    font-size: 13px;
    padding: 8px 12px;
    background: #1d2330;
    color: #cfd6e4;
    border: 1px solid #333c4d;
    border-radius: 4px;
    cursor: pointer;
  }
  .asset-manager-btn:hover { background: #283045; }
  .asset-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 320px;
    max-width: 90vw;
    z-index: 95;
    background: #141824;
    border-left: 2px solid #2b3345;
    box-shadow: -8px 0 24px rgba(0,0,0,0.45);
    padding: 14px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-sizing: border-box;
    font-family: ui-monospace, Menlo, monospace;
    color: #e7e9ee;
  }
  .asset-panel h2 {
    margin: 0;
    font-size: 14px;
    letter-spacing: 1px;
  }
  .asset-panel h3 {
    margin: 0 0 6px;
    font-size: 12px;
    color: #8fb3ff;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .asset-panel .meta { font-size: 11px; color: #7c8496; margin: 0 0 6px; }
  .asset-panel input[type="password"], .asset-panel input[type="text"] {
    font: inherit;
    font-size: 12px;
    width: 100%;
    box-sizing: border-box;
    padding: 6px 8px;
    background: #0e1016;
    color: #e7e9ee;
    border: 1px solid #333c4d;
    border-radius: 4px;
  }
  .asset-panel input[type="file"] {
    font: inherit;
    font-size: 11px;
    color: #7c8496;
  }
  .asset-panel button {
    font: inherit;
    font-size: 12px;
    padding: 6px 10px;
    background: #1d2330;
    color: #cfd6e4;
    border: 1px solid #333c4d;
    border-radius: 4px;
    cursor: pointer;
  }
  .asset-panel button:hover { background: #283045; }
  .asset-panel button.primary { background: #1d4f2e; border-color: #2c7a45; color: #bff0cf; }
  .asset-panel button.primary:hover { background: #26663d; }
  .asset-panel button.danger { background: #4a2020; border-color: #7a2c2c; color: #f0bfbf; }
  .asset-panel button.danger:hover { background: #633030; }
  .asset-panel .row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .asset-panel .error {
    font-size: 11px;
    color: #ff8a8a;
    background: #2a1616;
    border: 1px solid #5a2626;
    border-radius: 4px;
    padding: 6px 8px;
    white-space: pre-wrap;
  }
  .asset-panel .ok {
    font-size: 11px;
    color: #9ce8b0;
    background: #14261a;
    border: 1px solid #2c4a35;
    border-radius: 4px;
    padding: 6px 8px;
  }
  .asset-panel .section {
    border-top: 1px solid #2b3345;
    padding-top: 10px;
  }
  .asset-panel .unlock { display: flex; flex-direction: column; gap: 8px; }
  .asset-panel .close {
    position: absolute;
    top: 10px;
    right: 12px;
    font-size: 16px;
    background: none;
    border: none;
    color: #7c8496;
    cursor: pointer;
    padding: 0 4px;
  }
  .asset-panel .close:hover { color: #e7e9ee; }
  .asset-manager-btn:focus-visible,
  .asset-panel button:focus-visible,
  .asset-panel input:focus-visible,
  .asset-panel select:focus-visible,
  .asset-panel textarea:focus-visible,
  .asset-panel a:focus-visible,
  .asset-panel [tabindex]:focus-visible {
    outline: 2px solid #6a9fe8;
    outline-offset: 2px;
  }
`;

export class AssetManager {
  constructor({ scene, registry, builtins, storage, onChange }) {
    this.scene = scene;
    this.registry = registry;
    this.builtins = builtins ?? {};
    this.storage = storage ?? defaultStorage();
    this.onChange = onChange ?? {};
    this.unlocked = false;
    this.element = null;
    this.btn = null;
  }

  mount() {
    if (!this.storage) return;
    this.btn = document.createElement("button");
    this.btn.className = "asset-manager-btn";
    this.btn.textContent = "◧ Assets";
    this.btn.addEventListener("click", () => this.toggle());
    document.body.appendChild(this.btn);

    this.element = document.createElement("div");
    this.element.className = "asset-panel";
    this.element.style.display = "none";
    this.element.setAttribute("role", "dialog");
    this.element.setAttribute("aria-modal", "true");
    this.element.setAttribute("aria-label", "Asset manager");
    this.element.addEventListener("keydown", (e) => this.onKeydown(e));
    this.element.innerHTML = `<style>${STYLE}</style><div id="asset-content"></div>`;
    document.body.appendChild(this.element);
    this.render();
  }

  toggle() {
    if (this.element.style.display !== "none") {
      this.close();
      return;
    }
    if (!this.unlocked) {
      this.renderUnlock();
    } else {
      this.renderPanel();
    }
    this.element.style.display = "flex";
    this.focusFirst();
  }

  close() {
    this.element.style.display = "none";
    this.btn?.focus();
  }

  focusFirst() {
    const focusables = getFocusables(this.element);
    focusables[0]?.focus();
  }

  // Focus trap: Tab/Shift+Tab cycle within the dialog, Escape closes it and
  // returns focus to the launcher button.
  onKeydown(e) {
    if (e.key === "Escape") {
      this.close();
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = getFocusables(this.element);
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }
    const current = focusables.indexOf(document.activeElement);
    const next = wrapIndex(focusables.length, current, e.shiftKey ? -1 : 1);
    e.preventDefault();
    focusables[next].focus();
  }

  render() {
    if (!this.unlocked) {
      this.renderUnlock();
    } else {
      this.renderPanel();
    }
  }

  renderUnlock() {
    const content = this.element.querySelector("#asset-content");
    const hasPassword = Boolean(this.storage.getItem(STORAGE_KEYS.password));
    content.innerHTML = `
      <button class="close" data-act="close" aria-label="Close asset manager" title="close">✕</button>
      <h2>Asset manager</h2>
      <div class="unlock">
        <p class="meta">${hasPassword ? "Enter the admin password" : "No password set — create one (default: ${DEFAULT_PASSWORD})"}</p>
        <input type="password" id="asset-pw" placeholder="password" aria-label="Admin password" />
        <button class="primary" data-act="unlock">${hasPassword ? "Unlock" : "Set password"}</button>
        <div id="asset-msg" aria-live="polite"></div>
      </div>`;
    content.querySelector('[data-act="unlock"]').addEventListener("click", async () => {
      const pw = content.querySelector("#asset-pw").value;
      const stored = this.storage.getItem(STORAGE_KEYS.password);
      if (stored) {
        if (await checkPassword(pw, stored)) {
          this.unlocked = true;
          this.renderPanel();
          this.focusFirst();
        } else {
          content.querySelector("#asset-msg").innerHTML = '<p class="error">Wrong password</p>';
          content.querySelector("#asset-pw").select();
        }
      } else {
        this.storage.setItem(STORAGE_KEYS.password, await hashPassword(pw || DEFAULT_PASSWORD));
        this.unlocked = true;
        this.renderPanel();
        this.focusFirst();
      }
    });
    content.querySelector('[data-act="close"]').addEventListener("click", () => this.close());
  }

  renderPanel() {
    const content = this.element.querySelector("#asset-content");
    content.innerHTML = `
      <button class="close" data-act="close" aria-label="Close asset manager" title="close">✕</button>
      <h2>Asset manager</h2>
      <div class="row">
        <span class="meta">admin</span>
        <button data-act="pw">change password</button>
      </div>
      <div id="asset-pw-form" style="display:none">
        <input type="password" id="asset-newpw" placeholder="new password" aria-label="New admin password" />
        <div class="row">
          <button class="primary" data-act="pw-save">save</button>
          <button data-act="pw-cancel">cancel</button>
        </div>
        <div id="asset-pw-msg" aria-live="polite"></div>
      </div>
      <div class="section">
        <h3>Scene layout</h3>
        <div id="asset-scene-info" class="meta"></div>
        <input type="file" id="asset-scene-file" accept="application/json,.json" aria-label="Choose scene layout JSON file" />
        <div class="row">
          <button class="primary" data-act="scene-apply" aria-label="Apply uploaded scene layout">apply file</button>
          <button class="danger" data-act="scene-reset" aria-label="Reset scene to built-in">reset</button>
        </div>
        <div id="asset-scene-msg" aria-live="polite"></div>
      </div>
      <div class="section">
        <h3>Sprites manifest</h3>
        <div id="asset-sprites-info" class="meta"></div>
        <input type="file" id="asset-sprites-file" accept="application/json,.json" aria-label="Choose sprites manifest JSON file" />
        <div class="row">
          <button class="primary" data-act="sprites-apply" aria-label="Apply uploaded sprites manifest">apply file</button>
          <button class="danger" data-act="sprites-reset" aria-label="Reset sprites to built-in">reset</button>
        </div>
        <div id="asset-sprites-msg" aria-live="polite"></div>
      </div>`;
    this.refreshInfo();

    let pendingScene = null;
    let pendingSprites = null;

    content.querySelector('[data-act="close"]').addEventListener("click", () => this.close());

    const togglePwForm = (show) => {
      content.querySelector("#asset-pw-form").style.display = show ? "flex" : "none";
      content.querySelector("#asset-pw-form").style.flexDirection = "column";
      content.querySelector("#asset-pw-form").style.gap = "8px";
      content.querySelector("#asset-pw-msg").innerHTML = "";
    };
    content.querySelector('[data-act="pw"]').addEventListener("click", () => togglePwForm(true));
    content.querySelector('[data-act="pw-cancel"]').addEventListener("click", () => togglePwForm(false));
    content.querySelector('[data-act="pw-save"]').addEventListener("click", async () => {
      const pw = content.querySelector("#asset-newpw").value;
      if (!pw) return;
      this.storage.setItem(STORAGE_KEYS.password, await hashPassword(pw));
      content.querySelector("#asset-pw-msg").innerHTML = '<p class="ok">Password updated</p>';
      content.querySelector("#asset-newpw").value = "";
      togglePwForm(false);
    });

    const readFile = (input) =>
      new Promise((resolve, reject) => {
        const file = input.files?.[0];
        if (!file) return reject(new Error("choose a file first"));
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("could not read file"));
        reader.readAsText(file);
      });

    content.querySelector("#asset-scene-file").addEventListener("change", async () => {
      try {
        pendingScene = JSON.parse(await readFile(content.querySelector("#asset-scene-file")));
        const v = validateSceneJson(pendingScene);
        content.querySelector("#asset-scene-msg").innerHTML = v.ok
          ? '<p class="ok">Scene JSON looks valid — ready to apply</p>'
          : `<p class="error">${v.errors.join("\n")}</p>`;
      } catch (e) {
        content.querySelector("#asset-scene-msg").innerHTML = `<p class="error">${e.message}</p>`;
      }
    });

    content.querySelector('[data-act="scene-apply"]').addEventListener("click", () => {
      if (!pendingScene) return;
      const v = validateSceneJson(pendingScene);
      if (!v.ok) {
        content.querySelector("#asset-scene-msg").innerHTML = `<p class="error">${v.errors.join("\n")}</p>`;
        return;
      }
      saveOverride(this.storage, STORAGE_KEYS.scene, pendingScene, pendingScene.name ?? "custom");
      this.applyScene(pendingScene);
      this.refreshInfo();
      content.querySelector("#asset-scene-msg").innerHTML = '<p class="ok">Scene swapped — persisted for future visits</p>';
      pendingScene = null;
    });

    content.querySelector('[data-act="scene-reset"]').addEventListener("click", () => {
      clearOverride(this.storage, STORAGE_KEYS.scene);
      pendingScene = null;
      content.querySelector("#asset-scene-file").value = "";
      this.applyScene(this.builtins.scene);
      this.refreshInfo();
      content.querySelector("#asset-scene-msg").innerHTML = '<p class="ok">Reset to built-in scene</p>';
    });

    content.querySelector("#asset-sprites-file").addEventListener("change", async () => {
      try {
        pendingSprites = JSON.parse(await readFile(content.querySelector("#asset-sprites-file")));
        const v = validateSpritesJson(pendingSprites);
        content.querySelector("#asset-sprites-msg").innerHTML = v.ok
          ? '<p class="ok">Sprite manifest looks valid — ready to apply</p>'
          : `<p class="error">${v.errors.join("\n")}</p>`;
      } catch (e) {
        content.querySelector("#asset-sprites-msg").innerHTML = `<p class="error">${e.message}</p>`;
      }
    });

    content.querySelector('[data-act="sprites-apply"]').addEventListener("click", async () => {
      if (!pendingSprites) return;
      const v = validateSpritesJson(pendingSprites);
      if (!v.ok) {
        content.querySelector("#asset-sprites-msg").innerHTML = `<p class="error">${v.errors.join("\n")}</p>`;
        return;
      }
      saveOverride(this.storage, STORAGE_KEYS.sprites, pendingSprites, pendingSprites.name ?? "custom");
      try {
        await this.applySprites(pendingSprites);
        this.refreshInfo();
        content.querySelector("#asset-sprites-msg").innerHTML = '<p class="ok">Sprites swapped — persisted for future visits</p>';
      } catch (e) {
        content.querySelector("#asset-sprites-msg").innerHTML = `<p class="error">${e.message}</p>`;
      }
      pendingSprites = null;
    });

    content.querySelector('[data-act="sprites-reset"]').addEventListener("click", async () => {
      clearOverride(this.storage, STORAGE_KEYS.sprites);
      pendingSprites = null;
      content.querySelector("#asset-sprites-file").value = "";
      await this.applySprites(this.builtins.sprites);
      this.refreshInfo();
      content.querySelector("#asset-sprites-msg").innerHTML = '<p class="ok">Reset to built-in sprites</p>';
    });
  }

  refreshInfo() {
    if (!this.element) return;
    const sceneEntry = loadOverride(this.storage, STORAGE_KEYS.scene);
    const spritesEntry = loadOverride(this.storage, STORAGE_KEYS.sprites);
    const sceneInfo = this.element.querySelector("#asset-scene-info");
    const spritesInfo = this.element.querySelector("#asset-sprites-info");
    if (sceneInfo) {
      sceneInfo.textContent = sceneEntry
        ? `override: ${sceneEntry.name} (${new Date(sceneEntry.savedAt).toLocaleString()})`
        : "built-in assets/scene.json";
    }
    if (spritesInfo) {
      spritesInfo.textContent = spritesEntry
        ? `override: ${spritesEntry.name} (${new Date(spritesEntry.savedAt).toLocaleString()})`
        : "built-in assets/sprites.json";
    }
  }

  applyScene(layout) {
    this.scene.layout = layout;
    const [w, h] = layout.size;
    this.scene.canvas.width = w;
    this.scene.canvas.height = h;
    this.onChange?.scene?.(layout);
  }

  async applySprites(manifestJson) {
    const { createRegistry, parseManifest } = await import("./sprites.js");
    const next = await createRegistry(parseManifest(manifestJson));
    this.registry = next;
    this.onChange?.sprites?.(next);
  }
}