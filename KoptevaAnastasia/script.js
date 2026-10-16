'use strict';

const ROWS = 10;
const COLS = 10;
const MINES_COUNT = 15;
const SECOND = 1000;

const GAME_STATUS = {
  PROCESS: 'process',
  WIN: 'win',
  LOSE: 'lose',
};

const CELL_TYPE = {
  EMPTY: 'empty',
  MINE: 'mine',
};

const CELL_STATE = {
  CLOSED: 'closed',
  OPENED: 'opened',
  FLAGGED: 'flagged',
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

const gameState = {
  rows: ROWS,
  cols: COLS,
  minesCount: MINES_COUNT,
  status: GAME_STATUS.PROCESS,
  gameTime: 0,
  timerId: null,
  explodedCell: null, 
};

let board = [];

function createCell() {
  return {
    type: CELL_TYPE.EMPTY,
    neighborMines: 0,
    state: CELL_STATE.CLOSED,
  };
}

function createEmptyBoard(rows, cols) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, createCell)
  );
}

function plantMines(targetBoard, minesCount) {
  const rows = targetBoard.length;
  const cols = targetBoard[0].length;
  let planted = 0;

  while (planted < minesCount) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);
    const cell = targetBoard[row][col];

    if (cell.type !== CELL_TYPE.MINE) {
      cell.type = CELL_TYPE.MINE;
      planted += 1;
    }
  }
}

function isInsideBoard(targetBoard, row, col) {
  return (
    row >= 0 &&
    row < targetBoard.length &&
    col >= 0 &&
    col < targetBoard[row].length
  );
}

function forEachNeighbour(targetBoard, row, col, callback) {
  NEIGHBOUR_OFFSETS.forEach(([rowOffset, colOffset]) => {
    const neighbourRow = row + rowOffset;
    const neighbourCol = col + colOffset;

    if (isInsideBoard(targetBoard, neighbourRow, neighbourCol)) {
      callback(neighbourRow, neighbourCol);
    }
  });
}

function countNeighbourMines(targetBoard) {
  targetBoard.forEach((rowCells, row) => {
    rowCells.forEach((cell, col) => {
      if (cell.type === CELL_TYPE.MINE) {
        return;
      }

      let mines = 0;
      forEachNeighbour(targetBoard, row, col, (neighbourRow, neighbourCol) => {
        if (targetBoard[neighbourRow][neighbourCol].type === CELL_TYPE.MINE) {
          mines += 1;
        }
      });

      cell.neighborMines = mines;
    });
  });
}

function generateField(rows, cols, minesCount) {
  const newBoard = createEmptyBoard(rows, cols);

  plantMines(newBoard, minesCount);
  countNeighbourMines(newBoard);

  return newBoard;
}

function countFlags() {
  return board.flat().filter((cell) => cell.state === CELL_STATE.FLAGGED)
    .length;
}

function isBoardCleared() {
  return board
    .flat()
    .every(
      (cell) =>
        cell.type === CELL_TYPE.MINE || cell.state === CELL_STATE.OPENED
    );
}

function revealMines() {
  board.flat().forEach((cell) => {
    if (cell.type === CELL_TYPE.MINE && cell.state !== CELL_STATE.FLAGGED) {
      cell.state = CELL_STATE.OPENED;
    }
  });
}

function revealFrom(row, col) {
  const cell = board[row][col];

  if (cell.state !== CELL_STATE.CLOSED) {
    return;
  }

  cell.state = CELL_STATE.OPENED;

  if (cell.neighborMines === 0) {
    forEachNeighbour(board, row, col, revealFrom);
  }
}

function finishGame(status) {
  gameState.status = status;
  stopTimer();

  if (status === GAME_STATUS.LOSE) {
    revealMines();
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
    gameState.explodedCell = { row, col };
    finishGame(GAME_STATUS.LOSE);
    return;
  }

  revealFrom(row, col);

  if (isBoardCleared()) {
    finishGame(GAME_STATUS.WIN);
  }
}

function toggleFlag(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) {
    return;
  }

  const cell = board[row][col];

  if (cell.state === CELL_STATE.OPENED) {
    return;
  }

  cell.state =
    cell.state === CELL_STATE.FLAGGED ? CELL_STATE.CLOSED : CELL_STATE.FLAGGED;
}

function stopTimer() {
  clearInterval(gameState.timerId);
  gameState.timerId = null;
}

function startTimer() {
  if (gameState.timerId !== null) {
    return;
  }

  gameState.timerId = setInterval(() => {
    gameState.gameTime += 1;
    renderHeader();
  }, SECOND);
}

const boardElement = document.querySelector('#board');
const timerElement = document.querySelector('#timer');
const flagsElement = document.querySelector('#flags-count');
const messageElement = document.querySelector('#game-message');
const restartButton = document.querySelector('#restart-btn');

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function isExplodedCell(row, col) {
  const exploded = gameState.explodedCell;

  return exploded !== null && exploded.row === row && exploded.col === col;
}

