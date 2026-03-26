import { Game } from './Game.js';
import { CANVAS_W, CANVAS_H } from './constants.js';

const canvas = document.getElementById('game');

// Prevent all context menus and selection on long-press
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('selectstart', e => e.preventDefault());

// Lock to landscape if API available
if (screen.orientation && screen.orientation.lock) {
  screen.orientation.lock('landscape').catch(() => {});
}

function resize() {
  // Lock to top and bottom of screen, maintain aspect ratio
  const vh = window.innerHeight;
  const w = vh * (CANVAS_W / CANVAS_H);
  canvas.style.height = `${vh}px`;
  canvas.style.width = `${w}px`;
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 100));
resize();

new Game(canvas);
