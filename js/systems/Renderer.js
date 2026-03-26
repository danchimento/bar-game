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

    // Service mat area
    ctx.fillStyle = 'rgba(50, 50, 50, 0.4)';
    ctx.fillRect(BAR_LEFT, SERVICE_MAT_Y, BAR_RIGHT - BAR_LEFT, 25);

    // Walk track indicator
    ctx.fillStyle = 'rgba(60, 50, 40, 0.3)';
    ctx.fillRect(BAR_LEFT, WALK_TRACK_Y - 15, BAR_RIGHT - BAR_LEFT, 30);

    // Seats
    for (const seat of SEATS) {
      ctx.fillStyle = COLORS.SEAT_EMPTY;
      ctx.beginPath();
      ctx.roundRect(seat.x - 18, SEAT_Y, 36, 30, 4);
      ctx.fill();
      ctx.fillStyle = '#777';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${seat.id + 1}`, seat.x, SEAT_Y + 40);
    }
  }

  drawStations() {
    const ctx = this.ctx;
    for (const st of STATIONS) {
      // Station box
      ctx.fillStyle = COLORS.STATION_BG;
      ctx.strokeStyle = COLORS.STATION_BORDER;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(st.x - 28, STATION_Y - 22, 56, 44, 6);
      ctx.fill();
      ctx.stroke();

      // Icon
      ctx.font = '18px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(st.icon, st.x, STATION_Y);

      // Label
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.fillText(st.label, st.x, STATION_LABEL_Y);
    }
  }

  drawDirtySeats(dirtySeats) {
    const ctx = this.ctx;
    for (const seatId of dirtySeats) {
      const seat = SEATS[seatId];
      // Dirty indicator
      ctx.fillStyle = COLORS.SEAT_DIRTY;
      ctx.beginPath();
      ctx.roundRect(seat.x - 18, SEAT_Y, 36, 30, 4);
      ctx.fill();
      // Dirty glass icon
      ctx.font = '14px serif';
      ctx.textAlign = 'center';
      ctx.fillText('🍺', seat.x, SEAT_Y + 16);
    }
  }

  drawGuests(guests) {
    const ctx = this.ctx;
    for (const guest of guests) {
      if (guest.state === 'DONE') continue;

      const x = guest.x;
      const y = guest.y;

      // Body (circle)
      ctx.fillStyle = guest.guestType === 'quick' ? '#c49464' : '#d4a574';
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();

      // Mood ring
      ctx.strokeStyle = guest.getMoodColor();
      ctx.lineWidth = 3;
      ctx.stroke();

      // Head/hair
      ctx.fillStyle = '#5a3a1a';
      ctx.beginPath();
      ctx.arc(x, y - 8, 8, Math.PI, 0);
      ctx.fill();

      // Indicator above head
      const indicator = guest.getIndicator();
      if (indicator) {
        ctx.font = '16px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(indicator, x, y - 22);
      }

      // Current drink order (small text if waiting)
      if (guest.currentDrink && (guest.state === 'WAITING_FOR_DRINK' || guest.state === 'READY_TO_ORDER')) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        const drinkName = DRINKS[guest.currentDrink]?.name || guest.currentDrink;
        const tw = ctx.measureText(drinkName).width + 10;
        ctx.beginPath();
        ctx.roundRect(x - tw / 2, y - 42, tw, 15, 3);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(drinkName, x, y - 35);
      }

      // Mood bar
      const barW = 28;
      const barH = 3;
      const barX = x - barW / 2;
      const barY = y + 20;
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
    ctx.ellipse(x, y + 14, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = COLORS.BARTENDER;
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();

    // Apron
    ctx.fillStyle = COLORS.BARTENDER_APRON;
    ctx.beginPath();
    ctx.arc(x, y + 4, 14, 0, Math.PI);
    ctx.fill();

    // Face direction indicator
    const eyeX = bartender.facingRight ? x + 4 : x - 4;
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(eyeX, y - 3, 2, 0, Math.PI * 2);
    ctx.fill();

    // Carrying indicator
    if (bartender.carrying) {
      const label = this.getCarryLabel(bartender.carrying);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      const tw = ctx.measureText(label).width + 8;
      ctx.beginPath();
      ctx.roundRect(x - tw / 2, y - 30, tw, 14, 3);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y - 23);
    }

    // Busy indicator (progress bar)
    if (bartender.busy) {
      const bw = 40;
      const bx = x - bw / 2;
      const by = y + 18;
      ctx.fillStyle = '#333';
      ctx.fillRect(bx, by, bw, 4);
      ctx.fillStyle = '#4caf50';
      const progress = 1 - (bartender.busyTimer / (bartender.busyTimer + 0.01));
      ctx.fillRect(bx, by, bw * Math.min(1, progress), 4);

      ctx.fillStyle = '#e0e0e0';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(bartender.busyLabel, x, by + 14);
    }
  }

  getCarryLabel(carrying) {
    if (carrying === 'CLEAN_GLASS') return '🥃';
    if (carrying === 'DIRTY_GLASS') return '🍺💀';
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
    for (const drink of drinks) {
      const drinkDef = DRINKS[drink.drinkType];
      if (!drinkDef) continue;

      ctx.fillStyle = drinkDef.color || '#ccc';
      ctx.beginPath();
      ctx.roundRect(drink.x - 10, SERVICE_MAT_Y + 2, 20, 18, 3);
      ctx.fill();

      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = '12px serif';
      ctx.textAlign = 'center';
      ctx.fillText(drinkDef.icon, drink.x, SERVICE_MAT_Y + 14);
    }
  }

  drawPOSOverlay(posState) {
    if (!posState.visible) return;
    const ctx = this.ctx;

    // Overlay background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // POS screen
    const pw = 300;
    const ph = 280;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;

    ctx.fillStyle = '#1a2a1a';
    ctx.strokeStyle = '#4caf50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 8);
    ctx.fill();
    ctx.stroke();

    // Title
    ctx.fillStyle = '#4caf50';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('P.O.S. Terminal', px + pw / 2, py + 25);

    // Seat selector if needed
    if (posState.mode === 'SELECT_SEAT') {
      ctx.fillStyle = '#aaa';
      ctx.font = '12px monospace';
      ctx.fillText('Select seat to ring in:', px + pw / 2, py + 55);

      posState.seatButtons.forEach((btn, i) => {
        const bx = px + 30 + (i % 3) * 90;
        const by = py + 70 + Math.floor(i / 3) * 40;
        ctx.fillStyle = btn.active ? '#4caf50' : '#333';
        ctx.beginPath();
        ctx.roundRect(bx, by, 80, 30, 4);
        ctx.fill();
        ctx.fillStyle = btn.active ? '#fff' : '#666';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`Seat ${btn.seatId + 1}`, bx + 40, by + 16);
      });
    }

    if (posState.mode === 'PRINT_CHECK') {
      ctx.fillStyle = '#aaa';
      ctx.font = '12px monospace';
      ctx.fillText('Print check for:', px + pw / 2, py + 55);

      posState.checkButtons.forEach((btn, i) => {
        const bx = px + 30 + (i % 3) * 90;
        const by = py + 70 + Math.floor(i / 3) * 40;
        ctx.fillStyle = btn.active ? '#ffc107' : '#333';
        ctx.beginPath();
        ctx.roundRect(bx, by, 80, 30, 4);
        ctx.fill();
        ctx.fillStyle = btn.active ? '#000' : '#666';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`Seat ${btn.seatId + 1}`, bx + 40, by + 16);
      });
    }

    // Close button
    ctx.fillStyle = '#f44336';
    ctx.beginPath();
    ctx.roundRect(px + pw - 40, py + 5, 30, 20, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('X', px + pw - 25, py + 17);
  }

  drawLevelComplete(hud) {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = '#e8c170';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Level Complete!', CANVAS_W / 2, 180);

    const total = Math.floor(hud.tips + hud.revenue);
    ctx.fillStyle = '#4caf50';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`Total: $${total}`, CANVAS_W / 2, 230);

    ctx.fillStyle = '#aaa';
    ctx.font = '14px monospace';
    ctx.fillText(`Revenue: $${Math.floor(hud.revenue)}  Tips: $${Math.floor(hud.tips)}`, CANVAS_W / 2, 260);

    // Stars
    ctx.font = '36px serif';
    const starStr = '⭐'.repeat(hud.stars) + '☆'.repeat(3 - hud.stars);
    ctx.fillText(starStr, CANVAS_W / 2, 310);

    // Replay button
    ctx.fillStyle = '#e8c170';
    ctx.beginPath();
    ctx.roundRect(CANVAS_W / 2 - 70, 350, 140, 40, 6);
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('Play Again', CANVAS_W / 2, 374);
  }

  drawTitleScreen() {
    const ctx = this.ctx;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = '#e8c170';
    ctx.font = 'bold 42px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BAR RUSH', CANVAS_W / 2, 200);

    ctx.fillStyle = '#aaa';
    ctx.font = '14px monospace';
    ctx.fillText('A bartending time-management game', CANVAS_W / 2, 240);

    // Play button
    ctx.fillStyle = '#e8c170';
    ctx.beginPath();
    ctx.roundRect(CANVAS_W / 2 - 80, 300, 160, 45, 8);
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('Start Shift', CANVAS_W / 2, 326);

    ctx.fillStyle = '#666';
    ctx.font = '11px monospace';
    ctx.fillText('Tap guests and stations to serve drinks', CANVAS_W / 2, 400);
    ctx.fillText('Walk to stations, take orders, pour drinks, collect cash', CANVAS_W / 2, 420);
  }
}
