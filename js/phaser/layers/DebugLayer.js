import { DEPTH } from '../../constants/depths.js';

/**
 * DebugLayer — visual overlay for inspecting layout, scale, and positioning.
 *
 * Toggle with the "D" button in the top-right corner (mobile-friendly tap).
 * State persists via localStorage key 'bar-game-debug'.
 *
 * When enabled, renders on top of everything (even modals) at depth 150+:
 *   - Tile grid (32px)
 *   - Zone bands with labels (wall / customer / bar surface / cabinet /
 *     bartender / back counter) and Y-coordinate ranges
 *   - Station footprints: declared width (yellow dashed) vs rendered sprite
 *     bounds (red solid) — catches overlap bugs at a glance
 *   - Station ID + x + placement + scale labels
 *   - Seat markers (cyan) with seat IDs
 *   - Door (orange) and walk track (magenta dashed line)
 *   - Info strip (canvas size, tile size, bar width, FPS)
 */

const DBG_DEPTH_OVERLAY = DEPTH.MODAL_GLASS + 30;   // above modals
const DBG_DEPTH_BUTTON  = DEPTH.MODAL_GLASS + 50;
const LS_KEY = 'bar-game-debug';

// Colors
const C_GRID     = 0x00ffff;
const C_ZONE     = [0x8844ff, 0x00ff88, 0xffaa00, 0xaa7700, 0xff00ff, 0xff4444];
const C_DECL     = 0xffff00;  // declared footprint (yellow dashed)
const C_SPRITE   = 0xff0000;  // rendered sprite bounds (red)
const C_SEAT     = 0x00ffff;
const C_DOOR     = 0xff6600;
const C_WALK     = 0xff00ff;

export class DebugLayer {
  constructor(scene, barLayout) {
    this.scene = scene;
    this._bl = barLayout;
    this.enabled = this._readState();

    this._createOverlay();
    this._createToggleButton();
    this._applyVisibility();
  }

  _readState() {
    try { return localStorage.getItem(LS_KEY) === '1'; }
    catch (e) { return false; }
  }

  _writeState(v) {
    try { localStorage.setItem(LS_KEY, v ? '1' : '0'); }
    catch (e) { /* ignore */ }
  }

  // ─── Toggle button (always visible, mobile-sized) ─────────
  _createToggleButton() {
    const bl = this._bl;
    const size = 56;                 // >= 44px tap target (mobile guideline)
    const pad = 8;
    const x = bl.canvasW - size - pad;
    const y = pad;

    this.btnBg = this.scene.add.rectangle(x, y, size, size, 0x000000, 0.75)
      .setOrigin(0, 0).setDepth(DBG_DEPTH_BUTTON)
      .setStrokeStyle(3, 0x00ff88);
    this.btnText = this.scene.add.text(x + size / 2, y + size / 2, 'D', {
      fontFamily: 'monospace', fontSize: '28px', fontStyle: 'bold',
      color: '#00ff88',
    }).setOrigin(0.5).setDepth(DBG_DEPTH_BUTTON + 1);

    // Interactive zone (slightly oversized for easier tapping)
    this.btnZone = this.scene.add.zone(x - 4, y - 4, size + 8, size + 8)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(DBG_DEPTH_BUTTON + 2);
    this.btnZone.on('pointerup', () => this.toggle());
  }

  toggle() {
    this.enabled = !this.enabled;
    this._writeState(this.enabled);
    this._applyVisibility();
  }

  _applyVisibility() {
    this.overlayGfx.setVisible(this.enabled);
    this.labels.forEach(t => t.setVisible(this.enabled));
    // Button changes color when active
    this.btnBg.setFillStyle(this.enabled ? 0x00aa44 : 0x000000, 0.85);
    this.btnText.setColor(this.enabled ? '#ffffff' : '#00ff88');
    // Redraw when toggled on (in case anything changed)
    if (this.enabled) this._drawOverlay();
  }

  // ─── Overlay graphics + labels ────────────────────────────
  _createOverlay() {
    this.overlayGfx = this.scene.add.graphics().setDepth(DBG_DEPTH_OVERLAY);
    this.labels = [];
    this._drawOverlay();
  }

