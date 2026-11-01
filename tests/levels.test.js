import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/levels.js';
import { createState } from '../src/game.js';
import { makeViewport, worldToScreen, checkpointHit } from '../src/renderer.js';

const size = { width: 800, height: 450 };

test('exactly five levels, with boss two acts and the rest single-stage', () => {
  assert.equal(LEVELS.length, 5);
  assert.deepEqual(
    LEVELS.map((level) => level.index),
    [1, 2, 3, 4, 5],
  );
  assert.deepEqual(
    LEVELS.map((level) => level.stages.length),
    [1, 1, 1, 1, 2],
  );
  const boss = LEVELS[4];
  assert.equal(boss.id, 'level-5');
  assert.deepEqual(
    boss.stages.map((stage) => stage.win.type),
    ['scan-all', 'impossible-scan'],
  );
});

test('L2 exposes three checkpoints and canvas hit testing finds them', () => {
  const stage = LEVELS[1].stages[0];
  assert.equal(stage.win.type, 'checkpoints');
  assert.deepEqual(stage.win.values, [0.5, 1.5, 3.0]);

  const state = createState(1);
  const viewport = makeViewport(size, stage, state);
  const py = viewport.plot.y + viewport.plot.h / 2;

  for (const cp of state.checkpoints) {
    const px = worldToScreen(viewport, cp.value, 0).x;
    assert.equal(checkpointHit(viewport, stage, state, px, py), cp.value);
  }

  const first = worldToScreen(viewport, state.checkpoints[0].value, 0).x;
  assert.equal(checkpointHit(viewport, stage, state, first + 20, py), null);
  assert.equal(checkpointHit(viewport, stage, state, first, viewport.plot.y - 40), null);
});

test('checkpoint hit testing only applies to the checkpoint stage', () => {
  const stage = LEVELS[0].stages[0];
  const state = createState(0);
  const viewport = makeViewport(size, stage, state);
  assert.equal(
    checkpointHit(viewport, stage, state, viewport.plot.x + 40, viewport.plot.y + 40),
    null,
  );
});
