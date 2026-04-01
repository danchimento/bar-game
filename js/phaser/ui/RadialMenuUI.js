/**
 * Radial donut menu for station/guest actions.
 * Uses Phaser Graphics for the arc slices and Text for labels.
 */
export class RadialMenuUI {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(60).setVisible(false);
    this.gfx = scene.add.graphics().setDepth(60);
    this.container.add(this.gfx);
    this.texts = [];
    this.radialMenu = null; // reference to RadialMenu logic
  }

  /** Show the radial menu centered at (cx, cy) */
  show(radialMenu) {
    this.radialMenu = radialMenu;
    this.container.setVisible(true);
    this.redraw();
  }

  hide() {
    this.container.setVisible(false);
    this._clearTexts();
    this.gfx.clear();
  }

  redraw() {
    const rm = this.radialMenu;
    if (!rm || !rm.visible) { this.hide(); return; }

    this.gfx.clear();
    this._clearTexts();

    const cx = rm.cx;
    const cy = rm.cy;
    const inner = rm.innerRadius;
    const outer = rm.outerRadius;
    const count = rm.options.length;
    if (count === 0) return;

    // Dim overlay
    this.gfx.fillStyle(0x000000, 0.35);
    this.gfx.fillCircle(cx, cy, outer + 50);

    const sliceAngle = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const opt = rm.options[i];
      const startA = -Math.PI / 2 + i * sliceAngle;
      const endA = startA + sliceAngle;
      const midA = startA + sliceAngle / 2;
      const hovered = i === rm.hoveredIndex && !opt.disabled;
      const r = hovered ? outer + 8 : outer;

      // Slice fill
      const color = opt.disabled ? 0x3a3a3a : (hovered ? 0xffd54f : 0xe8c170);
      this.gfx.fillStyle(color, 1);
      this.gfx.slice(cx, cy, r, startA, endA, false);
      this.gfx.fillPath();

      // Single option: draw full ring and place label at top
      if (count === 1) {
        // Outer ring stroke
        this.gfx.lineStyle(1.5, hovered ? 0xff8f00 : 0x3a2a1a, hovered ? 1 : 0.4);
        this.gfx.strokeCircle(cx, cy, r);
        this.gfx.strokeCircle(cx, cy, inner);

        const ringMid = (inner + outer) / 2;

        if (opt.icon) {
          const icon = this._createIcon(opt.icon, cx, cy - ringMid - 2, 1.2);
          this.container.add(icon);
          this.texts.push(icon);
        }

        const label = this.scene.add.text(cx, cy - ringMid + (opt.icon ? 18 : 0), opt.label, {
          fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold',
          color: opt.disabled ? '#666666' : '#ffffff',
        }).setOrigin(0.5).setDepth(61);
        this.container.add(label);
        this.texts.push(label);
        continue;
      }

      // Label
      const labelR = (inner + outer) / 2 + (hovered ? 4 : 0);
      const lx = cx + Math.cos(midA) * labelR;
      const ly = cy + Math.sin(midA) * labelR;

      if (opt.icon) {
        const icon = this._createIcon(opt.icon, lx, ly - 8, 0.9);
        this.container.add(icon);
        this.texts.push(icon);
      }

      const label = this.scene.add.text(lx, ly + (opt.icon ? 10 : 0), opt.label, {
        fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold',
        color: opt.disabled ? '#666666' : '#1a1a2e',
      }).setOrigin(0.5).setDepth(61);
      this.container.add(label);
      this.texts.push(label);
    }

    // Center circle (dead zone)
    this.gfx.fillStyle(0x1a1a2e, 1);
    this.gfx.fillCircle(cx, cy, inner);
    this.gfx.lineStyle(1.5, 0x555555, 1);
    this.gfx.strokeCircle(cx, cy, inner);
  }

  /** Create an icon — sprite if key exists in texture cache, else fallback text */
  _createIcon(iconKey, x, y, scale = 1) {
    if (this.scene.textures.exists(iconKey)) {
      return this.scene.add.image(x, y, iconKey)
        .setOrigin(0.5).setDepth(61).setScale(scale);
    }
    // Fallback to text for any remaining emoji strings
    return this.scene.add.text(x, y, iconKey, {
      fontFamily: 'serif', fontSize: `${Math.round(18 * scale)}px`,
    }).setOrigin(0.5).setDepth(61);
  }

  _clearTexts() {
    for (const t of this.texts) t.destroy();
    this.texts = [];
  }

  destroy() {
    this._clearTexts();
    this.gfx.destroy();
    this.container.destroy(true);
  }
}
