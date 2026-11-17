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

const NEIGHBOR_OFFSETS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

const MS_IN_SECOND = 1000;
const TIMER_INTERVAL_MS = 250;
const SECONDS_IN_MINUTE = 60;
const COUNTER_DIGITS = 3;
const FLAG_KEY_CODE = 'KeyF';

const GAME_MESSAGE = {
  [GAME_STATUS.PROCESS]: '',
  [GAME_STATUS.WIN]: 'Перемога! Поле чисте.',
  [GAME_STATUS.LOSE]: 'Бум! Гру програно.',
};

const gameState = {
  rows: 9,
  cols: 9,
  minesCount: 10,
  status: GAME_STATUS.PROCESS,
  gameTime: 0,
  startedAt: 0,
  timerId: null,
};

let board = [];

function createCell() {
  return {
    type: CELL_TYPE.EMPTY,
    neighborMines: 0,
    state: CELL_STATE.CLOSED,
  };
}

function generateField(rows, cols, minesCount) {
  if (minesCount >= rows * cols) {
    throw new RangeError('Мін має бути менше, ніж клітинок на полі.');
  }

  const field = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, createCell),
  );

  let placedMines = 0;

  while (placedMines < minesCount) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);

    if (field[row][col].type === CELL_TYPE.MINE) {
      continue;
    }

    field[row][col].type = CELL_TYPE.MINE;
    placedMines++;
  }

  return field;
}

function getNeighbors(field, row, col) {
  return NEIGHBOR_OFFSETS.map(([rowOffset, colOffset]) => [
    row + rowOffset,
    col + colOffset,
  ]).filter(
    ([neighborRow, neighborCol]) =>
      neighborRow >= 0 &&
      neighborRow < field.length &&
      neighborCol >= 0 &&
      neighborCol < field[neighborRow].length,
  );
}

function countNeighborMines(field) {
  field.forEach((line, row) => {
    line.forEach((cell, col) => {
      if (cell.type === CELL_TYPE.MINE) {
        return;
      }

      cell.neighborMines = getNeighbors(field, row, col).filter(
        ([neighborRow, neighborCol]) =>
          field[neighborRow][neighborCol].type === CELL_TYPE.MINE,
      ).length;
    });
  });
}

function createBoard(rows, cols, minesCount) {
  const field = generateField(rows, cols, minesCount);

  countNeighborMines(field);

  return field;
}

function revealCell(row, col) {
  const cell = board[row][col];

  if (cell.state !== CELL_STATE.CLOSED) {
    return;
  }

  cell.state = CELL_STATE.OPENED;

  if (cell.neighborMines === 0) {
    getNeighbors(board, row, col).forEach(([neighborRow, neighborCol]) =>
      revealCell(neighborRow, neighborCol),
    );
  }
}

function hasOpenedAllSafeCells() {
  return board
    .flat()
    .every(
      (cell) =>
        cell.type === CELL_TYPE.MINE || cell.state === CELL_STATE.OPENED,
    );
}

function flagAllMines() {
  board
    .flat()
    .filter((cell) => cell.type === CELL_TYPE.MINE)
    .forEach((cell) => {
      cell.state = CELL_STATE.FLAGGED;
    });
}

function endGame(status) {
  gameState.status = status;
  stopTimer();

  if (status === GAME_STATUS.WIN) {
    flagAllMines();
  }
}

function openCell(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) {
    return false;
  }

  const cell = board[row][col];

  if (cell.state !== CELL_STATE.CLOSED) {
    return false;
  }

  if (cell.type === CELL_TYPE.MINE) {
    cell.state = CELL_STATE.OPENED;
    endGame(GAME_STATUS.LOSE);
    return true;
  }

  revealCell(row, col);

  if (hasOpenedAllSafeCells()) {
    endGame(GAME_STATUS.WIN);
  }

  return true;
}

function countFlags() {
  return board.flat().filter((cell) => cell.state === CELL_STATE.FLAGGED)
    .length;
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
  } else if (countFlags() < gameState.minesCount) {
    cell.state = CELL_STATE.FLAGGED;
  }
}

function startTimer(onTick) {
  if (gameState.timerId !== null || gameState.status !== GAME_STATUS.PROCESS) {
    return;
  }

  gameState.startedAt = Date.now();
  gameState.timerId = setInterval(() => {
    const elapsed = Math.floor(
      (Date.now() - gameState.startedAt) / MS_IN_SECOND,
    );

    if (elapsed !== gameState.gameTime) {
      gameState.gameTime = elapsed;
      onTick();
    }
  }, TIMER_INTERVAL_MS);
}

function stopTimer() {
  clearInterval(gameState.timerId);
  gameState.timerId = null;
}

