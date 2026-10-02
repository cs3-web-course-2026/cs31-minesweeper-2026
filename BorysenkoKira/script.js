const CONFIG = {
    ROWS: 10,
    COLS: 10,
    MINES_COUNT: 15,
    TIMER_INTERVAL: 1000
};

const GAME_STATUS = {
    PROCESS: 'process',
    WIN: 'win',
    LOSE: 'lose'
};

const CELL_TYPE = {
    EMPTY: 'empty',
    MINE: 'mine'
};

const CELL_STATE = {
    CLOSED: 'closed',
    OPENED: 'opened',
    FLAGGED: 'flagged'
};

const gameState = { 
    rows: CONFIG.ROWS, 
    cols: CONFIG.COLS, 
    minesCount: CONFIG.MINES_COUNT, 
    status: GAME_STATUS.PROCESS, 
    gameTime: 0, 
    timerId: null, 
    flagsUsed: 0, 
    explodedCell: null 
};

let board = [];

function generateField(rows, cols, minesCount) {
    board = [];
    for (let row = 0; row < rows; row++) {
        const currentRow = [];
        for (let col = 0; col < cols; col++) {
            currentRow.push({ type: CELL_TYPE.EMPTY, state: CELL_STATE.CLOSED, neighborMines: 0 });
        }
        board.push(currentRow);
    }
    let placedMines = 0;
    while (placedMines < minesCount) {
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * cols);
        if (board[row][col].type !== CELL_TYPE.MINE) { 
            board[row][col].type = CELL_TYPE.MINE; 
            placedMines++; 
        }
    }
}

function countNeighbourMines() {
    const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            if (board[row][col].type === CELL_TYPE.MINE) continue;
            let minesAround = 0;
            for (const [rowOffset, colOffset] of directions) {
                const neighborRow = row + rowOffset;
                const neighborCol = col + colOffset;
                if (
                    neighborRow >= 0 && neighborRow < gameState.rows && 
                    neighborCol >= 0 && neighborCol < gameState.cols && 
                    board[neighborRow][neighborCol].type === CELL_TYPE.MINE
                ) {
                    minesAround++;
                }
            }
            board[row][col].neighborMines = minesAround;
        }
    }
}

function updateStatusMessage(message) {
    const statusElement = document.querySelector('.game-status');
    if (statusElement) statusElement.textContent = message;
}

function openCell(row, col) {
    if (row < 0 || row >= gameState.rows || col < 0 || col >= gameState.cols) return;
    const cell = board[row][col];
    if (cell.state === CELL_STATE.OPENED || cell.state === CELL_STATE.FLAGGED || gameState.status !== GAME_STATUS.PROCESS) return;
    cell.state = CELL_STATE.OPENED;
    
    if (cell.type === CELL_TYPE.MINE) {
        gameState.status = GAME_STATUS.LOSE;
        gameState.explodedCell = { row, col };
        stopTimer();
        updateStatusMessage('Поразка! Ви натрапили на міну.');
        return;
    }
    
    if (cell.neighborMines === 0) {
        const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        for (const [rowOffset, colOffset] of directions) {
            openCell(row + rowOffset, col + colOffset);
        }
    }
}

function toggleFlag(row, col) {
    const cell = board[row][col];
    if (cell.state === CELL_STATE.OPENED || gameState.status !== GAME_STATUS.PROCESS) return;
    if (cell.state === CELL_STATE.CLOSED) { 
        cell.state = CELL_STATE.FLAGGED; 
        gameState.flagsUsed++; 
    } else if (cell.state === CELL_STATE.FLAGGED) { 
        cell.state = CELL_STATE.CLOSED; 
        gameState.flagsUsed--; 
    }
}

function startTimer() {
    stopTimer();
    gameState.gameTime = 0;
    gameState.timerId = setInterval(() => {
        if (gameState.status === GAME_STATUS.PROCESS) { 
            gameState.gameTime++; 
            updateUI(); 
        }
    }, CONFIG.TIMER_INTERVAL);
}

