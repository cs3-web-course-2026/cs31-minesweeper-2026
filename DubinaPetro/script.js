"use strict";

// можливі стани гри
const GAME_STATUS = Object.freeze({
  PROCESS: "process",
  WIN: "win",
  LOSE: "lose",
});

// глобальний стан 
const gameState = {
  rows: 10,
  cols: 10,
  minesCount: 15,
  status: GAME_STATUS.PROCESS,
  gameTime: 0,
  timerId: null,
  explodedCell: null,
};

// двовимірний масив клітинок поточної гри
let board = [];

const boardElement = document.querySelector("#board");
const timerElement = document.querySelector("#timer");
const flagsCounterElement = document.querySelector("#flags-counter");
const restartButton = document.querySelector("#restart-button");
const faceElement = document.querySelector("#game-face");
const lossIndicatorElement = document.querySelector("#loss-indicator");
const winIndicatorElement = document.querySelector("#win-indicator");
const gameStatusElement = document.querySelector("#game-status");

const numberClasses = ["", "cell-one", "cell-two", "cell-three", "cell-four", "cell-five", "cell-six", "cell-seven", "cell-eight"];

// генерація поля з порожніми закритими клітинками та випадковими мінами
function generateField(rows, cols, minesCount) {
  const field = Array.from({ length: rows }, () => (
    Array.from({ length: cols }, () => ({
      type: "empty",
      neighborMines: 0,
      state: "closed",
    }))
  ));

  let placedMines = 0;

  while (placedMines < minesCount) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);
    const cell = field[row][col];

    if (cell.type === "mine") {
      continue;
    }

    cell.type = "mine";
    placedMines += 1;
  }

  countNeighbourMines(field, rows, cols);
  return field;
}

// повертає сусідні координати в межах переданого поля
function getNeighbours(row, col, rows, cols) {
  const neighbours = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      const neighbourRow = row + rowOffset;
      const neighbourCol = col + colOffset;
      const isSameCell = rowOffset === 0 && colOffset === 0;
      const isInsideField = neighbourRow >= 0 && neighbourRow < rows
        && neighbourCol >= 0 && neighbourCol < cols;

      if (!isSameCell && isInsideField) {
        neighbours.push([neighbourRow, neighbourCol]);
      }
    }
  }

  return neighbours;
}

//  міни навколо кожної безпечної клітинки
function countNeighbourMines(field, rows, cols) {
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (field[row][col].type === "mine") {
        continue;
      }

      let minesAround = 0;

      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
          const neighbour = field[row + rowOffset]?.[col + colOffset];

          if (neighbour?.type === "mine") {
            minesAround += 1;
          }
        }
      }

      field[row][col].neighborMines = minesAround;
    }
  }
}

// рекурсивно відкриває безпечні клітинки та область без сусідніх мін
function openCell(row, col) {
  const cell = board[row][col];

  if (gameState.status !== GAME_STATUS.PROCESS || cell.state === "opened" || cell.state === "flagged") {
    return;
  }

  cell.state = "opened";

  if (cell.type === "mine") {
    gameState.status = GAME_STATUS.LOSE;
    gameState.explodedCell = { row, col };
    finishGame();
    return;
  }

  if (cell.neighborMines === 0) {
    getNeighbours(row, col, gameState.rows, gameState.cols).forEach(([neighbourRow, neighbourCol]) => {
      openCell(neighbourRow, neighbourCol);
    });
  }
}

// стан прапорця 
function toggleFlag(row, col) {
  const cell = board[row][col];

  if (gameState.status !== GAME_STATUS.PROCESS || cell.state === "opened") {
    return;
  }

  if (cell.state === "flagged") {
    cell.state = "closed";
    return;
  }

  if (getFlagsCount(board) < gameState.minesCount) {
    cell.state = "flagged";
  }
}

// перевіряє на перемогу (безпечні клітинки відкриті/міни позначені або закриті)
function checkWin() {
  if (gameState.status !== GAME_STATUS.PROCESS) {
    return;
  }

  const isWinner = board.every((row) => (
    row.every((cell) => cell.type === "mine" || cell.state === "opened")
  ));

  if (isWinner) {
    gameState.status = GAME_STATUS.WIN;
    finishGame();
  }
}

// кінець гри, таймера 
function finishGame() {
  clearInterval(gameState.timerId);
  gameState.timerId = null;
}

//  кількість встановлених прапорців
function getFlagsCount(field) {
  return field.flat().filter((cell) => cell.state === "flagged").length;
}

