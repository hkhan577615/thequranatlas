/* A slow ring of particles behind the page, drawn once per frame on one canvas.
   It thins out on small screens, pauses when the tab is hidden and stays still
   for people who prefer reduced motion. */
(function () {
  if (window.__qaField) return; window.__qaField = true;
  const cv = document.createElement('canvas'); cv.id = 'qa-field'; cv.setAttribute('aria-hidden', 'true');
  const start = () => { document.body.prepend(cv); init(); };
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ctx, W, H, dpr, P = [], t0 = performance.now(), raf = 0, last = 0;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function seed() {
    const n = Math.round(Math.min(4200, Math.max(1400, W * H / 360)));
    P = [];
    for (let i = 0; i < n; i++) {
      const band = Math.random() < .9;
      P.push({ a: rnd(0, Math.PI * 2), r: band ? 1 + gauss() * (Math.random() < .5 ? .045 : .11) : rnd(.2, 1.7), z: rnd(.3, 1), s: rnd(.6, 1.9), tw: rnd(0, Math.PI * 2), sp: rnd(.4, 1.2), mint: Math.random() < .035 });
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
      const a = p.a + rot * p.sp;
      const wob = 1 + .03 * Math.sin(a * 3 + t * .3);
      const x = cx + Math.cos(a) * R * p.r * wob, y = cy + Math.sin(a) * R * p.r * wob * (1 / squash) * .92;
      if (x < -4 || y < -4 || x > W + 4 || y > H + 4) continue;
      const al = (.28 + .62 * p.z) * (.65 + .35 * Math.sin(t * 1.3 * p.sp + p.tw));
      ctx.fillStyle = p.mint ? `rgba(172,255,206,${Math.min(1, al + .25)})` : `rgba(235,235,230,${al})`;
      ctx.fillRect(x, y, p.s, p.s);
    }
  }
  function loop(now) { raf = requestAnimationFrame(loop); if (now - last < 33) return; last = now; draw(now); }
  function init() {
    ctx = cv.getContext('2d'); size();
    addEventListener('resize', () => { size(); if (still) draw(performance.now()); });
    if (still) { draw(performance.now()); return; }
    raf = requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(loop); });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
