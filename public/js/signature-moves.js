/* ============================================================
   SIGNATURE MOVES — real techniques, not just floating images.
   Full-scene canvas per character chapter:
     Tanjiro → Water Breathing slash + waves
     Gojo    → Hollow Purple charge + projectile
     Naruto  → Rasengan orb + dash
     Boruto  → Karma lightning + Vanishing Rasengan
     Itadori → Black Flash impact
   Auto-loops while in view. Click fighter = instant ultimate.
   No assets, pure Canvas2D + GSAP assist.
   ============================================================ */
(function () {
  'use strict';

  const CHAPTERS = [
    { chapter: '#ch-tanjiro', key: 'water' },
    { chapter: '#ch-gojo', key: 'purple' },
    { chapter: '#ch-naruto', key: 'rasengan' },
    { chapter: '#ch-boruto', key: 'karma' },
    { chapter: '#ch-itadori', key: 'blackflash' },
  ];

  const scenes = [];

  /* ---- adaptive quality: same graphics on fast machines, protects fps on weak ones.
     Only shrinks internal canvas resolution if sustained <45fps; restores at >57fps.
     Visual design / counts / animation identical. ---- */
  const Q = { dpr: Math.min(window.devicePixelRatio || 1, 1.5), level: 0, frames: 0, acc: 0, lastQ: performance.now(), coolUntil: 0 };
  function fpsTick(now) {
    Q.frames++;
    const dt = now - Q.lastQ;
    if (dt >= 1500) {
      const fps = (Q.frames * 1000) / dt;
      Q.frames = 0; Q.lastQ = now;
      if (fps < 45 && Q.level < 2 && now > Q.coolUntil) {
        Q.level++;
        Q.dpr = Q.level === 1 ? 1.2 : 1.0;
        Q.coolUntil = now + 4000;
        scenes.forEach((x) => { try { x.refit(); } catch (e) {} });
      } else if (fps > 57 && Q.level > 0 && now > Q.coolUntil) {
        Q.level--;
        Q.dpr = Q.level === 0 ? Math.min(window.devicePixelRatio || 1, 1.5) : 1.2;
        Q.coolUntil = now + 6000;
        scenes.forEach((x) => { try { x.refit(); } catch (e) {} });
      }
    }
  }

  function makeCanvasHost(sceneEl) {
    const cv = document.createElement('canvas');
    cv.className = 'signature-canvas';
    sceneEl.appendChild(cv);
    const flash = document.createElement('div');
    flash.className = 'move-flash';
    sceneEl.appendChild(flash);
    const label = document.createElement('div');
    label.className = 'move-chant';
    sceneEl.appendChild(label);
    return { cv, flash, label };
  }

  function fitCanvas(cv, sceneEl) {
    const r = sceneEl.getBoundingClientRect();
    const dpr = Q.dpr;
    const w = Math.max(300, Math.floor(r.width));
    const h = Math.max(300, Math.floor(r.height));
    cv.width = Math.floor(w * dpr);
    cv.height = Math.floor(h * dpr);
    const ctx = cv.getContext('2d', { alpha: true, desynchronized: true }) || cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  // deterministic pseudo random for stable shapes
  function rand(seedObj, min, max) {
    seedObj.s = (seedObj.s * 16807) % 2147483647;
    return min + (seedObj.s / 2147483647) * (max - min);
  }

  /* ---------------- shared helpers (FAST: layered strokes, zero shadowBlur) ---------------- */
  // Technique origins as fractions INSIDE the portrait box (right-side figure).
  // fx: 0 = left edge … 1 = right edge · fy: 0 = top … 1 = bottom.
  // Matched to the actual artwork (verified against each jpg):
  const ANCHORS = {
    water: { fx: 0.50, fy: 0.62 },      // Tanjiro — lower glowing blade (baked water arc curls left off it)
    purple: { fx: 0.50, fy: 0.33 },     // Gojo — Hollow Purple orb cupped at chest (baked in image)
    rasengan: { fx: 0.20, fy: 0.50 },   // Naruto — Rasengan in extended right hand (image-left)
    karma: { fx: 0.38, fy: 0.60 },      // Boruto — glowing Karma fist, lowered (image-left-center)
    blackflash: { fx: 0.72, fy: 0.58 }, // Itadori — lead cursed fist (image-right)
  };
  const _anchorCache = new WeakMap();
  function fighterAnchor(sceneEl, w, h, key) {
    // getBoundingClientRect forces reflow — cache 600ms. Same positions, ~10 fewer reflows/frame.
    const now = performance.now();
    const hit = _anchorCache.get(sceneEl);
    if (hit && now - hit.t < 600 && hit.key === key) return hit.a;
    let a;
    const fig = sceneEl.querySelector('.char-figure');
    const off = ANCHORS[key] || { fx: 0.35, fy: 0.45 };
    if (fig) {
      const sr = sceneEl.getBoundingClientRect();
      const fr = fig.getBoundingClientRect();
      // relative coords inside scene, offset into the portrait (hand / sword / overhead)
      const x = fr.left - sr.left + fr.width * off.fx;
      const y = fr.top - sr.top + fr.height * off.fy;
      a = { x: Math.max(30, Math.min(w - 30, x)), y: Math.max(20, Math.min(h - 20, y)) };
    } else a = { x: w * 0.68, y: h * 0.45 };
    _anchorCache.set(sceneEl, { t: now, a, key });
    return a;
  }

  function drawGlowCircle(ctx, x, y, r, stops) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    for (const [o, c] of stops) g.addColorStop(o, c);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  }

  function shockRings(ctx, x, y, rings) {
    // two-pass glow (wide faint + thin bright) — same look as shadowBlur, far cheaper
    for (const rg of rings) {
      const alpha = Math.max(0, rg.alpha);
      if (alpha <= 0.01) continue;
      ctx.globalAlpha = alpha * 0.35;
      ctx.strokeStyle = rg.color;
      ctx.lineWidth = rg.width + 7;
      ctx.beginPath(); ctx.arc(x, y, rg.r, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.lineWidth = rg.width;
      ctx.beginPath(); ctx.arc(x, y, rg.r, 0, 6.283); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function lightning(ctx, x1, y1, x2, y2, color, width, jitter, seed) {
    const segs = 9;
    // build path once, stroke twice for glow
    const s = { s: seed || 12345 };
    const pts = [[x1, y1]];
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      pts.push([x1 + (x2 - x1) * t + (rand(s, -1, 1)) * jitter, y1 + (y2 - y1) * t + (rand(s, -1, 1)) * jitter]);
    }
    pts.push([x2, y2]);
    const trace = () => {
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    };
    const baseA = ctx.globalAlpha == null ? 1 : ctx.globalAlpha;
    ctx.strokeStyle = color; ctx.lineCap = 'round';
    ctx.globalAlpha = baseA * 0.32; ctx.lineWidth = width + 6; trace();
    ctx.globalAlpha = baseA; ctx.lineWidth = width; trace();
  }

  /* ================= WATER BREATHING ================= */
  function createWaterFX() {
    const drops = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() * 2.2, v: 0.001 + Math.random() * 0.004 }));
    let slash = null; // {t0}
    return {
      key: 'water',
      chant: '水の呼吸 ・ 壱ノ型 — WATER SURFACE SLASH!',
      perform(s) { slash = { t0: performance.now() }; s.flashBird('#00d2ff'); s.chantShow(this.chant, '#00d2ff'); },
      autoEvery: 5200,
      draw(ctx, w, h, t, s, anchor) {
        ctx.globalCompositeOperation = 'lighter';
        const now = performance.now();
        // --- ambient flowing waves (always) ---
        for (let L = 0; L < 3; L++) {
          ctx.beginPath();
          const baseY = h * (0.32 + L * 0.14);
          const amp = 18 + L * 14;
          for (let x = -20; x <= w + 20; x += 14) {
            const y = baseY + Math.sin(x * 0.012 + t * (1.4 + L * 0.5) + L * 2) * amp
              + Math.sin(x * 0.03 - t * 2.2) * 6;
            if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          const alpha = 0.10 + L * 0.05 + (slash ? 0.12 : 0);
          const col = L === 1 ? `rgba(0,210,255,${alpha + 0.12})` : `rgba(0,102,255,${alpha})`;
          ctx.strokeStyle = col;
          // wide soft pass + crisp pass = glow without shadowBlur
          ctx.lineWidth = (10 - L * 2) + 6; ctx.globalAlpha = 0.30; ctx.stroke();
          ctx.globalAlpha = 1; ctx.lineWidth = 10 - L * 2; ctx.stroke();
        }
        // droplets
        ctx.fillStyle = '#7ce7ff';
        for (const d of drops) {
          d.y -= d.v; d.x += Math.sin(t * 2 + d.y * 20) * 0.0006;
          if (d.y < -0.05) { d.y = 1.05; d.x = Math.random(); }
          ctx.globalAlpha = 0.5;
          ctx.beginPath(); ctx.arc(d.x * w, d.y * h, d.s, 0, 6.283); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // water wheel ring around anchor (breathing stance)
        const ringR = 90 + Math.sin(t * 2.4) * 8;
        ctx.strokeStyle = '#00d2ff';
        ctx.setLineDash([26, 18]); ctx.lineDashOffset = -t * 90;
        ctx.globalAlpha = 0.18; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(anchor.x, anchor.y, ringR, 0, 6.283); ctx.stroke();
        ctx.globalAlpha = 0.5; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(anchor.x, anchor.y, ringR, 0, 6.283); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        // --- slash fire ---
        if (slash) {
          const e = (now - slash.t0) / 1000; // seconds
          if (e > 2.2) { slash = null; }
          else {
            const fp = Math.min(1, e / 0.55);           // sweep 0..1
            const fade = e < 1.4 ? 1 : Math.max(0, 1 - (e - 1.4) / 0.8);
            const sx = -w * 0.15 + (w * 1.3) * (1 - Math.pow(1 - fp, 3));
            // big crescent — swings at blade height (anchor.y), arcing off the baked water trail
            const bladeY = anchor.y;
            ctx.globalAlpha = fade;
            for (let i = 0; i < 4; i++) {
              const off = i * 26;
              const grad = ctx.createLinearGradient(sx - 260, 0, sx + 60, 0);
              grad.addColorStop(0, 'rgba(0,210,255,0)');
              grad.addColorStop(0.6, i === 0 ? 'rgba(255,255,255,.95)' : 'rgba(0,210,255,.55)');
              grad.addColorStop(1, 'rgba(0,102,255,0)');
              ctx.strokeStyle = grad;
              // glow pass + core pass (no shadowBlur)
              ctx.globalAlpha = fade * 0.4; ctx.lineWidth = (i === 0 ? 10 : 22 - i * 3) + 10;
              ctx.beginPath();
              // crescent arc sweeping across
              ctx.ellipse(sx - off, bladeY, 200, 260, -0.35, -1.25, 1.25);
              ctx.stroke();
              ctx.globalAlpha = fade; ctx.lineWidth = (i === 0 ? 10 : 22 - i * 3);
              ctx.beginPath();
              ctx.ellipse(sx - off, bladeY, 200, 260, -0.35, -1.25, 1.25);
              ctx.stroke();
            }
            // dragon curl head
            const hx = sx + 40, hy = bladeY + Math.sin(e * 9) * 22;
            drawGlowCircle(ctx, hx, hy, 70 * fade + 10, [[0, 'rgba(255,255,255,.9)'], [0.35, 'rgba(0,210,255,.55)'], [1, 'rgba(0,102,255,0)']]);
            // splash burst
            const seed = { s: 777 };
            for (let i = 0; i < 26; i++) {
              const a = rand(seed, 0, 6.283), sp = rand(seed, 40, 260) * Math.min(1, e * 3);
              const px = hx + Math.cos(a) * sp * fp, py = hy + Math.sin(a) * sp * 0.7 * fp;
              ctx.globalAlpha = fade * 0.85;
              ctx.fillStyle = i % 3 ? '#00d2ff' : '#ffffff';
              ctx.beginPath(); ctx.arc(px, py, rand(seed, 1.5, 4.5), 0, 6.283); ctx.fill();
            }
            ctx.globalAlpha = 1;
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    };
  }

  /* ================= HOLLOW PURPLE ================= */
  function createPurpleFX() {
    let shot = null;
    return {
      key: 'purple',
      chant: '虚式 ・ 茈 — HOLLOW PURPLE!',
      perform(s) { shot = { t0: performance.now() }; s.flashBird('#a855f7'); s.chantShow(this.chant, '#c084fc'); },
      autoEvery: 6200,
      draw(ctx, w, h, t, s, anchor) {
        ctx.globalCompositeOperation = 'lighter';
        const now = performance.now();
        const cx = anchor.x - 40, cy = anchor.y - 20;
        // idle infinity motes
        for (let i = 0; i < 26; i++) {
          const a = t * 0.7 + (i / 26) * 6.283;
          const r = 60 + (i % 3) * 34 + Math.sin(t * 1.3 + i) * 6;
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.62;
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = i % 2 ? '#a855f7' : '#2e86de';
          ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 6.283); ctx.fill();
        }
        ctx.globalAlpha = 1;

        if (!shot) {
          // idle small purple core breathing
          const r = 26 + Math.sin(t * 2.2) * 5;
          drawGlowCircle(ctx, cx, cy, r * 3.2, [[0, 'rgba(200,140,255,.5)'], [0.4, 'rgba(168,85,247,.28)'], [1, 'rgba(168,85,247,0)']]);
          drawGlowCircle(ctx, cx, cy, r, [[0, '#fff'], [0.35, '#c084fc'], [0.7, '#7c3aed'], [1, 'rgba(124,58,237,0)']]);
          ctx.globalCompositeOperation = 'source-over';
          return;
        }
        const e = (now - shot.t0) / 1000;
        if (e > 2.6) { shot = null; ctx.globalCompositeOperation = 'source-over'; return; }

        if (e < 1.0) {
          // CHARGE: red + blue converge
          const p = e / 1.0, ee = 1 - Math.pow(1 - p, 3);
          const lx = cx - 260 * (1 - ee), rx = cx + 260 * (1 - ee);
          drawGlowCircle(ctx, lx, cy, 46, [[0, '#fff'], [0.4, '#ff2d55'], [1, 'rgba(255,45,85,0)']]);
          drawGlowCircle(ctx, rx, cy, 46, [[0, '#fff'], [0.4, '#2e86de'], [1, 'rgba(46,134,222,0)']]);
          // spiral tether
          ctx.strokeStyle = 'rgba(200,140,255,.6)'; ctx.lineWidth = 2;
          ctx.setLineDash([10, 10]); ctx.lineDashOffset = -t * 120;
          ctx.beginPath(); ctx.moveTo(lx, cy); ctx.lineTo(rx, cy); ctx.stroke();
          ctx.setLineDash([]);
          // merging core
          const cr = 18 + ee * 44;
          drawGlowCircle(ctx, cx, cy, cr * 3, [[0, 'rgba(220,170,255,.55)'], [1, 'rgba(124,58,237,0)']]);
          drawGlowCircle(ctx, cx, cy, cr, [[0, '#fff'], [0.4, '#d8b4fe'], [0.75, '#8b5cf6'], [1, 'rgba(139,92,246,0)']]);
          // contracting rings
          shockRings(ctx, cx, cy, [0, 1, 2].map(i => ({ r: 220 - ee * 140 + i * 34, alpha: 0.5 - i * 0.12, color: '#c084fc', width: 2 })));
        } else if (e < 1.9) {
          // FIRE: projectile travels left, erasing void
          const p = (e - 1.0) / 0.9, pe = p * p;
          const px = cx - pe * (cx + w * 0.25);
          // void trail
          const grad = ctx.createLinearGradient(px, 0, cx + 120, 0);
          grad.addColorStop(0, 'rgba(139,92,246,0)');
          grad.addColorStop(0.7, 'rgba(139,92,246,.35)');
          grad.addColorStop(1, 'rgba(255,255,255,.12)');
          ctx.fillStyle = grad;
          ctx.fillRect(px - 40, cy - 46, (cx + 120) - (px - 40), 92);
          // head: dark void + purple rim + white core
          drawGlowCircle(ctx, px, cy, 88, [[0, 'rgba(10,0,20,.95)'], [0.55, 'rgba(60,10,90,.6)'], [0.78, 'rgba(168,85,247,.5)'], [1, 'rgba(168,85,247,0)']]);
          drawGlowCircle(ctx, px, cy, 30 + Math.sin(e * 30) * 4, [[0, '#fff'], [0.45, '#e9d5ff'], [1, 'rgba(139,92,246,0)']]);
          // spinning debris
          for (let i = 0; i < 20; i++) {
            const a = t * 6 + i * 0.63;
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = i % 2 ? '#e9d5ff' : '#7c3aed';
            ctx.beginPath(); ctx.arc(px + Math.cos(a) * (46 + (i % 5) * 8), cy + Math.sin(a) * 30, 2.4, 0, 6.283); ctx.fill();
          }
          ctx.globalAlpha = 1;
          shockRings(ctx, px, cy, [{ r: 40 + p * 160, alpha: 0.6 * (1 - p * 0.5), color: '#d8b4fe', width: 3 }]);
        } else {
          // dissipate flash rings
          const p = (e - 1.9) / 0.7;
          shockRings(ctx, 60, cy, [
            { r: 60 + p * 320, alpha: 0.55 * (1 - p), color: '#c084fc', width: 4 },
            { r: 30 + p * 220, alpha: 0.4 * (1 - p), color: '#ffffff', width: 2 },
          ]);
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    };
  }

  /* ================= RASENGAN ================= */
  function createRasenganFX() {
    let dash = null;
    const orbiters = Array.from({ length: 46 }, () => ({ a: Math.random() * 6.283, r: 30 + Math.random() * 80, s: 0.5 + Math.random() * 2 }));
    return {
      key: 'rasengan',
      chant: '螺旋丸 — RASENGAN!',
      perform(s) { dash = { t0: performance.now() }; s.flashBird('#ff9a3d'); s.chantShow(this.chant, '#7ce7ff'); },
      autoEvery: 5600,
      draw(ctx, w, h, t, s, anchor) {
        ctx.globalCompositeOperation = 'lighter';
        const now = performance.now();
        const hx = anchor.x - 30, hy = anchor.y + 30;
        const charging = dash ? Math.min(1, (now - dash.t0) / 900) : 0;
        const baseR = 34 + Math.sin(t * 3) * 3 + charging * 26;

        // wind lines radiating (always, stronger in charge)
        ctx.strokeStyle = 'rgba(124,231,255,.35)'; ctx.lineWidth = 2;
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * 6.283 + t * (0.6 + charging * 2.4);
          const r1 = baseR + 14, r2 = r1 + 26 + charging * 46;
          ctx.globalAlpha = 0.25 + charging * 0.5;
          ctx.beginPath();
          ctx.moveTo(hx + Math.cos(a) * r1, hy + Math.sin(a) * r1 * 0.8);
          ctx.lineTo(hx + Math.cos(a) * r2, hy + Math.sin(a) * r2 * 0.8);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // orbiters
        for (const o of orbiters) {
          o.a += 0.03 + charging * 0.08;
          const x = hx + Math.cos(o.a) * (o.r + charging * 30);
          const y = hy + Math.sin(o.a) * (o.r + charging * 30) * 0.7;
          ctx.fillStyle = Math.random() < 0.12 ? '#ff9a3d' : '#7ce7ff';
          ctx.globalAlpha = 0.75;
          ctx.beginPath(); ctx.arc(x, y, o.s + charging, 0, 6.283); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // core
        drawGlowCircle(ctx, hx, hy, baseR * 3.4, [[0, 'rgba(0,210,255,.4)'], [0.5, 'rgba(255,154,61,.18)'], [1, 'rgba(0,102,255,0)']]);
        drawGlowCircle(ctx, hx, hy, baseR, [[0, '#ffffff'], [0.35, '#bff3ff'], [0.65, '#00b8ff'], [0.85, '#ff7a1a'], [1, 'rgba(255,122,26,0)']]);
        // rotating shell arcs (double-stroke glow, no shadowBlur)
        for (let k = 0; k < 3; k++) {
          ctx.strokeStyle = k === 2 ? 'rgba(255,154,61,.85)' : 'rgba(255,255,255,.8)';
          const start = t * (2.5 + k * 1.4) + k * 2.1;
          const rx = baseR + 6 + k * 9, ry = rx * 0.72, rot = 0.4 * k;
          ctx.globalAlpha = 0.35; ctx.lineWidth = (3 - k * 0.6) + 5;
          ctx.beginPath(); ctx.ellipse(hx, hy, rx, ry, rot, start, start + 4.2); ctx.stroke();
          ctx.globalAlpha = 1; ctx.lineWidth = 3 - k * 0.6;
          ctx.beginPath(); ctx.ellipse(hx, hy, rx, ry, rot, start, start + 4.2); ctx.stroke();
        }

        // dash fire
        if (dash) {
          const e = (now - dash.t0) / 1000;
          if (e > 2.0) dash = null;
          else if (e > 0.9) {
            const p = (e - 0.9) / 0.6, pe = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
            const px = hx - pe * (hx + 120);
            // spiral trail
            for (let i = 0; i < 30; i++) {
              const tt = i / 30;
              const tx = hx - (hx - px) * tt + Math.sin(tt * 20 + t * 10) * 14;
              const ty = hy + Math.cos(tt * 16 + t * 8) * 20 * tt;
              ctx.globalAlpha = (1 - tt) * 0.8;
              ctx.fillStyle = i % 4 ? '#00d2ff' : '#ffb066';
              ctx.beginPath(); ctx.arc(tx, ty, 8 * (1 - tt) + 1.5, 0, 6.283); ctx.fill();
            }
            ctx.globalAlpha = 1;
            drawGlowCircle(ctx, px, hy, 70 + p * 40, [[0, '#fff'], [0.4, '#7ce7ff'], [0.75, '#ff8c2e'], [1, 'rgba(255,140,46,0)']]);
            if (p > 0.85) shockRings(ctx, px, hy, [{ r: 30 + (p - 0.85) * 900, alpha: 0.7, color: '#7ce7ff', width: 5 }]);
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    };
  }

  /* ================= KARMA + VANISHING RASENGAN ================= */
  function createKarmaFX() {
    let surge = null;
    return {
      key: 'karma',
      chant: '楔 — KARMA: VANISHING RASENGAN!',
      perform(s) { surge = { t0: performance.now() }; s.flashBird('#00fff7'); s.chantShow(this.chant, '#00fff7'); },
      autoEvery: 6000,
      draw(ctx, w, h, t, s, anchor) {
        ctx.globalCompositeOperation = 'lighter';
        const now = performance.now();
        const cx = anchor.x - 10, cy = anchor.y - 60;
        // idle sparks
        for (let i = 0; i < 22; i++) {
          const y = ((t * 60 + i * 47) % (h * 0.7));
          const x = cx + Math.sin(y * 0.02 + i * 2.4 + t) * 60;
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = i % 2 ? '#00fff7' : '#3498db';
          ctx.beginPath(); ctx.arc(x, h * 0.85 - y, 1.8, 0, 6.283); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // karma diamond pulse (always) — layered fills instead of shadowBlur
        const dp = 0.6 + 0.4 * Math.sin(t * 3.2);
        ctx.save(); ctx.translate(cx, cy - 130); ctx.rotate(Math.PI / 4);
        const ds = 13 + dp * 5;
        ctx.globalAlpha = (0.35 + dp * 0.4) * 0.35;
        ctx.fillStyle = '#00fff7';
        const halo = ds + 16;
        ctx.fillRect(-halo / 2, -halo / 2, halo, halo);
        ctx.globalAlpha = 0.35 + dp * 0.4;
        ctx.fillStyle = '#00d2ff';
        ctx.fillRect(-ds / 2, -ds / 2, ds, ds);
        ctx.restore(); ctx.globalAlpha = 1;

        if (!surge) {
          // idle flicker micro-rasengan (vanishing vibe)
          const vis = (Math.sin(t * 1.7) > 0.2) ? 1 : 0.12;
          ctx.globalAlpha = vis * 0.9;
          drawGlowCircle(ctx, cx - 30, cy + 90, 44, [[0, 'rgba(255,255,255,.9)'], [0.5, 'rgba(0,255,247,.5)'], [1, 'rgba(52,152,219,0)']]);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
          return;
        }
        const e = (now - surge.t0) / 1000;
        if (e > 2.4) { surge = null; ctx.globalCompositeOperation = 'source-over'; return; }

        // branching karma veins from top
        const veinP = Math.min(1, e / 0.8);
        ctx.lineCap = 'round';
        for (let b = 0; b < 5; b++) {
          const x0 = cx + (b - 2) * 44;
          lightning(ctx, x0, 20, cx + (b - 2) * 18, cy - 60 - (1 - veinP) * 160, b % 2 ? '#00fff7' : '#7cc7ff', 3, 14, 900 + b * 333);
        }
        if (e > 0.7) {
          // vanishing rasengan: flickers then fires
          const flick = (Math.sin(e * 28) > -0.2) ? 1 : 0.15;
          const fp = Math.min(1, (e - 0.7) / 0.5);
          const ox = cx - 30, oy = cy + 90;
          ctx.globalAlpha = flick;
          drawGlowCircle(ctx, ox, oy, 40 + fp * 30, [[0, '#fff'], [0.5, '#00fff7'], [1, 'rgba(52,152,219,0)']]);
          ctx.globalAlpha = 1;
          if (e > 1.2) {
            const p = Math.min(1, (e - 1.2) / 0.6);
            const px = ox - p * p * (ox + 140);
            lightning(ctx, ox, oy, px, oy - 20, '#00fff7', 4, 20, 4242);
            drawGlowCircle(ctx, px, oy - 10, 46, [[0, '#fff'], [0.5, 'rgba(0,255,247,.7)'], [1, 'rgba(0,255,247,0)']]);
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    };
  }

  /* ================= BLACK FLASH ================= */
  function createBlackFlashFX() {
    let hit = null;
    return {
      key: 'blackflash',
      chant: '黒閃 — BLACK FLASH!',
      perform(s) { hit = { t0: performance.now() }; s.flashBird('#ff1a40'); s.chantShow(this.chant, '#ff4d6d'); s.shakeHard(); },
      autoEvery: 5800,
      draw(ctx, w, h, t, s, anchor) {
        ctx.globalCompositeOperation = 'lighter';
        const now = performance.now();
        const px = anchor.x - 60, py = anchor.y + 20;
        // idle cursed embers
        for (let i = 0; i < 26; i++) {
          const yy = ((t * 70 + i * 61) % (h * 0.75));
          const xx = px + Math.sin(yy * 0.025 + i * 1.7) * 70;
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = i % 3 ? '#e84393' : '#ff1a40';
          const rr = 1.5 + (i % 4);
          ctx.beginPath(); ctx.arc(xx, h * 0.9 - yy, rr, 0, 6.283); ctx.fill();
        }
        ctx.globalAlpha = 1;

        if (!hit) {
          // idle fist glow
          const g = 20 + Math.sin(t * 4) * 6;
          drawGlowCircle(ctx, px, py, g * 2.6, [[0, 'rgba(255,60,90,.4)'], [1, 'rgba(255,26,64,0)']]);
          ctx.globalCompositeOperation = 'source-over';
          return;
        }
        const e = (now - hit.t0) / 1000;
        if (e > 1.8) { hit = null; ctx.globalCompositeOperation = 'source-over'; return; }

        if (e < 0.45) {
          // charge: black core + red crackle converging
          const p = e / 0.45;
          drawGlowCircle(ctx, px, py, 120 * p + 20, [[0, 'rgba(0,0,0,.9)'], [0.6, 'rgba(120,0,20,.5)'], [1, 'rgba(255,26,64,0)']]);
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * 6.283 + t * 3;
            lightning(ctx, px + Math.cos(a) * 150, py + Math.sin(a) * 110, px, py, i % 2 ? '#ff1a40' : '#e84393', 3, 10, 500 + i * 777);
          }
        } else {
          // IMPACT
          const p = Math.min(1, (e - 0.45) / 0.5);
          const fade = e > 1.0 ? Math.max(0, 1 - (e - 1.0) / 0.8) : 1;
          ctx.globalAlpha = fade;
          // white-hot core + black ring (the black flash look: red core edged black)
          drawGlowCircle(ctx, px, py, 130, [[0, 'rgba(255,255,255,.95)'], [0.3, 'rgba(255,60,80,.8)'], [0.62, 'rgba(20,0,5,.85)'], [1, 'rgba(255,26,64,0)']]);
          // cross lightning
          lightning(ctx, px - 260, py, px + 260, py, '#ff1a40', 5, 26, 111);
          lightning(ctx, px, py - 220, px, py + 220, '#ffffff', 3, 22, 222);
          lightning(ctx, px - 170, py - 150, px + 170, py + 150, '#e84393', 3, 20, 333);
          // shock rings red/black
          shockRings(ctx, px, py, [
            { r: 40 + p * 300, alpha: 0.8 * fade, color: '#ff1a40', width: 6 },
            { r: 20 + p * 200, alpha: 0.7 * fade, color: '#ffffff', width: 3 },
            { r: 60 + p * 380, alpha: 0.4 * fade, color: '#e84393', width: 2 },
          ]);
          // sparks
          const seed = { s: 999 };
          for (let i = 0; i < 34; i++) {
            const a = rand(seed, 0, 6.283), sp = rand(seed, 60, 340) * p;
            ctx.fillStyle = i % 3 ? '#ff1a40' : (i % 3 === 1 ? '#fff' : '#1a0005');
            ctx.beginPath(); ctx.arc(px + Math.cos(a) * sp, py + Math.sin(a) * sp * 0.8, rand(seed, 1.5, 4.5), 0, 6.283); ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    };
  }

  const FACTORY = { water: createWaterFX, purple: createPurpleFX, rasengan: createRasenganFX, karma: createKarmaFX, blackflash: createBlackFlashFX };

  /* ---------------- scene controller ---------------- */
  function initScene(def) {
    const chapterEl = document.querySelector(def.chapter);
    if (!chapterEl) return null;
    const sceneEl = chapterEl.querySelector('.character-scene') || chapterEl;
    const { cv, flash, label } = makeCanvasHost(sceneEl);
    let { w, h } = fitCanvas(cv, sceneEl);
    const ctx = cv.getContext('2d');
    const fx = FACTORY[def.key]();

    const s = {
      def, sceneEl, chapterEl, cv, ctx, fx, flash, label,
      w, h, visible: false, lastAuto: 0, t: Math.random() * 10,
      refit() { const d = fitCanvas(cv, sceneEl); this.w = d.w; this.h = d.h; },
      flashBird(color) {
        flash.style.setProperty('--fc', color);
        flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
      },
      chantShow(text, color) {
        label.textContent = text;
        label.style.setProperty('--fc', color);
        label.classList.remove('show'); void label.offsetWidth; label.classList.add('show');
        clearTimeout(label._t);
        label._t = setTimeout(() => label.classList.remove('show'), 2100);
      },
      shakeHard() {
        // Intentionally empty — shaking the scene shook the portraits.
        // Impact is canvas-only now (flash rings + sparks around the anchor).
      },
      perform() { try { fx.perform(this); } catch (err) {} },
    };

    // visibility
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          s.visible = en.isIntersecting && en.intersectionRatio > 0.12;
          if (s.visible) s.lastAuto = performance.now() - 2000; // perform soon after entering
        });
      }, { threshold: [0, 0.12, 0.4] }).observe(chapterEl);
    } else s.visible = true;

    // click fighter = ultimate
    const fig = sceneEl.querySelector('.char-figure');
    if (fig) fig.addEventListener('click', () => s.perform());

    // scroll hook: fire the ultimate as the chapter passes (free scroll, no pin)
    if (window.ScrollTrigger) {
      let cd = 0;
      try {
        window.ScrollTrigger.create({
          trigger: def.chapter, start: 'top 45%', end: 'bottom 55%',
          onEnter: () => { const n = Date.now(); if (n - cd > 4000) { cd = n; s.perform(); } },
          onEnterBack: () => { const n = Date.now(); if (n - cd > 4000) { cd = n; s.perform(); } },
        });
      } catch (e) {}
    }
    return s;
  }

  function init() {
    if (!window.gsap) { setTimeout(init, 300); return; }
    CHAPTERS.forEach((d) => {
      const s = initScene(d);
      if (s) scenes.push(s);
    });
    // global loop (delta-timed, hidden-tab aware, fps-tracked)
    let _prev = performance.now();
    const loop = (now) => {
      requestAnimationFrame(loop);
      if (document.hidden) { _prev = now; return; }
      fpsTick(now);
      let dt = (now - _prev) / 1000;
      _prev = now;
      if (dt > 0.05) dt = 0.05;
      if (dt <= 0) return;
      for (const s of scenes) {
        if (!s.visible) continue;
        s.t += dt;
        // auto ultimate loop
        if (!s._next || now >= s._next) {
          if (now - s.lastAuto > (s.fx.autoEvery || 5500)) {
            s.perform();
            s.lastAuto = now;
            s._next = now + (s.fx.autoEvery || 5500);
          } else if (!s._next) s._next = now + 1800;
        }
        try {
          // clear in CSS pixels (transform already scales to DPR)
          s.ctx.clearRect(0, 0, s.w, s.h);
          const a = fighterAnchor(s.sceneEl, s.w, s.h, s.fx.key);
          s.fx.draw(s.ctx, s.w, s.h, s.t, s, a);
        } catch (e) {}
      }
    };
    requestAnimationFrame(loop);
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => scenes.forEach((x) => x.refit()), 200); });
    window.__signatureMoves = scenes;
    console.log('[signature-moves] live:', scenes.map((x) => x.def.key).join(', '));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
