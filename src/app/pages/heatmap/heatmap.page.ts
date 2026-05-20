import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToastController } from '@ionic/angular';
import {
  HeatmapResponse,
  HeatmapService,
  HeatmapStats,
} from 'src/app/services/heatmap';
import { Projects } from 'src/app/services/projects';
import { ProjectContextService } from 'src/app/services/project-context.service';
import { environment } from 'src/environments/environment';
import { buildInstallationSnippet, getTrackerDomain } from 'src/app/utils/tracker-snippet';
import { Subject, debounceTime, takeUntil } from 'rxjs';

export type HeatmapType = 'click' | 'scroll' | 'attention';
export type ColorScheme = 'hot' | 'gray' | 'green';

export interface TopInteraction {
  x: number;
  y: number;
  count: number;
}

export interface ScrollBand {
  label: string;
  value: number;
  percent: number;
}

@Component({
  selector: 'app-heatmap',
  templateUrl: './heatmap.page.html',
  styleUrls: ['./heatmap.page.scss'],
  standalone: false,
})
export class HeatmapPage implements OnInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('iframe', { static: false }) iframeRef!: ElementRef<HTMLIFrameElement>;
  @ViewChild('viewerWrapper', { static: false }) viewerWrapperRef!: ElementRef<HTMLElement>;

  projectId = '';
  projectName = '';
  projectApiKey = '';
  trackerDomain = '';

  urls: string[] = [];
  selectedUrl = '';
  selectedType: HeatmapType = 'click';
  selectedDevice = 'all';

  overlayOpacity = 0.7;
  colorScheme: ColorScheme = 'hot';

  loadingUrls = false;
  loading = false;
  error = '';
  exporting = false;

  data: HeatmapResponse | null = null;
  stats: HeatmapStats | null = null;
  topInteractions: TopInteraction[] = [];
  scrollBands: ScrollBand[] = [];

  urlSearch = '';
  urlPopoverOpen = false;
  statsModalOpen = false;

  private destroy$ = new Subject<void>();
  private opacityChange$ = new Subject<number>();
  private rafId: number | null = null;
  private drawGeneration = 0;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    private route: ActivatedRoute,
    private heatmapService: HeatmapService,
    private projectsService: Projects,
    private sanitizer: DomSanitizer,
    private projectContext: ProjectContextService,
    private toastCtrl: ToastController
  ) {
    this.trackerDomain = getTrackerDomain(environment.API_URL);
  }

  get isLoading(): boolean {
    return this.loadingUrls || this.loading;
  }

  get isEmpty(): boolean {
    if (this.loadingUrls) return false;
    if (this.urls.length === 0) return true;
    if (this.data && this.data.maxValue === 0) return true;
    return false;
  }

  get filteredUrls(): string[] {
    const q = this.urlSearch.trim().toLowerCase();
    if (!q) return this.urls;
    return this.urls.filter((u) => u.toLowerCase().includes(q));
  }

  get iframeSrc(): SafeResourceUrl {
    const url = this.selectedUrl || 'about:blank';
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  ngOnInit(): void {
    this.projectId =
      this.route.snapshot.paramMap.get('projectId') ||
      this.projectContext.activeProjectId ||
      '';
    if (!this.projectId) {
      this.error = 'Missing project';
      return;
    }

    void this.projectContext.setActiveProjectById(this.projectId);

    this.opacityChange$
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => this.scheduleDraw());

    this.projectsService
      .getProjectById(this.projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (p) => {
          this.projectName = p?.name || 'Heatmaps';
          this.projectApiKey = p?.apiKey || '';
          if (p?._id) void this.projectContext.setActiveProject(p);
        },
        error: () => {
          this.projectName = 'Heatmaps';
        },
      });

    this.loadUrls();
  }

  ngOnDestroy(): void {
    this.cancelDraw();
    this.resizeObserver?.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByUrl(_index: number, url: string): string {
    return url;
  }

  trackByInteraction(_index: number, item: TopInteraction): string {
    return `${item.x}-${item.y}`;
  }

  trackByBand(_index: number, band: ScrollBand): string {
    return band.label;
  }

  truncateUrl(url: string, max = 40): string {
    if (!url) return 'Select URL';
    return url.length <= max ? url : url.slice(0, max - 1) + '…';
  }

  formatLastUpdated(iso: string | undefined): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  }

  onOpacityChange(value: number): void {
    this.overlayOpacity = value;
    this.opacityChange$.next(value);
  }

  onTypeChange(): void {
    this.loadHeatmap();
  }

  onDeviceChange(): void {
    this.loadHeatmap();
  }

  onColorSchemeChange(): void {
    this.scheduleDraw();
  }

  selectUrl(url: string): void {
    this.selectedUrl = url;
    this.urlPopoverOpen = false;
    this.loadHeatmap();
  }

  openUrlPopover(): void {
    this.urlSearch = '';
    this.urlPopoverOpen = true;
  }

  refresh(): void {
    this.loadUrls(true);
  }

  loadUrls(fromRefresh = false): void {
    this.loadingUrls = true;
    this.heatmapService
      .getHeatmapUrls(this.projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.urls = res.urls || [];
          this.loadingUrls = false;
          const queryUrl = this.route.snapshot.queryParamMap.get('url');
          if (queryUrl && this.urls.includes(queryUrl)) {
            this.selectedUrl = queryUrl;
          } else if (this.urls.length && !this.selectedUrl) {
            this.selectedUrl = this.urls[0];
          }
          if (this.selectedUrl) {
            this.loadHeatmap();
          }
          if (fromRefresh) void this.showToast('Heatmap refreshed', 'success');
        },
        error: () => {
          this.loadingUrls = false;
          this.urls = [];
          if (fromRefresh) void this.showToast('Refresh failed', 'danger');
        },
      });
  }

  loadHeatmap(): void {
    if (!this.selectedUrl) return;
    this.loading = true;
    this.error = '';
    this.heatmapService
      .getHeatmap(this.projectId, this.selectedUrl, this.selectedType, this.selectedDevice)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.data = res;
          this.stats = this.heatmapService.deriveStats(res);
          this.computeTopInteractions();
          this.computeScrollBands();
          this.loading = false;
          this.setupResizeObserver();
          this.scheduleDraw();
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.message || 'Failed to load heatmap';
          this.data = null;
          this.stats = null;
          this.topInteractions = [];
          this.scrollBands = [];
        },
      });
  }

  private computeTopInteractions(): void {
    this.topInteractions = [];
    if (!this.data?.grid || (this.selectedType !== 'click' && this.selectedType !== 'attention')) {
      return;
    }
    const grid = this.data.grid;
    const list: TopInteraction[] = [];
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < (grid[y]?.length ?? 0); x++) {
        const count = grid[y][x] || 0;
        if (count > 0) list.push({ x, y, count });
      }
    }
    list.sort((a, b) => b.count - a.count);
    this.topInteractions = list.slice(0, 10);
  }

  private computeScrollBands(): void {
    this.scrollBands = [];
    if (!this.data?.grid || this.selectedType !== 'scroll') return;
    const row = this.data.grid[0] || [];
    const bands: ScrollBand[] = [];
    let maxBand = 0;
    for (let b = 0; b < 10; b++) {
      let sum = 0;
      for (let i = b * 10; i < (b + 1) * 10 && i < row.length; i++) {
        sum += row[i] || 0;
      }
      if (sum > maxBand) maxBand = sum;
      bands.push({
        label: `${b * 10}–${(b + 1) * 10}%`,
        value: sum,
        percent: 0,
      });
    }
    this.scrollBands = bands.map((band) => ({
      ...band,
      percent: maxBand > 0 ? (band.value / maxBand) * 100 : 0,
    }));
  }

  get topInteractionMax(): number {
    return this.topInteractions[0]?.count || 1;
  }

  buildInstallationSnippet(): string {
    if (!this.projectApiKey) return '';
    return buildInstallationSnippet(this.trackerDomain, this.projectApiKey);
  }

  async copySnippet(): Promise<void> {
    const snippet = this.buildInstallationSnippet();
    if (!snippet) {
      await this.showToast('No snippet available', 'danger');
      return;
    }
    try {
      await navigator.clipboard.writeText(snippet);
      await this.showToast('Snippet copied!', 'success');
    } catch {
      await this.showToast('Could not copy snippet', 'danger');
    }
  }

  async exportPng(): Promise<void> {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || this.isEmpty) {
      await this.showToast('Nothing to export', 'danger');
      return;
    }
    this.exporting = true;
    try {
      const w = canvas.width;
      const h = canvas.height;
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const ctx = off.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // html2canvas is not installed in this project — export heatmap canvas overlay only.
      // To composite iframe + overlay, add html2canvas and capture viewerWrapperRef here.
      ctx.drawImage(canvas, 0, 0);

      const dataUrl = off.toDataURL('image/png');
      const date = new Date().toISOString().slice(0, 10);
      const filename = `heatmap-${this.selectedType}-${this.selectedDevice}-${date}.png`;
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      link.click();
      await this.showToast('Heatmap exported', 'success');
    } catch {
      await this.showToast('Export failed', 'danger');
    } finally {
      this.exporting = false;
    }
  }

  private setupResizeObserver(): void {
    const el = this.viewerWrapperRef?.nativeElement;
    if (!el || typeof ResizeObserver === 'undefined') return;
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => this.scheduleDraw());
    this.resizeObserver.observe(el);
  }

  private cancelDraw(): void {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.drawGeneration++;
  }

  scheduleDraw(): void {
    if (!this.data || this.isEmpty) return;
    this.cancelDraw();
    const gen = this.drawGeneration;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (gen !== this.drawGeneration) return;
      this.drawHeatmap();
    });
  }

  private drawHeatmap(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.data?.grid) return;

    const w = canvas.offsetWidth || 400;
    const h = Math.max(canvas.offsetHeight || 400, 400);
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);

    if (this.selectedType === 'scroll') {
      ctx.save();
      ctx.globalAlpha = this.overlayOpacity;
      this.drawScrollBars(ctx, w, h);
      ctx.restore();
      this.drawLegend(ctx, w, h);
      return;
    }

    const cells = this.buildCellList();
    const gen = this.drawGeneration;
    let index = 0;
    const batchSize = 200;
    const maxVal = this.data.maxValue || 1;
    const rows = this.data.grid.length;
    const cols = rows > 0 ? (this.data.grid[0]?.length ?? 0) : 0;
    const cellW = cols > 0 ? w / cols : w;
    const cellH = rows > 0 ? h / rows : h;
    const legendH = 16;
    const drawH = h - legendH - 8;

    const drawBatch = () => {
      if (gen !== this.drawGeneration) return;
      ctx.save();
      ctx.globalAlpha = this.overlayOpacity;
      const end = Math.min(index + batchSize, cells.length);
      for (let i = index; i < end; i++) {
        const { x, y, v } = cells[i];
        const t = maxVal > 0 ? v / maxVal : 0;
        const { r, g, b } = this.intensityToRgb(t);
        const alpha = 0.3 + 0.6 * t;
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        const drawCellH = (cellH * drawH) / h;
        ctx.fillRect(x * cellW, y * drawCellH, cellW + 1, drawCellH + 1);
      }
      ctx.restore();
      index = end;
      if (index < cells.length) {
        this.rafId = requestAnimationFrame(drawBatch);
      } else {
        this.rafId = null;
        this.drawLegend(ctx, w, h);
      }
    };

    drawBatch();
  }

  private buildCellList(): { x: number; y: number; v: number }[] {
    const list: { x: number; y: number; v: number }[] = [];
    const grid = this.data?.grid || [];
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < (grid[y]?.length ?? 0); x++) {
        const v = grid[y][x] || 0;
        if (v > 0) list.push({ x, y, v });
      }
    }
    return list;
  }

  private drawScrollBars(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const legendH = 24;
    const chartH = h - legendH - 16;
    const rowH = chartH / 10;
    const labelW = 72;
    const maxVal = this.data?.maxValue || 1;

    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ion-text-color') || '#000';

    for (let b = 0; b < 10; b++) {
      const band = this.scrollBands[b];
      const value = band?.value ?? 0;
      const y = 8 + b * rowH;
      const barW = ((w - labelW - 16) * value) / maxVal;

      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ion-color-medium') || '#666';
      ctx.fillText(band?.label ?? `${b * 10}–${(b + 1) * 10}%`, 8, y + rowH * 0.65);

      const t = maxVal > 0 ? value / maxVal : 0;
      const { r, g, b: blue } = this.intensityToRgb(t);
      ctx.fillStyle = `rgba(${r},${g},${blue},0.85)`;
      ctx.fillRect(labelW, y + 2, Math.max(barW, 2), rowH - 6);
    }
  }

  private drawLegend(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const legendH = 16;
    const y = h - legendH - 4;
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    const stops = 20;
    for (let i = 0; i <= stops; i++) {
      const t = i / stops;
      const { r, g, b } = this.intensityToRgb(t);
      grad.addColorStop(t, `rgb(${r},${g},${b})`);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, w, legendH);

    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ion-text-color') || '#000';
    ctx.fillText('Low', 4, y + 12);
    const highW = ctx.measureText('High').width;
    ctx.fillText('High', w - highW - 4, y + 12);
  }

  private intensityToRgb(t: number): { r: number; g: number; b: number } {
    const clamped = Math.max(0, Math.min(1, t));
    if (this.colorScheme === 'gray') {
      const v = Math.round(255 - clamped * 204);
      return { r: v, g: v, b: v };
    }
    if (this.colorScheme === 'green') {
      const r = Math.round(255 - clamped * 200);
      const g = Math.round(255 - clamped * 40);
      const b = Math.round(255 - clamped * 215);
      return { r, g, b };
    }
    // hot: blue -> green -> yellow -> red
    if (clamped <= 0.33) {
      const u = clamped / 0.33;
      return { r: Math.round(30 + 50 * u), g: Math.round(60 + 140 * u), b: Math.round(255 - 100 * u) };
    }
    if (clamped <= 0.66) {
      const u = (clamped - 0.33) / 0.33;
      return { r: Math.round(80 + 175 * u), g: Math.round(200 + 55 * u), b: Math.round(155 - 155 * u) };
    }
    const u = (clamped - 0.66) / 0.34;
    return { r: Math.round(255), g: Math.round(255 - 215 * u), b: Math.round(40 - 40 * u) };
  }

  private async showToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'bottom',
      color,
    });
    await toast.present();
  }
}
