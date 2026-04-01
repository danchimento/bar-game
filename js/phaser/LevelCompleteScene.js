/* global Phaser */
import { CANVAS_W, CANVAS_H } from '../constants.js';
import { LEVELS } from '../data/levels.js';

export class LevelCompleteScene extends Phaser.Scene {
  constructor() {
    super('LevelComplete');
  }

  init(data) {
    this.hud = data.hud;
    this.stats = data.stats;
    this.levelIndex = data.levelIndex;
  }

  create() {
    const cx = CANVAS_W / 2;
    this.cameras.main.setBackgroundColor('#000000');

    // Dim overlay
    this.add.rectangle(cx, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x000000, 0.85);

    // Title
    this.add.text(cx, 50, 'Shift Complete!', {
      fontFamily: 'monospace', fontSize: '28px', fontStyle: 'bold', color: '#e8c170',
    }).setOrigin(0.5);

    // Stars
    const stars = this.hud.stars || 0;
    const starStr = '\u2b50'.repeat(stars) + '\u2606'.repeat(3 - stars);
    this.add.text(cx, 90, starStr, {
      fontFamily: 'serif', fontSize: '32px', color: '#ffd54f',
    }).setOrigin(0.5);

    // Tips + Revenue
    this.add.text(cx, 130, `Tips: $${Math.floor(this.hud.tips)}`, {
      fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold', color: '#4caf50',
    }).setOrigin(0.5);

    this.add.text(cx, 155, `Revenue: $${Math.floor(this.hud.revenue || 0)}`, {
      fontFamily: 'monospace', fontSize: '13px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // Stats
    const s = this.stats;
    const statsData = [
      { label: 'Drinks Served', value: `${s.drinksServedCorrect || 0}`, color: '#4caf50' },
      { label: 'Drinks Rejected', value: `${s.drinksRejected || 0}`, color: '#f44336' },
      { label: 'Guests Served', value: `${s.guestsServed || 0}`, color: '#8bc34a' },
      { label: 'Angry Walkouts', value: `${s.guestsAngry || 0}`, color: (s.guestsAngry || 0) === 0 ? '#4caf50' : '#f44336' },
    ];

    let sy = 200;
    for (const stat of statsData) {
      this.add.text(cx - 100, sy, stat.label, {
        fontFamily: 'monospace', fontSize: '12px', color: '#cccccc',
      });
      this.add.text(cx + 100, sy, stat.value, {
        fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: stat.color,
      }).setOrigin(1, 0);
      sy += 24;
    }

    // Retry button
    const retryBtn = this.add.rectangle(cx - 90, 420, 160, 42, 0x555555)
      .setInteractive({ useHandCursor: true }).setStrokeStyle(2, 0x888888);
    this.add.text(cx - 90, 420, 'Retry', {
      fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: '#e0e0e0',
    }).setOrigin(0.5);
    retryBtn.on('pointerdown', () => {
      this.scene.start('GamePlay', { levelIndex: this.levelIndex });
    });

    // Next Day button
    if (this.levelIndex < LEVELS.length - 1) {
      const nextBtn = this.add.rectangle(cx + 90, 420, 160, 42, 0xe8c170)
        .setInteractive({ useHandCursor: true }).setStrokeStyle(2, 0xc8a150);
      this.add.text(cx + 90, 420, 'Next Day', {
        fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: '#1a1a2e',
      }).setOrigin(0.5);
      nextBtn.on('pointerdown', () => {
        this.scene.start('GamePlay', { levelIndex: this.levelIndex + 1 });
      });
    }
  }
}
