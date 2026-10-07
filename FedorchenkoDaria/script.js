const gameState = {
  rows: 8,
  cols: 8,
  minesCount: 10,
  status: 'process',
  gameTime: 0,
  timerId: null,
};

let minefield = [];
let explodedCell = null;

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
      if (!isCenter && isOnBoard) adjacent.push({ row: nRow, col: nCol });
    }
  }
  return adjacent;
}

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

function revealCells(row, col) {
  const cell = minefield[row][col];
  if (cell.state !== 'closed') return;

  cell.state = 'opened';

  if (cell.neighborMines === 0) {
    getAdjacentCells(row, col).forEach((pos) => revealCells(pos.row, pos.col));
  }
}

function openCell(row, col) {
  if (gameState.status !== 'process') return;

  const cell = minefield[row][col];
  if (cell.state === 'opened' || cell.state === 'flagged') return;

  if (cell.type === 'mine') {
    explodedCell = { row, col };
    endGame('lose');
    return;
  }

  revealCells(row, col);

  if (isVictory()) endGame('win');
}

function toggleFlag(row, col) {
  if (gameState.status !== 'process') return;

  const cell = minefield[row][col];
  if (cell.state === 'opened') return;
  if (cell.state === 'closed' && getRemainingFlags() === 0) return;

  cell.state = cell.state === 'flagged' ? 'closed' : 'flagged';
}

function getRemainingFlags() {
  const flagged = minefield
    .flat()
    .filter((cell) => cell.state === 'flagged').length;
  return gameState.minesCount - flagged;
}

function runTimer(onTick) {
  gameState.timerId = setInterval(() => {
    gameState.gameTime++;
    onTick();
  }, 1000);
}

function haltTimer() {
  clearInterval(gameState.timerId);
  gameState.timerId = null;
}

function isVictory() {
  return minefield
    .flat()
    .every((cell) => cell.type === 'mine' || cell.state === 'opened');
}

function endGame(result) {
  gameState.status = result;
  haltTimer();
}

function resetGame() {
  haltTimer();

  gameState.status = 'process';
  gameState.gameTime = 0;
  explodedCell = null;

  minefield = generateField(
    gameState.rows,
    gameState.cols,
    gameState.minesCount,
  );
  countNeighbourMines(minefield);
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

function padCounter(value) {
  return String(value).padStart(3, '0');
}

function buildCell(cell, row, col) {
  const cellBtn = document.createElement('button');
  cellBtn.className = 'cell';
  cellBtn.type = 'button';
  cellBtn.dataset.row = row;
  cellBtn.dataset.col = col;

  if (cell.state === 'opened') {
    cellBtn.dataset.state = 'open';
    if (cell.neighborMines > 0) {
      cellBtn.dataset.count = cell.neighborMines;
      cellBtn.textContent = cell.neighborMines;
    }
  } else if (cell.state === 'flagged') {
    cellBtn.dataset.state = 'flag-safe';
  } else if (gameState.status === 'lose' && cell.type === 'mine') {
    const isExploded =
      explodedCell && explodedCell.row === row && explodedCell.col === col;
    cellBtn.dataset.state = isExploded ? 'mine-exploded' : 'mine';
  } else {
    cellBtn.dataset.state = 'closed';
  }

  return cellBtn;
}

function drawBoard() {
  boardNode.replaceChildren(
    ...minefield.map((rowCells, row) => {
      const rowNode = document.createElement('div');
      rowNode.className = 'board-row';
      rowNode.append(...rowCells.map((cell, col) => buildCell(cell, row, col)));
      return rowNode;
    }),
  );
}

function drawTimer() {
  timerNode.textContent = padCounter(gameState.gameTime);
}

function updateUI() {
  drawBoard();
  flagsNode.textContent = padCounter(getRemainingFlags());
  drawTimer();
  overlayNode.hidden = gameState.status === 'process';
  overlayNode.dataset.status = gameState.status;
  overlayTextNode.textContent = RESULT_TEXT[gameState.status];
}

function startGame() {
  resetGame();
  runTimer(drawTimer);
  updateUI();
}

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
