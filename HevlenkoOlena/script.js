const DEFAULT_ROWS = 10;
const DEFAULT_COLS = 10;
const DEFAULT_MINES = 15;

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

// Крок 1: Об'єкт стану гри
const gameState = {
  rows: DEFAULT_ROWS,
  cols: DEFAULT_COLS,
  minesCount: DEFAULT_MINES,
  status: 'process', // 'process' | 'win' | 'lose'
  gameTime: 0,
  timerId: null,
  field: [],
  explodedCell: null,
};

// Посилання на DOM-елементи
const boardEl = document.getElementById('board');
const flagsValueEl = document.getElementById('flags-value');
const timerValueEl = document.getElementById('timer-value');
const restartBtnEl = document.getElementById('restart-btn');
const messageEl = document.getElementById('game-message');

// Допоміжна функція перевірки меж поля
function isWithinBounds(row, col, rows, cols) {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

// Крок 3 (частина 1): Підрахунок мін навколо кожної безпечної клітинки
function countNeighbourMines(field) {
  const rows = field.length;
  const cols = field[0].length;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (field[row][col].type === 'mine') {
        continue;
      }

      let count = 0;

      for (const [dRow, dCol] of NEIGHBOR_OFFSETS) {
        const nextRow = row + dRow;
        const nextCol = col + dCol;

        if (
          isWithinBounds(nextRow, nextCol, rows, cols) &&
          field[nextRow][nextCol].type === 'mine'
        ) {
          count += 1;
        }
      }

      field[row][col].neighborMines = count;
    }
  }
}

// Крок 2: Генерація поля та випадкове розміщення мін
function generateField(rows, cols, minesCount) {
  const field = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      type: 'empty',
      neighborMines: 0,
      state: 'closed',
    })),
  );

  let placedMines = 0;
  const maxMines = Math.min(minesCount, rows * cols - 1);

  while (placedMines < maxMines) {
    const randomRow = Math.floor(Math.random() * rows);
    const randomCol = Math.floor(Math.random() * cols);

    if (field[randomRow][randomCol].type !== 'mine') {
      field[randomRow][randomCol].type = 'mine';
      placedMines += 1;
    }
  }

  countNeighbourMines(field);
  return field;
}

// Крок 4 (таймер): Запуск та зупинка таймера
function stopTimer() {
  if (gameState.timerId !== null) {
    clearInterval(gameState.timerId);
    gameState.timerId = null;
  }
}

function startTimer() {
  if (gameState.timerId !== null || gameState.status !== 'process') {
    return;
  }

  gameState.timerId = setInterval(() => {
    if (gameState.status !== 'process') {
      stopTimer();
      return;
    }

    gameState.gameTime = Math.min(gameState.gameTime + 1, 999);
    updateTimerDisplay();
  }, 1000);
}

// Крок 8: Перевірка умови перемоги
function checkWinCondition() {
  const hasUnopenedSafeCell = gameState.field.some((row) =>
    row.some((cell) => cell.type === 'empty' && cell.state !== 'opened'),
  );

  if (!hasUnopenedSafeCell) {
    gameState.status = 'win';
    stopTimer();
  }
}

// Крок 3 (частина 2): Відкриття клітинки та рекурсивне розкриття порожніх зон
function openCell(row, col) {
  if (
    gameState.status !== 'process' ||
    !isWithinBounds(row, col, gameState.rows, gameState.cols)
  ) {
    return;
  }

  const cell = gameState.field[row][col];

  if (cell.state === 'opened' || cell.state === 'flagged') {
    return;
  }

  if (gameState.timerId === null) {
    startTimer();
  }

  cell.state = 'opened';

  if (cell.type === 'mine') {
    gameState.status = 'lose';
    gameState.explodedCell = { row, col };
    stopTimer();
    return;
  }

  if (cell.neighborMines === 0) {
    for (const [dRow, dCol] of NEIGHBOR_OFFSETS) {
      openCell(row + dRow, col + dCol);
    }
  }

  if (gameState.status === 'process') {
    checkWinCondition();
  }
}

// Крок 4 (прапорці): Встановлення / зняття прапорця
function toggleFlag(row, col) {
  if (
    gameState.status !== 'process' ||
    !isWithinBounds(row, col, gameState.rows, gameState.cols)
  ) {
    return;
  }

  const cell = gameState.field[row][col];

  if (cell.state === 'opened') {
    return;
  }

  if (gameState.timerId === null) {
    startTimer();
  }

  cell.state = cell.state === 'flagged' ? 'closed' : 'flagged';
}

