/* global Phaser */
import { CANVAS_W, CANVAS_H } from './constants.js';
import { BootScene } from './phaser/BootScene.js';
import { TitleScene } from './phaser/TitleScene.js';
import { GamePlayScene } from './phaser/GamePlayScene.js';
import { LevelCompleteScene } from './phaser/LevelCompleteScene.js';

// ── Error overlay — shows JS errors on screen so they can be copy-pasted ──
function showErrorOverlay(msg) {
  let el = document.getElementById('error-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'error-overlay';
    Object.assign(el.style, {
      position: 'fixed', bottom: '0', left: '0', right: '0',
      maxHeight: '40vh', overflow: 'auto', zIndex: '99999',
      background: 'rgba(180,20,20,0.95)', color: '#fff',
      fontFamily: 'monospace', fontSize: '12px', padding: '10px',
      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    });
    document.body.appendChild(el);
  }
  el.textContent += msg + '\n\n';
}

window.addEventListener('error', (e) => {
  showErrorOverlay(`[ERROR] ${e.message}\n  at ${e.filename}:${e.lineno}:${e.colno}`);
});
window.addEventListener('unhandledrejection', (e) => {
  showErrorOverlay(`[PROMISE] ${e.reason?.stack || e.reason}`);
});

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
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, GamePlayScene, LevelCompleteScene],
};

new Phaser.Game(config);
