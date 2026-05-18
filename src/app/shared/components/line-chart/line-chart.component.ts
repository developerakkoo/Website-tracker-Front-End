import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

export interface LineChartPoint {
  date: string;
  value: number;
}

interface PlotPoint {
  x: number;
  y: number;
  date: string;
  value: number;
}

@Component({
  selector: 'app-line-chart',
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.scss'],
  standalone: false,
})
export class LineChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() data: LineChartPoint[] = [];
  @Input() color = '';
  @Input() label = '';
  @Input() xLabelStep = 7;

  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLElement>;

  width = 600;
  height = 220;
  padding = { left: 40, right: 12, top: 12, bottom: 30 };

  linePath = '';
  areaPath = '';
  gridLines: { y: number; label: string }[] = [];
  xLabels: { x: number; text: string }[] = [];
  dots: PlotPoint[] = [];
  gradientId = `areaGrad-${Math.random().toString(36).slice(2, 9)}`;

  tooltipVisible = false;
  tooltipX = 0;
  tooltipY = 0;
  tooltipDate = '';
  tooltipValue = '';

  private resizeObserver: ResizeObserver | null = null;
  strokeColor = '';

  ngAfterViewInit(): void {
    this.strokeColor = this.resolveColor();
    this.resizeObserver = new ResizeObserver(() => this.rebuild());
    this.resizeObserver.observe(this.hostRef.nativeElement);
    this.rebuild();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['xLabelStep']) {
      this.rebuild();
    }
    if (changes['color']) {
      this.strokeColor = this.resolveColor();
      this.rebuild();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.dots.length) {
      this.tooltipVisible = false;
      return;
    }
    const rect = this.hostRef.nativeElement.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    let closest = this.dots[0];
    let minDist = Math.abs(localX - closest.x);
    for (const d of this.dots) {
      const dist = Math.abs(localX - d.x);
      if (dist < minDist) {
        minDist = dist;
        closest = d;
      }
    }
    this.tooltipVisible = true;
    this.tooltipX = closest.x;
    this.tooltipY = closest.y - 8;
    this.tooltipDate = closest.date;
    this.tooltipValue = String(closest.value);
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.tooltipVisible = false;
  }

  private resolveColor(): string {
    if (this.color && !this.color.startsWith('var(')) {
      return this.color;
    }
    const el = this.hostRef?.nativeElement;
    if (!el) return 'var(--ion-color-primary)';
    const computed = getComputedStyle(el).getPropertyValue('--ion-color-primary').trim();
    return computed || '#3880ff';
  }

  private rebuild(): void {
    const el = this.hostRef?.nativeElement;
    if (!el) return;
    this.width = Math.max(el.clientWidth || 300, 200);
    this.strokeColor = this.resolveColor();

    const pts = this.data || [];
    const innerW = this.width - this.padding.left - this.padding.right;
    const innerH = this.height - this.padding.top - this.padding.bottom;

    if (!pts.length) {
      this.linePath = '';
      this.areaPath = '';
      this.dots = [];
      this.gridLines = [];
      this.xLabels = [];
      return;
    }

    const maxVal = Math.max(...pts.map((p) => p.value), 1);
    const yMax = maxVal * 1.1 || 1;

    const plot: PlotPoint[] = pts.map((p, i) => {
      const x =
        this.padding.left +
        (pts.length === 1 ? innerW / 2 : (i / (pts.length - 1)) * innerW);
      const y = this.padding.top + innerH - (p.value / yMax) * innerH;
      return { x, y, date: p.date, value: p.value };
    });

    this.dots = plot;
    this.linePath = this.buildSmoothPath(plot);
    const baseY = this.padding.top + innerH;
    this.areaPath = `${this.linePath} L ${plot[plot.length - 1].x} ${baseY} L ${plot[0].x} ${baseY} Z`;

    const gridCount = 5;
    this.gridLines = [];
    for (let i = 0; i <= gridCount; i++) {
      const ratio = i / gridCount;
      const y = this.padding.top + innerH - ratio * innerH;
      const val = Math.round(yMax * ratio);
      this.gridLines.push({ y, label: String(val) });
    }

    this.xLabels = plot
      .map((p, i) => ({ p, i }))
      .filter(({ i }) => i % this.xLabelStep === 0 || i === plot.length - 1)
      .map(({ p }) => ({
        x: p.x,
        text: p.date.slice(5),
      }));
  }

  private buildSmoothPath(points: PlotPoint[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y}`;
    }
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  }
}
