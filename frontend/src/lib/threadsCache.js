// src/lib/threadsCache.js
export const THREADS_CACHE_KEY = "threadsCache:v1";
export const THREADS_TTL_MS = 3 * 60 * 1000; // 3 minutes
export const THREADS_CACHE_EVENT = "threadsCache:update";

/** Read cache; if validOnly, returns null on expiration */
export function loadThreadsCache(validOnly = true) {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(THREADS_CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (!Array.isArray(data)) return null;
    if (validOnly && Date.now() - ts > THREADS_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

/** Save and notify listeners */
export function saveThreadsCache(threads) {
  if (typeof window === "undefined") return;
  try {
    const payload = { ts: Date.now(), data: threads || [] };
    localStorage.setItem(THREADS_CACHE_KEY, JSON.stringify(payload));
    emitThreadsCacheUpdated();
  } catch {
    // ignore
  }
}

/** Subscribe to cache updates; returns cleanup */
export function addThreadsCacheListener(cb) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb?.();
  window.addEventListener(THREADS_CACHE_EVENT, handler);
  return () => window.removeEventListener(THREADS_CACHE_EVENT, handler);
}

export function emitThreadsCacheUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(THREADS_CACHE_EVENT));
}

/**
 * Upsert lastMessage + reorder thread to top. Also optionally reset unread.
 * message = { content?, type? ("TEXT"|"IMAGE"|"VIDEO"|"FILE"), timestamp (ms), sender? {id, username} }
 */
export function upsertThreadLastMessage(threadId, message, opts = {}) {
  if (!threadId) return;
  const { moveToTop = true, resetUnread = false } = opts;
  const list = loadThreadsCache(false) || [];
  const idx = list.findIndex((t) => t.id === threadId);
  if (idx === -1) return; // not in cache -> skip (or add minimal shell if you want)
  const t = { ...list[idx] };

  t.lastMessage = {
    ...(t.lastMessage || {}),
    content: message?.content ?? t.lastMessage?.content ?? "",
    type: message?.type ?? t.lastMessage?.type ?? "TEXT",
    timestamp: message?.timestamp ?? Date.now(),
    sender: message?.sender ?? t.lastMessage?.sender ?? null,
  };

  if (resetUnread) t.unread = 0;

  // Move to top?
  const newList = list.slice();
  newList.splice(idx, 1);
  if (moveToTop) newList.unshift(t);
  else newList.splice(idx, 0, t);

  saveThreadsCache(newList);
}

/** Set a specific unread number (e.g., zero when you open the thread) */
export function setThreadUnread(threadId, unread = 0) {
  if (!threadId) return;
  const list = loadThreadsCache(false) || [];
  const idx = list.findIndex((t) => t.id === threadId);
  if (idx === -1) return;
  const t = { ...list[idx], unread: Math.max(0, Number(unread) || 0) };
  const newList = list.slice();
  newList.splice(idx, 1, t);
  saveThreadsCache(newList);
}
