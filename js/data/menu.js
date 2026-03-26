export const GLASSES = {
  PINT:       { name: 'Pint Glass',  icon: '🍺', forType: 'beer' },
  WINE_GLASS: { name: 'Wine Glass',  icon: '🍷', forType: 'wine' },
};

export const DRINKS = {
  LAGER:      { name: 'Lager',      type: 'beer',  price: 7,  icon: '🍺', color: '#f0c040', glass: 'PINT' },
  IPA:        { name: 'IPA',        type: 'beer',  price: 8,  icon: '🍺', color: '#d4a020', glass: 'PINT' },
  STOUT:      { name: 'Stout',      type: 'beer',  price: 8,  icon: '🍺', color: '#3a1a0a', glass: 'PINT' },
  RED_WINE:   { name: 'Red Wine',   type: 'wine',  price: 10, icon: '🍷', color: '#8b1a1a', glass: 'WINE_GLASS' },
  WHITE_WINE: { name: 'White Wine', type: 'wine',  price: 10, icon: '🍷', color: '#e8e0a0', glass: 'WINE_GLASS' },
};

export const DRINK_LIST = Object.keys(DRINKS);
