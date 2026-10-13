/* ============================================================
   Agentes-OC · Lógica de la interfaz
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initStats();
  initNav();
  initAgents();
  initScript();
  initSkills();
  initSecurity();
  initPlugins();
  initResources();
  initTabs();
});

/* ---------- Stats ---------- */
function initStats() {
  // Calcular desde los datos reales para que nunca se desincronicen
  const s = {
    primaryAgents: PRIMARY_AGENTS.length,
    subagents: SUBAGENTS.length,
    skills: SKILLS.length,
    plugins: PLUGINS.length,
    mcpServers: MCP_SERVERS.length,
    securityLayers: SECURITY.layers.length
  };
  setText("statPrimary", s.primaryAgents);
  setText("statSub", s.subagents);
  setText("statSkills", s.skills);
  setText("statPlugins", s.plugins);
  setText("statMCP", s.mcpServers);
  setText("statSec", s.securityLayers);
  setText("ocVersion", INVENTORY.opencodeVersion);
  setText("footerVersion", INVENTORY.opencodeVersion);
  setText("footerDate", INVENTORY.generatedAt);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ---------- Nav móvil ---------- */
function initNav() {
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  if (!toggle || !links) return;
  toggle.addEventListener("click", () => links.classList.toggle("open"));
  links.querySelectorAll("a").forEach(a => a.addEventListener("click", () => links.classList.remove("open")));
}

/* ---------- Agentes ---------- */
let agentCategory = "Todos";

function initAgents() {
  const cats = ["Todos", ...new Set(SUBAGENTS.map(a => a.category))];
  const chips = document.getElementById("agentChips");
  chips.innerHTML = cats.map(c =>
    `<button class="chip ${c === "Todos" ? "active" : ""}" data-cat="${c}">${c}</button>`
  ).join("");

  chips.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      agentCategory = chip.dataset.cat;
      chips.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c === chip));
      renderAgents();
    });
  });

  const search = document.getElementById("agentSearch");
  search.addEventListener("input", renderAgents);

  renderAgents();
}

function renderAgents() {
  const q = (document.getElementById("agentSearch").value || "").toLowerCase().trim();
  const grid = document.getElementById("agentGrid");

  const filtered = SUBAGENTS.filter(a => {
    const matchCat = agentCategory === "Todos" || a.category === agentCategory;
    const matchQ = !q || a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.when.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  if (!filtered.length) {
    grid.innerHTML = `<p class="empty">Sin resultados para “${q}”. Prueba otra búsqueda.</p>`;
    return;
  }

  grid.innerHTML = filtered.map(a => `
    <article class="agent-card">
      <div class="agent-top">
        <span class="agent-name">${a.name}</span>
        <span class="agent-badge badge-${a.category}">${a.category}</span>
      </div>
      <p class="agent-desc">${a.description}</p>
      <p class="agent-when"><strong>Úsalo cuando:</strong> ${a.when}</p>
    </article>
  `).join("");
}

/* ---------- Guion de llamada ---------- */
function initScript() {
  const search = document.getElementById("scriptSearch");
  search.addEventListener("input", renderScript);
  renderScript();
}

function renderScript() {
  const q = (document.getElementById("scriptSearch").value || "").toLowerCase().trim();
  const list = document.getElementById("scriptList");

  const filtered = CALL_SCRIPT.filter(s =>
    !q || s.task.toLowerCase().includes(q) || s.agent.toLowerCase().includes(q) || s.prompt.toLowerCase().includes(q)
  );

  if (!filtered.length) {
    list.innerHTML = `<p class="empty">Sin coincidencias para “${q}”.</p>`;
    return;
  }

  list.innerHTML = filtered.map(s => `
    <div class="script-item">
      <span class="script-task">${s.task}</span>
      <span class="script-agent">→ ${s.agent}</span>
      <code class="script-prompt">${escapeHtml(s.prompt)}</code>
    </div>
  `).join("");
}

/* ---------- Skills ---------- */
let skillCategory = "Todos";

function initSkills() {
  const cats = ["Todos", ...SKILL_CATEGORIES];
  const chips = document.getElementById("skillChips");
  chips.innerHTML = cats.map(c =>
    `<button class="chip ${c === "Todos" ? "active" : ""}" data-cat="${c}">${c}</button>`
  ).join("");

  chips.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      skillCategory = chip.dataset.cat;
      chips.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c === chip));
      renderSkills();
    });
  });

  const search = document.getElementById("skillSearch");
  search.addEventListener("input", renderSkills);

  renderSkills();
}

