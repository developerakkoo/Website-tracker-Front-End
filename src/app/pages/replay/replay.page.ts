import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  SessionService,
  SessionInfo,
  ReplayEvent,
  FullSessionPage,
  FullSessionResponse
} from 'src/app/services/session';
import { HttpErrorResponse } from '@angular/common/http';
import { ReplayEngine } from './replay-engine';
import { ScrollAnimator } from './scroll-animator';
import { VirtualCursor } from './virtual-cursor';
import {
  buildActivityTimeline,
  countInteractions,
  formatDeviceShort,
  formatRelativeTime,
  formatWatchDuration,
  HumanTimelineRow,
  pagePathShort,
  pageTitleFromUrl,
  pagesLabel,
  pagesVisitedCount,
} from 'src/app/utils/session-display';

interface RippleEntry {
  element: HTMLElement;
  removeAtElapsed: number;
}

@Component({
  selector: 'app-replay',
  templateUrl: './replay.page.html',
  styleUrls: ['./replay.page.scss'],
  standalone: false
})
export class ReplayPage implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('replayFrame', { static: false }) replayFrame!: ElementRef<HTMLIFrameElement>;
  @ViewChild('viewportContainer', { static: false }) viewportContainer!: ElementRef<HTMLElement>;

  sessionId = '';
  session: SessionInfo | null = null;
  events: ReplayEvent[] = [];
  replayPages: FullSessionPage[] = [];
  multiPageMode = false;
  currentReplayPageIndex = 0;
  timelineSegments: { pageIndex: number; widthPct: number; url: string }[] = [];

  error = '';
  loading = true;
  private snapshotInjected = false;

  isPlaying = false;
  speed = 1;

  replayViewportWidth = 0;
  replayViewportHeight = 0;
  replayScale = 1;
  iframeFade = false;

  /** Layout: desktop 2-column vs mobile tabs */
  wideViewport = false;
  replayTab: 'player' | 'summary' = 'player';

  activityTimeline: HumanTimelineRow[] = [];
  visibleTimeline: HumanTimelineRow[] = [];
  showAllTimeline = false;
  showSessionId = false;
  expandedTimelineIndex: number | null = null;

  private engine: ReplayEngine | null = null;
  private scrollAnimator = new ScrollAnimator();
  private cursor = new VirtualCursor();
  private ripples: RippleEntry[] = [];

  get hasSnapshot(): boolean {
    if (this.multiPageMode && this.replayPages[this.currentReplayPageIndex]) {
      const s = this.replayPages[this.currentReplayPageIndex].snapshot;
      return typeof s === 'string' && s.trim().length > 0;
    }
    const s = this.session?.snapshot;
    return typeof s === 'string' && s.trim().length > 0;
  }

  get hasViewport(): boolean {
    if (this.multiPageMode && this.replayPages[this.currentReplayPageIndex]?.viewport) {
      const v = this.replayPages[this.currentReplayPageIndex].viewport;
      return !!(v && typeof v.width === 'number' && typeof v.height === 'number');
    }
    const v = this.session?.viewport;
    return !!(v && typeof v.width === 'number' && typeof v.height === 'number');
  }

  get headerSubtitle(): string {
    const title = pageTitleFromUrl(this.session?.url || this.currentUrlDisplay);
    const when = formatRelativeTime(this.session?.startedAt);
    return `${title} · ${when}`;
  }

  get visitDurationLabel(): string {
    return formatWatchDuration(this.session?.duration);
  }

  get deviceFriendlyLabel(): string {
    return formatDeviceShort(this.session?.deviceType);
  }

  get screenSizeLabel(): string {
    const v = this.session?.viewport || this.session?.screen;
    if (v?.width && v?.height) return `${v.width} × ${v.height} screen`;
    return '';
  }

  get pagesVisitedLabel(): string {
    return pagesLabel(this.multiPageMode ? this.replayPages.length : 1);
  }

  pageTitle(url?: string): string {
    return pageTitleFromUrl(url);
  }

  formatRelativeTime = formatRelativeTime;

  get interactionsLabel(): string {
    const n = countInteractions(this.events);
    return n === 1 ? '1 interaction' : `${n} interactions`;
  }

  get startingPageLabel(): string {
    return pagePathShort(this.session?.url || this.currentUrlDisplay) || '—';
  }

  get deviceBadgeLabel(): string {
    const d = (this.session?.deviceType || 'desktop').toLowerCase();
    if (d === 'android' || d === 'ios') return 'Mobile';
    if (d === 'tablet') return 'Tablet';
    return 'Desktop';
  }

  get scaledWidth(): number {
    return Math.round(this.replayViewportWidth * this.replayScale) || 1;
  }

  get scaledHeight(): number {
    return Math.round(this.replayViewportHeight * this.replayScale) || 1;
  }

  get pageIndicator(): string {
    if (!this.multiPageMode) return '';
    return `Page ${this.currentReplayPageIndex + 1} of ${this.replayPages.length}`;
  }

  get currentUrlDisplay(): string {
    if (this.multiPageMode && this.replayPages[this.currentReplayPageIndex]?.url) {
      return this.replayPages[this.currentReplayPageIndex].url;
    }
    return this.session?.url || '';
  }

  get canSkipToNextPage(): boolean {
    if (!this.multiPageMode || !this.engine) return false;
    const next = this.engine.findNextPageFirstEventIndex(
      this.engine.getCurrentEventIndex(),
      this.currentReplayPageIndex
    );
    return next >= 0;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sessionService: SessionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.sessionId = this.route.snapshot.paramMap.get('sessionId') || '';
    if (!this.sessionId) {
      this.error = 'Missing session';
      this.loading = false;
      return;
    }
    this.loadSession();
    this.updateWideViewport();
  }

  private refreshActivityTimeline(): void {
    this.activityTimeline = buildActivityTimeline(this.events, 50);
    this.updateVisibleTimeline();
  }

  updateVisibleTimeline(): void {
    const max = this.showAllTimeline ? this.activityTimeline.length : 20;
    this.visibleTimeline = this.activityTimeline.slice(0, max);
  }

  toggleShowAllTimeline(): void {
    this.showAllTimeline = !this.showAllTimeline;
    this.updateVisibleTimeline();
  }

  toggleTimelineDetail(index: number): void {
    this.expandedTimelineIndex = this.expandedTimelineIndex === index ? null : index;
  }

  async copySessionId(): Promise<void> {
    if (!this.sessionId || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(this.sessionId);
    } catch {
      /* ignore */
    }
  }

  goToRecordings(): void {
    void this.router.navigate(['/sessions']);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateWideViewport();
    this.updateScale();
  }

  private updateWideViewport(): void {
    this.wideViewport = typeof window !== 'undefined' && window.innerWidth >= 1024;
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    if (this.engine) {
      this.engine.destroy();
      this.engine = null;
    }
    this.scrollAnimator.cancel();
    this.cursor.destroy();
    this.clearRipples();
  }

  updateScale(): void {
    if (!this.hasViewport || !this.viewportContainer?.nativeElement) return;
    const el = this.viewportContainer.nativeElement;
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    const scale = Math.min(1, w / this.replayViewportWidth, h / this.replayViewportHeight);
    this.replayScale = scale;
    this.cdr.markForCheck();
  }

  ngAfterViewChecked(): void {
    if (!this.session || this.loading || this.snapshotInjected || !this.replayFrame?.nativeElement) return;
    if (this.events.length === 0 && !this.hasSnapshot) return;
    this.snapshotInjected = true;
    this.injectSnapshot();
  }

  private loadSession(): void {
    this.sessionService.getSessionFull(this.sessionId).subscribe({
      next: (full) => this.applyFullSession(full),
      error: (err: HttpErrorResponse) => {
        if (err.status === 404) {
          this.loading = false;
          this.error = err.error?.message || 'This recording is not available';
          return;
        }
        this.loadLegacySession();
      },
    });
  }

  private applyFullSession(full: FullSessionResponse): void {
    this.replayPages = full.pages || [];
    this.multiPageMode = this.replayPages.length > 1;
    const flat: ReplayEvent[] = [];
    this.replayPages.forEach((p, idx) => {
      (p.events || []).forEach((e) => {
        flat.push({ ...e, pageIndex: e.pageIndex != null ? e.pageIndex : idx });
      });
    });
    flat.sort((a, b) => a.timestamp - b.timestamp);
    this.events = flat;

    this.session = {
      snapshot: this.replayPages[0]?.snapshot || '',
      startedAt: full.startedAt || this.replayPages[0]?.startedAt || '',
      duration: full.totalDuration || 0,
      eventCount: flat.length,
      viewport: full.sessionViewport || this.replayPages[0]?.viewport,
      deviceType: full.deviceType,
      url: this.replayPages[0]?.url
    };

    this.updateViewportForCurrentPage();
    this.buildTimelineSegments();
    this.refreshActivityTimeline();
    this.loading = false;
    this.initEngine();
    setTimeout(() => {
      this.updateScale();
      this.snapshotInjected = false;
      this.cdr.detectChanges();
    }, 0);
  }

  private loadLegacySession(): void {
    this.sessionService.getSession(this.sessionId).subscribe({
      next: (s) => {
        this.session = s;
        this.multiPageMode = false;
        this.replayPages = [];
        if (s.viewport?.width != null && s.viewport?.height != null) {
          this.replayViewportWidth = s.viewport.width;
          this.replayViewportHeight = s.viewport.height;
        }
        this.sessionService.getSessionEvents(this.sessionId).subscribe({
          next: (evs) => {
            this.events = evs;
            this.refreshActivityTimeline();
            this.loading = false;
            this.initEngine();
            setTimeout(() => {
              this.updateScale();
              this.snapshotInjected = false;
              this.cdr.detectChanges();
            }, 0);
          },
          error: (err: HttpErrorResponse) => {
            this.loading = false;
            this.error =
              err.status === 404
                ? err.error?.message || 'This recording is not available'
                : 'Failed to load recording';
          }
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.error =
          err.status === 404
            ? err.error?.message || 'This recording is not available'
            : 'Failed to load recording';
      }
    });
  }

  private buildTimelineSegments(): void {
    if (!this.multiPageMode || this.events.length === 0) {
      this.timelineSegments = [];
      return;
    }
    const t0 = this.events[0].timestamp;
    const t1 = this.events[this.events.length - 1].timestamp;
    const span = Math.max(1, t1 - t0);
    const byPage: Record<number, { min: number; max: number }> = {};
    this.events.forEach((e) => {
      const pi = e.pageIndex ?? 0;
      if (!byPage[pi]) byPage[pi] = { min: e.timestamp, max: e.timestamp };
      else {
        byPage[pi].min = Math.min(byPage[pi].min, e.timestamp);
        byPage[pi].max = Math.max(byPage[pi].max, e.timestamp);
      }
    });
    const raw = this.replayPages.map((p, idx) => {
      const r = byPage[idx];
      const w = r ? (r.max - r.min) / span : 1 / this.replayPages.length;
      return { pageIndex: idx, widthPct: Math.max(0.01, w), url: p.url || '' };
    });
    const sum = raw.reduce((a, s) => a + s.widthPct, 0) || 1;
    this.timelineSegments = raw.map((s) => ({
      ...s,
      widthPct: (s.widthPct / sum) * 100
    }));
  }

  private updateViewportForCurrentPage(): void {
    const p = this.replayPages[this.currentReplayPageIndex];
    const v = p?.viewport || this.session?.viewport;
    if (v?.width != null && v?.height != null) {
      this.replayViewportWidth = v.width;
      this.replayViewportHeight = v.height;
    }
  }

  private initEngine(): void {
    if (this.engine) return;
    this.engine = new ReplayEngine({
      onApplyEvent: (ev, elapsed) => this.handleApplyEvent(ev, elapsed),
      onRestart: () => this.handleRestart(),
      onPlaybackEnd: () => this.handlePlaybackEnd(),
      onFrame: (elapsed, deltaTime) => this.handleFrame(elapsed, deltaTime)
    });
    this.engine.setEvents(this.events);
  }

  private stripScripts(html: string): string {
    return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  }

  private injectSnapshot(): void {
    if (!this.replayFrame?.nativeElement) return;
    const iframe = this.replayFrame.nativeElement;
    const doc = iframe.contentDocument;
    if (!doc) return;
    let html = '';
    if (this.multiPageMode) {
      const snap = this.replayPages[this.currentReplayPageIndex]?.snapshot;
      html = typeof snap === 'string' && snap.trim() ? this.stripScripts(snap) : '<html><body><p>No snapshot</p></body></html>';
    } else if (this.hasSnapshot) {
      html = this.stripScripts(this.session!.snapshot!);
    } else {
      html = '<html><body><p>No snapshot</p></body></html>';
    }
    doc.open();
    doc.write(html);
    doc.close();
    this.cursor.create(doc);
  }

  private switchReplayPage(pageIndex: number, withFade: boolean): void {
    if (pageIndex === this.currentReplayPageIndex && this.snapshotInjected) return;
    this.currentReplayPageIndex = pageIndex;
    this.updateViewportForCurrentPage();
    if (withFade) {
      this.iframeFade = true;
      setTimeout(() => {
        this.scrollAnimator.cancel();
        this.cursor.destroy();
        this.clearRipples();
        this.injectSnapshot();
        const win = this.replayFrame?.nativeElement?.contentWindow;
        if (win) win.scrollTo(0, 0);
        this.cursor.reset();
        this.iframeFade = false;
        this.cdr.markForCheck();
      }, 150);
    } else {
      this.scrollAnimator.cancel();
      this.cursor.destroy();
      this.clearRipples();
      this.injectSnapshot();
      const win = this.replayFrame?.nativeElement?.contentWindow;
      if (win) win.scrollTo(0, 0);
    }
    this.updateScale();
    this.cdr.markForCheck();
  }

  private handleApplyEvent(ev: ReplayEvent, elapsed: number): void {
    const pi = ev.pageIndex ?? 0;
    if (this.multiPageMode && pi !== this.currentReplayPageIndex) {
      this.switchReplayPage(pi, true);
    }

    if (ev.type === 'navigation') {
      return;
    }

    const iframe = this.replayFrame?.nativeElement;
    const win = iframe?.contentWindow;
    const doc = iframe?.contentDocument;
    if (!win || !doc) return;

    if (ev.type === 'scroll' && ev.data.scrollY != null) {
      this.scrollAnimator.animateTo(win, ev.data.scrollY, 200);
    } else if (ev.type === 'mousemove' && ev.data.x != null && ev.data.y != null) {
      this.cursor.setTarget(ev.data.x, ev.data.y);
    } else if (ev.type === 'click' && ev.data.x != null && ev.data.y != null) {
      this.addRipple(doc, ev.data.x, ev.data.y, elapsed);
    }
  }

  private addRipple(doc: Document, x: number, y: number, elapsed: number): void {
    const div = doc.createElement('div');
    div.className = 'replay-ripple';
    div.style.position = 'fixed';
    div.style.left = (x - 12) + 'px';
    div.style.top = (y - 12) + 'px';
    div.style.width = '24px';
    div.style.height = '24px';
    div.style.borderRadius = '50%';
    div.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
    div.style.pointerEvents = 'none';
    div.style.zIndex = '999998';
    div.style.transform = 'scale(0.3)';
    div.style.opacity = '1';
    div.style.transition = 'transform 200ms ease-out, opacity 400ms ease-out';
    doc.body.appendChild(div);
    requestAnimationFrame(() => {
      div.style.transform = 'scale(1)';
      div.style.opacity = '0';
    });
    this.ripples.push({ element: div, removeAtElapsed: elapsed + 400 });
  }

  private clearRipples(): void {
    for (const r of this.ripples) {
      r.element.remove();
    }
    this.ripples = [];
  }

  private handleRestart(): void {
    this.currentReplayPageIndex = 0;
    this.updateViewportForCurrentPage();
    this.scrollAnimator.cancel();
    this.cursor.destroy();
    this.clearRipples();
    this.injectSnapshot();
    const win = this.replayFrame?.nativeElement?.contentWindow;
    if (win) win.scrollTo(0, 0);
  }

  private handlePlaybackEnd(): void {
    this.isPlaying = false;
  }

  private handleFrame(elapsed: number, deltaTime: number): void {
    this.scrollAnimator.update(deltaTime);
    this.cursor.update(deltaTime);
    let i = 0;
    while (i < this.ripples.length) {
      if (this.ripples[i].removeAtElapsed <= elapsed) {
        this.ripples[i].element.remove();
        this.ripples.splice(i, 1);
      } else {
        i++;
      }
    }
  }

  play(): void {
    if (!this.engine || this.isPlaying || this.events.length === 0) return;
    this.isPlaying = true;
    this.engine.play();
  }

  pause(): void {
    if (!this.engine) return;
    this.engine.pause();
    this.isPlaying = false;
  }

  restart(): void {
    if (!this.engine || this.events.length === 0) return;
    this.engine.restart();
    this.isPlaying = false;
  }

  setSpeed(s: number): void {
    this.speed = s;
    if (this.engine) this.engine.setSpeed(s);
  }

  skipToNextPage(): void {
    if (!this.engine || !this.multiPageMode) return;
    this.pause();
    this.isPlaying = false;
    const nextIdx = this.engine.findNextPageFirstEventIndex(
      this.engine.getCurrentEventIndex(),
      this.currentReplayPageIndex
    );
    if (nextIdx < 0) return;
    const targetPage = this.events[nextIdx].pageIndex ?? 0;
    this.switchReplayPage(targetPage, true);
    this.engine.setPlaybackState(nextIdx);
    this.cdr.markForCheck();
  }

  jumpToPageSegment(pageIndex: number): void {
    if (!this.engine || !this.multiPageMode) return;
    this.pause();
    this.isPlaying = false;
    const idx = this.events.findIndex((e) => (e.pageIndex ?? 0) === pageIndex);
    if (idx < 0) return;
    this.switchReplayPage(pageIndex, true);
    this.engine.setPlaybackState(idx);
    this.cdr.markForCheck();
  }
}
