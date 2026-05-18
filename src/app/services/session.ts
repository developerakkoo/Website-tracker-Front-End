import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.prod';

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
}

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  constructor(private http: HttpClient) {}

  getProjectSessions(projectId: string): Observable<ProjectSession[]> {
    return this.http.get<ProjectSession[]>(environment.API_URL + '/projects/' + projectId + '/sessions');
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
}
