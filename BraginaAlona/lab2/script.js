'use strict';

const gameState = {
    rows: 10,
    cols: 10,
    minesCount: 15,
    status: 'process',
    gameTime: 0,
    timerId: null,
    field: [],
    flagsCount: 0,
    started: false
};

const board = document.getElementById('board');
const timer = document.getElementById('timer');
const flags = document.getElementById('flags');
const message = document.getElementById('message');
const newGameButton = document.getElementById('new-game');

function generateField(rows, cols, minesCount) {
    const field = [];

    for (let row = 0; row < rows; row++) {
        const line = [];

        for (let col = 0; col < cols; col++) {
            line.push({
                type: 'empty',
                state: 'closed',
                neighborMines: 0,
                exploded: false,
                wrongFlag: false
            });
        }

        field.push(line);
    }

    let placedMines = 0;

    while (placedMines < minesCount) {
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * cols);

        if (field[row][col].type === 'empty') {
            field[row][col].type = 'mine';
            placedMines++;
        }
    }

    return field;
}

// Підрахeyjr мін навколо кожної безпечної клітинки
function countNeighbourMines() {
    const field = gameState.field;

    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            const cell = field[row][col];

            if (cell.type === 'mine') {
                continue;
            }

            let count = 0;

            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) {
                        continue;
                    }

                    const r = row + dr;
                    const c = col + dc;

                    if (
                        r >= 0 &&
                        r < gameState.rows &&
                        c >= 0 &&
                        c < gameState.cols &&
                        field[r][c].type === 'mine'
                    ) {
                        count++;
                    }
                }
            }

            cell.neighborMines = count;
        }
    }
}

// Запуск таймеру
function startTimer() {
    if (gameState.started || gameState.status !== 'process') {
        return;
    }

    gameState.started = true;

    gameState.timerId = setInterval(function () {
        gameState.gameTime++;

        const minutes = Math.floor(gameState.gameTime / 60);
        const seconds = gameState.gameTime % 60;

        timer.textContent =
            String(minutes).padStart(2, '0') + ':' +
            String(seconds).padStart(2, '0');
    }, 1000);
}

// Зупинка таймеру
function stopTimer() {
    if (gameState.timerId !== null) {
        clearInterval(gameState.timerId);
        gameState.timerId = null;
    }
}

// Оновлює кількість прапорців, які ще можна поставити
function updateFlags() {
    flags.textContent = gameState.minesCount - gameState.flagsCount;
}

// Створення HTML-клітинки відповідно до її стану
function createCell(row, col) {
    const cell = gameState.field[row][col];
    const button = document.createElement('button');

    button.type = 'button';
    button.classList.add('cell');
    button.dataset.row = row;
    button.dataset.col = col;
    button.setAttribute('role', 'gridcell');

    if (cell.state === 'opened') {
        button.classList.add('cell-open');

        if (cell.type === 'mine') {
            button.textContent = '✹';

            if (cell.exploded) {
                button.classList.add('cell-exploded');
                button.setAttribute('aria-label', 'Натиснута міна');
            } else {
                button.classList.add('cell-mine');
                button.setAttribute('aria-label', 'Міна');
            }
        } else if (cell.neighborMines > 0) {
            button.textContent = cell.neighborMines;
            button.classList.add(
                'cell-number-' + cell.neighborMines
            );

            button.setAttribute(
                'aria-label',
                'Відкрита клітинка, число ' + cell.neighborMines
            );
        } else {
            button.setAttribute(
                'aria-label',
                'Відкрита порожня клітинка'
            );
        }
    } else if (cell.state === 'flagged') {
        button.classList.add('cell-flagged');
        button.textContent = '⚑';
        button.setAttribute('aria-label', 'Прапорець');
    } else {
        button.classList.add('cell-closed');
        button.setAttribute('aria-label', 'Закрита клітинка');
    }

    if (cell.wrongFlag) {
        button.classList.add('cell-wrong');
        button.textContent = '✕';
        button.setAttribute('aria-label', 'Неправильний прапорець');
    }

    button.setAttribute(
        'aria-pressed',
        cell.state === 'opened' ? 'true' : 'false'
    );

    return button;
}

