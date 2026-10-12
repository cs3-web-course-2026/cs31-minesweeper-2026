'use strict';

const ROWS = 10;
const COLS = 10;
const MINES_COUNT = 15;
const SECOND = 1000;

const GAME_STATUS = {
  PROCESS: 'process',
  WIN: 'win',
  LOSE: 'lose',
};

const CELL_TYPE = {
  EMPTY: 'empty',
  MINE: 'mine',
};

const CELL_STATE = {
  CLOSED: 'closed',
  OPENED: 'opened',
  FLAGGED: 'flagged',
};

const NEIGHBOUR_OFFSETS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

const gameState = {
  rows: ROWS,
  cols: COLS,
  minesCount: MINES_COUNT,
  status: GAME_STATUS.PROCESS,
  gameTime: 0,
  timerId: null,
};

let field = [];

function createCell() {
  return {
    type: CELL_TYPE.EMPTY,
    neighborMines: 0,
    state: CELL_STATE.CLOSED,
  };
}

function createEmptyField(rows, cols) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, createCell)
  );
}

function plantMines(targetField, minesCount) {
  const rows = targetField.length;
  const cols = targetField[0].length;
  let planted = 0;

  while (planted < minesCount) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);
    const cell = targetField[row][col];

    if (cell.type !== CELL_TYPE.MINE) {
      cell.type = CELL_TYPE.MINE;
      planted += 1;
    }
  }
}

function isInsideField(targetField, row, col) {
  return (
    row >= 0 &&
    row < targetField.length &&
    col >= 0 &&
    col < targetField[row].length
  );
}

function forEachNeighbour(targetField, row, col, callback) {
  NEIGHBOUR_OFFSETS.forEach(([rowOffset, colOffset]) => {
    const neighbourRow = row + rowOffset;
    const neighbourCol = col + colOffset;

    if (isInsideField(targetField, neighbourRow, neighbourCol)) {
      callback(neighbourRow, neighbourCol);
    }
  });
}

/** Записує в кожну порожню клітинку кількість мін навколо неї. */
function countNeighbourMines(targetField) {
  targetField.forEach((rowCells, row) => {
    rowCells.forEach((cell, col) => {
      if (cell.type === CELL_TYPE.MINE) {
        return;
      }

      let mines = 0;
      forEachNeighbour(targetField, row, col, (neighbourRow, neighbourCol) => {
        if (targetField[neighbourRow][neighbourCol].type === CELL_TYPE.MINE) {
          mines += 1;
        }
      });

      cell.neighborMines = mines;
    });
  });
}

/** Повертає готове до гри поле: сітка, міни, підрахунок сусідів. */
function generateField(rows, cols, minesCount) {
  const newField = createEmptyField(rows, cols);

  plantMines(newField, minesCount);
  countNeighbourMines(newField);

  return newField;
}

/* ==========================================================================
   Ігрова логіка
   ========================================================================== */

/** Кількість виставлених прапорців. */
function countFlags() {
  return field.flat().filter((cell) => cell.state === CELL_STATE.FLAGGED)
    .length;
}

/** Чи відкриті всі клітинки без мін. */
function isFieldCleared() {
  return field
    .flat()
    .every(
      (cell) =>
        cell.type === CELL_TYPE.MINE || cell.state === CELL_STATE.OPENED
    );
}

/** Відкриває всі міни — використовується при програші. */
function revealMines() {
  field.flat().forEach((cell) => {
    if (cell.type === CELL_TYPE.MINE && cell.state !== CELL_STATE.FLAGGED) {
      cell.state = CELL_STATE.OPENED;
    }
  });
}

/**
 * Рекурсивно відкриває клітинку та, якщо вона порожня,
 * усіх її сусідів — до перших клітинок із цифрами.
 */
function revealFrom(row, col) {
  const cell = field[row][col];

  if (cell.state !== CELL_STATE.CLOSED) {
    return;
  }

  cell.state = CELL_STATE.OPENED;

  if (cell.neighborMines === 0) {
    forEachNeighbour(field, row, col, revealFrom);
  }
}

/** Завершує гру із заданим статусом і зупиняє таймер. */
function finishGame(status) {
  gameState.status = status;
  stopTimer();

  if (status === GAME_STATUS.LOSE) {
    revealMines();
  }
}

/** Обробляє відкриття клітинки гравцем. */
function openCell(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) {
    return;
  }

  const cell = field[row][col];

  if (cell.state !== CELL_STATE.CLOSED) {
    return;
  }

  if (cell.type === CELL_TYPE.MINE) {
    cell.state = CELL_STATE.OPENED;
    finishGame(GAME_STATUS.LOSE);
    return;
  }

  revealFrom(row, col);

  if (isFieldCleared()) {
    finishGame(GAME_STATUS.WIN);
  }
}

/** Ставить або знімає прапорець на закритій клітинці. */
function toggleFlag(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) {
    return;
  }

  const cell = field[row][col];

  if (cell.state === CELL_STATE.OPENED) {
    return;
  }

  cell.state =
    cell.state === CELL_STATE.FLAGGED ? CELL_STATE.CLOSED : CELL_STATE.FLAGGED;
}

