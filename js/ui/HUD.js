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
    const total = this.tips + this.revenue;
    this.stars = 0;
    if (total >= this.starThresholds[1]) this.stars = 1;
    if (total >= this.starThresholds[2]) this.stars = 2;
    if (total >= this.starThresholds[3]) this.stars = 3;
  }

  /** Convert level timer progress to a clock time (6:00 PM → 12:00 AM) */
  formatClock(levelTimer, levelDuration) {
    const progress = Math.min(1, levelTimer / levelDuration);
    // 6 hours from 18:00 to 24:00
    const totalMinutes = Math.floor(progress * 360); // 6h = 360 min
    const hour24 = 18 + Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const displayHour = hour24 >= 24 ? 12 : (hour24 > 12 ? hour24 - 12 : hour24);
    const ampm = hour24 >= 24 ? 'AM' : 'PM';
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  }

  draw(ctx, levelTimer, levelDuration) {
    // Top bar background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_W, 36);

    ctx.textBaseline = 'middle';
    const y = 18;

    // Tips + Revenue
    ctx.fillStyle = '#4caf50';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'left';
    const total = Math.floor(this.tips + this.revenue);
    ctx.fillText(`$${total}`, 14, y);

    // Stars
    ctx.font = '15px monospace';
    ctx.textAlign = 'center';
    const starStr = '⭐'.repeat(this.stars) + '☆'.repeat(3 - this.stars);
    ctx.fillStyle = '#ffc107';
    ctx.fillText(starStr, CANVAS_W / 2, y);

    // Clock
    const clock = this.formatClock(levelTimer || 0, levelDuration || 300);
    const isLate = this.timeRemaining < 30;
    ctx.fillStyle = isLate ? '#f44336' : '#e0e0e0';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(clock, CANVAS_W - 14, y);

    // Floating message
    if (this.message) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      const tw = ctx.measureText(this.message).width + 30;
      ctx.beginPath();
      ctx.roundRect(CANVAS_W / 2 - tw / 2, 44, tw, 26, 4);
      ctx.fill();
      ctx.fillStyle = '#ffc107';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.message, CANVAS_W / 2, 57);
    }
  }
}
