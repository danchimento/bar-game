import { CANVAS_W, CANVAS_H } from '../../constants.js';
import { DEPTH } from '../../constants/depths.js';
import { DRINKS } from '../../data/menu.js';
import { drawGlass, getLiquidColor } from '../utils/GlassRenderer.js';
import { BaseModal } from './BaseModal.js';

/**
 * Drink selection and pouring modal.
 *
 * Beer mode: tap handles on a chrome bar. Glass starts left, slides under active tap.
 * Wine mode: bottles on a shelf. Glass starts left, slides under active bottle.
 *
 * Hold-to-pour: pointerdown starts pour + glass slide, pointerup stops.
 * Pour stream always flows from tap when handle is pulled, even without a glass.
 */
export class DrinkModal extends BaseModal {
  constructor(scene) {
    super(scene, { closeEvent: 'drink-modal-close', dimAlpha: 0.65 });

    this.drinkButtons = [];
    // Scene-level graphics (persist across show/hide, cleared per-frame)
    this.glassGfx = scene.add.graphics().setDepth(DEPTH.MODAL_GLASS);
    this.pourStreamGfx = scene.add.graphics().setDepth(DEPTH.MODAL_POUR_STREAM);
    this._overflowGfx = scene.add.graphics().setDepth(DEPTH.MODAL_GLASS);
    this._overflowDrops = [];

    // Glass slide state
    this._glassCurrentX = 0;
    this._glassTargetX = 0;
    this._glassRestX = 0;
    this._glassY = 0;
    this._spoutPositions = [];
    this._pouringIndex = -1;
    this._pouringDrinkKey = null;
    this._tapSpoutY = 0;
    this._handles = [];
    this._isBeer = false;
    this._isWine = false;
    this._isBeerSplit = false;

    // Local graphics for beer split-panel mode (inside content container)
    this._localGlassGfx = null;
    this._localPourGfx = null;
    this._localOverflowGfx = null;

    // Stored show args
    this._modalState = null;
  }

  show(drinkModalState) {
    this._modalState = drinkModalState;
    this._pouringIndex = -1;
    this._pouringDrinkKey = null;
    this._isBeerSplit = drinkModalState.type === 'beer';

    if (this._isBeerSplit) {
      // Single wide panel for portrait
      this._contentW = 490;
      this._contentH = 420;
      super.show({
        origin: {
          x: drinkModalState.originX ?? CANVAS_W / 2,
          y: drinkModalState.originY ?? CANVAS_H / 2,
          w: drinkModalState.originW ?? 29,
          h: drinkModalState.originH ?? 23,
        },
      });
    } else {
      this._contentW = 0;
      this._contentH = 0;
      super.show();
    }
  }

  _build() {
    this.drinkButtons = [];
    this._handles = [];
    this._spoutPositions = [];

    const modal = this._modalState;
    const items = modal.items;
    if (!items.length) return;

    this._isBeer = modal.type === 'beer';
    this._isWine = modal.type === 'wine';

    if (this._isBeerSplit) {
      this._buildBeerSplitPanel(items, modal);
    } else {
      this._buildLegacyPanel(items, modal);
    }
  }