  _clearLabels() {
    this.labels.forEach(t => t.destroy());
    this.labels = [];
  }

  _label(x, y, text, color, opts = {}) {
    const t = this.scene.add.text(x, y, text, {
      fontFamily: 'monospace', fontSize: opts.size || '11px',
      color: color,
      backgroundColor: opts.bg || '#000000cc',
      padding: { x: 3, y: 1 },
      align: opts.align || 'left',
    }).setOrigin(opts.ox ?? 0, opts.oy ?? 0)
      .setDepth(DBG_DEPTH_OVERLAY + 1)
      .setVisible(this.enabled);
    this.labels.push(t);
    return t;
  }

  _dashedLine(g, x1, y1, x2, y2, dash = 8, gap = 6) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    let d = 0;
    while (d < len) {
      const a = d, b = Math.min(d + dash, len);
      g.lineBetween(x1 + ux * a, y1 + uy * a, x1 + ux * b, y1 + uy * b);
      d += dash + gap;
    }
  }

  _dashedRect(g, x, y, w, h, dash = 8, gap = 6) {
    this._dashedLine(g, x, y, x + w, y, dash, gap);
    this._dashedLine(g, x + w, y, x + w, y + h, dash, gap);
    this._dashedLine(g, x, y + h, x + w, y + h, dash, gap);
    this._dashedLine(g, x, y, x, y + h, dash, gap);
  }

  _drawOverlay() {
    const bl = this._bl;
    const g = this.overlayGfx;
    g.clear();
    this._clearLabels();

    // ── Tile grid (faint) ──
    g.lineStyle(1, C_GRID, 0.12);
    for (let x = 0; x <= bl.canvasW; x += bl.tile) {
      g.lineBetween(x, 0, x, bl.canvasH);
    }
    for (let y = 0; y <= bl.canvasH; y += bl.tile) {
      g.lineBetween(0, y, bl.canvasW, y);
    }

    // ── Zone bands with labels ──
    const zones = [
      ['WALL',           bl.wall.top,                 bl.wall.bottom],
      ['CUSTOMER AREA',  bl.customerArea.top,         bl.customerArea.bottom],
      ['BAR SURFACE',    bl.barCounter.surfaceTop,    bl.barCounter.surfaceBottom],
      ['BAR CABINET',    bl.barCounter.cabinetTop,    bl.barCounter.cabinetBottom],
      ['BARTENDER AREA', bl.bartenderArea.top,        bl.bartenderArea.bottom],
      ['BACK COUNTER',   bl.backCounter.top,          bl.backCounter.bottom],
    ];
    zones.forEach(([name, top, bottom], i) => {
      const color = C_ZONE[i];
      g.lineStyle(2, color, 0.8);
      g.strokeRect(0, top, bl.canvasW, bottom - top);
      const hex = '#' + color.toString(16).padStart(6, '0');
      this._label(4, top + 2,
        `${name}  y=${top}-${bottom}  h=${bottom - top}px (${Math.round((bottom - top) / bl.tile)}T)`,
        hex);
    });

    // ── Stations: declared footprint vs actual sprite bounds ──
    for (const st of bl.stations) {
      const pos = bl.stationScreenPos(st);
      const declaredW = st.width || 48;
      const spriteKey = this._spriteKeyFor(st.id);
      const tex = spriteKey ? this.scene.textures.get(spriteKey) : null;
      const src = tex && tex.source && tex.source[0];
      const spriteW = src ? src.width : declaredW;
      const spriteH = src ? src.height : 48;

      // Declared footprint (yellow dashed) — rect within the station's zone,
      // showing the horizontal space reserved for distribution. Height is
      // the zone height, not the sprite height, so it stays on-canvas.
      let zoneTop, zoneH;
      switch (pos.placement) {
        case 'on_counter':
        case 'in_counter':
          zoneTop = bl.counterSurfaceY;
          zoneH   = bl.counterH;
          break;
        case 'under_bar':
          zoneTop = bl.cabinetTop;
          zoneH   = bl.cabinetBottom - bl.cabinetTop;
          break;
        case 'floor_left':
          zoneTop = bl.bartenderArea.top;
          zoneH   = bl.bartenderArea.bottom - bl.bartenderArea.top;
          break;
        default:
          zoneTop = pos.y - 32;
          zoneH   = 64;
      }
      g.lineStyle(2, C_DECL, 0.9);
      this._dashedRect(g, st.x - declaredW / 2, zoneTop, declaredW, zoneH);

      // Actual sprite bounds (red solid) — where the sprite really renders
      let sprTop;
      switch (pos.placement) {
        case 'on_counter':   sprTop = pos.y - spriteH; break;
        case 'floor_left':   sprTop = pos.y - spriteH; break;
        default:             sprTop = pos.y - spriteH / 2;
      }
      g.lineStyle(2, C_SPRITE, 0.9);
      g.strokeRect(st.x - spriteW / 2, sprTop, spriteW, spriteH);

      // Center marker
      g.fillStyle(C_SPRITE, 1);
      g.fillCircle(st.x, pos.y, 4);

      // Label above sprite (clamped on-canvas)
      const labelY = Math.max(8, sprTop - 4);
      this._label(st.x, labelY,
        `${st.id}\nx=${st.x} (${pos.placement})\ndecl ${declaredW}  sprite ${spriteW}×${spriteH}`,
        '#ffff00', { size: '10px', align: 'center', ox: 0.5, oy: 1 });
    }

    // ── Seats ──
    for (const seat of bl.seats) {
      g.fillStyle(C_SEAT, 1);
      g.fillCircle(seat.x, bl.seatY, 6);
      g.lineStyle(1, C_SEAT, 0.4);
      g.lineBetween(seat.x, bl.customerArea.top, seat.x, bl.seatY);
      this._label(seat.x, bl.seatY + 8,
        `seat${seat.id}\nx=${seat.x}`, '#00ffff',
        { size: '10px', align: 'center', ox: 0.5, oy: 0 });
    }

    // ── Door ──
    g.fillStyle(C_DOOR, 1);
    g.fillCircle(bl.doorX, bl.doorY, 6);
    this._label(bl.doorX, bl.doorY + 8,
      `door\nx=${bl.doorX} y=${bl.doorY}`, '#ff9933',
      { size: '10px', align: 'center', ox: 0.5, oy: 0 });

    // ── Walk track (horizontal dashed) ──
    g.lineStyle(2, C_WALK, 0.9);
    this._dashedLine(g, 0, bl.walkTrackY, bl.canvasW, bl.walkTrackY, 12, 8);
    this._label(8, bl.walkTrackY - 14,
      `walkTrackY=${bl.walkTrackY}`, '#ff66ff', { size: '10px' });

    // ── Service mat Y ──
    g.lineStyle(1, 0x66ffaa, 0.6);
    this._dashedLine(g, 0, bl.serviceMatY, bl.canvasW, bl.serviceMatY, 6, 4);
    this._label(bl.canvasW - 8, bl.serviceMatY - 14,
      `serviceMatY=${bl.serviceMatY}`, '#66ffaa', { size: '10px', ox: 1 });

    // ── Info strip (bottom-left) ──
    this._label(4, bl.canvasH - 20,
      `Canvas ${bl.canvasW}×${bl.canvasH}  Tile ${bl.tile}px  Bar ${bl.barWidth}px  Seats ${bl.seats.length}  Stations ${bl.stations.length}`,
      '#ffffff', { size: '11px' });
  }

  _spriteKeyFor(stationId) {
    const map = {
      DISHWASHER: 'station_dishwasher',
      SINK: 'station_sink',
      GLASS_RACK: 'station_glass_rack',
      TAPS: 'station_taps',
      WINE: 'station_wine',
      PREP: 'station_prep',
      POS: 'station_pos',
      TRASH: 'station_trash',
      MENU: 'station_menu',
    };
    return map[stationId] || null;
  }

  update() {
    // Zones are static; only redraw if layout changed. Skipping per-frame
    // redraw to keep the overlay cheap. Toggle-on forces a redraw.
  }

  destroy() {
    this.overlayGfx?.destroy();
    this.labels.forEach(t => t.destroy());
    this.btnBg?.destroy();
    this.btnText?.destroy();
    this.btnZone?.destroy();
  }
}
