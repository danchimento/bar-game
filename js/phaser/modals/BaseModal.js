import { CANVAS_W, CANVAS_H } from '../../constants.js';

/**
 * BaseModal — shared lifecycle for all game modals.
 *
 * Provides:
 *  - Container management (depth 70, dim overlay, content container)
 *  - show() / hide() / visible lifecycle
 *  - Optional zoom animation (if origin is provided in show())
 *  - _requestClose() with event emission and optional reverse animation
 *
 * Subclass contract:
 *  - Override _build() to populate this._content with UI elements.
 *  - Override _onUpdate(dt) for per-frame logic (optional).
 *  - Override _onTeardown() for cleanup of external resources (optional).
 *  - For zoom animation, set this._contentW and this._contentH in the
 *    constructor (bounding box of the modal content).
 *
 * Coordinate systems:
 *  - Animated modals (origin passed to show): _content is at screen center,
 *    children use LOCAL coords centered at (0, 0).
 *  - Non-animated modals: _content is at (0, 0), children use
 *    screen-absolute coords (backward-compatible with legacy modals).
 */
export class BaseModal {
  constructor(scene, options = {}) {
    this.scene = scene;
    this._closeEvent = options.closeEvent || null;
    this._dimAlpha = options.dimAlpha ?? 0.65;

    this.container = scene.add.container(0, 0).setDepth(70).setVisible(false);
    this._dimOverlay = null;
    this._content = null;

    // Animation state
    this._animating = false;
    this._closing = false;
    this._animStartTime = 0;
    this._animDuration = 250; // ms
    this._hasOrigin = false;
    this._originX = 0;
    this._originY = 0;
    this._originW = 0;
    this._originH = 0;
    this._pendingEvent = null;
    this._pendingEventData = null;

    // Subclass sets these for zoom animation sizing
    this._contentW = 0;
    this._contentH = 0;

    // Button state (owned by BaseModal)
    this._btnRowY = 0;
    this._btnW = 0;
    this._btnH = 50;
    this._rightBtn = null;
    this._rightBtnLabel = null;
    this._rightBtnEnabled = false;
  }

  /**
   * Show the modal.
   * @param {Object} [options]
   * @param {Object} [options.origin] - { x, y, w, h } for zoom-in animation
   */
  show(options = {}) {
    this._closing = false;
    this._pendingEvent = null;

    const origin = options.origin;
    this._hasOrigin = !!(origin && this._contentW > 0 && this._contentH > 0);
    if (origin) {
      this._originX = origin.x;
      this._originY = origin.y;
      this._originW = origin.w;
      this._originH = origin.h;
    }

    this._buildModal();
    this.container.setVisible(true);

    if (this._hasOrigin) {
      this._animating = true;
      this._animStartTime = this.scene.time.now;
      this._applyProgress(0);
    } else {
      this._animating = false;
      if (this._dimOverlay) this._dimOverlay.setAlpha(this._dimAlpha);
    }
  }

  hide() {
    this._teardown();
  }

  get visible() { return this.container.visible; }

  update(dt) {
    if (!this.container.visible) return;

    if (this._animating) {
      const elapsed = this.scene.time.now - this._animStartTime;
      const rawT = Math.min(elapsed / this._animDuration, 1);

      if (this._closing) {
        // Reverse: 1→0 with ease-in (mirror of ease-out)
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
        // Forward: 0→1 with ease-out
        const eased = 1 - Math.pow(1 - rawT, 3);
        this._applyProgress(eased);
        if (rawT >= 1) {
          this._animating = false;
          this._applyProgress(1);
        }
      }
    }

    this._onUpdate(dt);
  }

  /**
   * Start close. Animated modals play reverse animation then emit event.
   * Non-animated modals emit immediately and tear down.
   */
  _requestClose(eventName, eventData) {
    if (this._closing) return;
    const event = eventName || this._closeEvent;

    if (this._hasOrigin) {
      this._closing = true;
      this._animating = true;
      this._animStartTime = this.scene.time.now;
      this._pendingEvent = event;
      this._pendingEventData = eventData;
    } else {
      if (event) this.scene.events.emit(event, eventData);
      this._teardown();
    }
  }

  // ─── BUTTON SYSTEM ──────────────────────────────

