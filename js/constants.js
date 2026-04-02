// Canvas - LANDSCAPE
export const CANVAS_W = 960;
export const CANVAS_H = 540;

// Colors
export const COLORS = {
  FLOOR: '#2d1b0e',
  BAR_TOP: '#8B4513',
  BAR_FRONT: '#6b3410',
  WALK_TRACK: '#3d2b1b',
  WALL: '#1a1a2e',
  STATION_BG: '#4a3728',
  STATION_BORDER: '#6b5040',
  SEAT_EMPTY: '#5a4a3a',
  SEAT_DIRTY: '#8b6914',
  BARTENDER: '#e8c170',
  BARTENDER_APRON: '#2d5a27',
  GUEST_BODY: '#d4a574',
  SERVICE_MAT: '#333333',
};

// Layout Y positions — guests sit right at the bar
export const GUEST_Y = 260;
export const SEAT_Y = 275;
export const BAR_TOP_Y = 290;
export const SERVICE_MAT_Y = 330;
export const WALK_TRACK_Y = 380;
export const STATION_Y = 475;
export const STATION_LABEL_Y = 515;

// Bar edges
export const BAR_LEFT = 30;
export const BAR_RIGHT = 930;

// Bar surface geometry — used to place objects "on" the bar at realistic depth
// The bar surface spans from its customer-side edge to the bartender-side front edge.
// Moving an object further down-screen = further "into" the bar (away from customer).
export const BAR_SURFACE_Y = BAR_TOP_Y + 4;         // top of bar tiles (customer edge)
export const BAR_FRONT_Y = BAR_TOP_Y + 26;           // front edge (bartender side)
export const BAR_DEPTH_PX = BAR_FRONT_Y - BAR_SURFACE_Y; // total bar depth in pixels (22px)

// Real-world bar is ~30 inches deep. 1 inch ≈ BAR_DEPTH_PX / 30 pixels.
export const BAR_INCH = BAR_DEPTH_PX / 30;

/**
 * Convert a real-world distance from the customer edge (in inches) to a Y position on the bar.
 * 0 inches = customer edge, 30 inches = bartender edge.
 */
export function barY(inchesFromEdge) {
  return BAR_SURFACE_Y + inchesFromEdge * BAR_INCH;
}

// Seat positions (dynamic — rebuilt per level)
export const SEATS = [
  { id: 0, x: 200 },
  { id: 1, x: 480 },
  { id: 2, x: 760 },
];

/** Reconfigure SEATS for N seats, evenly spaced across the bar.
 *  Mutates the global SEATS array (backward compat) and returns it. */
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

// Station definitions
export const STATIONS = [
  { id: 'DISHWASHER',  x: 60,  label: 'Dish',  icon: '🫧' },
  { id: 'SINK',        x: 150, label: 'Sink',  icon: '🚰' },
  { id: 'GLASS_RACK',  x: 250, label: 'Glass', icon: '🥃' },
  { id: 'TAPS',        x: 380, label: 'Taps',  icon: '🍺' },
  { id: 'WINE',        x: 510, label: 'Wine',  icon: '🍷' },
  { id: 'PREP',        x: 650, label: 'Prep',  icon: '🔪' },
  { id: 'POS',         x: 850, label: 'POS',   icon: '💻' },
];

// Bartender
export const BARTENDER_SPEED = 280;
export const BARTENDER_START_X = 480;

// Guest states
// Y position for waiting guests (behind seats)
export const WAITING_Y = 70;

export const GUEST_STATE = {
  WAITING_FOR_SEAT: 'WAITING_FOR_SEAT',
  ARRIVING: 'ARRIVING',
  SEATED: 'SEATED',
  LOOKING: 'LOOKING',          // wants bartender attention (first order, another, or check)
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

// Mood thresholds
export const MOOD_MAX = 100;
export const MOOD_THRESHOLDS = {
  ENTERTAINED: 80,
  CONTENT: 60,
  IDLE: 40,
  LOOKING: 20,
  FRUSTRATED: 10,
};

// Mood decay rates (per second) — halved for early levels, stress comes later
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

// Grace period — mood decay scales from 0% to 100% over this many seconds
export const MOOD_GRACE_PERIOD = 60;

// Timers (seconds)
export const SETTLE_TIME = 4;
export const ORDER_TAKE_TIME = 1;
export const ENJOY_TIME_MIN = 20;
export const ENJOY_TIME_MAX = 35;
export const CHECK_REVIEW_TIME = 6;
export const ORDER_REVEAL_TIME = 8;

// Station action durations
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

// Hit detection radius
export const HIT_RADIUS = 40;

// Game states
export const GAME_STATE = {
  TITLE: 'TITLE',
  SETTINGS: 'SETTINGS',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
};
