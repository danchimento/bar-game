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

// Layout Y positions (stretched to use full height)
export const GUEST_Y = 90;
export const SEAT_Y = 135;
export const BAR_TOP_Y = 175;
export const SERVICE_MAT_Y = 215;
export const WALK_TRACK_Y = 290;
export const STATION_Y = 470;
export const STATION_LABEL_Y = 520;

// Bar edges
export const BAR_LEFT = 30;
export const BAR_RIGHT = 930;

// Seat positions (6 seats spread across landscape)
export const SEATS = [
  { id: 0, x: 110 },
  { id: 1, x: 260 },
  { id: 2, x: 410 },
  { id: 3, x: 560 },
  { id: 4, x: 710 },
  { id: 5, x: 860 },
];

// Station definitions — consolidated taps and wines into single stations
export const STATIONS = [
  { id: 'DISHWASHER',  x: 80,  label: 'Dish',  icon: '🫧' },
  { id: 'GLASS_RACK',  x: 210, label: 'Glass', icon: '🥃' },
  { id: 'TAPS',        x: 380, label: 'Taps',  icon: '🍺' },
  { id: 'WINE',        x: 550, label: 'Wine',  icon: '🍷' },
  { id: 'POS',         x: 720, label: 'POS',   icon: '💻' },
  { id: 'CHECK_PRINTER', x: 870, label: 'Check', icon: '🖨️' },
];

// Bartender
export const BARTENDER_SPEED = 280; // pixels per second (slightly faster for wider bar)
export const BARTENDER_START_X = 480;

// Guest states
export const GUEST_STATE = {
  ARRIVING: 'ARRIVING',
  SEATED: 'SEATED',
  READY_TO_ORDER: 'READY_TO_ORDER',
  ORDER_TAKEN: 'ORDER_TAKEN',
  WAITING_FOR_DRINK: 'WAITING_FOR_DRINK',
  ENJOYING: 'ENJOYING',
  WANTS_ANOTHER: 'WANTS_ANOTHER',
  READY_TO_PAY: 'READY_TO_PAY',
  PAYING: 'PAYING',
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

// Mood decay rates (per second) — significantly slower so first 30s isn't stressful
export const MOOD_DECAY = {
  ARRIVING: 0,
  SEATED: 0.5,
  READY_TO_ORDER: 2,
  ORDER_TAKEN: 0,
  WAITING_FOR_DRINK: 2.5,
  ENJOYING: -3, // mood recovers while enjoying
  WANTS_ANOTHER: 1.5,
  READY_TO_PAY: 1.5,
  PAYING: 0,
  LEAVING: 0,
  DONE: 0,
  ANGRY_LEAVING: 0,
};

// Grace period — mood doesn't decay for the first N seconds of the level
export const MOOD_GRACE_PERIOD = 30;

// Timers (seconds)
export const SETTLE_TIME = 2.5;
export const ORDER_TAKE_TIME = 1;
export const ENJOY_TIME_MIN = 12;
export const ENJOY_TIME_MAX = 20;
export const DRINK_PRICES = {
  LAGER: 7,
  IPA: 8,
  STOUT: 8,
  RED_WINE: 10,
  WHITE_WINE: 10,
};

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
};

// Hit detection radius
export const HIT_RADIUS = 40;

// Game states
export const GAME_STATE = {
  TITLE: 'TITLE',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
};
