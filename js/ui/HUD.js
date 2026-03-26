import { CANVAS_W } from '../constants.js';

export class HUD {
  constructor() {
    this.tips = 0;
    this.revenue = 0;
    this.timeRemaining = 0;
    this.levelName = '';
    this.stars = 0;
    this.starThresholds = {};
    this.message = '';
    this.messageTimer = 0;
  }

  showMessage(text, duration = 2) {
    this.message = text;
    this.messageTimer = duration;
  }

  update(dt) {
    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) this.message = '';
    }
    // Calculate stars
    const total = this.tips + this.revenue;
    this.stars = 0;
    if (total >= this.starThresholds[1]) this.stars = 1;
    if (total >= this.starThresholds[2]) this.stars = 2;
    if (total >= this.starThresholds[3]) this.stars = 3;
  }

  draw(ctx) {
    // Top bar background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_W, 36);

    ctx.textBaseline = 'middle';
    const y = 18;

    // Tips + Revenue
    ctx.fillStyle = '#4caf50';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    const total = Math.floor(this.tips + this.revenue);
    ctx.fillText(`$${total}`, 12, y);

    // Stars
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    const starStr = '⭐'.repeat(this.stars) + '☆'.repeat(3 - this.stars);
    ctx.fillStyle = '#ffc107';
    ctx.fillText(starStr, CANVAS_W / 2, y);

    // Level name
    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    ctx.fillText(this.levelName, CANVAS_W / 2, y + 0);

    // Timer
    ctx.fillStyle = this.timeRemaining < 30 ? '#f44336' : '#e0e0e0';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'right';
    const min = Math.floor(this.timeRemaining / 60);
    const sec = Math.floor(this.timeRemaining % 60).toString().padStart(2, '0');
    ctx.fillText(`${min}:${sec}`, CANVAS_W - 12, y);

    // Floating message
    if (this.message) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(CANVAS_W / 2 - 120, 45, 240, 28);
      ctx.fillStyle = '#ffc107';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.message, CANVAS_W / 2, 59);
    }
  }
}
