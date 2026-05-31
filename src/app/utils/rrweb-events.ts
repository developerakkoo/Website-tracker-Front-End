/** rrweb EventType values used for replay validation */
export const RRWEB_FULL_SNAPSHOT = 2;
export const RRWEB_META = 4;

export interface RrwebEventLike {
  timestamp: number;
  type?: number;
}

export function isReplayableRrwebEvents(events: RrwebEventLike[]): boolean {
  return events.some((e) => e.type === RRWEB_FULL_SNAPSHOT);
}

export function flattenRrwebChunks(
  chunks: { chunkIndex: number; events: unknown[] }[]
): RrwebEventLike[] {
  const sorted = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
  const merged: RrwebEventLike[] = [];
  const seen = new Set<string>();

  sorted.forEach((chunk) => {
    (chunk.events as RrwebEventLike[]).forEach((ev, idx) => {
      const key = `${chunk.chunkIndex}:${idx}:${ev.timestamp}:${ev.type ?? ''}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(ev);
    });
  });

  merged.sort((a, b) => a.timestamp - b.timestamp);
  return merged;
}
