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
    hue: [30, 38, 46, 22, 18, 28][i],  // 180/165 were cyan-teal: off-palette
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

/* ── GUIDED POINTER ───────────────────────────────────────────────────────
   Augments the native cursor; never replaces it. The ring eases toward the
   pointer, snaps toward the centre of whatever is clickable, and reports state
   on <html> so the styling stays in CSS.

   State flags go on <html>, not <body> — the Vagaro widget overwrites
   body.className and would silently wipe them.
─────────────────────────────────────────────────────────────────────────── */
(function initGuidedPointer() {
  const dot  = document.getElementById('lc-cursor');
  const ring = document.getElementById('lc-cursor-ring');
  if (!dot || !ring) return;

  // Anyone on touch, or who asked for less motion, keeps the plain OS cursor.
  const fine = window.matchMedia('(hover:hover) and (pointer:fine)');
  const still = window.matchMedia('(prefers-reduced-motion:reduce)');
  if (!fine.matches || still.matches) {
    dot.style.display = ring.style.display = 'none';
    return;
  }

  const root = document.documentElement;
  const INTERACTIVE = 'a,button,[role="button"],[onclick],input,select,textarea,summary,.lc-dropdown-item,.mobile-nav-item,.lc-logo';
  const TEXT = 'p,h1,h2,h3,h4,li,span.lc-body,.lc-body';

  let mx = innerWidth / 2, my = innerHeight / 2;   // true pointer
  let rx = mx, ry = my;                            // eased ring
  let targetX = null, targetY = null;              // magnet point
  let raf = null;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate3d(${mx}px,${my}px,0) translate(-50%,-50%)`;
    root.classList.remove('lc-cursor-out');

    const el = e.target instanceof Element ? e.target : null;
    const hit = el && el.closest(INTERACTIVE);

    if (hit) {
      root.classList.add('lc-point');
      root.classList.remove('lc-text');
      // Pull the ring gently toward the target's centre so it reads as locked on.
      const r = hit.getBoundingClientRect();
      if (r.width < 420 && r.height < 220) {
        targetX = r.left + r.width / 2;
        targetY = r.top + r.height / 2;
      } else {
        targetX = targetY = null;
      }
    } else {
      root.classList.remove('lc-point');
      targetX = targetY = null;
      root.classList.toggle('lc-text', Boolean(el && el.closest(TEXT)));
    }
  }, { passive: true });

  document.addEventListener('mousedown', () => root.classList.add('lc-press'), { passive: true });
  document.addEventListener('mouseup',   () => root.classList.remove('lc-press'), { passive: true });
  document.addEventListener('mouseleave', () => root.classList.add('lc-cursor-out'), { passive: true });
  document.addEventListener('mouseenter', () => root.classList.remove('lc-cursor-out'), { passive: true });

  // Keyboard users get the same "this is the target" signal, parked on the
  // focused element, so the halo is not a mouse-only affordance.
  document.addEventListener('focusin', e => {
    const el = e.target;
    if (!(el instanceof Element) || !el.matches(INTERACTIVE)) return;
    if (!el.matches(':focus-visible')) return;
    const r = el.getBoundingClientRect();
    mx = targetX = r.left + r.width / 2;
    my = targetY = r.top + r.height / 2;
    root.classList.add('lc-point');
    root.classList.remove('lc-cursor-out');
    dot.style.transform = `translate3d(${mx}px,${my}px,0) translate(-50%,-50%)`;
  });

  (function animate() {
    // Magnet pull is weaker than the follow, so the ring leans toward a target
    // without detaching from the pointer.
    const gx = targetX === null ? mx : mx + (targetX - mx) * 0.35;
    const gy = targetY === null ? my : my + (targetY - my) * 0.35;
    rx += (gx - rx) * 0.18;
    ry += (gy - ry) * 0.18;
    ring.style.transform = `translate3d(${rx}px,${ry}px,0) translate(-50%,-50%)`;
    raf = requestAnimationFrame(animate);
  })();

  // Stop the loop when the tab is hidden.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
    else if (!raf) raf = requestAnimationFrame(function loop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0) translate(-50%,-50%)`;
      raf = requestAnimationFrame(loop);
    });
  });
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

  const heroArrow = document.getElementById('hero-scroll-arrow');

  window.addEventListener('scroll', () => {
    if (header) header.classList.toggle('scrolled', window.scrollY > 60);
    if (heroArrow) heroArrow.classList.toggle('sa-hidden', window.scrollY > window.innerHeight * 0.35);
  }, { passive: true });
})();