  /**
   * Build the standard bottom button pair.
   * Called by _buildModal() after _build(). Reads _getButtonConfig().
   */
  _buildButtons() {
    const config = this._getButtonConfig();
    if (!config) return;

    const scene = this.scene;
    const pw = this._contentW;
    const ph = this._contentH;
    this._btnW = pw / 2;
    this._btnRowY = ph / 2 - this._btnH / 2;

    const leftX = -this._btnW / 2;
    const rightX = this._btnW / 2;

    // Left button (red, always calls _requestClose)
    const left = scene.add.rectangle(leftX, this._btnRowY, this._btnW, this._btnH, 0x6a2a2a)
      .setInteractive({ useHandCursor: true });
    left.on('pointerover', () => left.setFillStyle(0x8a3a3a));
    left.on('pointerout', () => left.setFillStyle(0x6a2a2a));
    left.on('pointerdown', () => {
      if (this._closing) return;
      this._requestClose();
    });
    this._content.add(left);
    this._content.add(
      scene.add.text(leftX, this._btnRowY, config.left.label, {
        fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5),
    );

    // Right button (starts enabled or disabled per config)
    this._rightBtn = scene.add.rectangle(rightX, this._btnRowY, this._btnW, this._btnH, 0x2a2a2a);
    this._content.add(this._rightBtn);
    this._rightBtnLabel = scene.add.text(rightX, this._btnRowY, config.right.label, {
      fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: '#666666',
    }).setOrigin(0.5);
    this._content.add(this._rightBtnLabel);
    this._rightBtnEnabled = false;

    if (config.right.enabled) {
      this._enableRightButton(config.right.onTap);
    }
  }

  _enableRightButton(onTap) {
    if (!this._rightBtn) return;
    this._rightBtn.setFillStyle(0x3a6a3a);
    this._rightBtn.setInteractive({ useHandCursor: true });
    this._rightBtn.removeAllListeners();
    this._rightBtn.on('pointerover', () => this._rightBtn.setFillStyle(0x4a8a4a));
    this._rightBtn.on('pointerout', () => this._rightBtn.setFillStyle(0x3a6a3a));
    this._rightBtn.on('pointerdown', () => {
      if (this._closing) return;
      if (onTap) onTap();
    });
    this._rightBtnLabel.setColor('#ffffff');
    this._rightBtnEnabled = true;
  }

  _disableRightButton() {
    if (!this._rightBtn) return;
    this._rightBtn.setFillStyle(0x2a2a2a);
    this._rightBtn.disableInteractive();
    this._rightBtn.removeAllListeners();
    this._rightBtnLabel.setColor('#666666');
    this._rightBtnEnabled = false;
  }

  _updateRightButton(config) {
    if (!this._rightBtn) return;
    if (this._rightBtnLabel) this._rightBtnLabel.setText(config.label);
    if (config.enabled) {
      this._enableRightButton(config.onTap);
    } else {
      this._disableRightButton();
    }
  }

  // ─── SUBCLASS HOOKS ─────────────────────────────

  /** Build UI into this._content. */
  _build() {}

  /**
   * Return button config, or null for no buttons.
   * @returns {{ left: { label: string }, right: { label: string, enabled: boolean, onTap?: Function } } | null}
   */
  _getButtonConfig() { return null; }

  /** Per-frame logic after animation step. */
  _onUpdate(dt) {}

  /** Cleanup external resources before container is cleared. */
  _onTeardown() {}

  /** Whether debug overlay is active (reads DebugLayer's localStorage key). */
  get _debugEnabled() {
    try { return localStorage.getItem('bar-game-debug') === '1'; }
    catch { return false; }
  }

  // ─── INTERNAL ───────────────────────────────────

  _buildModal() {
    this.container.removeAll(true);

    // Dim overlay — always full-screen, fades independently from content
    this._dimOverlay = this.scene.add.rectangle(
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x000000, this._dimAlpha,
    ).setInteractive();
    this._dimOverlay.on('pointerdown', () => {
      if (this._closing || this._animating) return;
      this._requestClose();
    });
    this.container.add(this._dimOverlay);

    // Content container
    // Animated: at screen center, local coords. Non-animated: at (0,0), absolute coords.
    this._content = this.scene.add.container(
      this._hasOrigin ? CANVAS_W / 2 : 0,
      this._hasOrigin ? CANVAS_H / 2 : 0,
    );
    this.container.add(this._content);

    // Pre-compute button layout so _build() can reference _btnRowY
    if (this._contentW > 0 && this._contentH > 0) {
      this._btnW = this._contentW / 2;
      this._btnRowY = this._contentH / 2 - this._btnH / 2;
    }

    this._build();
    this._buildButtons();
  }

  _applyProgress(p) {
    const targetX = CANVAS_W / 2;
    const targetY = CANVAS_H / 2;
    const cx = this._originX + (targetX - this._originX) * p;
    const cy = this._originY + (targetY - this._originY) * p;
    const startSX = this._originW / this._contentW;
    const startSY = this._originH / this._contentH;
    const sx = startSX + (1 - startSX) * p;
    const sy = startSY + (1 - startSY) * p;

    if (this._content) {
      this._content.setPosition(cx, cy);
      this._content.setScale(sx, sy);
    }
    if (this._dimOverlay) {
      this._dimOverlay.setAlpha(this._dimAlpha * p);
    }
  }

  _teardown() {
    this._onTeardown();
    this.container.setVisible(false);
    this.container.removeAll(true);
    this._content = null;
    this._dimOverlay = null;
    this._rightBtn = null;
    this._rightBtnLabel = null;
    this._rightBtnEnabled = false;
    this._animating = false;
    this._closing = false;
  }

  destroy() {
    this.container.destroy(true);
  }
}
