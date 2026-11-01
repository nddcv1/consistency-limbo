# Consistency Limbo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a static, five-level ε-δ game with a two-act uniform-continuity boss, a live GitHub Pages demo, and a README hero GIF.

**Architecture:** Pure ES modules (`levels.js`, `math.js`, `game.js`) hold all data, math and state logic and are tested with `node --test`; `renderer.js` draws to Canvas; `main.js` is the only DOM module. No build, no runtime dependencies, GitHub Pages serves the repo root directly.

**Tech Stack:** Vanilla ES modules, Canvas 2D, CSS, Node 24 `node:test`, Playwright-core + pngjs + gifenc for the README GIF, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-01-consistency-limbo-design.md`

## Global Constraints

- UI and README are Chinese-first; the repo About and README tagline include one English sentence.
- Exactly 5 levels; the boss has two acts. Preset functions only; no arbitrary expression parsing, no `eval`.
- All math checks are numerical with a 0.1% safety margin; the boss act 2 is a guided visual demonstration, not a formal proof.
- No runtime dependencies, no build step, no backend, no analytics, no cookies, no network requests from the app.
- MIT license, copyright `nddcv1`.
- Node 24 is the test runner; local visual checks use Microsoft Edge at `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`.
- GitHub Pages serves `main` `/` directly; all asset paths are relative.
- **Do not create the public GitHub repo until the user explicitly confirms.** Publish is a gated final task.
- README must not claim “no one has done this.” The competitor section must mention GeoGebra, KU Leuven and Vanishing Point honestly.
- L2 must not claim the player used different δ values; it shows the player's δ and each checkpoint's allowed maximum.
- Boss act 2 must say any finite range has a small enough δ; no uniform δ exists because x₀ has no upper bound.
- README hero is 960×540, 6–8s, ≤4MB GIF; fall back to a 960×540 PNG if GIF tooling fails.
- Three-second rule: the first screen shows the canvas, ε band, δ window and sliders; no start modal.

---

## File Map

| Path | Responsibility |
|---|---|
| `src/levels.js` | Preset functions, domains, all 5 levels and 2 boss acts as data |
| `src/math.js` | Domain clamping, sampling, max deviation, pass check, required δ, scans, envelope points |
| `src/game.js` | Pure state machine: x₀/δ changes, checkpoints, scan transitions, quiz, progress, URL param |
| `src/renderer.js` | Canvas main stage + envelope chart + viewport/hit-test helpers |
| `src/main.js` | DOM wiring, sliders, pointer drag, scan animation, URL/localStorage, demo hook |
| `index.html` | Static shell and accessible controls |
| `styles.css` | Midnight-blueprint visual system and responsive layout |
| `scripts/serve.mjs` | Zero-dependency local static server; exports `startServer` |
| `scripts/record-demo.mjs` | Edge + Playwright-core + pngjs + gifenc GIF recorder |
| `tests/math.test.js` | Numerical behavior and thresholds |
| `tests/game.test.js` | State transitions, progress, quiz |
| `tests/renderer.test.js` | Viewport round-trip and hit testing |
| `assets/favicon.svg` | ε + limbo bar mark |
| `assets/demo.gif` / `assets/demo.png` | README hero and static fallback |
| `README.md`, `LICENSE`, `.nojekyll` | Docs, license, Pages |

---

## Task 1: Pure Math Core and Level Data

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `src/levels.js`
- Create: `src/math.js`
- Test: `tests/math.test.js`

**Interfaces:**
- `FUNCTIONS` is an object keyed `square`, `sinSquare`, `reciprocal`; each entry has `{ key, label, f(x), domain }`.
- `LEVELS` is an array of `{ id, index, title, stages }`; each stage has `id`, `title`, `kicker`, `fn` (a `FUNCTIONS` entry), `x0`, `epsilon`, `delta`, `view`, `win`, `copy`.
- `math.js` exports:
  - `inDomain(domain, x): boolean`
  - `intervalFor(domain, x0, delta): { lo, hi, empty }`
  - `sampleXValues(stage, x0, delta, count=1024): number[]`
  - `evaluate(fn, x): number`
  - `maxDeviation(stage, x0, delta, count=1024): { deviation, xWorst, yWorst }`
  - `checkWindow(stage, x0, delta, count=1024): { passed, deviation, xWorst, yWorst }`
  - `requiredDelta(stage, x0, maxDelta=stage.delta.max, count=256): number`
  - `scanValues(stage, rangeMax): number[]`
  - `scanX0(stage, delta, x0Values): { passed, points, firstFail, firstFailIndex }`
  - `envelopePoints(stage, rangeMax, count=160): { x0, delta }[]`
  - `clearDeltaCache(): void`

### Step 1: Create the project manifest and ignore file

- [ ] Create `package.json` with exactly this content:

```json
{
  "name": "consistency-limbo",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "给学数学分析的人：把 ε-δ 和一致连续拖出来看。",
  "license": "MIT",
  "scripts": {
    "test": "node --test",
    "serve": "node scripts/serve.mjs",
    "demo:gif": "node scripts/record-demo.mjs"
  },
  "devDependencies": {
    "gifenc": "^1.0.3",
    "playwright-core": "^1.64.1",
    "pngjs": "^7.0.0"
  }
}
```

- [ ] Create `.gitignore`:

```gitignore
node_modules/
.DS_Store
*.log
assets/_frames/
```

### Step 2: Write the failing math test

- [ ] Create `tests/math.test.js` with exactly this content:

```js
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
```

### Step 3: Run the test to verify it fails

- [ ] Run:

```bash
npm test
```

Expected: FAIL because `../src/levels.js` and `../src/math.js` do not exist.

### Step 4: Implement `src/levels.js`

- [ ] Create `src/levels.js` with exactly this content:

```js
const ALL_REALS = { min: -Infinity, max: Infinity, openMin: false, openMax: false };
const UNIT_INTERVAL = { min: 0, max: 1, openMin: false, openMax: false };
const NONNEGATIVE_REALS = { min: 0, max: Infinity, openMin: false, openMax: false };
const POSITIVE_REALS = { min: 0, max: Infinity, openMin: true, openMax: false };

export const FUNCTIONS = {
  square: {
    key: 'square',
    label: 'x²',
    f: (x) => x * x,
    domain: ALL_REALS,
  },
  sinSquare: {
    key: 'sinSquare',
    label: 'sin(x²)',
    f: (x) => Math.sin(x * x),
    domain: ALL_REALS,
  },
  reciprocal: {
    key: 'reciprocal',
    label: '1/x',
    f: (x) => 1 / x,
    domain: POSITIVE_REALS,
  },
};

const square = FUNCTIONS.square;
const sinSquare = FUNCTIONS.sinSquare;
const reciprocal = FUNCTIONS.reciprocal;
const squareOnUnit = { ...square, key: 'squareOnUnit', domain: UNIT_INTERVAL };
const squareOnPositive = { ...square, key: 'squareOnPositive', domain: NONNEGATIVE_REALS };

export const LEVELS = [
  {
    id: 'level-1',
    index: 1,
    title: '把曲线塞进带子',
    stages: [
      {
        id: 'level-1',
        title: '把曲线塞进带子',
        kicker: 'LV. 01 / 热身',
        fn: square,
        x0: { value: 1, min: 1, max: 1, step: 0.001, editable: false, log: false },
        epsilon: 0.8,
        delta: { min: 0, max: 1, step: 0.001, initial: 0.9, log: false },
        view: { mode: 'fixed', x: [-0.5, 2.5], y: [-0.5, 5] },
        win: { type: 'single' },
        copy: {
          objective: '把绿色窗口里的曲线，全部塞进琥珀色带子。',
          hint: '先把 δ 拖小，再一点点放大。',
          success: '全绿。给定 ε，找到 δ——这就是在 x₀ 处连续。',
        },
      },
    ],
  },
  {
    id: 'level-2',
    index: 2,
    title: '同一个 f，不同的 x₀',
    stages: [
      {
        id: 'level-2',
        title: '同一个 f，不同的 x₀',
        kicker: 'LV. 02 / 逐点',
        fn: square,
        x0: { value: 0.5, min: 0.2, max: 3.2, step: 0.001, editable: true, log: false },
        epsilon: 0.6,
        delta: { min: 0, max: 1, step: 0.001, initial: 0.8, log: false },
        view: { mode: 'fixed', x: [-0.5, 3.6], y: [-0.5, 12.5] },
        win: { type: 'checkpoints', values: [0.5, 1.5, 3.0], tolerance: 0.03 },
        copy: {
          objective: '点亮三个 x₀：同一个函数，每一处能容忍的最大 δ 并不一样。',
          hint: '点击画布上的三个标记可以直接跳过去。',
          success:
            '同一个函数，三个位置。你当然可以用一把很小的 δ 全过；但每个位置允许的最大 δ 不同——逐点连续允许 δ 依赖 x₀。',
        },
      },
    ],
  },
  {
    id: 'level-3',
    index: 3,
    title: '抖动：sin(x²)',
    stages: [
      {
        id: 'level-3',
        title: '抖动：sin(x²)',
        kicker: 'LV. 03 / 高频',
        fn: sinSquare,
        x0: { value: 2.5, min: 2.5, max: 2.5, step: 0.001, editable: false, log: false },
        epsilon: 0.4,
        delta: { min: 0, max: 0.4, step: 0.001, initial: 0.3, log: false },
        view: { mode: 'fixed', x: [1.2, 3.8], y: [-1.5, 1.5] },
        win: { type: 'single' },
        copy: {
          objective: 'sin(x²) 在 x₀ = 2.5 附近抖得很快。δ 稍微大一点，就有一条摆线漏出去。',
          hint: '往 0.1 以下收；别被远处的峰骗了。',
          success: '局部再凶，逐点连续仍然成立——只要 δ 足够小。',
        },
      },
    ],
  },
  {
    id: 'level-4',
    index: 4,
    title: '边界：1/x',
    stages: [
      {
        id: 'level-4',
        title: '边界：1/x',
        kicker: 'LV. 04 / 定义域',
        fn: reciprocal,
        x0: { value: 0.5, min: 0.5, max: 0.5, step: 0.001, editable: false, log: false },
        epsilon: 0.4,
        delta: { min: 0, max: 0.6, step: 0.001, initial: 0.2, log: false },
        view: { mode: 'fixed', x: [-0.1, 2.5], y: [-0.5, 8] },
        win: { type: 'single' },
        copy: {
          objective: '1/x 在 0 附近越来越陡。把 δ 收小；顺便注意 x = 0 根本没有定义。',
          hint: '把 δ 拖大，看看窗口跨过 0 时会发生什么。',
          success: 'δ 被 0 附近的陡峭逼得很小。定义域边界不是装饰。',
        },
      },
    ],
  },
  {
    id: 'level-5',
    index: 5,
    title: '一致连续 Limbo',
    stages: [
      {
        id: 'boss-1',
        title: '第一幕：一致连续长什么样',
        kicker: 'LV. 05 / BOSS · 1/2',
        fn: squareOnUnit,
        x0: { value: 0.5, min: 0, max: 1, step: 0.001, editable: true, log: false },
        epsilon: 0.8,
        delta: { min: 0, max: 1, step: 0.001, initial: 0.9, log: false },
        view: { mode: 'fixed', x: [-0.05, 1.05], y: [-0.9, 1.9] },
        win: { type: 'scan-all', samples: 600, scan: { type: 'linear', min: 0, max: 1 } },
        copy: {
          objective: 'ε 锁死，只有一把 δ。扫描所有 x₀，让每一处都全绿。',
          hint: '先在 x₀=1 附近找极限，再点扫描。',
          success: '一把 δ 管住了 [0,1] 上的所有 x₀。这就是一致连续。',
        },
      },
      {
        id: 'boss-2',
        title: '第二幕：Limbo',
        kicker: 'LV. 05 / BOSS · 2/2',
        fn: squareOnPositive,
        x0: { value: 2, min: 0.1, max: 10, step: 0.001, editable: true, log: true },
        epsilon: 0.8,
        delta: { min: 1e-6, max: 1, step: 0.0001, initial: 0.5, log: true },
        view: { mode: 'local', yPadding: 4 },
        win: {
          type: 'impossible-scan',
          initialRange: 10,
          rangeFactor: 10,
          maxRange: 1e6,
          samples: 400,
          extensionsBeforeConclude: 3,
          scan: { type: 'log', min: 0.1 },
        },
        copy: {
          objective: '同样的 x²，定义域换成 [0,∞)。ε 还是锁死，δ 还是一把。',
          hint: '扫描成功后，范围会自动 ×10。看看 δ 被逼到哪里。',
          success: '你撞到了 limbo 的墙。',
        },
      },
    ],
  },
];
```

### Step 5: Implement `src/math.js`

- [ ] Create `src/math.js` with exactly this content:

```js
const PASS_MARGIN = 0.999;
const DELTA_CACHE = new Map();

export function inDomain(domain, x) {
  if (!Number.isFinite(x)) return false;
  if (domain.openMin ? x <= domain.min : x < domain.min) return false;
  if (domain.openMax ? x >= domain.max : x > domain.max) return false;
  return true;
}

