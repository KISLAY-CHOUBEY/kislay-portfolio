import * as THREE from 'three';

gsap.registerPlugin(ScrollTrigger, TextPlugin);

// --- 1. THREE.JS SCENE ---
let scene, camera, renderer, clock, katanaGroup, particles;

function setupThreeJS() {
  const container = document.getElementById('three-container');
  if (!container) return;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a0a, 0.02);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  // cap 1.5: same look on most screens, far less fill-rate than 2x. Adaptive drop below if laggy.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(5, 5, 5);
  scene.add(dirLight);

  const pointLight = new THREE.PointLight(0xff1a40, 2, 10);
  pointLight.position.set(0, 0, 2);
  scene.add(pointLight);

  clock = new THREE.Clock();
}

function createKatana() {
  const group = new THREE.Group();

  // Simple procedural katana
  const bladeGeometry = new THREE.BoxGeometry(0.1, 3, 0.02);
  const bladeMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xcccccc, 
    metalness: 0.9, 
    roughness: 0.1 
  });
  const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
  blade.position.y = 1.5;
  group.add(blade);

  const handleGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 16);
  const handleMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x111111,
    metalness: 0.2,
    roughness: 0.8
  });
  const handle = new THREE.Mesh(handleGeometry, handleMaterial);
  handle.position.y = -0.4;
  group.add(handle);

  const guardGeometry = new THREE.BoxGeometry(0.4, 0.05, 0.3);
  const guardMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xcca53f,
    metalness: 0.8,
    roughness: 0.3
  });
  const guard = new THREE.Mesh(guardGeometry, guardMaterial);
  guard.position.y = 0;
  group.add(guard);

  return group;
}

function createParticles() {
  const particleCount = 2000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const colorPrimary = new THREE.Color(0xff1a40); // Red
  const colorSecondary = new THREE.Color(0x0a0a0a); // Dark

  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 20;
    positions[i + 1] = (Math.random() - 0.5) * 20;
    positions[i + 2] = (Math.random() - 0.5) * 20;

    const mixedColor = colorPrimary.clone().lerp(colorSecondary, Math.random());
    colors[i] = mixedColor.r;
    colors[i + 1] = mixedColor.g;
    colors[i + 2] = mixedColor.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geometry, material);

  return {
    points,
    update: (time) => {
      points.position.y = Math.sin(time * 0.2) * 0.5;
    }
  };
}

function onResize() {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// --- 2. TEXT SPLITTING ---
function splitText() {
  const el = document.getElementById('name-main');
  if (!el) return;
  const text = el.textContent;
  el.innerHTML = '';
  text.split('').forEach(ch => {
    const span = document.createElement('span');
    span.className = 'char';
    span.textContent = ch === ' ' ? '\u00A0' : ch;
    el.appendChild(span);
  });
}

// --- 3. VIDEO PROGRESS BAR ---
function setupVideoBar() {
  gsap.to('#video-fill', {
    width: '100%',
    ease: 'none',
    scrollTrigger: {
      trigger: '#scroll-video',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.3
    }
  });
}

// --- 4. CHAPTER INDICATOR ---
function setupChapterIndicator() {
  document.querySelectorAll('[id^="ch-"]').forEach((ch, index) => {
    const num = index + 1;
    let title = ch.id.replace('ch-', '').toUpperCase();
    if(title === 'OPENING') title = 'PROLOGUE';
    if(title === 'PORTFOLIO') title = 'ACHIEVEMENTS';
    if(title === 'FINALE') title = 'EPILOGUE';

    const chapterNum = ch.getAttribute('data-chapter') || num.toString();
    const chapterTitle = ch.getAttribute('data-title') || title;

    ScrollTrigger.create({
      trigger: ch,
      start: 'top center',
      end: 'bottom center',
      onEnter: () => updateChapter(chapterNum, chapterTitle),
      onEnterBack: () => updateChapter(chapterNum, chapterTitle)
    });
  });
}

function updateChapter(num, title) {
  const numEl = document.querySelector('.ch-number');
  const nameEl = document.querySelector('.ch-name');
  if (numEl) numEl.textContent = String(num).padStart(2, '0');
  if (nameEl) nameEl.textContent = title;
  
  // Update dots
  document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));
  const activeDot = document.querySelector(`.dot[data-ch="${num}"]`);
  if (activeDot) activeDot.classList.add('active');
}

