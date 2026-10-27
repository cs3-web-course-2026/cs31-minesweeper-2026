const GAME_STATUS = { PROCESS: 'process', WIN: 'win', LOSE: 'lose' };
const CELL_STATE = { CLOSED: 'closed', OPENED: 'opened', FLAGGED: 'flagged' };
const CELL_TYPE = { EMPTY: 'empty', MINE: 'mine' };
const TIMER_INTERVAL_MS = 1000;

//Моделювання даних
const gameState = {
  rows: 9,
  cols: 9,
  minesCount: 10,
  flagsCount: 0,
  status: GAME_STATUS.PROCESS,
  gameTime: 0,
  timerId: null,
  isFirstClick: true,
};

let board = [];

//Кешування DOM-елементів
const boardElement = document.getElementById('game-board');
const minesCountElement = document.querySelector('#mines-count span');
const timerElement = document.querySelector('#timer span');
const startButton = document.getElementById('start-button');
const buttonImageElement = document.getElementById('btn-img');
const gameMessageElement = document.getElementById('game-message');

//Генерація поля та мін
function generateField(rows, cols, minesCount, firstRow = -1, firstCol = -1) {
  const newBoard = [];

  for (let row = 0; row < rows; row++) {
    const boardRow = [];
    for (let col = 0; col < cols; col++) {
      boardRow.push({
        type: CELL_TYPE.EMPTY,
        state: CELL_STATE.CLOSED,
        neighborMines: 0,
        exploded: false,
        element: null,
      });
    }
    newBoard.push(boardRow);
  }

  if (minesCount === 0) return newBoard;

  let minesPlaced = 0;
  while (minesPlaced < minesCount) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);

    const isSafeZone =
      firstRow !== -1 &&
      Math.abs(row - firstRow) <= 1 &&
      Math.abs(col - firstCol) <= 1;

    if (newBoard[row][col].type !== CELL_TYPE.MINE && !isSafeZone) {
      newBoard[row][col].type = CELL_TYPE.MINE;
      minesPlaced++;
    }
  }

  return newBoard;
}

function countNeighbourMines(currentBoard, rows, cols) {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (currentBoard[row][col].type === CELL_TYPE.MINE) continue;

      let count = 0;
      for (const [rowOffset, colOffset] of directions) {
        const neighborRow = row + rowOffset;
        const neighborCol = col + colOffset;

        if (
          neighborRow >= 0 &&
          neighborRow < rows &&
          neighborCol >= 0 &&
          neighborCol < cols
        ) {
          if (currentBoard[neighborRow][neighborCol].type === CELL_TYPE.MINE) {
            count++;
          }
        }
      }
      currentBoard[row][col].neighborMines = count;
    }
  }
}

//Алгоритмічна частина
const directions = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

function revealCell(row, col) {
  const cell = board[row][col];
  if (cell.state === CELL_STATE.OPENED || cell.state === CELL_STATE.FLAGGED)
    return;

  cell.state = CELL_STATE.OPENED;

  if (cell.type === CELL_TYPE.MINE) {
    cell.exploded = true;
    return;
  }

  if (cell.neighborMines === 0) {
    for (const [rowOffset, colOffset] of directions) {
      const neighborRow = row + rowOffset;
      const neighborCol = col + colOffset;
      if (
        neighborRow >= 0 &&
        neighborRow < gameState.rows &&
        neighborCol >= 0 &&
        neighborCol < gameState.cols
      ) {
        revealCell(neighborRow, neighborCol);
      }
    }
  }
}

function openCell(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) return;

  let cell = board[row][col];
  if (cell.state === CELL_STATE.OPENED || cell.state === CELL_STATE.FLAGGED)
    return;

  if (gameState.isFirstClick) {
    gameState.isFirstClick = false;
    startTimer();

    const oldElements = board.map((boardRow) => boardRow.map((c) => c.element));

    board = generateField(
      gameState.rows,
      gameState.cols,
      gameState.minesCount,
      row,
      col,
    );
    countNeighbourMines(board, gameState.rows, gameState.cols);

    for (let i = 0; i < gameState.rows; i++) {
      for (let j = 0; j < gameState.cols; j++) {
        board[i][j].element = oldElements[i][j];
      }
    }

    cell = board[row][col];
  }

  revealCell(row, col);

  if (cell.type === CELL_TYPE.MINE) {
    handleGameOver(false);
  } else {
    checkWinCondition();
    updateUI();
    renderField();
  }
}

//Таймер та прапорці
function toggleFlag(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) return;

  const cell = board[row][col];
  if (cell.state === CELL_STATE.OPENED) return;

  if (cell.state === CELL_STATE.CLOSED) {
    cell.state = CELL_STATE.FLAGGED;
    gameState.flagsCount++;
  } else if (cell.state === CELL_STATE.FLAGGED) {
    cell.state = CELL_STATE.CLOSED;
    gameState.flagsCount--;
  }

  updateUI();
  renderField();
}

function startTimer() {
  if (gameState.timerId) clearInterval(gameState.timerId);
  gameState.timerId = setInterval(() => {
    gameState.gameTime++;
    updateUI();
  }, TIMER_INTERVAL_MS);
}

