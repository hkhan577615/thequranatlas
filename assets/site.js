/* Quran Atlas: shared behaviour for every page.
   1. Day and night: a toggle in the nav, remembered on this device, following the
      device setting until the reader chooses.
   2. The site nav in Arabic when the page is in Arabic.
   3. A slow ring of particles behind the page, drawn on one canvas. It thins out on
      small screens, pauses when the tab is hidden and stays still for readers who
      prefer reduced motion.
   4. Visitor counts through GoatCounter: no cookies, no personal data, nothing kept
      on the reader's device. Each view of the Atlas (#barcode, #roots...) counts as its
      own page, and a few actions count as events: verse taps, root searches, PDF
      saves, form sends, links out and reading in Arabic. Pages call qaTrack.event(). */
(function () {
  if (window.__qaSite) return; window.__qaSite = true;
  const root = document.documentElement, KEY = 'qa:theme';
  const dark = matchMedia('(prefers-color-scheme: dark)');
  const isNight = () => (root.dataset.theme || (dark.matches ? 'dark' : 'light')) === 'dark';
  const ar = () => root.lang === 'ar';

  /* ---------- theme ---------- */
  function label() {
    const b = document.querySelector('.qa-theme'); if (!b) return;
    const t = isNight() ? (ar() ? 'الوضع النهاري' : 'Switch to day mode') : (ar() ? 'الوضع الليلي' : 'Switch to night mode');
    b.setAttribute('aria-label', t); b.title = t; b.setAttribute('aria-pressed', isNight() ? 'true' : 'false');
  }
  function setTheme(t) {
    root.dataset.theme = t;
    try { localStorage.setItem(KEY, t); } catch (e) {}
    label(); colours(); window.dispatchEvent(new CustomEvent('qa:theme', { detail: t }));
  }
  dark.addEventListener('change', () => { if (!root.dataset.theme) { label(); colours(); window.dispatchEvent(new CustomEvent('qa:theme', { detail: isNight() ? 'dark' : 'light' })); } });

  /* ---------- nav ---------- */
  function navLang() {
    const A = ar();
    document.querySelectorAll('.qa-links a[data-ar]').forEach(a => {
      if (!a.dataset.en) a.dataset.en = a.textContent;
      a.textContent = A ? a.dataset.ar : a.dataset.en;
    });
    label();
  }
  function nav() {
    const b = document.querySelector('.qa-theme');
    if (b) b.addEventListener('click', () => setTheme(isNight() ? 'light' : 'dark'));
    navLang();
    new MutationObserver(navLang).observe(root, { attributes: true, attributeFilter: ['lang'] });
  }

  /* ---------- particle ring ---------- */
  const cv = document.createElement('canvas'); cv.id = 'qa-field'; cv.setAttribute('aria-hidden', 'true');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ctx, W, H, dpr, P = [], t0 = performance.now(), raf = 0, last = 0, C = { p: '236,231,220', a: 1, g: '233,196,127' };
  const rnd = (a, b) => a + Math.random() * (b - a);
  function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function colours() {
    const cs = getComputedStyle(root), g = n => cs.getPropertyValue(n).trim();
    C = { p: g('--qa-particle') || C.p, a: parseFloat(g('--qa-particle-alpha')) || 1, g: g('--qa-particle-accent') || C.g };
    if (ctx && still) draw(performance.now());
  }
  function seed() {
    const n = Math.round(Math.min(4200, Math.max(1400, W * H / 360)));
    P = [];
    for (let i = 0; i < n; i++) {
      const band = Math.random() < .9;
      P.push({ a: rnd(0, Math.PI * 2), r: band ? 1 + gauss() * (Math.random() < .5 ? .045 : .11) : rnd(.2, 1.7), z: rnd(.3, 1), s: rnd(.6, 1.9), tw: rnd(0, Math.PI * 2), sp: rnd(.4, 1.2), gold: Math.random() < .05 });
    }
  }
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); seed();
  }
  function draw(now) {
    const t = (now - t0) / 1000, sy = scrollY || 0;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * (W < 600 ? .62 : .44), rot = t * .02 + sy * .0004;
    const squash = .78 + .12 * Math.sin(sy * .0012);
    for (const p of P) {
      const a = p.a + rot * p.sp, wob = 1 + .03 * Math.sin(a * 3 + t * .3);
      const x = cx + Math.cos(a) * R * p.r * wob, y = cy + Math.sin(a) * R * p.r * wob * (1 / squash) * .92;
      if (x < -4 || y < -4 || x > W + 4 || y > H + 4) continue;
      const al = (.28 + .62 * p.z) * (.65 + .35 * Math.sin(t * 1.3 * p.sp + p.tw)) * C.a;
      ctx.fillStyle = p.gold ? `rgba(${C.g},${Math.min(1, al + .25)})` : `rgba(${C.p},${al})`;
      ctx.fillRect(x, y, p.s, p.s);
    }
  }
  function loop(now) { raf = requestAnimationFrame(loop); if (now - last < 33) return; last = now; draw(now); }
  function field() {
    document.body.prepend(cv); ctx = cv.getContext('2d'); size(); colours();
    addEventListener('resize', () => { size(); if (still) draw(performance.now()); });
    if (still) { draw(performance.now()); return; }
    raf = requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(loop); });
  }

  /* ---------- visitor counts (GoatCounter) ---------- */
  const GC = 'https://thequranatlas.goatcounter.com/count';
  const queue = []; let lastPath = null;
  function send(o) { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count(o); else queue.push(o); }
  const track = window.qaTrack = {
    page() {
      const h = location.hash.replace(/~(ar|en)$/, ''), path = location.pathname + (/^#[\w-]+$/.test(h) ? h : '');
      if (path === lastPath) return; lastPath = path;
      send({ path, title: document.title });
    },
    event(name) { send({ path: String(name).slice(0, 200), title: document.title, event: true }); },
  };
  function counts() {
    window.goatcounter = Object.assign(window.goatcounter || {}, { no_onload: true });
    const s = document.createElement('script'); s.async = true; s.src = 'https://gc.zgo.at/count.js'; s.dataset.goatcounter = GC;
    s.onload = () => { while (queue.length) window.goatcounter.count(queue.shift()); };
    document.head.append(s);
    track.page();
    addEventListener('hashchange', () => track.page());
    const arabic = () => { try { if (ar() && !sessionStorage.getItem('qa:ar-counted')) { sessionStorage.setItem('qa:ar-counted', '1'); track.event('reading-in-arabic'); } } catch (e) {} };
    if (document.readyState === 'complete') arabic(); else addEventListener('load', arabic);
    document.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
      let u; try { u = new URL(a.href, location.href); } catch (err) { return; }
      if (u.origin !== location.origin && /^https?:$/.test(u.protocol)) track.event('outbound/' + u.hostname.replace(/^www\./, ''));
      else if (/\.pdf$/i.test(u.pathname)) track.event('pdf/' + u.pathname.split('/').pop());
    });
    document.addEventListener('submit', e => { if (!e.defaultPrevented) track.event('form-sent/' + (e.target.id || 'form')); });
  }

  function start() { nav(); field(); counts(); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
