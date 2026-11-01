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
