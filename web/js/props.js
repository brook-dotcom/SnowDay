// Snow Day — props: tractor plow, pine tree + decorations, candy canes, ladders, sleds, gear
'use strict';
(function () {
  const { clamp, lerp, damp, TAU, hash } = SD;
  const PI = Math.PI;
  const INK = '#151b2b';

  // ======================= base =======================
  class Prop {
    constructor(world, x, lane = 8) {
      this.world = world; this.x = x; this.lane = lane; this.y = world.surfaceY(x) + lane;
      this.alpha = 1; this.dead = false; this.rot = 0; this.follow = true; this.t = 0;
    }
    update(dt) { this.t += dt; if (this.follow) this.y = this.world.surfaceY(this.x) + this.lane; }
    draw() {}
    reflect() { return true; }
  }
  SD.Prop = Prop;

  // ======================= tractor plow =======================
  class Tractor extends Prop {
    constructor(world, x, dir, driver) {
      super(world, x, 6);
      this.dir = dir; this.driver = driver; this.wheel = 0; this.speed = 0; this.target = null; this.maxSpeed = 70;
      this.plowing = false; this.plowLevel = 0; this.blade = 0; // blade lowered 0..1
      this.puffAt = 0; this.beacon = 0; this.carried = 0; this.reverse = false;
      if (driver) { driver.attach = () => this.seat(); driver.size = 0.5; driver.loco = 'sit'; driver.laneT = driver.lane = this.lane - 1; }
    }
    seat() { const s = this.dir; return { x: this.x - 34 * s, y: this.y - 34, facing: s, rot: this.tilt * 0.5 }; }
    goTo(x, sp) { this.target = x; if (sp) this.maxSpeed = sp; }
    update(dt) {
      this.t += dt;
      const w = this.world;
      if (this.target != null) {
        const d = this.target - this.x;
        const ms = this.maxSpeed * (w.speedMul ? w.speedMul(this.x) : 1);
        const want = clamp(d * 1.2, -ms, ms);
        this.speed = damp(this.speed, want, 2.2, dt);
        if (Math.abs(d) < 1 && Math.abs(this.speed) < 3) { this.target = null; this.speed = 0; }
      } else this.speed = damp(this.speed, 0, 4, dt);
      this.x += this.speed * dt;
      this.wheel += (this.speed * dt) / 22;
      // ground under wheels
      const yr = w.surfaceY(this.x - 40 * this.dir), yf = w.surfaceY(this.x + 35 * this.dir);
      this.y = Math.min(yr, yf) + this.lane + 4;
      this.tilt = Math.atan2((yf - yr) * this.dir, 75) * 0.6; // world-space slope, same for both directions
      this.blade = damp(this.blade, this.plowing ? 1 : 0, 3, dt);
      this.beacon += dt;
      // plow: scrape bins under the blade down to plowLevel and push the excess ahead
      if (this.plowing && this.blade > 0.6 && Math.abs(this.speed) > 2 && this.speed * this.dir > 0) {
        const bx = this.x + 80 * this.dir;
        const BIN = SD.BIN;
        let removed = 0;
        const a = Math.min(bx - 12 * this.dir, bx + 4 * this.dir), b = Math.max(bx - 12 * this.dir, bx + 4 * this.dir);
        for (let i = Math.max(0, Math.floor(a / BIN)); i <= Math.min(w.n - 1, Math.ceil(b / BIN)); i++) {
          if (w.h[i] > this.plowLevel) { removed += (w.h[i] - this.plowLevel) * BIN; w.h[i] = this.plowLevel; }
          w.packed[i] = 1;
        }
        // behind the blade stays packed
        w.setPacked(Math.min(this.x - 60 * this.dir, bx), Math.max(this.x - 60 * this.dir, bx), 1);
        if (removed > 0) {
          this.carried += removed;
          w.addSnow(bx + 36 * this.dir, removed * 0.4, 26);
          // keep the pushed mound soft
          const m0 = Math.floor(Math.min(bx + 6 * this.dir, bx + 90 * this.dir) / BIN), m1 = Math.ceil(Math.max(bx + 6 * this.dir, bx + 90 * this.dir) / BIN);
          for (let k = 0; k < 2; k++) for (let i = Math.max(1, m0); i < Math.min(w.n - 1, m1); i++) if (!w.packed[i]) w.h[i] += 0.2 * (w.h[i - 1] + w.h[i + 1] - 2 * w.h[i]);
          if (w.rng() < 0.5) w.puff(bx + 12 * this.dir, w.surfaceY(bx + 16 * this.dir) - 6, 1, 9, 0.6, 0.8);
        }
      }
      this.puffAt -= dt;
      if (this.puffAt <= 0 && this.driver) {
        this.puffAt = Math.abs(this.speed) > 5 ? 0.35 : 0.9;
        const ex = this.x + 13 * this.dir, ey = this.y - 100;
        w.particles.push({ k: 'puff', x: ex, y: ey, vx: -this.speed * 0.3 + w.wind * 0.5, vy: -30, s: 7, life: 1.4, age: 0, g: -10, smoke: true });
      }
    }
    draw(ctx) {
      const s = this.dir;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.tilt || 0);
      ctx.scale(s, 1);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const LW = 2;
      // exhaust pipe
      ctx.fillStyle = '#58606e'; ctx.strokeStyle = INK; ctx.lineWidth = LW;
      ctx.beginPath(); SD.rrect(ctx, 10, -98, 7, 46, 2); ctx.fill(); ctx.stroke();
      // cab back + roof
      ctx.fillStyle = '#d23f37';
      ctx.beginPath(); ctx.moveTo(-66, -52); ctx.lineTo(-62, -118); ctx.lineTo(-8, -118); ctx.lineTo(-2, -52); ctx.closePath(); ctx.fill(); ctx.stroke();
      // window cutout (glass)
      ctx.fillStyle = 'rgba(200,232,255,0.92)';
      ctx.beginPath(); ctx.moveTo(-56, -60); ctx.lineTo(-53, -108); ctx.lineTo(-15, -108); ctx.lineTo(-10, -60); ctx.closePath(); ctx.fill();
      ctx.restore();
      // driver sits inside, clipped to the window
      if (this.driver) {
        const M0 = ctx.getTransform();
        ctx.save();
        ctx.translate(this.x, this.y); ctx.rotate(this.tilt || 0); ctx.scale(s, 1);
        ctx.beginPath(); ctx.moveTo(-56, -60); ctx.lineTo(-53, -140); ctx.lineTo(-15, -140); ctx.lineTo(-10, -60); ctx.closePath();
        ctx.clip();
        ctx.setTransform(M0);
        this.driver.draw(ctx);
        ctx.restore();
      }
      ctx.save();
      ctx.translate(this.x, this.y); ctx.rotate(this.tilt || 0); ctx.scale(s, 1);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = LW;
      // glass glare + frame
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-48, -100); ctx.lineTo(-40, -70); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = LW;
      ctx.beginPath(); ctx.moveTo(-56, -60); ctx.lineTo(-53, -108); ctx.lineTo(-15, -108); ctx.lineTo(-10, -60); ctx.closePath(); ctx.stroke();
      // roof
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); SD.rrect(ctx, -70, -126, 70, 10, 4); ctx.fill(); ctx.stroke();
      // snow on roof
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(-70, -124); ctx.quadraticCurveTo(-56, -134, -40, -128); ctx.quadraticCurveTo(-22, -133, -2, -124); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(120,150,195,0.5)'; ctx.lineWidth = 1; ctx.stroke(); ctx.strokeStyle = INK; ctx.lineWidth = LW;
      // beacon
      const on = Math.sin(this.beacon * 9) > 0;
      ctx.fillStyle = on ? '#ffb02e' : '#d27d10';
      ctx.beginPath(); ctx.moveTo(-42, -131); ctx.quadraticCurveTo(-36, -144, -30, -131); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (on) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(SD.glowFor('#ffb02e'), -66, -166, 60, 60); ctx.globalCompositeOperation = 'source-over'; }
      // body / hood
      const bg = ctx.createLinearGradient(0, -60, 0, -18);
      bg.addColorStop(0, '#ef5a4f'); bg.addColorStop(1, '#b8302a');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.moveTo(-70, -54); ctx.lineTo(4, -56); ctx.quadraticCurveTo(58, -58, 62, -44); ctx.lineTo(64, -22); ctx.lineTo(-70, -20); ctx.closePath(); ctx.fill(); ctx.stroke();
      // grille + headlight
      ctx.fillStyle = '#3c4250'; ctx.beginPath(); SD.rrect(ctx, 52, -46, 10, 22, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff6c2'; ctx.beginPath(); ctx.arc(46, -47, 5, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45; ctx.drawImage(SD.glowFor('#fff3b0'), 26, -67, 40, 40); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      // hood stripe + rivets
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-2, -44, 46, 4);
      ctx.fillStyle = INK; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(-60 + k * 16, -28, 1.4, 0, TAU); ctx.fill(); }
      // blade arm + blade
      const bl = this.blade;
      const by = lerp(-14, 2, bl);
      ctx.fillStyle = '#58606e'; ctx.beginPath(); ctx.moveTo(56, -30); ctx.lineTo(76, by - 18); ctx.lineTo(76, by - 10); ctx.lineTo(56, -22); ctx.closePath(); ctx.fill(); ctx.stroke();
      const g2 = ctx.createLinearGradient(70, 0, 96, 0);
      g2.addColorStop(0, '#f6c544'); g2.addColorStop(1, '#d99a12');
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.moveTo(72, by - 50); ctx.quadraticCurveTo(94, by - 30, 90, by + 2); ctx.lineTo(80, by + 2); ctx.quadraticCurveTo(84, by - 26, 68, by - 46); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c9ced8'; ctx.beginPath(); ctx.moveTo(80, by + 2); ctx.lineTo(91, by + 2); ctx.lineTo(90, by - 3); ctx.lineTo(80, by - 3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK; for (let k = 0; k < 3; k++) { ctx.fillRect(74 + k * 4, by - 40 + k * 12, 6, 2); }
      // wheels
      this._wheel(ctx, -40, -22, 25);
      this._wheel(ctx, 36, -16, 16);
      // fenders
      ctx.fillStyle = '#d23f37';
      ctx.beginPath(); ctx.arc(-40, -22, 30, PI * 1.05, PI * 1.95); ctx.lineTo(-10, -22); ctx.lineTo(-70, -22); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    _wheel(ctx, x, y, r) {
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = '#262a33'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.rotate(this.wheel * (22 / r));
      ctx.strokeStyle = '#4b5263'; ctx.lineWidth = r * 0.16;
      for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78); ctx.lineTo(Math.cos(a + 0.2) * r * 0.97, Math.sin(a + 0.2) * r * 0.97); ctx.stroke(); }
      ctx.fillStyle = '#f2b134'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#bd7d0b'; for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, r * 0.06, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
  }
  SD.Tractor = Tractor;

  // ======================= pine tree =======================
  const BAUBLE_COLS = ['#e2413b', '#f2b134', '#3c7fd8', '#c0c8d4', '#9a57c9', '#22a6cc', '#ff8fb3', '#2f9e5f'];
  const BULB_COLS = ['#ff5a5a', '#ffd43b', '#4dabf7', '#69db7c', '#ff922b', '#f783ac'];

  class PineTree extends Prop {
    constructor(world, x, lane, seed, height = 330) {
      super(world, x, lane);
      this.Ht = height;
      this.rng = SD.mulberry(seed >>> 0);
      this.angle = 0; // 0 upright, -PI/2 lying (top to the left)
      this.wob = new SD.Spring(0, 70, 3.5);
      this.sink = 0; this.follow = false;
      this.pivot = 'base';
      this.tiers = [];
      const n = 6;
      for (let i = 0; i < n; i++) {
        const top = -this.Ht + i * this.Ht * 0.135 - (i === 0 ? 0 : 8);
        const bottom = -this.Ht + (i + 1) * this.Ht * 0.135 + this.Ht * 0.11 + i * 2;
        const hw = 26 + i * 20 + this.rng() * 4;
        const sc = 3 + Math.floor(i * 0.8);
        this.tiers.push({ top, bottom: Math.min(bottom, -26), hw, sc, jit: Array.from({ length: sc + 1 }, () => this.rng()) });
      }
      // decoration anchors (tree-local)
      this.baubles = [];
      const rows = [0.22, 0.34, 0.46, 0.58, 0.7, 0.81];
      let k = 0;
      for (let r = 0; r < rows.length; r++) {
        const v = rows[r];
        const y = -this.Ht + v * (this.Ht - 30);
        const hw = this.halfWidthAt(y) * 0.78;
        const cnt = 1 + Math.floor(r * 0.7);
        for (let j = 0; j < cnt; j++) {
          const u = cnt === 1 ? (this.rng() - 0.5) * 0.4 : -1 + (2 * (j + 0.5)) / cnt + (this.rng() - 0.5) * 0.25;
          this.baubles.push({ x: u * hw, y: y + 6 + this.rng() * 10, col: BAUBLE_COLS[k++ % BAUBLE_COLS.length], placed: false, sw: new SD.Spring(0, 30, 1.2), r: 7 + this.rng() * 2.5, shape: this.rng() < 0.2 ? 'drop' : 'ball' });
        }
      }
      // light garlands
      this.garlands = [];
      const gl = [0.3, 0.5, 0.7, 0.88];
      for (let i = 0; i < gl.length; i++) {
        const y1 = -this.Ht + gl[i] * (this.Ht - 30) - 14, y2 = y1 + 34;
        const x1 = -this.halfWidthAt(y1) * 0.92, x2 = this.halfWidthAt(y2) * 0.92;
        const pts = [];
        const len = Math.hypot(x2 - x1, y2 - y1);
        const nb = Math.max(4, Math.floor(len / 17));
        for (let b = 0; b <= nb; b++) {
          const u = b / nb;
          const px = lerp(x1, x2, u), py = lerp(y1, y2, u) + Math.sin(u * PI) * 18;
          pts.push({ x: px, y: py, col: BULB_COLS[(b + i * 2) % BULB_COLS.length], ph: this.rng() * 10 });
        }
        this.garlands.push({ pts, reveal: 0, x1, y1, x2, y2 });
      }
      this.star = { placed: false, glow: 0 };
      this.lights = 0; // 0..1 cascade
      this.snowShed = 0;
    }
    halfWidthAt(y) {
      // approximate silhouette half-width at local y (negative up)
      const v = clamp((y + this.Ht) / (this.Ht - 26), 0, 1);
      return 8 + v * (this.tiers[this.tiers.length - 1].hw - 4);
    }
    baubleWorld(b) { return this.localToWorld(b.x, b.y); }
    localToWorld(lx, ly) {
      const a = this.angle + this.wob.x;
      const c = Math.cos(a), s = Math.sin(a);
      return [this.x + lx * c - ly * s, this.y + this.sink + lx * s + ly * c];
    }
    update(dt) {
      this.t += dt;
      if (this.follow) this.y = this.world.surfaceY(this.x) + this.lane;
      this.wob.step(0, dt);
      for (const b of this.baubles) if (b.placed) b.sw.step(-this.wob.v * 0.4, dt);
      if (this.star.placed) this.star.glow = damp(this.star.glow, this.lights > 0.5 ? 1 : 0.25, 2, dt);
    }
    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.translate(this.x, this.y + this.sink);
      ctx.rotate(this.angle + this.wob.x);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      // trunk
      ctx.fillStyle = '#8a5a34'; ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(-13, 4); ctx.lineTo(-11, -40); ctx.lineTo(11, -40); ctx.lineTo(13, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(-3, -30); ctx.moveTo(5, 0); ctx.lineTo(4, -24); ctx.stroke();
      // tiers bottom-up
      for (let i = this.tiers.length - 1; i >= 0; i--) this._tier(ctx, this.tiers[i], i);
      // garlands (lights)
      for (let gi = 0; gi < this.garlands.length; gi++) this._garland(ctx, this.garlands[gi], gi);
      // baubles
      for (const b of this.baubles) if (b.placed) this._bauble(ctx, b.x, b.y, b);
      // star
      if (this.star.placed) {
        const sy = -this.Ht - 10;
        if (this.star.glow > 0.05) {
          ctx.globalCompositeOperation = 'lighter';
          const gs = 70 + 40 * this.star.glow + Math.sin(this.t * 3) * 6;
          ctx.globalAlpha = this.alpha * this.star.glow;
          ctx.drawImage(SD.glowFor('#ffd75e'), -gs, sy - gs, gs * 2, gs * 2);
          ctx.globalAlpha = this.alpha;
          ctx.globalCompositeOperation = 'source-over';
        }
        drawStar(ctx, 0, sy, 21, this.t, this.star.glow);
      }
      ctx.restore();
    }
    _tier(ctx, T, i) {
      const { top, bottom, hw, sc, jit } = T;
      const path = new Path2D();
      path.moveTo(0, top);
      path.bezierCurveTo(hw * 0.25, top + (bottom - top) * 0.3, hw * 0.75, bottom - (bottom - top) * 0.25, hw, bottom - 2);
      // scalloped bottom edge, right to left
      for (let k = sc; k > 0; k--) {
        const xa = -hw + (2 * hw * k) / sc, xb = -hw + (2 * hw * (k - 1)) / sc;
        const dip = 7 + jit[k] * 5;
        path.quadraticCurveTo((xa + xb) / 2, bottom + dip, xb, bottom - 2 + (k === 1 ? 0 : jit[k] * 3));
      }
      path.bezierCurveTo(-hw * 0.75, bottom - (bottom - top) * 0.25, -hw * 0.25, top + (bottom - top) * 0.3, 0, top);
      path.closePath();
      const g = ctx.createLinearGradient(-hw, 0, hw, 0);
      g.addColorStop(0, '#2f8a5f'); g.addColorStop(0.55, '#226e4b'); g.addColorStop(1, '#17543a');
      ctx.fillStyle = g; ctx.fill(path);
      // needle texture
      ctx.save(); ctx.clip(path);
      ctx.strokeStyle = 'rgba(10,40,25,0.28)'; ctx.lineWidth = 1.3;
      for (let k = 0; k < 7 + i * 2; k++) {
        const u = (k + 0.5) / (7 + i * 2);
        const x = lerp(-hw * 0.9, hw * 0.9, u);
        ctx.beginPath(); ctx.moveTo(x * 0.3, top + (bottom - top) * 0.35); ctx.quadraticCurveTo(x * 0.8, bottom - 10, x, bottom + 2); ctx.stroke();
      }
      // snow cap along the top of the tier
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-hw * 1.2, top - 20);
      ctx.lineTo(hw * 1.2, top - 20);
      const capY = top + (bottom - top) * (0.32 + (i % 2) * 0.05);
      for (let k = 6; k >= 0; k--) {
        const x = lerp(-hw, hw, k / 6);
        const yy = capY + Math.abs(x) * 0.55 * ((bottom - top) / hw) * 0.38 + Math.sin(k * 2.3 + i) * 3;
        ctx.lineTo(x, Math.min(yy, bottom - 6));
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(path);
      // snow dabs on scallop tips
      ctx.fillStyle = '#ffffff';
      for (let k = 1; k < sc; k++) {
        const x = -hw + (2 * hw * k) / sc;
        ctx.beginPath(); ctx.ellipse(x, bottom - 3, 5 + jit[k] * 3, 2.6, 0, 0, TAU); ctx.fill();
      }
    }
    _garland(ctx, G, gi) {
      if (G.reveal <= 0) return;
      const pts = G.pts, n = pts.length;
      const m = Math.max(1, Math.round((n - 1) * G.reveal));
      ctx.strokeStyle = '#1d3b2b'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i <= m; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      for (let i = 0; i <= m; i++) {
        const b = pts[i];
        const lit = this.lights > 0 ? clamp(this.lights * (n + 4) * 1.0 - i * 0.35 - gi * 1.1, 0, 1) : 0;
        const tw = 0.75 + 0.25 * Math.sin(this.t * (2 + (b.ph % 1) * 3) + b.ph);
        if (lit > 0.02) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = this.alpha * lit * tw * 0.85;
          ctx.drawImage(SD.glowFor(b.col), b.x - 15, b.y + 1 - 15, 30, 30);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = this.alpha;
        }
        ctx.save(); ctx.translate(b.x, b.y + 4); ctx.rotate(Math.sin(i * 1.7) * 0.3);
        ctx.fillStyle = '#3d4a3f'; ctx.fillRect(-1.8, -4.5, 3.6, 3);
        ctx.fillStyle = lit > 0.3 ? SD.shade(b.col, 0.25 * tw) : SD.shade(b.col, -0.45);
        ctx.beginPath(); ctx.ellipse(0, 1.5, 3, 4.3, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.stroke();
        if (lit > 0.3) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(-0.8, 0, 1, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
    }
    _bauble(ctx, x, y, b) {
      ctx.save();
      ctx.translate(x, y - 6);
      ctx.rotate(b.sw.x);
      ctx.strokeStyle = '#d9c27a'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 6); ctx.stroke();
      drawBauble(ctx, 0, 6 + b.r, b.r, b.col, b.shape, this.lights);
      ctx.restore();
    }
  }
  SD.PineTree = PineTree;

  function drawBauble(ctx, x, y, r, col, shape = 'ball', shine = 0) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#c9a43c'; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
    ctx.beginPath(); SD.rrect(ctx, -r * 0.35, -r - 3, r * 0.7, 4, 1); ctx.fill(); ctx.stroke();
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r * 1.1);
    g.addColorStop(0, SD.shade(col, 0.55)); g.addColorStop(0.45, col); g.addColorStop(1, SD.shade(col, -0.45));
    ctx.fillStyle = g;
    ctx.beginPath();
    if (shape === 'drop') { ctx.moveTo(0, -r); ctx.bezierCurveTo(r * 1.1, -r * 0.4, r * 0.7, r * 0.7, 0, r * 1.5); ctx.bezierCurveTo(-r * 0.7, r * 0.7, -r * 1.1, -r * 0.4, 0, -r); }
    else ctx.arc(0, 0, r, 0, TAU);
    ctx.fill(); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 0.3, 0, 0.2, PI - 0.2); ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.75 + shine * 0.25})`;
    ctx.beginPath(); ctx.ellipse(-r * 0.38, -r * 0.42, r * 0.22, r * 0.14, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  SD.drawBauble = drawBauble;

  function drawStar(ctx, x, y, r, t, glow) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 1.5) * 0.06);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -PI / 2 + (i * PI) / 5, rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(-r * 0.2, -r * 0.3, 1, 0, 0, r);
    g.addColorStop(0, '#fff6b8'); g.addColorStop(0.5, '#ffd43b'); g.addColorStop(1, '#f0a30a');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.5 + glow * 0.4})`;
    ctx.beginPath(); ctx.ellipse(-r * 0.22, -r * 0.3, r * 0.16, r * 0.1, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  SD.drawStar = drawStar;

  // ======================= small props =======================
  class DecoBox extends Prop {
    constructor(world, x, lane) { super(world, x, lane); this.w = 46; this.h = 28; }
    draw(ctx) {
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y);
      ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      // baubles peeking out
      const cols = ['#e2413b', '#f2b134', '#3c7fd8', '#9a57c9'];
      for (let k = 0; k < 4; k++) drawBauble(ctx, -14 + k * 9.5, -this.h - 1 + (k % 2) * 3, 6, cols[k]);
      ctx.fillStyle = '#c99a5b';
      ctx.beginPath(); ctx.rect(-this.w / 2, -this.h, this.w, this.h); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#b5864a';
      ctx.beginPath(); ctx.moveTo(-this.w / 2, -this.h); ctx.lineTo(-this.w / 2 - 9, -this.h - 9); ctx.lineTo(-this.w / 2 + 6, -this.h - 7); ctx.lineTo(-this.w / 2 + 8, -this.h); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(this.w / 2, -this.h); ctx.lineTo(this.w / 2 + 9, -this.h - 9); ctx.lineTo(this.w / 2 - 6, -this.h - 7); ctx.lineTo(this.w / 2 - 8, -this.h); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e2413b'; ctx.fillRect(-this.w / 2 + 1, -this.h * 0.55, this.w - 2, 4);
      ctx.restore();
    }
  }
  SD.DecoBox = DecoBox;

  class Gift extends Prop {
    constructor(world, x, lane, col, rib, w = 30, h = 24) { super(world, x, lane); this.col = col; this.rib = rib; this.w = w; this.h = h; this.pop = 0; }
    draw(ctx) {
      const s = SD.backOut(Math.min(1, this.pop));
      if (s <= 0) return;
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y); ctx.scale(s, s);
      drawGift(ctx, this.w, this.h, this.col, this.rib);
      ctx.restore();
    }
  }
  function drawGift(ctx, w, h, col, rib) {
    ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.fillStyle = col; ctx.beginPath(); ctx.rect(-w / 2, -h, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = SD.shade(col, -0.15); ctx.fillRect(-w / 2 + 1, -h + 1, w * 0.18, h - 2);
    ctx.fillStyle = rib; ctx.fillRect(-3, -h, 6, h); ctx.strokeRect(-3, -h, 6, h);
    ctx.beginPath(); SD.rrect(ctx, -w / 2 - 2, -h - 6, w + 4, 7, 2); ctx.fillStyle = col; ctx.fill(); ctx.stroke();
    ctx.fillStyle = rib; ctx.fillRect(-3, -h - 6, 6, 7);
    ctx.beginPath(); ctx.ellipse(-6, -h - 10, 6, 4, -0.5, 0, TAU); ctx.ellipse(6, -h - 10, 6, 4, 0.5, 0, TAU); ctx.fill(); ctx.stroke();
  }
  SD.Gift = Gift; SD.drawGift = drawGift;

  class SwitchBox extends Prop {
    constructor(world, x, lane, tree) { super(world, x, lane); this.tree = tree; this.on = 0; this.press = 0; }
    draw(ctx) {
      ctx.save(); ctx.globalAlpha = this.alpha;
      // cable to trunk
      const tx = this.tree.x, ty = this.tree.y - 4;
      ctx.strokeStyle = '#2f3b33'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(this.x, this.y - 6); ctx.quadraticCurveTo((this.x + tx) / 2, Math.max(this.y, ty) + 8, tx, ty); ctx.stroke();
      ctx.translate(this.x, this.y);
      ctx.fillStyle = '#7d8696'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); SD.rrect(ctx, -12, -18, 24, 18, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = this.on ? '#69db7c' : '#e2413b';
      ctx.beginPath(); ctx.ellipse(0, -18 - 2 + this.press * 2, 6, 3.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
  SD.SwitchBox = SwitchBox;

  // ======================= candy canes =======================
  function drawCane(ctx, len = 100, hookR = 14, w = 8, hookDir = 1) {
    // origin = bottom of shaft; grows upward; hook curls toward hookDir
    const path = new Path2D();
    path.moveTo(0, 0); path.lineTo(0, -len + hookR);
    if (hookDir > 0) path.arc(-hookR, -len + hookR, hookR, 0, -PI * 0.92, true); // curls over to the left
    else path.arc(hookR, -len + hookR, hookR, PI, PI * 1.92, false); // curls over to the right
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = w + 3.2; ctx.stroke(path);
    ctx.strokeStyle = '#fffaf2'; ctx.lineWidth = w; ctx.stroke(path);
    ctx.lineCap = 'butt';
    ctx.setLineDash([w * 0.8, w * 0.9]);
    ctx.strokeStyle = '#e03143'; ctx.lineWidth = w; ctx.stroke(path);
    ctx.setLineDash([w * 0.25, w * 1.45]); ctx.lineDashOffset = -w * 0.95;
    ctx.strokeStyle = '#4caf6a'; ctx.stroke(path);
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = w * 0.22;
    ctx.save(); ctx.translate(-w * 0.22, 0); ctx.stroke(path); ctx.restore();
  }
  SD.drawCane = drawCane;

  class Cane extends Prop {
    constructor(world, x, lane, len = 100, hookDir = 1) { super(world, x, lane); this.len = len; this.hookDir = hookDir; this.depth = 0; this.wob = new SD.Spring(0, 80, 4); this.sparkle = 0; }
    update(dt) { super.update(dt); this.wob.step(0, dt); }
    draw(ctx) {
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y + this.depth); ctx.rotate(this.rot + this.wob.x);
      drawCane(ctx, this.len, 14, 8, this.hookDir);
      ctx.restore();
    }
  }
  SD.Cane = Cane;

  // horizontal bar held between two hands (limbo)
  // a limbo bar between two holders' front flippers. It can be drawn in parts (u0..u1 along it),
  // each part at its own depth, so a bar reaching from a near holder to a far one passes in front of
  // whoever is nearer the far end and behind whoever is nearer the near end.
  class Bar extends Prop {
    constructor(world, a, b, u0 = 0, u1 = 1) { super(world, 0, 20); this.a = a; this.b = b; this.u0 = u0; this.u1 = u1; this.follow = false; }
    update(dt) { this.t += dt; const [a, b] = this.ends(); this.x = lerp(a[0], b[0], (this.u0 + this.u1) / 2); }
    ends() { return [this.a.handWorld('F'), this.b.handWorld('F')]; }
    // the point on the bar at a given depth (lane), and its shadow on the snow
    atLane(lane) {
      const [ha, hb] = this.ends();
      const u = clamp((this.a.lane - lane) / ((this.a.lane - this.b.lane) || 1), 0, 1);
      return [lerp(ha[0], hb[0], u), lerp(ha[1], hb[1], u)];
    }
    drawShadow(ctx) {
      if (this.u0 > 0) return; // one shadow per bar
      const [ha, hb] = this.ends(), w = this.world;
      ctx.save(); ctx.globalAlpha = 0.14 * this.alpha; ctx.strokeStyle = '#1b2a44'; ctx.lineCap = 'round'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(ha[0], w.surfaceY(ha[0]) + this.a.lane); ctx.lineTo(hb[0], w.surfaceY(hb[0]) + this.b.lane); ctx.stroke();
      ctx.restore();
    }
    draw(ctx) {
      const [ha, hb] = this.ends();
      const len = Math.hypot(hb[0] - ha[0], hb[1] - ha[1]);
      const p0 = [lerp(ha[0], hb[0], this.u0), lerp(ha[1], hb[1], this.u0)];
      const segLen = len * (this.u1 - this.u0);
      ctx.save(); ctx.globalAlpha = this.alpha;
      ctx.translate(p0[0], p0[1]); ctx.rotate(Math.atan2(hb[1] - ha[1], hb[0] - ha[0]) + PI / 2);
      // a straight cane (no hook) along -y; round ends only where the bar really ends
      const path = new Path2D(); path.moveTo(0, 0); path.lineTo(0, -segLen);
      ctx.lineCap = 'butt';
      ctx.strokeStyle = INK; ctx.lineWidth = 9.5; ctx.stroke(path);
      ctx.strokeStyle = '#fffaf2'; ctx.lineWidth = 6.5; ctx.stroke(path);
      ctx.setLineDash([6, 7]); ctx.lineDashOffset = this.u0 * len; ctx.strokeStyle = '#e03143'; ctx.stroke(path); ctx.setLineDash([]);
      for (const [end, y] of [[this.u0 === 0, 0], [this.u1 === 1, -segLen]]) {
        if (!end) continue;
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, y, 4.75, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fffaf2'; ctx.beginPath(); ctx.arc(0, y, 3.25, 0, TAU); ctx.fill();
      }
      ctx.restore();
      // a holder standing behind this part of the bar still grips it: redraw their flipper over it
      if (this.u0 === 0 && this.a.lane < this.lane) this.a.drawFlipper(ctx, 'F');
      if (this.u1 === 1 && this.b.lane < this.lane) this.b.drawFlipper(ctx, 'F');
    }
  }
  SD.Bar = Bar;

  // ======================= ladder =======================
  class Ladder extends Prop {
    constructor(world, ax, ay, bx, by, lane = 4) {
      super(world, ax, lane); this.follow = false;
      this.ax = ax; this.ay = ay; this.bx = bx; this.by = by; this.show = 1; this.col = '#d39a55';
      this.overlap = 0;     // extra length drawn below the base (a ladder stacked on another overlaps it)
      this.stacked = false; // casts a shadow on what's behind it and is lashed at the joint
    }
    point(u) { return [lerp(this.ax, this.bx, u), lerp(this.ay, this.by, u)]; }
    get len() { return Math.hypot(this.bx - this.ax, this.by - this.ay); }
    draw(ctx) {
      if (this.show <= 0) return;
      const L = this.len * this.show;
      ctx.save(); ctx.globalAlpha = this.alpha;
      ctx.translate(this.ax, this.ay);
      ctx.rotate(Math.atan2(this.by - this.ay, this.bx - this.ax) + PI / 2);
      SD.drawLadder(ctx, L, this.col, { from: this.overlap, shadow: this.stacked, lash: this.stacked ? this.overlap : 0 });
      ctx.restore();
    }
  }
  // a ladder along local -y from `from` (below the base) up to -L
  SD.drawLadder = function (ctx, L, col, o = {}) {
    const W = 11, y0 = o.from || 0, light = SD.shade(col, 0.22), dark = SD.shade(col, -0.25);
    ctx.save();
    ctx.lineCap = 'round';
    if (o.shadow) {
      // the stacked ladder throws a soft shadow onto the one below
      ctx.save();
      ctx.strokeStyle = 'rgba(20,30,50,0.28)'; ctx.lineWidth = 7;
      ctx.translate(4, 3);
      ctx.beginPath(); for (const sx of [-W, W]) { ctx.moveTo(sx, y0 + 2); ctx.lineTo(sx, -L); } ctx.stroke();
      ctx.lineWidth = 4; ctx.beginPath(); for (let d = 10 - y0; d < L - 2; d += 13) { ctx.moveTo(-W, -d); ctx.lineTo(W, -d); } ctx.stroke();
      ctx.restore();
    }
    // rungs (behind the rails), lit on top and shaded underneath
    for (let d = 10 - y0; d < L - 2; d += 13) {
      ctx.lineWidth = 4.6; ctx.strokeStyle = '#151b2b'; ctx.beginPath(); ctx.moveTo(-W, -d); ctx.lineTo(W, -d); ctx.stroke();
      ctx.lineWidth = 2.4; ctx.strokeStyle = '#e8b97a'; ctx.stroke();
      ctx.lineWidth = 0.9; ctx.strokeStyle = 'rgba(255,240,215,0.8)'; ctx.beginPath(); ctx.moveTo(-W + 2, -d - 0.7); ctx.lineTo(W - 2, -d - 0.7); ctx.stroke();
    }
    // rails, with a highlight edge and a shadow edge
    for (const sx of [-W, W]) {
      ctx.lineWidth = 6.6; ctx.strokeStyle = '#151b2b'; ctx.beginPath(); ctx.moveTo(sx, y0 + 2); ctx.lineTo(sx, -L); ctx.stroke();
      ctx.lineWidth = 3.8; ctx.strokeStyle = col; ctx.stroke();
      ctx.lineWidth = 1.2; ctx.strokeStyle = light; ctx.beginPath(); ctx.moveTo(sx - 1, y0); ctx.lineTo(sx - 1, -L + 1); ctx.stroke();
      ctx.strokeStyle = dark; ctx.beginPath(); ctx.moveTo(sx + 1.2, y0); ctx.lineTo(sx + 1.2, -L + 1); ctx.stroke();
    }
    // rope lashing where it's tied onto the ladder below
    if (o.lash) {
      ctx.strokeStyle = '#f1e2b8'; ctx.lineWidth = 2;
      for (const sx of [-W, W]) for (const y of [y0 - 6, 6]) {
        ctx.beginPath();
        for (let k = 0; k < 3; k++) { ctx.moveTo(sx - 4.5, y - k * 3); ctx.lineTo(sx + 4.5, y - k * 3 - 2); }
        ctx.stroke();
      }
    }
    ctx.restore();
  };
  SD.Ladder = Ladder;

  // ======================= sled / toboggan =======================
  class Sled extends Prop {
    constructor(world, x, lane, long = false) {
      super(world, x, lane); this.long = long; this.L = long ? 150 : 74; this.ang = 0;
      this.vx = 0; this.vy = 0; this.air = false; this.riding = false; this.riders = []; this.held = null; this.spin = 0; this.follow = true;
      this.landed = null;
    }
    // physics: slide along the heightmap surface
    physics(dt) {
      const w = this.world, g = 1100;
      if (!this.air) {
        const sl = w.slopeAt(this.x); // dy/dx
        const ang = Math.atan(sl);
        this.ang = SD.angDamp(this.ang, ang, 14, dt);
        const along = Math.cos(ang);
        // tangential acceleration
        let v = this.vx / Math.max(0.2, along);
        v += g * Math.sin(ang) * dt;
        v -= Math.sign(v) * (this.fric ?? 60) * dt;
        if (this.brake) v *= Math.max(0, 1 - this.brake * dt);
        const nx = this.x + v * Math.cos(ang) * dt;
        const ny = w.surfaceY(nx) + this.lane;
        const vy = v * Math.sin(ang);
        // takeoff check: does the ground fall away faster than gravity can follow?
        const ballY = this.y + vy * dt + 0.5 * g * dt * dt;
        if (ny > ballY + 1.5 && Math.abs(v) > 120) {
          this.air = true; this.vx = v * Math.cos(ang); this.vy = vy; this.x = nx; this.y = ballY;
        } else {
          this.vx = v * Math.cos(ang); this.x = nx; this.y = ny;
        }
      } else {
        this.vy += g * dt; this.x += this.vx * dt; this.y += this.vy * dt;
        this.ang = SD.angDamp(this.ang, Math.atan(this.vy / (Math.abs(this.vx) > 1 ? this.vx : 1)) * 0.6, 3, dt);
        const gy = w.surfaceY(this.x) + this.lane;
        if (this.y >= gy && this.vy > 0) {
          this.y = gy; this.air = false;
          const impact = this.vy;
          this.vy = 0; this.vx *= 0.55;
          if (this.landed) this.landed(impact);
        }
      }
    }
    update(dt) {
      this.t += dt;
      if (this.riding) this.physics(dt);
      else if (this.held) { const h = this.held(); this.x = h.x; this.y = h.y; this.ang = h.ang || 0; }
      else if (this.follow) { this.y = this.world.surfaceY(this.x) + this.lane; this.ang = SD.angDamp(this.ang, Math.atan(this.world.slopeAt(this.x)), 10, dt); }
    }
    seat(i = 0) {
      const off = this.long ? (-40 + i * 38) : -4;
      const c = Math.cos(this.ang), s = Math.sin(this.ang);
      const lx = off * this.dirSign(), ly = -9;
      return { x: this.x + lx * c - ly * s, y: this.y + lx * s + ly * c, rot: this.ang };
    }
    dirSign() { return this.facing || 1; }
    draw(ctx) {
      ctx.save(); ctx.globalAlpha = this.alpha;
      ctx.translate(this.x, this.y); ctx.rotate(this.ang); ctx.scale(this.dirSign(), 1);
      drawSled(ctx, this.L, this.long);
      ctx.restore();
    }
  }
  function drawSled(ctx, L, long) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = INK;
    if (long) {
      // toboggan: one curled board
      ctx.fillStyle = '#c98a4b'; ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-L / 2, -2); ctx.lineTo(L / 2 - 14, -2);
      ctx.bezierCurveTo(L / 2 + 8, -2, L / 2 + 14, -26, L / 2 - 2, -30);
      ctx.bezierCurveTo(L / 2 - 10, -31, L / 2 - 12, -24, L / 2 - 6, -22);
      ctx.bezierCurveTo(L / 2 + 2, -20, L / 2 + 2, -8, L / 2 - 14, -8);
      ctx.lineTo(-L / 2, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-L / 2 + 4, -5); ctx.lineTo(L / 2 - 16, -5); ctx.stroke();
      ctx.strokeStyle = '#e2413b'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(-L / 2 + 6, -10); ctx.quadraticCurveTo(0, -16, L / 2 - 10, -12); ctx.stroke();
      return;
    }
    // runners
    ctx.strokeStyle = INK; ctx.lineWidth = 5;
    const runner = new Path2D();
    runner.moveTo(-L / 2, 0); runner.lineTo(L / 2 - 10, 0); runner.bezierCurveTo(L / 2 + 6, 0, L / 2 + 8, -18, L / 2 - 4, -18);
    ctx.stroke(runner);
    ctx.strokeStyle = '#d23f37'; ctx.lineWidth = 2.6; ctx.stroke(runner);
    // struts
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    for (const x of [-L / 2 + 10, 0, L / 2 - 18]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, -8); ctx.stroke(); }
    // deck slats
    ctx.fillStyle = '#d9a062';
    ctx.beginPath(); SD.rrect(ctx, -L / 2 - 2, -13, L - 6, 6, 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
    for (let x = -L / 2 + 10; x < L / 2 - 10; x += 12) { ctx.beginPath(); ctx.moveTo(x, -13); ctx.lineTo(x, -7); ctx.stroke(); }
    // rope
    ctx.strokeStyle = '#f2e3c4'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(L / 2 - 4, -18); ctx.quadraticCurveTo(L / 2 + 6, -4, L / 2 - 2, 4); ctx.stroke();
  }
  SD.Sled = Sled; SD.drawSled = drawSled;

  // ======================= held items (penguin-local coordinates) =======================
  SD.items = {
    // shouldered like a marching band: gripped low in the near flipper, in front of the body, leaning
    // back past the side of the head so the hook rests behind it (the flipper is drawn over the grip)
    cane: (len = 96) => ({ at: 'front', draw(ctx, p, hx, hy) { ctx.translate(hx, hy); ctx.rotate(-0.42 + Math.sin(p.phase) * 0.03); ctx.translate(0, 16); drawCane(ctx, len, 13, 8, 1); } }),
    baton: () => ({ at: 'front', draw(ctx, p, hx, hy, a) {
      ctx.translate(hx, hy); ctx.rotate(p.t * 9);
      ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 5.5; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.stroke();
      ctx.strokeStyle = '#fffaf2'; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#e03143'; ctx.stroke(); ctx.setLineDash([]);
      for (const x of [-27, 27]) { ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(x, 0, 4.5, 0, TAU); ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = INK; ctx.stroke(); }
    } }),
    drum: () => ({ at: 'front', draw(ctx, p, hx, hy, a) {
      // drum sits on the belly; sticks in both flippers
      ctx.save(); ctx.translate(8, -30);
      ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
      ctx.fillStyle = '#e2413b'; ctx.beginPath(); ctx.moveTo(-20, -8); ctx.lineTo(-20, 12); ctx.ellipse(0, 12, 20, 6, 0, PI, 0, true); ctx.lineTo(20, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#ffd43b'; ctx.lineWidth = 2; ctx.beginPath();
      for (let k = 0; k <= 5; k++) { const x = -20 + k * 8; ctx.lineTo(x, k % 2 ? 10 : -6); } ctx.stroke();
      ctx.fillStyle = '#fbf3e4'; ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.ellipse(0, -8, 20, 6, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.lineCap = 'round';
      for (const [k, which] of [[p.p.aF, 'F'], [p.p.aB, 'B']]) {
        const piv = which === 'F' ? [-20, -58] : [22, -58];
        const x = piv[0] - Math.sin(k) * 30, y = piv[1] + Math.cos(k) * 30;
        ctx.strokeStyle = INK; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 18, y - 10); ctx.stroke();
        ctx.strokeStyle = '#e9c48f'; ctx.lineWidth = 1.8; ctx.stroke();
        ctx.fillStyle = '#e9c48f'; ctx.beginPath(); ctx.arc(x + 18, y - 10, 2.6, 0, TAU); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
      }
    } }),
    bauble: (col, shape) => ({ at: 'front', draw(ctx, p, hx, hy) { drawBauble(ctx, hx + 2, hy + 9, 7.5, col, shape); } }),
    star: () => ({ at: 'up', draw(ctx, p) { drawStar(ctx, 0, -146, 20, p.t, 0.3); } }),
    gift: (col, rib) => ({ at: 'up', draw(ctx, p) { ctx.translate(0, -127); drawGift(ctx, 30, 22, col, rib); } }),
    giftFront: (col, rib) => ({ at: 'front', draw(ctx, p, hx, hy) { ctx.translate(hx + 6, hy + 14); drawGift(ctx, 26, 20, col, rib); } }),
    box: () => ({ at: 'up', draw(ctx) { ctx.translate(0, -128); ctx.fillStyle = '#c99a5b'; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(-26, -24, 52, 24); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#e2413b'; ctx.fillRect(-25, -14, 50, 4); } }),
    block: () => ({ at: 'up', draw(ctx) { ctx.translate(0, -127); drawBlock(ctx, 30, 20); } }),
    blockFront: () => ({ at: 'front', draw(ctx, p, hx, hy) { ctx.translate(hx + 4, hy + 12); drawBlock(ctx, 26, 18); } }),
    shovel: (col = '#4a7fd6') => ({ at: 'front', full: 0, draw(ctx, p, hx, hy, a) {
      ctx.translate(hx, hy); ctx.rotate(a);
      ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, 40); ctx.stroke();
      ctx.strokeStyle = '#c98a4b'; ctx.lineWidth = 2.6; ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.fillStyle = '#e9c48f'; ctx.beginPath(); SD.rrect(ctx, -6, -19, 12, 6, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-11, 40); ctx.lineTo(11, 40); ctx.lineTo(9, 62); ctx.quadraticCurveTo(0, 66, -9, 62); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (this.full > 0.05) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 52, 11 * this.full, 9 * this.full, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(110,140,190,0.6)'; ctx.lineWidth = 1; ctx.stroke(); }
    } }),
    poles: () => ({ at: 'front', draw(ctx, p) {
      ctx.lineCap = 'round';
      for (const [k, which] of [[p.p.aB, 'B'], [p.p.aF, 'F']]) {
        const piv = which === 'F' ? [-20, -58] : [22, -58];
        const x = piv[0] - Math.sin(k) * 28, y = piv[1] + Math.cos(k) * 28;
        const ex = x - 30, ey = 4;
        ctx.strokeStyle = INK; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = '#c0c8d4'; ctx.lineWidth = 1.8; ctx.stroke();
        ctx.fillStyle = '#e2413b'; ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(ex + 3, ey - 6, 5, 1.8, 0.3, 0, TAU); ctx.fill(); ctx.stroke();
      }
    } }),
    snowball: () => ({ at: 'front', draw(ctx, p, hx, hy) { ctx.beginPath(); ctx.arc(hx + 3, hy + 6, 8, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = 'rgba(110,140,190,0.8)'; ctx.lineWidth = 1.5; ctx.stroke(); } }),
    // tucked under the flipper and carried level, the hand gripping a rung
    ladder: (col = '#d39a55') => ({ at: 'front', draw(ctx, p, hx, hy) {
      ctx.save(); ctx.translate(hx - 76, hy + 1); ctx.rotate(PI / 2); SD.drawLadder(ctx, 150, col); ctx.restore();
    } }),
    // strapped across the back while climbing another ladder
    ladderBack: (col = '#c9884a') => ({ at: 'back', draw(ctx) {
      ctx.save(); ctx.translate(-24, -22); ctx.rotate(-0.32); SD.drawLadder(ctx, 122, col); ctx.restore();
    } }),
    sledUp: () => ({ at: 'up', draw(ctx) { ctx.translate(0, -128); drawSled(ctx, 70, false); } }),
  };
  function drawBlock(ctx, w, h) {
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(100,130,180,0.9)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); SD.rrect(ctx, -w / 2, -h, w, h, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(190,212,240,0.6)'; ctx.fillRect(-w / 2 + 2, -4, w - 4, 3);
  }
  SD.drawBlock = drawBlock;

  // gear drawn under the feet (skis/skates)
  SD.drawGear = function (ctx, p) {
    if (!p.gear) return;
    ctx.save();
    ctx.lineCap = 'round'; ctx.strokeStyle = INK;
    if (p.gear === 'skis') {
      for (const [fx, col] of [[9 + p.p.fBx, SD.shade(p.pal.hat, -0.2)], [-7 + p.p.fFx, p.pal.hat]]) {
        ctx.save(); ctx.translate(fx, 1.5);
        ctx.lineWidth = 5.6; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(38, 0); ctx.quadraticCurveTo(48, 0, 50, -8); ctx.stroke();
        ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.stroke(); ctx.strokeStyle = INK;
        ctx.restore();
      }
    } else if (p.gear === 'skates') {
      for (const [fx, fy] of [[9 + p.p.fBx, p.p.fBy], [-7 + p.p.fFx, p.p.fFy]]) {
        ctx.save(); ctx.translate(fx, fy);
        ctx.fillStyle = '#ffffff'; ctx.lineWidth = 1.8; ctx.beginPath(); SD.rrect(ctx, -9, -8, 22, 8, 3); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#7d8696'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-10, 4); ctx.lineTo(14, 4); ctx.quadraticCurveTo(18, 4, 17, 0); ctx.stroke();
        ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-6, 4); ctx.moveTo(9, 0); ctx.lineTo(9, 4); ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  };
})();
