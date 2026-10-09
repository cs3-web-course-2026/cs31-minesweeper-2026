// ==========================================
// Стан гри
// ==========================================
const gameState = {
  rows: 10,
  cols: 10,
  minesCount: 10,
  status: 'process',
  gameTime: 0,
  timerId: null,
  board: []
};

// ==========================================
// Логіка створення та розрахунку поля
// ==========================================
function generateField(rows, cols, minesCount) {
  const board = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        type: 'empty',
        state: 'closed',
        neighborMines: 0
      });
    }
    board.push(row);
  }

  let placedMines = 0;
  while (placedMines < minesCount) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);

    if (board[r][c].type !== 'mine') {
      board[r][c].type = 'mine';
      placedMines++;
    }
  }

  return board;
}

function countNeighbourMines(board, rows, cols) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].type === 'mine') continue;

      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            if (board[nr][nc].type === 'mine') count++;
          }
        }
      }
      board[r][c].neighborMines = count;
    }
  }
}

// ==========================================
// Ігрова логіка
// ==========================================
function openCell(row, col) {
  if (gameState.status !== 'process') return;

  const cell = gameState.board[row][col];
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
    alert('💥 БУМ! Ви програли!');
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
          if (gameState.board[nr][nc].state === 'closed') {
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

  const cell = gameState.board[row][col];
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
  boardEl.style.gridTemplateColumns = `repeat(${gameState.cols}, 32px)`;

  for (let r = 0; r < gameState.rows; r++) {
    for (let c = 0; c < gameState.cols; c++) {
      // Створюємо саме кнопковий елемент для правильного залучення клавіатури/скрінрідерів
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
      const cell = gameState.board[r][c];
      const cellEl = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);

      if (!cellEl) continue;

      cellEl.className = 'cell';
      cellEl.textContent = '';
      delete cellEl.dataset.count;

      // Формуємо доступний опис клітинки для скрінрідера
      const positionText = `Рядок ${r + 1}, стовпчик ${c + 1}`;

      if (cell.state === 'opened') {
        cellEl.classList.add('revealed');
        cellEl.disabled = true; // Відкрита кнопка не має бути активною для натискання

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

  // Оновлюємо лічильник прапорців з форматуванням (наприклад, 010)
  const remainingFlags = gameState.minesCount - flaggedCount;
  const formattedFlags = String(remainingFlags).padStart(3, '0');
  document.getElementById('flag-count').textContent = formattedFlags;
}

// ==========================================
// Допоміжні функції
// ==========================================
function startTimer() {
  if (gameState.timerId) return;
  gameState.timerId = setInterval(() => {
    gameState.gameTime++;
    document.getElementById('timer').textContent = String(gameState.gameTime).padStart(3, '0');
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
      if (gameState.board[r][c].state === 'opened' && gameState.board[r][c].type !== 'mine') {
        openedCount++;
      }
    }
  }

  if (openedCount === totalSafeCells) {
    gameState.status = 'win';
    stopTimer();
    alert('🎉 Вітаємо! Ви перемогли!');
  }
}

function revealAllMines() {
  for (let r = 0; r < gameState.rows; r++) {
    for (let c = 0; c < gameState.cols; c++) {
      if (gameState.board[r][c].type === 'mine') {
        gameState.board[r][c].state = 'opened';
      }
    }
  }
}

function initGame() {
  stopTimer();
  gameState.status = 'process';
  gameState.gameTime = 0;
  document.getElementById('timer').textContent = '000';

  gameState.board = generateField(gameState.rows, gameState.cols, gameState.minesCount);
  countNeighbourMines(gameState.board, gameState.rows, gameState.cols);

  renderBoard();
}

document.getElementById('restart-btn').addEventListener('click', initGame);

// Запуск при завантаженні
initGame();