const CELL_TYPE = {
  EMPTY: 'empty',
  MINE: 'mine',
};

const CELL_STATE = {
  CLOSED: 'closed',
  OPENED: 'opened',
  FLAGGED: 'flagged',
};

const GAME_STATUS = {
  PROCESS: 'process',
  WIN: 'win',
  LOSE: 'lose',
};

const DEFAULT_ROWS = 10;
const DEFAULT_COLS = 10;
const DEFAULT_MINES_COUNT = 15;
const TIMER_INTERVAL_MS = 1000;
const COUNTER_DIGITS = 3;

const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

// Кешування посилань на DOM-елементи інтерфейсу
const boardElement = document.getElementById('board');
const flagCountElement = document.getElementById('flag-count');
const timerCountElement = document.getElementById('timer-count');
const restartButtonElement = document.getElementById('restart-btn');
const restartFaceElement = document.getElementById('restart-face');
const gameMessageElement = document.getElementById('game-message');

// Стан гри
const gameState = {
  rows: DEFAULT_ROWS,
  cols: DEFAULT_COLS,
  minesCount: DEFAULT_MINES_COUNT,
  status: GAME_STATUS.PROCESS,
  gameTime: 0,
  timerId: null,
};

let board = [];

// ==================== Допоміжні функції (Helpers) ====================

function createCell() {
  return {
    type: CELL_TYPE.EMPTY,
    state: CELL_STATE.CLOSED,
    neighborMines: 0,
    exploded: false,
    wrongFlag: false,
  };
}

function createEmptyBoard(rows, cols) {
  const newBoard = [];

  for (let row = 0; row < rows; row++) {
    const rowCells = [];

    for (let col = 0; col < cols; col++) {
      rowCells.push(createCell());
    }

    newBoard.push(rowCells);
  }

  return newBoard;
}

function placeMines(currentBoard, rows, cols, minesCount) {
  const totalMinesToPlace = Math.min(minesCount, rows * cols);
  let plantedMines = 0;

  while (plantedMines < totalMinesToPlace) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);

    if (currentBoard[row][col].type !== CELL_TYPE.MINE) {
      currentBoard[row][col].type = CELL_TYPE.MINE;
      plantedMines++;
    }
  }
}

function getNeighbours(row, col, rows, cols) {
  const neighbours = [];

  for (const [directionalRow, directionalCol] of DIRECTIONS) {
    const neighbourRow = row + directionalRow;
    const neighbourCol = col + directionalCol;

    if (
      neighbourRow >= 0 &&
      neighbourRow < rows &&
      neighbourCol >= 0 &&
      neighbourCol < cols
    ) {
      neighbours.push([neighbourRow, neighbourCol]);
    }
  }

  return neighbours;
}

function revealAllMines(currentBoard) {
  for (const rowCells of currentBoard) {
    for (const cell of rowCells) {
      if (cell.type === CELL_TYPE.MINE && cell.state !== CELL_STATE.FLAGGED) {
        cell.state = CELL_STATE.OPENED;
      }

      if (cell.type === CELL_TYPE.EMPTY && cell.state === CELL_STATE.FLAGGED) {
        cell.wrongFlag = true;
      }
    }
  }
}

function checkWinCondition(currentBoard, rows, cols, minesCount) {
  const totalSafeCells = rows * cols - minesCount;
  let openedSafeCells = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = currentBoard[row][col];

      if (cell.type === CELL_TYPE.EMPTY && cell.state === CELL_STATE.OPENED) {
        openedSafeCells++;
      }
    }
  }

  return openedSafeCells === totalSafeCells;
}

function countFlaggedCells(currentBoard) {
  let flaggedCount = 0;

  for (const rowCells of currentBoard) {
    for (const cell of rowCells) {
      if (cell.state === CELL_STATE.FLAGGED) {
        flaggedCount++;
      }
    }
  }

  return flaggedCount;
}

function formatCounterValue(value) {
  const nonNegative = Math.max(0, value);

  return String(nonNegative).padStart(COUNTER_DIGITS, '0');
}

