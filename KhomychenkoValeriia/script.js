const gameState = {
  rows: 10,
  cols: 10,
  minesCount: 15,
  status: 'process', // 'process' | 'win' | 'lose'
  gameTime: 0,
  timerId: null,
  flagsPlaced: 0,
  isFirstClick: true,
  board: [],
};

/**
 * Кешовані посилання на DOM-елементи інтерфейсу.
 * @type {Object}
 */
const elements = {
  board: document.getElementById('board'),
  timerDisplay: document.getElementById('timer-display'),
  minesDisplay: document.getElementById('mines-display'),
  resetBtn: document.getElementById('reset-btn'),
  faceIcon: document.getElementById('face-icon'),
  statusTip: document.getElementById('status-tip'),
};

/**
 * Створює матрицю порожніх клітинок ігрового поля.
 * @param {number} rows - Кількість рядків сітки.
 * @param {number} cols - Кількість стовпців сітки.
 * @returns {Array<Array<Object>>} Двовимірний масив об'єктів клітинок.
 */
function createEmptyBoard(rows, cols) {
  const board = [];
  for (let r = 0; r < rows; r += 1) {
    const row = [];
    for (let c = 0; c < cols; c += 1) {
      row.push({
        row: r,
        col: c,
        type: 'empty',
        state: 'closed', // 'closed' | 'opened' | 'flagged'
        neighborMines: 0,
        isExploded: false,
      });
    }
    board.push(row);
  }
  return board;
}

/**
 * Отримує дійсні координати всіх сусідніх клітинок навколо заданої точки.
 * @param {number} r - Поточний рядок клітинки.
 * @param {number} c - Поточний стовпець клітинки.
 * @returns {Array<Array<number>>} Масив пар координат [row, col] дійсних сусідів.
 */
function getNeighbors(r, c) {
  const neighbors = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < gameState.rows && nc >= 0 && nc < gameState.cols) {
        neighbors.push([nr, nc]);
      }
    }
  }
  return neighbors;
}

/**
 * Підраховує кількість мін у сусідніх клітинках для кожної комірки на полі.
 */
function countNeighbourMines() {
  for (let r = 0; r < gameState.rows; r += 1) {
    for (let c = 0; c < gameState.cols; c += 1) {
      if (gameState.board[r][c].type === 'mine') continue;

      let count = 0;
      const neighbors = getNeighbors(r, c);
      neighbors.forEach(([nr, nc]) => {
        if (gameState.board[nr][nc].type === 'mine') {
          count += 1;
        }
      });
      gameState.board[r][c].neighborMines = count;
    }
  }
}

/**
 * Випадково розставляє міни на полі з гарантією безпечного першого кліку.
 * @param {number} initialRow - Рядок, на який клікнув користувач вперше.
 * @param {number} initialCol - Стовпець, на який клікнув користувач вперше.
 */
function placeMines(initialRow, initialCol) {
  let placed = 0;
  while (placed < gameState.minesCount) {
    const r = Math.floor(Math.random() * gameState.rows);
    const c = Math.floor(Math.random() * gameState.cols);

    const isInitial = Math.abs(r - initialRow) <= 1 && Math.abs(c - initialCol) <= 1;
    if (!isInitial && gameState.board[r][c].type !== 'mine') {
      gameState.board[r][c].type = 'mine';
      placed += 1;
    }
  }
  countNeighbourMines();
}

/**
 * Запускає ігровий таймер, що оновлюється щосекунди.
 */
function startTimer() {
  if (gameState.timerId) return;
  gameState.timerId = setInterval(() => {
    gameState.gameTime += 1;
    if (gameState.gameTime > 999) {
      gameState.gameTime = 999;
    }
    updateTimerDisplay();
  }, 1000);
}

/**
 * Зупиняє ігровий таймер.
 */
function stopTimer() {
  if (gameState.timerId) {
    clearInterval(gameState.timerId);
    gameState.timerId = null;
  }
}

