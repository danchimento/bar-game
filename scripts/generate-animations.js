/**
 * Generate animation spritesheets for bartender walk, customer walk,
 * and customer drinking. Each sheet is a horizontal strip of frames
 * at 3x pixel scale, ready for Phaser's spritesheet loader.
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const { GUEST_APPEARANCES, GUEST_BASE } = require('./guest-appearances');

const PIXEL = 6;  // 2× bigger humans (all sprites in this file are human)
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

// Guest palette built per-appearance from shared data
function guestPalette(appearance) {
  return { ...GUEST_BASE, SHRT: appearance.shirt, SRTS: appearance.shadow };
}

// ============================================================
// BARTENDER WALK (32x48, 4 frames) — TRUE SIDE PROFILE
// Character faces RIGHT. Narrower body, one eye, nose, profile hair.
// Frame 0: stand, Frame 1: stride forward, Frame 2: stand, Frame 3: stride back
// ============================================================
function drawBartenderSideUpper({ px, row, col }, P) {
  // Hair — profile: back of head extends left, face on right
  row(0, 11, 18, P.HAIR);
  row(1, 10, 19, P.HAIR); px(12, 1, P.HRH);
  row(2, 10, 19, P.HAIR); px(11, 2, P.HRH);
  row(3, 10, 19, P.HAIR);
  // Back of hair hangs lower on left
  for (let y = 4; y <= 7; y++) { px(10, y, P.HAIR); px(11, y, P.HAIR); }

  // Face — profile (narrower, facing right)
  for (let y = 4; y <= 11; y++) row(y, 12, 19, P.SK);
  // Forehead highlight
  row(4, 14, 18, P.SKH);
  // Eye (one, facing right)
  px(18, 7, P.WHTE); px(19, 7, P.EYE);
  // Eyebrow
  row(6, 17, 19, P.HAIR);
  // Nose (protrudes right)
  px(20, 8, P.SK); px(20, 9, P.SKS);
  // Mouth
  px(18, 10, '#c47050'); px(19, 10, P.SKS);
  // Ear (left side)
  px(12, 7, P.SKS); px(12, 8, P.SKS);
  // Chin
  row(11, 14, 19, P.SKS);

  // Neck
  for (let y = 12; y <= 13; y++) row(y, 14, 18, P.SK);

  // Torso — narrower side view
  // Vest front + shirt side visible
  for (let y = 14; y <= 34; y++) row(y, 11, 20, P.VST);
  // Shirt visible at front edge
  for (let y = 14; y <= 34; y++) { px(19, y, P.SHRT); px(20, y, P.SHRT); }
  // Vest highlight (edge)
  for (let y = 15; y <= 33; y++) px(18, y, P.VSTH);
  // Shoulder
  row(14, 11, 12, P.VSTH);
  // Collar
  row(14, 16, 19, P.SHRT);
  // Shirt tuck
  row(34, 16, 19, P.SRTS);
}

createSheet(32, 48, 4, (ctx, frame) => {
  const P = BARTENDER;
  drawBartenderSideUpper(ctx, P);
  const { px, row } = ctx;

  // Arm — one visible, swings front/back
  const armSwing = [0, 2, 0, -2][frame];
  // Back arm (partially visible behind body)
  for (let y = 16; y <= 20; y++) px(10, y - armSwing, P.VST);
  for (let y = 21; y <= 25; y++) px(10, y - armSwing, P.SK);
  px(10, 26 - armSwing, P.SKS);
  // Front arm
  for (let y = 16; y <= 20; y++) px(21, y + armSwing, P.VST);
  for (let y = 21; y <= 25; y++) px(21, y + armSwing, P.SK);
  px(21, 26 + armSwing, P.SK);

  // Belt
  row(35, 11, 20, '#222');
  px(16, 35, P.BKLE);

  // Legs — side profile stride
  const legFwd = [0, 3, 0, -3][frame]; // front leg
  const legBck = [0, -2, 0, 2][frame]; // back leg
  // Back leg (partially hidden)
  for (let y = 36; y <= 42; y++) row(y + legBck, 12, 15, P.PNT);
  for (let y = 37; y <= 41; y++) px(13, y + legBck, P.PNTH);
  // Front leg
  for (let y = 36; y <= 42; y++) row(y + legFwd, 15, 19, P.PNT);
  for (let y = 37; y <= 41; y++) px(17, y + legFwd, P.PNTH);

  // Shoes — side profile
  const sF = legFwd;
  const sB = legBck;
  row(43 + sB, 11, 16, P.SHOE); row(44 + sB, 11, 16, '#080808');
  px(11, 43 + sB, P.SHOH);
  row(43 + sF, 14, 20, P.SHOE); row(44 + sF, 14, 20, '#080808');
  px(14, 43 + sF, P.SHOH);
}, 'bartender_walk.png');

// ============================================================
// GUEST WALK (24x32, 4 frames) — TRUE SIDE PROFILE
// Character faces RIGHT. Profile head, narrow body, legs stride.
// ============================================================
function drawGuestSideUpper(ctx, P) {
  const { px, row } = ctx;
  // Hair — profile
  row(0, 8, 14, P.HAIR);
  row(1, 7, 15, P.HAIR); px(9, 1, P.HRH);
  row(2, 7, 15, P.HAIR); px(8, 2, P.HRH);
  // Back hair extends down
  for (let y = 3; y <= 6; y++) { px(7, y, P.HAIR); px(8, y, P.HAIR); }

  // Face — profile facing right
  for (let y = 3; y <= 9; y++) row(y, 9, 15, P.SK);
  // Eye (one)
  px(14, 6, P.EYE);
  // Eyebrow
  row(5, 13, 15, P.HAIR);
  // Nose (protrudes right)
  px(16, 7, P.SKS);
  // Mouth
  px(14, 8, '#c47050'); px(15, 8, P.SKS);
  // Ear (left side)
  px(9, 6, P.SKS);
  // Chin
  row(9, 10, 15, P.SKS);

  // Neck
  row(10, 10, 14, P.SK); row(11, 10, 14, P.SK);

  // Torso — narrower side view
  for (let y = 12; y <= 22; y++) row(y, 8, 16, P.SHRT);
  for (let y = 13; y <= 21; y++) { px(9, y, P.SRTS); }
  // Collar
  px(11, 12, P.SK); px(12, 12, P.SK);
}

for (const app of GUEST_APPEARANCES) {
  const P = guestPalette(app);
  const names = [`guest_walk_${app.id}.png`];
  if (app === GUEST_APPEARANCES[0]) names.push('guest_walk.png');
  for (const filename of names) {
    createSheet(24, 32, 4, (ctx, frame) => {
      drawGuestSideUpper(ctx, P);
      const { px, row } = ctx;

      const armSwing = [0, 1, 0, -1][frame];
      for (let y = 13; y <= 18; y++) px(7, y - armSwing, P.SHRT);
      for (let y = 19; y <= 21; y++) px(7, y - armSwing, P.SK);
      for (let y = 13; y <= 18; y++) px(17, y + armSwing, P.SHRT);
      for (let y = 19; y <= 21; y++) px(17, y + armSwing, P.SK);

      const legFwd = [0, 2, 0, -2][frame];
      const legBck = [0, -1, 0, 1][frame];
      for (let y = 23; y <= 26; y++) row(y + legBck, 8, 12, P.PNT);
      for (let y = 27; y <= 31; y++) row(y + legBck, 8, 11, P.PNT);
      for (let y = 23; y <= 26; y++) row(y + legFwd, 12, 16, P.PNT);
      for (let y = 27; y <= 31; y++) row(y + legFwd, 13, 16, P.PNT);
    }, filename);
  }
}

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
  const P = guestPalette(GUEST_APPEARANCES[0]);
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
