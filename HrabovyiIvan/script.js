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

const GAME_CONFIG = {
  ROWS: 10,
  COLS: 10,
  MINES_COUNT: 15,
  TIMER_INTERVAL_MS: 1000,
  COUNTER_DIGITS: 3,
};

const NEIGHBOUR_DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

const CSS_CLASS = {
  CELL: 'cell',
  OPEN: 'open',
  FLAGGED: 'flagged',
  WRONG: 'wrong',
  MINE: 'mine',
  EXPLODED: 'exploded',
  NUMBER_PREFIX: 'n',
};

const CSS_VARIABLE = {
  BOARD_COLUMNS: '--board-columns',
};

const CELL_LABEL = {
  CLOSED: 'закрита',
  FLAGGED: 'прапорець',
  WRONG_FLAG: 'помилковий прапорець',
  MINE: 'міна',
  EXPLODED_MINE: 'міна, що вибухнула',
  OPENED_NO_MINES: 'відкрита, мін поруч немає',
  OPENED_WITH_MINES: 'відкрита, мін поруч',
};

const GAME_MESSAGE = {
  [GAME_STATUS.PROCESS]: '',
  [GAME_STATUS.WIN]: 'Перемога! Усі безпечні клітинки відкрито.',
  [GAME_STATUS.LOSE]: 'Поразка! Ви натрапили на міну.',
};

const boardElement = document.getElementById('board');
const flagCounterElement = document.getElementById('flag-counter');
const flagCounterValueElement =
  flagCounterElement.querySelector('.counter-value');
const timerElement = document.getElementById('timer');
const timerValueElement = timerElement.querySelector('.counter-value');
const startButtonElement = document.getElementById('start-btn');
const gameMessageElement = document.getElementById('game-message');

const gameState = {
  rows: GAME_CONFIG.ROWS,
  cols: GAME_CONFIG.COLS,
  minesCount: GAME_CONFIG.MINES_COUNT,
  status: GAME_STATUS.PROCESS,
  gameTime: 0,
  timerId: null,
};

let board = []; // 2D array of { type, state, neighborMines } cell objects

// ==================== Data layer helpers ====================

function createCell() {
  return {
    type: CELL_TYPE.EMPTY,
    state: CELL_STATE.CLOSED,
    neighborMines: 0,
  };
}

function createEmptyBoard(rows, cols) {
  const grid = [];

  for (let row = 0; row < rows; row++) {
    const rowCells = [];

    for (let col = 0; col < cols; col++) {
      rowCells.push(createCell());
    }

    grid.push(rowCells);
  }

  return grid;
}

function isInBounds(grid, row, col) {
  return row >= 0 && row < grid.length && col >= 0 && col < grid[row].length;
}

function getNeighbourPositions(grid, row, col) {
  const positions = [];

  for (const [directionalRow, directionalCol] of NEIGHBOUR_DIRECTIONS) {
    const neighbourRow = row + directionalRow;
    const neighbourCol = col + directionalCol;

    if (isInBounds(grid, neighbourRow, neighbourCol)) {
      positions.push({ row: neighbourRow, col: neighbourCol });
    }
  }

  return positions;
}

function placeMines(grid, minesCount) {
  const rows = grid.length;
  const cols = grid[0].length;
  const minesToPlace = Math.min(minesCount, rows * cols);
  let placedMines = 0;

  while (placedMines < minesToPlace) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);

    if (grid[row][col].type === CELL_TYPE.EMPTY) {
      grid[row][col].type = CELL_TYPE.MINE;
      placedMines++;
    }
  }
}

function countCellsByState(grid, state) {
  return grid.flat().filter((cell) => cell.state === state).length;
}

function countRemainingFlags(grid, minesCount) {
  return minesCount - countCellsByState(grid, CELL_STATE.FLAGGED);
}

function hasOpenedAllSafeCells(grid) {
  return grid
    .flat()
    .every(
      (cell) =>
        cell.type === CELL_TYPE.MINE || cell.state === CELL_STATE.OPENED,
    );
}

// ==================== Core game logic ====================