function getCellClasses(cell, row, col) {
  const classes = ['cell'];

  if (cell.state === CELL_STATE.FLAGGED) {
    const isWrongFlag =
      gameState.status === GAME_STATUS.LOSE && cell.type !== CELL_TYPE.MINE;

    classes.push(isWrongFlag ? 'cell-flagged-wrong' : 'cell-flagged');
    return classes;
  }

  if (cell.state === CELL_STATE.CLOSED) {
    classes.push('cell-closed');
    return classes;
  }

  if (cell.type === CELL_TYPE.MINE) {
    classes.push('cell-mine');

    if (isExplodedCell(row, col)) {
      classes.push('cell-exploded');
    }

    return classes;
  }

  classes.push('cell-open');
  return classes;
}

function getCellContent(cell) {
  if (cell.state === CELL_STATE.FLAGGED) {
    return '🏳️';
  }

  if (cell.state !== CELL_STATE.OPENED) {
    return '';
  }

  if (cell.type === CELL_TYPE.MINE) {
    return '💣';
  }

  return cell.neighborMines > 0 ? String(cell.neighborMines) : '';
}

function getCellLabel(cell, row, col) {
  const position = `Cell ${row + 1}, ${col + 1}`;

  if (cell.state === CELL_STATE.CLOSED) {
    return `${position}: closed`;
  }

  if (cell.state === CELL_STATE.FLAGGED) {
    return `${position}: flagged`;
  }

  if (cell.type === CELL_TYPE.MINE) {
    return `${position}: mine`;
  }

  if (cell.neighborMines === 0) {
    return `${position}: open, no mines nearby`;
  }

  return `${position}: open, ${cell.neighborMines} mines nearby`;
}

function createCellElement(cell, row, col) {
  const button = document.createElement('button');

  button.type = 'button';
  button.className = getCellClasses(cell, row, col).join(' ');
  button.textContent = getCellContent(cell);
  button.dataset.row = String(row);
  button.dataset.col = String(col);
  button.setAttribute('aria-label', getCellLabel(cell, row, col));

  if (cell.state === CELL_STATE.OPENED && cell.neighborMines > 0) {
    button.dataset.count = String(cell.neighborMines);
  }

  return button;
}

function getFocusedPosition() {
  const active = document.activeElement;

  if (!active || !boardElement.contains(active)) {
    return null;
  }

  return { row: Number(active.dataset.row), col: Number(active.dataset.col) };
}

function restoreFocus(position) {
  if (!position) {
    return;
  }

  const target = boardElement.querySelector(
    `.cell[data-row="${position.row}"][data-col="${position.col}"]`
  );

  if (target) {
    target.focus({ preventScroll: true });
  }
}

function renderBoard() {
  const focusedPosition = getFocusedPosition();
  const fragment = document.createDocumentFragment();

  board.forEach((rowCells, row) => {
    rowCells.forEach((cell, col) => {
      fragment.append(createCellElement(cell, row, col));
    });
  });

  boardElement.replaceChildren(fragment);
  restoreFocus(focusedPosition);
}

function renderHeader() {
  timerElement.textContent = formatTime(gameState.gameTime);
  flagsElement.textContent = String(gameState.minesCount - countFlags());
}

function renderMessage() {
  const messages = {
    [GAME_STATUS.WIN]: 'You win!',
    [GAME_STATUS.LOSE]: 'Game over',
  };

  messageElement.textContent = messages[gameState.status] ?? '';
}

function render() {
  renderBoard();
  renderHeader();
  renderMessage();
}

function getCellPosition(event) {
  const cellElement = event.target.closest('.cell');

  if (!cellElement || !boardElement.contains(cellElement)) {
    return null;
  }

  return {
    row: Number(cellElement.dataset.row),
    col: Number(cellElement.dataset.col),
  };
}

function handleBoardClick(event) {
  const position = getCellPosition(event);

  if (!position || gameState.status !== GAME_STATUS.PROCESS) {
    return;
  }

  startTimer();
  openCell(position.row, position.col);
  render();
}

function handleBoardContextMenu(event) {
  event.preventDefault();

  const position = getCellPosition(event);

  if (!position || gameState.status !== GAME_STATUS.PROCESS) {
    return;
  }

  startTimer();
  toggleFlag(position.row, position.col);
  render();
}

function startGame() {
  stopTimer();

  gameState.status = GAME_STATUS.PROCESS;
  gameState.gameTime = 0;
  gameState.explodedCell = null;
  board = generateField(gameState.rows, gameState.cols, gameState.minesCount);

  render();
}

boardElement.style.setProperty('--board-cols', String(COLS));
boardElement.addEventListener('click', handleBoardClick);
boardElement.addEventListener('contextmenu', handleBoardContextMenu);
restartButton.addEventListener('click', startGame);

startGame();