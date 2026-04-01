import { CANVAS_W, CANVAS_H, SEATS, BAR_LEFT, BAR_RIGHT } from '../../constants.js';
import { DRINKS } from '../../data/menu.js';

/**
 * POS terminal modal: seat selection + tab view.
 * Fully decoupled from bar state — only knows about tabs.
 */
export class POSModal {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(70).setVisible(false);
  }

  show(posState, availableDrinks) {
    this._rebuild(posState, availableDrinks);
    this.container.setVisible(true);
  }

  hide() {
    this.container.setVisible(false);
    this.container.removeAll(true);
  }

  get visible() { return this.container.visible; }

  _rebuild(posState, availableDrinks) {
    this.container.removeAll(true);

    const pw = 510, ph = 420;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2 + 20;

    // Dim
    const dim = this.scene.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x000000, 0.6)
      .setInteractive();
    dim.on('pointerdown', (ptr) => {
      if (ptr.x < px || ptr.x > px + pw || ptr.y < py || ptr.y > py + ph) {
        this.scene.events.emit('pos-close');
      }
    });
    this.container.add(dim);

    // Panel
    this.container.add(this.scene.add.rectangle(CANVAS_W / 2, py + ph / 2, pw, ph, 0x1a2a1a)
      .setStrokeStyle(2, 0x4caf50));

    // Title
    this.container.add(this.scene.add.text(CANVAS_W / 2, py + 20, 'P.O.S. Terminal', {
      fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: '#4caf50',
    }).setOrigin(0.5));

    // Close
    const closeBtn = this.scene.add.rectangle(px + pw - 25, py + 18, 30, 24, 0xf44336)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.scene.events.emit('pos-close'));
    this.container.add(closeBtn);
    this.container.add(this.scene.add.text(px + pw - 25, py + 18, 'X', {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5));

    if (posState.mode === 'SELECT_SEAT') {
      this._buildSeatSelect(posState, px, py, pw, ph);
    } else {
      this._buildSeatView(posState, availableDrinks, px, py, pw, ph);
    }
  }

  _buildSeatSelect(posState, px, py, pw, ph) {
    const posTab = posState.tab;
    const barMargin = 40;
    const barLeft = px + barMargin;
    const barW = pw - barMargin * 2;
    const barY = py + 160;
    const seatR = 28;
    const seatCy = barY - seatR - 10;

    // Mini bar
    this.container.add(
      this.scene.add.rectangle(px + pw / 2, barY, barW, 20, 0x3a2a1a)
    );

    // Seat circles
    for (let i = 0; i < SEATS.length; i++) {
      const t = (SEATS[i].x - BAR_LEFT) / (BAR_RIGHT - BAR_LEFT);
      const sx = barLeft + t * barW;
      const tab = posTab.get(i) || [];
      const hasTab = tab.length > 0;

      const circle = this.scene.add.circle(sx, seatCy, seatR, hasTab ? 0x2a4a2a : 0x2a2a2a)
        .setStrokeStyle(2, hasTab ? 0x4caf50 : 0x555555)
        .setInteractive({ useHandCursor: true });
      circle.on('pointerdown', () => {
        this.scene.events.emit('pos-select-seat', i);
      });
      this.container.add(circle);

      // Seat number
      this.container.add(this.scene.add.text(sx, seatCy - 6, `${i + 1}`, {
        fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5));

      // Tab info
      const info = hasTab ? `${tab.length} item${tab.length > 1 ? 's' : ''}` : '\u2014';
      this.container.add(this.scene.add.text(sx, seatCy + 12, info, {
        fontFamily: 'monospace', fontSize: '9px', color: hasTab ? '#4caf50' : '#666666',
      }).setOrigin(0.5));
    }
  }

  _buildSeatView(posState, availableDrinks, px, py, pw, ph) {
    const seatId = posState.selectedSeat;
    const tab = posState.tab.get(seatId) || [];

    // Back button
    const backBtn = this.scene.add.rectangle(px + 45, py + 52, 60, 25, 0x444444)
      .setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.events.emit('pos-back'));
    this.container.add(backBtn);
    this.container.add(this.scene.add.text(px + 45, py + 52, '< Back', {
      fontFamily: 'monospace', fontSize: '11px', color: '#cccccc',
    }).setOrigin(0.5));

    // Seat title
    this.container.add(this.scene.add.text(px + pw / 2, py + 52, `Seat ${seatId + 1}`, {
      fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: '#4caf50',
    }).setOrigin(0.5));

    // Tab items
    let total = 0;
    for (let i = 0; i < tab.length; i++) {
      const item = tab[i];
      total += item.price;
      const iy = py + 85 + i * 18;
      const drink = DRINKS[item.drink];
      const txt = this.scene.add.text(px + 30, iy, `${drink?.name || item.drink}  $${item.price}`, {
        fontFamily: 'monospace', fontSize: '11px', color: '#ffffff',
      }).setInteractive({ useHandCursor: true });
      txt.on('pointerdown', () => this.scene.events.emit('pos-remove-item', seatId, i));
      this.container.add(txt);
    }

    // Total
    const totalY = py + 85 + Math.max(tab.length, 1) * 18 + 5;
    this.container.add(this.scene.add.text(px + 30, totalY, `Total: $${total}`, {
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

      const btn = this.scene.add.rectangle(bx, by, btnW, btnH, 0x3a3025)
        .setStrokeStyle(1, 0x8a7a6a).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => this.scene.events.emit('pos-add-drink', seatId, drinkKey));
      this.container.add(btn);

      this.container.add(this.scene.add.text(bx, by - 6, drink.name, {
        fontFamily: 'monospace', fontSize: '9px', fontStyle: 'bold', color: '#cccccc',
        wordWrap: { width: btnW - 10 }, align: 'center',
      }).setOrigin(0.5));
      this.container.add(this.scene.add.text(bx, by + 14, `$${drink.price}`, {
        fontFamily: 'monospace', fontSize: '9px', color: '#4caf50',
      }).setOrigin(0.5));
    }

    // Print check button
    const printX = px + pw - 90;
    const printY = py + ph - 35;
    const printBtn = this.scene.add.rectangle(printX, printY, 140, 40, 0x4caf50)
      .setInteractive({ useHandCursor: true });
    printBtn.on('pointerdown', () => this.scene.events.emit('pos-print-check', seatId));
    this.container.add(printBtn);
    this.container.add(this.scene.add.text(printX, printY, 'Print Check', {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5));
  }

  destroy() { this.container.destroy(true); }
}
