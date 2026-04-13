/**
 * Generates pixel-art indicator icons to replace emoji text above guests.
 * Also generates "guest sipping" frame sprite.
 * Run: node scripts/generate-indicators.js
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets', 'sprites');
fs.mkdirSync(OUT, { recursive: true });

const SCALE = 6;

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

console.log('Generating indicator sprites...\n');

// ============================================================
// HOURGLASS ICON (10x14) — waiting/thinking
// ============================================================
createSprite(10, 14, ({ px, row, rect, col }) => {
  const FRAME = '#d4a020';
  const GLASS = '#f5e6c8';
  const SAND = '#e8c170';
  const SANDT = '#c8a050';

  // Top bar
  row(0, 1, 8, FRAME);
  row(1, 1, 8, FRAME);
  // Top glass bulb
  row(2, 2, 7, GLASS);
  row(3, 2, 7, GLASS);
  // Sand in top (partially drained)
  row(2, 3, 6, SAND);
  row(3, 3, 6, SAND);
  // Narrowing
  row(4, 3, 6, GLASS);
  row(5, 4, 5, GLASS);
  // Middle pinch
  row(6, 4, 5, SANDT);
  row(7, 4, 5, GLASS);
  // Widening
  row(8, 3, 6, GLASS);
  row(9, 3, 6, GLASS);
  // Sand in bottom (filling)
  row(9, 3, 6, SAND);
  row(10, 2, 7, GLASS);
  row(11, 2, 7, GLASS);
  row(10, 3, 6, SAND);
  row(11, 3, 6, SAND);
  // Bottom bar
  row(12, 1, 8, FRAME);
  row(13, 1, 8, FRAME);
}, 'icon_hourglass.png');

// ============================================================
// EYES ICON (12x8) — looking/wants attention
// ============================================================
createSprite(12, 8, ({ px, row, rect }) => {
  const WHITE = '#ffffff';
  const IRIS = '#4a7aaa';
  const PUPIL = '#111111';
  const LID = '#c8a080';

  // Left eye
  row(0, 1, 3, LID);     // brow
  row(1, 0, 4, WHITE);
  row(2, 0, 4, WHITE);
  row(3, 0, 4, WHITE);
  row(4, 1, 3, LID);     // bottom lid
  // Left iris + pupil
  px(2, 1, IRIS); px(3, 1, IRIS);
  px(2, 2, IRIS); px(3, 2, PUPIL);
  px(2, 3, IRIS); px(3, 3, IRIS);

  // Right eye
  row(0, 8, 10, LID);
  row(1, 7, 11, WHITE);
  row(2, 7, 11, WHITE);
  row(3, 7, 11, WHITE);
  row(4, 8, 10, LID);
  // Right iris + pupil
  px(9, 1, IRIS); px(10, 1, IRIS);
  px(9, 2, IRIS); px(10, 2, PUPIL);
  px(9, 3, IRIS); px(10, 3, IRIS);

  // Eyebrow emphasis
  row(0, 1, 4, LID);
  row(0, 7, 10, LID);
}, 'icon_eyes.png');

// ============================================================
// MONEY/DOLLAR ICON (10x12) — wants to pay
// ============================================================
createSprite(10, 12, ({ px, row, rect, col }) => {
  const GREEN = '#2d8b2e';
  const GREENL = '#4caf50';
  const GREENDK = '#1d6b1e';
  const WHITE = '#d0f0d0';

  // Bill shape
  rect(0, 1, 10, 10, GREEN);
  row(0, 1, 8, GREENL);  // top edge
  row(11, 1, 8, GREENDK); // bottom edge
  col(0, 1, 10, GREENDK);
  col(9, 1, 10, GREENL);

  // $ sign in center
  col(5, 3, 9, WHITE);
  row(3, 4, 6, WHITE);
  row(6, 4, 6, WHITE);
  row(9, 4, 6, WHITE);
  px(4, 4, WHITE);
  px(6, 8, WHITE);
}, 'icon_money.png');

// ============================================================
// ANGRY FACE (12x12) — angry leaving
// ============================================================
createSprite(12, 12, ({ px, row, rect, col }) => {
  const RED = '#e53935';
  const REDK = '#c62828';
  const REDL = '#ff5252';
  const WHITE = '#ffffff';
  const BLACK = '#111111';

  // Face circle (red)
  row(0, 3, 8, RED);
  row(1, 2, 9, RED);
  for (let y = 2; y <= 9; y++) row(y, 1, 10, RED);
  row(10, 2, 9, RED);
  row(11, 3, 8, RED);

  // Highlight
  px(3, 1, REDL); px(4, 1, REDL);

  // Angry eyebrows (angled down inward)
  px(2, 3, BLACK); px(3, 4, BLACK); px(4, 4, BLACK);
  px(9, 3, BLACK); px(8, 4, BLACK); px(7, 4, BLACK);

  // Angry eyes (squinting)
  px(3, 5, WHITE); px(4, 5, BLACK);
  px(7, 5, WHITE); px(8, 5, BLACK);

  // Frown
  px(4, 8, BLACK); px(5, 9, BLACK); px(6, 9, BLACK); px(7, 8, BLACK);
}, 'icon_angry.png');

// ============================================================
// BEER MUG ICON (10x12) — wants another drink
// ============================================================
createSprite(10, 12, ({ px, row, rect, col }) => {
  const GL = '#c8d8e8';
  const GLH = '#e0eaf4';
  const BEER = '#f0c040';
  const BEERT = '#c8a020';
  const FOAM = '#fffde0';

  // Glass body
  col(1, 1, 10, GL);
  col(7, 1, 10, GL);
  row(11, 1, 7, GL);
  row(0, 2, 6, GLH);  // rim

  // Beer fill
  for (let y = 4; y <= 10; y++) row(y, 2, 6, BEER);
  // Darker bottom
  for (let y = 8; y <= 10; y++) row(y, 2, 6, BEERT);

  // Foam head
  row(2, 2, 6, FOAM);
  row(3, 2, 6, FOAM);
  px(3, 2, '#fff8c0');

  // Handle
  col(8, 3, 8, GL);
  row(3, 8, 9, GL);
  row(8, 8, 9, GL);
  col(9, 4, 7, GL);

  // Highlight
  col(2, 2, 9, GLH);
}, 'icon_beer.png');

// ============================================================
// RECEIPT/CHECK ICON (8x12) — reviewing check
// ============================================================
createSprite(8, 12, ({ px, row, rect, col }) => {
  const PAPER = '#fff8dc';
  const PAPERD = '#e8e0c0';
  const TEXT = '#555555';
  const RED = '#e53935';

  // Paper
  rect(1, 0, 6, 11, PAPER);
  // Edges
  col(0, 0, 10, PAPERD);
  col(7, 0, 10, PAPERD);
  row(0, 1, 6, PAPERD);

  // Text lines
  row(2, 2, 5, TEXT);
  row(4, 2, 4, TEXT);
  row(6, 2, 5, TEXT);

  // Total line (red)
  row(8, 2, 5, RED);
  row(9, 2, 3, TEXT);

  // Jagged bottom edge (receipt tear)
  px(1, 11, PAPER); px(3, 11, PAPER); px(5, 11, PAPER);
}, 'icon_receipt.png');

// ============================================================
// THOUGHT BUBBLE (14x12) — seated/thinking
// ============================================================
createSprite(14, 12, ({ px, row, rect, col }) => {
  const BUB = '#ffffff';
  const BUBD = '#cccccc';
  const DOT = '#aaaaaa';

  // Main bubble
  row(0, 4, 10, BUB);
  row(1, 3, 11, BUB);
  for (let y = 2; y <= 6; y++) row(y, 2, 12, BUB);
  row(7, 3, 11, BUB);
  row(8, 4, 10, BUB);

  // Shadow/outline
  row(0, 4, 10, BUBD);
  row(8, 4, 10, BUBD);
  col(2, 2, 6, BUBD);
  col(12, 2, 6, BUBD);

  // "..." dots inside
  px(5, 4, DOT); px(7, 4, DOT); px(9, 4, DOT);

  // Trailing dots (speech bubble tail)
  px(4, 9, BUB); px(5, 9, BUB);
  px(3, 10, BUB);
  px(2, 11, DOT);
}, 'icon_thought.png');

// ============================================================
// DIRTY GLASS ICON (8x12) — for bartender carry
// ============================================================
createSprite(8, 12, ({ px, row, col }) => {
  const GL = '#a0b0b8';
  const GLD = '#808890';
  const GRIME = '#8b7a50';

  // Glass outline
  col(1, 1, 10, GL);
  col(6, 1, 10, GL);
  row(11, 1, 6, GL);
  row(0, 2, 5, GL);

  // Dirty residue
  for (let y = 5; y <= 9; y++) row(y, 2, 5, GRIME);
  px(3, 4, GRIME); px(4, 3, GRIME);

  // Stink lines
  px(0, 0, GLD); px(7, 2, GLD);
}, 'icon_dirty_glass.png');

// ============================================================
// HEART ICON (12x11) — mood increased
// ============================================================
createSprite(12, 11, ({ px, row }) => {
  const RED = '#e53935';
  const REDL = '#ff5252';
  const REDK = '#c62828';

  // Heart shape
  row(0, 1, 3, RED);   row(0, 7, 9, RED);
  row(1, 0, 4, RED);   row(1, 6, 10, RED);
  row(2, 0, 10, RED);
  row(3, 0, 10, RED);
  row(4, 1, 9, RED);
  row(5, 2, 8, RED);
  row(6, 3, 7, RED);
  row(7, 3, 7, RED);
  row(8, 4, 6, RED);
  row(9, 5, 5, RED);

  // Highlight on left lobe
  px(1, 1, REDL); px(2, 1, REDL);
  px(1, 2, REDL);

  // Shadow on right lobe
  px(9, 2, REDK); px(10, 2, REDK);
  px(9, 3, REDK);
}, 'icon_heart.png');

console.log('\nDone! Indicator sprites generated.');
