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

// ── Layout mode (persisted in localStorage) ──
const layoutMode = localStorage.getItem('barRushLayout') || 'landscape';
initCanvas(layoutMode);

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
