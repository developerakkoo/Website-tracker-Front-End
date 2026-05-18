import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.prod';

export interface OverviewChanges {
  totalSessions: number | null;
  totalPageviews: number | null;
}

export interface OverviewStats {
  totalSessions: number;
  totalPageviews: number;
  uniqueVisitors: number;
  avgSessionDuration: number;
  bounceRate: number;
  avgPagesPerSession: number;
  lastSeen: string | null;
  activeToday: number;
  activeThisWeek: number;
  changes: OverviewChanges;
}

export interface TimeseriesPoint {
  date: string;
  value: number;
}

export interface TimeseriesData {
  data: TimeseriesPoint[];
}

export interface PageRow {
  url: string;
  value: number;
  change: number | null;
}

export interface PagesData {
  data: PageRow[];
}

export interface DeviceBreakdownRow {
  device: string;
  sessions: number;
  percentage: number;
}

export interface ViewportRow {
  width: number;
  height: number;
  count: number;
}

export interface DevicesData {
  breakdown: DeviceBreakdownRow[];
  viewports: ViewportRow[];
}

export interface EngagementBucket {
  label: string;
  count: number;
}

export interface EngagementData {
  durationBuckets: EngagementBucket[];
  sessionDepthBuckets: EngagementBucket[];
}

export type TimeseriesMetric = 'sessions' | 'pageviews' | 'events';
export type PagesMetric = 'views' | 'entries' | 'exits' | 'avgScrollDepth';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private base = environment.API_URL;

  constructor(private http: HttpClient) {}

  getOverview(projectId: string, days = 30): Observable<OverviewStats> {
    const params = new HttpParams().set('days', String(days));
    return this.http.get<OverviewStats>(
      `${this.base}/projects/${projectId}/analytics/overview`,
      { params }
    );
  }

  getTimeseries(
    projectId: string,
    days = 30,
    metric: TimeseriesMetric = 'sessions'
  ): Observable<TimeseriesData> {
    const params = new HttpParams().set('days', String(days)).set('metric', metric);
    return this.http.get<TimeseriesData>(
      `${this.base}/projects/${projectId}/analytics/timeseries`,
      { params }
    );
  }

  getPages(
    projectId: string,
    days = 30,
    metric: PagesMetric = 'views',
    limit = 10
  ): Observable<PagesData> {
    const params = new HttpParams()
      .set('days', String(days))
      .set('metric', metric)
      .set('limit', String(limit));
    return this.http.get<PagesData>(
      `${this.base}/projects/${projectId}/analytics/pages`,
      { params }
    );
  }

  getDevices(projectId: string, days = 30): Observable<DevicesData> {
    const params = new HttpParams().set('days', String(days));
    return this.http.get<DevicesData>(
      `${this.base}/projects/${projectId}/analytics/devices`,
      { params }
    );
  }

  getEngagement(projectId: string, days = 30): Observable<EngagementData> {
    const params = new HttpParams().set('days', String(days));
    return this.http.get<EngagementData>(
      `${this.base}/projects/${projectId}/analytics/engagement`,
      { params }
    );
  }
}
