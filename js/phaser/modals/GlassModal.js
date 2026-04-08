import { GLASSES, DRINKS } from '../../data/menu.js';
import { drawGlass } from '../utils/GlassRenderer.js';
import { BaseModal } from './BaseModal.js';

/**
 * Glass cabinet interaction — split-panel design.
 * Left:  wooden cabinet with three shelves of glasses.
 *        Tapping a glass lifts it with a smooth animation.
 * Right: interaction panel with selected type, "Take Glass", and "Step Away".
 *
 * Both panels are equal width/height, side by side with small padding.
 * Opens with a zoom animation from the station position; closes in reverse.
 */
export class GlassModal extends BaseModal {
  constructor(scene) {
    super(scene, { closeEvent: 'glass-modal-close', dimAlpha: 0.65 });

    this._availableDrinks = [];
    this._shelves = [];
    this._selectedGlass = null;
    this._selectedText = null;
    this._takeBtn = null;
    this._takeBtnLabel = null;
    this._glassGfx = null;

    // Panel layout (used for zoom animation sizing)
    this._panelW = 280;
    this._panelH = 310;
    this._gap = 12;
    this._contentW = this._panelW * 2 + this._gap; // 572
    this._contentH = this._panelH;                  // 310
  }

  show(availableDrinks, originX, originY, originW, originH) {
    this._availableDrinks = availableDrinks || Object.keys(DRINKS);
    this._selectedGlass = null;
    super.show({
      origin: { x: originX, y: originY, w: originW, h: originH },
    });
  }

  _build() {
    this._shelves = [];
    const scene = this.scene;

    const panelW = this._panelW;
    const panelH = this._panelH;
    const totalW = this._contentW;

    // Local coordinates: (0,0) = center of content
    const leftCX = -totalW / 2 + panelW / 2;
    const rightCX = totalW / 2 - panelW / 2;

    // ── LEFT: Glass Cabinet ──
    const cabinetLeft = leftCX - panelW / 2;
    const cabinetTop = -panelH / 2;

    const cabinetBg = scene.add.rectangle(leftCX, 0, panelW, panelH, 0x2a1a0e)
      .setStrokeStyle(4, 0x5a3a20)
      .setInteractive(); // blocks clicks reaching dim
    this._content.add(cabinetBg);

    const pad = 14;
    this._content.add(
      scene.add.rectangle(leftCX, 0, panelW - pad * 2, panelH - pad * 2, 0x1e140a)
        .setStrokeStyle(1, 0x3a2a18),
    );

    // Available glass types from current level
    const drinkTypes = new Set();
    for (const dk of this._availableDrinks) {
      const d = DRINKS[dk];
      if (d) drinkTypes.add(d.type);
    }

    const shelfDefs = [
      { glassKey: 'PINT',        drinkType: 'beer',  count: 5 },
      { glassKey: 'WINE_GLASS',  drinkType: 'wine',  count: 4 },
      { glassKey: 'PLASTIC_CUP', drinkType: 'water', count: 4 },
    ];

    const shelfAreaTop = cabinetTop + 20;
    const shelfH = (panelH - 30) / shelfDefs.length;
    const innerLeft = cabinetLeft + pad + 10;
    const innerRight = cabinetLeft + panelW - pad - 10;
    const shelfW = innerRight - innerLeft;

    for (let si = 0; si < shelfDefs.length; si++) {
      const def = shelfDefs[si];
      const shelfBaseY = shelfAreaTop + (si + 1) * shelfH - 8;
      const hasType = drinkTypes.has(def.drinkType);

      // Shelf plank
      this._content.add(
        scene.add.rectangle(leftCX, shelfBaseY, shelfW, 5, 0x5a4a30)
          .setStrokeStyle(1, 0x6a5a40),
      );

      const shelfData = {
        glassKey: def.glassKey, shelfY: shelfBaseY,
        active: hasType, shelfIdx: si, glasses: [],
      };

      if (hasType) {
        const glassSpacing = Math.min(55, (shelfW - 20) / def.count);
        const totalGlassW = (def.count - 1) * glassSpacing;
        const glassStartX = leftCX - totalGlassW / 2;

        for (let gi = 0; gi < def.count; gi++) {
          const gx = glassStartX + gi * glassSpacing;
          const gy = shelfBaseY - 3;
          shelfData.glasses.push({ x: gx, y: gy, glassIdx: gi, liftY: 0 });

          const zone = scene.add.zone(gx, gy - 25, 45, 55)
            .setInteractive({ useHandCursor: true });
          zone.on('pointerdown', () => {
            if (this._closing || this._animating) return;
            this._selectGlass(def.glassKey, si, gi);
          });
          this._content.add(zone);
        }
      }

      this._shelves.push(shelfData);
    }

    // ── RIGHT: Interaction Panel ──
    const panelTop = -panelH / 2;

    const panelBg = scene.add.rectangle(rightCX, 0, panelW, panelH, 0x1e1e2e)
      .setStrokeStyle(2, 0x4a4a6a)
      .setInteractive();
    this._content.add(panelBg);

    // "Selected:" header
    let curY = panelTop + 50;
    this._content.add(
      scene.add.text(rightCX, curY, 'Selected:', {
        fontFamily: 'monospace', fontSize: '11px', color: '#888888',
      }).setOrigin(0.5),
    );
    curY += 24;

    this._selectedText = scene.add.text(rightCX, curY, 'None', {
      fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: '#666666',
    }).setOrigin(0.5);
    this._content.add(this._selectedText);
    curY += 60;

    const btnW = 160, btnH = 40;
    this._takeBtn = scene.add.rectangle(rightCX, curY, btnW, btnH, 0x2a2a2a)
      .setStrokeStyle(1, 0x444444);
    this._content.add(this._takeBtn);
    this._takeBtnLabel = scene.add.text(rightCX, curY, 'Take Glass', {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#666666',
    }).setOrigin(0.5);
    this._content.add(this._takeBtnLabel);
    curY += btnH + 20;

    const stepBtn = scene.add.rectangle(rightCX, curY, btnW, btnH, 0x3a2a2a)
      .setStrokeStyle(1, 0x6a4a4a)
      .setInteractive({ useHandCursor: true });
    stepBtn.on('pointerover', () => stepBtn.setFillStyle(0x4a3a3a));
    stepBtn.on('pointerout', () => stepBtn.setFillStyle(0x3a2a2a));
    stepBtn.on('pointerdown', () => {
      if (this._closing) return;
      this._requestClose();
    });
    this._content.add(stepBtn);
    this._content.add(
      scene.add.text(rightCX, curY, 'Step Away', {
        fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#cc8888',
      }).setOrigin(0.5),
    );

    // Glass graphics — added last inside content so it renders on top
    this._glassGfx = scene.add.graphics();
    this._content.add(this._glassGfx);
  }

