import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import gifenc from 'gifenc';

const { GIFEncoder, quantize, applyPalette } = gifenc;
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
