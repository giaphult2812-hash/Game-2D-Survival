import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const inputPath = path.resolve(process.argv[2]);
const outputPath = path.resolve(process.argv[3]);
const TARGET_SIZE = 512;
const PADDING = 24;

const rawBuffer = fs.readFileSync(inputPath);
const ext = path.extname(inputPath).toLowerCase() === '.png' ? 'png' : 'jpeg';
const dataUrl = `data:image/${ext};base64,${rawBuffer.toString('base64')}`;

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async ({ dataUrl, TARGET_SIZE, PADDING }) => {
    const img = new Image();
    img.src = dataUrl;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });

    const w = img.width, h = img.height;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    // Auto-detect background color from top-left corner (supports both #00FF00 green screen and #FFFFFF white bg)
    const bgR = d[0], bgG = d[1], bgB = d[2];
    const isWhiteBg = bgR > 235 && bgG > 235 && bgB > 235;

    // Edge-seeded BFS flood-fill: ONLY removes connected outer background so interior whites/greens are 100% preserved!
    const isBgPixel = (r, g, b) => {
      if (isWhiteBg) {
        return r > 232 && g > 232 && b > 232 && Math.max(r, g, b) - Math.min(r, g, b) < 22;
      }
      const dist = Math.sqrt(r * r + (g - 255) * (g - 255) + b * b);
      return dist < 135 || (g > 170 && g > 1.45 * r && g > 1.45 * b);
    };

    const visited = new Uint8Array(w * h);
    const queue = [];
    const pushIfBg = (x, y) => {
      const idx = y * w + x;
      if (visited[idx]) return;
      const p = idx * 4;
      if (isBgPixel(d[p], d[p + 1], d[p + 2])) {
        visited[idx] = 1;
        queue.push(idx);
      }
    };

    for (let x = 0; x < w; x++) { pushIfBg(x, 0); pushIfBg(x, h - 1); }
    for (let y = 0; y < h; y++) { pushIfBg(0, y); pushIfBg(w - 1, y); }

    for (let q = 0; q < queue.length; q++) {
      const cur = queue[q];
      const cx = cur % w;
      const cy = (cur - cx) / w;
      d[cur * 4 + 3] = 0;
      if (cx > 0) pushIfBg(cx - 1, cy);
      if (cx < w - 1) pushIfBg(cx + 1, cy);
      if (cy > 0) pushIfBg(cx, cy - 1);
      if (cy < h - 1) pushIfBg(cx, cy + 1);
    }

    // Gentle 1px outer-halo despill ONLY on pixels adjacent to cleared background
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (visited[idx]) continue;
        const nearBg = visited[idx - 1] || visited[idx + 1] || visited[idx - w] || visited[idx + w];
        if (nearBg) {
          const p = idx * 4;
          const r = d[p], g = d[p + 1], b = d[p + 2];
          if (g > Math.max(r, b) * 1.2) {
            d[p + 1] = Math.round((r + b) * 0.55);
            d[p + 3] = Math.min(d[p + 3], 220);
          }
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Find tight bounding box
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 20) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    const maxDraw = TARGET_SIZE - PADDING * 2;
    const scale = Math.min(maxDraw / cropW, maxDraw / cropH);
    const drawW = Math.round(cropW * scale);
    const drawH = Math.round(cropH * scale);

    const out = document.createElement('canvas');
    out.width = TARGET_SIZE;
    out.height = TARGET_SIZE;
    const octx = out.getContext('2d');
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(
      c,
      minX, minY, cropW, cropH,
      Math.round((TARGET_SIZE - drawW) / 2),
      Math.round(TARGET_SIZE - PADDING - drawH),
      drawW, drawH
    );

    return {
      src: `${w}x${h}`,
      out: `${TARGET_SIZE}x${TARGET_SIZE}`,
      pngDataUrl: out.toDataURL('image/png')
    };
  }, { dataUrl, TARGET_SIZE, PADDING });

  const base64 = result.pngDataUrl.replace(/^data:image\/png;base64,/, '');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(base64, 'base64'));
  console.log(`Extracted ${result.src} -> ${result.out} saved to ${outputPath}`);
} finally {
  await browser.close();
}
