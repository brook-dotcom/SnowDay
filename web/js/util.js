// Snow Day — shared helpers (deterministic: never use Math.random in the simulation)
'use strict';
const SD = (window.SD = window.SD || {});

SD.TAU = Math.PI * 2;

SD.mulberry = function (seed) {
  let a = seed >>> 0;
  const f = function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (lo, hi) => lo + (hi - lo) * f();
  f.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * f());
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.chance = (p) => f() < p;
  f.sign = () => (f() < 0.5 ? -1 : 1);
  return f;
};

// stateless hash -> [0,1)
SD.hash = function (n, s = 0) {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(s | 0, 0xc2b2ae35);
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15; x = Math.imul(x, 0x846ca68b); x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
};

// smooth 1D value noise in [-1,1]
SD.noise1 = function (x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const a = SD.hash(i, seed) * 2 - 1, b = SD.hash(i + 1, seed) * 2 - 1;
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
};
SD.fbm1 = function (x, seed = 0, oct = 3) {
  let s = 0, amp = 1, norm = 0;
  for (let o = 0; o < oct; o++) { s += SD.noise1(x, seed + o * 101) * amp; norm += amp; amp *= 0.5; x *= 2.03; }
  return s / norm;
};

SD.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
SD.lerp = (a, b, t) => a + (b - a) * t;
SD.inv = (a, b, v) => SD.clamp((v - a) / (b - a), 0, 1);
SD.smooth = (t) => { t = SD.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
SD.easeInOut = (t) => { t = SD.clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
SD.easeOut = (t) => { t = SD.clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); };
SD.easeIn = (t) => { t = SD.clamp(t, 0, 1); return t * t * t; };
SD.backOut = (t) => { t = SD.clamp(t, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
SD.damp = (cur, target, k, dt) => cur + (target - cur) * (1 - Math.exp(-k * dt));
SD.angDamp = (cur, target, k, dt) => {
  let d = target - cur;
  while (d > Math.PI) d -= SD.TAU;
  while (d < -Math.PI) d += SD.TAU;
  return cur + d * (1 - Math.exp(-k * dt));
};

// critically-ish damped spring
SD.Spring = class {
  constructor(v = 0, k = 60, d = 9) { this.x = v; this.v = 0; this.k = k; this.d = d; }
  step(target, dt) {
    const a = (target - this.x) * this.k - this.v * this.d;
    this.v += a * dt; this.x += this.v * dt; return this.x;
  }
  kick(v) { this.v += v; }
};

SD.hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
SD.shade = (hex, amt) => {
  // amt -1..1 : darken/lighten
  const [r, g, b] = SD.hexToRgb(hex);
  const f = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
};
SD.rgba = (hex, a) => { const [r, g, b] = SD.hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };

// quadratic bezier point
SD.qpt = (p0, p1, p2, t) => {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
};

// sprite cache helper: draws once into an offscreen canvas
SD.sprite = function (w, h, fn) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w); c.height = Math.ceil(h);
  fn(c.getContext('2d'), c.width, c.height);
  return c;
};

// rounded rect path
SD.rrect = (ctx, x, y, w, h, r) => {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

// ---------------------------------------------------------------------------
// Coroutine scheduler. Scripts are generator functions; they yield:
//   number  -> wait seconds (0 = one step)
//   function-> wait until it returns true
//   co / [co] -> wait until those coroutines finish
SD.Scheduler = class {
  constructor() { this.cos = []; this.t = 0; this.stepN = 0; }
  run(gen, tag) {
    const co = { gen, wait: null, done: false, tag };
    this.cos.push(co);
    return co;
  }
  kill(tag) { for (const c of this.cos) if (c.tag === tag) c.done = true; }
  killAll() { for (const c of this.cos) c.done = true; this.cos = []; }
  _wait(v) {
    if (v == null) { const n = this.stepN; return () => this.stepN > n; }
    if (typeof v === 'number') {
      if (v <= 0) { const n = this.stepN; return () => this.stepN > n; }
      const until = this.t + v; return () => this.t >= until - 1e-9;
    }
    if (typeof v === 'function') return v;
    if (Array.isArray(v)) return () => v.every((c) => c.done);
    if (typeof v === 'object' && 'done' in v) return () => v.done;
    return () => true;
  }
  step(dt) {
    this.t += dt; this.stepN++;
    const list = this.cos.slice();
    for (const co of list) {
      let guard = 0;
      while (!co.done && guard++ < 64) {
        if (co.wait && !co.wait()) break;
        const r = co.gen.next();
        if (r.done) { co.done = true; break; }
        co.wait = this._wait(r.value);
      }
    }
    if (this.cos.some((c) => c.done)) this.cos = this.cos.filter((c) => !c.done);
  }
};
SD.all = (...cos) => cos.flat();