function getCellAriaLabel(cell, row, col) {
  if (cell.state === CELL_STATE.FLAGGED) {
    return cell.wrongFlag
      ? `Рядок ${row + 1}, колонка ${col + 1}, помилковий прапорець`
      : `Рядок ${row + 1}, колонка ${col + 1}, прапорець`;
  }

  if (cell.state === CELL_STATE.CLOSED) {
    return `Рядок ${row + 1}, колонка ${col + 1}, закрита`;
  }

  if (cell.type === CELL_TYPE.MINE) {
    return cell.exploded
      ? `Рядок ${row + 1}, колонка ${col + 1}, підірвана міна`
      : `Рядок ${row + 1}, колонка ${col + 1}, міна`;
  }

  if (cell.neighborMines > 0) {
    return `Рядок ${row + 1}, колонка ${col + 1}, відкрито, мін поруч: ${cell.neighborMines}`;
  }

  return `Рядок ${row + 1}, колонка ${col + 1}, відкрито, порожня`;
}

// ==================== Основна бізнес-логіка (Core Logic) ====================

function countNeighbourMines(targetBoard) {
  const rows = targetBoard.length;
  const cols = targetBoard[0].length;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = targetBoard[row][col];

      if (cell.type === CELL_TYPE.EMPTY) {
        cell.neighborMines = getNeighbours(row, col, rows, cols).filter(
          ([neighbourRow, neighbourCol]) =>
            targetBoard[neighbourRow][neighbourCol].type === CELL_TYPE.MINE,
        ).length;
      }
    }
  }
}

function generateField(rows, cols, minesCount) {
  const newBoard = createEmptyBoard(rows, cols);

  placeMines(newBoard, rows, cols, minesCount);
  countNeighbourMines(newBoard);

  return newBoard;
}

function openArea(row, col, currentBoard) {
  const rows = currentBoard.length;
  const cols = currentBoard[0].length;

  for (const [neighbourRow, neighbourCol] of getNeighbours(
    row,
    col,
    rows,
    cols,
  )) {
    const neighbour = currentBoard[neighbourRow][neighbourCol];

    if (neighbour.state === CELL_STATE.CLOSED) {
      neighbour.state = CELL_STATE.OPENED;

      if (neighbour.neighborMines === 0 && neighbour.type === CELL_TYPE.EMPTY) {
        openArea(neighbourRow, neighbourCol, currentBoard);
      }
    }
  }
}

function startTimer(onTick) {
  if (gameState.timerId !== null) {
    return;
  }

  gameState.timerId = setInterval(() => {
    gameState.gameTime++;

    if (typeof onTick === 'function') {
      onTick();
    }
  }, TIMER_INTERVAL_MS);
}

function stopTimer() {
  if (gameState.timerId !== null) {
    clearInterval(gameState.timerId);
    gameState.timerId = null;
  }
}

function openCell(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) {
    return false;
  }

  if (row < 0 || row >= gameState.rows || col < 0 || col >= gameState.cols) {
    return false;
  }

  const cell = board[row][col];

  if (cell.state === CELL_STATE.OPENED || cell.state === CELL_STATE.FLAGGED) {
    return false;
  }

  if (cell.type === CELL_TYPE.MINE) {
    cell.state = CELL_STATE.OPENED;
    cell.exploded = true;
    gameState.status = GAME_STATUS.LOSE;
    stopTimer();
    revealAllMines(board);

    return true;
  }

  cell.state = CELL_STATE.OPENED;

  if (cell.neighborMines === 0) {
    openArea(row, col, board);
  }

  if (
    checkWinCondition(
      board,
      gameState.rows,
      gameState.cols,
      gameState.minesCount,
    )
  ) {
    gameState.status = GAME_STATUS.WIN;
    stopTimer();
  }

  return true;
}

function toggleFlag(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) {
    return false;
  }

  if (row < 0 || row >= gameState.rows || col < 0 || col >= gameState.cols) {
    return false;
  }

  const cell = board[row][col];

  if (cell.state === CELL_STATE.OPENED) {
    return false;
  }

  if (cell.state === CELL_STATE.CLOSED) {
    cell.state = CELL_STATE.FLAGGED;

    return true;
  }

  if (cell.state === CELL_STATE.FLAGGED) {
    cell.state = CELL_STATE.CLOSED;

    return true;
  }

  return false;
}

// ==================== Рендеринг DOM та UI (Rendering) ====================