/**
 * Оновлює текстове значення таймера у відповідному DOM-елементі.
 */
function updateTimerDisplay() {
  elements.timerDisplay.textContent = String(gameState.gameTime).padStart(3, '0');
}

/**
 * Оновлює лічильник залишкових мін та прапорців у DOM-елементі.
 */
function updateMinesDisplay() {
  const remaining = gameState.minesCount - gameState.flagsPlaced;
  elements.minesDisplay.textContent = String(remaining).padStart(3, '0');
}

/**
 * Рекурсивно відкриває порожні сусідні області при натисканні на клітинку з 0 мін поряд.
 * @param {number} startRow - Початковий рядок розкриття.
 * @param {number} startCol - Початковий стовпець розкриття.
 */
function revealEmptyArea(startRow, startCol) {
  const queue = [[startRow, startCol]];

  while (queue.length > 0) {
    const [r, c] = queue.shift();
    const neighbors = getNeighbors(r, c);

    neighbors.forEach(([nr, nc]) => {
      const neighbor = gameState.board[nr][nc];
      if (neighbor.state === 'closed') {
        neighbor.state = 'opened';
        if (neighbor.neighborMines === 0 && neighbor.type === 'empty') {
          queue.push([nr, nc]);
        }
      }
    });
  }
}

/**
 * Перевіряє виконання умов перемоги у грі.
 */
function checkWinCondition() {
  let openedSafeCount = 0;
  const totalSafeCells = gameState.rows * gameState.cols - gameState.minesCount;

  for (let r = 0; r < gameState.rows; r += 1) {
    for (let c = 0; c < gameState.cols; c += 1) {
      const cell = gameState.board[r][c];
      if (cell.type === 'empty' && cell.state === 'opened') {
        openedSafeCount += 1;
      }
    }
  }

  if (openedSafeCount === totalSafeCells) {
    gameState.status = 'win';
    stopTimer();
    elements.faceIcon.textContent = '😎';
    elements.statusTip.textContent = 'Перемога! Ви розмінували все поле!';
  }
}

function handleGameOver(explodedRow, explodedCol) {
  gameState.status = 'lose';
  stopTimer();
  elements.faceIcon.textContent = '😵';
  elements.statusTip.textContent = 'Гру закінчено! Ви натрапили на міну.';

  for (let r = 0; r < gameState.rows; r += 1) {
    for (let c = 0; c < gameState.cols; c += 1) {
      const cell = gameState.board[r][c];
      if (cell.type === 'mine') {
        cell.state = 'opened';
        if (r === explodedRow && c === explodedCol) {
          cell.isExploded = true;
        }
      }
    }
  }
}

/**
 * Головна функція обробки відкриття клітинки ігрового поля.
 * @param {number} r - Рядок клітинки.
 * @param {number} c - Стовпець клітинки.
 */
function openCell(r, c) {
  if (gameState.status !== 'process') return;

  const cell = gameState.board[r][c];
  if (cell.state === 'opened' || cell.state === 'flagged') return;

  if (gameState.isFirstClick) {
    gameState.isFirstClick = false;
    placeMines(r, c);
    startTimer();
  }

  if (cell.type === 'mine') {
    handleGameOver(r, c);
  } else {
    cell.state = 'opened';
    if (cell.neighborMines === 0) {
      revealEmptyArea(r, c);
    }
    checkWinCondition();
  }

  renderBoard();
}

/**
 * Встановлює або знімає прапорець на закритій клітинці.
 * @param {number} r - Рядок клітинки.
 * @param {number} c - Стовпець клітинки.
 */
function toggleFlag(r, c) {
  if (gameState.status !== 'process') return;

  const cell = gameState.board[r][c];
  if (cell.state === 'opened') return;

  if (cell.state === 'closed') {
    cell.state = 'flagged';
    gameState.flagsPlaced += 1;
  } else if (cell.state === 'flagged') {
    cell.state = 'closed';
    gameState.flagsPlaced -= 1;
  }

  updateMinesDisplay();
  renderBoard();
}