// --- 5. CHAPTER 1: OPENING ANIMATIONS (NO PIN — free scroll, skippable intro) ---
function setupOpening() {
  // Time-based autoplay after the loader fades: plays like an intro cutscene,
  // never traps scroll. Fast scrollers simply pass it by.
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
  
  tl
    // Kanji fades in and scales
    .fromTo('.opening-kanji', 
      { opacity: 0, scale: 0.5, filter: 'blur(30px)' },
      { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 2 }
    )
    .to('.opening-kanji', { 
      textShadow: '0 0 80px #ff1a40, 0 0 150px #ff1a40',
      duration: 1 
    })
    .fromTo('.opening-kanji-sub', { opacity: 0, y: 20 }, { opacity: 0.5, y: 0, duration: 1 }, '<')
    
    // Kanji fades out
    .to('.opening-kanji', { opacity: 0, scale: 1.2, duration: 1 })
    .to('.opening-kanji-sub', { opacity: 0, duration: 0.5 }, '<')
    
    // Slash lines sweep across
    .to('.sl-1', { scaleX: 1, duration: 0.5, ease: 'power4.in' })
    .to('.sl-2', { scaleX: 1, duration: 0.5, ease: 'power4.in' }, '-=0.2')
    .to('.sl-3', { scaleX: 1, duration: 0.5, ease: 'power4.in' }, '-=0.2')
    
    // White flash
    .to('.flash-layer', { opacity: 1, duration: 0.2 })
    .to('.flash-layer', { opacity: 0, duration: 0.5 })
    
    // Slash lines fade
    .to('.slash-line', { opacity: 0, duration: 0.3 }, '<')
    
    // Katana 3D appears
    .call(() => {
      if (katanaGroup) {
        gsap.to(katanaGroup.scale, { x: 1, y: 1, z: 1, duration: 1, ease: 'back.out(2)' });
        gsap.to(katanaGroup.rotation, { z: Math.PI * 2, duration: 1.5, ease: 'power3.out' });
      }
    })
    
    // Name reveals
    .fromTo('.name-pre', { opacity: 0, y: -30 }, { opacity: 0.5, y: 0, duration: 1 })
    .fromTo('#name-main .char', 
      { opacity: 0, y: 100, scale: 1.5, filter: 'blur(20px)' },
      { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', stagger: 0.08, duration: 1 }
    )
    .fromTo('.name-post', { opacity: 0, y: 30 }, { opacity: 0.6, y: 0, duration: 1 }, '-=0.3')
    
    // Scroll prompt appears
    .fromTo('.scroll-prompt', { opacity: 0 }, { opacity: 0.6, duration: 1 })
    
    // Hold for a moment
    .to({}, { duration: 1 });
}

// --- 6. CHARACTER CHAPTER ANIMATIONS ---
function setupCharacterChapter(chapterId, moveAnimations) {
  const triggerElement = document.querySelector(chapterId);
  if (!triggerElement) return;

  // Part 1: Character enters
  const enterTl = gsap.timeline({
    scrollTrigger: {
      trigger: chapterId,
      start: 'top 80%',
      end: 'top 20%',
      scrub: true
    }
  });
  
  const figureSelector = `${chapterId} [class*="-figure"]`;
  
  enterTl
    .fromTo(figureSelector, 
      { opacity: 0, x: 200, scale: 0.8 },
      { opacity: 1, x: 0, scale: 1, duration: 1, ease: 'power3.out' }
    )
    .fromTo(`${chapterId} .char-identity .char-anime`,
      { opacity: 0, x: -50 },
      { opacity: 0.6, x: 0, duration: 0.5 }, '-=0.5'
    )
    .fromTo(`${chapterId} .char-identity .char-name`,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.5 }
    )
    .fromTo(`${chapterId} .char-identity .char-technique`,
      { opacity: 0, x: -30 },
      { opacity: 1, x: 0, duration: 0.5 }
    )
    .fromTo(`${chapterId} .char-identity .char-quote`,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5 }
    );
  
  // Part 2: Character PERFORMS MOVE (NO PIN — scrubbed to free scroll, fast scroll skips it)
  const moveTl = gsap.timeline({
    scrollTrigger: {
      trigger: chapterId,
      start: 'top 70%',
      end: 'bottom 30%',
      scrub: true
    }
  });
  
  // Execute the move-specific animations
  moveAnimations(moveTl);
  
  // Part 3: Personal connection fades in
  const connectionTl = gsap.timeline({
    scrollTrigger: {
      trigger: `${chapterId} .personal-connection`,
      start: 'top 80%',
      end: 'top 30%',
      scrub: true
    }
  });
  
  connectionTl
    .fromTo(`${chapterId} .connection-line`, { height: 0 }, { height: 80, duration: 0.5 })
    .fromTo(`${chapterId} .connection-trait`, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 })
    .fromTo(`${chapterId} .connection-title`, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5 })
    .fromTo(`${chapterId} .connection-text`, { opacity: 0, y: 20 }, { opacity: 0.8, y: 0, duration: 0.5 })
    .fromTo(`${chapterId} .skill-fill`, 
      { width: '0%' }, 
      { width: () => `${document.querySelector(`${chapterId} .skill-fill`)?.getAttribute('data-value') || 0}%`, duration: 1 }
    );
}

