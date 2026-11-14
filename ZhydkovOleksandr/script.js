'use strict';

/* ==========================================================================
   Конфігурація та стан
   ========================================================================== */

const SETTINGS = { rows: 9, cols: 9, minesCount: 10 };
const MAX_COUNTER_VALUE = 999;
const COUNTER_DIGITS = 3;
const TIMER_INTERVAL_MS = 1000;

const GAME_STATUS = { PROCESS: 'process', WIN: 'win', LOSE: 'lose' };
const CELL_STATE = { CLOSED: 'closed', OPENED: 'opened', FLAGGED: 'flagged' };
const CELL_TYPE = { EMPTY: 'empty', MINE: 'mine' };

const SMILEYS = {
  [GAME_STATUS.PROCESS]: '🙂',
  [GAME_STATUS.WIN]: '😎',
  [GAME_STATUS.LOSE]: '😵',
};

// Зсуви до 8 сусідніх клітинок
const NEIGHBOR_OFFSETS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

// Об'єкт стану гри (Крок 1): рівно шість полів
const gameState = {
  rows: SETTINGS.rows,
  cols: SETTINGS.cols,
  minesCount: SETTINGS.minesCount,
  status: GAME_STATUS.PROCESS, // 'process' | 'win' | 'lose'
  gameTime: 0, // секунди
  timerId: null, // id для clearInterval
};

// Двовимірний масив клітинок
let board = [];

// Стан шару відображення: міна, на яку натиснув гравець (не частина gameState)
const renderState = { explodedPosition: null };

/* ==========================================================================
   Логічний шар (без доступу до DOM)
   ========================================================================== */

function createCell() {
  return { type: CELL_TYPE.EMPTY, neighborMines: 0, state: CELL_STATE.CLOSED };
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

    if (field[row][col].type === CELL_TYPE.MINE) continue; // клітинка вже зайнята

    field[row][col].type = CELL_TYPE.MINE;
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
      if (cell.type === CELL_TYPE.MINE) return;

      cell.neighborMines = getNeighbors(field, row, col)
        .filter((neighbor) => neighbor.cell.type === CELL_TYPE.MINE).length;
    });
  });
}

// Рекурсивне відкриття клітинки та порожніх областей навколо неї
function revealCell(row, col) {
  const cell = board[row][col];
  if (cell.state !== CELL_STATE.CLOSED) return;

  cell.state = CELL_STATE.OPENED;

  if (cell.neighborMines === 0) {
    getNeighbors(board, row, col).forEach((neighbor) =>
      revealCell(neighbor.row, neighbor.col)
    );
  }
}

function isAllSafeCellsOpened() {
  return board
    .flat()
    .every((cell) => cell.type === CELL_TYPE.MINE || cell.state === CELL_STATE.OPENED);
}

function loseGame(row, col) {
  gameState.status = GAME_STATUS.LOSE;
  stopTimer();

  // Показуємо всі міни, крім тих, що позначені прапорцем
  board.flat().forEach((cell) => {
    if (cell.type === CELL_TYPE.MINE && cell.state === CELL_STATE.CLOSED) {
      cell.state = CELL_STATE.OPENED;
    }
  });
  board[row][col].state = CELL_STATE.OPENED;
}

function winGame() {
  gameState.status = GAME_STATUS.WIN;
  stopTimer();

  board.flat().forEach((cell) => {
    if (cell.type === CELL_TYPE.MINE) cell.state = CELL_STATE.FLAGGED;
  });
}

// Крок 3 і 8: відкриття клітинки та перехід статусу гри
function openCell(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) return;

  const cell = board[row][col];
  if (cell.state !== CELL_STATE.CLOSED) return; // 'opened' або 'flagged'

  if (cell.type === CELL_TYPE.MINE) {
    loseGame(row, col);
    return;
  }

  revealCell(row, col);

  if (isAllSafeCellsOpened()) winGame();
}

function getFlagsLeft() {
  const flagsCount = board.flat().filter((cell) => cell.state === CELL_STATE.FLAGGED).length;
  return gameState.minesCount - flagsCount;
}

// Крок 4: прапорці
function toggleFlag(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) return;

  const cell = board[row][col];

  if (cell.state === CELL_STATE.FLAGGED) {
    cell.state = CELL_STATE.CLOSED;
  } else if (cell.state === CELL_STATE.CLOSED && getFlagsLeft() > 0) {
    cell.state = CELL_STATE.FLAGGED;
  }
}

// Крок 4: таймер
function startTimer(onTick) {
  stopTimer();
  gameState.timerId = setInterval(() => {
    gameState.gameTime += 1;
    onTick();
  }, TIMER_INTERVAL_MS);
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
  return String(Math.min(value, MAX_COUNTER_VALUE)).padStart(COUNTER_DIGITS, '0');
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
  const isGameOver = gameState.status !== GAME_STATUS.PROCESS;
  const classNames = ['cell', cell.state];
  let text = '';
  let label = 'Закрита клітинка';

  if (cell.state === CELL_STATE.FLAGGED) {
    label = 'Прапорець';
    if (isGameOver && cell.type === CELL_TYPE.MINE) classNames.push('mine');
    if (gameState.status === GAME_STATUS.LOSE && cell.type === CELL_TYPE.EMPTY) {
      classNames.push('wrong-flag');
    }
  } else if (cell.state === CELL_STATE.OPENED) {
    if (cell.type === CELL_TYPE.MINE) {
      label = 'Міна';
      classNames.push('mine');
      const { explodedPosition } = renderState;
      if (explodedPosition?.row === row && explodedPosition?.col === col) {
        classNames.push('exploded');
      }
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
  element.setAttribute('aria-disabled', String(isGameOver || cell.state === CELL_STATE.OPENED));
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
    [GAME_STATUS.WIN]: `Перемога! Час: ${gameState.gameTime} с`,
    [GAME_STATUS.LOSE]: 'Поразка: ви підірвалися на міні',
  };
  const message = messages[gameState.status];

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
  Object.assign(gameState, { status: GAME_STATUS.PROCESS, gameTime: 0 });
  renderState.explodedPosition = null;

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
  const isFirstOpening =
    gameState.timerId === null && board[row][col].state === CELL_STATE.CLOSED;
  if (gameState.status === GAME_STATUS.PROCESS && isFirstOpening) startTimer(renderTimer);

  openCell(row, col);

  if (gameState.status === GAME_STATUS.LOSE && renderState.explodedPosition === null) {
    renderState.explodedPosition = { row, col };
  }

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