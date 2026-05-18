import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import {
  AnalyticsService,
  DevicesData,
  EngagementData,
  OverviewStats,
  PageRow,
  PagesData,
  PagesMetric,
  TimeseriesData,
  TimeseriesMetric,
} from 'src/app/services/analytics.service';
import { Projects } from 'src/app/services/projects';
import { ProjectContextService } from 'src/app/services/project-context.service';
import { Subject, catchError, finalize, forkJoin, of, takeUntil } from 'rxjs';

type DaysKey = '7D' | '30D' | '90D';

interface DonutSlice {
  device: string;
  percentage: number;
  sessions: number;
  colorVar: string;
  path: string;
}

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.page.html',
  styleUrls: ['./analytics.page.scss'],
  standalone: false,
})
export class AnalyticsPage implements OnInit, OnDestroy {
  projectId = '';
  projectName = '';
  selectedDaysKey: DaysKey = '30D';
  readonly daysMap: Record<DaysKey, number> = { '7D': 7, '30D': 30, '90D': 90 };

  isLoading = false;
  hasPartialError = false;
  loadFailed = false;

  overview: OverviewStats | null = null;
  timeseries: TimeseriesData | null = null;
  pages: PagesData | null = null;
  devices: DevicesData | null = null;
  engagement: EngagementData | null = null;

  timeseriesMetric: TimeseriesMetric = 'sessions';
  pagesMetric: PagesMetric = 'views';
  showAllPages = false;

  donutSlices: DonutSlice[] = [];
  donutCenterLabel = '';
  donutCenterPct = '';

  private destroy$ = new Subject<void>();

  readonly kpiCards = [
    { key: 'sessions', icon: 'people-outline', label: 'Total Sessions', changeKey: 'totalSessions' as const },
    { key: 'pageviews', icon: 'eye-outline', label: 'Pageviews', changeKey: 'totalPageviews' as const },
    { key: 'visitors', icon: 'person-outline', label: 'Unique Visitors', changeKey: null },
    { key: 'duration', icon: 'time-outline', label: 'Avg Duration', changeKey: null },
    { key: 'bounce', icon: 'return-down-back-outline', label: 'Bounce Rate', changeKey: null },
    { key: 'depth', icon: 'layers-outline', label: 'Pages/Session', changeKey: null },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private analytics: AnalyticsService,
    private projects: Projects,
    private projectContext: ProjectContextService,
    private toastCtrl: ToastController
  ) {}

  get selectedDays(): number {
    return this.daysMap[this.selectedDaysKey];
  }

  get xLabelStep(): number {
    return this.selectedDays <= 7 ? 1 : 7;
  }

  get timeseriesTitle(): string {
    const m = this.timeseriesMetric;
    if (m === 'pageviews') return 'Pageviews Over Time';
    if (m === 'events') return 'Events Over Time';
    return 'Sessions Over Time';
  }

  get visiblePages(): PageRow[] {
    const rows = this.pages?.data || [];
    return this.showAllPages ? rows : rows.slice(0, 5);
  }

  get pagesMaxValue(): number {
    const rows = this.pages?.data || [];
    if (!rows.length) return 1;
    return Math.max(...rows.map((r) => r.value), 1);
  }

  get topViewports() {
    return (this.devices?.viewports || []).slice(0, 5);
  }

  get durationMax(): number {
    const buckets = this.engagement?.durationBuckets || [];
    return Math.max(...buckets.map((b) => b.count), 1);
  }

  get depthMax(): number {
    const buckets = this.engagement?.sessionDepthBuckets || [];
    return Math.max(...buckets.map((b) => b.count), 1);
  }

  ngOnInit(): void {
    this.projectId =
      this.route.snapshot.paramMap.get('projectId') ||
      this.projectContext.activeProjectId ||
      '';
    if (!this.projectId) {
      void this.router.navigate(['/select-project']);
      return;
    }
    void this.projectContext.setActiveProjectById(this.projectId);
    this.projects
      .getProjectById(this.projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (p) => {
          this.projectName = p?.name || 'Analytics';
          if (p?._id) void this.projectContext.setActiveProject(p);
        },
        error: () => {
          this.projectName = 'Analytics';
        },
      });
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onDaysChange(key: DaysKey): void {
    this.selectedDaysKey = key;
    this.loadAll();
  }

  onTimeseriesMetricChange(metric: TimeseriesMetric): void {
    this.timeseriesMetric = metric;
    this.analytics
      .getTimeseries(this.projectId, this.selectedDays, metric)
      .pipe(
        catchError(() => of(null)),
        takeUntil(this.destroy$)
      )
      .subscribe((res) => {
        if (res) this.timeseries = res;
      });
  }

  onPagesMetricChange(metric: PagesMetric): void {
    this.pagesMetric = metric;
    this.showAllPages = false;
    this.loadPages();
  }

