// ==========================================
// Константи (вимога кролика: UPPER_SNAKE_CASE)
// ==========================================
const GAME_STATUS = {
  PROCESS: 'process',
  WIN: 'win',
  LOSE: 'lose'
};

const CELL_STATE = {
  CLOSED: 'closed',
  OPENED: 'opened',
  FLAGGED: 'flagged'
};

const CELL_TYPE = {
  EMPTY: 'empty',
  MINE: 'mine'
};

// ==========================================
// Кешовані DOM-елементи (вимога кролика)
// ==========================================
const boardElement = document.getElementById('board');
const flagCountElement = document.getElementById('flag-count');
const timerElement = document.getElementById('timer');
const gameStatusElement = document.getElementById('game-status');
const restartButton = document.getElementById('restart-btn');

// ==========================================
// Стан гри
// ==========================================
const gameState = {
  cols: 10,
  rows: 10,
  minesCount: 10,
  status: GAME_STATUS.PROCESS,
  gameTime: 0,
  timerId: null,
};

let board = [];
let cellElements = []; // Кешовані DOM-елементи сітки

// ==========================================
// Логіка створення та розрахунку поля
// ==========================================
function generateField(rowCount, colCount, minesCount) {
  const newBoard = [];
  for (let row = 0; row < rowCount; row++) {
    const rowCells = [];
    for (let col = 0; col < colCount; col++) {
      rowCells.push({
        type: CELL_TYPE.EMPTY,
        state: CELL_STATE.CLOSED,
        neighborMines: 0
      });
    }
    newBoard.push(rowCells);
  }

  let placedMines = 0;
  while (placedMines < minesCount) {
    const randomRow = Math.floor(Math.random() * rowCount);
    const randomCol = Math.floor(Math.random() * colCount);

    if (newBoard[randomRow][randomCol].type !== CELL_TYPE.MINE) {
      newBoard[randomRow][randomCol].type = CELL_TYPE.MINE;
      placedMines++;
    }
  }

  return newBoard;
}

function countNeighbourMines(currentBoard, rowCount, colCount) {
  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < colCount; col++) {
      if (currentBoard[row][col].type === CELL_TYPE.MINE) continue;

      let count = 0;
      for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
        for (let colOffset = -1; colOffset <= 1; colOffset++) {
          if (rowOffset === 0 && colOffset === 0) continue;
          const neighborRow = row + rowOffset;
          const neighborCol = col + colOffset;
          if (neighborRow >= 0 && neighborRow < rowCount && neighborCol >= 0 && neighborCol < colCount) {
            if (currentBoard[neighborRow][neighborCol].type === CELL_TYPE.MINE) count++;
          }
        }
      }
      currentBoard[row][col].neighborMines = count;
    }
  }
}

// ==========================================
// Допоміжна функція для виведення статусів
// ==========================================
function setGameStatusMessage(message) {
  if (gameStatusElement) {
    gameStatusElement.textContent = message;
  }
}

// ==========================================
// Ігрова логіка
// ==========================================
function openCell(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) return;

  const cell = board[row][col];
  if (cell.state === CELL_STATE.OPENED || cell.state === CELL_STATE.FLAGGED) return;

  if (!gameState.timerId && gameState.gameTime === 0) {
    startTimer();
  }

  if (cell.type === CELL_TYPE.MINE) {
    cell.state = CELL_STATE.OPENED;
    gameState.status = GAME_STATUS.LOSE;
    stopTimer();
    revealAllMines();
    updateUI();
    setGameStatusMessage('💥 БУМ! Ви програли!');
    return;
  }

  cell.state = CELL_STATE.OPENED;

  if (cell.neighborMines === 0) {
    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
      for (let colOffset = -1; colOffset <= 1; colOffset++) {
        if (rowOffset === 0 && colOffset === 0) continue;
        const neighborRow = row + rowOffset;
        const neighborCol = col + colOffset;
        if (neighborRow >= 0 && neighborRow < gameState.rows && neighborCol >= 0 && neighborCol < gameState.cols) {
          if (board[neighborRow][neighborCol].state === CELL_STATE.CLOSED) {
            openCell(neighborRow, neighborCol);
          }
        }
      }
    }
  }

  checkWinCondition();
  updateUI();
}

function toggleFlag(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) return;

  const cell = board[row][col];
  if (cell.state === CELL_STATE.OPENED) return;

  if (cell.state === CELL_STATE.CLOSED) {
    cell.state = CELL_STATE.FLAGGED;
  } else if (cell.state === CELL_STATE.FLAGGED) {
    cell.state = CELL_STATE.CLOSED;
  }

  updateUI();
}

