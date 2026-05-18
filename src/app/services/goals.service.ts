import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.prod';

export interface TrackedGoal {
  id: string;
  key: string;
  name: string;
  selector: string;
  urlPattern: string;
  enabled: boolean;
  clicks7d: number;
  uniqueSessions7d: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GoalStatRow {
  goalId: string;
  key: string;
  name: string;
  enabled: boolean;
  clicks: number;
  uniqueSessions: number;
  ctr: number;
  sessionRate: number;
}

export interface GoalsSummary {
  days: number;
  totalSessions: number;
  totalPageviews: number;
  totalClicks: number;
  totalUniqueGoalSessions: number;
  conversionRate: number;
  topGoal: { key: string; name: string; clicks: number } | null;
  goals: GoalStatRow[];
}

export interface GoalsTimeseriesPoint {
  date: string;
  value: number;
}

export interface GoalsTimeseries {
  goalKey: string;
  days: number;
  clicks: GoalsTimeseriesPoint[];
  uniqueSessions: GoalsTimeseriesPoint[];
}

export interface GoalPageRow {
  url: string;
  clicks: number;
}

export interface GoalsPagesData {
  goalKey: string;
  pages: GoalPageRow[];
}

export interface CreateGoalPayload {
  key?: string;
  name?: string;
  selector?: string;
  urlPattern?: string;
  enabled?: boolean;
  template?: 'whatsapp';
}

@Injectable({ providedIn: 'root' })
export class GoalsService {
  private readonly base = environment.API_URL + '/projects';

  constructor(private http: HttpClient) {}

  listGoals(projectId: string, days = 7): Observable<TrackedGoal[]> {
    const params = new HttpParams().set('days', String(days));
    return this.http.get<TrackedGoal[]>(`${this.base}/${projectId}/goals`, { params });
  }

  createGoal(projectId: string, payload: CreateGoalPayload): Observable<TrackedGoal> {
    return this.http.post<TrackedGoal>(`${this.base}/${projectId}/goals`, payload);
  }

  updateGoal(
    projectId: string,
    goalId: string,
    payload: Partial<CreateGoalPayload> & { enabled?: boolean }
  ): Observable<TrackedGoal> {
    return this.http.patch<TrackedGoal>(`${this.base}/${projectId}/goals/${goalId}`, payload);
  }

  deleteGoal(projectId: string, goalId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/${projectId}/goals/${goalId}`);
  }

  getSummary(projectId: string, days: number): Observable<GoalsSummary> {
    const params = new HttpParams().set('days', String(days));
    return this.http.get<GoalsSummary>(`${this.base}/${projectId}/goals/analytics/summary`, { params });
  }

  getTimeseries(projectId: string, goalKey: string, days: number): Observable<GoalsTimeseries> {
    const params = new HttpParams().set('goalKey', goalKey).set('days', String(days));
    return this.http.get<GoalsTimeseries>(`${this.base}/${projectId}/goals/analytics/timeseries`, { params });
  }

  getPages(projectId: string, goalKey: string, days: number): Observable<GoalsPagesData> {
    const params = new HttpParams().set('goalKey', goalKey).set('days', String(days));
    return this.http.get<GoalsPagesData>(`${this.base}/${projectId}/goals/analytics/pages`, { params });
  }

  goalSnippet(key: string, label?: string): string {
    const labelAttr = label ? ` data-wt-goal-label="${label}"` : '';
    return `<a href="YOUR_LINK_HERE" data-wt-goal="${key}"${labelAttr}>Button text</a>`;
  }
}
