import { CANVAS_W, CANVAS_H } from '../constants.js';

export class RadialMenu {
  constructor() {
    this.visible = false;
    this.cx = 0;
    this.cy = 0;
    this.options = [];
    this.innerRadius = 40;
    this.outerRadius = 120;
    this.hoveredIndex = -1;
    this.dragging = false;
  }

  open(x, y, options) {
    const margin = this.outerRadius + 10;
    this.cx = Math.max(margin, Math.min(CANVAS_W - margin, x));
    this.cy = Math.max(margin, Math.min(CANVAS_H - margin, y));
    this.options = options;
    this.visible = true;
    this.hoveredIndex = -1;
    this.dragging = true;
  }

  close() {
    this.visible = false;
    this.options = [];
    this.hoveredIndex = -1;
    this.dragging = false;
  }

  /** Get the start and sweep angles for a slice */
  _sliceAngles(index) {
    const count = this.options.length;
    const sliceAngle = (Math.PI * 2) / count;
    const startAngle = -Math.PI / 2 + index * sliceAngle;
    return { startAngle, endAngle: startAngle + sliceAngle, midAngle: startAngle + sliceAngle / 2 };
  }

  updateHover(x, y) {
    if (!this.visible) return;
    this.hoveredIndex = -1;
    const dx = x - this.cx;
    const dy = y - this.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.innerRadius || dist > this.outerRadius + 15) return;

    // Find which slice the pointer is in
    let angle = Math.atan2(dy, dx);
    const count = this.options.length;
    const sliceAngle = (Math.PI * 2) / count;
    // Shift so first slice starts at -PI/2
    let normalized = angle + Math.PI / 2;
    if (normalized < 0) normalized += Math.PI * 2;
    const idx = Math.floor(normalized / sliceAngle) % count;
    this.hoveredIndex = idx;
  }

  hitTest(x, y) {
    if (!this.visible) return -1;
    const dx = x - this.cx;
    const dy = y - this.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= this.innerRadius && dist <= this.outerRadius + 15) {
      let angle = Math.atan2(dy, dx);
      const count = this.options.length;
      const sliceAngle = (Math.PI * 2) / count;
      let normalized = angle + Math.PI / 2;
      if (normalized < 0) normalized += Math.PI * 2;
      const idx = Math.floor(normalized / sliceAngle) % count;
      return idx;
    }

    // Outside the menu entirely
    if (dist > this.outerRadius + 50) return -2;
    return -1;
  }

  draw(ctx) {
    if (!this.visible) return;
    const count = this.options.length;
    if (count === 0) return;

    // Dim area around menu
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, this.outerRadius + 50, 0, Math.PI * 2);
    ctx.fill();

    const sliceAngle = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const opt = this.options[i];
      const { startAngle, endAngle, midAngle } = this._sliceAngles(i);
      const isHovered = i === this.hoveredIndex && !opt.disabled;

      // Draw donut slice
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, this.outerRadius + (isHovered ? 8 : 0), startAngle, endAngle);
      ctx.arc(this.cx, this.cy, this.innerRadius, endAngle, startAngle, true);
      ctx.closePath();

      if (opt.disabled) {
        ctx.fillStyle = '#3a3a3a';
      } else if (isHovered) {
        ctx.fillStyle = '#ffd54f';
      } else {
        ctx.fillStyle = '#e8c170';
      }
      ctx.fill();

      // Slice border (skip for single option — full circle has no seams)
      if (count > 1) {
        ctx.strokeStyle = isHovered ? '#ff8f00' : 'rgba(30,20,10,0.6)';
        ctx.lineWidth = isHovered ? 2.5 : 1.5;
        ctx.stroke();
      } else {
        // Just an outer ring for the single slice
        ctx.strokeStyle = isHovered ? '#ff8f00' : 'rgba(30,20,10,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, this.outerRadius + (isHovered ? 8 : 0), 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, this.innerRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Single option: icon in ring, label just below it — no separator line
      if (count === 1) {
        const ringMid = (this.innerRadius + this.outerRadius) / 2;

        if (opt.icon) {
          ctx.font = '26px serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = opt.disabled ? '#666' : '#1a1a2e';
          ctx.fillText(opt.icon, this.cx, this.cy - ringMid);
        }

        // Label directly below icon
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(opt.label, this.cx, this.cy - ringMid + 16);
        continue;
      }

      // Label and icon positioned in the middle of the donut ring
      const labelR = (this.innerRadius + this.outerRadius) / 2 + (isHovered ? 4 : 0);
      const lx = this.cx + Math.cos(midAngle) * labelR;
      const ly = this.cy + Math.sin(midAngle) * labelR;

      // Icon (if present)
      const hasIcon = opt.icon;
      ctx.fillStyle = opt.disabled ? '#666' : '#1a1a2e';

      if (hasIcon) {
        ctx.font = '18px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(opt.icon, lx, ly - 8);

        // Label text below icon
        ctx.font = 'bold 10px monospace';
        ctx.fillText(opt.label, lx, ly + 10);
      } else {
        // Text only — split into lines if needed
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const words = opt.label.split(' ');
        if (words.length > 1 && opt.label.length > 10) {
          ctx.fillText(words[0], lx, ly - 7);
          ctx.font = 'bold 10px monospace';
          ctx.fillText(words.slice(1).join(' '), lx, ly + 7);
        } else {
          ctx.fillText(opt.label, lx, ly);
        }
      }
    }

    // Center circle (dead zone)
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, this.innerRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}
