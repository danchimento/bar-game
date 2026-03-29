import {
  CANVAS_W, CANVAS_H, COLORS,
  BAR_TOP_Y, SERVICE_MAT_Y, WALK_TRACK_Y, STATION_Y, STATION_LABEL_Y,
  GUEST_Y, SEAT_Y, SEATS, STATIONS, BAR_LEFT, BAR_RIGHT,
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

      // Drink progress — small glass that empties during ENJOYING
      if (guest.state === 'ENJOYING' && guest.enjoyTotal > 0) {
        const progress = guest.stateTimer / guest.enjoyTotal; // 1 = full, 0 = empty
        const gx = x + 20;
        const gy = y - 8;
        const gw = 8;
        const gh = 14;
        // Glass outline
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.strokeRect(gx, gy, gw, gh);
        // Fill level
        const drinkDef = DRINKS[guest.currentDrink];
        const fillH = gh * Math.max(0, progress);
        ctx.fillStyle = drinkDef?.color || '#d4a020';
        ctx.fillRect(gx, gy + gh - fillH, gw, fillH);
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
      beer:  { bg: '#2a1a0a', border: '#d4a020', title: '#d4a020' },
      wine:  { bg: '#2a1020', border: '#8b1a4a', title: '#d4708a' },
      mixer: { bg: '#0a1a2a', border: '#4a9ad4', title: '#6ab4e8' },
    };
    const colors = typeColors[modal.type] || typeColors.beer;
    const titles = { beer: 'Draft Beers', wine: 'Wines', mixer: 'Soda Gun' };

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

  drawPOSOverlay(posState, guests, posTab) {
    if (!posState.visible) return;
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const pw = 500;
    const ph = 440;
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

      const drinks = Object.keys(DRINKS);
      const btnW = 65;
      const btnH = 50;
      const drinksGap = 6;
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
        ctx.roundRect(bx, by, btnW, btnH, 4);
        ctx.fill();
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = '14px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(drinkDef.icon, bx + btnW / 2, by + 16);

        ctx.fillStyle = '#ccc';
        ctx.font = '8px monospace';
        ctx.fillText(drinkDef.name, bx + btnW / 2, by + 33);
        ctx.fillStyle = '#888';
        ctx.fillText(drinkDef.price > 0 ? `$${drinkDef.price}` : 'Free', bx + btnW / 2, by + 43);
      });

      // Print Check button
      const canPrint = guest && guest.state === GUEST_STATE.READY_TO_PAY && tab.length > 0;
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
