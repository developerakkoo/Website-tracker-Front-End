import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface HeatmapResponse {
  grid: number[][];
  maxValue: number;
  updatedAt?: string | null;
}

export interface HeatmapStats {
  totalEvents: number;
  sessionCount: number;
  lastUpdated: string;
}

@Injectable({
  providedIn: 'root',
})
export class HeatmapService {
  constructor(private http: HttpClient) {}

  getHeatmap(
    projectId: string,
    url: string,
    type: string,
    deviceType?: string
  ): Observable<HeatmapResponse> {
    const params: Record<string, string> = { url, type };
    if (deviceType && deviceType !== 'all') {
      params['deviceType'] = deviceType;
    }
    const q = new URLSearchParams(params).toString();
    return this.http.get<HeatmapResponse>(
      `${environment.API_URL}/projects/${projectId}/heatmaps?${q}`
    );
  }

  getHeatmapUrls(projectId: string): Observable<{ urls: string[] }> {
    return this.http.get<{ urls: string[] }>(
      `${environment.API_URL}/projects/${projectId}/heatmaps/urls`
    );
  }

  deriveStats(response: HeatmapResponse): HeatmapStats {
    let totalEvents = 0;
    const grid = response.grid || [];
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y] || [];
      for (let x = 0; x < row.length; x++) {
        totalEvents += row[x] || 0;
      }
    }
    return {
      totalEvents,
      sessionCount: Math.floor(totalEvents / 3),
      lastUpdated: response.updatedAt || new Date().toISOString(),
    };
  }

  getHeatmapStats(
    projectId: string,
    url: string,
    type: string,
    deviceType?: string
  ): Observable<HeatmapStats> {
    return this.getHeatmap(projectId, url, type, deviceType).pipe(
      map((res) => this.deriveStats(res))
    );
  }
}
