import { COUNTER_BASE_ROWS } from '../constants/layout.js';
import { STATION_TEMPLATES } from '../data/levels.js';

/**
 * BarLayout — single source of truth for all spatial positions.
 *
 * ## Tile grid
 *
 * The layout is built on a 32px tile grid. Structure positions are defined
 * in tile counts. Bar extends full canvas width (no side margins).
 *
 * ### Landscape (default) — 18 tiles tall (576px), width adapts to device
 *
 *   ┌──────────────────────────────────────────┐  tile 0
 *   │  WALL (1 tile)                           │
 *   ├──────────────────────────────────────────┤  tile 1
 *   │  customer area (8 tiles, 256px)          │  ← derived gap
 *   ├═════════════════════════════════════════─┤  tile 9
 *   │  BAR COUNTER surface (3) + cabinet (1)   │
 *   ├═════════════════════════════════════════─┤  tile 13
 *   │  bartender area (3 tiles, 96px)          │  ← derived gap
 *   ├──────────────────────────────────────────┤  tile 16
 *   │  BACK COUNTER (2 tiles)                  │
 *   └──────────────────────────────────────────┘  tile 18
 *
 * ### Portrait — 32 tiles tall (1024px), width fixed to 576px
 *
 *   ┌──────────────────────────────────────────┐  tile  0
 *   │  WALL (1 tile)                           │
 *   ├──────────────────────────────────────────┤  tile  1
 *   │  customer area (17 tiles, 544px)         │  ← big queue space
 *   ├═════════════════════════════════════════─┤  tile 18
 *   │  BAR COUNTER surface (3) + cabinet (2)   │
 *   ├═════════════════════════════════════════─┤  tile 23
 *   │  bartender area (5 tiles, 160px)         │  ← more working room
 *   ├──────────────────────────────────────────┤  tile 28
 *   │  BACK COUNTER (4 tiles, 128px)           │  ← roomy counter
 *   └──────────────────────────────────────────┘  tile 32 (1024px)
 *
 * ## Bar path (future)
 *
 * Stations and seats have a parametric `t ∈ [0, 1]` along the bar.
 * For straight bars, t maps linearly to X. Later, curves.
 */

export const TILE = 32;

// ─── Structure presets per layout mode ──────────────
const LAYOUT_PRESETS = {
  landscape: {
    structures: {
      wall:         { topTile: 0,  tiles: 1 },
      bar_counter:  { topTile: 9,  surfaceTiles: 3, cabinetTiles: 1 },
      back_counter: { topTile: 16, tiles: 2 },
    },
  },
  portrait: {
    structures: {
      wall:         { topTile: 0,  tiles: 1 },
      bar_counter:  { topTile: 18, surfaceTiles: 3, cabinetTiles: 2 },
      back_counter: { topTile: 28, tiles: 4 },
    },
  },
};

// ─── Station placement rules ────────────────────────
// Placement types determine a station's Y position and X-distribution group:
//   on_counter   — stations sit on the back counter (TAPS, POS, MENU…)
//   in_counter   — stations embedded in the back counter (SINK)
//   under_bar    — stations in the bar cabinet (GLASS_RACK, DISHWASHER)
//   floor_left   — pinned to the bottom-left floor of the bartender area (TRASH)
const STATION_PLACEMENT = {
  TAPS:        'on_counter',
  WINE:        'on_counter',
  PREP:        'on_counter',
  POS:         'on_counter',
  MENU:        'on_counter',
  SINK:        'in_counter',
  GLASS_RACK:  'under_bar',
  DISHWASHER:  'under_bar',
  TRASH:       'floor_left',
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

    // ── Bar bounds (horizontal — full width, edge to edge) ──
    this.barWidth = canvasW;
    this.barLeft = 0;
    this.barRight = canvasW;

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
    this.serviceMatY = this.bartenderArea.top + Math.round(TILE * 0.5);
    this.walkTrackY = Math.round(this.bartenderArea.top + this.bartenderArea.height * 0.5);

    this.counterSurfaceY = this.backCounter.top;
    this.counterH = this.backCounter.height;
    this.counterY = Math.round((this.backCounter.top + this.backCounter.bottom) / 2);
    this.stationY = this.counterY;

    this.waitingY = this.wall.bottom + TILE;
    this.guestY = this.customerArea.bottom - Math.round(TILE * 0.75);
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
        // Anchor sprite top at cabinet top (origin 0.5, 0 in StationLayer).
        // Sprites extend down from there into the bartender area — like
        // real behind-the-bar equipment sitting on the floor — so they
        // never cross above the bar surface.
        y = this.cabinetTop;
        break;
      case 'floor_left':
        // Bottom of the bartender area (just above back counter)
        y = this.backCounter.top;
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

    // Expand to full templates
    const templates = stations.map(st => {
      const tmpl = STATION_TEMPLATES[st.id || st] || {};
      return { ...tmpl, ...(typeof st === 'string' ? { id: st } : st) };
    });

    // Group stations by placement type — each group is distributed across
    // the full bar width independently, so stations on the back counter
    // don't share horizontal space with stations under the bar.
    // Corner placements (floor_left) get a pinned X near the edge.
    const groups = {};
    for (const st of templates) {
      const placement = STATION_PLACEMENT[st.id] || 'on_counter';
      if (placement === 'floor_left') {
        // Pin near the left edge, offset by a small margin + half-width
        st.pinnedX = this.barLeft + TILE + Math.round((st.width || 3 * TILE) / 2);
      }
      (groups[placement] = groups[placement] || []).push(st);
    }

    const totalWidth = this.barWidth - 2 * TILE; // 1-tile margin each side
    const marginLeft = this.barLeft + TILE;
    const result = [];

    for (const group of Object.values(groups)) {
      // Pinned stations (explicit x or pinned placement) don't participate in
      // even distribution — they get handled separately below.
      const pinned = group.filter(st => st.pinnedX != null);
      const flex = group.filter(st => st.pinnedX == null);

      // Scale down group widths if they exceed the bar
      let groupTotal = flex.reduce((s, t) => s + (t.width || 3 * TILE), 0);
      if (groupTotal > totalWidth * 0.95) {
        const scale = (totalWidth * 0.9) / groupTotal;
        for (const t of flex) t.width = Math.round((t.width || 3 * TILE) * scale);
        groupTotal = flex.reduce((s, t) => s + t.width, 0);
      }
      const gap = flex.length
        ? (totalWidth - groupTotal) / (flex.length + 1)
        : 0;
      let x = marginLeft + gap;

      for (const st of flex) {
        const w = st.width || 3 * TILE;
        const cx = Math.round(x + w / 2);
        const t = (cx - this.barLeft) / this.barWidth;
        x += w + gap;
        result.push({ ...st, x: cx, t });
      }
      for (const st of pinned) {
        const t = (st.pinnedX - this.barLeft) / this.barWidth;
        result.push({ ...st, x: st.pinnedX, t });
      }
    }

    return result;
  }

  _layoutSeats(count) {
    const seats = [];
    const margin = 2 * TILE; // small edge margin
    const usableWidth = this.barWidth - margin * 2;
    const gap = usableWidth / (count + 1);
    for (let i = 0; i < count; i++) {
      const x = Math.round(margin + gap * (i + 1));
      const t = (x - this.barLeft) / this.barWidth;
      seats.push({ id: i, x, t });
    }
    return seats;
  }
}
