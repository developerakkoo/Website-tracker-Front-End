import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.prod';

export interface HeatmapResponse {
  grid: number[][];
  maxValue: number;
}

@Injectable({
  providedIn: 'root'
})
export class HeatmapService {
  constructor(private http: HttpClient) {}

  getHeatmap(projectId: string, url: string, type: string, deviceType?: string): Observable<HeatmapResponse> {
    let params: Record<string, string> = { url, type };
    if (deviceType && deviceType !== 'all') params['deviceType'] = deviceType;
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
}
