// ЛОГІКА ГРИ (без звернень до DOM)

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

let board = [];   // двовимірний масив клітинок

function generateField(rows, cols, minesCount) {
    const newBoard = [];
    for (let row = 0; row < rows; row++) {
        const newRow = [];
        for (let col = 0; col < cols; col++) {
            newRow.push(createCell());
        }
        newBoard.push(newRow);
    }

    const maxMines = Math.min(minesCount, rows * cols - 1);   // захист від нескінченного циклу
    let placed = 0;
    while (placed < maxMines) {
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * cols);
        if (newBoard[row][col].type !== 'mine') {
            newBoard[row][col].type = 'mine';
            placed++;
        }
    }
    return newBoard;
}

function getNeighbors(row, col) {
  const result = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      const insideBoard = r >= 0 && r < gameState.rows && c >= 0 && c < gameState.cols;
      if (insideBoard) {
        result.push({ row: r, col: c });
      }
    }
  }
  return result;
}

function countNeighbourMines() {
  for (let r = 0; r < gameState.rows; r++) {
    for (let c = 0; c < gameState.cols; c++) {
      if (board[r][c].type === 'empty') {
        const minesAround = getNeighbors(r, c)
          .filter(n => board[n.row][n.col].type === 'mine')
          .length;
        board[r][c].neighborMines = minesAround;
      }
    }
  }
}

function revealCell(row, col) {
  const cell = board[row][col];
  if (cell.state !== 'closed') return;   // умова виходу з рекурсії + ігноруємо flagged

  cell.state = 'opened';

  if (cell.neighborMines === 0) {        // порожня клітинка: відкриваємо сусідів
    getNeighbors(row, col).forEach(n => revealCell(n.row, n.col));
  }
}

function openCell(row, col) {
  if (gameState.status !== 'process') return;     // гра вже закінчена
  const cell = board[row][col];
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
  board.flat()
    .filter(cell => cell.type === 'mine')
    .forEach(cell => { cell.state = 'flagged'; });
}

function checkWin() {
  // перемога: кожна клітинка або міна, або відкрита
  return board.every(row =>
    row.every(cell => cell.type === 'mine' || cell.state === 'opened')
  );
}

function toggleFlag(row, col) {
  if (gameState.status !== 'process') return;
  const cell = board[row][col];
  if (cell.state === 'opened') return;      // на відкритій ставити не можна

  if (cell.state === 'flagged') {
    cell.state = 'closed';
  } else if (countFlags() < gameState.minesCount) {   // прапорців не більше, ніж мін
    cell.state = 'flagged';
  }
}

function countFlags() {
  return board.flat().filter(cell => cell.state === 'flagged').length;
}

function initGame() {
  stopTimer();
  gameState.status = 'process';
  gameState.gameTime = 0;
  board = generateField(gameState.rows, gameState.cols, gameState.minesCount);
  countNeighbourMines();
}

// DOM ТА ПОДІЇ

const boardElement = document.querySelector('.game-field');
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
    if (isMine) {
      return { classes: ['cell-mine', 'cell-exploded'], text: '☠', description: 'підірвана міна' };
    }
    const count = cell.neighborMines;
    if (count === 0) {
      return { classes: ['cell-opened'], text: '', description: 'порожня' };
    }
    return {
      classes: ['cell-opened', `cell-num-${count}`],
      text: count,
      description: `відкрита, мін поруч: ${count}`,
    };
  }

  if (cell.state === 'flagged') {
    const classes = ['cell-flagged'];
    let description = 'прапорець';
    if (isGameOver) {
      classes.push(isMine ? 'cell-correct' : 'cell-wrong');   // чи правильний прапорець
      description = isMine ? 'прапорець, міну знайдено' : 'прапорець помилковий';
    }
    return { classes, text: '⚑', description };
  }

  if (isGameOver && isMine) {
    return { classes: ['cell-mine'], text: '✹', description: 'міна' };   // нерозкрита міна після поразки
  }
  return { classes: ['cell-closed'], text: '', description: 'закрита' };
}

function getCellElement(row, col) {
  return boardElement.children[row * gameState.cols + col];
}

// Створюємо кнопки лише коли змінюється розмір поля — далі лише оновлюємо їх
function buildBoardElements() {
  boardElement.replaceChildren();
  boardElement.style.setProperty('--board-cols', gameState.cols);
  boardElement.style.setProperty('--board-rows', gameState.rows);

  for (let row = 0; row < gameState.rows; row++) {
    for (let col = 0; col < gameState.cols; col++) {
      const element = document.createElement('button');
      element.type = 'button';
      element.dataset.row = row;
      element.dataset.col = col;
      boardElement.appendChild(element);
    }
  }
}

function updateCellElement(element, cell, row, col) {
  const { classes, text, description } = getCellView(cell);
  element.className = ['cell', ...classes].join(' ');
  element.textContent = text;
  element.setAttribute('aria-label', `Рядок ${row + 1}, стовпець ${col + 1}: ${description}`);
}

// Оновлюємо наявні кнопки, щоб фокус клавіатури лишався на клітинці
function renderBoard() {
  if (boardElement.children.length !== gameState.rows * gameState.cols) {
    buildBoardElements();
  }
  board.forEach((cells, row) => {
    cells.forEach((cell, col) => {
      updateCellElement(getCellElement(row, col), cell, row, col);
    });
  });
}

// таймер, лічильник, повідомлення

function formatNumber(value) {
  return String(value).padStart(3, '0');   // 6 -> "006"
}

function renderStatus() {
  timerElement.textContent = formatNumber(gameState.gameTime);
  minesCounterElement.textContent = formatNumber(gameState.minesCount - countFlags());
  messageElement.textContent = MESSAGES[gameState.status];
  messageElement.dataset.status = gameState.status;   // для візуального оформлення win/lose у CSS
}

function render() {
  renderBoard();
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

function handleCellAction(event, action) {
  const coords = getCellCoords(event);
  if (!coords) return;
  action(coords.row, coords.col);
  render();
}

boardElement.addEventListener('click', (event) => {
  handleCellAction(event, openCell);
});

boardElement.addEventListener('contextmenu', (event) => {
  event.preventDefault();                  // блокуємо контекстне меню браузера
  handleCellAction(event, toggleFlag);
});

// прапорець з клавіатури: клавіша F (за фізичним кодом, тому працює в будь-якій розкладці)
boardElement.addEventListener('keydown', (event) => {
  if (event.code !== 'KeyF' || event.repeat) return;   // утримання клавіші не має перемикати прапорець знову і знову
  handleCellAction(event, toggleFlag);
});

// Старт / рестарт

function startNewGame() {
  initGame();
  render();
}

restartButton.addEventListener('click', startNewGame);
setTickHandler(renderStatus);   // логіка рахує секунди, інтерфейс їх показує

startNewGame();