export function intervalFor(domain, x0, delta) {
  let lo = Math.max(x0 - delta, domain.min);
  let hi = Math.min(x0 + delta, domain.max);

  if (domain.openMin && lo <= domain.min) {
    const span = Math.max(1, hi - domain.min);
    lo = domain.min + span * 1e-9;
  }
  if (domain.openMax && hi >= domain.max) {
    const span = Math.max(1, domain.max - lo);
    hi = domain.max - span * 1e-9;
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) {
    return { lo: 0, hi: 0, empty: true };
  }
  return { lo, hi, empty: false };
}

export function sampleXValues(stage, x0, delta, count = 1024) {
  const { domain } = stage.fn;
  const { lo, hi, empty } = intervalFor(domain, x0, delta);
  if (empty) return [];

  const n = Math.max(2, Math.floor(count));
  const values = [];
  for (let i = 0; i < n; i += 1) {
    const t = i / (n - 1);
    values.push(lo + (hi - lo) * t);
  }
  values.push(x0);

  if (domain.openMin && lo < domain.min + Math.max(1e-9, (hi - domain.min) * 1e-6)) {
    for (const k of [1e-12, 1e-9, 1e-6, 1e-4]) {
      const x = domain.min + k * Math.max(1, hi - domain.min);
      if (x > domain.min && x <= hi) values.push(x);
    }
  }

  return [...new Set(values.filter((x) => inDomain(domain, x)))].sort((a, b) => a - b);
}

export function evaluate(fn, x) {
  const y = fn(x);
  return Number.isFinite(y) ? y : NaN;
}

export function maxDeviation(stage, x0, delta, count = 1024) {
  const y0 = evaluate(stage.fn.f, x0);
  if (!Number.isFinite(y0)) return { deviation: Infinity, xWorst: x0, yWorst: NaN };

  const xs = sampleXValues(stage, x0, delta, count);
  let deviation = 0;
  let xWorst = x0;
  let yWorst = y0;

  for (const x of xs) {
    const y = inDomain(stage.fn.domain, x) ? evaluate(stage.fn.f, x) : NaN;
    if (!Number.isFinite(y)) continue;
    const d = Math.abs(y - y0);
    if (d > deviation) {
      deviation = d;
      xWorst = x;
      yWorst = y;
    }
  }
  return { deviation, xWorst, yWorst };
}

export function checkWindow(stage, x0, delta, count = 1024) {
  const worst = maxDeviation(stage, x0, delta, count);
  return {
    ...worst,
    passed: worst.deviation <= stage.epsilon * PASS_MARGIN,
  };
}

export function requiredDelta(stage, x0, maxDelta = stage.delta.max, count = 256) {
  const key = `${stage.id}:${x0.toPrecision(12)}:${maxDelta}:${count}`;
  if (DELTA_CACHE.has(key)) return DELTA_CACHE.get(key);
  if (!inDomain(stage.fn.domain, x0)) {
    DELTA_CACHE.set(key, 0);
    return 0;
  }

  const passes = (delta) => checkWindow(stage, x0, delta, count).passed;
  if (passes(maxDelta)) {
    DELTA_CACHE.set(key, maxDelta);
    return maxDelta;
  }

  let lo = 0;
  let hi = maxDelta;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (passes(mid)) lo = mid;
    else hi = mid;
  }
  DELTA_CACHE.set(key, lo);
  return lo;
}

export function scanValues(stage, rangeMax) {
  const count = stage.win.samples;
  const cfg = stage.win.scan;

  if (cfg.type === 'linear') {
    const out = [];
    for (let i = 0; i < count; i += 1) {
      const t = i / (count - 1);
      out.push(cfg.min + (cfg.max - cfg.min) * t);
    }
    return out;
  }

  const min = cfg.min;
  const out = [0];
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    out.push(min * Math.pow(rangeMax / min, t));
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

export function scanX0(stage, delta, x0Values) {
  const points = x0Values.map((x0) => {
    const c = checkWindow(stage, x0, delta, 512);
    return { x0, passed: c.passed, deviation: c.deviation, xWorst: c.xWorst, yWorst: c.yWorst };
  });
  const firstFailIndex = points.findIndex((p) => !p.passed);
  return {
    passed: firstFailIndex === -1,
    points,
    firstFailIndex,
    firstFail: firstFailIndex === -1 ? null : points[firstFailIndex],
  };
}

export function envelopePoints(stage, rangeMax, count = 160) {
  const min = 0.1;
  const points = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const x0 = min * Math.pow(rangeMax / min, t);
    points.push({ x0, delta: requiredDelta(stage, x0) });
  }
  return points;
}

export function clearDeltaCache() {
  DELTA_CACHE.clear();
}
```

### Step 6: Run the tests and fix failures

- [ ] Run:

```bash
npm test
```

Expected: 11 tests PASS. If a threshold is off by a few thousandths, inspect the sampling margin before changing the test; do not loosen a tolerance above `0.005`.

### Step 7: Commit

- [ ] Run:

```bash
git add package.json .gitignore src/levels.js src/math.js tests/math.test.js
git commit -m "feat: add epsilon-delta math core and level data"
```

---

## Task 2: Game State, Scan Transitions, Quiz and Progress

**Files:**
- Create: `src/game.js`
- Test: `tests/game.test.js`

**Interfaces:**
- `createState(levelIndex=0, stageIndex=0)` returns a state object.
- `getLevel(state)` and `getStage(state)`.
- `setX0(state, value)` and `setDelta(state, value)` return new states.
- `resetStage(state)` returns a fresh state for the same level/stage.
- `beginScan(state)` precomputes scan points; `finishScan(state)` applies the result and auto-extends boss act 2.
- `advanceBossAct(state)` moves boss act 1 → act 2 only when act 1 is complete.
- `answerQuiz(state, choice)` accepts `'domain'` as the only correct choice.
- `levelIndexFromParam(value)`, `createProgress()`, `markLevelComplete(progress, levelIndex)`, `isLevelComplete(progress, levelIndex)`, `parseProgress(raw)`, `serializeProgress(progress)`.

**State shape (exact names later tasks rely on):**

```js
{
  levelIndex, stageIndex, x0, delta,
  check: { passed, deviation, xWorst, yWorst },
  checkpoints: [{ value, solved, delta }],
  scan: {
    running, progress, points, result, firstFail, passed,
    stopProgress, rangeMax, extensions, canConclude, autoRescan, atMax
  },
  quiz: { attempted, correct, answer },
  stageComplete,
  completed
}
```

### Step 1: Write the failing game-state test

- [ ] Create `tests/game.test.js` with exactly this content:

```js
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
```

### Step 2: Run the test to verify it fails

- [ ] Run:

```bash
node --test tests/game.test.js
```

Expected: FAIL with “Cannot find module … src/game.js”.

### Step 3: Implement `src/game.js`

- [ ] Create `src/game.js` with exactly this content:

```js
import { LEVELS } from './levels.js';
import { checkWindow, scanValues, scanX0 } from './math.js';

const clamp = (value, lo, hi) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
};

const isScanStage = (stage) =>
  stage.win.type === 'scan-all' || stage.win.type === 'impossible-scan';

export function getLevel(state) {
  return LEVELS[state.levelIndex];
}

export function getStage(state) {
  return getLevel(state).stages[state.stageIndex];
}

function initialCheckpoints(stage) {
  if (stage.win.type !== 'checkpoints') return [];
  return stage.win.values.map((value) => ({ value, solved: false, delta: null }));
}

function invalidateScan(state) {
  if (!state.scan) return state;
  return {
    ...state,
    scan: {
      ...state.scan,
      points: [],
      result: null,
      firstFail: null,
      passed: null,
      progress: 0,
      stopProgress: 1,
      autoRescan: false,
    },
  };
}

function recordCheckpoint(state) {
  const stage = getStage(state);
  if (stage.win.type !== 'checkpoints' || !state.check.passed) return state;
  const idx = stage.win.values.findIndex(
    (value) => Math.abs(state.x0 - value) <= stage.win.tolerance,
  );
  if (idx < 0 || state.checkpoints[idx].solved) return state;

  const checkpoints = state.checkpoints.map((cp, i) =>
    i === idx ? { ...cp, solved: true, delta: state.delta } : cp,
  );
  return { ...state, checkpoints };
}

function recompute(state) {
  const stage = getStage(state);
  const check = checkWindow(stage, state.x0, state.delta);
  let next = { ...state, check };

  if (stage.win.type === 'checkpoints') {
    next = recordCheckpoint(next);
    if (next.checkpoints.every((cp) => cp.solved)) {
      next = { ...next, stageComplete: true, completed: true };
    }
  } else if (stage.win.type === 'single' && check.passed) {
    next = { ...next, stageComplete: true, completed: true };
  }
  return next;
}

export function createState(levelIndex = 0, stageIndex = 0) {
  const level = LEVELS[levelIndex] ?? LEVELS[0];
  const safeLevelIndex = LEVELS.indexOf(level);
  const stage = level.stages[stageIndex] ?? level.stages[0];
  const safeStageIndex = level.stages.indexOf(stage);
  const x0 = stage.x0.value;
  const delta = stage.delta.initial;

  const state = {
    levelIndex: safeLevelIndex,
    stageIndex: safeStageIndex,
    x0,
    delta,
    check: checkWindow(stage, x0, delta),
    checkpoints: initialCheckpoints(stage),
    scan: {
      running: false,
      progress: 0,
      points: [],
      result: null,
      firstFail: null,
      passed: null,
      stopProgress: 1,
      rangeMax: stage.win.type === 'impossible-scan' ? stage.win.initialRange : null,
      extensions: 0,
      canConclude: false,
      autoRescan: false,
      atMax: false,
    },
    quiz: { attempted: false, correct: false, answer: null },
    stageComplete: false,
    completed: false,
  };
  return recompute(state);
}

export function setX0(state, value) {
  const stage = getStage(state);
  if (!stage.x0.editable) return state;
  const max = stage.win.type === 'impossible-scan' ? state.scan.rangeMax : stage.x0.max;
  return recompute({ ...state, x0: clamp(value, stage.x0.min, max) });
}

export function setDelta(state, value) {
  const stage = getStage(state);
  const delta = clamp(value, stage.delta.min, stage.delta.max);
  const next = { ...state, delta };
  return recompute(isScanStage(stage) ? invalidateScan(next) : next);
}

export function resetStage(state) {
  return createState(state.levelIndex, state.stageIndex);
}

export function beginScan(state) {
  const stage = getStage(state);
  if (!isScanStage(stage)) return state;

  const rangeMax = stage.win.type === 'impossible-scan' ? state.scan.rangeMax : stage.win.scan.max;
  const values = scanValues(stage, rangeMax);
  const result = scanX0(stage, state.delta, values);
  const stopProgress =
    result.firstFailIndex === -1
      ? 1
      : result.firstFailIndex / Math.max(1, result.points.length - 1);

  return {
    ...state,
    scan: {
      ...state.scan,
      running: true,
      progress: 0,
      points: result.points,
      result,
      firstFail: result.firstFail,
      passed: result.passed,
      stopProgress,
      autoRescan: false,
      atMax: false,
    },
  };
}

export function finishScan(state) {
  const stage = getStage(state);
  const result = state.scan.result;
  if (!result) return state;

  if (!result.passed) {
    const maxX0 = state.scan.rangeMax ?? stage.x0.max;
    const x0 = result.firstFail
      ? clamp(result.firstFail.x0, stage.x0.min, maxX0)
      : state.x0;
    const next = {
      ...state,
      x0,
      scan: {
        ...state.scan,
        running: false,
        progress: state.scan.stopProgress,
        passed: false,
        autoRescan: false,
      },
    };
    return recompute(next);
  }

  if (stage.win.type === 'scan-all') {
    return {
      ...state,
      stageComplete: true,
      completed: false,
      scan: {
        ...state.scan,
        running: false,
        progress: 1,
        passed: true,
        autoRescan: false,
      },
    };
  }

  if (stage.win.type === 'impossible-scan') {
    const oldRange = state.scan.rangeMax;
    const nextRange = Math.min(oldRange * stage.win.rangeFactor, stage.win.maxRange);
    const extended = nextRange > oldRange;
    const extensions = state.scan.extensions + (extended ? 1 : 0);
    return {
      ...state,
      scan: {
        ...state.scan,
        running: false,
        progress: 1,
        passed: true,
        rangeMax: nextRange,
        extensions,
        canConclude: extensions >= stage.win.extensionsBeforeConclude,
        autoRescan: extended,
        atMax: nextRange >= stage.win.maxRange,
      },
    };
  }

  return state;
}

export function advanceBossAct(state) {
  if (state.levelIndex !== 4 || state.stageIndex !== 0 || !state.stageComplete) return state;
  return createState(4, 1);
}

export function answerQuiz(state, choice) {
  if (state.levelIndex !== 4 || state.stageIndex !== 1) return state;
  const correct = choice === 'domain';
  const next = { ...state, quiz: { attempted: true, correct, answer: choice } };
  if (!correct) return next;
  return { ...next, stageComplete: true, completed: true };
}

export function levelIndexFromParam(value) {
  if (value === 'boss') return 4;
  const n = Number.parseInt(value, 10);
  if (Number.isInteger(n) && n >= 1 && n <= 5) return n - 1;
  return 0;
}

export function createProgress() {
  return { completed: [], bossQuiz: false };
}

