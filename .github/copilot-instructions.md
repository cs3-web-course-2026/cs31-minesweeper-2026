# Copilot Instructions for Minesweeper

These instructions guide GitHub Copilot when generating or suggesting code for this project.
Follow all conventions below consistently across every file.

---

## Meaningful Naming

Always use full, descriptive names for every variable, parameter, and function. Never use
single-letter names or cryptic abbreviations.

### Variable naming

| Avoid                    | Use instead                         |
| ------------------------ | ----------------------------------- |
| `r`                      | `row`                               |
| `c`                      | `col`                               |
| `nr`                     | `neighbourRow`                      |
| `nc`                     | `neighbourCol`                      |
| `dr`                     | `directionalRow`                    |
| `dc`                     | `directionalCol`                    |
| `i`, `j` (in grid loops) | `row`, `col`                        |
| `n`                      | `count` or a domain-specific name   |
| `el`                     | `element`                           |
| `btn`                    | `button`                            |
| `val`                    | `value`                             |
| `arr`                    | domain-specific name (e.g. `cells`) |

### Function naming

- Use verb-noun pairs that clearly describe what the function does.
- Examples: `revealCell`, `countAdjacentMines`, `toggleFlag`, `checkWinCondition`, `renderBoard`.

### General rules

- Prioritise readability over brevity.
- Names must be self-documenting: a reader should understand intent without needing a comment.
- Use camelCase for variables and functions, UPPER_SNAKE_CASE for top-level constants.

---

## Enums and Constants

Use constant objects (enum-style) instead of raw string or number literals wherever a fixed set
of values exists. Define these objects at the top of the relevant module.

### Pattern

```js
const CELL_STATE = {
  OPEN: 'open',
  CLOSED: 'closed',
  FLAGGED: 'flagged',
};

const GAME_STATUS = {
  IDLE: 'idle',
  PLAYING: 'playing',
  WON: 'won',
  LOST: 'lost',
};

const CELL_CONTENT = {
  MINE: 'mine',
  EMPTY: 'empty',
};
```

### Usage

```js
// Good
cell.state = CELL_STATE.CLOSED;
game.status = GAME_STATUS.PLAYING;

// Bad — never use raw literals scattered through the code
cell.state = 'closed';
game.status = 'playing';
```

### Rules

- Always reference the constant object in logic, conditionals, and assignments.
- Never duplicate the same string or magic number in more than one place.
- Group related constants into a single object.
- Place constant objects at the top of the file, before any functions.

---

## Spacing and Formatting

Consistent spacing makes the code easier to scan and review.

### Group separation

Separate distinct groups of code with a single blank line:

1. **Constants / configuration** — one block at the top.
2. **Helper / utility functions** — one block.
3. **Core logic functions** — one block.
4. **Rendering / DOM functions** — one block.
5. **`return` statement** — always preceded by a blank line when inside a function body.

### Example

```js
const CELL_STATE = {
  OPEN: 'open',
  CLOSED: 'closed',
  FLAGGED: 'flagged',
};

const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

function countAdjacentMines(board, row, col) {
  let mineCount = 0;

  for (const [directionalRow, directionalCol] of DIRECTIONS) {
    const neighbourRow = row + directionalRow;
    const neighbourCol = col + directionalCol;

    if (isInBounds(board, neighbourRow, neighbourCol)) {
      if (board[neighbourRow][neighbourCol].hasMine) {
        mineCount++;
      }
    }
  }

  return mineCount;
}

function revealCell(board, row, col) {
  const cell = board[row][col];

  if (cell.state !== CELL_STATE.CLOSED) {
    return;
  }

  cell.state = CELL_STATE.OPEN;

  return cell;
}
```

### Rules

- One blank line between logical sections inside a function.
- Two blank lines between top-level function definitions.
- A blank line before every `return` statement (except single-expression arrow functions).
- No trailing whitespace.
- Use 2-space indentation consistently.

---

## Semantic HTML

Use the correct HTML elements for their intended purpose. Never use generic `<div>` or `<span>`
elements for interactive controls or landmark regions.

### Structure

Every page must use landmark elements to define its regions:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Minesweeper</title>
  </head>
  <body>
    <header>
      <button type="button">Restart</button>
      <span id="mine-counter">Mines: 10</span>
      <span id="timer">Time: 0</span>
    </header>
    <main>
      <div id="board"></div>
      <p id="game-message" role="status" aria-live="polite"></p>
    </main>
  </body>
