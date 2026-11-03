// Snow Day — props for the snowman and reindeer scenes
'use strict';
(function () {
  const { clamp, lerp, TAU } = SD;
  const PI = Math.PI;
  const INK = '#151b2b';
  const SNOW_LINE = 'rgba(80,110,160,0.75)';

  // ---------- a rolled snowball (grows as it rolls) ----------
  class SnowBall extends SD.Prop {
    constructor(w, x, lane, r) {
      super(w, x, lane); this.r = r; this.rot = 0; this.cy = null; this.shake = new SD.Spring(0, 220, 6); this.seed = (x * 13) | 0;
      this.follow = true;
    }
    update(dt) { super.update(dt); this.shake.step(0, dt); }
    // centre of the ball; on the ground it sits slightly sunk into the snow
    centre() { return [this.x + this.shake.x * 3, this.cy != null ? this.cy : this.y - this.r * 0.93]; }
    top() { const [x, y] = this.centre(); return [x, y - this.r]; }
    bbox() { const [x, y] = this.centre(); return [x - this.r, y - this.r, x + this.r, y + this.r]; }
    roll(dx) { this.x += dx; this.rot += dx / Math.max(8, this.r); }
    drawShadow(ctx) {
      if (this.cy != null) return;
      ctx.save(); ctx.globalAlpha = 0.18 * this.alpha; ctx.fillStyle = '#5b7ba6';
      ctx.beginPath(); ctx.ellipse(this.x, this.y + 2, this.r * 0.95, this.r * 0.16, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
    draw(ctx) {
      const [cx, cy] = this.centre(), r = this.r;
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(cx, cy);
      const path = new Path2D();
      for (let i = 0; i <= 40; i++) {
        const a = (i / 40) * TAU, rr = r * (1 + 0.025 * Math.sin(a * 5 + this.seed) + 0.015 * Math.sin(a * 9 + this.seed * 2));
        if (i === 0) path.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else path.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      path.closePath();
      const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.65, '#eef4fc'); g.addColorStop(1, '#c9d9ec');
      ctx.fillStyle = g; ctx.fill(path);
      // rolled-up texture turning with the ball
      ctx.save(); ctx.clip(path); ctx.rotate(this.rot);
      ctx.strokeStyle = 'rgba(120,150,195,0.32)'; ctx.lineWidth = Math.max(1, r * 0.03); ctx.lineCap = 'round';
      for (let k = 0; k < 6; k++) {
        const a = k * 1.1 + this.seed, rr = r * (0.35 + (k % 3) * 0.2);
        ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2, rr, a, a + 1.3); ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = SNOW_LINE; ctx.lineWidth = 2; ctx.stroke(path);
      ctx.restore();
    }
  }
  SD.SnowBall = SnowBall;

  // ---------- the snowman's face and finery (drawn over the stacked balls) ----------
  class SnowmanDeco extends SD.Prop {
    constructor(w, b1, b2, b3, lane) {
      super(w, b1.x, lane); this.b1 = b1; this.b2 = b2; this.b3 = b3; this.follow = false;
      this.eyes = 0; this.nose = 0; this.smile = 0; this.buttons = 0; this.arms = 0; this.scarf = 0; this.shades = 0; this.hat = 0;
      this.hole = 0; this.mouthO = 0; this.muffle = null; this.facing = 1;
    }
    update(dt) { super.update(dt); if (this.muffle) { this.muffle.t += dt; if (this.muffle.t > this.muffle.life) this.muffle = null; } }
    bbox() { const [x, y] = this.b3.top(); return [x - 120, y - 40, x + 120, this.b1.y]; }
    draw(ctx) {
      const f = this.facing;
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const [hx, hy] = this.b3.centre(), hr = this.b3.r;
      const [mx, my] = this.b2.centre(), mr = this.b2.r;
      // twig arms
      if (this.arms > 0) {
        for (const sx of [-1, 1]) {
          const a = this.arms;
          const x0 = mx + sx * mr * 0.86, y0 = my - mr * 0.25, x1 = x0 + sx * 52 * a, y1 = y0 - 34 * a;
          ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
          ctx.strokeStyle = '#7a4e2b'; ctx.lineWidth = 3.4; ctx.stroke();
          if (a > 0.6) {
            for (const [u, d] of [[0.62, -1], [0.85, 1]]) {
              const px = lerp(x0, x1, u), py = lerp(y0, y1, u);
              ctx.strokeStyle = INK; ctx.lineWidth = 4.6; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + sx * 12, py + d * 10 - 6); ctx.stroke();
              ctx.strokeStyle = '#7a4e2b'; ctx.lineWidth = 2.4; ctx.stroke();
            }
          }
        }
      }
      // the hole Pip burst out of
      if (this.hole > 0) {
        const r = mr * 0.42 * this.hole;
        ctx.fillStyle = '#9fb6d3'; ctx.beginPath(); ctx.ellipse(mx + f * mr * 0.08, my + mr * 0.08, r, r * 0.92, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#6f8cb4'; ctx.beginPath(); ctx.ellipse(mx + f * mr * 0.1, my + mr * 0.12, r * 0.72, r * 0.66, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = SNOW_LINE; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(mx + f * mr * 0.08, my + mr * 0.08, r, r * 0.92, 0, 0, TAU); ctx.stroke();
      }
      // coal buttons
      for (let k = 0; k < 3 && k < Math.ceil(this.buttons * 3); k++) {
        if (this.hole > 0 && k === 1) continue;
        const by = my - mr * 0.45 + k * mr * 0.45;
        ctx.fillStyle = '#22252c'; ctx.beginPath(); ctx.arc(mx + f * mr * 0.12, by, Math.max(3, mr * 0.07), 0, TAU); ctx.fill();
      }
      // scarf between head and body
      if (this.scarf > 0) {
        const sy = hy + hr * 0.82, w = hr * 1.05;
        ctx.globalAlpha = this.alpha * this.scarf;
        ctx.fillStyle = '#e2413b'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(hx - w, sy - 6); ctx.quadraticCurveTo(hx, sy + 4, hx + w, sy - 6); ctx.lineTo(hx + w, sy + 6); ctx.quadraticCurveTo(hx, sy + 16, hx - w, sy + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hx - f * w * 0.5, sy + 6); ctx.lineTo(hx - f * w * 0.62, sy + 40); ctx.lineTo(hx - f * w * 0.3, sy + 40); ctx.lineTo(hx - f * w * 0.25, sy + 8); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(hx - f * w * 0.58 - 6, sy + 22, 13, 4);
        ctx.globalAlpha = this.alpha;
      }
      // face
      const ex = hx + f * hr * 0.16;
      if (this.eyes > 0) {
        ctx.fillStyle = '#22252c';
        for (const dx of [-0.32, 0.3]) { ctx.beginPath(); ctx.arc(ex + dx * hr, hy - hr * 0.2, hr * 0.1 * this.eyes, 0, TAU); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        for (const dx of [-0.32, 0.3]) { ctx.beginPath(); ctx.arc(ex + dx * hr + 1.5, hy - hr * 0.24, hr * 0.03 * this.eyes, 0, TAU); ctx.fill(); }
      }
      if (this.smile > 0) {
        ctx.fillStyle = '#22252c';
        if (this.mouthO > 0.5) { ctx.beginPath(); ctx.ellipse(ex, hy + hr * 0.42, hr * 0.13, hr * 0.17, 0, 0, TAU); ctx.fill(); }
        else for (let k = 0; k < 5 && k < Math.ceil(this.smile * 5); k++) {
          const a = PI * (0.22 + k * 0.14);
          ctx.beginPath(); ctx.arc(ex + Math.cos(a) * hr * 0.42, hy + hr * 0.06 + Math.sin(a) * hr * 0.34, hr * 0.055, 0, TAU); ctx.fill();
        }
      }
      if (this.nose > 0) {
        const nl = hr * 0.62 * this.nose;
        ctx.fillStyle = '#ff8a1f'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(ex - f * 2, hy - hr * 0.08); ctx.lineTo(ex + f * nl, hy + hr * 0.04); ctx.lineTo(ex - f * 2, hy + hr * 0.12); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(160,70,0,0.6)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ex + f * nl * 0.35, hy - hr * 0.02); ctx.lineTo(ex + f * nl * 0.35, hy + hr * 0.08); ctx.moveTo(ex + f * nl * 0.6, hy); ctx.lineTo(ex + f * nl * 0.6, hy + hr * 0.06); ctx.stroke();
      }
      if (this.shades > 0) {
        ctx.save(); ctx.translate(ex, lerp(hy - hr * 0.8, hy - hr * 0.2, this.shades)); ctx.globalAlpha = this.alpha * Math.min(1, this.shades * 2);
        ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(-hr * 0.5, 0); ctx.lineTo(hr * 0.5, 0); ctx.stroke();
        for (const dx of [-0.32, 0.3]) {
          ctx.fillStyle = '#1b1f29'; ctx.beginPath(); SD.rrect(ctx, dx * hr - hr * 0.17, -hr * 0.1, hr * 0.34, hr * 0.22, hr * 0.08); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(dx * hr - hr * 0.08, -hr * 0.04); ctx.lineTo(dx * hr, -hr * 0.06); ctx.stroke();
          ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
        }
        ctx.restore();
      }
      if (this.hat > 0) {
        const [tx, ty] = this.b3.top();
        ctx.save(); ctx.translate(tx, lerp(ty - 60, ty + hr * 0.12, SD.easeOut(this.hat))); ctx.rotate(-0.08 * f);
        ctx.globalAlpha = this.alpha * Math.min(1, this.hat * 3);
        ctx.fillStyle = '#2b2f3a'; ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(-hr * 0.5, 0); ctx.lineTo(-hr * 0.52, -hr * 0.9); ctx.quadraticCurveTo(0, -hr * 0.98, hr * 0.54, -hr * 0.9); ctx.lineTo(hr * 0.52, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#2f9e5f'; ctx.fillRect(-hr * 0.5, -hr * 0.28, hr * 1.02, hr * 0.18); ctx.strokeRect(-hr * 0.5, -hr * 0.28, hr * 1.02, hr * 0.18);
        ctx.fillStyle = '#20232c'; ctx.beginPath(); ctx.ellipse(0, 0, hr * 0.85, hr * 0.14, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      // muffled noises from inside
      if (this.muffle) {
        const u = this.muffle.t / this.muffle.life;
        ctx.globalAlpha = this.alpha * Math.min(1, (1 - u) * 4);
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
        const bx = mx + mr * 0.9, by = my - mr * 0.7 - u * 10;
        ctx.beginPath(); SD.rrect(ctx, bx - 18, by - 12, 36, 20, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = INK; ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(this.muffle.text, bx, by - 2);
      }
      ctx.restore();
    }
  }
  SD.SnowmanDeco = SnowmanDeco;

  // ---------- held things ----------
  SD.items.carrot = () => ({ at: 'front', draw(ctx, p, hx, hy) {
    ctx.translate(hx + 2, hy + 4); ctx.rotate(-0.5);
    ctx.fillStyle = '#ff8a1f'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(22, 2); ctx.lineTo(-4, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#2f9e5f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-4, 2); ctx.lineTo(-11, -4); ctx.moveTo(-4, 3); ctx.lineTo(-12, 3); ctx.moveTo(-4, 4); ctx.lineTo(-10, 9); ctx.stroke();
  } });
  SD.items.coal = () => ({ at: 'front', draw(ctx, p, hx, hy) { ctx.fillStyle = '#22252c'; ctx.beginPath(); ctx.arc(hx + 2, hy + 4, 4.5, 0, TAU); ctx.fill(); } });
  // an open book with a drawing of a deer and a big tick
  SD.items.book = () => ({ at: 'front', draw(ctx, p, hx, hy) {
    ctx.translate(hx + 4, hy - 8); ctx.scale(p.fx < 0 ? -1 : 1, 1);
    ctx.fillStyle = '#2f6fd0'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
    ctx.beginPath(); SD.rrect(ctx, -20, -14, 40, 26, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.quadraticCurveTo(-9, -15, -18, -12); ctx.lineTo(-18, 9); ctx.quadraticCurveTo(-9, 6, 0, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.quadraticCurveTo(9, -15, 18, -12); ctx.lineTo(18, 9); ctx.quadraticCurveTo(9, 6, 0, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
    // a little deer doodle and a tick
    ctx.strokeStyle = '#7a4e2b'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(-9, -1, 5, 3, 0, 0, TAU); ctx.moveTo(-5, -2); ctx.lineTo(-3, -7); ctx.moveTo(-3, -7); ctx.lineTo(-1, -9); ctx.moveTo(-3, -7); ctx.lineTo(-5, -10);
    ctx.moveTo(-12, 2); ctx.lineTo(-12, 6); ctx.moveTo(-7, 2); ctx.lineTo(-7, 6); ctx.stroke();
    ctx.strokeStyle = '#2f9e5f'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(5, -2); ctx.lineTo(8, 3); ctx.lineTo(14, -6); ctx.stroke();
  } });
  SD.items.bigSnowball = (r) => ({ at: 'up', draw(ctx) {
    const g = ctx.createRadialGradient(-r * 0.3, -131 - r * 1.2, r * 0.1, 0, -131 - r, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d4e2f2');
    ctx.fillStyle = g; ctx.strokeStyle = SNOW_LINE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -131 - r + 6, r, 0, TAU); ctx.fill(); ctx.stroke();
  } });

  // =====================================================================
  // THE REINDEER — an original design: tall, kind, a bit clumsy, with a jingle-bell collar
  // =====================================================================
  class Reindeer {
    constructor(world, x, lane) {
      this.world = world; this.x = x; this.lane = lane; this.y = world.surfaceY(x) + lane;
      this.facing = 1; this.fx = 1; this.speed = 0; this.target = null; this.maxSpeed = 90;
      this.phase = 0; this.t = 0; this.alpha = 1; this.dead = false;
      this.neck = 0; this.neckT = 0;     // 0 = head up, 1 = lowered to the ground
      this.shake = 0;                    // head shake ("no thanks")
      this.nod = 0;                      // head nod
      this.chew = 0; this.eyes = 'open'; this.eyeOverride = null; this.blinkAt = 2; this.blinkT = 0;
      this.kneel = 0; this.kneelT = 0;
      this.bounce = 0; this.size = 0.95; this.riders = [];
      this.bubble = null; this.earFlick = new SD.Spring(0, 90, 5); this.tail = new SD.Spring(0, 70, 4);
      this.jingle = 0;
    }
    goTo(x, speed) { this.target = x; if (speed) this.maxSpeed = speed; }
    arrived() { return this.target == null; }
    face(d) { this.facing = d >= 0 ? 1 : -1; }
    say(text, life = 1.6) { this.bubble = { text, t: 0, life }; }
    update(dt) {
      const w = this.world;
      this.t += dt;
      let moved = 0;
      if (this.target != null) {
        const d = this.target - this.x;
        const sp = this.maxSpeed * (w.speedMul ? w.speedMul(this.x) : 1);
        if (Math.abs(d) < 1) { this.x = this.target; this.target = null; }
        else { const step = Math.sign(d) * Math.min(Math.abs(d), sp * dt); this.x += step; moved = step; this.facing = Math.sign(d); }
      }
      this.speed = moved / Math.max(dt, 1e-4);
      this.phase += Math.abs(moved) / 34 * PI;
      if (Math.abs(this.fx - this.facing) > 0.001) this.fx = clamp(this.fx + Math.sign(this.facing - this.fx) * dt * 5, -1, 1);
      this.y = w.surfaceY(this.x) + this.lane;
      this.neck = SD.damp(this.neck, this.neckT, 4, dt);
      this.kneel = SD.damp(this.kneel, this.kneelT, 3, dt);
      this.bounce = Math.abs(Math.sin(this.phase)) * Math.min(1, Math.abs(this.speed) / 60) * 5;
      this.blinkAt -= dt; if (this.blinkAt <= 0) { this.blinkT = 0.14; this.blinkAt = 2.5 + Math.sin(this.t * 3.1) * 1.5 + 1.5; }
      if (this.blinkT > 0) this.blinkT -= dt;
      this.earFlick.step(0, dt); this.tail.step(Math.sin(this.t * 1.7) * 0.15, dt);
      if (Math.sin(this.t * 0.9) > 0.995) this.earFlick.kick(6);
      if (this.bubble) { this.bubble.t += dt; if (this.bubble.t > this.bubble.life) this.bubble = null; }
      // the bell jingles while walking
      this.jingle += Math.abs(moved);
      if (this.jingle > 70) { this.jingle = 0; const [bx, by] = this.local(56, -126); w.note(bx, by - 10, '#e0a800'); }
    }
    // local (facing right, origin on the ground under the body) -> world
    local(lx, ly) { const s = this.size; return [this.x + lx * s * this.fx, this.y + (ly + this.kneel * 58 - this.bounce) * s]; }
    backPoint(i, n) { const u = n > 1 ? i / (n - 1) : 0.5; return this.local(lerp(-46, 30, u), -150); }
    headPoint() { return this.local(...this._headLocal()); }
    _neckAngle() { return this.neck * 1.05 + Math.sin(this.t * 2.2) * 0.02 + this.nod * Math.sin(this.t * 9) * 0.12; }
    _headLocal() {
      const a = this._neckAngle(), bx = 48, by = -122;
      const dx = 30, dy = -58;
      return [bx + dx * Math.cos(a) - dy * Math.sin(a), by + dx * Math.sin(a) + dy * Math.cos(a)];
    }
    drawShadow(ctx) {
      ctx.save(); ctx.globalAlpha = 0.16 * this.alpha; ctx.fillStyle = '#4b6a96';
      ctx.beginPath(); ctx.ellipse(this.x, this.y + 2, 80 * this.size, 10 * this.size, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
    draw(ctx) {
      const s = this.size;
      ctx.save(); ctx.globalAlpha = this.alpha;
      ctx.translate(this.x, this.y - this.bounce * s); ctx.scale(this.fx * s, s);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const FUR = '#9a6a43', FUR_D = '#7a5133', FUR_L = '#c79a6b', CREAM = '#f3e3c8';
      const k = this.kneel;
      // legs: diagonal pairs move together (a trot); far legs darker, behind the body
      const leg = (hx, hy, ph, far) => {
        const sw = Math.sin(this.phase + ph) * 0.42 * Math.min(1, Math.abs(this.speed) / 40);
        // kneeling: front legs fold back under the chest, back legs tuck forward under the belly
        const front = hx > 0;
        const up = front ? -1.2 * k : 1.2 * k, low = front ? 2.4 * k : -2.4 * k;
        ctx.save(); ctx.translate(hx, hy + k * 58);
        ctx.rotate(sw + up);
        const col = far ? FUR_D : FUR;
        ctx.strokeStyle = INK; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 46); ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = 11; ctx.stroke();
        ctx.translate(0, 46); ctx.rotate(-sw * 0.6 + Math.max(0, Math.sin(this.phase + ph)) * 0.4 * (1 - k) + low);
        ctx.strokeStyle = INK; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 42); ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = 7.5; ctx.stroke();
        ctx.fillStyle = '#3b2a1f'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
        ctx.beginPath(); SD.rrect(ctx, -6, 38, 13, 9, 3); ctx.fill(); ctx.stroke();
        ctx.restore();
      };
      leg(-40, -96, PI, true); leg(36, -96, 0, true);
      // tail
      ctx.save(); ctx.translate(-70, -128 + k * 58); ctx.rotate(-0.6 + this.tail.x);
      ctx.fillStyle = CREAM; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, -8, 7, 12, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
      // body
      const by = -112 + k * 58;
      const bg = ctx.createLinearGradient(0, by - 36, 0, by + 34);
      bg.addColorStop(0, FUR_L); bg.addColorStop(0.5, FUR); bg.addColorStop(1, FUR_D);
      ctx.fillStyle = bg; ctx.strokeStyle = INK; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.ellipse(-4, by, 74, 34, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.ellipse(-4, by, 74, 34, 0, 0, TAU); ctx.clip();
      ctx.fillStyle = CREAM; ctx.beginPath(); ctx.ellipse(6, by + 30, 56, 14, 0, 0, TAU); ctx.fill();
      ctx.restore();
      // near legs
      leg(-50, -96, 0, false); leg(44, -96, PI, false);
      // neck + head (rotate about the base of the neck)
      ctx.save(); ctx.translate(48, -122 + k * 58); ctx.rotate(this._neckAngle());
      ctx.fillStyle = FUR; ctx.strokeStyle = INK; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(-16, 10); ctx.quadraticCurveTo(-8, -40, 18, -60); ctx.lineTo(42, -50); ctx.quadraticCurveTo(22, -24, 22, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
      // fluffy cream bib
      ctx.fillStyle = CREAM;
      ctx.beginPath(); ctx.moveTo(8, 12); ctx.quadraticCurveTo(26, -10, 30, -38); ctx.quadraticCurveTo(18, -14, 0, 14); ctx.closePath(); ctx.fill();
      // collar + bell
      ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-12, -6); ctx.quadraticCurveTo(4, 2, 24, -8); ctx.stroke();
      ctx.strokeStyle = '#c7364a'; ctx.lineWidth = 6; ctx.stroke();
      const bs = Math.sin(this.t * 7) * 0.2 * Math.min(1, Math.abs(this.speed) / 30 + 0.2);
      ctx.save(); ctx.translate(8, 2); ctx.rotate(bs);
      ctx.fillStyle = '#ffcf3f'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(0, 7, 7, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5, 9); ctx.lineTo(5, 9); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(-2, 4, 2, 0, TAU); ctx.fill();
      ctx.restore();
      // head
      ctx.translate(30, -58);
      ctx.rotate(Math.sin(this.t * 14) * 0.22 * this.shake);
      // far antler
      this._antler(ctx, -4, -14, -1, '#a98a63');
      // ear
      ctx.save(); ctx.translate(-10, -10); ctx.rotate(-0.9 - this.earFlick.x * 0.08);
      ctx.fillStyle = FUR; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, -12, 7, 14, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8b7a0'; ctx.beginPath(); ctx.ellipse(0, -12, 3.5, 9, 0, 0, TAU); ctx.fill();
      ctx.restore();
      // skull + muzzle
      ctx.fillStyle = FUR; ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(-14, 2); ctx.quadraticCurveTo(-16, -20, 4, -20); ctx.quadraticCurveTo(22, -20, 36, -6);
      ctx.quadraticCurveTo(44, 2, 38, 10); ctx.quadraticCurveTo(24, 16, 6, 12); ctx.quadraticCurveTo(-10, 12, -14, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = CREAM; ctx.beginPath(); ctx.ellipse(28, 4, 12, 7, 0.1, 0, TAU); ctx.fill();
      // chewing jaw
      const ch = this.chew > 0 ? Math.max(0, Math.sin(this.t * 10)) * 3 : 0;
      ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(20, 9 + ch); ctx.quadraticCurveTo(30, 13 + ch, 37, 9 + ch * 0.6); ctx.stroke();
      // nose (dark brown, glossy)
      ctx.fillStyle = '#3b2a1f'; ctx.beginPath(); ctx.ellipse(40, -1, 6, 4.5, 0.2, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(39, -3, 2, 1.2, 0.2, 0, TAU); ctx.fill();
      // eye
      const eyes = this.eyeOverride || (this.blinkT > 0 ? 'blink' : 'open');
      if (eyes === 'happy') { ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(4, -8); ctx.quadraticCurveTo(9, -14, 14, -8); ctx.stroke(); }
      else if (eyes === 'blink') { ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(4, -9); ctx.quadraticCurveTo(9, -6, 14, -9); ctx.stroke(); }
      else {
        ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(9, -9, 4.4, 5.2, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(10.5, -11, 1.7, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(7.6, -6.8, 0.8, 0, TAU); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(3, -16); ctx.lineTo(1, -18); ctx.moveTo(6, -17); ctx.lineTo(5, -19.5); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,140,150,0.35)'; ctx.beginPath(); ctx.ellipse(16, 2, 4.5, 3, 0, 0, TAU); ctx.fill();
      // near antler
      this._antler(ctx, 2, -17, 1, '#c8a87e');
      ctx.restore();
      ctx.restore();
      if (this.bubble) this._bubble(ctx);
    }
    _antler(ctx, x, y, side, col) {
      ctx.save(); ctx.translate(x, y);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const path = new Path2D();
      path.moveTo(0, 0); path.quadraticCurveTo(-14 * side - 6, -26, -10 - 14 * side, -52);
      path.moveTo(-6 - 6 * side, -20); path.quadraticCurveTo(6, -30, 10 + side * 2, -40);
      path.moveTo(-10 - 10 * side, -36); path.quadraticCurveTo(-2, -48, 2 + side * 2, -60);
      path.moveTo(-9 - 13 * side, -46); path.quadraticCurveTo(-24 - side * 4, -56, -28 - side * 6, -60);
      ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.stroke(path);
      ctx.strokeStyle = col; ctx.lineWidth = 4.6; ctx.stroke(path);
      ctx.restore();
    }
    _bubble(ctx) {
      const b = this.bubble, [hx, hy] = this.headPoint();
      const u = b.t / b.life;
      ctx.save(); ctx.globalAlpha = Math.min(1, (1 - u) * 4) * this.alpha;
      ctx.translate(hx, hy - 80 * this.size); ctx.scale(SD.backOut(Math.min(1, b.t / 0.18)), SD.backOut(Math.min(1, b.t / 0.18)));
      if (b.text === 'heart') {
        ctx.fillStyle = '#ff6f86'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 2); ctx.bezierCurveTo(-16, -9, -7, -23, 0, -14); ctx.bezierCurveTo(7, -23, 16, -9, 0, 2); ctx.fill(); ctx.stroke();
      } else {
        ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
        const tw = Math.max(18, ctx.measureText(b.text).width + 14);
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
        ctx.beginPath(); SD.rrect(ctx, -tw / 2, -26, tw, 22, 9); ctx.fill(); ctx.stroke();
        ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.text, 0, -15);
      }
      ctx.restore();
    }
  }
  SD.Reindeer = Reindeer;
})();
