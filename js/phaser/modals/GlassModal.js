import { CANVAS_W, CANVAS_H } from '../../constants.js';
import { GLASSES, DRINKS } from '../../data/menu.js';
import { drawGlass } from '../utils/GlassRenderer.js';
import { BaseModal } from './BaseModal.js';

/**
 * Glass cabinet interaction — portrait-optimized single-panel layout.
 *
 * Full-width wooden cabinet with three shelves of glasses on top,
 * and a button row (Step Away / Take Glass) along the bottom.
 * Tapping a glass lifts it with a smooth animation to indicate selection.
 *
 * Opens with a zoom animation from the station position; closes in reverse.
 */
export class GlassModal extends BaseModal {
  constructor(scene) {
    super(scene, { closeEvent: 'glass-modal-close', dimAlpha: 0.65 });

    this._availableDrinks = [];
    this._shelves = [];
    this._selectedGlass = null;
    this._glassGfx = null;
  }

  show(availableDrinks, originX, originY, originW, originH) {
    this._availableDrinks = availableDrinks || Object.keys(DRINKS);
    this._selectedGlass = null;
    this._contentW = CANVAS_W;
    this._contentH = CANVAS_H;
    super.show({
      origin: { x: originX, y: originY, w: originW, h: originH },
    });
  }

  _build() {
    this._shelves = [];
    const scene = this.scene;

    const panelW = this._contentW;
    const panelH = this._contentH;

    // Local coordinates: (0,0) = center of content
    const panelLeft = -panelW / 2;
    const panelTop = -panelH / 2;

    // ── Full-width panel background (no border) ──
    const panelBg = scene.add.rectangle(0, 0, panelW, panelH, 0x2a1a0e)
      .setInteractive();
    this._content.add(panelBg);

    // ── Cabinet area (top ~280px) ──
    const cabinetH = Math.min(panelH - 100, 400);
    const cabinetTop = -cabinetH / 2 - 30;
    const cabinetCenterY = cabinetTop + cabinetH / 2;
    const pad = 14;

    // Inner dark rect for the cabinet
    this._content.add(
      scene.add.rectangle(0, cabinetCenterY, panelW - pad * 2, cabinetH - 10, 0x1e140a)
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

    const shelfAreaTop = cabinetTop + 15;
    const shelfH = (cabinetH - 20) / shelfDefs.length;
    const innerLeft = panelLeft + pad + 10;
    const innerRight = -panelLeft - pad - 10;
    const shelfW = innerRight - innerLeft; // ~440px

    for (let si = 0; si < shelfDefs.length; si++) {
      const def = shelfDefs[si];
      const shelfBaseY = shelfAreaTop + (si + 1) * shelfH - 8;
      const hasType = drinkTypes.has(def.drinkType);

      // Shelf plank spanning the width
      this._content.add(
        scene.add.rectangle(0, shelfBaseY, shelfW, 5, 0x5a4a30)
          .setStrokeStyle(1, 0x6a5a40),
      );

      const shelfData = {
        glassKey: def.glassKey, shelfY: shelfBaseY,
        active: hasType, shelfIdx: si, glasses: [],
      };

      if (hasType) {
        const glassSpacing = Math.min(90, (shelfW - 20) / def.count);
        const totalGlassW = (def.count - 1) * glassSpacing;
        const glassStartX = -totalGlassW / 2;

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

    // Glass graphics — added last inside content so it renders on top
    this._glassGfx = scene.add.graphics();
    this._content.add(this._glassGfx);

    // Debug graphics (inside content for correct transform)
    this._debugGfx = scene.add.graphics();
    this._content.add(this._debugGfx);
  }

  _onUpdate(dt) {
    this._updateGlassLifts(dt);
    this._drawGlasses();
    this._drawDebug();
  }

  _onTeardown() {
    this._shelves = [];
    this._selectedGlass = null;
    this._glassGfx = null;
    this._debugGfx = null;
  }

  _getButtonConfig() {
    return {
      left: { label: 'Step Away' },
      right: { label: 'Take Glass', enabled: false, onTap: null },
    };
  }

  _drawDebug() {
    if (!this._debugGfx || !this._debugEnabled) {
      if (this._debugGfx) this._debugGfx.clear();
      return;
    }
    const g = this._debugGfx;
    g.clear();

    const panelW = this._contentW;
    const panelH = this._contentH;

    // Content bounds (cyan)
    g.lineStyle(2, 0x00ffff, 0.8);
    g.strokeRect(-panelW / 2, -panelH / 2, panelW, panelH);

    // Shelf tap zones (yellow dashed)
    g.lineStyle(1, 0xffff00, 0.7);
    for (const shelf of this._shelves) {
      if (!shelf.active) continue;
      for (const gl of shelf.glasses) {
        g.strokeRect(gl.x - 22, gl.y - 52, 45, 55);
      }
    }

    // Button bounds (full-width 50% each)
    const bw = this._btnW || panelW / 2;
    const bry = this._btnRowY || panelH / 2 - 25;
    g.lineStyle(1, 0xff4444, 0.8);
    g.strokeRect(-bw, bry - 25, bw, 50);
    g.lineStyle(1, 0x44ff44, 0.8);
    g.strokeRect(0, bry - 25, bw, 50);

    // Shelf Y lines
    g.lineStyle(1, 0xffaa00, 0.5);
    for (const shelf of this._shelves) {
      g.lineBetween(-panelW / 2 + 20, shelf.shelfY, panelW / 2 - 20, shelf.shelfY);
    }
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
    this._updateButtons();
  }

  _updateButtons() {
    if (this._selectedGlass) {
      this._enableRightButton(() => {
        this._requestClose('glass-selected', this._selectedGlass.glassKey);
      });
    } else {
      this._disableRightButton();
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