  _onUpdate(dt) {
    this._updateGlassLifts(dt);
    this._drawGlasses();
  }

  _onTeardown() {
    this._shelves = [];
    this._selectedGlass = null;
    this._selectedText = null;
    this._takeBtn = null;
    this._takeBtnLabel = null;
    this._glassGfx = null;
  }

  // ─── GLASS SELECTION ──────────────────────────────

  _selectGlass(glassKey, shelfIdx, glassIdx) {
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

      this._takeBtn.setFillStyle(0x3a5a3a);
      this._takeBtn.setStrokeStyle(1, 0x5a8a5a);
      this._takeBtn.setInteractive({ useHandCursor: true });
      this._takeBtn.removeAllListeners();
      this._takeBtn.on('pointerover', () => this._takeBtn.setFillStyle(0x4a7a4a));
      this._takeBtn.on('pointerout', () => this._takeBtn.setFillStyle(0x3a5a3a));
      this._takeBtn.on('pointerdown', () => {
        if (this._closing) return;
        this._requestClose('glass-selected', this._selectedGlass.glassKey);
      });
      this._takeBtnLabel.setColor('#ffffff');
    } else {
      this._selectedText.setText('None');
      this._selectedText.setColor('#666666');

      this._takeBtn.setFillStyle(0x2a2a2a);
      this._takeBtn.setStrokeStyle(1, 0x444444);
      this._takeBtn.disableInteractive();
      this._takeBtn.removeAllListeners();
      this._takeBtnLabel.setColor('#666666');
    }
  }

  // ─── GLASS RENDERING ─────────────────────────────

  _updateGlassLifts(dt) {
    const decay = 1 - Math.pow(0.001, dt || 0.016);
    for (const shelf of this._shelves) {
      if (!shelf.active) continue;
      for (const g of shelf.glasses) {
        const isSelected = this._selectedGlass &&
          this._selectedGlass.shelfIdx === shelf.shelfIdx &&
          this._selectedGlass.glassIdx === g.glassIdx;
        const target = isSelected ? -10 : 0;
        g.liftY += (target - g.liftY) * decay;
        if (Math.abs(g.liftY - target) < 0.3) g.liftY = target;
      }
    }
  }

  _drawGlasses() {
    if (!this._glassGfx) return;
    this._glassGfx.clear();

    for (const shelf of this._shelves) {
      if (!shelf.active) continue;
      for (const g of shelf.glasses) {
        drawGlass(this._glassGfx, g.x, g.y + g.liftY, shelf.glassKey, 0, 0x888888, 1.5);
      }
    }
  }
}
