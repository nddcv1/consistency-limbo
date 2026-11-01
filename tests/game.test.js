import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createState,
  setX0,
  setDelta,
  resetStage,
  beginScan,
  finishScan,
  advanceBossAct,
  answerQuiz,
  levelIndexFromParam,
  createProgress,
  markLevelComplete,
  isLevelComplete,
  parseProgress,
  serializeProgress,
} from '../src/game.js';

test('L1 starts failing and passes at small delta', () => {
  let s = createState(0);
  assert.equal(s.check.passed, false);
  s = setDelta(s, 0.2);
  assert.equal(s.check.passed, true);
  assert.equal(s.completed, true);
});

test('resetStage restores the initial delta', () => {
  let s = createState(0);
  s = setDelta(s, 0.2);
  s = resetStage(s);
  assert.equal(s.delta, 0.9);
  assert.equal(s.completed, false);
});

test('L2 checkpoints record and complete', () => {
  let s = createState(1);
  s = setX0(s, 0.5);
  s = setDelta(s, 0.42);
  assert.equal(s.checkpoints[0].solved, true);
  assert.equal(s.checkpoints[0].delta, 0.42);

  s = setX0(s, 2.0);
  s = setDelta(s, 0.05);
  assert.equal(s.checkpoints.filter((c) => c.solved).length, 1);

  s = setX0(s, 1.5);
  s = setDelta(s, 0.18);
  s = setX0(s, 3.0);
  s = setDelta(s, 0.09);
  assert.equal(s.completed, true);
  assert.ok(s.checkpoints.every((c) => c.solved));
});

test('boss act 1 scans and advances', () => {
  let s = createState(4, 0);
  s = setDelta(s, 0.55);
  s = beginScan(s);
  assert.equal(s.scan.result.passed, true);
  s = finishScan(s);
  assert.equal(s.stageComplete, true);
  assert.equal(s.completed, false);
  s = advanceBossAct(s);
  assert.equal(s.stageIndex, 1);
  assert.equal(s.scan.rangeMax, 10);
});

test('boss act 2 extends range and can conclude after three extensions', () => {
  let s = createState(4, 1);
  s = setDelta(s, 0.03);
  s = beginScan(s);
  assert.equal(s.scan.result.passed, true);
  s = finishScan(s);
  assert.equal(s.scan.rangeMax, 100);
  assert.equal(s.scan.extensions, 1);

  s = beginScan(s);
  s = finishScan(s);
  assert.equal(s.scan.passed, false);
  assert.equal(s.scan.rangeMax, 100);

  s = setDelta(s, 0.003);
  s = beginScan(s);
  assert.equal(s.scan.result.passed, true);
  s = finishScan(s);
  assert.equal(s.scan.rangeMax, 1000);

  s = beginScan(s);
  s = finishScan(s);
  s = setDelta(s, 0.0003);
  s = beginScan(s);
  assert.equal(s.scan.result.passed, true);
  s = finishScan(s);
  assert.equal(s.scan.rangeMax, 10000);
  assert.equal(s.scan.extensions, 3);
  assert.equal(s.scan.canConclude, true);
});

test('boss quiz gates completion', () => {
  let s = createState(4, 1);
  s = answerQuiz(s, 'epsilon');
  assert.equal(s.completed, false);
  s = answerQuiz(s, 'domain');
  assert.equal(s.completed, true);
});

test('level param parsing', () => {
  assert.equal(levelIndexFromParam('boss'), 4);
  assert.equal(levelIndexFromParam('5'), 4);
  assert.equal(levelIndexFromParam('3'), 2);
  assert.equal(levelIndexFromParam('99'), 0);
  assert.equal(levelIndexFromParam(null), 0);
});

test('progress round-trips and ignores junk', () => {
  let p = createProgress();
  p = markLevelComplete(p, 0);
  p = markLevelComplete(p, 0);
  assert.deepEqual(p.completed, [0]);
  assert.equal(p.bossQuiz, false);
  assert.equal(isLevelComplete(p, 0), true);
  assert.equal(isLevelComplete(p, 1), false);

  const parsed = parseProgress(serializeProgress(p));
  assert.deepEqual(parsed.completed, [0]);
  assert.deepEqual(parseProgress('not json'), createProgress());
});
