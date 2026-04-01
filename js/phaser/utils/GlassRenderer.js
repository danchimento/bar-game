/**
 * Shared utility for drawing a glass with fill level using Phaser Graphics.
 * Used by BartenderLayer (carry), BarItemsLayer (drinks at seats), and DrinkModal (pour preview).
 */

const GLASS_SHAPES = {
  PINT: { width: 18, height: 28, taperTop: 2 },
  WINE_GLASS: { width: 14, height: 30, stemHeight: 10, bowlHeight: 16, baseWidth: 16 },
  PLASTIC_CUP: { width: 16, height: 22, taperTop: 1 },
};

/**
 * Draw a glass with liquid fill onto a Phaser Graphics object.
 * @param {Phaser.GameObjects.Graphics} gfx - Graphics to draw on
 * @param {number} x - Center X
 * @param {number} y - Bottom Y of the glass
 * @param {string} glassType - 'PINT', 'WINE_GLASS', or 'PLASTIC_CUP'
 * @param {number} fillPct - 0.0 to 1.0 fill level
 * @param {number} fillColor - Hex color of the liquid (e.g. 0xf0c040)
 * @param {number} [scale=1] - Scale multiplier
 */
export function drawGlass(gfx, x, y, glassType, fillPct, fillColor, scale = 1) {
  const s = scale;
  fillPct = Math.max(0, Math.min(1, fillPct));

  if (glassType === 'WINE_GLASS') {
    _drawWineGlass(gfx, x, y, fillPct, fillColor, s);
  } else if (glassType === 'PLASTIC_CUP') {
    _drawCup(gfx, x, y, fillPct, fillColor, s);
  } else {
    _drawPint(gfx, x, y, fillPct, fillColor, s);
  }
}

function _drawPint(gfx, x, y, fill, color, s) {
  const w = 18 * s, h = 28 * s;
  const taper = 2 * s; // bottom is narrower than top
  const top = y - h;

  // Glass outline — wider at top, narrower at bottom
  gfx.lineStyle(1.5 * s, 0xc8d8e8, 1);
  gfx.beginPath();
  gfx.moveTo(x - w / 2, top);            // top left (wide)
  gfx.lineTo(x - w / 2 + taper, y);      // bottom left (narrow)
  gfx.lineTo(x + w / 2 - taper, y);      // bottom right (narrow)
  gfx.lineTo(x + w / 2, top);            // top right (wide)
  gfx.closePath();
  gfx.strokePath();

  // Inner glass tint
  gfx.fillStyle(0xc8d8e8, 0.1);
  gfx.fillPath();

  // Liquid fill
  if (fill > 0 && color !== undefined) {
    const fillH = h * fill;
    const fillTop = y - fillH;
    // Interpolate width at fill level (narrower at bottom, wider at top)
    const pctFromBottom = fill;
    const botW = w - taper * 2;  // narrow bottom
    const topW = w;               // wide top
    const fillBotW = botW;
    const fillTopW = botW + (topW - botW) * pctFromBottom;

    gfx.fillStyle(color, 0.85);
    gfx.beginPath();
    gfx.moveTo(x - fillTopW / 2, fillTop);
    gfx.lineTo(x - fillBotW / 2, y);
    gfx.lineTo(x + fillBotW / 2, y);
    gfx.lineTo(x + fillTopW / 2, fillTop);
    gfx.closePath();
    gfx.fillPath();

    // Foam head for beer (top 8% of fill)
    if (fill > 0.1) {
      const foamH = Math.min(4 * s, fillH * 0.12);
      gfx.fillStyle(0xfffde0, 0.9);
      gfx.fillRect(x - fillTopW / 2 + 1, fillTop, fillTopW - 2, foamH);
    }
  }

  // Rim highlight
  gfx.lineStyle(1 * s, 0xe0eaf4, 0.6);
  gfx.beginPath();
  gfx.moveTo(x - w / 2, top);
  gfx.lineTo(x + w / 2, top);
  gfx.strokePath();
}

