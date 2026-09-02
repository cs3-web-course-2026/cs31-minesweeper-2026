# CS31 Minesweeper — 2026

![Lint](https://github.com/cs3-web-course-2026/cs31-minesweeper-2026/actions/workflows/lint.yml/badge.svg)

A shared classroom repository where every student builds their own Minesweeper game in vanilla
HTML, CSS, and JavaScript — no frameworks, no build tools. Each student works in their own
top-level folder and submits work as pull requests, reviewed by both an AI reviewer and the
teacher before merging.

## Getting access

This is a **shared repository**, not something you fork.

1. Open a new issue in
   [team-access](https://github.com/cs3-web-course-2026/team-access/issues/new/choose) using
   the **"Запит у команду"** form and select the **`cs-31`** team.
2. Wait for the request to be reviewed and approved — you're added to the `cs-31` team
   automatically once it is (no separate invitation to accept).
3. Clone the repo directly:

   ```bash
   git clone https://github.com/cs3-web-course-2026/cs31-minesweeper-2026.git
   ```

If GitHub tells you to fork the repository, it means you don't have access yet — go back to
step 1. Pull requests opened from a fork cannot be merged.

## Repository structure

Every file you add lives inside **one folder named after you**, in `SurnameName` format
(surname first, given name second, PascalCase, no separator):

```
cs31-minesweeper-2026/
├── SmithWill/
│   ├── index.html
│   ├── styles.css
│   └── script.js
├── DeppJohny/
│   ├── index.html
│   └── styles.css
└── ...
```

Never add, edit, or delete files outside your own folder.

## Labs

| Lab | Scope | What you build |
| --- | --- | --- |
| **lab1** | HTML & CSS only | Static page layout for the board, header, and controls. Hard-coded cells are expected — no `.js` files or `<script>` tags allowed. |
| **lab2** | Full game (JS + DOM) | Board creation, mine placement, adjacency counting, reveal/flag logic, win/loss detection, and DOM wiring — a fully playable Minesweeper. |

Code style, accessibility, and structural conventions for both labs are documented in
[`.github/copilot-instructions.md`](.github/copilot-instructions.md) — read it before you start;
it's also what both AI reviewers check your PR against.

## Submitting your work

1. Create a branch and commit your changes inside your own folder.
2. Open a pull request into `main` with a title in this format:

   ```
   lab{number}: <short, lowercase description>
   ```

   Examples: `lab1: initial board rendering`, `lab2: mine placement and reveal logic`.

3. Fill in the PR template — describe what you built and add a screenshot of the game.
4. Wait for the automated checks and AI review, then address any feedback.

## Automated checks

Every pull request is checked automatically before it can be merged:

- **Lint** (GitHub Actions) — ESLint on your changed `.js` files and Stylelint on your changed
  `.css` files. Only files you actually touched are linted.
- **AI code review** (CodeRabbit) — checks your PR against the
  conventions in `.github/copilot-instructions.md`: naming, structure, accessibility, folder
  rules, and lab-specific requirements. Reviews are friendly but direct about anything that
  blocks a merge.

You can run the linters locally before pushing:

```bash
npm install
npm run lint
```

## Questions

If something is unclear — the roster, access, a rule in the conventions doc, or feedback on a
PR — ask in the course channel or tag the teacher on your PR.
