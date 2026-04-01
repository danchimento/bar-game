import { CANVAS_W, CANVAS_H } from '../../constants.js';

/**
 * Pause menu overlay: resume + quit buttons.
 */
export class PauseUI {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(70).setVisible(false);
    this._quitConfirm = false;
    this._build();
  }

  _build() {
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;
    const pw = 300, ph = 250;
    const left = cx - pw / 2, top = cy - ph / 2;

    // Dim overlay (full screen)
    const dim = this.scene.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x000000, 0.7)
      .setInteractive(); // blocks clicks behind
    this.container.add(dim);

    // Panel
    const panel = this.scene.add.rectangle(cx, cy, pw, ph, 0x252540)
      .setStrokeStyle(2, 0xe8c170);
    this.container.add(panel);

    // Title
    const title = this.scene.add.text(cx, top + 30, 'Paused', {
      fontFamily: 'monospace', fontSize: '22px', fontStyle: 'bold', color: '#e8c170',
    }).setOrigin(0.5);
    this.container.add(title);

    // Resume button
    const resumeBtn = this.scene.add.rectangle(cx, top + 97, 200, 44, 0xe8c170)
      .setInteractive({ useHandCursor: true });
    const resumeText = this.scene.add.text(cx, top + 97, 'Resume', {
      fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: '#1a1a2e',
    }).setOrigin(0.5);
    resumeBtn.on('pointerdown', () => this.scene.events.emit('resume'));
    this.container.add(resumeBtn);
    this.container.add(resumeText);

    // Quit button
    this.quitBtn = this.scene.add.rectangle(cx, top + 157, 200, 44, 0x555555)
      .setInteractive({ useHandCursor: true });
    this.quitText = this.scene.add.text(cx, top + 157, 'Quit Day', {
      fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: '#e0e0e0',
    }).setOrigin(0.5);

    this.quitBtn.on('pointerdown', () => {
      if (this._quitConfirm) {
        this.scene.events.emit('quit-to-title');
      } else {
        this._quitConfirm = true;
        this.quitBtn.setFillStyle(0xc62828);
        this.quitText.setText('Tap to Confirm');
      }
    });
    this.container.add(this.quitBtn);
    this.container.add(this.quitText);
  }

  show() {
    this._quitConfirm = false;
    this.quitBtn.setFillStyle(0x555555);
    this.quitText.setText('Quit Day');
    this.container.setVisible(true);
  }

  hide() {
    this.container.setVisible(false);
  }

  destroy() {
    this.container.destroy(true);
  }
}
