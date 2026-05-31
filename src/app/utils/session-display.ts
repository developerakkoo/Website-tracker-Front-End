import { ProjectSession, ReplayEvent } from 'src/app/services/session';

export interface HumanTimelineRow {
  icon: string;
  label: string;
  offsetLabel: string;
  detail?: string;
  expanded?: boolean;
}

export function pageTitleFromUrl(url?: string): string {
  if (!url || !url.trim()) return 'Unknown page';
  try {
    const u = new URL(url.includes('://') ? url : `https://${url}`);
    let path = u.pathname.replace(/\/$/, '') || '/';
    if (path === '/') return 'Homepage';
    const segments = path.split('/').filter(Boolean);
    const last = segments[segments.length - 1] || 'Page';
    const title = decodeURIComponent(last)
      .replace(/[-_]/g, ' ')
      .replace(/\.\w+$/, '');
    return title.charAt(0).toUpperCase() + title.slice(1);
  } catch {
    const stripped = url.replace(/^https?:\/\//, '').split('?')[0];
    return stripped.length > 40 ? stripped.slice(0, 39) + '…' : stripped || 'Unknown page';
  }
}

export function pagePathShort(url?: string, max = 48): string {
  if (!url) return '';
  try {
    const u = new URL(url.includes('://') ? url : `https://${url}`);
    const host = u.hostname.replace(/^www\./, '');
    const path = u.pathname === '/' ? '' : u.pathname;
    const full = host + path;
    return full.length <= max ? full : full.slice(0, max - 1) + '…';
  } catch {
    return url.length <= max ? url : url.slice(0, max - 1) + '…';
  }
}

export function formatRelativeTime(iso: string | Date | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (d >= startOfToday) {
    return `Today at ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (d >= startOfYesterday) {
    return `Yesterday at ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatWatchDuration(ms: number | undefined): string {
  if (ms == null || ms < 0) return '—';
  const sec = Math.floor(ms / 1000);
  if (sec < 10) return 'Under 10 sec';
  if (sec < 60) return `${sec} sec`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  if (min < 60) return rem > 0 ? `${min} min ${rem} sec` : `${min} min`;
  const hr = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${hr} hr ${m} min` : `${hr} hr`;
}

export function formatDeviceShort(deviceType?: string): string {
  const d = (deviceType || 'desktop').toLowerCase();
  if (d === 'android') return 'Android phone';
  if (d === 'ios') return 'iPhone or iPad';
  if (d === 'tablet') return 'Tablet';
  return 'Desktop computer';
}

export function deviceIconName(deviceType?: string): string {
  const d = (deviceType || 'desktop').toLowerCase();
  if (d === 'android' || d === 'ios') return 'phone-portrait-outline';
  if (d === 'tablet') return 'tablet-portrait-outline';
  return 'desktop-outline';
}

export function deviceBadgeColor(deviceType?: string): string {
  const d = (deviceType || 'desktop').toLowerCase();
  if (d === 'android' || d === 'ios') return 'success';
  if (d === 'tablet') return 'warning';
  return 'primary';
}

export function pagesVisitedCount(session: Pick<ProjectSession, 'pages' | 'pageCount'>): number {
  if (session.pageCount != null && session.pageCount > 0) return session.pageCount;
  const n = session.pages?.length;
  return n && n > 0 ? n : 1;
}

export function pagesLabel(count: number): string {
  return count === 1 ? '1 page' : `${count} pages`;
}

function eventTimeMs(ev: ReplayEvent): number {
  return ev.timestamp < 1e12 ? ev.timestamp * 1000 : ev.timestamp;
}

export function formatVisitOffset(ms: number, startMs: number): string {
  const delta = Math.max(0, ms - startMs);
  const sec = Math.floor(delta / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')} into visit`;
}

function humanizeSingleEvent(ev: ReplayEvent): { icon: string; label: string } | null {
  const t = (ev.type || '').toLowerCase();
  if (t === 'click') return { icon: 'hand-left-outline', label: 'Clicked on the page' };
  if (t === 'goal_click') {
    const name = ev.data?.goalName || ev.data?.goalKey;
    const label = name
      ? `Clicked ${typeof name === 'string' ? name : 'conversion goal'}`
      : 'Clicked a conversion goal';
    return { icon: 'flag-outline', label };
  }
  if (t === 'scroll') return { icon: 'arrow-down-outline', label: 'Scrolled' };
  if (t === 'pageview') return { icon: 'document-outline', label: 'Opened a page' };
  if (t === 'mousemove') return null;
  return { icon: 'ellipse-outline', label: 'Interacted with the page' };
}

export function buildActivityTimeline(
  events: ReplayEvent[],
  maxRows = 50
): HumanTimelineRow[] {
  if (!events.length) return [];
  const sorted = [...events].sort((a, b) => eventTimeMs(a) - eventTimeMs(b));
  const startMs = eventTimeMs(sorted[0]);
  const rows: HumanTimelineRow[] = [];
  let i = 0;

  while (i < sorted.length && rows.length < maxRows) {
    const ev = sorted[i];
    const t = (ev.type || '').toLowerCase();
    const ms = eventTimeMs(ev);

    if (t === 'scroll' || t === 'mousemove') {
      let j = i + 1;
      while (j < sorted.length) {
        const next = sorted[j];
        const nt = (next.type || '').toLowerCase();
        if (nt !== 'scroll' && nt !== 'mousemove') break;
        if (eventTimeMs(next) - eventTimeMs(sorted[j - 1]) > 2000) break;
        j++;
      }
      rows.push({
        icon: 'arrow-down-outline',
        label: j - i > 1 ? 'Scrolled through the page' : 'Scrolled',
        offsetLabel: formatVisitOffset(ms, startMs),
        detail: formatEventDetail(ev),
      });
      i = j;
      continue;
    }

    const single = humanizeSingleEvent(ev);
    if (single) {
      rows.push({
        icon: single.icon,
        label: single.label,
        offsetLabel: formatVisitOffset(ms, startMs),
        detail: formatEventDetail(ev),
      });
    }
    i++;
  }

  return rows;
}

export function formatEventDetail(ev: ReplayEvent): string {
  const t = (ev.type || '').toLowerCase();
  if (t === 'scroll' && ev.data?.scrollY != null) {
    return `Scroll position ${Math.round(ev.data.scrollY)}px`;
  }
  if (t === 'click' && ev.data?.x != null && ev.data?.y != null) {
    return `Position on page`;
  }
  if (t === 'goal_click') {
    const parts = [ev.data?.goalName, ev.data?.goalKey, ev.data?.pageUrl].filter(Boolean);
    return parts.length ? String(parts[0]) : 'Conversion goal';
  }
  return ev.type;
}

export function countInteractions(events: ReplayEvent[]): number {
  return events.filter((e) => {
    const t = (e.type || '').toLowerCase();
    return t === 'click' || t === 'goal_click' || t === 'scroll' || t === 'pageview';
  }).length;
}
