import { ReplayEvent } from 'src/app/services/session';

export interface ReplayEngineCallbacks {
  onApplyEvent(ev: ReplayEvent, elapsed: number): void;
  onRestart(): void;
  onPlaybackEnd(): void;
  onFrame(elapsed: number, deltaTime: number): void;
}

export class ReplayEngine {
  isPlaying = false;
  playbackStartTime = 0;
  pausedElapsedTime = 0;
  speedMultiplier = 1;
  currentEventIndex = 0;

  private events: ReplayEvent[] = [];
  private baseTime = 0;
  private rafId: number | null = null;
  private lastFrameTime: number | null = null;

  private onApplyEvent: (ev: ReplayEvent, elapsed: number) => void;
  private onRestart: () => void;
  private onPlaybackEnd: () => void;
  private onFrame: (elapsed: number, deltaTime: number) => void;

  constructor(callbacks: ReplayEngineCallbacks) {
    this.onApplyEvent = callbacks.onApplyEvent;
    this.onRestart = callbacks.onRestart;
    this.onPlaybackEnd = callbacks.onPlaybackEnd;
    this.onFrame = callbacks.onFrame;
  }

  setEvents(events: ReplayEvent[]): void {
    this.events = [...events].sort((a, b) => a.timestamp - b.timestamp);
    this.baseTime = this.events.length > 0 ? this.events[0].timestamp : 0;
  }

  getEvents(): ReplayEvent[] {
    return this.events;
  }

  getBaseTime(): number {
    return this.baseTime;
  }

  getCurrentEventIndex(): number {
    return this.currentEventIndex;
  }

  seekToEventIndex(targetIndex: number): void {
    this.pause();
    if (targetIndex < 0) targetIndex = 0;
    if (targetIndex > this.events.length) targetIndex = this.events.length;
    this.currentEventIndex = 0;
    this.pausedElapsedTime = 0;
    for (let i = 0; i < targetIndex; i++) {
      const ev = this.events[i];
      this.onApplyEvent(ev, ev.timestamp - this.baseTime);
    }
    this.currentEventIndex = targetIndex;
    this.pausedElapsedTime =
      targetIndex > 0 ? this.events[targetIndex - 1].timestamp - this.baseTime : 0;
  }

  setPlaybackState(eventIndex: number): void {
    this.pause();
    if (eventIndex < 0) eventIndex = 0;
    if (eventIndex > this.events.length) eventIndex = this.events.length;
    this.currentEventIndex = eventIndex;
    this.pausedElapsedTime =
      eventIndex > 0 ? this.events[eventIndex - 1].timestamp - this.baseTime : 0;
  }

  findNextPageFirstEventIndex(fromIndex: number, currentPageIndex: number): number {
    for (let i = fromIndex; i < this.events.length; i++) {
      const pi = this.events[i].pageIndex ?? 0;
      if (pi > currentPageIndex) return i;
    }
    return -1;
  }

  play(): void {
    if (this.isPlaying || this.currentEventIndex >= this.events.length) return;
    this.playbackStartTime = performance.now();
    this.isPlaying = true;
    this.lastFrameTime = null;
    this.rafId = requestAnimationFrame(this.update);
  }

  pause(): void {
    if (!this.isPlaying) return;
    this.pausedElapsedTime = (performance.now() - this.playbackStartTime) * this.speedMultiplier;
    this.isPlaying = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  restart(): void {
    this.pause();
    this.currentEventIndex = 0;
    this.pausedElapsedTime = 0;
    this.onRestart();
  }

  setSpeed(multiplier: number): void {
    this.speedMultiplier = multiplier;
  }

  destroy(): void {
    this.pause();
    this.rafId = null;
    this.onApplyEvent = () => {};
    this.onRestart = () => {};
    this.onPlaybackEnd = () => {};
    this.onFrame = () => {};
  }

  private update = (currentTime: number): void => {
    if (!this.isPlaying) return;
    const currentElapsed = this.pausedElapsedTime + (currentTime - this.playbackStartTime) * this.speedMultiplier;
    while (
      this.currentEventIndex < this.events.length &&
      this.events[this.currentEventIndex].timestamp - this.baseTime <= currentElapsed
    ) {
      const ev = this.events[this.currentEventIndex++];
      this.onApplyEvent(ev, currentElapsed);
    }
    const deltaTime = this.lastFrameTime !== null ? currentTime - this.lastFrameTime : 0;
    this.lastFrameTime = currentTime;
    this.onFrame(currentElapsed, deltaTime);
    if (this.currentEventIndex >= this.events.length) {
      this.isPlaying = false;
      this.onPlaybackEnd();
    }
    if (this.isPlaying) {
      this.rafId = requestAnimationFrame(this.update);
    }
  };
}
