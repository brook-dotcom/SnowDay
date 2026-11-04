// Snow Day — world: snowfall, accumulation heightmap, window ledges, ice, particles
'use strict';
(function () {
  const { clamp, lerp, hash, noise1, fbm1, mulberry } = SD;

  // ---------- sprites (render-only) ----------
  const SPR = {};
  function buildSprites() {
    if (SPR.ready) return;
    const soft = (size, core, halo, edge) => SD.sprite(size, size, (c, w) => {
      const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, `rgba(255,255,255,${core})`);
      g.addColorStop(0.45, `rgba(255,255,255,${core * 0.92})`);
      g.addColorStop(0.7, `rgba(236,244,255,${halo})`);
      g.addColorStop(0.86, `rgba(120,145,185,${edge})`);
      g.addColorStop(1, 'rgba(120,145,185,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, w);
    });
    SPR.flake = soft(64, 1, 0.75, 0.22);
    SPR.flakeFar = soft(32, 0.9, 0.5, 0.1);
    SPR.bokeh = SD.sprite(128, 128, (c, w) => {
      const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(0.55, 'rgba(255,255,255,0.42)');
      g.addColorStop(0.8, 'rgba(230,240,255,0.18)');
      g.addColorStop(1, 'rgba(230,240,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, w);
    });
    SPR.crystal = SD.sprite(96, 96, (c, w) => {
      c.translate(w / 2, w / 2);
      c.shadowColor = 'rgba(110,140,190,0.55)'; c.shadowBlur = 5;
      c.strokeStyle = '#ffffff'; c.lineCap = 'round'; c.lineWidth = 4.2;
      for (let i = 0; i < 6; i++) {
        c.save(); c.rotate((i * Math.PI) / 3);
        c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -38);
        c.moveTo(0, -16); c.lineTo(-9, -25); c.moveTo(0, -16); c.lineTo(9, -25);
        c.moveTo(0, -27); c.lineTo(-6, -33); c.moveTo(0, -27); c.lineTo(6, -33);
        c.stroke(); c.restore();
      }
      c.beginPath(); c.arc(0, 0, 5, 0, SD.TAU); c.fillStyle = '#fff'; c.fill();
    });
    SPR.glow = SD.sprite(128, 128, (c, w) => {
      const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, w);
    });
    SPR.puff = SD.sprite(96, 96, (c, w) => {
      const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.6, 'rgba(250,252,255,0.7)');
      g.addColorStop(0.85, 'rgba(200,218,240,0.25)');
      g.addColorStop(1, 'rgba(200,218,240,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, w);
    });
    SPR.ready = true;
  }
  SD.SPR = SPR;
  SD.tintedGlow = {};
  SD.glowFor = function (color) {
    if (SD.tintedGlow[color]) return SD.tintedGlow[color];
    const s = SD.sprite(96, 96, (c, w) => {
      const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, SD.rgba(color, 0.95));
      g.addColorStop(0.3, SD.rgba(color, 0.45));
      g.addColorStop(1, SD.rgba(color, 0));
      c.fillStyle = g; c.fillRect(0, 0, w, w);
    });
    SD.tintedGlow[color] = s;
    return s;
  };

  const BIN = 2; // world units per heightmap bin

  class World {
    constructor(opt) {
      buildSprites();
      this.H = 1000;
      this.W = opt.W;
      this.seed = opt.seed >>> 0;
      this.rng = mulberry(this.seed ^ 0x51ed270b);
      this.screens = opt.screens; // [{x0,x1}] in world units
      this.settings = opt.settings;
      this.t = 0;
      this.n = Math.ceil(this.W / BIN) + 2;
      this.h = new Float32Array(this.n);
      this.tmp = new Float32Array(this.n);
      this.packed = new Uint8Array(this.n);
      this.flakes = [];
      this.snowfall = 0; // 0..1.6 intensity target
      this.snowNow = 0;
      this.accum = 0; // mean depth growth (units/s)
      this.flatten = 0;
      this.flatDepth = this.H / 7;
      this.wind = 8;
      this.windBase = 8;
      this.haze = 0; // whiteout 0..1
      this.gale = 0; // visible blizzard streaks 0..1
      this.landings = [];
      // fine snow: invisible flakes that fall exactly like the visible ones. Snow only builds up where
      // they (and the visible flakes) land, so the bank grows from the snowfall, not from the ground.
      this.fine = [];
      this.snowDue = 0;   // snow that has fallen from the sky but not yet landed anywhere
      this.rest = [];     // visible flakes that have landed and are melting into the surface
      this.particles = [];
      this.actors = [];
      this.props = [];
      this.ice = { on: false, a: 0, b: 0, glaze: 0, from: 1 };
      this.ledges = (opt.ledges || []).map((l, i) => this._makeLedge(l, i));
      this.drips = (opt.drips || []).map((l, i) => this._makeDrip(l, i));
      this.buildProg = 0;
      this.areaScreens = Math.max(1, (this.W * this.H) / (1778 * 1000));
      this.driftSeed = this.rng() * 1000;
      this.overlay = !!opt.overlay;
    }

    _makeLedge(l, i) {
      const [x0, x1, y] = l;
      const bin = 2.5;
      const n = Math.max(2, Math.ceil((x1 - x0) / bin));
      const icicles = [];
      const r = mulberry((this.seed + i * 977) >>> 0);
      const cnt = Math.floor((x1 - x0) / 55);
      for (let k = 0; k < cnt; k++) {
        if (r() < 0.45) icicles.push({ x: x0 + 10 + r() * (x1 - x0 - 20), max: 5 + r() * 16, w: 2.2 + r() * 2.2, start: 0.35 + r() * 0.5, len: 0 });
      }
      const wt = new Float32Array(n);
      const off = r() * 100;
      for (let k = 0; k < n; k++) wt[k] = Math.max(0, fbm1(k * bin / 26 + off, 5, 3) * 1.9 + 0.15);
      return { x0, x1, y, bin, n, h: new Float32Array(n), wt, icicles, cap: 14 + r() * 6, due: 0, hits: [] };
    }
    // icicles that grow from the bottom edge of windows
    _makeDrip(l, i) {
      const [x0, x1, y] = l;
      const r = mulberry((this.seed + 7177 + i * 389) >>> 0);
      const icicles = [];
      const cnt = Math.floor((x1 - x0) / 34);
      for (let k = 0; k < cnt; k++) {
        if (r() < 0.62) icicles.push({ x: x0 + 8 + r() * (x1 - x0 - 16), max: 8 + r() * r() * 34, w: 2 + r() * 2.6, start: 0.25 + r() * 0.55, len: 0, a: 1, dripAt: 4 + r() * 20 });
      }
      icicles.sort((a, b) => a.x - b.x);
      return { x0, x1, y, icicles };
    }

    // ---------- heightmap queries ----------
    depthAt(x) {
      const f = x / BIN;
      let i = Math.floor(f);
      if (i < 0) return this.h[0];
      if (i >= this.n - 1) return this.h[this.n - 1];
      const u = f - i;
      return this.h[i] * (1 - u) + this.h[i + 1] * u;
    }
    surfaceY(x) { return this.H - this.depthAt(x); }
    slopeAt(x) { return (this.surfaceY(x + 3) - this.surfaceY(x - 3)) / 6; }
    meanDepth(x0 = 0, x1 = this.W) {
      const i0 = clamp(Math.floor(x0 / BIN), 0, this.n - 1), i1 = clamp(Math.floor(x1 / BIN), 0, this.n - 1);
      let s = 0; for (let i = i0; i <= i1; i++) s += this.h[i];
      return s / Math.max(1, i1 - i0 + 1);
    }
    maxDepth(x0 = 0, x1 = this.W) {
      const i0 = clamp(Math.floor(x0 / BIN), 0, this.n - 1), i1 = clamp(Math.floor(x1 / BIN), 0, this.n - 1);
      let m = 0; for (let i = i0; i <= i1; i++) m = Math.max(m, this.h[i]);
      return m;
    }
    // add (or remove, negative) a gaussian volume of snow
    addSnow(x, amount, radius = 8) {
      const r = Math.max(BIN, radius);
      const i0 = Math.max(0, Math.floor((x - r * 2.5) / BIN)), i1 = Math.min(this.n - 1, Math.ceil((x + r * 2.5) / BIN));
      let norm = 0;
      for (let i = i0; i <= i1; i++) { const d = (i * BIN - x) / r; norm += Math.exp(-d * d); }
      if (norm <= 0) return;
      const k = amount / (norm * BIN);
      for (let i = i0; i <= i1; i++) {
        const d = (i * BIN - x) / r;
        this.h[i] = Math.max(0, this.h[i] + k * Math.exp(-d * d));
      }
    }
    // raise surface toward a target profile fn(x)->depth over [x0,x1] at rate
    shapeToward(x0, x1, fn, rate, dt, mark = true) {
      const i0 = Math.max(0, Math.floor(x0 / BIN)), i1 = Math.min(this.n - 1, Math.ceil(x1 / BIN));
      for (let i = i0; i <= i1; i++) {
        const target = fn(i * BIN);
        if (target == null) continue;
        const d = target - this.h[i];
        const step = clamp(d, -rate * dt, rate * dt);
        this.h[i] += step;
        if (mark) this.packed[i] = 1;
      }
    }
    setPacked(x0, x1, v = 1) {
      const i0 = Math.max(0, Math.floor(x0 / BIN)), i1 = Math.min(this.n - 1, Math.ceil(x1 / BIN));
      for (let i = i0; i <= i1; i++) this.packed[i] = v;
    }
    resetSnow(depth) {
      this.snowDue = 0;
      for (const L of this.ledges) L.due = 0;
      for (let i = 0; i < this.n; i++) {
        this.h[i] = depth + fbm1(i * BIN / 180, this.seed + 17) * 4;
        this.packed[i] = 0;
      }
    }

    // ---------- particles ----------
    puff(x, y, n = 6, size = 10, spread = 1, up = 1) {
      const r = this.rng;
      for (let i = 0; i < n; i++) {
        this.particles.push({ k: 'puff', x: x + (r() - 0.5) * size, y: y - r() * size * 0.3, vx: (r() - 0.5) * 70 * spread, vy: -(20 + r() * 60) * up, s: size * (0.5 + r() * 0.7), life: 0.9 + r() * 0.7, age: 0, g: 60 });
      }
    }
    sparkle(x, y, n = 1, col = '#ffffff', size = 7) {
      const r = this.rng;
      for (let i = 0; i < n; i++) this.particles.push({ k: 'spark', x: x + (r() - 0.5) * size * 2, y: y + (r() - 0.5) * size * 2, vx: 0, vy: -6, s: size * (0.6 + r() * 0.7), life: 0.6 + r() * 0.6, age: 0, col, rot: r() * 3 });
    }
    note(x, y, col = '#e94b5b') {
      const r = this.rng;
      this.particles.push({ k: 'note', x, y, vx: 10 + r() * 14, vy: -26 - r() * 10, s: 9 + r() * 4, life: 2.4, age: 0, col, ph: r() * 6, dbl: r() < 0.4 });
    }
    chunk(x, y, vx, vy, s = 5, onLand) {
      this.particles.push({ k: 'chunk', x, y, vx, vy, s, life: 6, age: 0, g: 900, onLand });
    }
    breath(x, y, dir) {
      const r = this.rng;
      this.particles.push({ k: 'breath', x, y, vx: dir * (10 + r() * 8), vy: -8 - r() * 6, s: 4, life: 1.6, age: 0 });
    }
    // paper confetti: drifts down, flutters, tumbles
    confetti(x, y, n = 1, spread = 60) {
      const r = this.rng, cols = ['#e2413b', '#ffd43b', '#3c7fd8', '#69db7c', '#f783ac', '#ffffff'];
      for (let i = 0; i < n; i++) this.particles.push({ k: 'confetti', x: x + (r() - 0.5) * spread * 2, y: y + (r() - 0.5) * 20, vx: (r() - 0.5) * 40, vy: 10 + r() * 30, s: 7 + r() * 4, life: 3.5 + r() * 1.5, age: 0, col: cols[Math.floor(r() * cols.length)], ph: r() * 6, rot: r() * 6, spin: (r() - 0.5) * 9 });
    }
    heart(x, y) {
      this.particles.push({ k: 'heart', x, y, vx: 0, vy: -22, s: 7, life: 1.8, age: 0, ph: this.rng() * 6 });
    }

    // ---------- simulation ----------
    targetFlakes(layer) {
      const base = [300, 420, 26][layer];
      return Math.round(base * this.areaScreens * this.snowNow * this.settings.density);
    }
    spawnFlake(layer, anywhere) {
      const r = this.rng;
      const f = {
        l: layer,
        x: r() * (this.W + 300) - 150,
        y: anywhere ? r() * this.H : -10 - r() * 120,
        vy: [22, 46, 95][layer] * (0.75 + r() * 0.5),
        r: [1.1, 2.0, 5.5][layer] * (0.7 + r() * 0.7),
        ph: r() * SD.TAU,
        sw: (0.4 + r() * 1.2),
        amp: [5, 9, 16][layer] * (0.4 + r()),
        cr: layer > 0 && r() < (layer === 2 ? 0.25 : 0.14),
        rot: r() * SD.TAU,
        vr: (r() - 0.5) * 1.4,
      };
      this.flakes.push(f);
      return f;
    }

    step(dt) {
      this.t += dt;
      const t = this.t, H = this.H, W = this.W;
      this.snowNow = SD.damp(this.snowNow, this.snowfall, 0.35, dt);
      this.wind = this.windBase + noise1(t * 0.07, this.seed) * 22 + noise1(t * 0.31, this.seed + 3) * 6;

      // keep flake counts near target
      const counts = [0, 0, 0];
      for (const f of this.flakes) counts[f.l]++;
      for (let l = 0; l < 3; l++) {
        const tgt = this.targetFlakes(l);
        let need = tgt - counts[l];
        let spawnBudget = Math.ceil((tgt / 6) * dt * 6) + 1;
        while (need > 0 && spawnBudget-- > 0) { this.spawnFlake(l, false); need--; }
        counts[l] = tgt; // used for culling below
      }

      // move flakes
      const landings = this.landings; landings.length = 0;
      const ledges = this.ledges;
      for (const L of ledges) L.hits.length = 0;
      // where a falling flake meets a ledge or the ground: true if it stopped there
      const meet = (x, py, y, visible, f) => {
        for (let i = 0; i < ledges.length; i++) {
          const L = ledges[i];
          if (x < L.x0 || x > L.x1) continue;
          const li = Math.min(L.n - 1, Math.floor((x - L.x0) / L.bin));
          const top = L.y - L.h[li];
          if (py <= top && y >= top) {
            L.hits.push(li);
            if (visible) { this._rest(f, x, i, li); return true; }
            return false; // fine snow also carries on past windows, so the ground beneath isn't starved
          }
        }
        if (y >= this.surfaceY(x) && x >= 0 && x <= W) { landings.push(x); if (visible) this._rest(f, x, -1, 0); return true; }
        return false;
      };
      const keep = [];
      for (const f of this.flakes) {
        const py = f.y;
        f.y += f.vy * dt;
        f.x += (this.wind * (0.6 + f.l * 0.35) + Math.sin(t * f.sw + f.ph) * f.amp) * dt;
        f.rot += f.vr * dt;
        let dead = f.l === 1 && meet(f.x, py, f.y, true, f);
        if (f.y > H + 20) dead = true;
        if (f.x < -200 || f.x > W + 200) dead = true;
        if (!dead) keep.push(f);
      }
      this.flakes = keep;
      // fine snow falls with the same wind and sway as the visible middle layer
      // (only needed while the bank is building; otherwise nothing is collecting)
      const building = this.accum > 0 || this.snowDue > 0;
      const fineTgt = building ? Math.round(2500 * this.areaScreens * Math.min(1, this.snowNow)) : 0;
      let fineBudget = Math.ceil(fineTgt * dt) + 1;
      const r = this.rng;
      while (this.fine.length < fineTgt && fineBudget-- > 0) {
        this.fine.push({ x: r() * (W + 300) - 150, y: -10 - r() * 120, vy: 46 * (0.75 + r() * 0.5), ph: r() * SD.TAU, sw: 0.4 + r() * 1.2, amp: 9 * (0.4 + r()) });
      }
      const fineKeep = [];
      for (const f of this.fine) {
        const py = f.y;
        f.y += f.vy * dt;
        f.x += (this.wind * 0.95 + Math.sin(t * f.sw + f.ph) * f.amp) * dt;
        if (meet(f.x, py, f.y, false) || f.y > H + 20 || f.x < -200 || f.x > W + 200) continue;
        fineKeep.push(f);
      }
      this.fine = fineKeep.length > fineTgt * 1.5 + 50 ? fineKeep.slice(0, Math.ceil(fineTgt * 1.5) + 50) : fineKeep;

      // accumulation: what falls is shared out only where flakes actually land. Snow that's still in
      // the air waits (the first flakes take a while to reach the ground), then catches up.
      const step = this.accum * dt * W;
      this.snowDue += step;
      if (landings.length && this.snowDue > 0) {
        const release = Math.min(this.snowDue, Math.max(step, this.accum * W / 60) * 1.8);
        const each = release / landings.length;
        for (const x of landings) this.addSnow(x, each, 16);
        this.snowDue -= release;
      }
      if (this.accum <= 0 && this.snowDue > 0 && !landings.length) this.snowDue = Math.max(0, this.snowDue - W * dt * 0.5);
      for (const p of this.rest) p.age += dt;
      if (this.rest.length && this.rest[0].age > 1.6) this.rest = this.rest.filter((p) => p.age <= 1.6);

      // flatten toward a smooth plane
      if (this.flatten > 0) {
        const fd = this.flatDepth, k = this.flatten * dt;
        for (let i = 0; i < this.n; i++) {
          if (this.packed[i]) continue;
          const target = fd + noise1(i * BIN / 220, this.seed + 41) * 2.5;
          this.h[i] += (target - this.h[i]) * Math.min(1, k);
        }
      }
      if (this.melting) {
        this.melt = Math.min(1, (this.melt || 0) + dt / 0.9);
        const k = Math.max(0, 1 - dt * (1.2 + this.melt * 8));
        for (let i = 0; i < this.n; i++) this.h[i] *= k;
        for (const L of this.ledges) { for (let i = 0; i < L.n; i++) L.h[i] *= k; for (const ic of L.icicles) ic.len *= k; }
        for (const D of this.drips) for (const ic of D.icicles) ic.len *= k;
        this.flakeFade = Math.max(0, (this.flakeFade ?? 1) - dt * 1.4);
        if (this.rng() < 0.6) { const x = this.rng() * this.W; this.sparkle(x, this.surfaceY(x) - 2, 1, '#ffffff', 5); }
        return this._stepParticles(dt);
      }
      this._relax(dt);
      this._stepLedges(dt);
      this._stepDrips(dt);
      this._stepParticles(dt);
      // ice spreading
      const ice = this.ice;
      if (ice.on) ice.glaze = Math.min(1, ice.glaze + dt * 0.5);
    }

    _relax(dt) {
      const h = this.h, n = this.n, P = this.packed;
      const maxd = 0.62 * BIN;
      const dir = (this.t * 60) & 1;
      for (let k = 0; k < n - 1; k++) {
        const i = dir ? k : n - 2 - k;
        if (P[i] || P[i + 1]) continue;
        const d = h[i] - h[i + 1];
        if (d > maxd) { const m = (d - maxd) * 0.25; h[i] -= m; h[i + 1] += m; }
        else if (d < -maxd) { const m = (-d - maxd) * 0.25; h[i + 1] -= m; h[i] += m; }
      }
      // gentle diffusion (keeps the surface soft)
      const tmp = this.tmp, kd = 0.06;
      for (let i = 1; i < n - 1; i++) tmp[i] = h[i] + kd * (h[i - 1] + h[i + 1] - 2 * h[i]);
      for (let i = 1; i < n - 1; i++) if (!P[i] && !P[i - 1] && !P[i + 1]) h[i] = tmp[i];
    }

    // a visible flake that has landed: it sits on the snow for a moment and melts into it
    _rest(f, x, ledge, li) {
      if (this.rest.length > 400) return;
      this.rest.push({ x, r: f.r, cr: f.cr, rot: f.rot, ledge, li, age: 0 });
    }
    drawResting(ctx, view) {
      if (!this.rest.length) return;
      const a0 = this.flakeFade ?? 1;
      for (const p of this.rest) {
        if (p.x < view.x0 - 10 || p.x > view.x1 + 10) continue;
        const L = p.ledge >= 0 ? this.ledges[p.ledge] : null;
        const top = L ? L.y - L.h[Math.min(L.n - 1, p.li)] : this.surfaceY(p.x);
        const u = p.age / 1.6, k = 1 - u * 0.45;
        ctx.globalAlpha = a0 * (1 - u * u) * 0.95;
        if (p.cr) {
          const s = p.r * 3.4 * k;
          ctx.save(); ctx.translate(p.x, top - s * 0.3); ctx.rotate(p.rot); ctx.drawImage(SPR.crystal, -s, -s, s * 2, s * 2); ctx.restore();
        } else {
          const s = p.r * 1.6 * k;
          ctx.drawImage(SPR.flake, p.x - s, top - s * 0.5, s * 2, s * 2);
        }
      }
      ctx.globalAlpha = 1;
    }

    _ledgeLand(L, li) {
      const amt = 0.18 * this.settings.ledgeRate;
      for (let d = -2; d <= 2; d++) {
        const j = li + d; if (j < 0 || j >= L.n) continue;
        L.h[j] += amt * [0.25, 0.6, 1, 0.6, 0.25][d + 2];
      }
    }
    _stepLedges(dt) {
      for (const L of this.ledges) {
        const h = L.h, n = L.n;
        // a faint uniform settling so ledges fill evenly
        let mean0 = 0; for (let i = 0; i < n; i++) mean0 += h[i]; mean0 /= n;
        // ledges fill at the same pace as the ground, but only where flakes come down on them
        if (this.accum > 0) L.due += (this.accum / this.flatDepth) * L.cap * 0.85 * this.settings.ledgeRate * dt * n;
        if (L.hits.length && L.due > 0) {
          const each = L.due / L.hits.length;
          for (const li of L.hits) for (let d = -3; d <= 3; d++) { const j = li + d; if (j >= 0 && j < n) h[j] += each * [0.05, 0.12, 0.2, 0.26, 0.2, 0.12, 0.05][d + 3]; }
          L.due = 0;
        }
        void mean0;
        for (let i = 0; i < n; i++) if (h[i] > L.cap) h[i] = L.cap;
        // relax and lose material over the ends -> rounded caps
        const maxd = 0.9 * L.bin;
        for (let i = -1; i < n; i++) {
          const a = i < 0 ? -2 : h[i], b = i + 1 >= n ? -2 : h[i + 1];
          const d = a - b;
          if (d > maxd) { const m = (d - maxd) * 0.3; if (i >= 0) h[i] -= m; if (i + 1 < n) h[i + 1] += m; }
          else if (d < -maxd) { const m = (-d - maxd) * 0.3; if (i + 1 < n) h[i + 1] -= m; if (i >= 0) h[i] += m; }
        }
        for (let i = 1; i < n - 1; i++) h[i] += 0.04 * (h[i - 1] + h[i + 1] - 2 * h[i]);
        // icicles grow once snow has settled
        let mean = 0; for (let i = 0; i < n; i++) mean += h[i]; mean /= n;
        for (const ic of L.icicles) {
          if (mean > L.cap * ic.start * 0.6) ic.len = Math.min(ic.max, ic.len + dt * 0.12);
        }
      }
    }

    // keep icicles out of the way of penguins and props
    _busyBoxes() {
      const out = [];
      for (const a of this.actors) {
        if (a.dead || a.hidden) continue;
        const s = a.size / 0.74, kx = a.K ? a.K.kx : 1;
        out.push([a.x - 48 * s * kx, a.y - 125 * s, a.x + 48 * s * kx, a.y + 8]);
      }
      for (const p of this.props) {
        if (p.dead) continue;
        out.push(p.bbox ? p.bbox() : [p.x - 60, p.y - 110, p.x + 60, p.y + 8]);
      }
      return out;
    }
    _stepDrips(dt) {
      if (!this._dripTick) this._dripTick = 0;
      if ((this._dripTick++ % 8) === 0) {
        this.buildProg = clamp(this.meanDepth() / this.flatDepth, 0, 1);
        const boxes = this._busyBoxes();
        const clear = (x, y0, y1) => !boxes.some((b) => x > b[0] - 24 && x < b[2] + 24 && y1 > b[1] - 24 && y0 < b[3] + 24);
        for (const D of this.drips) for (const ic of D.icicles) ic.free = clear(ic.x, D.y, D.y + ic.max);
        for (const L of this.ledges) for (const ic of L.icicles) ic.free = clear(ic.x, L.y, L.y + ic.max);
      }
      const prog = Math.max(this.buildProg, this._peakProg || 0);
      this._peakProg = prog;
      for (const D of this.drips) {
        for (const ic of D.icicles) {
          const target = ic.max * SD.smooth((prog - ic.start) / 0.45);
          if (ic.len < target) ic.len = Math.min(target, ic.len + dt * 4);
          ic.a = SD.damp(ic.a, ic.free === false ? 0 : 1, 6, dt);
          if (ic.len > 6 && ic.a > 0.9) {
            ic.dripAt -= dt;
            if (ic.dripAt <= 0) { ic.dripAt = 8 + this.rng() * 25; this.particles.push({ k: 'drop', x: ic.x, y: D.y + ic.len, vx: 0, vy: 20, s: 1.6, life: 3, age: 0 }); }
          }
        }
      }
      for (const L of this.ledges) for (const ic of L.icicles) ic.a = SD.damp(ic.a ?? 1, ic.free === false ? 0 : 1, 6, dt);
    }

    _stepParticles(dt) {
      const out = [];
      for (const p of this.particles) {
        p.age += dt;
        if (p.age >= p.life) continue;
        if (p.k === 'puff') { p.vy += p.g * dt; p.vx *= 1 - 2 * dt; p.vy *= 1 - 1.5 * dt; }
        if (p.k === 'chunk') {
          p.vy += p.g * dt;
          const sy = this.surfaceY(p.x + p.vx * dt);
          if (p.y + p.vy * dt >= sy && p.vy > 0) {
            if (p.onLand) p.onLand(p.x, sy);
            this.puff(p.x, sy, 3, p.s * 1.2, 0.6, 0.6);
            continue;
          }
        }
        if (p.k === 'note' || p.k === 'heart') p.x += Math.sin(p.age * 4 + (p.ph || 0)) * 6 * dt;
        if (p.k === 'drop') { p.vy += 700 * dt; if (p.y > this.surfaceY(p.x)) continue; }
        if (p.k === 'breath') { p.vx *= 1 - dt; p.s += dt * 6; }
        if (p.k === 'confetti') {
          p.vy = Math.min(p.vy + 140 * dt, 60); p.vx *= 1 - 1.5 * dt; p.x += Math.sin(p.age * 5 + p.ph) * 22 * dt; p.rot += p.spin * dt;
          if (p.y > this.surfaceY(p.x) + 40) continue;
        }
        p.x += p.vx * dt; p.y += p.vy * dt;
        out.push(p);
      }
      this.particles = out;
    }

    // ---------- rendering ----------
    drawFlakes(ctx, view, layer) {
      const x0 = view.x0 - 20, x1 = view.x1 + 20;
      const spr = layer === 0 ? SPR.flakeFar : layer === 2 ? SPR.bokeh : SPR.flake;
      const alpha = (layer === 0 ? 0.75 : layer === 2 ? 0.7 : 1) * (this.flakeFade ?? 1);
      if (alpha <= 0.01) return;
      ctx.globalAlpha = alpha;
      for (const f of this.flakes) {
        if (f.l !== layer || f.x < x0 || f.x > x1) continue;
        if (f.cr) {
          const s = f.r * (layer === 2 ? 2.2 : 3.4);
          ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
          ctx.drawImage(SPR.crystal, -s, -s, s * 2, s * 2);
          ctx.restore();
        } else {
          const s = f.r * (layer === 2 ? 2.4 : 1.6);
          ctx.drawImage(spr, f.x - s, f.y - s, s * 2, s * 2);
        }
      }
      ctx.globalAlpha = 1;
    }

    surfacePath(ctx, x0, x1, close = true, yOff = 0) {
      const i0 = Math.max(0, Math.floor(x0 / BIN) - 1), i1 = Math.min(this.n - 1, Math.ceil(x1 / BIN) + 1);
      const H = this.H;
      ctx.beginPath();
      if (close) ctx.moveTo(i0 * BIN, H + 40);
      let px = i0 * BIN, py = H - this.h[i0] + yOff;
      if (close) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      for (let i = i0 + 1; i <= i1; i++) {
        const x = i * BIN, y = H - this.h[i] + yOff;
        ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
        px = x; py = y;
      }
      ctx.lineTo(px, py);
      if (close) { ctx.lineTo(px, H + 40); ctx.closePath(); }
    }

    drawGround(ctx, view) {
      const x0 = view.x0 - 4, x1 = view.x1 + 4, H = this.H;
      const md = this.maxDepth(Math.max(0, x0), Math.min(this.W, x1));
      if (md < 0.3) return;
      // soft contact shadow above the rim (separates snow from bright windows)
      ctx.save();
      this.surfacePath(ctx, x0, x1, false, -1.5);
      ctx.strokeStyle = 'rgba(40,60,95,0.16)'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.restore();
      // body
      const top = H - Math.max(md, 10);
      const g = ctx.createLinearGradient(0, top, 0, H);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.18, '#f6f9fe');
      g.addColorStop(0.6, '#e4edf8');
      g.addColorStop(1, '#cfdcee');
      this.surfacePath(ctx, x0, x1, true);
      ctx.fillStyle = g; ctx.fill();
      // depth strata
      ctx.save();
      ctx.clip();
      ctx.lineWidth = 1.3;
      for (const [off, a] of [[16, 0.07], [38, 0.06], [70, 0.05], [108, 0.04]]) {
        this.surfacePath(ctx, x0, x1, false, off);
        ctx.strokeStyle = `rgba(110,140,185,${a})`; ctx.stroke();
      }
      // under-rim shading
      this.surfacePath(ctx, x0, x1, false, 4);
      ctx.strokeStyle = 'rgba(140,170,210,0.22)'; ctx.lineWidth = 6; ctx.stroke();
      ctx.restore();
      // bright rim
      this.surfacePath(ctx, x0, x1, false, 0.6);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2; ctx.stroke();
      // glints
      const t = this.t;
      for (let x = Math.floor(x0 / 9) * 9; x < x1; x += 9) {
        const hsh = hash(x | 0, 77);
        if (hsh > 0.22) continue;
        const tw = Math.sin(t * (1.5 + hsh * 6) + hsh * 40);
        if (tw < 0.82) continue;
        const d = this.depthAt(x); if (d < 3) continue;
        const y = H - d + 3 + hash(x | 0, 78) * Math.min(30, d - 2);
        const s = (tw - 0.82) / 0.18 * 3.2;
        drawTwinkle(ctx, x, y, s, '#ffffff', 0.9);
      }
    }

    drawIce(ctx, view) {
      const ice = this.ice; if (!ice.on) return;
      const a = Math.max(view.x0 - 5, ice.a), b = Math.min(view.x1 + 5, ice.b);
      if (b <= a) return;
      const H = this.H, gl = ice.glaze;
      const sy = this.surfaceY((a + b) / 2);
      ctx.save();
      ctx.beginPath();
      this.surfacePath(ctx, a, b, true);
      ctx.clip();
      const g = ctx.createLinearGradient(0, sy - 2, 0, sy + 70);
      g.addColorStop(0, `rgba(214,240,255,${0.97 * gl})`);
      g.addColorStop(0.35, `rgba(170,214,242,${0.92 * gl})`);
      g.addColorStop(0.8, `rgba(180,215,240,${0.55 * gl})`);
      g.addColorStop(1, 'rgba(200,225,245,0)');
      ctx.fillStyle = g;
      ctx.fillRect(a, sy - 30, b - a, 110);
      // streaks
      ctx.globalAlpha = 0.28 * gl;
      ctx.fillStyle = '#ffffff';
      for (let x = Math.floor(a / 60) * 60; x < b; x += 60) {
        const hs = hash(x | 0, 333);
        if (hs < 0.62) continue;
        const sx = x + hs * 40 + Math.sin(this.t * 0.4 + hs * 9) * 6;
        const w = 4 + hs * 10, len = 26 + hs * 30;
        ctx.beginPath();
        ctx.moveTo(sx, sy + 3); ctx.lineTo(sx + w, sy + 3); ctx.lineTo(sx + w - len * 0.6, sy + len * 0.9); ctx.lineTo(sx - len * 0.6, sy + len * 0.9);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      // top glare line
      ctx.globalAlpha = gl;
      this.surfacePath(ctx, a, b, false, 0.6);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.globalAlpha = 1;
      // crackle sparkles at the freezing front
      if (ice.front != null && gl < 1.01 && ice.spreading) {
        const fx = ice.front;
        for (let k = 0; k < 3; k++) {
          const hs = hash((this.t * 60 | 0) + k, 5);
          drawTwinkle(ctx, fx - hs * 30, this.surfaceY(fx) + 2 + hs * 14, 3 + hs * 4, '#ffffff', 0.9);
        }
      }
    }

    _drawIcicle(ctx, x, y, len, w, a) {
      if (len < 0.5 || a < 0.02) return;
      ctx.globalAlpha = a;
      const g = ctx.createLinearGradient(0, y, 0, y + len);
      g.addColorStop(0, 'rgba(238,249,255,0.96)'); g.addColorStop(1, 'rgba(185,222,250,0.6)');
      ctx.beginPath();
      ctx.moveTo(x - w, y - 0.5);
      ctx.quadraticCurveTo(x - w * 0.3, y + len * 0.5, x, y + len);
      ctx.quadraticCurveTo(x + w * 0.3, y + len * 0.5, x + w, y - 0.5);
      ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(100,140,195,0.4)'; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(x - w * 0.45, y + 1, w * 0.25, len * 0.45);
      ctx.globalAlpha = 1;
    }
    drawLedges(ctx, view) {
      for (const D of this.drips) {
        if (D.x1 < view.x0 - 10 || D.x0 > view.x1 + 10) continue;
        for (const ic of D.icicles) this._drawIcicle(ctx, ic.x, D.y, ic.len, ic.w, ic.a);
      }
      for (const L of this.ledges) {
        if (L.x1 < view.x0 - 10 || L.x0 > view.x1 + 10) continue;
        for (const ic of L.icicles) this._drawIcicle(ctx, ic.x, L.y, ic.len, ic.w, ic.a ?? 1);
        // contiguous clumps of snow (so it starts as little drifts, not a line)
        const runs = [];
        let s0 = -1;
        for (let i = 0; i <= L.n; i++) {
          const on = i < L.n && L.h[i] > 0.35;
          if (on && s0 < 0) s0 = i;
          if (!on && s0 >= 0) { runs.push([s0, i - 1]); s0 = -1; }
        }
        if (!runs.length) continue;
        const path = () => {
          ctx.beginPath();
          for (const [i0, i1] of runs) {
            const xa = L.x0 + i0 * L.bin - (i0 === 0 ? 1.5 : 0.5), xb = L.x0 + (i1 + 1) * L.bin + (i1 === L.n - 1 ? 1.5 : 0.5);
            ctx.moveTo(xa, L.y + 0.5);
            let px = xa, py = L.y - (i0 === 0 ? Math.min(L.h[0], 1.2) : 0);
            ctx.lineTo(px, py);
            for (let i = i0; i <= i1; i++) {
              const x = L.x0 + (i + 0.5) * L.bin, y = L.y - L.h[i];
              ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
              px = x; py = y;
            }
            ctx.quadraticCurveTo(px, py, xb, L.y - (i1 === L.n - 1 ? Math.min(L.h[L.n - 1], 1.2) : 0));
            ctx.lineTo(xb, L.y + 0.5);
            ctx.closePath();
          }
        };
        ctx.save();
        ctx.shadowColor = 'rgba(30,50,90,0.28)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1;
        path();
        const g = ctx.createLinearGradient(0, L.y - L.cap, 0, L.y + 1);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#f1f6fd'); g.addColorStop(1, '#d6e3f3');
        ctx.fillStyle = g; ctx.fill();
        ctx.restore();
        ctx.strokeStyle = 'rgba(120,150,195,0.35)'; ctx.lineWidth = 0.7; path(); ctx.stroke();
      }
    }

    drawParticles(ctx, view, front) {
      for (const p of this.particles) {
        if (p.x < view.x0 - 60 || p.x > view.x1 + 60) continue;
        const u = p.age / p.life;
        if (p.k === 'puff' || p.k === 'breath') {
          if (front !== (p.k === 'puff')) continue;
          const s = p.k === 'breath' ? p.s * (1 + u) : p.s * (0.7 + u * 0.9);
          ctx.globalAlpha = (1 - u) * (p.k === 'breath' ? 0.35 : 0.9);
          ctx.drawImage(SPR.puff, p.x - s, p.y - s, s * 2, s * 2);
        } else if (!front) continue;
        else if (p.k === 'spark') {
          const s = p.s * Math.sin(u * Math.PI);
          drawTwinkle(ctx, p.x, p.y, s, p.col, 1);
        } else if (p.k === 'chunk') {
          ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, SD.TAU);
          ctx.fillStyle = '#ffffff'; ctx.fill();
          ctx.strokeStyle = 'rgba(120,150,195,0.5)'; ctx.lineWidth = 0.8; ctx.stroke();
        } else if (p.k === 'note') {
          ctx.globalAlpha = Math.min(1, (1 - u) * 2.2) * Math.min(1, u * 6);
          drawNote(ctx, p.x, p.y, p.s, p.col, p.dbl);
        } else if (p.k === 'drop') {
          ctx.globalAlpha = 0.8;
          ctx.fillStyle = '#bfe3ff'; ctx.strokeStyle = 'rgba(90,130,190,0.6)'; ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, 1.3, 2.4, 0, 0, SD.TAU); ctx.fill(); ctx.stroke();
        } else if (p.k === 'heart') {
          ctx.globalAlpha = Math.min(1, (1 - u) * 2) * Math.min(1, u * 6);
          drawHeart(ctx, p.x, p.y, p.s);
        } else if (p.k === 'confetti') {
          ctx.globalAlpha = Math.min(1, (1 - u) * 4);
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.age * 7 + p.ph));
          ctx.fillStyle = p.col; ctx.fillRect(-p.s / 2, -p.s * 0.3, p.s, p.s * 0.6);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawTwinkle(ctx, x, y, s, col, a) {
    if (s <= 0.05) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x, y);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -s * 2); ctx.quadraticCurveTo(0, 0, s * 2, 0); ctx.quadraticCurveTo(0, 0, 0, s * 2);
    ctx.quadraticCurveTo(0, 0, -s * 2, 0); ctx.quadraticCurveTo(0, 0, 0, -s * 2);
    ctx.fill();
    ctx.globalAlpha = a * 0.5;
    ctx.drawImage(SPR.glow, -s * 1.6, -s * 1.6, s * 3.2, s * 3.2);
    ctx.restore();
  }
  function drawNote(ctx, x, y, s, col, dbl) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round';
    const head = (hx) => { ctx.save(); ctx.translate(hx, 0); ctx.rotate(-0.4); ctx.beginPath(); ctx.ellipse(0, 0, s * 0.42, s * 0.3, 0, 0, SD.TAU); ctx.fill(); ctx.restore(); };
    head(0);
    ctx.beginPath(); ctx.moveTo(s * 0.36, -s * 0.1); ctx.lineTo(s * 0.36, -s * 1.5);
    if (dbl) { head(s * 0.9); ctx.moveTo(s * 1.26, -s * 0.1); ctx.lineTo(s * 1.26, -s * 1.4); ctx.moveTo(s * 0.36, -s * 1.5); ctx.lineTo(s * 1.26, -s * 1.4); ctx.lineWidth = s * 0.3; }
    else { ctx.moveTo(s * 0.36, -s * 1.5); ctx.quadraticCurveTo(s * 0.9, -s * 1.1, s * 0.85, -s * 0.6); }
    ctx.stroke();
    ctx.restore();
  }
  function drawHeart(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#ff6f86';
    ctx.beginPath();
    ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.45, -s * 1.05, 0, -s * 0.45);
    ctx.bezierCurveTo(s * 0.45, -s * 1.05, s * 1.1, -s * 0.35, 0, s * 0.35);
    ctx.fill(); ctx.restore();
  }
  SD.drawTwinkle = drawTwinkle;
  SD.World = World;
  SD.BIN = BIN;
})();
