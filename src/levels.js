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
