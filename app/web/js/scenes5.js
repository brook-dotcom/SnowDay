// Snow Day — scenes 5: the Gingerbread Bake-Off, a TV cooking contest the crew builds the set for
'use strict';
(function () {
  const { clamp, lerp, damp, TAU, hash } = SD;
  const PI = Math.PI;
  const INK = '#151b2b';
  const BH = 30, BW = 170; // kitchen bench: worktop height and width
  const COOKIE = '#c47a35', COOKIE_EDGE = '#5e3313', ICING = '#ffffff';
  const byKind = (list, k) => list.find((p) => p.kind === k);

  // ======================= the gingerbread man =======================
  // feet at 0,0, about 37 tall, drawn front-on (the classic cookie shape)
  // g: arm and leg angles from straight down (aF/aB, lF/lB), col, edge, face
  function drawGM(ctx, g = {}) {
    const col = g.col || COOKIE, edge = g.edge || COOKIE_EDGE, face = g.face !== false;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // one cookie: limbs, body and head are a single shape, outlined once around the outside
    const limbs = [[-4, -10, g.lF ?? -0.3, 10.5], [4, -10, g.lB ?? 0.3, 10.5], [-7, -20, g.aF ?? -1.25, 9.5], [7, -20, g.aB ?? 1.25, 9.5]]
      .map(([x0, y0, a, len]) => [x0, y0, x0 + Math.sin(a) * len, y0 + Math.cos(a) * len, a]);
    const shape = (fill, lw) => {
      ctx.strokeStyle = fill; ctx.fillStyle = fill; ctx.lineWidth = lw;
      for (const [x0, y0, x1, y1] of limbs) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
      ctx.lineWidth = lw - 6.6;
      ctx.beginPath(); ctx.ellipse(0, -15.5, 9.2, 10, 0, 0, TAU); ctx.fill(); if (lw > 6.6) ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -30, 8.4, 0, TAU); ctx.fill(); if (lw > 6.6) ctx.stroke();
    };
    shape(edge, 9.8);
    shape(col, 6.6);
    if (!face) return;
    // icing squiggles across the cuffs
    ctx.strokeStyle = ICING; ctx.lineWidth = 1.2;
    for (const [x0, y0, x1, y1, a] of limbs) {
      const mx = lerp(x0, x1, 0.72), my = lerp(y0, y1, 0.72), nx = Math.cos(a) * 2.6, ny = -Math.sin(a) * 2.6;
      ctx.beginPath(); ctx.moveTo(mx - nx, my - ny); ctx.lineTo(mx + (x1 - x0) * 0.06, my + (y1 - y0) * 0.06); ctx.lineTo(mx + nx, my + ny); ctx.stroke();
    }
    ctx.fillStyle = ICING;
    if (g.wink) { ctx.strokeStyle = ICING; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-4.6, -31); ctx.lineTo(-1.8, -31); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(-3.2, -31, 1.5, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.arc(3.2, -31, 1.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = ICING; ctx.lineWidth = 1.3;
    ctx.beginPath(); if (g.oh) ctx.arc(0, -26, 1.8, 0, TAU); else ctx.arc(0, -27.5, 3.4, 0.25, PI - 0.25); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.strokeStyle = INK;
    ctx.fillStyle = '#e2413b'; ctx.beginPath(); ctx.arc(0, -19.5, 1.9, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2f9e5f'; ctx.beginPath(); ctx.arc(0, -13.5, 1.9, 0, TAU); ctx.fill(); ctx.stroke();
  }
  SD.drawGM = drawGM;

  class GingerMan extends SD.Prop {
    constructor(w, x, lane) {
      super(w, x, lane);
      this.lift = 0; this.facing = 1; this.cyc = 0; this.mode = 'lie'; this.lay = 1;
      this.tx = null; this.tl = lane; this.spd = 200; this.sq = new SD.Spring(0, 170, 9); this.hidden = false;
    }
    runTo(x, lane, spd) { this.tx = x; if (lane != null) this.tl = lane; if (spd) this.spd = spd; if (this.mode !== 'sneak') this.mode = 'run'; }
    arrived() { return this.tx == null; }
    update(dt) {
      this.t += dt;
      if (this.tx != null) {
        const d = this.tx - this.x, st = this.spd * dt * (this.world.speedMul ? this.world.speedMul(this.x) : 1);
        if (Math.abs(d) <= st) { this.x = this.tx; this.tx = null; if (this.mode === 'run') this.mode = 'stand'; }
        else { this.x += Math.sign(d) * st; this.facing = Math.sign(d); this.cyc += st / 8; }
      }
      if (this.mode !== 'hop') this.lane = damp(this.lane, this.tl, 4, dt);
      this.sq.step(0, dt);
      if (this.follow) this.y = this.world.surfaceY(this.x) + this.lane - (this.lift || 0);
    }
    draw(ctx) {
      if (this.hidden) return;
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y);
      const sq = 1 + this.sq.x * 0.03;
      ctx.scale(1 / Math.sqrt(sq), sq);
      const m = this.mode, c = this.cyc, t = this.t;
      let g = {};
      if (this.lay > 0) {
        // lying flat on the bench (seen from just above, so squashed), sitting up as lay -> 0
        ctx.translate(0, -2 * this.lay); ctx.scale(1, 1 - 0.55 * this.lay); ctx.rotate(-this.lay * PI / 2 * this.facing);
        ctx.translate(0, this.lay * 8);
        g = { aF: -1.4, aB: 1.4, lF: -0.3, lB: 0.3, wink: this.lay > 0.9 && (t % 4) < 0.3 };
      } else if (m === 'run' || m === 'sneak') {
        const k = Math.sin(c);
        const sneak = m === 'sneak';
        ctx.translate(0, sneak ? 0 : -Math.abs(Math.cos(c)) * 2.5);
        ctx.rotate(this.facing * (sneak ? 0.05 : 0.16));
        if (sneak) ctx.scale(1, 0.86);
        g = sneak ? { aF: -2.2, aB: 2.2, lF: -0.3 + k * 0.35, lB: 0.3 + k * 0.35 }
          : { aF: -1.0 + k * 0.6, aB: 1.0 + k * 0.6, lF: -0.25 + k * 0.6, lB: 0.25 + k * 0.6, oh: true };
      } else if (m === 'hop') {
        g = { aF: -2.3, aB: 2.3, lF: -0.55, lB: 0.55, oh: true };
      } else if (m === 'pose') {
        const k = Math.sin(t * 3) * 0.12;
        g = { aF: -2.3 + k, aB: 2.3 - k, lF: -0.4, lB: 0.4, wink: (t % 2.6) < 1.2 };
      } else if (m === 'peek') {
        ctx.rotate(-this.facing * 0.35);
        g = { aF: -0.6, aB: 0.7, lF: -0.2, lB: 0.2 };
      } else {
        g = { aF: -1.05 + Math.sin(t * 2) * 0.05, aB: 1.05, lF: -0.3, lB: 0.3 };
      }
      drawGM(ctx, g);
      ctx.restore();
    }
  }

  // ======================= the set =======================
  // the backdrop is a tall printed banner: carried in rolled up, then unrolled from one pole to the other
  class Backdrop extends SD.Prop {
    constructor(w, x, lane, W, H) {
      super(w, x, lane);
      this.W = W; this.H = H; this.xa = x; this.xb = x; this.rolled = 1; this.lights = 0; this.lightFrom = 1;
      this.onAir = 0; this.clock = 0; this.clockOn = false; this.show = 0;
    }
    bbox() { return [this.x - this.W / 2, this.y - this.H - 20, this.x + this.W / 2, this.y]; }
    extent() { return [Math.min(this.xa, this.xb, this.x - this.W / 2), Math.max(this.xa, this.xb, this.x + this.W / 2)]; }
    draw(ctx) {
      if (this.show <= 0) return;
      const W = this.W, H = this.H, top = -H, bot = -4;
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y); ctx.lineJoin = 'round';
      const L = Math.min(this.xa, this.xb) - this.x, R = Math.max(this.xa, this.xb) - this.x;
      if (R - L > 1) {
        ctx.save(); ctx.beginPath(); ctx.rect(L, top - 40, R - L, bot - top + 44); ctx.clip();
        this._face(ctx, W, H, top, bot);
        ctx.restore();
      }
      for (const ex of [this.xa, this.xb]) {
        const x = ex - this.x;
        if (this.rolled > 0.02) {
          // what's still on the roll: a fat cylinder standing on end
          const rr = lerp(5, 15, this.rolled);
          const g = ctx.createLinearGradient(x - rr, 0, x + rr, 0);
          g.addColorStop(0, '#1d3050'); g.addColorStop(0.45, '#3e5f93'); g.addColorStop(1, '#16253f');
          ctx.fillStyle = g; ctx.strokeStyle = INK; ctx.lineWidth = 2;
          ctx.beginPath(); SD.rrect(ctx, x - rr, top - 6, rr * 2, bot - top + 6, rr * 0.6); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(x - rr * 0.3, top); ctx.lineTo(x - rr * 0.3, bot - 4); ctx.stroke();
          ctx.fillStyle = '#e9b949'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, top - 9, 4.5, 0, TAU); ctx.fill(); ctx.stroke();
        } else this._pole(ctx, x, top);
      }
      ctx.restore();
    }
    _pole(ctx, x, top) {
      ctx.fillStyle = '#5b6170'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.ellipse(x, -2, 15, 4.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
      const g = ctx.createLinearGradient(x - 4, 0, x + 4, 0); g.addColorStop(0, '#8d95a5'); g.addColorStop(0.5, '#e8ecf2'); g.addColorStop(1, '#7a8292');
      ctx.fillStyle = g; ctx.beginPath(); ctx.rect(x - 3.5, top - 14, 7, -top + 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e9b949'; ctx.beginPath(); ctx.arc(x, top - 18, 5.5, 0, TAU); ctx.fill(); ctx.stroke();
    }
    _face(ctx, W, H, top, bot) {
      const t = this.t;
      // night-blue studio wall
      const g = ctx.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, '#182a4a'); g.addColorStop(0.7, '#2b4b7c'); g.addColorStop(1, '#3a5f96');
      ctx.fillStyle = g; ctx.fillRect(-W / 2, top, W, bot - top);
      // soft spotlight pools
      for (const sx of [-0.3, 0.3]) {
        const rg = ctx.createRadialGradient(sx * W, bot - 30, 10, sx * W, bot - 30, 170);
        rg.addColorStop(0, 'rgba(255,240,210,0.22)'); rg.addColorStop(1, 'rgba(255,240,210,0)');
        ctx.fillStyle = rg; ctx.fillRect(-W / 2, top, W, bot - top);
      }
      // big paper snowflakes
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineCap = 'round';
      for (let i = 0; i < 12; i++) {
        const fx = (hash(i, 31) - 0.5) * (W - 60), fy = top + 30 + hash(i, 32) * (H - 90), fs = 9 + hash(i, 33) * 13;
        if (Math.abs(fx) < 150 && fy < top + 175) continue; // keep the middle clear for the logo
        ctx.lineWidth = fs > 16 ? 2 : 1.4;
        ctx.save(); ctx.translate(fx, fy); ctx.rotate(hash(i, 34) + Math.sin(t * 0.4 + i) * 0.05);
        for (let k = 0; k < 6; k++) {
          ctx.rotate(PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -fs);
          ctx.moveTo(0, -fs * 0.55); ctx.lineTo(-fs * 0.22, -fs * 0.75); ctx.moveTo(0, -fs * 0.55); ctx.lineTo(fs * 0.22, -fs * 0.75); ctx.stroke();
        }
        ctx.restore();
      }
      // a snowdrift along the bottom of the set
      ctx.fillStyle = '#f4f8ff'; ctx.strokeStyle = 'rgba(120,150,200,0.6)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-W / 2, bot);
      for (let x = -W / 2; x <= W / 2 + 1; x += 20) ctx.lineTo(x, bot - 16 - Math.sin(x * 0.045) * 6 - Math.sin(x * 0.11) * 3);
      ctx.lineTo(W / 2, bot); ctx.closePath(); ctx.fill(); ctx.stroke();
      // the show's emblem: a gold medallion with a gingerbread man, and a ribbon with the title
      const ey = top + 82;
      ctx.fillStyle = '#e9b949'; ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(0, ey, 47, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff4dc'; ctx.beginPath(); ctx.arc(0, ey, 39, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(160,110,30,0.5)'; ctx.lineWidth = 1;
      for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 41, ey + Math.sin(a) * 41); ctx.lineTo(Math.cos(a) * 45, ey + Math.sin(a) * 45); ctx.stroke(); }
      ctx.save(); ctx.translate(0, ey + 30); ctx.scale(1.55, 1.55); drawGM(ctx, { aF: -1.95, aB: 1.95, lF: -0.36, lB: 0.36 }); ctx.restore();
      const ry = ey + 58, rw = 128;
      ctx.fillStyle = '#9e2533'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * (rw - 10), ry - 8); ctx.lineTo(s * (rw + 22), ry - 6); ctx.lineTo(s * (rw + 12), ry + 7); ctx.lineTo(s * (rw + 22), ry + 20); ctx.lineTo(s * (rw - 10), ry + 18); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#c7364a'; ctx.beginPath(); ctx.moveTo(-rw, ry - 15); ctx.quadraticCurveTo(0, ry - 25, rw, ry - 15); ctx.lineTo(rw, ry + 13); ctx.quadraticCurveTo(0, ry + 3, -rw, ry + 13); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3; ctx.strokeStyle = '#5e1620'; ctx.strokeText('BAKE-OFF', 0, ry - 4); ctx.fillStyle = '#fff4dc'; ctx.fillText('BAKE-OFF', 0, ry - 4);
      // the countdown clock
      const kx = W / 2 - 78, ky = top + 74, kr = 30;
      const late = this.clock > 0.85 && this.clock < 1 && (t * 4 % 1) < 0.5;
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = late ? '#e2413b' : INK; ctx.lineWidth = late ? 4 : 2.4;
      ctx.beginPath(); ctx.arc(kx, ky, kr, 0, TAU); ctx.fill(); ctx.stroke();
      if (this.clock > 0) {
        ctx.fillStyle = 'rgba(226,65,59,0.28)'; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.arc(kx, ky, kr - 4, -PI / 2, -PI / 2 + this.clock * TAU); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
      for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; ctx.beginPath(); ctx.moveTo(kx + Math.cos(a) * (kr - 7), ky + Math.sin(a) * (kr - 7)); ctx.lineTo(kx + Math.cos(a) * (kr - 3), ky + Math.sin(a) * (kr - 3)); ctx.stroke(); }
      const ha = -PI / 2 + this.clock * TAU;
      ctx.strokeStyle = '#e2413b'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(kx + Math.cos(ha) * (kr - 6), ky + Math.sin(ha) * (kr - 6)); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(kx, ky, 2.6, 0, TAU); ctx.fill();
      // ON AIR sign
      const ox = -W / 2 + 80, oy = top + 54, on = this.onAir;
      if (on > 0) { ctx.fillStyle = `rgba(255,90,80,${0.22 * on})`; ctx.beginPath(); SD.rrect(ctx, ox - 52, oy - 22, 104, 44, 14); ctx.fill(); }
      ctx.fillStyle = on > 0.5 ? '#e2413b' : '#4a2a30'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); SD.rrect(ctx, ox - 42, oy - 14, 84, 28, 6); ctx.fill(); ctx.stroke();
      ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif'; ctx.fillStyle = on > 0.5 ? '#ffffff' : '#8a6a70'; ctx.fillText('ON AIR', ox, oy + 1);
      // top batten and a string of fairy lights
      ctx.fillStyle = '#e9b949'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
      ctx.beginPath(); SD.rrect(ctx, -W / 2, top - 5, W, 8, 3); ctx.fill(); ctx.stroke();
      const spans = Math.max(4, Math.round(W / 110)), sw = W / spans;
      ctx.strokeStyle = '#24402c'; ctx.lineWidth = 1.4; ctx.beginPath();
      for (let k = 0; k < spans; k++) { const a = -W / 2 + k * sw; ctx.moveTo(a, top + 3); ctx.quadraticCurveTo(a + sw / 2, top + 26, a + sw, top + 3); }
      ctx.stroke();
      const cols = ['#ff5a4f', '#ffd43b', '#69db7c', '#5aa9ff', '#f783ac'];
      const nb = spans * 5;
      for (let i = 0; i < nb; i++) {
        const k = Math.floor(i / 5), f = (i % 5 + 0.5) / 5, a = -W / 2 + k * sw;
        const bx = a + sw * f, by = top + 3 + 23 * 2 * f * (1 - f) * 2 * 0.5 + 6;
        const frac = (bx + W / 2) / W, lit = (this.lightFrom > 0 ? 1 - frac : frac) < this.lights;
        const c = cols[i % cols.length];
        const tw = lit ? 0.75 + 0.25 * Math.sin(t * 3 + i * 1.7) : 0;
        if (tw > 0) { ctx.fillStyle = c; ctx.globalAlpha = 0.25 * tw; ctx.beginPath(); ctx.arc(bx, by + 3, 7, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
        ctx.fillStyle = lit ? c : SD.shade(c, -0.55); ctx.strokeStyle = INK; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(bx, by + 3, 2.6, 3.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
      }
    }
  }

  // a potted fir with its own fairy lights
  class PotTree extends SD.Prop {
    constructor(w, x, lane) { super(w, x, lane); this.lights = 0; this.wob = new SD.Spring(0, 90, 7); }
    update(dt) { super.update(dt); this.wob.step(0, dt); }
    draw(ctx) {
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y); ctx.rotate(this.rot + this.wob.x * 0.02); ctx.lineJoin = 'round';
      ctx.fillStyle = '#6b4423'; ctx.fillRect(-4, -40, 8, 12);
      const tiers = [[-34, 30, 40], [-62, 25, 34], [-88, 19, 30], [-110, 12, 24]];
      for (const [y, hw, h] of tiers) {
        ctx.fillStyle = '#2f7d4f'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-hw, y); ctx.quadraticCurveTo(0, y + 5, hw, y); ctx.lineTo(0, y - h); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-hw * 0.5, y - h * 0.5); ctx.quadraticCurveTo(0, y - h * 0.62, hw * 0.45, y - h * 0.5); ctx.lineTo(0, y - h); ctx.closePath(); ctx.fill();
      }
      const cols = ['#ff5a4f', '#ffd43b', '#5aa9ff', '#f783ac'];
      for (let i = 0; i < 14; i++) {
        const ti = i % 4, [y, hw, h] = tiers[ti], f = hash(i, 71);
        const bx = (f - 0.5) * hw * 1.4 * (1 - 0.3 * hash(i, 72)), by = y - 4 - hash(i, 73) * h * 0.35;
        const lit = this.lights > hash(i, 74) * 0.9, c = cols[i % 4];
        if (lit) { ctx.fillStyle = c; ctx.globalAlpha = 0.3 * (0.7 + 0.3 * Math.sin(this.t * 3 + i)); ctx.beginPath(); ctx.arc(bx, by, 5.5, 0, TAU); ctx.fill(); ctx.globalAlpha = this.alpha; }
        ctx.fillStyle = lit ? c : SD.shade(c, -0.5); ctx.beginPath(); ctx.arc(bx, by, 2.4, 0, TAU); ctx.fill();
      }
      // star
      ctx.save(); ctx.translate(0, -136); ctx.fillStyle = this.lights > 0.95 ? '#ffd43b' : '#b89a3a'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
      ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -PI / 2 + k * PI / 5, rr = k % 2 ? 3.6 : 8.5; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      // pot
      ctx.fillStyle = '#c7364a'; ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(-19, -30); ctx.lineTo(19, -30); ctx.lineTo(14, 0); ctx.lineTo(-14, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); SD.rrect(ctx, -22, -36, 44, 8, 2.5); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  // the TV camera on a wheeled tripod, lens towards the set
  class TVCam extends SD.Prop {
    constructor(w, x, lane, dir) { super(w, x, lane); this.dir = dir; this.tally = 0; this.wheel = 0; this.lx = x; }
    bbox() { return [this.x - 42, this.y - 115, this.x + 42, this.y + 4]; }
    update(dt) { super.update(dt); this.wheel += (this.x - this.lx) / 4; this.lx = this.x; }
    draw(ctx) {
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y); ctx.scale(this.dir, 1); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      // dolly
      ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-32, -9); ctx.lineTo(30, -9); ctx.stroke();
      ctx.strokeStyle = '#59606e'; ctx.lineWidth = 3; ctx.stroke();
      for (const x of [-30, 0, 28]) {
        ctx.fillStyle = '#2b2f3a'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, -4, 4.5, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#9aa3b2'; ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x + Math.cos(this.wheel) * 3.5, -4 + Math.sin(this.wheel) * 3.5); ctx.stroke();
      }
      // tripod
      for (const [x1, w] of [[-26, 4.5], [24, 4.5], [0, 5]]) {
        ctx.strokeStyle = INK; ctx.lineWidth = w + 2.4; ctx.beginPath(); ctx.moveTo(0, -60); ctx.lineTo(x1, -10); ctx.stroke();
        ctx.strokeStyle = '#b8bfcb'; ctx.lineWidth = w; ctx.stroke();
      }
      ctx.fillStyle = '#3a3f4c'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.beginPath(); SD.rrect(ctx, -9, -68, 18, 9, 2); ctx.fill(); ctx.stroke();
      // pan bar
      ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-14, -74); ctx.lineTo(-46, -60); ctx.stroke();
      ctx.strokeStyle = '#59606e'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#e2413b'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); SD.rrect(ctx, -52, -63, 10, 7, 3); ctx.fill(); ctx.stroke();
      // body, lens and hood
      const bg = ctx.createLinearGradient(0, -102, 0, -68); bg.addColorStop(0, '#4a5060'); bg.addColorStop(1, '#262a34');
      ctx.fillStyle = bg; ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
      ctx.beginPath(); SD.rrect(ctx, -30, -102, 56, 34, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1b1e26'; ctx.beginPath(); SD.rrect(ctx, 24, -97, 20, 24, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2b2f3a'; ctx.beginPath(); ctx.moveTo(42, -99); ctx.lineTo(54, -104); ctx.lineTo(54, -66); ctx.lineTo(42, -71); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5aa9ff'; ctx.globalAlpha = this.alpha * 0.8; ctx.beginPath(); ctx.ellipse(54, -85, 2.5, 13, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = this.alpha;
      // viewfinder
      ctx.fillStyle = '#3a3f4c'; ctx.beginPath(); SD.rrect(ctx, -30, -114, 20, 12, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7fd3ff'; ctx.fillRect(-27, -111, 14, 6);
      // tally light
      if (this.tally > 0) { ctx.fillStyle = `rgba(255,70,60,${0.35 * this.tally})`; ctx.beginPath(); ctx.arc(10, -106, 9, 0, TAU); ctx.fill(); }
      ctx.fillStyle = this.tally > 0.5 ? '#ff4a3d' : '#5a2a2a'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(10, -106, 4, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  // a kitchen island on castors: worktop, cupboard doors, the contestant's colour
  class Bench extends SD.Prop {
    constructor(w, x, lane, col, side) {
      super(w, x, lane);
      this.col = col; this.side = side; // side: which end the house is built on
      this.bowl = 0; this.dough = 0; this.cut = 0; this.tray = 0; this.wheel = 0; this.lx = x;
    }
    bbox() { return [this.x - BW / 2, this.y - BH - 6, this.x + BW / 2, this.y + 4]; }
    update(dt) { super.update(dt); this.wheel += (this.x - this.lx) / 4; this.lx = this.x; }
    draw(ctx) {
      const s = this.side;
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y); ctx.rotate(this.rot); ctx.lineJoin = 'round';
      for (const x of [-BW / 2 + 16, BW / 2 - 16]) {
        ctx.fillStyle = '#2b2f3a'; ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, -4, 4, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#9aa3b2'; ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x + Math.cos(this.wheel) * 3, -4 + Math.sin(this.wheel) * 3); ctx.stroke();
      }
      ctx.fillStyle = '#f6ecd9'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.rect(-BW / 2 + 5, -BH + 4, BW - 10, BH - 11); ctx.fill(); ctx.stroke();
      ctx.fillStyle = this.col; ctx.fillRect(-BW / 2 + 6, -BH + 5, BW - 12, 5);
      ctx.strokeStyle = 'rgba(21,27,43,0.45)'; ctx.lineWidth = 1.3;
      for (const [a, b] of [[-BW / 2 + 12, -3], [3, BW / 2 - 12]]) {
        ctx.beginPath(); ctx.rect(a, -BH + 14, b - a, BH - 25); ctx.stroke();
        const hx = a < 0 ? b - 7 : a + 7; ctx.beginPath(); ctx.moveTo(hx, -BH + 20); ctx.lineTo(hx, -BH + 27); ctx.stroke();
      }
      // butcher-block worktop
      ctx.fillStyle = '#d9a066'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); SD.rrect(ctx, -BW / 2 - 3, -BH - 2, BW + 6, 8, 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-BW / 2, -BH); ctx.lineTo(BW / 2, -BH); ctx.stroke();
      // the work end of the bench
      const wx = -s * 52, ty = -BH - 2;
      if (this.tray > 0) {
        // Specs' kit, laid out square: a bundle of pretzel studs and a roll of pink candy-floss insulation
        ctx.fillStyle = '#d29a52'; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.rect(wx - 22, ty - 3 - k * 2.6, 26, 2.4); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = '#f4a7b9'; ctx.beginPath(); ctx.ellipse(wx + 16, ty - 7, 9, 7, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#d97a95'; ctx.beginPath(); ctx.arc(wx + 16, ty - 7, 3.5, 0, TAU); ctx.stroke();
      }
      if (this.dough > 0) {
        ctx.fillStyle = '#d6a064'; ctx.strokeStyle = COOKIE_EDGE; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(wx, ty - 2, 10 + 26 * this.dough, 4 - this.dough * 1.2, 0, 0, TAU); ctx.fill(); ctx.stroke();
        if (this.cut > 0) {
          // the empty cookie-shaped hole he came out of
          ctx.save(); ctx.translate(wx, ty - 1); ctx.scale(1, 0.12); ctx.rotate(-PI / 2);
          ctx.globalAlpha = this.alpha * 0.55 * this.cut; drawGM(ctx, { col: '#7a4a22', edge: '#7a4a22', face: false });
          ctx.restore();
        }
      }
      if (this.bowl > 0) {
        const lv = this.bowl;
        ctx.save(); ctx.translate(wx, ty);
        ctx.fillStyle = ICING; ctx.strokeStyle = 'rgba(120,140,170,0.8)'; ctx.lineWidth = 1.2;
        if (lv > 0.05) { ctx.beginPath(); ctx.ellipse(0, -10, 12 * Math.min(1, 0.5 + lv), 2 + 4 * lv, 0, PI, TAU); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = '#5aa9ff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(-16, -11); ctx.quadraticCurveTo(-14, 0, 0, 0); ctx.quadraticCurveTo(14, 0, 16, -11); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-8, -6, 2.5, 3, 0.4, 0, TAU); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
  }

  // ======================= the gingerbread houses =======================
  // style: 'pro' (built like a real house: foundation, framing, insulation, walls, roof),
  // 'messy' (slapped together, short of icing), 'cute' (pastel, heart window)
  const HW = 35, WH = 38, RH = 30;
  class GHouse extends SD.Prop {
    constructor(w, x, lane, style) {
      super(w, x, lane);
      this.style = style;
      this.found = 0; this.studs = 0; this.frame = 0; this.insul = 0; this.walls = 0; this.roof = 0; this.icing = 0; this.candy = 0;
      this.roofOff = 0; this.roofFall = 0; this.wob = new SD.Spring(0, 140, 8); this.bite = 0;
    }
    update(dt) { super.update(dt); this.wob.step(0, dt); }
    topLift() { return (this.style === 'pro' ? 5 : 3) + WH + RH + 4; } // height of the ridge above the worktop
    draw(ctx) {
      const st = this.style, pro = st === 'pro', messy = st === 'messy';
      const y0 = pro ? -5 : -3;
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.rotate(this.wob.x * 0.012);
      // base: a concrete slab for the pro, a silver cake board for the rest
      if (pro) {
        if (this.found > 0) {
          const fw = (HW + 7) * 2 * this.found;
          ctx.fillStyle = '#b9bec7'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.rect(-HW - 7, -5, fw, 5); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#8d939e'; ctx.fillRect(-HW - 7, -1.5, fw, 1.5);
        }
      } else {
        ctx.fillStyle = '#dfe4ea'; ctx.strokeStyle = 'rgba(21,27,43,0.6)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(0, -1.5, HW + 12, 3, 0, 0, TAU); ctx.fill(); ctx.stroke();
      }
      const lean = messy ? -0.07 : 0;
      ctx.save(); ctx.transform(1, 0, lean, 1, 0, 0);
      if (pro) this._frame(ctx, y0);
      this._walls(ctx, y0, st);
      ctx.restore();
      this._roof(ctx, y0, st, lean);
      if (pro && this.candy > 0) {
        // a candy-cane at the door
        ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(15, y0); ctx.lineTo(15, y0 - 16); ctx.arc(18.5, y0 - 16, 3.5, PI, TAU); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.4; ctx.stroke();
        ctx.strokeStyle = '#e2413b'; ctx.lineWidth = 2.4; ctx.setLineDash([2, 2.5]); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.restore();
    }
    _frame(ctx, y0) {
      // pretzel studs, plates and rafters; pink insulation between the studs
      const n = 8, xs = Array.from({ length: n }, (_, i) => -HW + 2 + i * ((HW * 2 - 4) / (n - 1)));
      const k = this.studs * n;
      if (this.insul > 0) {
        for (let i = 0; i < n - 1; i++) {
          if (k < i + 2) break;
          const a = xs[i] + 1.8, b = xs[i + 1] - 1.8, h = WH * this.insul;
          ctx.fillStyle = '#f4a7b9'; ctx.fillRect(a, y0 - h, b - a, h);
          ctx.strokeStyle = '#e07f9c'; ctx.lineWidth = 0.9; ctx.beginPath();
          for (let yy = y0 - 4; yy > y0 - h; yy -= 6) { ctx.moveTo(a + 1, yy); ctx.quadraticCurveTo((a + b) / 2, yy - 4, b - 1, yy); }
          ctx.stroke();
        }
      }
      ctx.fillStyle = '#d29a52'; ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 1;
      for (let i = 0; i < n; i++) {
        const g = clamp(k - i, 0, 1); if (g <= 0) break;
        ctx.beginPath(); ctx.rect(xs[i] - 1.8, y0 - WH * g, 3.6, WH * g); ctx.fill(); ctx.stroke();
      }
      if (this.frame > 0) {
        const f = this.frame, top = y0 - WH;
        ctx.beginPath(); ctx.rect(-HW, top - 3, HW * 2 * Math.min(1, f * 2), 3); ctx.fill(); ctx.stroke();
        const r = clamp(f * 2 - 1, 0, 1);
        if (r > 0) {
          ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 4.4;
          const seg = (x0, ya, x1, yb) => { ctx.beginPath(); ctx.moveTo(x0, ya); ctx.lineTo(lerp(x0, x1, r), lerp(ya, yb, r)); ctx.stroke(); };
          seg(-HW, top - 3, 0, top - 3 - RH); seg(HW, top - 3, 0, top - 3 - RH); seg(0, top - 3, 0, top - 3 - RH);
          ctx.strokeStyle = '#d29a52'; ctx.lineWidth = 2.6;
          seg(-HW, top - 3, 0, top - 3 - RH); seg(HW, top - 3, 0, top - 3 - RH); seg(0, top - 3, 0, top - 3 - RH);
        }
      }
    }
    _walls(ctx, y0, st) {
      if (this.walls <= 0) return;
      const pro = st === 'pro', messy = st === 'messy', cute = st === 'cute';
      const col = cute ? '#cf8a4c' : messy ? '#a65f2a' : '#b5692d';
      const top = y0 - WH - (pro ? 3 : 0), h = (WH + RH + 3) * this.walls;
      ctx.save();
      // pro: the panels go on bottom-up over the frame; the others slap theirs up in one go
      if (!messy) { ctx.beginPath(); ctx.rect(-HW - 4, y0 - h, HW * 2 + 8, h + 1); ctx.clip(); }
      else ctx.globalAlpha *= Math.min(1, this.walls * 2);
      const house = () => { ctx.beginPath(); ctx.moveTo(-HW, y0); ctx.lineTo(-HW, top); ctx.lineTo(0, top - RH); ctx.lineTo(HW, top); ctx.lineTo(HW, y0); ctx.closePath(); };
      ctx.fillStyle = col; ctx.strokeStyle = COOKIE_EDGE; ctx.lineWidth = 2; house(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.ellipse(-12, top - 4, 9, 4, -0.5, 0, TAU); ctx.fill();
      // door and windows (candy glass)
      const glass = '#ffd76a';
      ctx.fillStyle = SD.shade(col, -0.25); ctx.strokeStyle = COOKIE_EDGE; ctx.lineWidth = 1.5;
      const dx = messy ? 7 : 0;
      ctx.beginPath(); ctx.moveTo(dx - 7, y0); ctx.lineTo(dx - 7, y0 - 14); ctx.arc(dx, y0 - 14, 7, PI, TAU); ctx.lineTo(dx + 7, y0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = glass;
      if (cute) {
        ctx.save(); ctx.translate(-20, y0 - 26); ctx.beginPath(); ctx.moveTo(0, 5); ctx.bezierCurveTo(-9, -1, -5, -8, 0, -3.5); ctx.bezierCurveTo(5, -8, 9, -1, 0, 5); ctx.fillStyle = '#ff8fab'; ctx.fill(); ctx.stroke(); ctx.restore();
        ctx.fillStyle = glass; ctx.beginPath(); ctx.arc(20, y0 - 25, 6, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, top - 12, 5, 0, TAU); ctx.fill(); ctx.stroke();
      } else if (messy) {
        ctx.beginPath(); ctx.arc(-18, y0 - 25, 6.5, 0, TAU); ctx.fill(); ctx.stroke();
      } else {
        for (const wx of [-24, 18]) {
          ctx.beginPath(); ctx.rect(wx, y0 - 30, 11, 11); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(wx + 5.5, y0 - 30); ctx.lineTo(wx + 5.5, y0 - 19); ctx.moveTo(wx, y0 - 24.5); ctx.lineTo(wx + 11, y0 - 24.5); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(0, top - 11, 4.5, 0, TAU); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
      // icing on the walls: window frames, corners, the door
      const ic = this.icing;
      if (ic > 0.6) {
        ctx.save(); ctx.globalAlpha *= Math.min(1, (ic - 0.6) * 4);
        ctx.strokeStyle = ICING; ctx.lineWidth = messy ? 3 : 1.8;
        if (messy) { ctx.beginPath(); ctx.moveTo(-26, y0 - 32); ctx.quadraticCurveTo(-18, y0 - 36, -10, y0 - 31); ctx.stroke(); }
        else {
          ctx.setLineDash([2.5, 2]);
          ctx.beginPath(); ctx.moveTo(-HW + 2, y0 - 2); ctx.lineTo(-HW + 2, top + 2); ctx.moveTo(HW - 2, y0 - 2); ctx.lineTo(HW - 2, top + 2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(-8.5, y0); ctx.lineTo(-8.5, y0 - 14); ctx.arc(0, y0 - 14, 8.5, PI, TAU); ctx.lineTo(8.5, y0); ctx.stroke();
        }
        ctx.restore();
      }
    }
    _roof(ctx, y0, st, lean) {
      if (this.roof <= 0) return;
      const pro = st === 'pro', messy = st === 'messy', cute = st === 'cute';
      const top = y0 - WH - (pro ? 3 : 0);
      const slab = cute ? '#f2b8c6' : messy ? '#8a4a1f' : '#7a3f18';
      ctx.save();
      if (messy) {
        // not enough icing to hold it: crooked, and it can slide right off the end of the bench
        const off = this.roofOff, fall = this.roofFall, d = this.dir || 1;
        ctx.translate(lean * -WH + d * (off * 30 + fall * 60), off * off * 14 + fall * (BH + 13));
        ctx.rotate(lerp(0.1 + d * off * 0.45, d * 0.08, fall));
      }
      for (const s of [-1, 1]) {
        const u = clamp(this.roof * 2 - (s < 0 ? 0 : 1), 0, 1);
        if (u <= 0) continue;
        const e = SD.easeOut(u);
        ctx.save(); ctx.globalAlpha *= Math.min(1, u * 3); ctx.translate(0, -(1 - e) * 22);
        // a thick slab along the gable edge, past the wall at the eave
        ctx.fillStyle = slab; ctx.strokeStyle = COOKIE_EDGE; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(s * (HW + 9), top + 6); ctx.lineTo(0, top - RH - 5); ctx.lineTo(0, top - RH + 3); ctx.lineTo(s * (HW + 9), top + 14); ctx.closePath(); ctx.fill(); ctx.stroke();
        if (cute) {
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2;
          for (let k = 1; k < 4; k++) { const f = k / 4; ctx.beginPath(); ctx.arc(s * (HW + 9) * f, lerp(top - RH - 1, top + 10, f), 3, 0, PI); ctx.stroke(); }
        }
        ctx.restore();
      }
      if (pro && this.roof >= 1) {
        ctx.fillStyle = '#9e3a2a'; ctx.strokeStyle = COOKIE_EDGE; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.rect(15, top - RH * 0.62 - 15, 8, 14); ctx.fill(); ctx.stroke();
      }
      // icing: drips along both eaves (the messy one only ever gets a few blobs)
      const ic = messy ? Math.min(this.icing, 0.35) : this.icing;
      if (ic > 0 && this.roof >= 1) {
        ctx.fillStyle = ICING; ctx.strokeStyle = 'rgba(150,170,200,0.7)'; ctx.lineWidth = 0.8;
        const N = messy ? 3 : 9;
        for (const s of [-1, 1]) {
          const part = clamp(ic / (messy ? 0.35 : 0.6) * 2 - (s < 0 ? 0 : 1), 0, 1);
          for (let k = 0; k < N; k++) {
            if ((k + 0.5) / N > part) break;
            const f = (k + 0.5) / N, ex = s * (HW + 9) * f, ey = lerp(top - RH + 3, top + 14, f);
            const drip = messy ? 4 + hash(k, s + 5) * 3 : 2 + hash(k, s) * 4;
            ctx.beginPath(); ctx.ellipse(ex, ey + drip * 0.4, 2.6, drip * 0.6 + 1.5, 0, 0, TAU); ctx.fill();
          }
        }
        if (ic > 0.15) { ctx.beginPath(); ctx.ellipse(0, top - RH - 4, 4, 2.6, 0, 0, TAU); ctx.fill(); }
      }
      // candy along the eaves and the ridge
      if (this.candy > 0 && this.roof >= 1) {
        const cols = ['#e2413b', '#69db7c', '#ffd43b', '#5aa9ff', '#f783ac'];
        const pts = messy ? [[-0.55, -1], [0.3, 1]] : [[-0.85, -1], [-0.55, -1], [-0.25, -1], [0.25, 1], [0.55, 1], [0.85, 1]];
        const n = Math.floor(this.candy * pts.length + 0.001);
        for (let i = 0; i < n; i++) {
          const [f, s] = pts[i], af = Math.abs(f);
          const ex = s * (HW + 9) * af, ey = lerp(top - RH - 5, top + 6, af) - 2;
          ctx.fillStyle = cols[i % cols.length]; ctx.strokeStyle = INK; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(ex, ey, 3.2, PI, TAU); ctx.lineTo(ex + 3.2, ey + 1.5); ctx.lineTo(ex - 3.2, ey + 1.5); ctx.closePath(); ctx.fill(); ctx.stroke();
          if (messy && i === 0 && this.bite) { ctx.fillStyle = slab; ctx.beginPath(); ctx.arc(ex + 2.5, ey - 2, 2, 0, TAU); ctx.fill(); }
        }
      }
      ctx.restore();
    }
  }

  // ======================= things to hold =======================
  SD.items.ruler = () => ({ at: 'front', slide: 0, draw(ctx, p, hx, hy) {
    ctx.translate(hx - 8 + this.slide, hy - 3);
    if (p.action !== 'measure') return; // back in his pocket
    ctx.fillStyle = '#f2c94c'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
    ctx.beginPath(); SD.rrect(ctx, -6, -4, 74, 8, 1.5); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 0.9; ctx.beginPath();
    for (let k = 0; k <= 14; k++) { const x = -2 + k * 5; ctx.moveTo(x, -4); ctx.lineTo(x, -4 + (k % 2 ? 2.2 : 4)); }
    ctx.stroke();
  } });
  SD.items.pipingBag = () => ({ at: 'front', draw(ctx, p, hx, hy) {
    ctx.translate(hx, hy); ctx.rotate(0.75 + Math.sin(p.t * 5) * 0.05);
    const sq = 1 - Math.max(0, Math.sin(p.t * 5)) * 0.12;
    ctx.fillStyle = '#f2f5fa'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-13, -7 * sq); ctx.lineTo(13, -2); ctx.lineTo(13, 2); ctx.lineTo(-13, 7 * sq); ctx.quadraticCurveTo(-17, 0, -13, -7 * sq); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#ff8fab'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(8, -1.5); ctx.stroke();
    ctx.fillStyle = '#b8bfcb'; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(13, -2.5); ctx.lineTo(19, -1); ctx.lineTo(19, 1); ctx.lineTo(13, 2.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(21, 0, 1.6 + Math.max(0, Math.sin(p.t * 5)) * 1.2, 0, TAU); ctx.fill();
  } });
  SD.items.rollingPin = () => ({ at: 'front', draw(ctx, p, hx, hy) {
    ctx.translate(hx + 2, hy + 2);
    ctx.fillStyle = '#d9a066'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
    ctx.beginPath(); SD.rrect(ctx, -34, -2.5, 9, 5, 2.5); ctx.fill(); ctx.stroke();
    ctx.beginPath(); SD.rrect(ctx, 25, -2.5, 9, 5, 2.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8b57a'; ctx.beginPath(); SD.rrect(ctx, -26, -5, 52, 10, 5); ctx.fill(); ctx.stroke();
  } });
  SD.items.cutter = () => ({ at: 'front', draw(ctx, p, hx, hy) {
    ctx.translate(hx + 4, hy + 16); ctx.scale(0.75, 0.75);
    drawGM(ctx, { col: 'rgba(0,0,0,0)', edge: '#9aa3b2', face: false });
  } });
  SD.items.mic = () => ({ at: 'front', draw(ctx, p, hx, hy) {
    ctx.translate(hx + 1, hy - 2); ctx.rotate(0.55);
    ctx.fillStyle = '#20232c'; ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
    ctx.beginPath(); SD.rrect(ctx, -2.6, -4, 5.2, 19, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e2413b'; ctx.fillRect(-2.8, -4, 5.6, 3);
    ctx.fillStyle = '#9aa3b2'; ctx.beginPath(); ctx.arc(0, -9, 6, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(21,27,43,0.5)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-5, -9); ctx.lineTo(5, -9); ctx.moveTo(0, -14); ctx.lineTo(0, -4); ctx.stroke();
  } });
  SD.items.handbell = () => ({ at: 'front', draw(ctx, p, hx, hy) {
    ctx.translate(hx, hy - 4); ctx.rotate(p.action === 'ring' ? Math.sin(p.t * 22) * 0.4 : 0.2);
    ctx.fillStyle = '#5a3b26'; ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
    ctx.beginPath(); SD.rrect(ctx, -2.6, -16, 5.2, 13, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e9b949'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-10, 10); ctx.quadraticCurveTo(-8, -4, 0, -4); ctx.quadraticCurveTo(8, -4, 10, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 11.5, 2.4, 0, TAU); ctx.fill(); ctx.stroke();
  } });
  SD.items.clapper = () => ({ at: 'front', snap: 0, draw(ctx, p, hx, hy) {
    ctx.translate(hx + 6, hy - 10);
    ctx.fillStyle = '#20232c'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.rect(-14, -2, 32, 22); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1;
    for (const y of [5, 10, 15]) { ctx.beginPath(); ctx.moveTo(-10, y); ctx.lineTo(14, y); ctx.stroke(); }
    ctx.save(); ctx.translate(-14, -2); ctx.rotate(-(1 - this.snap) * 0.65);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.rect(0, -6, 32, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#20232c'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(k * 8 + 2, -6); ctx.lineTo(k * 8 + 6, -6); ctx.lineTo(k * 8 + 3, 0); ctx.lineTo(k * 8 - 1, 0); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  } });
  SD.items.trophy = () => ({ at: 'front', draw(ctx, p, hx, hy) {
    ctx.translate(hx + 4, hy - 6);
    ctx.fillStyle = '#5a3b26'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
    ctx.beginPath(); SD.rrect(ctx, -11, 4, 22, 8, 1.5); ctx.fill(); ctx.stroke();
    const g = ctx.createLinearGradient(-14, 0, 14, 0); g.addColorStop(0, '#c99a2e'); g.addColorStop(0.45, '#ffe28a'); g.addColorStop(1, '#b8861f');
    ctx.fillStyle = g; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.rect(-3, -6, 6, 10); ctx.fill(); ctx.stroke();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 13, -22, 5, s < 0 ? PI * 0.5 : -PI * 0.5, s < 0 ? PI * 1.5 : PI * 0.5, s > 0); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-14, -31); ctx.lineTo(14, -31); ctx.quadraticCurveTo(13, -9, 0, -7); ctx.quadraticCurveTo(-13, -9, -14, -31); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.translate(0, -12); ctx.scale(0.42, 0.42); drawGM(ctx, { col: '#c99a2e', edge: '#8a6414', face: false }); ctx.restore();
  } });
  SD.items.bowl = () => ({ at: 'front', draw(ctx, p, hx, hy) {
    ctx.translate(hx + 6, hy + 2);
    ctx.fillStyle = '#5aa9ff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-15, -12); ctx.quadraticCurveTo(-13, 2, 0, 2); ctx.quadraticCurveTo(13, 2, 15, -12); ctx.closePath(); ctx.fill(); ctx.stroke();
  } });
  // an icing moustache (it was going so well)
  SD.items.smear = () => ({ at: 'front', hand: 'F', draw(ctx) {
    ctx.fillStyle = ICING; ctx.strokeStyle = 'rgba(150,170,200,0.8)'; ctx.lineWidth = 0.8;
    for (const [x, y, r] of [[19, -63, 4.2], [25, -61, 3.4], [14, -60, 3], [22, -56, 2.6]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke(); }
  } });

  // ======================= the show =======================
  function* sceneBakeoff(S) {
    const w = S.w, r = S.r;
    const cx = S.cx, aw = S.aw;
    const side = r.sign(); // the camera's side of the set
    const BKW = Math.min(1000, aw * 0.58), BKH = 230;
    const xa = cx - side * BKW / 2, xb = cx + side * BKW / 2; // the banner unrolls from xa to xb
    const camX = cx + side * aw * 0.4;
    const bxs = [cx - aw * 0.22, cx, cx + aw * 0.22];
    const hostSpot = cx - side * aw * 0.4;
    const run = (g) => S.run(g);
    const go = function* (p, x, lane, sp = 70) { if (lane != null) p.laneT = lane; yield* S.walk(p, x, sp); };
    // change depth on the spot (stepping), and only then move across: nobody cuts through a bench
    const toLane = function* (p, lane) { p.laneT = lane; yield* S.until(() => Math.abs(p.lane - lane) < 1.2, 3); };
    const route = function* (p, x, lane, sp = 70) { yield* toLane(p, lane); yield* go(p, x, lane, sp); };
    const tic = (p, n, d = 1) => { p.tic = { n, t: 0, d }; };

    // ---- the cast ----
    const host = S.spawn({ kind: 'captain', x: S.side(-side) - side * 40, lane: 34 });
    const specs = S.spawn({ kind: 'specs', x: S.offL - 200, lane: 18 });
    const chubby = S.spawn({ kind: 'chubby', x: S.offL - 200, lane: 18 });
    const pip = S.spawn({ kind: 'pip', x: S.offL - 200, lane: 18 });
    const holly = S.spawn({ kind: 'holly', x: S.side(-side) - side * 30, lane: 2 });
    const rocco = S.spawn({ kind: 'rocco', x: S.side(side) + side * 120, lane: 43 });
    const hand = S.spawn({ kind: 'crew', x: S.side(side) + side * 40, lane: 3 });
    const looks = SD.shuffle(r, SD.STRANGER_LOOKS.slice());
    const chefs = [0, 1].map((j) => {
      const J = S.spawn({ kind: 'stranger', x: S.side(j ? -side : side) + (j ? -side : side) * 60, lane: 24 });
      J.look = looks[j]; J.jhat = 'toque'; J.rosette = true; return J;
    });
    const all = [host, specs, chubby, pip, holly, rocco, hand, ...chefs];

    // ---- 1. the set: the backdrop arrives rolled up like a scroll and is opened out from the middle ----
    const bk = S.add(new Backdrop(w, cx, 0, BKW, BKH));
    bk.show = 1; bk.lightFrom = side;
    const sx = () => (hand.x + holly.x) / 2;
    hand.x = S.side(-side) - side * 30; holly.x = hand.x - side * 64;
    hand.lane = hand.laneT = holly.lane = holly.laneT = 3;
    hand.action = holly.action = 'hold'; hand.face(side); holly.face(side);
    let carry = true;
    run((function* () { while (carry) { const m = sx(); bk.xa = m - side * 15; bk.xb = m + side * 15; yield 0; } })());
    yield [run(go(hand, cx + side * 32, 3, 105)), run(go(holly, cx - side * 32, 3, 105))];
    carry = false;
    holly.face(-side);
    yield 0.4;
    // each takes a roll and walks it out to the ends, the banner opening up between them
    const xa0 = bk.xa, xb0 = bk.xb;
    yield* S.tween(5.2, (u) => {
      const e = SD.easeInOut(u);
      bk.xa = lerp(xa0, xa, e); bk.xb = lerp(xb0, xb, e); bk.rolled = 1 - e;
      holly.x = bk.xa - side * 24; hand.x = bk.xb + side * 24;
    });
    bk.rolled = 0;
    holly.action = 'none'; hand.action = 'none';
    w.puff(xa, bk.y, 3, 8, 0.6, 0.4); w.puff(xb, bk.y, 3, 8, 0.6, 0.4);
    // he plugs the lights in at the bottom of his pole
    hand.face(-side); hand.action = 'plant';
    yield 0.5;
    w.sparkle(xb, bk.y - 6, 3, '#ffd43b', 6);
    yield* S.tween(1.4, (u) => { bk.lights = u; });
    hand.action = 'none';
    hand.say('heart', 0.9); holly.face(side); holly.action = 'clap';
    yield 0.7;
    holly.action = 'none';

    // ---- 2. dressing the set: trees, benches pushed in on their castors, the camera ----
    const trees = [];
    const fetchTree = (p, s) => run((function* () {
      yield* go(p, S.side(s) + s * 40, p === hand ? 6 : 5, 100);
      const tx = s === side ? xb + side * 64 : xa - side * 64;
      const tr = S.add(new PotTree(w, p.x - s * 26, 5.5));
      tr.lift = 16; trees.push(tr);
      p.action = 'carryFront';
      let on = true;
      run((function* () { while (on) { tr.x = p.x + p.facing * 26; tr.lane = p.lane + 0.5; yield 0; } })());
      yield* go(p, tx + s * 26, 5, 80);
      on = false; p.action = 'none';
      yield* S.tween(0.3, (u) => { tr.lift = 16 * (1 - u); });
      tr.lane = 5; tr.wob.kick(1.2); w.puff(tr.x, tr.y, 3, 8, 0.6, 0.4);
      yield 0.3;
      p.action = 'plant'; yield 0.4; p.action = 'none';
      yield* S.tween(1, (u) => { tr.lights = u; });
    })());
    const tH = fetchTree(holly, -side), tC = fetchTree(hand, side);
    // the host turns up early and waits at the side, going over his notes
    run((function* () { yield 3; yield* go(host, cx - side * aw * 0.11, 32, 80); host.face(side); tic(host, 'think', 1.4); })());
    // who gets which bench is down to the draw
    const cons = SD.shuffle(r, [specs, chubby, pip]);
    const cols = ['#3c7fd8', '#e2413b', '#2f9e5f'];
    const benches = cons.map((p, i) => {
      const bx = bxs[i];
      // the house goes at the outer end of the outer benches (so the judges can stand beside it)
      const hs = i === 0 ? -1 : i === 2 ? 1 : r.sign();
      const from = i === 0 ? -1 : i === 2 ? 1 : -side;
      const b = S.add(new Bench(w, S.side(from) + from * (BW / 2 + 40), 18, cols[i], hs));
      b.owner = p; b.bx = bx; b.from = from;
      p.lane = p.laneT = 18; p.x = b.x + from * (BW / 2 + 22);
      return b;
    });
    const benchOf = (p) => benches.find((b) => b.owner === p);
    const pushIn = (b, k) => run((function* () {
      const p = b.owner, from = b.from;
      // the middle bench goes in first; the outer bench on the same side waits until it's well past
      const mid = benches[1];
      if (k === 0 || k === 2) {
        if (b.from === mid.from) yield* S.until(() => (mid.x - b.bx) * -b.from > BW + 160, 20);
        else yield 0.8;
      }
      p.action = 'push'; p.face(-from);
      let on = true;
      run((function* () { while (on) { b.x = p.x - from * (BW / 2 + 22); yield 0; } })());
      yield* go(p, b.bx + from * (BW / 2 + 22), 18, 88);
      on = false; p.action = 'none';
      w.puff(b.x - BW / 2 + 16, b.y, 2, 6, 0.5, 0.3); w.puff(b.x + BW / 2 - 16, b.y, 2, 6, 0.5, 0.3);
      // round the end of the bench, then in behind it
      yield* toLane(p, 12);
      yield* go(p, b.x - b.side * 56, 12, 55);
      p.face(b.side);
    })());
    const pushes = benches.map((b, k) => pushIn(b, k));
    // Rocco wheels the camera in from the front corner
    const cam = S.add(new TVCam(w, S.side(side) + side * 60, 44, -side));
    rocco.action = 'push'; rocco.face(-side); rocco.x = cam.x + side * 48;
    let camOn = true;
    run((function* () { while (camOn) { cam.x = rocco.x - side * 48; yield 0; } })());
    const camIn = run((function* () { yield 1.2; yield* go(rocco, camX + side * 48, 43, 70); camOn = false; rocco.action = 'none'; })());
    yield [tH, tC, ...pushes, camIn];
    // houses-to-be, and what each contestant starts with on their bench
    const houses = new Map();
    for (const b of benches) {
      const st = b.owner === specs ? 'pro' : b.owner === chubby ? 'messy' : 'cute';
      const hz = S.add(new GHouse(w, b.x + b.side * 40, b.lane + 0.3, st));
      hz.lift = BH; hz.dir = b.side; houses.set(b.owner, hz);
    }
    benchOf(specs).tray = 1; benchOf(chubby).bowl = 1;
    // Holly heads off; the hand brings the clapperboard to the lens
    run(go(holly, S.side(-side) - side * 60, 6, 80));
    hand.action = 'none';
    yield* go(hand, camX - side * 76, 44, 70);
    hand.face(side); hand.item = SD.items.clapper(); hand.action = 'present';
    rocco.face(-side); rocco.action = 'inspect';
    host.item = SD.items.mic();
    const hostIn = run(go(host, cx, 32, 88));
    yield 0.5;
    for (const n of ['3', '2', '1']) { hand.say(n, 0.8); yield 0.85; }
    yield* S.tween(0.12, (u) => { hand.item.snap = u; });
    w.puff(hand.x + side * 20, hand.y - 70, 2, 5, 0.4, 0.3);
    bk.onAir = 1; cam.tally = 1;
    yield 0.4;
    hand.item = null; hand.action = 'none';
    run((function* () { yield* route(hand, S.side(side) + side * 60, 30, 70); hand.dead = true; })()); // behind the camera

    // ---- 3. the show: the host, the judges, the contestants ----
    yield hostIn;
    host.face(side); host.action = 'mic';
    // the guest chefs walk on along the front while he talks, then take their places at the back
    host.face(side);
    const spots = [cx + side * aw * 0.11, cx - side * aw * 0.11];
    const faceIn = (J) => J.face(Math.sign(cx - J.x) || 1);
    const chefIn = chefs.map((J, j) => run((function* () {
      yield j * 0.3;
      yield* go(J, spots[j], 24, 95);
      J.action = 'wave'; yield 0.7; J.action = 'none';
      yield* toLane(J, 6);
      faceIn(J);
    })()));
    yield 1.4;
    host.action = 'wave'; yield 0.8;
    host.face(-side); host.action = 'point';
    cons.forEach((p) => { p.action = 'clap'; });
    yield chefIn;
    host.action = 'none'; host.face(side);
    cons.forEach((p) => { p.action = 'none'; });
    // introducing the contestants, one by one
    for (const p of cons) {
      host.face(Math.sign(p.x - host.x) || 1); host.action = 'point';
      p.action = 'wave'; p.face(side); yield 0.7;
      p.action = 'none'; p.face(benchOf(p).side);
    }
    host.action = 'none'; host.face(side);
    host.item = SD.items.handbell(); host.action = 'ring';
    w.note(host.x + 20, host.y - 120, '#e9b949');
    yield 0.9;
    host.action = 'none'; host.item = SD.items.mic();
    // the host steps off to watch from the side away from Pip's bench (her gingerbread man is about
    // to need the stage)
    const pipSide = Math.sign(Math.round(benchOf(pip).x - cx));
    const hostSide = pipSide === 0 ? -side : -pipSide;
    run(hostSide === -side ? go(host, hostSpot, 34, 95) : go(host, cx + side * aw * 0.33, 30, 95));

    // ---- 4. the bake: three very different approaches ----
    const B = 44;
    let clockRun = true;
    run((function* () { const t0 = S.sc.t; while (clockRun) { bk.clock = clamp((S.sc.t - t0) / B, 0, 1); yield 0; } })());
    const gm = S.add(new GingerMan(w, 0, 0));
    gm.hidden = true;
    // a contestant steps between the work end and the house end of their bench
    const at = (p, where) => { const b = benchOf(p); return where === 'house' ? b.x - b.side * 24 : b.x - b.side * 56; };
    const step = function* (p, where) { yield* go(p, at(p, where), 12, 40); p.face(benchOf(p).side); };
    const waitOut = function* (p, fn) { while (!timeUp) { yield* fn(); } };
    let timeUp = false;
    // a stretch of work; Pip (always behind after the chase) has to stop where she is when time's up
    const workFor = function* (p, d, fn, act = 'work') {
      p.action = act;
      const t0 = S.sc.t;
      while (true) { const u = clamp((S.sc.t - t0) / d, 0, 1); fn(u); if (u >= 1 || (p === pip && timeUp)) break; yield 0; }
      p.action = 'none';
    };

    function* proBuild() {
      const p = specs, h = houses.get(p);
      p.item = SD.items.ruler();
      const measure = function* (d = 1.4) {
        p.action = 'measure';
        yield* S.tween(d, (u) => { p.item.slide = Math.sin(u * PI * 2) * 6; });
        p.action = 'none'; p.item.slide = 0;
      };
      yield* step(p, 'house');
      yield* measure(1.6);
      tic(p, 'glasses', 0.8); yield 0.8;
      yield* workFor(p, 1.4, (u) => { h.found = u; });
      yield* measure(1.2);
      for (let i = 0; i < 8; i++) {
        p.action = 'tap';
        yield* S.tween(0.32, (u) => { h.studs = (i + SD.easeOut(u)) / 8; });
      }
      p.action = 'none'; yield 0.3;
      yield* workFor(p, 1.5, (u) => { h.frame = u; });
      tic(p, 'think', 1.2); yield 1.2;
      yield* workFor(p, 2.4, (u) => { h.insul = u; });
      yield* measure(1.2);
      yield* workFor(p, 2.6, (u) => { h.walls = u; });
      yield* workFor(p, 1.8, (u) => { h.roof = u; });
      p.item = SD.items.pipingBag();
      yield* workFor(p, 3.4, (u) => { h.icing = u; }, 'pipe');
      p.item = null;
      yield* workFor(p, 1.6, (u) => { h.candy = u; });
      p.item = SD.items.ruler();
      yield* measure(1.4);
      p.eyeOverride = 'happy'; tic(p, 'glasses', 0.8); yield 1;
      p.eyeOverride = null;
      // done early: check it all again. And again.
      yield* waitOut(p, function* () { yield 1.2 + S.r(); if (!timeUp) yield* measure(1.2); tic(p, 'glasses', 0.8); yield 0.8; });
      p.item = null;
    }
    function* messyBuild() {
      const p = chubby, h = houses.get(p), b = benchOf(p);
      const eat = function* (d, to) {
        yield* step(p, 'work');
        p.action = 'eat';
        if (!p.item2) p.item2 = SD.items.smear();
        const l0 = b.bowl;
        yield* S.tween(d, (u) => { b.bowl = lerp(l0, to, u); });
        p.action = 'none';
      };
      yield* step(p, 'work');
      yield* workFor(p, 2.4, () => {}, 'stir');
      yield* step(p, 'house');
      yield* workFor(p, 1.2, (u) => { h.walls = u; });
      h.wob.kick(3);
      p.item = SD.items.pipingBag();
      yield* workFor(p, 1.4, (u) => { h.icing = u * 0.12; }, 'pipe');
      p.item = null;
      // a quick look round... nobody's watching
      p.face(-b.side); yield 0.5; p.face(b.side); yield 0.3;
      yield* eat(2.4, 0.55);
      p.say('heart', 1);
      yield* step(p, 'house');
      yield* workFor(p, 1, (u) => { h.roof = u; });
      h.wob.kick(4); yield 0.3;
      p.item = SD.items.pipingBag();
      yield* workFor(p, 1.1, (u) => { h.icing = 0.12 + u * 0.2; }, 'pipe');
      p.item = null;
      yield* eat(2.6, 0.12);
      yield* step(p, 'house');
      yield* workFor(p, 0.8, (u) => { h.candy = u; });
      // ...and one of those gumdrops looks lonely
      p.action = 'eat'; h.bite = 1; yield 0.8; p.action = 'none';
      // scrape the bowl clean
      yield* step(p, 'work');
      b.bowl = 0; p.item = SD.items.bowl(); p.action = 'eat';
      yield 1.6;
      p.item = null; p.action = 'none'; b.bowl = 0.01;
      p.eyeOverride = 'happy';
      yield 1;
      p.action = 'sleepy';
      yield* waitOut(p, function* () { p.say('zzz', 2); yield 2.2; });
      p.action = 'none'; p.eyeOverride = null;
    }
    // the gingerbread man and the chase
    const pb = benchOf(pip), ph = houses.get(pip);
    const doughX = () => pb.x - pb.side * 52;
    const topLane = pb.lane + 0.6;
    const gmHop = function* (x1, lane1, lift1, dur = 0.5, hgt = 30) {
      const x0 = gm.x, l0 = gm.lane, f0 = gm.lift || 0;
      gm.tx = null; gm.mode = 'hop'; gm.lay = 0;
      if (Math.abs(x1 - x0) > 2) gm.facing = Math.sign(x1 - x0);
      yield* S.tween(dur, (u) => { gm.x = lerp(x0, x1, u); gm.lane = gm.tl = lerp(l0, lane1, u); gm.lift = lerp(f0, lift1, u) + hgt * 4 * u * (1 - u); });
      gm.mode = 'stand'; gm.sq.kick(-7);
    };
    const gmRun = function* (x, lane, spd) { gm.runTo(x, lane, spd); yield* S.until(() => gm.arrived(), 20); };
    const FRONT = 54;
    function* chase() {
      const p = pip, b = pb;
      const away = -side; // he heads away from the camera first
      gm.lay = 0; gm.sq.kick(5);
      p.say('!', 0.8); p.eyeOverride = 'wide';
      gm.facing = away; yield 0.35; gm.facing = -away; yield 0.35; gm.facing = away;
      yield* gmHop(b.x + away * 30, FRONT - 6, 0, 0.55, 26);
      gm.runTo(S.side(away) + away * 40, FRONT, 250);
      // round the end of the bench and after him, flippers going
      p.eyeOverride = null; p.action = 'flail';
      const endX = b.x - b.side * (BW / 2 + 28);
      yield* go(p, endX, 12, 130);
      yield* toLane(p, 50);
      yield* go(p, S.side(away) + away * 30, 50, 175);
      yield* S.until(() => gm.arrived(), 6);
      yield 0.5;
      // ...and back the other way, the whole width of the set
      gm.x = S.side(away) + away * 30; gm.runTo(S.side(-away) - away * 40, FRONT, 300);
      yield 0.7;
      const across = run(go(p, S.side(-away) - away * 30, 50, 190));
      yield* S.until(() => gm.arrived(), 8);
      // while she's still out front, he sneaks back along the back of the set and lies down where he was
      gm.mode = 'sneak'; gm.x = S.side(-away) - away * 20; gm.lane = gm.tl = 3;
      yield* gmRun(doughX(), 3, 140);
      gm.mode = 'stand';
      yield* gmHop(doughX(), topLane, BH, 0.5, 34);
      gm.facing = -b.side;
      yield* S.tween(0.3, (u) => { gm.lay = u; });
      gm.mode = 'lie';
      yield across;
      // she trudges back, worn out
      p.action = 'pant';
      yield* go(p, endX, 50, 115);
      yield* toLane(p, 12);
      p.action = 'none';
      yield* step(p, 'work');
      p.say('?', 1.2); tic(p, 'think', 1.2); yield 1.3;
      p.action = 'shrug'; yield 0.8; p.action = 'none';
    }
    function* cuteBuild() {
      const p = pip, b = pb, h = ph;
      yield* step(p, 'work');
      p.item = SD.items.rollingPin();
      yield* workFor(p, 2.6, (u) => { b.dough = u; }, 'roll');
      p.item = SD.items.cutter();
      p.action = 'tap'; yield 0.7; p.action = 'none';
      p.item = null; b.cut = 1;
      gm.hidden = false; gm.x = doughX(); gm.lane = gm.tl = topLane; gm.lift = BH; gm.lay = 1; gm.mode = 'lie'; gm.facing = -b.side;
      p.say('heart', 0.9); yield 1.2;
      yield* chase();
      yield* step(p, 'house');
      yield* workFor(p, 2.2, (u) => { h.walls = u; });
      if (!timeUp) yield* workFor(p, 1.6, (u) => { h.roof = u; });
      if (!timeUp) { p.item = SD.items.pipingBag(); yield* workFor(p, 2.6, (u) => { h.icing = u; }, 'pipe'); p.item = null; }
      if (!timeUp) yield* workFor(p, 1.6, (u) => { h.candy = u; });
      if (timeUp) return;
      // the finishing touch: him, by the door... he has other ideas
      yield* step(p, 'work');
      p.action = 'reach'; p.reachTo = [gm.x, gm.y - 10];
      yield 0.5;
      p.action = 'none';
      gm.lay = 0; gm.mode = 'stand'; gm.sq.kick(5);
      yield 0.25;
      const tree = trees.find((tr) => Math.sign(tr.x - cx) === -side) || trees[0];
      yield* gmHop(b.x - b.side * (BW / 2 + 20), 8, 0, 0.6, 40);
      yield* gmRun(tree.x + side * 6, 3.5, 220);
      gm.mode = 'peek'; gm.facing = side;
      p.say('?', 1.2); p.action = 'shrug'; yield 1; p.action = 'none';
      p.face(b.side);
    }
    // the chefs keep an eye on things from the back
    let watching = true;
    run((function* () {
      let k = 0;
      while (watching) {
        yield 2.4 + S.r() * 2.2;
        const J = chefs[k++ % 2];
        if (!watching || J.action !== 'none') continue;
        const n = S.r();
        if (n < 0.4) tic(J, 'think', 1.4); else if (n < 0.7) { J.action = 'inspect'; yield 1.4; J.action = 'none'; } else { J.action = 'point'; yield 0.8; J.action = 'none'; }
      }
    })());
    const builds = [run(proBuild()), run(messyBuild())];
    const cute = run(cuteBuild());
    yield* S.until(() => bk.clock >= 1, 70);
    timeUp = true;
    yield [...builds, cute];
    clockRun = false; bk.clock = 1;
    watching = false;

    // ---- 5. time's up ----
    // where the gingerbread man ends up: usually back on Pip's roof, sometimes stealing the show on Specs'
    const gmHouse = S.r() < 0.6 ? pip : specs;
    let gmPlaced = false;
    host.item = SD.items.handbell(); host.action = 'ring';
    w.note(host.x, host.y - 120, '#e9b949');
    cons.forEach((p) => { p.action = 'armsUp'; p.item = null; p.eyeOverride = null; });
    yield 1.2;
    host.action = 'none'; host.item = SD.items.mic();
    cons.forEach((p) => { p.action = 'none'; });

    chefs.forEach((J) => { J.action = 'none'; J.tic = null; });

    // ---- 6. judging, bench by bench ----
    // bench by bench along the line, starting from the far side of the camera
    const order = cons.slice().sort((a, b) => (benchOf(a).x - benchOf(b).x) * side);
    const scores = new Map();
    const tasty = S.r() < 0.3; // Chubby's icing-free house might just taste wonderful
    const pick = (lo, hi) => lo + Math.floor(S.r() * (hi - lo + 1));
    const sneakOnto = (p) => run((function* () {
      const hz = houses.get(p);
      yield 0.8;
      if (gm.lift > 0) {
        // still lying on Pip's bench
        gm.lay = 0; gm.mode = 'stand'; gm.sq.kick(5); yield 0.4;
        if (p !== pip) yield* gmHop(gm.x - pb.side * 24, 3, 0, 0.6, 40);
      }
      if (gm.lift <= 0) {
        gm.mode = 'sneak'; gm.facing = Math.sign(hz.x - gm.x) || 1;
        yield* gmRun(hz.x, 3, 130);
        gm.mode = 'stand';
      }
      yield* gmHop(hz.x, hz.lane + 0.2, BH + hz.topLift() - 4, 0.7, 50);
      gm.mode = 'pose'; gmPlaced = true;
    })());
    sneakOnto(gmHouse);
    let trophyIn = null;
    // Holly brings the trophy on while the last scores go up
    function* bringTrophy() {
      holly.x = S.side(-side) - side * 40; holly.lane = holly.laneT = 38;
      holly.item = SD.items.trophy(); holly.action = 'present';
      yield* go(holly, cx - side * 70, 38, 95);
      holly.face(side);
    }
    for (const p of order) {
      const b = benchOf(p), hz = houses.get(p), hs = b.side;
      // the chefs come round to the house end of the bench, along the front
      const jx = [b.x + hs * (BW / 2 + 44), b.x + hs * (BW / 2 + 98)];
      // the host makes room if he's watching from that end (by then the middle bench is done)
      if (Math.min(...jx.map((x) => Math.abs(host.x - x))) < 160) run(route(host, cx, 32, 95));
      yield chefs.map((J, j) => run((function* () {
        yield j * 0.3;
        yield* route(J, jx[j], j ? 28 : 24, 90);
        J.face(-hs);
      })()));
      const [J0, J1] = chefs;
      J0.action = 'inspect'; tic(J1, 'think', 1.1);
      yield 1.1;
      J0.action = 'none';
      let s0, s1;
      if (p === chubby) {
        J0.action = 'tap'; yield 0.5; J0.action = 'none';
        hz.wob.kick(5);
        yield* S.tween(0.6, (u) => { hz.roofOff = SD.easeIn(u); });
        yield* S.tween(0.35, (u) => { hz.roofFall = SD.easeIn(u); });
        w.puff(hz.x + hs * 30, hz.y, 5, 9, 0.8, 0.5);
        chefs.forEach((J) => { J.eyeOverride = 'wide'; });
        p.face(-hs); p.say('heart', 1.2);
        yield 1;
        chefs.forEach((J) => { J.eyeOverride = null; J.face(-hs); });
        s0 = pick(2, 5); s1 = pick(2, 5);
      } else if (p === specs) {
        J0.action = 'tap'; yield 0.5; J0.action = 'none';
        w.sparkle(hz.x, hz.y - 30, 3, '#ffffff', 6);
        J0.say('!', 0.8);
        tic(p, 'glasses', 0.8);
        yield 0.9;
        s0 = pick(7, 9); s1 = pick(7, 9);
      } else {
        s0 = pick(5, 8); s1 = pick(5, 8);
      }
      // the star of the show?
      if (p === gmHouse) {
        yield* S.until(() => gmPlaced, 6);
        chefs.forEach((J) => { J.say('heart', 1.2); });
        p.face(-hs); p.say('!', 0.8); yield 0.9; p.face(hs);
        s0 = Math.min(10, s0 + (p === pip ? 2 : 1)); s1 = Math.min(10, s1 + (p === pip ? 2 : 1));
      } else if (p === pip) { J1.say('?', 1); yield 0.6; }
      // a taste
      const [hx, hy] = [hz.x, hz.y - 30];
      S.fling((ctx) => { ctx.fillStyle = '#b5692d'; ctx.strokeStyle = COOKIE_EDGE; ctx.lineWidth = 1; ctx.beginPath(); ctx.rect(-4, -3, 8, 6); ctx.fill(); ctx.stroke(); },
        () => [hx, hy], () => J1.localToWorld(24, -66), 0.45, 18);
      yield 0.45;
      J1.action = 'eat'; yield 1; J1.action = 'none';
      if (p === chubby && tasty) { J1.say('heart', 1.2); J1.eyeOverride = 'happy'; s1 = pick(9, 10); yield 0.8; J1.eyeOverride = null; }
      // scores up
      J0.item = SD.items.card(s0, 'F'); J0.action = 'cardUp'; yield 0.5;
      J1.item = SD.items.card(s1, 'F'); J1.action = 'cardUp';
      if (s0 + s1 >= 17) w.sparkle(b.x, b.y - 110, 4, '#ffd43b', 7);
      p.action = s0 + s1 >= 15 ? 'cheer' : s0 + s1 >= 10 ? 'clap' : 'shrug';
      if (p === order[2]) trophyIn = run(bringTrophy());
      yield 1.6;
      chefs.forEach((J) => { J.item = null; J.action = 'none'; });
      p.action = 'none';
      scores.set(p, s0 + s1);
    }
    // the chefs go back to their places
    chefs.map((J, j) => run((function* () { yield* go(J, spots[j], J.laneT, 90); yield* toLane(J, 6); faceIn(J); })()));

    // ---- 7. the winner (or, on a tie, winners) ----
    const best = Math.max(...scores.values());
    const winners = cons.filter((p) => scores.get(p) === best);
    yield* go(host, cx, 32, 90);
    host.face(side); host.action = 'mic'; yield 1.2;
    yield trophyIn;
    host.face(-side); host.action = 'none';
    yield 0.3;
    holly.item = null; holly.action = 'none'; host.item = SD.items.trophy(); host.action = 'present';
    run(go(holly, cx - side * 160, 40, 60));
    // the winners come out front
    const spotsW = winners.length === 1 ? [cx + side * 64] : winners.map((_, i) => cx + side * (64 + i * 64));
    yield winners.map((p, i) => run((function* () {
      const b = benchOf(p), endX = b.x - b.side * (BW / 2 + 28);
      p.eyeOverride = 'wide';
      yield* go(p, endX, 12, 70);
      p.eyeOverride = null;
      yield* route(p, spotsW[i], 26, 70);
      p.face(-side);
    })()));
    host.face(side);
    yield 0.3;
    host.item = null; host.action = 'clap';
    const champ = winners[0];
    champ.item = SD.items.trophy(); champ.action = 'armsUp';
    winners.slice(1).forEach((p) => { p.action = 'cheer'; });
    run((function* () { for (let k = 0; k < 40; k++) { w.confetti(cx + (S.r() - 0.5) * BKW * 0.9, bk.y - BKH + 10, 2, 50); yield 0.05; } })());
    cons.forEach((p) => { if (!winners.includes(p)) p.action = 'clap'; });
    chefs.forEach((J) => { J.action = 'clap'; });
    holly.action = 'clap';
    w.heart(champ.x, champ.y - 110);
    yield 2.2;
    yield 0.8;

    // ---- 8. that's a wrap: the gingerbread man makes his break, Pip goes after him ----
    const away = -side;
    gm.mode = 'stand'; gm.sq.kick(5);
    yield 0.2;
    if (gmPlaced) {
      const hz = houses.get(gmHouse);
      yield* gmHop(hz.x + away * 70, FRONT - 4, 0, 0.7, 40);
    } else {
      yield* gmRun(gm.x, FRONT - 4, 200);
    }
    gm.runTo(S.side(away) + away * 60, FRONT, 250);
    pip.say('!', 0.8); pip.action = 'flail';
    const pipOff = run((function* () {
      const b = benchOf(pip);
      if (pip.lane < 16) yield* go(pip, b.x - b.side * (BW / 2 + 28), 12, 120);
      yield* toLane(pip, 50);
      yield* go(pip, S.side(away) + away * 40, 50, 170);
      pip.dead = true;
    })());
    yield 1.2;
    bk.onAir = 0; cam.tally = 0;
    const rest = all.filter((p) => p !== pip && !p.dead);
    rest.forEach((p) => { p.action = 'wave'; p.face(side); });
    yield 1.2;
    // out along the front of the set, nearest the edge first
    const order2 = rest.slice().sort((a, b) => Math.abs(a.x - S.edgeNear(a.x)) - Math.abs(b.x - S.edgeNear(b.x)));
    yield order2.map((p, i) => run((function* () {
      p.action = 'none'; if (p !== champ) p.item = null;
      yield i * 0.25;
      const b = benchOf(p);
      if (b && p.lane < 16) yield* go(p, b.x - b.side * (BW / 2 + 28), 12, 70);
      if (!b && p.lane < 16) { const gap = p.x; yield* go(p, gap, p.laneT, 70); }
      yield* toLane(p, 28 + (i % 4) * 4);
      yield* go(p, S.edgeNear(p.x), 80);
      p.dead = true;
    })()));
    yield pipOff;
    gm.dead = true;
    // the set stays: the blizzard tidies up
  }

  Object.assign(SD.SCENES, {
    bakeoff: { name: 'Gingerbread Bake-Off', fn: sceneBakeoff, crew: 9 },
  });
})();
