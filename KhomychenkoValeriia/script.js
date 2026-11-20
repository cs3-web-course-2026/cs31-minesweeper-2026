const GAME_STATUS = {
  PROCESS: 'process',
  WIN: 'win',
  LOSE: 'lose',
};

const CELL_STATE = {
  CLOSED: 'closed',
  OPENED: 'opened',
  FLAGGED: 'flagged',
};

const CELL_TYPE = {
  EMPTY: 'empty',
  MINE: 'mine',
};

const gameState = {
  rows: 10,
  cols: 10,
  minesCount: 15,
  status: GAME_STATUS.PROCESS,
  gameTime: 0,
  timerId: null,
  flagsPlaced: 0,
  isFirstClick: true,
};

let board = [];

const elements = {
  board: document.getElementById('board'),
  timerDisplay: document.getElementById('timer-display'),
  minesDisplay: document.getElementById('mines-display'),
  resetBtn: document.getElementById('reset-btn'),
  faceIcon: document.getElementById('face-icon'),
  statusTip: document.getElementById('status-tip'),
};

function createEmptyBoard(rows, cols) {
  const newBoard = [];
  for (let row = 0; row < rows; row += 1) {
    const rowCells = [];
    for (let col = 0; col < cols; col += 1) {
      rowCells.push({
        row,
        col,
        type: CELL_TYPE.EMPTY,
        state: CELL_STATE.CLOSED,
        neighborMines: 0,
        isExploded: false,
      });
    }
    newBoard.push(rowCells);
  }
  return newBoard;
}

function getNeighbors(row, col, maxRows, maxCols) {
  const neighbors = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const neighbourRow = row + dr;
      const neighbourCol = col + dc;
      if (neighbourRow >= 0 && neighbourRow < maxRows && neighbourCol >= 0 && neighbourCol < maxCols) {
        neighbors.push([neighbourRow, neighbourCol]);
      }
    }
  }
  return neighbors;
}

function countNeighbourMines(targetBoard, rows, cols) {
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (targetBoard[row][col].type === CELL_TYPE.MINE) continue;

      let count = 0;
      const neighbors = getNeighbors(row, col, rows, cols);
      neighbors.forEach(([neighbourRow, neighbourCol]) => {
        if (targetBoard[neighbourRow][neighbourCol].type === CELL_TYPE.MINE) {
          count += 1;
        }
      });
      targetBoard[row][col].neighborMines = count;
    }
  }
}

function generateField(rows, cols, minesCount) {
  const newBoard = createEmptyBoard(rows, cols);
  let placed = 0;
  while (placed < minesCount) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);
    if (newBoard[row][col].type !== CELL_TYPE.MINE) {
      newBoard[row][col].type = CELL_TYPE.MINE;
      placed += 1;
    }
  }
  countNeighbourMines(newBoard, rows, cols);
  return newBoard;
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

function checkWinCondition() {
  let openedSafeCount = 0;
  const totalSafeCells = gameState.rows * gameState.cols - gameState.minesCount;

  for (let row = 0; row < gameState.rows; row += 1) {
    for (let col = 0; col < gameState.cols; col += 1) {
      const cell = board[row][col];
      if (cell.type === CELL_TYPE.EMPTY && cell.state === CELL_STATE.OPENED) {
        openedSafeCount += 1;
      }
    }
  }

  if (openedSafeCount === totalSafeCells) {
    gameState.status = GAME_STATUS.WIN;
    stopTimer();
    elements.faceIcon.textContent = '😎';
    elements.statusTip.textContent = 'Перемога! Ви розмінували все поле!';
  }
}

function handleGameOver(explodedRow, explodedCol) {
  gameState.status = GAME_STATUS.LOSE;
  stopTimer();
  elements.faceIcon.textContent = '😵';
  elements.statusTip.textContent = 'Гру закінчено! Ви натрапили на міну.';

  for (let row = 0; row < gameState.rows; row += 1) {
    for (let col = 0; col < gameState.cols; col += 1) {
      const cell = board[row][col];
      if (cell.type === CELL_TYPE.MINE) {
        cell.state = CELL_STATE.OPENED;
        if (row === explodedRow && col === explodedCol) {
          cell.isExploded = true;
        }
      }
    }
  }
}

