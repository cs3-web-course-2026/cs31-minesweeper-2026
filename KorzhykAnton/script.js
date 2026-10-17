'use strict';

/* ==========================================================================
   1. КОНСТАНТИ
   ========================================================================== */

const GAME_SETTINGS = {
  ROWS: 10,
  COLS: 10,
  MINES_COUNT: 15,
};

const TIMER_INTERVAL_MS = 1000;
const COUNTER_DIGITS = 3;
const FLAG_KEY_CODE = 'KeyF';

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

const STATUS_VIEW = {
  [GAME_STATUS.PROCESS]: { face: '🙂', message: '' },
  [GAME_STATUS.WIN]: { face: '😎', message: 'Перемога! Усі міни знешкоджено.' },
  [GAME_STATUS.LOSE]: { face: '😵', message: 'Бум! Ви натрапили на міну.' },
};

/* ==========================================================================
   2. СТАН ГРИ
   ========================================================================== */

const gameState = {
  rows: GAME_SETTINGS.ROWS,
  cols: GAME_SETTINGS.COLS,
  minesCount: GAME_SETTINGS.MINES_COUNT,
  status: GAME_STATUS.PROCESS,
  gameTime: 0,
  timerId: null,
};

let board = []; // 2D-масив клітинок { type, state, neighborMines }

const elements = {
  board: document.getElementById('board'),
  flagsCounter: document.getElementById('flags-counter'),
  timer: document.getElementById('timer'),
  restartButton: document.getElementById('restart-button'),
  status: document.getElementById('game-status'),
};

/* ==========================================================================
   3. ДОПОМІЖНІ ФУНКЦІЇ
   ========================================================================== */

function createCell() {
  return {
    type: CELL_TYPE.EMPTY,
    state: CELL_STATE.CLOSED,
    neighborMines: 0,
  };
}

function isInsideBoard(targetBoard, row, col) {
  return (
    row >= 0 &&
    row < targetBoard.length &&
    col >= 0 &&
    col < targetBoard[row].length
  );
}

function getNeighbourPositions(targetBoard, row, col) {
  const positions = [];

  for (const [directionalRow, directionalCol] of NEIGHBOUR_OFFSETS) {
    const neighbourRow = row + directionalRow;
    const neighbourCol = col + directionalCol;

    if (isInsideBoard(targetBoard, neighbourRow, neighbourCol)) {
      positions.push({ row: neighbourRow, col: neighbourCol });
    }
  }

  return positions;
}

function countFlags(targetBoard) {
  const flaggedCells = targetBoard
    .flat()
    .filter((cell) => cell.state === CELL_STATE.FLAGGED);

  return flaggedCells.length;
}

function checkWinCondition(targetBoard) {
  return targetBoard
    .flat()
    .every(
      (cell) =>
        cell.type === CELL_TYPE.MINE || cell.state === CELL_STATE.OPENED,
    );
}

/* ==========================================================================
   4. ЛОГІКА ГРИ
   ========================================================================== */

function generateField(rows, cols, minesCount) {
  const newBoard = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, createCell),
  );

  let placedMines = 0;

  while (placedMines < minesCount) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);

    // Не ставимо дві міни в одну клітинку
    if (newBoard[row][col].type !== CELL_TYPE.MINE) {
      newBoard[row][col].type = CELL_TYPE.MINE;
      placedMines++;
    }
  }

  return newBoard;
}

function countNeighbourMines(targetBoard) {
  targetBoard.forEach((rowCells, row) => {
    rowCells.forEach((cell, col) => {
      if (cell.type === CELL_TYPE.MINE) {
        return;
      }

      cell.neighborMines = getNeighbourPositions(targetBoard, row, col).filter(
        (position) =>
          targetBoard[position.row][position.col].type === CELL_TYPE.MINE,
      ).length;
    });
  });
}

function openCell(row, col) {
  const cell = board[row][col];

  if (cell.state !== CELL_STATE.CLOSED) {
    return;
  }

  cell.state = CELL_STATE.OPENED;

  if (cell.type === CELL_TYPE.MINE) {
    finishGame(GAME_STATUS.LOSE);

    return;
  }

  // Рекурсивне відкриття сусідів порожньої клітинки
  if (cell.neighborMines === 0) {
    for (const neighbour of getNeighbourPositions(board, row, col)) {
      openCell(neighbour.row, neighbour.col);
    }
  }
}

function toggleFlag(row, col) {
  const cell = board[row][col];

  if (cell.state === CELL_STATE.OPENED) {
    return;
  }

  cell.state =
    cell.state === CELL_STATE.FLAGGED ? CELL_STATE.CLOSED : CELL_STATE.FLAGGED;
}

function startTimer(onTick) {
  if (gameState.timerId !== null) {
    return;
  }

  gameState.timerId = setInterval(() => {
    gameState.gameTime++;
    onTick();
  }, TIMER_INTERVAL_MS);
}

function stopTimer() {
  clearInterval(gameState.timerId);
  gameState.timerId = null;
}

function finishGame(status) {
  gameState.status = status;
  stopTimer();
}

function resetGame() {
  stopTimer();

  gameState.status = GAME_STATUS.PROCESS;
  gameState.gameTime = 0;

  board = generateField(gameState.rows, gameState.cols, gameState.minesCount);
  countNeighbourMines(board);
}

/* ==========================================================================
   5. ВІДОБРАЖЕННЯ (DOM)
   ========================================================================== */

