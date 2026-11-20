/* global require: readonly, __dirname: readonly */

const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../script.js'), 'utf8');
const activeTimers = new Map();
let timerSequence = 0;
const context = vm.createContext({
  document: { querySelector: () => ({}) },
  setInterval: (callback) => { activeTimers.set(++timerSequence, callback); return timerSequence; },
  clearInterval: (identifier) => activeTimers.delete(identifier),
});
const startupBoundary = source.indexOf('// Підключення подій та запуск інтерфейсу.');
assert.notEqual(startupBoundary, -1, 'Не знайдено межу запуску інтерфейсу.');
vm.runInContext(source.slice(0, startupBoundary), context);
const evaluate = (code) => vm.runInContext(code, context);
const results = [];
function test(name, callback) {
  callback();
  results.push({ name, result: 'PASS' });
}
test('100 random fields: exact mine count, distinct cells and valid neighbour counts', () => {
  assert.equal(evaluate(`Array.from({length: 100}, () => {
    const field = generateField(10, 10, 15);
    countNeighbourMines(field);
    return field.flat().filter(cell => cell.type === CELL_TYPE.MINE).length === 15 &&
      new Set(field.flat()).size === 100 &&
      field.every((cells, row) => cells.every((cell, col) => {
        let expected = 0;
        for (let neighbourRow = Math.max(0, row - 1); neighbourRow <= Math.min(9, row + 1); neighbourRow++) {
          for (let neighbourCol = Math.max(0, col - 1); neighbourCol <= Math.min(9, col + 1); neighbourCol++) {
            if ((neighbourRow !== row || neighbourCol !== col) && field[neighbourRow][neighbourCol].type === CELL_TYPE.MINE) expected++;
          }
        }
        return cell.state === CELL_STATE.CLOSED && (cell.type === CELL_TYPE.MINE || cell.neighborMines === expected);
      }));
  }).every(Boolean)`), true);
});
test('Invalid dimensions and mine counts are rejected', () => {
  for (const argumentsText of ['0,10,1', '10,-1,1', '10,10,-1', '10,10,100', '2.5,3,1', '3,3,1.5']) {
    assert.throws(() => evaluate(`generateField(${argumentsText})`));
  }
});
test('Dense and mine-free fields terminate with correct counts', () => {
  assert.equal(evaluate('generateField(10,10,99).flat().filter(cell => cell.type === CELL_TYPE.MINE).length'), 99);
  assert.equal(evaluate('generateField(10,10,0).flat().some(cell => cell.type === CELL_TYPE.MINE)'), false);
});
test('Corner, edge and centre neighbour counts', () => {
  evaluate(`board = generateField(3,3,0); board[0][0].type = CELL_TYPE.MINE; board[2][2].type = CELL_TYPE.MINE; countNeighbourMines(board);`);
  assert.equal(evaluate('board[1][1].neighborMines'), 2);
  assert.equal(evaluate('board[0][1].neighborMines'), 1);
  assert.equal(evaluate('board[0][2].neighborMines'), 0);
});
test('Recursive reveal opens 99 safe cells but preserves a flagged cell', () => {
  evaluate(`resetGame(); board = generateField(10,10,0); toggleFlag(5,5); openCell(0,0);`);
  assert.equal(evaluate('board.flat().filter(cell => cell.state === CELL_STATE.OPENED).length'), 99);
  assert.equal(evaluate('board[5][5].state'), 'flagged');
  assert.equal(evaluate('gameState.status'), 'process');
});
test('Unflag then open the last safe cell wins without needing flags', () => {
  evaluate('resetGame(); board = generateField(10,10,0); toggleFlag(5,5); openCell(0,0);');
  evaluate('toggleFlag(5,5); openCell(5,5);');
  assert.equal(evaluate('gameState.status'), 'win');
});
test('Flag budget, removing a flag and opening a flagged cell', () => {
  evaluate('resetGame();');
  for (let index = 0; index < 15; index++) assert.equal(evaluate(`toggleFlag(${Math.floor(index/10)},${index%10})`), true);
  assert.equal(evaluate('toggleFlag(9,9)'), false);
  assert.equal(evaluate('openCell(0,0)'), false);
  assert.equal(evaluate('countFlags(board)'), 15);
  assert.equal(evaluate('toggleFlag(0,0)'), true);
  assert.equal(evaluate('toggleFlag(9,9)'), true);
});
test('No flag or repeated open on an opened cell; invalid coordinates ignored', () => {
  evaluate(`resetGame(); board = generateField(3,3,0); board[0][0].type = CELL_TYPE.MINE; countNeighbourMines(board); openCell(0,1);`);
  assert.equal(evaluate('toggleFlag(0,1)'), false);
  assert.equal(evaluate('openCell(0,1)'), false);
  assert.equal(evaluate('openCell(-1,0)'), false);
  assert.equal(evaluate('toggleFlag(3,0)'), false);
});
test('Timer starts once, ticks and stops on loss', () => {
  evaluate('resetGame(); startTimer(); startTimer();');
  assert.equal(activeTimers.size, 1);
  [...activeTimers.values()][0]();
  assert.equal(evaluate('gameState.gameTime'), 1);
  evaluate(`{ const mineRow = board.findIndex(cells => cells.some(cell => cell.type === CELL_TYPE.MINE)); const mineCol = board[mineRow].findIndex(cell => cell.type === CELL_TYPE.MINE); openCell(mineRow,mineCol); }`);
  assert.equal(evaluate('gameState.status'), 'lose');
  assert.equal(evaluate('gameState.timerId'), null);
  assert.equal(activeTimers.size, 0);
});
test('Finished game rejects opening, flagging and starting the timer', () => {
  evaluate('resetGame(); board = generateField(10,10,0); board[0][0].type = CELL_TYPE.MINE; openCell(0,0);');
  assert.equal(evaluate('gameState.status'), 'lose');
  assert.equal(evaluate('toggleFlag(9,9)'), false);
  assert.equal(evaluate('openCell(9,9)'), false);
  evaluate('startTimer();');
  assert.equal(activeTimers.size, 0);
});
test('Victory also stops an already running timer', () => {
  evaluate('resetGame(); board = generateField(10,10,0); startTimer(); openCell(0,0);');
  assert.equal(evaluate('gameState.status'), 'win');
  assert.equal(activeTimers.size, 0);
});
test('Restart clears flags, time, status and an old timer', () => {
  evaluate('resetGame(); startTimer(); toggleFlag(0,0); gameState.gameTime = 42; resetGame();');
  assert.equal(evaluate('gameState.gameTime'), 0);
  assert.equal(evaluate('gameState.status'), 'process');
  assert.equal(evaluate('countFlags(board)'), 0);
  assert.equal(activeTimers.size, 0);
  assert.equal(evaluate('board.flat().length'), 100);
});
test('Restart from either finished outcome restores play', () => {
  for (const finishAction of [
    'board = generateField(10,10,0); openCell(0,0);',
    'board[0][0].type = CELL_TYPE.MINE; openCell(0,0);',
  ]) {
    evaluate('resetGame();');
    evaluate(finishAction);
    assert.notEqual(evaluate('gameState.status'), 'process');
    evaluate('resetGame();');
    assert.equal(evaluate('gameState.status'), 'process');
    assert.equal(evaluate('toggleFlag(0,0)'), true);
  }
});
console.log(JSON.stringify({ passed: results.length, tests: results }, null, 2));
