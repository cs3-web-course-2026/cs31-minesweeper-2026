'use strict';

const gameState = {
    rows: 10,
    cols: 10,
    minesCount: 15,
    status: 'process',
    gameTime: 0,
    timerId: null
};

let board = [];

const boardElement = document.getElementById('board');
const timer = document.getElementById('timer');
const flags = document.getElementById('flags');
const message = document.getElementById('message');
const newGameButton = document.getElementById('new-game');

const NEIGHBOR_OFFSETS = [
    { rowOffset: -1, colOffset: -1 },
    { rowOffset: -1, colOffset: 0 },
    { rowOffset: -1, colOffset: 1 },
    { rowOffset: 0, colOffset: -1 },
    { rowOffset: 0, colOffset: 1 },
    { rowOffset: 1, colOffset: -1 },
    { rowOffset: 1, colOffset: 0 },
    { rowOffset: 1, colOffset: 1 }
];

/**
 * Створює ігрове поле та випадково розміщує на ньому міни.
 * @param {number} rows - Кількість рядків поля.
 * @param {number} cols - Кількість стовпців поля.
 * @param {number} minesCount - Загальна кількість мін.
 * @returns {Array<Array<Object>>} Створене ігрове поле.
 */
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

/**
 * Підраховує кількість мін навколо кожної безпечної клітинки.
 */
function countNeighbourMines() {
    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            const cell = board[row][col];

            if (cell.type === 'mine') {
                continue;
            }

            let count = 0;

            for (const { rowOffset, colOffset } of NEIGHBOR_OFFSETS) {
                const neighborRow = row + rowOffset;
                const neighborCol = col + colOffset;

                if (
                    neighborRow >= 0 &&
                    neighborRow < gameState.rows &&
                    neighborCol >= 0 &&
                    neighborCol < gameState.cols &&
                    board[neighborRow][neighborCol].type === 'mine'
                ) {
                    count++;
                }
            }

            cell.neighborMines = count;
        }
    }
}

/**
 * Підраховує встановлені прапорці.
 * @returns {number} Кількість встановлених прапорців.
 */
function countFlags() {
    let count = 0;

    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            if (board[row][col].state === 'flagged') {
                count++;
            }
        }
    }

    return count;
}

/**
 * Оновлює відображення часу на ігровій панелі.
 */
function updateTimer() {
    gameState.gameTime++;

    const minutes = Math.floor(gameState.gameTime / 60);
    const seconds = gameState.gameTime % 60;

    timer.textContent =
        String(minutes).padStart(2, '0') + ':' +
        String(seconds).padStart(2, '0');
}

/**
 * Запускає ігровий таймер, якщо гра ще не розпочалася.
 */
function startTimer() {
    if (
        gameState.timerId !== null ||
        gameState.status !== 'process'
    ) {
        return;
    }

    gameState.timerId = setInterval(updateTimer, 1000);
}

/**
 * Зупиняє ігровий таймер і очищує його інтервал.
 */
function stopTimer() {
    if (gameState.timerId !== null) {
        clearInterval(gameState.timerId);
        gameState.timerId = null;
    }
}

/**
 * Оновлює кількість прапорців, які ще можна встановити.
 */
function updateFlags() {
    flags.textContent = gameState.minesCount - countFlags();
}

/**
 * Створює HTML-елемент клітинки відповідно до її поточного стану.
 * @param {number} row - Номер рядка клітинки.
 * @param {number} col - Номер стовпця клітинки.
 * @returns {HTMLButtonElement} Створена кнопка клітинки.
 */
function createCell(row, col) {
    const cell = board[row][col];
    const button = document.createElement('button');
    const cellPosition = `Рядок ${row + 1}, стовпець ${col + 1}`;

    button.type = 'button';
    button.classList.add('cell');
    button.dataset.row = row;
    button.dataset.col = col;

    if (cell.state === 'opened') {
        button.classList.add('cell-open');

        if (cell.type === 'mine') {
            button.textContent = '✹';

            if (cell.exploded) {
                button.classList.add('cell-exploded');
                button.setAttribute(
                    'aria-label',
                    `${cellPosition}, натиснута міна`
                );
            } else {
                button.classList.add('cell-mine');
                button.setAttribute(
                    'aria-label',
                    `${cellPosition}, міна`
                );
            }
        } else if (cell.neighborMines > 0) {
            button.textContent = cell.neighborMines;
            button.classList.add(
                'cell-number-' + cell.neighborMines
            );
            button.setAttribute(
                'aria-label',
                `${cellPosition}, відкрита клітинка, число ${cell.neighborMines}`
            );
        } else {
            button.setAttribute(
                'aria-label',
                `${cellPosition}, відкрита порожня клітинка`
            );
        }
    } else if (cell.state === 'flagged') {
        button.classList.add('cell-flagged');
        button.textContent = '⚑';
        button.setAttribute(
            'aria-label',
            `${cellPosition}, прапорець`
        );
    } else {
        button.classList.add('cell-closed');
        button.setAttribute(
            'aria-label',
            `${cellPosition}, закрита клітинка`
        );
    }

    if (cell.wrongFlag) {
        button.classList.add('cell-wrong');
        button.textContent = '✕';
        button.setAttribute(
            'aria-label',
            `${cellPosition}, неправильний прапорець`
        );
    }

    button.setAttribute(
        'aria-pressed',
        cell.state === 'opened' ? 'true' : 'false'
    );

    return button;
}

