// Mobile layout: bottom-sheet agent list, tap for detail.
// (Milestone M5, issue #20)

const STATE_LABELS = {
  idle: "Idle",
  writing: "Writing",
  researching: "Researching",
  executing: "Executing",
  thinking: "Thinking",
  waiting: "Waiting",
  error: "Error",
};

const STATE_COLORS = {
  idle: "#8fb3ff",
  writing: "#35d07f",
  researching: "#6a9fe8",
  executing: "#e0a63b",
  thinking: "#8fb3ff",
  waiting: "#ffb454",
  error: "#ff6b6b",
};

export class MobileAgentSheet {
  constructor({ characters, onSelect, onClose }) {
    this.characters = characters;
    this.onSelect = onSelect;
    this.onClose = onClose;
    this.element = null;
    this.isOpen = false;
    this.selectedAgentId = null;
  }

  mount() {
    this.element = document.createElement("div");
    this.element.className = "mobile-sheet";
    this.element.innerHTML = `
      <style>
        .mobile-sheet {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #1a1d26;
          border-top: 2px solid #262b36;
          border-radius: 12px 12px 0 0;
          transform: translateY(100%);
          transition: transform 0.3s ease;
          z-index: 200;
          max-height: 60vh;
          display: flex;
          flex-direction: column;
          font: 13px ui-monospace, Menlo, monospace;
          color: #e7e9ee;
        }
        .mobile-sheet.open {
          transform: translateY(0);
        }
        .mobile-sheet .handle {
          width: 40px;
          height: 4px;
          background: #333c4d;
          border-radius: 2px;
          margin: 10px auto;
        }
        .mobile-sheet header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 16px 8px;
          border-bottom: 1px solid #333c4d;
        }
        .mobile-sheet h3 {
          margin: 0;
          font-size: 14px;
          color: #6a9fe8;
        }
        .mobile-sheet .close {
          background: none;
          border: none;
          color: #7c8496;
          cursor: pointer;
          font: inherit;
          padding: 4px 8px;
        }
        .mobile-sheet .list {
          flex: 1;
          overflow-y: auto;
          padding: 8px 16px;
        }
        .mobile-sheet .agent-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #12141a;
          border: 1px solid #262b36;
          border-radius: 8px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .mobile-sheet .agent-item:active {
          background: #1d2330;
        }
        .mobile-sheet .agent-item.selected {
          border-color: #35d07f;
          background: #1a2a1e;
        }
        .mobile-sheet .agent-sprite {
          width: 32px;
          height: 40px;
          image-rendering: pixelated;
          flex-shrink: 0;
        }
        .mobile-sheet .agent-info {
          flex: 1;
          min-width: 0;
        }
        .mobile-sheet .agent-name {
          font-weight: 600;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mobile-sheet .agent-state {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #9aa4b2;
        }
        .mobile-sheet .state-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .mobile-sheet .detail-panel {
          display: none;
          padding: 12px 16px;
          border-top: 1px solid #333c4d;
          background: #12141a;
        }
        .mobile-sheet .detail-panel.open {
          display: block;
        }
        .mobile-sheet .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid #262b36;
          font-size: 13px;
        }
        .mobile-sheet .detail-row:last-child {
          border-bottom: none;
        }
        .mobile-sheet .detail-label {
          color: #7c8496;
        }
        .mobile-sheet .detail-value {
          text-align: right;
          font-family: inherit;
        }
        @media (min-width: 769px) {
          .mobile-sheet { display: none; }
        }
      </style>
      <div class="handle"></div>
      <header>
        <h3>Agents</h3>
        <button class="close" aria-label="Close sheet">×</button>
      </header>
      <div class="list"></div>
      <div class="detail-panel"></div>
    `;
    document.body.appendChild(this.element);

    this.element.querySelector(".close").addEventListener("click", () => this.close());
    this.element.querySelector(".handle").addEventListener("click", () => this.toggle());
  }

  update(characters) {
    this.characters = characters;
    this.renderList();
    if (this.selectedAgentId && !characters.has(this.selectedAgentId)) {
      this.selectedAgentId = null;
      this.renderDetail();
    }
  }

