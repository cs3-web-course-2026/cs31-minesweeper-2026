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

const NEIGHBOUR_OFFSETS = [
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
    neighbourMines: 0,
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

function getNeighbours(field, row, col) {
  return NEIGHBOUR_OFFSETS.map(([rowOffset, colOffset]) => [
    row + rowOffset,
    col + colOffset,
  ]).filter(
    ([neighbourRow, neighbourCol]) =>
      neighbourRow >= 0 &&
      neighbourRow < field.length &&
      neighbourCol >= 0 &&
      neighbourCol < field[neighbourRow].length,
  );
}

function countNeighbourMines(field) {
  field.forEach((line, row) => {
    line.forEach((cell, col) => {
      if (cell.type === CELL_TYPE.MINE) {
        return;
      }

      cell.neighbourMines = getNeighbours(field, row, col).filter(
        ([neighbourRow, neighbourCol]) =>
          field[neighbourRow][neighbourCol].type === CELL_TYPE.MINE,
      ).length;
    });
  });
}

function revealCell(row, col) {
  const cell = board[row][col];

  if (cell.state !== CELL_STATE.CLOSED) {
    return;
  }

  cell.state = CELL_STATE.OPENED;

  if (cell.neighbourMines === 0) {
    getNeighbours(board, row, col).forEach(([neighbourRow, neighbourCol]) =>
      revealCell(neighbourRow, neighbourCol),
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
    return;
  }

  const cell = board[row][col];

  if (cell.state !== CELL_STATE.CLOSED) {
    return;
  }

  if (cell.type === CELL_TYPE.MINE) {
    cell.state = CELL_STATE.OPENED;
    endGame(GAME_STATUS.LOSE);
    return;
  }

  revealCell(row, col);

  if (hasOpenedAllSafeCells()) {
    endGame(GAME_STATUS.WIN);
  }
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

function startNewGame() {
  stopTimer();

  gameState.status = GAME_STATUS.PROCESS;
  gameState.gameTime = 0;

  board = generateField(gameState.rows, gameState.cols, gameState.minesCount);
  countNeighbourMines(board);
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

    if (cell.neighbourMines === 0) {
      return {
        className: 'opened',
        text: '',
        description: 'відкрита, порожня',
      };
    }

    return {
      className: `opened n${cell.neighbourMines}`,
      text: String(cell.neighbourMines),
      description: `відкрита, мін поруч: ${cell.neighbourMines}`,
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

  if (board[row][col].state === CELL_STATE.CLOSED) {
    startTimer(renderTimer);
  }

  openCell(row, col);
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

function handleRestart() {
  startNewGame();
  buildBoard();
  render();
}

boardElement.addEventListener('click', handleBoardClick);
boardElement.addEventListener('contextmenu', handleBoardContextMenu);
boardElement.addEventListener('keydown', handleBoardKeydown);
restartButton.addEventListener('click', handleRestart);

handleRestart();