/**
 * Відображає всі клітинки ігрового поля та оновлює лічильник прапорців.
 */
function renderField() {
    const activeCell = boardElement.contains(document.activeElement)
        ? {
            row: document.activeElement.dataset.row,
            col: document.activeElement.dataset.col
        }
        : null;

    const fragment = document.createDocumentFragment();

    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            fragment.appendChild(createCell(row, col));
        }
    }

    boardElement.replaceChildren(fragment);
    updateFlags();

    if (activeCell) {
        const newCell = boardElement.querySelector(
            '[data-row="' + activeCell.row +
            '"][data-col="' + activeCell.col + '"]'
        );

        if (newCell) {
            newCell.focus();
        }
    }
}

/**
 * Відкриває вибрану клітинку та перевіряє результат ходу.
 * @param {number} row - Номер рядка клітинки.
 * @param {number} col - Номер стовпця клітинки.
 */
function openCell(row, col) {
    if (gameState.status !== 'process') {
        return;
    }

    const cell = board[row][col];

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

/**
 * Відкриває безпечну клітинку та рекурсивно розкриває порожніх сусідів.
 * @param {number} row - Номер рядка клітинки.
 * @param {number} col - Номер стовпця клітинки.
 */
function revealCell(row, col) {
    if (
        row < 0 ||
        row >= gameState.rows ||
        col < 0 ||
        col >= gameState.cols
    ) {
        return;
    }

    const cell = board[row][col];

    if (cell.state !== 'closed' || cell.type === 'mine') {
        return;
    }

    cell.state = 'opened';

    if (cell.neighborMines === 0) {
        for (const { rowOffset, colOffset } of NEIGHBOR_OFFSETS) {
            const neighborRow = row + rowOffset;
            const neighborCol = col + colOffset;

            revealCell(neighborRow, neighborCol);
        }
    }
}

/**
 * Встановлює прапорець на закритій клітинці або знімає його.
 * @param {number} row - Номер рядка клітинки.
 * @param {number} col - Номер стовпця клітинки.
 */
function toggleFlag(row, col) {
    if (gameState.status !== 'process') {
        return;
    }

    const cell = board[row][col];

    if (cell.state === 'opened') {
        return;
    }

    if (cell.state === 'closed') {
        if (countFlags() >= gameState.minesCount) {
            return;
        }

        cell.state = 'flagged';
    } else if (cell.state === 'flagged') {
        cell.state = 'closed';
    }

    renderField();
}

/**
 * Перевіряє, чи відкриті всі безпечні клітинки.
 * @returns {boolean} Результат перевірки перемоги.
 */
function checkWin() {
    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            const cell = board[row][col];

            if (cell.type !== 'mine' && cell.state !== 'opened') {
                return false;
            }
        }
    }

    return true;
}

/**
 * Завершує гру, зупиняє таймер і відображає результат.
 * @param {string} result - Результат гри: win або lose.
 */
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
            const cell = board[row][col];

            if (cell.type === 'mine') {
                if (cell.state !== 'flagged') {
                    cell.state = 'opened';
                }
            } else if (cell.state === 'flagged') {
                cell.wrongFlag = true;
                cell.state = 'closed';
            }
        }
    }

    renderField();
}

/**
 * Створює нову гру та скидає попередній ігровий стан.
 */
function newGame() {
    stopTimer();

    gameState.status = 'process';
    gameState.gameTime = 0;

    timer.textContent = '00:00';
    message.textContent = 'Зроби перший хід.';
    message.className = 'game-message';

    board = generateField(
        gameState.rows,
        gameState.cols,
        gameState.minesCount
    );

    countNeighbourMines();
    renderField();
}

/**
 * Обробляє натискання лівої кнопки миші на ігровому полі.
 * @param {MouseEvent} event - Подія натискання.
 */
function handleBoardClick(event) {
    const button = event.target.closest('button.cell');

    if (!button || !boardElement.contains(button)) {
        return;
    }

    const row = Number(button.dataset.row);
    const col = Number(button.dataset.col);

    openCell(row, col);
}

/**
 * Обробляє натискання правої кнопки миші на ігровому полі.
 * @param {MouseEvent} event - Подія натискання.
 */
function handleBoardContextMenu(event) {
    const button = event.target.closest('button.cell');

    if (!button || !boardElement.contains(button)) {
        return;
    }

    event.preventDefault();

    const row = Number(button.dataset.row);
    const col = Number(button.dataset.col);

    toggleFlag(row, col);
}

boardElement.addEventListener('click', handleBoardClick);
boardElement.addEventListener('contextmenu', handleBoardContextMenu);
newGameButton.addEventListener('click', newGame);

newGame();
