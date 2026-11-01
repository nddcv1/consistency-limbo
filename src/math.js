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