function stopTimer() {
  if (gameState.timerId) {
    clearInterval(gameState.timerId);
    gameState.timerId = null;
  }
}

//Рендеринг ігрового поля
function renderField() {
  const needsCreation =
    boardElement.children.length === 0 || !board[0][0].element;

  if (needsCreation) {
    boardElement.innerHTML = '';
    for (let row = 0; row < gameState.rows; row++) {
      for (let col = 0; col < gameState.cols; col++) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.row = row;
        button.dataset.col = col;
        boardElement.appendChild(button);
        board[row][col].element = button;
      }
    }
  }

  for (let row = 0; row < gameState.rows; row++) {
    for (let col = 0; col < gameState.cols; col++) {
      const cellData = board[row][col];
      const button = cellData.element;

      button.className = 'cell';
      button.removeAttribute('data-value');

      let ariaLabelState = 'closed';

      if (cellData.state === CELL_STATE.CLOSED) {
        button.classList.add('cell-closed');
      }

      if (cellData.state === CELL_STATE.OPENED) {
        if (cellData.type === CELL_TYPE.MINE) {
          button.classList.add(
            cellData.exploded ? 'cell-mine-exploded' : 'cell-mine',
          );
          ariaLabelState = 'mine';
        } else {
          if (cellData.neighborMines > 0) {
            button.classList.add('cell-revealed-num');
            button.dataset.value = cellData.neighborMines;
            ariaLabelState = `revealed, ${cellData.neighborMines} mines nearby`;
          } else {
            button.classList.add('cell-revealed');
            ariaLabelState = 'revealed, empty';
          }
        }
      } else if (cellData.state === CELL_STATE.FLAGGED) {
        if (
          gameState.status === GAME_STATUS.LOSE &&
          cellData.type !== CELL_TYPE.MINE
        ) {
          button.classList.add('cell-flagged-wrong');
          ariaLabelState = 'wrongly flagged';
        } else {
          button.classList.add('cell-flagged');
          ariaLabelState = 'flagged';
        }
      }

      button.setAttribute('aria-label', `Cell ${row} ${col} ${ariaLabelState}`);
    }
  }
}

//Динамічні елементи інтерфейсу

function updateUI() {
  minesCountElement.textContent = gameState.minesCount - gameState.flagsCount;
  timerElement.textContent = gameState.gameTime;

  if (gameState.status === GAME_STATUS.WIN) {
    buttonImageElement.src = 'pictures/WIN.png';
  } else if (gameState.status === GAME_STATUS.LOSE) {
    buttonImageElement.src = 'pictures/GAMEOVER.png';
  } else if (gameState.gameTime === 0 && !gameState.timerId) {
    buttonImageElement.src = 'pictures/START.png';
  } else {
    buttonImageElement.src = 'pictures/inProgress.png';
  }
}

function initGame() {
  gameState.status = GAME_STATUS.PROCESS;
  gameState.flagsCount = 0;
  gameState.gameTime = 0;
  gameState.isFirstClick = true;
  stopTimer();

  board = generateField(gameState.rows, gameState.cols, 0);

  updateUI();
  renderField();

  if (gameMessageElement) gameMessageElement.textContent = '';
}

//Обробка подій

boardElement.addEventListener('click', (event) => {
  const button = event.target.closest('.cell');
  if (!button) return;

  const row = parseInt(button.dataset.row);
  const col = parseInt(button.dataset.col);
  openCell(row, col);
});

boardElement.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  const button = event.target.closest('.cell');
  if (!button) return;

  const row = parseInt(button.dataset.row);
  const col = parseInt(button.dataset.col);
  toggleFlag(row, col);
});

boardElement.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'f') {
    const button = event.target.closest('.cell');
    if (!button) return;

    const row = parseInt(button.dataset.row);
    const col = parseInt(button.dataset.col);
    toggleFlag(row, col);
  }
});

startButton.addEventListener('click', initGame);

//Завершення гри

function checkWinCondition() {
  let safeCellsOpened = 0;
  const targetSafeCells =
    gameState.rows * gameState.cols - gameState.minesCount;

  for (let row = 0; row < gameState.rows; row++) {
    for (let col = 0; col < gameState.cols; col++) {
      if (
        board[row][col].type === CELL_TYPE.EMPTY &&
        board[row][col].state === CELL_STATE.OPENED
      ) {
        safeCellsOpened++;
      }
    }
  }

  if (safeCellsOpened === targetSafeCells) {
    handleGameOver(true);
  }
}

function handleGameOver(isWin) {
  gameState.status = isWin ? GAME_STATUS.WIN : GAME_STATUS.LOSE;
  stopTimer();

  if (gameMessageElement) {
    gameMessageElement.textContent = isWin
      ? 'Вітаємо! Ви перемогли!'
      : 'Гру закінчено. Ви натрапили на міну.';
  }

  if (!isWin) {
    for (let row = 0; row < gameState.rows; row++) {
      for (let col = 0; col < gameState.cols; col++) {
        if (
          board[row][col].type === CELL_TYPE.MINE &&
          board[row][col].state !== CELL_STATE.FLAGGED
        ) {
          board[row][col].state = CELL_STATE.OPENED;
        }
      }
    }
  }

  updateUI();
  renderField();
}

initGame();