function stopTimer() {
    if (gameState.timerId) { 
        clearInterval(gameState.timerId); 
        gameState.timerId = null; 
    }
}

function checkWinCondition() {
    if (gameState.status !== GAME_STATUS.PROCESS) return;
    let closedEmptyCells = 0;
    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            if (board[row][col].type === CELL_TYPE.EMPTY && board[row][col].state !== CELL_STATE.OPENED) {
                closedEmptyCells++;
            }
        }
    }
    if (closedEmptyCells === 0) {
        gameState.status = GAME_STATUS.WIN;
        stopTimer();
        updateStatusMessage('Перемога! Всі безпечні клітинки знайдено.');
    }
}

const boardElement = document.querySelector('.game-board');
const flagsCounterUI = document.querySelectorAll('.counter')[0];
const timerUI = document.querySelectorAll('.counter')[1];
const restartButton = document.querySelector('.btn-start');

function renderBoard() {
    if (!boardElement) return;
    boardElement.innerHTML = '';
    
    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            const cell = board[row][col];
            const cellButton = document.createElement('button');
            cellButton.className = 'cell';

            cellButton.setAttribute(
                'aria-label',
                `Рядок ${row + 1}, стовпець ${col + 1}: ${cell.state}` +
                (cell.state === CELL_STATE.OPENED
                    ? `, ${cell.type === CELL_TYPE.MINE ? 'міна' : `сусідніх мін: ${cell.neighborMines}`}`
                    : '')
            );

            cellButton.addEventListener('click', () => {
                openCell(row, col);
                checkWinCondition();
                if (gameState.status === GAME_STATUS.LOSE) revealAllMines();
                renderBoard();
                updateUI();
            });

            cellButton.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                toggleFlag(row, col);
                renderBoard();
                updateUI();
            });

            if (cell.state === CELL_STATE.OPENED) {
                cellButton.classList.add('cell-open');
                if (cell.type === CELL_TYPE.MINE) {
                    cellButton.classList.add('cell-mine');
                    if (gameState.status === GAME_STATUS.LOSE && gameState.explodedCell?.row === row && gameState.explodedCell?.col === col) {
                        cellButton.classList.add('cell-exploded');
                    }
                    cellButton.innerHTML = '<img class="icon" src="evil-minion.png" alt="Міна">';
                } else if (cell.neighborMines > 0) {
                    cellButton.textContent = cell.neighborMines;
                    cellButton.dataset.num = cell.neighborMines;
                }
            } else if (cell.state === CELL_STATE.FLAGGED) {
                cellButton.classList.add('cell-flag');
                if (gameState.status === GAME_STATUS.LOSE && cell.type !== CELL_TYPE.MINE) {
                    cellButton.classList.add('cell-false-flag');
                }
                cellButton.innerHTML = '<img class="icon" src="custom-flag.png" alt="Прапорець">';
            }
            boardElement.appendChild(cellButton);
        }
    }
}

function revealAllMines() {
    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            if (board[row][col].type === CELL_TYPE.MINE) {
                board[row][col].state = CELL_STATE.OPENED;
            }
        }
    }
}

function updateUI() {
    if (timerUI) timerUI.textContent = gameState.gameTime.toString().padStart(3, '0');
    const flagsLeft = gameState.minesCount - gameState.flagsUsed;
    if (flagsCounterUI) flagsCounterUI.textContent = flagsLeft.toString().padStart(3, '0');
}

function initGame() {
    gameState.status = GAME_STATUS.PROCESS;
    gameState.flagsUsed = 0;
    gameState.explodedCell = null;
    updateStatusMessage('');
    generateField(gameState.rows, gameState.cols, gameState.minesCount);
    countNeighbourMines();
    startTimer();
    renderBoard();
    updateUI();
}

if (restartButton) restartButton.addEventListener('click', initGame);
initGame();