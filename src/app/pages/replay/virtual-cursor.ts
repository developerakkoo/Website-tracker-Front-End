const RADIUS = 5;
const LERP_FACTOR = 0.15;

export class VirtualCursor {
  private element: HTMLDivElement | null = null;
  private currentX = 0;
  private currentY = 0;
  private targetX = 0;
  private targetY = 0;

  create(doc: Document): void {
    if (this.element) return;
    const div = doc.createElement('div');
    div.style.position = 'fixed';
    div.style.width = RADIUS * 2 + 'px';
    div.style.height = RADIUS * 2 + 'px';
    div.style.borderRadius = '50%';
    div.style.backgroundColor = 'rgba(0, 120, 215, 0.8)';
    div.style.pointerEvents = 'none';
    div.style.zIndex = '999999';
    div.style.left = '0px';
    div.style.top = '0px';
    div.style.transform = 'translate(-50%, -50%)';
    div.style.boxSizing = 'border-box';
    doc.body.appendChild(div);
    this.element = div;
    this.currentX = 0;
    this.currentY = 0;
    this.targetX = 0;
    this.targetY = 0;
  }

  setTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  update(deltaMs: number): void {
    if (!this.element) return;
    const t = Math.min(1, (deltaMs / 16) * LERP_FACTOR * 4);
    this.currentX += (this.targetX - this.currentX) * t;
    this.currentY += (this.targetY - this.currentY) * t;
    this.element.style.left = this.currentX + 'px';
    this.element.style.top = this.currentY + 'px';
  }

  reset(): void {
    this.currentX = 0;
    this.currentY = 0;
    this.targetX = 0;
    this.targetY = 0;
    if (this.element) {
      this.element.style.left = '0px';
      this.element.style.top = '0px';
    }
  }

  destroy(): void {
    if (this.element?.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}
