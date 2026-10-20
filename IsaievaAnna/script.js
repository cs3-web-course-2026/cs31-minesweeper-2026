const CELL_TYPE = {
  EMPTY: 'empty',
  MINE: 'mine',
};

const CELL_STATE = {
  CLOSED: 'closed',
  OPENED: 'opened',
  FLAGGED: 'flagged',
};

const GAME_STATUS = {
  PROCESS: 'process',
  WIN: 'win',
  LOSE: 'lose',
};

const gameState = {
  rows: 9,
  cols: 9,
  minesCount: 10,
  status: GAME_STATUS.PROCESS,
  gameTime: 0,
  timerId: null,
};

let board = [];

const elements = {
  board: document.querySelector('.game-board'),
  timer: document.querySelector('.timer-value'),
  flags: document.querySelector('.flags-value'),
  message: document.querySelector('.game-message'),
  restartButton: document.querySelector('.restart-button'),
};


function generateField(rows, cols, minesCount) {
  if (
    !Number.isInteger(rows) ||
    !Number.isInteger(cols) ||
    !Number.isInteger(minesCount) ||
    rows <= 0 ||
    cols <= 0 ||
    minesCount < 0 ||
    minesCount >= rows * cols
  ) {
    throw new RangeError('Invalid field dimensions or mine count.');
  }

  const field = [];

  for (let row = 0; row < rows; row++) {
    const fieldRow = [];

    for (let col = 0; col < cols; col++) {
      fieldRow.push({
        type: CELL_TYPE.EMPTY,
        neighborMines: 0,
        state: CELL_STATE.CLOSED,
      });
    }

    field.push(fieldRow);
  }

  let placedMines = 0;

  while (placedMines < minesCount) {
    const randomRow = Math.floor(Math.random() * rows);
    const randomCol = Math.floor(Math.random() * cols);

    if (field[randomRow][randomCol].type === CELL_TYPE.MINE) {
      continue;
    }

    field[randomRow][randomCol].type = CELL_TYPE.MINE;
    placedMines++;
  }

  return field;
}


function countNeighbourMines(field) {
  for (let row = 0; row < field.length; row++) {
    for (let col = 0; col < field[row].length; col++) {
      const cell = field[row][col];

      if (cell.type === CELL_TYPE.MINE) {
        continue;
      }

      let mineCount = 0;

      for (let directionalRow = -1; directionalRow <= 1; directionalRow++) {
        for (let directionalCol = -1; directionalCol <= 1; directionalCol++) {
          if (directionalRow === 0 && directionalCol === 0) {
            continue;
          }

          const neighbourRow = row + directionalRow;
          const neighbourCol = col + directionalCol;

          const isInsideField =
            neighbourRow >= 0 &&
            neighbourRow < field.length &&
            neighbourCol >= 0 &&
            neighbourCol < field[neighbourRow].length;

          if (isInsideField && field[neighbourRow][neighbourCol].type === CELL_TYPE.MINE) {
            mineCount++;
          }
        }
      }

      cell.neighborMines = mineCount;
    }
  }
}


function openCell(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) {
    return;
  }

  revealCell(row, col, board);

  if (gameState.status === GAME_STATUS.PROCESS && checkWinCondition(board)) {
    gameState.status = GAME_STATUS.WIN;
    stopTimer();
  }
}


function revealCell(row, col, field) {
  if (
    row < 0 ||
    row >= field.length ||
    col < 0 ||
    col >= field[row].length
  ) {
    return;
  }

  const cell = field[row][col];

  if (cell.state !== CELL_STATE.CLOSED) {
    return;
  }

  cell.state = CELL_STATE.OPENED;

  if (cell.type === CELL_TYPE.MINE) {
    gameState.status = GAME_STATUS.LOSE;
    stopTimer();
    return;
  }

  if (cell.neighborMines !== 0) {
    return;
  }

  for (let directionalRow = -1; directionalRow <= 1; directionalRow++) {
    for (let directionalCol = -1; directionalCol <= 1; directionalCol++) {
      if (directionalRow === 0 && directionalCol === 0) {
        continue;
      }

      const neighbourRow = row + directionalRow;
      const neighbourCol = col + directionalCol;

      revealCell(neighbourRow, neighbourCol, field);
    }
  }
}


function checkWinCondition(field) {
  for (let row = 0; row < field.length; row++) {
    for (let col = 0; col < field[row].length; col++) {
      const cell = field[row][col];

      if (
        cell.type === CELL_TYPE.EMPTY &&
        cell.state !== CELL_STATE.OPENED
      ) {
        return false;
      }
    }
  }

  return true;
}


function toggleFlag(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) {
    return;
  }

  if (
    row < 0 ||
    row >= gameState.rows ||
    col < 0 ||
    col >= gameState.cols
  ) {
    return;
  }

  const cell = board[row][col];

  if (cell.state === CELL_STATE.OPENED) {
    return;
  }

  if (cell.state === CELL_STATE.FLAGGED) {
    cell.state = CELL_STATE.CLOSED;
    return;
  }

  const flaggedCells = countFlags(board);

  if (flaggedCells >= gameState.minesCount) {
    return;
  }

  cell.state = CELL_STATE.FLAGGED;
}


function countFlags(field) {
  let flaggedCells = 0;

  for (let row = 0; row < field.length; row++) {
    for (let col = 0; col < field[row].length; col++) {
      if (field[row][col].state === CELL_STATE.FLAGGED) {
        flaggedCells++;
      }
    }
  }
  return flaggedCells;
}


