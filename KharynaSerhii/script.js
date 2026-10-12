/**
 * Клітинка ігрового поля.
 * @typedef {Object} Cell
 * @property {'empty'|'mine'} type Вміст клітинки.
 * @property {'closed'|'opened'|'flagged'} state Стан клітинки.
 * @property {number} neighborMines Кількість мін серед сусідів.
 */

const CELL_TYPE = { EMPTY: 'empty', MINE: 'mine' };
const CELL_STATE = { CLOSED: 'closed', OPENED: 'opened', FLAGGED: 'flagged' };
const GAME_STATUS = { PROCESS: 'process', WIN: 'win', LOSE: 'lose' };
const DEFAULT_SETTINGS = { ROWS: 9, COLS: 9, MINES: 10 };
const TIMER_INTERVAL = 1000;
const COUNTER_DIGITS = 3;
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1],
  [0, 1], [1, -1], [1, 0], [1, 1],
];
const DOM = {
  board: document.getElementById('board'),
  flags: document.getElementById('flag-counter'),
  timer: document.getElementById('timer'),
  message: document.getElementById('game-message'),
  restart: document.querySelector('.restart-button'),
  face: document.getElementById('restart-face'),
};
const gameState = {
  rows: DEFAULT_SETTINGS.ROWS,
  cols: DEFAULT_SETTINGS.COLS,
  minesCount: DEFAULT_SETTINGS.MINES,
  status: GAME_STATUS.PROCESS,
  gameTime: 0,
  timerId: null,
};
let board = [];

/**
 * Повертає координати сусідів, які не виходять за межі поля.
 * @param {Cell[][]} field Ігрове поле.
 * @param {number} row Рядок клітинки.
 * @param {number} col Стовпець клітинки.
 * @returns {number[][]} Координати сусідніх клітинок.
 */
function getNeighbours(field, row, col) {

  return DIRECTIONS.map(([directionalRow, directionalCol]) => [
    row + directionalRow, col + directionalCol,
  ]).filter(([neighbourRow, neighbourCol]) =>
    neighbourRow >= 0 && neighbourRow < field.length &&
    neighbourCol >= 0 && neighbourCol < field[neighbourRow].length,
  );
}


/**
 * Рахує прапорці за станами клітинок.
 * @param {Cell[][]} field Ігрове поле.
 * @returns {number} Кількість установлених прапорців.
 */
function countFlags(field) {

  return field.flat().filter(cell => cell.state === CELL_STATE.FLAGGED).length;
}


/**
 * Перевіряє, чи відкриті всі клітинки без мін.
 * @param {Cell[][]} field Ігрове поле.
 * @returns {boolean} Чи виконано умову перемоги.
 */
function checkWinCondition(field) {

  return field.flat().every(cell =>
    cell.type === CELL_TYPE.MINE || cell.state === CELL_STATE.OPENED,
  );
}


/**
 * Створює закрите поле й випадково розставляє міни без повторів.
 * @param {number} rows Кількість рядків.
 * @param {number} cols Кількість стовпців.
 * @param {number} minesCount Кількість мін.
 * @returns {Cell[][]} Нове поле з мінами.
 * @throws {RangeError} Якщо розміри або кількість мін некоректні.
 */
function generateField(rows, cols, minesCount) {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) ||
      !Number.isInteger(minesCount) || rows <= 0 || cols <= 0 ||
      minesCount < 0 || minesCount >= rows * cols) {

    throw new RangeError('Некоректні розміри поля або кількість мін.');
  }

  const field = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      type: CELL_TYPE.EMPTY,
      state: CELL_STATE.CLOSED,
      neighborMines: 0,
    })),
  );
  const positions = Array.from({ length: rows * cols }, (_, position) => position);

  // Вибираємо позиції без повторів, навіть для щільного поля.
  for (let mineIndex = 0; mineIndex < minesCount; mineIndex++) {
    const randomIndex = mineIndex + Math.floor(Math.random() * (positions.length - mineIndex));
    [positions[mineIndex], positions[randomIndex]] = [positions[randomIndex], positions[mineIndex]];
    const position = positions[mineIndex];
    field[Math.floor(position / cols)][position % cols].type = CELL_TYPE.MINE;
  }

  return field;
}


/**
 * Записує в кожну клітинку кількість мін серед її сусідів.
 * @param {Cell[][]} field Поле, яке потрібно обробити.
 * @returns {void}
 */
