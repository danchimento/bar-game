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

/** Screen pixels each station sprite sinks into the counter (art rows × 3) */
export const COUNTER_BASE_ROWS = {
  TAPS: 12, WINE: 12, PREP: 9, POS: 18, MENU: 12,
};

// ═══════════════════════════════════════════════════════════
// BARTENDER RENDERING
// ═══════════════════════════════════════════════════════════
export const BARTENDER_CARRY_OFFSET_X = 42;  // pixels to side of bartender center (14 art × 3)
export const BARTENDER_CARRY_OFFSET_Y = 33;  // pixels above walk track (11 art × 3)
export const BARTENDER_BUSY_BAR_OFFSET_Y = 50; // pixels below walk track

// ═══════════════════════════════════════════════════════════
// GUEST RENDERING
// ═══════════════════════════════════════════════════════════
export const GUEST_SIT_SCREEN_H = 60;         // sitting sprite screen height (20 art × 3)
export const GUEST_BAR_OVERLAP_PX = 45;       // screen pixels from top where bar overlaps
export const GUEST_STANDING_OFFSET_Y = 48;    // standing sprite center offset (16 art × 3)
export const GUEST_MOUTH_OFFSET_X = 9;        // mouth X relative to guest center (3 art × 3)
export const GUEST_MOUTH_OFFSET_Y = 8;        // mouth Y above guest center
export const GUEST_COUNTER_OFFSET_X = 12;     // counter pickup X relative to guest (4 art × 3)
export const ORDER_TEXT_OFFSET_Y = 36;         // order text above head

// ═══════════════════════════════════════════════════════════
// BAR ITEMS
// ═══════════════════════════════════════════════════════════
export const DRINK_SPACING_PX = 14;           // horizontal gap between drinks at a seat
export const SEAT_ZONE_W = 70;                // interactive seat tap zone width
export const SEAT_ZONE_H = 80;                // interactive seat tap zone height
export const SEAT_ZONE_OFFSET_Y = 10;         // zone offset above SEAT_Y
export const CASH_OFFSET_X = 20;              // cash sprite X offset from seat center
export const STOOL_SPRITE_W = 48;             // stool sprite width (16 art × 3)

// ═══════════════════════════════════════════════════════════
// BAR LAYER / CLOCK
// ═══════════════════════════════════════════════════════════
export const CLOCK_OFFSET_Y = 80;             // clock center Y below guest_area.top
export const BAR_TOP_EXTRA_H = 5;             // extra height added to bar top fill
export const STOOL_LEG_W = 24;                // stool leg width
