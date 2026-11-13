const gameState = {
  rows: 8,
  cols: 8,
  minesCount: 10,
  status: 'process',
  gameTime: 0,
  timerId: null,
};

let board = [];
let explodedCell = null;

/**
 * Generates a game board and randomly places mines.
 * @param {number} rows - Number of rows.
 * @param {number} cols - Number of columns.
 * @param {number} minesCount - Number of mines.
 * @returns {Array<Array<Object>>} Generated game board.
 */
function generateField(rows, cols, minesCount) {
  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      type: 'empty',
      neighborMines: 0,
      state: 'closed',
    })),
  );

  let minesPlaced = 0;

  while (minesPlaced < minesCount) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);

    if (grid[row][col].type === 'mine') continue;

    grid[row][col].type = 'mine';
    minesPlaced++;
  }

  return grid;
}

/**
 * Gets all valid neighboring cell coordinates.
 * @param {number} row - Cell row index.
 * @param {number} col - Cell column index.
 * @returns {Array<{row: number, col: number}>} Adjacent cells.
 */
function getAdjacentCells(row, col) {
  const adjacent = [];

  for (let dRow = -1; dRow <= 1; dRow++) {
    for (let dCol = -1; dCol <= 1; dCol++) {
      const nRow = row + dRow;
      const nCol = col + dCol;
      const isCenter = dRow === 0 && dCol === 0;
      const isOnBoard =
        nRow >= 0 &&
        nRow < gameState.rows &&
        nCol >= 0 &&
        nCol < gameState.cols;

      if (!isCenter && isOnBoard) {
        adjacent.push({ row: nRow, col: nCol });
      }
    }
  }

  return adjacent;
}

/**
 * Counts neighboring mines for every empty cell.
 * @param {Array<Array<Object>>} grid - Game board.
 * @returns {void}
 */
function countNeighbourMines(grid) {
  grid.forEach((rowCells, row) => {
    rowCells.forEach((cell, col) => {
      if (cell.type !== 'empty') return;

      cell.neighborMines = getAdjacentCells(row, col).filter(
        (pos) => grid[pos.row][pos.col].type === 'mine',
      ).length;
    });
  });
}

/**
 * Reveals a cell and recursively reveals empty neighboring cells.
 * @param {number} row - Cell row index.
 * @param {number} col - Cell column index.
 * @returns {void}
 */
function revealCells(row, col) {
  const cell = board[row][col];

  if (cell.state !== 'closed') return;

  cell.state = 'opened';

  if (cell.neighborMines === 0) {
    getAdjacentCells(row, col).forEach((pos) => revealCells(pos.row, pos.col));
  }
}

/**
 * Opens a cell and checks for mines or victory.
 * @param {number} row - Cell row index.
 * @param {number} col - Cell column index.
 * @returns {void}
 */
function openCell(row, col) {
  if (gameState.status !== 'process') return;

  const cell = board[row][col];

  if (cell.state === 'opened' || cell.state === 'flagged') return;

  if (cell.type === 'mine') {
    explodedCell = { row, col };
    endGame('lose');
    return;
  }

  revealCells(row, col);

  if (isVictory()) endGame('win');
}

/**
 * Toggles a flag on a closed cell.
 * @param {number} row - Cell row index.
 * @param {number} col - Cell column index.
 * @returns {void}
 */
function toggleFlag(row, col) {
  if (gameState.status !== 'process') return;

  const cell = board[row][col];

  if (cell.state === 'opened') return;
  if (cell.state === 'closed' && getRemainingFlags() === 0) return;

  cell.state = cell.state === 'flagged' ? 'closed' : 'flagged';
}

/**
 * Calculates the number of remaining flags.
 * @returns {number} Remaining flags.
 */
function getRemainingFlags() {
  const flagged = board
    .flat()
    .filter((cell) => cell.state === 'flagged').length;

  return gameState.minesCount - flagged;
}

/**
 * Starts the game timer.
 * @param {Function} onTick - Callback executed every second.
 * @returns {void}
 */
function runTimer(onTick) {
  gameState.timerId = setInterval(() => {
    gameState.gameTime++;
    onTick();
  }, 1000);
}

/**
 * Stops the game timer.
 * @returns {void}
 */
function haltTimer() {
  clearInterval(gameState.timerId);
  gameState.timerId = null;
}

/**
 * Checks whether all non-mine cells have been opened.
 * @returns {boolean} True if the player has won.
 */
function isVictory() {
  return board
    .flat()
    .every((cell) => cell.type === 'mine' || cell.state === 'opened');
}

/**
 * Ends the game and stops the timer.
 * @param {'win' | 'lose'} result - Game result.
 * @returns {void}
 */
function endGame(result) {
  gameState.status = result;
  haltTimer();
}

/**
 * Resets the game state and generates a new board.
 * @returns {void}
 */
function resetGame() {
  haltTimer();

  gameState.status = 'process';
  gameState.gameTime = 0;
  explodedCell = null;

  board = generateField(gameState.rows, gameState.cols, gameState.minesCount);

  countNeighbourMines(board);
}

