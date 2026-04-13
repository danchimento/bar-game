/**
 * Generates ALL placeholder pixel-art sprites for the bar game Phaser migration.
 * Run: node scripts/generate-sprites.js
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const { GUEST_APPEARANCES, GUEST_BASE } = require('./guest-appearances');

const OUT = path.join(__dirname, '..', 'assets', 'sprites');
fs.mkdirSync(OUT, { recursive: true });

const SCALE = 6;       // default scale — each art pixel = 6×6 screen pixels
const ITEM_SCALE = 3;  // small handheld items (glasses, cash, tap handles, spills)
                        //   — these stay small relative to the 6× humans

function createSprite(w, h, drawFn, filename, scaleOverride) {
  const S = scaleOverride || SCALE;
  const canvas = createCanvas(w * S, h * S);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  function px(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * S, y * S, S, S);
  }
  function row(y, x0, x1, color) {
    for (let x = x0; x <= x1; x++) px(x, y, color);
  }
  function rect(x, y, w, h, color) {
    for (let dy = 0; dy < h; dy++) row(y + dy, x, x + w - 1, color);
  }
  function col(x, y0, y1, color) {
    for (let y = y0; y <= y1; y++) px(x, y, color);
  }

  drawFn({ px, row, rect, col, w, h });

  const buf = canvas.toBuffer('image/png');
  const outPath = path.join(OUT, filename);
  fs.writeFileSync(outPath, buf);
  console.log(`  ${filename} (${w}x${h} art @${S}x → ${canvas.width}x${canvas.height}px)`);  return buf;
}

console.log('Generating sprites...\n');

// ============================================================
// GUEST STANDING (24x32) — generated per appearance
// ============================================================
function drawGuestStanding({ px, row }, SHRT, SRTS) {
  const { SK, SKS, HAIR, HRH, EYE, PNT } = GUEST_BASE;

  row(0, 8, 15, HAIR); row(1, 7, 16, HAIR); px(10, 1, HRH); px(11, 1, HRH);
  row(2, 7, 16, HAIR); px(9, 2, HRH);
  for (let y = 3; y <= 9; y++) row(y, 8, 15, SK);
  for (let y = 3; y <= 5; y++) { px(7, y, HAIR); px(16, y, HAIR); }
  px(7, 6, SKS); px(16, 6, SKS);
  px(10, 6, EYE); px(13, 6, EYE);
  row(5, 10, 11, HAIR); row(5, 13, 14, HAIR);
  px(12, 7, SKS);
  px(11, 8, SKS); px(12, 8, '#c47050'); px(13, 8, SKS);
  row(9, 9, 14, SKS);
  row(10, 10, 13, SK); row(11, 10, 13, SK);
  for (let y = 12; y <= 22; y++) row(y, 6, 17, SHRT);
  for (let y = 13; y <= 21; y++) { px(7, y, SRTS); px(16, y, SRTS); }
  px(10, 12, SK); px(11, 12, SK); px(12, 12, SK); px(13, 12, SK);
  for (let y = 13; y <= 18; y++) { px(5, y, SHRT); px(18, y, SHRT); }
  for (let y = 19; y <= 21; y++) { px(5, y, SK); px(18, y, SK); }
  for (let y = 23; y <= 26; y++) row(y, 6, 17, PNT);
  for (let y = 27; y <= 31; y++) { row(y, 6, 10, PNT); row(y, 13, 17, PNT); }
}

for (const app of GUEST_APPEARANCES) {
  // Base (first) also gets the legacy name without suffix
  const names = [`guest_${app.id}.png`];
  if (app === GUEST_APPEARANCES[0]) names.push('guest.png');
  for (const name of names) {
    createSprite(24, 32, (ctx) => drawGuestStanding(ctx, app.shirt, app.shadow), name);
  }
}

// ============================================================
// GUEST SITTING (24x20) — upper body only, arms resting on bar
// No legs visible (hidden behind bar counter)
// ============================================================
function drawGuestSitting({ px, row, rect, col }, SHRT, SRTS) {
  const { SK, SKS, HAIR, HRH, EYE } = GUEST_BASE;

  // Hair
  row(0, 8, 15, HAIR);
  row(1, 7, 16, HAIR); px(10, 1, HRH); px(11, 1, HRH);
  row(2, 7, 16, HAIR); px(9, 2, HRH);

  // Face
  for (let y = 3; y <= 9; y++) row(y, 8, 15, SK);
  for (let y = 3; y <= 5; y++) { px(7, y, HAIR); px(16, y, HAIR); }
  px(7, 6, SKS); px(16, 6, SKS);
  px(10, 6, EYE); px(13, 6, EYE);
  row(5, 10, 11, HAIR); row(5, 13, 14, HAIR);
  px(12, 7, SKS);
  px(11, 8, SKS); px(12, 8, '#c47050'); px(13, 8, SKS);
  row(9, 9, 14, SKS);

  // Neck
  row(10, 10, 13, SK); row(11, 10, 13, SK);

  // Shirt / torso
  for (let y = 12; y <= 17; y++) row(y, 6, 17, SHRT);
  for (let y = 13; y <= 17; y++) { px(7, y, SRTS); px(16, y, SRTS); }
  px(10, 12, SK); px(11, 12, SK); px(12, 12, SK); px(13, 12, SK);

  // Arms extending outward and forward (resting on bar)
  for (let y = 13; y <= 15; y++) { px(5, y, SHRT); px(18, y, SHRT); }
  // Forearms reaching further out
  for (let y = 16; y <= 17; y++) { px(4, y, SHRT); px(19, y, SHRT); }
  // Hands resting on bar surface
  px(3, 18, SK); px(4, 18, SK); px(19, 18, SK); px(20, 18, SK);
  px(3, 19, SK); px(4, 19, SK); px(19, 19, SK); px(20, 19, SK);
}

for (const app of GUEST_APPEARANCES) {
  const names = [`guest_sitting_${app.id}.png`];
  if (app === GUEST_APPEARANCES[0]) names.push('guest_sitting.png');
  for (const name of names) {
    createSprite(24, 20, (ctx) => drawGuestSitting(ctx, app.shirt, app.shadow), name);
  }
}

// ============================================================
// BAR STOOL (16x20)
// ============================================================
createSprite(16, 20, ({ px, row, rect }) => {
  const WOOD = '#5a4a3a'; const WD = '#4a3a2a'; const WH = '#6a5a4a';
  const PAD = '#8b6914'; const PDS = '#7a5a10';

  // Seat pad
  row(0, 3, 12, PAD); row(1, 2, 13, PAD); row(2, 2, 13, PAD); row(3, 3, 12, PAD);
  px(3, 0, PDS); px(3, 1, PDS); px(4, 2, PDS);

  // Vertical support
  for (let y = 4; y <= 14; y++) { px(7, y, WOOD); px(8, y, WOOD); }
  px(7, 5, WH); px(7, 8, WH);

  // Legs (splayed)
  for (let y = 12; y <= 18; y++) {
    const spread = Math.floor((y - 12) * 0.7);
    px(7 - spread, y, WOOD); px(8 + spread, y, WOOD);
  }
  // Foot rest bar
  row(13, 4, 11, WD);

  // Feet
  row(19, 2, 4, WD); row(19, 11, 13, WD);
}, 'stool.png');

// ============================================================
// PINT GLASS (12x20)
// ============================================================
createSprite(12, 20, ({ px, row, rect, col }) => {
  const GL = '#c8d8e8'; const GLH = '#e0eaf4'; const GLD = '#a0b0c0';

  // Glass outline
  col(2, 2, 18, GL); col(9, 2, 18, GL); // sides
  row(19, 2, 9, GL); // bottom
  row(1, 3, 8, GL); // rim
  row(0, 3, 8, GLH); // rim highlight

  // Inner glass (transparent-ish)
  for (let y = 2; y <= 18; y++) row(y, 3, 8, 'rgba(200,220,240,0.15)');

  // Highlight on left side
  col(3, 3, 17, GLH);
}, 'glass_pint.png', ITEM_SCALE);

// ============================================================
// WINE GLASS (10x22)
// ============================================================
createSprite(10, 22, ({ px, row, col }) => {
  const GL = '#c8d8e8'; const GLH = '#e0eaf4';

  // Bowl
  row(0, 3, 6, GL);
  col(2, 1, 8, GL); col(7, 1, 8, GL);
  row(1, 2, 7, 'rgba(200,220,240,0.15)');
  for (let y = 2; y <= 7; y++) row(y, 3, 6, 'rgba(200,220,240,0.15)');
  row(8, 3, 6, GL);
  // Highlight
  col(3, 2, 7, GLH);

  // Stem
  for (let y = 9; y <= 17; y++) { px(4, y, GL); px(5, y, GL); }

  // Base
  row(18, 2, 7, GL);
  row(19, 1, 8, GL);
  row(19, 2, 3, GLH);
}, 'glass_wine.png', ITEM_SCALE);

// ============================================================
// PLASTIC CUP (10x16)
// ============================================================
createSprite(10, 16, ({ px, row, col }) => {
  const CUP = '#e8e8f0'; const CUPH = '#f4f4ff'; const CUPD = '#c0c0d0';

  // Slightly tapered cup
  row(0, 2, 7, CUP); // rim
  row(0, 2, 4, CUPH); // rim highlight
  col(1, 1, 14, CUP); col(8, 1, 14, CUP);
  for (let y = 1; y <= 14; y++) row(y, 2, 7, 'rgba(220,220,240,0.12)');
  row(15, 2, 7, CUP); // bottom
  // Highlight
  col(2, 1, 14, CUPH);
  // Shadow side
  col(7, 2, 13, CUPD);
}, 'glass_cup.png', ITEM_SCALE);

// ============================================================
// BEER TAP HANDLE (8x24)
// ============================================================
createSprite(8, 24, ({ px, row, rect, col }) => {
  const CHROME = '#b0b8c0'; const CHH = '#d0d8e0'; const CHD = '#808890';
  const HANDLE = '#e8c170'; const HND = '#c8a050'; const HNH = '#f0d088';

  // Tap top knob
  row(0, 2, 5, HANDLE); row(1, 1, 6, HANDLE);
  row(2, 1, 6, HANDLE); row(3, 2, 5, HANDLE);
  px(2, 0, HNH); px(3, 1, HNH);

  // Handle body
  for (let y = 4; y <= 14; y++) row(y, 2, 5, HANDLE);
  col(2, 4, 14, HND); col(3, 4, 14, HNH);

  // Chrome connector
  row(15, 1, 6, CHROME); row(16, 1, 6, CHROME);
  px(2, 15, CHH);

  // Spout
  for (let y = 17; y <= 22; y++) { px(3, y, CHROME); px(4, y, CHROME); }
  col(3, 17, 22, CHD);
  // Spout tip
  row(23, 3, 4, CHD);
}, 'tap_handle.png', ITEM_SCALE);

// ============================================================
// DISHWASHER (28x24)
// ============================================================
createSprite(28, 24, ({ px, row, rect, col }) => {
  const BODY = '#708090'; const BD = '#5a6a7a'; const BH = '#8898a8';
  const DOOR = '#606878'; const DRBD = '#505868';
  const HANDLE = '#aab0b8';

  // Body
  rect(0, 0, 28, 24, BODY);
  // Top edge highlight
  row(0, 0, 27, BH);
  // Bottom shadow
  row(23, 0, 27, BD);
  // Sides
  col(0, 0, 23, BD); col(27, 0, 23, BH);

  // Door panel
  rect(2, 3, 24, 16, DOOR);
  rect(3, 4, 22, 14, DRBD);
  // Door edge highlight
  row(3, 2, 25, '#6a7888');

  // Handle
  row(11, 4, 23, HANDLE);
  row(12, 4, 23, HANDLE);
  row(11, 5, 8, '#c0c8d0');

  // Status light (green = ready)
  px(24, 1, '#4caf50'); px(25, 1, '#4caf50');

  // Vent lines on door
  for (let x = 6; x <= 22; x += 4) {
    col(x, 5, 9, '#585e68');
  }
}, 'station_dishwasher.png');

// ============================================================
// SINK (24x24)
// ============================================================
createSprite(24, 24, ({ px, row, rect, col }) => {
  const BASIN = '#b0b8c0'; const BSD = '#909aa4'; const BSH = '#d0d8e0';
  const INNER = '#6a7a8a'; const FAUCET = '#c0c8d0';

  // Basin body
  rect(0, 8, 24, 16, BASIN);
  row(8, 0, 23, BSH); // top rim highlight
  row(23, 0, 23, BSD); // bottom
  col(0, 8, 23, BSD); col(23, 8, 23, BSH);

  // Inner basin (dark)
  rect(3, 10, 18, 11, INNER);
  row(10, 4, 19, '#5a6a7a');

  // Faucet (rises from back)
  rect(10, 0, 4, 10, FAUCET);
  row(0, 10, 13, '#d8e0e8');
  // Spout
  rect(14, 2, 4, 3, FAUCET);
  px(17, 4, '#d8e0e8'); px(17, 5, FAUCET);
  col(17, 5, 7, FAUCET);

  // Knob
  px(7, 6, '#4488cc'); px(8, 6, '#4488cc');
  px(7, 7, '#3366aa'); px(8, 7, '#3366aa');

  // Drain
  px(11, 18, '#444'); px(12, 18, '#444');
}, 'station_sink.png');

// ============================================================
// GLASS RACK (42x24) — compact 2-section shelf unit
// ============================================================
createSprite(42, 24, ({ px, row, rect, col }) => {
  const WOOD = '#5a4a38'; const WD = '#4a3a28'; const WH = '#6a5a48';
  const GL = 'rgba(200,220,240,0.4)';

  // Frame
  rect(0, 0, 42, 24, WOOD);
  row(0, 0, 41, WH); col(0, 0, 23, WD); col(41, 0, 23, WH);
  row(23, 0, 41, WD);

  // Shelf divider
  row(11, 1, 40, WH); row(12, 1, 40, WD);

  // Back panel (darker)
  rect(1, 1, 40, 10, '#3a2a18');
  rect(1, 13, 40, 10, '#3a2a18');

  // Section divider
  col(20, 1, 22, WD); col(21, 1, 22, WH);

  // Glasses on top shelf (3 per section = 6 total)
  for (const sx of [0, 21]) {
    for (const gx of [sx + 2, sx + 8, sx + 14]) {
      col(gx, 3, 10, GL); col(gx + 4, 3, 10, GL);
      row(10, gx, gx + 4, GL);
      row(3, gx + 1, gx + 3, GL);
    }
  }
  // Glasses on bottom shelf
  for (const sx of [0, 21]) {
    for (const gx of [sx + 2, sx + 8, sx + 14]) {
      col(gx, 15, 22, GL); col(gx + 4, 15, 22, GL);
      row(22, gx, gx + 4, GL);
      row(15, gx + 1, gx + 3, GL);
    }
  }
}, 'station_glass_rack.png');

// ============================================================
// TAPS STATION (40x32) — clear beer tap tower
// ============================================================
createSprite(40, 32, ({ px, row, rect, col }) => {
  const CHROME = '#b0b8c0'; const CHD = '#808890'; const CHH = '#d0d8e0';
  const TOWER = '#888890'; const TWD = '#686870'; const TWH = '#a8a8b0';
  const DRIP = '#555'; const DRIPH = '#666';

  // Tower body (centered pillar)
  rect(14, 0, 12, 20, TOWER);
  col(14, 0, 19, TWD); col(25, 0, 19, TWH);
  row(0, 14, 25, TWH);
  // Tower cap
  rect(12, 0, 16, 2, CHROME);
  row(0, 12, 27, CHH);

  // Three tap handles with distinct beer colors
  const taps = [
    { x: 6, color: '#f0c040', dark: '#c8a020' },   // gold lager
    { x: 17, color: '#d4a020', dark: '#a87810' },   // amber
    { x: 28, color: '#3a1a0a', dark: '#2a0a00' },   // dark porter
  ];
  for (const t of taps) {
    // Handle (tall rounded shape)
    rect(t.x, 2, 5, 14, t.color);
    col(t.x, 3, 14, t.dark);
    col(t.x + 1, 2, 14, t.color);
    // Rounded knob on top
    row(1, t.x, t.x + 4, t.color);
    row(0, t.x + 1, t.x + 3, t.color);
    px(t.x + 1, 0, t.dark);
    // Chrome base/connector
    rect(t.x, 15, 5, 2, CHROME);
    row(15, t.x, t.x + 4, CHH);
    // Spout pointing down
    rect(t.x + 1, 17, 3, 5, CHROME);
    col(t.x + 1, 17, 21, CHD);
    col(t.x + 3, 17, 21, CHH);
    // Spout tip
    row(22, t.x + 1, t.x + 3, CHD);
  }

  // Drip tray (wide metal tray at bottom)
  rect(2, 25, 36, 3, DRIP);
  row(25, 2, 37, DRIPH);
  rect(4, 26, 32, 1, '#444');
  // Tray rim
  rect(1, 24, 38, 1, CHROME);

  // Drip tray grate lines
  for (let x = 5; x < 36; x += 3) {
    px(x, 26, '#4a4a4a');
  }
}, 'station_taps.png');

// ============================================================
// WINE STATION (24x24)
// ============================================================
createSprite(24, 24, ({ px, row, rect, col }) => {
  const RACK = '#3a2a18'; const RKH = '#4a3a28';
  const RED = '#8b1a1a'; const WHITE = '#e8e0a0';
  const LABEL = '#d4c8a0';

  // Rack
  rect(0, 0, 24, 24, RACK);
  row(0, 0, 23, RKH);
  // Divider
  col(12, 0, 23, RKH);

  // Red wine bottle (left slot)
  rect(2, 3, 8, 18, RED);
  row(2, 3, 8, '#6a1010'); // cap
  rect(4, 5, 4, 4, LABEL); // label
  px(5, 6, '#333'); px(6, 6, '#333'); // "R" hint

  // White wine bottle (right slot)
  rect(14, 3, 8, 18, WHITE);
  row(2, 15, 20, '#c8c080'); // cap
  rect(16, 5, 4, 4, LABEL);
  px(17, 6, '#333'); px(18, 6, '#333'); // "W" hint
}, 'station_wine.png');

// ============================================================
// PREP STATION (28x24)
// ============================================================
createSprite(28, 24, ({ px, row, rect, col }) => {
  const BOARD = '#b89060'; const BRD = '#a07848'; const BRH = '#c8a070';
  const ORANGE = '#ff8c00'; const LIME = '#32cd32';
  const LEMON = '#ffd700'; const CHERRY = '#dc143c';

  // Cutting board base
  rect(0, 8, 28, 14, BOARD);
  row(8, 0, 27, BRH);
  row(21, 0, 27, BRD);

  // Garnish containers (small squares across the top)
  rect(2, 0, 5, 7, ORANGE);
  rect(9, 0, 5, 7, LIME);
  rect(16, 0, 5, 7, LEMON);
  rect(23, 0, 5, 7, CHERRY);

  // Container rims
  row(0, 2, 6, '#e87800'); row(0, 9, 13, '#28b828');
  row(0, 16, 20, '#e8c000'); row(0, 23, 27, '#c81030');

  // Ice bucket hint (on board)
  rect(10, 12, 8, 8, '#a0c8e0');
  rect(11, 13, 6, 6, '#c0e0f0');
  row(12, 10, 17, '#88aac0');
}, 'station_prep.png');

// ============================================================
// POS TERMINAL — BACK VIEW (24x28) — what the bartender sees
// Monitor back panel with stand, vents, cable ports, and a small receipt printer
// ============================================================
createSprite(24, 28, ({ px, row, rect, col }) => {
  const CASE = '#2a2a2a'; const CASEH = '#363636'; const CASED = '#1e1e1e';
  const VENT = '#1a1a1a'; const STAND = '#333'; const BASE = '#3a3a3a';
  const BASEH = '#484848'; const CABLE = '#222'; const PORT = '#0a0a0a';
  const LABEL = '#444'; const LED = '#2a8a2a';

  // Monitor back casing
  rect(2, 0, 20, 18, CASE);
  // Top edge highlight
  row(0, 3, 20, CASEH);
  // Side edges
  col(2, 0, 17, CASEH); col(21, 0, 17, CASED);

  // Center raised bump (where the electronics are)
  rect(7, 3, 10, 10, CASEH);
  rect(8, 4, 8, 8, CASE);

  // Vent slits on the back panel
  row(5, 9, 14, VENT); row(7, 9, 14, VENT); row(9, 9, 14, VENT);

  // Small label/sticker area
  rect(9, 11, 6, 2, LABEL);

  // Status LED
  px(18, 2, LED); px(19, 2, '#1a6a1a');

  // Cable ports at bottom of monitor
  rect(6, 15, 3, 2, PORT); rect(11, 15, 3, 2, PORT); rect(16, 15, 3, 2, PORT);

  // Stand / neck
  rect(10, 18, 4, 4, STAND);
  col(10, 18, 21, CASEH); col(13, 18, 21, CASED);

  // Cables hanging from back (dangling down to counter)
  col(7, 17, 21, CABLE); col(12, 17, 20, CABLE); col(17, 17, 21, CABLE);

  // Base plate
  rect(4, 22, 16, 3, BASE);
  row(22, 5, 18, BASEH);
  row(24, 5, 18, CASED);

  // Receipt printer to the right — small box
  rect(19, 14, 4, 8, '#3a3530');
  row(14, 19, 22, '#4a4540'); // top edge
  // Paper slot
  row(15, 20, 21, '#d8d0c0');
  // Receipt paper sticking out
  rect(20, 12, 2, 3, '#e8e0d0');
  px(20, 12, '#d8d0c0');

}, 'station_pos.png');

// ============================================================
// TRASH CAN (16x24)
// ============================================================
createSprite(16, 24, ({ px, row, rect, col }) => {
  const BODY = '#555'; const BD = '#444'; const BH = '#666';
  const LID = '#666'; const LDH = '#777';

  // Lid
  rect(1, 0, 14, 4, LID);
  row(0, 2, 13, LDH);
  // Handle on lid
  row(0, 6, 9, '#888');

  // Body (slightly tapered)
  rect(2, 4, 12, 18, BODY);
  col(2, 4, 21, BD); col(13, 4, 21, BH);

  // Vertical lines
  col(5, 5, 20, BD); col(8, 5, 20, BD); col(11, 5, 20, BD);

  // Bottom
  row(22, 2, 13, BD); row(23, 3, 12, BD);
}, 'station_trash.png');

// ============================================================
// DOOR (16x36) — door in the back wall, sized to fit a guest
// ============================================================
createSprite(16, 36, ({ px, row, rect, col }) => {
  const FRAME = '#5a4a30';   // wood frame
  const DOOR  = '#4a3a20';   // door panel (darker wood)
  const KNOB  = '#c8b870';   // brass knob
  const INNER = '#3a2a18';   // recessed panel interior
  const SHADOW = '#1a1a2e';  // dark gap

  // Frame
  col(0, 0, 35, FRAME); col(15, 0, 35, FRAME);  // sides
  col(1, 0, 35, FRAME);  col(14, 0, 35, FRAME);  // thicker sides
  row(0, 0, 15, FRAME); row(1, 0, 15, FRAME);     // top (2px)
  row(35, 0, 15, FRAME);                           // threshold

  // Door panel
  rect(2, 2, 12, 33, DOOR);

  // Upper panel (recessed)
  rect(3, 4, 10, 12, SHADOW);
  rect(4, 5, 8, 10, INNER);

  // Lower panel (recessed)
  rect(3, 19, 10, 12, SHADOW);
  rect(4, 20, 8, 10, INNER);

  // Knob (right side)
  px(12, 17, KNOB); px(12, 18, KNOB);
  px(11, 17, '#a89860');
}, 'door.png');

// ============================================================
// ZONE TILES — tileable textures for each spatial zone (64px wide)
// ============================================================

// WALL TILE (64x16) — dark interior wall with subtle wainscoting/paneling feel
createSprite(64, 16, ({ px, row, rect }) => {
  const BASE = '#252540'; const BASELT = '#2a2a48'; const BASEDK = '#20203a';

  rect(0, 0, 64, 16, BASE);
  // Very faint horizontal line — subtle paneling
  for (let x = 0; x < 64; x += 2) { px(x, 15, BASEDK); }
  // Sparse light variations for warmth
  px(10, 5, BASELT); px(11, 5, BASELT);
  px(35, 3, BASELT); px(36, 3, BASELT);
  px(52, 9, BASELT); px(53, 9, BASELT);
  px(20, 12, BASELT); px(21, 12, BASELT);
  px(45, 7, BASELT);
  // Faint shadow near bottom
  for (let x = 1; x < 64; x += 3) { px(x, 14, BASEDK); }
}, 'tile_wall.png');

// BAR TOP TILE (64x16) — warm polished wood, seamless edges
createSprite(64, 16, ({ px, rect }) => {
  const WOOD = '#8B4513'; const WOODH = '#9B5523'; const WOODD = '#7a3a0f';

  rect(0, 0, 64, 16, WOOD);
  // Wood grain — long horizontal streaks (no border rows)
  for (let x = 2; x < 64; x += 9) {
    px(x, 4, WOODH); px(x + 1, 5, WOODH); px(x + 2, 5, WOODH);
    px(x + 3, 6, WOODH); px(x + 4, 6, WOODH);
  }
  for (let x = 5; x < 64; x += 11) {
    px(x, 9, WOODD); px(x + 1, 10, WOODD); px(x + 2, 10, WOODD);
    px(x + 3, 11, WOODD);
  }
  // Knot hint
  px(30, 7, WOODD); px(31, 7, WOODD); px(30, 8, WOODD); px(31, 8, WOODD);
  // Sparse subtle grain near edges for seamless blending
  px(3, 1, WOODH); px(50, 14, WOODH); px(20, 13, WOODD);
}, 'tile_bar_top.png');

// BAR CABINET TILE (64x16) — dark under-bar storage panel
createSprite(64, 16, ({ px, rect, col }) => {
  const WOOD = '#2a1a0e'; const WOODH = '#3a2a1a'; const WOODD = '#1e120a';

  rect(0, 0, 64, 16, WOOD);
  // Vertical slat lines (subtle panel divisions)
  for (let x = 15; x < 64; x += 16) {
    col(x, 0, 15, WOODD);
    col(x + 1, 0, 15, WOODH);
  }
  // Subtle wood grain
  for (let x = 4; x < 64; x += 13) {
    px(x, 6, WOODH); px(x + 1, 7, WOODH); px(x, 10, WOODH);
  }
}, 'tile_cabinet.png');

// FLOOR TILE (64x16) — subtle dark floor, minimal texture
createSprite(64, 16, ({ px, row, rect }) => {
  const BASE = '#3a2818'; const BASELT = '#3f2d1c'; const BASEDK = '#352414';

  rect(0, 0, 64, 16, BASE);
  // Very faint horizontal seam — barely visible
  for (let x = 0; x < 64; x += 2) { px(x, 7, BASEDK); }
  for (let x = 1; x < 64; x += 2) { px(x, 15, BASEDK); }
  // Sparse subtle grain — just a few light pixels
  px(8, 3, BASELT); px(9, 3, BASELT);
  px(30, 4, BASELT); px(31, 4, BASELT);
  px(50, 2, BASELT); px(51, 2, BASELT);
  px(15, 11, BASELT); px(16, 11, BASELT);
  px(40, 12, BASELT); px(41, 12, BASELT);
  px(58, 10, BASELT);
}, 'tile_floor.png');

// COUNTER TILE (64x8) — matches bar top polished wood
createSprite(64, 8, ({ px, rect }) => {
  const CNT = '#8B4513'; const CNTH = '#9B5523';

  rect(0, 0, 64, 8, CNT);
  // Subtle wood grain only — tiles seamlessly
  for (let x = 3; x < 64; x += 9) {
    px(x, 2, CNTH); px(x + 1, 3, CNTH); px(x + 2, 3, CNTH);
    px(x + 4, 5, CNTH); px(x + 5, 6, CNTH);
  }
}, 'tile_counter.png');

// ============================================================
// CLIPBOARD / MENU (16x24) — wooden clipboard with paper and clip
// ============================================================
createSprite(16, 24, ({ px, row, rect, col }) => {
  const BOARD = '#8B6914'; const BOARDH = '#9B7924'; const BOARDD = '#6b5010';
  const PAPER = '#e8e0d0'; const PAPERD = '#d0c8b8';
  const CLIP = '#888'; const CLIPH = '#aaa'; const CLIPD = '#666';
  const LINE = '#999';

  // Clipboard board
  rect(1, 3, 14, 20, BOARD);
  col(1, 3, 22, BOARDD); col(14, 3, 22, BOARDH);
  row(22, 2, 13, BOARDD);

  // Metal clip at top
  rect(4, 0, 8, 5, CLIP);
  row(0, 5, 10, CLIPH);
  row(4, 5, 10, CLIPD);
  // Clip jaw
  rect(5, 4, 6, 2, CLIPD);
  row(5, 6, 9, CLIP);

  // Paper sheet
  rect(3, 5, 10, 16, PAPER);
  col(3, 5, 20, PAPERD);
  row(20, 4, 11, PAPERD);

  // Text lines on paper
  row(8, 5, 10, LINE);
  row(10, 5, 11, LINE);
  row(12, 5, 9, LINE);
  row(14, 5, 11, LINE);
  row(16, 5, 8, LINE);

}, 'station_menu.png');

// ============================================================
// CASH BILLS (12x8)
// ============================================================
createSprite(12, 8, ({ px, row, rect }) => {
  rect(0, 0, 12, 8, '#2d6b2e');
  row(0, 0, 11, '#3d8b3e');
  row(7, 0, 11, '#1d5b1e');
  // $ symbol hint
  px(5, 2, '#4caf50'); px(6, 2, '#4caf50');
  px(5, 3, '#4caf50'); px(5, 4, '#4caf50'); px(6, 4, '#4caf50');
  px(6, 5, '#4caf50');
}, 'cash.png', ITEM_SCALE);

// ============================================================
// DIRTY MARK / SPILL (16x8)
// ============================================================
createSprite(16, 8, ({ px, row }) => {
  const SP = '#8b6914'; const SPD = '#6a5010';
  row(2, 3, 12, SP); row(3, 2, 13, SP);
  row(4, 1, 14, SP); row(5, 2, 13, SP);
  row(6, 4, 11, SP);
  // Darker center
  px(7, 3, SPD); px(8, 3, SPD); px(7, 4, SPD); px(8, 4, SPD);
}, 'spill.png', ITEM_SCALE);

// ============================================================
// SERVICE MAT (20x6)
// ============================================================
createSprite(20, 6, ({ px, row, rect }) => {
  rect(0, 0, 20, 6, '#333');
  row(0, 0, 19, '#444');
  // Rubber texture dots
  for (let x = 2; x < 20; x += 3) {
    px(x, 2, '#3a3a3a'); px(x, 4, '#3a3a3a');
  }
}, 'service_mat.png');

console.log('\nDone! All sprites generated in assets/sprites/');
