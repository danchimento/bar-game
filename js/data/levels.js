// Each level defines:
//   name        – display name
//   day         – day number
//   duration    – level length in seconds
//   stations    – ordered list of station configs for the back counter
//   drinks      – which drink keys are available this level
//   spawnSchedule – guest arrival times & preferences
//   starThresholds – tip+revenue targets for 1/2/3 stars
//   settings    – optional per-level setting overrides

// Station footprints — widths in pixels, snapped to tile multiples (TILE = 32)
export const STATION_TEMPLATES = {
  DISHWASHER:  { id: 'DISHWASHER', label: 'Dish',  width: 128 },  // 4 tiles
  SINK:        { id: 'SINK',       label: 'Sink',  width: 128 },  // 4 tiles
  GLASS_RACK:  { id: 'GLASS_RACK', label: 'Glass', width: 256 },  // 8 tiles (42×6=252, rounded)
  TAPS:        { id: 'TAPS',       label: 'Taps',  width: 192 },  // 6 tiles
  WINE:        { id: 'WINE',       label: 'Wine',  width: 128 },  // 4 tiles
  PREP:        { id: 'PREP',       label: 'Prep',  width: 128 },  // 4 tiles
  POS:         { id: 'POS',        label: 'POS',   width: 128 },  // 4 tiles
  TRASH:       { id: 'TRASH',      label: 'Trash', width: 96 },   // 3 tiles
  MENU:        { id: 'MENU',       label: 'Menu',  width: 64 },   // 2 tiles
};

/** Build a stations array with automatic x positions from an ordered list of IDs.
 *  MENU is always appended if not already present. */
function layoutStations(ids, totalWidth = 900, marginLeft = 30) {
  if (!ids.includes('MENU')) ids = [...ids, 'MENU'];
  const templates = ids.map(id => ({ ...STATION_TEMPLATES[id] }));
  const totalStationWidth = templates.reduce((s, t) => s + t.width, 0);
  const gap = (totalWidth - totalStationWidth) / (templates.length + 1);
  let x = marginLeft + gap;
  return templates.map(t => {
    const cx = x + t.width / 2;
    const station = { ...t, x: Math.round(cx) };
    x += t.width + gap;
    return station;
  });
}

