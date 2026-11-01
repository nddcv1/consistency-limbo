import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/levels.js';
import { makeViewport, worldToScreen, screenToWorld, hitTest } from '../src/renderer.js';

const L1 = LEVELS[0].stages[0];
const L2 = LEVELS[1].stages[0];
const B2 = LEVELS[4].stages[1];
const size = { width: 800, height: 450 };

test('world/screen round-trip on a fixed view', () => {
  const state = { x0: 1, delta: 0.2 };
  const v = makeViewport(size, L1, state);
  const p = worldToScreen(v, 1.2, 2.3);
  const w = screenToWorld(v, p.x, p.y);
  assert.ok(Math.abs(w.x - 1.2) < 1e-9);
  assert.ok(Math.abs(w.y - 2.3) < 1e-9);
});

test('local view is centered on cameraX0', () => {
  const state = { x0: 100, delta: 0.01 };
  const v = makeViewport(size, B2, state, 50);
  assert.ok(Math.abs((v.xMin + v.xMax) / 2 - 50) < 1e-9);
  assert.ok(Math.abs((v.yMin + v.yMax) / 2 - 10000) < 1e-6);
});

test('hit testing finds delta edges and an editable x0', () => {
  const state = { x0: 1, delta: 0.2 };
  const v1 = makeViewport(size, L1, state);
  const left = worldToScreen(v1, 0.8, 0).x;
  assert.equal(hitTest(v1, L1, state, left, v1.plot.y + v1.plot.h / 2), 'delta');

  const state2 = { x0: 1.5, delta: 0.1 };
  const v2 = makeViewport(size, L2, state2);
  const center = worldToScreen(v2, 1.5, 0).x;
  assert.equal(hitTest(v2, L2, state2, center, v2.plot.y + v2.plot.h / 2), 'x0');
  const left2 = worldToScreen(v2, 1.4, 0).x;
  assert.equal(hitTest(v2, L2, state2, left2, v2.plot.y + v2.plot.h / 2), 'delta');
});
