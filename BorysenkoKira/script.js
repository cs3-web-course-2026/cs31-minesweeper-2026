const gameState = { rows: 10, cols: 10, minesCount: 15, status: 'process', gameTime: 0, timerId: null, flagsUsed: 0 };
let field = [];

function generateField(rows, cols, minesCount) {
    field = [];
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) row.push({ type: 'empty', state: 'closed', neighborMines: 0 });
        field.push(row);
    }
    let placedMines = 0;
    while (placedMines < minesCount) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        if (field[r][c].type !== 'mine') { field[r][c].type = 'mine'; placedMines++; }
    }
}

function countNeighbourMines() {
    const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    for (let r = 0; r < gameState.rows; r++) {
        for (let c = 0; c < gameState.cols; c++) {
            if (field[r][c].type === 'mine') continue;
            let minesAround = 0;
            for (const [dr, dc] of directions) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < gameState.rows && nc >= 0 && nc < gameState.cols && field[nr][nc].type === 'mine') {
                    minesAround++;
                }
            }
            field[r][c].neighborMines = minesAround;
        }
    }
}

function openCell(r, c) {
    if (r < 0 || r >= gameState.rows || c < 0 || c >= gameState.cols) return;
    const cell = field[r][c];
    if (cell.state === 'opened' || cell.state === 'flagged' || gameState.status !== 'process') return;
    cell.state = 'opened';
    
    if (cell.type === 'mine') {
        gameState.status = 'lose';
        stopTimer();
        return;
    }
    
    if (cell.neighborMines === 0) {
        const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        for (const [dr, dc] of directions) openCell(r + dr, c + dc);
    }
}

function toggleFlag(r, c) {
    const cell = field[r][c];
    if (cell.state === 'opened' || gameState.status !== 'process') return;
    if (cell.state === 'closed') { cell.state = 'flagged'; gameState.flagsUsed++; }
    else if (cell.state === 'flagged') { cell.state = 'closed'; gameState.flagsUsed--; }
}

function startTimer() {
    stopTimer();
    gameState.gameTime = 0;
    gameState.timerId = setInterval(() => {
        if (gameState.status === 'process') { gameState.gameTime++; updateUI(); }
    }, 1000);
}

function stopTimer() {
    if (gameState.timerId) { clearInterval(gameState.timerId); gameState.timerId = null; }
}

function checkWinCondition() {
    if (gameState.status !== 'process') return;
    let closedEmptyCells = 0;
    for (let r = 0; r < gameState.rows; r++) {
        for (let c = 0; c < gameState.cols; c++) {
            if (field[r][c].type === 'empty' && field[r][c].state !== 'opened') closedEmptyCells++;
        }
    }
    if (closedEmptyCells === 0) {
        gameState.status = 'win';
        stopTimer();
        setTimeout(() => alert('Перемога! Всі безпечні клітинки знайдено.'), 100);
    }
}

const boardElement = document.querySelector('.game-board');
const flagsCounterUI = document.querySelectorAll('.counter')[0];
const timerUI = document.querySelectorAll('.counter')[1];
const restartBtn = document.querySelector('.btn-start');

function renderBoard() {
    if (!boardElement) return;
    boardElement.innerHTML = '';
    
    for (let r = 0; r < gameState.rows; r++) {
        for (let c = 0; c < gameState.cols; c++) {
            const cell = field[r][c];
            const btn = document.createElement('button');
            btn.className = 'cell';

            btn.addEventListener('click', () => {
                openCell(r, c);
                checkWinCondition();
                if (gameState.status === 'lose') revealAllMines();
                renderBoard();
                updateUI();
            });

            btn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                toggleFlag(r, c);
                renderBoard();
                updateUI();
            });

            if (cell.state === 'opened') {
                btn.classList.add('cell-open');
                if (cell.type === 'mine') {
                    btn.classList.add('cell-mine');
                    if (gameState.status === 'lose') btn.classList.add('cell-exploded');
                    btn.innerHTML = '<img class="icon" src="evil-minion.png" alt="Міна">';
                } else if (cell.neighborMines > 0) {
                    btn.textContent = cell.neighborMines;
                    btn.dataset.num = cell.neighborMines;
                }
            } else if (cell.state === 'flagged') {
                btn.classList.add('cell-flag');
                if (gameState.status === 'lose' && cell.type !== 'mine') btn.classList.add('cell-false-flag');
                btn.innerHTML = '<img class="icon" src="custom-flag.png" alt="Прапорець">';
            }
            boardElement.appendChild(btn);
        }
    }
}

function revealAllMines() {
    for (let r = 0; r < gameState.rows; r++) {
        for (let c = 0; c < gameState.cols; c++) {
            if (field[r][c].type === 'mine') field[r][c].state = 'opened';
        }
    }
}

function updateUI() {
    if (timerUI) timerUI.textContent = gameState.gameTime.toString().padStart(3, '0');
    const flagsLeft = gameState.minesCount - gameState.flagsUsed;
    if (flagsCounterUI) flagsCounterUI.textContent = flagsLeft.toString().padStart(3, '0');
}

function initGame() {
    gameState.status = 'process';
    gameState.flagsUsed = 0;
    generateField(gameState.rows, gameState.cols, gameState.minesCount);
    countNeighbourMines();
    startTimer();
    renderBoard();
    updateUI();
}

if (restartBtn) restartBtn.addEventListener('click', initGame);
initGame();