  /** Beer taps — single wide panel for portrait (local coords, animated) */
  _buildBeerSplitPanel(items, modal) {
    const scene = this.scene;
    const panelW = this._contentW;   // 490
    const panelH = this._contentH;   // 420
    const tapsH = 310;               // top portion for tap frame + glass
    const btnRowY = panelH / 2 - 50; // button row center

    // ── Full-width panel background ──
    this._content.add(
      scene.add.rectangle(0, 0, panelW, panelH, 0x2a1a0a)
        .setStrokeStyle(2, 0xd4a020)
        .setInteractive(),
    );

    // ── Tap frame (centered, scaled to fill panel width) ──
    const frameScale = 1.6;
    const handleScale = 1.2;
    const frameImgW = 180;
    const frameTopY = -panelH / 2 + 40;

    const frame = scene.add.image(0, frameTopY, 'tap_frame')
      .setOrigin(0.5, 0).setScale(frameScale);
    this._content.add(frame);

    const scaledW = frameImgW * frameScale;
    const frameLeft = -scaledW / 2;
    const tapXPositions = [45, 90, 135].map(p => frameLeft + p * frameScale);

    const pxToScreen = 3 * frameScale;
    const crossbarY = frameTopY + 3 * pxToScreen;
    const visualFrameBottomY = frameTopY + 32 * pxToScreen;
    this._tapSpoutY = frameTopY + 12 * pxToScreen;
    this._glassY = visualFrameBottomY;

    // Glass rest position (left side of panel)
    this._glassRestX = -panelW / 2 + 40;
    this._glassCurrentX = this._glassRestX;
    this._glassTargetX = this._glassRestX;

    const TAP_COUNT = 3;
    for (let i = 0; i < TAP_COUNT; i++) {
      this._spoutPositions.push(tapXPositions[i]);
    }

    // Handles + interactive zones
    for (let i = 0; i < TAP_COUNT; i++) {
      const tx = tapXPositions[i];
      const hasItem = i < items.length;
      const drinkKey = hasItem ? items[i] : null;
      const drink = hasItem ? DRINKS[drinkKey] : null;

      if (hasItem && drink) {
        const handleKey = `handle_${drinkKey.toLowerCase()}`;
        const handlePulledKey = `handle_${drinkKey.toLowerCase()}_pulled`;

        const handle = scene.add.image(tx, crossbarY - 4, handleKey)
          .setOrigin(0.5, 1).setScale(handleScale);
        this._content.add(handle);
        this._handles.push({ handle, handleKey, handlePulledKey, x: tx });

        const zone = scene.add.zone(tx, crossbarY - 10, 65, 110)
          .setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => {
          if (this._closing || this._animating) return;
          this._pouringDrinkKey = drinkKey;
          scene.events.emit('drink-pour-start', drinkKey, i, modal.pourRate);
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
        this._content.add(zone);
        this.drinkButtons.push(zone);
      } else {
        this._handles.push(null);
      }
    }

    // ── Button row (bottom) ──
    const btnW = (panelW - 30) / 2;  // ~230
    const btnH = 50;
    const btnGap = 10;

    // Left: "Step Away" (red, always active)
    const stepBtn = scene.add.rectangle(-btnW / 2 - btnGap / 2, btnRowY, btnW, btnH, 0x6a2a2a)
      .setStrokeStyle(1, 0x8a4a4a)
      .setInteractive({ useHandCursor: true });
    stepBtn.on('pointerdown', () => {
      if (this._closing) return;
      this._requestClose();
    });
    this._content.add(stepBtn);
    this._content.add(scene.add.text(-btnW / 2 - btnGap / 2, btnRowY, 'Step Away', {
      fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: '#ff9999',
    }).setOrigin(0.5));

    // Right: "Take Beer" (green, disabled until poured)
    this._takeBtn = scene.add.rectangle(btnW / 2 + btnGap / 2, btnRowY, btnW, btnH, 0x2a2a2a)
      .setStrokeStyle(1, 0x444444);
    this._content.add(this._takeBtn);
    this._takeBtnLabel = scene.add.text(btnW / 2 + btnGap / 2, btnRowY, 'Take Beer', {
      fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: '#666666',
    }).setOrigin(0.5);
    this._content.add(this._takeBtnLabel);
    this._takeBtnEnabled = false;

    // ── Local graphics (inside content for proper transform) ──
    this._localPourGfx = scene.add.graphics();
    this._content.add(this._localPourGfx);
    this._localGlassGfx = scene.add.graphics();
    this._content.add(this._localGlassGfx);
    this._localOverflowGfx = scene.add.graphics();
    this._content.add(this._localOverflowGfx);
  }

  /** Wine / mixer — legacy single-panel layout (screen-absolute coords) */
  _buildLegacyPanel(items, modal) {
    const scene = this.scene;
    const spacing = this._isWine ? 100 : 100;
    const totalW = items.length * spacing;
    const pw = Math.max(totalW + 140, 380);
    const ph = this._isWine ? 320 : 320;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2 + 30;

    const bgColor = this._isWine ? 0x2a1020 : 0x0a1a2a;
    const borderColor = this._isWine ? 0x8b1a4a : 0x4a9ad4;
    this._content.add(
      scene.add.rectangle(CANVAS_W / 2, py + ph / 2, pw, ph, bgColor)
        .setStrokeStyle(2, borderColor)
        .setInteractive(),
    );

    const tapsAreaLeft = px + 90;
    const startX = tapsAreaLeft + (pw - 90 - totalW) / 2 + spacing / 2;

    this._glassRestX = px + 50;
    this._glassCurrentX = this._glassRestX;
    this._glassTargetX = this._glassRestX;

    if (this._isWine) {
      this._buildWineBottles(items, modal, startX, py, spacing);
    } else {
      this._buildMixerButtons(items, modal, startX, py, spacing);
    }

    const closeBtn = scene.add.rectangle(px + pw - 22, py + 16, 26, 22, 0xf44336)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this._requestClose());
    this._content.add(closeBtn);
    this._content.add(scene.add.text(px + pw - 22, py + 16, 'X', {
      fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5));
  }

  /** Called each frame — animates pour stream + glass fill */
  _onUpdate(dt) {
    // For beer split mode, redirect graphics to local objects inside content
    let restoreGfx = null;
    if (this._isBeerSplit && this._localGlassGfx) {
      this.glassGfx.clear();
      this.pourStreamGfx.clear();
      this._overflowGfx.clear();
      restoreGfx = [this.glassGfx, this.pourStreamGfx, this._overflowGfx];
      this.glassGfx = this._localGlassGfx;
      this.pourStreamGfx = this._localPourGfx;
      this._overflowGfx = this._localOverflowGfx;
    }

    try {
      this._drawFrame(dt);
    } finally {
      if (restoreGfx) {
        [this.glassGfx, this.pourStreamGfx, this._overflowGfx] = restoreGfx;
      }
    }

    // Update "Take Beer" button state (beer mode only)
    if (this._isBeerSplit && this._takeBtn) {
      const glass = this.scene.barState?.carriedGlass;
      const hasFill = glass && glass.totalFill > 0;
      if (hasFill && !this._takeBtnEnabled) {
        this._takeBtnEnabled = true;
        this._takeBtn.setFillStyle(0x3a6a3a).setStrokeStyle(1, 0x5a8a5a);
        this._takeBtn.setInteractive({ useHandCursor: true });
        this._takeBtn.on('pointerdown', () => {
          if (this._closing) return;
          this._requestClose();
        });
        this._takeBtnLabel.setColor('#ffffff');
      }
    }
  }

  /** Core per-frame drawing — works in both local and screen-absolute coords */
  _drawFrame(dt) {
    this.glassGfx.clear();
    this.pourStreamGfx.clear();
    this._overflowGfx.clear();

    const barState = this.scene.barState;
    const drinkModalState = this.scene.drinkModalState;
    if (!barState || !drinkModalState) return;

    const glass = barState.carriedGlass;

    this._pouringIndex = drinkModalState.pouringIndex;

    if (this._pouringIndex >= 0 && this._pouringIndex < this._spoutPositions.length) {
      this._glassTargetX = this._spoutPositions[this._pouringIndex];
    } else {
      this._glassTargetX = this._glassRestX;
    }

    // Animate glass X (time-based)
    const slideSpeed = 800;
    const dxSlide = this._glassTargetX - this._glassCurrentX;
    const maxStep = slideSpeed * (dt || 0.016);
    if (Math.abs(dxSlide) > 1) {
      this._glassCurrentX += Math.sign(dxSlide) * Math.min(Math.abs(dxSlide), maxStep);
    } else {
      this._glassCurrentX = this._glassTargetX;
    }

    const gx = this._glassCurrentX;
    const gy = this._glassY;

    // Pour stream
    if (this._pouringIndex >= 0 && this._pouringDrinkKey) {
      const drink = DRINKS[this._pouringDrinkKey];
      const pourColor = parseInt((drink?.color || '#f0c040').replace('#', ''), 16);
      const spoutX = this._spoutPositions[this._pouringIndex] || gx;
      const spoutY = this._tapSpoutY;
      const streamEndY = glass ? (gy - 40) : (gy + 10);
      const time = this.scene.time.now;

      this.pourStreamGfx.fillStyle(pourColor, 0.85);
      this.pourStreamGfx.fillRect(spoutX - 1, spoutY, 2.5, streamEndY - spoutY);
      const dripPhase = (time % 180) / 180;
      for (let i = 0; i < 3; i++) {
        const t = (dripPhase + i * 0.33) % 1;
        const dropY = spoutY + t * (streamEndY - spoutY + 6);
        this.pourStreamGfx.fillCircle(spoutX + (i % 2 ? 1 : -1), dropY, 1.5);
      }
      if (glass) {
        this.pourStreamGfx.fillStyle(pourColor, 0.4);
        this.pourStreamGfx.fillCircle(gx - 2, streamEndY + 2, 2);
        this.pourStreamGfx.fillCircle(gx + 2, streamEndY + 1, 1.5);
      }
    }

    if (!glass) return;

    const fillPct = glass.totalFill;
    const liquidColor = getLiquidColor(glass.layers);
    drawGlass(this.glassGfx, gx, gy, glass.glassType, fillPct, liquidColor, 2.0);

    this._drawGreenZone(gx, gy, glass, fillPct);

    if (glass.overflow > 0) {
      this._drawOverflow(gx, gy, glass, liquidColor, dt);
    }
  }

  _onTeardown() {
    this.drinkButtons = [];
    this._handles = [];
    this._spoutPositions = [];
    this._pouringIndex = -1;
    this._pouringDrinkKey = null;
    this.glassGfx.clear();
    this.pourStreamGfx.clear();
    this._overflowGfx.clear();
    this._overflowDrops = [];
    // Local graphics + button refs are destroyed by container.removeAll(true)
    this._localGlassGfx = null;
    this._localPourGfx = null;
    this._localOverflowGfx = null;
    this._takeBtn = null;
    this._takeBtnLabel = null;
    this._takeBtnEnabled = false;
  }

  // ─── GREEN ZONE + OVERFLOW ──────────────────────────

  _drawGreenZone(gx, gy, glass, fillPct) {
    let fillRange = null;
    if (this._pouringDrinkKey && DRINKS[this._pouringDrinkKey]) {
      fillRange = DRINKS[this._pouringDrinkKey].fillRange;
    } else if (glass.layers.length > 0) {
      const drinkKey = glass.layers[0].drinkKey;
      if (drinkKey && DRINKS[drinkKey]) fillRange = DRINKS[drinkKey].fillRange;
    }
    if (!fillRange) return;

    const s = 2.0;
    const [minFill, maxFill] = fillRange;

    let zoneColor, zoneAlpha;
    if (fillPct >= minFill && fillPct <= maxFill) {
      zoneColor = 0x4caf50; zoneAlpha = 0.25;
    } else if (fillPct > maxFill) {
      zoneColor = 0xf44336; zoneAlpha = 0.25;
    } else if (fillPct > 0) {
      zoneColor = 0xff9800; zoneAlpha = 0.2;
    } else {
      zoneColor = 0x4caf50; zoneAlpha = 0.15;
    }

    if (glass.glassType === 'WINE_GLASS') {
      this._drawZoneWine(gx, gy, s, minFill, maxFill, zoneColor, zoneAlpha);
    } else if (glass.glassType === 'PLASTIC_CUP') {
      this._drawZoneCup(gx, gy, s, minFill, maxFill, zoneColor, zoneAlpha);
    } else {
      this._drawZonePint(gx, gy, s, minFill, maxFill, zoneColor, zoneAlpha);
    }

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
    } else {
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
    const hw = w / 2 - 1;
    this.glassGfx.fillStyle(color, alpha);
    this.glassGfx.fillRect(gx - hw, yAt(maxFill), hw * 2, yAt(minFill) - yAt(maxFill));
  }

  _drawZoneWine(gx, gy, s, minFill, maxFill, color, alpha) {
    const bowlW = 14 * s, bowlH = 14 * s;
    const totalH = (14 + 8 + 3) * s;
    const bowlBot = gy - totalH + bowlH;
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

  _drawOverflow(gx, gy, glass, liquidColor, dt) {
    const s = 2.0;
    const glassH = glass.glassType === 'WINE_GLASS' ? (14 + 8 + 3) * s
      : glass.glassType === 'PLASTIC_CUP' ? 22 * s : 28 * s;
    const glassW = glass.glassType === 'WINE_GLASS' ? 14 * s
      : glass.glassType === 'PLASTIC_CUP' ? 16 * s : 18 * s;
    const rimY = gy - glassH;

    // Spawn new drip particles (time-based)
    const spawnRate = Math.min(glass.overflow * 10, 3);
    if (Math.random() < spawnRate * (dt || 0.016)) {
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

    // Update and draw particles (time-based physics)
    const gfx = this._overflowGfx;
    const frameDt = dt || 0.016;
    for (let i = this._overflowDrops.length - 1; i >= 0; i--) {
      const drop = this._overflowDrops[i];
      drop.x += drop.vx * frameDt * 60;
      drop.y += drop.vy * frameDt * 60;
      drop.vy += 9 * frameDt;    // gravity (px/s²)
      drop.life -= 1.2 * frameDt; // decay (1/s)

      if (drop.life <= 0 || drop.y > gy + 30) {
        this._overflowDrops.splice(i, 1);
        continue;
      }

      gfx.fillStyle(liquidColor, drop.life * 0.8);
      gfx.fillCircle(drop.x, drop.y, drop.size);
    }

    // Liquid bulge at rim
    const bulgeAmount = Math.min(glass.overflow * 2, 1);
    gfx.fillStyle(liquidColor, 0.6 * bulgeAmount);
    const bulgeW = glassW + 4 * bulgeAmount;
    const bulgeH = 3 * s * bulgeAmount;
    gfx.fillEllipse(gx, rimY, bulgeW, bulgeH);
  }

  // ─── WINE BOTTLES ───────────────────────────────────

  _buildWineBottles(items, modal, startX, py, spacing) {
    const scene = this.scene;
    const shelfY = py + 55;

    const shelfLeft = startX - spacing / 2 - 10;
    const shelfRight = startX + (items.length - 1) * spacing + spacing / 2 + 10;
    this._content.add(
      scene.add.rectangle((shelfLeft + shelfRight) / 2, shelfY + 100, shelfRight - shelfLeft, 5, 0x4a3a28)
        .setStrokeStyle(1, 0x5a4a38),
    );

    for (let i = 0; i < items.length; i++) {
      const drinkKey = items[i];
      const drink = DRINKS[drinkKey];
      if (!drink) continue;

      const bx = startX + i * spacing;
      const colorInt = parseInt(drink.color.replace('#', ''), 16);
      const isDark = drink.color === '#6b1a2a';

      const bottleH = 80;
      const bottleW = 22;
      const bottleY = shelfY + 10;

      const body = scene.add.rectangle(bx, bottleY + bottleH / 2, bottleW, bottleH, colorInt)
        .setStrokeStyle(1, isDark ? 0x4a0a1a : 0xb8b080);
      this._content.add(body);
      this._handles.push(body);

      this._content.add(scene.add.rectangle(bx, bottleY - 4, 10, 18, colorInt)
        .setStrokeStyle(1, isDark ? 0x4a0a1a : 0xb8b080));
      this._content.add(scene.add.rectangle(bx, bottleY - 14, 8, 4,
        isDark ? 0x8b4513 : 0xc8b870));
      this._content.add(scene.add.rectangle(bx, bottleY + bottleH / 2 - 5, bottleW - 4, 20,
        isDark ? 0xd4c8a0 : 0x3a2a1a));

      this._spoutPositions.push(bx);

      this._content.add(scene.add.text(bx, shelfY + 112, drink.name, {
        fontFamily: 'monospace', fontSize: '9px', fontStyle: 'bold', color: '#cccccc',
        wordWrap: { width: 90 }, align: 'center',
      }).setOrigin(0.5));
      this._content.add(scene.add.text(bx, shelfY + 126, `$${drink.price}`, {
        fontFamily: 'monospace', fontSize: '8px', color: '#999999',
      }).setOrigin(0.5));

      const zone = scene.add.zone(bx, bottleY + bottleH / 2, bottleW + 20, bottleH + 20)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this._pouringDrinkKey = drinkKey;
        scene.events.emit('drink-pour-start', drinkKey, i, modal.pourRate);
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
      this._content.add(zone);
      this.drinkButtons.push(zone);
    }

    this._glassY = shelfY + 97;
    this._tapSpoutY = shelfY + 90 + 10;
  }

  // ─── MIXER / SODA ───────────────────────────────────

  _buildMixerButtons(items, modal, startX, py, spacing) {
    const scene = this.scene;
    const btnY = py + 70;
    const btnW = 90;
    const btnH = 80;

    for (let i = 0; i < items.length; i++) {
      const drinkKey = items[i];
      const drink = DRINKS[drinkKey];
      if (!drink) continue;

      const bx = startX + i * spacing;
      const colorInt = parseInt(drink.color.replace('#', ''), 16);

      const btn = scene.add.rectangle(bx, btnY + btnH / 2, btnW, btnH, 0x2a3a4a)
        .setStrokeStyle(2, 0x4a6a8a).setInteractive({ useHandCursor: true });
      this._handles.push(btn);

      btn.on('pointerdown', () => {
        this._pouringDrinkKey = drinkKey;
        scene.events.emit('drink-pour-start', drinkKey, i, modal.pourRate);
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

      this._content.add(btn);
      this.drinkButtons.push(btn);
      this._spoutPositions.push(bx);

      this._content.add(scene.add.circle(bx, btnY + 25, 12, colorInt));
      this._content.add(scene.add.text(bx, btnY + btnH / 2 + 8, drink.name, {
        fontFamily: 'monospace', fontSize: '9px', fontStyle: 'bold', color: '#cccccc',
        wordWrap: { width: btnW - 6 }, align: 'center',
      }).setOrigin(0.5));
    }

    this._glassY = btnY + btnH + 15;
    this._tapSpoutY = btnY + btnH - 5;
  }

  destroy() {
    super.destroy();
    this.glassGfx.destroy();
    this.pourStreamGfx.destroy();
    this._overflowGfx.destroy();
  }
}