function setupAllCharacters() {
  // TANJIRO — Water Breathing
  setupCharacterChapter('#ch-tanjiro', (tl) => {
    tl
      // Water waves sweep across screen
      .fromTo('.water-wave.w1', { opacity: 0, x: '-100%' }, { opacity: 0.6, x: '50%', duration: 2 })
      .fromTo('.water-wave.w2', { opacity: 0, x: '-100%' }, { opacity: 0.5, x: '60%', duration: 2 }, '-=1.5')
      .fromTo('.water-wave.w3', { opacity: 0, x: '-100%' }, { opacity: 0.4, x: '40%', duration: 2 }, '-=1.5')
      // Water splash at center
      .fromTo('.water-splash', { opacity: 0, scale: 0.3 }, { opacity: 0.8, scale: 1.5, duration: 1 }, '-=1')
      // Character performs the slash move (scale + lean into it)
      .to('.tanjiro-figure', { scale: 1.1, x: -30, duration: 1, ease: 'power4.out' }, '-=2')
      // Everything fades out
      .to('.water-effect > *', { opacity: 0, duration: 1 })
      .to('.tanjiro-figure', { opacity: 0.3, scale: 1, x: 0, duration: 1 }, '<');
  });
  
  // GOJO — Infinity / Hollow Purple
  setupCharacterChapter('#ch-gojo', (tl) => {
    tl
      // Infinity sphere grows
      .fromTo('.infinity-sphere', { opacity: 0, scale: 0.1 }, { opacity: 1, scale: 1, duration: 2 })
      // Rings expand outward
      .fromTo('.infinity-ring.r1', { opacity: 0, scale: 0.3 }, { opacity: 0.6, scale: 1, duration: 1.5 }, '-=1.5')
      .fromTo('.infinity-ring.r2', { opacity: 0, scale: 0.3 }, { opacity: 0.4, scale: 1, duration: 2 }, '-=1.5')
      .fromTo('.infinity-ring.r3', { opacity: 0, scale: 0.3 }, { opacity: 0.3, scale: 1, duration: 2.5 }, '-=2')
      // Hollow purple fires
      .fromTo('.hollow-purple', { opacity: 0, scale: 0.1 }, { opacity: 1, scale: 3, duration: 1.5, ease: 'power4.in' })
      .to('.infinity-sphere', { opacity: 0, scale: 2, duration: 1 }, '-=0.5')
      .to('.infinity-ring', { opacity: 0, duration: 0.5 }, '<')
      .to('.hollow-purple', { opacity: 0, scale: 5, duration: 1 })
      .to('.gojo-figure', { opacity: 0.3, duration: 1 }, '<');
  });
  
  // NARUTO — Rasengan
  setupCharacterChapter('#ch-naruto', (tl) => {
    tl
      // Chakra flames ignite
      .fromTo('.chakra-flame', { opacity: 0, y: 50 }, { opacity: 0.6, y: -30, stagger: 0.3, duration: 1 })
      // Rasengan orb appears and grows
      .fromTo('.rasengan-orb', { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 1.5, ease: 'elastic.out(1, 0.5)' })
      // Hold the rasengan spinning moment
      .to({}, { duration: 1 })
      // Rasengan SMASHES forward (scales up huge)
      .to('.rasengan-orb', { scale: 4, opacity: 0, x: '-200%', duration: 1, ease: 'power4.in' })
      .to('.chakra-flame', { opacity: 0, y: -100, duration: 0.5 }, '<')
      .to('.naruto-figure', { opacity: 0.3, duration: 1 }, '<');
  });
  
  // BORUTO — Karma Seal
  setupCharacterChapter('#ch-boruto', (tl) => {
    tl
      // Karma lines grow downward from face
      .fromTo('.karma-line.kl1', { opacity: 0, height: '0%' }, { opacity: 0.8, height: '30%', duration: 1.5 })
      .fromTo('.karma-line.kl2', { opacity: 0, height: '0%' }, { opacity: 0.7, height: '35%', duration: 1.5 }, '-=1.2')
      .fromTo('.karma-line.kl3', { opacity: 0, height: '0%' }, { opacity: 0.6, height: '25%', duration: 1.5 }, '-=1.2')
      .fromTo('.karma-line.kl4', { opacity: 0, height: '0%' }, { opacity: 0.5, height: '40%', duration: 1.5 }, '-=1.2')
      // Diamond appears
      .fromTo('.karma-diamond', { opacity: 0, scale: 0, rotation: 0 }, { opacity: 1, scale: 1, rotation: 180, duration: 1 })
      // Full body glow
      .fromTo('.karma-glow', { opacity: 0 }, { opacity: 0.5, duration: 1 })
      // Fade out
      .to('.karma-effect > *', { opacity: 0, duration: 1, delay: 0.5 })
      .to('.boruto-figure', { opacity: 0.3, duration: 1 }, '<');
  });
  
  // ITADORI — Cursed Energy / Black Flash
  setupCharacterChapter('#ch-itadori', (tl) => {
    tl
      // Cursed aura builds
      .fromTo('.cursed-aura', { opacity: 0, scale: 0.5 }, { opacity: 0.8, scale: 1.2, duration: 2 })
      // Character pulses with cursed energy
      .to('.itadori-figure', { filter: 'drop-shadow(0 0 60px rgba(232,67,147,1))', duration: 0.5 })
      .to('.itadori-figure', { filter: 'drop-shadow(0 0 20px rgba(232,67,147,0.3))', duration: 0.3, repeat: 3, yoyo: true })
      // Cursed bursts shoot out
      .fromTo('.cursed-burst.cb1', { opacity: 0, height: 0 }, { opacity: 0.8, height: '200px', duration: 0.5 })
      .fromTo('.cursed-burst.cb2', { opacity: 0, height: 0 }, { opacity: 0.7, height: '180px', duration: 0.5 }, '-=0.3')
      .fromTo('.cursed-burst.cb3', { opacity: 0, height: 0 }, { opacity: 0.6, height: '220px', duration: 0.5 }, '-=0.3')
      // BLACK FLASH (screen goes dark then bright)
      .to('.black-flash', { opacity: 1, duration: 0.1 })
      .to('.black-flash', { opacity: 0, duration: 0.3 })
      .to('.cursed-aura', { scale: 2, opacity: 0, duration: 0.5 }, '<')
      .to('.cursed-burst', { opacity: 0, duration: 0.3 }, '<')
      .to('.itadori-figure', { opacity: 0.3, duration: 1 });
  });
}

