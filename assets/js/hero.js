/* ═══════════════════════════════════════════════════════════
   Song Ngọc — Cinematic Hero Animation
   Canvas: Sparks + Blueprint grid + Particles + Logo reveal
   Aesthetic: Industrial / Precision Engineering / Steel
═══════════════════════════════════════════════════════════ */
'use strict';

(function HeroScene() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, raf;
  const BRAND_GREEN  = [0, 133, 74];
  const BRAND_ORANGE = [243, 128, 34];
  const particles   = [];
  const sparks      = [];
  const gridLines   = [];
  let   t           = 0;
  let   scanX       = -1;        // blueprint scan line X
  let   logoReveal  = 0;         // 0→1

  /* ── Resize ── */
  function resize() {
    const hero = canvas.parentElement;
    W = canvas.width  = hero.offsetWidth;
    H = canvas.height = hero.offsetHeight;
    buildGrid();
  }

  /* ── Blueprint grid ── */
  function buildGrid() {
    gridLines.length = 0;
    const cols = Math.ceil(W / 80);
    const rows = Math.ceil(H / 80);
    for (let c = 0; c <= cols; c++) gridLines.push({ x: c * 80, vert: true });
    for (let r = 0; r <= rows; r++) gridLines.push({ y: r * 80, vert: false });
  }

  /* ── Particles (welding embers) ── */
  function addParticle(x, y) {
    const ang = (Math.random() * Math.PI * 2);
    const spd = 0.6 + Math.random() * 3.5;
    const col = Math.random() < 0.6 ? BRAND_ORANGE : BRAND_GREEN;
    particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 2,
      life: 1,
      decay: 0.012 + Math.random() * 0.02,
      sz: 1.2 + Math.random() * 2.5,
      col,
      glow: Math.random() < 0.3,
    });
  }

  /* ── Sparks (fast streaks) ── */
  function addSpark(x, y) {
    sparks.push({
      x, y,
      vx: (Math.random() - 0.5) * 12,
      vy: -(Math.random() * 8 + 2),
      life: 0.8 + Math.random() * 0.4,
      decay: 0.025 + Math.random() * 0.02,
      col: Math.random() < 0.5 ? BRAND_ORANGE : [255, 220, 100],
    });
  }

  /* ── Arc burst (welding point) ── */
  let arcTimer = 0;
  const arcPoints = [
    { x: 0.15, y: 0.35 },
    { x: 0.72, y: 0.55 },
    { x: 0.42, y: 0.22 },
    { x: 0.88, y: 0.70 },
    { x: 0.05, y: 0.80 },
  ];
  let arcIdx = 0;
  function drawArcBurst() {
    if (arcTimer-- > 0) return;
    arcTimer = 60 + Math.floor(Math.random() * 90);
    const pt = arcPoints[arcIdx % arcPoints.length];
    arcIdx++;
    const ax = pt.x * W, ay = pt.y * H;
    /* Burst */
    for (let i = 0; i < 22; i++) addParticle(ax, ay);
    for (let i = 0; i < 10; i++) addSpark(ax, ay);
    /* Draw arc flash */
    const g = ctx.createRadialGradient(ax, ay, 0, ax, ay, 60);
    g.addColorStop(0, 'rgba(255,220,80,0.9)');
    g.addColorStop(0.2, 'rgba(243,128,34,0.4)');
    g.addColorStop(1, 'transparent');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(ax, ay, 60, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /* ── Continuous spark rain (top) ── */
  let rainTimer = 0;
  function sparkRain() {
    if (++rainTimer % 3 !== 0) return;
    const x = Math.random() * W;
    if (Math.random() < 0.3) addParticle(x, Math.random() * H * 0.3);
    if (Math.random() < 0.15) addSpark(x, Math.random() * H * 0.4);
  }

  /* ── Draw particles ── */
  function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.08; p.vx *= 0.99;
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      const a = Math.min(1, p.life * 1.5);
      const [r, g, b] = p.col;
      ctx.save();
      if (p.glow) { ctx.shadowColor = `rgba(${r},${g},${b},0.8)`; ctx.shadowBlur = 12; }
      ctx.globalAlpha = a;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.sz, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  function drawSparks() {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx; s.y += s.vy; s.vy += 0.25;
      s.life -= s.decay;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      const [r, g, b] = s.col;
      ctx.save();
      ctx.globalAlpha = s.life * 0.9;
      ctx.strokeStyle = `rgb(${r},${g},${b})`;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 5, s.y - s.vy * 5);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ── Blueprint grid draw ── */
  function drawGrid() {
    const revealed = scanX / W;
    if (revealed <= 0) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(0,133,74,0.12)';
    ctx.lineWidth = 0.5;
    gridLines.forEach(l => {
      if (l.vert) {
        if (l.x > scanX) return;
        ctx.beginPath(); ctx.moveTo(l.x, 0); ctx.lineTo(l.x, H); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(0, l.y); ctx.lineTo(Math.min(scanX, W), l.y); ctx.stroke();
      }
    });

    /* Scan line glow */
    if (scanX < W) {
      const grd = ctx.createLinearGradient(scanX - 60, 0, scanX + 20, 0);
      grd.addColorStop(0, 'transparent');
      grd.addColorStop(0.7, 'rgba(0,133,74,0.25)');
      grd.addColorStop(1, 'rgba(243,128,34,0.4)');
      ctx.fillStyle = grd;
      ctx.fillRect(scanX - 60, 0, 80, H);
    }
    ctx.restore();
  }

  /* ── Floating mesh nodes ── */
  const nodes = Array.from({ length: 18 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    r: 1.5 + Math.random() * 2,
    col: Math.random() < 0.5 ? BRAND_GREEN : BRAND_ORANGE,
  }));

  function drawNodes() {
    const opacity = Math.min(1, scanX / W * 2) * 0.6;
    if (opacity <= 0) return;
    ctx.save();
    ctx.globalAlpha = opacity;
    /* Edges */
    nodes.forEach((a, i) => {
      nodes.slice(i + 1).forEach(b => {
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx*dx + dy*dy;
        if (d2 > 200*200) return;
        const alpha = (1 - Math.sqrt(d2)/200) * 0.35;
        ctx.strokeStyle = `rgba(0,133,74,${alpha})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });
    });
    /* Nodes */
    nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
      const [r, g, b] = n.col;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  /* ── Dark vignette ── */
  function drawVignette() {
    const g = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.9);
    g.addColorStop(0, 'transparent');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  /* ── Main animation loop ── */
  function frame() {
    raf = requestAnimationFrame(frame);
    ctx.clearRect(0, 0, W, H);
    t++;

    /* Blueprint scan (enters in first 3s ≈ 180 frames) */
    if (t < 200) scanX = Math.min(W, (t / 180) * W * 1.05);

    drawGrid();
    drawNodes();
    drawArcBurst();
    sparkRain();
    drawParticles();
    drawSparks();
    drawVignette();

    /* Content reveal trigger */
    if (t === 80) triggerContentReveal();
  }

  /* ── Hero content text reveal ── */
  function triggerContentReveal() {
    const els = document.querySelectorAll('.hero-anim');
    els.forEach((el, i) => {
      el.style.transition = `opacity 0.8s ease ${i * 0.15}s, transform 0.8s ease ${i * 0.15}s`;
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
    /* Counter animation for hero stats */
    document.querySelectorAll('.hero [data-count]').forEach(el => {
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      if (window.animateCounter) animateCounter(el, target, suffix, 2000);
    });
  }

  /* ── Initialise ── */
  function init() {
    resize();
    window.addEventListener('resize', () => { resize(); nodes.forEach(n => { n.x = Math.random()*W; n.y = Math.random()*H; }); }, { passive: true });

    /* Pre-hide hero content */
    document.querySelectorAll('.hero-anim').forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
    });

    frame();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Pause when tab hidden */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else frame();
  });
})();
