'use strict';

const CELL_TYPE = Object.freeze({
  EMPTY: 'empty',
  MINE: 'mine',
});

const CELL_STATE = Object.freeze({
  CLOSED: 'closed',
  OPENED: 'opened',
  FLAGGED: 'flagged',
});

const GAME_STATUS = Object.freeze({
  PROCESS: 'process',
  WIN: 'win',
  LOSE: 'lose',
});

const gameState = {
  rows: 10,
  cols: 10,
  minesCount: 15,
  status: GAME_STATUS.PROCESS,
  gameTime: 0,   // секунди
  timerId: null, // id для clearInterval
};

let board = [];

// DOM-посилання кешуються один раз в init()
const dom = {
  board: null,
  timer: null,
  flagsCounter: null,
  message: null,
  restartButton: null,
};

function createCell() {
  return { type: CELL_TYPE.EMPTY, state: CELL_STATE.CLOSED, neighborMines: 0 };
}

function generateField(rows, cols, minesCount) {
  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, createCell)
  );

  let placed = 0;
  while (placed < minesCount) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);
    if (grid[row][col].type === CELL_TYPE.MINE) continue;
    grid[row][col].type = CELL_TYPE.MINE;
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
  NEIGHBOR_OFFSETS.forEach(([rowOffset, colOffset]) => {
    const neighborRow = row + rowOffset;
    const neighborCol = col + colOffset;
    const isInside =
      neighborRow >= 0 &&
      neighborRow < grid.length &&
      neighborCol >= 0 &&
      neighborCol < grid[neighborRow].length;
    if (isInside) callback(neighborRow, neighborCol);
  });
}

function countNeighbourMines(grid) {
  grid.forEach((rowCells, row) => {
    rowCells.forEach((cell, col) => {
      if (cell.type !== CELL_TYPE.EMPTY) return;
      let count = 0;
      forEachNeighbor(grid, row, col, (neighborRow, neighborCol) => {
        if (grid[neighborRow][neighborCol].type === CELL_TYPE.MINE) count++;
      });
      cell.neighborMines = count;
    });
  });
}

// Ітеративна заливка: без рекурсії, тому не залежить від розміру поля
function revealCell(grid, row, col) {
  const stack = [[row, col]];
  while (stack.length > 0) {
    const [currentRow, currentCol] = stack.pop();
    const cell = grid[currentRow][currentCol];
    if (cell.state !== CELL_STATE.CLOSED) continue;
    cell.state = CELL_STATE.OPENED;
    if (cell.type === CELL_TYPE.EMPTY && cell.neighborMines === 0) {
      forEachNeighbor(grid, currentRow, currentCol, (neighborRow, neighborCol) =>
        stack.push([neighborRow, neighborCol])
      );
    }
  }
}

function openCell(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) return;
  const cell = board[row][col];
  if (cell.state !== CELL_STATE.CLOSED) return;

  startTimer();
  if (cell.type === CELL_TYPE.MINE) {
    cell.state = CELL_STATE.OPENED;
    endGame(GAME_STATUS.LOSE);
    return;
  }
  revealCell(board, row, col);
  if (isVictory(board)) endGame(GAME_STATUS.WIN);
}

function isVictory(grid) {
  return grid.every(rowCells =>
    rowCells.every(
      cell => cell.type === CELL_TYPE.MINE || cell.state === CELL_STATE.OPENED
    )
  );
}

function endGame(status) {
  gameState.status = status;
  stopTimer();
}


function countFlags(grid) {
  return grid.flat().filter(cell => cell.state === CELL_STATE.FLAGGED).length;
}

function getFlagsLeft(grid, minesCount) {
  return minesCount - countFlags(grid);
}

function toggleFlag(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) return;
  const cell = board[row][col];
  if (cell.state === CELL_STATE.CLOSED) {
    if (getFlagsLeft(board, gameState.minesCount) > 0) {
      cell.state = CELL_STATE.FLAGGED;
    }
  } else if (cell.state === CELL_STATE.FLAGGED) {
    cell.state = CELL_STATE.CLOSED;
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
  gameState.status = GAME_STATUS.PROCESS;
  gameState.gameTime = 0;
  board = generateField(gameState.rows, gameState.cols, gameState.minesCount);
  countNeighbourMines(board);
}

const MESSAGES = {
  [GAME_STATUS.PROCESS]: { text: '', css: '' },
  [GAME_STATUS.WIN]: { text: '🎉 Перемога! Усі безпечні клітинки відкрито.', css: 'win' },
  [GAME_STATUS.LOSE]: { text: '💥 Ви підірвалися на міні. Спробуйте ще раз!', css: 'lose' },
};

