/* ═══════════════════════════════════════════════════════════
   Song Ngọc — Shared JS Utilities
   All pages include this file.
═══════════════════════════════════════════════════════════ */
'use strict';

/* ── Constants ── */
const SN = {
  green:  '#00854A',
  orange: '#F38022',
  GAS_URL: 'https://script.google.com/macros/s/YOUR_GAS_DEPLOYMENT_ID/exec',
  WORKER_URL: 'https://sn-form.songngoc.workers.dev',
  TURNSTILE_SITEKEY: 'YOUR_TURNSTILE_SITEKEY',
  GA_ID: 'G-XXXXXXXXXX',
};

/* ═══ HEADER ═══ */
(function initHeader() {
  const header = document.querySelector('.site-header');
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav a');

  /* Scroll effect */
  window.addEventListener('scroll', () => {
    header?.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  /* Active link */
  const path = location.pathname.replace(/\/$/, '') || '/index.html';
  navLinks.forEach(a => {
    const href = a.getAttribute('href');
    if (href && path.endsWith(href.replace(/^\.\//, ''))) {
      a.classList.add('active');
    }
  });

  /* Mobile toggle */
  hamburger?.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    mobileNav?.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  /* Close mobile nav on link click */
  mobileNav?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger?.classList.remove('open');
      mobileNav.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  /* Close on outside click */
  document.addEventListener('click', e => {
    if (mobileNav?.classList.contains('open') &&
        !mobileNav.contains(e.target) &&
        !hamburger?.contains(e.target)) {
      hamburger?.classList.remove('open');
      mobileNav.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
})();

/* ═══ BACK TO TOP ═══ */
(function initBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 500);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

/* ═══ SCROLL REVEAL (light AOS fallback) ═══ */
(function initReveal() {
  if (typeof AOS !== 'undefined') {
    AOS.init({ once: true, duration: 650, offset: 60, easing: 'ease-out-cubic' });
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('aos-animate'); io.unobserve(e.target); }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('[data-aos]').forEach(el => io.observe(el));
})();

/* ═══ TOAST NOTIFICATIONS ═══ */
const Toast = {
  el: null,
  _ensure() {
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.className = 'toast';
      document.body.appendChild(this.el);
    }
  },
  show(msg, type = 'success', dur = 3500) {
    this._ensure();
    this.el.className = `toast${type === 'error' ? ' error' : ''}`;
    this.el.innerHTML = `<i class="fas fa-${type === 'error' ? 'circle-xmark' : 'circle-check'}"></i> ${msg}`;
    requestAnimationFrame(() => { this.el.classList.add('show'); });
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.el.classList.remove('show'), dur);
  },
  error(msg) { this.show(msg, 'error'); }
};
window.Toast = Toast;

/* ═══ API CLIENT (Google Apps Script) ═══ */
const API = {
  async get(tab, params = {}) {
    const url = new URL(SN.GAS_URL);
    url.searchParams.set('tab', tab);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  },
  async post(action, data) {
    const res = await fetch(SN.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data })
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  }
};
window.API = API;

/* ═══ LOCAL DATA FALLBACK ═══ */
const LocalData = {
  _cache: {},
  async get(name) {
    if (this._cache[name]) return this._cache[name];
    try {
      const res = await fetch(`/data/${name}.json`);
      const data = await res.json();
      this._cache[name] = data;
      return data;
    } catch { return []; }
  }
};
window.LocalData = LocalData;

/* ═══ CONTENT LOADER (projects, news, etc.) ═══ */
async function loadContent(tab, renderFn, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  showSkeleton(container);
  try {
    let data;
    try {
      data = await API.get(tab);
      if (!data || !Array.isArray(data.data)) throw new Error('invalid');
      data = data.data;
    } catch {
      data = await LocalData.get(tab);
    }
    container.innerHTML = '';
    if (!data.length) { container.innerHTML = '<p class="text-muted text-center">Chưa có nội dung.</p>'; return; }
    data.forEach(item => container.insertAdjacentHTML('beforeend', renderFn(item)));
    window.dispatchEvent(new Event('contentLoaded'));
  } catch (err) {
    container.innerHTML = '<p class="text-muted text-center">Không tải được dữ liệu. Vui lòng thử lại.</p>';
    console.error(err);
  }
}
window.loadContent = loadContent;

function showSkeleton(container, count = 6) {
  container.innerHTML = Array(count).fill(0).map(() => `
    <div class="card" style="min-height:280px">
      <div class="skeleton" style="height:180px"></div>
      <div class="card-body">
        <div class="skeleton" style="height:14px;width:60%;margin-bottom:10px"></div>
        <div class="skeleton" style="height:20px;margin-bottom:8px"></div>
        <div class="skeleton" style="height:14px;width:80%"></div>
      </div>
    </div>`).join('');
}

/* ═══ COUNTER ANIMATION ═══ */
function animateCounter(el, target, suffix = '', duration = 1800) {
  const start = performance.now();
  const update = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const ease = p < 0.5 ? 2*p*p : -1+(4-2*p)*p;
    el.textContent = Math.round(ease * target) + suffix;
    if (p < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

function initCounters() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      animateCounter(el, target, suffix);
      io.unobserve(el);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-count]').forEach(el => io.observe(el));
}
document.addEventListener('DOMContentLoaded', initCounters);
window.animateCounter = animateCounter;

/* ═══ FILTER (projects, news) ═══ */
function initFilter(filterSelector, itemSelector) {
  const filters = document.querySelectorAll(filterSelector);
  const items   = document.querySelectorAll(itemSelector);
  if (!filters.length) return;

  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      filters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.filter;
      items.forEach(item => {
        const match = cat === 'all' || item.dataset.category === cat;
        item.style.display = match ? '' : 'none';
      });
    });
  });
}
window.initFilter = initFilter;

