import { CANVAS_W, CANVAS_H } from '../../constants.js';
import { GARNISHES, MIXER_DRINKS, DRINKS } from '../../data/menu.js';
import { BaseModal } from './BaseModal.js';

/**
 * Prep station modal: ice, garnishes, soda gun (water).
 */
export class PrepModal extends BaseModal {
  constructor(scene) {
    super(scene, { closeEvent: 'prep-close', dimAlpha: 0.65 });
    this._carriedGlass = null;
  }

  show(carriedGlass) {
    this._carriedGlass = carriedGlass;
    super.show();
  }

  _build() {
    const scene = this.scene;
    const carriedGlass = this._carriedGlass;
    const pw = 460, ph = 320;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;

    // Panel background (interactive to block dim clicks)
    this._content.add(scene.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, pw, ph, 0x1a2a1a)
      .setStrokeStyle(2, 0x4a8a4a)
      .setInteractive());

    // Title
    this._content.add(scene.add.text(CANVAS_W / 2, py + 20, 'Prep Station', {
      fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: '#88cc88',
    }).setOrigin(0.5));

    // Row 1: Ice
    const iceY = py + 60;
    this._addButton(px + 60, iceY, 90, 50, '\u2744\ufe0f Ice', () => {
      scene.events.emit('prep-ice');
    }, carriedGlass?.ice ? 0x2a4a2a : 0x3a3025);

    // Row 2: Garnishes
    const garnishKeys = Object.keys(GARNISHES);
    const gY = py + 130;
    const gBtnW = 80, gGap = 10;
    for (let i = 0; i < garnishKeys.length; i++) {
      const key = garnishKeys[i];
      const garnish = GARNISHES[key];
      const bx = px + 30 + i * (gBtnW + gGap) + gBtnW / 2;
      const added = carriedGlass?.garnishes?.includes(key);
      this._addButton(bx, gY + 30, gBtnW, 55,
        `${garnish.icon}\n${garnish.name}`,
        () => scene.events.emit('prep-garnish', key),
        added ? 0x2a4a2a : 0x3a3025,
        added ? 0x4caf50 : 0x8a7a6a);
    }

    // Row 3: Mixer (soda gun)
    const mixY = py + 225;
    for (let i = 0; i < MIXER_DRINKS.length; i++) {
      const key = MIXER_DRINKS[i];
      const drink = DRINKS[key];
      const bx = px + 70 + i * 100;
      const btn = scene.add.rectangle(bx, mixY + 30, 90, 50, 0x1a3a5a)
        .setStrokeStyle(2, 0x4a9ad4).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        scene.events.emit('prep-mixer-start', key);
      });
      this._content.add(btn);
      this._content.add(scene.add.text(bx, mixY + 30, `\ud83d\udca7 ${drink?.name || key}`, {
        fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#6ab4e8',
      }).setOrigin(0.5));
    }

    // Close button
    const closeBtn = scene.add.rectangle(px + pw - 25, py + 18, 30, 24, 0xf44336)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this._requestClose());
    this._content.add(closeBtn);
    this._content.add(scene.add.text(px + pw - 25, py + 18, 'X', {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5));
  }

  _addButton(x, y, w, h, label, onClick, fillColor = 0x3a3025, strokeColor = 0x8a7a6a) {
    const btn = this.scene.add.rectangle(x, y, w, h, fillColor)
      .setStrokeStyle(2, strokeColor).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', onClick);
    this._content.add(btn);
    this._content.add(this.scene.add.text(x, y, label, {
      fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#cccccc',
      align: 'center',
    }).setOrigin(0.5));
  }
}