function renderSkills() {
  const q = (document.getElementById("skillSearch").value || "").toLowerCase().trim();
  const grid = document.getElementById("skillGrid");

  const filtered = SKILLS.filter(s => {
    const matchCat = skillCategory === "Todos" || s.cat === skillCategory;
    const matchQ = !q || s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  if (!filtered.length) {
    grid.innerHTML = `<p class="empty">Sin resultados para “${q}”.</p>`;
    return;
  }

  grid.innerHTML = filtered.map(s => `
    <article class="skill-card">
      <div class="skill-name">${s.name}</div>
      <span class="skill-cat">${s.cat}</span>
      <p class="skill-desc">${s.desc}</p>
    </article>
  `).join("");
}

/* ---------- Seguridad ---------- */
function initSecurity() {
  const agents = document.getElementById("secAgents");
  agents.innerHTML = SECURITY.agents.map(a => `
    <div class="sec-item">
      <span class="sec-item-name">${a.name}</span>
      <span class="sec-item-type">${a.type}</span>
      <p class="sec-item-detail">${a.detail}</p>
    </div>
  `).join("");

  const runtime = document.getElementById("secRuntime");
  runtime.innerHTML = SECURITY.runtime.map(r => `
    <div class="sec-item">
      <span class="sec-item-name">${r.name}</span>
      <span class="sec-item-type">${r.type}</span>
      <p class="sec-item-detail">${r.detail}</p>
    </div>
  `).join("");

  const layers = document.getElementById("secLayers");
  layers.innerHTML = SECURITY.layers.map(l => `<li>${l}</li>`).join("");
}

/* ---------- Plugins y MCP ---------- */
function initPlugins() {
  const plugins = document.getElementById("pluginList");
  plugins.innerHTML = PLUGINS.map(p => `
    <div class="sec-item plugin-item">
      <span class="sec-item-name">${p.name}</span>
      <span class="sec-item-type">${p.type}</span>
      <p class="sec-item-detail">${p.detail}</p>
    </div>
  `).join("");

  const mcp = document.getElementById("mcpList");
  mcp.innerHTML = MCP_SERVERS.map(m => `
    <div class="sec-item mcp-item">
      <span class="sec-item-name">${m.name}</span>
      <span class="sec-item-type">${m.type}</span>
      <p class="sec-item-detail">${m.detail}</p>
    </div>
  `).join("");
}

/* ---------- Recursos ---------- */
function initResources() {
  document.getElementById("resMac").innerHTML = RESOURCES.mac.map(r => resItem(r)).join("");
  document.getElementById("resWindows").innerHTML = RESOURCES.windows.map(r => resItem(r)).join("");
  document.getElementById("resConfig").innerHTML = RESOURCES.config.map(r => `
    <div class="res-item">
      <div class="res-pkg">${r.file}</div>
      <p class="res-note">${r.note}</p>
    </div>
  `).join("");
}

function resItem(r) {
  return `
    <div class="res-item">
      <div class="res-pkg">${r.pkg}</div>
      <code class="res-cmd">${escapeHtml(r.cmd)}</code>
      <p class="res-note">${r.note}</p>
    </div>
  `;
}

/* ---------- Tabs ---------- */
function initTabs() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
    });
  });
}

/* ---------- Helpers ---------- */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}