// оновлення табла, кнопки та індкатора результату гри
function renderGameInfo() {
  const formatCounter = (value) => String(Math.min(value, 999)).padStart(3, "0");
  const flagsLeft = gameState.minesCount - getFlagsCount(board);
  const faceByStatus = {
    [GAME_STATUS.PROCESS]: "assets/verity.png",
    [GAME_STATUS.WIN]: "assets/winity.png",
    [GAME_STATUS.LOSE]: "assets/loseity.png",
  };
  const statusMessageByStatus = {
    [GAME_STATUS.PROCESS]: "",
    [GAME_STATUS.WIN]: "Перемога. Усі безпечні клітинки відкриті.",
    [GAME_STATUS.LOSE]: "Поразка. Ви натрапили на міну.",
  };

  timerElement.textContent = formatCounter(gameState.gameTime);
  timerElement.parentElement.setAttribute("aria-label", `Таймер: ${formatCounter(gameState.gameTime)}`);
  flagsCounterElement.textContent = formatCounter(flagsLeft);
  flagsCounterElement.parentElement.setAttribute("aria-label", `Доступні прапорці: ${formatCounter(flagsLeft)}`);
  faceElement.src = faceByStatus[gameState.status];
  lossIndicatorElement.classList.toggle("is-active", gameState.status === GAME_STATUS.LOSE);
  winIndicatorElement.classList.toggle("is-active", gameState.status === GAME_STATUS.WIN);
  gameStatusElement.textContent = statusMessageByStatus[gameState.status];
}

//  кнопка однієї клітинки відповідно до її стану
function createCellElement(cell, row, col) {
  const cellElement = document.createElement("button");
  const isExploded = gameState.explodedCell?.row === row && gameState.explodedCell?.col === col;
  const shouldRevealMine = gameState.status === GAME_STATUS.LOSE && cell.type === "mine";

  cellElement.type = "button";
  cellElement.className = "cell";
  cellElement.dataset.row = row;
  cellElement.dataset.col = col;
  cellElement.setAttribute("role", "gridcell");

  if (isExploded) {
    cellElement.classList.add("cell-mine", "cell-exploded");
    cellElement.setAttribute("aria-label", "Міна вибухнула");
  } else if (shouldRevealMine) {
    cellElement.classList.add("cell-open", "cell-mine");
    cellElement.setAttribute("aria-label", "Міна");
  } else if (cell.state === "flagged") {
    cellElement.classList.add("cell-flag");
    cellElement.setAttribute("aria-label", "Клітинка позначена прапорцем");
  } else if (cell.state === "opened") {
    cellElement.classList.add("cell-open");

    if (cell.neighborMines > 0) {
      cellElement.classList.add(numberClasses[cell.neighborMines]);
    }

    cellElement.textContent = cell.neighborMines || "";
    cellElement.setAttribute("aria-label", cell.neighborMines ? `Відкрита клітинка: ${cell.neighborMines}` : "Відкрита порожня клітинка");
  } else {
    cellElement.classList.add("cell-closed");
    cellElement.setAttribute("aria-label", "Закрита клітинка");
  }

  cellElement.disabled = gameState.status !== GAME_STATUS.PROCESS;
  return cellElement;
}

// оновлення поля після зміни 
function renderBoard() {
  const focusedCell = document.activeElement?.closest(".cell");
  const isFocusedGridCell = focusedCell && boardElement.contains(focusedCell);
  const focusedRow = isFocusedGridCell ? focusedCell.dataset.row : null;
  const focusedCol = isFocusedGridCell ? focusedCell.dataset.col : null;
  const cellsFragment = document.createDocumentFragment();
  boardElement.style.setProperty("--board-columns", gameState.cols);

  board.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      cellsFragment.append(createCellElement(cell, rowIndex, colIndex));
    });
  });

  boardElement.replaceChildren(cellsFragment);

  if (focusedRow !== null && focusedCol !== null) {
    boardElement.querySelector(`[data-row="${focusedRow}"][data-col="${focusedCol}"]`)?.focus();
  }
}

// синхрон рендеру та гри
function renderGame() {
  renderBoard();
  renderGameInfo();
}

//  відлік часу для нової гри
function startTimer() {
  gameState.timerId = setInterval(() => {
    gameState.gameTime += 1;
    renderGameInfo();
  }, 1000);
}

// запуск гри з новим полем / скидання таймера
function startGame() {
  clearInterval(gameState.timerId);
  gameState.status = GAME_STATUS.PROCESS;
  gameState.gameTime = 0;
  gameState.timerId = null;
  gameState.explodedCell = null;
  board = generateField(gameState.rows, gameState.cols, gameState.minesCount);
  renderGame();
  startTimer();
}

// відкриття клітинки лкм
boardElement.addEventListener("click", (event) => {
  const cellElement = event.target.closest(".cell");

  if (!cellElement) {
    return;
  }

  openCell(Number(cellElement.dataset.row), Number(cellElement.dataset.col));
  checkWin();
  renderGame();
});

// встановлення прапорця ПКМ
boardElement.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  const cellElement = event.target.closest(".cell");

  if (!cellElement) {
    return;
  }

  toggleFlag(Number(cellElement.dataset.row), Number(cellElement.dataset.col));
  renderGame();
});

restartButton.addEventListener("click", startGame);

startGame();
