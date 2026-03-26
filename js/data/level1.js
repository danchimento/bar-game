export const LEVEL_1 = {
  name: 'Opening Night',
  duration: 180, // 3 minutes
  spawnSchedule: [
    { time: 3,   type: 'regular',    drinkPrefs: ['LAGER', 'IPA'] },
    { time: 20,  type: 'quick',      drinkPrefs: ['STOUT'] },
    { time: 40,  type: 'regular',    drinkPrefs: ['RED_WINE', 'WHITE_WINE'] },
    { time: 55,  type: 'quick',      drinkPrefs: ['LAGER'] },
    { time: 75,  type: 'regular',    drinkPrefs: ['IPA', 'STOUT'] },
    { time: 90,  type: 'quick',      drinkPrefs: ['WHITE_WINE'] },
    { time: 110, type: 'regular',    drinkPrefs: ['RED_WINE'] },
    { time: 125, type: 'quick',      drinkPrefs: ['LAGER'] },
    { time: 140, type: 'regular',    drinkPrefs: ['IPA', 'RED_WINE'] },
    { time: 160, type: 'quick',      drinkPrefs: ['STOUT'] },
  ],
  starThresholds: {
    1: 40,
    2: 80,
    3: 130,
  },
};

// Guest type configs
export const GUEST_TYPES = {
  regular: {
    patience: 1.0,       // mood decay multiplier
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
