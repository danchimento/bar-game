import {
  CANVAS_W, CANVAS_H, COLORS,
  BAR_TOP_Y, SERVICE_MAT_Y, WALK_TRACK_Y, STATION_Y, STATION_LABEL_Y,
  GUEST_Y, SEAT_Y, SEATS, STATIONS, BAR_LEFT, BAR_RIGHT,
  MOOD_MAX, GUEST_STATE,
} from '../constants.js';
import { DRINKS, GLASSES } from '../data/menu.js';

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

    ctx.fillStyle = COLORS.FLOOR;
    ctx.fillRect(0, BAR_TOP_Y, CANVAS_W, CANVAS_H - BAR_TOP_Y);

    ctx.fillStyle = '#252540';
    ctx.fillRect(0, 36, CANVAS_W, BAR_TOP_Y - 36);

    ctx.fillStyle = COLORS.BAR_TOP;
    ctx.fillRect(BAR_LEFT - 10, BAR_TOP_Y, BAR_RIGHT - BAR_LEFT + 20, 35);

    ctx.fillStyle = COLORS.BAR_FRONT;
    ctx.fillRect(BAR_LEFT - 10, BAR_TOP_Y + 35, BAR_RIGHT - BAR_LEFT + 20, 10);

    ctx.fillStyle = 'rgba(60, 50, 40, 0.3)';
    ctx.fillRect(BAR_LEFT, WALK_TRACK_Y - 15, BAR_RIGHT - BAR_LEFT, 30);

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
      ctx.fillStyle = COLORS.STATION_BG;
      ctx.strokeStyle = COLORS.STATION_BORDER;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(st.x - 40, STATION_Y - 28, 80, 56, 8);
      ctx.fill();
      ctx.stroke();

      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(st.icon, st.x, STATION_Y);

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

  drawCashOnBar(cashMap) {
    const ctx = this.ctx;
    for (const [seatId] of cashMap) {
      const seat = SEATS[seatId];
      // Cash on the bar top
      ctx.fillStyle = '#2d6b2e';
      ctx.beginPath();
      ctx.roundRect(seat.x - 14, BAR_TOP_Y + 4, 28, 18, 3);
      ctx.fill();
      ctx.strokeStyle = '#1a4a1a';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#4caf50';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', seat.x, BAR_TOP_Y + 13);
    }
  }

  drawGuests(guests) {
    const ctx = this.ctx;
    for (const guest of guests) {
      if (guest.state === 'DONE') continue;

      const x = guest.x;
      const y = guest.y;

      ctx.fillStyle = guest.guestType === 'quick' ? '#c49464' : '#d4a574';
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = guest.getMoodColor();
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#5a3a1a';
      ctx.beginPath();
      ctx.arc(x, y - 9, 9, Math.PI, 0);
      ctx.fill();

      const indicator = guest.getIndicator();
      if (indicator) {
        ctx.font = '18px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(indicator, x, y - 24);
      }

      // Drink order label — shows temporarily after order is taken, fades out
      if (guest.currentDrink && guest.orderRevealTimer > 0) {
        const alpha = Math.min(1, guest.orderRevealTimer / 1.0); // fade over last 1s
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = '10px monospace';
        const drinkName = DRINKS[guest.currentDrink]?.name || guest.currentDrink;
        const tw = ctx.measureText(drinkName).width + 12;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.roundRect(x - tw / 2, y - 46, tw, 16, 3);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(drinkName, x, y - 38);
        ctx.restore();
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

    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + 16, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.BARTENDER;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.BARTENDER_APRON;
    ctx.beginPath();
    ctx.arc(x, y + 5, 16, 0, Math.PI);
    ctx.fill();

    const eyeX = bartender.facingRight ? x + 5 : x - 5;
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(eyeX, y - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();

    if (bartender.carrying) {
      const label = this.getCarryLabel(bartender.carrying);
      ctx.font = '18px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y - 26);
    }

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
    if (carrying === 'GLASS_PINT') return '🍺';
    if (carrying === 'GLASS_WINE_GLASS') return '🍷';
    if (carrying === 'DIRTY_GLASS') return '🫧';
    if (carrying.startsWith('DRINK_')) {
      const drinkKey = carrying.replace('DRINK_', '');
      return DRINKS[drinkKey]?.icon || '🍺';
    }
    if (carrying.startsWith('CHECK_')) return '🧾';
    return '?';
  }

  drawServiceMat(drinks) {
    const ctx = this.ctx;
    if (drinks.length === 0) return;

    for (const drink of drinks) {
      const drinkDef = DRINKS[drink.drinkType];
      if (!drinkDef) continue;

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

  // ─── GLASS MODAL ──────────────────────────────────

  drawGlassModal(modal) {
    if (!modal.visible) return;
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const glassTypes = Object.keys(GLASSES);
    const btnW = 120;
    const btnH = 100;
    const gap = 25;
    const totalW = glassTypes.length * btnW + (glassTypes.length - 1) * gap;
    const pw = totalW + 60;
    const ph = 200;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;

    ctx.fillStyle = '#1a2a2a';
    ctx.strokeStyle = '#5a8a8a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#8ac';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Select Glass', px + pw / 2, py + 30);

    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.fillText('Choose the right glass for the drink', px + pw / 2, py + 50);

    const startX = px + (pw - totalW) / 2;
    const btnY = py + 65;

    glassTypes.forEach((key, i) => {
      const glass = GLASSES[key];
      const bx = startX + i * (btnW + gap);

      ctx.fillStyle = '#3a3025';
      ctx.beginPath();
      ctx.roundRect(bx, btnY, btnW, btnH, 8);
      ctx.fill();

      ctx.strokeStyle = '#8a7a6a';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = '32px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(glass.icon, bx + btnW / 2, btnY + 38);

      ctx.fillStyle = '#eee';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(glass.name, bx + btnW / 2, btnY + 75);

      ctx.fillStyle = '#888';
      ctx.font = '9px monospace';
      ctx.fillText(`For ${glass.forType}`, bx + btnW / 2, btnY + 90);
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

  // ─── DRINK MODAL ──────────────────────────────────

  drawDrinkModal(modal) {
    if (!modal.visible) return;
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const items = modal.items;
    const btnW = 110;
    const btnH = 100;
    const gap = 20;
    const totalW = items.length * btnW + (items.length - 1) * gap;
    const pw = totalW + 60;
    const ph = 210;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;

    ctx.fillStyle = modal.type === 'beer' ? '#2a1a0a' : '#2a1020';
    ctx.strokeStyle = modal.type === 'beer' ? '#d4a020' : '#8b1a4a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = modal.type === 'beer' ? '#d4a020' : '#d4708a';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(modal.type === 'beer' ? 'Draft Beers' : 'Wines', px + pw / 2, py + 30);

    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.fillText('Tap & hold to pour', px + pw / 2, py + 50);

    const startX = px + (pw - totalW) / 2;
    const btnY = py + 70;

    items.forEach((item, i) => {
      const bx = startX + i * (btnW + gap);
      const drinkDef = DRINKS[item];

      ctx.fillStyle = '#3a3025';
      ctx.beginPath();
      ctx.roundRect(bx, btnY, btnW, btnH, 8);
      ctx.fill();

      ctx.strokeStyle = '#8a7a6a';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = drinkDef.color || '#555';
      ctx.beginPath();
      ctx.roundRect(bx + 4, btnY + btnH - 14, btnW - 8, 10, 4);
      ctx.fill();

      if (modal.pouringIndex === i && modal.pourProgress > 0) {
        ctx.fillStyle = drinkDef.color || '#555';
        ctx.globalAlpha = 0.6;
        const fillH = btnH * modal.pourProgress;
        ctx.beginPath();
        ctx.roundRect(bx, btnY + btnH - fillH, btnW, fillH, 8);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.font = '28px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(drinkDef.icon, bx + btnW / 2, btnY + 36);

      ctx.fillStyle = '#eee';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(drinkDef.name, bx + btnW / 2, btnY + 70);

      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.fillText(`$${drinkDef.price}`, bx + btnW / 2, btnY + 84);
    });

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

  // ─── POS OVERLAY ──────────────────────────────────

  drawPOSOverlay(posState, guests, notepad) {
    if (!posState.visible) return;
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const pw = 500;
    const ph = 380;
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

    if (posState.mode === 'SELECT_SEAT') {
      ctx.fillStyle = '#aaa';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Select a seat:', px + pw / 2, py + 55);

      for (let i = 0; i < SEATS.length; i++) {
        const bx = px + 20 + (i % 3) * 155;
        const by = py + 70 + Math.floor(i / 3) * 55;

        const guest = guests.find(g => g.seatId === i &&
          g.state !== GUEST_STATE.DONE && g.state !== GUEST_STATE.LEAVING &&
          g.state !== GUEST_STATE.ANGRY_LEAVING);
        const active = !!guest;

        ctx.fillStyle = active ? '#2a4a2a' : '#222';
        ctx.beginPath();
        ctx.roundRect(bx, by, 140, 42, 4);
        ctx.fill();

        ctx.strokeStyle = active ? '#4caf50' : '#444';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = active ? '#fff' : '#555';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Seat ${i + 1}`, bx + 12, by + 14);

        if (guest) {
          ctx.fillStyle = '#aaa';
          ctx.font = '10px monospace';
          const stateLabel = guest.state === GUEST_STATE.READY_TO_PAY ? 'Ready to pay' :
            guest.state === GUEST_STATE.WAITING_FOR_DRINK ? 'Waiting' :
            guest.state === GUEST_STATE.ENJOYING ? 'Enjoying' : guest.state;
          ctx.fillText(stateLabel, bx + 12, by + 32);
        } else {
          ctx.fillStyle = '#555';
          ctx.font = '10px monospace';
          ctx.fillText('Empty', bx + 12, by + 32);
        }
      }
    } else if (posState.mode === 'SEAT_VIEW') {
      const seatId = posState.selectedSeat;
      const guest = guests.find(g => g.seatId === seatId &&
        g.state !== GUEST_STATE.DONE && g.state !== GUEST_STATE.LEAVING &&
        g.state !== GUEST_STATE.ANGRY_LEAVING);

      // Back button
      ctx.fillStyle = '#444';
      ctx.beginPath();
      ctx.roundRect(px + 15, py + 40, 60, 25, 4);
      ctx.fill();
      ctx.fillStyle = '#ccc';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('< Back', px + 45, py + 53);

      // Seat title
      ctx.fillStyle = '#4caf50';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Seat ${seatId + 1}`, px + pw / 2, py + 53);

      // Orders for this seat
      ctx.fillStyle = '#aaa';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('Tab:', px + 20, py + 85);

      const orders = notepad.orders.filter(o => o.seatId === seatId);
      let total = 0;
      orders.forEach((order, i) => {
        const drinkDef = DRINKS[order.drink];
        const price = drinkDef?.price || 0;
        total += price;
        ctx.fillStyle = order.fulfilled ? '#6a6' : '#ccc';
        ctx.font = '11px monospace';
        ctx.fillText(
          `${drinkDef?.name || order.drink}  $${price} ${order.fulfilled ? '✓' : ''}`,
          px + 30, py + 105 + i * 18
        );
      });

      // Total
      if (orders.length > 0) {
        const totalY = py + 110 + orders.length * 18;
        ctx.fillStyle = '#4caf50';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`Total: $${total}`, px + 30, totalY);
      }

      // Add drink section
      ctx.fillStyle = '#888';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('Add drink:', px + 20, py + 168);

      const drinks = Object.keys(DRINKS);
      const btnW = 85;
      const btnH = 55;
      const drinksGap = 8;
      const drinksY = py + 180;

      drinks.forEach((key, i) => {
        const drinkDef = DRINKS[key];
        const bx = px + 20 + i * (btnW + drinksGap);

        ctx.fillStyle = '#2a2a1a';
        ctx.beginPath();
        ctx.roundRect(bx, drinksY, btnW, btnH, 4);
        ctx.fill();
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = '16px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(drinkDef.icon, bx + btnW / 2, drinksY + 18);

        ctx.fillStyle = '#ccc';
        ctx.font = '9px monospace';
        ctx.fillText(drinkDef.name, bx + btnW / 2, drinksY + 38);
        ctx.fillStyle = '#888';
        ctx.fillText(`$${drinkDef.price}`, bx + btnW / 2, drinksY + 49);
      });

      // Print Check button
      const canPrint = guest && guest.state === GUEST_STATE.READY_TO_PAY;
      ctx.fillStyle = canPrint ? '#ffc107' : '#333';
      ctx.beginPath();
      ctx.roundRect(px + pw - 160, py + ph - 55, 140, 40, 6);
      ctx.fill();
      ctx.fillStyle = canPrint ? '#000' : '#666';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Print Check', px + pw - 90, py + ph - 35);
    }
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
