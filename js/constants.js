// Canvas
export const CANVAS_W = 800;
export const CANVAS_H = 600;

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

// Layout Y positions
export const GUEST_Y = 100;
export const SEAT_Y = 145;
export const BAR_TOP_Y = 180;
export const SERVICE_MAT_Y = 220;
export const WALK_TRACK_Y = 290;
export const STATION_Y = 370;
export const STATION_LABEL_Y = 420;

// Bar edges
export const BAR_LEFT = 30;
export const BAR_RIGHT = 770;

// Seat positions (6 seats evenly spaced)
export const SEATS = [
  { id: 0, x: 100 },
  { id: 1, x: 220 },
  { id: 2, x: 340 },
  { id: 3, x: 460 },
  { id: 4, x: 580 },
  { id: 5, x: 700 },
];

// Station definitions
export const STATIONS = [
  { id: 'DISHWASHER',    x: 60,  label: 'Dish',  icon: '🫧' },
  { id: 'GLASS_RACK',    x: 155, label: 'Glass', icon: '🥃' },
  { id: 'TAP_LAGER',     x: 265, label: 'Lager', icon: '🍺' },
  { id: 'TAP_IPA',       x: 345, label: 'IPA',   icon: '🍺' },
  { id: 'TAP_STOUT',     x: 425, label: 'Stout', icon: '🍺' },
  { id: 'WINE_RED',      x: 535, label: 'Red',   icon: '🍷' },
  { id: 'WINE_WHITE',    x: 615, label: 'White', icon: '🍷' },
  { id: 'POS',           x: 710, label: 'POS',   icon: '💻' },
];

// Bartender
export const BARTENDER_SPEED = 250; // pixels per second
export const BARTENDER_START_X = 400;

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

// Mood decay rates (per second)
export const MOOD_DECAY = {
  ARRIVING: 0,
  SEATED: 1,
  READY_TO_ORDER: 4,
  ORDER_TAKEN: 0,
  WAITING_FOR_DRINK: 5,
  ENJOYING: -2, // mood recovers while enjoying
  WANTS_ANOTHER: 3,
  READY_TO_PAY: 3,
  PAYING: 0,
  LEAVING: 0,
  DONE: 0,
  ANGRY_LEAVING: 0,
};

// Timers (seconds)
export const SETTLE_TIME = 2;        // how long before guest is ready to order
export const ORDER_TAKE_TIME = 1;    // animation time for taking order
export const ENJOY_TIME_MIN = 10;
export const ENJOY_TIME_MAX = 18;
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
  TAP_LAGER: 1.8,
  TAP_IPA: 1.8,
  TAP_STOUT: 1.8,
  WINE_RED: 1.2,
  WINE_WHITE: 1.2,
  POS: 0.6,
  GREET: 0.5,
  TAKE_ORDER: 1.0,
  DELIVER: 0.3,
  CHECK_IN: 0.5,
  COLLECT_CASH: 0.4,
  BUS: 0.5,
};

// Drink to station mapping
export const DRINK_STATION = {
  LAGER: 'TAP_LAGER',
  IPA: 'TAP_IPA',
  STOUT: 'TAP_STOUT',
  RED_WINE: 'WINE_RED',
  WHITE_WINE: 'WINE_WHITE',
};

// Hit detection radius
export const HIT_RADIUS = 35;

// Game states
export const GAME_STATE = {
  TITLE: 'TITLE',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
};
