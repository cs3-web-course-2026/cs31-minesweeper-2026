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
  STOP: 'stop',
};

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

function generateField(rows, cols, minesCount, safeRow = -1, safeCol = -1) {
  const board = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      type: CELL_TYPE.EMPTY,
      neighborMines: 0,
      state: CELL_STATE.CLOSED,
    }))
  );

  let minesPlaced = 0;
  const maxPossibleMines = rows * cols - (safeRow !== -1 ? 1 : 0);
  const targetMines = Math.min(minesCount, Math.max(0, maxPossibleMines));

  while (minesPlaced < targetMines) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);

    if (safeRow !== -1 && Math.abs(row - safeRow) <= 1 && Math.abs(col - safeCol) <= 1) {
      continue;
    }

    if (board[row][col].type === CELL_TYPE.MINE) {
      continue;
    }

    board[row][col].type = CELL_TYPE.MINE;
    minesPlaced++;
  }

  countNeighbourMines(board, rows, cols);

  return board;
}

function countNeighbourMines(board, rows, cols) {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (board[row][col].type === CELL_TYPE.MINE) {
        continue;
      }

      let count = 0;

      for (const [directionalRow, directionalCol] of DIRECTIONS) {
        const neighbourRow = row + directionalRow;
        const neighbourCol = col + directionalCol;

        if (
          neighbourRow >= 0 &&
          neighbourRow < rows &&
          neighbourCol >= 0 &&
          neighbourCol < cols &&
          board[neighbourRow][neighbourCol].type === CELL_TYPE.MINE
        ) {
          count++;
        }
      }

      board[row][col].neighborMines = count;
    }
  }
}

class Game {
  countdown = document.querySelector('.countdown');
  flagsCounter = document.querySelector('.flags-count');
  gameStatus = document.querySelector('.game-status');
  tableElement = document.querySelector('.board');
  tbodyElement = document.querySelector('.board tbody');
  startButton = document.querySelector('.start-btn');
  stopButton = document.querySelector('.stop-btn');

  gameState = {
    rows: 6,
    cols: 6,
    minesCount: 6,
    status: GAME_STATUS.STOP,
    gameTime: 0,
    timerId: null,
  };

  board = [];
  flags = 6;
  firstClick = true;
  cellElements = [];

  constructor() {
    this.initEvents();
    this.createBoardUI();
    this.initEmptyBoardData();
  }

  initEvents() {
    this.startButton.addEventListener('click', () => this.start());
    this.stopButton.addEventListener('click', () => this.stop());
  }

  initEmptyBoardData() {
    this.board = Array.from({ length: this.gameState.rows }, () =>
      Array.from({ length: this.gameState.cols }, () => ({
        type: CELL_TYPE.EMPTY,
        neighborMines: 0,
        state: CELL_STATE.CLOSED,
      }))
    );
  }

  createBoardUI() {
    this.tbodyElement.innerHTML = '';
    this.cellElements = [];

    for (let row = 0; row < this.gameState.rows; row++) {
      const tableRow = document.createElement('tr');
      tableRow.className = 'raw';
      const rowElements = [];

      for (let col = 0; col < this.gameState.cols; col++) {
        const cellElement = document.createElement('th');
        cellElement.className = 'column closed';
        cellElement.setAttribute(
          'aria-label',
          `Row ${row + 1}, column ${col + 1}, closed`
        );

        cellElement.addEventListener('click', () => this.openCell(row, col));
        cellElement.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          this.toggleFlag(row, col);
        });

        tableRow.appendChild(cellElement);
        rowElements.push(cellElement);
      }

