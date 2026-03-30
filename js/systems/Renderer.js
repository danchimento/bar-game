import {
  CANVAS_W, CANVAS_H, COLORS,
  BAR_TOP_Y, SERVICE_MAT_Y, WALK_TRACK_Y, STATION_Y, STATION_LABEL_Y,
  GUEST_Y, SEAT_Y, SEATS, BAR_LEFT, BAR_RIGHT,
  MOOD_MAX, GUEST_STATE,
} from '../constants.js';
import { DRINKS, GLASSES, GARNISHES, MIXER_DRINKS } from '../data/menu.js';

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
    }
  }

  drawBackCounter(stations, availableDrinks) {
    const ctx = this.ctx;
    const counterTop = STATION_Y - 40;
    const counterH = 80;

    // Continuous back counter surface
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.roundRect(15, counterTop, CANVAS_W - 30, counterH, 6);
    ctx.fill();
    // Counter edge highlight
    ctx.fillStyle = '#4d3a28';
    ctx.fillRect(15, counterTop, CANVAS_W - 30, 3);
    // Counter bottom shadow
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(15, counterTop + counterH - 3, CANVAS_W - 30, 3);

    // Draw each station on the counter
    for (const st of stations) {
      const hw = st.width / 2;
      switch (st.id) {
        case 'DISHWASHER': this._drawDishwasher(ctx, st.x, counterTop, hw); break;
        case 'SINK':       this._drawSink(ctx, st.x, counterTop, hw); break;
        case 'GLASS_RACK': this._drawGlassRack(ctx, st.x, counterTop, hw); break;
        case 'TAPS':       this._drawTaps(ctx, st.x, counterTop, hw, availableDrinks); break;
        case 'WINE':       this._drawWineStation(ctx, st.x, counterTop, hw); break;
        case 'PREP':       this._drawPrepStation(ctx, st.x, counterTop, hw); break;
        case 'TRASH':      this._drawTrash(ctx, st.x, counterTop, hw); break;
        case 'POS':        this._drawPOS(ctx, st.x, counterTop, hw); break;
      }
      // Label below counter
      ctx.fillStyle = '#999';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(st.label, st.x, counterTop + counterH + 12);
    }
  }

  _drawDishwasher(ctx, cx, top, hw) {
    const x = cx - hw + 5;
    const y = top + 8;
    const w = hw * 2 - 10;
    const h = 58;
    // Machine body
    ctx.fillStyle = '#708090';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();
    // Door
    ctx.fillStyle = '#5a6a7a';
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 14, w - 8, h - 18, 3);
    ctx.fill();
    // Handle
    ctx.strokeStyle = '#a0b0c0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 11);
    ctx.lineTo(x + w - 8, y + 11);
    ctx.stroke();
    // Status light
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.arc(x + w - 10, y + 6, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawSink(ctx, cx, top, hw) {
    const x = cx - hw + 5;
    const y = top + 18;
    const w = hw * 2 - 10;
    const h = 40;
    // Basin
    ctx.fillStyle = '#b0b8c0';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, [0, 0, 8, 8]);
    ctx.fill();
    // Inner basin (darker)
    ctx.fillStyle = '#8a9098';
    ctx.beginPath();
    ctx.roundRect(x + 5, y + 4, w - 10, h - 8, [0, 0, 6, 6]);
    ctx.fill();
    // Faucet
    ctx.strokeStyle = '#c0c8d0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, y - 6);
    ctx.lineTo(cx, y - 14);
    ctx.lineTo(cx + 10, y - 14);
    ctx.lineTo(cx + 10, y - 8);
    ctx.stroke();
    // Faucet knob
    ctx.fillStyle = '#4488cc';
    ctx.beginPath();
    ctx.arc(cx - 6, y - 6, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawGlassRack(ctx, cx, top, hw) {
    const x = cx - hw + 5;
    const y = top + 6;
    const w = hw * 2 - 10;
    // Rack frame
    ctx.fillStyle = '#5a4a38';
    ctx.beginPath();
    ctx.roundRect(x, y, w, 62, 4);
    ctx.fill();
    // Shelves
    const shelfCount = 2;
    const shelfH = 28;
    for (let s = 0; s < shelfCount; s++) {
      const sy = y + 4 + s * shelfH;
      // Shelf line
      ctx.fillStyle = '#6b5a48';
      ctx.fillRect(x + 3, sy + shelfH - 2, w - 6, 2);
      // Glasses on shelf
      const glassCount = 3;
      const glassW = 10;
      const spacing = (w - 10) / (glassCount + 1);
      for (let g = 0; g < glassCount; g++) {
        const gx = x + 5 + spacing * (g + 1);
        const gy = sy + shelfH - 4;
        // Simple pint glass shape
        ctx.strokeStyle = 'rgba(200, 220, 240, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(gx - glassW / 2 + 1, gy - 18);
        ctx.lineTo(gx - glassW / 2, gy);
        ctx.lineTo(gx + glassW / 2, gy);
        ctx.lineTo(gx + glassW / 2 - 1, gy - 18);
        ctx.stroke();
      }
    }
  }

  _drawTaps(ctx, cx, top, hw, availableDrinks) {
    const beers = (availableDrinks || []).filter(d => DRINKS[d] && DRINKS[d].type === 'beer');
    const tapCount = Math.max(1, beers.length);
    const spacing = Math.min(28, (hw * 2 - 20) / (tapCount + 1));
    const startX = cx - (tapCount - 1) * spacing / 2;

    // Tap tower base
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.roundRect(cx - hw + 8, top + 30, hw * 2 - 16, 34, [0, 0, 4, 4]);
    ctx.fill();
    // Drip tray
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.roundRect(cx - hw + 12, top + 56, hw * 2 - 24, 8, 2);
    ctx.fill();

    // Tap tower back plate
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.roundRect(cx - hw + 14, top + 4, hw * 2 - 28, 30, [4, 4, 0, 0]);
    ctx.fill();

    for (let i = 0; i < tapCount; i++) {
      const tx = startX + i * spacing;
      const beer = beers[i];
      const color = beer ? DRINKS[beer].color : '#888';

      // Tap handle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(tx - 4, top + 6, 8, 22, 3);
      ctx.fill();
      // Handle knob
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.roundRect(tx - 5, top + 4, 10, 6, 2);
      ctx.fill();
      // Spout
      ctx.fillStyle = '#888';
      ctx.fillRect(tx - 2, top + 28, 4, 8);
    }
  }

  _drawWineStation(ctx, cx, top, hw) {
    const x = cx - hw + 5;
    const y = top + 8;
    // Wine rack slots
    const bottles = [
      { color: '#8b1a1a', label: 'R' },
      { color: '#e8e0a0', label: 'W' },
    ];
    const slotW = 20;
    const spacing = (hw * 2 - 10) / (bottles.length + 1);
    for (let i = 0; i < bottles.length; i++) {
      const bx = x + spacing * (i + 1);
      const by = y + 5;
      // Bottle
      ctx.fillStyle = bottles[i].color;
      ctx.beginPath();
      ctx.roundRect(bx - slotW / 2, by, slotW, 48, 4);
      ctx.fill();
      // Neck
      ctx.fillStyle = bottles[i].color;
      ctx.beginPath();
      ctx.roundRect(bx - 4, by - 8, 8, 12, 2);
      ctx.fill();
      // Label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bottles[i].label, bx, by + 28);
    }
  }

  _drawPrepStation(ctx, cx, top, hw) {
    const x = cx - hw + 5;
    const y = top + 12;
    const w = hw * 2 - 10;
    // Cutting board
    ctx.fillStyle = '#b89060';
    ctx.beginPath();
    ctx.roundRect(x, y, w, 45, 4);
    ctx.fill();
    ctx.fillStyle = '#a08050';
    ctx.beginPath();
    ctx.roundRect(x + 3, y + 3, w - 6, 39, 3);
    ctx.fill();
    // Garnish containers
    const containers = ['#ff8c00', '#90ee90', '#fff44f', '#ff4040'];
    const cw = 12;
    const gap = 3;
    const totalCw = containers.length * (cw + gap) - gap;
    const cs = cx - totalCw / 2;
    for (let i = 0; i < containers.length; i++) {
      ctx.fillStyle = containers[i];
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.roundRect(cs + i * (cw + gap), y + 6, cw, cw, 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Ice bucket hint
    ctx.fillStyle = '#a0d4e8';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(cx, y + 33, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  _drawTrash(ctx, cx, top, hw) {
    const w = hw * 2 - 14;
    const x = cx - w / 2;
    const y = top + 14;
    const h = 50;
    // Can body — tapered
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.moveTo(x + 4, y);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w - 4, y);
    ctx.closePath();
    ctx.fill();
    // Lid
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.roundRect(x - 2, y - 6, w + 4, 8, 2);
    ctx.fill();
    // Lid handle
    ctx.fillStyle = '#777';
    ctx.beginPath();
    ctx.roundRect(cx - 6, y - 10, 12, 5, 2);
    ctx.fill();
    // Vertical lines on can
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 1;
    for (let lx = x + 8; lx < x + w - 6; lx += 9) {
      ctx.beginPath();
      ctx.moveTo(lx, y + 4);
      ctx.lineTo(lx - 1, y + h - 4);
      ctx.stroke();
    }
  }

  _drawPOS(ctx, cx, top, hw) {
    const x = cx - hw + 5;
    const y = top + 6;
    const w = hw * 2 - 10;
    // Monitor
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.roundRect(x, y, w, 40, 3);
    ctx.fill();
    // Screen
    ctx.fillStyle = '#1a3a2a';
    ctx.beginPath();
    ctx.roundRect(x + 3, y + 3, w - 6, 30, 2);
    ctx.fill();
    // Screen text
    ctx.fillStyle = '#4caf50';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('POS', cx, y + 18);
    // Stand
    ctx.fillStyle = '#333';
    ctx.fillRect(cx - 4, y + 40, 8, 12);
    // Base
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.roundRect(cx - 12, y + 50, 24, 5, 2);
    ctx.fill();
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

  drawDrinksAtSeats(drinksMap) {
    for (const [seatId, glasses] of drinksMap) {
      const seat = SEATS[seatId];
      for (let i = 0; i < glasses.length; i++) {
        this.drawMiniGlass(seat.x + 14 + i * 20, BAR_TOP_Y + 5, 16, 22, glasses[i]);
      }
    }
  }

  drawCashOnBar(cashMap) {
    const ctx = this.ctx;
    for (const [seatId] of cashMap) {
      const seat = SEATS[seatId];
      // Cash on the bar in front of seat
      const cashX = seat.x - 20;
      ctx.fillStyle = '#2d6b2e';
      ctx.beginPath();
      ctx.roundRect(cashX - 14, BAR_TOP_Y + 4, 28, 18, 3);
      ctx.fill();
      ctx.strokeStyle = '#1a4a1a';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#4caf50';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', cashX, BAR_TOP_Y + 13);
    }
  }

  drawGuests(guests, waitingCount) {
    const ctx = this.ctx;

    // Show waiting queue as a count badge instead of individual guests
    if (waitingCount > 0) {
      const badgeX = CANVAS_W / 2;
      const badgeY = 82;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.roundRect(badgeX - 50, badgeY - 12, 100, 24, 12);
      ctx.fill();
      ctx.fillStyle = '#ffc107';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`⏳ ${waitingCount} waiting`, badgeX, badgeY);
    }

    for (const guest of guests) {
      if (guest.state === 'DONE') continue;
      // Skip rendering individual waiting guests — shown as count above
      if (guest.state === GUEST_STATE.WAITING_FOR_SEAT) continue;

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

      // Sip animation — show drinking icon briefly
      if (guest.sipping) {
        ctx.font = '14px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('🍹', x, y - 24);
      }

      const indicator = guest.getIndicator();
      if (indicator) {
        ctx.font = '18px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(indicator, x, y - 24);
      }

      // Order label — shows temporarily after order is taken, fades out
      if (guest.currentOrder && guest.orderRevealTimer > 0) {
        const alpha = Math.min(1, guest.orderRevealTimer / 1.0);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = '10px monospace';

        // Build order display with icons: "🍺 Gold Lager + 💧 Water"
        const orderParts = guest.currentOrder.map((drinkKey, idx) => {
          const d = DRINKS[drinkKey];
          const fulfilled = guest.fulfilledItems && guest.fulfilledItems.includes(drinkKey);
          const icon = d?.icon || '?';
          const name = d?.name || drinkKey;
          return fulfilled ? `✓${icon}` : `${icon} ${name}`;
        });
        const orderText = orderParts.join(' + ');
        const tw = ctx.measureText(orderText).width + 16;

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.roundRect(x - tw / 2, y - 48, tw, 18, 3);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(orderText, x, y - 39);
        ctx.restore();
      } else if (guest.currentDrink && guest.orderRevealTimer > 0) {
        // Fallback for single-drink display
        const alpha = Math.min(1, guest.orderRevealTimer / 1.0);
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

  drawBartender(bartender, carriedGlass) {
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
      if (carriedGlass) {
        this.drawMiniGlass(x, y - 34, 14, 20, carriedGlass);
      } else {
        // Non-glass carry (dirty glass, check)
        const label = this.getCarryLabel(bartender.carrying);
        ctx.font = '18px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y - 26);
      }
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
    if (carrying === 'DIRTY_GLASS') return '🫧';
    if (carrying.startsWith('CHECK_')) return '🧾';
    return '?';
  }

  /** Draw a small glass showing fill state — used above bartender and on service mat */
  drawMiniGlass(cx, cy, w, h, glass) {
    const ctx = this.ctx;
    const gx = cx - w / 2;
    const gy = cy - h / 2;

    // Glass outline
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    ctx.strokeRect(gx, gy, w, h);

    // Ice layer at bottom
    if (glass.ice > 0) {
      const iceH = h * glass.ice;
      ctx.fillStyle = 'rgba(200, 230, 255, 0.7)';
      ctx.fillRect(gx, gy + h - iceH, w, iceH);
      // Ice cubes
      ctx.fillStyle = 'rgba(220, 240, 255, 0.9)';
      const cubeSize = Math.min(w / 3, iceH * 0.6);
      ctx.fillRect(gx + 1, gy + h - iceH + 1, cubeSize, cubeSize);
      ctx.fillRect(gx + w - cubeSize - 1, gy + h - iceH + 1, cubeSize, cubeSize);
    }

    // Liquid layers (drawn above ice)
    let fillBottom = h * (1 - glass.ice);
    for (const layer of glass.layers) {
      const layerH = h * layer.amount;
      ctx.fillStyle = layer.color;
      ctx.fillRect(gx, gy + fillBottom - layerH, w, layerH);
      fillBottom -= layerH;
    }

    // Garnish icons on top
    if (glass.garnishes.length > 0) {
      ctx.font = '8px serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        glass.garnishes.map(g => GARNISHES[g]?.icon || '').join(''),
        cx, gy - 2
      );
    }
  }

  drawServiceMat(drinks) {
    const ctx = this.ctx;
    if (drinks.length === 0) return;

    for (const drink of drinks) {
      if (drink.glass) {
        // Draw mini glass on service mat
        this.drawMiniGlass(drink.x, SERVICE_MAT_Y + 13, 20, 26, drink.glass);
      } else {
        // Fallback for old-style entries
        const drinkDef = DRINKS[drink.drinkType];
        if (!drinkDef) continue;
        ctx.fillStyle = drinkDef.color || '#ccc';
        ctx.beginPath();
        ctx.roundRect(drink.x - 16, SERVICE_MAT_Y + 1, 32, 24, 4);
        ctx.fill();
        ctx.font = '16px serif';
        ctx.textAlign = 'center';
        ctx.fillText(drinkDef.icon, drink.x, SERVICE_MAT_Y + 16);
      }
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

  drawDrinkModal(modal, carriedGlass, activePour) {
    if (!modal.visible) return;
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Beer uses the tap visual; wine/mixer use the classic button layout
    if (modal.type === 'beer') {
      this._drawTapModal(ctx, modal, carriedGlass, activePour);
      return;
    }

    const items = modal.items;
    const btnW = 110;
    const btnH = 100;
    const gap = 20;
    const glassAreaW = 100; // space for glass visual on left
    const totalBtnsW = items.length * btnW + (items.length - 1) * gap;
    const pw = glassAreaW + totalBtnsW + 80;
    const ph = 230;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;

    const typeColors = {
      wine:  { bg: '#2a1020', border: '#8b1a4a', title: '#d4708a' },
      mixer: { bg: '#0a1a2a', border: '#4a9ad4', title: '#6ab4e8' },
    };
    const colors = typeColors[modal.type] || { bg: '#2a1a0a', border: '#d4a020', title: '#d4a020' };
    const titles = { wine: 'Wines', mixer: 'Soda Gun' };

    ctx.fillStyle = colors.bg;
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = colors.title;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(titles[modal.type] || 'Pour', px + pw / 2, py + 30);

    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.fillText('Hold to pour, release to stop', px + pw / 2, py + 50);

    // ─── Glass visual on the left ───
    if (carriedGlass) {
      const glassX = px + 50;
      const glassY = py + 80;
      const gw = 50;
      const gh = 120;
      this.drawGlassVisual(glassX, glassY, gw, gh, carriedGlass, !!activePour, true);
    }

    // ─── Drink buttons on the right ───
    const startX = px + glassAreaW + 20;
    const btnY = py + 70;

    items.forEach((item, i) => {
      const bx = startX + i * (btnW + gap);
      const drinkDef = DRINKS[item];
      const isPouring = activePour && activePour.drinkKey === item;

      ctx.fillStyle = isPouring ? '#4a4035' : '#3a3025';
      ctx.beginPath();
      ctx.roundRect(bx, btnY, btnW, btnH, 8);
      ctx.fill();

      ctx.strokeStyle = isPouring ? '#ffd54f' : '#8a7a6a';
      ctx.lineWidth = isPouring ? 3 : 2;
      ctx.stroke();

      // Color swatch
      ctx.fillStyle = drinkDef.color || '#555';
      ctx.beginPath();
      ctx.roundRect(bx + 4, btnY + btnH - 14, btnW - 8, 10, 4);
      ctx.fill();

      ctx.font = '28px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(drinkDef.icon, bx + btnW / 2, btnY + 36);

      ctx.fillStyle = '#eee';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(drinkDef.name, bx + btnW / 2, btnY + 70);

      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.fillText(drinkDef.price > 0 ? `$${drinkDef.price}` : 'Free', bx + btnW / 2, btnY + 84);
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

  /** Beer-specific tap modal — wall-mount style taps with drip tray shelf */
  _drawTapModal(ctx, modal, carriedGlass, activePour) {
    const items = modal.items;
    const tapSpacing = 80;
    const totalTapsW = (items.length - 1) * tapSpacing;
    const pw = Math.max(totalTapsW + 160, 340);
    const ph = 500;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;

    // Panel background
    ctx.fillStyle = '#2a1a0a';
    ctx.strokeStyle = '#d4a020';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 12);
    ctx.fill();
    ctx.stroke();

    // Title
    ctx.fillStyle = '#d4a020';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Draft Beers', px + pw / 2, py + 24);

    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.fillText('Hold a tap to pour', px + pw / 2, py + 44);

    // ─── Stainless steel back plate ───
    const plateX = px + 25;
    const plateY = py + 60;
    const plateW = pw - 50;
    const plateH = 245;

    // Plate body
    ctx.fillStyle = '#b8bcc0';
    ctx.beginPath();
    ctx.roundRect(plateX, plateY, plateW, plateH, 4);
    ctx.fill();
    // Brushed steel effect
    ctx.fillStyle = 'rgba(160,165,170,0.3)';
    for (let sy = plateY + 4; sy < plateY + plateH - 4; sy += 6) {
      ctx.fillRect(plateX + 4, sy, plateW - 8, 1);
    }
    // Plate edge highlight
    ctx.strokeStyle = '#d0d4d8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(plateX, plateY, plateW, plateH, 4);
    ctx.stroke();

    // ─── Drip tray shelf ───
    const trayY = plateY + plateH;
    const trayH = 20;
    // Tray body
    ctx.fillStyle = '#a0a4a8';
    ctx.beginPath();
    ctx.moveTo(plateX, trayY);
    ctx.lineTo(plateX + plateW, trayY);
    ctx.lineTo(plateX + plateW - 5, trayY + trayH);
    ctx.lineTo(plateX + 5, trayY + trayH);
    ctx.closePath();
    ctx.fill();
    // Tray lip
    ctx.fillStyle = '#888c90';
    ctx.fillRect(plateX + 2, trayY, plateW - 4, 3);
    // Perforated holes
    ctx.fillStyle = '#707478';
    const holeStartX = plateX + 20;
    const holeEndX = plateX + plateW - 20;
    const holeY = trayY + 8;
    for (let hx = holeStartX; hx < holeEndX; hx += 10) {
      for (let hy = holeY; hy < trayY + trayH - 4; hy += 8) {
        ctx.beginPath();
        ctx.arc(hx, hy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ─── Draw each tap on the plate ───
    const startX = px + pw / 2 - totalTapsW / 2;
    const pouringKey = activePour ? activePour.drinkKey : null;
    const faucetY = plateY + plateH * 0.35; // faucets mounted upper portion

    for (let i = 0; i < items.length; i++) {
      const drinkKey = items[i];
      const drinkDef = DRINKS[drinkKey];
      const tx = startX + i * tapSpacing;
      const isPouring = pouringKey === drinkKey;

      // ── Faucet body (round disc on the plate) ──
      ctx.fillStyle = '#c8ccd0';
      ctx.beginPath();
      ctx.arc(tx, faucetY, 12, 0, Math.PI * 2);
      ctx.fill();
      // Inner ring
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(tx, faucetY, 8, 0, Math.PI * 2);
      ctx.stroke();

      // ── Spout (angled down from faucet) ──
      ctx.strokeStyle = '#c0c4c8';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, faucetY + 10);
      ctx.lineTo(tx, faucetY + 32);
      ctx.stroke();
      // Spout tip
      ctx.fillStyle = '#d0d4d8';
      ctx.beginPath();
      ctx.arc(tx, faucetY + 34, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineCap = 'butt';

      // ── Handle (angled up from faucet) ──
      ctx.save();
      ctx.translate(tx, faucetY - 10);
      if (isPouring) {
        ctx.rotate(-0.5); // pulled forward
      }
      // Handle shaft
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.roundRect(-4, -40, 8, 38, 3);
      ctx.fill();
      // Handle knob (colored per beer)
      ctx.fillStyle = drinkDef.color;
      ctx.beginPath();
      ctx.roundRect(-6, -48, 12, 12, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // ── Pour stream ──
      if (isPouring) {
        ctx.fillStyle = drinkDef.color;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(tx - 2, faucetY + 34, 4, trayY - (faucetY + 34));
        ctx.globalAlpha = 1;
      }

      // ── Beer name below tray ──
      ctx.fillStyle = '#ccc';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(drinkDef.name, tx, trayY + trayH + 16);
    }

    // ─── Glass on the drip tray ───
    if (carriedGlass) {
      const glassX = modal.glassX || (px + 50);
      const glassH = 70;
      const glassW = 36;
      const glassY = trayY - glassH + 2; // sitting on the tray

      // Bartender tilt: angle glass ~20° when pouring (proper pour technique)
      // Ease tilt based on fill level — start tilted, straighten as it fills
      const isPouring = !!pouringKey;
      const fill = carriedGlass.totalFill;
      // Tilt more when empty, straighten as glass fills past 70%
      const tiltMax = 0.35; // ~20 degrees
      const tiltAmount = isPouring ? tiltMax * Math.max(0, 1 - fill / 0.7) : 0;

      ctx.save();
      ctx.translate(glassX, glassY + glassH); // pivot at bottom of glass
      ctx.rotate(tiltAmount);
      // Don't draw internal pour stream — external stream from tap handles it
      this.drawGlassVisual(0, -glassH, glassW, glassH, carriedGlass, false, true);

      // Overflow visual — beer running down the sides
      if (carriedGlass.overflow > 0) {
        const overflowAlpha = Math.min(0.8, carriedGlass.overflow * 3);
        const drinkColor = carriedGlass.layers.length > 0 ? carriedGlass.layers[0].color : '#f0c040';
        ctx.fillStyle = drinkColor;
        ctx.globalAlpha = overflowAlpha;
        // Drips on left and right side
        ctx.fillRect(-glassW / 2 - 3, -glassH + 2, 4, glassH * 0.6);
        ctx.fillRect(glassW / 2 - 1, -glassH + 4, 4, glassH * 0.5);
        // Puddle at base
        ctx.beginPath();
        ctx.ellipse(0, 2, glassW / 2 + 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // Pour stream from spout into glass
      if (pouringKey) {
        const idx = items.indexOf(pouringKey);
        if (idx >= 0) {
          const tx = startX + idx * tapSpacing;
          const drinkDef = DRINKS[pouringKey];
          ctx.fillStyle = drinkDef.color;
          ctx.globalAlpha = 0.6;
          // Stream from spout to glass opening
          const streamEndY = glassY + 4;
          ctx.fillRect(tx - 2, faucetY + 34, 4, streamEndY - (faucetY + 34));
          ctx.globalAlpha = 1;
        }
      }
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

  /** Draw a larger glass visual for pour modals and overlay */
  drawGlassVisual(cx, cy, w, h, glass, isPouring, showTarget) {
    const ctx = this.ctx;
    const gx = cx - w / 2;
    const gy = cy;

    // Glass shape
    ctx.fillStyle = 'rgba(200, 200, 200, 0.08)';
    ctx.fillRect(gx, gy, w, h);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.strokeRect(gx, gy, w, h);

    // Fill target range indicators
    if (showTarget && glass.primaryDrink) {
      const drinkDef = DRINKS[glass.primaryDrink];
      if (drinkDef && drinkDef.fillRange) {
        const [minFill, maxFill] = drinkDef.fillRange;
        const minY = gy + h * (1 - minFill);
        const maxY = gy + h * (1 - maxFill);
        // Target zone highlight
        ctx.fillStyle = 'rgba(76, 175, 80, 0.12)';
        ctx.fillRect(gx + 1, maxY, w - 2, minY - maxY);
        // Target lines
        ctx.strokeStyle = 'rgba(76, 175, 80, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(gx, minY);
        ctx.lineTo(gx + w, minY);
        ctx.moveTo(gx, maxY);
        ctx.lineTo(gx + w, maxY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Ice at bottom
    if (glass.ice > 0) {
      const iceH = h * glass.ice;
      const iceY = gy + h - iceH;
      ctx.fillStyle = 'rgba(200, 230, 255, 0.5)';
      ctx.fillRect(gx + 1, iceY, w - 2, iceH);
      // Ice cubes
      ctx.fillStyle = 'rgba(220, 240, 255, 0.8)';
      const cs = Math.min(w / 3 - 2, iceH * 0.5);
      if (cs > 2) {
        ctx.fillRect(gx + 3, iceY + 2, cs, cs);
        ctx.fillRect(gx + w - cs - 3, iceY + 2, cs, cs);
        if (w > 30) ctx.fillRect(gx + w / 2 - cs / 2, iceY + cs + 3, cs, cs);
      }
    }

    // Liquid layers
    let fillBottom = h * (1 - glass.ice);
    for (const layer of glass.layers) {
      const layerH = h * layer.amount;
      ctx.fillStyle = layer.color;
      ctx.fillRect(gx + 1, gy + fillBottom - layerH, w - 2, layerH);
      fillBottom -= layerH;
    }

    // Pour stream animation
    if (isPouring && glass.totalFill < 1.0) {
      ctx.strokeStyle = glass.layers.length > 0
        ? glass.layers[glass.layers.length - 1].color
        : '#a0d4e8';
      ctx.lineWidth = 3;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, gy - 20);
      ctx.lineTo(cx, gy + h * (1 - glass.totalFill));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Garnish icons
    if (glass.garnishes.length > 0) {
      ctx.font = '12px serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        glass.garnishes.map(g => GARNISHES[g]?.icon || '').join(''),
        cx, gy - 4
      );
    }

    // Fill percentage
    ctx.fillStyle = '#aaa';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(glass.totalFill * 100)}%`, cx, gy + h + 14);
  }

  /** Persistent glass fill overlay — shown above bar when carrying a glass */
  drawGlassFillOverlay(glass, activePour) {
    const ctx = this.ctx;
    // Position in top-right area, below HUD
    const cx = CANVAS_W - 60;
    const cy = 50;
    const w = 36;
    const h = 80;

    // Background panel
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(cx - w / 2 - 8, cy - 6, w + 16, h + 30, 6);
    ctx.fill();

    this.drawGlassVisual(cx, cy, w, h, glass, !!activePour, true);
  }

  // ─── POS OVERLAY ──────────────────────────────────

  drawPOSOverlay(posState, guests, posTab, availableDrinks) {
    if (!posState.visible) return;
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const pw = 510;
    const ph = 460;
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

        const tab = posTab.get(i) || [];
        const hasTab = tab.length > 0;

        ctx.fillStyle = hasTab ? '#2a3a2a' : '#2a2a2a';
        ctx.beginPath();
        ctx.roundRect(bx, by, 140, 42, 4);
        ctx.fill();

        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Seat ${i + 1}`, bx + 12, by + 14);

        ctx.fillStyle = '#aaa';
        ctx.font = '10px monospace';
        ctx.fillText(hasTab ? `${tab.length} item${tab.length > 1 ? 's' : ''}` : 'No tab', bx + 12, by + 32);
      }
    } else if (posState.mode === 'SEAT_VIEW') {
      const seatId = posState.selectedSeat;

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

      const tab = posTab.get(seatId) || [];
      let total = 0;
      tab.forEach((entry, i) => {
        const drinkDef = DRINKS[entry.drink];
        total += entry.price;
        ctx.fillStyle = '#ccc';
        ctx.font = '11px monospace';
        ctx.fillText(
          `${drinkDef?.name || entry.drink}  $${entry.price}`,
          px + 30, py + 105 + i * 18
        );
      });

      // Total
      if (tab.length > 0) {
        const totalY = py + 110 + tab.length * 18;
        ctx.fillStyle = '#4caf50';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`Total: $${total}`, px + 30, totalY);
      }

      // Add drink section (2-row grid)
      ctx.fillStyle = '#888';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('Add drink:', px + 20, py + 168);

      const drinks = availableDrinks || Object.keys(DRINKS);
      const btnW = 105;
      const btnH = 60;
      const drinksGap = 8;
      const cols = 4;
      const drinksY = py + 180;

      drinks.forEach((key, i) => {
        const drinkDef = DRINKS[key];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const bx = px + 20 + col * (btnW + drinksGap);
        const by = drinksY + row * (btnH + drinksGap);

        ctx.fillStyle = '#2a2a1a';
        ctx.beginPath();
        ctx.roundRect(bx, by, btnW, btnH, 6);
        ctx.fill();
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = '20px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(drinkDef.icon, bx + btnW / 2, by + 18);

        ctx.fillStyle = '#ccc';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(drinkDef.name, bx + btnW / 2, by + 38);
        ctx.fillStyle = '#888';
        ctx.font = '10px monospace';
        ctx.fillText(drinkDef.price > 0 ? `$${drinkDef.price}` : 'Free', bx + btnW / 2, by + 52);
      });

      // Print Check button
      const canPrint = tab.length > 0;
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

  // ─── PREP / GARNISH MODAL ─────────────────────────

  drawPrepModal(modal, carriedGlass, activePour) {
    if (!modal.visible) return;
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const pw = 520;
    const ph = 340;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;

    ctx.fillStyle = '#1a2a1a';
    ctx.strokeStyle = '#6b8a5a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#8ac870';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Prep Station', px + pw / 2, py + 28);

    // ─── Row 1: Ice ───
    const iceY = py + 55;
    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Ice:', px + 20, iceY - 2);

    const hasIce = carriedGlass && carriedGlass.ice > 0;
    ctx.fillStyle = hasIce ? '#2a4a4a' : '#3a3025';
    ctx.beginPath();
    ctx.roundRect(px + 20, iceY + 6, 90, 50, 8);
    ctx.fill();
    ctx.strokeStyle = hasIce ? '#4caf50' : '#8a7a6a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧊', px + 65, iceY + 24);
    ctx.fillStyle = hasIce ? '#4caf50' : '#eee';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(hasIce ? '✓ Ice' : 'Ice', px + 65, iceY + 44);

    // Show current glass state
    if (carriedGlass) {
      this.drawGlassVisual(px + pw - 50, iceY + 10, 40, 80, carriedGlass, !!activePour, true);
    }

    // ─── Row 2: Garnishes ───
    const garnishKeys = Object.keys(GARNISHES);
    const gBtnW = 80;
    const gBtnH = 70;
    const gGap = 10;
    const garnishY = py + 130;
    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Garnishes:', px + 20, garnishY - 2);

    garnishKeys.forEach((key, i) => {
      const garnish = GARNISHES[key];
      const bx = px + 20 + i * (gBtnW + gGap);
      const alreadyAdded = carriedGlass && carriedGlass.garnishes.includes(key);

      ctx.fillStyle = alreadyAdded ? '#2a4a2a' : '#3a3025';
      ctx.beginPath();
      ctx.roundRect(bx, garnishY + 6, gBtnW, gBtnH, 8);
      ctx.fill();
      ctx.strokeStyle = alreadyAdded ? '#4caf50' : '#8a7a6a';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(garnish.icon, bx + gBtnW / 2, garnishY + 30);
      ctx.fillStyle = alreadyAdded ? '#4caf50' : '#eee';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(garnish.name, bx + gBtnW / 2, garnishY + 58);
    });

    // ─── Row 3: Mixer / Soda Gun ───
    const mixerY = py + 225;
    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Soda Gun:', px + 20, mixerY - 2);

    const mixerBtnW = 90;
    const waterPouring = activePour && activePour.drinkKey === 'WATER';
    ctx.fillStyle = waterPouring ? '#1a3a4a' : '#1a2a3a';
    ctx.beginPath();
    ctx.roundRect(px + 20, mixerY + 6, mixerBtnW, 60, 8);
    ctx.fill();
    ctx.strokeStyle = waterPouring ? '#6dd5ff' : '#4a9ad4';
    ctx.lineWidth = waterPouring ? 3 : 2;
    ctx.stroke();
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💧', px + 20 + mixerBtnW / 2, mixerY + 28);
    ctx.fillStyle = '#6ab4e8';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('Water', px + 20 + mixerBtnW / 2, mixerY + 52);

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

  drawLevelComplete(hud, levelIndex, totalLevels, stats) {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // ─── Left side: Summary ───
    const leftX = CANVAS_W / 2 - 220;
    ctx.fillStyle = '#e8c170';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Shift Complete!', leftX, 50);

    ctx.font = '32px serif';
    const starStr = '\u2B50'.repeat(hud.stars) + '\u2606'.repeat(3 - hud.stars);
    ctx.fillText(starStr, leftX, 90);

    ctx.fillStyle = '#4caf50';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`Tips: $${Math.floor(hud.tips)}`, leftX, 135);

    ctx.fillStyle = '#aaa';
    ctx.font = '13px monospace';
    ctx.fillText(`Revenue: $${Math.floor(hud.revenue)}`, leftX, 165);

    // ─── Right side: Stats ───
    const rightX = CANVAS_W / 2 + 180;
    const s = stats || {};
    const totalDrinks = (s.drinksServedCorrect || 0) + (s.drinksServedWithIssues || 0) + (s.drinksRejected || 0);
    const drinkAcc = totalDrinks > 0 ? Math.round(((s.drinksServedCorrect || 0) / totalDrinks) * 100) : 100;
    const totalBills = (s.billsCorrect || 0) + (s.billsOvercharged || 0) + (s.billsUndercharged || 0);
    const billAcc = totalBills > 0 ? Math.round(((s.billsCorrect || 0) / totalBills) * 100) : 100;
    const avgWait = (s.guestsWaited || 0) > 0 ? (s.totalWaitTime / s.guestsWaited).toFixed(1) : '0.0';

    ctx.fillStyle = '#e8c170';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Shift Report', rightX, 50);

    const statRows = [
      { label: 'Drink Accuracy', value: `${drinkAcc}%`, color: drinkAcc >= 80 ? '#4caf50' : '#f44336' },
      { label: 'Bill Accuracy', value: `${billAcc}%`, color: billAcc >= 80 ? '#4caf50' : '#f44336' },
      { label: 'Drinks Wasted', value: `${s.drinksWasted || 0}`, color: (s.drinksWasted || 0) === 0 ? '#4caf50' : '#ff9800' },
      { label: 'Guests Served', value: `${s.guestsServed || 0}`, color: '#8bc34a' },
      { label: 'Angry Walkouts', value: `${s.guestsAngry || 0}`, color: (s.guestsAngry || 0) === 0 ? '#4caf50' : '#f44336' },
      { label: 'Avg Wait Time', value: `${avgWait}s`, color: parseFloat(avgWait) < 30 ? '#4caf50' : '#ff9800' },
      { label: 'Peak Guests', value: `${s.peakGuests || 0}`, color: '#8bc34a' },
      { label: 'Tips Earned', value: `$${s.totalTips || 0}`, color: '#4caf50' },
    ];

    const rowH = 24;
    const startY = 80;
    ctx.font = '12px monospace';
    for (let i = 0; i < statRows.length; i++) {
      const ry = startY + i * rowH;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#999';
      ctx.fillText(statRows[i].label, rightX - 100, ry);
      ctx.textAlign = 'right';
      ctx.fillStyle = statRows[i].color;
      ctx.font = 'bold 12px monospace';
      ctx.fillText(statRows[i].value, rightX + 100, ry);
      ctx.font = '12px monospace';
    }

    // ─── Buttons at bottom center ───
    const btnY = 480;
    const hasNext = levelIndex < totalLevels - 1;
    const retryX = hasNext ? CANVAS_W / 2 - 170 : CANVAS_W / 2 - 80;

    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.roundRect(retryX, btnY, 160, 42, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Retry', retryX + 80, btnY + 21);

    if (hasNext) {
      ctx.fillStyle = '#e8c170';
      ctx.beginPath();
      ctx.roundRect(CANVAS_W / 2 + 10, btnY, 160, 42, 6);
      ctx.fill();
      ctx.fillStyle = '#1a1a2e';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('Next Day', CANVAS_W / 2 + 90, btnY + 21);
    }
  }

  drawPauseButton(ctx) {
    const cx = CANVAS_W / 2;
    // Tap target background
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.roundRect(cx - 22, 4, 44, 28, 6);
    ctx.fill();
    // Pause bars
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(cx - 8, 8, 6, 18);
    ctx.fillRect(cx + 2, 8, 6, 18);
  }

  drawPauseMenu(quitConfirm) {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const pw = 300;
    const ph = 250;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;

    ctx.fillStyle = '#252540';
    ctx.strokeStyle = '#e8c170';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e8c170';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Paused', px + pw / 2, py + 35);

    // Resume button
    ctx.fillStyle = '#e8c170';
    ctx.beginPath();
    ctx.roundRect(px + 50, py + 75, pw - 100, 44, 6);
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('Resume', px + pw / 2, py + 97);

    // Quit button
    ctx.fillStyle = quitConfirm ? '#c62828' : '#555';
    ctx.beginPath();
    ctx.roundRect(px + 50, py + 135, pw - 100, 44, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(quitConfirm ? 'Tap to Confirm' : 'Quit Day', px + pw / 2, py + 157);

    if (quitConfirm) {
      ctx.fillStyle = '#999';
      ctx.font = '11px monospace';
      ctx.fillText('Progress will be lost', px + pw / 2, py + 195);
    }
  }

  drawSettingsScreen(settings) {
    const ctx = this.ctx;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const pw = 700;
    const ph = 460;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;

    // Panel
    ctx.fillStyle = '#252540';
    ctx.strokeStyle = '#e8c170';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 10);
    ctx.fill();
    ctx.stroke();

    // Title
    ctx.fillStyle = '#e8c170';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Settings', px + pw / 2, py + 28);

    const rows = [
      { key: 'moodDecayMultiplier', label: 'Mood Decay Speed',   fmt: v => `${v.toFixed(1)}x` },
      { key: 'gracePeriod',         label: 'Grace Period',        fmt: v => `${v}s` },
      { key: 'settleTime',          label: 'Settle Time',         fmt: v => `${v.toFixed(1)}s` },
      { key: 'enjoyTimeMin',        label: 'Enjoy Time (min)',    fmt: v => `${v}s` },
      { key: 'enjoyTimeMax',        label: 'Enjoy Time (max)',    fmt: v => `${v}s` },
      { key: 'orderRevealTime',     label: 'Order Reveal Time',   fmt: v => `${v}s` },
      { key: 'spawnInterval',       label: 'Spawn Spacing',       fmt: v => `${v.toFixed(1)}x` },
      { key: 'levelDuration',       label: 'Level Duration',      fmt: v => `${Math.floor(v / 60)}m ${v % 60}s` },
    ];

    const rowH = 36;
    const startY = py + 60;
    const btnSize = 32;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const ry = startY + i * rowH;
      const val = settings[r.key];

      // Label
      ctx.fillStyle = '#ccc';
      ctx.font = '13px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.label, px + 25, ry + btnSize / 2);

      // Minus button
      const minusBx = px + pw - 180;
      ctx.fillStyle = '#3a2a1a';
      ctx.beginPath();
      ctx.roundRect(minusBx, ry, btnSize, btnSize, 4);
      ctx.fill();
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#e8c170';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('−', minusBx + btnSize / 2, ry + btnSize / 2);

      // Value
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(r.fmt(val), minusBx + btnSize + 42, ry + btnSize / 2);

      // Plus button
      const plusBx = px + pw - 60;
      ctx.fillStyle = '#3a2a1a';
      ctx.beginPath();
      ctx.roundRect(plusBx, ry, btnSize, btnSize, 4);
      ctx.fill();
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#e8c170';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('+', plusBx + btnSize / 2, ry + btnSize / 2);
    }

    // Start button
    ctx.fillStyle = '#e8c170';
    ctx.beginPath();
    ctx.roundRect(px + pw / 2 - 80, py + ph - 55, 160, 40, 8);
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Start Shift', px + pw / 2, py + ph - 35);
  }

  drawTitleScreen(levels) {
    const ctx = this.ctx;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = '#e8c170';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BAR RUSH', CANVAS_W / 2, 120);

    ctx.fillStyle = '#aaa';
    ctx.font = '14px monospace';
    ctx.fillText('A bartending time-management game', CANVAS_W / 2, 165);

    // Level select buttons
    const btnW = 160;
    const btnH = 44;
    const gap = 12;
    const startY = 240;
    const lvls = levels || [];

    for (let i = 0; i < lvls.length; i++) {
      const by = startY + i * (btnH + gap);
      const bx = CANVAS_W / 2 - btnW / 2;
      ctx.fillStyle = '#e8c170';
      ctx.beginPath();
      ctx.roundRect(bx, by, btnW, btnH, 6);
      ctx.fill();
      ctx.fillStyle = '#1a1a2e';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`Day ${lvls[i].day}`, CANVAS_W / 2, by + btnH / 2);
    }

    ctx.fillStyle = '#666';
    ctx.font = '11px monospace';
    const bottomY = startY + lvls.length * (btnH + gap) + 15;
    ctx.fillText('Tap guests and stations to serve drinks', CANVAS_W / 2, bottomY);
  }
}
