import { Game } from './Game.js';
import { CANVAS_W, CANVAS_H } from './constants.js';

const canvas = document.getElementById('game');

function resize() {
  const aspect = CANVAS_W / CANVAS_H;
  let w = window.innerWidth;
  let h = window.innerHeight;
  if (w / h > aspect) {
    w = h * aspect;
  } else {
    h = w / aspect;
  }
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}

window.addEventListener('resize', resize);
resize();

new Game(canvas);
