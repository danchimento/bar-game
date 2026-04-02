// ═══════════════════════════════════════════════════════════
// CANVAS
// ═══════════════════════════════════════════════════════════
export const CANVAS_W = 960;
export const CANVAS_H = 540;

// ═══════════════════════════════════════════════════════════
// ZONE LAYOUT — single source of truth for the spatial map
// ═══════════════════════════════════════════════════════════
// Each zone has a proportional weight. The layout resolver turns
// weights into pixel ranges. Change a weight and everything
// downstream adjusts automatically — no manual offset math.
//
// Physical space (top to bottom of screen):
//   wall → guest_area → bar_top → bar_cabinet → floor → counter

const ZONE_DEFS = [
  { id: 'wall',        weight: 0.10 },   // back wall (+1 tile taller)
  { id: 'guest_area',  weight: 0.36 },   // where guests walk in and stand
  { id: 'bar_top',     weight: 0.06 },   // the bar surface customers sit at
  { id: 'bar_cabinet', weight: 0.09 },   // under-bar storage (glass rack, etc.)
  { id: 'floor',       weight: 0.30 },   // open floor behind the bar (-1 tile)
  { id: 'counter',     weight: 0.09 },   // back counter strip (+1 tile taller)
];

/** Resolve zone definitions into pixel ranges */
function resolveZones(defs, totalH) {
  const totalWeight = defs.reduce((s, z) => s + z.weight, 0);
  const zones = {};
  let y = 0;
  for (const def of defs) {
    const h = Math.round((def.weight / totalWeight) * totalH);
    zones[def.id] = { top: y, bottom: y + h, height: h, center: y + h / 2 };
    y += h;
  }
  // Snap last zone to exactly totalH to avoid rounding gaps
  const last = defs[defs.length - 1];
  zones[last.id].bottom = totalH;
  zones[last.id].height = totalH - zones[last.id].top;
  zones[last.id].center = zones[last.id].top + zones[last.id].height / 2;
  return zones;
}

export const ZONES = resolveZones(ZONE_DEFS, CANVAS_H);

// ═══════════════════════════════════════════════════════════
// DERIVED LAYOUT — everything below reads from ZONES
// ═══════════════════════════════════════════════════════════

// Guest area
export const WAITING_Y = ZONES.wall.bottom + 30;
export const GUEST_Y = ZONES.guest_area.bottom - 20;
export const SEAT_Y = ZONES.guest_area.bottom - 5;

// Bar top surface — the customer-facing bar
export const BAR_TOP_Y = ZONES.bar_top.top;
export const BAR_SURFACE_Y = ZONES.bar_top.top + 4;     // where the surface texture starts
export const BAR_FRONT_Y = ZONES.bar_top.bottom - 5;    // bartender-side edge
export const BAR_DEPTH_PX = BAR_FRONT_Y - BAR_SURFACE_Y;

// Bar physical width (centered)
export const BAR_MAX_W = 860;
export const BAR_LEFT = (CANVAS_W - BAR_MAX_W) / 2;
export const BAR_RIGHT = BAR_LEFT + BAR_MAX_W;

// Bar cabinets (under the bar)
export const BAR_CABINET_TOP = ZONES.bar_cabinet.top;
export const BAR_CABINET_BOTTOM = ZONES.bar_cabinet.bottom;

// Floor
export const FLOOR_Y = ZONES.floor.top;
export const SERVICE_MAT_Y = ZONES.floor.top + 15;
export const WALK_TRACK_Y = Math.round(ZONES.floor.top + ZONES.floor.height * 0.35);

// Back counter (flush with screen bottom)
export const COUNTER_SURFACE_Y = ZONES.counter.top;
export const COUNTER_H = ZONES.counter.height;
export const COUNTER_Y = ZONES.counter.center;
export const STATION_Y = ZONES.counter.center;

// ═══════════════════════════════════════════════════════════
// BAR DEPTH HELPER — position objects "on" the bar surface
// ═══════════════════════════════════════════════════════════
// Real bar ≈ 30 inches deep. 1 inch ≈ BAR_DEPTH_PX / 30 pixels.
export const BAR_INCH = BAR_DEPTH_PX / 30;

/** Convert distance from customer edge (inches) to screen Y */
export function barY(inchesFromEdge) {
  return BAR_SURFACE_Y + inchesFromEdge * BAR_INCH;
}

// ═══════════════════════════════════════════════════════════
// COLORS
// ═══════════════════════════════════════════════════════════
export const COLORS = {
  WALL:         0x252540,
  FLOOR:        0x3d2b1b,
  BAR_TOP:      0x8B4513,
  BAR_CABINET:  0x2a1a0e,
  COUNTER:      0x3a2a1a,
};