function resetGame() {
  stopTimer();

  gameState.status = GAME_STATUS.PROCESS;
  gameState.gameTime = 0;

  board = createBoard(gameState.rows, gameState.cols, gameState.minesCount);
}

const boardElement = document.getElementById('board');
const flagsCounterElement = document.querySelector(
  '#mines-counter .counter-value',
);
const timerElement = document.querySelector('#timer .counter-value');
const restartButton = document.getElementById('restart-btn');
const messageElement = document.getElementById('game-message');
const gameElement = document.querySelector('.game');

function formatCounter(value) {
  return String(value).padStart(COUNTER_DIGITS, '0');
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / SECONDS_IN_MINUTE);
  const seconds = totalSeconds % SECONDS_IN_MINUTE;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function setText(element, text) {
  if (element.textContent !== text) {
    element.textContent = text;
  }
}

function getCellView(cell) {
  const isGameOver = gameState.status !== GAME_STATUS.PROCESS;
  const isMine = cell.type === CELL_TYPE.MINE;

  if (cell.state === CELL_STATE.FLAGGED) {
    if (!isGameOver) {
      return { className: 'flagged', text: '', description: 'прапорець' };
    }

    return isMine
      ? {
          className: 'flagged mine',
          text: '',
          description: 'прапорець на міні',
        }
      : {
          className: 'flagged wrong-flag',
          text: '',
          description: 'помилковий прапорець',
        };
  }

  if (cell.state === CELL_STATE.OPENED) {
    if (isMine) {
      return {
        className: 'mine exploded',
        text: '',
        description: 'міна, що вибухнула',
      };
    }

    if (cell.neighborMines === 0) {
      return {
        className: 'opened',
        text: '',
        description: 'відкрита, порожня',
      };
    }

    return {
      className: `opened n${cell.neighborMines}`,
      text: String(cell.neighborMines),
      description: `відкрита, мін поруч: ${cell.neighborMines}`,
    };
  }

  if (isGameOver && isMine) {
    return { className: 'mine', text: '', description: 'міна' };
  }

  return { className: 'closed', text: '', description: 'закрита' };
}

function buildBoard() {
  const cellButtons = [];

  for (let row = 0; row < gameState.rows; row++) {
    for (let col = 0; col < gameState.cols; col++) {
      const button = document.createElement('button');

      button.type = 'button';
      button.dataset.row = row;
      button.dataset.col = col;
      cellButtons.push(button);
    }
  }

  boardElement.style.setProperty('--board-columns', gameState.cols);
  boardElement.replaceChildren(...cellButtons);
}

function updateCellButton(button, cell, row, col) {
  const { className, text, description } = getCellView(cell);

  button.className = `cell ${className}`;
  button.textContent = text;
  button.setAttribute(
    'aria-label',
    `Рядок ${row + 1}, стовпець ${col + 1}: ${description}`,
  );
}

function renderBoard() {
  board.forEach((line, row) => {
    line.forEach((cell, col) => {
      const button = boardElement.children[row * gameState.cols + col];

      updateCellButton(button, cell, row, col);
    });
  });
}

function renderTimer() {
  setText(timerElement, formatTime(gameState.gameTime));
}

function renderFlagsCounter() {
  setText(
    flagsCounterElement,
    formatCounter(gameState.minesCount - countFlags()),
  );
}

function renderMessage() {
  setText(messageElement, GAME_MESSAGE[gameState.status]);
  gameElement.dataset.status = gameState.status;
}

function render() {
  renderBoard();
  renderTimer();
  renderFlagsCounter();
  renderMessage();
}

function getCellPosition(event) {
  const cellElement = event.target.closest('.cell');

  if (cellElement === null) {
    return null;
  }

  return {
    row: Number(cellElement.dataset.row),
    col: Number(cellElement.dataset.col),
  };
}

function handleBoardClick(event) {
  const position = getCellPosition(event);

  if (position === null) {
    return;
  }

  const { row, col } = position;

  if (openCell(row, col)) {
    startTimer(renderTimer);
  }

  render();
}

function handleFlagAction(event) {
  const position = getCellPosition(event);

  if (position === null) {
    return;
  }

  toggleFlag(position.row, position.col);
  render();
}

function handleBoardContextMenu(event) {
  event.preventDefault();
  handleFlagAction(event);
}

function handleBoardKeydown(event) {
  if (event.code !== FLAG_KEY_CODE || event.repeat) {
    return;
  }

  handleFlagAction(event);
}

function startGame() {
  resetGame();
  buildBoard();
  render();
}

boardElement.addEventListener('click', handleBoardClick);
boardElement.addEventListener('contextmenu', handleBoardContextMenu);
boardElement.addEventListener('keydown', handleBoardKeydown);
restartButton.addEventListener('click', startGame);

startGame();
