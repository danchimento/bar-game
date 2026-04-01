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
    this.add.text(cx, 80, 'BAR RUSH', {
      fontFamily: 'monospace', fontSize: '42px', fontStyle: 'bold', color: '#e8c170',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(cx, 120, 'A bartending time-management game', {
      fontFamily: 'monospace', fontSize: '13px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // Level buttons
    const btnW = 200, btnH = 36, gap = 8;
    const startY = 160;

    LEVELS.forEach((level, i) => {
      const by = startY + i * (btnH + gap);

      const btn = this.add.rectangle(cx, by + btnH / 2, btnW, btnH, 0xe8c170, 1)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(2, 0xc8a150);

      this.add.text(cx, by + btnH / 2, `Day ${level.day}`, {
        fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: '#1a1a2e',
      }).setOrigin(0.5);

      btn.on('pointerover', () => btn.setFillStyle(0xffd54f));
      btn.on('pointerout', () => btn.setFillStyle(0xe8c170));
      btn.on('pointerdown', () => {
        this.scene.start('GamePlay', { levelIndex: i });
      });
    });

    // ── Components Menu ──
    const compY = startY + LEVELS.length * (btnH + gap) + 30;

    this.add.text(cx, compY, 'Components', {
      fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: '#888888',
    }).setOrigin(0.5);

    const components = [
      { key: 'beer_taps', label: 'Beer Taps' },
      { key: 'wine_bottles', label: 'Wine Bottles' },
    ];
    const compBtnW = 140, compBtnH = 34, compGap = 10;
    const totalCompW = components.length * compBtnW + (components.length - 1) * compGap;
    const compStartX = cx - totalCompW / 2 + compBtnW / 2;

    components.forEach((comp, i) => {
      const bx = compStartX + i * (compBtnW + compGap);
      const by = compY + 24;
      const btn = this.add.rectangle(bx, by, compBtnW, compBtnH, 0x3a3a5a)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(1, 0x6a6a8a);
      this.add.text(bx, by, comp.label, {
        fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#aaaacc',
      }).setOrigin(0.5);
      btn.on('pointerover', () => btn.setFillStyle(0x5a5a7a));
      btn.on('pointerout', () => btn.setFillStyle(0x3a3a5a));
      btn.on('pointerdown', () => {
        this.scene.start('ComponentViewer', { component: comp.key });
      });
    });

    // Instructions
    this.add.text(cx, CANVAS_H - 30, 'Tap guests and stations to serve drinks', {
      fontFamily: 'monospace', fontSize: '11px', color: '#666666',
    }).setOrigin(0.5);
  }
}