</html>
```

### Rules

- Use `<main>` for the primary game area.
- Use `<header>` for the status bar and control buttons.
- Use `<button type="button">` for every interactive control — never `<div>`, `<span>`, or
  `<input type="button">`.
- Give the page a meaningful `<title>` — never leave it as "Document".
- **lab1 only:** The board container in HTML **may contain hard-coded cell elements** — lab1
  is HTML & CSS only, so static markup is expected and correct.
- **lab3 / lab2-3:** The board container in HTML must be **empty** — cells are created
  dynamically by JavaScript. Flag a non-empty board container only when a `.js` file is
  present and wiring up the DOM.

---

## Accessibility

All users, including those relying on keyboards and screen readers, must be able to understand
and interact with the game.

### Required attributes

- Every `<html>` element must have a `lang` attribute:
  ```html
  <html lang="en"></html>
  ```
- Every `<img>` element must have an `alt` attribute. Use `alt=""` for purely decorative images:
  ```html
  <img src="flag.png" alt="Flag" /> <img src="explosion.png" alt="" />
  <!-- decorative -->
  ```
- Every `<button>` without visible text must have `aria-label`:
  ```html
  <button type="button" aria-label="Restart game">🔄</button>
  ```

### Dynamic game feedback

Game status messages (win, loss, mine count changes) must update a DOM element — never use
`alert()`, `confirm()`, or `prompt()` for game feedback. Use `role="status"` and
`aria-live="polite"` so screen readers announce the update automatically:

```html
<p id="game-message" role="status" aria-live="polite"></p>
```

```js
// Good — updates the DOM, announced by screen readers
document.getElementById('game-message').textContent = 'You won!';

// Bad — blocks the UI and is inaccessible
alert('You won!');
```

### Cell buttons

Cells created by JavaScript must carry an `aria-label` that describes their current state:

```js
function createCellButton(row, col) {
  const button = document.createElement('button');

  button.type = 'button';
  button.setAttribute(
    'aria-label',
    `Row ${row + 1}, column ${col + 1}, closed`,
  );

  return button;
}
```

Update the `aria-label` whenever the cell state changes (opened, flagged, etc.).

---

## CSS Code Quality

CSS values must be as meaningful and maintainable as the JavaScript they style.

### No magic-number font sizes

Never use extreme percentage values for font sizes. Use `rem` or define a CSS custom property:

```css
/* Bad */
.cell {
  font-size: 600%;
}

/* Good */
:root {
  --cell-font-size: 1.5rem;
}

.cell {
  font-size: var(--cell-font-size);
}
```

### No duplicate declarations

Never declare the same property twice in the same rule block:

```css
/* Bad */
#timer {
  text-align: center;
  color: white;
  text-align: center; /* duplicate */
}

/* Good */
#timer {
  text-align: center;
  color: white;
}
```

### Domain values as custom properties

Numeric values that represent domain concepts (board dimensions, mine counts, animation
durations) belong in CSS custom properties at the top of the file:

```css
:root {
  --board-columns: 9;
  --cell-size: 2.5rem;
  --animation-duration: 0.3s;
}
```

---

## General Best Practices

- **Pure functions where possible** — avoid side effects inside helpers that compute values.
- **Single responsibility** — each function should do exactly one thing.
- **No magic numbers** — define numeric constants (e.g. `const DEFAULT_MINE_COUNT = 10`).
- **Early returns** — use guard clauses to reduce nesting instead of deeply nested `if/else`.
- **Cache DOM references** — call `document.querySelector` / `getElementById` once at the top
  of the file and store the result; never query the DOM inside a function called on every
  interaction.
- **Consistent style** — apply all rules above to every file in the project, not just new code.

---

## State Management

All mutable runtime state must live in a single object — never as scattered top-level
`let` or `var` declarations.

### Pattern

```js
const gameState = {
  rows: 9,
  cols: 9,
  minesCount: 10,
  flagsPlaced: 0,
  status: GAME_STATUS.IDLE,
  board: [],
  timerId: null,
  elapsedSeconds: 0,
};
```

### Rules

- Declare one `gameState` object that holds all runtime fields.
- Reset the game by reassigning the properties of `gameState` (or replacing the object), not
  by redeclaring new variables.
- Do not use module-level `let`/`var` globals as a substitute for structured state (e.g.
  `let isGameRunning = false` scattered next to `let mineCount = 10` is a violation).
- Pure logic functions receive the state (or slices of it) as parameters — they do not read
  from `gameState` directly.

### Example

```js
// Good — all state in one place, reset is explicit
function resetGame() {
  gameState.flagsPlaced = 0;
  gameState.status = GAME_STATUS.IDLE;
  gameState.board = [];
  gameState.elapsedSeconds = 0;

  clearInterval(gameState.timerId);
  gameState.timerId = null;
}

