// encode-webm-alpha.js — ghép chuỗi PNG (đã có alpha thật, chụp bằng render.js --alpha) thành 1
// video WebM VP9 CÓ KÊNH ALPHA THẬT (khác GIF chỉ trong suốt 1-bit) — hầu hết phần mềm dựng
// video hiện đại (Premiere, DaVinci Resolve, After Effects, trình duyệt) đọc được trực tiếp.
const ffmpegPath = require('ffmpeg-static');
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function encode({ framesDir, fps, outputPath, crf = 28 }) {
  const args = [
    '-y',
    '-framerate', String(fps),
    '-i', path.join(framesDir, 'frame_%06d.png'),
    '-c:v', 'libvpx-vp9',
    '-pix_fmt', 'yuva420p', // 4:2:0 + kênh alpha
    '-b:v', '0',
    '-crf', String(crf),
    '-auto-alt-ref', '0', // bắt buộc tắt khi encode có alpha (alt-ref frame không mang alpha đúng)
    '-r', String(fps),
    outputPath
  ];
  console.log('ffmpeg', args.join(' '));
  const res = spawnSync(ffmpegPath, args, { stdio: 'inherit' });
  if (res.status !== 0) throw new Error('ffmpeg thất bại, mã lỗi ' + res.status);
  console.log('Đã ghi:', outputPath);
}

module.exports = { encode };

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
  if (!args.frames || !args.out) {
    console.error('Cách dùng: node encode-webm-alpha.js --frames <dir chứa frame_%06d.png + meta.json> --out <output.webm> [--crf 28]');
    process.exit(1);
  }
  const meta = JSON.parse(fs.readFileSync(path.join(args.frames, 'meta.json'), 'utf8'));
  encode({
    framesDir: args.frames,
    fps: meta.fps,
    outputPath: args.out,
    crf: args.crf ? Number(args.crf) : 28
  });
}
