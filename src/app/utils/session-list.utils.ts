import { ProjectSession } from 'src/app/services/session';

export interface SessionDayGroup {
  dateKey: string;
  label: string;
  sessions: ProjectSession[];
}

export type SessionsDatePreset = 'today' | 'yesterday' | '7d' | '30d' | 'all';

export type SessionsSortField = 'startedAt' | 'duration' | 'eventCount' | 'pageCount';

export type SessionsDeviceFilter = '' | 'desktop' | 'mobile' | 'tablet';

export interface SessionsFilterState {
  search: string;
  datePreset: SessionsDatePreset;
  device: SessionsDeviceFilter;
  minDurationMs: number;
  hasRrweb: boolean;
  hasRageClicks: boolean;
  hasErrors: boolean;
  starred: boolean;
  tag: string;
}

export interface SessionsSortState {
  field: SessionsSortField;
  order: 'asc' | 'desc';
}

export function calendarDayKey(iso: string | Date | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDayGroupLabel(dateKey: string): string {
  if (!dateKey) return 'Unknown date';
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const todayKey = calendarDayKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = calendarDayKey(yesterday);
  if (dateKey === todayKey) return 'Today';
  if (dateKey === yesterdayKey) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function groupSessionsByDay(sessions: ProjectSession[]): SessionDayGroup[] {
  const map = new Map<string, ProjectSession[]>();
  for (const s of sessions) {
    const key = calendarDayKey(s.startedAt);
    if (!key) continue;
    const list = map.get(key) || [];
    list.push(s);
    map.set(key, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, daySessions]) => ({
      dateKey,
      label: formatDayGroupLabel(dateKey),
      sessions: daySessions,
    }));
}

export function formatSessionTime(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function dateRangeFromPreset(preset: SessionsDatePreset): { from?: string; to?: string } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (preset === 'all') return {};

  if (preset === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: end.toISOString() };
  }

  if (preset === 'yesterday') {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const yEnd = new Date(start);
    yEnd.setHours(23, 59, 59, 999);
    return { from: start.toISOString(), to: yEnd.toISOString() };
  }

  const days = preset === '7d' ? 7 : 30;
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return { from: start.toISOString(), to: end.toISOString() };
}

export const DEFAULT_SESSIONS_FILTERS: SessionsFilterState = {
  search: '',
  datePreset: 'all',
  device: '',
  minDurationMs: 0,
  hasRrweb: false,
  hasRageClicks: false,
  hasErrors: false,
  starred: false,
  tag: '',
};

export const DEFAULT_SESSIONS_SORT: SessionsSortState = {
  field: 'startedAt',
  order: 'desc',
};
