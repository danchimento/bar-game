/* global Phaser */
import { CANVAS_W, CANVAS_H } from './constants.js';
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

  // Try fullscreen + orientation lock (works on Android Chrome)
  const el = document.documentElement;
  const requestFS = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (requestFS) {
    requestFS.call(el).then(() => {
      if (screen.orientation && screen.orientation.lock) {
        return screen.orientation.lock('landscape').catch(() => {});
      }
    }).catch(() => {
      // Fullscreen denied — try orientation lock alone
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
    });
  } else if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => {});
  }
}
document.addEventListener('pointerdown', tryLockLandscape, { once: true });

const config = {
  type: Phaser.AUTO,
  width: CANVAS_W,
  height: CANVAS_H,
  parent: document.body,
  backgroundColor: '#1a1a2e',
  audio: { noAudio: true },
  scale: {
    mode: Phaser.Scale.ENVELOP,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: CANVAS_W,
    height: CANVAS_H,
    min: { width: CANVAS_W / 2, height: CANVAS_H / 2 },
  },
  scene: [BootScene, TitleScene, GamePlayScene, LevelCompleteScene, ComponentViewerScene],
};

new Phaser.Game(config);
