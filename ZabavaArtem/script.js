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

const DEFAULT_ROWS = 10;
const DEFAULT_COLS = 10;
const DEFAULT_MINES_COUNT = 15;
const SECONDS_IN_MINUTE = 60;
const DISPLAY_WIDTH = 3;
const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

const gameState = {
  rows: DEFAULT_ROWS,
  cols: DEFAULT_COLS,
  minesCount: DEFAULT_MINES_COUNT,
  status: GAME_STATUS.PROCESS,
  gameTime: 0,
  timerId: null,
};

let board = [];

const boardElement = document.querySelector('#board');
const mineCounterElement = document.querySelector('#mine-counter');
const timerElement = document.querySelector('#timer');
const gameMessageElement = document.querySelector('#game-message');
const newGameButton = document.querySelector('.new-game');

function createEmptyCell() {
  return {
    type: CELL_TYPE.EMPTY,
    state: CELL_STATE.CLOSED,
    neighborMines: 0,
  };
}


function isInBounds(row, col) {
  return (
    row >= 0 &&
    row < gameState.rows &&
    col >= 0 &&
    col < gameState.cols
  );
}


function getNeighbourCoordinates(row, col) {
  return DIRECTIONS.map(([directionalRow, directionalCol]) => [
    row + directionalRow,
    col + directionalCol,
  ]).filter(([neighbourRow, neighbourCol]) =>
    isInBounds(neighbourRow, neighbourCol),
  );
}


function generateField(rows, cols, minesCount) {
  const generatedBoard = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, createEmptyCell),
  );
  let placedMines = 0;

  while (placedMines < minesCount) {
    const mineRow = Math.floor(Math.random() * rows);
    const mineCol = Math.floor(Math.random() * cols);
    const cell = generatedBoard[mineRow][mineCol];

    if (cell.type === CELL_TYPE.MINE) {
      continue;
    }

    cell.type = CELL_TYPE.MINE;
    placedMines++;
  }

  return generatedBoard;
}


function countNeighbourMines(field) {
  field.forEach((rowCells, row) => {
    rowCells.forEach((cell, col) => {
      if (cell.type === CELL_TYPE.MINE) {
        return;
      }

      cell.neighborMines = getNeighbourCoordinates(row, col).reduce(
        (mineCount, [neighbourRow, neighbourCol]) =>
          mineCount +
          (field[neighbourRow][neighbourCol].type === CELL_TYPE.MINE ? 1 : 0),
        0,
      );
    });
  });
}


function startTimer() {
  if (gameState.timerId !== null) {
    return;
  }

  gameState.timerId = setInterval(() => {
    if (gameState.status !== GAME_STATUS.PROCESS) {
      stopTimer();
      return;
    }

    gameState.gameTime++;
    updateTimer();
  }, 1000);
}


function stopTimer() {
  clearInterval(gameState.timerId);
  gameState.timerId = null;
}


function openCellRecursively(row, col) {
  const cell = board[row][col];

  if (cell.state !== CELL_STATE.CLOSED) {
    return;
  }

  cell.state = CELL_STATE.OPENED;

  if (cell.neighborMines === 0) {
    getNeighbourCoordinates(row, col).forEach(
      ([neighbourRow, neighbourCol]) =>
        openCellRecursively(neighbourRow, neighbourCol),
    );
  }
}


function openCell(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS || !isInBounds(row, col)) {
    return;
  }

  const cell = board[row][col];

  if (cell.state !== CELL_STATE.CLOSED) {
    return;
  }

  startTimer();

  if (cell.type === CELL_TYPE.MINE) {
    gameState.status = GAME_STATUS.LOSE;
    revealMines(row, col);
    stopTimer();
    gameMessageElement.textContent = 'Game over. You opened a mine.';
    renderBoard();
    return;
  }

  openCellRecursively(row, col);

  if (checkWinCondition()) {
    gameState.status = GAME_STATUS.WIN;
    stopTimer();
    gameMessageElement.textContent = 'You won! All safe cells are open.';
  }

  renderBoard();
}


function getFlaggedCount() {
  return board.flat().filter(
    (cell) => cell.state === CELL_STATE.FLAGGED,
  ).length;
}


function toggleFlag(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS || !isInBounds(row, col)) {
    return;
  }

  const cell = board[row][col];

  if (cell.state === CELL_STATE.OPENED) {
    return;
  }

  if (
    cell.state === CELL_STATE.CLOSED &&
    getFlaggedCount() >= gameState.minesCount
  ) {
    return;
  }

  cell.state =
    cell.state === CELL_STATE.FLAGGED
      ? CELL_STATE.CLOSED
      : CELL_STATE.FLAGGED;
  updateMineCounter();
  renderBoard();
}


