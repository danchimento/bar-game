export const GLASSES = {
  PINT:        { name: 'Pint Glass',   icon: '🍺', forType: 'beer',  capacity: 1.0 },
  WINE_GLASS:  { name: 'Wine Glass',   icon: '🍷', forType: 'wine',  capacity: 1.0 },
  PLASTIC_CUP: { name: 'Plastic Cup',  icon: '🥤', forType: 'water', capacity: 1.0 },
};

export const GARNISHES = {
  ORANGE:  { name: 'Orange',  icon: '🍊' },
  LIME:    { name: 'Lime',    icon: '🍋‍🟩' },
  LEMON:   { name: 'Lemon',   icon: '🍋' },
  CHERRY:  { name: 'Cherry',  icon: '🍒' },
};

// Fill range: [min, max] — pour is "correct" if total fill is within this range
export const DRINKS = {
  GOLD_LAGER:   { name: 'Boors Light',  type: 'beer',  price: 7,  icon: '🍺', color: '#f0c040', glass: 'PINT',        garnish: null, fillRange: [0.85, 1.0] },
  HAZY_IPA:     { name: 'Hazy IPA',     type: 'beer',  price: 8,  icon: '🍺', color: '#d4a020', glass: 'PINT',        garnish: null, fillRange: [0.85, 1.0] },
  DARK_PORTER:  { name: 'Dark Porter',  type: 'beer',  price: 8,  icon: '🍺', color: '#3a1a0a', glass: 'PINT',        garnish: null, fillRange: [0.85, 1.0] },
  HARVEST_MOON: { name: 'Harvest Moon', type: 'beer',  price: 9,  icon: '🍺', color: '#e8b840', glass: 'PINT',        garnish: 'ORANGE', fillRange: [0.85, 1.0] },
  RED_WINE:     { name: 'Red Wine',     type: 'wine',  price: 10, icon: '🍷', color: '#8b1a1a', glass: 'WINE_GLASS',  garnish: null, fillRange: [0.40, 0.60] },
  WHITE_WINE:   { name: 'White Wine',   type: 'wine',  price: 10, icon: '🍷', color: '#e8e0a0', glass: 'WINE_GLASS',  garnish: null, fillRange: [0.40, 0.60] },
  WATER:        { name: 'Water',        type: 'water', price: 0,  icon: '💧', color: '#a0d4e8', glass: 'PLASTIC_CUP', garnish: null, fillRange: [0.80, 1.0], requiresIce: true },
};

export const DRINK_LIST = Object.keys(DRINKS);

// Mixer/soda gun options (poured at prep station)
export const MIXER_DRINKS = ['WATER'];
