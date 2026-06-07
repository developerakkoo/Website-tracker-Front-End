import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  SessionsDeviceFilter,
  SessionsSortField,
  dateRangeFromPreset,
  SessionsDatePreset,
} from 'src/app/utils/session-list.utils';

export interface SessionPageMeta {
  url?: string;
  snapshot?: string;
  startedAt?: string;
  viewport?: { width: number; height: number };
  eventsCount?: number;
}

export interface SessionInfo {
  snapshot: string;
  startedAt: string;
  duration: number;
  eventCount: number;
  url?: string;
  viewport?: { width: number; height: number };
  deviceType?: string;
  screen?: { width: number; height: number };
  userAgent?: string;
  pages?: SessionPageMeta[];
  hasRrweb?: boolean;
  rrwebStatus?: 'none' | 'partial' | 'complete';
  rageClickCount?: number;
  deadClickCount?: number;
  errorCount?: number;
  networkErrorCount?: number;
  starred?: boolean;
  tags?: string[];
  rrwebChunkCount?: number;
}

export interface ReplayEvent {
  type: string;
  data: {
    x?: number;
    y?: number;
    scrollY?: number;
    url?: string;
    goalKey?: string;
    goalName?: string;
    pageUrl?: string;
    elementTag?: string;
    elementText?: string;
    selector?: string;
    level?: string;
    message?: string;
    method?: string;
    status?: number;
    error?: boolean;
  };
  timestamp: number;
  pageIndex?: number;
}

export interface FullSessionPage {
  url: string;
  snapshot: string;
  startedAt: string;
  viewport?: { width: number; height: number };
  events: ReplayEvent[];
}

export interface FullSessionResponse {
  pages: FullSessionPage[];
  totalDuration: number;
  deviceType?: string;
  sessionViewport?: { width: number; height: number };
  startedAt?: string;
}

export interface ProjectSession {
  sessionId: string;
  startedAt: string;
  url?: string;
  eventCount: number;
  duration: number;
  deviceType?: string;
  viewport?: { width: number; height: number };
  pages?: SessionPageMeta[];
  pageCount?: number;
  hasRrweb?: boolean;
  rrwebStatus?: 'none' | 'partial' | 'complete';
  rageClickCount?: number;
  deadClickCount?: number;
  errorCount?: number;
  starred?: boolean;
  tags?: string[];
  rrwebChunkCount?: number;
  hasSnapshot?: boolean;
}

export interface SessionsListParams {
  page?: number;
  limit?: number;
  sort?: SessionsSortField;
  order?: 'asc' | 'desc';
  search?: string;
  from?: string;
  to?: string;
  datePreset?: SessionsDatePreset;
  device?: SessionsDeviceFilter;
  minDuration?: number;
  hasRrweb?: boolean;
  hasRageClicks?: boolean;
  hasErrors?: boolean;
  starred?: boolean;
  tag?: string;
}

export interface RrwebChunk {
  chunkIndex: number;
  segmentId?: string | null;
  isCheckout: boolean;
  recordedAt: number;
  events: unknown[];
}

export interface RrwebChunksResponse {
  sessionId: string;
  chunkCount: number;
  chunks: RrwebChunk[];
}

export interface SessionsListResponse {
  items: ProjectSession[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  constructor(private http: HttpClient) {}

  listProjectSessions(
    projectId: string,
    params: SessionsListParams = {}
  ): Observable<SessionsListResponse> {
    let httpParams = new HttpParams();

    const page = params.page ?? 1;
    const limit = params.limit ?? 25;
    httpParams = httpParams.set('page', String(page));
    httpParams = httpParams.set('limit', String(limit));

    const sort = params.sort ?? 'startedAt';
    const order = params.order ?? 'desc';
    httpParams = httpParams.set('sort', sort);
    httpParams = httpParams.set('order', order);

    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }

    let from = params.from;
    let to = params.to;
    if (params.datePreset && params.datePreset !== 'all') {
      const range = dateRangeFromPreset(params.datePreset);
      from = range.from;
      to = range.to;
    }
    if (from) httpParams = httpParams.set('from', from);
    if (to) httpParams = httpParams.set('to', to);

    if (params.device) {
      httpParams = httpParams.set('device', params.device);
    }

    if (params.minDuration != null && params.minDuration > 0) {
      httpParams = httpParams.set('minDuration', String(params.minDuration));
    }

    if (params.hasRrweb) httpParams = httpParams.set('hasRrweb', 'true');
    if (params.hasRageClicks) httpParams = httpParams.set('hasRageClicks', 'true');
    if (params.hasErrors) httpParams = httpParams.set('hasErrors', 'true');
    if (params.starred) httpParams = httpParams.set('starred', 'true');
    if (params.tag?.trim()) httpParams = httpParams.set('tag', params.tag.trim());

    return this.http
      .get<SessionsListResponse | ProjectSession[]>(
        environment.API_URL + '/projects/' + projectId + '/sessions',
        { params: httpParams }
      )
      .pipe(map((res) => this.normalizeSessionsListResponse(res, page, limit)));
  }

  /** Supports paginated `{ items, total, ... }` and legacy bare array responses. */
  private normalizeSessionsListResponse(
    res: SessionsListResponse | ProjectSession[],
    page: number,
    limit: number
  ): SessionsListResponse {
    if (Array.isArray(res)) {
      const total = res.length;
      return {
        items: res,
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      };
    }

    const items = res.items ?? [];
    const total = res.total ?? items.length;
    return {
      items,
      total,
      page: res.page ?? page,
      limit: res.limit ?? limit,
      totalPages: res.totalPages ?? (total === 0 ? 0 : Math.ceil(total / (res.limit ?? limit))),
    };
  }

  /** @deprecated Use listProjectSessions — returns first page items only */
  getProjectSessions(projectId: string, limit = 100): Observable<ProjectSession[]> {
    return new Observable((subscriber) => {
      this.listProjectSessions(projectId, { page: 1, limit }).subscribe({
        next: (res) => {
          subscriber.next(res.items);
          subscriber.complete();
        },
        error: (err) => subscriber.error(err),
      });
    });
  }

  getSession(sessionId: string): Observable<SessionInfo> {
    return this.http.get<SessionInfo>(environment.API_URL + '/session/' + sessionId);
  }

  getSessionEvents(sessionId: string): Observable<ReplayEvent[]> {
    return this.http.get<ReplayEvent[]>(environment.API_URL + '/session/' + sessionId + '/events');
  }

  getSessionFull(sessionId: string): Observable<FullSessionResponse> {
    return this.http.get<FullSessionResponse>(environment.API_URL + '/session/' + sessionId + '/full');
  }

  getRrwebChunks(sessionId: string): Observable<RrwebChunksResponse> {
    return this.http.get<RrwebChunksResponse>(
      environment.API_URL + '/session/' + sessionId + '/rrweb-chunks'
    );
  }

  annotateSession(
    sessionId: string,
    body: { starred?: boolean; addTag?: string; removeTag?: string; note?: string }
  ): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(
      environment.API_URL + '/session/' + sessionId + '/annotate',
      body
    );
  }
}
