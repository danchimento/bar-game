/**
 * Shared guest appearance definitions.
 * Single source of truth for all guest sprite generators.
 * Each appearance defines shirt color + shadow — used by standing,
 * sitting, and walk sprites. Add more entries to scale up variety.
 *
 * The `id` is used in filenames: guest_{id}.png, guest_sitting_{id}.png, guest_walk_{id}.png
 * The first entry (id: 'blue') is also generated as the base: guest.png, guest_sitting.png, guest_walk.png
 */
const GUEST_APPEARANCES = [
  { id: 'blue',   shirt: '#4a6fa5', shadow: '#3a5f95' },
  { id: 'red',    shirt: '#a54a4a', shadow: '#953a3a' },
  { id: 'green',  shirt: '#4a8a4a', shadow: '#3a7a3a' },
];

// Shared base palette (skin, hair, etc.) — same for all guests
const GUEST_BASE = {
  SK: '#d4a574', SKS: '#b8895e', HAIR: '#3a2518',
  HRH: '#5c3a28', EYE: '#181818', PNT: '#2a2a3a',
};

module.exports = { GUEST_APPEARANCES, GUEST_BASE };