// Оновлює ігрове поле на сторінці
function renderField() {
    const fragment = document.createDocumentFragment();

    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            fragment.appendChild(createCell(row, col));
        }
    }

    board.replaceChildren(fragment);
    updateFlags();
}

// Відкриває клітинку та, за потреби, її сусідів
function openCell(row, col) {
    if (gameState.status !== 'process') {
        return;
    }

    const cell = gameState.field[row][col];

    if (cell.state === 'opened' || cell.state === 'flagged') {
        return;
    }

    startTimer();

    if (cell.type === 'mine') {
        cell.state = 'opened';
        cell.exploded = true;

        finishGame('lose');
        return;
    }

    revealCell(row, col);

    if (checkWin()) {
        finishGame('win');
        return;
    }

    renderField();
}

// Рекурсивно відкриває безпечні сусідні клітинки
function revealCell(row, col) {
    if (
        row < 0 ||
        row >= gameState.rows ||
        col < 0 ||
        col >= gameState.cols
    ) {
        return;
    }

    const cell = gameState.field[row][col];

    if (cell.state !== 'closed' || cell.type === 'mine') {
        return;
    }

    cell.state = 'opened';

    // Якщо навколо немає мін, відкриваємо сусідів
    if (cell.neighborMines === 0) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) {
                    continue;
                }

                revealCell(row + dr, col + dc);
            }
        }
    }
}

// Ставить або знімає прапорець.
function toggleFlag(row, col) {
    if (gameState.status !== 'process') {
        return;
    }

    const cell = gameState.field[row][col];

    if (cell.state === 'opened') {
        return;
    }

    if (cell.state === 'closed') {
        if (gameState.flagsCount >= gameState.minesCount) {
            return;
        }

        cell.state = 'flagged';
        gameState.flagsCount++;
    } else if (cell.state === 'flagged') {
        cell.state = 'closed';
        gameState.flagsCount--;
    }

    renderField();
}

function checkWin() {
    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            const cell = gameState.field[row][col];

            if (cell.type !== 'mine' && cell.state !== 'opened') {
                return false;
            }
        }
    }

    return true;
}

function finishGame(result) {
    gameState.status = result;
    stopTimer();

    if (result === 'win') {
        message.textContent = 'Перемога! Усі безпечні клітинки відкрито.';
        message.className = 'game-message win';
    } else {
        message.textContent = 'Бум! Міна! Спробуй ще раз)';
        message.className = 'game-message lose';
    }

    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            const cell = gameState.field[row][col];

            if (cell.type === 'mine') {
                if (cell.state !== 'flagged') {
                    cell.state = 'opened';
                }
            } else if (cell.state === 'flagged') {
                cell.wrongFlag = true;
                cell.state = 'closed';

                gameState.flagsCount--;
            }
            
        }
    }

    renderField();
}

function newGame() {
    stopTimer();

    gameState.status = 'process';
    gameState.gameTime = 0;
    gameState.flagsCount = 0;
    gameState.started = false;

    timer.textContent = '00:00';
    message.textContent = 'Зроби перший хід.';
    message.className = 'game-message';

    gameState.field = generateField(
        gameState.rows,
        gameState.cols,
        gameState.minesCount
    );

    countNeighbourMines();
    renderField();
}

board.addEventListener('click', function (event) {
    const button = event.target.closest('button.cell');

    if (!button || !board.contains(button)) {
        return;
    }

    const row = Number(button.dataset.row);
    const col = Number(button.dataset.col);

    openCell(row, col);
});

board.addEventListener('contextmenu', function (event) {
    const button = event.target.closest('button.cell');

    if (!button || !board.contains(button)) {
        return;
    }

    event.preventDefault();

    const row = Number(button.dataset.row);
    const col = Number(button.dataset.col);

    toggleFlag(row, col);
});

newGameButton.addEventListener('click', newGame);

newGame();