  renderList() {
    const listEl = this.element.querySelector(".list");
    if (!listEl) return;

    if (this.characters.size === 0) {
      listEl.innerHTML = '<div style="text-align:center;color:#7c8496;padding:20px;">No agents in office</div>';
      return;
    }

    listEl.innerHTML = "";
    for (const [id, char] of this.characters) {
      const item = document.createElement("div");
      item.className = "agent-item" + (id === this.selectedAgentId ? " selected" : "");
      item.dataset.agentId = id;

      // Create a mini canvas for the sprite preview
      const canvas = document.createElement("canvas");
      canvas.className = "agent-sprite";
      canvas.width = 32;
      canvas.height = 40;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      // Draw current pose frame
      char.sprite.draw(ctx, char.pose, char.frame, 0, 0);

      const color = STATE_COLORS[char.state] ?? "#cfd6e4";
      item.innerHTML = "";
      item.appendChild(canvas);
      item.innerHTML += `
        <div class="agent-info">
          <div class="agent-name">${this.escapeHtml(char.name)}</div>
          <div class="agent-state">
            <span class="state-dot" style="background:${color}"></span>
            ${STATE_LABELS[char.state] ?? char.state}
            ${char.zone ? ` · ${char.zone}` : ""}
          </div>
        </div>
      `;
      item.addEventListener("click", () => this.selectAgent(id));
      listEl.appendChild(item);
    }
  }

  selectAgent(agentId) {
    this.selectedAgentId = agentId;
    this.renderList();
    this.renderDetail();
    this.onSelect?.(agentId);
  }

  renderDetail() {
    const panel = this.element.querySelector(".detail-panel");
    if (!panel) return;

    if (!this.selectedAgentId || !this.characters.has(this.selectedAgentId)) {
      panel.classList.remove("open");
      return;
    }

    const char = this.characters.get(this.selectedAgentId);
    panel.classList.add("open");
    panel.innerHTML = `
      <div class="detail-row">
        <span class="detail-label">ID</span>
        <span class="detail-value">${this.escapeHtml(char.id)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Name</span>
        <span class="detail-value">${this.escapeHtml(char.name)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">State</span>
        <span class="detail-value" style="color:${STATE_COLORS[char.state] ?? "#cfd6e4"}">${STATE_LABELS[char.state] ?? char.state}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Zone</span>
        <span class="detail-value">${char.zone ?? "—"}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Sprite</span>
        <span class="detail-value">${char.sprite.id}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Position</span>
        <span class="detail-value">${Math.round(char.x)}, ${Math.round(char.y)}</span>
      </div>
      ${char.detail ? `
      <div class="detail-row">
        <span class="detail-label">Detail</span>
        <span class="detail-value">${this.escapeHtml(char.detail)}</span>
      </div>
      ` : ""}
      ${char.joinedAt ? `
      <div class="detail-row">
        <span class="detail-label">Joined</span>
        <span class="detail-value">${this.formatTime(char.joinedAt)}</span>
      </div>
      ` : ""}
      ${char.lastSeen ? `
      <div class="detail-row">
        <span class="detail-label">Last seen</span>
        <span class="detail-value">${this.formatTime(char.lastSeen)}</span>
      </div>
      ` : ""}
    `;
  }

  formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  open() {
    if (!this.isOpen) {
      this.isOpen = true;
      this.element.classList.add("open");
    }
  }

  close() {
    if (this.isOpen) {
      this.isOpen = false;
      this.element.classList.remove("open");
      this.selectedAgentId = null;
      this.renderDetail();
      this.onClose?.();
    }
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  destroy() {
    if (this.element?.parentNode) this.element.parentNode.removeChild(this.element);
    this.element = null;
  }
}

// Mobile detection and auto-open on small screens
export function initMobileSheet({ characters, onSelect, onClose }) {
  const sheet = new MobileAgentSheet({ characters, onSelect, onClose });
  sheet.mount();

  // Toggle button for mobile
  const toggleBtn = document.createElement("button");
  toggleBtn.className = "mobile-toggle";
  toggleBtn.textContent = "☰ Agents";
  toggleBtn.style.cssText = `
    position: fixed;
    bottom: 16px;
    left: 16px;
    z-index: 150;
    background: #1d2330;
    color: #cfd6e4;
    border: 1px solid #333c4d;
    border-radius: 20px;
    padding: 8px 16px;
    font: 12px ui-monospace, Menlo, monospace;
    cursor: pointer;
    display: none;
  `;
  document.body.appendChild(toggleBtn);

  toggleBtn.addEventListener("click", () => sheet.toggle());

  // Show toggle on mobile
  function checkMobile() {
    const isMobile = window.innerWidth <= 768;
    toggleBtn.style.display = isMobile ? "block" : "none";
    if (!isMobile) sheet.close();
  }
  checkMobile();
  window.addEventListener("resize", checkMobile);

  return { sheet, toggleBtn };
}