function _drawWineGlass(gfx, x, y, fill, color, s) {
  const bowlW = 14 * s, bowlH = 14 * s;
  const stemH = 8 * s;
  const baseW = 14 * s;
  const totalH = bowlH + stemH + 3 * s;
  const bowlTop = y - totalH;
  const bowlBot = bowlTop + bowlH;

  // Bowl (tapered oval-ish)
  gfx.lineStyle(1.5 * s, 0xc8d8e8, 1);
  gfx.beginPath();
  gfx.moveTo(x - bowlW / 2 + 2 * s, bowlTop);
  gfx.lineTo(x - bowlW / 2, bowlBot - 4 * s);
  gfx.lineTo(x - 2 * s, bowlBot);
  gfx.lineTo(x + 2 * s, bowlBot);
  gfx.lineTo(x + bowlW / 2, bowlBot - 4 * s);
  gfx.lineTo(x + bowlW / 2 - 2 * s, bowlTop);
  gfx.closePath();
  gfx.strokePath();

  // Liquid in bowl
  if (fill > 0 && color !== undefined) {
    const fillH = bowlH * fill;
    const fillTop = bowlBot - fillH;
    const pct = fill;
    const fW = bowlW * (0.4 + 0.6 * Math.min(1, pct * 1.2));
    gfx.fillStyle(color, 0.85);
    gfx.beginPath();
    gfx.moveTo(x - fW / 2, fillTop);
    gfx.lineTo(x - 2 * s, bowlBot);
    gfx.lineTo(x + 2 * s, bowlBot);
    gfx.lineTo(x + fW / 2, fillTop);
    gfx.closePath();
    gfx.fillPath();
  }

  // Stem
  gfx.lineStyle(1.5 * s, 0xc8d8e8, 1);
  gfx.lineBetween(x, bowlBot, x, bowlBot + stemH);

  // Base
  gfx.lineBetween(x - baseW / 2, y, x + baseW / 2, y);
  gfx.lineStyle(1 * s, 0xc8d8e8, 0.5);
  gfx.lineBetween(x - baseW / 2, y + 1, x + baseW / 2, y + 1);

  // Rim highlight
  gfx.lineStyle(1 * s, 0xe0eaf4, 0.6);
  gfx.lineBetween(x - bowlW / 2 + 2 * s, bowlTop, x + bowlW / 2 - 2 * s, bowlTop);
}

function _drawCup(gfx, x, y, fill, color, s) {
  const w = 16 * s, h = 22 * s;
  const top = y - h;

  // Cup outline (slight taper)
  gfx.lineStyle(1.5 * s, 0xe8e8f0, 1);
  gfx.beginPath();
  gfx.moveTo(x - w / 2 + 1 * s, top);
  gfx.lineTo(x - w / 2, y);
  gfx.lineTo(x + w / 2, y);
  gfx.lineTo(x + w / 2 - 1 * s, top);
  gfx.closePath();
  gfx.strokePath();

  gfx.fillStyle(0xe8e8f0, 0.08);
  gfx.fillPath();

  // Liquid
  if (fill > 0 && color !== undefined) {
    const fillH = h * fill;
    const fillTop = y - fillH;
    gfx.fillStyle(color, 0.85);
    gfx.fillRect(x - w / 2 + 1, fillTop, w - 2, fillH);
  }

  // Rim
  gfx.lineStyle(1 * s, 0xf4f4ff, 0.6);
  gfx.lineBetween(x - w / 2 + 1 * s, top, x + w / 2 - 1 * s, top);
}

/**
 * Get the hex color integer for a drink's liquid.
 * @param {Array} layers - GlassState layers array
 * @returns {number} Phaser-compatible hex color
 */
export function getLiquidColor(layers) {
  if (!layers || layers.length === 0) return 0x888888;
  // Use the primary (largest) layer's color
  let best = layers[0];
  for (const l of layers) {
    if (l.amount > best.amount) best = l;
  }
  return parseInt((best.color || '#888888').replace('#', ''), 16);
}
