import { STATION_SCALE, COUNTER_BASE_ROWS } from '../constants/layout.js';
import { STATION_TEMPLATES } from '../data/levels.js';

/**
 * BarLayout — single source of truth for all spatial layout.
 *
 * Created once per level in GamePlayScene.create(). Passed by reference to
 * every layer, entity, and system that needs position information.
 *
 * Zones use the same proportional weight system as before. Station and seat
 * positions are computed from ordered lists (no hardcoded X values).
 *
 * ## Bar path (future extensibility)
 *
 * Stations and seats are placed at parameter t ∈ [0, 1] along a path.
 * For straight bars, t maps linearly to X. Later, t can follow a curve
 * for wrap-around bar layouts.
 *
 *   counterPathAt(t) → back counter (stations)
 *   barPathAt(t)     → customer-facing bar (seats)
 */

// ─── Zone weight definitions ────────────────────────
const ZONE_DEFS = [
  { id: 'wall',        weight: 0.14 },
  { id: 'guest_area',  weight: 0.34 },
  { id: 'bar_top',     weight: 0.06 },
  { id: 'bar_cabinet', weight: 0.09 },
  { id: 'floor',       weight: 0.33 },
  { id: 'counter',     weight: 0.04 },
];

/** Resolve zone defs into pixel ranges */
function resolveZones(defs, totalH) {
  const totalWeight = defs.reduce((s, z) => s + z.weight, 0);
  const zones = {};
  let y = 0;
  for (const def of defs) {
    const h = Math.round((def.weight / totalWeight) * totalH);
    zones[def.id] = { top: y, bottom: y + h, height: h, center: y + h / 2 };
    y += h;
  }
  const last = defs[defs.length - 1];
  zones[last.id].bottom = totalH;
  zones[last.id].height = totalH - zones[last.id].top;
  zones[last.id].center = zones[last.id].top + zones[last.id].height / 2;
  return zones;
}

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
   * @param {number} [config.barWidth=860]
   * @param {number} config.seatCount
   * @param {Array}  config.stations - from level: [{ id, width, label, ... }]
   */
  constructor(config) {
    const { canvasW, canvasH, barWidth = 860, seatCount, stations } = config;

    this.canvasW = canvasW;
    this.canvasH = canvasH;

    // ── Zones (proportional, same for all levels) ──
    this.zones = resolveZones(ZONE_DEFS, canvasH);

    // ── Bar bounds ──
    this.barWidth = barWidth;
    this.barLeft = (canvasW - barWidth) / 2;
    this.barRight = this.barLeft + barWidth;

    // ── Derived Y coordinates ──
    const z = this.zones;

    // Guest area
    this.waitingY = z.wall.bottom + 30;
    this.guestY = z.guest_area.bottom - 20;
    this.seatY = z.guest_area.bottom - 5;

    // Bar top surface
    this.barTopY = z.bar_top.top;
    this.barSurfaceY = z.bar_top.top + 4;
    this.barFrontY = z.bar_top.bottom - 5;
    this.barDepthPx = this.barFrontY - this.barSurfaceY;
    this.barInch = this.barDepthPx / 30;

    // Bar cabinets
    this.cabinetTop = z.bar_cabinet.top;
    this.cabinetBottom = z.bar_cabinet.bottom;
    this.cabinetMidY = (z.bar_cabinet.top + z.bar_cabinet.bottom) / 2;

    // Floor
    this.floorY = z.floor.top;
    this.serviceMatY = z.floor.top + 15;
    this.walkTrackY = Math.round(z.floor.top + z.floor.height * 0.35);

    // Back counter
    this.counterSurfaceY = z.counter.top;
    this.counterH = z.counter.height;
    this.counterY = z.counter.center;
    this.stationY = z.counter.center;

    // ── Bartender ──
    this.bartenderStartX = Math.round(canvasW / 2);

    // ── Stations (from level config) ──
    this.stations = this._layoutStations(stations);

    // ── Seats ──
    this.seats = this._layoutSeats(seatCount);
  }

  // ─── BAR PATH (straight for now) ──────────────────

  /** Back counter path: t ∈ [0,1] → { x, y, angle } */
  counterPathAt(t) {
    return {
      x: this.barLeft + t * this.barWidth,
      y: this.counterSurfaceY,
      angle: 0,
    };
  }

  /** Customer-facing bar path: t ∈ [0,1] → { x, y, angle } */
  barPathAt(t) {
    return {
      x: this.barLeft + t * this.barWidth,
      y: this.barSurfaceY,
      angle: 0,
    };
  }

  // ─── POSITION HELPERS ─────────────────────────────

  /** Get screen position for a station, accounting for placement type */
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

  /** Get screen position for a seat */
  seatScreenPos(seatId) {
    const seat = this.seats[seatId];
    return { x: seat.x, y: this.seatY };
  }

  /** Bartender walk bounds */
  get walkBounds() {
    return { minX: this.barLeft, maxX: this.barRight };
  }

  /** Convert bar-depth inches from customer edge to screen Y */
  barY(inchesFromEdge) {
    return this.barSurfaceY + inchesFromEdge * this.barInch;
  }

  // ─── INTERNAL LAYOUT ──────────────────────────────

  /**
   * Distribute stations evenly with gaps across the counter.
   * Accepts either pre-built station objects (from layoutStations()) or
   * processes them to add x positions and t parameters.
   */
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

    const totalWidth = 900;
    const marginLeft = 30;
    const totalStationWidth = templates.reduce((s, t) => s + (t.width || 50), 0);
    const gap = (totalWidth - totalStationWidth) / (templates.length + 1);
    let x = marginLeft + gap;

    return templates.map(st => {
      const w = st.width || 50;
      const cx = Math.round(x + w / 2);
      const t = (cx - this.barLeft) / this.barWidth;
      x += w + gap;
      return { ...st, x: cx, t };
    });
  }

  /**
   * Distribute seats evenly along the bar front.
   * Absorbs the logic from constants.js setSeatCount().
   */
  _layoutSeats(count) {
    const seats = [];
    const margin = 120;
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
