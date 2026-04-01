/**
 * Generates pixel-art icons for radial menu actions and tap frame/handles.
 * Run: node scripts/generate-radial-icons.js
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets', 'sprites');
fs.mkdirSync(OUT, { recursive: true });

const SCALE = 3;

function createSprite(w, h, drawFn, filename) {
  const canvas = createCanvas(w * SCALE, h * SCALE);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  function px(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
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
  function circle(cx, cy, r, color) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) px(cx + dx, cy + dy, color);
      }
    }
  }

  drawFn({ px, row, rect, col, circle, w, h });

  const buf = canvas.toBuffer('image/png');
  const outPath = path.join(OUT, filename);
  fs.writeFileSync(outPath, buf);
  console.log(`  ${filename} (${w}x${h} @${SCALE}x → ${canvas.width}x${canvas.height})`);
}

console.log('Generating radial menu icons...\n');

// ============================================================
// RM_SERVE — hand serving glass (12x12)
// ============================================================
createSprite(12, 12, ({ px, row, rect, col }) => {
  const GL = '#c8d8e8';
  const BEER = '#f0c040';
  const HAND = '#e8c170';
  const CHECK = '#4caf50';
  // Glass
  col(3, 2, 9, GL);
  col(8, 2, 9, GL);
  row(10, 3, 8, GL);
  row(1, 4, 7, GL);
  // Beer fill
  for (let y = 5; y <= 9; y++) row(y, 4, 7, BEER);
  // Small checkmark
  px(10, 5, CHECK); px(11, 4, CHECK); px(9, 6, CHECK);
}, 'rm_serve.png');

// ============================================================
// RM_QUESTION — question mark (10x12)
// ============================================================
createSprite(10, 12, ({ px, row, rect, circle }) => {
  const BG = '#4a7aaa';
  const WHITE = '#ffffff';
  // Blue circle bg
  circle(5, 6, 5, BG);
  // Question mark
  row(2, 4, 6, WHITE);
  px(3, 3, WHITE); px(7, 3, WHITE);
  px(7, 4, WHITE);
  px(6, 5, WHITE); px(5, 6, WHITE);
  px(5, 8, WHITE); // dot
}, 'rm_question.png');

// ============================================================
// RM_SMILE — happy face (12x12)
// ============================================================
createSprite(12, 12, ({ px, row, circle }) => {
  const YELLOW = '#ffc107';
  const DARK = '#3a2a1a';
  circle(6, 6, 5, YELLOW);
  // Eyes
  px(4, 4, DARK); px(8, 4, DARK);
  // Smile
  px(3, 7, DARK); px(4, 8, DARK); px(5, 8, DARK);
  px(6, 8, DARK); px(7, 8, DARK); px(8, 7, DARK);
}, 'rm_smile.png');

// ============================================================
// RM_TAKE_GLASS — hand grabbing empty glass (12x12)
// ============================================================
createSprite(12, 12, ({ px, row, rect, col }) => {
  const GL = '#a0b0c0';
  const HAND = '#e8c170';
  // Empty glass outline
  col(3, 3, 10, GL);
  col(8, 3, 10, GL);
  row(11, 3, 8, GL);
  row(2, 4, 7, GL);
  // Arrow up
  px(1, 1, HAND); px(0, 2, HAND); px(1, 2, HAND); px(2, 2, HAND);
  px(1, 3, HAND); px(1, 4, HAND); px(1, 5, HAND);
}, 'rm_take_glass.png');

// ============================================================
// RM_GLASS — generic pint glass (10x14)
// ============================================================
createSprite(10, 14, ({ px, row, col }) => {
  const GL = '#c8d8e8';
  const GLH = '#e0eaf4';
  // Pint glass shape
  col(1, 1, 12, GL);
  col(8, 1, 12, GL);
  row(13, 1, 8, GL);
  row(0, 2, 7, GLH);
  // Inner highlight
  col(2, 2, 11, GLH);
}, 'rm_glass.png');

// ============================================================
// RM_WINE — wine glass (10x14)
// ============================================================
createSprite(10, 14, ({ px, row, col }) => {
  const GL = '#c8d8e8';
  const WINE = '#8b1a1a';
  // Bowl
  row(0, 3, 7, GL);
  row(1, 2, 8, GL);
  row(2, 2, 8, GL);
  row(3, 2, 8, GL);
  row(4, 3, 7, GL);
  row(5, 4, 6, GL);
  // Wine fill
  row(2, 3, 7, WINE);
  row(3, 3, 7, WINE);
  row(4, 4, 6, WINE);
  // Stem
  col(5, 6, 10, GL);
  // Base
  row(11, 3, 7, GL);
  row(12, 2, 8, GL);
}, 'rm_wine.png');

// ============================================================
// RM_CLEAN — sparkles/bubbles (12x12)
// ============================================================
createSprite(12, 12, ({ px, circle }) => {
  const BLUE = '#64b5f6';
  const WHITE = '#ffffff';
  const BLUEL = '#90caf9';
  // Bubbles
  circle(3, 4, 2, BLUE);
  circle(8, 3, 2, BLUEL);
  circle(5, 8, 2, BLUE);
  circle(9, 8, 1, BLUEL);
  // Sparkle highlights
  px(2, 3, WHITE); px(7, 2, WHITE); px(4, 7, WHITE);
  // Sparkle stars
  px(1, 1, WHITE); px(10, 5, WHITE); px(10, 10, WHITE);
}, 'rm_clean.png');

// ============================================================
// RM_DUMP — water pouring down (10x12)
// ============================================================
createSprite(10, 12, ({ px, row, col, rect }) => {
  const METAL = '#888888';
  const METALL = '#aaaaaa';
  const WATER = '#64b5f6';
  // Faucet
  rect(1, 0, 8, 3, METAL);
  row(0, 1, 8, METALL);
  col(8, 3, 5, METAL);
  // Water stream
  col(7, 6, 11, WATER);
  col(8, 7, 10, WATER);
  // Splash
  px(5, 11, WATER); px(6, 10, WATER); px(9, 11, WATER);
}, 'rm_dump.png');

// ============================================================
// RM_TRASH — trash can (10x12)
// ============================================================
createSprite(10, 12, ({ px, row, col, rect }) => {
  const GRAY = '#666666';
  const GRAYL = '#888888';
  const LID = '#777777';
  // Lid
  row(0, 2, 7, LID);
  row(1, 1, 8, LID);
  // Body (tapers slightly)
  for (let y = 2; y <= 10; y++) {
    row(y, 2, 7, GRAY);
  }
  row(11, 2, 7, GRAY);
  // Ridges
  col(3, 3, 10, GRAYL);
  col(5, 3, 10, GRAYL);
  col(7, 3, 10, GRAYL);
  // Handle on lid
  row(0, 4, 5, GRAYL);
}, 'rm_trash.png');

// ============================================================
// RM_ICE — ice cube (10x10)
// ============================================================
createSprite(10, 10, ({ px, row, rect }) => {
  const ICE = '#b3e5fc';
  const ICEL = '#e1f5fe';
  const ICED = '#81d4fa';
  // Cube shape (isometric-ish)
  rect(1, 1, 8, 8, ICE);
  // Highlight
  row(1, 2, 4, ICEL);
  row(2, 1, 3, ICEL);
  // Shadow
  row(8, 3, 8, ICED);
  row(7, 6, 8, ICED);
  // Reflection
  px(3, 3, ICEL); px(4, 3, ICEL);
  px(3, 4, ICEL);
}, 'rm_ice.png');

// ============================================================
// TAP FRAME — metal U-frame with 3 cylinder taps (60x40)
// ============================================================
createSprite(60, 40, ({ px, row, rect, col }) => {
  const METAL = '#888888';
  const METALL = '#aaaaaa';
  const METALD = '#666666';
  const CHROME = '#cccccc';

  // ── U-Frame ──
  // Left vertical post
  rect(4, 2, 4, 28, METAL);
  col(4, 2, 29, METALL);   // left highlight
  col(7, 2, 29, METALD);   // right shadow

  // Right vertical post
  rect(52, 2, 4, 28, METAL);
  col(52, 2, 29, METALL);
  col(55, 2, 29, METALD);

  // Top crossbar
  rect(4, 2, 52, 4, METAL);
  row(2, 4, 55, METALL);    // top highlight
  row(4, 4, 55, METALD);    // subtle bottom edge
  // Chrome accent on crossbar
  row(3, 5, 54, CHROME);

  // ── 3 Cylinder Taps on crossbar ──
  // Tap positions: 15, 30, 45 (evenly spaced)
  for (const tx of [15, 30, 45]) {
    // Cylinder tap body — extends above and below crossbar
    rect(tx - 2, 0, 5, 12, METAL);
    // Highlight
    col(tx - 1, 0, 11, METALL);
    col(tx, 0, 11, CHROME);
    // Dark edges
    col(tx - 2, 0, 11, METALD);
    col(tx + 2, 0, 11, METALD);
    // Nozzle tip
    rect(tx - 1, 12, 3, 1, METALD);
  }

  // Subtle base/feet
  rect(3, 30, 6, 2, METALD);
  rect(51, 30, 6, 2, METALD);
}, 'tap_frame.png');

// ============================================================
// BEER HANDLES — tall cylinder with beer name (per beer)
// ============================================================
const BEERS = [
  { key: 'GOLD_LAGER',   name: 'Boors',   color: '#f0c040', dark: '#c8a020' },
  { key: 'HAZY_IPA',     name: 'Hazy',    color: '#d4a020', dark: '#b08818' },
  { key: 'DARK_PORTER',  name: 'Porter',  color: '#5a3a2a', dark: '#3a1a0a' },
  { key: 'HARVEST_MOON', name: 'Harvest', color: '#e8b840', dark: '#c09828' },
];

for (const beer of BEERS) {
  const colorInt = beer.color;
  const darkInt = beer.dark;

  // Upright handle (8x20)
  createSprite(8, 20, ({ px, row, rect, col }) => {
    // Main cylinder body
    rect(1, 0, 6, 18, colorInt);
    // Highlight on left
    col(1, 0, 17, colorInt);
    col(2, 0, 17, beer.color);
    // Shadow on right
    col(6, 0, 17, darkInt);
    // Top cap (rounded)
    row(0, 2, 5, colorInt);
    px(1, 0, darkInt);
    px(6, 0, darkInt);
    // Bottom mount ring
    rect(0, 18, 8, 2, '#888888');
    row(18, 0, 7, '#aaaaaa');

    // Name on handle — write as pixel text
    // Use a simple 3px-wide bitmap font
    const name = beer.name;
    const textColor = beer.key === 'DARK_PORTER' ? '#e0d0b0' : '#1a1a1a';
    // Center the name vertically on handle
    const startY = 4;
    // We'll write each character as a tiny 3x5 pixel glyph, stacked vertically
    const GLYPHS = getGlyphs();
    let cy = startY;
    for (const ch of name) {
      const glyph = GLYPHS[ch.toUpperCase()] || GLYPHS['?'];
      if (!glyph) continue;
      for (let gy = 0; gy < glyph.length; gy++) {
        for (let gx = 0; gx < glyph[gy].length; gx++) {
          if (glyph[gy][gx]) {
            px(2 + gx, cy + gy, textColor);
          }
        }
      }
      cy += 3; // 2px glyph + 1px gap — tight vertical packing
    }
  }, `handle_${beer.key.toLowerCase()}.png`);

  // Pulled handle (tilted ~30° forward) — 10x16
  createSprite(10, 16, ({ px, row, rect, col }) => {
    // Handle tilted forward (drawn at an angle)
    // Approximate by shifting columns
    for (let y = 0; y < 14; y++) {
      const shift = Math.floor((14 - y) * 0.4); // tilt offset
      for (let x = 1; x <= 6; x++) {
        const sx = x + shift;
        if (sx >= 0 && sx < 10) {
          const c = x <= 2 ? colorInt : (x >= 6 ? darkInt : colorInt);
          px(sx, y, c);
        }
      }
    }
    // Bottom mount
    rect(0, 14, 8, 2, '#888888');
    row(14, 0, 7, '#aaaaaa');
  }, `handle_${beer.key.toLowerCase()}_pulled.png`);
}

function getGlyphs() {
  // Tiny 3x2 pixel glyphs for vertical text on handles
  // Each glyph is an array of rows, each row is array of 0/1
  return {
    'B': [[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,1,0]],
    'O': [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
    'R': [[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,0,1]],
    'S': [[0,1,1],[1,0,0],[0,1,0],[0,0,1],[1,1,0]],
    'H': [[1,0,1],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
    'A': [[0,1,0],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
    'Z': [[1,1,1],[0,0,1],[0,1,0],[1,0,0],[1,1,1]],
    'Y': [[1,0,1],[1,0,1],[0,1,0],[0,1,0],[0,1,0]],
    'P': [[1,1,0],[1,0,1],[1,1,0],[1,0,0],[1,0,0]],
    'T': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
    'E': [[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,1,1]],
    'D': [[1,1,0],[1,0,1],[1,0,1],[1,0,1],[1,1,0]],
    'K': [[1,0,1],[1,0,1],[1,1,0],[1,0,1],[1,0,1]],
    'V': [[1,0,1],[1,0,1],[1,0,1],[0,1,0],[0,1,0]],
    'W': [[1,0,1],[1,0,1],[1,1,1],[1,1,1],[1,0,1]],
    'I': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
    'L': [[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
    'N': [[1,0,1],[1,1,1],[1,1,1],[1,0,1],[1,0,1]],
    'U': [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
    'G': [[0,1,1],[1,0,0],[1,0,1],[1,0,1],[0,1,1]],
    'C': [[0,1,1],[1,0,0],[1,0,0],[1,0,0],[0,1,1]],
    'F': [[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,0,0]],
    'M': [[1,0,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1]],
    '?': [[0,1,0],[0,0,1],[0,1,0],[0,0,0],[0,1,0]],
  };
}

console.log('\nDone! Radial menu icons and tap sprites generated.');
