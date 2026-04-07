import { CANVAS_W, CANVAS_H, GUEST_STATE } from '../../constants.js';
import { GUEST_APPEARANCE_IDS } from '../../data/guestAppearances.js';

const PANEL_W = 460;
const PANEL_H = 320;
const PX = (CANVAS_W - PANEL_W) / 2;
const PY = (CANVAS_H - PANEL_H) / 2;
const LEFT_W = 160;  // left panel for guest portrait
const RIGHT_X = PX + LEFT_W + 20;
const RIGHT_W = PANEL_W - LEFT_W - 40;
const BTN_H = 36;
const BTN_GAP = 8;

/**
 * Customer interaction modal.
 * Left: zoomed portrait of the guest.
 * Right: speech bubble message + context-dependent action buttons.
 */
export class GuestModal {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(70).setVisible(false);
    this._guest = null;
    this._actions = [];
  }

  get visible() { return this.container.visible; }

  show(guest, actions) {
    this._guest = guest;
    this._actions = actions || [];
    this._build();
    this.container.setVisible(true);
  }

  hide() {
    this.container.setVisible(false);
    this.container.removeAll(true);
    this._guest = null;
    this._actions = [];
  }

  _build() {
    this.container.removeAll(true);
    const scene = this.scene;
    const guest = this._guest;

    // ── Dim overlay ──
    const dim = scene.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x000000, 0.55)
      .setInteractive();
    dim.on('pointerdown', (ptr) => {
      if (ptr.x < PX || ptr.x > PX + PANEL_W || ptr.y < PY || ptr.y > PY + PANEL_H) {
        scene.events.emit('guest-modal-close');
      }
    });
    this.container.add(dim);

    // ── Main panel ──
    this.container.add(
      scene.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, PANEL_W, PANEL_H, 0x1e1e2e)
        .setStrokeStyle(2, 0x4a4a6a)
    );

    // ── Left: Guest portrait area ──
    const portraitX = PX + LEFT_W / 2;
    const portraitY = PY + PANEL_H / 2;

    // Portrait background
    this.container.add(
      scene.add.rectangle(portraitX, portraitY, LEFT_W - 10, PANEL_H - 20, 0x151525)
        .setStrokeStyle(1, 0x3a3a5a)
    );

    // Guest sprite — zoomed in (large scale)
    const appearanceId = GUEST_APPEARANCE_IDS[guest.id % GUEST_APPEARANCE_IDS.length];
    const seated = guest.state !== GUEST_STATE.LEAVING &&
                   guest.state !== GUEST_STATE.ANGRY_LEAVING &&
                   guest.state !== GUEST_STATE.ARRIVING &&
                   guest.state !== GUEST_STATE.WAITING_FOR_SEAT;
    const spriteKey = seated ? `guest_sitting_${appearanceId}` : `guest_${appearanceId}`;
    const portrait = scene.add.image(portraitX, portraitY + 10, spriteKey)
      .setScale(3.0).setOrigin(0.5, 0.5);
    this.container.add(portrait);

    // ── Right side ──
    let curY = PY + 24;

    // Guest name / label
    const guestLabel = scene.add.text(RIGHT_X, curY, `Customer #${guest.id + 1}`, {
      fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold', color: '#e0e0e0',
    });
    this.container.add(guestLabel);
    curY += 28;

    // ── Speech bubble with message ──
    const message = this._getMessage(guest);
    const bubbleH = 60;
    this.container.add(
      scene.add.rectangle(RIGHT_X + RIGHT_W / 2, curY + bubbleH / 2, RIGHT_W, bubbleH, 0x2a2a3e)
        .setStrokeStyle(1, 0x5a5a7a)
    );
    const msgText = scene.add.text(RIGHT_X + 12, curY + 10, message, {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffd54f',
      wordWrap: { width: RIGHT_W - 24 },
    });
    this.container.add(msgText);
    curY += bubbleH + 16;

    // ── Action buttons ──
    for (const action of this._actions) {
      const btnY = curY + BTN_H / 2;
      const btnBg = scene.add.rectangle(RIGHT_X + RIGHT_W / 2, btnY, RIGHT_W, BTN_H,
        action.disabled ? 0x2a2a2a : 0x3a5a3a
      ).setStrokeStyle(1, action.disabled ? 0x444444 : 0x5a8a5a);

      if (!action.disabled) {
        btnBg.setInteractive({ useHandCursor: true });
        btnBg.on('pointerover', () => btnBg.setFillStyle(0x4a7a4a));
        btnBg.on('pointerout', () => btnBg.setFillStyle(0x3a5a3a));
        btnBg.on('pointerdown', () => {
          scene.events.emit('guest-modal-close');
          if (action.action) action.action();
        });
      }

      const btnLabel = scene.add.text(RIGHT_X + RIGHT_W / 2, btnY, action.label, {
        fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold',
        color: action.disabled ? '#666666' : '#ffffff',
      }).setOrigin(0.5);

      this.container.add(btnBg);
      this.container.add(btnLabel);
      curY += BTN_H + BTN_GAP;
    }

    // ── Close button ──
    const closeBtn = scene.add.rectangle(PX + PANEL_W - 22, PY + 16, 26, 22, 0xf44336)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => scene.events.emit('guest-modal-close'));
    this.container.add(closeBtn);
    this.container.add(scene.add.text(PX + PANEL_W - 22, PY + 16, 'X', {
      fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5));
  }

  _getMessage(guest) {
    if (guest.state === GUEST_STATE.ENJOYING && guest.hasCheck) {
      return "Let me finish this drink first...";
    }

    switch (guest.state) {
      case GUEST_STATE.SEATED:
        return guest.greeted ? "Give me a moment..." : "Hi there!";
      case GUEST_STATE.LOOKING:
        return guest.greeted ? "Hmm, still deciding..." : "Hmm, what looks good...";
      case GUEST_STATE.READY_TO_ORDER:
        return "I'm ready to order!";
      case GUEST_STATE.ORDER_TAKEN:
        return "Thanks, I'll wait.";
      case GUEST_STATE.WAITING_FOR_DRINK:
        return "Waiting on my drink...";
      case GUEST_STATE.ENJOYING:
        return "This is great!";
      case GUEST_STATE.WANTS_ANOTHER:
        return "I'd like another one!";
      case GUEST_STATE.READY_TO_PAY:
        return "Check, please!";
      case GUEST_STATE.REVIEWING_CHECK:
        return "Let me look at this...";
      default:
        return "...";
    }
  }

  destroy() {
    this.container.destroy(true);
  }
}