function stopTimer() {
  if (gameState.timerId !== null) {
    clearInterval(gameState.timerId);
    gameState.timerId = null;
  }
}


function initializeGame() {
  stopTimer();

  gameState.status = GAME_STATUS.PROCESS;
  gameState.gameTime = 0;

  board = generateField(
    gameState.rows,
    gameState.cols,
    gameState.minesCount
  );

  countNeighbourMines(board);
}


function startTimer() {
  if (
    gameState.status !== GAME_STATUS.PROCESS ||
    gameState.timerId !== null
  ) {
    return;
  }

  gameState.timerId = setInterval(() => {
    if (gameState.status !== GAME_STATUS.PROCESS) {
      stopTimer();
      return;
    }

    gameState.gameTime++;
    updateTimerDisplay();
  }, 1000);
}


function updateTimerDisplay() {
  if (elements.timer === null) {
    return;
  }

  elements.timer.textContent = String(gameState.gameTime).padStart(3, '0');
}


function updateFlagsDisplay() {
  if (elements.flags === null) {
    return;
  }

  const remainingFlags = gameState.minesCount - countFlags(board);

  elements.flags.textContent = String(remainingFlags);
}


function renderBoard() {
  if (elements.board === null) {
    return;
  }

  elements.board.replaceChildren();

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const cell = board[row][col];
      const cellButton = document.createElement('button');

      cellButton.type = 'button';
      cellButton.classList.add('cell');
      cellButton.dataset.row = String(row);
      cellButton.dataset.col = String(col);

      if (cell.state === CELL_STATE.FLAGGED) {
        cellButton.classList.add('cell-flagged');

        if (
        gameState.status === GAME_STATUS.LOSE &&
        cell.type === CELL_TYPE.MINE
        ) {
        cellButton.classList.add('cell-mine');
        }

        cellButton.textContent = '⚑';
        cellButton.setAttribute('aria-label', 'Клітинка з прапорцем');

      } else if (
        cell.state === CELL_STATE.OPENED ||
        (gameState.status === GAME_STATUS.LOSE && cell.type === CELL_TYPE.MINE)
      ) {
        cellButton.classList.add('cell-open');

        if (cell.type === CELL_TYPE.MINE) {
          cellButton.classList.add('cell-mine');

          if (cell.state === CELL_STATE.OPENED) {
            cellButton.classList.add('cell-mine-hit');
          }

          cellButton.textContent = '💣';
          cellButton.setAttribute('aria-label', 'Міна');

        } else if (cell.neighborMines > 0) {
          cellButton.classList.add(`cell-number-${cell.neighborMines}`);
          cellButton.textContent = String(cell.neighborMines);
          cellButton.setAttribute(
            'aria-label',
            `Сусідніх мін: ${cell.neighborMines}`
          );
        } else {
          cellButton.setAttribute('aria-label', 'Порожня клітинка');
        }
      } else {
        cellButton.classList.add('cell-closed');
        cellButton.setAttribute('aria-label', 'Закрита клітинка');
      }

      elements.board.appendChild(cellButton);
    }
  }
}


function restoreCellFocus(row, col) {
  if (elements.board === null) {
    return;
  }

  const updatedCell = elements.board.querySelector(
    `.cell[data-row="${row}"][data-col="${col}"]`
  );

  updatedCell?.focus();
}


function handleBoardClick(event) {
  const cellButton = event.target.closest('.cell');

  if (cellButton === null) {
    return;
  }

  const row = Number(cellButton.dataset.row);
  const col = Number(cellButton.dataset.col);

  if (
    gameState.status !== GAME_STATUS.PROCESS ||
    board[row][col].state !== CELL_STATE.CLOSED
  ) {
    return;
  }

  const wasFocused = document.activeElement === cellButton;

  startTimer();
  openCell(row, col);
  renderBoard();
  updateTimerDisplay();
  updateGameMessage();

  if (wasFocused) {
    restoreCellFocus(row, col);
  }
}


function handleBoardRightClick(event) {
  event.preventDefault();

  const cellButton = event.target.closest('.cell');

  if (cellButton === null) {
    return;
  }

  const row = Number(cellButton.dataset.row);
  const col = Number(cellButton.dataset.col);
  const wasFocused = document.activeElement === cellButton;

  toggleFlag(row, col);
  renderBoard();
  updateFlagsDisplay();

  if (wasFocused) {
    restoreCellFocus(row, col);
  }
}


function handleRestartClick() {
  initializeGame();
  renderBoard();
  updateFlagsDisplay();
  updateTimerDisplay();
  updateGameMessage();
}


function updateGameMessage() {
  if (elements.message === null) {
    return;
  }

  if (gameState.status === GAME_STATUS.WIN) {
    elements.message.textContent = 'Перемога! 🏆';
  } else if (gameState.status === GAME_STATUS.LOSE) {
    elements.message.textContent = 'Гру завершено! 💣';
  } else {
    elements.message.textContent = '';
  }
}

initializeGame();
renderBoard();
updateFlagsDisplay();
updateGameMessage();

elements.board.addEventListener('click', handleBoardClick);
elements.board.addEventListener('contextmenu', handleBoardRightClick);

elements.restartButton.addEventListener('click', handleRestartClick);