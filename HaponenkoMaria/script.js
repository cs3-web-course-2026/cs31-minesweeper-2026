// ==========================================
// КРОК 1. Моделювання даних (Data Layer)
// ==========================================
const gameState = {
  rows: 9, // Згідно з вашим CSS (--board-columns: 9)
  cols: 9,
  minesCount: 10, // Класична складність для поля 9х9
  flagsCount: 0,
  status: 'process', // 'process' | 'win' | 'lose'
  gameTime: 0,
  timerId: null,
  isFirstClick: true,
};

// Двовимірний масив ігрового поля
let field = [];

// ==========================================
// КРОК 2. Генерація поля та мін
// ==========================================
// Функція 1: Створює або очищає поле (без мін) зберігаючи HTML-елементи
function createEmptyField() {
  if (field.length === 0) {
    for (let r = 0; r < gameState.rows; r++) {
      const row = [];
      for (let c = 0; c < gameState.cols; c++) {
        row.push({
          type: 'empty',
          state: 'closed',
          neighborMines: 0,
          exploded: false,
          element: null, // Тут зберігатиметься кнопка (для оптимізації DOM)
        });
      }
      field.push(row);
    }
  } else {
    // Якщо масив вже є (клік по кнопці Рестарт), просто скидаємо значення
    for (let r = 0; r < gameState.rows; r++) {
      for (let c = 0; c < gameState.cols; c++) {
        field[r][c].type = 'empty';
        field[r][c].state = 'closed';
        field[r][c].neighborMines = 0;
        field[r][c].exploded = false;
      }
    }
  }
}

// Функція 2: Розставляє міни, гарантуючи, що перша клітинка і її сусіди будуть порожніми
function placeMines(firstRow, firstCol) {
  let minesPlaced = 0;
  while (minesPlaced < gameState.minesCount) {
    const r = Math.floor(Math.random() * gameState.rows);
    const c = Math.floor(Math.random() * gameState.cols);

    // Зона безпеки 3х3 навколо першого кліку
    const isSafeZone =
      Math.abs(r - firstRow) <= 1 && Math.abs(c - firstCol) <= 1;

    if (field[r][c].type !== 'mine' && !isSafeZone) {
      field[r][c].type = 'mine';
      minesPlaced++;
    }
  }

  // Рахуємо сусідів відразу після розстановки мін
  countNeighbourMines();
}

// ==========================================
// КРОК 3. Алгоритмічна частина (Business Logic)
// ==========================================
const directions = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

function countNeighbourMines() {
  for (let r = 0; r < gameState.rows; r++) {
    for (let c = 0; c < gameState.cols; c++) {
      if (field[r][c].type === 'mine') continue;

      let count = 0;
      for (let [dr, dc] of directions) {
        const nr = r + dr;
        const nc = c + dc;

        // Перевірка, чи не виходимо за межі поля
        if (nr >= 0 && nr < gameState.rows && nc >= 0 && nc < gameState.cols) {
          if (field[nr][nc].type === 'mine') {
            count++;
          }
        }
      }
      field[r][c].neighborMines = count;
    }
  }
}

function openCell(r, c) {
  if (gameState.status !== 'process') return;

  const cell = field[r][c];
  if (cell.state === 'opened' || cell.state === 'flagged') return;

  // Якщо це найперший клік у грі:
  if (gameState.isFirstClick) {
    gameState.isFirstClick = false; // Знімаємо прапорець
    startTimer(); // Запускаємо час
    placeMines(r, c); // Розставляємо міни, передаючи координати кліку
  }

  cell.state = 'opened';

  if (cell.type === 'mine') {
    cell.exploded = true;
    handleGameOver(false);
    return;
  }

  if (cell.neighborMines === 0) {
    for (let [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < gameState.rows && nc >= 0 && nc < gameState.cols) {
        openCell(nr, nc);
      }
    }
  }

  checkWinCondition();
  updateUI();
  renderField();
}

// ==========================================
// КРОК 4. Таймер та прапорці
// ==========================================
function toggleFlag(r, c) {
  if (gameState.status !== 'process') return;

  const cell = field[r][c];
  if (cell.state === 'opened') return;

  if (cell.state === 'closed') {
    cell.state = 'flagged';
    gameState.flagsCount++;
  } else if (cell.state === 'flagged') {
    cell.state = 'closed';
    gameState.flagsCount--;
  }

  updateUI();
  renderField();
}

function startTimer() {
  if (gameState.timerId) clearInterval(gameState.timerId);
  gameState.timerId = setInterval(() => {
    gameState.gameTime++;
    updateUI();
  }, 1000);
}

function stopTimer() {
  if (gameState.timerId) {
    clearInterval(gameState.timerId);
    gameState.timerId = null;
  }
}

// ==========================================
// КРОК 5. Рендеринг ігрового поля (DOM)
// ==========================================
const boardElement = document.getElementById('game-board');