function checkWinCondition() {
  return board.every((rowCells) =>
    rowCells.every(
      (cell) =>
        cell.type === CELL_TYPE.MINE || cell.state === CELL_STATE.OPENED,
    ),
  );
}


function revealMines(explodedRow, explodedCol) {
  board.forEach((rowCells, row) => {
    rowCells.forEach((cell, col) => {
      if (cell.type === CELL_TYPE.MINE) {
        cell.state = CELL_STATE.OPENED;
        cell.isExploded = row === explodedRow && col === explodedCol;
      }
    });
  });
}


function getCellLabel(cell, row, col) {
  const position = `Row ${row + 1}, column ${col + 1}`;

  if (cell.state === CELL_STATE.FLAGGED) {
    return `${position}, flagged cell`;
  }

  if (cell.state === CELL_STATE.CLOSED) {
    return `${position}, closed cell`;
  }

  if (cell.type === CELL_TYPE.MINE) {
    return `${position}, mine`;
  }

  return cell.neighborMines === 0
    ? `${position}, open empty cell`
    : `${position}, open cell with ${cell.neighborMines} adjacent mines`;
}


function createCellButton(cell, row, col) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `cell ${cell.state}`;
  button.dataset.row = row;
  button.dataset.col = col;
  button.setAttribute('aria-label', getCellLabel(cell, row, col));

  if (cell.state === CELL_STATE.OPENED) {
    if (cell.type === CELL_TYPE.MINE) {
      button.classList.add('mine');
      button.textContent = '💣';

      if (cell.isExploded) {
        button.classList.add('exploded');
      }
    } else if (cell.neighborMines > 0) {
      button.classList.add(`number-${cell.neighborMines}`);
      button.textContent = cell.neighborMines;
    }
  }

  if (cell.state === CELL_STATE.FLAGGED) {
    const flagIcon = document.createElement('span');
    flagIcon.className = 'material-symbols-outlined';
    flagIcon.textContent = 'flag_2';
    flagIcon.setAttribute('aria-hidden', 'true');
    button.append(flagIcon);
  }

  button.addEventListener('click', () => openCell(row, col));
  button.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    toggleFlag(row, col);
  });

  return button;
}


function renderBoard() {
  const activeElement = document.activeElement;
  const hasActiveCell =
    activeElement && activeElement.classList.contains('cell');
  const activeRow = hasActiveCell ? activeElement.dataset.row : null;
  const activeCol = hasActiveCell ? activeElement.dataset.col : null;

  boardElement.replaceChildren();

  board.forEach((rowCells, row) => {
    rowCells.forEach((cell, col) => {
      boardElement.append(createCellButton(cell, row, col));
    });
  });

  if (activeRow !== null && activeCol !== null) {
    const cellButtons = boardElement.querySelectorAll('.cell');
    const activeCell = [...cellButtons].find(
      (button) =>
        button.dataset.row === activeRow && button.dataset.col === activeCol,
    );

    if (activeCell) {
      activeCell.focus();
    }
  }

  updateMineCounter();
  updateTimer();
}


function updateMineCounter() {
  const flaggedCount = getFlaggedCount();
  const remainingMines = gameState.minesCount - flaggedCount;
  const sign = remainingMines < 0 ? '-' : '';
  const digits = String(Math.abs(remainingMines)).padStart(
    DISPLAY_WIDTH - sign.length,
    '0',
  );

  mineCounterElement.textContent = `${sign}${digits}`;
}


function updateTimer() {
  const minutes = Math.floor(gameState.gameTime / SECONDS_IN_MINUTE);
  const seconds = gameState.gameTime % SECONDS_IN_MINUTE;
  const formattedTime = `${minutes}${String(seconds).padStart(2, '0')}`;

  timerElement.textContent = formattedTime.slice(-DISPLAY_WIDTH);
}


function resetGame() {
  stopTimer();
  gameState.status = GAME_STATUS.PROCESS;
  gameState.gameTime = 0;
  board = generateField(
    gameState.rows,
    gameState.cols,
    gameState.minesCount,
  );
  countNeighbourMines(board);
  gameMessageElement.textContent = 'Open a cell to start the game.';
  renderBoard();
}


newGameButton.addEventListener('click', resetGame);
resetGame();
