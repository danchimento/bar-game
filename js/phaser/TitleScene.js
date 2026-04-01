/* global Phaser */
import { CANVAS_W, CANVAS_H } from '../constants.js';
import { LEVELS } from '../data/levels.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const cx = CANVAS_W / 2;

    // Background
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Title
    this.add.text(cx, 120, 'BAR RUSH', {
      fontFamily: 'monospace', fontSize: '48px', fontStyle: 'bold', color: '#e8c170',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(cx, 170, 'A bartending time-management game', {
      fontFamily: 'monospace', fontSize: '14px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // Level buttons
    const btnW = 200, btnH = 44, gap = 12;
    const startY = 240;

    LEVELS.forEach((level, i) => {
      const by = startY + i * (btnH + gap);

      const btn = this.add.rectangle(cx, by + btnH / 2, btnW, btnH, 0xe8c170, 1)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(2, 0xc8a150);

      this.add.text(cx, by + btnH / 2, `Day ${level.day}`, {
        fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: '#1a1a2e',
      }).setOrigin(0.5);

      btn.on('pointerover', () => btn.setFillStyle(0xffd54f));
      btn.on('pointerout', () => btn.setFillStyle(0xe8c170));
      btn.on('pointerdown', () => {
        this.scene.start('GamePlay', { levelIndex: i });
      });
    });

    // Instructions
    this.add.text(cx, CANVAS_H - 30, 'Tap guests and stations to serve drinks', {
      fontFamily: 'monospace', fontSize: '11px', color: '#666666',
    }).setOrigin(0.5);
  }
}
