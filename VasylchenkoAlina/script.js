const gameState = {
    rows: 10,
    cols: 10,
    minesCount: 15, // Налаштування складності
    status: 'process', // Поточний стан гри: 'process' | 'win' | 'lose'
    gameTime: 0, // Час гри у секундах
    timerId: null, // Посилання на ідентифікатор таймера для його зупинки (clearInterval)
};

function createCell() {
    return { type: 'empty', neighborMines: 0, state: 'closed' };
}

let field = [];

function generateField(rows, cols, minesCount) {
    const newField = [];
    for (let row = 0; row < rows; row++) {
        const newRow = [];
        for (let col = 0; col < cols; col++) {
            newRow.push(createCell());
        }
        newField.push(newRow);
    }

    const maxMines = Math.min(minesCount, rows * cols - 1);   // захист від нескінченного циклу
    let placed = 0;
    while (placed < maxMines) {
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * cols);
        if (newField[row][col].type !== 'mine') {
            newField[row][col].type = 'mine';
            placed++;
        }
    }
    return newField;
}

function getNeighbors(row, col) {
  const result = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      const insideField = r >= 0 && r < gameState.rows && c >= 0 && c < gameState.cols;
      if (insideField) {
        result.push({ row: r, col: c });
      }
    }
  }
  return result;
}

function countNeighbourMines() {
  for (let r = 0; r < gameState.rows; r++) {
    for (let c = 0; c < gameState.cols; c++) {
      if (field[r][c].type === 'empty') {
        const minesAround = getNeighbors(r, c)
          .filter(n => field[n.row][n.col].type === 'mine')
          .length;
        field[r][c].neighborMines = minesAround;
      }
    }
  }
}

function revealCell(row, col) {
  const cell = field[row][col];
  if (cell.state !== 'closed') return;   // умова виходу з рекурсії + ігноруємо flagged

  cell.state = 'opened';

  if (cell.neighborMines === 0) {        // порожня клітинка: відкриваємо сусідів
    getNeighbors(row, col).forEach(n => revealCell(n.row, n.col));
  }
}

function openCell(row, col) {
  if (gameState.status !== 'process') return;     // гра вже закінчена
  const cell = field[row][col];
  if (cell.state !== 'closed') return;            // opened або flagged: нічого не робимо

  startTimer();                                   // таймер стартує з першого кліку

  if (cell.type === 'mine') {
    cell.state = 'opened';
    endGame('lose');
    return;
  }

  revealCell(row, col);

  if (checkWin()) {
    endGame('win');
  }
}

let tickHandler = () => {};   // UI підписується на тік таймера, логіка не знає про DOM

function setTickHandler(handler) {
  tickHandler = handler;
}

function startTimer() {
  if (gameState.timerId !== null) return;   // щоб не запустити два таймери
  gameState.timerId = setInterval(() => {
    gameState.gameTime++;
    tickHandler();
  }, 1000);
}

function stopTimer() {
  clearInterval(gameState.timerId);
  gameState.timerId = null;
}

function endGame(status) {
  gameState.status = status;   // 'win' або 'lose'
  stopTimer();
  if (status === 'win') flagAllMines();
}

function flagAllMines() {
  field.flat()
    .filter(cell => cell.type === 'mine')
    .forEach(cell => { cell.state = 'flagged'; });
}

function checkWin() {
  // перемога: кожна клітинка або міна, або відкрита
  return field.every(row =>
    row.every(cell => cell.type === 'mine' || cell.state === 'opened')
  );
}

function toggleFlag(row, col) {
  if (gameState.status !== 'process') return;
  const cell = field[row][col];
  if (cell.state === 'opened') return;      // на відкритій ставити не можна

  if (cell.state === 'flagged') {
    cell.state = 'closed';
  } else if (countFlags() < gameState.minesCount) {   // прапорців не більше, ніж мін
    cell.state = 'flagged';
  }
}

function countFlags() {   // знадобиться для лічильника прапорців у кроці 6
  return field.flat().filter(cell => cell.state === 'flagged').length;
}

function initGame() {
  stopTimer();
  gameState.status = 'process';
  gameState.gameTime = 0;
  field = generateField(gameState.rows, gameState.cols, gameState.minesCount);
  countNeighbourMines();
}

// DOM ТА ПОДІЇ
const fieldElement = document.querySelector('.game-field');
const minesCounterElement = document.querySelector('.counter-value');
const timerElement = document.querySelector('.timer-value');
const restartButton = document.querySelector('.btn-restart');
const messageElement = document.querySelector('.game-message');

const MESSAGES = {
  win: '🎉 Перемога!',
  lose: '☠ Ви підірвались на міні!',
  process: '',
};


function getCellView(cell) {
  const isGameOver = gameState.status !== 'process';
  const isMine = cell.type === 'mine';

  if (cell.state === 'opened') {
    if (isMine) return { classes: ['cell-mine', 'cell-exploded'], text: '☠' };   // підірвана міна
    const count = cell.neighborMines;
    if (count === 0) return { classes: ['cell-opened'], text: '' };
    return { classes: ['cell-opened', `cell-num-${count}`], text: count };
  }

  if (cell.state === 'flagged') {
    const classes = ['cell-flagged'];
    if (isGameOver) classes.push(isMine ? 'cell-correct' : 'cell-wrong');   // чи правильний прапорець
    return { classes, text: '⚑' };
  }

  if (isGameOver && isMine) return { classes: ['cell-mine'], text: '✹' };   // нерозкрита міна після поразки
  return { classes: ['cell-closed'], text: '' };
}

function createCellElement(cell, row, col) {
  const { classes, text } = getCellView(cell);
  const element = document.createElement('button');
  element.type = 'button';
  element.classList.add('cell', ...classes);
  element.textContent = text;
  element.dataset.row = row;
  element.dataset.col = col;
  return element;
}

function renderField() {
  fieldElement.innerHTML = '';
  fieldElement.style.setProperty('--board-cols', gameState.cols);
  fieldElement.style.setProperty('--board-rows', gameState.rows);

  for (let row = 0; row < gameState.rows; row++) {
    for (let col = 0; col < gameState.cols; col++) {
      fieldElement.appendChild(createCellElement(field[row][col], row, col));
    }
  }
}

// таймер, лічильник, повідомлення

function formatNumber(value) {
  return String(value).padStart(3, '0');   // 6 -> "006"
}

function renderStatus() {
  timerElement.textContent = formatNumber(gameState.gameTime);
  minesCounterElement.textContent = formatNumber(gameState.minesCount - countFlags());
  messageElement.textContent = MESSAGES[gameState.status];
}

function render() {
  renderField();
  renderStatus();
}

// події

function getCellCoords(event) {
  const cellElement = event.target.closest('.cell');
  if (!cellElement) return null;
  return {
    row: Number(cellElement.dataset.row),
    col: Number(cellElement.dataset.col),
  };
}

fieldElement.addEventListener('click', (event) => {
  const coords = getCellCoords(event);
  if (!coords) return;
  openCell(coords.row, coords.col);
  render();
});

fieldElement.addEventListener('contextmenu', (event) => {
  event.preventDefault();                  // блокуємо контекстне меню браузера
  const coords = getCellCoords(event);
  if (!coords) return;
  toggleFlag(coords.row, coords.col);
  render();
});

// Старт / рестарт

function startNewGame() {
  initGame();
  render();
}

restartButton.addEventListener('click', startNewGame);
setTickHandler(renderStatus);   // логіка рахує секунди, інтерфейс їх показує

startNewGame();