/* ═══ LIGHTBOX ═══ */
function initLightbox() {
  let overlay = document.querySelector('.lightbox-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `<button class="lightbox-close" aria-label="Đóng"><i class="fas fa-xmark"></i></button><img src="" alt="">`;
    document.body.appendChild(overlay);
    overlay.querySelector('.lightbox-close').addEventListener('click', () => overlay.classList.remove('open'));
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') overlay.classList.remove('open'); });
  }
  document.querySelectorAll('[data-lightbox]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const src = el.dataset.lightbox || el.querySelector('img')?.src || el.href;
      if (!src) return;
      overlay.querySelector('img').src = src;
      overlay.classList.add('open');
    });
  });
}
document.addEventListener('DOMContentLoaded', initLightbox);
window.initLightbox = initLightbox;

/* ═══ FORM UTILS ═══ */
const FormUtils = {
  validate(form) {
    let valid = true;
    form.querySelectorAll('[required]').forEach(field => {
      const ok = field.value.trim().length > 0;
      field.classList.toggle('invalid', !ok);
      if (!ok) valid = false;
    });
    const emailFields = form.querySelectorAll('[type="email"]');
    emailFields.forEach(field => {
      if (field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
        field.classList.add('invalid');
        valid = false;
      }
    });
    return valid;
  },
  reset(form) {
    form.reset();
    form.querySelectorAll('.invalid').forEach(f => f.classList.remove('invalid'));
  },
  loading(btn, isLoading) {
    btn.disabled = isLoading;
    btn._originalText = btn._originalText || btn.innerHTML;
    btn.innerHTML = isLoading
      ? '<i class="fas fa-circle-notch fa-spin"></i> Đang gửi...'
      : btn._originalText;
  }
};
window.FormUtils = FormUtils;

/* ═══ ANTI-SPAM: Honeypot + timing ═══ */
function antiSpam(form) {
  const startTime = Date.now();
  /* Honeypot field — hidden, bots fill it */
  const honey = form.querySelector('.hp-field');
  return {
    check() {
      if (honey && honey.value) return false;          // bot filled honeypot
      if (Date.now() - startTime < 1800) return false; // too fast (< 1.8s)
      return true;
    }
  };
}
window.antiSpam = antiSpam;

/* ═══ MISC ═══ */
function formatDate(dateStr, locale = 'vi-VN') {
  try {
    return new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return dateStr || ''; }
}
function truncate(str, n) { return str.length > n ? str.slice(0, n).trimEnd() + '…' : str; }
function slugify(str) { return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-'); }
window.formatDate = formatDate;
window.truncate = truncate;
window.slugify = slugify;

/* ═══ CLOUDFLARE TURNSTILE INIT ═══ */
function initTurnstile(formId) {
  const container = document.querySelector(`#${formId} .cf-turnstile`);
  if (!container || !window.turnstile) return;
  window.turnstile.render(container, { sitekey: SN.TURNSTILE_SITEKEY });
}
window.initTurnstile = initTurnstile;
