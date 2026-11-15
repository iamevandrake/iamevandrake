/* iamevandrake.com — scrolling walks you forward through the page. No dependencies. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

  const html = document.documentElement, body = document.body;
  const scene = $('#scene'), track = $('#track'), sun = $('#sun'), moon = $('#moon'), land = $('#land');
  const sections = $$('#scene > section');
  const ids = sections.map(s => s.id);
  const links = $$('.top nav a');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const roomy = matchMedia('(min-width: 760px) and (min-height: 600px)');

  const GAP = 1500;          // distance between sections, in px of depth
  let depth = false, stop = innerHeight;
  let p = 0, target = 0;     // position along the walk, in sections (0 = home)
  let mx = 0, my = 0, here = -1, io = null;

  /* ------------------------------------------------------------ landscape
     Five ridgelines, far to near, drawn once as ink washes. */
  const layers = [];
  (() => {
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const spec = [ // base height, relief, roughness, ink strength
      { base: .30, amp: .30, rough: 1, ink: .07 },
      { base: .44, amp: .24, rough: .8, ink: .10 },
      { base: .58, amp: .17, rough: .5, ink: .14 },
      { base: .72, amp: .11, rough: .2, ink: .19 },
      { base: .85, amp: .07, rough: 0, ink: .26 },
    ];
    spec.forEach((s, k) => {
      const waves = [1, 2, 3, 4, 5].map(o => ({ f: (0.9 + rnd() * 1.3) * o * 2.2, ph: rnd() * 6.28, a: 1 / Math.pow(o, 1.25) }));
      let d = 'M0,400';
      for (let i = 0; i <= 160; i++) {
        const x = i / 160;
        let n = 0; waves.forEach(w => { n += Math.sin(x * w.f + w.ph) * w.a; });
        n /= 1.9;
        const ridge = 1 - Math.abs(n) * 1.5, soft = n * .5 + .5;
        const hgt = s.rough * ridge + (1 - s.rough) * soft;
        d += ` L${(x * 1000).toFixed(1)},${((s.base - s.amp * hgt) * 400).toFixed(1)}`;
      }
      d += ' L1000,400 Z';
      const el = document.createElement('div');
      el.innerHTML = `<svg viewBox="0 0 1000 400" preserveAspectRatio="none"><defs><linearGradient id="wash${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="${(s.base - s.amp).toFixed(2)}" stop-color="#1d1b18" stop-opacity="${s.ink}"/><stop offset="1" stop-color="#1d1b18" stop-opacity="${(s.ink * .25).toFixed(3)}"/></linearGradient></defs><path d="${d}" fill="url(#wash${k})"/></svg>`;
      const svg = el.firstChild;
      land.append(svg); layers.push(svg);
    });
  })();

  /* ---------------------------------------------------------------- motes
     A little dust in the air, so moving forward feels like moving. */
  const motes = (() => {
    const cv = $('#motes'), ctx = cv.getContext('2d'), pts = [];
    let w = 0, h = 0, dpr = 1;
    for (let i = 0; i < 46; i++) pts.push({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random(), s: Math.random() * 6.28 });
    const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); w = cv.width = innerWidth * dpr; h = cv.height = innerHeight * dpr; };
    addEventListener('resize', size); size();
    return (t, travel) => {
      ctx.clearRect(0, 0, w, h);
      if (reduced.matches) return;
      const cx = w / 2 + mx * 30 * dpr, cy = h * .44 + my * 20 * dpr;
      for (const m of pts) {
        const z = ((m.z + travel * .22) % 1 + 1) % 1;           // 0 far, 1 at your face
        const k = 1 / (1.08 - z);
        const x = cx + (m.x + Math.sin(t * .00023 + m.s) * .05) * w * .5 * k * .55;
        const y = cy + (m.y + Math.cos(t * .00019 + m.s) * .05) * h * .5 * k * .55;
        const a = Math.sin(z * Math.PI) * .2;
        ctx.fillStyle = `rgba(29,27,24,${a.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(x, y, (0.5 + k * .42) * dpr, 0, 6.283); ctx.fill();
      }
    };
  })();

  /* ---------------------------------------------------------------- frame */
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  function setHere(i) {
    if (i === here) return;
    here = i;
    links.forEach(a => {
      const on = a.getAttribute('href') === '#' + ids[i];
      a.classList.toggle('here', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    try { history.replaceState(null, '', i ? '#' + ids[i] : location.pathname + location.search); } catch (e) {}
  }

  function frame(t) {
    const still = reduced.matches;
    let P; // 0 at the top of the page, 1 at the end
    if (depth) {
      target = scrollY / stop;
      p += (target - p) * (still ? 1 : 0.11);
      if (Math.abs(target - p) < 0.0004) p = target;
      P = clamp(p / (sections.length - 1));
      sections.forEach((s, i) => {
        const rel = i - p;                     // >0 still ahead, <0 already passed
        let z, op, blur, lift = 0;
        if (rel >= 0) { z = -rel * GAP; op = Math.pow(clamp(1 - rel * 1.05), 1.7); blur = Math.min(rel * 13, 11); lift = -rel * 5; }
        else { z = -rel * 760; op = clamp(1 + rel * 2.7); blur = Math.min(-rel * 9, 7); }
        if (op < 0.012) { s.style.visibility = 'hidden'; }
        else {
          s.style.visibility = 'visible';
          s.style.opacity = op.toFixed(3);
          s.style.transform = `translate3d(0,${lift.toFixed(2)}vh,${z.toFixed(1)}px)`;
          s.style.filter = blur > 0.25 ? `blur(${blur.toFixed(1)}px)` : 'none';
        }
        s.inert = Math.abs(rel) > 0.35;
      });
      setHere(clamp(Math.round(p), 0, sections.length - 1));
    } else {
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      P = clamp(scrollY / max);
    }

    // The day: sun crosses the sky and the paper warms toward evening.
    const day = still ? 0.8 : P;
    const arc = Math.sin(Math.PI * (0.12 + day * 0.88));
    sun.style.transform = `translate(${(20 + day * 60 + mx * .6).toFixed(2)}vw,${(66 - arc * 53 + my * .5).toFixed(2)}vh)`;
    // The moon keeps the opposite place in the sky: high when the sun is low, low when it is high,
    // and always turned so its lit edge faces the sun.
    const sx = 20 + day * 60, sy = 66 - arc * 53;
    const lx = 100 - sx, ly = 19 + Math.sin(Math.PI * day) * 41;
    const turn = Math.atan2((sy - ly) * innerHeight, (sx - lx) * innerWidth) * 180 / Math.PI;
    moon.style.transform = `translate(${(lx + mx * .4).toFixed(2)}vw,${(ly + my * .4).toFixed(2)}vh) rotate(${turn.toFixed(1)}deg)`;
    moon.style.opacity = (1 - Math.sin(Math.PI * day) * 0.45).toFixed(3);   // fainter while it is low in the daytime sky
    html.style.setProperty('--bg', `rgb(${mix([244, 239, 230], [237, 222, 203], day)})`);
    html.style.setProperty('--sun', `rgb(${mix([228, 178, 128], [203, 104, 62], day)})`);
    layers.forEach((svg, k) => {
      const walk = still ? 0 : P;
      svg.style.transform = `translate3d(${(-mx * (k + 1) * 7).toFixed(1)}px,${(walk * k * 5.5).toFixed(2)}vh,0) scale(${(1 + walk * k * 0.07).toFixed(4)})`;
    });
    motes(t, depth ? p : P * 6);
    requestAnimationFrame(frame);
  }

  /* ----------------------------------------------------------------- mode */
  function measure() {
    stop = track.firstChild ? track.firstChild.offsetHeight || innerHeight : innerHeight;
    scene.style.setProperty('--fit', clamp(innerHeight / 940, 0.58, 1.1).toFixed(3));
  }
  function setMode() {
    const want = roomy.matches && !reduced.matches;
    if (want === depth && (depth || io)) return;
    const keep = Math.max(0, here);
    depth = want;
    body.classList.toggle('depth', depth);
    html.classList.toggle('depth-on', depth);
    if (io) { io.disconnect(); io = null; }
    if (depth) {
      if (!track.firstChild) sections.forEach(() => track.append(document.createElement('i')));
      measure();
      scrollTo(0, keep * stop); p = target = keep;
    } else {
      sections.forEach(s => { s.style.cssText = ''; s.inert = false; });
      io = new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('seen');
        if (e.intersectionRatio >= 0.5) setHere(ids.indexOf(e.target.id));
      }), { threshold: [0.15, 0.5] });
      sections.forEach(s => io.observe(s));
      if (keep) sections[keep].scrollIntoView();
    }
  }

  function goTo(i, viaKeyboard) {
    const smooth = reduced.matches ? 'auto' : 'smooth';
    if (depth) scrollTo({ top: i * stop, behavior: smooth });
    else sections[i].scrollIntoView({ behavior: smooth });
    if (viaKeyboard) setTimeout(() => sections[i].focus({ preventScroll: true }), 1100);
  }

  /* --------------------------------------------------------------- inputs */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const i = ids.indexOf(a.getAttribute('href').slice(1));
    if (i < 0) return;
    e.preventDefault();
    goTo(i, e.detail === 0);
  });
  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' || reduced.matches) return;
    mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5;
    scene.style.setProperty('--rx', (-my * 2.4).toFixed(2) + 'deg');
    scene.style.setProperty('--ry', (mx * 3.2).toFixed(2) + 'deg');
  });
  addEventListener('resize', () => { if (depth) measure(); });
  roomy.addEventListener('change', setMode);
  reduced.addEventListener('change', setMode);

  /* ---------------------------------------------------------------- start */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  here = Math.max(0, ids.indexOf(location.hash.slice(1)));
  const first = here; here = -1;
  setMode();
  if (first > 0) { if (depth) { scrollTo(0, first * stop); p = target = first; } else sections[first].scrollIntoView(); }
  setHere(first);
  requestAnimationFrame(frame);
  requestAnimationFrame(() => body.classList.add('ready'));
})();