export const LEVELS = [
  // ─── DAY 1: Just the basics — one beer ──────────────────
  {
    name: 'Day 1 — Opening Night',
    day: 1,
    seats: 3,
    duration: 240,
    stationIds: ['DISHWASHER', 'GLASS_RACK', 'TAPS', 'POS', 'TRASH'],
    drinks: ['GOLD_LAGER'],
    spawnSchedule: [
      { time: 5,   type: 'regular', drinkPrefs: ['GOLD_LAGER'] },
      { time: 40,  type: 'quick',   drinkPrefs: ['GOLD_LAGER'] },
      { time: 75,  type: 'regular', drinkPrefs: ['GOLD_LAGER'] },
      { time: 110, type: 'quick',   drinkPrefs: ['GOLD_LAGER'] },
      { time: 145, type: 'regular', drinkPrefs: ['GOLD_LAGER'] },
      { time: 180, type: 'quick',   drinkPrefs: ['GOLD_LAGER'] },
    ],
    starThresholds: { 1: 25, 2: 50, 3: 80 },
    settings: {
      moodDecayMultiplier: 0.7,
      gracePeriod: 90,
    },
  },

  // ─── DAY 2: Second tap — two beers ──────────────────────
  {
    name: 'Day 2 — Word Gets Around',
    day: 2,
    seats: 3,
    duration: 270,
    stationIds: ['DISHWASHER', 'SINK', 'GLASS_RACK', 'TAPS', 'POS', 'TRASH'],
    drinks: ['GOLD_LAGER', 'HAZY_IPA'],
    spawnSchedule: [
      { time: 5,   type: 'regular', drinkPrefs: ['GOLD_LAGER'] },
      { time: 30,  type: 'quick',   drinkPrefs: ['HAZY_IPA'] },
      { time: 55,  type: 'regular', drinkPrefs: ['GOLD_LAGER', 'HAZY_IPA'] },
      { time: 85,  type: 'quick',   drinkPrefs: ['GOLD_LAGER'] },
      { time: 115, type: 'regular', drinkPrefs: ['HAZY_IPA'] },
      { time: 145, type: 'quick',   drinkPrefs: ['GOLD_LAGER'] },
      { time: 175, type: 'regular', drinkPrefs: ['HAZY_IPA', 'GOLD_LAGER'] },
      { time: 210, type: 'quick',   drinkPrefs: ['HAZY_IPA'] },
    ],
    starThresholds: { 1: 35, 2: 70, 3: 110 },
    settings: {
      moodDecayMultiplier: 0.8,
      gracePeriod: 75,
    },
  },

  // ─── DAY 3: Three beers, things pick up ─────────────────
  {
    name: 'Day 3 — Happy Hour',
    day: 3,
    seats: 4,
    duration: 300,
    stationIds: ['DISHWASHER', 'SINK', 'GLASS_RACK', 'TAPS', 'POS', 'TRASH'],
    drinks: ['GOLD_LAGER', 'HAZY_IPA', 'DARK_PORTER'],
    spawnSchedule: [
      { time: 5,   type: 'regular', drinkPrefs: ['GOLD_LAGER'] },
      { time: 22,  type: 'quick',   drinkPrefs: ['DARK_PORTER'] },
      { time: 42,  type: 'regular', drinkPrefs: ['HAZY_IPA', 'GOLD_LAGER'] },
      { time: 62,  type: 'quick',   drinkPrefs: ['GOLD_LAGER'] },
      { time: 82,  type: 'regular', drinkPrefs: ['DARK_PORTER', 'HAZY_IPA'] },
      { time: 102, type: 'quick',   drinkPrefs: ['HAZY_IPA'] },
      { time: 125, type: 'regular', drinkPrefs: ['GOLD_LAGER', 'DARK_PORTER'] },
      { time: 150, type: 'quick',   drinkPrefs: ['DARK_PORTER'] },
      { time: 180, type: 'regular', drinkPrefs: ['HAZY_IPA'] },
      { time: 210, type: 'quick',   drinkPrefs: ['GOLD_LAGER'] },
    ],
    starThresholds: { 1: 45, 2: 90, 3: 140 },
    settings: {
      moodDecayMultiplier: 0.9,
      gracePeriod: 60,
    },
  },

  // ─── DAY 4: Full beer menu + garnish beer ──────────────
  {
    name: 'Day 4 — Regulars Night',
    day: 4,
    seats: 4,
    duration: 300,
    stationIds: ['DISHWASHER', 'SINK', 'GLASS_RACK', 'TAPS', 'PREP', 'POS', 'TRASH'],
    drinks: ['GOLD_LAGER', 'HAZY_IPA', 'DARK_PORTER', 'HARVEST_MOON'],
    spawnSchedule: [
      { time: 5,   type: 'regular', drinkPrefs: ['HARVEST_MOON'] },
      { time: 20,  type: 'quick',   drinkPrefs: ['GOLD_LAGER'] },
      { time: 38,  type: 'regular', drinkPrefs: ['DARK_PORTER', 'HAZY_IPA'] },
      { time: 55,  type: 'quick',   drinkPrefs: ['HAZY_IPA'] },
      { time: 75,  type: 'regular', drinkPrefs: ['HARVEST_MOON', 'GOLD_LAGER'] },
      { time: 95,  type: 'quick',   drinkPrefs: ['DARK_PORTER'] },
      { time: 115, type: 'regular', drinkPrefs: ['GOLD_LAGER', 'HARVEST_MOON'] },
      { time: 135, type: 'quick',   drinkPrefs: ['HAZY_IPA'] },
      { time: 160, type: 'regular', drinkPrefs: ['DARK_PORTER'] },
      { time: 185, type: 'quick',   drinkPrefs: ['HARVEST_MOON'] },
      { time: 215, type: 'regular', drinkPrefs: ['GOLD_LAGER', 'HAZY_IPA'] },
    ],
    starThresholds: { 1: 55, 2: 110, 3: 170 },
    settings: {
      moodDecayMultiplier: 1.0,
      gracePeriod: 45,
    },
  },

  // ─── DAY 5: Rush night — full beer menu, faster pace ───
  {
    name: 'Day 5 — Friday Rush',
    day: 5,
    seats: 5,
    duration: 300,
    stationIds: ['DISHWASHER', 'SINK', 'GLASS_RACK', 'TAPS', 'PREP', 'POS', 'TRASH'],
    drinks: ['GOLD_LAGER', 'HAZY_IPA', 'DARK_PORTER', 'HARVEST_MOON'],
    spawnSchedule: [
      { time: 3,   type: 'regular', drinkPrefs: ['GOLD_LAGER'] },
      { time: 15,  type: 'quick',   drinkPrefs: ['HAZY_IPA'] },
      { time: 28,  type: 'regular', drinkPrefs: ['HARVEST_MOON', 'DARK_PORTER'] },
      { time: 42,  type: 'quick',   drinkPrefs: ['GOLD_LAGER'] },
      { time: 58,  type: 'regular', drinkPrefs: ['DARK_PORTER'] },
      { time: 74,  type: 'quick',   drinkPrefs: ['HAZY_IPA'] },
      { time: 90,  type: 'regular', drinkPrefs: ['GOLD_LAGER', 'HARVEST_MOON'] },
      { time: 108, type: 'quick',   drinkPrefs: ['DARK_PORTER'] },
      { time: 126, type: 'regular', drinkPrefs: ['HAZY_IPA', 'GOLD_LAGER'] },
      { time: 144, type: 'quick',   drinkPrefs: ['HARVEST_MOON'] },
      { time: 162, type: 'regular', drinkPrefs: ['GOLD_LAGER'] },
      { time: 180, type: 'quick',   drinkPrefs: ['DARK_PORTER'] },
      { time: 200, type: 'regular', drinkPrefs: ['HAZY_IPA', 'HARVEST_MOON'] },
      { time: 220, type: 'quick',   drinkPrefs: ['GOLD_LAGER'] },
    ],
    starThresholds: { 1: 65, 2: 130, 3: 200 },
    settings: {
      moodDecayMultiplier: 1.1,
      gracePeriod: 30,
    },
  },
];

// Re-export guest types (moved from level1.js)
export const GUEST_TYPES = {
  regular: {
    patience: 1.0,
    maxDrinks: 3,
    tipMultiplier: 1.2,
    color: '#d4a574',
  },
  quick: {
    patience: 0.8,
    maxDrinks: 1,
    tipMultiplier: 1.0,
    color: '#c49464',
  },
};