function renderField() {
  // 1. Створюємо HTML-кнопки лише якщо їх ще немає (на старті нової гри)
  const needsCreation =
    boardElement.children.length === 0 || !field[0][0].element;

  if (needsCreation) {
    boardElement.innerHTML = ''; // Очищуємо поле перед генерацією
    for (let r = 0; r < gameState.rows; r++) {
      for (let c = 0; c < gameState.cols; c++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.row = r;
        btn.dataset.col = c;
        btn.setAttribute('aria-label', `Cell ${r} ${c}`);

        boardElement.appendChild(btn);

        // Зберігаємо посилання на фізичну HTML-кнопку всередині об'єкта логіки
        field[r][c].element = btn;
      }
    }
  }

  // 2. Оновлюємо існуючі кнопки (без їх видалення і перестворення)
  for (let r = 0; r < gameState.rows; r++) {
    for (let c = 0; c < gameState.cols; c++) {
      const cellData = field[r][c];
      const btn = cellData.element; // Отримуємо збережену кнопку

      // Скидаємо всі класи, залишаючи лише базовий
      btn.className = 'cell';

      btn.removeAttribute('data-value');

      if (cellData.state === 'closed') {
        btn.classList.add('cell-closed');
      }

      // Додаємо специфічні класи залежно від стану
      if (cellData.state === 'opened') {
        if (cellData.type === 'mine') {
          btn.classList.add(
            cellData.exploded ? 'cell-mine-exploded' : 'cell-mine',
          );
        } else {
          if (cellData.neighborMines > 0) {
            btn.classList.add('cell-revealed-num');
            btn.dataset.value = cellData.neighborMines;
          } else {
            btn.classList.add('cell-revealed');
          }
        }
      } else if (cellData.state === 'flagged') {
        if (gameState.status === 'lose' && cellData.type !== 'mine') {
          btn.classList.add('cell-flagged-wrong');
        } else {
          btn.classList.add('cell-flagged');
        }
      }
    }
  }
}

// ==========================================
// КРОК 6. Динамічні елементи інтерфейсу
// ==========================================
const minesCountEl = document.querySelector('#mines-count span');
const timerEl = document.querySelector('#timer span');
const startBtn = document.getElementById('start-button');

function updateUI() {
  minesCountEl.textContent = gameState.minesCount - gameState.flagsCount;
  timerEl.textContent = gameState.gameTime;

  const btnImg = document.getElementById('btn-img');

  if (gameState.status === 'win') {
    // Картинка при перемозі
    btnImg.src = 'pictures/WIN.png';
  } else if (gameState.status === 'lose') {
    // Картинка при поразці
    btnImg.src = 'pictures/GAMEOVER.png';
  } else if (gameState.gameTime === 0 && !gameState.timerId) {
    // Картинка ПЕРЕД початком гри (до першого кліку)
    btnImg.src = 'pictures/START.png';
  } else {
    // Картинка ПІД ЧАС гри (зроблено правильний крок)
    btnImg.src = 'pictures/inProgress.png';
  }
}

// Функція старту нової гри
function initGame() {
  gameState.status = 'process';
  gameState.flagsCount = 0;
  gameState.gameTime = 0;

  gameState.isFirstClick = true;

  stopTimer();

  createEmptyField();

  updateUI();
  renderField();

  const msgEl = document.getElementById('game-message');
  if (msgEl) msgEl.textContent = '';
}

// ==========================================
// КРОК 7. Обробка подій користувача (Event Handling)
// ==========================================
boardElement.addEventListener('mousedown', (event) => {
  const btn = event.target.closest('.cell');
  if (!btn) return;

  const r = parseInt(btn.dataset.row);
  const c = parseInt(btn.dataset.col);

  if (event.button === 0) {
    // Лівий клік миші (0)
    openCell(r, c);
  } else if (event.button === 2) {
    // Правий клік миші (2)
    toggleFlag(r, c);
  }
});

// Блокування контекстного меню на ігровому полі при правому кліку
boardElement.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

// Перезапуск гри по кліку на головну кнопку
startBtn.addEventListener('click', initGame);

// ==========================================
// КРОК 8. Завершення гри
// ==========================================
function checkWinCondition() {
  let safeCellsOpened = 0;
  const targetSafeCells =
    gameState.rows * gameState.cols - gameState.minesCount;

  for (let r = 0; r < gameState.rows; r++) {
    for (let c = 0; c < gameState.cols; c++) {
      if (field[r][c].type === 'empty' && field[r][c].state === 'opened') {
        safeCellsOpened++;
      }
    }
  }

  // Якщо відкриті всі клітинки, де немає мін — перемога
  if (safeCellsOpened === targetSafeCells) {
    handleGameOver(true);
  }
}

function handleGameOver(isWin) {
  gameState.status = isWin ? 'win' : 'lose';
  stopTimer();

  const msgEl = document.getElementById('game-message');
  if (msgEl) {
    msgEl.textContent = isWin
      ? 'Вітаємо! Ви перемогли!'
      : 'Гру закінчено. Ви натрапили на міну.';
  }

  // Якщо програш — показуємо всі міни (крім тих, що правильно відмічені прапорцем)
  if (!isWin) {
    for (let r = 0; r < gameState.rows; r++) {
      for (let c = 0; c < gameState.cols; c++) {
        if (field[r][c].type === 'mine' && field[r][c].state !== 'flagged') {
          field[r][c].state = 'opened';
        }
      }
    }
  }

  updateUI();
  renderField();
}

// ==========================================
// Запуск першої гри після завантаження сторінки
// ==========================================
initGame();
