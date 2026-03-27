export const LEVEL_1 = {
  name: 'Opening Night',
  duration: 300, // 5 minutes
  spawnSchedule: [
    { time: 5,   type: 'regular',    drinkPrefs: ['LAGER', 'IPA'] },
    { time: 35,  type: 'quick',      drinkPrefs: ['STOUT'] },
    { time: 65,  type: 'regular',    drinkPrefs: ['RED_WINE', 'WHITE_WINE'] },
    { time: 95,  type: 'quick',      drinkPrefs: ['LAGER'] },
    { time: 120, type: 'regular',    drinkPrefs: ['IPA', 'STOUT'] },
    { time: 145, type: 'quick',      drinkPrefs: ['WHITE_WINE'] },
    { time: 170, type: 'regular',    drinkPrefs: ['RED_WINE'] },
    { time: 200, type: 'quick',      drinkPrefs: ['LAGER'] },
    { time: 235, type: 'regular',    drinkPrefs: ['IPA', 'RED_WINE'] },
    { time: 265, type: 'quick',      drinkPrefs: ['STOUT'] },
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
