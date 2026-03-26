import { CANVAS_W, CANVAS_H } from '../constants.js';

export class RadialMenu {
  constructor() {
    this.visible = false;
    this.cx = 0;
    this.cy = 0;
    this.options = [];
    this.radius = 55;
    this.itemRadius = 24;
    this.hoveredIndex = -1;  // for drag highlight
    this.dragging = false;   // true after pointerdown opened the menu
  }

  open(x, y, options) {
    // Clamp so the menu + items stay on screen
    const margin = this.radius + this.itemRadius + 4;
    this.cx = Math.max(margin, Math.min(CANVAS_W - margin, x));
    this.cy = Math.max(margin, Math.min(CANVAS_H - margin, y));
    this.options = options;
    this.visible = true;
    this.hoveredIndex = -1;
    this.dragging = true;  // opened via pointerdown, enable drag-release
  }

  close() {
    this.visible = false;
    this.options = [];
    this.hoveredIndex = -1;
    this.dragging = false;
  }

  updateHover(x, y) {
    if (!this.visible) return;
    this.hoveredIndex = -1;
    for (let i = 0; i < this.options.length; i++) {
      const pos = this.getOptionPos(i);
      const dx = x - pos.x;
      const dy = y - pos.y;
      if (dx * dx + dy * dy < this.itemRadius * this.itemRadius) {
        this.hoveredIndex = i;
        return;
      }
    }
  }

  hitTest(x, y) {
    if (!this.visible) return -1;
    for (let i = 0; i < this.options.length; i++) {
      const pos = this.getOptionPos(i);
      const dx = x - pos.x;
      const dy = y - pos.y;
      if (dx * dx + dy * dy < this.itemRadius * this.itemRadius) {
        return i;
      }
    }
    const dx = x - this.cx;
    const dy = y - this.cy;
    if (dx * dx + dy * dy > (this.radius + 50) * (this.radius + 50)) {
      return -2;
    }
    return -1;
  }

  getOptionPos(index) {
    const count = this.options.length;
    if (count === 1) {
      return { x: this.cx, y: this.cy - this.radius };
    }
    const startAngle = -Math.PI / 2;
    const angle = startAngle + (index / count) * Math.PI * 2;
    return {
      x: this.cx + Math.cos(angle) * this.radius,
      y: this.cy + Math.sin(angle) * this.radius,
    };
  }

  draw(ctx) {
    if (!this.visible) return;

    // Dim background
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, this.radius + 40, 0, Math.PI * 2);
    ctx.fill();

    // Draw options
    for (let i = 0; i < this.options.length; i++) {
      const pos = this.getOptionPos(i);
      const opt = this.options[i];

      const isHovered = i === this.hoveredIndex && !opt.disabled;
      ctx.fillStyle = opt.disabled ? '#555' : isHovered ? '#ffd54f' : '#e8c170';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isHovered ? this.itemRadius + 3 : this.itemRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isHovered ? '#ff8f00' : '#333';
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.stroke();

      ctx.fillStyle = opt.disabled ? '#888' : '#1a1a2e';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const words = opt.label.split(' ');
      if (words.length > 1) {
        ctx.fillText(words[0], pos.x, pos.y - 6);
        ctx.fillText(words.slice(1).join(' '), pos.x, pos.y + 6);
      } else {
        ctx.fillText(opt.label, pos.x, pos.y);
      }
    }
  }
}
