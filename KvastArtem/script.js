const CELL_TYPE = { EMPTY: 'empty', MINE: 'mine' };
const CELL_STATE = { CLOSED: 'closed', OPENED: 'opened', FLAGGED: 'flagged' };
const GAME_STATUS = { PROCESS: 'process', WIN: 'win', LOSE: 'lose' };
const DEFAULT_SETTINGS = { ROWS: 10, COLS: 10, MINES_COUNT: 15 };
const TIMER_INTERVAL_MS = 1000;
const KEYBOARD_DIRECTIONS = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];
const NUMBER_CLASSES = [
  '', 'number-one', 'number-two', 'number-three', 'number-four',
  'number-five', 'number-six', 'number-seven', 'number-eight',
];
const STATUS_MESSAGES = {
  [GAME_STATUS.PROCESS]: 'Відкрийте всі безпечні клітинки. Обережно, міни!',
  [GAME_STATUS.WIN]: 'Перемога! Усі безпечні клітинки відкрито.',
  [GAME_STATUS.LOSE]: 'Ви натрапили на міну. Натисніть «Рестарт» і спробуйте ще раз.',
};
const STATUS_ICONS = {
  [GAME_STATUS.PROCESS]: '😃',
  [GAME_STATUS.WIN]: '😎',
  [GAME_STATUS.LOSE]: '😵',
};

const gameState = {
  rows: DEFAULT_SETTINGS.ROWS,
  cols: DEFAULT_SETTINGS.COLS,
  minesCount: DEFAULT_SETTINGS.MINES_COUNT,
  status: GAME_STATUS.PROCESS,
  gameTime: 0,
  timerId: null,
};
let board = [];

// Посилання на DOM зберігаються один раз, окремо від даних гри.
const elements = {
  board: document.querySelector('.board'),
  timer: document.querySelector('.timer'),
  flagCounter: document.querySelector('.flag-counter'),
  restart: document.querySelector('.restart-button'),
  restartIcon: document.querySelector('.restart-button [aria-hidden]'),
  message: document.querySelector('.game-message'),
};

function isInBounds(field, row, col) {

  return Number.isInteger(row) && Number.isInteger(col) &&
    row >= 0 && row < field.length && col >= 0 && col < field[row].length;
}


function getNeighbours(field, row, col) {

  return DIRECTIONS.map(([directionalRow, directionalCol]) => [
    row + directionalRow, col + directionalCol,
  ]).filter(([neighbourRow, neighbourCol]) =>
    isInBounds(field, neighbourRow, neighbourCol),
  );
}


function countFlags(field) {

  return field.flat().filter((cell) => cell.state === CELL_STATE.FLAGGED).length;
}


function checkWinCondition(field) {

  return field.every((cells) => cells.every((cell) =>
    cell.type === CELL_TYPE.MINE || cell.state === CELL_STATE.OPENED,
  ));
}


function generateField(rows, cols, minesCount) {
  const cellsCount = rows * cols;

  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows <= 0 ||
      cols <= 0 || !Number.isInteger(minesCount) || minesCount < 0 ||
      minesCount >= cellsCount) {
    throw new RangeError('Потрібні додатні розміри та від 0 до rows * cols - 1 мін.');
  }

  const field = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      type: CELL_TYPE.EMPTY,
      state: CELL_STATE.CLOSED,
      neighborMines: 0,
    })),
  );
  const positions = Array.from({ length: cellsCount }, (_, position) => position);

  // Часткове перемішування обирає унікальні позиції без повторних спроб.
  for (let mineIndex = 0; mineIndex < minesCount; mineIndex += 1) {
    const randomIndex = mineIndex + Math.floor(Math.random() * (cellsCount - mineIndex));

    [positions[mineIndex], positions[randomIndex]] =
      [positions[randomIndex], positions[mineIndex]];

    const row = Math.floor(positions[mineIndex] / cols);
    const col = positions[mineIndex] % cols;
    field[row][col].type = CELL_TYPE.MINE;
  }

  return field;
}


function countNeighbourMines(field) {
  field.forEach((cells, row) => cells.forEach((cell, col) => {
    if (cell.type === CELL_TYPE.MINE) {

      return;
    }

    cell.neighborMines = getNeighbours(field, row, col).filter(
      ([neighbourRow, neighbourCol]) =>
        field[neighbourRow][neighbourCol].type === CELL_TYPE.MINE,
    ).length;
  }));
}


function revealArea(field, row, col) {
  const cell = field[row][col];

  if (cell.state !== CELL_STATE.CLOSED || cell.type === CELL_TYPE.MINE) {

    return;
  }

  // Позначаємо клітинку до рекурсії, щоб не відвідувати її повторно.
  cell.state = CELL_STATE.OPENED;

  if (cell.neighborMines === 0) {
    getNeighbours(field, row, col).forEach(([neighbourRow, neighbourCol]) => {
      revealArea(field, neighbourRow, neighbourCol);
    });
  }
}


function stopTimer() {
  clearInterval(gameState.timerId);
  gameState.timerId = null;
}


function startTimer(onTick = () => {}) {
  if (gameState.timerId !== null || gameState.status !== GAME_STATUS.PROCESS) {

    return;
  }

  gameState.timerId = setInterval(() => {
    gameState.gameTime += 1;
    onTick();
  }, TIMER_INTERVAL_MS);
}


function finishGame(status) {
  gameState.status = status;
  stopTimer();
}


