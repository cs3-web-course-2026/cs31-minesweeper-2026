// ==========================================
// Стан гри
// ==========================================

const gameState = {
  cols: 10,
  rows: 10,
  minesCount: 10,
  status: 'process',
  gameTime: 0,
  timerId: null,
};

// Окремий контейнер верхнього рівня для ігрового поля (вимога кролика)
let board = [];

// ==========================================
// Логіка створення та розрахунку поля
// ==========================================
function generateField(rows, cols, minesCount) {
  const newBoard = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        type: 'empty',
        state: 'closed',
        neighborMines: 0
      });
    }
    newBoard.push(row);
  }

  let placedMines = 0;
  while (placedMines < minesCount) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);

    if (newBoard[r][c].type !== 'mine') {
      newBoard[r][c].type = 'mine';
      placedMines++;
    }
  }

  return newBoard;
}

function countNeighbourMines(currentBoard, rows, cols) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (currentBoard[r][c].type === 'mine') continue;

      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            if (currentBoard[nr][nc].type === 'mine') count++;
          }
        }
      }
      currentBoard[r][c].neighborMines = count;
    }
  }
}

// ==========================================
// Допоміжна функція для виведення статусів (замість alert)
// ==========================================
function setGameStatusMessage(message) {
  const statusEl = document.getElementById('game-status');
  if (statusEl) {
    statusEl.textContent = message;
  }
}

// ==========================================
// Ігрова логіка
// ==========================================
function openCell(row, col) {
  if (gameState.status !== 'process') return;

  const cell = board[row][col];
  if (cell.state === 'opened' || cell.state === 'flagged') return;

  if (!gameState.timerId && gameState.gameTime === 0) {
    startTimer();
  }

  if (cell.type === 'mine') {
    cell.state = 'opened';
    gameState.status = 'lose';
    stopTimer();
    revealAllMines();
    updateUI();
    setGameStatusMessage('💥 БУМ! Ви програли!');
    return;
  }

  cell.state = 'opened';

  if (cell.neighborMines === 0) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < gameState.rows && nc >= 0 && nc < gameState.cols) {
          if (board[nr][nc].state === 'closed') {
            openCell(nr, nc);
          }
        }
      }
    }
  }

  checkWinCondition();
  updateUI();
}

function toggleFlag(row, col) {
  if (gameState.status !== 'process') return;

  const cell = board[row][col];
  if (cell.state === 'opened') return;

  if (cell.state === 'closed') {
    cell.state = 'flagged';
  } else if (cell.state === 'flagged') {
    cell.state = 'closed';
  }

  updateUI();
}

// ==========================================
// Рендеринг DOM з підтримкою ARIA (Accessibility)
// ==========================================
function renderBoard() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';
  // Виправлено розмір під 35px відповідно до styles.css
  boardEl.style.gridTemplateColumns = `repeat(${gameState.cols}, 35px)`;

  for (let r = 0; r < gameState.rows; r++) {
    for (let c = 0; c < gameState.cols; c++) {
      const cellEl = document.createElement('button');
      cellEl.type = 'button';
      cellEl.classList.add('cell');
      cellEl.dataset.row = r;
      cellEl.dataset.col = c;

      // Події
      cellEl.addEventListener('click', () => openCell(r, c));
      cellEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        toggleFlag(r, c);
      });

      boardEl.appendChild(cellEl);
    }
  }

  updateUI();
}

function updateUI() {
  let flaggedCount = 0;

  for (let r = 0; r < gameState.rows; r++) {
    for (let c = 0; c < gameState.cols; c++) {
      const cell = board[r][c];
      const cellEl = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);

      if (!cellEl) continue;

      cellEl.className = 'cell';
      cellEl.textContent = '';
      delete cellEl.dataset.count;

      const positionText = `Рядок ${r + 1}, стовпчик ${c + 1}`;

      if (cell.state === 'opened') {
        cellEl.classList.add('revealed');
        cellEl.disabled = true;

        if (cell.type === 'mine') {
          cellEl.classList.add('mine');
          cellEl.textContent = '💣';
          cellEl.setAttribute('aria-label', `${positionText}: Міна`);
        } else if (cell.neighborMines > 0) {
          cellEl.dataset.count = cell.neighborMines;
          cellEl.textContent = cell.neighborMines;
          cellEl.setAttribute('aria-label', `${positionText}: ${cell.neighborMines} мін навколо`);
        } else {
          cellEl.setAttribute('aria-label', `${positionText}: Порожньо`);
        }
      } else if (cell.state === 'flagged') {
        cellEl.classList.add('flagged');
        cellEl.textContent = '🚩';
        cellEl.setAttribute('aria-label', `${positionText}: Поставлено прапорець`);
        flaggedCount++;
      } else {
        cellEl.disabled = false;
        cellEl.setAttribute('aria-label', `${positionText}: Закрита клітинка`);
      }
    }
  }

  const remainingFlags = gameState.minesCount - flaggedCount;
  const formattedFlags = String(remainingFlags).padStart(3, '0');
  const flagCountEl = document.getElementById('flag-count');
  if (flagCountEl) {
    flagCountEl.textContent = formattedFlags;
  }
}

// ==========================================
// Допоміжні функції
// ==========================================
function startTimer() {
  if (gameState.timerId) return;
  gameState.timerId = setInterval(() => {
    gameState.gameTime++;
    const timerEl = document.getElementById('timer');
    if (timerEl) {
      timerEl.textContent = String(gameState.gameTime).padStart(3, '0');
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

  for (let r = 0; r < gameState.rows; r++) {
    for (let c = 0; c < gameState.cols; c++) {
      if (board[r][c].state === 'opened' && board[r][c].type !== 'mine') {
        openedCount++;
      }
    }
  }

  if (openedCount === totalSafeCells) {
    gameState.status = 'win';
    stopTimer();
    setGameStatusMessage('🎉 Вітаємо! Ви перемогли!');
  }
}

function revealAllMines() {
  for (let r = 0; r < gameState.rows; r++) {
    for (let c = 0; c < gameState.cols; c++) {
      if (board[r][c].type === 'mine') {
        board[r][c].state = 'opened';
      }
    }
  }
}

function initGame() {
  stopTimer();
  gameState.status = 'process';
  gameState.gameTime = 0;

  const timerEl = document.getElementById('timer');
  if (timerEl) {
    timerEl.textContent = '000';
  }

  setGameStatusMessage('');

  board = generateField(gameState.rows, gameState.cols, gameState.minesCount);
  countNeighbourMines(board, gameState.rows, gameState.cols);

  renderBoard();
}

const restartBtn = document.getElementById('restart-btn');
if (restartBtn) {
  restartBtn.addEventListener('click', initGame);
}

// Запуск при завантаженні
initGame();