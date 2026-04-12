/* global Phaser */
import { CANVAS_W, CANVAS_H } from '../constants.js';
import { LEVELS } from '../data/levels.js';

/**
 * Title screen with a landing page and calendar overlay.
 * Landing page shows game title + "View Schedule" button.
 * Calendar shows October 2024 with playable shift days.
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // ── Landing page ──
    this.add.text(cx, cy - 80, 'BAR RUSH', {
      fontFamily: 'monospace', fontSize: '48px', fontStyle: 'bold', color: '#e8c170',
    }).setOrigin(0.5);

    this.add.text(cx, cy - 30, 'A bartending time-management game', {
      fontFamily: 'monospace', fontSize: '13px', color: '#888888',
    }).setOrigin(0.5);

    // View Schedule button
    const btnW = 220, btnH = 44;
    const btnBg = this.add.rectangle(cx, cy + 40, btnW, btnH, 0x3a2a1a)
      .setStrokeStyle(2, 0xe8c170)
      .setInteractive({ useHandCursor: true });
    const btnText = this.add.text(cx, cy + 40, 'View Schedule', {
      fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: '#e8c170',
    }).setOrigin(0.5);
    btnBg.on('pointerover', () => { btnBg.setFillStyle(0x4a3a2a); btnText.setColor('#ffe0a0'); });
    btnBg.on('pointerout', () => { btnBg.setFillStyle(0x3a2a1a); btnText.setColor('#e8c170'); });
    btnBg.on('pointerdown', () => this._showCalendar());

    // Layout toggle (bottom right)
    const currentMode = localStorage.getItem('barRushLayout') || 'landscape';
    const modeLabel = currentMode === 'portrait' ? 'Portrait' : 'Landscape';
    const layoutBtn = this.add.text(CANVAS_W - 80, CANVAS_H - 30,
      `Layout: ${modeLabel}`, {
        fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: '#8888bb',
        backgroundColor: '#2a2a4a', padding: { x: 8, y: 4 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    layoutBtn.on('pointerdown', () => {
      const newMode = currentMode === 'portrait' ? 'landscape' : 'portrait';
      localStorage.setItem('barRushLayout', newMode);
      window.location.reload();
    });
    layoutBtn.on('pointerover', () => layoutBtn.setColor('#bbbbee'));
    layoutBtn.on('pointerout', () => layoutBtn.setColor('#8888bb'));

    // Components button (bottom left)
    const compBtn = this.add.text(80, CANVAS_H - 30, 'Components', {
      fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: '#8888bb',
      backgroundColor: '#2a2a4a', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    compBtn.on('pointerdown', () => this._showComponentsMenu());
    compBtn.on('pointerover', () => compBtn.setColor('#bbbbee'));
    compBtn.on('pointerout', () => compBtn.setColor('#8888bb'));
  }

  _showCalendar() {
    const cx = CANVAS_W / 2;
    this._calendarOverlay = this.add.container(0, 0).setDepth(50);

    // Dim background
    const dim = this.add.rectangle(cx, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x000000, 0.65)
      .setInteractive();
    dim.on('pointerdown', () => this._closeCalendar());
    this._calendarOverlay.add(dim);

    this._buildCalendar(cx);
  }

  _closeCalendar() {
    if (this._calendarOverlay) {
      this._calendarOverlay.destroy(true);
      this._calendarOverlay = null;
    }
  }

  _buildCalendar(cx) {
    const overlay = this._calendarOverlay;

    // October 2024 — starts on Tuesday (dayOfWeek=2), 31 days
    const monthName = 'October 2024';
    const startDow = 2; // 0=Sun, 1=Mon, 2=Tue
    const daysInMonth = 31;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Calendar dimensions
    const calW = 700, calH = 410;
    const calX = cx - calW / 2;
    const calY = 50;
    const cellW = calW / 7;
    const headerH = 34;
    const dayHeaderH = 22;

    // Calendar background
    overlay.add(this.add.rectangle(cx, calY + calH / 2, calW + 4, calH + 4, 0xf5f0e0)
      .setStrokeStyle(2, 0xc8b890));

    // Month header
    overlay.add(this.add.rectangle(cx, calY + headerH / 2, calW, headerH, 0xe8c170));
    overlay.add(this.add.text(cx, calY + headerH / 2, monthName, {
      fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: '#2a1a0a',
    }).setOrigin(0.5));

    // Close button on calendar
    const closeX = calX + calW - 22;
    const closeY = calY + headerH / 2;
    const closeBtn = this.add.rectangle(closeX, closeY, 28, 24, 0xc04040)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this._closeCalendar());
    overlay.add(closeBtn);
    overlay.add(this.add.text(closeX, closeY, 'X', {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5));

    // Day-of-week headers
    for (let d = 0; d < 7; d++) {
      const dx = calX + d * cellW + cellW / 2;
      const dy = calY + headerH + dayHeaderH / 2;
      overlay.add(this.add.text(dx, dy, dayNames[d], {
        fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold',
        color: (d === 0 || d === 6) ? '#b08080' : '#6a5a40',
      }).setOrigin(0.5));
    }

    // Grid
    const gridGfx = this.add.graphics();
    overlay.add(gridGfx);
    const gridTop = calY + headerH + dayHeaderH;
    const gridH = calH - headerH - dayHeaderH;
    const rows = 5;
    const rowH = gridH / rows;

    gridGfx.lineStyle(1, 0xd4c8a0, 0.5);
    for (let r = 0; r <= rows; r++) {
      gridGfx.lineBetween(calX, gridTop + r * rowH, calX + calW, gridTop + r * rowH);
    }
    for (let c = 0; c <= 7; c++) {
      gridGfx.lineBetween(calX + c * cellW, gridTop, calX + c * cellW, gridTop + gridH);
    }

    // Shift times per level
    const shiftTimes = [
      '6pm - 10pm',
      '5pm - 9:30pm',
      '4pm - 9pm',
      '5pm - 10pm',
      '4pm - 9pm',
    ];

    // Day cells
    const circleGfx = this.add.graphics().setDepth(51);
    overlay.add(circleGfx);

    for (let day = 1; day <= daysInMonth; day++) {
      const cellIdx = (day - 1) + startDow;
      const col = cellIdx % 7;
      const row = Math.floor(cellIdx / 7);
      const cellCX = calX + col * cellW + cellW / 2;
      const cellTY = gridTop + row * rowH;
      const cellCY = cellTY + rowH / 2;

      // Day number (top-left of cell)
      const isWeekend = col === 0 || col === 6;
      overlay.add(this.add.text(calX + col * cellW + 4, cellTY + 2, `${day}`, {
        fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold',
        color: isWeekend ? '#c08080' : '#4a3a20',
      }));

      // Check if this day has a level
      const levelIdx = LEVELS.findIndex(l => l.day === day);
      if (levelIdx >= 0) {
        if (day === 1) {
          // Hand-drawn circle
          this._drawHandCircle(circleGfx, cellCX, cellCY, cellW * 0.42, rowH * 0.42);

          // "First day at bar!" — larger, vertically centered
          overlay.add(this.add.text(cellCX, cellCY + 4, 'First day\nat the bar!', {
            fontFamily: 'monospace', fontSize: '11px', fontStyle: 'italic',
            color: '#c04040', align: 'center', lineSpacing: 2,
          }).setOrigin(0.5));
        } else {
          // Shift time — larger, vertically centered
          const shiftLabel = shiftTimes[levelIdx] || '6pm - 10pm';
          overlay.add(this.add.text(cellCX, cellCY + 4, shiftLabel, {
            fontFamily: 'monospace', fontSize: '11px', color: '#2a6a2a',
            align: 'center',
          }).setOrigin(0.5));
        }

        // Clickable zone
        const zone = this.add.rectangle(cellCX, cellCY, cellW - 2, rowH - 2, 0xe8c170, 0)
          .setInteractive({ useHandCursor: true });
        zone.on('pointerover', () => zone.setFillStyle(0xe8c170, 0.15));
        zone.on('pointerout', () => zone.setFillStyle(0xe8c170, 0));
        zone.on('pointerdown', () => {
          this.scene.start('GamePlay', { levelIndex: levelIdx });
        });
        overlay.add(zone);

        // Green work indicator dot
        overlay.add(this.add.circle(calX + col * cellW + cellW - 8, cellTY + 6, 3, 0x4caf50));
      }
    }

    // Instruction text below calendar
    overlay.add(this.add.text(cx, calY + calH + 20, 'Tap a shift to start your day', {
      fontFamily: 'monospace', fontSize: '11px', color: '#666666',
    }).setOrigin(0.5));
  }

  _drawHandCircle(gfx, cx, cy, rx, ry) {
    gfx.lineStyle(2, 0xc04040, 0.8);
    gfx.beginPath();
    const segments = 40;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2 - 0.3;
      const wobbleX = Math.sin(angle * 3.7) * 1.5 + Math.cos(angle * 5.1) * 1.0;
      const wobbleY = Math.cos(angle * 4.3) * 1.2 + Math.sin(angle * 6.2) * 0.8;
      const px = cx + Math.cos(angle) * (rx + wobbleX);
      const py = cy + Math.sin(angle) * (ry + wobbleY);
      if (i === 0) gfx.moveTo(px, py);
      else gfx.lineTo(px, py);
    }
    gfx.strokePath();
  }

  _showComponentsMenu() {
    const overlay = this.add.container(0, 0).setDepth(80);

    const dim = this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x000000, 0.6)
      .setInteractive();
    dim.on('pointerdown', () => overlay.destroy(true));
    overlay.add(dim);

    const pw = 280, ph = 200;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2;

    overlay.add(this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, pw, ph, 0x2a2a4a)
      .setStrokeStyle(2, 0x6a6a8a));

    overlay.add(this.add.text(CANVAS_W / 2, py + 20, 'Components', {
      fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: '#aaaacc',
    }).setOrigin(0.5));

    const components = [
      { key: 'beer_taps', label: 'Beer Taps' },
      { key: 'wine_bottles', label: 'Wine Bottles' },
    ];

    components.forEach((comp, i) => {
      const by = py + 60 + i * 50;
      const btn = this.add.rectangle(CANVAS_W / 2, by + 18, 200, 36, 0x3a3a5a)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(1, 0x6a6a8a);
      overlay.add(btn);
      overlay.add(this.add.text(CANVAS_W / 2, by + 18, comp.label, {
        fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#ccccee',
      }).setOrigin(0.5));

      btn.on('pointerover', () => btn.setFillStyle(0x5a5a7a));
      btn.on('pointerout', () => btn.setFillStyle(0x3a3a5a));
      btn.on('pointerdown', () => {
        overlay.destroy(true);
        this.scene.start('ComponentViewer', { component: comp.key });
      });
    });

    const closeBtn = this.add.rectangle(px + pw - 20, py + 16, 26, 22, 0xf44336)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => overlay.destroy(true));
    overlay.add(closeBtn);
    overlay.add(this.add.text(px + pw - 20, py + 16, 'X', {
      fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5));
  }
}
