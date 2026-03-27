export const GLASSES = {
  PINT:       { name: 'Pint Glass',  icon: '🍺', forType: 'beer' },
  WINE_GLASS: { name: 'Wine Glass',  icon: '🍷', forType: 'wine' },
};

export const GARNISHES = {
  ORANGE:  { name: 'Orange',  icon: '🍊' },
  LIME:    { name: 'Lime',    icon: '🍋‍🟩' },
  LEMON:   { name: 'Lemon',   icon: '🍋' },
  CHERRY:  { name: 'Cherry',  icon: '🍒' },
};

export const DRINKS = {
  GOLD_LAGER:   { name: 'Gold Lager',   type: 'beer',  price: 7,  icon: '🍺', color: '#f0c040', glass: 'PINT', garnish: null },
  HAZY_IPA:     { name: 'Hazy IPA',     type: 'beer',  price: 8,  icon: '🍺', color: '#d4a020', glass: 'PINT', garnish: null },
  DARK_PORTER:  { name: 'Dark Porter',  type: 'beer',  price: 8,  icon: '🍺', color: '#3a1a0a', glass: 'PINT', garnish: null },
  HARVEST_MOON: { name: 'Harvest Moon', type: 'beer',  price: 9,  icon: '🍺', color: '#e8b840', glass: 'PINT', garnish: 'ORANGE' },
  RED_WINE:     { name: 'Red Wine',     type: 'wine',  price: 10, icon: '🍷', color: '#8b1a1a', glass: 'WINE_GLASS', garnish: null },
  WHITE_WINE:   { name: 'White Wine',   type: 'wine',  price: 10, icon: '🍷', color: '#e8e0a0', glass: 'WINE_GLASS', garnish: null },
};

export const DRINK_LIST = Object.keys(DRINKS);