export function markLevelComplete(progress, levelIndex) {
  const completed = [...new Set([...progress.completed, levelIndex])].sort((a, b) => a - b);
  return {
    ...progress,
    completed,
    bossQuiz: progress.bossQuiz || levelIndex === 4,
  };
}

export function isLevelComplete(progress, levelIndex) {
  return progress.completed.includes(levelIndex);
}

export function parseProgress(raw) {
  if (!raw) return createProgress();
  try {
    const data = JSON.parse(raw);
    const completed = Array.isArray(data.completed)
      ? data.completed.filter(
          (n) => Number.isInteger(n) && n >= 0 && n < LEVELS.length,
        )
      : [];
    return {
      completed: [...new Set(completed)].sort((a, b) => a - b),
      bossQuiz: data.bossQuiz === true,
    };
  } catch {
    return createProgress();
  }
}

export function serializeProgress(progress) {
  return JSON.stringify(progress);
}
```

### Step 4: Run the tests

- [ ] Run:

```bash
npm test
```

Expected: all math and game tests PASS. If the boss act 2 extension test stops at `rangeMax: 100` because the scan still passes, print `scan.result` debug output; each successful scan must extend exactly ×10 until `maxRange`.

### Step 5: Commit

- [ ] Run:

```bash
git add src/game.js tests/game.test.js
git commit -m "feat: add game state, boss scans, quiz and progress"
```

---

## Task 3: Complete UI, Canvas Renderer and Local Server

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `assets/favicon.svg`
- Create: `src/renderer.js`
- Create: `src/main.js`
- Create: `scripts/serve.mjs`
- Test: `tests/renderer.test.js`

**Interfaces:**
- `renderer.js` exports `fitCanvas(canvas)`, `makeViewport(size, stage, state, cameraX0)`, `worldToScreen(viewport, x, y)`, `screenToWorld(viewport, px, py)`, `hitTest(viewport, stage, state, px, py)`, `drawMain(ctx, size, stage, state, time, reduceMotion, cameraX0)`, `drawEnvelope(ctx, size, stage, state)`.
- `main.js` is the only module that touches `document`, `window`, `localStorage`, `history` and `performance`.
- IDs in `index.html` are the contract: `canvas`, `level-rail`, `stage-kicker`, `stage-title`, `stage-objective`, `epsilon-readout`, `delta-readout`, `status`, `checkpoint-panel`, `scan-panel`, `scan-count`, `scan-fill`, `boss-chart`, `chart-range`, `envelope`, `scan-button`, `next-button`, `quiz-open`, `quiz-panel`, `quiz-feedback`, `x0-slider`, `x0-value`, `delta-slider`, `delta-value`, `reset-button`, `final-overlay`, `replay-button`, `home-button`, `stage-hint`.

### Step 1: Create the accessible page shell

- [ ] Create `index.html` with exactly this content:

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0a1024">
  <title>Consistency Limbo · ε-δ 拖拽实验室</title>
  <meta name="description" content="给学数学分析的人：把 ε-δ 和一致连续拖出来，看见为止。">
  <meta property="og:title" content="Consistency Limbo">
  <meta property="og:description" content="给学数学分析的人：把 ε-δ 和一致连续拖出来，看见为止。">
  <meta property="og:type" content="website">
  <link rel="icon" href="./assets/favicon.svg">
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <div class="app">
    <header class="topbar">
      <a class="wordmark" href="./" aria-label="Consistency Limbo">
        <span class="wordmark-mark" aria-hidden="true">ε</span>
        <span>CONSISTENCY LIMBO</span>
      </a>
      <nav id="level-rail" class="level-rail" aria-label="关卡"></nav>
    </header>

    <main class="layout">
      <section class="stage" aria-label="函数图像">
        <canvas id="canvas" role="img" aria-label="ε-δ 图像"></canvas>
        <div class="stage-footer">
          <span id="stage-hint" class="stage-hint">拖动 δ 窗口的边，或使用下方滑块。</span>
          <span class="stage-legend" aria-hidden="true">
            <span class="legend-swatch legend-band"></span> ε 带
            <span class="legend-swatch legend-window"></span> δ 窗
          </span>
        </div>
      </section>

      <aside class="rail">
        <p id="stage-kicker" class="kicker">LV. 01 / 热身</p>
        <h1 id="stage-title" class="stage-title">把曲线塞进带子</h1>
        <p id="stage-objective" class="objective"></p>
        <dl class="readouts">
          <div><dt>ε</dt><dd id="epsilon-readout">0.8</dd></div>
          <div><dt>δ</dt><dd id="delta-readout">0.900</dd></div>
        </dl>
        <p id="status" class="status" role="status" aria-live="polite"></p>
        <div id="checkpoint-panel" class="checkpoints" hidden></div>
        <div id="scan-panel" class="scan-panel" hidden>
          <div class="scan-head"><span>扫描所有 x₀</span><span id="scan-count">0 / 0</span></div>
          <div class="scan-track"><div id="scan-fill" class="scan-fill"></div></div>
        </div>
        <div id="boss-chart" class="boss-chart" hidden>
          <div class="chart-head"><span>所需 δ vs x₀</span><span id="chart-range">R = 10</span></div>
          <canvas id="envelope" role="img" aria-label="所需 δ 随 x₀ 变化的包络图"></canvas>
          <p class="chart-legend">
            <span class="legend-line legend-required"></span>每个 x₀ 所需 δ
            <span class="legend-line legend-yours"></span>你的 δ
          </p>
        </div>
        <div class="actions">
          <button id="scan-button" class="button primary" type="button" hidden>扫描所有 x₀</button>
          <button id="next-button" class="button primary" type="button" hidden>下一关</button>
          <button id="quiz-open" class="button primary" type="button" hidden>我看到了</button>
        </div>
        <div id="quiz-panel" class="quiz" hidden>
          <p class="quiz-q">要让 x² 在 [0,∞) 上一致连续，应该改什么？</p>
          <button class="quiz-option" type="button" data-answer="domain">A. 把定义域限制到 [0, b]</button>
          <button class="quiz-option" type="button" data-answer="epsilon">B. 把 ε 调大</button>
          <button class="quiz-option" type="button" data-answer="delta">C. 把 δ 调得更小</button>
          <p id="quiz-feedback" class="quiz-feedback" aria-live="polite"></p>
        </div>
      </aside>
    </main>

    <footer class="controls">
      <label class="control" for="x0-slider">
        <span class="control-label">x₀ <output id="x0-value">1.00</output></span>
        <input id="x0-slider" type="range" min="1" max="1" step="0.001" value="1">
      </label>
      <label class="control" for="delta-slider">
        <span class="control-label">δ <output id="delta-value">0.900</output></span>
        <input id="delta-slider" type="range" min="0" max="1" step="0.001" value="0.9">
      </label>
      <button id="reset-button" class="button quiet" type="button">重置本关</button>
    </footer>
  </div>

  <div id="final-overlay" class="overlay" hidden>
    <div class="overlay-card">
      <p class="kicker">LV. 05 / LIMBO</p>
      <h2>你撞到了 limbo 的墙</h2>
      <p>x² 在 [0,∞) 上不一致连续。限制定义域到 [0, b]，一个 δ 就又能管住所有 x₀。</p>
      <div class="overlay-actions">
        <button id="replay-button" class="button primary" type="button">再玩一次</button>
        <button id="home-button" class="button quiet" type="button">回到第一关</button>
      </div>
    </div>
  </div>

  <noscript><p class="noscript">这个游戏需要 JavaScript 和 Canvas。</p></noscript>
  <script type="module" src="./src/main.js"></script>
</body>
</html>
```

- [ ] Create `assets/favicon.svg` so the page does not 404 before Task 4:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#0a1024"/>
  <text x="32" y="43" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="38" fill="#ffbe5c">ε</text>
  <rect x="14" y="48" width="36" height="2" fill="#56e1c3"/>
