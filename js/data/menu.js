export const DRINKS = {
  LAGER:      { name: 'Lager',      type: 'beer',  station: 'TAP_LAGER',  price: 7,  icon: '🍺', color: '#f0c040' },
  IPA:        { name: 'IPA',        type: 'beer',  station: 'TAP_IPA',    price: 8,  icon: '🍺', color: '#d4a020' },
  STOUT:      { name: 'Stout',      type: 'beer',  station: 'TAP_STOUT',  price: 8,  icon: '🍺', color: '#3a1a0a' },
  RED_WINE:   { name: 'Red Wine',   type: 'wine',  station: 'WINE_RED',   price: 10, icon: '🍷', color: '#8b1a1a' },
  WHITE_WINE: { name: 'White Wine', type: 'wine',  station: 'WINE_WHITE', price: 10, icon: '🍷', color: '#e8e0a0' },
};

export const DRINK_LIST = Object.keys(DRINKS);
