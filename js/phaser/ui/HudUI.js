import { CANVAS_W, CANVAS_H } from '../../constants.js';

/**
 * HUD: tips display (top-left), clock (top-right), floating messages (top-center).
 */
export class HudUI {
  constructor(scene) {
    this.scene = scene;

    this.tipsText = scene.add.text(14, 12, 'Tips: $0', {
      fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', color: '#4caf50',
    }).setDepth(50);

    this.clockText = scene.add.text(CANVAS_W - 14, 12, '6:00 PM', {
      fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', color: '#e0e0e0',
    }).setOrigin(1, 0).setDepth(50);

    this.messageText = scene.add.text(CANVAS_W / 2, CANVAS_H - 30, '', {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#ffc107',
      backgroundColor: 'rgba(0,0,0,0.65)', padding: { x: 12, y: 4 },
    }).setOrigin(0.5).setDepth(50).setVisible(false);

    // Pause button
    this.pauseBtn = scene.add.text(CANVAS_W / 2, 14, '⏸', {
      fontFamily: 'serif', fontSize: '20px', color: 'rgba(255,255,255,0.5)',
    }).setOrigin(0.5, 0).setDepth(50).setInteractive({ useHandCursor: true });
    this.pauseBtn.on('pointerdown', () => scene.events.emit('pause-tap'));
  }

  update(hud, levelTimer, levelDuration) {
    this.tipsText.setText(`Tips: $${Math.floor(hud.tips)}`);

    const clock = hud.formatClock(levelTimer || 0, levelDuration || 300);
    const isLate = hud.timeRemaining < 30;
    this.clockText.setText(clock).setColor(isLate ? '#f44336' : '#e0e0e0');

    if (hud.message) {
      this.messageText.setText(hud.message).setVisible(true);
    } else {
      this.messageText.setVisible(false);
    }
  }

  destroy() {
    this.tipsText.destroy();
    this.clockText.destroy();
    this.messageText.destroy();
    this.pauseBtn.destroy();
  }
}
