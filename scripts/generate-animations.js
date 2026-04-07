/**
 * Generate animation spritesheets for bartender walk, customer walk,
 * and customer drinking. Each sheet is a horizontal strip of frames
 * at 3x pixel scale, ready for Phaser's spritesheet loader.
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const PIXEL = 3;
const OUT = path.join(__dirname, '..', 'assets', 'sprites');

function createSheet(frameW, frameH, numFrames, drawFrame, filename) {
  const canvas = createCanvas(frameW * PIXEL * numFrames, frameH * PIXEL);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let f = 0; f < numFrames; f++) {
    const offX = f * frameW;
    const px = (x, y, color) => {
      ctx.fillStyle = color;
      ctx.fillRect((offX + x) * PIXEL, y * PIXEL, PIXEL, PIXEL);
    };
    const row = (y, x0, x1, color) => {
      for (let x = x0; x <= x1; x++) px(x, y, color);
    };
    const rect = (x0, y0, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect((offX + x0) * PIXEL, y0 * PIXEL, w * PIXEL, h * PIXEL);
    };
    const col = (x, y0, y1, color) => {
      for (let y = y0; y <= y1; y++) px(x, y, color);
    };
    drawFrame({ px, row, rect, col }, f);
  }

  const outPath = path.join(OUT, filename);
  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buf);
  console.log(`  ${filename} (${frameW}x${frameH} x${numFrames} frames @${PIXEL}x → ${canvas.width}x${canvas.height})`);
}

// ============================================================
// SHARED PALETTES
// ============================================================
const BARTENDER = {
  SK: '#e8b87a', SKS: '#d4a06a', SKH: '#f0c88a',
  HAIR: '#2a1a0e', HRH: '#4a3020', EYE: '#181818',
  WHTE: '#ffffff', SHRT: '#eeeade', SRTS: '#d8d0c0',
  VST: '#1e1e1e', VSTH: '#333333',
  PNT: '#14142a', PNTH: '#24243a',
  SHOE: '#0e0e0e', SHOH: '#222222', BKLE: '#c8a840',
};

const GUEST = {
  SK: '#d4a574', SKS: '#b8895e', HAIR: '#3a2518',
  HRH: '#5c3a28', EYE: '#181818',
  SHRT: '#4a6fa5', SRTS: '#3a5f95', PNT: '#2a2a3a',
};

// ============================================================
// BARTENDER WALK (32x48, 4 frames)
// Frame 0: stand, Frame 1: left step, Frame 2: stand, Frame 3: right step
// ============================================================
function drawBartenderUpper({ px, row, col }, P) {
  // Hair
  row(0, 12, 19, P.HAIR); row(1, 11, 20, P.HAIR);
  px(13, 1, P.HRH); px(14, 1, P.HRH); px(15, 1, P.HRH);
  row(2, 10, 21, P.HAIR); px(12, 2, P.HRH); px(13, 2, P.HRH);
  row(3, 10, 21, P.HAIR);

  // Face
  for (let y = 4; y <= 11; y++) row(y, 11, 20, P.SK);
  for (let y = 4; y <= 6; y++) { px(10, y, P.HAIR); px(21, y, P.HAIR); }
  px(10, 7, P.HAIR); px(21, 7, P.HAIR);
  row(4, 13, 18, P.SKH);
  px(10, 7, P.SKS); px(10, 8, P.SKS); px(21, 7, P.SKS); px(21, 8, P.SKS);
  px(13, 7, P.WHTE); px(14, 7, P.EYE); px(18, 7, P.EYE); px(19, 7, P.WHTE);
  row(6, 13, 15, P.HAIR); row(6, 17, 19, P.HAIR);
  px(16, 8, P.SKS); px(16, 9, P.SKS);
  px(14, 10, P.SKS); px(15, 10, '#c47050'); px(16, 10, '#c47050'); px(17, 10, '#c47050'); px(18, 10, P.SKS);
  row(11, 12, 19, P.SKS);

  // Neck
  for (let y = 12; y <= 13; y++) row(y, 14, 17, P.SK);

  // Shirt + vest (torso)
  for (let y = 14; y <= 34; y++) row(y, 9, 22, P.SHRT);
  for (let y = 14; y <= 34; y++) { row(y, 9, 12, P.VST); row(y, 19, 22, P.VST); }
  for (let y = 15; y <= 33; y++) { px(12, y, P.VSTH); px(19, y, P.VSTH); }
  px(14, 14, P.VST); px(15, 14, P.SHRT); px(16, 14, P.SHRT); px(17, 14, P.VST);
  px(14, 15, P.SRTS); px(17, 15, P.SRTS);
  for (let y = 16; y <= 33; y += 2) px(16, y, P.SRTS);
  row(14, 9, 10, P.VSTH); row(14, 21, 22, P.VSTH);
  row(34, 13, 18, P.SRTS);
}

createSheet(32, 48, 4, (ctx, frame) => {
  const P = BARTENDER;
  drawBartenderUpper(ctx, P);
  const { px, row } = ctx;

  // Arms — swing slightly per frame
  const armSwing = [0, -1, 0, 1][frame];
  // Left arm
  for (let y = 15; y <= 19; y++) { px(7, y + armSwing, P.VST); px(8, y + armSwing, P.VST); }
  px(8, 15 + armSwing, P.VSTH);
  for (let y = 20; y <= 25; y++) { px(7, y + armSwing, P.SK); px(8, y + armSwing, P.SK); }
  px(7, 26 + armSwing, P.SK); px(8, 26 + armSwing, P.SKS);
  // Right arm
  for (let y = 15; y <= 19; y++) { px(23, y - armSwing, P.VST); px(24, y - armSwing, P.VST); }
  px(23, 15 - armSwing, P.VSTH);
  for (let y = 20; y <= 25; y++) { px(23, y - armSwing, P.SK); px(24, y - armSwing, P.SK); }
  px(23, 26 - armSwing, P.SKS); px(24, 26 - armSwing, P.SK);

  // Belt
  row(35, 10, 21, '#222');
  px(15, 35, P.BKLE); px(16, 35, P.BKLE);

  // Legs — alternate per frame
  const legOff = [0, 2, 0, -2][frame]; // left leg offset
  // Left leg
  for (let y = 36; y <= 42; y++) row(y + legOff, 10, 15, P.PNT);
  for (let y = 37; y <= 41; y++) px(12, y + legOff, P.PNTH);
  // Right leg
  for (let y = 36; y <= 42; y++) row(y - legOff, 16, 21, P.PNT);
  for (let y = 37; y <= 41; y++) px(19, y - legOff, P.PNTH);
  // Inner shadow
  for (let y = 37; y <= 42; y++) { px(15, y + legOff, '#0a0a1a'); px(16, y - legOff, '#0a0a1a'); }

  // Shoes
  const shoeL = legOff;
  const shoeR = -legOff;
  row(43 + shoeL, 9, 15, P.SHOE); row(44 + shoeL, 8, 15, P.SHOE); row(45 + shoeL, 8, 15, '#080808');
  px(9, 43 + shoeL, P.SHOH); px(10, 43 + shoeL, P.SHOH);
  row(43 + shoeR, 16, 22, P.SHOE); row(44 + shoeR, 16, 23, P.SHOE); row(45 + shoeR, 16, 23, '#080808');
  px(21, 43 + shoeR, P.SHOH); px(22, 43 + shoeR, P.SHOH);
}, 'bartender_walk.png');

// ============================================================
// GUEST WALK (24x32, 4 frames)
// Frame 0: stand, Frame 1: left step, Frame 2: stand, Frame 3: right step
// ============================================================
function drawGuestUpper(ctx, P) {
  const { px, row } = ctx;
  // Hair
  row(0, 8, 15, P.HAIR); row(1, 7, 16, P.HAIR);
  px(10, 1, P.HRH); px(11, 1, P.HRH);
  row(2, 7, 16, P.HAIR); px(9, 2, P.HRH);
  // Face
  for (let y = 3; y <= 9; y++) row(y, 8, 15, P.SK);
  for (let y = 3; y <= 5; y++) { px(7, y, P.HAIR); px(16, y, P.HAIR); }
  px(7, 6, P.SKS); px(16, 6, P.SKS);
  px(10, 6, P.EYE); px(13, 6, P.EYE);
  row(5, 10, 11, P.HAIR); row(5, 13, 14, P.HAIR);
  px(12, 7, P.SKS);
  px(11, 8, P.SKS); px(12, 8, '#c47050'); px(13, 8, P.SKS);
  row(9, 9, 14, P.SKS);
  // Neck
  row(10, 10, 13, P.SK); row(11, 10, 13, P.SK);
  // Torso
  for (let y = 12; y <= 22; y++) row(y, 6, 17, P.SHRT);
  for (let y = 13; y <= 21; y++) { px(7, y, P.SRTS); px(16, y, P.SRTS); }
  px(10, 12, P.SK); px(11, 12, P.SK); px(12, 12, P.SK); px(13, 12, P.SK);
}

createSheet(24, 32, 4, (ctx, frame) => {
  const P = GUEST;
  drawGuestUpper(ctx, P);
  const { px, row } = ctx;

  // Arms — slight swing
  const armSwing = [0, -1, 0, 1][frame];
  for (let y = 13; y <= 18; y++) { px(5, y + armSwing, P.SHRT); px(18, y - armSwing, P.SHRT); }
  for (let y = 19; y <= 21; y++) { px(5, y + armSwing, P.SK); px(18, y - armSwing, P.SK); }

  // Pants + legs — alternate
  const legOff = [0, 1, 0, -1][frame];
  // Left leg
  for (let y = 23; y <= 26; y++) row(y + legOff, 6, 11, P.PNT);
  for (let y = 27; y <= 31; y++) row(y + legOff, 6, 10, P.PNT);
  // Right leg
  for (let y = 23; y <= 26; y++) row(y - legOff, 12, 17, P.PNT);
  for (let y = 27; y <= 31; y++) row(y - legOff, 13, 17, P.PNT);
}, 'guest_walk.png');

// ============================================================
// GUEST DRINK (24x20, 4 frames) — sitting, lifts glass
// Frame 0: resting, Frame 1: arm rising, Frame 2: glass at mouth, Frame 3: arm lowering
// ============================================================
function drawGuestSittingBase(ctx, P) {
  const { px, row } = ctx;
  // Hair
  row(0, 8, 15, P.HAIR); row(1, 7, 16, P.HAIR);
  px(10, 1, P.HRH); px(11, 1, P.HRH);
  row(2, 7, 16, P.HAIR); px(9, 2, P.HRH);
  // Face
  for (let y = 3; y <= 9; y++) row(y, 8, 15, P.SK);
  for (let y = 3; y <= 5; y++) { px(7, y, P.HAIR); px(16, y, P.HAIR); }
  px(7, 6, P.SKS); px(16, 6, P.SKS);
  px(10, 6, P.EYE); px(13, 6, P.EYE);
  row(5, 10, 11, P.HAIR); row(5, 13, 14, P.HAIR);
  px(12, 7, P.SKS);
  px(11, 8, P.SKS); px(12, 8, '#c47050'); px(13, 8, P.SKS);
  row(9, 9, 14, P.SKS);
  // Neck
  row(10, 10, 13, P.SK); row(11, 10, 13, P.SK);
  // Torso
  for (let y = 12; y <= 17; y++) row(y, 6, 17, P.SHRT);
  for (let y = 13; y <= 17; y++) { px(7, y, P.SRTS); px(16, y, P.SRTS); }
  px(10, 12, P.SK); px(11, 12, P.SK); px(12, 12, P.SK); px(13, 12, P.SK);
  // Left arm (always resting on bar)
  for (let y = 13; y <= 15; y++) px(5, y, P.SHRT);
  for (let y = 16; y <= 17; y++) px(4, y, P.SHRT);
  px(3, 18, P.SK); px(4, 18, P.SK);
  px(3, 19, P.SK); px(4, 19, P.SK);
}

const GL_COLOR = 'rgba(200,220,240,0.6)';
const BEER = '#d4a030';

createSheet(24, 20, 4, (ctx, frame) => {
  const P = GUEST;
  drawGuestSittingBase(ctx, P);
  const { px, row } = ctx;

  // Right arm position varies by frame
  // Frame 0: resting on bar (hands at 18-19)
  // Frame 1: arm lifting (hand at 14)
  // Frame 2: glass at mouth (hand at 9)
  // Frame 3: arm lowering (hand at 14)

  if (frame === 0) {
    // Right arm resting
    for (let y = 13; y <= 15; y++) px(18, y, P.SHRT);
    for (let y = 16; y <= 17; y++) px(19, y, P.SHRT);
    px(19, 18, P.SK); px(20, 18, P.SK);
    px(19, 19, P.SK); px(20, 19, P.SK);
  } else if (frame === 1 || frame === 3) {
    // Right arm mid-lift — forearm angled up, hand at ~14
    for (let y = 13; y <= 14; y++) px(18, y, P.SHRT);
    px(19, 13, P.SHRT);
    px(19, 12, P.SK); px(20, 12, P.SK); // hand
    // Small glass in hand
    px(20, 9, GL_COLOR); px(21, 9, GL_COLOR);
    px(20, 10, BEER); px(21, 10, BEER);
    px(20, 11, BEER); px(21, 11, BEER);
    px(20, 12, GL_COLOR); px(21, 12, GL_COLOR);
  } else { // frame === 2
    // Right arm fully raised — glass at mouth level
    px(18, 13, P.SHRT);
    px(18, 12, P.SHRT);
    px(18, 11, P.SK); px(19, 10, P.SK); // hand near mouth
    // Glass at mouth
    px(17, 7, GL_COLOR); px(18, 7, GL_COLOR);
    px(17, 8, BEER); px(18, 8, BEER);
    px(17, 9, BEER); px(18, 9, BEER);
    px(17, 10, GL_COLOR); px(18, 10, GL_COLOR);
  }
}, 'guest_drink.png');

// ============================================================
// BARTENDER BACK VIEW (32x48, single frame) — facing bar/away from player
// Shows back of head, vest back, arms at sides
// ============================================================
function createSingleSprite(w, h, drawFn, filename) {
  const canvas = createCanvas(w * PIXEL, h * PIXEL);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const px = (x, y, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x * PIXEL, y * PIXEL, PIXEL, PIXEL);
  };
  const row = (y, x0, x1, color) => {
    for (let x = x0; x <= x1; x++) px(x, y, color);
  };
  const rect = (x0, y0, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x0 * PIXEL, y0 * PIXEL, w * PIXEL, h * PIXEL);
  };
  const col = (x, y0, y1, color) => {
    for (let y = y0; y <= y1; y++) px(x, y, color);
  };
  drawFn({ px, row, rect, col });

  const outPath = path.join(OUT, filename);
  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buf);
  console.log(`  ${filename} (${w}x${h} @${PIXEL}x → ${canvas.width}x${canvas.height})`);
}

createSingleSprite(32, 48, ({ px, row, rect, col }) => {
  const P = BARTENDER;

  // Hair (back of head — fuller coverage, no face visible)
  row(0, 12, 19, P.HAIR); row(1, 11, 20, P.HAIR);
  row(2, 10, 21, P.HAIR); row(3, 10, 21, P.HAIR);
  // Back of head — all hair, no face
  for (let y = 4; y <= 8; y++) row(y, 10, 21, P.HAIR);
  // Hair highlight
  px(14, 2, P.HRH); px(15, 2, P.HRH); px(16, 3, P.HRH);
  px(13, 5, P.HRH); px(18, 5, P.HRH);

  // Ears (skin peeking out at sides)
  px(10, 7, P.SKS); px(10, 8, P.SKS);
  px(21, 7, P.SKS); px(21, 8, P.SKS);

  // Lower back of head / neck transition
  for (let y = 9; y <= 11; y++) row(y, 11, 20, P.HAIR);
  // Neck
  for (let y = 12; y <= 13; y++) row(y, 14, 17, P.SK);

  // Vest back (solid dark, no shirt visible from behind except collar)
  for (let y = 14; y <= 34; y++) row(y, 9, 22, P.VST);
  // Collar — tiny sliver of shirt at neckline
  row(14, 13, 18, P.SHRT);
  // Vest seam down center back
  for (let y = 16; y <= 33; y++) px(16, y, P.VSTH);
  // Shoulder seams
  row(14, 9, 10, P.VSTH); row(14, 21, 22, P.VSTH);
  // Vest bottom edge
  row(34, 9, 22, P.VSTH);

  // Arms (vest sleeves then skin)
  for (let y = 15; y <= 19; y++) { px(7, y, P.VST); px(8, y, P.VST); }
  for (let y = 15; y <= 19; y++) { px(23, y, P.VST); px(24, y, P.VST); }
  for (let y = 20; y <= 25; y++) { px(7, y, P.SK); px(8, y, P.SK); }
  for (let y = 20; y <= 25; y++) { px(23, y, P.SK); px(24, y, P.SK); }
  // Hands
  px(7, 26, P.SK); px(8, 26, P.SKS);
  px(23, 26, P.SKS); px(24, 26, P.SK);

  // Belt
  row(35, 10, 21, '#222');
  px(15, 35, P.BKLE); px(16, 35, P.BKLE);

  // Pants
  for (let y = 36; y <= 42; y++) row(y, 10, 15, P.PNT);
  for (let y = 36; y <= 42; y++) row(y, 16, 21, P.PNT);
  for (let y = 37; y <= 41; y++) { px(12, y, P.PNTH); px(19, y, P.PNTH); }
  for (let y = 37; y <= 42; y++) { px(15, y, '#0a0a1a'); px(16, y, '#0a0a1a'); }

  // Shoes
  row(43, 9, 15, P.SHOE); row(44, 8, 15, P.SHOE); row(45, 8, 15, '#080808');
  row(43, 16, 22, P.SHOE); row(44, 16, 23, P.SHOE); row(45, 16, 23, '#080808');
  px(9, 43, P.SHOH); px(10, 43, P.SHOH);
  px(21, 43, P.SHOH); px(22, 43, P.SHOH);
}, 'bartender_back.png');

console.log('Animation spritesheets generated.');
