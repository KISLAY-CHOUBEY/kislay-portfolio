/* ============================================================
   TSUKUYOMI AURA — soft blood-moon light that follows you.
   No hard circles / no snake chain:
   - One smooth follower glow (brightest core -> faded halo).
   - Scattered ember mist that drifts, scatters and fades.
   DEBUG: console should show "[tsukuyomi] live".
   ============================================================ */
(function () {
  'use strict';

  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      console.log('[tsukuyomi] disabled: prefers-reduced-motion');
      return;
    }

    var cv = document.createElement('canvas');
    cv.id = 'tsukuyomi-canvas';
    cv.style.position = 'fixed';
    cv.style.left = '0';
    cv.style.top = '0';
    cv.style.width = '100vw';
    cv.style.height = '100vh';
    cv.style.zIndex = '99999';
    cv.style.pointerEvents = 'none';
    cv.style.opacity = '1';
    (document.body || document.documentElement).appendChild(cv);

    var ctx = null;
    try {
      ctx = cv.getContext('2d', { alpha: true }) || cv.getContext('2d');
    } catch (e) {
      ctx = cv.getContext('2d');
    }
    if (!ctx) return;

    var W = 0, H = 0, DPR = 1;
    function fit() {
      try {
        DPR = Math.min(window.devicePixelRatio || 1, 1.25);
        W = window.innerWidth; H = window.innerHeight;
        cv.width = Math.floor(W * DPR);
        cv.height = Math.floor(H * DPR);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      } catch (e) {}
    }
    fit();
    var _rz;
    window.addEventListener('resize', function () { clearTimeout(_rz); _rz = setTimeout(fit, 200); });

    // ---- soft pre-rendered glow sprites (no hard edges, no rims) ----
    function makeSprite(inner, mid) {
      var s = 128;
      var c = document.createElement('canvas');
      c.width = s; c.height = s;
      var g = c.getContext('2d');
      var grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grad.addColorStop(0, inner);
      grad.addColorStop(0.25, mid);
      grad.addColorStop(0.6, 'rgba(180,10,35,0.28)');
      grad.addColorStop(1, 'rgba(40,0,5,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, s, s);
      return c;
    }
    var SPR_CORE = makeSprite('rgba(255,250,252,1)', 'rgba(255,90,120,0.85)');
    var SPR_RED = makeSprite('rgba(255,120,140,0.9)', 'rgba(225,20,55,0.55)');
    var SPR_FAINT = makeSprite('rgba(255,80,110,0.5)', 'rgba(160,8,30,0.30)');

    // ---- follower: glides behind the real cursor ----
    var cur = {
      x: window.innerWidth / 2, y: window.innerHeight / 2,
      tx: window.innerWidth / 2, ty: window.innerHeight / 2,
      px: window.innerWidth / 2, py: window.innerHeight / 2
    };

    // ---- scattered light particles (mist + embers) ----
    var parts = [];
    var MAX = 140;

    function addPart(p) {
      parts.push(p);
      if (parts.length > MAX) parts.splice(0, parts.length - MAX);
    }

    function scatter(x, y, vx, vy, burst) {
      if (document.hidden) return;
      // 1) wide soft mist puff — this is the "blended light", not a disc
      addPart({
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() - 0.5) * 14,
        vx: vx * 0.12 + (Math.random() - 0.5) * 0.5,
        vy: vy * 0.12 + (Math.random() - 0.5) * 0.5,
        life: 1, decay: 0.025 + Math.random() * 0.02,
        size: (burst ? 130 : 90) + Math.random() * 60,
        spr: SPR_FAINT, alpha: burst ? 0.5 : 0.34
      });
      // 2) a few small embers that fly out and fade
      var n = burst ? 10 : 2;
      for (var i = 0; i < n; i++) {
        var a = Math.random() * 6.283;
        var sp = (burst ? 1.2 : 0.4) + Math.random() * (burst ? 3.2 : 1.8);
        addPart({
          x: x, y: y,
          vx: Math.cos(a) * sp + vx * 0.15,
          vy: Math.sin(a) * sp + vy * 0.15,
          life: 1, decay: 0.02 + Math.random() * 0.035,
          size: 10 + Math.random() * (burst ? 34 : 22),
          spr: Math.random() < 0.35 ? SPR_CORE : SPR_RED,
          alpha: 0.75
        });
      }
    }

    function track(x, y) {
      if (typeof x !== 'number' || typeof y !== 'number') return;
      // cursor velocity for directional scatter
      var vx = x - cur.px, vy = y - cur.py;
      // clamp huge jumps (tab switch / teleport)
      if (vx > 40) vx = 40; if (vx < -40) vx = -40;
      if (vy > 40) vy = 40; if (vy < -40) vy = -40;
      cur.px = x; cur.py = y;
      cur.tx = x; cur.ty = y;
      return { vx: vx, vy: vy };
    }

    var _last = 0;
    function onMove(x, y) {
      var v = track(x, y) || { vx: 0, vy: 0 };
      var now = performance.now();
      if (now - _last < 28) return;
      _last = now;
      scatter(x, y, v.vx, v.vy, false);
    }

    window.addEventListener('pointermove', function (e) { onMove(e.clientX, e.clientY); }, { passive: true });
    document.addEventListener('pointermove', function (e) { onMove(e.clientX, e.clientY); }, { passive: true });
    window.addEventListener('mousemove', function (e) { onMove(e.clientX, e.clientY); }, { passive: true });
    document.addEventListener('mousemove', function (e) { onMove(e.clientX, e.clientY); }, { passive: true });
    function onDown(x, y) {
      track(x, y);
      scatter(x, y, 0, 0, true);
    }
    window.addEventListener('pointerdown', function (e) { onDown(e.clientX, e.clientY); }, { passive: true });
    document.addEventListener('pointerdown', function (e) { onDown(e.clientX, e.clientY); }, { passive: true });
    window.addEventListener('touchmove', function (e) {
      if (!e.touches || !e.touches.length) return;
      var t = e.touches[0];
      onMove(t.clientX, t.clientY);
    }, { passive: true });

    function drawFollower(t) {
      var breathe = 1 + Math.sin(t * 2.6) * 0.05;
      // Layer 1: huge faint wash (fully blended, no edge)
      var s0 = 440 * breathe;
      ctx.globalAlpha = 0.30;
      ctx.drawImage(SPR_FAINT, cur.x - s0 / 2, cur.y - s0 / 2, s0, s0);
      // Layer 2: mid red glow
      var s1 = 220 * breathe;
      ctx.globalAlpha = 0.55;
      ctx.drawImage(SPR_RED, cur.x - s1 / 2, cur.y - s1 / 2, s1, s1);
      // Layer 3: bright core right at cursor
      var s2 = 84 + Math.sin(t * 3.4) * 6;
      ctx.globalAlpha = 0.95;
      ctx.drawImage(SPR_CORE, cur.x - s2 / 2, cur.y - s2 / 2, s2, s2);
      ctx.globalAlpha = 1;
    }

    function loop(now) {
      requestAnimationFrame(loop);
      if (document.hidden) return;

      // smooth glide — light trails behind, never a rigid disc stuck to mouse
      cur.x += (cur.tx - cur.x) * 0.16;
      cur.y += (cur.ty - cur.y) * 0.16;
      if (Math.abs(cur.tx - cur.x) < 0.1) cur.x = cur.tx;
      if (Math.abs(cur.ty - cur.y) < 0.1) cur.y = cur.ty;

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      var t = now / 1000;

      drawFollower(t);

      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.life -= p.decay;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.965; p.vy *= 0.965;
        // ease-out shrink + fade: scatters and dissolves, no popping
        var s = p.size * (0.6 + 0.4 * p.life);
        ctx.globalAlpha = Math.max(0, p.life) * p.alpha;
        ctx.drawImage(p.spr, p.x - s / 2, p.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // seed a little light so it's visible on load
    scatter(cur.x, cur.y, 0, 0, true);

    requestAnimationFrame(loop);
    console.log('[tsukuyomi] live — soft scattered light');
    window.__tsukuyomi = { scatter: scatter, parts: parts, cur: cur };
  } catch (err) {
    console.log('[tsukuyomi] failed:', err && err.message);
  }
})();