function countNeighbourMines(grid) {
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const cell = grid[row][col];

      if (cell.type === CELL_TYPE.MINE) {
        continue;
      }

      cell.neighborMines = getNeighbourPositions(grid, row, col).filter(
        ({ row: neighbourRow, col: neighbourCol }) =>
          grid[neighbourRow][neighbourCol].type === CELL_TYPE.MINE,
      ).length;
    }
  }
}

function generateField(rows, cols, minesCount) {
  const grid = createEmptyBoard(rows, cols);

  placeMines(grid, minesCount);
  countNeighbourMines(grid);

  return grid;
}

// Returns true when the opened cell is a mine. Empty regions open recursively.
function revealCell(grid, row, col) {
  const cell = grid[row][col];

  if (cell.state !== CELL_STATE.CLOSED) {
    return false;
  }

  cell.state = CELL_STATE.OPENED;

  if (cell.type === CELL_TYPE.MINE) {
    return true;
  }

  if (cell.neighborMines === 0) {
    for (const neighbour of getNeighbourPositions(grid, row, col)) {
      revealCell(grid, neighbour.row, neighbour.col);
    }
  }

  return false;
}

function revealMines(grid) {
  for (const cell of grid.flat()) {
    if (cell.type === CELL_TYPE.MINE && cell.state === CELL_STATE.CLOSED) {
      cell.state = CELL_STATE.OPENED;
    }
  }
}

function flagMines(grid) {
  for (const cell of grid.flat()) {
    if (cell.type === CELL_TYPE.MINE) {
      cell.state = CELL_STATE.FLAGGED;
    }
  }
}

function startTimer() {
  if (gameState.timerId !== null) {
    return;
  }

  gameState.timerId = setInterval(() => {
    gameState.gameTime++;
    renderStatusBar();
  }, GAME_CONFIG.TIMER_INTERVAL_MS);
}

function stopTimer() {
  clearInterval(gameState.timerId);
  gameState.timerId = null;
}

function finishGame(status) {
  gameState.status = status;
  stopTimer();

  if (status === GAME_STATUS.LOSE) {
    revealMines(board);
  } else {
    flagMines(board);
  }
}

function openCell(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) {
    return;
  }

  const hitMine = revealCell(board, row, col);

  if (hitMine) {
    finishGame(GAME_STATUS.LOSE);

    return;
  }

  if (hasOpenedAllSafeCells(board)) {
    finishGame(GAME_STATUS.WIN);
  }
}

function toggleFlag(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) {
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

  if (countRemainingFlags(board, gameState.minesCount) > 0) {
    cell.state = CELL_STATE.FLAGGED;
  }
}

function resetGame() {
  stopTimer();

  gameState.status = GAME_STATUS.PROCESS;
  gameState.gameTime = 0;

  board = generateField(gameState.rows, gameState.cols, gameState.minesCount);
}

// ==================== Rendering (DOM) ====================

function formatCounter(value) {
  return String(value).padStart(GAME_CONFIG.COUNTER_DIGITS, '0');
}

function getCellClassNames(cell, isWrongFlag, isExploded) {
  const classNames = [CSS_CLASS.CELL];

  if (cell.state === CELL_STATE.OPENED) {
    classNames.push(CSS_CLASS.OPEN);

    if (cell.type === CELL_TYPE.MINE) {
      classNames.push(CSS_CLASS.MINE);
    } else if (cell.neighborMines > 0) {
      classNames.push(`${CSS_CLASS.NUMBER_PREFIX}${cell.neighborMines}`);
    }
  }

  if (cell.state === CELL_STATE.FLAGGED) {
    classNames.push(CSS_CLASS.FLAGGED);
  }

  if (isWrongFlag) {
    classNames.push(CSS_CLASS.WRONG);
  }

  if (isExploded) {
    classNames.push(CSS_CLASS.EXPLODED);
  }

  return classNames;
}

function getCellText(cell) {
  const isNumberedCell =
    cell.state === CELL_STATE.OPENED &&
    cell.type === CELL_TYPE.EMPTY &&
    cell.neighborMines > 0;

  return isNumberedCell ? String(cell.neighborMines) : '';
}

