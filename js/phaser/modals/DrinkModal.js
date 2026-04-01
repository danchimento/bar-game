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
 */
export class DrinkModal {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(70).setVisible(false);
    this.drinkButtons = [];
    this.glassGfx = scene.add.graphics().setDepth(72);
    this.pourStreamGfx = scene.add.graphics().setDepth(71);
    this.noGlassText = null;
    this._fillLabel = null;

    // Glass slide state
    this._glassCurrentX = 0;  // animated X position
    this._glassTargetX = 0;   // where glass should be
    this._glassRestX = 0;     // resting position (left of taps)
    this._glassY = 0;         // fixed Y (bottom of glass)
    this._spoutPositions = []; // X positions of each tap spout
    this._pouringIndex = -1;
    this._handles = [];        // handle/bottle references for visual feedback
    this._isBeer = false;
    this._isWine = false;
  }

  show(drinkModalState) {
    this._pouringIndex = -1;
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
    this.glassGfx.clear();
    this.pourStreamGfx.clear();
    if (this.noGlassText) { this.noGlassText.destroy(); this.noGlassText = null; }
    if (this._fillLabel) { this._fillLabel.destroy(); this._fillLabel = null; }
  }

  get visible() { return this.container.visible; }

  /** Called each frame while visible — animates glass slide + pour stream + fill */
  update(barState, drinkModalState) {
    this.glassGfx.clear();
    this.pourStreamGfx.clear();
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

    // Animate glass X toward target (quick slide ~150ms feel)
    const slideSpeed = 800; // px/s
    const dx = this._glassTargetX - this._glassCurrentX;
    if (Math.abs(dx) > 1) {
      const step = Math.sign(dx) * Math.min(Math.abs(dx), slideSpeed * (1 / 60));
      this._glassCurrentX += step;
    } else {
      this._glassCurrentX = this._glassTargetX;
    }

    const gx = this._glassCurrentX;
    const gy = this._glassY;

    if (!glass) {
      if (!this.noGlassText || !this.noGlassText.active) {
        this.noGlassText = this.scene.add.text(this._glassRestX, gy - 30, 'Pick up a glass first!', {
          fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: '#ff6666',
          backgroundColor: '#1a1a2e', padding: { x: 6, y: 3 },
        }).setOrigin(0.5).setDepth(73);
      }
      this.noGlassText.setPosition(this._glassRestX, gy - 30).setVisible(true);
      if (this._fillLabel) this._fillLabel.setVisible(false);
      return;
    }

    if (this.noGlassText) this.noGlassText.setVisible(false);

    // Draw glass at current animated position
    const fillPct = glass.totalFill;
    const liquidColor = getLiquidColor(glass.layers);

    // Beer glass tilted slightly toward pour angle (~15° when under a tap)
    const underTap = this._pouringIndex >= 0 && barState.activePour;
    const tiltAngle = (underTap && this._isBeer) ? -0.22 : 0; // ~12.5° tilt

    if (tiltAngle !== 0) {
      // Save, translate, rotate, draw, restore via graphics transform
      // Phaser Graphics doesn't support rotation directly, so we draw at a slight visual offset
      // to simulate tilt: offset the top of the glass slightly right
      drawGlass(this.glassGfx, gx + 2, gy, glass.glassType, fillPct, liquidColor, 0.85);
    } else {
      drawGlass(this.glassGfx, gx, gy, glass.glassType, fillPct, liquidColor, 0.85);
    }

    // Fill label
    if (!this._fillLabel || !this._fillLabel.active) {
      this._fillLabel = this.scene.add.text(gx, gy + 8, '', {
        fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5).setDepth(73);
    }
    this._fillLabel.setText(`${Math.round(fillPct * 100)}%`).setPosition(gx, gy + 8).setVisible(true);

    // Pour stream from spout to glass
    if (barState.activePour && this._pouringIndex >= 0) {
      const pourColor = parseInt(
        (DRINKS[barState.activePour.drinkKey]?.color || '#f0c040').replace('#', ''), 16
      );
      const spoutX = this._spoutPositions[this._pouringIndex] || gx;
      const spoutY = this._isBeer ? (gy - 42) : (gy - 48);
      const glassTopY = gy - 20;
      const time = this.scene.time.now;

      this.pourStreamGfx.fillStyle(pourColor, 0.85);
      // Main stream
      this.pourStreamGfx.fillRect(spoutX - 1, spoutY, 2.5, glassTopY - spoutY);
      // Animated drip drops
      const dripPhase = (time % 180) / 180;
      for (let i = 0; i < 3; i++) {
        const t = (dripPhase + i * 0.33) % 1;
        const dropY = spoutY + t * (glassTopY - spoutY + 6);
        this.pourStreamGfx.fillCircle(spoutX + (i % 2 ? 1 : -1), dropY, 1.5);
      }
      // Splash at glass
      this.pourStreamGfx.fillStyle(pourColor, 0.4);
      this.pourStreamGfx.fillCircle(gx - 2, glassTopY + 2, 2);
      this.pourStreamGfx.fillCircle(gx + 2, glassTopY + 1, 1.5);
    }
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
    const pw = Math.max(totalW + 140, 380); // extra room for glass on left
    const ph = this._isBeer ? 310 : 280;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;

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
      this.scene.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, pw, ph, bgColor)
        .setStrokeStyle(2, borderColor)
    );

    // Title
    const titleColor = this._isBeer ? '#d4a020' : (this._isWine ? '#d4708a' : '#6ab4e8');
    const titleText = this._isBeer ? 'Draft Beers' : (this._isWine ? 'Wines' : 'Soda Gun');
    this.container.add(this.scene.add.text(CANVAS_W / 2, py + 18, titleText, {
      fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: titleColor,
    }).setOrigin(0.5));
    this.container.add(this.scene.add.text(CANVAS_W / 2, py + 36, 'Hold to pour, release to stop', {
      fontFamily: 'monospace', fontSize: '10px', color: '#888888',
    }).setOrigin(0.5));

    // Taps/bottles area starts offset to make room for glass rest area
    const tapsAreaLeft = px + 90;
    const startX = tapsAreaLeft + (pw - 90 - (totalW)) / 2 + spacing / 2;

    // Glass resting position (left of taps area)
    this._glassRestX = px + 50;
    this._glassY = py + ph - 55;
    this._glassCurrentX = this._glassRestX;
    this._glassTargetX = this._glassRestX;

    // "Your Glass" label
    this.container.add(this.scene.add.text(px + 50, py + ph - 22, 'Your Glass', {
      fontFamily: 'monospace', fontSize: '8px', color: '#666666',
    }).setOrigin(0.5));

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
    const baseY = py + 60;

    // Chrome bar
    const barLeft = startX - spacing / 2 - 8;
    const barRight = startX + (items.length - 1) * spacing + spacing / 2 + 8;
    this.container.add(
      this.scene.add.rectangle((barLeft + barRight) / 2, baseY - 8, barRight - barLeft, 10, 0xaaaaaa)
        .setStrokeStyle(1, 0x888888)
    );

    for (let i = 0; i < items.length; i++) {
      const drinkKey = items[i];
      const drink = DRINKS[drinkKey];
      if (!drink) continue;

      const tx = startX + i * spacing;
      const colorInt = parseInt(drink.color.replace('#', ''), 16);

      // Pipe from bar
      this.container.add(this.scene.add.rectangle(tx, baseY + 8, 6, 24, 0x999999));

      // Handle
      const handle = this.scene.add.rectangle(tx, baseY + 42, 18, 44, colorInt)
        .setStrokeStyle(2, 0xffffff);
      this.container.add(handle);
      this._handles.push(handle);

      // Knob
      this.container.add(this.scene.add.circle(tx, baseY + 19, 7, colorInt).setStrokeStyle(1, 0xffffff));

      // Spout
      this.container.add(this.scene.add.rectangle(tx, baseY + 70, 8, 12, 0xcccccc).setStrokeStyle(1, 0x888888));
      const spoutBottomY = baseY + 76;

      // Drip tray
      this.container.add(this.scene.add.rectangle(tx, baseY + 88, 44, 5, 0x444444).setStrokeStyle(1, 0x666666));

      // Record spout X position for glass to slide to
      this._spoutPositions.push(tx);

      // Name + price
      this.container.add(this.scene.add.text(tx, baseY + 105, drink.name, {
        fontFamily: 'monospace', fontSize: '9px', fontStyle: 'bold', color: '#cccccc',
        wordWrap: { width: 80 }, align: 'center',
      }).setOrigin(0.5));
      this.container.add(this.scene.add.text(tx, baseY + 118, `$${drink.price}`, {
        fontFamily: 'monospace', fontSize: '8px', color: '#999999',
      }).setOrigin(0.5));

      // Interactive zone
      const zone = this.scene.add.zone(tx, baseY + 45, 55, 120)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.scene.events.emit('drink-pour-start', drinkKey, i, modal.pourRate);
        handle.setStrokeStyle(3, 0xffd54f);
      });
      zone.on('pointerup', () => handle.setStrokeStyle(2, 0xffffff));
      zone.on('pointerout', () => handle.setStrokeStyle(2, 0xffffff));
      this.container.add(zone);
      this.drinkButtons.push(zone);
    }

    // Set glass Y to sit on drip tray level
    this._glassY = this._spoutPositions.length > 0 ? (py + 60 + 85) : this._glassY;
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

      // Bottle shape: body
      const body = this.scene.add.rectangle(bx, bottleY + bottleH / 2, bottleW, bottleH, colorInt)
        .setStrokeStyle(1, isDark ? 0x4a0a1a : 0xb8b080);
      this.container.add(body);
      this._handles.push(body);

      // Bottle neck (narrower)
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
        this.scene.events.emit('drink-pour-start', drinkKey, i, modal.pourRate);
        body.setStrokeStyle(2, 0xffd54f);
      });
      zone.on('pointerup', () => body.setStrokeStyle(1, isDark ? 0x4a0a1a : 0xb8b080));
      zone.on('pointerout', () => body.setStrokeStyle(1, isDark ? 0x4a0a1a : 0xb8b080));
      this.container.add(zone);
      this.drinkButtons.push(zone);
    }

    // Glass Y sits on the shelf
    this._glassY = shelfY + 97;
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
        this.scene.events.emit('drink-pour-start', drinkKey, i, modal.pourRate);
        btn.setStrokeStyle(3, 0xffd54f);
      });
      btn.on('pointerup', () => btn.setStrokeStyle(2, 0x4a6a8a));
      btn.on('pointerout', () => btn.setStrokeStyle(2, 0x4a6a8a));

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
  }

  destroy() {
    this.container.destroy(true);
    this.glassGfx.destroy();
    this.pourStreamGfx.destroy();
    if (this.noGlassText) this.noGlassText.destroy();
    if (this._fillLabel) this._fillLabel.destroy();
  }
}
