// Snow Day — props for the newer scenes (igloos, fishing, flying lessons, zipline, tug-of-war...)
'use strict';
(function () {
  const { clamp, lerp, TAU } = SD;
  const PI = Math.PI;
  const INK = '#151b2b';
  const Prop = SD.Prop;

  // ---------- igloo (built row by row from blocks) ----------
  // ---------- igloos: several designs, built from the bottom up ----------
  // each design: total height, half-width at a height (for where blocks land), outline, seat on top,
  // flag spot, door type, and decorations once it's finished
  const IGLOO = {
    classic: {
      H: (R) => R * 0.86,
      hw: (R, h, H) => R * Math.sqrt(Math.max(0, 1 - (h / H) ** 2)),
      path(R, H) { const p = new Path2D(); p.ellipse(0, 0, R, H, 0, PI, TAU); p.closePath(); return p; },
      seat: (R, H) => [0, -H], flag: (R, H) => [0, -H], door: 'tunnel',
    },
    beehive: {
      H: (R) => R * 1.18,
      hw: (R, h, H) => R * 0.8 * Math.sqrt(Math.max(0, 1 - (h / H) ** 2.2)),
      path(R, H) {
        const b = R * 0.8, p = new Path2D();
        p.moveTo(-b, 0); p.bezierCurveTo(-b, -H * 0.72, -b * 0.42, -H, 0, -H); p.bezierCurveTo(b * 0.42, -H, b, -H * 0.72, b, 0); p.closePath(); return p;
      },
      seat: (R, H) => [0, -H], flag: (R, H) => [-R * 0.16, -H * 0.98], door: 'tunnel',
      deco(ctx, R, H, ig) {
        // a little chimney with a curl of smoke
        const x = R * 0.26, y = -H * 0.86;
        ctx.fillStyle = '#eef4fc'; ctx.strokeStyle = 'rgba(80,110,160,0.75)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); SD.rrect(ctx, x - 8, y - 20, 16, 22, 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(200,210,225,0.8)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (let k = 0; k < 3; k++) {
          const u = (ig.t * 0.5 + k / 3) % 1;
          ctx.globalAlpha = (1 - u) * 0.8 * ig.alpha;
          ctx.beginPath(); ctx.arc(x + Math.sin(u * 6 + k) * 6, y - 26 - u * 40, 4 + u * 5, 0, TAU); ctx.stroke();
        }
        ctx.globalAlpha = ig.alpha;
      },
    },
    castle: {
      H: (R) => R * 1.04,
      hw: (R, h, H) => (h < R * 0.6 ? R * 0.88 : R * 0.84),
      path(R, H) {
        const p = new Path2D(), c = R * 0.6;
        // keep: a low dome between two towers
        p.moveTo(-R * 0.62, 0); p.lineTo(-R * 0.62, -c); p.quadraticCurveTo(0, -R * 1.02, R * 0.62, -c); p.lineTo(R * 0.62, 0); p.closePath();
        for (const sx of [-1, 1]) {
          const x0 = sx * R * 0.54, x1 = sx * R * 0.9, l = Math.min(x0, x1), w = Math.abs(x1 - x0), m = w / 5;
          p.moveTo(l, 0); p.lineTo(l, -H); p.lineTo(l + m, -H); p.lineTo(l + m, -H + 8); p.lineTo(l + 2 * m, -H + 8); p.lineTo(l + 2 * m, -H);
          p.lineTo(l + 3 * m, -H); p.lineTo(l + 3 * m, -H + 8); p.lineTo(l + 4 * m, -H + 8); p.lineTo(l + 4 * m, -H); p.lineTo(l + w, -H); p.lineTo(l + w, 0); p.closePath();
        }
        return p;
      },
      seat: (R, H) => [0, -R * 0.8], flag: (R, H) => [-R * 0.72, -H], door: 'arch',
      deco(ctx, R, H) {
        // arrow slits in the towers
        ctx.fillStyle = '#2b3a55';
        for (const sx of [-1, 1]) { ctx.beginPath(); SD.rrect(ctx, sx * R * 0.72 - 3, -H * 0.62, 6, 14, 3); ctx.fill(); }
      },
    },
    twin: {
      H: (R) => R * 0.72,
      hw: (R, h, H) => (h < R * 0.38 ? R * 0.95 : R * 0.7 * Math.sqrt(Math.max(0, 1 - (h / H) ** 2))),
      path(R, H, door) {
        const p = new Path2D(), cx = -door * R * 0.24, cx2 = door * R * 0.6;
        p.ellipse(cx, 0, R * 0.74, H, 0, PI, TAU); p.closePath();
        p.ellipse(cx2, 0, R * 0.44, R * 0.4, 0, PI, TAU); p.closePath();
        return p;
      },
      seat: (R, H, door) => [-door * R * 0.24, -H], flag: (R, H, door) => [-door * R * 0.24, -H], door: 'tunnel', doorAt: 1.02,
      deco(ctx, R, H, ig) {
        // a round ice window in the big dome
        const x = -ig.door * R * 0.24 - ig.door * R * 0.22, y = -H * 0.52;
        const g = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 9);
        g.addColorStop(0, '#ffe9a8'); g.addColorStop(1, '#ffb64d');
        ctx.fillStyle = g; ctx.strokeStyle = 'rgba(80,110,160,0.8)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x + 9, y); ctx.moveTo(x, y - 9); ctx.lineTo(x, y + 9); ctx.lineWidth = 1.4; ctx.stroke();
      },
    },
    geodesic: {
      H: (R) => R * 0.9,
      hw: (R, h, H) => R * Math.sqrt(Math.max(0, 1 - (h / H) ** 2)),
      pts(R, H) { const n = 7, out = []; for (let i = 0; i <= n; i++) { const a = PI + (i / n) * PI; out.push([Math.cos(a) * R, Math.sin(a) * H]); } return out; },
      path(R, H) { const p = new Path2D(); const pts = this.pts(R, H); p.moveTo(pts[0][0], 0); for (const [x, y] of pts) p.lineTo(x, y); p.closePath(); return p; },
      facets(ctx, R, H) {
        // triangle panels instead of brick courses
        const outer = this.pts(R, H), inner = [];
        for (let i = 0; i <= 5; i++) { const a = PI + ((i + 0.5) / 6) * PI; inner.push([Math.cos(a) * R * 0.55, Math.sin(a) * H * 0.55 - H * 0.02]); }
        ctx.beginPath();
        for (let i = 0; i < inner.length; i++) {
          const [x, y] = inner[i];
          ctx.moveTo(x, y); ctx.lineTo(outer[i][0], outer[i][1]); ctx.moveTo(x, y); ctx.lineTo(outer[i + 1][0], outer[i + 1][1]);
          if (outer[i + 2] && i === inner.length - 1) { ctx.moveTo(x, y); ctx.lineTo(outer[i + 2][0], outer[i + 2][1]); }
          if (i) { ctx.moveTo(inner[i - 1][0], inner[i - 1][1]); ctx.lineTo(x, y); }
          ctx.moveTo(x, y); ctx.lineTo(0, -H * 0.12);
        }
        ctx.stroke();
      },
      seat: (R, H) => [0, -H], flag: (R, H) => [0, -H], door: 'tunnel',
      deco(ctx, R, H) {
        // a round porthole near the top
        ctx.fillStyle = '#9fd3ff'; ctx.strokeStyle = 'rgba(80,110,160,0.85)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(-R * 0.18, -H * 0.66, 8, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(-R * 0.18, -H * 0.66, 5, -2.6, -1.6); ctx.stroke();
      },
    },
    cake: {
      H: (R) => R * 1.06,
      hw: (R, h, H) => (h < R * 0.36 ? R : h < R * 0.66 ? R * 0.7 : R * 0.4 * Math.sqrt(Math.max(0, 1 - ((h - R * 0.66) / (H - R * 0.66)) ** 2))),
      path(R, H) {
        const p = new Path2D();
        p.moveTo(-R, 0); p.lineTo(-R, -R * 0.3); p.quadraticCurveTo(-R, -R * 0.36, -R * 0.94, -R * 0.36); p.lineTo(R * 0.94, -R * 0.36); p.quadraticCurveTo(R, -R * 0.36, R, -R * 0.3); p.lineTo(R, 0); p.closePath();
        p.moveTo(-R * 0.7, -R * 0.34); p.lineTo(-R * 0.7, -R * 0.62); p.quadraticCurveTo(-R * 0.7, -R * 0.67, -R * 0.64, -R * 0.67); p.lineTo(R * 0.64, -R * 0.67); p.quadraticCurveTo(R * 0.7, -R * 0.67, R * 0.7, -R * 0.62); p.lineTo(R * 0.7, -R * 0.34); p.closePath();
        p.ellipse(0, -R * 0.65, R * 0.4, H - R * 0.65, 0, PI, TAU); p.closePath();
        return p;
      },
      seat: (R, H) => [0, -H], flag: (R, H) => [R * 0.12, -H * 0.97], door: 'arch',
      deco(ctx, R, H) {
        // candy-stripe trim on each tier and a cherry on top
        ctx.lineWidth = 4; ctx.lineCap = 'butt';
        for (const [hw, y] of [[R * 0.97, -R * 0.36], [R * 0.68, -R * 0.67]]) {
          ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-hw, y + 2); ctx.lineTo(hw, y + 2); ctx.stroke();
          ctx.strokeStyle = '#e2413b'; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(-hw, y + 2); ctx.lineTo(hw, y + 2); ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.fillStyle = '#e2413b'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(-R * 0.04, -H - 5, 6, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-R * 0.04, -H - 10); ctx.quadraticCurveTo(-R * 0.02 + 4, -H - 18, -R * 0.02 + 8, -H - 19); ctx.stroke();
      },
    },
  };
  SD.IGLOO_DESIGNS = Object.keys(IGLOO);

  class Igloo extends Prop {
    constructor(w, x, lane, R, team, door = 1, design = 'classic') {
      super(w, x, lane); this.R = R; this.prog = 0; this.squash = 0; this.flag = 0; this.team = team; this.door = door; this.wob = new SD.Spring(0, 60, 4);
      this.design = IGLOO[design] ? design : 'classic';
    }
    get D() { return IGLOO[this.design]; }
    get H() { return this.D.H(this.R); }
    update(dt) { super.update(dt); this.wob.step(0, dt); }
    bbox() { return [this.x - this.R - 30, this.y - this.H - 60, this.x + this.R + 30, this.y + 5]; }
    // half width at a height above the ground (where thrown blocks can land)
    halfWidth(h) { return this.D.hw(this.R, h, this.H); }
    // world points used by the scene
    seat() { const [sx, sy] = this.D.seat(this.R, this.H, this.door); return [this.x + sx, this.y + 4 + sy * (1 - this.squash * 0.7) + 4]; }
    doorX() { return this.D.door === 'arch' ? this.x : this.x + this.door * this.R * (this.D.doorAt || 0.78); }
    draw(ctx) {
      if (this.prog <= 0.001) return;
      const D = this.D, R = this.R, H = this.H;
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y + 4);
      ctx.scale((1 + this.squash * 0.35) * (1 + this.wob.x * 0.05), (1 - this.squash * 0.7) * (1 - this.wob.x * 0.05));
      ctx.lineJoin = 'round';
      const shape = D.path(R, H, this.door);
      const built = clamp(this.prog, 0, 1) * H;
      const fin = clamp((this.prog - 0.92) / 0.08, 0, 1);
      // entrance tunnel sits in front of the wall, so it goes on after
      ctx.save();
      ctx.beginPath(); ctx.rect(-R * 1.4, -built - 1, R * 2.8, built + 6); ctx.clip();
      const g = ctx.createLinearGradient(-R, -H, R, 0);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#eef4fc'); g.addColorStop(1, '#cfdeef');
      ctx.fillStyle = g; ctx.fill(shape);
      ctx.save(); ctx.clip(shape);
      ctx.strokeStyle = 'rgba(110,145,195,0.45)'; ctx.lineWidth = 1.3;
      if (D.facets) D.facets(ctx, R, H);
      else {
        const rowH = Math.max(11, H / 7);
        for (let y = -rowH, k = 0; y > -H - rowH; y -= rowH, k++) {
          ctx.beginPath(); ctx.moveTo(-R * 1.3, y); ctx.lineTo(R * 1.3, y); ctx.stroke();
          ctx.beginPath();
          for (let x = -R * 1.3 + (k % 2) * 13; x < R * 1.3; x += 26) { ctx.moveTo(x, y); ctx.lineTo(x, y + rowH); }
          ctx.stroke();
        }
      }
      // shading on the side away from the light
      const sh = ctx.createLinearGradient(-R, 0, R, 0);
      sh.addColorStop(0, 'rgba(120,150,195,0)'); sh.addColorStop(1, 'rgba(120,150,195,0.18)');
      ctx.fillStyle = sh; ctx.fillRect(-R * 1.3, -H - 30, R * 2.6, H + 34);
      ctx.restore();
      ctx.strokeStyle = 'rgba(80,110,160,0.75)'; ctx.lineWidth = 2; ctx.stroke(shape);
      ctx.restore();
      // blocks still being placed along the top edge
      if (this.prog < 0.999) {
        const y = -built, hw = this.halfWidth(built);
        ctx.fillStyle = '#f6f9fe'; ctx.strokeStyle = 'rgba(80,110,160,0.6)'; ctx.lineWidth = 1.2;
        for (let x = -hw + 6; x < hw - 6; x += 15) { ctx.beginPath(); SD.rrect(ctx, x - 6, y - 5, 12, 6, 2); ctx.fill(); ctx.stroke(); }
      }
      if (fin > 0 && this.squash < 0.5) {
        ctx.globalAlpha = this.alpha * fin;
        if (D.deco) D.deco(ctx, R, H, this);
        if (D.door === 'arch') {
          const dw = Math.min(22, R * 0.2), dh = Math.min(40, R * 0.36);
          ctx.fillStyle = '#2b3a55'; ctx.strokeStyle = 'rgba(80,110,160,0.8)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-dw, 0); ctx.lineTo(-dw, -dh + dw); ctx.arc(0, -dh + dw, dw, PI, TAU); ctx.lineTo(dw, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        ctx.globalAlpha = this.alpha;
      }
      // entrance tunnel
      if (D.door === 'tunnel' && this.prog > 0.25 && this.squash < 0.5) {
        const dx = this.door * R * (D.doorAt || 0.78), k = Math.min(1, R / 90);
        ctx.fillStyle = '#f2f7fd'; ctx.strokeStyle = 'rgba(80,110,160,0.75)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(dx - 26 * k, 0); ctx.quadraticCurveTo(dx - 26 * k, -40 * k, dx + this.door * 12 * k, -40 * k); ctx.quadraticCurveTo(dx + 30 * k, -40 * k, dx + 30 * k, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#2b3a55';
        ctx.beginPath(); ctx.moveTo(dx - 14 * k, 0); ctx.quadraticCurveTo(dx - 14 * k, -26 * k, dx + 2 * k, -26 * k); ctx.quadraticCurveTo(dx + 18 * k, -26 * k, dx + 18 * k, 0); ctx.closePath(); ctx.fill();
      }
      // team flag
      if (this.flag > 0.01) {
        const [fx, fy] = D.flag(R, H, this.door);
        ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(fx, fy + 2); ctx.lineTo(fx, fy - 40 * this.flag); ctx.stroke();
        ctx.fillStyle = this.team; ctx.lineWidth = 1.6;
        const wv = Math.sin(this.t * 6) * 3;
        ctx.beginPath(); ctx.moveTo(fx, fy - 40 * this.flag); ctx.quadraticCurveTo(fx + 14, fy - 36 * this.flag + wv, fx + 26, fy - 32 * this.flag); ctx.lineTo(fx, fy - 22 * this.flag); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }
  }
  SD.Igloo = Igloo;

  // a desk carved out of snow blocks, with a "JUDGES" banner
  class JudgeTable extends Prop {
    constructor(w, x, lane, W = 190) { super(w, x, lane); this.W = W; }
    bbox() { return [this.x - this.W / 2, this.y - 60, this.x + this.W / 2, this.y + 5]; }
    draw(ctx) {
      const W = this.W, h = 30;
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y + 3);
      ctx.lineJoin = 'round';
      const g = ctx.createLinearGradient(0, -h, 0, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d6e3f2');
      ctx.fillStyle = g; ctx.strokeStyle = 'rgba(80,110,160,0.75)'; ctx.lineWidth = 2;
      ctx.beginPath(); SD.rrect(ctx, -W / 2, -h, W, h, 4); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.beginPath(); SD.rrect(ctx, -W / 2, -h, W, h, 4); ctx.clip();
      ctx.strokeStyle = 'rgba(110,145,195,0.4)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-W / 2, -h + 15); ctx.lineTo(W / 2, -h + 15); ctx.stroke();
      ctx.beginPath(); for (let k = 0; k < 2; k++) for (let x = -W / 2 + (k % 2) * 16; x < W / 2; x += 32) { ctx.moveTo(x, -h + k * 15); ctx.lineTo(x, -h + (k + 1) * 15); } ctx.stroke();
      ctx.restore();
      // top slab
      ctx.fillStyle = '#f7fbff'; ctx.strokeStyle = 'rgba(80,110,160,0.8)';
      ctx.beginPath(); SD.rrect(ctx, -W / 2 - 8, -h - 7, W + 16, 9, 3); ctx.fill(); ctx.stroke();
      // banner
      const bw = Math.min(W - 30, 120);
      ctx.fillStyle = '#c7364a'; ctx.strokeStyle = '#151b2b'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(-bw / 2, -h + 2); ctx.lineTo(bw / 2, -h + 2); ctx.lineTo(bw / 2, -h + 22); ctx.lineTo(0, -h + 27); ctx.lineTo(-bw / 2, -h + 22); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd43b'; ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('JUDGES', 0, -h + 13);
      // a little bell
      ctx.fillStyle = '#f2c94c'; ctx.strokeStyle = '#151b2b'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(W / 2 - 24, -h - 7); ctx.quadraticCurveTo(W / 2 - 24, -h - 20, W / 2 - 16, -h - 20); ctx.quadraticCurveTo(W / 2 - 8, -h - 20, W / 2 - 8, -h - 7); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(W / 2 - 16, -h - 22, 2, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
  SD.JudgeTable = JudgeTable;

  // ---------- fishing ----------
  class Hole extends Prop {
    constructor(w, x, lane) { super(w, x, lane); this.r = 0; this.rip = 0; }
    bbox() { return [this.x - 30, this.y - 20, this.x + 30, this.y + 6]; }
    draw(ctx) {
      if (this.r <= 0.5) return;
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y + 3);
      ctx.fillStyle = '#e8f4fc'; ctx.beginPath(); ctx.ellipse(0, 0, this.r + 6, (this.r + 6) * 0.3, 0, 0, TAU); ctx.fill();
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, this.r);
      g.addColorStop(0, '#0f2c4d'); g.addColorStop(1, '#1f4f7a');
      ctx.fillStyle = g; ctx.strokeStyle = 'rgba(60,100,150,0.9)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(0, 0, this.r, this.r * 0.28, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(160,210,255,0.6)'; ctx.lineWidth = 1;
      const k = (this.t * 0.8) % 1;
      ctx.beginPath(); ctx.ellipse(0, 0, this.r * (0.3 + k * 0.6), this.r * 0.28 * (0.3 + k * 0.6), 0, 0, TAU); ctx.globalAlpha = this.alpha * (1 - k); ctx.stroke();
      ctx.restore();
    }
  }
  SD.Hole = Hole;

  class Bucket extends Prop {
    constructor(w, x, lane, col) { super(w, x, lane); this.col = col; }
    top() { return [this.x, this.y - 26]; }
    draw(ctx) {
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y);
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.fillStyle = this.col;
      ctx.beginPath(); ctx.moveTo(-15, -26); ctx.lineTo(15, -26); ctx.lineTo(12, 0); ctx.lineTo(-12, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-12, -22, 5, 20);
      ctx.fillStyle = SD.shade(this.col, -0.25); ctx.beginPath(); ctx.ellipse(0, -26, 15, 3.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
  SD.Bucket = Bucket;

  function drawFish(ctx, len, col = '#7fb2d9', flop = 0) {
    ctx.save(); ctx.rotate(flop);
    ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
    const g = ctx.createLinearGradient(0, -len * 0.25, 0, len * 0.25);
    g.addColorStop(0, SD.shade(col, -0.15)); g.addColorStop(1, SD.shade(col, 0.45));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(len * 0.5, 0);
    ctx.quadraticCurveTo(len * 0.2, -len * 0.3, -len * 0.25, -len * 0.08);
    ctx.lineTo(-len * 0.5, -len * 0.25); ctx.lineTo(-len * 0.42, 0); ctx.lineTo(-len * 0.5, len * 0.25); ctx.lineTo(-len * 0.25, len * 0.08);
    ctx.quadraticCurveTo(len * 0.2, len * 0.3, len * 0.5, 0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(len * 0.3, -len * 0.04, Math.max(1, len * 0.04), 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(21,27,43,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(len * 0.12, -len * 0.14); ctx.quadraticCurveTo(len * 0.06, 0, len * 0.12, len * 0.14); ctx.stroke();
    ctx.restore();
  }
  SD.drawFish = drawFish;
  function drawBoot(ctx, s = 1) {
    ctx.save(); ctx.scale(s, s);
    ctx.fillStyle = '#6b4a2e'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-6, -16); ctx.lineTo(4, -16); ctx.lineTo(4, -4); ctx.quadraticCurveTo(14, -4, 15, 2); ctx.lineTo(-7, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3b2a1b'; ctx.fillRect(-7, 0, 22, 3);
    ctx.restore();
  }
  SD.drawBoot = drawBoot;

  SD.items.auger = () => ({ at: 'front', spin: 0, draw(ctx, p, hx, hy) {
    ctx.translate(hx + 4, hy - 4);
    ctx.strokeStyle = INK; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.stroke();
    ctx.strokeStyle = '#e2413b'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 52); ctx.stroke();
    ctx.strokeStyle = '#c0c8d4'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 1.6;
    const sp = p.t * 20;
    for (let k = 0; k < 4; k++) { const y = 30 + k * 6; ctx.beginPath(); ctx.moveTo(-5 * Math.sin(sp + k), y); ctx.lineTo(5 * Math.sin(sp + k), y + 4); ctx.stroke(); }
  } });
  SD.items.rod = (getHole) => ({ at: 'front', tug: 0, catch: null, draw(ctx, p, hx, hy) {
    // rod held at the hand; line drops to the hole (in world space)
    ctx.save();
    ctx.translate(hx, hy); ctx.rotate(0.95 + this.tug * 0.5);
    ctx.strokeStyle = INK; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, -46); ctx.stroke();
    ctx.strokeStyle = '#c98a4b'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = '#58606e'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill();
    ctx.restore();
  } });
  SD.items.fish = (len = 30, col) => ({ at: 'front', draw(ctx, p, hx, hy) { ctx.translate(hx + 8, hy + 6); drawFish(ctx, len, col, Math.sin(p.t * 14) * 0.25); } });
  SD.items.bucket = (col) => ({ at: 'front', draw(ctx, p, hx, hy) { ctx.translate(hx + 6, hy + 24); new Bucket({ surfaceY: () => 0 }, 0, 0, col).draw.call({ x: 0, y: 0, alpha: 1, col }, ctx); } });
  SD.items.card = (n, hand = 'F') => ({ at: 'front', hand, draw(ctx, p, hx, hy, a) {
    ctx.translate(hx, hy);
    if (p.action === 'cardUp') { ctx.rotate(-0.06); ctx.scale(1.25, 1.25); } else ctx.rotate(-a * 0.15);
    ctx.translate(0, -20);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
    ctx.beginPath(); SD.rrect(ctx, -13, -17, 26, 30, 3); ctx.fill(); ctx.stroke();
    ctx.scale(p.fx < 0 ? -1 : 1, 1);
    ctx.fillStyle = '#e2413b'; ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(n), 0, -1);
  } });
  SD.items.mug = () => ({ at: 'front', draw(ctx, p, hx, hy) {
    ctx.translate(hx + 5, hy + 6);
    ctx.fillStyle = '#e2413b'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
    ctx.beginPath(); SD.rrect(ctx, -6, -9, 12, 13, 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(7, -3, 3.5, -PI / 2, PI / 2); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-6, -6, 12, 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.2;
    for (let k = 0; k < 2; k++) { ctx.beginPath(); const ph = p.t * 2 + k * 2; ctx.moveTo(-2 + k * 4, -11); ctx.quadraticCurveTo(-5 + k * 4 + Math.sin(ph) * 3, -16, -2 + k * 4, -21); ctx.stroke(); }
  } });
  SD.items.balloons = () => ({ at: 'front', pops: 0, draw(ctx, p, hx, hy) {
    const cols = ['#e2413b', '#ffd43b', '#3c7fd8', '#69db7c', '#f783ac'];
    const n = 5 - this.pops;
    ctx.translate(hx, hy);
    ctx.scale(p.fx < 0 ? -1 : 1, 1);
    for (let k = 0; k < n; k++) {
      const a = -PI / 2 + (k - (n - 1) / 2) * 0.28 + Math.sin(p.t * 1.5 + k) * 0.05;
      const L = 70 + (k % 2) * 10;
      const bx = Math.cos(a) * L, by = Math.sin(a) * L;
      ctx.strokeStyle = 'rgba(40,40,60,0.6)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(bx * 0.5 + 4, by * 0.5, bx, by + 13); ctx.stroke();
      ctx.fillStyle = cols[k]; ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(bx, by, 11, 13.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(bx - 4, by - 5, 3, 4.5, -0.4, 0, TAU); ctx.fill();
    }
  } });
  SD.items.umbrella = (col = '#e2413b') => ({ at: 'front', open: 1, draw(ctx, p, hx, hy) {
    ctx.translate(hx, hy);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, -62); ctx.stroke();
    ctx.beginPath(); ctx.arc(-4, 6, 4, 0, PI); ctx.stroke();
    const o = this.open, R = 46 * o + 6;
    ctx.translate(0, -62);
    ctx.fillStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-R, 6 + (1 - o) * 30);
    ctx.quadraticCurveTo(-R * 0.8, -26 * o - 4, 0, -30 * o - 6);
    ctx.quadraticCurveTo(R * 0.8, -26 * o - 4, R, 6 + (1 - o) * 30);
    for (let k = 4; k >= 1; k--) { const x0 = -R + (2 * R * k) / 4, x1 = -R + (2 * R * (k - 1)) / 4; ctx.quadraticCurveTo((x0 + x1) / 2, -2, x1, 6 + (1 - o) * 30); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.moveTo(-R * 0.5, 2); ctx.quadraticCurveTo(-R * 0.4, -20 * o, 0, -30 * o - 6); ctx.quadraticCurveTo(-R * 0.15, -16 * o, 0, 3); ctx.closePath(); ctx.fill();
  } });
  SD.items.handle = () => ({ at: 'up', draw(ctx) {
    ctx.translate(0, -132);
    ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-24, 6); ctx.lineTo(24, 6); ctx.stroke();
    ctx.strokeStyle = '#ffd43b'; ctx.lineWidth = 2.2; ctx.stroke();
  } });

  // ---------- flying lessons ----------
  // a chalkboard on an easel: page 0 is the title, page 1 the "how to fly" diagram
  class Easel extends Prop {
    constructor(w, x, lane) { super(w, x, lane); this.page = 0; }
    bbox() { return [this.x - 62, this.y - 170, this.x + 62, this.y + 5]; }
    draw(ctx) {
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y); ctx.rotate(this.rot || 0);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // legs
      const leg = (x0, x1) => { ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x1, -150); ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = '#b07a43'; ctx.lineWidth = 3.4; ctx.stroke(); };
      leg(6, 2); leg(-40, -24); leg(40, 24);
      // board with a wooden frame
      ctx.fillStyle = '#9a6a3a'; ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
      ctx.beginPath(); SD.rrect(ctx, -58, -164, 116, 82, 5); ctx.fill(); ctx.stroke();
      const bg = ctx.createLinearGradient(0, -158, 0, -88);
      bg.addColorStop(0, '#2f5a48'); bg.addColorStop(1, '#264a3b');
      ctx.fillStyle = bg; ctx.beginPath(); SD.rrect(ctx, -52, -158, 104, 70, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.2; ctx.stroke();
      // chalk tray + chalk
      ctx.fillStyle = '#8a5d32'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
      ctx.beginPath(); SD.rrect(ctx, -54, -86, 108, 6, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f4f1e8'; ctx.beginPath(); SD.rrect(ctx, 20, -90, 12, 4, 1.5); ctx.fill();
      // chalk drawings
      ctx.save(); ctx.beginPath(); ctx.rect(-52, -158, 104, 70); ctx.clip();
      const chalk = 'rgba(245,245,238,0.92)';
      ctx.strokeStyle = chalk; ctx.fillStyle = chalk; ctx.lineWidth = 2;
      if (!this.page) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 19px "Segoe Print", "Comic Sans MS", cursive';
        ctx.fillText('FLYING', 0, -136);
        ctx.font = 'bold 24px "Segoe Print", "Comic Sans MS", cursive';
        ctx.fillText('101', 0, -110);
        ctx.beginPath(); ctx.moveTo(-34, -97); ctx.quadraticCurveTo(0, -93, 34, -98); ctx.stroke();
      } else {
        // a chalk penguin, flippers up, flapping
        const f = Math.sin(this.t * 9) * 0.35;
        ctx.save(); ctx.translate(-30, -110);
        ctx.beginPath(); ctx.ellipse(0, 0, 9, 13, 0, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(1.5, 3, 5, 8, 0, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(2.5, -6, 1.3, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(7, -4); ctx.lineTo(13, -2.5); ctx.lineTo(7, -1); ctx.stroke();
        for (const sx of [-1, 1]) {
          ctx.save(); ctx.translate(sx * 8, -2); ctx.rotate(sx * (-1.1 - f));
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(sx * 2, 8, 0, 14); ctx.stroke();
          ctx.restore();
          // motion lines
          ctx.beginPath(); ctx.arc(sx * 10, -6, 10, sx < 0 ? PI * 1.05 : -0.55, sx < 0 ? PI * 1.55 : -0.05); ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(-6, 13); ctx.lineTo(-2, 15); ctx.moveTo(4, 13); ctx.lineTo(8, 15); ctx.stroke();
        ctx.restore();
        // dashed flight path up to a little cloud
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(-14, -112); ctx.quadraticCurveTo(10, -146, 30, -130); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(24, -134); ctx.lineTo(30, -130); ctx.lineTo(23, -127); ctx.stroke();
        ctx.beginPath(); ctx.arc(34, -142, 6, PI, 0); ctx.arc(42, -140, 5, PI * 1.2, 0.2); ctx.lineTo(28, -137); ctx.closePath(); ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 13px "Segoe Print", "Comic Sans MS", cursive';
        ctx.fillText('FLAP!', 20, -100);
        ctx.font = 'bold 10px "Segoe Print", "Comic Sans MS", cursive';
        ctx.fillText('x 1000', 22, -113);
      }
      ctx.restore();
      ctx.restore();
    }
  }
  SD.Easel = Easel;

  // a plank on a fulcrum. target tilt > 0 means the right end is down.
  class Seesaw extends Prop {
    constructor(w, x, lane) { super(w, x, lane); this.tilt = -0.28; this.L = 124; this.ws = new SD.Spring(-0.28, 150, 7); this.target = -0.28; }
    update(dt) {
      super.update(dt);
      const x = this.ws.step(this.target, dt);
      if (Math.abs(x) > 0.34) { this.ws.x = Math.sign(x) * 0.34; this.ws.v *= -0.25; } // the plank thumps into the snow
      this.tilt = this.ws.x;
    }
    end(side) { // side -1 left, +1 right; returns the top surface point
      const c = Math.cos(this.tilt), s = Math.sin(this.tilt);
      const lx = side * (this.L / 2 - 10);
      return [this.x + lx * c, this.y - 24 + lx * s - 6];
    }
    bbox() { return [this.x - 70, this.y - 60, this.x + 70, this.y + 5]; }
    draw(ctx) {
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.fillStyle = '#7d5230';
      ctx.beginPath(); ctx.moveTo(-17, 0); ctx.lineTo(-4, -24); ctx.lineTo(4, -24); ctx.lineTo(17, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.translate(0, -24); ctx.rotate(this.tilt);
      const L = this.L;
      const pg = ctx.createLinearGradient(0, -7, 0, 2);
      pg.addColorStop(0, '#e4ad6c'); pg.addColorStop(1, '#b97c40');
      ctx.fillStyle = pg;
      ctx.beginPath(); SD.rrect(ctx, -L / 2, -7, L, 8, 2.5); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(110,64,28,0.45)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-L / 2 + 6, -3); ctx.lineTo(-8, -3.5); ctx.moveTo(8, -2.5); ctx.lineTo(L / 2 - 6, -3); ctx.stroke();
      // handles
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * (L / 2 - 22), -7); ctx.lineTo(sx * (L / 2 - 22), -15); ctx.lineTo(sx * (L / 2 - 28), -15); ctx.stroke(); }
      ctx.fillStyle = '#5b3a20'; ctx.beginPath(); ctx.arc(0, -3, 3, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  SD.Seesaw = Seesaw;

  class Trampoline extends Prop {
    constructor(w, x, lane) { super(w, x, lane); this.dip = new SD.Spring(0, 260, 9); }
    update(dt) { super.update(dt); this.dip.step(0, dt); }
    top() { return [this.x, this.y - 24 + this.dip.x]; }
    bbox() { return [this.x - 55, this.y - 40, this.x + 55, this.y + 5]; }
    draw(ctx) {
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y);
      ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
      for (const x of [-38, 38]) { ctx.beginPath(); ctx.moveTo(x, -24); ctx.lineTo(x * 1.1, 0); ctx.stroke(); }
      ctx.fillStyle = '#3c7fd8';
      ctx.beginPath(); ctx.moveTo(-46, -24); ctx.quadraticCurveTo(0, -24 + this.dip.x * 2, 46, -24); ctx.lineTo(46, -20); ctx.quadraticCurveTo(0, -20 + this.dip.x * 2, -46, -20); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e2413b'; ctx.beginPath(); SD.rrect(ctx, -50, -27, 10, 7, 2); SD.rrect(ctx, 40, -27, 10, 7, 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
  SD.Trampoline = Trampoline;

  // ---------- tall post with a platform (zipline tower / anchor) ----------
  class Post extends Prop {
    constructor(w, x, lane, h, deck = true) { super(w, x, lane); this.h = h; this.deck = deck; }
    top() { return [this.x, this.y - this.h]; }
    bbox() { return [this.x - 40, this.y - this.h - 30, this.x + 40, this.y + 5]; }
    draw(ctx) {
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y);
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineJoin = 'round';
      ctx.fillStyle = '#9b6a3d';
      ctx.beginPath(); SD.rrect(ctx, -6, -this.h, 12, this.h + 6, 3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1;
      for (let y = -this.h + 20; y < 0; y += 26) { ctx.beginPath(); ctx.moveTo(-5, y); ctx.lineTo(5, y + 4); ctx.stroke(); }
      if (this.deck) {
        ctx.fillStyle = '#c98a4b'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); SD.rrect(ctx, -34, -this.h - 2, 68, 9, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, -this.h - 3, 32, 3.5, 0, PI, TAU); ctx.fill();
        // braces
        ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-26, -this.h + 7); ctx.lineTo(-5, -this.h + 34); ctx.moveTo(26, -this.h + 7); ctx.lineTo(5, -this.h + 34); ctx.stroke();
      } else {
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, -this.h - 1, 8, 3, 0, PI, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }
  SD.Post = Post;

  class Cable extends Prop {
    constructor(w, A, B, sag) { super(w, (A[0] + B[0]) / 2, 2); this.A = A; this.B = B; this.sag = sag; this.load = 0; this.loadU = 0.5; this.follow = false; }
    point(u) {
      const [ax, ay] = this.A, [bx, by] = this.B;
      const s = this.sag * 4 * u * (1 - u) + this.load * Math.max(0, 1 - Math.abs(u - this.loadU) * 3.2);
      return [lerp(ax, bx, u), lerp(ay, by, u) + s];
    }
    bbox() { return [Math.min(this.A[0], this.B[0]), Math.min(this.A[1], this.B[1]) - 10, Math.max(this.A[0], this.B[0]), Math.max(this.A[1], this.B[1]) + this.sag + 40]; }
    draw(ctx) {
      ctx.save(); ctx.globalAlpha = this.alpha;
      ctx.beginPath();
      for (let k = 0; k <= 60; k++) { const [x, y] = this.point(k / 60); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = '#9aa3b2'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.restore();
    }
  }
  SD.Cable = Cable;

  // ---------- rope through a line of hands (tug-of-war) ----------
  class Rope extends Prop {
    constructor(w, getPts, flagX) { super(w, 0, 30); this.getPts = getPts; this.flagX = flagX; this.cut = false; this.follow = false; }
    update(dt) { this.t += dt; const pts = this.getPts(); if (pts.length) this.x = pts[0][0]; }
    draw(ctx) {
      const pts = this.getPts();
      if (pts.length < 2) return;
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const seg = (a, b) => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); for (const p of b) ctx.lineTo(p[0], p[1]); };
      seg(pts[0], pts.slice(1));
      ctx.strokeStyle = INK; ctx.lineWidth = 5.4; ctx.stroke();
      ctx.strokeStyle = '#d9b77a'; ctx.lineWidth = 3; ctx.stroke();
      ctx.setLineDash([3, 4]); ctx.strokeStyle = '#a8865a'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]);
      // red ribbon at the middle
      if (this.flag) {
        const [fx, fy] = this.flag;
        ctx.fillStyle = '#e2413b'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
        const wv = Math.sin(this.t * 7) * 3;
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx - 6 + wv, fy + 22); ctx.lineTo(fx, fy + 16); ctx.lineTo(fx + 6 + wv, fy + 22); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }
  }
  SD.Rope = Rope;

  // ---------- a flying hat (blown away by the wind) ----------
  class FlyingHat extends Prop {
    constructor(w, owner) {
      super(w, owner.x, owner.lane + 2); this.owner = owner; this.follow = false;
      const [hx, hy] = owner.localToWorld(0, -110);
      this.x = hx; this.y = hy; this.vx = 0; this.vy = -60; this.rot = 0; this.vr = 4; this.caught = false;
    }
    update(dt) {
      this.t += dt;
      if (this.held) { const [x, y] = this.held(); this.x = x; this.y = y; return; }
      this.vx = SD.damp(this.vx, this.world.wind * 1.6, 2, dt);
      this.vy += (Math.sin(this.t * 3) * 40 + 30) * dt;
      this.x += this.vx * dt; this.y += this.vy * dt;
      const gy = this.world.surfaceY(this.x) - 10;
      if (this.y > gy) { this.y = gy; this.vy *= -0.4; }
      this.rot += this.vr * dt;
    }
    draw(ctx) {
      const o = this.owner;
      ctx.save(); ctx.globalAlpha = this.alpha;
      ctx.translate(this.x, this.y); ctx.rotate(this.rot);
      ctx.scale(o.size, o.size);
      ctx.translate(0, 110);
      if (o.kind === 'captain') o._captainCap(ctx); else o._hat(ctx);
      ctx.restore();
    }
  }
  SD.FlyingHat = FlyingHat;

  // ---------- one long scarf wrapped around everyone ----------
  class LongScarf extends Prop {
    constructor(w, penguins) { super(w, 0, 40); this.ps = penguins; this.reveal = 0; this.follow = false; }
    update(dt) { this.t += dt; if (this.ps.length) this.x = this.ps[0].x; }
    draw(ctx) {
      const ps = this.ps.slice().sort((a, b) => a.x - b.x);
      if (ps.length < 2 || this.reveal <= 0) return;
      const pts = ps.map((p) => p.localToWorld(0, -50));
      const total = pts.length - 1;
      const upto = this.reveal * total;
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const path = new Path2D();
      path.moveTo(pts[0][0] - 20, pts[0][1] + 2);
      for (let i = 0; i < total; i++) {
        if (i >= upto) break;
        const k = Math.min(1, upto - i);
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        const xe = lerp(x0, x1, k), ye = lerp(y0, y1, k);
        path.quadraticCurveTo((x0 + xe) / 2, Math.max(y0, ye) + 10, xe, ye);
      }
      ctx.strokeStyle = INK; ctx.lineWidth = 11; ctx.stroke(path);
      ctx.strokeStyle = '#e2413b'; ctx.lineWidth = 8; ctx.stroke(path);
      ctx.setLineDash([5, 7]); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 8; ctx.stroke(path); ctx.setLineDash([]);
      if (this.reveal >= 1) {
        // tails at both ends
        for (const [x, y, d] of [[pts[0][0] - 20, pts[0][1] + 2, -1], [pts[total][0] + 16, pts[total][1], 1]]) {
          ctx.save(); ctx.translate(x, y); ctx.rotate(d * 0.25 + Math.sin(this.t * 3 + d) * 0.1 + this.world.wind * 0.004);
          ctx.fillStyle = '#e2413b'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
          ctx.beginPath(); SD.rrect(ctx, -4, 0, 8, 26, 2); ctx.fill(); ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();
    }
  }
  SD.LongScarf = LongScarf;

  // ---------- giant rolling snowball ----------
  class BigBall extends Prop {
    constructor(w, x, lane) { super(w, x, lane); this.r = 10; this.rot = 0; this.follow = false; }
    update(dt) { this.t += dt; this.y = this.world.surfaceY(this.x) + this.lane - this.r; }
    bbox() { return [this.x - this.r - 10, this.y - this.r - 10, this.x + this.r + 10, this.y + this.r + 10]; }
    draw(ctx) {
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y);
      const g = ctx.createRadialGradient(-this.r * 0.35, -this.r * 0.4, this.r * 0.1, 0, 0, this.r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#eef4fc'); g.addColorStop(1, '#c9d9ee');
      ctx.fillStyle = g; ctx.strokeStyle = 'rgba(80,110,160,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, this.r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.rotate(this.rot);
      ctx.strokeStyle = 'rgba(110,145,195,0.35)'; ctx.lineWidth = 1.5;
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(0, 0, this.r * (0.35 + k * 0.15), k, k + 1.6); ctx.stroke(); }
      ctx.restore();
    }
  }
  SD.BigBall = BigBall;

  // stage line marking (e.g. the middle of a tug-of-war)
  class Mark extends Prop {
    constructor(w, x, lane, col = '#e2413b') { super(w, x, lane); this.col = col; }
    draw(ctx) {
      // a little marker flag planted in the snow
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y);
      ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, -46); ctx.stroke();
      ctx.fillStyle = this.col; ctx.lineWidth = 1.6;
      const wv = Math.sin(this.t * 6) * 3;
      ctx.beginPath(); ctx.moveTo(0, -46); ctx.quadraticCurveTo(12, -42 + wv, 22, -38); ctx.lineTo(0, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
  SD.Mark = Mark;
})();
