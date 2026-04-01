import { CANVAS_W, CANVAS_H } from '../../constants.js';
import { DRINKS } from '../../data/menu.js';

/**
 * Drink selection and pouring modal. Handles beer taps, wine, and mixers.
 * Hold-to-pour: pointerdown starts pour, pointerup stops.
 */
export class DrinkModal {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(70).setVisible(false);
    this.drinkButtons = [];
  }

  show(drinkModalState) {
    this._rebuild(drinkModalState);
    this.container.setVisible(true);
  }

  hide() {
    this.container.setVisible(false);
    this.container.removeAll(true);
    this.drinkButtons = [];
  }

  get visible() { return this.container.visible; }

  _rebuild(modal) {
    this.container.removeAll(true);
    this.drinkButtons = [];

    const items = modal.items;
    if (!items.length) return;

    const isBeer = modal.type === 'beer';
    const btnW = isBeer ? 70 : 110;
    const btnH = isBeer ? 180 : 100;
    const gap = isBeer ? 20 : 20;
    const totalBtnsW = items.length * btnW + (items.length - 1) * gap;
    const pw = Math.max(totalBtnsW + 120, 340);
    const ph = isBeer ? 400 : 230;
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

    // Panel
    const bgColor = isBeer ? 0x2a1a0a : (modal.type === 'wine' ? 0x2a1020 : 0x0a1a2a);
    const borderColor = isBeer ? 0xd4a020 : (modal.type === 'wine' ? 0x8b1a4a : 0x4a9ad4);
    const panel = this.scene.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, pw, ph, bgColor)
      .setStrokeStyle(2, borderColor);
    this.container.add(panel);

    // Title
    const titleColor = isBeer ? '#d4a020' : (modal.type === 'wine' ? '#d4708a' : '#6ab4e8');
    const titleText = isBeer ? 'Draft Beers' : (modal.type === 'wine' ? 'Wines' : 'Soda Gun');
    this.container.add(this.scene.add.text(CANVAS_W / 2, py + 20, titleText, {
      fontFamily: 'monospace', fontSize: '18px', fontStyle: 'bold', color: titleColor,
    }).setOrigin(0.5));

    this.container.add(this.scene.add.text(CANVAS_W / 2, py + 42, 'Hold to pour, release to stop', {
      fontFamily: 'monospace', fontSize: '11px', color: '#888888',
    }).setOrigin(0.5));

    // Drink buttons
    const startX = (CANVAS_W - totalBtnsW) / 2;
    const btnY = py + (isBeer ? 70 : 60);

    for (let i = 0; i < items.length; i++) {
      const drinkKey = items[i];
      const drink = DRINKS[drinkKey];
      if (!drink) continue;

      const bx = startX + i * (btnW + gap) + btnW / 2;
      const by = btnY + btnH / 2;

      const btn = this.scene.add.rectangle(bx, by, btnW, btnH, 0x3a3025)
        .setStrokeStyle(2, 0x8a7a6a).setInteractive({ useHandCursor: true });

      // Hold to pour
      btn.on('pointerdown', () => {
        this.scene.events.emit('drink-pour-start', drinkKey, i, modal.pourRate);
      });

      this.container.add(btn);
      this.drinkButtons.push(btn);

      // Color swatch
      const colorInt = parseInt(drink.color.replace('#', ''), 16);
      this.container.add(
        this.scene.add.rectangle(bx, by + btnH / 2 - 6, btnW - 10, 8, colorInt)
      );

      // Name
      this.container.add(this.scene.add.text(bx, by - 10, drink.name, {
        fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#cccccc',
        wordWrap: { width: btnW - 10 }, align: 'center',
      }).setOrigin(0.5));

      // Price
      this.container.add(this.scene.add.text(bx, by + 10, `$${drink.price}`, {
        fontFamily: 'monospace', fontSize: '9px', color: '#999999',
      }).setOrigin(0.5));
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

  destroy() { this.container.destroy(true); }
}