// Підрахунок встановлених прапорців
function getFlaggedCount() {
  let flags = 0;

  for (const row of gameState.field) {
    for (const cell of row) {
      if (cell.state === 'flagged') {
        flags += 1;
      }
    }
  }

  return flags;
}

// Форматування тризначного числа для LCD-дисплея (наприклад, 015 або -02)
function formatCounter(value) {
  if (value < 0) {
    return `-${String(Math.min(Math.abs(value), 99)).padStart(2, '0')}`;
  }
  return String(Math.min(value, 999)).padStart(3, '0');
}

// Крок 6: Оновлення динамічних елементів інтерфейсу
function updateTimerDisplay() {
  timerValueEl.textContent = formatCounter(gameState.gameTime);
}

function updateHeaderUI() {
  const remainingFlags = gameState.minesCount - getFlaggedCount();
  flagsValueEl.textContent = formatCounter(remainingFlags);
  updateTimerDisplay();

  messageEl.className = 'game-message';

  if (gameState.status === 'win') {
    restartBtnEl.textContent = '😎';
    messageEl.textContent = 'Перемога! Усі безпечні клітинки відкрито.';
    messageEl.classList.add('is-win');
  } else if (gameState.status === 'lose') {
    restartBtnEl.textContent = '😵';
    messageEl.textContent = 'Гру завершено! Ви натрапили на міну.';
    messageEl.classList.add('is-lose');
  } else {
    restartBtnEl.textContent = '🙂';
    messageEl.textContent = '';
  }
}

// Визначення класів, тексту та aria-label для конкретної клітинки
function applyCellVisualState(button, cell, row, col) {
  button.className = 'tile';
  button.textContent = '';

  const isGameOver = gameState.status !== 'process';
  const isExploded =
    gameState.explodedCell !== null &&
    gameState.explodedCell.row === row &&
    gameState.explodedCell.col === col;

  if (cell.state === 'flagged') {
    button.classList.add('has-flag');

    if (isGameOver && cell.type === 'mine') {
      button.classList.add('is-mine');
      button.setAttribute(
        'aria-label',
        `Рядок ${row + 1}, стовпець ${col + 1}: знешкоджена міна`,
      );
    } else if (isGameOver && cell.type !== 'mine') {
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

  if (isGameOver && cell.type === 'mine') {
    button.classList.add('is-mine');
    if (isExploded) {
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

  if (cell.state === 'opened') {
    button.classList.add('is-open');

    if (cell.neighborMines > 0) {
      button.classList.add(`num-${cell.neighborMines}`);
      button.textContent = String(cell.neighborMines);
      button.setAttribute(
        'aria-label',
        `Рядок ${row + 1}, стовпець ${col + 1}: відкрита клітинка, мін поруч: ${cell.neighborMines}`,
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

// Крок 5: Рендеринг ігрового поля у DOM
function renderBoard() {
  boardEl.style.setProperty('--rows', String(gameState.rows));
  boardEl.style.setProperty('--cols', String(gameState.cols));
  boardEl.innerHTML = '';

  const fragment = document.createDocumentFragment();

  for (let row = 0; row < gameState.rows; row += 1) {
    for (let col = 0; col < gameState.cols; col += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.row = String(row);
      button.dataset.col = String(col);

      applyCellVisualState(button, gameState.field[row][col], row, col);
      fragment.appendChild(button);
    }
  }

  boardEl.appendChild(fragment);
  updateHeaderUI();
}

// Скидання та запуск нової гри
function initGame() {
  stopTimer();
  gameState.status = 'process';
  gameState.gameTime = 0;
  gameState.explodedCell = null;
  gameState.field = generateField(
    gameState.rows,
    gameState.cols,
    gameState.minesCount,
  );
  renderBoard();
}

// Крок 7: Обробка подій користувача (делегування кліків на полі)
boardEl.addEventListener('click', (event) => {
  const tile = event.target.closest('.tile');
  if (!tile || gameState.status !== 'process') {
    return;
  }

  const row = Number(tile.dataset.row);
  const col = Number(tile.dataset.col);

  openCell(row, col);
  renderBoard();
});

boardEl.addEventListener('contextmenu', (event) => {
  event.preventDefault();

  const tile = event.target.closest('.tile');
  if (!tile || gameState.status !== 'process') {
    return;
  }

  const row = Number(tile.dataset.row);
  const col = Number(tile.dataset.col);

  toggleFlag(row, col);
  renderBoard();
});

restartBtnEl.addEventListener('click', () => {
  initGame();
});

// Перший запуск гри при завантаженні сторінки
initGame();