  loadAll(): void {
    const days = this.selectedDays;
    this.isLoading = true;
    this.hasPartialError = false;
    this.loadFailed = false;

    forkJoin({
      overview: this.analytics.getOverview(this.projectId, days).pipe(catchError(() => of(null))),
      timeseries: this.analytics
        .getTimeseries(this.projectId, days, this.timeseriesMetric)
        .pipe(catchError(() => of(null))),
      pages: this.analytics
        .getPages(this.projectId, days, this.pagesMetric, 50)
        .pipe(catchError(() => of(null))),
      devices: this.analytics.getDevices(this.projectId, days).pipe(catchError(() => of(null))),
      engagement: this.analytics.getEngagement(this.projectId, days).pipe(catchError(() => of(null))),
    })
      .pipe(
        finalize(() => (this.isLoading = false)),
        takeUntil(this.destroy$)
      )
      .subscribe((result) => {
        const values = Object.values(result);
        const failed = values.filter((v) => v === null).length;
        if (failed === values.length) {
          this.loadFailed = true;
          void this.showToast('Failed to load analytics. Please try again.', 'danger');
          return;
        }
        if (failed > 0) {
          this.hasPartialError = true;
        }
        this.overview = result.overview;
        this.timeseries = result.timeseries;
        this.pages = result.pages;
        this.devices = result.devices;
        this.engagement = result.engagement;
        this.buildDonut();
      });
  }

  loadPages(): void {
    this.analytics
      .getPages(this.projectId, this.selectedDays, this.pagesMetric, 50)
      .pipe(
        catchError(() => of(null)),
        takeUntil(this.destroy$)
      )
      .subscribe((res) => {
        if (res) this.pages = res;
      });
  }

  kpiValue(key: string): string {
    const o = this.overview;
    if (!o) return '—';
    switch (key) {
      case 'sessions':
        return this.formatNumber(o.totalSessions);
      case 'pageviews':
        return this.formatNumber(o.totalPageviews);
      case 'visitors':
        return this.formatNumber(o.uniqueVisitors);
      case 'duration':
        return this.formatDuration(o.avgSessionDuration);
      case 'bounce':
        return `${o.bounceRate}%`;
      case 'depth':
        return String(o.avgPagesPerSession);
      default:
        return '—';
    }
  }

  kpiChange(changeKey: 'totalSessions' | 'totalPageviews' | null): number | null {
    if (!changeKey || !this.overview?.changes) return null;
    return this.overview.changes[changeKey];
  }

  formatDuration(ms: number): string {
    if (!ms || ms < 0) return '0s';
    const sec = Math.floor(ms / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    const rem = sec % 60;
    if (min < 60) return rem > 0 ? `${min}m ${rem}s` : `${min}m`;
    const hr = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${hr}h ${m}m` : `${hr}h`;
  }

  formatNumber(n: number): string {
    if (n == null || Number.isNaN(n)) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  }

  formatChange(change: number | null): { text: string; class: string } {
    if (change == null) return { text: '—', class: 'change-neutral' };
    if (change > 0) return { text: `↑ ${change}%`, class: 'change-up' };
    if (change < 0) return { text: `↓ ${Math.abs(change)}%`, class: 'change-down' };
    return { text: '0%', class: 'change-neutral' };
  }

  truncateUrl(url: string, max = 45): string {
    if (!url) return '';
    return url.length <= max ? url : url.slice(0, max - 1) + '…';
  }

  pageValueLabel(row: PageRow): string {
    if (this.pagesMetric === 'avgScrollDepth') return `${row.value}%`;
    return this.formatNumber(row.value);
  }

  viewHeatmap(url: string): void {
    void this.router.navigate(['/heatmaps', this.projectId], {
      queryParams: { url },
    });
  }

  deviceColorVar(device: string): string {
    const d = (device || '').toLowerCase();
    if (d === 'android') return '--ion-color-success';
    if (d === 'ios') return '--ion-color-danger';
    if (d === 'tablet') return '--ion-color-warning';
    return '--ion-color-primary';
  }

  deviceLabel(device: string): string {
    if (!device || device === 'unknown') return 'Unknown';
    return device.charAt(0).toUpperCase() + device.slice(1);
  }

  private buildDonut(): void {
    const breakdown = this.devices?.breakdown || [];
    if (!breakdown.length) {
      this.donutSlices = [];
      this.donutCenterLabel = '';
      this.donutCenterPct = '';
      return;
    }

    const cx = 50;
    const cy = 50;
    const r = 40;
    const innerR = 26;
    let angle = -Math.PI / 2;

    this.donutSlices = breakdown.map((row) => {
      const sliceAngle = (row.percentage / 100) * Math.PI * 2;
      const x1 = cx + r * Math.cos(angle);
      const y1 = cy + r * Math.sin(angle);
      const x2 = cx + r * Math.cos(angle + sliceAngle);
      const y2 = cy + r * Math.sin(angle + sliceAngle);
      const xi1 = cx + innerR * Math.cos(angle + sliceAngle);
      const yi1 = cy + innerR * Math.sin(angle + sliceAngle);
      const xi2 = cx + innerR * Math.cos(angle);
      const yi2 = cy + innerR * Math.sin(angle);
      const large = sliceAngle > Math.PI ? 1 : 0;
      const path = [
        `M ${x1} ${y1}`,
        `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
        `L ${xi1} ${yi1}`,
        `A ${innerR} ${innerR} 0 ${large} 0 ${xi2} ${yi2}`,
        'Z',
      ].join(' ');
      angle += sliceAngle;
      return {
        device: row.device,
        percentage: row.percentage,
        sessions: row.sessions,
        colorVar: this.deviceColorVar(row.device),
        path,
      };
    });

    const top = breakdown.reduce((a, b) => (b.sessions > a.sessions ? b : a));
    this.donutCenterLabel = this.deviceLabel(top.device);
    this.donutCenterPct = `${top.percentage}%`;
  }

  private async showToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const t = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'bottom',
      color,
    });
    await t.present();
  }
}