// --- 7. PORTFOLIO SECTION ANIMATIONS ---
function setupPortfolio() {
  // Achievement cards stagger in
  gsap.from('.ach-card', {
    opacity: 0, y: 60, scale: 0.9, stagger: 0.1, duration: 0.8,
    scrollTrigger: { trigger: '.achievements-grid', start: 'top 75%' }
  });
  
  // Stat bars fill
  document.querySelectorAll('#ch-portfolio .stat-fill').forEach(bar => {
    gsap.fromTo(bar, { width: '0%' }, {
      width: (bar.getAttribute('data-value') || 0) + '%',
      duration: 1.5,
      scrollTrigger: { trigger: bar, start: 'top 85%' }
    });
  });
  
  // About section
  gsap.from('.about-title', {
    opacity: 0, y: 40, duration: 1,
    scrollTrigger: { trigger: '.about-block', start: 'top 75%' }
  });
  gsap.from('.about-text p', {
    opacity: 0, y: 30, stagger: 0.2, duration: 0.8,
    scrollTrigger: { trigger: '.about-text', start: 'top 80%' }
  });
  
  // Finale
  gsap.from('.finale-title', {
    opacity: 0, y: 50, duration: 1,
    scrollTrigger: { trigger: '#ch-finale', start: 'top 70%' }
  });
  gsap.from('.social-link', {
    opacity: 0, y: 30, stagger: 0.15, duration: 0.8,
    scrollTrigger: { trigger: '.social-links', start: 'top 80%' }
  });
}

