import { COUNTER_BASE_ROWS } from '../constants/layout.js';
import { STATION_TEMPLATES } from '../data/levels.js';

/**
 * BarLayout — single source of truth for all spatial positions.
 *
 * ## Tile grid
 *
 * The layout is built on a 16px tile grid. Structure positions are defined
 * in tile counts. Two layout modes are supported:
 *
 * ### Landscape (default) — 36 tiles tall, width adapts to device
 *
 *   ┌──────────────────────────────────────────┐  tile 0
 *   │  WALL (5 tiles)                          │
 *   ├──────────────────────────────────────────┤  tile 5
 *   │  customer area (12 tiles)                │  ← derived gap
 *   ├═════════════════════════════════════════─┤  tile 17
 *   │  BAR COUNTER surface (2) + cabinet (3)   │
 *   ├═════════════════════════════════════════─┤  tile 22
 *   │  bartender area (12 tiles)               │  ← derived gap
 *   ├──────────────────────────────────────────┤  tile 34
 *   │  BACK COUNTER (2 tiles)                  │
 *   └──────────────────────────────────────────┘  tile 36
 *
 * ### Portrait — 36 tiles wide, height adapts to device
 *   Same structures, more vertical space. Customer and bartender areas expand.
 *
 * ## Bar path (future)
 *
 * Stations and seats have a parametric `t ∈ [0, 1]` along the bar.
 * For straight bars, t maps linearly to X. Later, curves.
 */

export const TILE = 16;

// ─── Structure presets per layout mode ──────────────
const LAYOUT_PRESETS = {
  landscape: {
    structures: {
      wall:         { topTile: 0,  tiles: 5 },
      bar_counter:  { topTile: 17, surfaceTiles: 2, cabinetTiles: 3 },
      back_counter: { topTile: 34, tiles: 2 },
    },
    barTiles: 54,  // 864px
  },
  portrait: {
    structures: {
      wall:         { topTile: 0,  tiles: 6 },
      bar_counter:  { topTile: 28, surfaceTiles: 2, cabinetTiles: 4 },
      back_counter: { topTile: 60, tiles: 2 },
    },
    barTiles: 32,  // 512px
  },
};

// ─── Station placement rules ────────────────────────
const STATION_PLACEMENT = {
  TAPS:        'on_counter',
  WINE:        'on_counter',
  PREP:        'on_counter',
  POS:         'on_counter',
  MENU:        'on_counter',
  SINK:        'in_counter',
  GLASS_RACK:  'under_bar',
  DISHWASHER:  'under_bar',
  TRASH:       'under_bar',
};

export class BarLayout {
  /**
   * @param {Object} config
   * @param {number} config.canvasW
   * @param {number} config.canvasH
   * @param {'landscape'|'portrait'} [config.mode='landscape']
   * @param {number} config.seatCount
   * @param {Array}  config.stations - from level definition
   */
  constructor(config) {
    const { canvasW, canvasH, seatCount, stations } = config;
    const mode = config.mode || 'landscape';
    const preset = LAYOUT_PRESETS[mode] || LAYOUT_PRESETS.landscape;
    const barWidth = config.barWidth || preset.barTiles * TILE;

    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.tile = TILE;

    // ── Structures (pixel bounds from tile positions) ──
    const w = preset.structures.wall;
    const bc = preset.structures.bar_counter;
    const rc = preset.structures.back_counter;

    this.wall = {
      top: w.topTile * TILE,
      bottom: (w.topTile + w.tiles) * TILE,
      height: w.tiles * TILE,
    };

    this.barCounter = {
      surfaceTop: bc.topTile * TILE,
      surfaceBottom: (bc.topTile + bc.surfaceTiles) * TILE,
      surfaceHeight: bc.surfaceTiles * TILE,
      cabinetTop: (bc.topTile + bc.surfaceTiles) * TILE,
      cabinetBottom: (bc.topTile + bc.surfaceTiles + bc.cabinetTiles) * TILE,
      cabinetHeight: bc.cabinetTiles * TILE,
    };

    this.backCounter = {
      top: rc.topTile * TILE,
      bottom: (rc.topTile + rc.tiles) * TILE,
      height: rc.tiles * TILE,
    };

    // ── Derived spaces (gaps between structures) ──
    this.customerArea = {
      top: this.wall.bottom,
      bottom: this.barCounter.surfaceTop,
      height: this.barCounter.surfaceTop - this.wall.bottom,
    };

    this.bartenderArea = {
      top: this.barCounter.cabinetBottom,
      bottom: this.backCounter.top,
      height: this.backCounter.top - this.barCounter.cabinetBottom,
    };

    // ── Bar bounds (horizontal) ──
    this.barWidth = barWidth;
    this.barLeft = Math.round((canvasW - barWidth) / 2);
    this.barRight = this.barLeft + barWidth;

    // ── Backward-compatible Y coordinates ──
    // (read by layers — derived from structures, not declared independently)
    this.barTopY = this.barCounter.surfaceTop;
    this.barSurfaceY = this.barCounter.surfaceTop;
    this.barFrontY = this.barCounter.surfaceBottom;
    this.barDepthPx = this.barCounter.surfaceHeight;
    this.barInch = this.barDepthPx / 30;

    this.cabinetTop = this.barCounter.cabinetTop;
    this.cabinetBottom = this.barCounter.cabinetBottom;
    this.cabinetMidY = Math.round((this.cabinetTop + this.cabinetBottom) / 2);

    this.floorY = this.bartenderArea.top;
    this.serviceMatY = this.bartenderArea.top + TILE;
    this.walkTrackY = Math.round(this.bartenderArea.top + this.bartenderArea.height * 0.35);

    this.counterSurfaceY = this.backCounter.top;
    this.counterH = this.backCounter.height;
    this.counterY = Math.round((this.backCounter.top + this.backCounter.bottom) / 2);
    this.stationY = this.counterY;

    this.waitingY = this.wall.bottom + 2 * TILE;
    this.guestY = this.customerArea.bottom - TILE;
    this.seatY = this.customerArea.bottom - 4;

    // ── Door (top-center of wall) ──
    this.doorX = Math.round(canvasW / 2);
    this.doorY = this.wall.bottom;     // guests emerge at bottom of wall
    // Horizontal walk lane — halfway between wall and bar (midpoint of customer area)
    this.guestWalkY = Math.round((this.customerArea.top + this.customerArea.bottom) / 2);

    // ── Bartender ──
    this.bartenderStartX = Math.round(canvasW / 2);

    // ── Stations ──
    this.stations = this._layoutStations(stations);

    // ── Seats ──
    this.seats = this._layoutSeats(seatCount);
  }

