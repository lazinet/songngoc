// render.js — chụp từng khung hình của 1 file SN-*.html ở ĐỘ PHÂN GIẢI/FPS BẤT KỲ, hoàn toàn
// không phụ thuộc màn hình/hiệu năng máy đang chạy.
//
// Cơ chế: KHÔNG dùng CDP Emulation.setVirtualTimePolicy (đã thử — bị Chrome "treo" ở
// Page.captureScreenshot vì cơ chế này chờ 1 compositor frame mới trong lúc đồng hồ ảo đang dừng,
// mà nội dung có rAF-loop liên tục (GSAP ticker) thì không bao giờ "yên" để sinh frame đó — đây là
// hạn chế đã biết của việc kết hợp virtual time + continuously-animating content).
//
// Thay vào đó: gỡ hẳn GSAP ticker tự động (`gsap.ticker.remove(gsap.updateRoot)`), rồi TỰ GỌI
// `gsap.updateRoot(t)` cho từng khung hình — hàm này vốn là hàm mà ticker gọi tự động mỗi khung
// hình thật, nó render TOÀN BỘ cây timeline global (bao gồm `tl` chính LẪN mọi tween "mồ côi"
// repeat:-1 như twinkle sao/sóng nước/sweep) một cách đồng bộ, không cần chờ rAF/compositor gì cả
// — screenshot sau đó hoạt động bình thường y hệt mọi lần chụp `?t=` đã dùng suốt dự án.
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function renderFrames({ htmlPath, outDir, width, height, fps, scale = 1, maxSeconds = null, quiet = false, omitBackground = false }) {
  const log = (...a) => { if (!quiet) console.log(...a); };

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      `--window-size=${width},${height}`,
      '--autoplay-policy=no-user-gesture-required',
      '--force-color-profile=srgb'
    ]
  });

  try {
    const page = await browser.newPage();
    page.on('pageerror', (err) => log('[LỖI TRANG]', err.message));
    await page.setViewport({ width, height, deviceScaleFactor: 1 });

    const fileUrl = 'file:///' + path.resolve(htmlPath).replace(/\\/g, '/') + `?render=1&scale=${scale}`;
    log('Đang tải:', fileUrl);
    await page.goto(fileUrl, { waitUntil: 'load' });
    await page.waitForFunction('window.__RENDER_READY__ === true', { timeout: 30000 });
    log('Trang đã sẵn sàng (render mode).');

    const duration = await page.evaluate(() => tl.duration());
    const audioCues = await page.evaluate(() => window.__RENDER_AUDIO_CUES__ || []);
    log(`Tổng thời lượng timeline: ${duration.toFixed(2)}s`);
    log('Audio cues:', JSON.stringify(audioCues));

    const effectiveDuration = maxSeconds ? Math.min(duration, maxSeconds) : duration;
    const frameCount = Math.max(1, Math.ceil(effectiveDuration * fps));
    log(`Sẽ chụp ${frameCount} khung hình @ ${fps}fps, ${width}x${height} (~${effectiveDuration.toFixed(2)}s)`);

    // Gỡ ticker tự động, khởi động tl, chốt mốc quy đổi "t video" -> "global time" của GSAP —
    // đọc `gsap.ticker.time` CÙNG 1 lượt evaluate với play(0) để không lệch do độ trễ round-trip.
    const base = await page.evaluate(() => {
      gsap.ticker.remove(gsap.updateRoot);
      tl.play(0);
      return gsap.ticker.time;
    });

    const t0 = Date.now();
    for (let i = 0; i < frameCount; i++) {
      const t = i / fps;
      await page.evaluate((absT) => { gsap.updateRoot(absT); }, base + t);
      const framePath = path.join(outDir, `frame_${String(i).padStart(6, '0')}.png`);
      await page.screenshot({ path: framePath, type: 'png', omitBackground });
      if (i % 30 === 0 || i === frameCount - 1) {
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        log(`  khung ${i + 1}/${frameCount}  (đã chạy ${elapsed}s)`);
      }
    }

    log('Đã chụp xong toàn bộ khung hình.');
    return { frameCount, fps, width, height, duration: effectiveDuration, audioCues, outDir };
  } finally {
    await browser.close();
  }
}

module.exports = { renderFrames };

// Parser đối số dòng lệnh tối giản kiểu --key value / --key=value — không cần thêm dependency
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    if (eq !== -1) { out[a.slice(2, eq)] = a.slice(eq + 1); continue; }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) { out[key] = next; i++; }
    else out[key] = true;
  }
  return out;
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.html || !args.out) {
    console.error('Cách dùng: node render.js --html <path> --out <dir> [--width 3840] [--height 2160] [--fps 60] [--scale 2] [--maxSeconds N] [--alpha]');
    process.exit(1);
  }
  renderFrames({
    htmlPath: args.html,
    outDir: args.out,
    width: Number(args.width) || 1920,
    height: Number(args.height) || 1080,
    fps: Number(args.fps) || 30,
    scale: Number(args.scale) || 1,
    maxSeconds: args.maxSeconds ? Number(args.maxSeconds) : null,
    omitBackground: !!args.alpha
  }).then((meta) => {
    fs.writeFileSync(path.join(args.out, 'meta.json'), JSON.stringify(meta, null, 2));
    console.log('Meta:', meta);
  }).catch((e) => { console.error(e); process.exit(1); });
}
