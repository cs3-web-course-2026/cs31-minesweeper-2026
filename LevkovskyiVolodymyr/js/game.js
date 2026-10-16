const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

function generateField(rows, cols, minesCount, safeRow = -1, safeCol = -1) {
  const board = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      type: 'empty',
      neighborMines: 0,
      state: 'closed',
    }))
  );

  let minesPlaced = 0;
  const maxPossibleMines = rows * cols - (safeRow !== -1 ? 1 : 0);
  const targetMines = Math.min(minesCount, Math.max(0, maxPossibleMines));

  while (minesPlaced < targetMines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);

    // Exclude safe zone (cell and all its 8 neighbors) if safeRow specified
    if (safeRow !== -1 && Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) {
      continue;
    }
    if (board[r][c].type === 'mine') {
      continue;
    }

    board[r][c].type = 'mine';
    minesPlaced++;
  }

  countNeighbourMines(board, rows, cols);
  return board;
}

function countNeighbourMines(board, rows, cols) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].type === 'mine') {
        continue;
      }

      let count = 0;
      for (const [dr, dc] of DIRECTIONS) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].type === 'mine') {
          count++;
        }
      }
      board[r][c].neighborMines = count;
    }
  }
}

class Game {
  countdown = document.querySelector('.countdown');
  flagsCounter = document.querySelector('.flags-count');
  gameStatus = document.querySelector('.game-status');
  tableEl = document.querySelector('.board');
  tbodyEl = document.querySelector('.board tbody');
  startBtn = document.querySelector('.start-btn');
  stopBtn = document.querySelector('.stop-btn');

  gameState = {
    rows: 6,
    cols: 6,
    minesCount: 6,
    status: 'stop', // 'stop' | 'process' | 'win' | 'lose'
    gameTime: 0,
    timerId: null,
  };

  board = []; // 2D array of cell objects (Lab 2 data layer)
  flags = 6;
  firstClick = true;
  cellElements = []; // 2D array of DOM elements

  constructor() {
    this.initEvents();
    this.createBoardUI();
    this.initEmptyBoardData();
  }

  initEvents() {
    this.startBtn.addEventListener('click', () => this.start());
    this.stopBtn.addEventListener('click', () => this.stop());
  }

  initEmptyBoardData() {
    this.board = Array.from({ length: this.gameState.rows }, () =>
      Array.from({ length: this.gameState.cols }, () => ({
        type: 'empty',
        neighborMines: 0,
        state: 'closed',
      }))
    );
  }

  createBoardUI() {
    this.tbodyEl.innerHTML = '';
    this.cellElements = [];

    for (let r = 0; r < this.gameState.rows; r++) {
      const tr = document.createElement('tr');
      tr.className = 'raw';
      const rowElements = [];

      for (let c = 0; c < this.gameState.cols; c++) {
        const th = document.createElement('th');
        th.className = 'column closed';

        th.addEventListener('click', () => this.openCell(r, c));
        th.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.toggleFlag(r, c);
        });

        tr.appendChild(th);
        rowElements.push(th);
      }