</svg>
```

### Step 2: Create the midnight-blueprint stylesheet

- [ ] Create `styles.css` with exactly this content:

```css
:root {
  --bg: #0a1024;
  --bg-soft: #0d1530;
  --text: #e8edff;
  --muted: #9aa7c7;
  --line: rgba(140, 170, 255, 0.18);
  --line-strong: rgba(140, 170, 255, 0.32);
  --grid: rgba(140, 170, 255, 0.08);
  --curve: #f4f7ff;
  --band: #ffbe5c;
  --band-fill: rgba(255, 190, 92, 0.14);
  --window: #56e1c3;
  --window-fill: rgba(86, 225, 195, 0.1);
  --danger: #ff6b6b;
  --success: #7bf1a8;
  --font-serif: "Noto Serif SC", "Songti SC", "STSong", Georgia, serif;
  --font-mono: "Cascadia Code", "SFMono-Regular", Consolas, monospace;
  --font-sans: Inter, "Noto Sans SC", "Microsoft YaHei", sans-serif;
}
* { box-sizing: border-box; }
html { color-scheme: dark; }
body {
  margin: 0;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
[hidden] { display: none !important; }
button, input { font: inherit; }
button { color: inherit; }
a { color: inherit; text-decoration: none; }
:focus-visible { outline: 2px solid var(--window); outline-offset: 3px; }
::selection { background: rgba(86, 225, 195, 0.28); }

.app { max-width: 1440px; margin: 0 auto; padding: 0 28px 22px; }
.topbar { height: 58px; display: flex; align-items: center; gap: 24px; border-bottom: 1px solid var(--line); }
.wordmark { display: inline-flex; align-items: center; gap: 10px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.18em; color: var(--text); white-space: nowrap; }
.wordmark-mark { display: grid; place-items: center; width: 26px; height: 26px; border: 1px solid var(--line-strong); font-family: var(--font-serif); font-size: 18px; line-height: 1; color: var(--band); position: relative; }
.wordmark-mark::after { content: ""; position: absolute; left: 4px; right: 4px; bottom: 4px; height: 1px; background: var(--window); opacity: .8; }
.level-rail { margin-left: auto; display: flex; align-items: center; position: relative; }
.level-rail::before { content: ""; position: absolute; left: 8px; right: 8px; top: 50%; height: 1px; background: var(--line); }
.rail-item { position: relative; z-index: 1; width: 44px; height: 32px; display: grid; place-items: center; border: 0; background: var(--bg); color: var(--muted); font-family: var(--font-mono); font-size: 11px; letter-spacing: .08em; cursor: pointer; transition: color .15s ease; }
.rail-item:hover { color: var(--text); }
.rail-item.active { color: var(--band); }
.rail-item.active::before { content: ""; position: absolute; inset: 4px 6px; border: 1px solid var(--line-strong); }
.rail-item.complete { color: var(--window); }
.rail-item.complete::after { content: "✓"; position: absolute; top: -1px; right: 1px; font-size: 9px; color: var(--success); }
.level-rail.locked { pointer-events: none; opacity: .55; }

.layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 22px; padding: 18px 0 14px; align-items: stretch; }
.stage { min-width: 0; display: flex; flex-direction: column; border: 1px solid var(--line); background: var(--bg); position: relative; }
.stage::before, .stage::after { content: ""; position: absolute; width: 8px; height: 8px; border-color: var(--line-strong); pointer-events: none; }
.stage::before { left: -1px; top: -1px; border-left: 1px solid; border-top: 1px solid; }
.stage::after { right: -1px; bottom: -1px; border-right: 1px solid; border-bottom: 1px solid; }
#canvas { display: block; width: 100%; aspect-ratio: 16 / 9; min-height: 260px; touch-action: none; cursor: default; }
.stage-footer { display: flex; justify-content: space-between; align-items: center; gap: 14px; border-top: 1px solid var(--line); padding: 8px 12px; color: var(--muted); font-size: 11px; }
.stage-hint { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stage-legend { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; font-family: var(--font-mono); font-size: 10px; }
.legend-swatch { width: 18px; height: 2px; display: inline-block; }
.legend-band { background: var(--band); }
.legend-window { background: var(--window); margin-left: 8px; }

.rail { display: flex; flex-direction: column; gap: 11px; min-width: 0; padding: 2px 0 0 18px; border-left: 1px solid var(--line); }
.kicker { margin: 0; color: var(--muted); font-family: var(--font-mono); font-size: 10px; letter-spacing: .14em; }
.stage-title { margin: -4px 0 0; font-family: var(--font-serif); font-size: clamp(24px, 2.2vw, 34px); font-weight: 600; line-height: 1.18; letter-spacing: -.01em; }
.objective { margin: 0; color: var(--muted); font-size: 13px; }
.readouts { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 2px 0 0; padding: 10px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.readouts div { min-width: 0; }
.readouts dt { color: var(--muted); font-family: var(--font-mono); font-size: 10px; letter-spacing: .1em; }
.readouts dd { margin: 2px 0 0; font-family: var(--font-mono); font-size: 22px; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status { min-height: 40px; margin: 0; font-size: 13px; color: var(--muted); }
.status.pass { color: var(--success); }
.status.fail { color: var(--danger); }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.button { border: 1px solid var(--line-strong); background: transparent; padding: 8px 13px; font-family: var(--font-mono); font-size: 11px; letter-spacing: .04em; cursor: pointer; transition: background .15s ease, border-color .15s ease, color .15s ease; }
.button:hover { border-color: var(--window); color: var(--window); }
.button.primary { background: var(--window); border-color: var(--window); color: #06131a; }
.button.primary:hover { background: var(--success); border-color: var(--success); color: #06131a; }
.button.quiet { color: var(--muted); }
.button:disabled { opacity: .35; cursor: not-allowed; }
.checkpoints { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.checkpoint { border: 1px solid var(--line); background: transparent; padding: 6px; text-align: left; cursor: pointer; color: var(--muted); font-family: var(--font-mono); font-size: 10px; line-height: 1.5; }
.checkpoint:hover { border-color: var(--window); }
.checkpoint.solved { border-color: rgba(86, 225, 195, .5); color: var(--window); }
.cp-x, .cp-state, .cp-max { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cp-state { color: var(--text); font-size: 11px; }
.cp-max { color: var(--muted); font-size: 9px; }
.scan-panel { display: flex; flex-direction: column; gap: 5px; }
.scan-head { display: flex; justify-content: space-between; color: var(--muted); font-family: var(--font-mono); font-size: 10px; }
.scan-track { height: 3px; background: var(--line); overflow: hidden; }
.scan-fill { width: 0; height: 100%; background: var(--window); transition: width .08s linear; }
.boss-chart { display: flex; flex-direction: column; gap: 5px; padding-top: 10px; border-top: 1px solid var(--line); }
.chart-head { display: flex; justify-content: space-between; color: var(--muted); font-family: var(--font-mono); font-size: 10px; }
#envelope { width: 100%; height: 132px; display: block; border: 1px solid var(--line); background: rgba(10, 16, 36, .5); }
.chart-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; margin: 0; color: var(--muted); font-family: var(--font-mono); font-size: 9px; }
.legend-line { width: 16px; height: 2px; display: inline-block; }
.legend-required { background: var(--band); }
.legend-yours { background: var(--window); margin-left: 8px; }
.quiz { display: flex; flex-direction: column; gap: 6px; padding-top: 10px; border-top: 1px solid var(--line); }
.quiz-q { margin: 0 0 4px; font-size: 13px; }
.quiz-option { text-align: left; border: 1px solid var(--line); background: transparent; padding: 7px 9px; color: var(--text); font-size: 12px; cursor: pointer; }
.quiz-option:hover { border-color: var(--window); }
.quiz-feedback { margin: 4px 0 0; min-height: 20px; color: var(--muted); font-size: 12px; }

.controls { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; gap: 18px; align-items: end; border-top: 1px solid var(--line); padding-top: 12px; }
.control { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.control-label { display: flex; justify-content: space-between; color: var(--muted); font-family: var(--font-mono); font-size: 11px; }
.control output { color: var(--text); font-variant-numeric: tabular-nums; }
input[type="range"] { -webkit-appearance: none; appearance: none; width: 100%; height: 20px; margin: 0; background: transparent; cursor: pointer; }
input[type="range"]::-webkit-slider-runnable-track { height: 2px; background: var(--line-strong); }
input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; margin-top: -6px; border-radius: 50%; background: var(--text); border: 2px solid var(--bg); box-shadow: 0 0 0 1px var(--line-strong); }
#delta-slider::-webkit-slider-thumb { background: var(--window); box-shadow: 0 0 0 1px var(--window); }
input[type="range"]::-moz-range-track { height: 2px; background: var(--line-strong); }
input[type="range"]::-moz-range-thumb { width: 12px; height: 12px; border: 0; border-radius: 50%; background: var(--text); }
#delta-slider::-moz-range-thumb { background: var(--window); }
input[type="range"]:disabled { opacity: .35; cursor: not-allowed; }
#reset-button { justify-self: end; }

.overlay { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; padding: 24px; background: rgba(4, 8, 20, .78); backdrop-filter: blur(4px); }
.overlay-card { width: min(520px, 100%); border: 1px solid var(--line-strong); background: var(--bg-soft); padding: 30px; box-shadow: 0 24px 80px rgba(0, 0, 0, .4); }
.overlay-card h2 { margin: 4px 0 10px; font-family: var(--font-serif); font-size: 34px; line-height: 1.15; }
.overlay-card p { color: var(--muted); font-size: 14px; }
.overlay-actions { display: flex; gap: 8px; margin-top: 22px; }
.noscript { padding: 24px; color: var(--text); }

@media (max-width: 1099px) {
  .app { padding-inline: 20px; }
  .layout { grid-template-columns: minmax(0, 1fr) 268px; gap: 18px; }
  .rail { padding-left: 14px; }
  .stage-title { font-size: clamp(22px, 2.4vw, 30px); }
}
@media (max-width: 899px) {
  #canvas { aspect-ratio: 4 / 3; }
  .layout { grid-template-columns: minmax(0, 1fr) 250px; }
  .stage-footer { font-size: 10px; }
  .stage-legend { display: none; }
}
@media (max-width: 719px) {
  .app { padding-inline: 14px; }
  .topbar { height: auto; min-height: 52px; flex-wrap: wrap; gap: 8px; padding: 8px 0; }
  .level-rail { margin-left: 0; width: 100%; justify-content: flex-start; }
  .layout { grid-template-columns: minmax(0, 1fr); gap: 12px; padding-top: 12px; }
  .rail { border-left: 0; border-top: 1px solid var(--line); padding: 12px 0 0; }
  .stage-title { font-size: 28px; }
  .checkpoints { grid-template-columns: 1fr; }
  .controls { grid-template-columns: 1fr; gap: 10px; }
  #reset-button { justify-self: start; }
  .overlay-card { padding: 22px; }
  .overlay-card h2 { font-size: 28px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .001ms !important; }
}
```

- [ ] Commit the page shell, favicon and styles:

```bash
git add index.html styles.css assets/favicon.svg
git commit -m "feat: add page shell and midnight blueprint styles"
```

### Step 3: Write the failing renderer test

- [ ] Create `tests/renderer.test.js` with exactly this content:

```js
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
```

- [ ] Run:

```bash
node --test tests/renderer.test.js
```

Expected: FAIL with “Cannot find module … src/renderer.js”.

### Step 4: Implement `src/renderer.js`

- [ ] Create `src/renderer.js` with exactly this content:

```js
import { envelopePoints, evaluate, inDomain } from './math.js';

export const COLORS = {
  bg: '#0a1024',
  grid: 'rgba(140,170,255,0.08)',
  line: 'rgba(140,170,255,0.18)',
  text: '#e8edff',
  muted: '#9aa7c7',
  curve: '#f4f7ff',
  band: '#ffbe5c',
  bandFill: 'rgba(255,190,92,0.14)',
  window: '#56e1c3',
  windowFill: 'rgba(86,225,195,0.10)',
  danger: '#ff6b6b',
  success: '#7bf1a8',
};

const MONO = '"Cascadia Code", "SFMono-Regular", Consolas, monospace';

export function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const w = Math.round(width * dpr);
  const h = Math.round(height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { width, height, dpr };
}

export function makeViewport(size, stage, state, cameraX0 = state.x0) {
  const margin = { top: 18, right: 16, bottom: 38, left: 56 };
  const plot = {
    x: margin.left,
    y: margin.top,
    w: Math.max(1, size.width - margin.left - margin.right),
    h: Math.max(1, size.height - margin.top - margin.bottom),
  };
  let xMin;
  let xMax;
  let yMin;
  let yMax;

  if (stage.view.mode === 'local') {
    const y0 = stage.fn.f(state.x0);
    const halfX = Math.max(4 * state.delta, 1e-9);
    const halfY = Math.max(stage.view.yPadding * stage.epsilon, 1e-9);
    xMin = cameraX0 - halfX;
    xMax = cameraX0 + halfX;
    yMin = y0 - halfY;
    yMax = y0 + halfY;
  } else {
    [xMin, xMax] = stage.view.x;
    [yMin, yMax] = stage.view.y;
  }
  return { plot, xMin, xMax, yMin, yMax };
}

export function worldToScreen(viewport, x, y) {
  const { plot, xMin, xMax, yMin, yMax } = viewport;
  return {
    x: plot.x + ((x - xMin) / (xMax - xMin)) * plot.w,
    y: plot.y + ((yMax - y) / (yMax - yMin)) * plot.h,
  };
}

export function screenToWorld(viewport, px, py) {
  const { plot, xMin, xMax, yMin, yMax } = viewport;
  return {
    x: xMin + ((px - plot.x) / plot.w) * (xMax - xMin),
    y: yMax - ((py - plot.y) / plot.h) * (yMax - yMin),
  };
}

export function hitTest(viewport, stage, state, px, py) {
  const { plot } = viewport;
  if (py < plot.y - 10 || py > plot.y + plot.h + 10) return null;
  const sx = (x) => worldToScreen(viewport, x, 0).x;
  const x0 = sx(state.x0);
  const left = sx(state.x0 - state.delta);
  const right = sx(state.x0 + state.delta);
  if (Math.abs(px - left) <= 12 || Math.abs(px - right) <= 12) return 'delta';
  if (stage.x0.editable && Math.abs(px - x0) <= 14) return 'x0';
  return null;
}

function niceStep(span, count) {
  const raw = span / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const norm = raw / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * mag;
}

function ticks(min, max, count) {
  const span = max - min;
  if (!Number.isFinite(span) || span <= 0) return [min];
  const step = niceStep(span, count);
  const start = Math.ceil(min / step) * step;
  const out = [];
  for (let value = start; value <= max + step * 1e-6; value += step) {
    out.push(Number(value.toPrecision(12)));
  }
  return out;
}

function formatTick(value, span) {
  if (!Number.isFinite(value)) return '';
  if (span < 0.01) return value.toFixed(6);
  if (span < 1) return value.toFixed(3);
  if (Math.abs(value) >= 1e6) return value.toExponential(2);
  if (span < 100) return value.toFixed(1);
  return value.toFixed(0);
}

function gapText(gap) {
  if (!Number.isFinite(gap)) return '∞';
  if (gap <= 0) return '0';
  if (gap < 0.001) return gap.toExponential(2);
  return gap.toFixed(3);
}

function drawGrid(ctx, viewport) {
  const { plot } = viewport;
  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.x, plot.y, plot.w, plot.h);
  ctx.clip();
  const xTicks = ticks(viewport.xMin, viewport.xMax, 6);
  const yTicks = ticks(viewport.yMin, viewport.yMax, 5);
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  for (const t of xTicks) {
    const x = worldToScreen(viewport, t, 0).x;
    ctx.beginPath();
    ctx.moveTo(x, plot.y);
    ctx.lineTo(x, plot.y + plot.h);
    ctx.stroke();
  }
  for (const t of yTicks) {
    const y = worldToScreen(viewport, 0, t).y;
    ctx.beginPath();
    ctx.moveTo(plot.x, y);
    ctx.lineTo(plot.x + plot.w, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.strokeRect(plot.x + 0.5, plot.y + 0.5, plot.w - 1, plot.h - 1);

  ctx.fillStyle = COLORS.muted;
  ctx.font = `10px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const t of xTicks) {
    const x = worldToScreen(viewport, t, 0).x;
    if (x < plot.x + 18 || x > plot.x + plot.w - 18) continue;
    ctx.fillText(formatTick(t, viewport.xMax - viewport.xMin), x, plot.y + plot.h + 8);
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const t of yTicks) {
    const y = worldToScreen(viewport, 0, t).y;
    if (y < plot.y + 8 || y > plot.y + plot.h - 8) continue;
    ctx.fillText(formatTick(t, viewport.yMax - viewport.yMin), plot.x - 8, y);
  }
}

function drawDomainMasks(ctx, viewport, domain) {
  const { plot } = viewport;
  const ranges = [];
  if (Number.isFinite(domain.min) && viewport.xMin < domain.min) {
    ranges.push([viewport.xMin, Math.min(domain.min, viewport.xMax)]);
  }
  if (Number.isFinite(domain.max) && viewport.xMax > domain.max) {
    ranges.push([Math.max(domain.max, viewport.xMin), viewport.xMax]);
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.x, plot.y, plot.w, plot.h);
  ctx.clip();
  for (const [a, b] of ranges) {
    if (b <= a) continue;
    const x1 = worldToScreen(viewport, a, 0).x;
    const x2 = worldToScreen(viewport, b, 0).x;
    ctx.fillStyle = 'rgba(140,170,255,0.045)';
    ctx.fillRect(x1, plot.y, x2 - x1, plot.h);
    ctx.strokeStyle = 'rgba(140,170,255,0.10)';
    ctx.lineWidth = 1;
    for (let x = x1 - plot.h; x < x2; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, plot.y);
      ctx.lineTo(x + plot.h, plot.y + plot.h);
      ctx.stroke();
    }
    if (x2 - x1 > 52) {
      ctx.fillStyle = COLORS.muted;
      ctx.font = `9px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('定义域外', (x1 + x2) / 2, plot.y + 8);
    }
  }
  ctx.restore();
}

function drawBand(ctx, viewport, state, stage) {
  const y0 = stage.fn.f(state.x0);
  if (!Number.isFinite(y0)) return;
  const top = worldToScreen(viewport, 0, y0 + stage.epsilon).y;
  const bottom = worldToScreen(viewport, 0, y0 - stage.epsilon).y;
  const { plot } = viewport;
  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.x, plot.y, plot.w, plot.h);
  ctx.clip();
  ctx.fillStyle = COLORS.bandFill;
  ctx.fillRect(plot.x, top, plot.w, bottom - top);
  ctx.strokeStyle = COLORS.band;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(plot.x, top);
  ctx.lineTo(plot.x + plot.w, top);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(plot.x, bottom);
  ctx.lineTo(plot.x + plot.w, bottom);
  ctx.stroke();
  ctx.restore();
}

function drawWindow(ctx, viewport, state, time, reduceMotion) {
  const { plot } = viewport;
  const left = worldToScreen(viewport, state.x0 - state.delta, 0).x;
  const right = worldToScreen(viewport, state.x0 + state.delta, 0).x;
  const pulse = reduceMotion ? 0.5 : (Math.sin(time / 170) + 1) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.x, plot.y, plot.w, plot.h);
  ctx.clip();
  ctx.fillStyle = state.check.passed
    ? `rgba(123,241,168,${0.06 + pulse * 0.04})`
    : COLORS.windowFill;
  ctx.fillRect(left, plot.y, right - left, plot.h);
  ctx.strokeStyle = state.check.passed ? COLORS.success : COLORS.window;
  ctx.globalAlpha = state.check.passed ? 0.65 + pulse * 0.35 : 0.8;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(left, plot.y);
  ctx.lineTo(left, plot.y + plot.h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(right, plot.y);
  ctx.lineTo(right, plot.y + plot.h);
  ctx.stroke();
  ctx.restore();
}

function drawCurve(ctx, viewport, state, stage) {
  const { plot } = viewport;
  const y0 = stage.fn.f(state.x0);
  const samples = 640;
  const points = [];
  for (let i = 0; i <= samples; i += 1) {
    const x = viewport.xMin + (viewport.xMax - viewport.xMin) * (i / samples);
    const y = inDomain(stage.fn.domain, x) ? evaluate(stage.fn.f, x) : NaN;
    points.push({
      x,
      y,
      sx: worldToScreen(viewport, x, 0).x,
      sy: Number.isFinite(y) ? worldToScreen(viewport, x, y).y : NaN,
    });
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.x, plot.y, plot.w, plot.h);
  ctx.clip();

  ctx.strokeStyle = 'rgba(244,247,255,0.36)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  let started = false;
  for (const p of points) {
    if (!Number.isFinite(p.y)) {
      started = false;
      continue;
    }
    if (!started) {
      ctx.moveTo(p.sx, p.sy);
      started = true;
    } else {
      ctx.lineTo(p.sx, p.sy);
    }
  }
  ctx.stroke();

  const a = Math.max(viewport.xMin, state.x0 - state.delta);
  const b = Math.min(viewport.xMax, state.x0 + state.delta);
  if (b > a) {
    const count = 260;
    const inside = new Path2D();
    const outside = new Path2D();
    let prev = null;
    for (let i = 0; i <= count; i += 1) {
      const x = a + (b - a) * (i / count);
      const y = inDomain(stage.fn.domain, x) ? evaluate(stage.fn.f, x) : NaN;
      if (!Number.isFinite(y)) {
        prev = null;
        continue;
      }
      const sx = worldToScreen(viewport, x, 0).x;
      const sy = worldToScreen(viewport, x, y).y;
      const cls = Math.abs(y - y0) <= stage.epsilon;
      if (!prev) {
        (cls ? inside : outside).moveTo(sx, sy);
      } else if (prev.cls === cls) {
        (cls ? inside : outside).lineTo(sx, sy);
      } else {
        const path = cls ? inside : outside;
        path.moveTo(prev.sx, prev.sy);
        path.lineTo(sx, sy);
      }
      prev = { sx, sy, cls };
    }
    ctx.lineWidth = 2.1;
    ctx.strokeStyle = COLORS.danger;
    ctx.stroke(outside);
    ctx.strokeStyle = state.check.passed ? COLORS.success : COLORS.curve;
    ctx.stroke(inside);
  }
  ctx.restore();
}

function drawBreach(ctx, viewport, state, stage, time, reduceMotion) {
  const check = state.check;
  if (!check || check.passed || !Number.isFinite(check.deviation) || !Number.isFinite(check.xWorst)) {
    return;
  }
  const { plot } = viewport;
  const sx = worldToScreen(viewport, check.xWorst, 0).x;
  if (sx < plot.x || sx > plot.x + plot.w) return;
  const y0 = stage.fn.f(state.x0);
  const syRaw = Number.isFinite(check.yWorst)
    ? worldToScreen(viewport, check.xWorst, check.yWorst).y
    : plot.y;
  const sy = Math.max(plot.y + 4, Math.min(plot.y + plot.h - 4, syRaw));
  const offscreen = syRaw < plot.y || syRaw > plot.y + plot.h;
  const pulse = reduceMotion ? 1 : 0.7 + Math.sin(time / 320) * 0.3;
  const bandEdge =
    Number.isFinite(check.yWorst) && check.yWorst < y0
      ? worldToScreen(viewport, 0, y0 - stage.epsilon).y
      : worldToScreen(viewport, 0, y0 + stage.epsilon).y;

  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.x, plot.y, plot.w, plot.h);
  ctx.clip();
  ctx.strokeStyle = COLORS.danger;
  ctx.globalAlpha = 0.55;
  ctx.setLineDash([3, 4]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, bandEdge);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.globalAlpha = pulse;
  ctx.fillStyle = COLORS.danger;
  ctx.beginPath();
  ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
  ctx.fill();

  if (offscreen) {
    const dir = syRaw < plot.y ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(sx, sy + dir * 10);
    ctx.lineTo(sx - 4, sy);
    ctx.lineTo(sx + 4, sy);
    ctx.closePath();
    ctx.fill();
  }

  const label = `差 ${gapText(check.deviation - stage.epsilon)}`;
  ctx.globalAlpha = 1;
  ctx.font = `11px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  const tx = Math.min(plot.x + plot.w - 86, Math.max(plot.x + 6, sx + 8));
  const ty = Math.max(plot.y + 16, sy - 8);
  const textWidth = ctx.measureText(label).width;
  ctx.fillStyle = 'rgba(10,16,36,.82)';
  ctx.fillRect(tx - 4, ty - 12, textWidth + 8, 16);
  ctx.fillStyle = COLORS.danger;
  ctx.fillText(label, tx, ty);
  ctx.restore();
}

function drawMarkers(ctx, viewport, state, stage) {
  const { plot } = viewport;
  const x0 = worldToScreen(viewport, state.x0, 0).x;
  const y0 = stage.fn.f(state.x0);
  const y0s = Number.isFinite(y0) ? worldToScreen(viewport, state.x0, y0).y : plot.y;

  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.x, plot.y, plot.w, plot.h);
  ctx.clip();
  ctx.strokeStyle = COLORS.muted;
  ctx.globalAlpha = 0.5;
  ctx.setLineDash([2, 5]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, plot.y);
  ctx.lineTo(x0, plot.y + plot.h);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLORS.text;
  ctx.beginPath();
  ctx.arc(x0, y0s, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = COLORS.muted;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('x₀', Math.min(x0 + 5, plot.x + plot.w - 22), plot.y + plot.h - 6);
  ctx.restore();
}

function drawCheckpoints(ctx, viewport, state, stage) {
  if (stage.win.type !== 'checkpoints') return;
  const { plot } = viewport;
  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.x, plot.y, plot.w, plot.h);
  ctx.clip();
  for (const cp of state.checkpoints) {
    const x = worldToScreen(viewport, cp.value, 0).x;
    if (x < plot.x || x > plot.x + plot.w) continue;
    ctx.strokeStyle = cp.solved ? COLORS.success : COLORS.muted;
    ctx.globalAlpha = cp.solved ? 0.45 : 0.18;
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    ctx.moveTo(x, plot.y);
    ctx.lineTo(x, plot.y + plot.h);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = cp.solved ? COLORS.success : COLORS.muted;
    ctx.font = `9px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(cp.solved ? '✓' : '○', x, plot.y + 6);
  }
  ctx.restore();
}

function drawScanMarker(ctx, viewport, state, stage) {
  if (!state.scan.running || !state.scan.points.length) return;
  const idx = Math.max(
    0,
    Math.min(
      state.scan.points.length - 1,
      Math.round(state.scan.progress * (state.scan.points.length - 1)),
    ),
  );
  const x = state.scan.points[idx].x0;
  const sx = worldToScreen(viewport, x, 0).x;
  const { plot } = viewport;
  if (sx < plot.x || sx > plot.x + plot.w) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(plot.x, plot.y, plot.w, plot.h);
  ctx.clip();
  ctx.strokeStyle = COLORS.window;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(sx, plot.y);
  ctx.lineTo(sx, plot.y + plot.h);
  ctx.stroke();
  ctx.restore();
}

export function drawMain(ctx, size, stage, state, time, reduceMotion, cameraX0 = state.x0) {
  const viewport = makeViewport(size, stage, state, cameraX0);
  ctx.clearRect(0, 0, size.width, size.height);
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, size.width, size.height);
  drawGrid(ctx, viewport);
  drawDomainMasks(ctx, viewport, stage.fn.domain);
  drawBand(ctx, viewport, state, stage);
  drawWindow(ctx, viewport, state, time, reduceMotion);
  drawCurve(ctx, viewport, state, stage);
  drawBreach(ctx, viewport, state, stage, time, reduceMotion);
  drawMarkers(ctx, viewport, state, stage);
  drawCheckpoints(ctx, viewport, state, stage);
  drawScanMarker(ctx, viewport, state, stage);
}

let chartCache = { key: '', points: [] };

function logPos(value, min, max) {
  return (Math.log10(value) - Math.log10(min)) / (Math.log10(max) - Math.log10(min));
}

export function drawEnvelope(ctx, size, stage, state) {
  const margin = { top: 10, right: 10, bottom: 20, left: 32 };
  const plot = {
    x: margin.left,
    y: margin.top,
    w: Math.max(1, size.width - margin.left - margin.right),
    h: Math.max(1, size.height - margin.top - margin.bottom),
  };
  ctx.clearRect(0, 0, size.width, size.height);
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, size.width, size.height);

  const xMin = 0.1;
  const xMax = Math.max(xMin * 10, state.scan.rangeMax);
  const yMin = 1e-7;
  const yMax = 1;
  const sx = (x) => plot.x + logPos(x, xMin, xMax) * plot.w;
  const sy = (d) => plot.y + (1 - logPos(d, yMin, yMax)) * plot.h;

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.font = `9px ${MONO}`;
  ctx.fillStyle = COLORS.muted;
  for (let p = Math.floor(Math.log10(xMin)); p <= Math.ceil(Math.log10(xMax)); p += 1) {
    const d = 10 ** p;
    if (d < xMin || d > xMax) continue;
    const x = sx(d);
    ctx.beginPath();
    ctx.moveTo(x, plot.y);
    ctx.lineTo(x, plot.y + plot.h);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(d >= 1000 ? `1e${Math.log10(d)}` : String(d), x, plot.y + plot.h + 4);
  }
  for (const d of [1e-6, 1e-4, 1e-2, 1]) {
    const y = sy(d);
    ctx.beginPath();
    ctx.moveTo(plot.x, y);
    ctx.lineTo(plot.x + plot.w, y);
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(d >= 0.01 ? String(d) : `1e${Math.log10(d)}`, plot.x - 4, y);
  }
  ctx.strokeStyle = COLORS.line;
  ctx.strokeRect(plot.x + 0.5, plot.y + 0.5, plot.w - 1, plot.h - 1);

  const key = `${stage.id}:${state.scan.rangeMax}`;
  if (chartCache.key !== key) {
    chartCache = { key, points: envelopePoints(stage, state.scan.rangeMax, 120) };
  }
  const points = chartCache.points;

  ctx.strokeStyle = COLORS.band;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = sx(p.x0);
    const y = sy(Math.max(yMin, Math.min(yMax, p.delta)));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  const yPlayer = sy(Math.max(yMin, Math.min(yMax, state.delta)));
  for (let i = 1; i < points.length; i += 1) {
    const x1 = sx(points[i - 1].x0);
    const x2 = sx(points[i].x0);
    const required = (points[i - 1].delta + points[i].delta) / 2;
    ctx.strokeStyle = state.delta > required ? COLORS.danger : COLORS.window;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x1, yPlayer);
    ctx.lineTo(x2, yPlayer);
    ctx.stroke();
  }

  ctx.fillStyle = COLORS.muted;
  ctx.font = `9px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('x₀', plot.x + plot.w - 14, plot.y + plot.h - 2);
  ctx.fillText('δ', plot.x + 2, plot.y + 8);
}
```

