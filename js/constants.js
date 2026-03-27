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

// Layout Y positions — more room above guests for radial menus
export const GUEST_Y = 140;
export const SEAT_Y = 185;
export const BAR_TOP_Y = 225;
export const SERVICE_MAT_Y = 265;
export const WALK_TRACK_Y = 330;
export const STATION_Y = 470;
export const STATION_LABEL_Y = 520;

// Bar edges
export const BAR_LEFT = 30;
export const BAR_RIGHT = 930;

// Seat positions (3 seats)
export const SEATS = [
  { id: 0, x: 200 },
  { id: 1, x: 480 },
  { id: 2, x: 760 },
];

// Station definitions
export const STATIONS = [
  { id: 'DISHWASHER',  x: 80,  label: 'Dish',  icon: '🫧' },
  { id: 'GLASS_RACK',  x: 230, label: 'Glass', icon: '🥃' },
  { id: 'TAPS',        x: 420, label: 'Taps',  icon: '🍺' },
  { id: 'WINE',        x: 610, label: 'Wine',  icon: '🍷' },
  { id: 'POS',         x: 820, label: 'POS',   icon: '💻' },
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

// Mood decay rates (per second) — slow enough to handle glass picking + POS + pouring
export const MOOD_DECAY = {
  WAITING_FOR_SEAT: 0.5,
  ARRIVING: 0,
  SEATED: 0.3,
  READY_TO_ORDER: 1.2,
  ORDER_TAKEN: 0,
  WAITING_FOR_DRINK: 1.5,
  ENJOYING: -3,
  WANTS_ANOTHER: 1.0,
  READY_TO_PAY: 1.0,
  REVIEWING_CHECK: 0,
  LEAVING: 0,
  DONE: 0,
  ANGRY_LEAVING: 0,
};

// Grace period — mood decay scales from 0% to 100% over this many seconds
export const MOOD_GRACE_PERIOD = 30;

// Timers (seconds)
export const SETTLE_TIME = 2.5;
export const ORDER_TAKE_TIME = 1;
export const ENJOY_TIME_MIN = 12;
export const ENJOY_TIME_MAX = 20;
export const CHECK_REVIEW_TIME = 4; // time guest spends reviewing check before leaving cash
export const ORDER_REVEAL_TIME = 5; // seconds order shows above guest's head

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
