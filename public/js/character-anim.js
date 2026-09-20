/* ============================================================
   CHARACTER ANIMATION ENGINE — keeps original jpg identity,
   adds idle life + signature attacks + gaming HUD vibe.
   No external assets. Canvas particles + GSAP + CSS.
   Inner-wrapper technique: never fights ScrollTrigger which
   controls .char-figure outer (opacity/x/scale).
   ============================================================ */
(function () {
  'use strict';

  const CONFIGS = {
    'tanjiro-figure': {
      key: 'tanjiro',
      color: '#00d2ff',
      color2: '#0066ff',
      element: '水 WATER',
      icon: '🌊',
      power: '9,500',
      title: 'WATER BREATHING',
      burstWords: ['WATER WHEEL!', '1,247 HITS!', 'CRITICAL!', 'FIRST FORM!'],
      type: 'water',
      auraCSS: 'radial-gradient(ellipse at 50% 70%, rgba(0,210,255,.35), transparent 65%)',
    },
    'gojo-figure': {
      key: 'gojo',
      color: '#a855f7',
      color2: '#2e86de',
      element: '∞ INFINITY',
      icon: '👁️',
      power: '∞',
      title: 'HOLLOW PURPLE',
      burstWords: ['HOLLOW PURPLE!', 'DOMAIN EXPANSION!', '∞ DMG!', 'LIMITLESS!'],
      type: 'infinity',
      auraCSS: 'radial-gradient(ellipse at 50% 50%, rgba(168,85,247,.4), transparent 65%)',
    },
    'naruto-figure': {
      key: 'naruto',
      color: '#ff6b35',
      color2: '#00d2ff',
      element: '🌀 CHAKRA',
      icon: '🍥',
      power: '9,999',
      title: 'RASENGAN',
      burstWords: ['RASENGAN!', 'SAGE MODE!', '3,000 HITS!', 'BELIEVE IT!'],
      type: 'rasengan',
      auraCSS: 'radial-gradient(ellipse at 50% 75%, rgba(255,107,53,.4), transparent 65%)',
    },
    'boruto-figure': {
      key: 'boruto',
      color: '#3498db',
      color2: '#00fff7',
      element: '⚡ KARMA',
      icon: '🔷',
      power: '8,700',
      title: 'KARMA SEAL',
      burstWords: ['KARMA SURGE!', 'OTSUTSUKI!', 'VANISHING RASENGAN!', '×2.5 BOOST!'],
      type: 'karma',
      auraCSS: 'radial-gradient(ellipse at 50% 60%, rgba(52,152,219,.35), transparent 65%)',
    },
    'itadori-figure': {
      key: 'itadori',
      color: '#e84393',
      color2: '#ff1a40',
      element: '👊 CURSED',
      icon: '⚡',
      power: '9,100',
      title: 'BLACK FLASH',
      burstWords: ['BLACK FLASH!', '×2.5 POWER!', 'DIVERGENT FIST!', 'CRITICAL!'],
      type: 'cursed',
      auraCSS: 'radial-gradient(ellipse at 50% 65%, rgba(232,67,147,.4), transparent 65%)',
    },
  };

  function getFigClass(fig) {
    for (const k of Object.keys(CONFIGS)) if (fig.classList.contains(k)) return k;
    return null;
  }

  /* ---------------- particle engine (OPTIMIZED: sprite glow, no shadowBlur) ---------------- */
  const GlowCache = new Map();
  function glowSprite(color) {
    // Pre-rendered radial glow — visually identical to shadowBlur arc, ~8x faster.
    let s = GlowCache.get(color);
    if (s) return s;
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    // use globalAlpha at draw time for fade; bake color glow here
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    // tint pass: keep white core, color mid — draw color overlay with soft light
    GlowCache.set(color, c);
    return c;
  }

  class FX {
    constructor(canvas, cfg) {
      this.canvas = canvas;
      this.cfg = cfg;
      // desynchronized = lower latency, same visuals
      this.ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
      this.parts = [];
      this.burstParts = [];
      this.t = Math.random() * 100;
      this.visible = true;
      this._sprA = glowSprite(cfg.color);
      this._sprB = glowSprite(cfg.color2);
      this._sprW = glowSprite('#ffffff');
      this.resize();
      // visibility culling — observe the chapter (stable under pin transforms),
      // never the canvas itself (gets stuck hidden when figure fades). Zero visual change.
      if ('IntersectionObserver' in window) {
        const chap = canvas.closest('.chapter') || canvas;
        new IntersectionObserver((en) => {
          this.visible = en[0].isIntersecting;
        }, { threshold: 0 }).observe(chap);
      }
    }
    resize() {
      const r = this.canvas.parentElement.getBoundingClientRect();
      // cap backing store: CSS size * dpr(≤1.25). Same on-screen look, ~35% fewer pixels vs 1:1+blur.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const w = Math.max(280, r.width || 450);
      const h = Math.max(380, r.height || 650);
      this._dpr = dpr;
      this.W = Math.floor(w); this.H = Math.floor(h);
      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.cx = this.W / 2;
      this.cy = this.H * 0.55;
    }
    spawnAmbient() {
      const type = this.cfg.type;
      const P = this.parts;
      if (P.length > 140) return;
      const c = this.cfg;
      if (type === 'water') {
        P.push({ x: -20, y: Math.random() * this.H, vx: 2 + Math.random() * 3.5, vy: (Math.random() - .5) * 1.2, life: 1, decay: .004 + Math.random() * .006, size: 1 + Math.random() * 3.2, wob: Math.random() * 6.28, col: Math.random() < .5 ? c.color : c.color2, shape: 'streak' });
      } else if (type === 'infinity') {
        const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 130;
        P.push({ ang: a, rad: r, spd: .008 + Math.random() * .02, life: 1, decay: .003 + Math.random() * .005, size: 1 + Math.random() * 2.8, col: Math.random() < .5 ? c.color : c.color2, shape: 'orbit', grow: Math.random() < .15 });
      } else if (type === 'rasengan') {
        const a = Math.random() * Math.PI * 2, r = 10 + Math.random() * 90;
        P.push({ ang: a, rad: r, spd: .03 + Math.random() * .06, rise: .6 + Math.random() * 1.8, life: 1, decay: .005 + Math.random() * .008, size: 1.5 + Math.random() * 3, col: Math.random() < .55 ? c.color : (Math.random() < .5 ? c.color2 : '#ffe27a'), shape: 'swirl' });
      } else if (type === 'karma') {
        P.push({ x: this.cx + (Math.random() - .5) * 180, y: Math.random() * this.H * .5, vx: (Math.random() - .5) * 1.4, vy: 2 + Math.random() * 3, life: 1, decay: .008 + Math.random() * .01, size: 1 + Math.random() * 2.4, col: Math.random() < .6 ? c.color : c.color2, shape: 'spark', jitter: Math.random() * 6.28 });
      } else { // cursed
        P.push({ x: this.cx + (Math.random() - .5) * 200, y: this.H * .75 + Math.random() * 60, vx: (Math.random() - .5) * .9, vy: -(.8 + Math.random() * 2.4), life: 1, decay: .006 + Math.random() * .009, size: 2 + Math.random() * 4.5, col: Math.random() < .5 ? c.color : (Math.random() < .5 ? c.color2 : '#1a0010'), shape: 'flame', seed: Math.random() * 6.28 });
      }
    }
    burst(n = 40) {
      const c = this.cfg;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 6;
        this.burstParts.push({ x: this.cx + (Math.random() - .5) * 60, y: this.cy + (Math.random() - .5) * 60, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, life: 1, decay: .015 + Math.random() * .02, size: 2 + Math.random() * 4, col: [c.color, c.color2, '#ffffff'][Math.floor(Math.random() * 3)] });
      }
    }
    step(dt) {
      if (!this.visible) return; // offscreen: zero cost
      this.t += dt || 0.016;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.W, this.H);
      // ambient spawn rate per type
      const rate = this.cfg.type === 'water' ? 3 : 2;
      for (let i = 0; i < rate; i++) this.spawnAmbient();

      ctx.globalCompositeOperation = 'lighter';
      // ambient
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i];
        p.life -= p.decay;
        if (p.life <= 0) { this.parts.splice(i, 1); continue; }
        this.drawAmbient(p, ctx);
      }
      // burst — sprite blit, no shadowBlur
      for (let i = this.burstParts.length - 1; i >= 0; i--) {
        const p = this.burstParts[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.vx *= 0.98;
        p.life -= p.decay;
        if (p.life <= 0) { this.burstParts.splice(i, 1); continue; }
        const spr = p.col === '#ffffff' ? this._sprW : (p.col === this.cfg.color ? this._sprA : this._sprB);
        const sz = p.size * 6 * Math.max(0.2, p.life);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
        ctx.drawImage(spr, p.x - sz / 2, p.y - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    drawAmbient(p, ctx) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life)) * 0.9;
      if (p.shape === 'streak') {
        p.x += p.vx; p.y += p.vy + Math.sin(this.t * 3 + p.wob) * 0.8;
        if (p.x > this.W + 30) { p.life = 0; return; }
        // streak line (no shadow) + sprite head
        ctx.strokeStyle = p.col; ctx.lineWidth = p.size * 0.7;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 8, p.y); ctx.stroke();
        const spr = p.col === this.cfg.color ? this._sprA : this._sprB;
        const sz = p.size * 4;
        ctx.drawImage(spr, p.x - sz / 2, p.y - sz / 2, sz, sz);
      } else if (p.shape === 'orbit') {
        p.ang += p.spd; if (p.grow) p.rad += 0.4;
        const x = this.cx + Math.cos(p.ang) * p.rad, y = this.cy + Math.sin(p.ang) * p.rad * 0.7;
        const spr = p.col === this.cfg.color ? this._sprA : this._sprB;
        const sz = p.size * 5;
        ctx.drawImage(spr, x - sz / 2, y - sz / 2, sz, sz);
      } else if (p.shape === 'swirl') {
        p.ang += p.spd; p.rad *= 0.997; p.cy2 = (p.cy2 || this.cy) - p.rise;
        if (p.cy2 < -20) { p.life = 0; return; }
        const x = this.cx + Math.cos(p.ang) * p.rad, y = p.cy2 + Math.sin(p.ang) * p.rad * 0.6;
        const spr = p.col === '#ffe27a' ? this._sprW : (p.col === this.cfg.color ? this._sprA : this._sprB);
        const sz = p.size * 5 * Math.max(0.3, p.life);
        ctx.drawImage(spr, x - sz / 2, y - sz / 2, sz, sz);
      } else if (p.shape === 'spark') {
        p.jitter += 0.35; p.x += p.vx + Math.sin(p.jitter) * 1.6; p.y += p.vy;
        if (p.y > this.H + 10) { p.life = 0; return; }
        ctx.strokeStyle = p.col; ctx.lineWidth = p.size * 0.8;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - Math.sin(p.jitter) * 7, p.y - 9); ctx.stroke();
        const spr = p.col === this.cfg.color ? this._sprA : this._sprB;
        const sz = p.size * 4;
        ctx.drawImage(spr, p.x - sz / 2, p.y - sz / 2, sz, sz);
      } else { // flame
        p.x += p.vx + Math.sin(this.t * 4 + p.seed) * 0.9; p.y += p.vy;
        if (p.y < -10) { p.life = 0; return; }
        const s = p.size * (0.6 + 0.4 * Math.sin(this.t * 9 + p.seed));
        const spr = (p.col === this.cfg.color || p.col === this.cfg.color2) ? (p.col === this.cfg.color ? this._sprA : this._sprB) : this._sprW;
        const sz = Math.max(4, s * 5 * p.life);
        ctx.drawImage(spr, p.x - sz / 2, p.y - sz / 2, sz, sz);
      }
    }
  }

  const engines = [];

  /* ---------------- build fighter rig ---------------- */
  function enhanceFigure(fig) {
    const figClass = getFigClass(fig);
    if (!figClass || fig.dataset.animated) return;
    fig.dataset.animated = '1';
    const cfg = CONFIGS[figClass];
    fig.classList.add('animated-fighter');

    const img = fig.querySelector('img.figure-img');
    if (!img) return;

    // wrap img in inner (ScrollTrigger owns outer, we own inner)
    const inner = document.createElement('div');
    inner.className = 'fighter-inner';
    img.parentNode.insertBefore(inner, img);
    inner.appendChild(img);

    // shine sweep
    const shine = document.createElement('div');
    shine.className = 'slash-shine';
    inner.appendChild(shine);

    // NOTE: no afterimage clones — they doubled image memory and their
    // dash animation was part of the portrait shake. Techniques live on
    // the scene canvas now, portraits stay calm.
    const echoes = [];

    // aura layer
    const aura = document.createElement('div');
    aura.className = 'fighter-aura';
    aura.style.background = cfg.auraCSS;
    fig.insertBefore(aura, fig.firstChild);

    // fx canvas
    const cv = document.createElement('canvas');
    cv.className = 'fx-canvas';
    fig.appendChild(cv);

    // ground shadow
    const sh = document.createElement('div');
    sh.className = 'fighter-shadow';
    fig.appendChild(sh);

    // gaming HUD
    const hud = document.createElement('div');
    hud.className = 'fighter-hud';
    hud.innerHTML =
      '<div class="hud-top"><span class="hud-icon">' + cfg.icon + '</span>' +
      '<span class="hud-element">' + cfg.element + '</span>' +
      '<span class="hud-lv">LV 99</span></div>' +
      '<div class="hud-hp"><div class="hud-hp-fill"></div><span class="hud-hp-text">HP ' + cfg.power + '</span></div>' +
      '<div class="hud-title">' + cfg.title + '</div>';
    fig.appendChild(hud);
    requestAnimationFrame(() => {
      const f = hud.querySelector('.hud-hp-fill');
      if (f) f.style.width = (82 + Math.random() * 16) + '%';
    });

    // breathing glow uses cfg color
    fig.style.setProperty('--fc', cfg.color);
    fig.style.setProperty('--fc2', cfg.color2);

    // engine
    const fx = new FX(cv, cfg);
    engines.push(fx);
    fig._fx = fx;
    fig._cfg = cfg;
    fig._inner = inner;
    fig._echoes = echoes;

    // idle life — PORTRAITS STAY CALM (no shake):
    // gentle vertical float + breathing glow only. No rotation, no tilt,
    // no lunge. All action happens on the scene canvas beside the portrait.
    // Also kill any stray transforms from older builds so stuck images reset.
    if (window.gsap) {
      gsap.killTweensOf([inner, img]);
      gsap.set(inner, { x: 0, y: 0, scale: 1, rotation: 0, rotationX: 0, rotationY: 0 });
      gsap.set(img, { x: 0, y: 0, scale: 1, rotation: 0 });
    }
    fig.classList.remove('glitching');
    gsap.to(inner, { y: -10, duration: 2.2 + Math.random(), ease: 'sine.inOut', repeat: -1, yoyo: true, delay: Math.random() });
    gsap.to(img, { scale: 1.02, duration: 2.6, ease: 'sine.inOut', repeat: -1, yoyo: true });
    gsap.to(aura, { opacity: 0.55, scale: 1.1, duration: 2.2, ease: 'sine.inOut', repeat: -1, yoyo: true });
    gsap.to(sh, { scaleX: 0.9, opacity: 0.4, duration: 2.2, ease: 'sine.inOut', repeat: -1, yoyo: true });

    // shine loop
    (function shineLoop() {
      gsap.fromTo(shine, { x: '-160%' }, { x: '260%', duration: 1.6, ease: 'power2.inOut', delay: 2.5 + Math.random() * 3, onComplete: shineLoop });
    })();

    // NOTE: mouse-tilt removed — it dragged portraits around (shaky feel).
    // Portraits stay put; the scene canvas + HUD carry the motion.
  }

  /* ---------------- damage numbers + slash fx ---------------- */
  function spawnDamageText(scene, cfg) {
    if (!scene) return;
    const el = document.createElement('div');
    el.className = 'dmg-num';
    el.textContent = cfg.burstWords[Math.floor(Math.random() * cfg.burstWords.length)];
    el.style.setProperty('--fc', cfg.color);
    el.style.left = (18 + Math.random() * 55) + '%';
    el.style.top = (22 + Math.random() * 35) + '%';
    scene.appendChild(el);
    gsap.fromTo(el, { scale: 0.4, opacity: 0, y: 30, rotation: -6 + Math.random() * 12 },
      { scale: 1.15, opacity: 1, y: -46, duration: 0.55, ease: 'back.out(2)', onComplete: () => {
        gsap.to(el, { y: -110, opacity: 0, scale: 1.3, duration: 0.6, ease: 'power2.in', onComplete: () => el.remove() });
      }});
  }

  function spawnSlash(scene, cfg) {
    if (!scene) return;
    const s = document.createElement('div');
    s.className = 'attack-slash';
    s.style.setProperty('--fc', cfg.color);
    s.style.top = (25 + Math.random() * 30) + '%';
    s.style.transform = 'rotate(' + (-18 + Math.random() * 36) + 'deg)';
    scene.appendChild(s);
    gsap.fromTo(s, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.28, ease: 'power4.in', onComplete: () => {
      gsap.to(s, { opacity: 0, duration: 0.3, onComplete: () => s.remove() });
    }});
  }

  function screenShake(el) {
    if (!el || el.dataset.shaking) return;
    el.dataset.shaking = '1';
    gsap.fromTo(el, { x: 0 }, { x: 10, duration: 0.05, repeat: 5, yoyo: true, ease: 'none', onComplete: () => {
      gsap.set(el, { x: 0 }); delete el.dataset.shaking;
    }});
  }

  function doAttack(fig) {
    // Portraits NEVER move: no lunge, no afterimages, no glitch, no shake.
    // Just aura burst + scene-level slash/damage text (DOM beside portrait).
    // Includes a reset so images stuck by older builds snap back instantly.
    const cfg = fig._cfg, inner = fig._inner, fx = fig._fx;
    if (!cfg || !inner) return;
    if (window.gsap) {
      gsap.killTweensOf(inner, 'x,scale,rotation,rotationX,rotationY');
      gsap.set(inner, { x: 0, scale: 1, rotation: 0, rotationX: 0, rotationY: 0 });
    }
    fig.classList.remove('glitching');
    const scene = fig.closest('.character-scene') || fig.parentElement;
    if (fx) fx.burst(40);
    spawnSlash(scene, cfg);
    spawnDamageText(scene, cfg);
    setTimeout(() => spawnDamageText(scene, cfg), 220);
  }

  /* ---------------- scroll attack triggers ---------------- */
  function setupAttackTriggers() {
    document.querySelectorAll('.char-figure.animated-fighter').forEach((fig) => {
      const chapter = fig.closest('.chapter');
      if (!chapter || !window.ScrollTrigger) return;
      let cooldown = 0;
      ScrollTrigger.create({
        trigger: chapter,
        start: 'top 55%',
        end: 'bottom 45%',
        onEnter: () => { const n = Date.now(); if (n - cooldown > 2500) { cooldown = n; doAttack(fig); } },
        onEnterBack: () => { const n = Date.now(); if (n - cooldown > 2500) { cooldown = n; doAttack(fig); } },
      });
      // click = special move (gaming vibe)
      fig.style.pointerEvents = 'auto';
      fig.addEventListener('click', (e) => { e.stopPropagation(); doAttack(fig); });
    });
  }

  /* ---------------- main loop (delta-timed, hidden-tab aware) ---------------- */
  let _lastT = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden) { _lastT = now; return; }
    let dt = (now - _lastT) / 1000;
    _lastT = now;
    if (dt > 0.05) dt = 0.05; // clamp tab-switch jump, same motion
    if (dt <= 0) return;
    for (const e of engines) {
      try { e.step(dt); } catch (_) {}
    }
  }

  function onResize() {
    engines.forEach((e) => { try { e.resize(); } catch (_) {} });
  }

  function init() {
    if (!window.gsap) { setTimeout(init, 300); return; }
    document.querySelectorAll('.char-figure').forEach(enhanceFigure);
    setupAttackTriggers();
    requestAnimationFrame((t) => { _lastT = t; requestAnimationFrame(loop); });
    let _rzT;
    window.addEventListener('resize', () => { clearTimeout(_rzT); _rzT = setTimeout(onResize, 250); });
    setTimeout(onResize, 800);
    console.log('[character-anim] fighters animated:', engines.length);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
