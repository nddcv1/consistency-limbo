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
  return Math.max(
    0,
    Math.min(total, Math.round(state.scan.progress * (total - 1)) + 1),
  );
}

function scanCurrentX0() {
  const points = state.scan.points;
  if (!points.length) return state.x0;
  const index = Math.max(
    0,
    Math.min(points.length - 1, Math.round(state.scan.progress * (points.length - 1))),
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
  } else if (stage.win.type === 'scan-all' && state.stageComplete && state.check.passed) {
    text = stage.copy.success;
    tone = 'pass';
  } else if (stage.win.type === 'scan-all' && state.check.passed) {
    text = '当前 x₀ 全绿。点「扫描所有 x₀」，检查整段定义域。';
  } else if (state.completed && state.check.passed) {
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
      const t = Math.min(1, Math.max(0, (now - start) / duration));
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
