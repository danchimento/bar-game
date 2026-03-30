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
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gameAspect = CANVAS_W / CANVAS_H;
  const screenAspect = vw / vh;

  let w, h;
  if (screenAspect > gameAspect) {
    // Screen is wider than game — fit to height, letterbox sides
    h = vh;
    w = vh * gameAspect;
  } else {
    // Screen is taller than game — fit to width, letterbox top/bottom
    w = vw;
    h = vw / gameAspect;
  }

  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 100));
resize();

new Game(canvas);
