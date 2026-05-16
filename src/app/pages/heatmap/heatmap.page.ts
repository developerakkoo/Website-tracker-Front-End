import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HeatmapService, HeatmapResponse } from 'src/app/services/heatmap';
import { Projects } from 'src/app/services/projects';
import { ProjectContextService } from 'src/app/services/project-context.service';

@Component({
  selector: 'app-heatmap',
  templateUrl: './heatmap.page.html',
  styleUrls: ['./heatmap.page.scss'],
  standalone: false
})
export class HeatmapPage implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('iframe', { static: false }) iframeRef!: ElementRef<HTMLIFrameElement>;

  projectId = '';
  projectName = '';
  urls: string[] = [];
  selectedUrl = '';
  selectedType: 'click' | 'scroll' | 'attention' = 'click';
  selectedDevice = 'all';

  loading = false;
  loadingUrls = false;
  error = '';
  data: HeatmapResponse | null = null;
  topClicked: { x: number; y: number; count: number }[] = [];

  private drawScheduled = false;

  constructor(
    private route: ActivatedRoute,
    private heatmapService: HeatmapService,
    private projectsService: Projects,
    private sanitizer: DomSanitizer,
    private projectContext: ProjectContextService
  ) {}

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
    this.projectsService.getProjectById(this.projectId).subscribe({
      next: (p) => {
        this.projectName = p?.name || 'Heatmaps';
        if (p?._id) {
          void this.projectContext.setActiveProject(p);
        }
      },
      error: () => {
        this.projectName = 'Heatmaps';
      },
    });
    this.loadUrls();
  }

  ngOnDestroy(): void {}

  loadUrls(): void {
    this.loadingUrls = true;
    this.heatmapService.getHeatmapUrls(this.projectId).subscribe({
      next: (res) => {
        this.urls = res.urls || [];
        this.loadingUrls = false;
        if (this.urls.length && !this.selectedUrl) this.selectedUrl = this.urls[0];
        if (this.selectedUrl) this.loadHeatmap();
      },
      error: () => {
        this.loadingUrls = false;
        this.urls = [];
      }
    });
  }

  onUrlChange(): void {
    this.loadHeatmap();
  }

  onTypeChange(): void {
    this.loadHeatmap();
  }

  onDeviceChange(): void {
    this.loadHeatmap();
  }

  loadHeatmap(): void {
    if (!this.selectedUrl) return;
    this.loading = true;
    this.error = '';
    this.heatmapService.getHeatmap(
      this.projectId,
      this.selectedUrl,
      this.selectedType,
      this.selectedDevice
    ).subscribe({
      next: (res) => {
        this.data = res;
        this.computeTopClicked();
        this.loading = false;
        this.scheduleDraw();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to load heatmap';
        this.data = null;
        this.topClicked = [];
      }
    });
  }

  private computeTopClicked(): void {
    this.topClicked = [];
    if (!this.data?.grid || this.selectedType !== 'click') return;
    const grid = this.data.grid;
    const list: { x: number; y: number; count: number }[] = [];
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < (grid[y]?.length ?? 0); x++) {
        const count = grid[y][x] || 0;
        if (count > 0) list.push({ x, y, count });
      }
    }
    list.sort((a, b) => b.count - a.count);
    this.topClicked = list.slice(0, 10);
  }

  ngAfterViewChecked(): void {
    this.scheduleDraw();
  }

  private scheduleDraw(): void {
    if (this.drawScheduled || !this.data) return;
    this.drawScheduled = true;
    requestAnimationFrame(() => {
      this.drawHeatmap();
      this.drawScheduled = false;
    });
  }

  private drawHeatmap(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.data?.grid) return;

    const grid = this.data.grid;
    const maxVal = this.data.maxValue || 1;
    const w = canvas.offsetWidth || 400;
    const h = canvas.offsetHeight || 300;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rows = grid.length;
    const cols = rows > 0 ? (grid[0]?.length ?? 0) : 0;
    if (rows === 0 || cols === 0) return;

    const cellW = w / cols;
    const cellH = h / rows;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const v = grid[y][x] || 0;
        const t = maxVal > 0 ? v / maxVal : 0;
        const { r, g, b } = this.intensityToRgb(t);
        ctx.fillStyle = `rgba(${r},${g},${b},${0.3 + 0.6 * t})`;
        ctx.fillRect(x * cellW, y * cellH, cellW + 1, cellH + 1);
      }
    }
  }

  private intensityToRgb(t: number): { r: number; g: number; b: number } {
    if (t <= 0) return { r: 30, g: 60, b: 255 };
    if (t >= 1) return { r: 255, g: 40, b: 40 };
    const r = Math.round(30 + (255 - 30) * t);
    const g = Math.round(60 + (40 - 60) * t);
    const b = Math.round(255 + (40 - 255) * t);
    return { r, g, b };
  }

  get iframeSrc(): SafeResourceUrl {
    const url = this.selectedUrl || 'about:blank';
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
