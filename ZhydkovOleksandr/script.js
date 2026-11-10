'use strict';

/* ==========================================================================
   Конфігурація та стан
   ========================================================================== */

const SETTINGS = { rows: 9, cols: 9, minesCount: 10 };
const MAX_COUNTER_VALUE = 999;

const SMILEYS = { process: '🙂', win: '😎', lose: '😵' };

// Зсуви до 8 сусідніх клітинок
const NEIGHBOR_OFFSETS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

// Об'єкт стану гри (Крок 1)
const gameState = {
  rows: SETTINGS.rows,
  cols: SETTINGS.cols,
  minesCount: SETTINGS.minesCount,
  status: 'process', // 'process' | 'win' | 'lose'
  gameTime: 0, // секунди
  timerId: null, // id для clearInterval
  explodedCell: null, // { row, col } міни, на яку натиснув гравець
};

// Двовимірний масив клітинок
let board = [];

/* ==========================================================================
   Логічний шар (без доступу до DOM)
   ========================================================================== */

function createCell() {
  return { type: 'empty', neighborMines: 0, state: 'closed' };
}

// Крок 2: створення поля та випадкова розстановка мін
function generateField(rows, cols, minesCount) {
  const field = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, createCell)
  );

  let placedMines = 0;
  while (placedMines < minesCount) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);

    if (field[row][col].type === 'mine') continue; // клітинка вже зайнята

    field[row][col].type = 'mine';
    placedMines += 1;
  }

  return field;
}

// Повертає існуючих сусідів клітинки у вигляді { row, col, cell }
function getNeighbors(field, row, col) {
  return NEIGHBOR_OFFSETS
    .map(([dRow, dCol]) => ({ row: row + dRow, col: col + dCol }))
    .filter((pos) => field[pos.row]?.[pos.col] !== undefined)
    .map((pos) => ({ ...pos, cell: field[pos.row][pos.col] }));
}

// Крок 3: підрахунок мін навколо кожної порожньої клітинки
function countNeighbourMines(field) {
  field.forEach((rowCells, row) => {
    rowCells.forEach((cell, col) => {
      if (cell.type === 'mine') return;

      cell.neighborMines = getNeighbors(field, row, col)
        .filter((neighbor) => neighbor.cell.type === 'mine').length;
    });
  });
}

// Рекурсивне відкриття клітинки та порожніх областей навколо неї
function revealCell(row, col) {
  const cell = board[row][col];
  if (cell.state !== 'closed') return;

  cell.state = 'opened';

  if (cell.neighborMines === 0) {
    getNeighbors(board, row, col).forEach((neighbor) =>
      revealCell(neighbor.row, neighbor.col)
    );
  }
}

function isAllSafeCellsOpened() {
  return board.flat().every((cell) => cell.type === 'mine' || cell.state === 'opened');
}

function loseGame(row, col) {
  gameState.status = 'lose';
  gameState.explodedCell = { row, col };
  stopTimer();

  // Показуємо всі міни, крім тих, що позначені прапорцем
  board.flat().forEach((cell) => {
    if (cell.type === 'mine' && cell.state === 'closed') cell.state = 'opened';
  });
  board[row][col].state = 'opened';
}

function winGame() {
  gameState.status = 'win';
  stopTimer();

  board.flat().forEach((cell) => {
    if (cell.type === 'mine') cell.state = 'flagged';
  });
}

// Крок 3 і 8: відкриття клітинки та перехід статусу гри
function openCell(row, col) {
  if (gameState.status !== 'process') return;

  const cell = board[row][col];
  if (cell.state !== 'closed') return; // 'opened' або 'flagged'

  if (cell.type === 'mine') {
    loseGame(row, col);
    return;
  }

  revealCell(row, col);

  if (isAllSafeCellsOpened()) winGame();
}

function getFlagsLeft() {
  const flagsCount = board.flat().filter((cell) => cell.state === 'flagged').length;
  return gameState.minesCount - flagsCount;
}

// Крок 4: прапорці
function toggleFlag(row, col) {
  if (gameState.status !== 'process') return;

  const cell = board[row][col];

  if (cell.state === 'flagged') {
    cell.state = 'closed';
  } else if (cell.state === 'closed' && getFlagsLeft() > 0) {
    cell.state = 'flagged';
  }
}

// Крок 4: таймер
function startTimer(onTick) {
  stopTimer();
  gameState.timerId = setInterval(() => {
    gameState.gameTime += 1;
    onTick();
  }, 1000);
}

function stopTimer() {
  clearInterval(gameState.timerId);
  gameState.timerId = null;
}

/* ==========================================================================
   Шар відображення (DOM)
   ========================================================================== */

