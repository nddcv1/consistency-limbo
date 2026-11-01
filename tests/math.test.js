import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, FUNCTIONS } from '../src/levels.js';
import {
  checkWindow,
  requiredDelta,
  maxDeviation,
  sampleXValues,
  scanValues,
  scanX0,
  envelopePoints,
} from '../src/math.js';

const L1 = LEVELS[0].stages[0];
const L2 = LEVELS[1].stages[0];
const L3 = LEVELS[2].stages[0];
const L4 = LEVELS[3].stages[0];
const B1 = LEVELS[4].stages[0];
const B2 = LEVELS[4].stages[1];

test('preset functions evaluate', () => {
  assert.equal(FUNCTIONS.square.f(2), 4);
  assert.ok(Math.abs(FUNCTIONS.sinSquare.f(2) - Math.sin(4)) < 1e-12);
  assert.equal(FUNCTIONS.reciprocal.f(0.5), 2);
});

test('L1 passes at 0.34 and fails at 0.35', () => {
  assert.equal(checkWindow(L1, 1, 0.34).passed, true);
  const fail = checkWindow(L1, 1, 0.35);
  assert.equal(fail.passed, false);
  assert.ok(fail.xWorst > 1);
});

test('L1 required delta is about 0.34164', () => {
  const d = requiredDelta(L1, 1);
  assert.ok(Math.abs(d - 0.34164) < 0.002, `got ${d}`);
});

test('L2 required delta at three checkpoints', () => {
  const expected = [0.42195, 0.18819, 0.09839];
  L2.win.values.forEach((x0, i) => {
    const d = requiredDelta(L2, x0);
    assert.ok(Math.abs(d - expected[i]) < 0.003, `${x0}: ${d}`);
  });
});

test('L3 is tight', () => {
  assert.equal(checkWindow(L3, 2.5, 0.075).passed, true);
  assert.equal(checkWindow(L3, 2.5, 0.09).passed, false);
});

test('L4 is tight and domain crossing is finite', () => {
  assert.equal(checkWindow(L4, 0.5, 0.082).passed, true);
  assert.equal(checkWindow(L4, 0.5, 0.085).passed, false);
  const crossing = checkWindow(L4, 0.5, 0.6);
  assert.equal(crossing.passed, false);
  assert.ok(Number.isFinite(crossing.deviation));
  assert.ok(crossing.deviation > 1e6);
  assert.ok(sampleXValues(L4, 0.5, 0.6, 64).every((x) => x > 0));
});

test('maxDeviation is monotone in delta', () => {
  const ds = [0.1, 0.2, 0.3].map((d) => maxDeviation(L1, 1, d).deviation);
  assert.ok(ds[0] <= ds[1] && ds[1] <= ds[2]);
});

test('boss act 1 threshold and scan', () => {
  assert.equal(checkWindow(B1, 1, 0.55).passed, true);
  assert.equal(checkWindow(B1, 1, 0.56).passed, false);
  const values = scanValues(B1, 1);
  assert.equal(values.length, 600);
  assert.equal(values[0], 0);
  assert.equal(values[values.length - 1], 1);
  assert.equal(scanX0(B1, 0.55, values).passed, true);
  const fail = scanX0(B1, 0.56, values);
  assert.equal(fail.passed, false);
  assert.ok(fail.firstFail);
});

test('boss act 2 required delta follows the closed form', () => {
  for (const x0 of [10, 100, 1000, 1e6]) {
    const got = requiredDelta(B2, x0);
    const expected = Math.sqrt(x0 * x0 + B2.epsilon) - x0;
    const rel = Math.abs(got - expected) / expected;
    assert.ok(rel < 0.01, `${x0}: got ${got}, expected ${expected}`);
  }
});

test('boss act 2 scan values include 0 and range end', () => {
  const values = scanValues(B2, 10);
  assert.equal(values.length, 401);
  assert.equal(values[0], 0);
  assert.ok(Math.abs(values[values.length - 1] - 10) < 1e-12);
});

test('envelope points are positive', () => {
  const points = envelopePoints(B2, 100, 20);
  assert.equal(points.length, 20);
  assert.ok(points.every((p) => p.x0 > 0 && p.delta > 0));
});
