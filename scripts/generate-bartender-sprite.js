/**
 * Generates a placeholder pixel-art bartender sprite (32x48, 3x scaled to 96x144 PNG).
 * Full head-to-toe character: dark hair, white dress shirt, black vest, dark pants, shoes.
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const PIXEL = 2;       // scale factor
const W = 32;           // sprite width in art pixels
const H = 48;           // sprite height in art pixels

const canvas = createCanvas(W * PIXEL, H * PIXEL);
const ctx = canvas.getContext('2d');
ctx.clearRect(0, 0, canvas.width, canvas.height);

function px(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * PIXEL, y * PIXEL, PIXEL, PIXEL);
}

function row(y, x0, x1, color) {
  for (let x = x0; x <= x1; x++) px(x, y, color);
}

// --- Palette ---
const SK   = '#e8b87a';  // skin
const SKS  = '#d4a06a';  // skin shadow
const SKH  = '#f0c88a';  // skin highlight
const HAIR = '#2a1a0e';  // dark brown hair
const HRH  = '#4a3020';  // hair highlight
const EYE  = '#181818';
const WHTE = '#ffffff';
const SHRT = '#eeeade';  // shirt
const SRTS = '#d8d0c0';  // shirt shadow
const VST  = '#1e1e1e';  // vest
const VSTH = '#333333';  // vest highlight
const PNT  = '#14142a';  // pants
const PNTH = '#24243a';  // pants highlight
const SHOE = '#0e0e0e';  // shoes
const SHOH = '#222222';  // shoe highlight
const BKLE = '#c8a840';  // belt buckle

// ============ HAIR TOP (rows 0-3) ============
row(0, 12, 19, HAIR);
row(1, 11, 20, HAIR);
px(13, 1, HRH); px(14, 1, HRH); px(15, 1, HRH);
row(2, 10, 21, HAIR);
px(12, 2, HRH); px(13, 2, HRH);
row(3, 10, 21, HAIR);

// ============ HEAD (rows 4-11) ============
// Face fill
for (let y = 4; y <= 11; y++) row(y, 11, 20, SK);

// Hair sides
for (let y = 4; y <= 6; y++) { px(10, y, HAIR); px(21, y, HAIR); }
// Sideburns
px(10, 7, HAIR); px(21, 7, HAIR);

// Forehead highlight
row(4, 13, 18, SKH);

// Ears
px(10, 7, SKS); px(10, 8, SKS);
px(21, 7, SKS); px(21, 8, SKS);

// Eyes (row 7)
px(13, 7, WHTE); px(14, 7, EYE);
px(18, 7, EYE); px(19, 7, WHTE);

// Eyebrows (row 6)
row(6, 13, 15, HAIR);
row(6, 17, 19, HAIR);

// Nose
px(16, 8, SKS); px(16, 9, SKS);

// Mouth (row 10) - slight smile
px(14, 10, SKS); px(15, 10, '#c47050'); px(16, 10, '#c47050'); px(17, 10, '#c47050'); px(18, 10, SKS);

// Chin
row(11, 12, 19, SKS);

// ============ NECK (rows 12-13) ============
for (let y = 12; y <= 13; y++) row(y, 14, 17, SK);

// ============ SHOULDERS + SHIRT + VEST (rows 14-22) ============
// Base shirt
for (let y = 14; y <= 22; y++) row(y, 9, 22, SHRT);

// Vest panels
for (let y = 14; y <= 22; y++) {
  row(y, 9, 12, VST);
  row(y, 19, 22, VST);
}
// Vest inner highlight
for (let y = 15; y <= 21; y++) {
  px(12, y, VSTH);
  px(19, y, VSTH);
}

// Collar V
px(14, 14, VST); px(15, 14, SHRT); px(16, 14, SHRT); px(17, 14, VST);
px(14, 15, SRTS); px(17, 15, SRTS);

// Shirt buttons down center
for (let y = 16; y <= 21; y += 2) px(16, y, SRTS);

// Shoulder seams
row(14, 9, 10, VSTH);
row(14, 21, 22, VSTH);

// ============ ARMS (rows 15-26) ============
// Left arm (vest sleeve then skin)
for (let y = 15; y <= 19; y++) { px(7, y, VST); px(8, y, VST); }
px(8, 15, VSTH); px(8, 16, VSTH); // sleeve highlight
for (let y = 20; y <= 25; y++) { px(7, y, SK); px(8, y, SK); }
px(7, 20, SKS); // shadow at sleeve cuff
px(7, 26, SK); px(8, 26, SKS); // hand

// Right arm
for (let y = 15; y <= 19; y++) { px(23, y, VST); px(24, y, VST); }
px(23, 15, VSTH); px(23, 16, VSTH);
for (let y = 20; y <= 25; y++) { px(23, y, SK); px(24, y, SK); }
px(24, 20, SKS);
px(23, 26, SKS); px(24, 26, SK);

// ============ EXTENDED SHIRT + VEST (rows 23-34) ============
// Shirt and vest continue below the shoulder area down to the belt
for (let y = 23; y <= 34; y++) row(y, 9, 22, SHRT);
for (let y = 23; y <= 34; y++) {
  row(y, 9, 12, VST);
  row(y, 19, 22, VST);
}
for (let y = 23; y <= 33; y++) {
  px(12, y, VSTH);
  px(19, y, VSTH);
}
// Continue shirt buttons
for (let y = 22; y <= 33; y += 2) px(16, y, SRTS);
// Shirt tuck / slight shadow near waist
row(34, 13, 18, SRTS);

// ============ PANTS (rows 35-42) ============
// Left leg
for (let y = 35; y <= 42; y++) row(y, 10, 15, PNT);
// Right leg
for (let y = 35; y <= 42; y++) row(y, 16, 21, PNT);
// Crease highlights
for (let y = 36; y <= 41; y++) { px(12, y, PNTH); px(19, y, PNTH); }
// Inner leg shadow
for (let y = 37; y <= 42; y++) { px(15, y, '#0a0a1a'); px(16, y, '#0a0a1a'); }

// Belt line
row(35, 10, 21, '#222');
// Belt buckle
px(15, 35, BKLE); px(16, 35, BKLE);

// ============ SHOES (rows 43-45) ============
// Left shoe
row(43, 9, 15, SHOE);
row(44, 8, 15, SHOE);
row(45, 8, 15, '#080808');
px(9, 43, SHOH); px(10, 43, SHOH);
px(8, 44, SHOH); px(9, 44, SHOH);

// Right shoe
row(43, 16, 22, SHOE);
row(44, 16, 23, SHOE);
row(45, 16, 23, '#080808');
px(21, 43, SHOH); px(22, 43, SHOH);
px(22, 44, SHOH); px(23, 44, SHOH);

// ============ Write output ============
const outPath = path.join(__dirname, '..', 'assets', 'sprites', 'bartender.png');
const buf = canvas.toBuffer('image/png');
fs.writeFileSync(outPath, buf);
console.log(`Wrote ${buf.length} bytes to ${outPath}`);
console.log(`Dimensions: ${canvas.width}x${canvas.height} (${W}x${H} art pixels at ${PIXEL}x scale)`);