/**
 * Динамічно рендерить ігрове поле на основі масиву даних у DOM.
 */
function renderBoard() {
  elements.board.innerHTML = '';
  elements.board.style.gridTemplateColumns = `repeat(${gameState.cols}, var(--cell-size))`;
  elements.board.style.gridTemplateRows = `repeat(${gameState.rows}, var(--cell-size))`;

  const fragment = document.createDocumentFragment();

  for (let r = 0; r < gameState.rows; r += 1) {
    for (let c = 0; c < gameState.cols; c += 1) {
      const cellData = gameState.board[r][c];
      const cellNode = document.createElement('button');
      cellNode.type = 'button';
      cellNode.classList.add('cell');
      cellNode.dataset.row = String(r);
      cellNode.dataset.col = String(c);

      if (cellData.state === 'closed') {
        cellNode.classList.add('closed');
        cellNode.setAttribute('aria-label', `Клітинка ${r + 1}, ${c + 1} закрита`);
      } else if (cellData.state === 'flagged') {
        cellNode.classList.add('closed', 'flagged');
        cellNode.textContent = '🚩';
        cellNode.setAttribute('aria-label', `Прапорець на клітинці ${r + 1}, ${c + 1}`);
      } else if (cellData.state === 'opened') {
        cellNode.classList.add('open');
        if (cellData.type === 'mine') {
          cellNode.classList.add('mine');
          if (cellData.isExploded) {
            cellNode.classList.add('exploded');
            cellNode.textContent = '💥';
          } else {
            cellNode.textContent = '💣';
          }
          cellNode.setAttribute('aria-label', 'Міна');
        } else if (cellData.neighborMines > 0) {
          cellNode.classList.add(`val-${cellData.neighborMines}`);
          cellNode.textContent = String(cellData.neighborMines);
          cellNode.setAttribute('aria-label', `Кількість мін поряд: ${cellData.neighborMines}`);
        } else {
          cellNode.setAttribute('aria-label', 'Порожня відкрита клітинка');
        }
      }

      fragment.appendChild(cellNode);
    }
  }

  elements.board.appendChild(fragment);
}

/**
 * Ініціалізує або повністю скидає параметри для початку нової гри.
 */
function initGame() {
  stopTimer();
  gameState.rows = 10;
  gameState.cols = 10;
  gameState.minesCount = 15;
  gameState.status = 'process';
  gameState.gameTime = 0;
  gameState.flagsPlaced = 0;
  gameState.isFirstClick = true;
  gameState.board = createEmptyBoard(gameState.rows, gameState.cols);

  elements.faceIcon.textContent = '🙂';
  elements.statusTip.textContent = 'Клікніть будь-яку клітинку для початку гри';
  updateTimerDisplay();
  updateMinesDisplay();
  renderBoard();
}

// Делегування подій лівого кліку на ігровому полі
elements.board.addEventListener('click', (event) => {
  const target = event.target.closest('.cell');
  if (!target) return;
  const r = parseInt(target.dataset.row, 10);
  const c = parseInt(target.dataset.col, 10);
  openCell(r, c);
});

// Делегування подій правого кліку (контекстного меню) для встановлення прапорців
elements.board.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  const target = event.target.closest('.cell');
  if (!target) return;
  const r = parseInt(target.dataset.row, 10);
  const c = parseInt(target.dataset.col, 10);
  toggleFlag(r, c);
});

// Подія рестарту гри при кліку на кнопку зі смайликом
elements.resetBtn.addEventListener('click', () => {
  initGame();
});

// Автоматичний ініціалізаційний запуск після завантаження DOM
document.addEventListener('DOMContentLoaded', () => {
  initGame();
});