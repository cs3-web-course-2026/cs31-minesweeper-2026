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
        if (gameState.started || gameState.status !== 'process') {
            return;
        }

        gameState.started = true;
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
        flags.textContent = gameState.minesCount - gameState.flagsCount;
    }

    /**
     * Створює HTML-елемент клітинки відповідно до її поточного стану.
     * @param {number} row - Номер рядка клітинки.
     * @param {number} col - Номер стовпця клітинки.
     * @returns {HTMLButtonElement} Створена кнопка клітинки.
     */
    function createCell(row, col) {
        const cell = gameState.field[row][col];
        const button = document.createElement('button');

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

        const stateLabel = button.getAttribute('aria-label');

        button.setAttribute(
            'aria-label',
            'Рядок ' + (row + 1) +
            ', стовпець ' + (col + 1) +
            '. ' + stateLabel
        );

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
        const activeCell = board.contains(document.activeElement)
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

        board.replaceChildren(fragment);
        updateFlags();

        if (activeCell) {
            const newCell = board.querySelector(
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

        const cell = gameState.field[row][col];

        if (cell.state !== 'closed' || cell.type === 'mine') {
            return;
        }

        cell.state = 'opened';

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

    /**
     * Встановлює прапорець на закритій клітинці або знімає його.
     * @param {number} row - Номер рядка клітинки.
     * @param {number} col - Номер стовпця клітинки.
     */
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

    /**
     * Перевіряє, чи відкриті всі безпечні клітинки.
     * @returns {boolean} Результат перевірки перемоги.
     */
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

    /**
     * Створює нову гру та скидає попередній ігровий стан.
     */
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

    /**
     * Обробляє натискання лівої кнопки миші на ігровому полі.
     * @param {MouseEvent} event - Подія натискання.
     */
    function handleBoardClick(event) {
        const button = event.target.closest('button.cell');

        if (!button || !board.contains(button)) {
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

        if (!button || !board.contains(button)) {
            return;
        }

        event.preventDefault();

        const row = Number(button.dataset.row);
        const col = Number(button.dataset.col);

        toggleFlag(row, col);
    }

    board.addEventListener('click', handleBoardClick);
    board.addEventListener('contextmenu', handleBoardContextMenu);
    newGameButton.addEventListener('click', newGame);

    newGame();