// ==========================================
// Рендеринг DOM з підтримкою ARIA
// ==========================================
function renderBoard() {
  if (!boardElement) return;
  boardElement.innerHTML = '';
  boardElement.style.gridTemplateColumns = `repeat(${gameState.cols}, 35px)`;

  cellElements = [];

  for (let row = 0; row < gameState.rows; row++) {
    const rowElements = [];
    for (let col = 0; col < gameState.cols; col++) {
      const cellElement = document.createElement('button');
      cellElement.type = 'button';
      cellElement.classList.add('cell');
      cellElement.dataset.row = row;
      cellElement.dataset.col = col;

      cellElement.addEventListener('click', () => openCell(row, col));
      cellElement.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        toggleFlag(row, col);
      });

      boardElement.appendChild(cellElement);
      rowElements.push(cellElement);
    }
    cellElements.push(rowElements);
  }

  updateUI();
}

function updateUI() {
  let flaggedCount = 0;

  for (let row = 0; row < gameState.rows; row++) {
    for (let col = 0; col < gameState.cols; col++) {
      const cell = board[row][col];
      const cellElement = cellElements[row]?.[col];

      if (!cellElement) continue;

      cellElement.className = 'cell';
      cellElement.textContent = '';
      delete cellElement.dataset.count;

      const positionText = `Рядок ${row + 1}, стовпчик ${col + 1}`;

      if (cell.state === CELL_STATE.OPENED) {
        cellElement.classList.add('revealed');
        cellElement.setAttribute('aria-disabled', 'true'); // Зберігає фокус клавіатури

        if (cell.type === CELL_TYPE.MINE) {
          cellElement.classList.add('mine');
          cellElement.textContent = '💣';
          cellElement.setAttribute('aria-label', `${positionText}: Міна`);
        } else if (cell.neighborMines > 0) {
          cellElement.dataset.count = cell.neighborMines;
          cellElement.textContent = cell.neighborMines;
          cellElement.setAttribute('aria-label', `${positionText}: ${cell.neighborMines} мін навколо`);
        } else {
          cellElement.setAttribute('aria-label', `${positionText}: Порожньо`);
        }
      } else if (cell.state === CELL_STATE.FLAGGED) {
        cellElement.classList.add('flagged');
        cellElement.textContent = '🚩';
        cellElement.setAttribute('aria-disabled', 'false');
        cellElement.setAttribute('aria-label', `${positionText}: Поставлено прапорець`);
        flaggedCount++;
      } else {
        cellElement.setAttribute('aria-disabled', 'false');
        cellElement.setAttribute('aria-label', `${positionText}: Закрита клітинка`);
      }
    }
  }

  const remainingFlags = gameState.minesCount - flaggedCount;
  const formattedFlags = String(remainingFlags).padStart(3, '0');
  if (flagCountElement) {
    flagCountElement.textContent = formattedFlags;
  }
}

// ==========================================
// Допоміжні функції
// ==========================================
function startTimer() {
  if (gameState.timerId) return;
  gameState.timerId = setInterval(() => {
    gameState.gameTime++;
    if (timerElement) {
      timerElement.textContent = String(gameState.gameTime).padStart(3, '0');
    }
  }, 1000);
}

function stopTimer() {
  if (gameState.timerId) {
    clearInterval(gameState.timerId);
    gameState.timerId = null;
  }
}

function checkWinCondition() {
  let openedCount = 0;
  const totalSafeCells = (gameState.rows * gameState.cols) - gameState.minesCount;

  for (let row = 0; row < gameState.rows; row++) {
    for (let col = 0; col < gameState.cols; col++) {
      if (board[row][col].state === CELL_STATE.OPENED && board[row][col].type !== CELL_TYPE.MINE) {
        openedCount++;
      }
    }
  }

  if (openedCount === totalSafeCells) {
    gameState.status = GAME_STATUS.WIN;
    stopTimer();
    setGameStatusMessage('🎉 Вітаємо! Ви перемогли!');
  }
}

function revealAllMines() {
  for (let row = 0; row < gameState.rows; row++) {
    for (let col = 0; col < gameState.cols; col++) {
      if (board[row][col].type === CELL_TYPE.MINE) {
        board[row][col].state = CELL_STATE.OPENED;
      }
    }
  }
}

function initGame() {
  stopTimer();
  gameState.status = GAME_STATUS.PROCESS;
  gameState.gameTime = 0;

  if (timerElement) {
    timerElement.textContent = '000';
  }

  setGameStatusMessage('');

  board = generateField(gameState.rows, gameState.cols, gameState.minesCount);
  countNeighbourMines(board, gameState.rows, gameState.cols);

  renderBoard();
}

if (restartButton) {
  restartButton.addEventListener('click', initGame);
}

// Запуск при завантаженні
initGame();