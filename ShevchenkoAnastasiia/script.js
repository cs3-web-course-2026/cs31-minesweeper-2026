'use strict';

const GAME_CONFIG = { rows: 10, cols: 10, minesCount: 15 };

const NEIGHBOR_OFFSETS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

let gameState = createGameState();
let board = [];

function createGameState() {
  return {
    ...GAME_CONFIG,
    status: 'process',
    gameTime: 0,
    timerId: null,
  };
}

function createCell() {
  return { type: 'empty', state: 'closed', neighborMines: 0 };
}

function generateField(rows, cols, minesCount) {
  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, createCell),
  );

  let placed = 0;
  while (placed < minesCount) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);
    if (grid[row][col].type === 'mine') continue;
    grid[row][col].type = 'mine';
    placed++;
  }
  return grid;
}

function isInside(row, col, rows, cols) {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

function getNeighbors(row, col, rows, cols) {
  return NEIGHBOR_OFFSETS.map(([dr, dc]) => [row + dr, col + dc]).filter(
    ([r, c]) => isInside(r, c, rows, cols),
  );
}

function countNeighbourMines(board, rows, cols) {
  board.forEach((rowCells, row) => {
    rowCells.forEach((cell, col) => {
      if (cell.type !== 'empty') return;
      cell.neighborMines = getNeighbors(row, col, rows, cols).filter(
        ([r, c]) => board[r][c].type === 'mine',
      ).length;
    });
  });
}

function openCell(row, col) {
  if (gameState.status !== 'process') return;

  const cell = board[row][col];
  if (cell.state !== 'closed') return;

  cell.state = 'opened';

  if (cell.type === 'mine') {
    finishGame('lose');
    return;
  }

  if (cell.neighborMines === 0) {
    getNeighbors(row, col, gameState.rows, gameState.cols).forEach(([r, c]) =>
      openCell(r, c),
    );
  }

  if (hasWon()) finishGame('win');
}

function hasWon() {
  return board
    .flat()
    .every((cell) => cell.type === 'mine' || cell.state === 'opened');
}

function finishGame(status) {
  gameState.status = status;
  stopTimer();
}

function countFlags() {
  return board.flat().filter((cell) => cell.state === 'flagged').length;
}

function getFlagsLeft() {
  return gameState.minesCount - countFlags();
}

function toggleFlag(row, col) {
  if (gameState.status !== 'process') return;

  const cell = board[row][col];
  if (cell.state === 'opened') return;

  if (cell.state === 'flagged') {
    cell.state = 'closed';
  } else if (getFlagsLeft() > 0) {
    cell.state = 'flagged';
  }
}

function startTimer() {
  if (gameState.status !== 'process' || gameState.timerId !== null) return;
  gameState.timerId = setInterval(() => {
    gameState.gameTime++;
    renderInfo();
  }, 1000);
}

function stopTimer() {
  clearInterval(gameState.timerId);
  gameState.timerId = null;
}

function startNewGame() {
  stopTimer();
  gameState = createGameState();
  board = generateField(gameState.rows, gameState.cols, gameState.minesCount);
  countNeighbourMines(board, gameState.rows, gameState.cols);
  render();
}

const boardElement = document.getElementById('board');
const timerElement = document.getElementById('timer');
const flagsElement = document.getElementById('flagsLeft');
const messageElement = document.getElementById('message');
const startButton = document.getElementById('startBtn');

const FACES = { process: '🙂', win: '😎', lose: '😵' };

const MESSAGES = {
  process: { text: '', className: '' },
  win: {
    text: '🎉 Перемога! Всі безпечні клітинки відкрито.',
    className: 'win',
  },
  lose: {
    text: '💥 Ви підірвалися на міні. Спробуйте ще раз!',
    className: 'lose',
  },
};

const formatCounter = (value) => String(value).padStart(3, '0');

function getCellView(cell) {
  const isGameLost = gameState.status === 'lose';

  if (cell.state === 'flagged') {
    const isCorrect = isGameLost && cell.type === 'mine';
    return { className: isCorrect ? 'flagged-mine' : 'flagged-safe' };
  }
  if (cell.state === 'opened') {
    if (cell.type === 'mine') return { className: 'mine-clicked' };
    const value = cell.neighborMines;
    return { className: 'open', value, text: value > 0 ? String(value) : '' };
  }
  if (isGameLost && cell.type === 'mine') return { className: 'mine' };
  return { className: 'closed' };
}

function createCellElement(cell, row, col) {
  const { className, value, text } = getCellView(cell);
  const element = document.createElement('div');
  element.className = `cell ${className}`;
  element.dataset.row = row;
  element.dataset.col = col;
  if (value !== undefined) element.dataset.value = value;
  if (text) element.textContent = text;
  return element;
}

function renderBoard() {
  boardElement.style.setProperty('--board-cols', gameState.cols);
  boardElement.style.setProperty('--board-rows', gameState.rows);
  boardElement.replaceChildren(
    ...board.flatMap((rowCells, row) =>
      rowCells.map((cell, col) => createCellElement(cell, row, col)),
    ),
  );
}

function renderInfo() {
  timerElement.textContent = formatCounter(gameState.gameTime);
  flagsElement.textContent = formatCounter(getFlagsLeft());
  startButton.textContent = FACES[gameState.status];

  const { text, className } = MESSAGES[gameState.status];
  messageElement.textContent = text;
  messageElement.className = `message ${className}`.trim();
}

function render() {
  renderBoard();
  renderInfo();
}

function getCellPosition(event) {
  const target = event.target.closest('.cell');
  if (!target) return null;
  return { row: Number(target.dataset.row), col: Number(target.dataset.col) };
}

boardElement.addEventListener('click', (event) => {
  const position = getCellPosition(event);
  if (!position) return;

  startTimer();
  openCell(position.row, position.col);
  render();
});

boardElement.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  const position = getCellPosition(event);
  if (!position) return;

  toggleFlag(position.row, position.col);
  render();
});

startButton.addEventListener('click', startNewGame);

startNewGame();
