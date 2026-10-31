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
const MAX_DISPLAY_VALUE = 999;

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

// Глобальний стан гри та двовимірний масив поля
const gameState = {
  rows: DEFAULT_ROWS,
  cols: DEFAULT_COLS,
  minesCount: DEFAULT_MINES_COUNT,
  status: GAME_STATUS.PROCESS,
  gameTime: 0,
  timerId: null,
};

let board = [];

const boardElement = document.getElementById('board');
const timerElement = document.getElementById('timer');
const flagCounterElement = document.getElementById('flag-counter');
const startButton = document.getElementById('start-button');
const gameMessageElement = document.getElementById('game-message');


function isInBounds(field, row, col) {
  return (
    row >= 0 &&
    row < field.length &&
    col >= 0 &&
    col < field[0].length
  );
}


function createEmptyCell() {
  return {
    type: CELL_TYPE.EMPTY,
    neighborMines: 0,
    state: CELL_STATE.CLOSED,
  };
}


function formatCounterValue(value) {
  const clampedValue = Math.min(Math.max(value, 0), MAX_DISPLAY_VALUE);

  return String(clampedValue).padStart(COUNTER_DIGITS, '0');
}


function getFlaggedCellsCount(field) {
  let flaggedCount = 0;

  for (let row = 0; row < field.length; row++) {
    for (let col = 0; col < field[row].length; col++) {
      if (field[row][col].state === CELL_STATE.FLAGGED) {
        flaggedCount++;
      }
    }
  }

  return flaggedCount;
}


// Генерація ігрового поля та випадкове розміщення мін
function generateField(rows, cols, minesCount) {
  const field = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, createEmptyCell),
  );

  let placedMines = 0;

  while (placedMines < minesCount) {
    const randomRow = Math.floor(Math.random() * rows);
    const randomCol = Math.floor(Math.random() * cols);

    if (field[randomRow][randomCol].type !== CELL_TYPE.MINE) {
      field[randomRow][randomCol].type = CELL_TYPE.MINE;
      placedMines++;
    }
  }

  return field;
}


// Підрахунок кількості сусідніх мін для кожної безпечної клітинки
function countNeighbourMines(field = board) {
  for (let row = 0; row < field.length; row++) {
    for (let col = 0; col < field[row].length; col++) {
      if (field[row][col].type === CELL_TYPE.MINE) {
        continue;
      }

      let minesCount = 0;

      for (const [directionalRow, directionalCol] of DIRECTIONS) {
        const neighbourRow = row + directionalRow;
        const neighbourCol = col + directionalCol;

        if (
          isInBounds(field, neighbourRow, neighbourCol) &&
          field[neighbourRow][neighbourCol].type === CELL_TYPE.MINE
        ) {
          minesCount++;
        }
      }

      field[row][col].neighborMines = minesCount;
    }
  }
}


function startTimer() {
  if (gameState.timerId !== null) {
    return;
  }

  gameState.timerId = setInterval(() => {
    if (gameState.status !== GAME_STATUS.PROCESS) {
      stopTimer();

      return;
    }

    gameState.gameTime++;
    updateTimerDisplay();
  }, TIMER_INTERVAL_MS);
}


function stopTimer() {
  if (gameState.timerId !== null) {
    clearInterval(gameState.timerId);
    gameState.timerId = null;
  }
}


function revealAllMines() {
  for (let row = 0; row < gameState.rows; row++) {
    for (let col = 0; col < gameState.cols; col++) {
      const cell = board[row][col];

      if (
        cell.type === CELL_TYPE.MINE &&
        cell.state === CELL_STATE.CLOSED
      ) {
        cell.state = CELL_STATE.OPENED;
      }
    }
  }
}


function checkWinCondition(field) {
  for (let row = 0; row < field.length; row++) {
    for (let col = 0; col < field[row].length; col++) {
      const cell = field[row][col];

      if (
        cell.type === CELL_TYPE.EMPTY &&
        cell.state !== CELL_STATE.OPENED
      ) {
        return false;
      }
    }
  }

  return true;
}


// Логіка відкриття клітинки та рекурсивного відкриття порожніх сусідів
function openCell(row, col) {
  if (
    gameState.status !== GAME_STATUS.PROCESS ||
    !isInBounds(board, row, col)
  ) {
    return;
  }

  const cell = board[row][col];

  if (
    cell.state === CELL_STATE.OPENED ||
    cell.state === CELL_STATE.FLAGGED
  ) {
    return;
  }

  startTimer();
  cell.state = CELL_STATE.OPENED;

  if (cell.type === CELL_TYPE.MINE) {
    cell.isExploded = true;
    gameState.status = GAME_STATUS.LOSE;
    stopTimer();
    revealAllMines();

    return;
  }

  if (cell.neighborMines === 0) {
    for (const [directionalRow, directionalCol] of DIRECTIONS) {
      const neighbourRow = row + directionalRow;
      const neighbourCol = col + directionalCol;

      if (isInBounds(board, neighbourRow, neighbourCol)) {
        openCell(neighbourRow, neighbourCol);
      }
    }
  }

  if (checkWinCondition(board)) {
    gameState.status = GAME_STATUS.WIN;
    stopTimer();
  }
}


function toggleFlag(row, col) {
  if (
    gameState.status !== GAME_STATUS.PROCESS ||
    !isInBounds(board, row, col)
  ) {
    return;
  }

  const cell = board[row][col];

  if (cell.state === CELL_STATE.OPENED) {
    return;
  }

  if (cell.state === CELL_STATE.CLOSED) {
    const flaggedCount = getFlaggedCellsCount(board);

    if (flaggedCount >= gameState.minesCount) {
      return;
    }

    cell.state = CELL_STATE.FLAGGED;
  } else if (cell.state === CELL_STATE.FLAGGED) {
    cell.state = CELL_STATE.CLOSED;
  }
}


