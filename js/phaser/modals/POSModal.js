import { CANVAS_W, CANVAS_H } from '../../constants.js';
import { DRINKS } from '../../data/menu.js';
import { BaseModal } from './BaseModal.js';

/**
 * POS terminal modal: seat selection + tab view.
 * Fully decoupled from bar state — only knows about tabs.
 */
export class POSModal extends BaseModal {
  constructor(scene) {
    super(scene, { closeEvent: 'pos-close', dimAlpha: 0.65 });
    this._posState = null;
    this._availableDrinks = [];
  }

  show(posState, availableDrinks) {
    this._posState = posState;
    this._availableDrinks = availableDrinks;
    super.show();
  }

  _build() {
    const scene = this.scene;
    const posState = this._posState;
    const availableDrinks = this._availableDrinks;

    const pw = 510, ph = 420;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2 + 20;

    // Panel (interactive to block dim clicks)
    this._content.add(scene.add.rectangle(CANVAS_W / 2, py + ph / 2, pw, ph, 0x1a2a1a)
      .setStrokeStyle(2, 0x4caf50)
      .setInteractive());

    // Title
    this._content.add(scene.add.text(CANVAS_W / 2, py + 20, 'P.O.S. Terminal', {
      fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: '#4caf50',
    }).setOrigin(0.5));

    // Close
    const closeBtn = scene.add.rectangle(px + pw - 25, py + 18, 30, 24, 0xf44336)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this._requestClose());
    this._content.add(closeBtn);
    this._content.add(scene.add.text(px + pw - 25, py + 18, 'X', {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5));

    if (posState.mode === 'SELECT_SEAT') {
      this._buildSeatSelect(posState, px, py, pw, ph);
    } else {
      this._buildSeatView(posState, availableDrinks, px, py, pw, ph);
    }
  }

  _buildSeatSelect(posState, px, py, pw, ph) {
    const scene = this.scene;
    const posTab = posState.tab;
    const barMargin = 40;
    const barLeft = px + barMargin;
    const barW = pw - barMargin * 2;
    const barY = py + 160;
    const seatR = 28;
    const seatCy = barY - seatR - 10;

    // Mini bar
    this._content.add(scene.add.rectangle(px + pw / 2, barY, barW, 20, 0x3a2a1a));

    // Seat circles
    const bl = this.scene.barLayout;
    const seats = bl.seats;
    for (let i = 0; i < seats.length; i++) {
      const t = (seats[i].x - bl.barLeft) / (bl.barRight - bl.barLeft);
      const sx = barLeft + t * barW;
      const tab = posTab.get(i) || [];
      const hasTab = tab.length > 0;

      const circle = scene.add.circle(sx, seatCy, seatR, hasTab ? 0x2a4a2a : 0x2a2a2a)
        .setStrokeStyle(2, hasTab ? 0x4caf50 : 0x555555)
        .setInteractive({ useHandCursor: true });
      circle.on('pointerdown', () => {
        scene.events.emit('pos-select-seat', i);
      });
      this._content.add(circle);

      // Seat number
      this._content.add(scene.add.text(sx, seatCy - 6, `${i + 1}`, {
        fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5));

      // Tab info
      const info = hasTab ? `${tab.length} item${tab.length > 1 ? 's' : ''}` : '\u2014';
      this._content.add(scene.add.text(sx, seatCy + 12, info, {
        fontFamily: 'monospace', fontSize: '9px', color: hasTab ? '#4caf50' : '#666666',
      }).setOrigin(0.5));
    }
  }

  _buildSeatView(posState, availableDrinks, px, py, pw, ph) {
    const scene = this.scene;
    const seatId = posState.selectedSeat;
    const tab = posState.tab.get(seatId) || [];

    // Back button
    const backBtn = scene.add.rectangle(px + 45, py + 52, 60, 25, 0x444444)
      .setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => scene.events.emit('pos-back'));
    this._content.add(backBtn);
    this._content.add(scene.add.text(px + 45, py + 52, '< Back', {
      fontFamily: 'monospace', fontSize: '11px', color: '#cccccc',
    }).setOrigin(0.5));

    // Seat title
    this._content.add(scene.add.text(px + pw / 2, py + 52, `Seat ${seatId + 1}`, {
      fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: '#4caf50',
    }).setOrigin(0.5));

    // Tab items
    let total = 0;
    for (let i = 0; i < tab.length; i++) {
      const item = tab[i];
      total += item.price;
      const iy = py + 85 + i * 18;
      const drink = DRINKS[item.drink];
      const txt = scene.add.text(px + 30, iy, `${drink?.name || item.drink}  $${item.price}`, {
        fontFamily: 'monospace', fontSize: '11px', color: '#ffffff',
      }).setInteractive({ useHandCursor: true });
      txt.on('pointerdown', () => scene.events.emit('pos-remove-item', seatId, i));
      this._content.add(txt);
    }

    // Total
    const totalY = py + 85 + Math.max(tab.length, 1) * 18 + 5;
    this._content.add(scene.add.text(px + 30, totalY, `Total: $${total}`, {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#4caf50',
    }));

    // Add drinks grid
    const drinksY = py + 180;
    const btnW = 105, btnH = 55, gap = 8, cols = 4;
    for (let i = 0; i < availableDrinks.length; i++) {
      const drinkKey = availableDrinks[i];
      const drink = DRINKS[drinkKey];
      if (!drink) continue;

      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = px + 20 + col * (btnW + gap) + btnW / 2;
      const by = drinksY + row * (btnH + gap) + btnH / 2;

      const btn = scene.add.rectangle(bx, by, btnW, btnH, 0x3a3025)
        .setStrokeStyle(1, 0x8a7a6a).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => scene.events.emit('pos-add-drink', seatId, drinkKey));
      this._content.add(btn);

      this._content.add(scene.add.text(bx, by - 6, drink.name, {
        fontFamily: 'monospace', fontSize: '9px', fontStyle: 'bold', color: '#cccccc',
        wordWrap: { width: btnW - 10 }, align: 'center',
      }).setOrigin(0.5));
      this._content.add(scene.add.text(bx, by + 14, `$${drink.price}`, {
        fontFamily: 'monospace', fontSize: '9px', color: '#4caf50',
      }).setOrigin(0.5));
    }

    // Print check button
    const printX = px + pw - 90;
    const printY = py + ph - 35;
    const printBtn = scene.add.rectangle(printX, printY, 140, 40, 0x4caf50)
      .setInteractive({ useHandCursor: true });
    printBtn.on('pointerdown', () => scene.events.emit('pos-print-check', seatId));
    this._content.add(printBtn);
    this._content.add(scene.add.text(printX, printY, 'Print Check', {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5));
  }
}
