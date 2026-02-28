function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export class ScrollAnimator {
  private win: Window | null = null;
  private startY = 0;
  private targetY = 0;
  private startTime = 0;
  private elapsed = 0;
  private duration = 200;
  private active = false;

  animateTo(win: Window, targetY: number, durationMs = 200): void {
    this.win = win;
    this.startY = win.scrollY ?? 0;
    this.targetY = targetY;
    this.startTime = 0;
    this.elapsed = 0;
    this.duration = durationMs;
    this.active = true;
  }

  update(deltaMs: number): boolean {
    if (!this.active || !this.win) return false;
    this.elapsed += deltaMs;
    const progress = Math.min(1, this.elapsed / this.duration);
    const eased = easeOutQuad(progress);
    const scrollY = this.startY + (this.targetY - this.startY) * eased;
    this.win.scrollTo(0, scrollY);
    if (progress >= 1) {
      this.active = false;
      this.win = null;
      return false;
    }
    return true;
  }

  cancel(): void {
    this.active = false;
    this.win = null;
  }
}
