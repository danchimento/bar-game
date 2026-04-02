import { CANVAS_W, CANVAS_H } from '../../constants.js';

/**
 * HUD: floating messages only. No top status bar.
 */
export class HudUI {
  constructor(scene) {
    this.scene = scene;

    this.messageText = scene.add.text(CANVAS_W / 2, CANVAS_H - 30, '', {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#ffc107',
      backgroundColor: 'rgba(0,0,0,0.65)', padding: { x: 12, y: 4 },
    }).setOrigin(0.5).setDepth(50).setVisible(false);
  }

  update(hud, levelTimer, levelDuration) {
    if (hud.message) {
      this.messageText.setText(hud.message).setVisible(true);
    } else {
      this.messageText.setVisible(false);
    }
  }

  destroy() {
    this.messageText.destroy();
  }
}
