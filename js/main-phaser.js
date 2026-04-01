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

// Lock to landscape if API available
if (screen.orientation && screen.orientation.lock) {
  screen.orientation.lock('landscape').catch(() => {});
}

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
    orientation: Phaser.Scale.Orientation.LANDSCAPE,
  },
  scene: [BootScene, TitleScene, GamePlayScene, LevelCompleteScene, ComponentViewerScene],
};

new Phaser.Game(config);
