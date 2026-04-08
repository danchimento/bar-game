import { CANVAS_W, CANVAS_H } from '../../constants.js';
import { GLASSES, DRINKS } from '../../data/menu.js';
import { drawGlass } from '../utils/GlassRenderer.js';

/**
 * Glass cabinet interaction — split-panel design.
 * Left:  wooden cabinet with three shelves of glasses.
 *        Tapping a glass lifts it with a smooth animation.
 * Right: interaction panel with selected type, "Take Glass", and "Step Away".
 *
 * Both panels are equal width/height, side by side with small padding.
 * Opens with a zoom animation from the station position; closes in reverse.
 */
export class GlassModal {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(70).setVisible(false);

    this._availableDrinks = [];
    this._shelves = [];
    this._selectedGlass = null;
    this._selectedText = null;
    this._takeBtn = null;
    this._takeBtnLabel = null;

    // Sub-objects created per show/hide cycle
    this._dimOverlay = null;
    this._content = null;
    this._glassGfx = null;

    // Animation state
    this._animating = false;
    this._closing = false;
    this._animStartTime = 0;
    this._animDuration = 250; // ms
    this._originX = CANVAS_W / 2;
    this._originY = CANVAS_H / 2;
    this._originW = 60;
    this._originH = 17;
    this._pendingEvent = null;
    this._pendingEventData = null;