function countNeighbourMines(field) {
  field.forEach((cells, row) => cells.forEach((cell, col) => {
    cell.neighborMines = getNeighbours(field, row, col).filter(
      ([neighbourRow, neighbourCol]) => field[neighbourRow][neighbourCol].type === CELL_TYPE.MINE,
    ).length;
  }));
}


/**
 * Рекурсивно відкриває порожню область і цифри на її межі.
 * Прапорці, міни та вже відкриті клітинки пропускаються.
 * @param {Cell[][]} field Ігрове поле.
 * @param {number} row Рядок клітинки.
 * @param {number} col Стовпець клітинки.
 * @returns {void}
 */
function revealSafeCells(field, row, col) {
  const cell = field[row]?.[col];
  if (!cell || cell.state !== CELL_STATE.CLOSED || cell.type === CELL_TYPE.MINE) {

    return;
  }

  cell.state = CELL_STATE.OPENED;
  if (cell.neighborMines === 0) {
    getNeighbours(field, row, col).forEach(([neighbourRow, neighbourCol]) => {
      revealSafeCells(field, neighbourRow, neighbourCol);
    });
  }
}


/**
 * Зупиняє попередній таймер і очищує його ідентифікатор.
 * @returns {void}
 */
function stopTimer() {
  clearInterval(gameState.timerId);
  gameState.timerId = null;
}


/**
 * Запускає один таймер, який щосекунди оновлює час гри.
 * @returns {void}
 */
function startTimer() {
  if (gameState.timerId !== null || gameState.status !== GAME_STATUS.PROCESS) {

    return;
  }

  gameState.timerId = setInterval(() => {
    gameState.gameTime++;
    renderTimer();
  }, TIMER_INTERVAL);
}


/**
 * Відкриває клітинку та перевіряє перемогу або поразку.
 * @param {number} row Рядок клітинки.
 * @param {number} col Стовпець клітинки.
 * @returns {void}
 */
function openCell(row, col) {
  const cell = board[row]?.[col];
  if (!cell || gameState.status !== GAME_STATUS.PROCESS || cell.state !== CELL_STATE.CLOSED) {

    return;
  }

  startTimer();
  if (cell.type === CELL_TYPE.MINE) {
    cell.state = CELL_STATE.OPENED;
    gameState.status = GAME_STATUS.LOSE;
  } else {
    revealSafeCells(board, row, col);
    if (checkWinCondition(board)) {
      gameState.status = GAME_STATUS.WIN;
    }
  }

  if (gameState.status !== GAME_STATUS.PROCESS) {
    stopTimer();
  }
}


/**
 * Перемикає прапорець, якщо клітинка закрита й гра триває.
 * @param {number} row Рядок клітинки.
 * @param {number} col Стовпець клітинки.
 * @returns {void}
 */
function toggleFlag(row, col) {
  const cell = board[row]?.[col];
  if (!cell || gameState.status !== GAME_STATUS.PROCESS || cell.state === CELL_STATE.OPENED) {

    return;
  }

  if (cell.state === CELL_STATE.FLAGGED) {
    cell.state = CELL_STATE.CLOSED;
  } else if (countFlags(board) < gameState.minesCount) {
    cell.state = CELL_STATE.FLAGGED;
  }
}


/**
 * Скидає час і статус та створює нове поле із сусідніми числами.
 * @returns {void}
 */
function resetGame() {
  stopTimer();
  gameState.status = GAME_STATUS.PROCESS;
  gameState.gameTime = 0;
  board = generateField(gameState.rows, gameState.cols, gameState.minesCount);
  countNeighbourMines(board);
}


/**
 * Показує поточний час у лічильнику на сторінці.
 * @returns {void}
 */
function renderTimer() {
  DOM.timer.textContent = String(gameState.gameTime).padStart(COUNTER_DIGITS, '0');
}


/**
 * Оновлює прапорці, час, обличчя кнопки та повідомлення гри.
 * @returns {void}
 */