/* ==========================================================================
   Таймер
   ========================================================================== */

function stopTimer() {
  clearInterval(gameState.timerId);
  gameState.timerId = null;
}

/** Запускає відлік часу, якщо він ще не йде. */
function startTimer() {
  if (gameState.timerId !== null) {
    return;
  }

  gameState.timerId = setInterval(() => {
    gameState.gameTime += 1;
    renderHeader();
  }, SECOND);
}

/* ==========================================================================
   Робота з DOM
   ========================================================================== */

const boardElement = document.querySelector('#board');
const timerElement = document.querySelector('#timer');
const flagsElement = document.querySelector('#flags-count');
const messageElement = document.querySelector('#game-message');
const restartButton = document.querySelector('#restart-btn');

/** Форматує секунди у вигляд MM:SS. */
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Повертає список CSS-класів для поточного стану клітинки. */
function getCellClasses(cell) {
  const classes = ['cell'];

  if (cell.state === CELL_STATE.FLAGGED) {
    const isWrongFlag =
      gameState.status === GAME_STATUS.LOSE && cell.type !== CELL_TYPE.MINE;

    classes.push(isWrongFlag ? 'cell-flagged-wrong' : 'cell-flagged');
    return classes;
  }

  if (cell.state === CELL_STATE.CLOSED) {
    classes.push('cell-closed');
    return classes;
  }

  classes.push(cell.type === CELL_TYPE.MINE ? 'cell-mine' : 'cell-open');
  return classes;
}

/** Повертає текст або іконку, яку видно на клітинці. */
function getCellContent(cell) {
  if (cell.state === CELL_STATE.FLAGGED) {
    return '🏳️';
  }

  if (cell.state !== CELL_STATE.OPENED) {
    return '';
  }

  if (cell.type === CELL_TYPE.MINE) {
    return '💣';
  }

  return cell.neighborMines > 0 ? String(cell.neighborMines) : '';
}

/** Створює DOM-елемент однієї клітинки. */
function createCellElement(cell, row, col) {
  const button = document.createElement('button');

  button.type = 'button';
  button.className = getCellClasses(cell).join(' ');
  button.textContent = getCellContent(cell);
  button.dataset.row = String(row);
  button.dataset.col = String(col);
  button.setAttribute('aria-label', `Cell ${row + 1}, ${col + 1}`);

  if (cell.state === CELL_STATE.OPENED && cell.neighborMines > 0) {
    button.dataset.count = String(cell.neighborMines);
  }

  return button;
}

/** Перемальовує ігрове поле за поточними даними. */
function renderBoard() {
  const fragment = document.createDocumentFragment();

  field.forEach((rowCells, row) => {
    rowCells.forEach((cell, col) => {
      fragment.append(createCellElement(cell, row, col));
    });
  });

  boardElement.replaceChildren(fragment);
}

/** Оновлює таймер і лічильник прапорців. */
function renderHeader() {
  timerElement.textContent = formatTime(gameState.gameTime);
  flagsElement.textContent = String(gameState.minesCount - countFlags());
}

/** Показує повідомлення про перемогу або поразку. */
function renderMessage() {
  const messages = {
    [GAME_STATUS.WIN]: 'You win!',
    [GAME_STATUS.LOSE]: 'Game over',
  };

  messageElement.textContent = messages[gameState.status] ?? '';
}

/** Повністю оновлює інтерфейс за поточним станом гри. */
function render() {
  renderBoard();
  renderHeader();
  renderMessage();
}

/* ==========================================================================
   Обробка подій
   ========================================================================== */

/** Повертає координати клітинки за подією або null. */
function getCellPosition(event) {
  const cellElement = event.target.closest('.cell');

  if (!cellElement || !boardElement.contains(cellElement)) {
    return null;
  }

  return {
    row: Number(cellElement.dataset.row),
    col: Number(cellElement.dataset.col),
  };
}

function handleBoardClick(event) {
  const position = getCellPosition(event);

  if (!position || gameState.status !== GAME_STATUS.PROCESS) {
    return;
  }

  startTimer();
  openCell(position.row, position.col);
  render();
}

function handleBoardContextMenu(event) {
  event.preventDefault();

  const position = getCellPosition(event);

  if (!position || gameState.status !== GAME_STATUS.PROCESS) {
    return;
  }

  startTimer();
  toggleFlag(position.row, position.col);
  render();
}

/** Скидає стан і починає нову гру. */
function startGame() {
  stopTimer();

  gameState.status = GAME_STATUS.PROCESS;
  gameState.gameTime = 0;
  field = generateField(gameState.rows, gameState.cols, gameState.minesCount);

  render();
}

/* ==========================================================================
   Ініціалізація
   ========================================================================== */

boardElement.style.setProperty('--board-cols', String(COLS));
boardElement.addEventListener('click', handleBoardClick);
boardElement.addEventListener('contextmenu', handleBoardContextMenu);
restartButton.addEventListener('click', startGame);

startGame();
