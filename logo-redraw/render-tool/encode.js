// encode.js — ghép chuỗi PNG (từ render.js) + trộn đúng audio cue (từ __RENDER_AUDIO_CUES__)
// thành 1 file video hoàn chỉnh bằng ffmpeg (ffmpeg-static, không cần cài hệ thống).
const ffmpegPath = require('ffmpeg-static');
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function buildAudioFilter(audioCues) {
  // Mỗi cue dịch đúng thời điểm phát (ms) rồi trộn tất cả lại — track nào ngắn hơn video thì tự
  // im lặng phần còn lại (không dùng -shortest vì video mới là cột mốc thời lượng chuẩn).
  const delays = audioCues.map(c => Math.max(0, Math.round(c.at * 1000)));
  const delayParts = audioCues.map((c, i) => `[${i + 1}:a]adelay=${delays[i]}|${delays[i]}[a${i}]`);
  const mixLabels = audioCues.map((_, i) => `[a${i}]`).join('');
  const filter = audioCues.length === 1
    ? `${delayParts[0]}`
    : `${delayParts.join(';')};${mixLabels}amix=inputs=${audioCues.length}:duration=longest:dropout_transition=0[a0mix]`;
  const outLabel = audioCues.length === 1 ? '[a0]' : '[a0mix]';
  return { filter, outLabel };
}

function encode({ framesDir, fps, audioCues, soundsDir, outputPath, crf = 16 }) {
  const inputArgs = ['-y', '-framerate', String(fps), '-i', path.join(framesDir, 'frame_%06d.png')];
  const audioInputArgs = [];
  audioCues.forEach(cue => {
    audioInputArgs.push('-i', path.join(soundsDir, path.basename(cue.file)));
  });

  const { filter, outLabel } = buildAudioFilter(audioCues);

  const args = [
    ...inputArgs,
    ...audioInputArgs,
    '-filter_complex', filter,
    '-map', '0:v',
    '-map', outLabel,
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', String(crf),
    '-pix_fmt', 'yuv420p',
    '-r', String(fps),
    '-c:a', 'aac',
    '-b:a', '192k',
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
    console.error('Cách dùng: node encode.js --frames <dir chứa frame_%06d.png + meta.json> --sounds <dir mp3> --out <output.mp4>');
    process.exit(1);
  }
  const meta = JSON.parse(fs.readFileSync(path.join(args.frames, 'meta.json'), 'utf8'));
  encode({
    framesDir: args.frames,
    fps: meta.fps,
    audioCues: meta.audioCues,
    soundsDir: args.sounds,
    outputPath: args.out,
    crf: args.crf ? Number(args.crf) : 16
  });
}
