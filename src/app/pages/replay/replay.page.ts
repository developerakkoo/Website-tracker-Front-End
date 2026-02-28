import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SessionService, SessionInfo, ReplayEvent } from 'src/app/services/session';
import { HttpErrorResponse } from '@angular/common/http';
import { ReplayEngine } from './replay-engine';
import { ScrollAnimator } from './scroll-animator';
import { VirtualCursor } from './virtual-cursor';

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
  error = '';
  loading = true;
  private snapshotInjected = false;

  isPlaying = false;
  speed = 1;

  replayViewportWidth = 0;
  replayViewportHeight = 0;
  replayScale = 1;

  private engine: ReplayEngine | null = null;
  private scrollAnimator = new ScrollAnimator();
  private cursor = new VirtualCursor();
  private ripples: RippleEntry[] = [];

  get hasSnapshot(): boolean {
    const s = this.session?.snapshot;
    return typeof s === 'string' && s.trim().length > 0;
  }

  get hasViewport(): boolean {
    const v = this.session?.viewport;
    return !!(v && typeof v.width === 'number' && typeof v.height === 'number');
  }

  get deviceLabel(): string {
    const s = this.session;
    if (!s) return '';
    const device = (s.deviceType || 'Desktop').replace(/^\w/, (c) => c.toUpperCase());
    const size = s.viewport
      ? `${s.viewport.width}×${s.viewport.height}`
      : s.screen
        ? `${s.screen.width}×${s.screen.height}`
        : '—';
    return `${device} · ${size}`;
  }

  get scaledWidth(): number {
    return Math.round(this.replayViewportWidth * this.replayScale) || 1;
  }

  get scaledHeight(): number {
    return Math.round(this.replayViewportHeight * this.replayScale) || 1;
  }

  constructor(
    private route: ActivatedRoute,
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
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateScale();
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
    if (!this.session || !this.events || this.loading || this.snapshotInjected || !this.replayFrame?.nativeElement) return;
    this.snapshotInjected = true;
    this.injectSnapshot();
  }

  private loadSession(): void {
    this.sessionService.getSession(this.sessionId).subscribe({
      next: (s) => {
        this.session = s;
        if (s.viewport?.width != null && s.viewport?.height != null) {
          this.replayViewportWidth = s.viewport.width;
          this.replayViewportHeight = s.viewport.height;
        }
        this.sessionService.getSessionEvents(this.sessionId).subscribe({
          next: (evs) => {
            this.events = evs;
            this.loading = false;
            this.initEngine();
            setTimeout(() => {
              this.updateScale();
              if (!this.snapshotInjected && this.replayFrame?.nativeElement?.contentDocument) {
                this.snapshotInjected = true;
                this.injectSnapshot();
              }
            }, 0);
          },
          error: (err: HttpErrorResponse) => {
            this.loading = false;
            this.error = err.status === 404 ? 'Session not found' : 'Failed to load events';
          }
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.error = err.status === 404 ? 'Session not found' : 'Failed to load session';
      }
    });
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
    doc.open();
    if (this.hasSnapshot) {
      const safe = this.stripScripts(this.session!.snapshot!);
      doc.write(safe);
    } else {
      doc.write('<html><body><p>No snapshot</p></body></html>');
    }
    doc.close();
    this.cursor.create(doc);
  }

  private handleApplyEvent(ev: ReplayEvent, elapsed: number): void {
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
}
