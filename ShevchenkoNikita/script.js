const BOARD_SIZE = 16;
const MINES_COUNT = 40;

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
  rows: BOARD_SIZE,
  cols: BOARD_SIZE,
  minesCount: MINES_COUNT,
  status: GAME_STATUS.PROCESS,
  gameTime: 0,
  timerId: null,
};

let board = [];

const neighboursDirections = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
];

function generateField(rows, cols, minesCount) {
  const generatedBoard = [];

  for (let row = 0; row < rows; row++) {
    const boardRow = [];

    for (let col = 0; col < cols; col++) {
      boardRow.push({
        type: CELL_TYPE.EMPTY,
        state: CELL_STATE.CLOSED,
        neighborMines: 0,
        x: col,
        y: row,
        element: null,
      });
    }

    generatedBoard.push(boardRow);
  }

  let minesAdded = 0;

  while (minesAdded < minesCount) {
    const randomRow = Math.floor(Math.random() * rows);
    const randomCol = Math.floor(Math.random() * cols);
    const cell = generatedBoard[randomRow][randomCol];

    if (cell.type !== CELL_TYPE.MINE) {
      cell.type = CELL_TYPE.MINE;
      minesAdded++;
    }
  }

  return generatedBoard;
}

function countNeighbourMines(currentBoard) {
  const boardSize = currentBoard.length;

  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const cell = currentBoard[row][col];

      if (cell.type === CELL_TYPE.MINE) {
        continue;
      }

      let neighbourMineCount = 0;

      for (const [directionalRow, directionalCol] of neighboursDirections) {
        const neighbourRow = row + directionalRow;
        const neighbourCol = col + directionalCol;

        if (
          neighbourRow >= 0 &&
          neighbourRow < boardSize &&
          neighbourCol >= 0 &&
          neighbourCol < boardSize &&
          currentBoard[neighbourRow][neighbourCol].type === CELL_TYPE.MINE
        ) {
          neighbourMineCount++;
        }
      }

      cell.neighborMines = neighbourMineCount;
    }
  }
}

function setSmile(win) {
  let smileSrc;
  const smileEl = document.querySelector('.start-game-button-container img ');

  if (win) {
    smileSrc = './assets/images/smile_win.png';
  } else {
    smileSrc = './assets/images/smile_loss.png';
  }

  smileEl.src = smileSrc;
}

function resetSmile() {
  const smileEl = document.querySelector('.start-game-button-container img');

  smileEl.src = './assets/images/smile_default.png';
}

function endGame(win, currentBoard) {
  gameState.status = win ? GAME_STATUS.WIN : GAME_STATUS.LOSE;

  const statusMessage = document.getElementById('game-message');
  if (statusMessage) {
    statusMessage.textContent = win ? 'You win!' : 'You lost!';
  }

  showAllMines(currentBoard);
  putFlagsAfterGame(currentBoard);
  setSmile(win);
  endTimer();
}

function putFlagsAfterGame(currentBoard) {
  const boardSize = currentBoard.length;

  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const cell = currentBoard[row][col];

      if (cell.state === CELL_STATE.FLAGGED) {
        if (cell.type === CELL_TYPE.MINE) {
          cell.element.classList.add('flagged-mine');
        } else {
          cell.element.classList.add('flagged-safe');
        }
      }
    }
  }
}

function checkWin(currentBoard, minesCount) {
  if (gameState.status !== GAME_STATUS.PROCESS) {
    return;
  }

  const boardSize = currentBoard.length;
  let openedSafeCells = 0;

  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const cell = currentBoard[row][col];

      if (cell.state === CELL_STATE.OPENED && cell.type !== CELL_TYPE.MINE) {
        openedSafeCells++;
      }
    }
  }

  if (openedSafeCells === boardSize * boardSize - minesCount) {
    endGame(true, currentBoard);
  }
}

function explodeMine(cell, gameBoard) {
  cell.state = CELL_STATE.OPENED;
  const cellEl = cell.element;
  cellEl.classList.remove('closed');
  cellEl.classList.add('mine', 'exploded');

  addMineImage(cellEl);
  endGame(false, gameBoard);
}

function toggleFlag(row, col) {
  const cell = board[row]?.[col];
  if (
    !cell ||
    cell.state === CELL_STATE.OPENED ||
    gameState.status !== GAME_STATUS.PROCESS
  ) {
    return;
  }

  const cellEl = cell.element;

  if (cell.state !== CELL_STATE.FLAGGED) {
    const flaggedCells = board
      .flat()
      .filter((currentCell) => currentCell.state === CELL_STATE.FLAGGED).length;

    if (flaggedCells >= gameState.minesCount) {
      return;
    }

    cell.state = CELL_STATE.FLAGGED;
    cellEl.classList.add('flag');
    addFlagImage(cellEl);
    updateMinesCounter();
    updateCellAccessibility(cellEl, cell);
    return;
  }

  cell.state = CELL_STATE.CLOSED;
  cellEl.classList.remove('flag');
  const flagImg = cellEl.querySelector('img[alt="Flag"]');
  if (flagImg) {
    flagImg.remove();
  }
  updateMinesCounter();
  updateCellAccessibility(cellEl, cell);
}

function openCell(row, col) {
  const cell = board[row]?.[col];

  if (
    !cell ||
    cell.state === CELL_STATE.FLAGGED ||
    cell.state === CELL_STATE.OPENED
  ) {
    return;
  }

  openCellInternal(cell, board);
}