function openCell(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS || !isInBounds(board, row, col) ||
      board[row][col].state !== CELL_STATE.CLOSED) {

    return false;
  }

  if (board[row][col].type === CELL_TYPE.MINE) {
    board[row][col].state = CELL_STATE.OPENED;
    finishGame(GAME_STATUS.LOSE);

    return true;
  }

  revealArea(board, row, col);

  if (checkWinCondition(board)) {
    finishGame(GAME_STATUS.WIN);
  }

  return true;
}


function toggleFlag(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS || !isInBounds(board, row, col)) {

    return false;
  }

  const cell = board[row][col];

  if (cell.state === CELL_STATE.OPENED) {

    return false;
  }

  if (cell.state === CELL_STATE.FLAGGED) {
    cell.state = CELL_STATE.CLOSED;

    return true;
  }

  if (countFlags(board) >= gameState.minesCount) {

    return false;
  }

  cell.state = CELL_STATE.FLAGGED;

  return true;
}


function resetGame() {
  stopTimer();
  gameState.status = GAME_STATUS.PROCESS;
  gameState.gameTime = 0;
  board = generateField(gameState.rows, gameState.cols, gameState.minesCount);
  countNeighbourMines(board);
}


function renderTimer() {
  elements.timer.textContent = `${gameState.gameTime} с`;
  elements.timer.dateTime = `PT${gameState.gameTime}S`;
}


function renderCell(button, row, col) {
  const cell = board[row][col];
  const isFinished = gameState.status !== GAME_STATUS.PROCESS;
  const isMineVisible = gameState.status === GAME_STATUS.LOSE && cell.type === CELL_TYPE.MINE;
  let description = 'закрита';

  button.className = 'cell';
  button.textContent = '';
  button.disabled = isFinished;

  if (cell.state === CELL_STATE.FLAGGED) {
    button.classList.add('flag');
    description = 'прапорець';

    if (gameState.status === GAME_STATUS.LOSE) {
      button.classList.add(isMineVisible ? 'flagged-mine' : 'wrong-flag');
      description = isMineVisible ? 'правильно позначена міна' : 'помилковий прапорець';
    }
  } else if (isMineVisible) {
    button.classList.add(cell.state === CELL_STATE.OPENED ? 'exploded' : 'mine');
    description = 'міна';
  } else if (cell.state === CELL_STATE.OPENED) {
    button.classList.add('opened');
    description = `відкрита, мін поруч: ${cell.neighborMines}`;

    if (cell.neighborMines > 0) {
      button.classList.add(NUMBER_CLASSES[cell.neighborMines]);
      button.textContent = cell.neighborMines;
    }
  } else {
    button.classList.add('closed');
  }

  button.setAttribute('aria-label', `Рядок ${row + 1}, стовпець ${col + 1}: ${description}`);
}


function renderBoard() {
  elements.board.style.setProperty('--board-columns', gameState.cols);

  if (elements.board.children.length !== gameState.rows * gameState.cols) {
    const fragment = document.createDocumentFragment();

    board.forEach((cells, row) => {
      for (let col = 0; col < cells.length; col += 1) {
        const button = document.createElement('button');
        button.type = 'button';
        button.tabIndex = row === 0 && col === 0 ? 0 : -1;
        button.dataset.row = row;
        button.dataset.col = col;
        fragment.append(button);
      }
    });
    elements.board.replaceChildren(fragment);
  }

  // Оновлюємо існуючі кнопки, зберігаючи фокус клавіатури.
  Array.from(elements.board.children).forEach((button) => {
    renderCell(button, Number(button.dataset.row), Number(button.dataset.col));
  });
}


function renderStatus() {
  renderTimer();
  elements.flagCounter.textContent = gameState.minesCount - countFlags(board);
  elements.restartIcon.textContent = STATUS_ICONS[gameState.status];
  elements.message.textContent = STATUS_MESSAGES[gameState.status];
  elements.message.dataset.status = gameState.status;
}


function handleCellAction(event, action) {
  const button = event.target.closest('.cell');

  if (!button || !elements.board.contains(button)) {

    return;
  }

  const row = Number(button.dataset.row);
  const col = Number(button.dataset.col);

  if (action(row, col)) {
    startTimer(renderTimer);
    renderBoard();
    renderStatus();
  }
}


function setActiveCell(button) {
  if (!button.classList.contains('cell')) {

    return;
  }

  Array.from(elements.board.children).forEach((cellButton) => {
    cellButton.tabIndex = cellButton === button ? 0 : -1;
  });
}


function handleBoardKeydown(event) {
  const button = event.target.closest('.cell');

  if (!button || gameState.status !== GAME_STATUS.PROCESS) {

    return;
  }

  if (event.code === 'KeyF') {
    event.preventDefault();
    handleCellAction(event, toggleFlag);

    return;
  }

  const direction = KEYBOARD_DIRECTIONS[event.key];

  if (!direction) {

    return;
  }

  event.preventDefault();

  const [directionalRow, directionalCol] = direction;
  const row = Number(button.dataset.row) + directionalRow;
  const col = Number(button.dataset.col) + directionalCol;

  if (isInBounds(board, row, col)) {
    elements.board.children[row * gameState.cols + col].focus();
  }
}


function restartGame() {
  resetGame();
  renderBoard();
  setActiveCell(elements.board.firstElementChild);
  renderStatus();
}

elements.board.addEventListener('click', (event) => handleCellAction(event, openCell));
elements.board.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  handleCellAction(event, toggleFlag);
});
elements.board.addEventListener('keydown', handleBoardKeydown);
elements.board.addEventListener('focusin', (event) => setActiveCell(event.target));
elements.restart.addEventListener('click', restartGame);
window.addEventListener('pagehide', stopTimer);

restartGame();
