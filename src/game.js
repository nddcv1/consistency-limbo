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