- [ ] Run the renderer tests and commit:

```bash
node --test tests/renderer.test.js
git add src/renderer.js tests/renderer.test.js
git commit -m "feat: add canvas renderer and viewport tests"
```

### Step 5: Implement the DOM controller

- [ ] Create `src/main.js` with exactly this content:

```js
import { LEVELS } from './levels.js';
import {
  createState,
  getStage,
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
} from './game.js';
import { requiredDelta } from './math.js';
import {
  fitCanvas,
  drawMain,
  drawEnvelope,
  makeViewport,
  hitTest,
  screenToWorld,
} from './renderer.js';

const PROGRESS_KEY = 'consistency-limbo.progress.v1';
const params = new URLSearchParams(location.search);
const demoMode = params.has('demo');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const $ = (id) => document.getElementById(id);
const el = {
  canvas: $('canvas'),
  levelRail: $('level-rail'),
  stageKicker: $('stage-kicker'),
  stageTitle: $('stage-title'),
  stageObjective: $('stage-objective'),
  stageHint: $('stage-hint'),
  epsilonReadout: $('epsilon-readout'),
  deltaReadout: $('delta-readout'),
  status: $('status'),
  checkpointPanel: $('checkpoint-panel'),
  scanPanel: $('scan-panel'),
  scanCount: $('scan-count'),
  scanFill: $('scan-fill'),
  bossChart: $('boss-chart'),
  chartRange: $('chart-range'),
  envelope: $('envelope'),
  scanButton: $('scan-button'),
  nextButton: $('next-button'),
  quizOpen: $('quiz-open'),
  quizPanel: $('quiz-panel'),
  quizFeedback: $('quiz-feedback'),
  x0Slider: $('x0-slider'),
  x0Value: $('x0-value'),
  deltaSlider: $('delta-slider'),
  deltaValue: $('delta-value'),
  resetButton: $('reset-button'),
  finalOverlay: $('final-overlay'),
  replayButton: $('replay-button'),
  homeButton: $('home-button'),
};

let progress = demoMode ? createProgress() : loadProgress();
let state = createState(levelIndexFromParam(params.get('level')));
let ui = { quizOpen: false, scanning: false, drag: null, message: null };
let cameraX0 = state.x0;

function loadProgress() {
  try {
    return parseProgress(localStorage.getItem(PROGRESS_KEY));
  } catch {
    return createProgress();
  }
}

function saveProgress() {
  if (demoMode) return;
  try {
    localStorage.setItem(PROGRESS_KEY, serializeProgress(progress));
  } catch {
    // Storage is optional; the game stays playable in private mode.
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatX0(value) {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 10000) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
  }
  if (Math.abs(value) < 0.1) return value.toFixed(3);
  return value.toFixed(2);
}

function formatDelta(value) {
  if (!Number.isFinite(value)) return '∞';
  if (value === 0) return '0';
  if (value < 0.01 || value >= 1000) return value.toExponential(2);
  return value.toFixed(3);
}

function formatEpsilon(value) {
  return Number(value.toFixed(2)).toString();
}

function formatGap(gap) {
  if (!Number.isFinite(gap)) return '∞';
  if (gap <= 0) return '0';
  if (gap < 0.001) return gap.toExponential(2);
  return gap.toFixed(3);
}

function valueToLogSlider(value, min, max) {
  if (!(max > min)) return 0;
  const clamped = Math.max(min, Math.min(max, value));
  const t = Math.log(clamped / min) / Math.log(max / min);
  return Math.round(Math.max(0, Math.min(1, t)) * 1000);
}

function logSliderValue(slider, min, max) {
  const t = Number(slider.value) / 1000;
  return min * Math.pow(max / min, t);
}

function x0SliderMax() {
  const stage = getStage(state);
  return stage.win.type === 'impossible-scan' ? state.scan.rangeMax : stage.x0.max;
}

function x0FromSlider() {
  const stage = getStage(state);
  const max = x0SliderMax();
  return stage.x0.log
    ? logSliderValue(el.x0Slider, stage.x0.min, max)
    : Number(el.x0Slider.value);
}

function deltaFromSlider() {
  const stage = getStage(state);
  return stage.delta.log
    ? logSliderValue(el.deltaSlider, stage.delta.min, stage.delta.max)
    : Number(el.deltaSlider.value);
}

function scanTotal() {
  const stage = getStage(state);
  return state.scan.points.length || stage.win.samples || 0;
}

function scanIndex() {
  const total = state.scan.points.length;
  if (!total) return 0;
  return Math.min(total, Math.round(state.scan.progress * (total - 1)) + 1);
}

function scanCurrentX0() {
  const points = state.scan.points;
  if (!points.length) return state.x0;
  const index = Math.min(
    points.length - 1,
    Math.round(state.scan.progress * (points.length - 1)),
  );
  return points[index].x0;
}

function syncControls() {
  const stage = getStage(state);
  const maxX0 = x0SliderMax();
  const logX0 = Boolean(stage.x0.log) && stage.x0.min !== maxX0;

  if (logX0) {
    el.x0Slider.min = '0';
    el.x0Slider.max = '1000';
    el.x0Slider.step = '1';
    el.x0Slider.value = String(valueToLogSlider(state.x0, stage.x0.min, maxX0));
  } else {
    el.x0Slider.min = String(stage.x0.min);
    el.x0Slider.max = String(maxX0);
    el.x0Slider.step = String(stage.x0.step);
    el.x0Slider.value = String(state.x0);
  }
  el.x0Slider.disabled = ui.scanning || !stage.x0.editable || stage.x0.min === maxX0;

  if (stage.delta.log) {
    el.deltaSlider.min = '0';
    el.deltaSlider.max = '1000';
    el.deltaSlider.step = '1';
    el.deltaSlider.value = String(
      valueToLogSlider(state.delta, stage.delta.min, stage.delta.max),
    );
  } else {
    el.deltaSlider.min = String(stage.delta.min);
    el.deltaSlider.max = String(stage.delta.max);
    el.deltaSlider.step = String(stage.delta.step);
    el.deltaSlider.value = String(state.delta);
  }
  el.deltaSlider.disabled = ui.scanning;
  el.resetButton.disabled = ui.scanning;
  el.levelRail.classList.toggle('locked', ui.scanning);

  el.x0Value.textContent = formatX0(state.x0);
  el.deltaValue.textContent = formatDelta(state.delta);
  el.deltaReadout.textContent = formatDelta(state.delta);
  el.epsilonReadout.textContent = `${formatEpsilon(stage.epsilon)}${
    stage.win.type.includes('scan') ? ' · 锁定' : ''
  }`;
}

function buildRail() {
  el.levelRail.replaceChildren();
  LEVELS.forEach((level, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `rail-item${index === state.levelIndex ? ' active' : ''}${
      isLevelComplete(progress, index) ? ' complete' : ''
    }`;
    button.setAttribute('aria-label', `第 ${level.index} 关：${level.title}`);
    button.title = level.title;
    button.textContent = String(level.index).padStart(2, '0');
    button.addEventListener('click', () => loadLevel(index));
    el.levelRail.append(button);
  });
}

function updateUrl() {
  if (demoMode) return;
  const next = new URLSearchParams(location.search);
  next.set('level', String(state.levelIndex + 1));
  history.replaceState(null, '', `${location.pathname}?${next.toString()}`);
}

function loadLevel(index, stageIndex = 0) {
  if (ui.scanning) return;
  const level = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, index))];
  state = createState(LEVELS.indexOf(level), stageIndex);
  ui = { quizOpen: false, scanning: false, drag: null, message: null };
  cameraX0 = state.x0;
  el.finalOverlay.hidden = true;
  buildRail();
  updateUrl();
  syncControls();
  render({ chart: true });
}

function commitProgress() {
  if (!state.completed || isLevelComplete(progress, state.levelIndex)) return;
  progress = markLevelComplete(progress, state.levelIndex);
  saveProgress();
  buildRail();
}

function renderUI() {
  const stage = getStage(state);
  const isScan = stage.win.type === 'scan-all' || stage.win.type === 'impossible-scan';

  el.stageKicker.textContent = stage.kicker;
  el.stageTitle.textContent = stage.title;
  el.stageObjective.textContent = stage.copy.objective;
  el.stageHint.textContent = stage.copy.hint;
  el.scanPanel.hidden = !isScan;
  el.bossChart.hidden = stage.win.type !== 'impossible-scan';
  el.checkpointPanel.hidden = stage.win.type !== 'checkpoints';
  el.scanButton.hidden = !isScan;
  el.scanButton.disabled = ui.scanning;
  el.quizPanel.hidden = !ui.quizOpen;
  el.quizOpen.hidden = !(
    stage.win.type === 'impossible-scan' &&
    state.scan.canConclude &&
    !ui.quizOpen &&
    !state.completed
  );
  el.finalOverlay.hidden = !(
    state.levelIndex === 4 &&
    state.stageIndex === 1 &&
    state.completed
  );

  if (isScan) {
    const total = scanTotal();
    el.scanCount.textContent = `${scanIndex()} / ${total}`;
    el.scanFill.style.width = `${Math.max(0, Math.min(1, state.scan.progress)) * 100}%`;
  }
  if (stage.win.type === 'impossible-scan') {
    el.chartRange.textContent = `R = ${formatX0(state.scan.rangeMax)}`;
  }

  if (stage.win.type === 'checkpoints') {
    el.checkpointPanel.replaceChildren();
    for (const cp of state.checkpoints) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `checkpoint${cp.solved ? ' solved' : ''}`;
      const maximum = requiredDelta(stage, cp.value);
      button.innerHTML = `<span class="cp-x">x₀ = ${cp.value}</span><span class="cp-state">${
        cp.solved ? `✓ δ ${formatDelta(cp.delta)}` : '未点亮'
      }</span>${cp.solved ? `<span class="cp-max">上限 ${formatDelta(maximum)}</span>` : ''}`;
      button.addEventListener('click', () => {
        if (ui.scanning) return;
        state = setX0(state, cp.value);
        commitProgress();
        syncControls();
        render({ chart: true });
      });
      el.checkpointPanel.append(button);
    }
  }

  const scanNext = stage.win.type === 'scan-all' && state.stageComplete;
  const normalNext = state.completed && state.levelIndex < LEVELS.length - 1;
  el.nextButton.hidden = !(scanNext || normalNext);
  el.nextButton.disabled = ui.scanning;
  if (scanNext) el.nextButton.textContent = '进入第二幕';
  else if (state.levelIndex === 3) el.nextButton.textContent = '挑战 boss';
  else el.nextButton.textContent = '下一关';

  el.quizFeedback.textContent = state.quiz.attempted
    ? state.quiz.correct
      ? '对。一致连续是函数和定义域共同的性质。'
      : '再想想：ε 调大或 δ 调小，都追不上更远的 x₀。'
    : '';

  let text = '';
  let tone = '';
  if (ui.message) {
    text = ui.message;
    tone = 'pass';
  } else if (ui.scanning) {
    text = `扫描中 · x₀ = ${formatX0(scanCurrentX0())}`;
  } else if (stage.win.type === 'impossible-scan' && state.completed) {
    text = '你撞到了 limbo 的墙。';
    tone = 'pass';
  } else if (stage.win.type === 'impossible-scan' && state.scan.canConclude) {
    text = '你看到了：没有统一 δ。点「我看到了」收尾。';
    tone = 'pass';
  } else if (stage.win.type === 'impossible-scan' && state.scan.firstFail) {
    text = `在 x₀ = ${formatX0(state.scan.firstFail.x0)} 处，差 ${formatGap(
      state.scan.firstFail.deviation - stage.epsilon,
    )}。δ 还得再小。`;
    tone = 'fail';
  } else if (stage.win.type === 'impossible-scan' && state.check.passed) {
    text = '当前 x₀ 全绿。点「扫描所有 x₀」，看看更远处。';
  } else if (stage.win.type === 'scan-all' && state.stageComplete) {
    text = stage.copy.success;
    tone = 'pass';
  } else if (stage.win.type === 'scan-all' && state.check.passed) {
    text = '当前 x₀ 全绿。点「扫描所有 x₀」，检查整段定义域。';
  } else if (state.completed) {
    text = stage.copy.success;
    tone = 'pass';
  } else if (stage.win.type === 'checkpoints') {
    const solved = state.checkpoints.filter((cp) => cp.solved).length;
    if (state.check.passed) {
      text = `这个 x₀ 全绿。已点亮 ${solved} / ${state.checkpoints.length}。`;
    } else {
      text = `还差 ${formatGap(state.check.deviation - stage.epsilon)}。`;
      tone = 'fail';
    }
  } else if (state.check.passed) {
    text = '全绿 · 通过';
    tone = 'pass';
  } else {
    const gap = state.check.deviation - stage.epsilon;
    text = gap > 1e6 ? '窗口跨进未定义区，δ 收小一点。' : `还差 ${formatGap(gap)}。`;
    tone = 'fail';
  }

  el.status.textContent = text;
  el.status.classList.toggle('pass', tone === 'pass');
  el.status.classList.toggle('fail', tone === 'fail');
  el.canvas.setAttribute(
    'aria-label',
    `x₀ = ${formatX0(state.x0)}，δ = ${formatDelta(state.delta)}。${
      state.check.passed ? '窗口内曲线全部在带子内。' : '窗口内有曲线越界。'
    }`,
  );
}

function draw(now = performance.now()) {
  const stage = getStage(state);
  if (stage.view.mode === 'local') {
    if (reduceMotion) {
      cameraX0 = state.x0;
    } else {
      cameraX0 += (state.x0 - cameraX0) * 0.16;
      if (Math.abs(cameraX0 - state.x0) < Math.max(1e-9, Math.abs(state.x0) * 1e-6)) {
        cameraX0 = state.x0;
      }
    }
  } else {
    cameraX0 = state.x0;
  }
  const size = fitCanvas(el.canvas);
  const ctx = el.canvas.getContext('2d');
  ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  drawMain(ctx, size, stage, state, now, reduceMotion, cameraX0);
}

function drawChart() {
  if (el.bossChart.hidden) return;
  const size = fitCanvas(el.envelope);
  const ctx = el.envelope.getContext('2d');
  ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  drawEnvelope(ctx, size, getStage(state), state);
}

function render(options = {}) {
  const { chart = true } = options;
  renderUI();
  draw(performance.now());
  if (chart) drawChart();
}

function animateScan() {
  return new Promise((resolve) => {
    const duration = reduceMotion ? 300 : 1200;
    const start = performance.now();
    const stop = state.scan.stopProgress;
    function tick(now) {
      if (!ui.scanning) {
        resolve();
        return;
      }
      const t = Math.min(1, (now - start) / duration);
      state = { ...state, scan: { ...state.scan, progress: t * stop } };
      render({ chart: false });
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    }
    requestAnimationFrame(tick);
  });
}

async function runScan() {
  const stage = getStage(state);
  if (ui.scanning || !['scan-all', 'impossible-scan'].includes(stage.win.type)) return;

  ui.scanning = true;
  ui.message = null;
  try {
    let again = true;
    while (again) {
      ui.message = null;
      state = beginScan(state);
      syncControls();
      render({ chart: false });
      await animateScan();
      state = finishScan(state);
      commitProgress();
      syncControls();
      render({ chart: true });
      again = Boolean(state.scan.autoRescan);
      if (again) {
        ui.message = '当前范围全绿。把 x₀ 再拉远 10 倍。';
        render({ chart: true });
        await delay(650);
      }
    }
  } finally {
    ui.scanning = false;
    ui.message = null;
    syncControls();
    render({ chart: true });
  }
}

function canvasPoint(event) {
  const rect = el.canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    size: { width: rect.width, height: rect.height },
  };
}

el.canvas.addEventListener('pointerdown', (event) => {
  if (ui.scanning) return;
  const point = canvasPoint(event);
  const stage = getStage(state);
  const viewport = makeViewport(point.size, stage, state, cameraX0);
  const hit = hitTest(viewport, stage, state, point.x, point.y);
  if (!hit) return;
  el.canvas.setPointerCapture(event.pointerId);
  ui.drag = {
    type: hit,
    startX0: state.x0,
    startWorldX: screenToWorld(viewport, point.x, point.y).x,
    viewport,
  };
  event.preventDefault();
});

el.canvas.addEventListener('pointermove', (event) => {
  if (ui.scanning) return;
  const point = canvasPoint(event);
  const stage = getStage(state);
  if (!ui.drag) {
    const viewport = makeViewport(point.size, stage, state, cameraX0);
    const hit = hitTest(viewport, stage, state, point.x, point.y);
    el.canvas.style.cursor =
      hit === 'delta' ? 'ew-resize' : hit === 'x0' ? 'grab' : 'default';
    return;
  }
  const worldX = screenToWorld(ui.drag.viewport, point.x, point.y).x;
  if (ui.drag.type === 'delta') {
    state = setDelta(state, Math.abs(worldX - state.x0));
  } else {
    state = setX0(state, ui.drag.startX0 + (worldX - ui.drag.startWorldX));
  }
  commitProgress();
  syncControls();
  render({ chart: true });
});

function endDrag() {
  ui.drag = null;
  el.canvas.style.cursor = 'default';
}
el.canvas.addEventListener('pointerup', endDrag);
el.canvas.addEventListener('pointercancel', endDrag);

el.x0Slider.addEventListener('input', () => {
  if (ui.scanning) return;
  if (!getStage(state).x0.editable) return;
  state = setX0(state, x0FromSlider());
  commitProgress();
  syncControls();
  render({ chart: true });
});

el.deltaSlider.addEventListener('input', () => {
  if (ui.scanning) return;
  state = setDelta(state, deltaFromSlider());
  commitProgress();
  syncControls();
  render({ chart: true });
});

el.resetButton.addEventListener('click', () => {
  if (ui.scanning) return;
  state = resetStage(state);
  ui.quizOpen = false;
  ui.message = null;
  cameraX0 = state.x0;
  syncControls();
  render({ chart: true });
});

el.scanButton.addEventListener('click', () => {
  void runScan();
});

el.nextButton.addEventListener('click', () => {
  if (ui.scanning) return;
  const stage = getStage(state);
  if (stage.win.type === 'scan-all' && state.stageComplete) {
    state = advanceBossAct(state);
    ui.quizOpen = false;
    ui.message = null;
    cameraX0 = state.x0;
    syncControls();
    render({ chart: true });
    return;
  }
  if (state.completed && state.levelIndex < LEVELS.length - 1) {
    loadLevel(state.levelIndex + 1);
  }
});

el.quizOpen.addEventListener('click', () => {
  if (ui.scanning) return;
  ui.quizOpen = true;
  render({ chart: true });
});

el.quizPanel.querySelectorAll('[data-answer]').forEach((button) => {
  button.addEventListener('click', () => {
    if (ui.scanning) return;
    state = answerQuiz(state, button.dataset.answer);
    if (state.quiz.correct) ui.quizOpen = false;
    commitProgress();
    syncControls();
    render({ chart: true });
  });
});

el.replayButton.addEventListener('click', () => loadLevel(4));
el.homeButton.addEventListener('click', () => loadLevel(0));

let resizeFrame = 0;
window.addEventListener('resize', () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => render({ chart: true }));
});

if (demoMode) {
  window.__limbo = {
    loadLevel: (levelIndex, stageIndex = 0) => {
      state = createState(levelIndex, stageIndex);
      ui = { quizOpen: false, scanning: false, drag: null, message: null };
      cameraX0 = state.x0;
      el.finalOverlay.hidden = true;
      buildRail();
      syncControls();
      render({ chart: true });
    },
    setX0: (value) => {
      state = setX0(state, value);
      syncControls();
      render({ chart: true });
    },
    setDelta: (value) => {
      state = setDelta(state, value);
      syncControls();
      render({ chart: true });
    },
    setRange: (value) => {
      state = { ...state, scan: { ...state.scan, rangeMax: value } };
      syncControls();
      render({ chart: true });
    },
    scan: () => runScan(),
    next: () => el.nextButton.click(),
    answerQuiz: (choice) => {
      state = answerQuiz(state, choice);
      ui.quizOpen = false;
      commitProgress();
      syncControls();
      render({ chart: true });
    },
    getState: () => state,
  };
}

buildRail();
syncControls();
render({ chart: true });

function loop(now) {
  draw(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

### Step 6: Implement the zero-dependency local server

- [ ] Create `scripts/serve.mjs` with exactly this content:

```js
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.json': 'application/json',
};

