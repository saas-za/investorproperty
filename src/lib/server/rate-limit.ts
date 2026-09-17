import "server-only";

/**
 * Extremely small in-memory limiter — this is a single-instance Node process,
 * not a fleet, so a Map is enough to blunt casual scripted probing without
 * adding infrastructure. Replace with a real store (Upstash/Redis) once this
 * runs on more than one instance, since the map does not survive a restart or
 * scale-out.
 */
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;

export function rateLimited(bucket: string, key: string, maxPerMinute: number): boolean {
  const id = `${bucket}:${key}`;
  const now = Date.now();
  const recent = (hits.get(id) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(id, recent);
  return recent.length > maxPerMinute;
}

export function callerKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
