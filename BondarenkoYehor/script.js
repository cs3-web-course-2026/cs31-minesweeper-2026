const DEFAULT_SETTINGS = { rows: 9, cols: 9, minesCount: 10 };

const gameState = {
  rows: DEFAULT_SETTINGS.rows,
  cols: DEFAULT_SETTINGS.cols,
  minesCount: DEFAULT_SETTINGS.minesCount,
  status: 'process',
  gameTime: 0,
  timerId: null,
  explodedCell: null,
};

let field = [];

function createCell() {
  return { type: 'empty', neighborMines: 0, state: 'closed' };
}

function generateField(rows, cols, minesCount) {
  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, createCell),
  );

  let placed = 0;
  while (placed < minesCount) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);
    if (grid[row][col].type === 'mine') continue;
    grid[row][col].type = 'mine';
    placed++;
  }
  return grid;
}

function forEachNeighbor(grid, row, col, callback) {
  for (let dRow = -1; dRow <= 1; dRow++) {
    for (let dCol = -1; dCol <= 1; dCol++) {
      if (dRow === 0 && dCol === 0) continue;
      const r = row + dRow;
      const c = col + dCol;
      if (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length) {
        callback(grid[r][c], r, c);
      }
    }
  }
}

function countNeighbourMines(grid) {
  grid.forEach((line, row) => {
    line.forEach((cell, col) => {
      if (cell.type === 'mine') return;
      let count = 0;
      forEachNeighbor(grid, row, col, (neighbor) => {
        if (neighbor.type === 'mine') count++;
      });
      cell.neighborMines = count;
    });
  });
}

function revealCell(row, col) {
  const cell = field[row][col];
  if (cell.state !== 'closed') return;

  cell.state = 'opened';
  if (cell.neighborMines === 0) {
    forEachNeighbor(field, row, col, (_, r, c) => revealCell(r, c));
  }
}

function hasWon() {
  return field.every((line) =>
    line.every((cell) => cell.type === 'mine' || cell.state === 'opened'),
  );
}

function endGame(status) {
  gameState.status = status;
  stopTimer();
}

function openCell(row, col) {
  if (gameState.status !== 'process') return;

  const cell = field[row][col];
  if (cell.state !== 'closed') return;

  if (cell.type === 'mine') {
    gameState.explodedCell = { row, col };
    endGame('lose');
    return;
  }

  revealCell(row, col);
  if (hasWon()) endGame('win');
}

function countFlags() {
  return field.flat().filter((cell) => cell.state === 'flagged').length;
}

function toggleFlag(row, col) {
  if (gameState.status !== 'process') return;

  const cell = field[row][col];
  if (cell.state === 'opened') return;

  if (cell.state === 'flagged') {
    cell.state = 'closed';
  } else if (countFlags() < gameState.minesCount) {
    cell.state = 'flagged';
  }
}

function startTimer(onTick) {
  if (gameState.timerId !== null) return;
  gameState.timerId = setInterval(() => {
    gameState.gameTime++;
    onTick();
  }, 1000);
}

function stopTimer() {
  clearInterval(gameState.timerId);
  gameState.timerId = null;
}

function startNewGame({ rows, cols, minesCount } = DEFAULT_SETTINGS) {
  stopTimer();
  Object.assign(gameState, {
    rows,
    cols,
    minesCount,
    status: 'process',
    gameTime: 0,
    explodedCell: null,
  });
  field = generateField(rows, cols, minesCount);
  countNeighbourMines(field);
}

const boardElement = document.getElementById('board');
const timerElement = document.getElementById('timer');
const flagsElement = document.getElementById('flags-counter');
const fieldInfoElement = document.getElementById('field-info');
const messageElement = document.getElementById('game-message');
const restartButton = document.getElementById('restart');
const themeButton = document.getElementById('theme-toggle');

const SYMBOLS = { flag: '⚑', mine: '✹' };
const MESSAGES = {
  win: { text: 'You win! All safe cells are opened.', className: 'win' },
  lose: { text: 'Game over: you opened a mine.', className: '' },
};

const THEME_KEY = 'minesweeper-theme';

function getCellView(cell, row, col) {
  const { status, explodedCell } = gameState;
  const gameOver = status !== 'process';

  if (cell.state === 'opened') {
    return cell.neighborMines > 0
      ? { className: `open count-${cell.neighborMines}`, symbol: String(cell.neighborMines), count: cell.neighborMines }
      : { className: 'open empty', symbol: '' };
  }

  if (cell.type === 'mine' && gameOver) {
    if (explodedCell && explodedCell.row === row && explodedCell.col === col) {
      return { className: 'triggered-mine', symbol: SYMBOLS.mine };
    }
    if (cell.state === 'flagged' || status === 'win') {
      return { className: 'flagged-mine', symbol: SYMBOLS.flag };
    }
    return { className: 'mine', symbol: SYMBOLS.mine };
  }

  if (cell.state === 'flagged') {
    return { className: status === 'lose' ? 'wrong-flag' : 'flagged', symbol: SYMBOLS.flag };
  }
  return { className: 'closed', symbol: '' };
}

function createCellElement(cell, row, col) {
  const view = getCellView(cell, row, col);

  const element = document.createElement('div');
  element.className = `cell ${view.className}`;
  element.dataset.row = row;
  element.dataset.col = col;
  element.setAttribute('role', 'button');
  element.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}, ${view.className.split(' ')[0]}`);

  const cover = document.createElement('span');
  cover.className = 'cover';

  const content = document.createElement('span');
  content.className = 'content';
  content.textContent = view.symbol;
  if (view.count) content.dataset.count = view.count;

  element.append(cover, content);
  return element;
}

function renderBoard() {
  const cells = field.flatMap((line, row) =>
    line.map((cell, col) => createCellElement(cell, row, col)),
  );
  boardElement.style.setProperty('--cols', gameState.cols);
  boardElement.replaceChildren(...cells);
}

function renderTimer() {
  const time = String(gameState.gameTime).padStart(3, '0');
  timerElement.innerHTML = `<span class="badge-icon">⏱</span>Time: ${time}`;
}

function renderFlags() {
  flagsElement.innerHTML = `<span class="badge-icon">⚑</span>Flags: ${countFlags()} / ${gameState.minesCount}`;
}

function renderMessage() {
  const message = MESSAGES[gameState.status];
  messageElement.hidden = !message;
  messageElement.className = message ? message.className : '';
  messageElement.textContent = message ? message.text : '';
}

function render() {
  fieldInfoElement.textContent = `${gameState.rows} × ${gameState.cols} grid · ${gameState.minesCount} mines`;
  renderBoard();
  renderTimer();
  renderFlags();
  renderMessage();
}

function handleCellAction(action, event) {
  const cellElement = event.target.closest('.cell');
  if (!cellElement || gameState.status !== 'process') return;

  startTimer(renderTimer);
  action(Number(cellElement.dataset.row), Number(cellElement.dataset.col));
  render();
}

boardElement.addEventListener('click', (event) => {
  handleCellAction(openCell, event);
});

boardElement.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  handleCellAction(toggleFlag, event);
});

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved;
  } catch {
    // localStorage is unavailable, fall back to the system theme
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeButton.textContent = theme === 'dark' ? '☀' : '☾';
  themeButton.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
}

themeButton.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // localStorage is unavailable, the theme just won't be remembered
  }
});

restartButton.addEventListener('click', () => {
  startNewGame();
  render();
});

applyTheme(getInitialTheme());
startNewGame();
render();