// --- 8. ACHIEVEMENT CARD HOVER ---
function setupCardInteractions() {
  document.querySelectorAll('.ach-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(600px) rotateY(${x * 15}deg) rotateX(${-y * 15}deg) translateY(-8px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(600px) rotateY(0) rotateX(0) translateY(0)';
    });
  });
}

// --- 9. CLICK PARTICLE EFFECTS ---
const particlePool = [];
function spawnClickParticles(x, y) {
  const colors = ['#ff1a40', '#00d2ff', '#a855f7', '#ff6b35', '#e84393', '#ffd700'];
  const container = document.getElementById('click-fx');
  if (!container) return;
  
  for (let i = 0; i < 6; i++) {
    let p = particlePool.pop();
    if (!p) {
      p = document.createElement('div');
      p.style.cssText = 'position:fixed;width:6px;height:6px;border-radius:50%;pointer-events:none;z-index:9999;';
      container.appendChild(p);
    }
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    p.style.display = 'block';
    
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 60;
    gsap.fromTo(p,
      { x: 0, y: 0, scale: 1, opacity: 1 },
      { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, scale: 0, opacity: 0, duration: 0.6, ease: 'power2.out',
        onComplete: () => { p.style.display = 'none'; particlePool.push(p); }
      }
    );
  }
}

document.addEventListener('click', (e) => spawnClickParticles(e.clientX, e.clientY));

// --- 10. REPLAY ---
function setupReplay() {
  const btn = document.getElementById('replay-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      // Kill all scroll triggers
      ScrollTrigger.getAll().forEach(t => t.kill());
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Re-initialize after scroll completes
      setTimeout(() => {
        setupAllAnimations();
      }, 1000);
    });
  }
}

// --- 11. THREE.JS ANIMATION LOOP (adaptive: halves bg rate only under sustained lag) ---
let _bgFrames = 0, _bgLast = performance.now(), _bgSkip = false, _bgTick = 0;
function animate() {
  requestAnimationFrame(animate);
  if (!clock || document.hidden) return;
  // fps guard: if page-wide lag, render bg every 2nd frame (still 30fps ambient, foreground stays 60)
  _bgTick++;
  const now = performance.now();
  _bgFrames++;
  if (now - _bgLast >= 1500) {
    const fps = (_bgFrames * 1000) / (now - _bgLast);
    _bgFrames = 0; _bgLast = now;
    _bgSkip = fps < 42; // foreground canvases already adapted; bg yields first
  }
  if (_bgSkip && (_bgTick % 2 === 0)) return;
  const t = clock.getElapsedTime();
  
  if (particles) {
    particles.points.rotation.y = t * 0.02;
    particles.update(t);
  }
  
  if (katanaGroup) {
    katanaGroup.position.y = Math.sin(t * 0.5) * 0.3;
    katanaGroup.rotation.y += 0.003;
  }
  
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// --- 12. INITIALIZATION ---
function setupAllAnimations() {
  setupVideoBar();
  setupChapterIndicator();
  setupOpening();
  setupAllCharacters();
  setupPortfolio();
  setupCardInteractions();
  setupReplay();
}

function init() {
  setupThreeJS();
  katanaGroup = createKatana();
  katanaGroup.scale.set(0, 0, 0); // Hidden initially
  scene.add(katanaGroup);
  particles = createParticles();
  scene.add(particles.points);
  
  splitText();
  
  // Hide loading screen
  const loading = document.getElementById('loading-screen');
  if (loading) {
    gsap.to(loading, { opacity: 0, duration: 0.5, delay: 0.5, onComplete: () => {
      loading.style.display = 'none';
      setupAllAnimations();
    }});
  } else {
    setupAllAnimations();
  }
  
  animate();
}

window.addEventListener('DOMContentLoaded', init);
window.addEventListener('resize', onResize);