function formatCounter(value) {
  const sign = value < 0 ? '-' : '';
  const digits = String(Math.abs(value)).padStart(
    COUNTER_DIGITS - sign.length,
    '0',
  );

  return sign + digits;
}

/** Повертає CSS-класи, текст і опис клітинки з урахуванням стану гри */
function getCellView(cell, isLost) {
  const isMine = cell.type === CELL_TYPE.MINE;

  if (cell.state === CELL_STATE.FLAGGED) {
    if (isLost && !isMine) {
      return {
        classNames: ['cell-flagged', 'cell-flag-wrong'],
        text: '',
        description: 'прапорець без міни',
      };
    }

    return { classNames: ['cell-flagged'], text: '', description: 'прапорець' };
  }

  if (isMine && (cell.state === CELL_STATE.OPENED || isLost)) {
    // Відкритою може бути лише та міна, на яку натиснув гравець
    if (cell.state === CELL_STATE.OPENED) {
      return {
        classNames: ['cell-opened', 'cell-mine', 'cell-exploded'],
        text: '',
        description: 'міна, що вибухнула',
      };
    }

    return {
      classNames: ['cell-opened', 'cell-mine'],
      text: '',
      description: 'міна',
    };
  }

  if (cell.state === CELL_STATE.OPENED) {
    const count = cell.neighborMines;

    return {
      classNames: ['cell-opened'],
      text: count > 0 ? String(count) : '',
      count,
      description: count > 0 ? `мін поруч: ${count}` : 'порожня',
    };
  }

  return { classNames: [], text: '', description: 'закрита' };
}

function createCellButton(row, col) {
  const button = document.createElement('button');

  button.type = 'button';
  button.className = 'cell';
  button.dataset.row = row;
  button.dataset.col = col;

  return button;
}

/** Створює кнопки клітинок один раз на початку кожної гри */
function createBoardButtons() {
  const fragment = document.createDocumentFragment();

  for (let row = 0; row < gameState.rows; row++) {
    for (let col = 0; col < gameState.cols; col++) {
      fragment.append(createCellButton(row, col));
    }
  }

  document.documentElement.style.setProperty('--cols', gameState.cols);
  elements.board.replaceChildren(fragment);
}

/** Оновлює наявну кнопку, тож фокус клавіатури не губиться */
function updateCellButton(button, cell, row, col, isLost) {
  const view = getCellView(cell, isLost);

  button.className = ['cell', ...view.classNames].join(' ');
  button.textContent = view.text;
  button.setAttribute(
    'aria-label',
    `Рядок ${row + 1}, стовпець ${col + 1}: ${view.description}`,
  );

  if (view.count > 0) {
    button.dataset.count = view.count;
  } else {
    delete button.dataset.count;
  }
}

function renderBoard() {
  const isLost = gameState.status === GAME_STATUS.LOSE;

  board.forEach((rowCells, row) => {
    rowCells.forEach((cell, col) => {
      const button = elements.board.children[row * gameState.cols + col];

      updateCellButton(button, cell, row, col, isLost);
    });
  });

  elements.board.classList.toggle(
    'board-finished',
    gameState.status !== GAME_STATUS.PROCESS,
  );
}

function renderTimer() {
  elements.timer.textContent = formatCounter(gameState.gameTime);
  elements.timer.dateTime = `PT${gameState.gameTime}S`;
}

function renderFlagsCounter() {
  elements.flagsCounter.textContent = formatCounter(
    gameState.minesCount - countFlags(board),
  );
}

function renderStatus() {
  const { face, message } = STATUS_VIEW[gameState.status];

  elements.restartButton.textContent = face;
  elements.status.textContent = message;
  elements.status.className = `game-status game-status-${gameState.status}`;
}

function renderGame() {
  renderBoard();
  renderTimer();
  renderFlagsCounter();
  renderStatus();
}

/* ==========================================================================
   6. ОБРОБКА ПОДІЙ
   ========================================================================== */

function getCellPosition(target) {
  const cellButton = target.closest('.cell');

  if (!cellButton) {
    return null;
  }

  return {
    row: Number(cellButton.dataset.row),
    col: Number(cellButton.dataset.col),
  };
}

function revealCellAndCheckWin(row, col) {
  startTimer(renderTimer);
  openCell(row, col);

  if (gameState.status === GAME_STATUS.PROCESS && checkWinCondition(board)) {
    finishGame(GAME_STATUS.WIN);
  }
}

function handleCellAction(event, action) {
  if (gameState.status !== GAME_STATUS.PROCESS) {
    return;
  }

  const position = getCellPosition(event.target);

  if (!position) {
    return;
  }

  action(position.row, position.col);
  renderGame();
}

function handleBoardClick(event) {
  handleCellAction(event, revealCellAndCheckWin);
}

function handleBoardContextMenu(event) {
  event.preventDefault(); // блокуємо стандартне контекстне меню
  handleCellAction(event, toggleFlag);
}

function handleBoardKeydown(event) {
  if (event.code !== FLAG_KEY_CODE) {
    return;
  }

  event.preventDefault();

  // Утримання клавіші не має перемикати прапорець знову і знову
  if (event.repeat) {
    return;
  }

  handleCellAction(event, toggleFlag);
}

function startNewGame() {
  resetGame();
  createBoardButtons();
  renderGame();
}

elements.board.addEventListener('click', handleBoardClick);
elements.board.addEventListener('contextmenu', handleBoardContextMenu);
elements.board.addEventListener('keydown', handleBoardKeydown);
elements.restartButton.addEventListener('click', startNewGame);

startNewGame();