  // ─── BAR PATH (straight for now) ──────────────────

  counterPathAt(t) {
    return {
      x: this.barLeft + t * this.barWidth,
      y: this.counterSurfaceY,
      angle: 0,
    };
  }

  barPathAt(t) {
    return {
      x: this.barLeft + t * this.barWidth,
      y: this.barSurfaceY,
      angle: 0,
    };
  }

  // ─── POSITION HELPERS ─────────────────────────────

  stationScreenPos(station) {
    const placement = STATION_PLACEMENT[station.id] || 'on_counter';
    let y;
    switch (placement) {
      case 'on_counter': {
        const baseRows = COUNTER_BASE_ROWS[station.id] || 3;
        const sinkPx = baseRows;  // rows are already in screen pixels at 1:1
        y = this.counterSurfaceY + this.counterH * 0.5 + sinkPx;
        break;
      }
      case 'in_counter':
        y = this.counterY;
        break;
      case 'under_bar':
        y = this.cabinetMidY;
        break;
    }
    return { x: station.x, y, placement };
  }

  seatScreenPos(seatId) {
    const seat = this.seats[seatId];
    return { x: seat.x, y: this.seatY };
  }

  get walkBounds() {
    return { minX: this.barLeft, maxX: this.barRight };
  }

  barY(inchesFromEdge) {
    return this.barSurfaceY + inchesFromEdge * this.barInch;
  }

  // ─── INTERNAL LAYOUT ──────────────────────────────

  _layoutStations(stations) {
    if (!stations || !stations.length) return [];

    // If stations already have x positions (from legacy layoutStations()),
    // just add t parameters
    if (stations[0].x != null) {
      return stations.map(st => ({
        ...st,
        t: (st.x - this.barLeft) / this.barWidth,
      }));
    }

    // Ensure MENU is always present
    const ids = stations.map(st => typeof st === 'string' ? st : st.id);
    if (!ids.includes('MENU')) stations = [...stations, 'MENU'];

    // Distribute from IDs using STATION_TEMPLATES
    const templates = stations.map(st => {
      const tmpl = STATION_TEMPLATES[st.id || st] || {};
      return { ...tmpl, ...(typeof st === 'string' ? { id: st } : st) };
    });

    const totalWidth = this.barWidth - 2 * TILE; // 1-tile margin each side
    const marginLeft = this.barLeft + TILE;
    let totalStationWidth = templates.reduce((s, t) => s + (t.width || 3 * TILE), 0);

    // If stations are too wide for the bar, scale them down proportionally
    if (totalStationWidth > totalWidth * 0.9) {
      const scale = (totalWidth * 0.85) / totalStationWidth;
      for (const t of templates) t.width = Math.round((t.width || 3 * TILE) * scale);
      totalStationWidth = templates.reduce((s, t) => s + t.width, 0);
    }
    const gap = (totalWidth - totalStationWidth) / (templates.length + 1);
    let x = marginLeft + gap;

    return templates.map(st => {
      const w = st.width || 3 * TILE;
      const cx = Math.round(x + w / 2);
      const t = (cx - this.barLeft) / this.barWidth;
      x += w + gap;
      return { ...st, x: cx, t };
    });
  }

  _layoutSeats(count) {
    const seats = [];
    const margin = 7 * TILE; // 112px margin on each side
    const usableWidth = this.canvasW - margin * 2;
    const gap = usableWidth / (count + 1);
    for (let i = 0; i < count; i++) {
      const x = Math.round(margin + gap * (i + 1));
      const t = (x - this.barLeft) / this.barWidth;
      seats.push({ id: i, x, t });
    }
    return seats;
  }
}