function renderIndicators() {
  DOM.flags.textContent = String(gameState.minesCount - countFlags(board)).padStart(COUNTER_DIGITS, '0');
  renderTimer();
  DOM.face.textContent = gameState.status === GAME_STATUS.WIN ? '😎' :
    gameState.status === GAME_STATUS.LOSE ? '😵' : '🙂';
  DOM.message.dataset.status = gameState.status;
  DOM.message.textContent = gameState.status === GAME_STATUS.WIN ?
    'Перемога! Усі безпечні клітинки відкриті.' :
    gameState.status === GAME_STATUS.LOSE ? 'Ви натрапили на міну. Спробуйте ще раз!' :
    gameState.timerId === null ? 'Відкрийте клітинку, щоб почати гру.' :
    'Знайдіть усі безпечні клітинки. Прапорець: правий клік або F.';
}


/**
 * Оновлює вигляд і доступний опис однієї кнопки клітинки.
 * @param {HTMLButtonElement} button Кнопка клітинки.
 * @param {Cell} cell Дані клітинки.
 * @param {number} row Рядок клітинки.
 * @param {number} col Стовпець клітинки.
 * @returns {void}
 */
function updateCellButton(button, cell, row, col) {
  button.className = 'cell';
  button.textContent = '';
  let description = 'закрита';
  const showMine = gameState.status === GAME_STATUS.LOSE && cell.type === CELL_TYPE.MINE;

  if (cell.state === CELL_STATE.FLAGGED) {
    button.classList.add('cell-closed', 'cell-flag');
    button.textContent = '🚩';
    description = 'прапорець';
    if (gameState.status === GAME_STATUS.LOSE) {
      button.classList.add(cell.type === CELL_TYPE.MINE ? 'cell-flag-on-mine' : 'cell-flag-without-mine');
      description = cell.type === CELL_TYPE.MINE ? 'прапорець на міні' : 'помилковий прапорець';
    }
  } else if (showMine) {
    button.classList.add(cell.state === CELL_STATE.OPENED ? 'cell-mine-hit' : 'cell-mine');
    button.textContent = '💣';
    description = cell.state === CELL_STATE.OPENED ? 'міна вибухнула' : 'міна';
  } else if (cell.state === CELL_STATE.OPENED) {
    button.classList.add('cell-opened');
    description = `відкрита, поруч мін: ${cell.neighborMines}`;
    if (cell.neighborMines > 0) {
      button.classList.add(`cell-number-${cell.neighborMines}`);
      button.textContent = String(cell.neighborMines);
    }
  } else {
    button.classList.add('cell-closed');
  }

  button.setAttribute('aria-label', `Рядок ${row + 1}, стовпець ${col + 1}: ${description}`);
  button.setAttribute('aria-disabled', String(
    gameState.status !== GAME_STATUS.PROCESS || cell.state === CELL_STATE.OPENED,
  ));
}


/**
 * Створює кнопки поля та відображає поточний стан гри.
 * Під час наступних оновлень кнопки зберігаються, щоб не втрачати фокус.
 * @returns {void}
 */
function renderBoard() {
  DOM.board.style.setProperty('--board-columns', gameState.cols);
  if (DOM.board.children.length !== gameState.rows * gameState.cols) {
    const fragment = document.createDocumentFragment();
    board.forEach((cells, row) => cells.forEach((cell, col) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.row = row;
      button.dataset.col = col;
      fragment.append(button);
    }));
    DOM.board.replaceChildren(fragment);
  }

  board.forEach((cells, row) => cells.forEach((cell, col) => {
    updateCellButton(DOM.board.children[row * gameState.cols + col], cell, row, col);
  }));
  renderIndicators();
}


/**
 * Визначає клітинку за подією, змінює її стан і оновлює поле.
 * @param {MouseEvent|KeyboardEvent} event Подія кліку або клавіші F.
 * @returns {void}
 */
function handleBoardEvent(event) {
  const button = event.target.closest('button[data-row]');
  if (!button || !DOM.board.contains(button)) {

    return;
  }

  const row = Number(button.dataset.row);
  const col = Number(button.dataset.col);
  if (event.type === 'contextmenu' || event.type === 'keydown') {
    toggleFlag(row, col);
  } else {
    openCell(row, col);
  }
  renderBoard();
}

DOM.board.addEventListener('click', handleBoardEvent);
DOM.board.addEventListener('contextmenu', event => {
  event.preventDefault();
  handleBoardEvent(event);
});
DOM.board.addEventListener('keydown', event => {
  if (event.key.toLowerCase() === 'f' && !event.repeat) {
    event.preventDefault();
    handleBoardEvent(event);
  }
});
DOM.restart.addEventListener('click', () => {
  resetGame();
  renderBoard();
});
resetGame();
renderBoard();
