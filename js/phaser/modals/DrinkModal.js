import { CANVAS_W, CANVAS_H } from '../../constants.js';
import { DRINKS } from '../../data/menu.js';

/**
 * Drink selection and pouring modal. Handles beer taps, wine, and mixers.
 * Beer mode: shows tap handles with colored handles — hold to pour, release to stop.
 * Wine/mixer mode: shows bottles/buttons.
 */
export class DrinkModal {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(70).setVisible(false);
    this.drinkButtons = [];
    this.pouringIndex = -1;
  }

  show(drinkModalState) {
    this._rebuild(drinkModalState);
    this.container.setVisible(true);
  }

  hide() {
    this.container.setVisible(false);
    this.container.removeAll(true);
    this.drinkButtons = [];
    this.pouringIndex = -1;
  }

  get visible() { return this.container.visible; }

  _rebuild(modal) {
    this.container.removeAll(true);
    this.drinkButtons = [];

    const items = modal.items;
    if (!items.length) return;

    const isBeer = modal.type === 'beer';
    const isWine = modal.type === 'wine';

    // Panel sizing
    const tapSpacing = isBeer ? 90 : 120;
    const totalW = items.length * tapSpacing;
    const pw = Math.max(totalW + 100, 340);
    const ph = isBeer ? 320 : 230;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;

    // Dim overlay
    const dim = this.scene.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x000000, 0.6)
      .setInteractive();
    dim.on('pointerdown', (ptr) => {
      const x = ptr.x, y = ptr.y;
      if (x < px || x > px + pw || y < py || y > py + ph) {
        this.scene.events.emit('drink-modal-close');
      }
    });
    this.container.add(dim);

    // Panel background
    const bgColor = isBeer ? 0x2a1a0a : (isWine ? 0x2a1020 : 0x0a1a2a);
    const borderColor = isBeer ? 0xd4a020 : (isWine ? 0x8b1a4a : 0x4a9ad4);
    const panel = this.scene.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, pw, ph, bgColor)
      .setStrokeStyle(2, borderColor);
    this.container.add(panel);

    // Title
    const titleColor = isBeer ? '#d4a020' : (isWine ? '#d4708a' : '#6ab4e8');
    const titleText = isBeer ? 'Draft Beers' : (isWine ? 'Wines' : 'Soda Gun');
    this.container.add(this.scene.add.text(CANVAS_W / 2, py + 20, titleText, {
      fontFamily: 'monospace', fontSize: '18px', fontStyle: 'bold', color: titleColor,
    }).setOrigin(0.5));

    this.container.add(this.scene.add.text(CANVAS_W / 2, py + 42, 'Hold to pour, release to stop', {
      fontFamily: 'monospace', fontSize: '11px', color: '#888888',
    }).setOrigin(0.5));

    // Draw items
    const startX = (CANVAS_W - totalW) / 2 + tapSpacing / 2;

    if (isBeer) {
      this._buildBeerTaps(items, modal, startX, py, tapSpacing);
    } else {
      this._buildDrinkButtons(items, modal, startX, py, tapSpacing, isWine);
    }

    // Close button
    const closeBtn = this.scene.add.rectangle(px + pw - 25, py + 18, 30, 24, 0xf44336)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.scene.events.emit('drink-modal-close'));
    this.container.add(closeBtn);
    this.container.add(this.scene.add.text(px + pw - 25, py + 18, 'X', {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5));
  }

  _buildBeerTaps(items, modal, startX, py, spacing) {
    const baseY = py + 80;

    // Tap bar (horizontal chrome bar the handles hang from)
    const barLeft = startX - spacing / 2 - 10;
    const barRight = startX + (items.length - 1) * spacing + spacing / 2 + 10;
    this.container.add(
      this.scene.add.rectangle((barLeft + barRight) / 2, baseY - 10, barRight - barLeft, 12, 0xaaaaaa)
        .setStrokeStyle(1, 0x888888)
    );

    for (let i = 0; i < items.length; i++) {
      const drinkKey = items[i];
      const drink = DRINKS[drinkKey];
      if (!drink) continue;

      const tx = startX + i * spacing;
      const colorInt = parseInt(drink.color.replace('#', ''), 16);

      // Tap mount (vertical pipe from bar)
      this.container.add(
        this.scene.add.rectangle(tx, baseY + 10, 8, 30, 0x999999)
      );

      // Tap handle (colored, tall rounded shape)
      const handle = this.scene.add.rectangle(tx, baseY + 50, 20, 50, colorInt)
        .setStrokeStyle(2, 0xffffff);
      this.container.add(handle);

      // Handle knob (top)
      this.container.add(
        this.scene.add.circle(tx, baseY + 24, 8, colorInt).setStrokeStyle(1, 0xffffff)
      );

      // Spout (chrome nozzle)
      this.container.add(
        this.scene.add.rectangle(tx, baseY + 82, 10, 14, 0xcccccc)
          .setStrokeStyle(1, 0x888888)
      );

      // Drip tray
      this.container.add(
        this.scene.add.rectangle(tx, baseY + 100, 50, 6, 0x444444)
          .setStrokeStyle(1, 0x666666)
      );

      // Name label
      this.container.add(this.scene.add.text(tx, baseY + 120, drink.name, {
        fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#cccccc',
        wordWrap: { width: 80 }, align: 'center',
      }).setOrigin(0.5));

      // Price
      this.container.add(this.scene.add.text(tx, baseY + 136, `$${drink.price}`, {
        fontFamily: 'monospace', fontSize: '9px', color: '#999999',
      }).setOrigin(0.5));

      // Interactive zone covering the whole tap area
      const zone = this.scene.add.zone(tx, baseY + 50, 60, 140)
        .setInteractive({ useHandCursor: true });

      zone.on('pointerdown', () => {
        this.scene.events.emit('drink-pour-start', drinkKey, i, modal.pourRate);
        // Visual feedback: highlight handle
        handle.setStrokeStyle(3, 0xffd54f);
      });
      zone.on('pointerup', () => {
        handle.setStrokeStyle(2, 0xffffff);
      });
      zone.on('pointerout', () => {
        handle.setStrokeStyle(2, 0xffffff);
      });

      this.container.add(zone);
      this.drinkButtons.push(zone);
    }
  }

  _buildDrinkButtons(items, modal, startX, py, spacing, isWine) {
    const btnW = 100;
    const btnH = 90;
    const btnY = py + 80;

    for (let i = 0; i < items.length; i++) {
      const drinkKey = items[i];
      const drink = DRINKS[drinkKey];
      if (!drink) continue;

      const bx = startX + i * spacing;
      const colorInt = parseInt(drink.color.replace('#', ''), 16);

      const btn = this.scene.add.rectangle(bx, btnY + btnH / 2, btnW, btnH, 0x3a3025)
        .setStrokeStyle(2, 0x8a7a6a).setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        this.scene.events.emit('drink-pour-start', drinkKey, i, modal.pourRate);
        btn.setStrokeStyle(3, 0xffd54f);
      });
      btn.on('pointerup', () => btn.setStrokeStyle(2, 0x8a7a6a));
      btn.on('pointerout', () => btn.setStrokeStyle(2, 0x8a7a6a));

      this.container.add(btn);
      this.drinkButtons.push(btn);

      // Color indicator
      this.container.add(
        this.scene.add.rectangle(bx, btnY + btnH - 8, btnW - 10, 12, colorInt)
      );

      // Icon
      this.container.add(this.scene.add.text(bx, btnY + 20, isWine ? '\uD83C\uDF77' : '\uD83E\uDD64', {
        fontFamily: 'serif', fontSize: '24px',
      }).setOrigin(0.5));

      // Name
      this.container.add(this.scene.add.text(bx, btnY + btnH / 2, drink.name, {
        fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#cccccc',
        wordWrap: { width: btnW - 10 }, align: 'center',
      }).setOrigin(0.5));

      // Price
      this.container.add(this.scene.add.text(bx, btnY + btnH / 2 + 16, `$${drink.price}`, {
        fontFamily: 'monospace', fontSize: '9px', color: '#999999',
      }).setOrigin(0.5));
    }
  }

  destroy() { this.container.destroy(true); }
}
