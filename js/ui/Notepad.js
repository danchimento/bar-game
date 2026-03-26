import { CANVAS_H } from '../constants.js';

export class Notepad {
  constructor() {
    this.orders = [];
    this.visible = true;
  }

  addOrder(guestId, seatId, drink) {
    this.orders.push({ guestId, seatId, drink, fulfilled: false });
  }

  markFulfilled(guestId) {
    const order = this.orders.find(o => o.guestId === guestId && !o.fulfilled);
    if (order) order.fulfilled = true;
  }

  removeGuest(guestId) {
    this.orders = this.orders.filter(o => o.guestId !== guestId);
  }

  getUnfulfilled() {
    return this.orders.filter(o => !o.fulfilled);
  }

  toggle() {
    this.visible = !this.visible;
  }

  draw(ctx) {
    if (!this.visible) return;

    const unfulfilled = this.getUnfulfilled();
    if (unfulfilled.length === 0) return;

    const x = 10;
    const w = 160;
    const lineH = 20;
    const h = 30 + unfulfilled.length * lineH;
    const y = CANVAS_H - h - 10;

    // Background
    ctx.fillStyle = 'rgba(255, 248, 220, 0.92)';
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();

    // Title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Orders', x + 10, y + 7);

    // Entries
    ctx.font = '11px monospace';
    unfulfilled.forEach((order, i) => {
      ctx.fillStyle = '#555';
      ctx.fillText(`Seat ${order.seatId + 1}: ${order.drink}`, x + 10, y + 26 + i * lineH);
    });
  }
}