function getCellView(cell, status) {
  const view = { text: '', classes: ['cell'] };
  const isGameOver = status !== GAME_STATUS.PROCESS;

  if (cell.state === CELL_STATE.OPENED) {
    view.classes.push('opened');
    if (cell.type === CELL_TYPE.MINE) {
      view.text = '💣';
      view.classes.push('exploded');
    } else if (cell.neighborMines > 0) {
      view.text = cell.neighborMines;
      view.classes.push('n' + cell.neighborMines);
    }
  } else if (cell.state === CELL_STATE.FLAGGED) {
    view.text = '🚩';
  } else if (isGameOver && cell.type === CELL_TYPE.MINE) {
    view.text = status === GAME_STATUS.WIN ? '🚩' : '💣';
    view.classes.push('mine');
  }
  return view;
}

function getCellLabel(cell, row, col, status) {
  let stateLabel = 'закрита';
  if (cell.state === CELL_STATE.OPENED) {
    if (cell.type === CELL_TYPE.MINE) {
      stateLabel = 'міна';
    } else {
      stateLabel =
        cell.neighborMines > 0 ? `мін поруч: ${cell.neighborMines}` : 'порожня';
    }
  } else if (cell.state === CELL_STATE.FLAGGED) {
    stateLabel = 'прапорець';
  } else if (status !== GAME_STATUS.PROCESS && cell.type === CELL_TYPE.MINE) {
    stateLabel = 'міна';
  }
  return `Рядок ${row + 1}, стовпець ${col + 1}: ${stateLabel}`;
}

function getFocusedCoords() {
  const activeElement = document.activeElement;
  if (!activeElement || !activeElement.classList.contains('cell')) return null;
  return {
    row: Number(activeElement.dataset.row),
    col: Number(activeElement.dataset.col),
  };
}

function renderField() {
  const focused = getFocusedCoords();
  dom.board.style.setProperty('--cols', gameState.cols);
  dom.board.innerHTML = '';
  board.forEach((rowCells, row) => {
    rowCells.forEach((cell, col) => {
      const view = getCellView(cell, gameState.status);
      const cellElement = document.createElement('button');
      cellElement.type = 'button';
      cellElement.className = view.classes.join(' ');
      cellElement.textContent = view.text;
      cellElement.setAttribute(
        'aria-label',
        getCellLabel(cell, row, col, gameState.status)
      );
      cellElement.dataset.row = row;
      cellElement.dataset.col = col;
      dom.board.appendChild(cellElement);
    });
  });
  if (focused) {
    const nextElement = dom.board.querySelector(
      `[data-row="${focused.row}"][data-col="${focused.col}"]`
    );
    if (nextElement) nextElement.focus();
  }
}

function renderTimer() {
  dom.timer.textContent = gameState.gameTime;
}

function renderFlagsCounter() {
  dom.flagsCounter.textContent = getFlagsLeft(board, gameState.minesCount);
}

function renderMessage() {
  const { text, css } = MESSAGES[gameState.status];
  dom.message.textContent = text;
  dom.message.className = 'message ' + css;
}

function render() {
  renderField();
  renderTimer();
  renderFlagsCounter();
  renderMessage();
}


function getCellCoords(event) {
  const cellElement = event.target.closest('.cell');
  if (!cellElement) return null;
  return {
    row: Number(cellElement.dataset.row),
    col: Number(cellElement.dataset.col),
  };
}

function onLeftClick(event) {
  const coords = getCellCoords(event);
  if (!coords) return;
  openCell(coords.row, coords.col);
  render();
}

function onRightClick(event) {
  event.preventDefault();
  const coords = getCellCoords(event);
  if (!coords) return;
  toggleFlag(coords.row, coords.col);
  render();
}

function onKeyDown(event) {
  if (event.code !== 'KeyF' || event.ctrlKey || event.metaKey || event.altKey) return;
  const coords = getCellCoords(event);
  if (!coords) return;
  toggleFlag(coords.row, coords.col);
  render();
}

function startGame() {
  resetGame();
  render();
}

function cacheDom() {
  dom.board = document.getElementById('board');
  dom.timer = document.getElementById('timer');
  dom.flagsCounter = document.getElementById('flags-counter');
  dom.message = document.getElementById('message');
  dom.restartButton = document.getElementById('restart-btn');
}

function init() {
  cacheDom();
  dom.board.addEventListener('click', onLeftClick);
  dom.board.addEventListener('contextmenu', onRightClick);
  dom.board.addEventListener('keydown', onKeyDown);
  dom.restartButton.addEventListener('click', startGame);
  startGame();
}

document.addEventListener('DOMContentLoaded', init);