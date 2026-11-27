const DEFAULT_ROWS = 10;
const DEFAULT_COLS = 10;
const DEFAULT_MINES = 15;

const GAME_STATUS = Object.freeze({
  PROCESS: 'process',
  WIN: 'win',
  LOSE: 'lose',
});

const CELL_TYPE = Object.freeze({
  EMPTY: 'empty',
  MINE: 'mine',
});

const CELL_STATE = Object.freeze({
  CLOSED: 'closed',
  OPENED: 'opened',
  FLAGGED: 'flagged',
});

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

// Крок 1: Окремий об'єкт стану гри та окремий 2D-масив поля board
const gameState = {
  rows: DEFAULT_ROWS,
  cols: DEFAULT_COLS,
  minesCount: DEFAULT_MINES,
  status: GAME_STATUS.PROCESS,
  gameTime: 0,
  timerId: null,
};

let board = [];
let explodedCoords = null;

// Посилання на DOM-елементи
const boardEl = document.querySelector('.grid-field');
const flagsCountEl = document.querySelector('#flags-count');
const timerCountEl = document.querySelector('#timer-count');
const restartBtnEl = document.querySelector('#restart-btn');
const statusMessageEl = document.querySelector('#game-message');

// Допоміжні функції форматування та перевірки меж
function isWithinBounds(
  row,
  col,
  rows = gameState.rows,
  cols = gameState.cols,
) {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

function formatCounter(value) {
  if (value < 0) {
    return `-${String(Math.min(Math.abs(value), 99)).padStart(2, '0')}`;
  }
  return String(Math.min(value, 999)).padStart(3, '0');
}

// Крок 4: Керування таймером (зберігаємо фактичний час без ліміту, ліміт лише при відображенні)
function updateTimerDisplay() {
  if (timerCountEl) {
    timerCountEl.textContent = formatCounter(gameState.gameTime);
  }
}

function stopTimer() {
  if (gameState.timerId !== null) {
    clearInterval(gameState.timerId);
    gameState.timerId = null;
  }
}

function startTimer() {
  if (gameState.timerId !== null || gameState.status !== GAME_STATUS.PROCESS) {
    return;
  }

  gameState.timerId = setInterval(() => {
    if (gameState.status !== GAME_STATUS.PROCESS) {
      stopTimer();
      return;
    }

    gameState.gameTime += 1;
    updateTimerDisplay();
  }, 1000);
}

// Крок 2: Генерація ігрового поля та підрахунок сусідніх мін
function countNeighbourMines(grid) {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (grid[row][col].type === CELL_TYPE.MINE) {
        continue;
      }

      let minesAround = 0;
      for (const [dRow, dCol] of NEIGHBOR_OFFSETS) {
        const nextRow = row + dRow;
        const nextCol = col + dCol;
        if (
          isWithinBounds(nextRow, nextCol, rows, cols) &&
          grid[nextRow][nextCol].type === CELL_TYPE.MINE
        ) {
          minesAround += 1;
        }
      }

      grid[row][col].neighborMines = minesAround;
    }
  }
}

function generateField(rows, cols, minesCount) {
  const newBoard = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      type: CELL_TYPE.EMPTY,
      neighborMines: 0,
      state: CELL_STATE.CLOSED,
    })),
  );

  let placedMines = 0;
  const maxMines = Math.min(minesCount, rows * cols - 1);

  while (placedMines < maxMines) {
    const randomRow = Math.floor(Math.random() * rows);
    const randomCol = Math.floor(Math.random() * cols);

    if (newBoard[randomRow][randomCol].type !== CELL_TYPE.MINE) {
      newBoard[randomRow][randomCol].type = CELL_TYPE.MINE;
      placedMines += 1;
    }
  }

  countNeighbourMines(newBoard);
  return newBoard;
}

// Чиста функція підрахунку встановлених прапорців
function getFlaggedCount(grid) {
  return grid.reduce(
    (total, row) =>
      total + row.filter((cell) => cell.state === CELL_STATE.FLAGGED).length,
    0,
  );
}