function getCellDescription(cell, isWrongFlag, isExploded) {
  if (isExploded) {
    return CELL_LABEL.EXPLODED_MINE;
  }

  if (isWrongFlag) {
    return CELL_LABEL.WRONG_FLAG;
  }

  if (cell.state === CELL_STATE.FLAGGED) {
    return CELL_LABEL.FLAGGED;
  }

  if (cell.state === CELL_STATE.CLOSED) {
    return CELL_LABEL.CLOSED;
  }

  if (cell.type === CELL_TYPE.MINE) {
    return CELL_LABEL.MINE;
  }

  if (cell.neighborMines === 0) {
    return CELL_LABEL.OPENED_NO_MINES;
  }

  return `${CELL_LABEL.OPENED_WITH_MINES}: ${cell.neighborMines}`;
}

function createCellButton(row, col) {
  const button = document.createElement('button');

  button.type = 'button';
  button.className = CSS_CLASS.CELL;
  button.dataset.row = row;
  button.dataset.col = col;

  return button;
}

function renderBoard() {
  const fragment = document.createDocumentFragment();

  for (let row = 0; row < gameState.rows; row++) {
    for (let col = 0; col < gameState.cols; col++) {
      fragment.append(createCellButton(row, col));
    }
  }

  boardElement.style.setProperty(CSS_VARIABLE.BOARD_COLUMNS, gameState.cols);
  boardElement.replaceChildren(fragment);
}

function updateCellButton(button, cell, row, col, explodedPosition) {
  const isExploded =
    explodedPosition !== null &&
    explodedPosition.row === row &&
    explodedPosition.col === col;
  const isWrongFlag =
    gameState.status === GAME_STATUS.LOSE &&
    cell.state === CELL_STATE.FLAGGED &&
    cell.type === CELL_TYPE.EMPTY;
  const description = getCellDescription(cell, isWrongFlag, isExploded);

  button.className = getCellClassNames(cell, isWrongFlag, isExploded).join(' ');
  button.textContent = getCellText(cell);
  button.setAttribute(
    'aria-label',
    `Рядок ${row + 1}, стовпець ${col + 1}, ${description}`,
  );
}

function updateBoard(explodedPosition) {
  for (let row = 0; row < gameState.rows; row++) {
    for (let col = 0; col < gameState.cols; col++) {
      const button = boardElement.children[row * gameState.cols + col];

      updateCellButton(button, board[row][col], row, col, explodedPosition);
    }
  }
}

function renderStatusBar() {
  const remainingFlags = countRemainingFlags(board, gameState.minesCount);

  flagCounterValueElement.textContent = formatCounter(remainingFlags);
  flagCounterElement.setAttribute(
    'aria-label',
    `Залишилось прапорців: ${remainingFlags}`,
  );

  timerValueElement.textContent = formatCounter(gameState.gameTime);
  timerElement.setAttribute('aria-label', `Час гри: ${gameState.gameTime} с`);
}

function renderGameMessage() {
  gameMessageElement.textContent = GAME_MESSAGE[gameState.status];
}

function renderGame(explodedPosition = null) {
  updateBoard(explodedPosition);
  renderStatusBar();
  renderGameMessage();
}

// ==================== Event handling ====================

function getCellPosition(target) {
  const cellButton = target.closest(`.${CSS_CLASS.CELL}`);

  if (cellButton === null) {
    return null;
  }

  return {
    row: Number(cellButton.dataset.row),
    col: Number(cellButton.dataset.col),
  };
}

function handleBoardClick(event) {
  const position = getCellPosition(event.target);

  if (position === null || gameState.status !== GAME_STATUS.PROCESS) {
    return;
  }

  startTimer();
  openCell(position.row, position.col);
  renderGame(gameState.status === GAME_STATUS.LOSE ? position : null);
}

function handleBoardContextMenu(event) {
  event.preventDefault();

  const position = getCellPosition(event.target);

  if (position === null || gameState.status !== GAME_STATUS.PROCESS) {
    return;
  }

  startTimer();
  toggleFlag(position.row, position.col);
  renderGame();
}

function startNewGame() {
  resetGame();
  renderBoard();
  renderGame();
}

boardElement.addEventListener('click', handleBoardClick);
boardElement.addEventListener('contextmenu', handleBoardContextMenu);
startButtonElement.addEventListener('click', startNewGame);

startNewGame();