function openCell(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) return;

  if (row < 0 || row >= gameState.rows || col < 0 || col >= gameState.cols) return;

  let cell = board[row][col];
  if (cell.state === CELL_STATE.OPENED || cell.state === CELL_STATE.FLAGGED) return;

  if (gameState.isFirstClick) {
    gameState.isFirstClick = false;
    startTimer();
    while (board[row][col].type === CELL_TYPE.MINE || board[row][col].neighborMines > 0) {
      board = generateField(gameState.rows, gameState.cols, gameState.minesCount);
      gameState.flagsPlaced = 0;
      updateMinesDisplay();
    }
    cell = board[row][col];
  }

  if (cell.type === CELL_TYPE.MINE) {
    handleGameOver(row, col);
  } else {
    cell.state = CELL_STATE.OPENED;
    if (cell.neighborMines === 0) {
      const neighbors = getNeighbors(row, col, gameState.rows, gameState.cols);
      neighbors.forEach(([neighbourRow, neighbourCol]) => {
        if (board[neighbourRow][neighbourCol].state === CELL_STATE.CLOSED) {
          openCell(neighbourRow, neighbourCol);
        }
      });
    }
    checkWinCondition();
  }

  renderBoard();
}

function toggleFlag(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) return;

  const cell = board[row][col];
  if (cell.state === CELL_STATE.OPENED) return;

  if (cell.state === CELL_STATE.CLOSED) {
    cell.state = CELL_STATE.FLAGGED;
    gameState.flagsPlaced += 1;
  } else if (cell.state === CELL_STATE.FLAGGED) {
    cell.state = CELL_STATE.CLOSED;
    gameState.flagsPlaced -= 1;
  }

  updateMinesDisplay();
  renderBoard();
}

function renderBoard() {
  const activeElement = document.activeElement;
  let focusedCoords = null;

  if (activeElement && activeElement.classList.contains('cell')) {
    focusedCoords = {
      row: activeElement.dataset.row,
      col: activeElement.dataset.col,
    };
  }

  elements.board.innerHTML = '';
  elements.board.style.gridTemplateColumns = `repeat(${gameState.cols}, var(--cell-size))`;
  elements.board.style.gridTemplateRows = `repeat(${gameState.rows}, var(--cell-size))`;

  const fragment = document.createDocumentFragment();
  let focusedButtonRef = null;

  for (let row = 0; row < gameState.rows; row += 1) {
    for (let col = 0; col < gameState.cols; col += 1) {
      const cellData = board[row][col];
      const cellNode = document.createElement('button');
      cellNode.type = 'button';
      cellNode.classList.add('cell');
      cellNode.dataset.row = String(row);
      cellNode.dataset.col = String(col);

      if (cellData.state === CELL_STATE.CLOSED) {
        cellNode.classList.add('closed');
        cellNode.setAttribute('aria-label', `Клітинка ${row + 1}, ${col + 1} закрита`);
      } else if (cellData.state === CELL_STATE.FLAGGED) {
        cellNode.classList.add('closed', 'flagged');
        cellNode.textContent = '🚩';
        cellNode.setAttribute('aria-label', `Прапорець на клітинці ${row + 1}, ${col + 1}`);
      } else if (cellData.state === CELL_STATE.OPENED) {
        cellNode.classList.add('open');
        if (cellData.type === CELL_TYPE.MINE) {
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

      if (focusedCoords && focusedCoords.row === String(row) && focusedCoords.col === String(col)) {
        focusedButtonRef = cellNode;
      }

      fragment.appendChild(cellNode);
    }
  }

  elements.board.appendChild(fragment);

  if (focusedButtonRef) {
    focusedButtonRef.focus();
  }
}

function initGame() {
  stopTimer();
  gameState.rows = 10;
  gameState.cols = 10;
  gameState.minesCount = 15;
  gameState.status = GAME_STATUS.PROCESS;
  gameState.gameTime = 0;
  gameState.flagsPlaced = 0;
  gameState.isFirstClick = true;
  board = generateField(gameState.rows, gameState.cols, gameState.minesCount);

  elements.faceIcon.textContent = '🙂';
  elements.statusTip.textContent = 'Клікніть будь-яку клітинку для початку гри';
  updateTimerDisplay();
  updateMinesDisplay();
  renderBoard();
}

elements.board.addEventListener('click', (event) => {
  const target = event.target.closest('.cell');
  if (!target) return;
  const row = parseInt(target.dataset.row, 10);
  const col = parseInt(target.dataset.col, 10);
  openCell(row, col);
});

elements.board.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  const target = event.target.closest('.cell');
  if (!target) return;
  const row = parseInt(target.dataset.row, 10);
  const col = parseInt(target.dataset.col, 10);
  toggleFlag(row, col);
});

elements.resetBtn.addEventListener('click', () => {
  initGame();
});

document.addEventListener('DOMContentLoaded', () => {
  initGame();
});