/* ── DROPDOWN NAVIGATION ──────────────────────────────────────────────────
   WAI-ARIA disclosure navigation pattern. The old menu opened on :hover only,
   so it was unusable by tap and by keyboard, and a 10px dead gap between the
   trigger and the panel closed it mid-reach. This gives it:
     · click / tap to toggle (works on touch)
     · hover to open with intent delay, and a grace period before closing
     · full keyboard support: Enter, Space, arrows, Home/End, Escape, Tab-out
     · aria-expanded kept in sync, focus returned to the trigger on Escape
   WCAG 2.1 SC 1.4.13 (Content on Hover or Focus) requires dismissible and
   hoverable content, which the hover bridge in CSS and Escape handling cover.
─────────────────────────────────────────────────────────────────────────── */
(function initDropdownNav() {
  const OPEN_DELAY  = 90;   // ms of hover before opening — avoids flicker on pass-through
  const CLOSE_DELAY = 280;  // ms of grace after leaving — avoids closing mid-reach

  function setup() {
    const dropdowns = Array.from(document.querySelectorAll('.lc-dropdown'));
    if (!dropdowns.length) return;

    // Flag on <html>, not <body>: the Vagaro widget overwrites body.className.
    document.documentElement.classList.add('lc-nav-js');

    let openTimer = null, closeTimer = null;
    const clearTimers = () => { clearTimeout(openTimer); clearTimeout(closeTimer); };

    function close(dd) {
      dd.classList.remove('open');
      const trigger = dd.querySelector('.lc-dropdown-trigger');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }

    function closeAll(except) {
      dropdowns.forEach(dd => { if (dd !== except) close(dd); });
    }

    function open(dd) {
      closeAll(dd);
      dd.classList.add('open');
      const trigger = dd.querySelector('.lc-dropdown-trigger');
      if (trigger) trigger.setAttribute('aria-expanded', 'true');
    }

    // navTo() calls this so a dropdown never lingers over a freshly opened page.
    window.lcCloseDropdowns = () => { clearTimers(); closeAll(null); };

    dropdowns.forEach(dd => {
      const trigger = dd.querySelector('.lc-dropdown-trigger');
      const panel   = dd.querySelector('.lc-dropdown-menu');
      if (!trigger || !panel) return;
      const items = () => Array.from(panel.querySelectorAll('.lc-dropdown-item'));

      // ── Pointer: click toggles. Works for mouse and touch alike. ──
      trigger.addEventListener('click', e => {
        e.stopPropagation();
        clearTimers();
        dd.classList.contains('open') ? close(dd) : open(dd);
      });

      // ── Hover with intent, on fine pointers only ──
      if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
        dd.addEventListener('mouseenter', () => {
          clearTimers();
          openTimer = setTimeout(() => open(dd), OPEN_DELAY);
        });
        dd.addEventListener('mouseleave', () => {
          clearTimers();
          closeTimer = setTimeout(() => close(dd), CLOSE_DELAY);
        });
      }

      // ── Keyboard on the trigger ──
      trigger.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(dd);
          const first = items()[0];
          if (first) first.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          open(dd);
          const all = items();
          if (all.length) all[all.length - 1].focus();
        } else if (e.key === 'Escape') {
          close(dd);
        }
      });

      // ── Keyboard inside the panel ──
      panel.addEventListener('keydown', e => {
        const all = items();
        const i = all.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          all[(i + 1) % all.length]?.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          all[(i - 1 + all.length) % all.length]?.focus();
        } else if (e.key === 'Home') {
          e.preventDefault(); all[0]?.focus();
        } else if (e.key === 'End') {
          e.preventDefault(); all[all.length - 1]?.focus();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          close(dd);
          trigger.focus();   // focus must not be lost when the panel disappears
        }
      });

      // Tabbing (or clicking) out of the dropdown closes it.
      dd.addEventListener('focusout', e => {
        if (!dd.contains(e.relatedTarget)) close(dd);
      });
    });

    // Click anywhere else, or press Escape anywhere, to dismiss.
    document.addEventListener('click', e => {
      if (!e.target.closest('.lc-dropdown')) { clearTimers(); closeAll(null); }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { clearTimers(); closeAll(null); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();

/* ── PAGE NAVIGATION ──────────────────────────────────────────────────── */
function navTo(pageId, fromHistory) {
  // Give each page a shareable URL (#medical-aesthetics) and working back button
  if (!fromHistory && document.getElementById('page-' + pageId)) {
    const hash = pageId === 'home' ? location.pathname : '#' + pageId;
    if (location.hash !== '#' + pageId) history.pushState({ page: pageId }, '', hash);
  }

  // Close mobile menu if open
  const mob = document.getElementById('mobile-menu');
  if (mob) { mob.classList.remove('open'); document.body.style.overflow = ''; }

  // Close any open desktop dropdown — otherwise it hangs over the new page
  if (window.lcCloseDropdowns) window.lcCloseDropdowns();

  document.querySelectorAll('.lc-page').forEach(p => p.classList.remove('active'));

  const target = document.getElementById('page-' + pageId);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Trigger reveals for newly visible page
    setTimeout(() => {
      target.querySelectorAll('.lc-reveal:not(.in)').forEach(el => el.classList.add('in'));
      // Grids mounted on this page were never observed while hidden — wire them
      // and reveal whatever is already in view, or they stay at opacity:0.
      if (window.lcWireGrids) window.lcWireGrids(target);
    }, 100);
  } else {
    // Fallback: show home
    const home = document.getElementById('page-home');
    if (home) home.classList.add('active');
  }
}

function navFromHash() {
  const id = location.hash.slice(1);
  navTo(id && document.getElementById('page-' + id) ? id : 'home', true);
}
window.addEventListener('popstate', navFromHash);
document.addEventListener('DOMContentLoaded', () => { if (location.hash) navFromHash(); });

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

/* ── CONTACT FORM SUBMISSION ──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.lc-contact-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const data = Object.fromEntries(new FormData(form));

    if (!data.email) return;

    const origText = btn.textContent;
    btn.textContent = 'Sending…';
    btn.disabled = true;

    try {
      // Each field is sent under its own name so it lands in its own labeled
      // column in Supabase (contact_inquiries), not flattened into an email body.
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:    data.name    || '',
          email:   data.email,
          phone:   data.phone   || '',
          service: data.service || '',
          message: data.message || '',
          pageUrl: window.location.href
        })
      });

      if (res.ok) {
        form.innerHTML = `
          <div style="text-align:center;padding:32px 0">
            <div style="font-size:2.5rem;margin-bottom:16px">🌸</div>
            <h3 class="lc-h3" style="margin-bottom:8px">Message Received!</h3>
            <p class="lc-body">Thank you, ${data.name ? data.name.split(' ')[0] : 'friend'}. We'll be in touch within 24 hours.</p>
            <p class="lc-body" style="margin-top:8px;font-size:.78rem;opacity:.6">Need a faster response? Text us at <a href="sms:4436782254" style="color:var(--gold-text)">443-678-2254</a></p>
          </div>`;
      } else {
        throw new Error('Server error');
      }
    } catch {
      btn.textContent = origText;
      btn.disabled = false;
      const err = form.querySelector('.lc-form-error') || document.createElement('p');
      err.className = 'lc-form-error';
      err.style.cssText = 'color:var(--gold-text);font-size:.8rem;margin-bottom:12px';
      err.textContent = 'Something went wrong. Please email us directly at LoveLiCareSvcs@gmail.com';
      if (!form.querySelector('.lc-form-error')) form.prepend(err);
    }
  });
});

/* ── SUBSCRIBE FORM ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const subForm = document.querySelector('.lc-subscribe-form');
  if (!subForm) return;

  subForm.addEventListener('submit', async e => {
    e.preventDefault();
    const input = subForm.querySelector('input[type="email"]');
    const btn   = subForm.querySelector('[type="submit"]');
    if (!input || !input.value) return;

    const origText = btn.textContent;
    btn.textContent = '…';
    btn.disabled = true;

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: input.value.trim(),
          pageUrl: window.location.href
        })
      });
      if (!response.ok) throw new Error('Subscription request failed');

      subForm.innerHTML = `<p style="font-size:.84rem;color:var(--gold-text);text-align:center;padding:8px 0">🌸 You're in! Check your inbox for your 10% off code.</p>`;
    } catch {
      btn.textContent = origText;
      btn.disabled = false;
      const error = subForm.querySelector('.lc-subscribe-error') || document.createElement('p');
      error.className = 'lc-subscribe-error';
      error.style.cssText = 'font-size:.78rem;color:#9b3a44;text-align:center;margin-top:10px';
      error.textContent = 'We could not complete your signup. Please try again or email us directly.';
      if (!subForm.querySelector('.lc-subscribe-error')) subForm.append(error);
    }
  });
});

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

/* ══════════════════════════════════════════════════════════════════════════
   INTERACTION LAYER — scroll progress, staggered reveals, pointer tilt.
   Pairs with the INTERACTION LAYER block in liquid-glass.css.
   Honours prefers-reduced-motion: bails out entirely and leaves the page
   static but fully usable.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  var still = window.matchMedia('(prefers-reduced-motion:reduce)');

  function start() {
    if (still.matches) return;

    /* 1 ── Scroll progress hairline ───────────────────────────────────── */
    var bar = document.createElement('div');
    bar.id = 'lc-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    var queued = false;
    function paintProgress() {
      var d = document.documentElement;
      var max = d.scrollHeight - d.clientHeight;
      var p = max > 0 ? Math.min(Math.max(d.scrollTop / max, 0), 1) : 0;
      bar.style.transform = 'scaleX(' + p + ')';
      queued = false;
    }
    window.addEventListener('scroll', function () {
      if (!queued) { queued = true; requestAnimationFrame(paintProgress); }
    }, { passive: true });
    paintProgress();

    /* 2 ── Staggered grid reveals ─────────────────────────────────────── */
    var GRIDS = '.grid-2,.grid-3,.grid-4,.ba-grid';

    function indexGrid(g) {
      for (var i = 0; i < g.children.length; i++) {
        g.children[i].style.setProperty('--i', i);
      }
    }

    var gridObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('lc-in');
          gridObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    function wireGrids(root) {
      (root || document).querySelectorAll(GRIDS).forEach(function (g) {
        if (g.dataset.lcStagger) return;
        g.dataset.lcStagger = '1';
        indexGrid(g);
        gridObs.observe(g);
      });
    }
    wireGrids();

    // SPA page switches mount new grids — pick them up, and reveal any grid
    // already in view on the freshly shown page.
    window.lcWireGrids = function (root) {
      wireGrids(root);
      (root || document).querySelectorAll(GRIDS).forEach(function (g) {
        var r = g.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) g.classList.add('lc-in');
      });
    };

    /* 3 ── Pointer tilt on cards ──────────────────────────────────────── */
    // Only for devices with a real pointer; touch gets the hover lift alone.
    if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    document.documentElement.classList.add('lc-tilt-on');

    var TILT = '.glass-card,.lc-service-card,.vc-card';
    var MAX = 4;      // degrees — deliberately subtle; this is a clinic, not a toy
    var active = null;

    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest ? e.target.closest(TILT) : null;
      if (card !== active && active) reset(active);
      active = card;
      if (!card) return;

      var r = card.getBoundingClientRect();
      var cx = (e.clientX - r.left) / r.width - 0.5;
      var cy = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--ry', (cx * MAX).toFixed(2) + 'deg');
      card.style.setProperty('--rx', (-cy * MAX).toFixed(2) + 'deg');
      card.style.setProperty('--ty', '-4px');
    }, { passive: true });

    function reset(el) {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--ty', '0px');
    }
    document.addEventListener('pointerleave', function () {
      if (active) { reset(active); active = null; }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
