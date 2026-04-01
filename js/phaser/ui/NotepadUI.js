import { CANVAS_H } from '../../constants.js';

/**
 * Order notepad: bottom-left panel showing unfulfilled orders.
 */
export class NotepadUI {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(50);
    this.bg = null;
    this.texts = [];
  }

  update(notepad) {
    // Clear previous
    this.container.removeAll(true);
    this.texts = [];

    if (!notepad.visible) return;
    const unfulfilled = notepad.getUnfulfilled();
    if (unfulfilled.length === 0) return;

    const x = 10;
    const w = 160;
    const lineH = 20;
    const h = 30 + unfulfilled.length * lineH;
    const y = CANVAS_H - h - 10;

    // Background
    const bg = this.scene.add.rectangle(x + w / 2, y + h / 2, w, h, 0xfff8dc, 0.92)
      .setStrokeStyle(2, 0x8b4513);
    this.container.add(bg);

    // Title
    const title = this.scene.add.text(x + 10, y + 7, 'Orders', {
      fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#333333',
    });
    this.container.add(title);

    // Entries
    unfulfilled.forEach((order, i) => {
      const txt = this.scene.add.text(x + 10, y + 26 + i * lineH,
        `Seat ${order.seatId + 1}: ${order.drink}`, {
          fontFamily: 'monospace', fontSize: '11px', color: '#555555',
        });
      this.container.add(txt);
    });
  }

  destroy() {
    this.container.destroy(true);
  }
}
