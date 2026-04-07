import { CANVAS_W, CANVAS_H } from '../../constants.js';
import { GLASSES, DRINKS } from '../../data/menu.js';
import { drawGlass } from '../utils/GlassRenderer.js';

/**
 * Glass cabinet interaction — split-panel design.
 * Left:  wooden cabinet with three shelves of glasses.
 *        Tapping a glass lifts it to show it's selected.
 * Right: interaction panel with selected type, "Take Glass", and "Step Away".
 */
export class GlassModal {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(70).setVisible(false);
    this._glassGfx = scene.add.graphics().setDepth(72);
    this._availableDrinks = [];
    this._shelves = [];
    this._selectedGlass = null; // { glassKey, shelfIdx, glassIdx }
    this._selectedText = null;
    this._takeBtn = null;
    this._takeBtnLabel = null;
  }

  show(availableDrinks) {
    this._availableDrinks = availableDrinks || Object.keys(DRINKS);
    this._selectedGlass = null;
    this._build();
    this.container.setVisible(true);
  }

  hide() {
    this.container.setVisible(false);
    this.container.removeAll(true);
    this._glassGfx.clear();
    this._shelves = [];
    this._selectedGlass = null;
    this._selectedText = null;
    this._takeBtn = null;
    this._takeBtnLabel = null;
  }

  get visible() { return this.container.visible; }

  update() {
    if (!this.container.visible) return;
    this._drawGlasses();
  }

  _build() {
    this.container.removeAll(true);
    this._shelves = [];
    const scene = this.scene;

    // ── Dim overlay ──
    const dim = scene.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x000000, 0.55)
      .setInteractive();
    dim.on('pointerdown', () => scene.events.emit('glass-modal-close'));
    this.container.add(dim);

    // ── LEFT: Glass Cabinet ──
    const cabinetW = 340, cabinetH = 320;
    const cabinetCX = Math.round(CANVAS_W * 0.32);
    const cabinetCY = Math.round(CANVAS_H / 2);
    const cabinetLeft = cabinetCX - cabinetW / 2;
    const cabinetTop = cabinetCY - cabinetH / 2;

    // Cabinet outer frame (dark wood)
    const cabinetBg = scene.add.rectangle(cabinetCX, cabinetCY, cabinetW, cabinetH, 0x2a1a0e)
      .setStrokeStyle(4, 0x5a3a20)
      .setInteractive(); // blocks clicks from reaching dim
    this.container.add(cabinetBg);

    // Cabinet inner area (recessed)
    const pad = 14;
    this.container.add(
      scene.add.rectangle(cabinetCX, cabinetCY, cabinetW - pad * 2, cabinetH - pad * 2, 0x1e140a)
        .setStrokeStyle(1, 0x3a2a18)
    );

    // Determine which glass types are available from current level drinks
    const drinkTypes = new Set();
    for (const dk of this._availableDrinks) {
      const d = DRINKS[dk];
      if (d) drinkTypes.add(d.type);
    }

    const shelfDefs = [
      { glassKey: 'PINT',        label: 'Pint Glasses',  drinkType: 'beer',  count: 5 },
      { glassKey: 'WINE_GLASS',  label: 'Wine Glasses',  drinkType: 'wine',  count: 4 },
      { glassKey: 'PLASTIC_CUP', label: 'Plastic Cups',  drinkType: 'water', count: 4 },
    ];

    const shelfAreaTop = cabinetTop + 30;
    const shelfH = (cabinetH - 50) / shelfDefs.length;
    const innerLeft = cabinetLeft + pad + 10;
    const innerRight = cabinetLeft + cabinetW - pad - 10;
    const shelfW = innerRight - innerLeft;

    for (let si = 0; si < shelfDefs.length; si++) {
      const def = shelfDefs[si];
      const shelfBaseY = shelfAreaTop + (si + 1) * shelfH - 8;
      const hasType = drinkTypes.has(def.drinkType);

      // Shelf label
      this.container.add(
        scene.add.text(cabinetCX, shelfAreaTop + si * shelfH + 14, def.label, {
          fontFamily: 'monospace', fontSize: '10px',
          color: hasType ? '#8a7a6a' : '#4a4040',
        }).setOrigin(0.5)
      );

      // Shelf plank
      this.container.add(
        scene.add.rectangle(cabinetCX, shelfBaseY, shelfW, 5, 0x5a4a30)
          .setStrokeStyle(1, 0x6a5a40)
      );

      const shelfData = { glassKey: def.glassKey, shelfY: shelfBaseY, active: hasType, glasses: [] };

      if (hasType) {
        const glassSpacing = Math.min(55, (shelfW - 20) / def.count);
        const totalGlassW = (def.count - 1) * glassSpacing;
        const glassStartX = cabinetCX - totalGlassW / 2;

        for (let gi = 0; gi < def.count; gi++) {
          const gx = glassStartX + gi * glassSpacing;
          const gy = shelfBaseY - 3;
          shelfData.glasses.push({ x: gx, y: gy });

          const zone = scene.add.zone(gx, gy - 25, 45, 55)
            .setInteractive({ useHandCursor: true });
          zone.on('pointerdown', () => this._selectGlass(def.glassKey, si, gi));
          this.container.add(zone);
        }
      }

      this._shelves.push(shelfData);
    }

    // ── RIGHT: Interaction Panel ──
    const panelW = 200, panelH = 220;
    const panelCX = Math.round(CANVAS_W * 0.72);
    const panelCY = Math.round(CANVAS_H / 2);
    const panelTop = panelCY - panelH / 2;

    const panelBg = scene.add.rectangle(panelCX, panelCY, panelW, panelH, 0x1e1e2e)
      .setStrokeStyle(2, 0x4a4a6a)
      .setInteractive(); // blocks clicks from reaching dim
    this.container.add(panelBg);

    // "Selected:" header
    let curY = panelTop + 30;
    this.container.add(
      scene.add.text(panelCX, curY, 'Selected:', {
        fontFamily: 'monospace', fontSize: '11px', color: '#888888',
      }).setOrigin(0.5)
    );
    curY += 24;

    // Selected glass name (updates dynamically)
    this._selectedText = scene.add.text(panelCX, curY, 'None', {
      fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: '#666666',
    }).setOrigin(0.5);
    this.container.add(this._selectedText);
    curY += 44;

    // "Take Glass" button (starts disabled)
    const btnW = 160, btnH = 40;
    this._takeBtn = scene.add.rectangle(panelCX, curY, btnW, btnH, 0x2a2a2a)
      .setStrokeStyle(1, 0x444444);
    this.container.add(this._takeBtn);
    this._takeBtnLabel = scene.add.text(panelCX, curY, 'Take Glass', {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#666666',
    }).setOrigin(0.5);
    this.container.add(this._takeBtnLabel);
    curY += btnH + 16;

    // "Step Away" button
    const stepBtn = scene.add.rectangle(panelCX, curY, btnW, btnH, 0x3a2a2a)
      .setStrokeStyle(1, 0x6a4a4a)
      .setInteractive({ useHandCursor: true });
    stepBtn.on('pointerover', () => stepBtn.setFillStyle(0x4a3a3a));
    stepBtn.on('pointerout', () => stepBtn.setFillStyle(0x3a2a2a));
    stepBtn.on('pointerdown', () => scene.events.emit('glass-modal-close'));
    this.container.add(stepBtn);
    this.container.add(
      scene.add.text(panelCX, curY, 'Step Away', {
        fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#cc8888',
      }).setOrigin(0.5)
    );
  }

  _selectGlass(glassKey, shelfIdx, glassIdx) {
    // Toggle: tap same glass to deselect
    if (this._selectedGlass &&
        this._selectedGlass.shelfIdx === shelfIdx &&
        this._selectedGlass.glassIdx === glassIdx) {
      this._selectedGlass = null;
    } else {
      this._selectedGlass = { glassKey, shelfIdx, glassIdx };
    }
    this._updatePanel();
  }

  _updatePanel() {
    if (!this._selectedText || !this._takeBtn) return;

    if (this._selectedGlass) {
      const info = GLASSES[this._selectedGlass.glassKey];
      this._selectedText.setText(info ? info.name : this._selectedGlass.glassKey);
      this._selectedText.setColor('#ffd54f');

      // Enable Take Glass
      this._takeBtn.setFillStyle(0x3a5a3a);
      this._takeBtn.setStrokeStyle(1, 0x5a8a5a);
      this._takeBtn.setInteractive({ useHandCursor: true });
      this._takeBtn.removeAllListeners();
      this._takeBtn.on('pointerover', () => this._takeBtn.setFillStyle(0x4a7a4a));
      this._takeBtn.on('pointerout', () => this._takeBtn.setFillStyle(0x3a5a3a));
      this._takeBtn.on('pointerdown', () => {
        this.scene.events.emit('glass-selected', this._selectedGlass.glassKey);
      });
      this._takeBtnLabel.setColor('#ffffff');
    } else {
      this._selectedText.setText('None');
      this._selectedText.setColor('#666666');

      // Disable Take Glass
      this._takeBtn.setFillStyle(0x2a2a2a);
      this._takeBtn.setStrokeStyle(1, 0x444444);
      this._takeBtn.disableInteractive();
      this._takeBtn.removeAllListeners();
      this._takeBtnLabel.setColor('#666666');
    }
  }

  _drawGlasses() {
    this._glassGfx.clear();

    for (let si = 0; si < this._shelves.length; si++) {
      const shelf = this._shelves[si];
      if (!shelf.active) continue;

      for (let gi = 0; gi < shelf.glasses.length; gi++) {
        const g = shelf.glasses[gi];
        let gy = g.y;

        const isSelected = this._selectedGlass &&
          this._selectedGlass.shelfIdx === si &&
          this._selectedGlass.glassIdx === gi;

        if (isSelected) {
          gy -= 10; // lift up to show highlight
          // Subtle golden glow under the lifted glass
          this._glassGfx.fillStyle(0xffd54f, 0.15);
          this._glassGfx.fillCircle(g.x, g.y - 5, 16);
        }

        drawGlass(this._glassGfx, g.x, gy, shelf.glassKey, 0, 0x888888, 1.5);
      }
    }
  }

  destroy() {
    this.container.destroy(true);
    this._glassGfx.destroy();
  }
}