    // Layout constants (content bounding box)
    this._panelW = 280;
    this._panelH = 310;
    this._gap = 12;
    this._contentW = this._panelW * 2 + this._gap; // 572
    this._contentH = this._panelH;                  // 310
  }

  show(availableDrinks, originX, originY, originW, originH) {
    this._availableDrinks = availableDrinks || Object.keys(DRINKS);
    this._selectedGlass = null;
    this._originX = originX ?? CANVAS_W / 2;
    this._originY = originY ?? CANVAS_H / 2;
    this._originW = originW ?? 60;
    this._originH = originH ?? 17;
    this._closing = false;
    this._pendingEvent = null;

    this._build();
    this.container.setVisible(true);

    // Start open animation
    this._animating = true;
    this._animStartTime = this.scene.time.now;
    this._applyProgress(0);
  }

  hide() {
    this._teardown();
  }

  get visible() { return this.container.visible; }

  update() {
    if (!this.container.visible) return;

    // Drive animation (open or close)
    if (this._animating) {
      const elapsed = this.scene.time.now - this._animStartTime;
      const rawT = Math.min(elapsed / this._animDuration, 1);

      if (this._closing) {
        // Reverse: progress goes 1 → 0 with ease-in (mirror of ease-out)
        const fwd = 1 - rawT;
        const eased = 1 - Math.pow(1 - fwd, 3);
        this._applyProgress(eased);
        if (rawT >= 1) {
          this._animating = false;
          if (this._pendingEvent) {
            this.scene.events.emit(this._pendingEvent, this._pendingEventData);
          }
          this._teardown();
          return;
        }
      } else {
        // Forward: progress goes 0 → 1 with ease-out
        const eased = 1 - Math.pow(1 - rawT, 3);
        this._applyProgress(eased);
        if (rawT >= 1) {
          this._animating = false;
          this._applyProgress(1);
        }
      }
    }

    // Smooth glass lift offsets
    this._updateGlassLifts();
    this._drawGlasses();
  }

  // ─── ANIMATION ────────────────────────────────────

  /**
   * p=0 → station size & position.  p=1 → full size at screen center.
   * Content container is scaled/positioned; dim overlay fades independently.
   */
  _applyProgress(p) {
    const targetX = CANVAS_W / 2;
    const targetY = CANVAS_H / 2;

    // Position: lerp station origin → screen center
    const cx = this._originX + (targetX - this._originX) * p;
    const cy = this._originY + (targetY - this._originY) * p;

    // Scale: lerp station-size ratio → 1.0
    const startSX = this._originW / this._contentW;
    const startSY = this._originH / this._contentH;
    const sx = startSX + (1 - startSX) * p;
    const sy = startSY + (1 - startSY) * p;

    if (this._content) {
      this._content.setPosition(cx, cy);
      this._content.setScale(sx, sy);
    }

    // Dim overlay fades in/out independently — never scaled
    if (this._dimOverlay) {
      this._dimOverlay.setAlpha(0.65 * p);
    }
  }

  _requestClose(eventName, eventData) {
    if (this._closing) return;
    this._closing = true;
    this._animating = true;
    this._animStartTime = this.scene.time.now;
    this._pendingEvent = eventName;
    this._pendingEventData = eventData;
  }

  _teardown() {
    this.container.setVisible(false);
    this.container.removeAll(true);   // recursively destroys _dimOverlay, _content, _glassGfx
    this._content = null;
    this._dimOverlay = null;
    this._glassGfx = null;
    this._shelves = [];
    this._selectedGlass = null;
    this._selectedText = null;
    this._takeBtn = null;
    this._takeBtnLabel = null;
    this._animating = false;
    this._closing = false;
  }

  // ─── BUILD ────────────────────────────────────────

  _build() {
    this.container.removeAll(true);
    this._shelves = [];
    const scene = this.scene;

    const panelW = this._panelW;
    const panelH = this._panelH;
    const totalW = this._contentW;

    // Local coordinates: (0,0) = center of content
    const leftCX = -totalW / 2 + panelW / 2;
    const rightCX = totalW / 2 - panelW / 2;

    // ── Dim overlay — lives in outer container, NOT in content ──
    this._dimOverlay = scene.add.rectangle(
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x000000, 0.65,
    ).setInteractive();
    this._dimOverlay.on('pointerdown', () => this._requestClose('glass-modal-close'));
    this.container.add(this._dimOverlay);

    // ── Content container (scaled & positioned by animation) ──
    this._content = scene.add.container(CANVAS_W / 2, CANVAS_H / 2);
    this.container.add(this._content);

    // ── LEFT: Glass Cabinet ──
    const cabinetLeft = leftCX - panelW / 2;
    const cabinetTop = -panelH / 2;

    // Cabinet outer frame (dark wood)
    const cabinetBg = scene.add.rectangle(leftCX, 0, panelW, panelH, 0x2a1a0e)
      .setStrokeStyle(4, 0x5a3a20)
      .setInteractive(); // blocks clicks reaching dim
    this._content.add(cabinetBg);

    // Cabinet inner area (recessed)
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

    // Dynamic glass name
    this._selectedText = scene.add.text(rightCX, curY, 'None', {
      fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: '#666666',
    }).setOrigin(0.5);
    this._content.add(this._selectedText);
    curY += 60;

    // "Take Glass" button (disabled until selection)
    const btnW = 160, btnH = 40;
    this._takeBtn = scene.add.rectangle(rightCX, curY, btnW, btnH, 0x2a2a2a)
      .setStrokeStyle(1, 0x444444);
    this._content.add(this._takeBtn);
    this._takeBtnLabel = scene.add.text(rightCX, curY, 'Take Glass', {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#666666',
    }).setOrigin(0.5);
    this._content.add(this._takeBtnLabel);
    curY += btnH + 20;

    // "Step Away" button
    const stepBtn = scene.add.rectangle(rightCX, curY, btnW, btnH, 0x3a2a2a)
      .setStrokeStyle(1, 0x6a4a4a)
      .setInteractive({ useHandCursor: true });
    stepBtn.on('pointerover', () => stepBtn.setFillStyle(0x4a3a3a));
    stepBtn.on('pointerout', () => stepBtn.setFillStyle(0x3a2a2a));
    stepBtn.on('pointerdown', () => {
      if (this._closing) return;
      this._requestClose('glass-modal-close');
    });
    this._content.add(stepBtn);
    this._content.add(
      scene.add.text(rightCX, curY, 'Step Away', {
        fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#cc8888',
      }).setOrigin(0.5),
    );

    // ── Glass graphics — added last inside content so it renders on top ──
    this._glassGfx = scene.add.graphics();
    this._content.add(this._glassGfx);
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

  /** Smoothly animate each glass's vertical offset toward its target */
  _updateGlassLifts() {
    const speed = 0.2;
    for (const shelf of this._shelves) {
      if (!shelf.active) continue;
      for (const g of shelf.glasses) {
        const isSelected = this._selectedGlass &&
          this._selectedGlass.shelfIdx === shelf.shelfIdx &&
          this._selectedGlass.glassIdx === g.glassIdx;
        const target = isSelected ? -10 : 0;
        g.liftY += (target - g.liftY) * speed;
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

  destroy() {
    this.container.destroy(true);
    if (this._glassGfx) this._glassGfx.destroy();
  }
}
