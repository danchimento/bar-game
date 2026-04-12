/**
 * Generates a bartender carrying sprite (32x48, 3x scaled to 96x144 PNG).
 * Same character as bartender.png but with one arm extended to the side
 * in a carrying/holding position.
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const PIXEL = 2;
const W = 32;
const H = 48;

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

// --- Palette (same as bartender.js) ---
const SK   = '#e8b87a';
const SKS  = '#d4a06a';
const SKH  = '#f0c88a';
const HAIR = '#2a1a0e';
const HRH  = '#4a3020';
const EYE  = '#181818';
const WHTE = '#ffffff';
const SHRT = '#eeeade';
const SRTS = '#d8d0c0';
const VST  = '#1e1e1e';
const VSTH = '#333333';
const PNT  = '#14142a';
const PNTH = '#24243a';
const SHOE = '#0e0e0e';
const SHOH = '#222222';
const BKLE = '#c8a840';

// ============ HAIR TOP (rows 0-3) — identical ============
row(0, 12, 19, HAIR);
row(1, 11, 20, HAIR);
px(13, 1, HRH); px(14, 1, HRH); px(15, 1, HRH);
row(2, 10, 21, HAIR);
px(12, 2, HRH); px(13, 2, HRH);
row(3, 10, 21, HAIR);

// ============ HEAD (rows 4-11) — identical ============
for (let y = 4; y <= 11; y++) row(y, 11, 20, SK);
for (let y = 4; y <= 6; y++) { px(10, y, HAIR); px(21, y, HAIR); }
px(10, 7, HAIR); px(21, 7, HAIR);
row(4, 13, 18, SKH);
px(10, 7, SKS); px(10, 8, SKS);
px(21, 7, SKS); px(21, 8, SKS);
px(13, 7, WHTE); px(14, 7, EYE);
px(18, 7, EYE); px(19, 7, WHTE);
row(6, 13, 15, HAIR);
row(6, 17, 19, HAIR);
px(16, 8, SKS); px(16, 9, SKS);
px(14, 10, SKS); px(15, 10, '#c47050'); px(16, 10, '#c47050'); px(17, 10, '#c47050'); px(18, 10, SKS);
row(11, 12, 19, SKS);

// ============ NECK (rows 12-13) ============
for (let y = 12; y <= 13; y++) row(y, 14, 17, SK);

// ============ SHOULDERS + SHIRT + VEST (rows 14-22) ============
for (let y = 14; y <= 22; y++) row(y, 9, 22, SHRT);
for (let y = 14; y <= 22; y++) {
  row(y, 9, 12, VST);
  row(y, 19, 22, VST);
}
for (let y = 15; y <= 21; y++) {
  px(12, y, VSTH);
  px(19, y, VSTH);
}
px(14, 14, VST); px(15, 14, SHRT); px(16, 14, SHRT); px(17, 14, VST);
px(14, 15, SRTS); px(17, 15, SRTS);
for (let y = 16; y <= 21; y += 2) px(16, y, SRTS);
row(14, 9, 10, VSTH);
row(14, 21, 22, VSTH);

// ============ LEFT ARM — normal, at side (rows 15-26) ============
for (let y = 15; y <= 19; y++) { px(7, y, VST); px(8, y, VST); }
px(8, 15, VSTH); px(8, 16, VSTH);
for (let y = 20; y <= 25; y++) { px(7, y, SK); px(8, y, SK); }
px(7, 20, SKS);
px(7, 26, SK); px(8, 26, SKS);

// ============ RIGHT ARM — extended outward for carrying (rows 15-22) ============
// Arm extends further right from shoulder
for (let y = 15; y <= 17; y++) { px(23, y, VST); px(24, y, VST); }
px(23, 15, VSTH);
// Forearm extends out horizontally at mid-height
for (let x = 23; x <= 27; x++) { px(x, 18, VST); }
px(23, 18, VSTH);
// Bare forearm/wrist
for (let x = 25; x <= 28; x++) { px(x, 19, SK); }
px(25, 19, SKS);
// Hand (slightly cupped for holding)
px(27, 18, SK); px(28, 18, SK); px(29, 18, SK);
px(28, 19, SK); px(29, 19, SKS);

// ============ EXTENDED SHIRT + VEST (rows 23-34) ============
for (let y = 23; y <= 34; y++) row(y, 9, 22, SHRT);
for (let y = 23; y <= 34; y++) {
  row(y, 9, 12, VST);
  row(y, 19, 22, VST);
}
for (let y = 23; y <= 33; y++) {
  px(12, y, VSTH);
  px(19, y, VSTH);
}
for (let y = 22; y <= 33; y += 2) px(16, y, SRTS);
row(34, 13, 18, SRTS);

// ============ PANTS (rows 35-42) ============
for (let y = 35; y <= 42; y++) row(y, 10, 15, PNT);
for (let y = 35; y <= 42; y++) row(y, 16, 21, PNT);
for (let y = 36; y <= 41; y++) { px(12, y, PNTH); px(19, y, PNTH); }
for (let y = 37; y <= 42; y++) { px(15, y, '#0a0a1a'); px(16, y, '#0a0a1a'); }
row(35, 10, 21, '#222');
px(15, 35, BKLE); px(16, 35, BKLE);

// ============ SHOES (rows 43-45) ============
row(43, 9, 15, SHOE);
row(44, 8, 15, SHOE);
row(45, 8, 15, '#080808');
px(9, 43, SHOH); px(10, 43, SHOH);
px(8, 44, SHOH); px(9, 44, SHOH);

row(43, 16, 22, SHOE);
row(44, 16, 23, SHOE);
row(45, 16, 23, '#080808');
px(21, 43, SHOH); px(22, 43, SHOH);
px(22, 44, SHOH); px(23, 44, SHOH);

// ============ Write output ============
const outPath = path.join(__dirname, '..', 'assets', 'sprites', 'bartender_carry.png');
const buf = canvas.toBuffer('image/png');
fs.writeFileSync(outPath, buf);
console.log(`Wrote ${buf.length} bytes to ${outPath}`);
console.log(`Dimensions: ${canvas.width}x${canvas.height} (${W}x${H} art pixels at ${PIXEL}x scale)`);