// Bad — globals scattered across the module
let isGameRunning = false;
let flagsPlaced = 0;
let timerInterval;
let secondsPassed = 0;
```

---

## Repository Access and Forking

Students must have **direct write access** to this repository to push branches and open pull
requests. Do **not** fork the repository — pull requests from forks cannot be merged into the
main workflow.

### If you see a "You must fork this repository" message

This means your GitHub account has not been granted access yet. To get access:

1. Find the Google Sheets table for your group:
   **[Course roster](https://docs.google.com/spreadsheets/d/1Up05qqrfg1q-oXC5eijNRJ7oyswjdmDAWxUUk_MsBIg/edit?gid=0#gid=0)**
   — each group has a dedicated page (tab).
2. Add your **GitHub username (nickname)** to your row in the table.
3. Wait for the teacher to grant access — you will receive a GitHub invitation by email.
4. Accept the invitation and then clone the repository directly (no fork needed).

### Reviewer checks for forked PRs

If a pull request originates from a **fork** (the head repository is different from the base
repository), do **not** approve or merge it. Leave a `REQUEST_CHANGES` review with the
following guidance:

> It looks like this PR was opened from a fork. In this course we work directly in the shared
> repository, so fork-based PRs cannot be merged. Here's what to do:
>
> 1. Make sure your GitHub username is listed in the
>    [course roster spreadsheet](https://docs.google.com/spreadsheets/d/1Up05qqrfg1q-oXC5eijNRJ7oyswjdmDAWxUUk_MsBIg/edit?gid=0#gid=0)
>    on your group's page.
> 2. Once the teacher grants access and you accept the invitation, clone the main repo,
>    recreate your branch there, and open a new PR from that branch.
>
> No need to redo your work — just copy your files into the new branch. Feel free to ask if
> you need help!

---

## Repository Structure

All files submitted by a student must be placed inside a dedicated top-level folder named
after the student using the `SurnameName` format (e.g. `SmithJohn/`, `MokhNazar/`).

### Rules

- Every new file must reside under `/{SurnameName}/` — never in the repository root or any
  other folder.
- The folder name must follow the `SurnameName` convention: surname first, given name second,
  no separator, each part capitalised (PascalCase).
- Do not modify files outside your own `/{SurnameName}/` folder.

### Examples

```
SmithWill/
  index.html
  styles.css
  script.js

DeppJohny/
  index.html
  styles.css
```

---

## Pull Request Conventions

### Title format

Every pull request title must begin with a lab identifier followed by a colon and a space:

```
lab{number}: <short description>
```

### Examples

```
lab1: initial board rendering
lab2: mine placement logic
lab3: reveal and flag interactions
```

### Rules

- `{number}` is a positive integer matching the lab assignment number (e.g. `lab1`, `lab12`).
- The description after the colon must be lowercase and concise.
- No PR should be opened without the `lab{number}:` prefix — reviewers will reject titles that
  do not follow this format.

### Reviewer checks

When reviewing a pull request, verify all of the following before approving:

1. **PR title** starts with `lab{number}: ` as described above.
2. **All changed files** are inside the author's own `/{SurnameName}/` folder — no files
   outside that folder should be added, modified, or deleted.
3. **No top-level directory has been fully deleted.** If the diff shows that every file under
   a `/{SurnameName}/` folder belonging to _another_ student has been removed, comment this in the PR. This is the most common way a student accidentally wipes a peer's work.
   - Check the list of deleted files: if all deletions share the same top-level folder and
     that folder is **not** the PR author's own folder, flag it.
   - Request changes with a comment explaining which directory was unintentionally deleted and asking the author to restore it before the PR can be merged suggesting the way how to do that.
4. **lab1 — HTML & CSS only.** If the PR title **or** the head branch name contains `lab1`,
   check that no `.js` files are added or modified and that no `<script>` tags appear in any
   HTML file.
   - If any JavaScript is found, this is a **critical** violation — request changes with a
     comment explaining that lab1 must be completed using HTML and CSS only, and that all
     `.js` files and `<script>` tags must be removed before the PR can be merged.
5. **lab2 — Pure JavaScript logic (no DOM).** If the PR title **or** the head branch name
   contains `lab2`, check that the `.js` file contains only game logic — board creation, mine
   placement, adjacency counting, reveal/flag state transitions, win/loss detection —
   implemented as pure functions operating on plain data structures.
   - The JavaScript must **not** contain DOM API calls such as `document.querySelector`,
     `document.getElementById`, `addEventListener`, `innerHTML`, `createElement`,
     `classList`, etc.
   - No `.html` file should be added or modified beyond what already existed in lab1.
   - **If DOM interactions are present:** this is not a blocking violation — the student may
     have combined lab2 and lab3. Leave a medium-severity comment noting the deviation and
     ask the student to rename the PR title to `lab2-3: <description>`. Do **not** request
     changes solely because of DOM interactions if the logic itself is correct.
6. **lab3 — Full DOM integration (Minesweeper complete).** If the PR title **or** the head
   branch name contains `lab3` or `lab2-3`, verify that the submission wires together the
   pure logic from lab2 and the HTML structure from lab1 to produce a playable game.
   - The board must be rendered dynamically from JavaScript (not hard-coded in HTML).
   - Left-click must reveal a cell; right-click (or equivalent) must toggle a flag.
   - The game must detect and display a win or loss state.
   - A mine count / remaining flags indicator must be updated in the UI.
   - If lab2 logic is duplicated inline (e.g. mine placement written directly inside event
     handlers) rather than extracted into reusable functions, flag this as a medium-severity
     issue and suggest extracting it.
   - Any JavaScript found in lab1 files (carry-over) is still a **high**-severity issue.