function updateHeaderUI() {
  if (flagsCountEl) {
    const remainingFlags = gameState.minesCount - getFlaggedCount(board);
    flagsCountEl.textContent = formatCounter(remainingFlags);
  }

  if (restartBtnEl) {
    if (gameState.status === GAME_STATUS.WIN) {
      restartBtnEl.textContent = '😎';
    } else if (gameState.status === GAME_STATUS.LOSE) {
      restartBtnEl.textContent = '😵';
    } else {
      restartBtnEl.textContent = '🙂';
    }
  }

  if (statusMessageEl) {
    statusMessageEl.classList.remove('is-win', 'is-lose');
    if (gameState.status === GAME_STATUS.WIN) {
      statusMessageEl.textContent = 'Перемога! Усі безпечні клітинки відкрито.';
      statusMessageEl.classList.add('is-win');
    } else if (gameState.status === GAME_STATUS.LOSE) {
      statusMessageEl.textContent = 'Гру завершено! Ви натрапили на міну.';
      statusMessageEl.classList.add('is-lose');
    } else {
      statusMessageEl.textContent = '';
    }
  }
}

// Перевірка умови перемоги
function checkWinCondition(grid) {
  const hasClosedSafeCells = grid.some((row) =>
    row.some(
      (cell) =>
        cell.type === CELL_TYPE.EMPTY && cell.state !== CELL_STATE.OPENED,
    ),
  );

  if (!hasClosedSafeCells) {
    gameState.status = GAME_STATUS.WIN;
    stopTimer();
  }
}

// Крок 3: Відкриття клітинки (з рекурсивним розкриттям порожніх сусідів)
function openCell(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS || !isWithinBounds(row, col)) {
    return;
  }

  const cell = board[row][col];
  if (cell.state === CELL_STATE.OPENED || cell.state === CELL_STATE.FLAGGED) {
    return;
  }

  startTimer();
  cell.state = CELL_STATE.OPENED;

  if (cell.type === CELL_TYPE.MINE) {
    explodedCoords = { row, col };
    gameState.status = GAME_STATUS.LOSE;
    stopTimer();
    return;
  }

  if (cell.neighborMines === 0) {
    for (const [dRow, dCol] of NEIGHBOR_OFFSETS) {
      const nextRow = row + dRow;
      const nextCol = col + dCol;
      if (
        isWithinBounds(nextRow, nextCol) &&
        board[nextRow][nextCol].state === CELL_STATE.CLOSED &&
        board[nextRow][nextCol].type === CELL_TYPE.EMPTY
      ) {
        openCell(nextRow, nextCol);
      }
    }
  }

  checkWinCondition(board);
}

// Крок 3: Встановлення / зняття прапорця
function toggleFlag(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS || !isWithinBounds(row, col)) {
    return;
  }

  const cell = board[row][col];
  if (cell.state === CELL_STATE.OPENED) {
    return;
  }

  cell.state =
    cell.state === CELL_STATE.FLAGGED ? CELL_STATE.CLOSED : CELL_STATE.FLAGGED;
}