      this.tbodyElement.appendChild(tableRow);
      this.cellElements.push(rowElements);
    }
  }

  start() {
    clearInterval(this.gameState.timerId);
    this.gameState.status = GAME_STATUS.PROCESS;
    this.gameState.gameTime = 0;
    this.firstClick = true;

    this.startButton.disabled = true;
    this.stopButton.disabled = false;
    this.tableElement.classList.add('game-active');

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
    this.gameState.status = GAME_STATUS.STOP;
    this.firstClick = true;
    this.startButton.disabled = false;
    this.stopButton.disabled = true;
    this.tableElement.classList.remove('game-active');

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
    for (let row = 0; row < this.gameState.rows; row++) {
      for (let col = 0; col < this.gameState.cols; col++) {
        const cellElement = this.cellElements[row][col];
        cellElement.className = 'column closed';
        cellElement.textContent = '';
        cellElement.setAttribute(
          'aria-label',
          `Row ${row + 1}, column ${col + 1}, closed`
        );
      }
    }
  }

  openCell(row, col) {
    if (this.gameState.status !== GAME_STATUS.PROCESS) {
      return;
    }

    if (this.firstClick) {
      this.board = generateField(
        this.gameState.rows,
        this.gameState.cols,
        this.gameState.minesCount,
        row,
        col
      );
      this.firstClick = false;
    }

    const cellData = this.board[row][col];

    if (
      cellData.state === CELL_STATE.OPENED ||
      cellData.state === CELL_STATE.FLAGGED
    ) {
      return;
    }

    if (cellData.type === CELL_TYPE.MINE) {
      this.gameOver(row, col);

      return;
    }

    this.revealCell(row, col);

    if (this.checkWin()) {
      this.winGame();
    }
  }

  revealCell(row, col) {
    const cellData = this.board[row][col];

    if (
      cellData.state === CELL_STATE.OPENED ||
      cellData.state === CELL_STATE.FLAGGED ||
      cellData.type === CELL_TYPE.MINE
    ) {
      return;
    }

    cellData.state = CELL_STATE.OPENED;
    const cellElement = this.cellElements[row][col];
    cellElement.classList.remove('closed');
    cellElement.classList.add('opened');
    cellElement.textContent = cellData.neighborMines || '';
    cellElement.setAttribute(
      'aria-label',
      `Row ${row + 1}, column ${col + 1}, opened ${cellData.neighborMines || 0} mines`
    );

    if (cellData.neighborMines === 0) {
      for (const [directionalRow, directionalCol] of DIRECTIONS) {
        const neighbourRow = row + directionalRow;
        const neighbourCol = col + directionalCol;

        if (
          neighbourRow >= 0 &&
          neighbourRow < this.gameState.rows &&
          neighbourCol >= 0 &&
          neighbourCol < this.gameState.cols
        ) {
          this.revealCell(neighbourRow, neighbourCol);
        }
      }
    }
  }

  toggleFlag(row, col) {
    if (this.gameState.status !== GAME_STATUS.PROCESS) {
      return;
    }

    const cellData = this.board[row][col];

    if (cellData.state === CELL_STATE.OPENED) {
      return;
    }

    const cellElement = this.cellElements[row][col];

    if (cellData.state === CELL_STATE.FLAGGED) {
      cellData.state = CELL_STATE.CLOSED;
      this.flags++;
      cellElement.classList.remove('flagged');
      cellElement.textContent = '';
      cellElement.setAttribute(
        'aria-label',
        `Row ${row + 1}, column ${col + 1}, closed`
      );
    } else {
      if (this.flags <= 0) {
        return;
      }

      cellData.state = CELL_STATE.FLAGGED;
      this.flags--;
      cellElement.classList.add('flagged');
      cellElement.textContent = '🚩';
      cellElement.setAttribute(
        'aria-label',
        `Row ${row + 1}, column ${col + 1}, flagged`
      );
    }

    this.flagsCounter.textContent = `${this.flags} flags`;

    if (this.checkWin()) {
      this.winGame();
    }
  }

  gameOver(explodedRow, explodedCol) {
    this.gameState.status = GAME_STATUS.LOSE;
    this.startButton.disabled = false;
    this.stopButton.disabled = true;
    this.tableElement.classList.remove('game-active');

    clearInterval(this.gameState.timerId);
    this.gameState.timerId = null;

    for (let row = 0; row < this.gameState.rows; row++) {
      for (let col = 0; col < this.gameState.cols; col++) {
        const cellData = this.board[row][col];
        const cellElement = this.cellElements[row][col];

        if (row === explodedRow && col === explodedCol) {
          cellElement.className = 'column first-exploded';
          cellElement.textContent = '💣';
          cellElement.setAttribute(
            'aria-label',
            `Row ${row + 1}, column ${col + 1}, exploded mine`
          );
        } else if (cellData.type === CELL_TYPE.MINE) {
          if (cellData.state === CELL_STATE.FLAGGED) {
            cellElement.className = 'column flagged';
            cellElement.textContent = '🚩';
            cellElement.setAttribute(
              'aria-label',
              `Row ${row + 1}, column ${col + 1}, flagged mine`
            );
          } else {
            cellElement.className = 'column bombed';
            cellElement.textContent = '💣';
            cellElement.setAttribute(
              'aria-label',
              `Row ${row + 1}, column ${col + 1}, mine`
            );
          }
        } else {
          if (cellData.state === CELL_STATE.FLAGGED) {
            cellElement.className = 'column flagged wrong';
            cellElement.textContent = '🚩';
            cellElement.setAttribute(
              'aria-label',
              `Row ${row + 1}, column ${col + 1}, falsely flagged`
            );
          } else {
            cellElement.className = 'column opened';
            cellElement.textContent = cellData.neighborMines || '';
            cellElement.setAttribute(
              'aria-label',
              `Row ${row + 1}, column ${col + 1}, opened ${cellData.neighborMines || 0} mines`
            );
          }
        }
      }
    }

    if (this.gameStatus) {
      this.gameStatus.textContent = 'Game Over! You hit a mine.';
    }
  }

  checkWin() {
    for (let row = 0; row < this.gameState.rows; row++) {
      for (let col = 0; col < this.gameState.cols; col++) {
        const cellData = this.board[row][col];

        if (
          cellData.type !== CELL_TYPE.MINE &&
          cellData.state !== CELL_STATE.OPENED
        ) {
          return false;
        }
      }
    }

    return true;
  }

  winGame() {
    this.gameState.status = GAME_STATUS.WIN;
    this.tableElement.classList.remove('game-active');
    this.startButton.disabled = false;
    this.stopButton.disabled = true;

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