// ═══════════════════════════════════════════════════════════
// SEATS — dynamic, rebuilt per level
// ═══════════════════════════════════════════════════════════
export const SEATS = [
  { id: 0, x: 200 },
  { id: 1, x: 480 },
  { id: 2, x: 760 },
];

export function setSeatCount(n) {
  SEATS.length = 0;
  const margin = 120;
  const barWidth = CANVAS_W - margin * 2;
  const gap = barWidth / (n + 1);
  for (let i = 0; i < n; i++) {
    SEATS.push({ id: i, x: Math.round(margin + gap * (i + 1)) });
  }
  return SEATS;
}

// ═══════════════════════════════════════════════════════════
// STATIONS — static definitions (x positions set by levels.js)
// ═══════════════════════════════════════════════════════════
export const STATIONS = [
  { id: 'DISHWASHER',  x: 60,  label: 'Dish',  icon: '🫧' },
  { id: 'SINK',        x: 150, label: 'Sink',  icon: '🚰' },
  { id: 'GLASS_RACK',  x: 250, label: 'Glass', icon: '🥃' },
  { id: 'TAPS',        x: 380, label: 'Taps',  icon: '🍺' },
  { id: 'WINE',        x: 510, label: 'Wine',  icon: '🍷' },
  { id: 'PREP',        x: 650, label: 'Prep',  icon: '🔪' },
  { id: 'POS',         x: 850, label: 'POS',   icon: '💻' },
  { id: 'MENU',        x: 930, label: 'Menu',  icon: '📋' },
];

// ═══════════════════════════════════════════════════════════
// BARTENDER
// ═══════════════════════════════════════════════════════════
export const BARTENDER_SPEED = 280;
export const BARTENDER_START_X = 480;

// ═══════════════════════════════════════════════════════════
// GUEST STATES & MOOD
// ═══════════════════════════════════════════════════════════
export const GUEST_STATE = {
  WAITING_FOR_SEAT: 'WAITING_FOR_SEAT',
  ARRIVING: 'ARRIVING',
  SEATED: 'SEATED',
  LOOKING: 'LOOKING',
  READY_TO_ORDER: 'READY_TO_ORDER',
  ORDER_TAKEN: 'ORDER_TAKEN',
  WAITING_FOR_DRINK: 'WAITING_FOR_DRINK',
  ENJOYING: 'ENJOYING',
  WANTS_ANOTHER: 'WANTS_ANOTHER',
  READY_TO_PAY: 'READY_TO_PAY',
  REVIEWING_CHECK: 'REVIEWING_CHECK',
  LEAVING: 'LEAVING',
  DONE: 'DONE',
  ANGRY_LEAVING: 'ANGRY_LEAVING',
};

export const MOOD_MAX = 100;
export const MOOD_THRESHOLDS = {
  ENTERTAINED: 80,
  CONTENT: 60,
  IDLE: 40,
  LOOKING: 20,
  FRUSTRATED: 10,
};

export const MOOD_DECAY = {
  WAITING_FOR_SEAT: 0.25,
  ARRIVING: 0,
  SEATED: 0.15,
  LOOKING: 0.5,
  READY_TO_ORDER: 0.6,
  ORDER_TAKEN: 0,
  WAITING_FOR_DRINK: 0.75,
  ENJOYING: -3,
  WANTS_ANOTHER: 0.5,
  READY_TO_PAY: 0.5,
  REVIEWING_CHECK: 0,
  LEAVING: 0,
  DONE: 0,
  ANGRY_LEAVING: 0,
};

export const MOOD_GRACE_PERIOD = 60;

// ═══════════════════════════════════════════════════════════
// TIMERS & DURATIONS
// ═══════════════════════════════════════════════════════════
export const SETTLE_TIME = 4;
export const ORDER_TAKE_TIME = 1;
export const ENJOY_TIME_MIN = 20;
export const ENJOY_TIME_MAX = 35;
export const CHECK_REVIEW_TIME = 6;
export const ORDER_REVEAL_TIME = 8;

export const ACTION_DURATIONS = {
  GLASS_RACK: 0.4,
  DISHWASHER: 0.8,
  POUR_BEER: 1.8,
  POUR_WINE: 1.2,
  POS: 0.6,
  GREET: 0.5,
  TAKE_ORDER: 1.0,
  DELIVER: 0.3,
  CHECK_IN: 0.5,
  COLLECT_CASH: 0.4,
  BUS: 0.5,
  PRINT_CHECK: 1.5,
  GARNISH: 0.6,
};

export const HIT_RADIUS = 40;

export const GAME_STATE = {
  TITLE: 'TITLE',
  SETTINGS: 'SETTINGS',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
};
