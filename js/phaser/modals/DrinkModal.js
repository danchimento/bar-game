import { CANVAS_W, CANVAS_H } from '../../constants.js';
import { DRINKS } from '../../data/menu.js';
import { drawGlass, getLiquidColor } from '../utils/GlassRenderer.js';

/**
 * Drink selection and pouring modal.
 *
 * Beer mode: tap handles on a chrome bar. Glass starts left, slides under active tap.
 * Wine mode: bottles on a shelf. Glass starts left, slides under active bottle.
 *
 * Hold-to-pour: pointerdown starts pour + glass slide, pointerup stops.
 * Pour stream always flows from tap when handle is pulled, even without a glass.
 */
export class DrinkModal {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(70).setVisible(false);
    this.drinkButtons = [];
    this.glassGfx = scene.add.graphics().setDepth(72);
    this.pourStreamGfx = scene.add.graphics().setDepth(71);
    this._overflowGfx = scene.add.graphics().setDepth(72);
    this._overflowDrops = []; // particles for overflow animation

    // Glass slide state
    this._glassCurrentX = 0;  // animated X position
    this._glassTargetX = 0;   // where glass should be
    this._glassRestX = 0;     // resting position (left of taps)
    this._glassY = 0;         // fixed Y (bottom of glass)
    this._spoutPositions = []; // X positions of each tap spout
    this._pouringIndex = -1;
    this._pouringDrinkKey = null; // track locally for pour stream color
    this._tapSpoutY = 0;       // Y of tap spout (bottom of tap cylinder)
    this._handles = [];        // handle/bottle references for visual feedback
    this._isBeer = false;
    this._isWine = false;
  }

  show(drinkModalState) {
    this._pouringIndex = -1;
    this._pouringDrinkKey = null;
    this._rebuild(drinkModalState);
    this.container.setVisible(true);
  }

  hide() {
    this.container.setVisible(false);
    this.container.removeAll(true);
    this.drinkButtons = [];
    this._handles = [];
    this._spoutPositions = [];
    this._pouringIndex = -1;
    this._pouringDrinkKey = null;
    this.glassGfx.clear();
    this.pourStreamGfx.clear();
    this._overflowGfx.clear();
    this._overflowDrops = [];
  }

  get visible() { return this.container.visible; }

  /** Called each frame while visible — animates pour stream + glass fill */
  update(barState, drinkModalState) {
    this.glassGfx.clear();
    this.pourStreamGfx.clear();
    this._overflowGfx.clear();
    if (!this.container.visible) return;

    const glass = barState.carriedGlass;

    // Update pouring index from modal state
    this._pouringIndex = drinkModalState.pouringIndex;

    // Decide glass target
    if (this._pouringIndex >= 0 && this._pouringIndex < this._spoutPositions.length) {
      this._glassTargetX = this._spoutPositions[this._pouringIndex];
    } else {
      this._glassTargetX = this._glassRestX;
    }

    // Animate glass X toward target
    const slideSpeed = 800;
    const dx = this._glassTargetX - this._glassCurrentX;
    if (Math.abs(dx) > 1) {
      this._glassCurrentX += Math.sign(dx) * Math.min(Math.abs(dx), slideSpeed / 60);
    } else {
      this._glassCurrentX = this._glassTargetX;
    }

    const gx = this._glassCurrentX;
    const gy = this._glassY;

    // ── Pour stream from taps (independent of glass) ──
    if (this._pouringIndex >= 0 && this._pouringDrinkKey) {
      const drink = DRINKS[this._pouringDrinkKey];
      const pourColor = parseInt((drink?.color || '#f0c040').replace('#', ''), 16);
      const spoutX = this._spoutPositions[this._pouringIndex] || gx;
      const spoutY = this._tapSpoutY;
      // Stream ends at glass top if glass present, otherwise flows past frame bottom
      const streamEndY = glass ? (gy - 40) : (gy + 10);
      const time = this.scene.time.now;

      this.pourStreamGfx.fillStyle(pourColor, 0.85);
      // Main stream
      this.pourStreamGfx.fillRect(spoutX - 1, spoutY, 2.5, streamEndY - spoutY);
      // Animated drip drops
      const dripPhase = (time % 180) / 180;
      for (let i = 0; i < 3; i++) {
        const t = (dripPhase + i * 0.33) % 1;
        const dropY = spoutY + t * (streamEndY - spoutY + 6);
        this.pourStreamGfx.fillCircle(spoutX + (i % 2 ? 1 : -1), dropY, 1.5);
      }
      // Splash at glass (only if glass present)
      if (glass) {
        this.pourStreamGfx.fillStyle(pourColor, 0.4);
        this.pourStreamGfx.fillCircle(gx - 2, streamEndY + 2, 2);
        this.pourStreamGfx.fillCircle(gx + 2, streamEndY + 1, 1.5);
      }
    }

    // ── Draw glass at current animated position (only if carrying one) ──
    if (!glass) return;

    const fillPct = glass.totalFill;
    const liquidColor = getLiquidColor(glass.layers);
    drawGlass(this.glassGfx, gx, gy, glass.glassType, fillPct, liquidColor, 2.0);

    // ── Green zone indicator on glass ──
    this._drawGreenZone(gx, gy, glass, fillPct);

    // ── Overflow animation ──
    if (glass.overflow > 0) {
      this._drawOverflow(gx, gy, glass, liquidColor);
    }
  }

  // ─── GREEN ZONE + OVERFLOW ──────────────────────────

  _drawGreenZone(gx, gy, glass, fillPct) {
    // Find fill range for current drink being poured
    let fillRange = null;
    if (this._pouringDrinkKey && DRINKS[this._pouringDrinkKey]) {
      fillRange = DRINKS[this._pouringDrinkKey].fillRange;
    } else if (glass.layers.length > 0) {
      const drinkKey = glass.layers[0].drinkKey;
      if (drinkKey && DRINKS[drinkKey]) fillRange = DRINKS[drinkKey].fillRange;
    }
    if (!fillRange) return;

    const s = 2.0; // matches glass scale
    const [minFill, maxFill] = fillRange;

    // Determine color based on current fill
    let zoneColor, zoneAlpha;
    if (fillPct >= minFill && fillPct <= maxFill) {
      zoneColor = 0x4caf50; zoneAlpha = 0.25; // green — in range
    } else if (fillPct > maxFill) {
      zoneColor = 0xf44336; zoneAlpha = 0.25; // red — overfilled
    } else if (fillPct > 0) {
      zoneColor = 0xff9800; zoneAlpha = 0.2;  // amber — underfilled
    } else {
      zoneColor = 0x4caf50; zoneAlpha = 0.15; // green — hasn't started
    }

    // Draw the zone as a translucent overlay inside the glass shape
    if (glass.glassType === 'WINE_GLASS') {
      this._drawZoneWine(gx, gy, s, minFill, maxFill, zoneColor, zoneAlpha);
    } else if (glass.glassType === 'PLASTIC_CUP') {
      this._drawZoneCup(gx, gy, s, minFill, maxFill, zoneColor, zoneAlpha);
    } else {
      this._drawZonePint(gx, gy, s, minFill, maxFill, zoneColor, zoneAlpha);
    }

    // Thin horizontal line markers at min and max fill
    const lineAlpha = zoneAlpha + 0.25;
    this.glassGfx.lineStyle(1, zoneColor, lineAlpha);
    if (glass.glassType === 'PINT' || !glass.glassType) {
      const h = 28 * s, w = 18 * s, taper = 2 * s;
      const botW = w - taper * 2, topW = w;
      for (const pct of [minFill, maxFill]) {
        const ly = gy - h * pct;
        const lw = botW + (topW - botW) * pct;
        this.glassGfx.lineBetween(gx - lw / 2 + 1, ly, gx + lw / 2 - 1, ly);
      }
    } else if (glass.glassType === 'PLASTIC_CUP') {
      const w = 16 * s;
      for (const pct of [minFill, maxFill]) {
        const ly = gy - 22 * s * pct;
        this.glassGfx.lineBetween(gx - w / 2 + 2, ly, gx + w / 2 - 2, ly);
      }
    } else { // WINE_GLASS
      const bowlH = 14 * s, totalH = (14 + 8 + 3) * s, bowlW = 14 * s;
      const bowlBot = gy - totalH + bowlH;
      for (const pct of [minFill, maxFill]) {
        const ly = bowlBot - bowlH * pct;
        const fW = bowlW * (0.4 + 0.6 * Math.min(1, pct * 1.2));
        this.glassGfx.lineBetween(gx - fW / 2 + 1, ly, gx + fW / 2 - 1, ly);
      }
    }
  }

  _drawZonePint(gx, gy, s, minFill, maxFill, color, alpha) {
    const w = 18 * s, h = 28 * s, taper = 2 * s;
    const botW = w - taper * 2, topW = w;
    // Width at a given fill pct
    const wAt = (pct) => botW + (topW - botW) * pct;
    const yAt = (pct) => gy - h * pct;

    this.glassGfx.fillStyle(color, alpha);
    this.glassGfx.beginPath();
    this.glassGfx.moveTo(gx - wAt(maxFill) / 2 + 1, yAt(maxFill));
    this.glassGfx.lineTo(gx - wAt(minFill) / 2 + 1, yAt(minFill));
    this.glassGfx.lineTo(gx + wAt(minFill) / 2 - 1, yAt(minFill));
    this.glassGfx.lineTo(gx + wAt(maxFill) / 2 - 1, yAt(maxFill));
    this.glassGfx.closePath();
    this.glassGfx.fillPath();
  }

  _drawZoneCup(gx, gy, s, minFill, maxFill, color, alpha) {
    const w = 16 * s, h = 22 * s;
    const yAt = (pct) => gy - h * pct;
    // Cup has very slight taper, simplify as rect inset
    const hw = w / 2 - 1;

    this.glassGfx.fillStyle(color, alpha);
    this.glassGfx.fillRect(gx - hw, yAt(maxFill), hw * 2, yAt(minFill) - yAt(maxFill));
  }

  _drawZoneWine(gx, gy, s, minFill, maxFill, color, alpha) {
    const bowlW = 14 * s, bowlH = 14 * s;
    const totalH = (14 + 8 + 3) * s;
    const bowlBot = gy - totalH + bowlH;
    // Width at fill pct inside bowl
    const wAt = (pct) => bowlW * (0.4 + 0.6 * Math.min(1, pct * 1.2));
    const yAt = (pct) => bowlBot - bowlH * pct;

    this.glassGfx.fillStyle(color, alpha);
    this.glassGfx.beginPath();
    this.glassGfx.moveTo(gx - wAt(maxFill) / 2 + 1, yAt(maxFill));
    this.glassGfx.lineTo(gx - wAt(minFill) / 2 + 1, yAt(minFill));
    this.glassGfx.lineTo(gx + wAt(minFill) / 2 - 1, yAt(minFill));
    this.glassGfx.lineTo(gx + wAt(maxFill) / 2 - 1, yAt(maxFill));
    this.glassGfx.closePath();
    this.glassGfx.fillPath();
  }

  _drawOverflow(gx, gy, glass, liquidColor) {
    const s = 2.0;
    const glassH = glass.glassType === 'WINE_GLASS' ? (14 + 8 + 3) * s
      : glass.glassType === 'PLASTIC_CUP' ? 22 * s : 28 * s;
    const glassW = glass.glassType === 'WINE_GLASS' ? 14 * s
      : glass.glassType === 'PLASTIC_CUP' ? 16 * s : 18 * s;
    const rimY = gy - glassH;
    const time = this.scene.time.now;

    // Spawn new drip particles
    const spawnRate = Math.min(glass.overflow * 10, 3); // more overflow = more drips
    if (Math.random() < spawnRate * (1 / 60)) {
      const side = Math.random() < 0.5 ? -1 : 1;
      this._overflowDrops.push({
        x: gx + side * (glassW / 2 - 2),
        y: rimY,
        vx: side * (0.3 + Math.random() * 0.5),
        vy: 0.5 + Math.random() * 0.8,
        life: 1.0,
        size: 1.5 + Math.random() * 1.5,
      });
    }

    // Update and draw drip particles
    const gfx = this._overflowGfx;
    for (let i = this._overflowDrops.length - 1; i >= 0; i--) {
      const drop = this._overflowDrops[i];
      drop.x += drop.vx;
      drop.y += drop.vy;
      drop.vy += 0.15; // gravity
      drop.life -= 0.02;

      if (drop.life <= 0 || drop.y > gy + 30) {
        this._overflowDrops.splice(i, 1);
        continue;
      }

      gfx.fillStyle(liquidColor, drop.life * 0.8);
      gfx.fillCircle(drop.x, drop.y, drop.size);
    }

    // Liquid bulge at rim (pooling over the edge)
    const bulgeAmount = Math.min(glass.overflow * 2, 1);
    gfx.fillStyle(liquidColor, 0.6 * bulgeAmount);
    const bulgeW = glassW + 4 * bulgeAmount;
    const bulgeH = 3 * s * bulgeAmount;
    gfx.fillEllipse(gx, rimY, bulgeW, bulgeH);
  }

  // ─── REBUILD ────────────────────────────────────────

  _rebuild(modal) {
    this.container.removeAll(true);
    this.drinkButtons = [];
    this._handles = [];
    this._spoutPositions = [];

    const items = modal.items;
    if (!items.length) return;

    this._isBeer = modal.type === 'beer';
    this._isWine = modal.type === 'wine';

    const spacing = this._isBeer ? 90 : 100;
    const totalW = items.length * spacing;
    const pw = Math.max(totalW + 140, 380);
    const ph = this._isBeer ? 280 : 320;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2 + 30; // shifted down to give handles room

    // Dim overlay
    const dim = this.scene.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x000000, 0.6)
      .setInteractive();
    dim.on('pointerdown', (ptr) => {
      if (ptr.x < px || ptr.x > px + pw || ptr.y < py || ptr.y > py + ph) {
        this.scene.events.emit('drink-modal-close');
      }
    });
    this.container.add(dim);

    // Panel
    const bgColor = this._isBeer ? 0x2a1a0a : (this._isWine ? 0x2a1020 : 0x0a1a2a);
    const borderColor = this._isBeer ? 0xd4a020 : (this._isWine ? 0x8b1a4a : 0x4a9ad4);
    this.container.add(
      this.scene.add.rectangle(CANVAS_W / 2, py + ph / 2, pw, ph, bgColor)
        .setStrokeStyle(2, borderColor)
    );

    // (no title — clean modal)

    // Taps/bottles area starts offset to make room for glass rest area
    const tapsAreaLeft = px + 90;
    const startX = tapsAreaLeft + (pw - 90 - totalW) / 2 + spacing / 2;

    // Glass resting position (left of taps area)
    this._glassRestX = px + 50;
    this._glassCurrentX = this._glassRestX;
    this._glassTargetX = this._glassRestX;

    // Build taps or bottles
    if (this._isBeer) {
      this._buildBeerTaps(items, modal, startX, py, spacing);
    } else if (this._isWine) {
      this._buildWineBottles(items, modal, startX, py, spacing);
    } else {
      this._buildMixerButtons(items, modal, startX, py, spacing);
    }

    // Close button
    const closeBtn = this.scene.add.rectangle(px + pw - 22, py + 16, 26, 22, 0xf44336)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.scene.events.emit('drink-modal-close'));
    this.container.add(closeBtn);
    this.container.add(this.scene.add.text(px + pw - 22, py + 16, 'X', {
      fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5));
  }

  // ─── BEER TAPS ──────────────────────────────────────

  _buildBeerTaps(items, modal, startX, py, spacing) {
    const TAP_COUNT = 3;
    const frameScale = 1.5;
    const handleScale = 1.3;
    const frameCX = CANVAS_W / 2;
    const frameTopY = py + 50;

    // Sprite is 60x40 pixel-art at 3x = 180x120 PNG
    const frameImgW = 180;
    const frameImgH = 120;
    const frame = this.scene.add.image(frameCX, frameTopY, 'tap_frame')
      .setOrigin(0.5, 0).setScale(frameScale);
    this.container.add(frame);

    // Tap positions: art [15,30,45] → PNG [45,90,135]
    const scaledW = frameImgW * frameScale;
    const frameLeft = frameCX - scaledW / 2;
    const tapXPositions = [45, 90, 135].map(px => frameLeft + px * frameScale);

    // Key Y positions
    const pxToScreen = 3 * frameScale; // art pixel → screen pixel
    const crossbarY = frameTopY + 3 * pxToScreen;  // crossbar center at art y=3
    // Visual frame bottom at art y=32 (bottom of feet, content ends there)
    const visualFrameBottomY = frameTopY + 32 * pxToScreen;
    // Tap spout at art y=12 (bottom of cylinder)
    this._tapSpoutY = frameTopY + 12 * pxToScreen;

    // Record spout positions
    for (let i = 0; i < TAP_COUNT; i++) {
      this._spoutPositions.push(tapXPositions[i]);
    }

    // ── Handles (only on active taps) ──
    for (let i = 0; i < TAP_COUNT; i++) {
      const tx = tapXPositions[i];
      const hasItem = i < items.length;
      const drinkKey = hasItem ? items[i] : null;
      const drink = hasItem ? DRINKS[drinkKey] : null;

      if (hasItem && drink) {
        const handleKey = `handle_${drinkKey.toLowerCase()}`;
        const handlePulledKey = `handle_${drinkKey.toLowerCase()}_pulled`;

        // Handle sits on top of the tap cylinder
        const handle = this.scene.add.image(tx, crossbarY - 4, handleKey)
          .setOrigin(0.5, 1).setScale(handleScale);
        this.container.add(handle);
        this._handles.push({ handle, handleKey, handlePulledKey, x: tx });

        // Interactive zone covering handle + tap area
        const zone = this.scene.add.zone(tx, crossbarY - 20, 65, 120)
          .setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => {
          this._pouringDrinkKey = drinkKey;
          this.scene.events.emit('drink-pour-start', drinkKey, i, modal.pourRate);
          handle.setTexture(handlePulledKey);
        });
        zone.on('pointerup', () => {
          handle.setTexture(handleKey);
          this._pouringDrinkKey = null;
        });
        zone.on('pointerout', () => {
          handle.setTexture(handleKey);
          this._pouringDrinkKey = null;
        });
        this.container.add(zone);
        this.drinkButtons.push(zone);
      } else {
        this._handles.push(null);
      }
    }

    // Glass bottom aligned with visual frame bottom
    this._glassY = visualFrameBottomY;
  }

  // ─── WINE BOTTLES ───────────────────────────────────

  _buildWineBottles(items, modal, startX, py, spacing) {
    const shelfY = py + 55;

    // Shelf
    const shelfLeft = startX - spacing / 2 - 10;
    const shelfRight = startX + (items.length - 1) * spacing + spacing / 2 + 10;
    this.container.add(
      this.scene.add.rectangle((shelfLeft + shelfRight) / 2, shelfY + 100, shelfRight - shelfLeft, 5, 0x4a3a28)
        .setStrokeStyle(1, 0x5a4a38)
    );

    for (let i = 0; i < items.length; i++) {
      const drinkKey = items[i];
      const drink = DRINKS[drinkKey];
      if (!drink) continue;

      const bx = startX + i * spacing;
      const colorInt = parseInt(drink.color.replace('#', ''), 16);
      const isDark = drink.color === '#6b1a2a';

      // Bottle body
      const bottleH = 80;
      const bottleW = 22;
      const bottleY = shelfY + 10;

      const body = this.scene.add.rectangle(bx, bottleY + bottleH / 2, bottleW, bottleH, colorInt)
        .setStrokeStyle(1, isDark ? 0x4a0a1a : 0xb8b080);
      this.container.add(body);
      this._handles.push(body);

      // Bottle neck
      this.container.add(this.scene.add.rectangle(bx, bottleY - 4, 10, 18, colorInt)
        .setStrokeStyle(1, isDark ? 0x4a0a1a : 0xb8b080));

      // Cork/cap
      this.container.add(this.scene.add.rectangle(bx, bottleY - 14, 8, 4,
        isDark ? 0x8b4513 : 0xc8b870));

      // Label
      this.container.add(this.scene.add.rectangle(bx, bottleY + bottleH / 2 - 5, bottleW - 4, 20,
        isDark ? 0xd4c8a0 : 0x3a2a1a));

      // Spout position (bottom of bottle)
      this._spoutPositions.push(bx);

      // Name + price below shelf
      this.container.add(this.scene.add.text(bx, shelfY + 112, drink.name, {
        fontFamily: 'monospace', fontSize: '9px', fontStyle: 'bold', color: '#cccccc',
        wordWrap: { width: 90 }, align: 'center',
      }).setOrigin(0.5));
      this.container.add(this.scene.add.text(bx, shelfY + 126, `$${drink.price}`, {
        fontFamily: 'monospace', fontSize: '8px', color: '#999999',
      }).setOrigin(0.5));

      // Interactive zone covering bottle
      const zone = this.scene.add.zone(bx, bottleY + bottleH / 2, bottleW + 20, bottleH + 20)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this._pouringDrinkKey = drinkKey;
        this.scene.events.emit('drink-pour-start', drinkKey, i, modal.pourRate);
        body.setStrokeStyle(2, 0xffd54f);
      });
      zone.on('pointerup', () => {
        body.setStrokeStyle(1, isDark ? 0x4a0a1a : 0xb8b080);
        this._pouringDrinkKey = null;
      });
      zone.on('pointerout', () => {
        body.setStrokeStyle(1, isDark ? 0x4a0a1a : 0xb8b080);
        this._pouringDrinkKey = null;
      });
      this.container.add(zone);
      this.drinkButtons.push(zone);
    }

    // Glass Y sits on the shelf
    this._glassY = shelfY + 97;
    this._tapSpoutY = shelfY + 90 + 10; // bottom of bottle
  }

  // ─── MIXER / SODA ───────────────────────────────────

  _buildMixerButtons(items, modal, startX, py, spacing) {
    const btnY = py + 70;
    const btnW = 90;
    const btnH = 80;

    for (let i = 0; i < items.length; i++) {
      const drinkKey = items[i];
      const drink = DRINKS[drinkKey];
      if (!drink) continue;

      const bx = startX + i * spacing;
      const colorInt = parseInt(drink.color.replace('#', ''), 16);

      const btn = this.scene.add.rectangle(bx, btnY + btnH / 2, btnW, btnH, 0x2a3a4a)
        .setStrokeStyle(2, 0x4a6a8a).setInteractive({ useHandCursor: true });
      this._handles.push(btn);

      btn.on('pointerdown', () => {
        this._pouringDrinkKey = drinkKey;
        this.scene.events.emit('drink-pour-start', drinkKey, i, modal.pourRate);
        btn.setStrokeStyle(3, 0xffd54f);
      });
      btn.on('pointerup', () => {
        btn.setStrokeStyle(2, 0x4a6a8a);
        this._pouringDrinkKey = null;
      });
      btn.on('pointerout', () => {
        btn.setStrokeStyle(2, 0x4a6a8a);
        this._pouringDrinkKey = null;
      });

      this.container.add(btn);
      this.drinkButtons.push(btn);
      this._spoutPositions.push(bx);

      // Color circle
      this.container.add(this.scene.add.circle(bx, btnY + 25, 12, colorInt));

      // Name
      this.container.add(this.scene.add.text(bx, btnY + btnH / 2 + 8, drink.name, {
        fontFamily: 'monospace', fontSize: '9px', fontStyle: 'bold', color: '#cccccc',
        wordWrap: { width: btnW - 6 }, align: 'center',
      }).setOrigin(0.5));
    }

    this._glassY = btnY + btnH + 15;
    this._tapSpoutY = btnY + btnH - 5;
  }

  destroy() {
    this.container.destroy(true);
    this.glassGfx.destroy();
    this.pourStreamGfx.destroy();
    this._overflowGfx.destroy();
  }
}
