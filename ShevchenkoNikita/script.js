const BOARD_SIZE = 16;
const MINES_COUNT = 40;
let isGameOver = false;
let flagsCount = 0;
let timer = 0;
let timerId;
let gameStarted = false;

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

function createBoard() {
  const board = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    const row = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      const cell = {
        mine: false,
        opened: false,
        flag: false,
        number: null,
        x,
        y,
      };
      row.push(cell);
    }
    board.push(row);
  }

  return board;
}

function placeMines(minesNumber, board) {
  const boardSize = board.length;
  let minesAdded = 0;

  while (minesAdded < minesNumber) {
    const minePosition = {
      x: Math.floor(Math.random() * boardSize),
      y: Math.floor(Math.random() * boardSize),
    };

    const mineElement = board[minePosition.y][minePosition.x];
    if (mineElement.mine === false) {
      mineElement.mine = true;
      minesAdded++;
    }
  }
}

function calculateNumbers(board) {
  const boardSize = board.length;

  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      let minesNeighbours = 0;
      const cell = board[y][x];

      if (!cell.mine) {
        for (const neighbourDirection of neighboursDirections) {
          const neighbourX = x + neighbourDirection[0];
          const neighbourY = y + neighbourDirection[1];

          if (
            neighbourX >= 0 &&
            neighbourX < boardSize &&
            neighbourY >= 0 &&
            neighbourY < boardSize
          ) {
            if (board[neighbourY][neighbourX].mine) {
              minesNeighbours++;
            }
          }
        }
        board[y][x].number = minesNeighbours;
      }
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
  const smileEl = document.querySelector(
    '.start-game-button-container img'
  );

  smileEl.src = './assets/images/smile_default.png';
}

function endGame(win, board) {
  isGameOver = true;
  if (win) {
    alert('You win!');
  } else {
    alert('You lost!');
  }

  showAllMines(board);
  putFlagsAfterGame(board);
  setSmile(win);
  endTimer();
}

function putFlagsAfterGame(board) {
  const boardSize = board.length;
  for (let x = 0; x < boardSize; x++) {
    for (let y = 0; y < boardSize; y++) {
      const cell = board[y][x];
      if (cell.flag) {
        if (cell.mine) {
          cell.element.classList.add('flagged-mine');
        } else {
          cell.element.classList.add('flagged-safe');
        }
      }
    }
  }
}

function checkWin(board, minesCount) {
  const boardSize = board.length;
  let openedSafeCells = 0;

  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      const cell = board[y][x];
      if (cell.opened && !cell.mine) {
        openedSafeCells++;
      }
    }
  }

  if (openedSafeCells === boardSize * boardSize - minesCount) {
    endGame(true, board);
  }
}

function explodeMine(cell, gameBoard) {
  cell.opened = true;
  const cellEl = cell.element;
  cellEl.classList.remove('closed');
  cellEl.classList.add('mine', 'exploded');

  addMineImage(cellEl);
  endGame(false, gameBoard);
}

function setFlag(cell, minesCount) {
  if (cell.opened || isGameOver) {
    return;
  }

  const cellEl = cell.element;
  if (!cell.flag) {
    if (flagsCount === minesCount) {
      return;
    }

    cell.flag = true;
    flagsCount++;
    cellEl.classList.add('flag');
    addFlagImage(cellEl);
    updateMinesCounter();
  } else {
    cell.flag = false;
    flagsCount--;
    cellEl.classList.remove('flag');
    const flagImg = cellEl.querySelector('img');
    flagImg.remove();
    updateMinesCounter();
  }
}

function openCell(cell, gameBoard) {
  if (cell.flag || cell.opened) {
    return;
  }

  cell.opened = true;
  const cellEl = cell.element;
  cellEl.classList.remove('closed');
  cellEl.classList.add('opened');

  const cellNumber = cell.number;
  if (cellNumber > 0) {
    const numberClassName = 'number-'.concat(cell.number);
    cellEl.classList.add(numberClassName);
    cellEl.textContent = cellNumber;
  }

  if (cell.number === 0) {
    const boardSize = gameBoard.length;

    for (const neighbourDirection of neighboursDirections) {
      const neighbourX = cell.x + neighbourDirection[0];
      const neighbourY = cell.y + neighbourDirection[1];

      if (
        neighbourX >= 0 &&
        neighbourX < boardSize &&
        neighbourY >= 0 &&
        neighbourY < boardSize
      ) {
        const neighbourCell = gameBoard[neighbourY][neighbourX];
        if (!neighbourCell.opened && !neighbourCell.flag) {
          openCell(neighbourCell, gameBoard);
        }
      }
    }
  }
  return;
}

function renderCell(cell, gameBoard, minesCount) {
  const cellEl = document.createElement('div');
  cell.element = cellEl;
  cellEl.className = 'cell';
  cellEl.classList.add('closed');

  if (cell.opened) {
    cellEl.textContent = cell.number;
  }

  cellEl.addEventListener('click', () => {
    if (isGameOver) {
      return;
    }

    if(!gameStarted){
      gameStarted = true;
      startTimer();
    }

    if (cell.mine) {
      explodeMine(cell, gameBoard);
      return;
    }

    openCell(cell, gameBoard);
    checkWin(gameBoard, minesCount);
  });

  cellEl.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    setFlag(cell, minesCount);
  });

  return cellEl;
}

function showAllMines(board) {
  const boardSize = board.length;
  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      const cell = board[y][x];
      if (cell.mine) {
        cell.opened = true;
        const cellEl = cell.element;
        if (!cellEl.querySelector('img')) {
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

function renderBoard(board, minesCount) {
  const gameBoard = document.querySelector('.game-board');
  const boardSize = board.length;

  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      const cell = board[y][x];
      const cellEl = renderCell(cell, board, minesCount);
      gameBoard.appendChild(cellEl);
    }
  }
}

function startTimer() {
  const timerEl = document.querySelector('.timer-container');

  timerId = setInterval(() => {
    timer++;
    timerEl.textContent = String(timer).padStart(3, '0');
  }, 1000);
}

function endTimer() {
  clearInterval(timerId);
  const timerEl = document.querySelector('.timer-container');
  timer = 0;
  timerEl.textContent = '000';
}

function updateMinesCounter() {
  const minesCounterContainer = document.querySelector(
    '.mines-counter-container',
  );
  const minesLeft = MINES_COUNT - flagsCount;
  minesCounterContainer.textContent = String(minesLeft).padStart(3, '0');
}

function startGame() {
  const gameBoard = document.querySelector('.game-board');
  gameBoard.innerHTML = '';
  endTimer();

  isGameOver = false;
  const board = createBoard();
  flagsCount = 0;
  gameStarted = false;

  resetSmile();
  updateMinesCounter();
  placeMines(MINES_COUNT, board);
  calculateNumbers(board);
  renderBoard(board, MINES_COUNT);
}

startGame();
const restartButton = document.querySelector(
  '.start-game-button-container button',
);
restartButton.addEventListener('click', () => startGame());
