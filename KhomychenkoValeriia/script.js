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

const elements = {
  board: document.getElementById('board'),
  timerDisplay: document.getElementById('timer-display'),
  minesDisplay: document.getElementById('mines-display'),
  resetBtn: document.getElementById('reset-btn'),
  faceIcon: document.getElementById('face-icon'),
  statusTip: document.getElementById('status-tip'),
};

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

function stopTimer() {
  if (gameState.timerId) {
    clearInterval(gameState.timerId);
    gameState.timerId = null;
  }
}

function updateTimerDisplay() {
  elements.timerDisplay.textContent = String(gameState.gameTime).padStart(3, '0');
}

function updateMinesDisplay() {
  const remaining = gameState.minesCount - gameState.flagsPlaced;
  elements.minesDisplay.textContent = String(remaining).padStart(3, '0');
}


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

elements.board.addEventListener('click', (event) => {
  const target = event.target.closest('.cell');
  if (!target) return;
  const r = parseInt(target.dataset.row, 10);
  const c = parseInt(target.dataset.col, 10);
  openCell(r, c);
});

elements.board.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  const target = event.target.closest('.cell');
  if (!target) return;
  const r = parseInt(target.dataset.row, 10);
  const c = parseInt(target.dataset.col, 10);
  toggleFlag(r, c);
});

elements.resetBtn.addEventListener('click', () => {
  initGame();
});

document.addEventListener('DOMContentLoaded', () => {
  initGame();
});