const boardNode = document.querySelector('.board');
const flagsNode = document.getElementById('flags-counter');
const timerNode = document.getElementById('timer');
const overlayNode = document.getElementById('overlay');
const overlayTextNode = document.getElementById('overlay-message');
const playAgainBtn = document.getElementById('overlay-restart');
const restartBtn = document.querySelector('.restart-btn');

const RESULT_TEXT = {
  process: '',
  win: 'Перемога!',
  lose: 'Ви підірвалися на міні!',
};

/**
 * Formats a counter as a three-digit string.
 * @param {number} value - Counter value.
 * @returns {string} Formatted counter.
 */
function padCounter(value) {
  return String(value).padStart(3, '0');
}

/**
 * Creates a button representing a game cell.
 * @param {Object} cell - Cell data.
 * @param {number} row - Cell row index.
 * @param {number} col - Cell column index.
 * @returns {HTMLButtonElement} Created cell button.
 */
function buildCell(cell, row, col) {
  const cellBtn = document.createElement('button');

  cellBtn.className = 'cell';
  cellBtn.type = 'button';
  cellBtn.dataset.row = row;
  cellBtn.dataset.col = col;

  if (cell.state === 'opened') {
    cellBtn.dataset.state = 'opened';

    if (cell.neighborMines > 0) {
      cellBtn.dataset.count = cell.neighborMines;
      cellBtn.textContent = cell.neighborMines;
    }
  } else if (cell.state === 'flagged') {
    cellBtn.dataset.state = 'flagged';
  } else if (gameState.status === 'lose' && cell.type === 'mine') {
    const isExploded =
      explodedCell && explodedCell.row === row && explodedCell.col === col;

    cellBtn.dataset.state = isExploded ? 'mine-exploded' : 'mine';
  } else {
    cellBtn.dataset.state = 'closed';
  }

  const cellDescription =
    cellBtn.dataset.state === 'opened'
      ? `відкрито, кількість сусідніх мін: ${cell.neighborMines}`
      : cellBtn.dataset.state === 'flagged'
        ? 'позначено прапорцем'
        : cellBtn.dataset.state === 'closed'
          ? 'закрита'
          : cellBtn.dataset.state === 'mine-exploded'
            ? 'міна, вибух'
            : 'міна';

  cellBtn.setAttribute(
    'aria-label',
    `Рядок ${row + 1}, стовпець ${col + 1}, ${cellDescription}`,
  );

  return cellBtn;
}

/**
 * Draws the game board using the current board state.
 * @returns {void}
 */
function drawBoard() {
  boardNode.replaceChildren(
    ...board.map((rowCells, row) => {
      const rowNode = document.createElement('div');
      rowNode.className = 'board-row';

      rowNode.append(...rowCells.map((cell, col) => buildCell(cell, row, col)));

      return rowNode;
    }),
  );
}

/**
 * Updates the displayed game timer.
 * @returns {void}
 */
function drawTimer() {
  timerNode.textContent = padCounter(gameState.gameTime);
}

/**
 * Updates the interface and restores keyboard focus.
 * Focus moves to the replay button when the game ends.
 * Otherwise, focus remains on the previously active cell.
 * @returns {void}
 */
function updateUI() {
  const activeElement = document.activeElement;
  const isCellFocused = activeElement?.classList.contains('cell') ?? false;

  const focusedRow = isCellFocused ? activeElement.dataset.row : null;
  const focusedCol = isCellFocused ? activeElement.dataset.col : null;

  drawBoard();

  flagsNode.textContent = padCounter(getRemainingFlags());
  drawTimer();

  overlayNode.hidden = gameState.status === 'process';
  overlayNode.dataset.status = gameState.status;
  overlayTextNode.textContent = RESULT_TEXT[gameState.status];

  if (gameState.status !== 'process') {
    playAgainBtn.focus();
  } else if (isCellFocused) {
    const newActiveCell = boardNode.querySelector(
      `[data-row="${focusedRow}"][data-col="${focusedCol}"]`,
    );

    newActiveCell?.focus();
  }
}

/**
 * Starts a new game and initializes the interface and timer.
 * @returns {void}
 */
function startGame() {
  resetGame();
  runTimer(drawTimer);
  updateUI();
}

/**
 * Reads row and column coordinates from a cell click event.
 * @param {MouseEvent} event - Click event.
 * @returns {{row: number, col: number} | null} Cell coordinates or null.
 */
function readCellCoords(event) {
  const cellBtn = event.target.closest('.cell');

  if (!cellBtn) return null;

  return {
    row: Number(cellBtn.dataset.row),
    col: Number(cellBtn.dataset.col),
  };
}

boardNode.addEventListener('click', (event) => {
  const coords = readCellCoords(event);

  if (!coords) return;

  openCell(coords.row, coords.col);
  updateUI();
});

boardNode.addEventListener('contextmenu', (event) => {
  event.preventDefault();

  const coords = readCellCoords(event);

  if (!coords) return;

  toggleFlag(coords.row, coords.col);
  updateUI();
});

restartBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', startGame);

startGame();
