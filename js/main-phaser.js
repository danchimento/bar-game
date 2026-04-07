/* global Phaser */
import { CANVAS_W, CANVAS_H, initCanvas } from './constants.js';
import { BootScene } from './phaser/BootScene.js';
import { TitleScene } from './phaser/TitleScene.js';
import { GamePlayScene } from './phaser/GamePlayScene.js';
import { LevelCompleteScene } from './phaser/LevelCompleteScene.js';
import { ComponentViewerScene } from './phaser/ComponentViewerScene.js';

// Prevent context menus and selection on long-press
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('selectstart', e => e.preventDefault());

// Try to lock orientation on first user tap (requires fullscreen on most browsers)
let orientationLocked = false;
function tryLockLandscape() {
  if (orientationLocked) return;
  orientationLocked = true;

  const el = document.documentElement;
  const requestFS = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (requestFS) {
    requestFS.call(el).then(() => {
      if (screen.orientation && screen.orientation.lock) {
        return screen.orientation.lock('landscape').catch(() => {});
      }
    }).catch(() => {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
    });
  } else if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => {});
  }
}
document.addEventListener('pointerdown', tryLockLandscape, { once: true });

// ── Adapt game width to device aspect ratio ──
// Height stays fixed at 540; width stretches to fill the screen.
// After this call, CANVAS_W reflects the actual device width.
initCanvas();

const config = {
  type: Phaser.AUTO,
  width: CANVAS_W,
  height: CANVAS_H,
  parent: document.body,
  backgroundColor: '#1a1a2e',
  audio: { noAudio: true },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: CANVAS_W,
    height: CANVAS_H,
  },
  scene: [BootScene, TitleScene, GamePlayScene, LevelCompleteScene, ComponentViewerScene],
};

new Phaser.Game(config);