export function startServer(port = Number(process.env.PORT) || 8000) {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const file = path.resolve(ROOT, rel);
    const insideRoot = file === ROOT || file.startsWith(ROOT + path.sep);
    if (!insideRoot) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(data);
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => {
      console.log(`Consistency Limbo → http://localhost:${port}`);
      resolve(server);
    });
  });
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  startServer();
}
```

- [ ] Commit the controller and local server:

```bash
git add src/main.js scripts/serve.mjs
git commit -m "feat: wire game UI, boss flow and local server"
```

### Step 7: Run the automated tests

- [ ] Run:

```bash
npm test
```

Expected: all math, game and renderer tests PASS.

- [ ] Run a syntax check on the browser entry and server:

```bash
node --check src/main.js
node --check src/renderer.js
node --check scripts/serve.mjs
```

Expected: no output (exit code 0).

### Step 8: Browser smoke test

- [ ] Start the server:

```bash
npm run serve
```

- [ ] Open Microsoft Edge at `http://localhost:8000` and verify:
  - The page loads with a visible graph, amber ε band, mint δ window and both sliders. No start modal.
  - L1 can be passed at δ ≈ 0.34; the window turns green.
  - L2's three checkpoint chips can be clicked; each can be lit; the completion text describes the player's δ and the allowed maximum.
  - L3 can be passed near δ ≈ 0.078; L4 near δ ≈ 0.083; L4's undefined region is hatched when δ crosses 0.
  - The boss rail item 05 is clickable; act 1's scan button exists; act 2 is reachable after act 1.
  - The boss chart appears in act 2 and its x-axis range label updates after a successful scan.
  - The console has no errors; the Network panel shows only local assets.
  - At 390px width there is no horizontal scroll and the sliders still work.
  - At the 960×540 GIF viewport, the envelope chart and the action buttons are visible without being cut off. If the boss rail is too tall, reduce `.rail` gap, `.status` min-height and `#envelope` height before committing.

