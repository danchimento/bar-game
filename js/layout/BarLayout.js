import { STATION_SCALE, COUNTER_BASE_ROWS } from '../constants/layout.js';
import { STATION_TEMPLATES } from '../data/levels.js';

/**
 * BarLayout — single source of truth for all spatial positions.
 *
 * ## Tile grid
 *
 * The layout is built on a 16px tile grid. CANVAS_H (576px) = 36 tiles.
 * Width is dynamic (device aspect ratio) but station footprints and bar
 * width snap to tile multiples.
 *
 * ## Scene model
 *
 * The screen is a side-view diorama. The scene contains STRUCTURES placed
 * on a ground plane, rendered top-to-bottom = far-to-near:
 *
 *   ┌─────────────────────────────────────────┐  tile 0
 *   │  WALL (5 tiles, 80px)                   │  Back wall, clock
 *   ├─────────────────────────────────────────┤  tile 5
 *   │  customer area (12 tiles, 192px)        │  Derived gap — guests
 *   │  (waiting line at top, stools at bottom) │  walk in and sit here
 *   ├═════════════════════════════════════════┤  tile 17
 *   │  BAR COUNTER surface (2 tiles, 32px)    │  Top face — drinks sit here
 *   ├─────────────────────────────────────────┤  tile 19
 *   │  BAR COUNTER cabinet (3 tiles, 48px)    │  Front face — under-bar storage
 *   ├═════════════════════════════════════════┤  tile 22
 *   │  bartender area (12 tiles, 192px)       │  Derived gap — bartender
 *   │  (walk track, service mat)              │  moves here
 *   ├─────────────────────────────────────────┤  tile 34
 *   │  BACK COUNTER (2 tiles, 32px)           │  Stations (taps, POS, etc.)
 *   └─────────────────────────────────────────┘  tile 36 (576px)
 *
 * Structures are the physical objects. The customer area and bartender area
 * are NOT declared — they are the gaps between structures.
 *
 * ## Bar path (future)
 *
 * Stations and seats have a parametric `t ∈ [0, 1]` along the bar.
 * For straight bars, t maps linearly to X. Later, curves.
 */

export const TILE = 16;

// ─── Structure definitions (tile positions) ─────────
const STRUCTURES = {
  wall:         { topTile: 0,  tiles: 5 },
  bar_counter:  { topTile: 17, surfaceTiles: 2, cabinetTiles: 3 },
  back_counter: { topTile: 34, tiles: 2 },
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
   * @param {number} config.canvasH - should be 576 (36 tiles)
   * @param {number} [config.barWidth=864] - snapped to tile multiple (54 tiles)
   * @param {number} config.seatCount
   * @param {Array}  config.stations - from level definition
   */
  constructor(config) {
    const { canvasW, canvasH, barWidth = 54 * TILE, seatCount, stations } = config;

    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.tile = TILE;

    // ── Structures (pixel bounds from tile positions) ──
    const w = STRUCTURES.wall;
    const bc = STRUCTURES.bar_counter;
    const rc = STRUCTURES.back_counter;

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
    this.guestWalkY = this.wall.bottom + TILE;  // horizontal walk lane (1 tile below wall)

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
        const sinkPx = baseRows * STATION_SCALE;
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

    // Otherwise, distribute from IDs using STATION_TEMPLATES
    const templates = stations.map(st => {
      const tmpl = STATION_TEMPLATES[st.id || st] || {};
      return { ...tmpl, ...(typeof st === 'string' ? { id: st } : st) };
    });

    const totalWidth = this.barWidth - 2 * TILE; // 1-tile margin each side
    const marginLeft = this.barLeft + TILE;
    const totalStationWidth = templates.reduce((s, t) => s + (t.width || 3 * TILE), 0);
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
