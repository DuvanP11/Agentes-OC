// Office client (milestone M3, issue #14): SSE with 2s polling fallback.
// Connection indicator: green (SSE live) / amber (polling) / red (offline).

export const MODE = { LIVE: "live", POLL: "polling", OFF: "offline" };

export function connectOffice({ onSnapshot, onModeChange, pollInterval = 2000 }) {
  let mode = MODE.OFF;
  let pollTimer = null;
  let es = null;

  const setMode = (m) => {
    if (m !== mode) {
      mode = m;
      onModeChange?.(m);
    }
  };

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const startPolling = () => {
    stopPolling();
    const poll = async () => {
      try {
        const res = await fetch("/status");
        if (!res.ok) throw new Error(String(res.status));
        onSnapshot(await res.json());
        setMode(MODE.POLL);
      } catch {
        setMode(MODE.OFF);
      }
    };
    poll();
    pollTimer = setInterval(poll, pollInterval);
  };

  const startSSE = () => {
    if (es) {
      es.close();
      es = null;
    }
    es = new EventSource("/events");
    es.onopen = () => setMode(MODE.LIVE);
    es.onmessage = (e) => {
      try {
        onSnapshot(JSON.parse(e.data));
        setMode(MODE.LIVE);
      } catch {
        // malformed frame; keep the last known state
      }
    };
    es.onerror = () => {
      es.close();
      es = null;
      startPolling();
    };
  };

  const stop = () => {
    if (es) {
      es.close();
      es = null;
    }
    stopPolling();
  };

  fetch("/status")
    .then((r) => r.json())
    .then(onSnapshot)
    .catch(() => setMode(MODE.OFF));
  startSSE();

  return { stop };
}