function openCellInternal(cell, gameBoard) {
  if (cell.state === CELL_STATE.FLAGGED || cell.state === CELL_STATE.OPENED) {
    return;
  }

  cell.state = CELL_STATE.OPENED;
  const cellEl = cell.element;
  cellEl.classList.remove('closed');
  cellEl.classList.add('opened');
  updateCellAccessibility(cellEl, cell);

  if (cell.type === CELL_TYPE.MINE) {
    cellEl.classList.add('mine', 'exploded');
    addMineImage(cellEl);
    endGame(false, gameBoard);
    return;
  }

  if (cell.neighborMines > 0) {
    const numberClassName = `number-${cell.neighborMines}`;
    cellEl.classList.add(numberClassName);
    cellEl.textContent = String(cell.neighborMines);
    return;
  }

  for (const [directionalRow, directionalCol] of neighboursDirections) {
    const neighbourRow = cell.y + directionalRow;
    const neighbourCol = cell.x + directionalCol;

    if (
      neighbourRow >= 0 &&
      neighbourRow < gameBoard.length &&
      neighbourCol >= 0 &&
      neighbourCol < gameBoard.length
    ) {
      const neighbourCell = gameBoard[neighbourRow][neighbourCol];

      if (
        neighbourCell.state === CELL_STATE.CLOSED &&
        neighbourCell.type !== CELL_TYPE.MINE
      ) {
        openCell(neighbourRow, neighbourCol);
      }
    }
  }
}

function updateCellAccessibility(cellEl, cell) {
  const state =
    cell.state === CELL_STATE.FLAGGED
      ? 'flagged'
      : cell.state === CELL_STATE.OPENED
        ? 'opened'
        : 'closed';

  cellEl.setAttribute(
    'aria-label',
    `Row ${cell.y + 1}, column ${cell.x + 1}, ${state}`,
  );
}

function renderCell(cell, gameBoard, minesCount) {
  const cellEl = document.createElement('button');
  cell.element = cellEl;
  cellEl.type = 'button';
  cellEl.className = 'cell';
  cellEl.classList.add('closed');
  updateCellAccessibility(cellEl, cell);

  if (
    cell.state === CELL_STATE.OPENED &&
    cell.type !== CELL_TYPE.MINE &&
    cell.neighborMines > 0
  ) {
    cellEl.textContent = String(cell.neighborMines);
  }

  cellEl.addEventListener('click', () => {
    if (cell.state === CELL_STATE.FLAGGED) {
      return;
    }

    if (gameState.status !== GAME_STATUS.PROCESS) {
      return;
    }

    if (gameState.timerId === null) {
      startTimer();
    }

    if (cell.type === CELL_TYPE.MINE) {
      explodeMine(cell, gameBoard);
      return;
    }

    openCell(cell.y, cell.x);
    checkWin(gameBoard, minesCount);
  });

  cellEl.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    toggleFlag(cell.y, cell.x);
  });

  cellEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleFlag(cell.y, cell.x);
    }
  });

  return cellEl;
}

function showAllMines(currentBoard) {
  const boardSize = currentBoard.length;

  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const cell = currentBoard[row][col];

      if (cell.type === CELL_TYPE.MINE) {
        cell.state = CELL_STATE.OPENED;
        const cellEl = cell.element;

        if (cellEl && !cellEl.querySelector('img')) {
          cellEl.classList.remove('closed');
          cellEl.classList.add('mine');
          addMineImage(cellEl);
        }
      }
    }
  }
}

function addMineImage(cellEl) {
  const mineImg = document.createElement('img');
  mineImg.setAttribute('src', './assets/images/mine.png');
  mineImg.setAttribute('alt', 'Mine');
  cellEl.appendChild(mineImg);
}

function addFlagImage(cellEl) {
  const flagImg = document.createElement('img');
  flagImg.setAttribute('src', './assets/images/flag.png');
  flagImg.setAttribute('alt', 'Flag');
  cellEl.appendChild(flagImg);
}

function renderBoard(currentBoard, minesCount) {
  const gameBoard = document.querySelector('.game-board');
  const boardSize = currentBoard.length;

  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const cell = currentBoard[row][col];
      const cellEl = renderCell(cell, currentBoard, minesCount);
      gameBoard.appendChild(cellEl);
    }
  }
}

function startTimer() {
  const timerEl = document.querySelector('.timer-container');

  gameState.timerId = setInterval(() => {
    gameState.gameTime++;
    timerEl.textContent = String(gameState.gameTime).padStart(3, '0');
  }, 1000);
}

function endTimer() {
  clearInterval(gameState.timerId);
  gameState.timerId = null;

  const timerEl = document.querySelector('.timer-container');
  gameState.gameTime = 0;
  timerEl.textContent = '000';
}

function updateMinesCounter() {
  const minesCounterContainer = document.querySelector(
    '.mines-counter-container',
  );
  const flaggedCells = board
    .flat()
    .filter((cell) => cell.state === CELL_STATE.FLAGGED).length;
  const minesLeft = gameState.minesCount - flaggedCells;

  minesCounterContainer.textContent = String(minesLeft).padStart(3, '0');
}

function startGame() {
  const gameBoard = document.querySelector('.game-board');
  const statusMessage = document.getElementById('game-message');

  gameBoard.innerHTML = '';
  endTimer();

  gameState.status = GAME_STATUS.PROCESS;
  if (statusMessage) {
    statusMessage.textContent = '';
  }

  board = generateField(gameState.rows, gameState.cols, gameState.minesCount);
  countNeighbourMines(board);

  resetSmile();
  updateMinesCounter();
  renderBoard(board, gameState.minesCount);
}

startGame();
const restartButton = document.querySelector(
  '.start-game-button-container button',
);
restartButton.addEventListener('click', () => startGame());
