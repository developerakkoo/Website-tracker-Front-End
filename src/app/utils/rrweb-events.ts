/** rrweb EventType values used for replay validation */
export const RRWEB_FULL_SNAPSHOT = 2;
export const RRWEB_META = 4;

export interface RrwebEventLike {
  timestamp: number;
  type?: number;
}

export interface RrwebChunkLike {
  chunkIndex: number;
  segmentId?: string | null;
  isCheckout?: boolean;
  recordedAt?: number;
  events: unknown[];
}

export type RrwebReplayFailureReason =
  | 'empty_chunks'
  | 'no_full_snapshot'
  | 'player_error';

export interface RrwebReplayValidation {
  replayable: boolean;
  reason?: RrwebReplayFailureReason;
  chunkCount: number;
  segmentCount: number;
  segmentNote?: string;
}

export function isReplayableRrwebEvents(events: RrwebEventLike[]): boolean {
  return events.some((e) => e.type === RRWEB_FULL_SNAPSHOT);
}

function chunkHasFullSnapshot(chunk: RrwebChunkLike): boolean {
  return (chunk.events as RrwebEventLike[]).some((e) => e.type === RRWEB_FULL_SNAPSHOT);
}

function sortChunks(chunks: RrwebChunkLike[]): RrwebChunkLike[] {
  return [...chunks].sort((a, b) => {
    const segA = a.segmentId || '';
    const segB = b.segmentId || '';
    if (segA !== segB) return segA.localeCompare(segB);
    if (a.chunkIndex !== b.chunkIndex) return a.chunkIndex - b.chunkIndex;
    return (a.recordedAt || 0) - (b.recordedAt || 0);
  });
}

function groupChunksBySegment(chunks: RrwebChunkLike[]): Map<string, RrwebChunkLike[]> {
  const sorted = sortChunks(chunks);
  const groups = new Map<string, RrwebChunkLike[]>();
  sorted.forEach((chunk) => {
    const key = chunk.segmentId || '__legacy__';
    const list = groups.get(key) || [];
    list.push(chunk);
    groups.set(key, list);
  });
  return groups;
}

function mergeChunkEvents(chunks: RrwebChunkLike[]): RrwebEventLike[] {
  const merged: RrwebEventLike[] = [];
  const seen = new Set<string>();

  chunks.forEach((chunk) => {
    (chunk.events as RrwebEventLike[]).forEach((ev, idx) => {
      const key = `${chunk.segmentId || ''}:${chunk.chunkIndex}:${idx}:${ev.timestamp}:${ev.type ?? ''}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(ev);
    });
  });

  merged.sort((a, b) => a.timestamp - b.timestamp);
  return merged;
}

/** Pick the latest segment that contains a FullSnapshot (Hotjar refresh-resume safe). */
export function pickLatestReplayableSegment(chunks: RrwebChunkLike[]): {
  events: RrwebEventLike[];
  segmentCount: number;
  segmentNote?: string;
} {
  if (!chunks.length) {
    return { events: [], segmentCount: 0 };
  }

  const groups = groupChunksBySegment(chunks);
  const segmentKeys = [...groups.keys()];
  const segmentCount = segmentKeys.length;

  for (let i = segmentKeys.length - 1; i >= 0; i--) {
    const segChunks = groups.get(segmentKeys[i]) || [];
    if (!segChunks.some(chunkHasFullSnapshot)) {
      continue;
    }
    const events = mergeChunkEvents(segChunks);
    if (isReplayableRrwebEvents(events)) {
      return {
        events,
        segmentCount,
        segmentNote:
          segmentCount > 1
            ? 'Showing the latest page view from this session (earlier refreshes are not included in this replay).'
            : undefined
      };
    }
  }

  const fallback = mergeChunkEvents(sortChunks(chunks));
  return { events: fallback, segmentCount };
}

export function flattenRrwebChunks(chunks: RrwebChunkLike[]): RrwebEventLike[] {
  return pickLatestReplayableSegment(chunks).events;
}

export function validateRrwebReplay(chunks: RrwebChunkLike[]): RrwebReplayValidation {
  const chunkCount = chunks.length;
  if (chunkCount === 0) {
    return { replayable: false, reason: 'empty_chunks', chunkCount: 0, segmentCount: 0 };
  }

  const picked = pickLatestReplayableSegment(chunks);
  if (picked.events.length === 0) {
    return {
      replayable: false,
      reason: 'empty_chunks',
      chunkCount,
      segmentCount: picked.segmentCount
    };
  }

  if (!isReplayableRrwebEvents(picked.events)) {
    return {
      replayable: false,
      reason: 'no_full_snapshot',
      chunkCount,
      segmentCount: picked.segmentCount
    };
  }

  return {
    replayable: true,
    chunkCount,
    segmentCount: picked.segmentCount,
    segmentNote: picked.segmentNote
  };
}

export function replayFailureMessage(reason?: RrwebReplayFailureReason): string {
  switch (reason) {
    case 'empty_chunks':
      return 'No visual recording data was received for this session. Confirm the tracker script is installed and rrweb-chunk requests return 202 in the browser Network tab.';
    case 'no_full_snapshot':
      return 'Recording started but the first visual frame never uploaded. Reload the tracked page with the latest tracker.js and try again.';
    case 'player_error':
      return 'Visual data was stored but the replay player could not render it. Try again or use the saved snapshot fallback.';
    default:
      return 'Visual replay data was incomplete; showing saved page snapshot instead.';
  }
}
