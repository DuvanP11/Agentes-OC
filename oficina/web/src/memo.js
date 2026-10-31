// Memo card: reads memory log, sanitizes, shows as card.
// (Milestone M5, issue #18)

export async function fetchMemo(url = "/api/memo") {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export function sanitizeMemo(text) {
  if (!text) return "";
  let s = String(text);
  // Strip markdown headings, code fences, horizontal rules
  s = s.replace(/^#{1,6}\s+/gm, "");
  s = s.replace(/```[\s\S]*?```/g, "");
  s = s.replace(/`([^`]+)`/g, "$1");
  s = s.replace(/^\s*[-*_]{3,}\s*$/gm, "");
  // Strip markdown links/images, keep text
  s = s.replace(/!?\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Strip HTML tags
  s = s.replace(/<[^>]+>/g, "");
  // Collapse whitespace
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s.replace(/[ \t]{2,}/g, " ");
  return s.trim();
}

export function extractRecentSection(text, maxLines = 20) {
  const lines = text.split("\n");
  // Find the most recent dated section (## YYYY-MM-DD)
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^## \d{4}-\d{2}-\d{2}/.test(lines[i])) {
      startIdx = i;
    }
  }
  if (startIdx >= 0) {
    return lines.slice(startIdx, startIdx + maxLines).join("\n");
  }
  // Fallback: last N lines
  return lines.slice(-maxLines).join("\n");
}

export class MemoCard {
  constructor({ container, fetchUrl = "/api/memo", refreshMs = 60000 } = {}) {
    this.container = container;
    this.fetchUrl = fetchUrl;
    this.refreshMs = refreshMs;
    this.element = null;
    this.timer = null;
  }

  mount() {
    this.element = document.createElement("div");
    this.element.className = "memo-card";
    this.element.innerHTML = `
      <style>
        .memo-card {
          position: fixed;
          bottom: 64px;
          right: 20px;
          width: 320px;
          max-height: 40vh;
          background: #1a1d26;
          border: 2px solid #262b36;
          border-radius: 6px;
          padding: 12px;
          font: 11px ui-monospace, Menlo, monospace;
          color: #cfd6e4;
          overflow-y: auto;
          box-shadow: 0 4px 24px rgba(0,0,0,0.4);
          z-index: 100;
        }
        .memo-card header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid #333c4d;
        }
        .memo-card h3 {
          margin: 0;
          font-size: 12px;
          color: #6a9fe8;
        }
        .memo-card .close {
          background: none;
          border: none;
          color: #7c8496;
          cursor: pointer;
          font: inherit;
          padding: 2px 6px;
        }
        .memo-card .close:hover { color: #e05555; }
        .memo-card .content {
          white-space: pre-wrap;
          word-wrap: break-word;
          line-height: 1.5;
        }
        .memo-card .empty {
          color: #7c8496;
          font-style: italic;
          text-align: center;
          padding: 20px;
        }
      </style>
      <header>
        <h3>Yesterday's Memo</h3>
        <button class="close" aria-label="Close">×</button>
      </header>
      <div class="content"></div>
    `;
    this.container.appendChild(this.element);
    this.element.querySelector(".close").addEventListener("click", () => this.hide());
    this.refresh();
  }

  async refresh() {
    const contentEl = this.element?.querySelector(".content");
    if (!contentEl) return;

    const raw = await fetchMemo(this.fetchUrl);
    if (!raw) {
      contentEl.innerHTML = '<div class="empty">No memo available</div>';
      return;
    }

    const sanitized = sanitizeMemo(raw);
    const recent = extractRecentSection(sanitized);
    contentEl.textContent = recent || "No recent entries";
  }

  show() {
    if (this.element) this.element.style.display = "block";
    this.startAutoRefresh();
  }

  hide() {
    if (this.element) this.element.style.display = "none";
    this.stopAutoRefresh();
  }

  startAutoRefresh() {
    this.stopAutoRefresh();
    this.timer = setInterval(() => this.refresh(), this.refreshMs);
  }

  stopAutoRefresh() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  destroy() {
    this.stopAutoRefresh();
    if (this.element?.parentNode) this.element.parentNode.removeChild(this.element);
    this.element = null;
  }
}