      this.tbodyEl.appendChild(tr);
      this.cellElements.push(rowElements);
    }
  }

  start() {
    clearInterval(this.gameState.timerId);
    this.gameState.status = 'process';
    this.gameState.gameTime = 0;
    this.firstClick = true;

    this.startBtn.disabled = true;
    this.stopBtn.disabled = false;
    this.tableEl.classList.add('game-active');

    this.flags = this.gameState.minesCount;
    this.countdown.textContent = `${this.gameState.gameTime} s`;
    this.flagsCounter.textContent = `${this.flags} flags`;
    if (this.gameStatus) {
      this.gameStatus.textContent = `Mines: ${this.gameState.minesCount}`;
    }

    this.initEmptyBoardData();
    this.resetBoardUI();

    this.gameState.timerId = setInterval(() => {
      this.gameState.gameTime++;
      this.countdown.textContent = `${this.gameState.gameTime} s`;
    }, 1000);
  }

  stop() {
    this.gameState.status = 'stop';
    this.firstClick = true;
    this.startBtn.disabled = false;
    this.stopBtn.disabled = true;
    this.tableEl.classList.remove('game-active');

    clearInterval(this.gameState.timerId);
    this.gameState.timerId = null;

    this.initEmptyBoardData();
    this.resetBoardUI();

    this.gameState.gameTime = 0;
    this.countdown.textContent = '0 s';
    this.flags = 0;
    this.flagsCounter.textContent = '0 flags';
    if (this.gameStatus) {
      this.gameStatus.textContent = '';
    }
  }

  resetBoardUI() {
    for (let r = 0; r < this.gameState.rows; r++) {
      for (let c = 0; c < this.gameState.cols; c++) {
        const cellEl = this.cellElements[r][c];
        cellEl.className = 'column closed';
        cellEl.textContent = '';
      }
    }
  }

  openCell(r, c) {
    if (this.gameState.status !== 'process') return;

    if (this.firstClick) {
      this.board = generateField(
        this.gameState.rows,
        this.gameState.cols,
        this.gameState.minesCount,
        r,
        c
      );
      this.firstClick = false;
    }

    const cellData = this.board[r][c];
    if (cellData.state === 'opened' || cellData.state === 'flagged') return;

    if (cellData.type === 'mine') {
      this.gameOver(r, c);
      return;
    }

    this.revealCell(r, c);

    if (this.checkWin()) {
      this.winGame();
    }
  }

  revealCell(r, c) {
    const cellData = this.board[r][c];
    if (cellData.state === 'opened' || cellData.state === 'flagged' || cellData.type === 'mine') {
      return;
    }

    cellData.state = 'opened';
    const cellEl = this.cellElements[r][c];
    cellEl.classList.remove('closed');
    cellEl.classList.add('opened');
    cellEl.textContent = cellData.neighborMines || '';

    if (cellData.neighborMines === 0) {
      for (const [dr, dc] of DIRECTIONS) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < this.gameState.rows && nc >= 0 && nc < this.gameState.cols) {
          this.revealCell(nr, nc);
        }
      }
    }
  }

  toggleFlag(r, c) {
    if (this.gameState.status !== 'process') return;

    const cellData = this.board[r][c];
    if (cellData.state === 'opened') return;

    const cellEl = this.cellElements[r][c];

    if (cellData.state === 'flagged') {
      cellData.state = 'closed';
      this.flags++;
      cellEl.classList.remove('flagged');
      cellEl.textContent = '';
    } else {
      if (this.flags <= 0) return;
      cellData.state = 'flagged';
      this.flags--;
      cellEl.classList.add('flagged');
      cellEl.textContent = '🚩';
    }

    this.flagsCounter.textContent = `${this.flags} flags`;

    if (this.checkWin()) {
      this.winGame();
    }
  }

  gameOver(explodedR, explodedC) {
    this.gameState.status = 'lose';
    this.startBtn.disabled = false;
    this.stopBtn.disabled = true;
    this.tableEl.classList.remove('game-active');

    clearInterval(this.gameState.timerId);
    this.gameState.timerId = null;

    for (let r = 0; r < this.gameState.rows; r++) {
      for (let c = 0; c < this.gameState.cols; c++) {
        const cellData = this.board[r][c];
        const cellEl = this.cellElements[r][c];

        if (r === explodedR && c === explodedC) {
          cellEl.className = 'column first-exploded';
          cellEl.textContent = '💣';
        } else if (cellData.type === 'mine') {
          if (cellData.state === 'flagged') {
            cellEl.className = 'column flagged';
            cellEl.textContent = '🚩';
          } else {
            cellEl.className = 'column bombed';
            cellEl.textContent = '💣';
          }
        } else {
          if (cellData.state === 'flagged') {
            cellEl.className = 'column flagged wrong';
            cellEl.textContent = '🚩';
          } else {
            cellEl.className = 'column opened';
            cellEl.textContent = cellData.neighborMines || '';
          }
        }
      }
    }

    if (this.gameStatus) {
      this.gameStatus.textContent = 'Game Over! You hit a mine.';
    }
  }

  checkWin() {
    for (let r = 0; r < this.gameState.rows; r++) {
      for (let c = 0; c < this.gameState.cols; c++) {
        const cellData = this.board[r][c];
        if (cellData.type !== 'mine' && cellData.state !== 'opened') {
          return false;
        }
      }
    }
    return true;
  }

  winGame() {
    this.gameState.status = 'win';
    this.tableEl.classList.remove('game-active');
    this.startBtn.disabled = false;
    this.stopBtn.disabled = true;

    clearInterval(this.gameState.timerId);
    this.gameState.timerId = null;

    if (this.gameStatus) {
      this.gameStatus.textContent = `You win! Time: ${this.gameState.gameTime} s`;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new Game();
});