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

// Класи, на які спирається styles.css (стани клітинки беруться з CELL_STATE)
const CSS_CLASS = {
  CELL: 'cell',
  MINE: 'mine',
  EXPLODED: 'exploded',
  WRONG_FLAG: 'wrong-flag',
  NUMBER_PREFIX: 'n',
};

const CELL_LABEL = {
  CLOSED: 'Закрита клітинка',
  FLAGGED: 'Прапорець',
  MINE: 'Міна',
  EMPTY: 'Порожня клітинка',
};

const TAB_INDEX = { FOCUSABLE: 0, SKIPPED: -1 };

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
    .map(([rowOffset, colOffset]) => ({ row: row + rowOffset, col: col + colOffset }))
    .filter((position) => field[position.row]?.[position.col] !== undefined)
    .map((position) => ({ ...position, cell: field[position.row][position.col] }));
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
function revealCell(field, row, col) {
  const cell = field[row][col];
  if (cell.state !== CELL_STATE.CLOSED) return;

  cell.state = CELL_STATE.OPENED;

  if (cell.neighborMines === 0) {
    getNeighbors(field, row, col).forEach((neighbor) =>
      revealCell(field, neighbor.row, neighbor.col)
    );
  }
}

function isAllSafeCellsOpened(field) {
  return field
    .flat()
    .every((cell) => cell.type === CELL_TYPE.MINE || cell.state === CELL_STATE.OPENED);
}

// Показуємо всі міни, крім тих, що позначені прапорцем
function revealMines(field) {
  field.flat().forEach((cell) => {
    if (cell.type === CELL_TYPE.MINE && cell.state === CELL_STATE.CLOSED) {
      cell.state = CELL_STATE.OPENED;
    }
  });
}

// Після перемоги всі міни отримують прапорці
function flagMines(field) {
  field.flat().forEach((cell) => {
    if (cell.type === CELL_TYPE.MINE) cell.state = CELL_STATE.FLAGGED;
  });
}

function getFlagsLeft(field, minesCount) {
  const flagsCount = field.flat().filter((cell) => cell.state === CELL_STATE.FLAGGED).length;
  return minesCount - flagsCount;
}

function finishGame(status) {
  gameState.status = status;
  stopTimer();
}

// Крок 3 і 8: відкриття клітинки та перехід статусу гри
function openCell(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) return;

  const cell = board[row][col];
  if (cell.state !== CELL_STATE.CLOSED) return; // 'opened' або 'flagged'

  if (cell.type === CELL_TYPE.MINE) {
    finishGame(GAME_STATUS.LOSE);
    revealMines(board);
    return;
  }

  revealCell(board, row, col);

  if (isAllSafeCellsOpened(board)) {
    finishGame(GAME_STATUS.WIN);
    flagMines(board);
  }
}

// Крок 4: прапорці
function toggleFlag(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) return;

  const cell = board[row][col];

  if (cell.state === CELL_STATE.FLAGGED) {
    cell.state = CELL_STATE.CLOSED;
  } else if (
    cell.state === CELL_STATE.CLOSED &&
    getFlagsLeft(board, gameState.minesCount) > 0
  ) {
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

function getCellElement(row, col) {
  return boardElement.children[row * gameState.cols + col];
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
function renderCell(element, cell) {
  const isGameOver = gameState.status !== GAME_STATUS.PROCESS;
  const isOpened = cell.state === CELL_STATE.OPENED;
  const isInteractive = !isGameOver && !isOpened;
  const classNames = [CSS_CLASS.CELL, cell.state];
  let text = '';
  let label = CELL_LABEL.CLOSED;

  if (cell.state === CELL_STATE.FLAGGED) {
    label = CELL_LABEL.FLAGGED;
    if (isGameOver && cell.type === CELL_TYPE.MINE) classNames.push(CSS_CLASS.MINE);
    if (gameState.status === GAME_STATUS.LOSE && cell.type === CELL_TYPE.EMPTY) {
      classNames.push(CSS_CLASS.WRONG_FLAG);
    }
  } else if (isOpened) {
    if (cell.type === CELL_TYPE.MINE) {
      label = CELL_LABEL.MINE;
      classNames.push(CSS_CLASS.MINE);
      // Підсвітка міни, що вибухнула, зберігається в самому елементі
      if (element.classList.contains(CSS_CLASS.EXPLODED)) classNames.push(CSS_CLASS.EXPLODED);
    } else if (cell.neighborMines > 0) {
      label = `Мін поруч: ${cell.neighborMines}`;
      text = cell.neighborMines;
      classNames.push(`${CSS_CLASS.NUMBER_PREFIX}${cell.neighborMines}`);
    } else {
      label = CELL_LABEL.EMPTY;
    }
  }

  element.className = classNames.join(' ');
  element.textContent = text;
  element.setAttribute('aria-disabled', String(!isInteractive));
  element.setAttribute('aria-label', label);
  // Неактивні клітинки (відкриті або після завершення гри) не беруть участі в Tab-навігації
  element.tabIndex = isInteractive ? TAB_INDEX.FOCUSABLE : TAB_INDEX.SKIPPED;
}

function renderBoard() {
  board.forEach((rowCells, row) => {
    rowCells.forEach((cell, col) => {
      renderCell(getCellElement(row, col), cell);
    });
  });
}

// Крок 6: динамічні елементи інтерфейсу
function renderTimer() {
  timerElement.textContent = formatCounter(gameState.gameTime);
  timerElement.dateTime = `PT${gameState.gameTime}S`;
}

function renderFlagsCounter() {
  flagsCounterElement.textContent = formatCounter(getFlagsLeft(board, gameState.minesCount));
}

// Крок 8: візуальне сповіщення про результат
function renderStatus() {
  restartButton.textContent = SMILEYS[gameState.status];

  const messages = {
    [GAME_STATUS.WIN]: `Перемога! Час: ${gameState.gameTime} с`,
    [GAME_STATUS.LOSE]: 'Поразка: ви підірвалися на міні',
  };

  messageElement.textContent = messages[gameState.status] ?? '';
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

  board = generateField(gameState.rows, gameState.cols, gameState.minesCount);
  countNeighbourMines(board);

  createBoardElements();
  renderGame();
}

function getCellPosition(event) {
  const element = event.target.closest(`.${CSS_CLASS.CELL}`);
  if (!element) return null;

  return { row: Number(element.dataset.row), col: Number(element.dataset.col) };
}

// Таймер стартує при першому відкритті закритої клітинки
function startTimerOnFirstOpening(row, col) {
  const isFirstOpening =
    gameState.timerId === null && board[row][col].state === CELL_STATE.CLOSED;

  if (gameState.status === GAME_STATUS.PROCESS && isFirstOpening) startTimer(renderTimer);
}

// Крок 7: лівий клік — відкриття клітинки
function handleBoardClick(event) {
  const position = getCellPosition(event);
  if (!position) return;

  const { row, col } = position;
  const wasInProgress = gameState.status === GAME_STATUS.PROCESS;

  startTimerOnFirstOpening(row, col);
  openCell(row, col);

  if (wasInProgress && gameState.status === GAME_STATUS.LOSE) {
    getCellElement(row, col).classList.add(CSS_CLASS.EXPLODED);
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