// Налаштування класів та ARIA-підписів клітинки
function applyCellVisualState(button, cell, row, col) {
  const isGameOver = gameState.status !== GAME_STATUS.PROCESS;

  if (cell.state === CELL_STATE.FLAGGED) {
    button.classList.add('has-flag');
    if (isGameOver && cell.type === CELL_TYPE.MINE) {
      button.classList.add('is-mine', 'is-defused');
      button.setAttribute(
        'aria-label',
        `Рядок ${row + 1}, стовпець ${col + 1}: знешкоджена міна`,
      );
    } else if (isGameOver && cell.type !== CELL_TYPE.MINE) {
      button.classList.add('is-wrong');
      button.setAttribute(
        'aria-label',
        `Рядок ${row + 1}, стовпець ${col + 1}: помилковий прапорець`,
      );
    } else {
      button.setAttribute(
        'aria-label',
        `Рядок ${row + 1}, стовпець ${col + 1}: прапорець`,
      );
    }
    return;
  }

  if (isGameOver && cell.type === CELL_TYPE.MINE) {
    button.classList.add('is-mine');
    if (
      explodedCoords &&
      explodedCoords.row === row &&
      explodedCoords.col === col
    ) {
      button.classList.add('is-boom');
      button.setAttribute(
        'aria-label',
        `Рядок ${row + 1}, стовпець ${col + 1}: підірвана міна`,
      );
    } else {
      button.setAttribute(
        'aria-label',
        `Рядок ${row + 1}, стовпець ${col + 1}: міна`,
      );
    }
    return;
  }

  if (cell.state === CELL_STATE.OPENED) {
    button.classList.add('is-open');
    if (cell.neighborMines > 0) {
      button.classList.add(`num-${cell.neighborMines}`);
      button.textContent = String(cell.neighborMines);
      button.setAttribute(
        'aria-label',
        `Рядок ${row + 1}, стовпець ${col + 1}: мін поруч ${cell.neighborMines}`,
      );
    } else {
      button.setAttribute(
        'aria-label',
        `Рядок ${row + 1}, стовпець ${col + 1}: порожня відкрита клітинка`,
      );
    }
    return;
  }

  button.classList.add('is-closed');
  button.setAttribute(
    'aria-label',
    `Рядок ${row + 1}, стовпець ${col + 1}: закрита клітинка`,
  );
}

// Крок 5: Рендеринг ігрового поля у DOM зі збереженням фокусу клавіатури
function renderBoard() {
  if (!boardEl) {
    return;
  }

  const activeEl = document.activeElement;
  const focusedRow = activeEl?.dataset?.row;
  const focusedCol = activeEl?.dataset?.col;

  boardEl.style.setProperty('--rows', String(gameState.rows));
  boardEl.style.setProperty('--cols', String(gameState.cols));
  boardEl.innerHTML = '';

  const fragment = document.createDocumentFragment();
  let buttonToFocus = null;

  for (let row = 0; row < gameState.rows; row += 1) {
    for (let col = 0; col < gameState.cols; col += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tile';
      button.dataset.row = String(row);
      button.dataset.col = String(col);

      applyCellVisualState(button, board[row][col], row, col);

      if (focusedRow === String(row) && focusedCol === String(col)) {
        buttonToFocus = button;
      }

      fragment.appendChild(button);
    }
  }

  boardEl.appendChild(fragment);
  updateHeaderUI();

  if (buttonToFocus) {
    buttonToFocus.focus();
  }
}

// Ініціалізація та перезапуск нової партії
function initGame() {
  stopTimer();
  gameState.status = GAME_STATUS.PROCESS;
  gameState.gameTime = 0;
  explodedCoords = null;
  board = generateField(gameState.rows, gameState.cols, gameState.minesCount);
  updateTimerDisplay();
  renderBoard();
}

// Делегування подій кліку, контекстного меню та перезапуску
if (boardEl) {
  boardEl.addEventListener('click', (event) => {
    const tile = event.target.closest('.tile');
    if (!tile || !boardEl.contains(tile)) {
      return;
    }

    const row = Number(tile.dataset.row);
    const col = Number(tile.dataset.col);
    openCell(row, col);
    renderBoard();
  });

  boardEl.addEventListener('contextmenu', (event) => {
    const tile = event.target.closest('.tile');
    if (!tile || !boardEl.contains(tile)) {
      return;
    }

    event.preventDefault();
    const row = Number(tile.dataset.row);
    const col = Number(tile.dataset.col);
    toggleFlag(row, col);
    renderBoard();
  });
}

if (restartBtnEl) {
  restartBtnEl.addEventListener('click', () => {
    initGame();
  });
}

initGame();