If any visual check fails, fix the CSS or the renderer before committing. Do not mark the task complete with a blank canvas or a broken slider.

### Step 9: Commit any browser fixes

- [ ] If the browser smoke test required changes, commit them:

```bash
git add index.html styles.css src/renderer.js src/main.js scripts/serve.mjs tests/renderer.test.js
git commit -m "fix: polish canvas interaction after browser smoke test"
```

If no changes were needed, skip this step.

---

## Task 4: README Hero GIF, Docs and Assets

**Files:**
- Already created: `assets/favicon.svg` (Task 3)
- Create: `.nojekyll`
- Create: `LICENSE`
- Create: `scripts/record-demo.mjs`
- Create: `README.md`
- Generated: `assets/demo.png` and `assets/demo.gif`
- Modify: `package-lock.json` (created by `npm install`; commit it)

**Interfaces:**
- `scripts/record-demo.mjs` uses `startServer` from `./serve.mjs`, the demo hook `window.__limbo`, Playwright-core, pngjs and gifenc.
- README references `assets/demo.gif` at width 720; if GIF generation fails, change the `src` to `assets/demo.png`.
- GIF target: 960×540, 6–8s, ≤4MB.

### Step 1: Add the Pages marker and license

- [ ] Confirm `assets/favicon.svg` exists from Task 3; do not recreate it.
- [ ] Create an empty `.nojekyll` file at the repository root. It has no content.

- [ ] Create `LICENSE` with exactly this content:

```text
MIT License

Copyright (c) 2026 nddcv1

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Step 2: Implement the deterministic GIF recorder

- [ ] Create `scripts/record-demo.mjs` with exactly this content:

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { startServer } from './serve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WIDTH = 960;
const HEIGHT = 540;
const FPS = 8;
const FRAME_DELAY = Math.round(1000 / FPS);
const frames = [];

const edgePath =
  process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const launchOptions = { headless: true };
if (fs.existsSync(edgePath)) launchOptions.executablePath = edgePath;
else launchOptions.channel = 'msedge';

const browser = await chromium.launch(launchOptions);
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
});
const server = await startServer(8123);

async function shot() {
  const buffer = await page.screenshot({ type: 'png' });
  frames.push(PNG.sync.read(buffer));
}

async function capture(ms) {
  const count = Math.max(1, Math.round((ms / 1000) * FPS));
  for (let i = 0; i < count; i += 1) {
    await shot();
    await page.waitForTimeout(FRAME_DELAY);
  }
}

try {
  await page.goto('http://localhost:8123/?level=boss&demo=1', {
    waitUntil: 'networkidle',
  });
  await page.waitForFunction(() => Boolean(window.__limbo));

  await page.evaluate(() => {
    window.__limbo.loadLevel(4, 1);
    window.__limbo.setRange(1000);
    window.__limbo.setX0(2);
    window.__limbo.setDelta(0.5);
  });
  await capture(700);

  await page.evaluate(() => window.__limbo.setDelta(0.0003));
  await capture(500);

  const scanPromise = page.evaluate(() => window.__limbo.scan());
  await capture(3400);
  await scanPromise;
  await capture(500);

  await page.evaluate(() => window.__limbo.loadLevel(0));
  await page.evaluate(() => window.__limbo.setDelta(0.2));
  await capture(850);

  await page.evaluate(() => {
    const end = document.createElement('div');
    end.id = 'gif-end';
    end.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:99',
      'display:grid',
      'place-items:center',
      'background:#0a1024',
      'color:#e8edff',
      'text-align:center',
      'font-family:Inter,"Noto Sans SC","Microsoft YaHei",sans-serif',
    ].join(';');
    end.innerHTML = `
      <div>
        <div style="font-family:'Cascadia Code',Consolas,monospace;font-size:12px;letter-spacing:.22em;color:#ffbe5c;margin-bottom:18px">CONSISTENCY LIMBO</div>
        <div style="font-family:'Noto Serif SC','Songti SC',serif;font-size:34px;line-height:1.3">给学数学分析的人<br>把 ε-δ 和一致连续拖出来，看见为止。</div>
      </div>
    `;
    document.body.append(end);
  });
  await capture(1200);

  if (!frames.length) throw new Error('No frames captured');
  fs.mkdirSync(path.join(ROOT, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'assets', 'demo.png'), PNG.sync.write(frames[0]));

  const palette = quantize(frames[0].data, 128);
  const gif = GIFEncoder();
  for (let i = 0; i < frames.length; i += 1) {
    const frame = frames[i];
    const index = applyPalette(frame.data, palette);
    gif.writeFrame(index, WIDTH, HEIGHT, {
      palette,
      delay: FRAME_DELAY,
      repeat: i === 0 ? 0 : undefined,
    });
  }
  gif.finish();
  const bytes = gif.bytes();
  fs.writeFileSync(path.join(ROOT, 'assets', 'demo.gif'), bytes);
  const megabytes = bytes.length / 1024 / 1024;
  console.log(`Wrote assets/demo.gif (${megabytes.toFixed(2)} MB, ${frames.length} frames)`);
  if (megabytes > 4) {
    console.warn('GIF is above 4 MB. Reduce colours or capture duration before publishing.');
  }
} finally {
  await page.close();
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
```

