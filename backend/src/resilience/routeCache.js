import crypto from 'node:crypto';

/**
 * Fingerprint of everything that can change a route: road status and
 * wheelchair accessibility. A cached route is reused only if the road network
 * is in exactly the same state, so a road closed after caching can never be
 * served from a stale cache entry.
 */
export function roadStateFingerprint(roads) {
  const parts = [...roads]
    .sort((a, b) => a.id - b.id)
    .map((r) => `${r.id}:${r.status}:${r.isWheelchairAccessible === false ? 0 : 1}`);
  return crypto.createHash('sha1').update(parts.join('|')).digest('hex');
}

export function routeCacheKey({ origin, destinations, accessibleOnly, roads }) {
  const dest = destinations
    .map((d) => `${d.id}@${Number(d.lat).toFixed(5)},${Number(d.lng).toFixed(5)}`)
    .sort()
    .join(';');
  const raw = [
    Number(origin.lat).toFixed(4), // ~11 m grid: same street corner reuses the route
    Number(origin.lng).toFixed(4),
    accessibleOnly ? 'wheelchair' : 'foot',
    dest,
    roadStateFingerprint(roads),
  ].join('#');
  return crypto.createHash('sha1').update(raw).digest('hex');
}

/**
 * Small in-memory LRU + TTL cache of the last successful external route sets
 * ("son keşlənmiş marşrutlar").
 */
export class RouteCache {
  constructor({ maxEntries = 500, ttlMs = 30 * 60 * 1000, now = () => Date.now() } = {}) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.now = now;
    this.entries = new Map();
  }

  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (this.now() - entry.storedAt > this.ttlMs) {
      this.entries.delete(key);
      return null;
    }
    // refresh LRU position
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry;
  }

  set(key, value) {
    this.entries.delete(key);
    this.entries.set(key, { value, storedAt: this.now() });
    while (this.entries.size > this.maxEntries) {
      this.entries.delete(this.entries.keys().next().value);
    }
  }

  clear() {
    this.entries.clear();
  }

  get size() {
    return this.entries.size;
  }
}