function getCellAriaLabel(cell, row, col) {
  const positionText = `Рядок ${row + 1}, стовпець ${col + 1}`;

  if (cell.state === CELL_STATE.FLAGGED) {
    if (
      gameState.status !== GAME_STATUS.PROCESS &&
      cell.type === CELL_TYPE.MINE
    ) {
      return `${positionText}, клітинка з прапорцем на міні`;
    }

    return `${positionText}, клітинка з прапорцем`;
  }

  if (cell.state === CELL_STATE.CLOSED) {
    return `${positionText}, закрита клітинка`;
  }

  if (cell.type === CELL_TYPE.MINE) {
    return cell.isExploded
      ? `${positionText}, міна, на яку натиснули`
      : `${positionText}, клітинка з міною`;
  }

  if (cell.neighborMines > 0) {
    return `${positionText}, відкрита клітинка, мін навколо: ${cell.neighborMines}`;
  }

  return `${positionText}, відкрита порожня клітинка`;
}


function createCellButton(cell, row, col) {
  const button = document.createElement('button');

  button.type = 'button';
  button.className = 'cell';
  button.dataset.row = String(row);
  button.dataset.col = String(col);
  button.setAttribute('aria-label', getCellAriaLabel(cell, row, col));

  if (cell.state === CELL_STATE.CLOSED) {
    button.classList.add('cell-closed');
  } else if (cell.state === CELL_STATE.FLAGGED) {
    const isEndGameMine =
      gameState.status !== GAME_STATUS.PROCESS &&
      cell.type === CELL_TYPE.MINE;

    button.classList.add(
      isEndGameMine ? 'cell-flagged-mine' : 'cell-flagged',
    );
  } else if (cell.state === CELL_STATE.OPENED) {
    if (cell.type === CELL_TYPE.MINE) {
      button.classList.add(
        cell.isExploded ? 'cell-exploded' : 'cell-mine',
      );
    } else {
      button.classList.add('cell-opened');

      if (cell.neighborMines > 0) {
        button.classList.add(`cell-number-${cell.neighborMines}`);
        button.textContent = String(cell.neighborMines);
      }
    }
  }

  return button;
}


// Рендеринг поля та оновлення елементів інтерфейсу
function renderBoard() {
  boardElement.style.setProperty(
    '--board-columns',
    String(gameState.cols),
  );
  boardElement.replaceChildren();

  for (let row = 0; row < gameState.rows; row++) {
    for (let col = 0; col < gameState.cols; col++) {
      const cellButton = createCellButton(board[row][col], row, col);
      boardElement.appendChild(cellButton);
    }
  }
}


function updateTimerDisplay() {
  timerElement.textContent = formatCounterValue(gameState.gameTime);
  timerElement.setAttribute('datetime', `PT${gameState.gameTime}S`);
}


function updateFlagCounterDisplay() {
  const remainingFlags =
    gameState.minesCount - getFlaggedCellsCount(board);
  flagCounterElement.textContent = formatCounterValue(remainingFlags);
}


function updateStatusMessage() {
  gameMessageElement.classList.remove(
    'game-message-win',
    'game-message-lose',
  );

  if (gameState.status === GAME_STATUS.WIN) {
    gameMessageElement.textContent =
      'Перемога! Всі безпечні клітинки відкрито!';
    gameMessageElement.classList.add('game-message-win');
    startButton.textContent = 'Рестарт';
  } else if (gameState.status === GAME_STATUS.LOSE) {
    gameMessageElement.textContent = 'Поразка! Ви натрапили на міну.';
    gameMessageElement.classList.add('game-message-lose');
    startButton.textContent = 'Рестарт';
  } else {
    gameMessageElement.textContent = '';
    startButton.textContent = gameState.timerId !== null ? 'Рестарт' : 'Старт';
  }
}


function updateInterface() {
  renderBoard();
  updateTimerDisplay();
  updateFlagCounterDisplay();
  updateStatusMessage();
}

function handleBoardClick(event) {
  const cellButton = event.target.closest('.cell');

  if (!cellButton) {
    return;
  }

  const row = Number(cellButton.dataset.row);
  const col = Number(cellButton.dataset.col);

  openCell(row, col);
  updateInterface();
}


function handleBoardContextMenu(event) {
  event.preventDefault();

  const cellButton = event.target.closest('.cell');

  if (!cellButton) {
    return;
  }

  const row = Number(cellButton.dataset.row);
  const col = Number(cellButton.dataset.col);

  toggleFlag(row, col);
  updateInterface();
}


boardElement.addEventListener('click', handleBoardClick);
boardElement.addEventListener('contextmenu', handleBoardContextMenu);
startButton.addEventListener('click', resetGame);

function resetGame() {
  stopTimer();
  gameState.status = GAME_STATUS.PROCESS;
  gameState.gameTime = 0;
  board = generateField(
    gameState.rows,
    gameState.cols,
    gameState.minesCount,
  );
  countNeighbourMines(board);
  updateInterface(); 
}

function handleButtonClick() {
  const isRunning =
    gameState.timerId !== null ||
    gameState.status === GAME_STATUS.WIN ||
    gameState.status === GAME_STATUS.LOSE;

  if (isRunning) {
    resetGame();
  } else {
    startTimer();
    updateStatusMessage();
  }
}

startButton.addEventListener('click', handleButtonClick);

resetGame();
