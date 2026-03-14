/* ══════════════════════════════════════════════════════════════════════
   LoveLi Care Med Spa — Liquid Glass Interactive Layer
   ══════════════════════════════════════════════════════════════════════ */

'use strict';

/* ── MESH GRADIENT CANVAS ─────────────────────────────────────────────── */
(function initMesh() {
  const canvas = document.getElementById('mesh-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const nodes = Array.from({ length: 6 }, (_, i) => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: 280 + Math.random() * 220,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
    hue: [30, 38, 46, 180, 165, 22][i],
    sat: [25, 30, 40, 15, 20, 35][i],
    light: [88, 90, 85, 82, 86, 92][i],
    alpha: 0.18 + Math.random() * 0.12,
  }));

  function drawMesh() {
    resize();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Warm cream base
    const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bg.addColorStop(0, 'hsl(34,42%,95%)');
    bg.addColorStop(0.5, 'hsl(30,35%,93%)');
    bg.addColorStop(1, 'hsl(26,38%,90%)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    nodes.forEach(n => {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < -n.r) n.x = canvas.width + n.r;
      if (n.x > canvas.width + n.r) n.x = -n.r;
      if (n.y < -n.r) n.y = canvas.height + n.r;
      if (n.y > canvas.height + n.r) n.y = -n.r;

      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, `hsla(${n.hue},${n.sat}%,${n.light}%,${n.alpha})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(drawMesh);
  }
  drawMesh();
})();

/* ── CUSTOM CURSOR ────────────────────────────────────────────────────── */
(function initCursor() {
  const dot  = document.getElementById('lc-cursor');
  const ring = document.getElementById('lc-cursor-ring');
  if (!dot || !ring) return;

  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left  = mx + 'px';
    dot.style.top   = my + 'px';
  }, { passive: true });

  (function animateRing() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animateRing);
  })();
})();

/* ── SCROLL: HEADER + REVEALS ─────────────────────────────────────────── */
(function initScroll() {
  const header = document.getElementById('lc-header');

  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.lc-reveal').forEach(el => revealObs.observe(el));

  window.addEventListener('scroll', () => {
    if (header) header.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
})();

/* ── PAGE NAVIGATION ──────────────────────────────────────────────────── */
function navTo(pageId) {
  // Close mobile menu if open
  const mob = document.getElementById('mobile-menu');
  if (mob) { mob.classList.remove('open'); document.body.style.overflow = ''; }

  document.querySelectorAll('.lc-page').forEach(p => p.classList.remove('active'));

  const target = document.getElementById('page-' + pageId);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Trigger reveals for newly visible page
    setTimeout(() => {
      target.querySelectorAll('.lc-reveal:not(.in)').forEach(el => el.classList.add('in'));
    }, 100);
  } else {
    // Fallback: show home
    const home = document.getElementById('page-home');
    if (home) home.classList.add('active');
  }
}

/* ── VAGARO OVERLAY ───────────────────────────────────────────────────── */
function openVagaro(serviceLabel) {
  const overlay = document.getElementById('vagaro-overlay');
  const label   = document.getElementById('vagaro-service-label');
  if (label && serviceLabel) label.textContent = serviceLabel;
  if (overlay) {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeVagaro() {
  const overlay = document.getElementById('vagaro-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Close on backdrop click
document.addEventListener('DOMContentLoaded', () => {
  const backdrop = document.getElementById('vagaro-overlay-backdrop');
  if (backdrop) backdrop.addEventListener('click', closeVagaro);

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeVagaro(); closeBookingSuccess(); }
  });
});

/* ── BOOKING SUCCESS ──────────────────────────────────────────────────── */
function showBookingSuccess(name, service, dateStr) {
  const el = document.getElementById('booking-success');
  if (!el) return;
  const nameEl    = document.getElementById('success-name');
  const serviceEl = document.getElementById('success-service');
  const dateEl    = document.getElementById('success-date');
  if (nameEl)    nameEl.textContent    = name    || 'Beautiful';
  if (serviceEl) serviceEl.textContent = service || 'Your treatment';
  if (dateEl)    dateEl.textContent    = dateStr || '';
  el.classList.add('active');
  document.body.style.overflow = 'hidden';
  launchRosePetals();
}

function closeBookingSuccess() {
  const el = document.getElementById('booking-success');
  if (el) { el.classList.remove('active'); document.body.style.overflow = ''; }
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('success-close');
  if (btn) btn.addEventListener('click', closeBookingSuccess);
});

/* ── ROSE PETAL CONFETTI ──────────────────────────────────────────────── */
function launchRosePetals() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const petals = Array.from({ length: 60 }, () => ({
    x:  Math.random() * canvas.width,
    y: -20 - Math.random() * 100,
    r:  4 + Math.random() * 8,
    vx: (Math.random() - 0.5) * 1.5,
    vy: 1.5 + Math.random() * 2.5,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.06,
    color: ['rgba(255,182,193,.8)','rgba(201,169,110,.7)','rgba(255,218,218,.9)','rgba(255,240,200,.8)'][Math.floor(Math.random()*4)],
    opacity: 0.6 + Math.random() * 0.4,
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    petals.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r, p.r * 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      p.x  += p.vx;
      p.y  += p.vy;
      p.rot += p.vr;
      p.opacity -= 0.004;
      if (p.y > canvas.height || p.opacity <= 0) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
        p.opacity = 0.6 + Math.random() * 0.4;
      }
    });
    frame++;
    if (frame < 240) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  draw();
}

/* ── TREATMENT PLANNER ────────────────────────────────────────────────── */
let plannerChoice = null;

const PLANNER_RECS = {
  refine:   { label: 'Medical Aesthetics', desc: 'Natural Botox or dermal fillers — expert clinical artistry by Libra Robertson, NP-CRNP. Precise, refreshed, never overdone.', page: 'medical-aesthetics' },
  sculpt:   { label: 'Snatch Protocol™',   desc: 'Our signature 360° body contouring system: ultrasound cavitation, RF tightening, lymphatic drainage + infrared wrap.', page: 'body-contouring' },
  restore:  { label: 'IV & Nutritional Therapy', desc: 'Custom vitamin infusions for energy restoration, skin radiance, and whole-body cellular recharge — take an hour, feel it for days.', page: 'nutritional-wellness' },
  wellness: { label: 'Weight Management', desc: 'Advanced therapies, diet modifications, and lifestyle guidance — a sustainable, science-backed transformation.', page: 'weight-management' },
  medical:  { label: 'Non-Emergent Care', desc: 'MMCC certifications, physicals, prescription refills — clinical care without the ER wait. Same-day appointments available.', page: 'non-emergent-care' },
};

function plannerSelect(opt) {
  plannerChoice = opt;
  document.querySelectorAll('#planner-step-1 .planner-opt').forEach(el => {
    el.classList.toggle('sel', el.dataset.opt === opt);
  });
}

function plannerNext(step) {
  if (step === 1 && !plannerChoice) return;
  document.getElementById('planner-step-' + step).style.display = 'none';
  const next = document.getElementById('planner-step-' + (step + 1));
  if (next) {
    next.style.display = 'block';
    // Update dots
    document.querySelectorAll('[id^="planner-dot-"]').forEach((d, i) => {
      d.classList.toggle('active', i <= step);
    });
  }
}

function plannerBack(step) {
  document.getElementById('planner-step-' + step).style.display = 'none';
  document.getElementById('planner-step-' + (step - 1)).style.display = 'block';
  document.querySelectorAll('[id^="planner-dot-"]').forEach((d, i) => {
    d.classList.toggle('active', i < step - 1);
  });
}

function plannerSubmit() {
  const rec   = PLANNER_RECS[plannerChoice] || PLANNER_RECS.restore;
  const label = document.getElementById('planner-rec-label');
  const desc  = document.getElementById('planner-rec-desc');
  if (label) label.textContent = rec.label;
  if (desc)  desc.textContent  = rec.desc;

  document.getElementById('planner-step-3').style.display = 'none';
  document.getElementById('planner-result').style.display = 'block';
  document.querySelectorAll('[id^="planner-dot-"]').forEach(d => d.classList.add('active'));
}

function plannerBookRec() {
  const rec = PLANNER_RECS[plannerChoice] || PLANNER_RECS.restore;
  openVagaro(rec.label);
}

function plannerReset() {
  plannerChoice = null;
  ['planner-step-2','planner-step-3','planner-result'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const step1 = document.getElementById('planner-step-1');
  if (step1) step1.style.display = 'block';
  document.querySelectorAll('#planner-step-1 .planner-opt').forEach(el => el.classList.remove('sel'));
  document.querySelectorAll('[id^="planner-dot-"]').forEach((d, i) => {
    d.classList.toggle('active', i === 0);
  });
}

/* ── COOKIE BANNER ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const cookie = document.getElementById('lc-cookie');
  const btn    = document.getElementById('lc-cookie-accept');
  if (!cookie) return;
  if (localStorage.getItem('lc_cookie_ok')) {
    cookie.classList.add('hidden');
    return;
  }
  if (btn) btn.addEventListener('click', () => {
    cookie.classList.add('hidden');
    localStorage.setItem('lc_cookie_ok', '1');
  });
});
