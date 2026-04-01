import { CANVAS_W, CANVAS_H } from '../../constants.js';
import { GLASSES, DRINKS } from '../../data/menu.js';
import { drawGlass } from '../utils/GlassRenderer.js';

/**
 * Glass selection modal — three shelves of glasses.
 * Top shelf: pint glasses, Middle: wine glasses, Bottom: plastic cups.
 * Empty shelves shown for drink types not available in the current level.
 * Tapping a glass animates it floating up off the shelf.
 */
export class GlassModal {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(70).setVisible(false);
    this._glassGfx = scene.add.graphics().setDepth(72);
    this._availableDrinks = [];
    this._shelves = []; // shelf data for drawing
    this._pickAnim = null; // active pick animation
  }

  show(availableDrinks) {
    this._availableDrinks = availableDrinks || Object.keys(DRINKS);
    this._pickAnim = null;
    this._build();
    this.container.setVisible(true);
  }

  hide() {
    this.container.setVisible(false);
    this.container.removeAll(true);
    this._glassGfx.clear();
    this._shelves = [];
    this._pickAnim = null;
  }

  get visible() { return this.container.visible; }

  update() {
    if (!this.container.visible) return;
    this._drawGlasses();
  }

  _build() {
    this.container.removeAll(true);
    this._shelves = [];

    const pw = 340, ph = 300;
    const px = (CANVAS_W - pw) / 2;
    const py = (CANVAS_H - ph) / 2 + 20;

    // Dim overlay
    const dim = this.scene.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x000000, 0.6)
      .setInteractive();
    dim.on('pointerdown', (ptr) => {
      if (ptr.x < px || ptr.x > px + pw || ptr.y < py || ptr.y > py + ph) this.hide();
    });
    this.container.add(dim);

    // Panel — wooden cabinet look
    this.container.add(
      this.scene.add.rectangle(CANVAS_W / 2, py + ph / 2, pw, ph, 0x2a2018)
        .setStrokeStyle(3, 0x5a4a38)
    );

    // Title
    this.container.add(this.scene.add.text(CANVAS_W / 2, py + 18, 'Glassware', {
      fontFamily: 'monospace', fontSize: '16px', fontStyle: 'bold', color: '#c8b080',
    }).setOrigin(0.5));

    // Close button
    const closeBtn = this.scene.add.rectangle(px + pw - 22, py + 16, 26, 22, 0xf44336)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hide());
    this.container.add(closeBtn);
    this.container.add(this.scene.add.text(px + pw - 22, py + 16, 'X', {
      fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5));

    // Determine which drink types are available
    const drinkTypes = new Set();
    for (const dk of this._availableDrinks) {
      const d = DRINKS[dk];
      if (d) drinkTypes.add(d.type);
    }

    // Three shelves
    const shelfDefs = [
      { glassKey: 'PINT', label: 'Pint Glasses', drinkType: 'beer', count: 5 },
      { glassKey: 'WINE_GLASS', label: 'Wine Glasses', drinkType: 'wine', count: 4 },
      { glassKey: 'PLASTIC_CUP', label: 'Plastic Cups', drinkType: 'water', count: 4 },
    ];

    const shelfStartY = py + 50;
    const shelfH = 75;
    const shelfLeft = px + 30;
    const shelfRight = px + pw - 30;
    const shelfW = shelfRight - shelfLeft;

    for (let si = 0; si < shelfDefs.length; si++) {
      const def = shelfDefs[si];
      const shelfY = shelfStartY + si * shelfH + shelfH - 8;
      const hasType = drinkTypes.has(def.drinkType);

      // Shelf plank
      this.container.add(
        this.scene.add.rectangle(CANVAS_W / 2, shelfY, shelfW, 5, 0x5a4a30)
          .setStrokeStyle(1, 0x6a5a40)
      );

      // Shelf label (left side)
      this.container.add(this.scene.add.text(shelfLeft + 2, shelfY + 6, def.label, {
        fontFamily: 'monospace', fontSize: '8px', color: '#8a7a60',
      }));

      const shelfData = { glassKey: def.glassKey, shelfY, active: hasType, glasses: [] };

      if (hasType) {
        // Place glasses on shelf
        const glassSpacing = Math.min(45, (shelfW - 20) / def.count);
        const totalGlassW = (def.count - 1) * glassSpacing;
        const glassStartX = CANVAS_W / 2 - totalGlassW / 2;

        for (let gi = 0; gi < def.count; gi++) {
          const gx = glassStartX + gi * glassSpacing;
          const gy = shelfY - 3; // bottom of glass sits on shelf
          shelfData.glasses.push({ x: gx, y: gy, picked: false, animY: 0 });

          // Interactive zone for each glass
          const zone = this.scene.add.zone(gx, gy - 15, 30, 35)
            .setInteractive({ useHandCursor: true });
          zone.on('pointerdown', () => this._pickGlass(def.glassKey, si, gi));
          this.container.add(zone);
        }
      }

      this._shelves.push(shelfData);
    }
  }

  _pickGlass(glassKey, shelfIdx, glassIdx) {
    const shelf = this._shelves[shelfIdx];
    if (!shelf || !shelf.active) return;
    const glass = shelf.glasses[glassIdx];
    if (!glass || glass.picked) return;

    glass.picked = true;
    this._pickAnim = {
      shelfIdx, glassIdx,
      startY: glass.y,
      timer: 0,
      duration: 0.35,
      glassKey,
    };
  }

  _drawGlasses() {
    this._glassGfx.clear();

    // Update pick animation
    if (this._pickAnim) {
      this._pickAnim.timer += 1 / 60;
      if (this._pickAnim.timer >= this._pickAnim.duration) {
        // Animation complete — emit selection and close
        this.scene.events.emit('glass-selected', this._pickAnim.glassKey);
        this.hide();
        return;
      }
    }

    for (let si = 0; si < this._shelves.length; si++) {
      const shelf = this._shelves[si];
      if (!shelf.active) continue;

      for (let gi = 0; gi < shelf.glasses.length; gi++) {
        const g = shelf.glasses[gi];
        let gx = g.x;
        let gy = g.y;
        let alpha = 1;

        if (g.picked && this._pickAnim && this._pickAnim.shelfIdx === si && this._pickAnim.glassIdx === gi) {
          // Animate upward
          const t = this._pickAnim.timer / this._pickAnim.duration;
          const ease = t * (2 - t); // ease-out
          gy = g.y - 50 * ease;
          alpha = 1 - t * 0.5;
        } else if (g.picked) {
          continue; // already picked, don't draw
        }

        this._glassGfx.setAlpha(alpha);
        drawGlass(this._glassGfx, gx, gy, shelf.glassKey, 0, 0x888888, 0.9);
        this._glassGfx.setAlpha(1);
      }
    }
  }

  destroy() {
    this.container.destroy(true);
    this._glassGfx.destroy();
  }
}