### Step 3: Install dev dependencies and generate the hero assets

- [ ] Run:

```bash
npm install
```

Expected: `package-lock.json` is created; the runtime app still has no dependencies.

- [ ] Run:

```bash
npm run demo:gif
```

Expected: `assets/demo.gif` and `assets/demo.png` are created; the console prints the GIF size and frame count.

- [ ] Verify the GIF header and size:

```bash
node -e "const fs=require('fs');const b=fs.readFileSync('assets/demo.gif');console.log('GIF', b.readUInt16LE(6)+'x'+b.readUInt16LE(8), (b.length/1024/1024).toFixed(2)+' MB')"
```

Expected: `GIF 960x540` and ≤4 MB.

**Fallback if the recorder fails:** start `npm run serve`, open `http://localhost:8000/?level=boss&demo=1` in Edge, take a 960×540 screenshot of the boss frame manually, save it as `assets/demo.png`, and use `assets/demo.png` in the README. Keep `record-demo.mjs` for later; do not block the release. The README image must exist.

### Step 4: Write the README

- [ ] Create `README.md` with exactly this content. If the GIF failed, change the `<img src>` to `assets/demo.png`; keep the width at 720.

```markdown
# Consistency Limbo

给学数学分析的人：把 ε-δ 和一致连续拖出来，看见为止。

*An interactive ε-δ playground for real-analysis students — drag until continuity clicks.*

<p align="center">
  <img src="assets/demo.gif" width="720" alt="Consistency Limbo：拖动 ε、δ 和 x₀，最后在一致连续 boss 关撞上没有统一 δ 的墙">
</p>

<p align="center">
  <a href="https://nddcv1.github.io/consistency-limbo/"><strong>在线玩</strong></a>
  ·
  <a href="https://nddcv1.github.io/consistency-limbo/?level=boss">直接挑战 boss</a>
</p>

**5 关 · 5 分钟 · 无后端。** 打开就能拖，不用注册，不用安装。

## 这是什么

每一关都是一张函数图像、一条琥珀色的 ε 带、一个青绿色的 δ 窗。拖 δ，让窗口里的曲线全部落进带子，窗口就会变绿。

前四关把这套“全绿”的直觉练熟；第五关把 ε 锁死，只给你一把 δ，然后让 x₀ 越跑越远。

## 五关

| # | 关卡 | 你会看见 |
|---|---|---|
| 01 | 热身：x² | 带子和窗口第一次同时出现 |
| 02 | 同一个 f，不同的 x₀ | 每个位置允许的最大 δ 不同 |
| 03 | 抖动：sin(x²) | 局部再凶，δ 足够小仍然能全绿 |
| 04 | 边界：1/x | 越靠近 0 越陡；x = 0 没有定义 |
| 05 | 一致连续 Limbo | 先在 [0,1] 成功，再在 [0,∞) 撞墙 |

## Boss 关为什么反直觉

逐点连续是：对每个 x₀，你都能找到自己的 δ。  
一致连续是：**同一把 δ 要管住所有 x₀。**

第二幕里，每次你觉得找到了，范围就自动 ×10。任何固定的 δ 都会在更远处被击穿。右侧包络图画出“每个 x₀ 至少需要多小的 δ”，你的 δ 是一条横线——横线永远压不到曲线下方。

这不是形式证明；它是一次可以亲手撞上的演示。README 的 Known limitations 里写清了这一点。

## 和现有 ε-δ 工具的区别

ε-δ 交互工具并不空白：

- [KU Leuven Continuity Checker](https://kulak.kuleuven.be/facult/wet/wiskunde/ooi/applets_shu/Math/Calculus/Ira/Continuity.html) 已有 Simple / Uniform 模式；
- [GeoGebra Epsilon-Delta Game](https://www.geogebra.org/m/YhZNXyzm) 已经能拖 ε、δ；
- [Vanishing Point](https://playpendium.com/vanishing-point/) 已经是带关卡和评分的游戏。

Consistency Limbo 做的是另一件事：把一致连续包装成一场有开场、有升级、有收尾的 boss 战，用一张包络图把“没有统一 δ”画出来；同时保持开源、零安装、中文优先。

## 本地运行

不需要安装依赖就能玩和跑测试：

```bash
npm test
npm run serve
# 打开 http://localhost:8000
```

生成 README 的 GIF 才需要安装开发依赖：

```bash
npm install
npm run demo:gif
```

## 已知限制

- 判定用数值采样（1024 点 + 0.1% 安全余量），不是形式证明；预设函数的采样很密，但极窄尖峰仍可能被漏掉。
- v0.1 只有 5 个预设关卡，不支持输入任意函数。
- Boss 第二幕是引导式演示：游戏展示所需 δ → 0 的趋势，并让你自己撞墙；它不声称替代数学证明。
- 桌面优先；窄屏可操作，但没有单独设计移动版。

## Roadmap（v0.2+，不是 v0.1）

- 白名单表达式解析，支持自定义函数。
- 更多知识点：导数、Riemann 积分、级数、开覆盖。
- 可分享的关卡状态 URL 和课堂大屏模式。
- 英文 UI 与双语 README。

## License

MIT © 2026 nddcv1

---

如果它帮你第一次“看见”了 ε-δ，点个 star 让更多人看到。
```

### Step 5: Full local acceptance pass

- [ ] Run:

```bash
npm test
```

Expected: all tests PASS.

- [ ] Start the server and play all five levels in Edge:

```bash
npm run serve
```

Check every item:

- [ ] First screen: canvas, ε band, δ window, both sliders, no start modal.
- [ ] L1 passes near 0.34; fails at 0.35 with a red point.
- [ ] L2's three checkpoints can be clicked and lit; the completion text shows the player's δ and the allowed maximum.
- [ ] L3 passes near 0.078; L4 near 0.083; L4 has a hatched undefined region when δ crosses 0.
- [ ] Boss act 1's scan button runs; δ≈0.55 makes all 600 x₀ green; act 2 is reachable.
- [ ] Boss act 2: a successful scan extends R ×10 and automatically re-scans; a far red point appears; the envelope chart updates; after three extensions the “我看到了” button appears.
- [ ] The confirmation quiz rejects ε/δ answers, accepts “限制定义域”, and shows the final overlay only on the correct answer.
- [ ] Level rail jumps work; refresh keeps completed check marks; `?level=boss` opens act 1.
- [ ] 390px width has no horizontal scroll; canvas drag and sliders work.
- [ ] Keyboard alone can adjust both sliders; focus is visible; the status is announced.
- [ ] With `prefers-reduced-motion`, no pulse/camera animation is required; functionality still works.
- [ ] Console has no errors; Network shows no external requests; no `eval` in the source.

- [ ] Open the README in a Markdown preview or the GitHub repo page; the hero image must be visible above the fold and readable at 720px. Check the GIF's first frame specifically: the boss chart, red breach and “ε = 0.8 · 锁定” readout must be visible. If the chart is cut off, compact the rail CSS and regenerate the GIF before committing.

### Step 6: Commit docs, assets and recorder

- [ ] Run:

```bash
git add README.md LICENSE .nojekyll assets/demo.gif assets/demo.png package-lock.json scripts/record-demo.mjs
git commit -m "docs: add README hero GIF, license and assets"
```

If the GIF fallback failed and only the PNG exists, add `assets/demo.png` and omit `assets/demo.gif`; the README src must match the existing file.

---

## Task 5: Final Verification and Gated Publish

**Files:** none beyond a possible memory update outside the repo.

**Interfaces:** none.

### Step 1: Final clean-tree verification

- [ ] Run:

```bash
npm test
git status --short
git log --oneline -5
```

Expected: tests PASS; only intended files are untracked/changed; the spec, plan, code, tests, docs and assets are committed.

- [ ] Confirm the app still runs from a clean checkout path:

```bash
npm run serve
```

Open `http://localhost:8000/`, `?level=boss`, and a 390px viewport. Stop the server with `Ctrl+C`.

- [ ] Re-check the repository name the day of publishing:

```bash
gh search repos "consistency-limbo" --limit 5
gh api repos/nddcv1/consistency-limbo
```

Expected: no conflicting repository; the second command returns 404 for `nddcv1/consistency-limbo`. If the name is taken, stop and ask the user for a new name before creating anything.

### Step 2: Stop and get explicit publish approval

- [ ] **Do not create a public repository until the user explicitly says yes.** Ask:

> 本地实现和验收都完成了。要我现在创建公开仓库 `nddcv1/consistency-limbo`、推送并开启 GitHub Pages 吗？

If the user declines or wants changes, stop here and do not run the next steps.

### Step 3: Create the public repository and push

- [ ] From `D:\consistency-limbo`, run:

```bash
gh repo create nddcv1/consistency-limbo --public --source=. --remote=origin --push
```

Expected: the repo exists, `origin` points to it, and `main` is pushed.

### Step 4: Enable GitHub Pages

- [ ] Try the API:

```bash
gh api --method POST repos/nddcv1/consistency-limbo/pages \
  -f 'source[branch]=main' -f 'source[path]=/'
```

If the API returns an error, open the repo Settings → Pages → “Deploy from a branch” → `main` → `/ (root)` and save.

- [ ] Check the Pages status:

```bash
gh api repos/nddcv1/consistency-limbo/pages --jq '{status: .status, url: .html_url}'
```

Expected eventually: `status: built` and `url: https://nddcv1.github.io/consistency-limbo/`.

### Step 5: Verify the live site and repository presentation

- [ ] Open and check:
  - `https://nddcv1.github.io/consistency-limbo/` loads without a build error.
  - `https://nddcv1.github.io/consistency-limbo/?level=boss` opens the boss.
  - The README hero GIF/PNG renders on the GitHub repo page.
  - The level rail, narrow layout, deep link and localStorage progress behave like local.
  - The favicon renders.

### Step 6: Set the About, topics and tag

- [ ] Set the repository description and topics:

```bash
gh repo edit nddcv1/consistency-limbo \
  --description "给学数学分析的人：把 ε-δ 和一致连续拖出来看。 · An interactive ε-δ playground for real-analysis students." \
  --add-topic math --add-topic calculus --add-topic real-analysis \
  --add-topic epsilon-delta --add-topic uniform-continuity --add-topic canvas \
  --add-topic education --add-topic visualization --add-topic interactive --add-topic game
```

- [ ] Tag the release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

### Step 7: Update persistent project memory

- [ ] Create `C:\Users\zzt\.claude\projects\D--project\memory\project_consistency_limbo.md` with:

```markdown
---
name: Consistency Limbo 项目
description: Consistency Limbo（ε-δ 与一致连续互动游戏）的发布状态、技术路线和非显而易见的决策
type: project
---

Consistency Limbo v0.1 已发布：

- 仓库：https://github.com/nddcv1/consistency-limbo
- 在线 demo：https://nddcv1.github.io/consistency-limbo/
- 纯静态 ES modules + Canvas；GitHub Pages 从 main 根目录发布；无运行时依赖。
- 5 关 + 两幕 Boss；Boss 第二幕是引导式演示，不是形式证明。
- 仅预设函数，不做自定义表达式解析。
- README 顶部 960×540 GIF 由 Playwright-core + pngjs + gifenc 驱动本机 Edge 生成。
- 发布前做过竞品调研：KU Leuven、GeoGebra、Vanishing Point 已有类似交互；定位是“把一致连续做成 boss 关的精致开源游戏”，不写“没人做过”。

**Why:** 用户想要一个一天能做完、能在 GitHub 上展示的数学可视化小项目；ε-δ 的量词顺序适合做成可拖拽的游戏。

**How to apply:** 后续扩展先读 `D:\consistency-limbo\docs\superpowers\specs\2026-11-01-consistency-limbo-design.md` 和 README；优先加关卡/自定义函数，不要引入后端或框架。
```

- [ ] Add a one-line pointer to `C:\Users\zzt\.claude\projects\D--project\memory\MEMORY.md`:

```markdown
- [Consistency Limbo 项目](project_consistency_limbo.md) — 已发布 ε-δ/一致连续互动游戏；GitHub Pages 静态站，无运行时依赖
```

### Step 8: Final report

- [ ] Report the live URL, repo URL, test result, GIF size, and any known gaps. Do not claim a feature works without the verification output above.

---

## Definition of Done

- [ ] `npm test` passes all math, game and renderer tests.
- [ ] All five levels and both boss acts are playable in Edge.
- [ ] Boss act 2 auto-extends, shows the envelope chart, gates completion behind the correct quiz answer, and never falsely calls the finite scan a proof.
- [ ] README hero image exists and is readable at 720px; GIF is 960×540, ≤4MB, or the PNG fallback is used and the README src matches.
- [ ] GitHub Pages live site and `?level=boss` work.
- [ ] No runtime dependencies, no backend, no analytics, no `eval`, no external requests.
- [ ] Public repo created only after explicit user approval; About/topics/tag set; memory updated.


