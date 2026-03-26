import {
  CANVAS_W, CANVAS_H, COLORS,
  BAR_TOP_Y, SERVICE_MAT_Y, WALK_TRACK_Y, STATION_Y, STATION_LABEL_Y,
  GUEST_Y, SEAT_Y, SEATS, STATIONS, BAR_LEFT, BAR_RIGHT,
  MOOD_MAX,
} from '../constants.js';
import { DRINKS } from '../data/menu.js';

export class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
  }

  clear() {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.WALL;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  drawBar() {
    const ctx = this.ctx;

    // Floor behind bar
    ctx.fillStyle = COLORS.FLOOR;
    ctx.fillRect(0, BAR_TOP_Y, CANVAS_W, CANVAS_H - BAR_TOP_Y);

    // Guest area floor
    ctx.fillStyle = '#252540';
    ctx.fillRect(0, 36, CANVAS_W, BAR_TOP_Y - 36);

    // Bar counter top surface
    ctx.fillStyle = COLORS.BAR_TOP;
    ctx.fillRect(BAR_LEFT - 10, BAR_TOP_Y, BAR_RIGHT - BAR_LEFT + 20, 35);

    // Bar counter front
    ctx.fillStyle = COLORS.BAR_FRONT;
    ctx.fillRect(BAR_LEFT - 10, BAR_TOP_Y + 35, BAR_RIGHT - BAR_LEFT + 20, 10);

    // Walk track indicator
    ctx.fillStyle = 'rgba(60, 50, 40, 0.3)';
    ctx.fillRect(BAR_LEFT, WALK_TRACK_Y - 15, BAR_RIGHT - BAR_LEFT, 30);

    // Seats
    for (const seat of SEATS) {
      ctx.fillStyle = COLORS.SEAT_EMPTY;
      ctx.beginPath();
      ctx.roundRect(seat.x - 20, SEAT_Y, 40, 32, 4);
      ctx.fill();
      ctx.fillStyle = '#777';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${seat.id + 1}`, seat.x, SEAT_Y + 44);
    }
  }

  drawStations() {
    const ctx = this.ctx;
    for (const st of STATIONS) {
      // Station box — larger, aligned to bottom
      ctx.fillStyle = COLORS.STATION_BG;
      ctx.strokeStyle = COLORS.STATION_BORDER;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(st.x - 40, STATION_Y - 28, 80, 56, 8);
      ctx.fill();
      ctx.stroke();

      // Icon
      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(st.icon, st.x, STATION_Y);

      // Label
      ctx.fillStyle = '#ccc';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(st.label, st.x, STATION_LABEL_Y);
    }
  }

  drawDirtySeats(dirtySeats) {
    const ctx = this.ctx;
    for (const seatId of dirtySeats) {
      const seat = SEATS[seatId];
      ctx.fillStyle = COLORS.SEAT_DIRTY;
      ctx.beginPath();
      ctx.roundRect(seat.x - 20, SEAT_Y, 40, 32, 4);
      ctx.fill();
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.fillText('🍺', seat.x, SEAT_Y + 18);
    }
  }

  drawGuests(guests) {
    const ctx = this.ctx;
    for (const guest of guests) {
      if (guest.state === 'DONE') continue;

      const x = guest.x;
      const y = guest.y;

      // Body (circle) — slightly larger
      ctx.fillStyle = guest.guestType === 'quick' ? '#c49464' : '#d4a574';
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();

      // Mood ring
      ctx.strokeStyle = guest.getMoodColor();
      ctx.lineWidth = 3;
      ctx.stroke();

      // Head/hair
      ctx.fillStyle = '#5a3a1a';
      ctx.beginPath();
      ctx.arc(x, y - 9, 9, Math.PI, 0);
      ctx.fill();

      // Indicator above head
      const indicator = guest.getIndicator();
      if (indicator) {
        ctx.font = '18px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(indicator, x, y - 24);
      }

      // Drink order label — ONLY show after order is taken (WAITING_FOR_DRINK)
      if (guest.currentDrink && guest.state === 'WAITING_FOR_DRINK') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        const drinkName = DRINKS[guest.currentDrink]?.name || guest.currentDrink;
        const tw = ctx.measureText(drinkName).width + 12;
        ctx.beginPath();
        ctx.roundRect(x - tw / 2, y - 46, tw, 16, 3);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(drinkName, x, y - 38);
      }

      // Mood bar
      const barW = 32;
      const barH = 4;
      const barX = x - barW / 2;
      const barY = y + 22;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = guest.getMoodColor();
      ctx.fillRect(barX, barY, barW * (guest.mood / MOOD_MAX), barH);
    }
  }

  drawBartender(bartender) {
    const ctx = this.ctx;
    const x = bartender.x;
    const y = bartender.y;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + 16, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = COLORS.BARTENDER;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();

    // Apron
    ctx.fillStyle = COLORS.BARTENDER_APRON;
    ctx.beginPath();
    ctx.arc(x, y + 5, 16, 0, Math.PI);
    ctx.fill();

    // Face direction indicator
    const eyeX = bartender.facingRight ? x + 5 : x - 5;
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(eyeX, y - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Carrying indicator
    if (bartender.carrying) {
      const label = this.getCarryLabel(bartender.carrying);
      ctx.font = '18px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Draw held item above bartender
      ctx.fillText(label, x, y - 26);
    }

    // Busy indicator (progress bar)
    if (bartender.busy) {
      const bw = 50;
      const bx = x - bw / 2;
      const by = y + 20;
      ctx.fillStyle = '#333';
      ctx.fillRect(bx, by, bw, 5);
      ctx.fillStyle = '#4caf50';
      const progress = 1 - (bartender.busyTimer / bartender.busyDuration);
      ctx.fillRect(bx, by, bw * Math.min(1, progress), 5);

      ctx.fillStyle = '#e0e0e0';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(bartender.busyLabel, x, by + 16);
    }
  }

  getCarryLabel(carrying) {
    if (carrying === 'CLEAN_GLASS') return '🥃';
    if (carrying === 'DIRTY_GLASS') return '🫧';
    if (carrying.startsWith('DRINK_')) {
      const drinkKey = carrying.replace('DRINK_', '');
      return DRINKS[drinkKey]?.icon || '🍺';
    }
    if (carrying.startsWith('CHECK_')) return '🧾';
    if (carrying === 'CASH') return '💵';
    return '?';
  }

  drawServiceMat(drinks) {
    const ctx = this.ctx;
    if (drinks.length === 0) return;

    for (const drink of drinks) {
      const drinkDef = DRINKS[drink.drinkType];
      if (!drinkDef) continue;

      // Larger tap targets on the service mat
      ctx.fillStyle = drinkDef.color || '#ccc';
      ctx.beginPath();
      ctx.roundRect(drink.x - 16, SERVICE_MAT_Y + 1, 32, 24, 4);
      ctx.fill();

      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.fillText(drinkDef.icon, drink.x, SERVICE_MAT_Y + 16);
    }
  }

  drawDrinkModal(modal) {
    if (!modal.visible) return;
    const ctx = this.ctx;

    // Overlay
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const items = modal.items;
    const pw = Math.min(400, 100 + items.length * 120);
    const ph = 200;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;

    // Modal bg
    ctx.fillStyle = modal.type === 'beer' ? '#2a1a0a' : '#2a1020';
    ctx.strokeStyle = modal.type === 'beer' ? '#d4a020' : '#8b1a4a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 12);
    ctx.fill();
    ctx.stroke();

    // Title
    ctx.fillStyle = modal.type === 'beer' ? '#d4a020' : '#d4708a';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(modal.type === 'beer' ? 'Draft Beers' : 'Wines', px + pw / 2, py + 30);

    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.fillText('Tap & hold to pour', px + pw / 2, py + 50);

    // Drink buttons
    const btnW = 90;
    const btnH = 90;
    const totalW = items.length * (btnW + 15) - 15;
    const startX = px + (pw - totalW) / 2;
    const btnY = py + 70;

    items.forEach((item, i) => {
      const bx = startX + i * (btnW + 15);
      const drinkDef = DRINKS[item];

      // Button
      ctx.fillStyle = drinkDef.color || '#555';
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.roundRect(bx, btnY, btnW, btnH, 8);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.strokeStyle = '#888';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Pour progress if active
      if (modal.pouringIndex === i && modal.pourProgress > 0) {
        ctx.fillStyle = drinkDef.color || '#555';
        ctx.globalAlpha = 0.7;
        const fillH = btnH * modal.pourProgress;
        ctx.beginPath();
        ctx.roundRect(bx, btnY + btnH - fillH, btnW, fillH, 8);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Icon
      ctx.font = '28px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(drinkDef.icon, bx + btnW / 2, btnY + 36);

      // Name
      ctx.fillStyle = '#eee';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(drinkDef.name, bx + btnW / 2, btnY + 70);

      // Price
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.fillText(`$${drinkDef.price}`, bx + btnW / 2, btnY + 84);
    });

    // Close button
    ctx.fillStyle = '#f44336';
    ctx.beginPath();
    ctx.roundRect(px + pw - 40, py + 8, 30, 24, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('X', px + pw - 25, py + 20);
  }

  drawPOSOverlay(posState) {
    if (!posState.visible) return;
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const pw = 320;
    const ph = 260;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;

    ctx.fillStyle = '#1a2a1a';
    ctx.strokeStyle = '#4caf50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#4caf50';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('P.O.S. Terminal', px + pw / 2, py + 28);

    if (posState.mode === 'PRINT_CHECK') {
      ctx.fillStyle = '#aaa';
      ctx.font = '12px monospace';
      ctx.fillText('Print check for:', px + pw / 2, py + 55);

      posState.checkButtons.forEach((btn, i) => {
        const bx = px + 30 + (i % 3) * 90;
        const by = py + 75 + Math.floor(i / 3) * 45;
        ctx.fillStyle = btn.active ? '#ffc107' : '#333';
        ctx.beginPath();
        ctx.roundRect(bx, by, 80, 35, 4);
        ctx.fill();
        ctx.fillStyle = btn.active ? '#000' : '#666';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`Seat ${btn.seatId + 1}`, bx + 40, by + 19);
      });
    }

    // Close button
    ctx.fillStyle = '#f44336';
    ctx.beginPath();
    ctx.roundRect(px + pw - 40, py + 8, 30, 24, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('X', px + pw - 25, py + 20);
  }

  drawLevelComplete(hud) {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = '#e8c170';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Level Complete!', CANVAS_W / 2, 160);

    const total = Math.floor(hud.tips + hud.revenue);
    ctx.fillStyle = '#4caf50';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`Total: $${total}`, CANVAS_W / 2, 210);

    ctx.fillStyle = '#aaa';
    ctx.font = '14px monospace';
    ctx.fillText(`Revenue: $${Math.floor(hud.revenue)}  Tips: $${Math.floor(hud.tips)}`, CANVAS_W / 2, 245);

    ctx.font = '40px serif';
    const starStr = '⭐'.repeat(hud.stars) + '☆'.repeat(3 - hud.stars);
    ctx.fillText(starStr, CANVAS_W / 2, 300);

    ctx.fillStyle = '#e8c170';
    ctx.beginPath();
    ctx.roundRect(CANVAS_W / 2 - 80, 340, 160, 45, 6);
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('Play Again', CANVAS_W / 2, 363);
  }

  drawTitleScreen() {
    const ctx = this.ctx;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = '#e8c170';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BAR RUSH', CANVAS_W / 2, 170);

    ctx.fillStyle = '#aaa';
    ctx.font = '14px monospace';
    ctx.fillText('A bartending time-management game', CANVAS_W / 2, 215);

    ctx.fillStyle = '#e8c170';
    ctx.beginPath();
    ctx.roundRect(CANVAS_W / 2 - 90, 270, 180, 50, 8);
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('Start Shift', CANVAS_W / 2, 296);

    ctx.fillStyle = '#666';
    ctx.font = '12px monospace';
    ctx.fillText('Tap guests and stations to serve drinks', CANVAS_W / 2, 380);
    ctx.fillText('Walk to stations, take orders, pour drinks, collect cash', CANVAS_W / 2, 400);
  }
}