const boardElement = document.querySelector('.board');
const restartButton = document.querySelector('.restart-button');
const flagsCounterElement = document.querySelector('#flags-counter');
const timerElement = document.querySelector('#timer');
const messageElement = document.querySelector('.game-message');

function formatCounter(value) {
  return String(Math.min(value, MAX_COUNTER_VALUE)).padStart(3, '0');
}

// Крок 5: створення HTML-сітки (один раз на нову гру)
function createBoardElements() {
  boardElement.style.setProperty('--cols', gameState.cols);

  const cellElements = [];
  for (let row = 0; row < gameState.rows; row += 1) {
    for (let col = 0; col < gameState.cols; col += 1) {
      const element = document.createElement('button');
      element.type = 'button';
      element.dataset.row = row;
      element.dataset.col = col;
      cellElements.push(element);
    }
  }

  boardElement.replaceChildren(...cellElements);
}

// Оновлює вигляд однієї клітинки згідно з її даними
function renderCell(element, cell, row, col) {
  const isGameOver = gameState.status !== 'process';
  const classNames = ['cell', cell.state];
  let text = '';
  let label = 'Закрита клітинка';

  if (cell.state === 'flagged') {
    label = 'Прапорець';
    if (isGameOver && cell.type === 'mine') classNames.push('mine');
    if (gameState.status === 'lose' && cell.type === 'empty') classNames.push('wrong-flag');
  } else if (cell.state === 'opened') {
    if (cell.type === 'mine') {
      label = 'Міна';
      classNames.push('mine');
      const { explodedCell } = gameState;
      if (explodedCell?.row === row && explodedCell?.col === col) classNames.push('exploded');
    } else if (cell.neighborMines > 0) {
      label = `Мін поруч: ${cell.neighborMines}`;
      text = cell.neighborMines;
      classNames.push(`n${cell.neighborMines}`);
    } else {
      label = 'Порожня клітинка';
    }
  }

  element.className = classNames.join(' ');
  element.textContent = text;
  element.setAttribute('aria-disabled', String(isGameOver || cell.state === 'opened'));
  element.setAttribute('aria-label', label);
}

function renderBoard() {
  board.forEach((rowCells, row) => {
    rowCells.forEach((cell, col) => {
      renderCell(boardElement.children[row * gameState.cols + col], cell, row, col);
    });
  });
}

// Крок 6: динамічні елементи інтерфейсу
function renderTimer() {
  timerElement.textContent = formatCounter(gameState.gameTime);
  timerElement.dateTime = `PT${gameState.gameTime}S`;
}

function renderFlagsCounter() {
  flagsCounterElement.textContent = formatCounter(getFlagsLeft());
}

// Крок 8: візуальне сповіщення про результат
function renderStatus() {
  restartButton.textContent = SMILEYS[gameState.status];

  const messages = {
    win: `Перемога! Час: ${gameState.gameTime} с`,
    lose: 'Поразка: ви підірвалися на міні',
  };
  const message = messages[gameState.status];

  messageElement.textContent = message ?? '';
  messageElement.textContent = message ?? '';
  messageElement.dataset.status = gameState.status;
}

function renderGame() {
  renderBoard();
  renderFlagsCounter();
  renderTimer();
  renderStatus();
}

/* ==========================================================================
   Керування грою та події
   ========================================================================== */

function startNewGame() {
  stopTimer();
  Object.assign(gameState, { status: 'process', gameTime: 0, explodedCell: null });

  board = generateField(gameState.rows, gameState.cols, gameState.minesCount);
  countNeighbourMines(board);

  createBoardElements();
  renderGame();
}

function getCellPosition(event) {
  const element = event.target.closest('.cell');
  if (!element) return null;

  return { row: Number(element.dataset.row), col: Number(element.dataset.col) };
}

// Крок 7: лівий клік — відкриття клітинки
function handleBoardClick(event) {
  const position = getCellPosition(event);
  if (!position) return;

  const { row, col } = position;
  const isFirstOpening = gameState.timerId === null && board[row][col].state === 'closed';
  if (gameState.status === 'process' && isFirstOpening) startTimer(renderTimer);

  openCell(row, col);
  renderGame();
}

// Крок 7: правий клік — прапорець, без стандартного контекстного меню
function handleBoardContextMenu(event) {
  event.preventDefault();

  const position = getCellPosition(event);
  if (!position) return;

  toggleFlag(position.row, position.col);
  renderGame();
}

boardElement.addEventListener('click', handleBoardClick);
boardElement.addEventListener('contextmenu', handleBoardContextMenu);
restartButton.addEventListener('click', startNewGame);

startNewGame();