function renderField() {
  if (!boardElement) {
    return;
  }

  const focusedCell = document.activeElement?.closest?.('.cell');
  const focusedRow = focusedCell?.dataset.row;
  const focusedCol = focusedCell?.dataset.col;

  let buttonToFocus = null;

  boardElement.innerHTML = '';

  for (let row = 0; row < gameState.rows; row++) {
    for (let col = 0; col < gameState.cols; col++) {
      const cell = board[row][col];
      const button = document.createElement('button');

      button.type = 'button';
      button.className = 'cell';
      button.dataset.row = String(row);
      button.dataset.col = String(col);
      button.setAttribute('aria-label', getCellAriaLabel(cell, row, col));

      if (cell.state === CELL_STATE.CLOSED) {
        button.classList.add('cell-closed');
      } else if (cell.state === CELL_STATE.FLAGGED) {
        button.classList.add(
          cell.wrongFlag ? 'cell-flagged-wrong' : 'cell-flagged',
        );
        button.textContent = '🚩';
      } else if (cell.state === CELL_STATE.OPENED) {
        button.classList.add('cell-opened');

        if (cell.type === CELL_TYPE.MINE) {
          if (cell.exploded) {
            button.classList.add('cell-mine-exploded');
            button.textContent = '💥';
          } else {
            button.classList.add('cell-mine');
            button.textContent = '💣';
          }
        } else if (cell.neighborMines > 0) {
          button.classList.add(`cell-number-${cell.neighborMines}`);
          button.textContent = String(cell.neighborMines);
        }
      }

      if (String(row) === focusedRow && String(col) === focusedCol) {
        buttonToFocus = button;
      }

      boardElement.appendChild(button);
    }
  }

  buttonToFocus?.focus();
}

function updateUI() {
  if (!flagCountElement || !timerCountElement) {
    return;
  }

  const remainingFlags = gameState.minesCount - countFlaggedCells(board);

  flagCountElement.textContent = formatCounterValue(remainingFlags);
  timerCountElement.textContent = formatCounterValue(gameState.gameTime);

  if (!restartFaceElement || !gameMessageElement) {
    return;
  }

  if (gameState.status === GAME_STATUS.WIN) {
    restartFaceElement.textContent = '😎';
    gameMessageElement.textContent =
      'Перемога! Усі безпечні клітинки відкрито.';
    gameMessageElement.className = 'game-message game-message-win';
  } else if (gameState.status === GAME_STATUS.LOSE) {
    restartFaceElement.textContent = '😵';
    gameMessageElement.textContent = 'Поразка! Ви натрапили на міну.';
    gameMessageElement.className = 'game-message game-message-lose';
  } else {
    restartFaceElement.textContent = '😊';
    gameMessageElement.textContent = '';
    gameMessageElement.className = 'game-message';
  }
}

function render() {
  renderField();
  updateUI();
}

// ==================== Обробка подій та ініціалізація ====================

function handleCellClick(event) {
  const button = event.target.closest('.cell');

  if (!button || gameState.status !== GAME_STATUS.PROCESS) {
    return;
  }

  const row = Number(button.dataset.row);
  const col = Number(button.dataset.col);

  if (gameState.timerId === null && gameState.gameTime === 0) {
    startTimer(updateUI);
  }

  const changed = openCell(row, col);

  if (changed) {
    render();
  }
}

function handleCellContextMenu(event) {
  event.preventDefault();

  const button = event.target.closest('.cell');

  if (!button || gameState.status !== GAME_STATUS.PROCESS) {
    return;
  }

  const row = Number(button.dataset.row);
  const col = Number(button.dataset.col);
  const changed = toggleFlag(row, col);

  if (changed) {
    render();
  }
}

function handleRestart() {
  initGame();
}

function initGame() {
  stopTimer();
  gameState.status = GAME_STATUS.PROCESS;
  gameState.gameTime = 0;
  board = generateField(gameState.rows, gameState.cols, gameState.minesCount);
  render();
}

function initializeEventListeners() {
  if (boardElement) {
    boardElement.addEventListener('click', handleCellClick);
    boardElement.addEventListener('contextmenu', handleCellContextMenu);
  }

  if (restartButtonElement) {
    restartButtonElement.addEventListener('click', handleRestart);
  }
}

function startApp() {
  initializeEventListeners();
  initGame();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
  } else {
    startApp();
  }
}
