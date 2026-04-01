import { CANVAS_W, CANVAS_H } from '../../constants.js';
import { GLASSES } from '../../data/menu.js';

/**
 * Glass type selection modal.
 */
export class GlassModal {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(70).setVisible(false);
    this._build();
  }

  _build() {
    const glassTypes = Object.keys(GLASSES);
    const btnW = 120, btnH = 100, gap = 25;
    const totalW = glassTypes.length * btnW + (glassTypes.length - 1) * gap;
    const pw = totalW + 60;
    const ph = 200;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;

    // Dim overlay
    const dim = this.scene.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x000000, 0.6)
      .setInteractive();
    dim.on('pointerdown', (ptr) => {
      const x = ptr.x, y = ptr.y;
      if (x < px || x > px + pw || y < py || y > py + ph) this.hide();
    });
    this.container.add(dim);

    // Panel
    const panel = this.scene.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, pw, ph, 0x1a2a2a)
      .setStrokeStyle(3, 0x5a8a8a);
    this.container.add(panel);

    // Title
    this.container.add(this.scene.add.text(CANVAS_W / 2, py + 20, 'Select Glass', {
      fontFamily: 'monospace', fontSize: '18px', fontStyle: 'bold', color: '#88aacc',
    }).setOrigin(0.5));

    this.container.add(this.scene.add.text(CANVAS_W / 2, py + 42, 'Choose the right glass for the drink', {
      fontFamily: 'monospace', fontSize: '11px', color: '#888888',
    }).setOrigin(0.5));

    // Glass buttons
    const startX = px + (pw - totalW) / 2;
    const btnY = py + 65;
    const spriteMap = { PINT: 'glass_pint', WINE_GLASS: 'glass_wine', PLASTIC_CUP: 'glass_cup' };

    for (let i = 0; i < glassTypes.length; i++) {
      const key = glassTypes[i];
      const glass = GLASSES[key];
      const bx = startX + i * (btnW + gap) + btnW / 2;

      const btn = this.scene.add.rectangle(bx, btnY + btnH / 2, btnW, btnH, 0x3a3025)
        .setStrokeStyle(2, 0x8a7a6a).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        this.scene.events.emit('glass-selected', key);
        this.hide();
      });
      this.container.add(btn);

      // Glass icon sprite
      if (spriteMap[key]) {
        this.container.add(
          this.scene.add.image(bx, btnY + 35, spriteMap[key]).setScale(0.8)
        );
      }

      // Name
      this.container.add(this.scene.add.text(bx, btnY + btnH - 15, glass.name, {
        fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#cccccc',
      }).setOrigin(0.5));
    }

    // Close button
    const closeBtn = this.scene.add.rectangle(px + pw - 25, py + 18, 30, 24, 0xf44336)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hide());
    this.container.add(closeBtn);
    this.container.add(this.scene.add.text(px + pw - 25, py + 18, 'X', {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5));
  }

  show() { this.container.setVisible(true); }
  hide() { this.container.setVisible(false); }
  get visible() { return this.container.visible; }

  destroy() { this.container.destroy(true); }
}
