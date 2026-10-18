'use strict';
const gameState = {
  rows: 10,
  cols: 10,
  minesCount: 15,
  status: 'process', // 'process' | 'win' | 'lose'
  gameTime: 0,       // секунди
  timerId: null,     // id для clearInterval
};

let board = [];

function createCell() {
  return { type: 'empty', state: 'closed', neighborMines: 0 };
}

function generateField(rows, cols, minesCount) {
  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, createCell)
  );

  let placed = 0;
  while (placed < minesCount) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (grid[r][c].type === 'mine') continue; 
    grid[r][c].type = 'mine';
    placed++;
  }
  return grid;
}


const NEIGHBOR_OFFSETS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

function forEachNeighbor(grid, row, col, callback) {
  NEIGHBOR_OFFSETS.forEach(([dr, dc]) => {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < grid.length && c >= 0 && c < grid[r].length) callback(r, c);
  });
}

function countNeighbourMines(grid) {
  grid.forEach((line, r) => {
    line.forEach((cell, c) => {
      if (cell.type !== 'empty') return;
      let count = 0;
      forEachNeighbor(grid, r, c, (nr, nc) => {
        if (grid[nr][nc].type === 'mine') count++;
      });
      cell.neighborMines = count;
    });
  });
}

function revealCell(row, col) {
  const cell = board[row][col];
  if (cell.state !== 'closed') return; 
  cell.state = 'opened';
  if (cell.type === 'empty' && cell.neighborMines === 0) {
    forEachNeighbor(board, row, col, revealCell);
  }
}

function openCell(row, col) {
  if (gameState.status !== 'process') return;
  const cell = board[row][col];
  if (cell.state !== 'closed') return;

  startTimer();
  if (cell.type === 'mine') {
    cell.state = 'opened';
    endGame('lose');
    return;
  }
  revealCell(row, col);
  if (isVictory()) endGame('win');
}

function isVictory() {
  return board.every(line =>
    line.every(cell => cell.type === 'mine' || cell.state === 'opened')
  );
}

function endGame(status) {
  gameState.status = status;
  stopTimer();
}


function countFlags() {
  return board.flat().filter(cell => cell.state === 'flagged').length;
}

function getFlagsLeft() {
  return gameState.minesCount - countFlags();
}

function toggleFlag(row, col) {
  if (gameState.status !== 'process') return;
  const cell = board[row][col];
  if (cell.state === 'closed') {
    if (getFlagsLeft() > 0) cell.state = 'flagged'; 
  } else if (cell.state === 'flagged') {
    cell.state = 'closed';
  } 
}

function startTimer() {
  if (gameState.timerId !== null) return;
  gameState.timerId = setInterval(() => {
    gameState.gameTime += 1;
    renderTimer();
  }, 1000);
}

function stopTimer() {
  clearInterval(gameState.timerId);
  gameState.timerId = null;
}

function resetGame() {
  stopTimer();
  gameState.status = 'process';
  gameState.gameTime = 0;
  board = generateField(gameState.rows, gameState.cols, gameState.minesCount);
  countNeighbourMines(board);
}

const MESSAGES = {
  process: { text: '', css: '' },
  win: { text: '🎉 Перемога! Усі безпечні клітинки відкрито.', css: 'win' },
  lose: { text: '💥 Ви підірвалися на міні. Спробуйте ще раз!', css: 'lose' },
};

function getCellView(cell) {
  const view = { text: '', classes: ['cell'] };
  const gameOver = gameState.status !== 'process';

  if (cell.state === 'opened') {
    view.classes.push('opened');
    if (cell.type === 'mine') {
      view.text = '💣';
      view.classes.push('exploded');
    } else if (cell.neighborMines > 0) {
      view.text = cell.neighborMines;
      view.classes.push('n' + cell.neighborMines);
    }
  } else if (cell.state === 'flagged') {
    view.text = '🚩';
  } else if (gameOver && cell.type === 'mine') { 
    view.text = gameState.status === 'win' ? '🚩' : '💣';
    view.classes.push('mine');
  }
  return view;
}

function getCellLabel(cell, row, col) {
  let state = 'закрита';
  if (cell.state === 'opened') {
    if (cell.type === 'mine') state = 'міна';
    else state = cell.neighborMines > 0 ? `мін поруч: ${cell.neighborMines}` : 'порожня';
  } else if (cell.state === 'flagged') {
    state = 'прапорець';
  } else if (gameState.status !== 'process' && cell.type === 'mine') {
    state = 'міна';
  }
  return `Рядок ${row + 1}, стовпець ${col + 1}: ${state}`;
}

function getFocusedCoords() {
  const el = document.activeElement;
  if (!el || !el.classList.contains('cell')) return null;
  return { row: Number(el.dataset.row), col: Number(el.dataset.col) };
}

function renderField() {
  const boardEl = document.getElementById('board');
  const focused = getFocusedCoords();
  boardEl.style.setProperty('--cols', gameState.cols);
  boardEl.innerHTML = '';
  board.forEach((line, r) => {
    line.forEach((cell, c) => {
      const view = getCellView(cell);
      const el = document.createElement('button');
      el.type = 'button';
      el.className = view.classes.join(' ');
      el.textContent = view.text;
      el.setAttribute('aria-label', getCellLabel(cell, r, c));
      el.dataset.row = r;
      el.dataset.col = c;
      boardEl.appendChild(el);
    });
  });
  if (focused) {
    const next = boardEl.querySelector(
      `[data-row="${focused.row}"][data-col="${focused.col}"]`
    );
    if (next) next.focus();
  }
}

function renderTimer() {
  document.getElementById('timer').textContent = gameState.gameTime;
}

function renderFlagsCounter() {
  document.getElementById('flags-counter').textContent = getFlagsLeft();
}

function renderMessage() {
  const { text, css } = MESSAGES[gameState.status];
  const el = document.getElementById('message');
  el.textContent = text;
  el.className = 'message ' + css;
}

function render() {
  renderField();
  renderTimer();
  renderFlagsCounter();
  renderMessage();
}


function getCellCoords(event) {
  const el = event.target.closest('.cell');
  if (!el) return null;
  return { row: Number(el.dataset.row), col: Number(el.dataset.col) };
}

function onLeftClick(event) {
  const pos = getCellCoords(event);
  if (!pos) return;
  openCell(pos.row, pos.col);
  render();
}

function onRightClick(event) {
  event.preventDefault(); 
  const pos = getCellCoords(event);
  if (!pos) return;
  toggleFlag(pos.row, pos.col);
  render();
}

function onKeyDown(event) {
  if (event.code !== 'KeyF' || event.ctrlKey || event.metaKey || event.altKey) return;
  const pos = getCellCoords(event);
  if (!pos) return;
  toggleFlag(pos.row, pos.col);
  render();
}

function startGame() {
  resetGame();
  render();
}

function init() {
  const boardEl = document.getElementById('board');
  boardEl.addEventListener('click', onLeftClick);
  boardEl.addEventListener('contextmenu', onRightClick);
  boardEl.addEventListener('keydown', onKeyDown);
  document.getElementById('restart-btn').addEventListener('click', startGame);
  startGame();
}

document.addEventListener('DOMContentLoaded', init);