/**
 * Sprite metrics and UI layout constants.
 * Extracted from layer files to centralize magic numbers.
 *
 * When a sprite is regenerated with different dimensions, update here
 * and all rendering code will adapt automatically.
 */

// ═══════════════════════════════════════════════════════════
// STATION RENDERING
// ═══════════════════════════════════════════════════════════
// STATION_SCALE removed — sprites render at 1:1 (generated at screen size)
export const STATION_ZONE_H = 77;

/** How many source-pixel rows each station sprite sinks into the counter */
export const COUNTER_BASE_ROWS = {
  TAPS: 4, WINE: 4, PREP: 3, POS: 6, MENU: 4,
};

// ═══════════════════════════════════════════════════════════
// BARTENDER RENDERING
// ═══════════════════════════════════════════════════════════
export const BARTENDER_CARRY_OFFSET_X = 28;  // pixels to side of bartender center
export const BARTENDER_CARRY_OFFSET_Y = 22;  // pixels above walk track
export const BARTENDER_BUSY_BAR_OFFSET_Y = 35; // pixels below walk track

// ═══════════════════════════════════════════════════════════
// GUEST RENDERING
// ═══════════════════════════════════════════════════════════
export const GUEST_SIT_SCREEN_H = 40;         // sitting sprite screen height (20 art × 2)
export const GUEST_BAR_OVERLAP_PX = 30;       // screen pixels from top where bar overlaps
export const GUEST_STANDING_OFFSET_Y = 35;    // standing sprite center offset
export const GUEST_MOUTH_OFFSET_X = 6;        // mouth X relative to guest center
export const GUEST_MOUTH_OFFSET_Y = 5;        // mouth Y above guest center
export const GUEST_COUNTER_OFFSET_X = 8;      // counter pickup X relative to guest
export const ORDER_TEXT_OFFSET_Y = 24;         // order text above head

// ═══════════════════════════════════════════════════════════
// BAR ITEMS
// ═══════════════════════════════════════════════════════════
export const DRINK_SPACING_PX = 14;           // horizontal gap between drinks at a seat
export const SEAT_ZONE_W = 70;                // interactive seat tap zone width
export const SEAT_ZONE_H = 80;                // interactive seat tap zone height
export const SEAT_ZONE_OFFSET_Y = 10;         // zone offset above SEAT_Y
export const CASH_OFFSET_X = 20;              // cash sprite X offset from seat center
export const STOOL_SPRITE_W = 48;             // stool sprite source width (for cropping)

// ═══════════════════════════════════════════════════════════
// BAR LAYER / CLOCK
// ═══════════════════════════════════════════════════════════
export const CLOCK_OFFSET_Y = 80;             // clock center Y below guest_area.top
export const BAR_TOP_EXTRA_H = 5;             // extra height added to bar top fill
export const STOOL_LEG_W = 24;                // stool leg width
