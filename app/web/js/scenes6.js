// Snow Day — scenes 6: The Long Table (after the Last Supper) and the Nativity Play.
// Both are told gently: the crew sets the scene with care, and the humour comes from penguins
// being penguins (a hop to reach the table, a crown that slips, a sheep that wanders), never from
// the story itself.
'use strict';
(function () {
  const { clamp, lerp, TAU } = SD;
  const PI = Math.PI;
  const INK = '#151b2b';
  const GOLD = ['#fff1b0', '#f2c14e', '#b9821f'];

  // ======================= costumes (penguin-local: facing +x, top of the head at about -107) =======================
  // the face (eyes at x -3 and 16, y -73) always stays clear
  const HEADCLOTH = new Path2D('M20,-94 C14,-112 -6,-118 -20,-111 C-32,-104 -36,-90 -36,-76 L-38,-50 Q-30,-45 -18,-49 L-15,-72 C-14,-86 -2,-95 20,-94 Z');
  const VEIL = new Path2D('M21,-93 C15,-113 -6,-119 -21,-112 C-34,-104 -37,-88 -37,-72 L-39,-36 Q-28,-31 -16,-36 L-15,-72 C-14,-86 -2,-95 21,-93 Z');
  const lift = (p) => (p.kind === 'rocco' ? -7 : p.kind === 'specs' ? -3 : 0);
  function clothOn(ctx, path, col, stripe) {
    ctx.lineJoin = 'round';
    ctx.fillStyle = col; ctx.fill(path);
    if (stripe) {
      ctx.save(); ctx.clip(path);
      ctx.strokeStyle = stripe; ctx.lineWidth = 3.2;
      for (let k = -40; k < 30; k += 11) { ctx.beginPath(); ctx.moveTo(k, -122); ctx.lineTo(k - 10, -30); ctx.stroke(); }
      ctx.restore();
    }
    // a fold down the back
    ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-24, -104); ctx.quadraticCurveTo(-30, -80, -28, -50); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke(path);
  }
  const costumes = {
    // shepherds and Joseph: a tea towel and a head band, school-play style
    headcloth: (col, stripe, band) => (ctx, p) => {
      ctx.translate(0, lift(p));
      clothOn(ctx, HEADCLOTH, col, stripe);
      ctx.lineCap = 'round';
      ctx.strokeStyle = INK; ctx.lineWidth = 6.4; ctx.beginPath(); ctx.moveTo(-33, -90); ctx.quadraticCurveTo(-10, -104, 19, -96); ctx.stroke();
      ctx.strokeStyle = band; ctx.lineWidth = 4; ctx.stroke();
    },
    veil: (col) => (ctx, p) => {
      ctx.translate(0, lift(p));
      clothOn(ctx, VEIL, col, null);
      // the white cloth underneath, framing the face
      ctx.strokeStyle = '#fbf6ea'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-15.5, -40); ctx.lineTo(-15.5, -72); ctx.bezierCurveTo(-14, -86, -2, -94, 19, -92); ctx.stroke();
    },
    // the three kings; slip (0..1) lets a crown that's too big slide down over the eyes
    crown: (col) => (ctx, p) => {
      const slip = p.crownSlip || 0;
      ctx.translate(2, lift(p) - 104 + slip * 24); ctx.rotate(-0.12 + slip * 0.22);
      const g = ctx.createLinearGradient(0, -22, 0, 4);
      g.addColorStop(0, GOLD[0]); g.addColorStop(0.5, GOLD[1]); g.addColorStop(1, GOLD[2]);
      ctx.beginPath();
      ctx.moveTo(-17, 2); ctx.lineTo(-18, -14); ctx.lineTo(-11, -7); ctx.lineTo(-5, -20); ctx.lineTo(1, -8); ctx.lineTo(7, -21); ctx.lineTo(12, -7); ctx.lineTo(19, -15); ctx.lineTo(17, 2);
      ctx.quadraticCurveTo(0, 6, -17, 2); ctx.closePath();
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
      for (const [x, r] of [[-9, 2.6], [1, 3.2], [11, 2.6]]) { ctx.beginPath(); ctx.arc(x, -3, r, 0, TAU); ctx.fill(); ctx.stroke(); }
      for (const [x, y] of [[-18, -14], [-5, -20], [7, -21], [19, -15]]) { ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill(); ctx.stroke(); }
    },
    // the angel: a tinsel halo on a wire (it can come off: p.haloOff)
    halo: () => (ctx, p) => {
      if (p.haloOff) return;
      const b = Math.sin(p.t * 3.1) * 1.6;
      ctx.strokeStyle = '#8d96a6'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-10, -104); ctx.quadraticCurveTo(-14, -116, -6, -124 + b); ctx.stroke();
      ctx.translate(0, -126 + b);
      ctx.strokeStyle = INK; ctx.lineWidth = 6.2; ctx.beginPath(); ctx.ellipse(0, 0, 15, 4.4, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#ffd43b'; ctx.lineWidth = 3.6; ctx.stroke();
      ctx.strokeStyle = '#fff7c2'; ctx.lineWidth = 1.4; ctx.setLineDash([2, 4]); ctx.lineDashOffset = -p.t * 8; ctx.stroke(); ctx.setLineDash([]);
    },
    // a sheep costume: a woolly hood and a fleece down the back, and soft ears
    sheep: () => (ctx) => {
      const tufts = [[-6, -110, 7], [6, -109, 6], [15, -103, 5], [-17, -107, 7], [-26, -98, 7], [-31, -86, 7], [-34, -72, 6.5],
        [-35, -58, 6.5], [-35, -44, 6.5], [-32, -30, 6.5], [-26, -18, 6]];
      ctx.strokeStyle = 'rgba(120,128,145,0.95)'; ctx.lineWidth = 2.6;
      for (const [x, y, r] of tufts) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = '#fbfaf6';
      for (const [x, y, r] of tufts) { ctx.beginPath(); ctx.arc(x, y, r + 0.2, 0, TAU); ctx.fill(); }
      ctx.fillStyle = 'rgba(205,210,222,0.6)';
      for (const [x, y, r] of tufts) { ctx.beginPath(); ctx.arc(x + 1.5, y + 2, r * 0.45, 0, TAU); ctx.fill(); }
      ctx.save(); ctx.translate(-12, -96); ctx.rotate(0.9);
      ctx.fillStyle = '#4b505e'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(0, 9, 4.5, 9, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e7a6b5'; ctx.beginPath(); ctx.ellipse(0, 9.5, 2.2, 6, 0, 0, TAU); ctx.fill();
      ctx.restore();
    },
  };
  // paper wings behind the angel (p.flapK: how hard they flap)
  const wings = (ctx, p) => {
    const k = p.flapK || 0;
    for (const [dx, sh] of [[6, 0.82], [0, 1]]) {
      ctx.save(); ctx.translate(-18 + dx, -70); ctx.rotate(-0.15 - Math.sin(p.t * 16 + dx) * 0.35 * k - (1 - sh) * 0.4);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.bezierCurveTo(-14, -26, -36, -40, -50, -42);
      ctx.quadraticCurveTo(-48, -32, -40, -30); ctx.quadraticCurveTo(-44, -20, -34, -18); ctx.quadraticCurveTo(-36, -8, -26, -8); ctx.quadraticCurveTo(-22, 2, -12, 4);
      ctx.closePath();
      ctx.fillStyle = sh < 1 ? '#dfe5ef' : '#ffffff'; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.strokeStyle = 'rgba(160,175,200,0.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-38, -32); ctx.moveTo(-8, 0); ctx.lineTo(-30, -16); ctx.stroke();
      ctx.restore();
    }
  };
  function dress(p, front, back) {
    p.hatOff = true; p.pal = Object.assign({}, p.pal, { style: 'none' });
    p.costume = front; p.costumeBack = back || null;
  }

  // ======================= small things, drawn on a table, in a flipper, or in the straw =======================
  function bread(ctx) {
    ctx.fillStyle = '#d99a4e'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.ellipse(0, -6, 15, 8, 0, PI, 0); ctx.lineTo(15, 0); ctx.lineTo(-15, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#f3d29a'; ctx.lineWidth = 1.6;
    for (const x of [-6, 0, 6]) { ctx.beginPath(); ctx.moveTo(x - 3, -10); ctx.lineTo(x + 2, -6); ctx.stroke(); }
  }
  function cup(ctx) {
    const g = ctx.createLinearGradient(-8, 0, 8, 0);
    g.addColorStop(0, GOLD[2]); g.addColorStop(0.45, GOLD[0]); g.addColorStop(1, GOLD[1]);
    ctx.fillStyle = g; ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-8, -20); ctx.lineTo(8, -20); ctx.quadraticCurveTo(8, -10, 2, -9); ctx.lineTo(2, -3); ctx.lineTo(6, 0); ctx.lineTo(-6, 0); ctx.lineTo(-2, -3); ctx.lineTo(-2, -9); ctx.quadraticCurveTo(-8, -10, -8, -20); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  function plate(ctx, w = 16) {
    ctx.fillStyle = '#f4efe4'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, -1.5, w, 3.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
  }
  function fish(ctx) {
    plate(ctx, 18);
    ctx.fillStyle = '#9fb3c8'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(-2, -5, 11, 4, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -5); ctx.lineTo(15, -9); ctx.lineTo(15, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-9, -6, 1, 0, TAU); ctx.fill();
  }
  function grapes(ctx) {
    plate(ctx, 15);
    ctx.fillStyle = '#7a4a9e'; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
    for (const [x, y] of [[-6, -5], [0, -5], [6, -5], [-3, -10], [3, -10], [0, -15]]) { ctx.beginPath(); ctx.arc(x, y, 3.6, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.strokeStyle = '#4f8a3a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(3, -22); ctx.stroke();
  }
  function bowl(ctx, fruit, col, r = 4.2) {
    ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
    for (const [x, y] of fruit) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#c8865a'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-14, -8); ctx.quadraticCurveTo(-13, 0, 0, 0); ctx.quadraticCurveTo(13, 0, 14, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  const oranges = (ctx) => bowl(ctx, [[-6, -9], [2, -10], [8, -8], [-2, -14]], '#f2952f', 4.6);
  const olives = (ctx) => bowl(ctx, [[-7, -8], [-2, -9], [3, -9], [8, -8], [0, -12], [-5, -12], [5, -12]], '#7d8f3a', 2.6);
  const figs = (ctx) => { plate(ctx, 16); bowl(ctx, [], '#000'); ctx.fillStyle = '#6b3d52'; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; for (const [x, y] of [[-6, -10], [1, -11], [7, -9]]) { ctx.beginPath(); ctx.ellipse(x, y, 3.8, 4.6, 0.2, 0, TAU); ctx.fill(); ctx.stroke(); } };
  function rolls(ctx) {
    ctx.fillStyle = '#e1b46f'; ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
    for (const [x, y] of [[-7, -9], [0, -11], [7, -9]]) { ctx.beginPath(); ctx.ellipse(x, y, 5.5, 4, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#b07a3c'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-15, -8); ctx.lineTo(15, -8); ctx.lineTo(12, 0); ctx.lineTo(-12, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(70,40,15,0.5)'; ctx.lineWidth = 1; for (const x of [-8, -2, 4, 10]) { ctx.beginPath(); ctx.moveTo(x, -7); ctx.lineTo(x - 2, -1); ctx.stroke(); }
  }
  function jug(ctx) {
    ctx.fillStyle = '#c66a3d'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-5, -26); ctx.lineTo(5, -26); ctx.quadraticCurveTo(4, -21, 8, -16); ctx.quadraticCurveTo(12, -6, 6, 0); ctx.lineTo(-6, 0); ctx.quadraticCurveTo(-12, -6, -8, -16); ctx.quadraticCurveTo(-4, -21, -5, -26); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -22); ctx.quadraticCurveTo(15, -20, 9, -12); ctx.stroke();
    ctx.strokeStyle = '#f0b77f'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-7, -12); ctx.lineTo(7, -12); ctx.stroke();
  }
  function candle(ctx, lit, t, flick = 0) {
    ctx.fillStyle = '#c99b3b'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(0, -1.5, 8, 2.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillRect(-1.6, -12, 3.2, 10); ctx.strokeRect(-1.6, -12, 3.2, 10);
    ctx.fillStyle = '#fbf3df'; ctx.beginPath(); ctx.rect(-3, -30, 6, 18); ctx.fill(); ctx.stroke();
    if (lit > 0.02) {
      const f = 1 + Math.sin(t * 13) * 0.08 + Math.sin(t * 29) * 0.05 - flick * 0.5;
      ctx.save(); ctx.translate(0, -31); ctx.scale(lit * f, lit * f);
      const g = ctx.createRadialGradient(0, -4, 0, 0, -4, 22);
      g.addColorStop(0, 'rgba(255,214,120,0.55)'); g.addColorStop(1, 'rgba(255,214,120,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -4, 22, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.moveTo(0, -13); ctx.quadraticCurveTo(5, -4, 0, 0); ctx.quadraticCurveTo(-5, -4, 0, -13); ctx.fill();
      ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.quadraticCurveTo(2.4, -3, 0, -1); ctx.quadraticCurveTo(-2.4, -3, 0, -8); ctx.fill();
      ctx.restore();
    }
  }
  const pomegranates = (ctx) => { plate(ctx, 15); ctx.fillStyle = '#b8323b'; ctx.strokeStyle = INK; ctx.lineWidth = 1.3; for (const [x, y] of [[-5, -7], [5, -7]]) { ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 1.5, y - 5); ctx.lineTo(x, y - 7.5); ctx.lineTo(x + 1.5, y - 5); ctx.stroke(); } };
  const FOOD = { bread, cup, fish, grapes, oranges, olives, figs, rolls, jug, pomegranates };
  // held in a flipper, the same things look like this
  const holding = (draw, dy = 8) => ({ at: 'front', draw(ctx, p, hx, hy) { ctx.translate(hx + 8, hy + dy); draw(ctx, p); } });

  // the gifts of the three kings
  function chest(ctx) {
    const g = ctx.createLinearGradient(0, -16, 0, 0); g.addColorStop(0, GOLD[0]); g.addColorStop(1, GOLD[2]);
    ctx.fillStyle = g; ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.rect(-11, -10, 22, 10); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-11, -10); ctx.quadraticCurveTo(0, -20, 11, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8b1e2d'; ctx.beginPath(); ctx.arc(0, -7, 2.4, 0, TAU); ctx.fill(); ctx.stroke();
  }
  function jar(ctx) {
    ctx.fillStyle = '#6b4ca5'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-4, -18); ctx.lineTo(4, -18); ctx.quadraticCurveTo(10, -12, 8, -3); ctx.quadraticCurveTo(6, 0, 0, 0); ctx.quadraticCurveTo(-6, 0, -8, -3); ctx.quadraticCurveTo(-10, -12, -4, -18); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = GOLD[1]; ctx.beginPath(); SD.rrect(ctx, -5, -23, 10, 5, 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = GOLD[0]; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-8, -8); ctx.quadraticCurveTo(0, -5, 8, -8); ctx.stroke();
  }
  function casket(ctx) {
    ctx.fillStyle = '#2f7d6b'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
    ctx.beginPath(); SD.rrect(ctx, -10, -13, 20, 13, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = GOLD[1]; ctx.beginPath(); SD.rrect(ctx, -12, -16, 24, 5, 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -19, 2.6, 0, TAU); ctx.fill(); ctx.stroke();
  }
  // the baby, wrapped up warm (k: 0..1 how much the glow has come up)
  function bundle(ctx, t, k = 0) {
    if (k > 0.01) {
      const g = ctx.createRadialGradient(0, -6, 2, 0, -6, 46);
      g.addColorStop(0, `rgba(255,236,170,${0.55 * k})`); g.addColorStop(1, 'rgba(255,236,170,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -6, 46, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#fbf6ea'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.ellipse(0, -6, 15, 7.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(150,170,205,0.8)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-7, -12); ctx.quadraticCurveTo(-2, -5, -6, 1); ctx.moveTo(1, -13); ctx.quadraticCurveTo(5, -6, 2, 1); ctx.stroke();
    // a little sleeping face peeping out of the wrap
    ctx.fillStyle = '#f7d9c4'; ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(10, -8, 5.2, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(9, -8.5, 1.3, 0.2, PI - 0.2); ctx.moveTo(13.4, -8.6); ctx.arc(12.4, -8.5, 1.1, 0.2, PI - 0.2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,140,150,0.45)'; ctx.beginPath(); ctx.arc(11, -6, 1.4, 0, TAU); ctx.fill();
  }
  function crook(len = 112) {
    return { at: 'front', draw(ctx, p, hx, hy) {
      ctx.translate(hx, hy); ctx.rotate(-0.08);
      ctx.lineCap = 'round';
      const path = () => { ctx.beginPath(); ctx.moveTo(0, 46); ctx.lineTo(0, -len + 58); ctx.arc(-8, -len + 58, 8, 0, PI, true); ctx.lineTo(-16, -len + 64); };
      path(); ctx.strokeStyle = INK; ctx.lineWidth = 5.4; ctx.stroke();
      path(); ctx.strokeStyle = '#a7743f'; ctx.lineWidth = 3; ctx.stroke();
    } };
  }
  const staff = (len = 120) => ({ at: 'front', draw(ctx, p, hx, hy) {
    ctx.translate(hx, hy); ctx.rotate(-0.06); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 48); ctx.lineTo(0, -len + 48); ctx.strokeStyle = INK; ctx.lineWidth = 5.6; ctx.stroke(); ctx.strokeStyle = '#8a5a2f'; ctx.lineWidth = 3.2; ctx.stroke();
  } });

  // ======================= the long table, after the painting =======================
  // a painted folding screen: a hall with three windows at the back and dark hangings down the
  // sides, the wings opening out towards us in perspective
  class Hall extends SD.Prop {
    constructor(w, x, lane, CW, H, WW) { super(w, x, lane); this.CW = CW; this.H = H; this.WW = WW; this.open = 0; this.lift = 0; this.glow = 0; }
    extent() { return [this.x - this.CW / 2 - this.WW - 10, this.x + this.CW / 2 + this.WW + 10]; }
    draw(ctx) {
      const { CW, H, WW } = this, o = SD.easeInOut(this.open), hc = CW / 2;
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y); ctx.lineJoin = 'round';
      const WALL = '#ead9b8', WALL_SH = '#cdb68e';
      // ceiling: coffers running back to the centre
      if (o > 0.01) {
        const ox = hc + WW * o, oy = -H - 62 * o;
        ctx.fillStyle = '#d7c39d';
        ctx.beginPath(); ctx.moveTo(-hc, -H); ctx.lineTo(hc, -H); ctx.lineTo(ox, oy); ctx.lineTo(-ox, oy); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(120,90,50,0.45)'; ctx.lineWidth = 1.4;
        for (let k = 1; k < 8; k++) { const u = k / 8; ctx.beginPath(); ctx.moveTo(lerp(-hc, hc, u), -H); ctx.lineTo(lerp(-ox, ox, u), oy); ctx.stroke(); }
        for (let k = 1; k < 3; k++) { const u = k / 3; ctx.beginPath(); ctx.moveTo(lerp(-hc, -ox, u), lerp(-H, oy, u)); ctx.lineTo(lerp(hc, ox, u), lerp(-H, oy, u)); ctx.stroke(); }
        ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-ox, oy); ctx.lineTo(ox, oy); ctx.stroke();
        // side walls with their hangings
        for (const s of [-1, 1]) {
          ctx.fillStyle = WALL_SH;
          ctx.beginPath(); ctx.moveTo(s * hc, -H); ctx.lineTo(s * ox, oy); ctx.lineTo(s * ox, 14 * o); ctx.lineTo(s * hc, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
          for (let k = 0; k < 4; k++) {
            const u0 = 0.08 + k * 0.23, u1 = u0 + 0.15;
            const xa = lerp(hc, ox, u0) * s, xb = lerp(hc, ox, u1) * s;
            const ta = lerp(-H, oy, u0) * 0.78, tb = lerp(-H, oy, u1) * 0.78, ba = lerp(0, 14 * o, u0) - 26, bb = lerp(0, 14 * o, u1) - 26;
            ctx.fillStyle = k % 2 ? '#3d3a52' : '#46405e';
            ctx.beginPath(); ctx.moveTo(xa, ta); ctx.lineTo(xb, tb); ctx.lineTo(xb, bb); ctx.lineTo(xa, ba); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = 'rgba(214,180,110,0.6)'; ctx.lineWidth = 1.2; ctx.stroke();
          }
        }
      }
      // the back wall and its three windows: an evening sky over far hills
      ctx.fillStyle = WALL; ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.rect(-hc, -H, CW, H); ctx.fill(); ctx.stroke();
      const wins = [[0, 74, 120], [-hc * 0.62, 52, 92], [hc * 0.62, 52, 92]];
      for (const [wx, ww, wh] of wins) {
        const top = -H * 0.86, x0 = wx - ww / 2;
        const g = ctx.createLinearGradient(0, top, 0, top + wh);
        g.addColorStop(0, '#8fb3d9'); g.addColorStop(0.65, '#f3cf8c'); g.addColorStop(1, '#e9a96a');
        ctx.fillStyle = g; ctx.beginPath(); ctx.rect(x0, top, ww, wh); ctx.fill();
        ctx.fillStyle = '#7d8c78';
        ctx.beginPath(); ctx.moveTo(x0, top + wh); ctx.lineTo(x0, top + wh * 0.78); ctx.quadraticCurveTo(wx - ww * 0.1, top + wh * 0.62, x0 + ww, top + wh * 0.8); ctx.lineTo(x0 + ww, top + wh); ctx.closePath(); ctx.fill();
        if (this.glow > 0.01) { ctx.fillStyle = `rgba(255,226,150,${0.35 * this.glow})`; ctx.fillRect(x0, top, ww, wh); }
        ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.strokeRect(x0, top, ww, wh);
        ctx.strokeStyle = 'rgba(70,55,35,0.6)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(wx, top); ctx.lineTo(wx, top + wh); ctx.stroke();
      }
      // the arch over the middle window
      ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.fillStyle = WALL_SH;
      ctx.beginPath(); ctx.arc(0, -H * 0.86, 46, PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,90,50,0.5)'; ctx.beginPath(); ctx.arc(0, -H * 0.86, 38, PI, 0); ctx.stroke();
      ctx.restore();
    }
  }
  // the table comes in two halves, each with its own x and lift, so it can be carried in
  class LongTable extends SD.Prop {
    constructor(w, x, lane, HL) {
      super(w, x, lane); this.HL = HL; this.TH = 32;
      this.halves = [{ x: x - HL / 2, lift: 0 }, { x: x + HL / 2, lift: 0 }];
      this.cloth = 0; this.clothFrom = -1; this.food = [];
    }
    bbox() { return [this.x - this.HL, this.y - this.TH, this.x + this.HL, this.y]; }
    extent() { const xs = this.halves.map((h) => h.x); return [Math.min(...xs) - this.HL / 2 - 20, Math.max(...xs) + this.HL / 2 + 20]; }
    put(k, dx, extra) { const f = Object.assign({ k, dx, show: 0, lit: 0, flick: 0 }, extra); this.food.push(f); return f; }
    draw(ctx) {
      const { HL, TH } = this;
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.lineJoin = 'round';
      for (const h of this.halves) {
        ctx.save(); ctx.translate(h.x, this.y - h.lift);
        // legs, then the top: a thin slab seen a little from above
        ctx.fillStyle = '#6e4a2b'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        for (const lx of [-HL / 2 + 14, HL / 2 - 14]) { ctx.beginPath(); ctx.rect(lx - 4, -TH + 4, 8, TH - 4); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = '#a7754a'; ctx.beginPath(); ctx.moveTo(-HL / 2, -TH); ctx.lineTo(HL / 2, -TH); ctx.lineTo(HL / 2 - 6, -TH - 9); ctx.lineTo(-HL / 2 + 6, -TH - 9); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#7d5433'; ctx.beginPath(); ctx.rect(-HL / 2, -TH, HL, 6); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      // the cloth, drawn over both halves once they're together
      if (this.cloth > 0.005) {
        const L = this.x - HL - 6, R = this.x + HL + 6, a = this.clothFrom < 0 ? L : R, b = lerp(a, this.clothFrom < 0 ? R : L, this.cloth);
        const x0 = Math.min(a, b), x1 = Math.max(a, b), y = this.y, hang = 27;
        ctx.fillStyle = '#f7f3ea';
        ctx.beginPath(); ctx.moveTo(x0, y - TH - 10); ctx.lineTo(x1, y - TH - 10); ctx.lineTo(x1, y - TH + hang); ctx.lineTo(x0, y - TH + hang); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(218,212,198,0.9)'; ctx.fillRect(x0, y - TH - 1, x1 - x0, 2.5);
        // folds and a woven blue border near the hem
        ctx.strokeStyle = 'rgba(160,150,130,0.45)'; ctx.lineWidth = 1.2;
        for (let fx = Math.ceil(x0 / 26) * 26; fx < x1; fx += 26) { ctx.beginPath(); ctx.moveTo(fx, y - TH + 2); ctx.lineTo(fx + 2, y - TH + hang); ctx.stroke(); }
        ctx.fillStyle = '#5577a8'; ctx.fillRect(x0, y - TH + hang - 8, x1 - x0, 3);
        ctx.fillStyle = 'rgba(85,119,168,0.6)';
        for (let fx = Math.ceil(x0 / 12) * 12; fx < x1 - 4; fx += 12) ctx.fillRect(fx, y - TH + hang - 13, 4, 3);
        ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x0, y - TH - 10); ctx.lineTo(x1, y - TH - 10); ctx.moveTo(x0, y - TH - 10); ctx.lineTo(x0, y - TH + hang); ctx.lineTo(x1, y - TH + hang); ctx.lineTo(x1, y - TH - 10); ctx.stroke();
      }
      // what's been brought, standing on the top
      for (const f of this.food) {
        if (f.show <= 0.01) continue;
        const s = SD.backOut(Math.min(1, f.show));
        ctx.save(); ctx.translate(this.x + f.dx, this.y - TH - 4 - (1 - Math.min(1, f.show)) * 10); ctx.scale(s, s);
        if (f.k === 'candle') candle(ctx, f.lit, this.t + f.dx, f.flick); else FOOD[f.k](ctx);
        ctx.restore();
      }
      ctx.restore();
    }
  }
  // warm light falling on the empty place at the middle of the table
  class Glow extends SD.Prop {
    constructor(w, x, lane, r) { super(w, x, lane); this.r = r; this.k = 0; }
    extent() { return [this.x - this.r, this.x + this.r]; }
    draw(ctx) {
      if (this.k <= 0.01) return;
      const y = this.y - 70, g = ctx.createRadialGradient(this.x, y, 4, this.x, y, this.r);
      g.addColorStop(0, `rgba(255,232,170,${0.5 * this.k})`); g.addColorStop(0.5, `rgba(255,220,150,${0.22 * this.k})`); g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.save(); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(this.x, y, this.r, 0, TAU); ctx.fill(); ctx.restore();
    }
  }
  // the moment they hold still, it becomes a painting for a few seconds
  class GiltFrame extends SD.Prop {
    constructor(w, x, lane, W, top, bot) { super(w, x, lane); this.W = W; this.top = top; this.bot = bot; this.k = 0; this.follow = false; }
    extent() { return [this.x - this.W / 2 - 40, this.x + this.W / 2 + 40]; }
    draw(ctx) {
      if (this.k <= 0.01) return;
      const k = SD.easeOut(this.k), s = lerp(1.04, 1, k);
      const W = this.W, T = this.top, B = this.bot, F = 24;
      ctx.save(); ctx.globalAlpha = this.alpha * k;
      ctx.translate(this.x, (T + B) / 2); ctx.scale(s, s); ctx.translate(0, -(T + B) / 2);
      const x0 = -W / 2, x1 = W / 2;
      // a soft vignette inside, then the moulding
      const vg = ctx.createRadialGradient(0, (T + B) / 2, Math.min(W, B - T) * 0.35, 0, (T + B) / 2, W * 0.62);
      vg.addColorStop(0, 'rgba(60,40,15,0)'); vg.addColorStop(1, 'rgba(60,40,15,0.28)');
      ctx.fillStyle = vg; ctx.fillRect(x0, T, W, B - T);
      const g = ctx.createLinearGradient(0, T - F, 0, B + F);
      g.addColorStop(0, GOLD[0]); g.addColorStop(0.3, GOLD[1]); g.addColorStop(0.7, GOLD[2]); g.addColorStop(1, GOLD[1]);
      ctx.fillStyle = g; ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.rect(x0 - F, T - F, W + 2 * F, B - T + 2 * F); ctx.rect(x1, T, -W, B - T); ctx.fill('evenodd'); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,248,210,0.8)'; ctx.lineWidth = 2; ctx.strokeRect(x0 - F + 6, T - F + 6, W + 2 * F - 12, B - T + 2 * F - 12);
      ctx.strokeStyle = 'rgba(110,70,15,0.7)'; ctx.lineWidth = 1.6; ctx.strokeRect(x0 - 5, T - 5, W + 10, B - T + 10);
      // corner rosettes
      ctx.fillStyle = GOLD[0]; ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
      for (const [cx2, cy2] of [[x0 - F / 2, T - F / 2], [x1 + F / 2, T - F / 2], [x0 - F / 2, B + F / 2], [x1 + F / 2, B + F / 2]]) { ctx.beginPath(); ctx.arc(cx2, cy2, 6, 0, TAU); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    }
  }

  // ======================= the nativity play =======================
  // a stable flat, painted wood and thatch, carried on and stood up at the back
  class Stable extends SD.Prop {
    constructor(w, x, lane, SW) { super(w, x, lane); this.SW = SW; this.lift = 0; }
    bbox() { return [this.x - this.SW / 2, this.y - 200, this.x + this.SW / 2, this.y]; }
    extent() { return [this.x - this.SW / 2 - 40, this.x + this.SW / 2 + 40]; }
    draw(ctx) {
      const SW = this.SW, h = SW / 2;
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y - (this.lift || 0)); ctx.lineJoin = 'round';
      // back boards
      ctx.fillStyle = '#8b5e3c'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.rect(-h + 10, -150, SW - 20, 150); ctx.fill();
      ctx.strokeStyle = 'rgba(60,35,18,0.55)'; ctx.lineWidth = 1.4;
      for (let x = -h + 34; x < h - 12; x += 24) { ctx.beginPath(); ctx.moveTo(x, -150); ctx.lineTo(x, 0); ctx.stroke(); }
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(-h + 10, -150, SW - 20, 150);
      // a cross beam and the posts
      ctx.fillStyle = '#a6754a';
      ctx.beginPath(); ctx.rect(-h + 4, -122, SW - 8, 9); ctx.fill(); ctx.stroke();
      for (const x of [-h + 4, h - 16]) { ctx.beginPath(); ctx.rect(x, -150, 12, 150); ctx.fill(); ctx.stroke(); }
      // thatched roof
      ctx.fillStyle = '#d9b45a';
      ctx.beginPath(); ctx.moveTo(-h - 26, -136); ctx.lineTo(0, -206); ctx.lineTo(h + 26, -136); ctx.lineTo(h + 18, -126); ctx.lineTo(-h - 18, -126); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(140,100,30,0.6)'; ctx.lineWidth = 1.3;
      for (let k = 0; k < 13; k++) {
        const u = k / 12, x = lerp(-h - 20, h + 20, u), yTop = -206 + Math.abs(x) * (70 / (h + 26));
        ctx.beginPath(); ctx.moveTo(x, yTop + 4); ctx.lineTo(x * 1.02, -128); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,240,190,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-h - 18, -131); ctx.lineTo(0, -199); ctx.lineTo(h + 18, -131); ctx.stroke();
      ctx.restore();
    }
  }
  class HayBale extends SD.Prop {
    constructor(w, x, lane) { super(w, x, lane); this.lift = 0; }
    bbox() { return [this.x - 27, this.y - 26, this.x + 27, this.y]; }
    draw(ctx) {
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y - (this.lift || 0));
      drawBale(ctx); ctx.restore();
    }
  }
  function drawBale(ctx) {
    ctx.fillStyle = '#e4c36a'; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.beginPath(); SD.rrect(ctx, -27, -26, 54, 26, 5); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(150,110,40,0.55)'; ctx.lineWidth = 1.2;
    for (let y = -20; y < 0; y += 5) { ctx.beginPath(); ctx.moveTo(-24, y); ctx.lineTo(24, y + 1); ctx.stroke(); }
    ctx.strokeStyle = '#8b5e3c'; ctx.lineWidth = 2;
    for (const x of [-12, 12]) { ctx.beginPath(); ctx.moveTo(x, -26); ctx.lineTo(x, 0); ctx.stroke(); }
  }
  class Manger extends SD.Prop {
    constructor(w, x, lane) { super(w, x, lane); this.lift = 0; this.baby = 0; this.glow = 0; }
    bbox() { return [this.x - 34, this.y - 34, this.x + 34, this.y]; }
    draw(ctx) {
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y - (this.lift || 0)); ctx.lineJoin = 'round';
      drawManger(ctx, this.t, this.baby, this.glow);
      ctx.restore();
    }
  }
  function drawManger(ctx, t, baby, glow) {
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    // crossed legs
    ctx.fillStyle = '#7a5032';
    for (const s of [-1, 1]) { ctx.save(); ctx.translate(s * 22, -14); ctx.rotate(s * 0.35); ctx.beginPath(); ctx.rect(-3, -16, 6, 30); ctx.fill(); ctx.stroke(); ctx.restore(); }
    // straw, then the bundle in it, then the front of the trough
    ctx.fillStyle = '#e8c96e';
    ctx.beginPath(); ctx.moveTo(-30, -30); for (let k = 0; k <= 10; k++) ctx.lineTo(-30 + k * 6, -32 - (k % 2) * 4); ctx.lineTo(30, -26); ctx.lineTo(-30, -26); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (baby > 0.01) { ctx.save(); ctx.translate(0, -27); ctx.globalAlpha *= Math.min(1, baby * 2); bundle(ctx, t, glow); ctx.restore(); }
    ctx.fillStyle = '#a6754a';
    ctx.beginPath(); ctx.moveTo(-34, -30); ctx.lineTo(34, -30); ctx.lineTo(26, -14); ctx.lineTo(-26, -14); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(60,35,18,0.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-30, -22); ctx.lineTo(30, -22); ctx.stroke();
    // a few stalks poking over the edge
    ctx.strokeStyle = '#d9b14d'; ctx.lineWidth = 1.6;
    for (const [x, a] of [[-24, -0.6], [-10, 0.3], [14, -0.2], [26, 0.7]]) { ctx.beginPath(); ctx.moveTo(x, -30); ctx.lineTo(x + Math.sin(a) * 9, -30 - Math.cos(a) * 9); ctx.stroke(); }
  }
  // the star of Bethlehem, on a long pole held up by a stagehand standing behind the stable
  class StarPole extends SD.Prop {
    constructor(w, holder, H) { super(w, holder.x, holder.lane - 0.3); this.holder = holder; this.H = H; this.bright = 0; this.follow = false; this.lean = 0; }
    extent() { return [this.x - 70, this.x + 70]; }
    update(dt) {
      this.t += dt;
      const p = this.holder; this.lane = p.lane - 0.3;
      this.x = p.x + p.facing * 16 * p.size; this.y = p.y;
    }
    star() { return [this.x + Math.sin(this.t * 0.9) * 4 + this.lean, this.y - this.H]; }
    draw(ctx) {
      const [sx, sy] = this.star(), hx = this.x, hy = this.y - 50 * this.holder.size;
      ctx.save(); ctx.globalAlpha = this.alpha;
      ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 4.6; ctx.beginPath(); ctx.moveTo(hx, hy + 20); ctx.lineTo(sx, sy + 18); ctx.stroke();
      ctx.strokeStyle = '#8c95a5'; ctx.lineWidth = 2.4; ctx.stroke();
      const b = this.bright;
      if (b > 0.01) {
        const g = ctx.createRadialGradient(sx, sy, 3, sx, sy, 90);
        g.addColorStop(0, `rgba(255,240,170,${0.6 * b})`); g.addColorStop(1, 'rgba(255,240,170,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 90, 0, TAU); ctx.fill();
        ctx.strokeStyle = `rgba(255,236,160,${0.55 * b})`; ctx.lineWidth = 2.2;
        for (let k = 0; k < 8; k++) {
          const a = this.t * 0.25 + (k * TAU) / 8, r0 = 30, r1 = 52 + (k % 2) * 22 + Math.sin(this.t * 2 + k) * 4;
          ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * r0, sy + Math.sin(a) * r0); ctx.lineTo(sx + Math.cos(a) * r1, sy + Math.sin(a) * r1); ctx.stroke();
        }
      }
      SD.drawStar(ctx, sx, sy, 24, this.t, b);
      ctx.restore();
    }
  }
  // gifts set down at the manger
  class Thing extends SD.Prop {
    constructor(w, x, lane, draw) { super(w, x, lane); this.fn = draw; this.show = 0; }
    draw(ctx) {
      if (this.show <= 0.01) return;
      const s = SD.backOut(Math.min(1, this.show)) * 1.3;
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y); ctx.scale(s, s); this.fn(ctx, this.t); ctx.restore();
    }
  }

  // ======================= helpers shared by both scenes =======================
  function kit(S) {
    const go = function* (p, x, lane, sp = 62) { if (lane != null) p.laneT = lane; yield* S.walk(p, x, sp); };
    const toLane = function* (p, lane) { p.laneT = lane; yield* S.until(() => Math.abs(p.lane - lane) < 1.2, 3); };
    const route = function* (p, x, lane, sp = 62) { yield* toLane(p, lane); yield* go(p, x, lane, sp); };
    return { go, toLane, route };
  }

  // =====================================================================
  // THE LONG TABLE — after Leonardo's Last Supper. The crew puts up a painted hall, carries in a
  // long table and lays the cloth, then each one brings something to share. The place at the
  // middle, under the bright window, is kept for the bread and the cup. They share the meal, and
  // for a moment the whole table holds still and becomes the painting.
  // =====================================================================
  // depth plan (lanes): hall 1 · glow 13 · seated row 14 · table 24 · carriers and passers 34 · frame 80
  function* sceneSupper(S) {
    const w = S.w, r = S.r, cx = S.cx;
    const { go, toLane, route } = kit(S);
    const run = (g) => S.run(g);
    const HL = 500, CW = 460, HH = 225, WW = 240, SZ = 0.95; // a dinner party: everyone a bit nearer us than usual
    const SEAT = [100, 160, 220, 312, 372, 432]; // from the middle, each side: two groups of three
    const ROW = 14, TBL = 24, FRONT = 34;

    // the twelve: the named crew and six from the beanie crew
    const named = ['captain', 'holly', 'specs', 'chubby', 'pip', 'rocco'].map((k) => S.spawn({ kind: k, x: S.offL - 300, lane: ROW, size: SZ }));
    const crew = [0, 1, 2, 3, 4, 5].map(() => S.spawn({ kind: 'crew', x: S.offL - 300, lane: ROW, size: SZ }));
    const [captain, holly, specs, chubby, pip, rocco] = named;
    const all = [...named, ...crew];
    all.forEach((p) => { p.hidden = true; });

    // ---- 1. the hall: carried on folded, stood at the back, wings opened out ----
    const hall = S.add(new Hall(w, S.side(-1) - CW, 1, CW, HH, WW));
    const [c0, c1, c2, c3, c4, c5] = crew;
    const fromH = r.sign();
    for (const [p, e] of [[c0, -1], [c1, 1]]) { p.hidden = false; p.lane = p.laneT = 2; p.action = 'carryFront'; }
    hall.x = S.side(fromH) + fromH * (CW / 2 + 40); hall.lift = 6;
    let carry = true;
    run((function* () { while (carry) { c0.x = hall.x - CW / 2 - 16; c1.x = hall.x + CW / 2 + 16; c0.face(-fromH); c1.face(-fromH); yield 0; } })());
    yield* S.tween(Math.abs(hall.x - cx) / 80, (() => { const x0 = hall.x; return (u) => { hall.x = lerp(x0, cx, SD.easeInOut(u)); }; })());
    carry = false; hall.lift = 0;
    w.puff(cx - CW / 2, hall.y, 3, 8, 0.6, 0.4); w.puff(cx + CW / 2, hall.y, 3, 8, 0.6, 0.4);
    c0.face(-1); c1.face(1); c0.action = c1.action = 'pull';
    yield 0.5;
    // the wings swing open towards us, each pulled out at its far edge
    yield* S.tween(3.2, (u) => {
      hall.open = u; const o = SD.easeInOut(u);
      c0.x = cx - CW / 2 - 16 - WW * o; c1.x = cx + CW / 2 + 16 + WW * o;
      c0.lane = c0.laneT = 2 + 13 * o; c1.lane = c1.laneT = 2 + 13 * o;
    });
    c0.action = c1.action = 'none';
    c0.say('heart', 0.9);

    // ---- 2. the table: two halves carried in from either side, meeting in the middle ----
    const tbl = S.add(new LongTable(w, cx, TBL, HL));
    const halfIn = (hf, s, a, b) => run((function* () {
      for (const p of [a, b]) { p.hidden = false; p.lane = p.laneT = FRONT; p.action = 'carryFront'; p.face(-s); }
      const target = cx + s * HL / 2;
      hf.x = S.side(s) + s * (HL / 2 + 30); hf.lift = 12;
      const d = Math.abs(hf.x - target), x0 = hf.x;
      yield* S.tween(d / 75, (u) => {
        hf.x = lerp(x0, target, SD.easeInOut(u));
        a.x = hf.x - s * HL * 0.27; b.x = hf.x + s * HL * 0.27;
      });
      yield* S.tween(0.4, (u) => { hf.lift = 12 * (1 - u); });
      w.puff(hf.x - s * HL / 2, tbl.y, 2, 6, 0.6, 0.3);
      a.action = b.action = 'none';
    })());
    yield [halfIn(tbl.halves[0], -1, c2, c3), halfIn(tbl.halves[1], 1, c4, c5)];
    w.sparkle(cx, tbl.y - tbl.TH, 3, '#ffd43b', 6);
    // the table-carriers head off along the front
    for (const [p, s] of [[c2, -1], [c3, -1], [c4, 1], [c5, 1]]) run((function* () { yield r.range(0, 0.6); p.face(s); yield* go(p, S.side(s), FRONT + (p === c3 || p === c5 ? 4 : 0), 80); p.hidden = true; })());
    // ---- 3. the cloth: walked down the length of the table from one end ----
    yield* route(c0, cx - HL - 22, ROW, 70);
    c0.face(1); c0.action = 'hold';
    tbl.clothFrom = -1;
    yield* S.tween(0.5, (u) => { tbl.cloth = 0.02 * u; });
    run(go(c1, S.side(1), ROW + 3, 80));
    const xs = c0.x;
    yield* S.tween(4.2, (u) => { tbl.cloth = lerp(0.02, 1, u); c0.x = lerp(xs, cx + HL + 22, u); });
    c0.action = 'none';
    w.sparkle(cx + HL, tbl.y - tbl.TH, 3, '#ffffff', 6);
    yield* go(c0, S.side(1), ROW, 80);
    c1.hidden = c0.hidden = true;
    yield 0.8;

    // ---- 4. everyone brings something: they come in behind the table from both sides, the
    // middle places first, so nobody ever has to pass anyone already standing in their place ----
    // who brings what (bread and cup go in the middle, the tall things between the groups)
    const plan = [
      { p: captain, k: 'bread', dx: -30 },
      { p: holly, k: 'cup', dx: 30 },
      { p: c2, k: 'fish' },
      { p: pip, k: 'grapes' },
      { p: rocco, k: 'candle', dx: -266 },
      { p: c3, k: 'candle', dx: 266 },
      { p: chubby, k: 'rolls' },
      { p: specs, k: 'olives' },
      { p: c4, k: 'oranges' },
      { p: c0, k: 'figs' },
      { p: c5, k: 'jug', dx: -478 },
      { p: c1, k: 'pomegranates', dx: 478 },
    ];
    const seats = [];
    const arrivals = plan.map((it, k) => {
      const s = k % 2 ? 1 : -1, i = k >> 1, x = cx + s * SEAT[i];
      seats.push({ p: it.p, s, i, x });
      const f = tbl.put(it.k, it.dx != null ? it.dx : s * SEAT[i] + s * 6);
      return run((function* () {
        const p = it.p;
        yield k * 2.4;
        p.hidden = false; p.dead = false; p.loco = 'stand'; p.lane = p.laneT = ROW; p.x = S.side(s) + s * 40; p.face(-s);
        p.item = it.k === 'candle' ? holding((c) => candle(c, 0, 0), 10) : holding(FOOD[it.k]); p.action = 'carryFront';
        yield* go(p, x, ROW, 60);
        p.face(-s);
        const tx = tbl.x + f.dx, ty = tbl.y - tbl.TH - 6;
        if (p === pip) {
          // too short to reach over: a little hop, and it's on
          p.jump(-230, 0);
          yield 0.25;
        } else { p.action = 'reach'; p.reachTo = [tx, ty]; yield 0.45; }
        p.item = null;
        yield* S.tween(0.35, (u) => { f.show = u; });
        f.show = 1;
        p.action = 'none'; p.reachTo = null;
        yield 0.3;
        p.face(-s);
        if (p === chubby) { yield 0.4; p.tic = { n: 'pat', t: 0, d: 1.4 }; }
      })());
    });
    // Rocco lights his candle and the other; one gutters out and he lights it again
    yield arrivals;
    const candles = tbl.food.filter((f) => f.k === 'candle');
    rocco.action = 'reach'; rocco.reachTo = [tbl.x + candles[0].dx, tbl.y - tbl.TH - 34];
    yield 0.5;
    w.sparkle(tbl.x + candles[0].dx, tbl.y - tbl.TH - 36, 2, '#ffd43b', 4);
    yield* S.tween(0.6, (u) => { candles[0].lit = u; });
    rocco.action = 'none';
    // the far candle: lit by its neighbour
    c3.action = 'reach'; c3.reachTo = [tbl.x + candles[1].dx, tbl.y - tbl.TH - 34];
    yield 0.4;
    yield* S.tween(0.6, (u) => { candles[1].lit = u; });
    c3.action = 'none';
    yield 0.6;
    yield* S.tween(0.35, (u) => { candles[0].flick = u; candles[0].lit = 1 - u; });
    rocco.say('!', 0.8);
    yield 0.9;
    rocco.action = 'reach';
    yield 0.4;
    yield* S.tween(0.5, (u) => { candles[0].lit = u; candles[0].flick = 1 - u; });
    candles[0].flick = 0; rocco.action = 'none';
    rocco.tic = { n: 'cool', t: 0, d: 1.6 };
    // Specs squares up the plates near him with his ruler
    yield 0.6;
    specs.action = 'tap';
    const near = tbl.food.filter((f) => Math.abs(tbl.x + f.dx - specs.x) < 70 && f.k !== 'candle');
    yield* S.tween(1.2, (u) => { for (const f of near) f.dx += (Math.round(f.dx / 8) * 8 - f.dx) * u * 0.2; });
    specs.action = 'none'; specs.tic = { n: 'glasses', t: 0, d: 0.8 };

    // ---- 5. the meal: the light comes up through the windows, and they eat and talk ----
    const glow = S.add(new Glow(w, cx, ROW - 1, 210));
    yield* S.tween(2.5, (u) => { hall.glow = u; glow.k = u * 0.7; });
    const facing = (st) => (st.i === 4 ? st.s : -st.s); // most turn to the middle; the far-end pairs turn to each other
    seats.forEach((st) => { st.p.face(facing(st)); });
    for (let round = 0; round < 3; round++) {
      seats.forEach((st, j) => { st.p.action = (j + round) % 3 === 0 ? 'eat' : (j + round) % 3 === 1 ? 'lean' : 'none'; });
      yield 2.2;
    }
    seats.forEach((st) => { st.p.action = 'none'; });
    yield 0.8;

    // ---- 6. the painting: each group of three in its own gesture, everything still ----
    const pose = ['lean', 'self', 'raise', 'point', 'lean', 'shrug'];
    seats.forEach((st) => { st.p.face(facing(st)); st.p.action = pose[st.i]; });
    yield 0.6;
    yield* S.tween(2, (u) => { glow.k = lerp(0.7, 1, u); });
    const gy = S.ground(cx);
    const frame = S.add(new GiltFrame(w, cx, 80, (SEAT[5] + 60) * 2 + 40, gy + ROW - HH - 40, gy + TBL + 16));
    yield* S.tween(1.6, (u) => { frame.k = u; });
    w.sparkle(cx - frame.W / 2, frame.top, 3, '#ffe9a3', 6); w.sparkle(cx + frame.W / 2, frame.bot, 3, '#ffe9a3', 6);
    yield 5.5;
    yield* S.tween(1.4, (u) => { frame.k = 1 - u; });
    frame.dead = true;
    seats.forEach((st) => { st.p.action = 'none'; st.p.face(-st.s); });
    yield 0.8;
    seats.filter((st) => st.i % 2 === 0).forEach((st) => st.p.say('heart', 1.4));
    yield 1.8;
    yield* S.tween(2, (u) => { glow.k = 1 - u; hall.glow = 1 - u * 0.6; });

    // ---- 7. home: the far ends leave first, everyone along the back of the table ----
    const leave = seats.slice().sort((a, b) => b.i - a.i);
    yield leave.map((st, j) => run((function* () {
      yield j * 0.75;
      st.p.face(st.s); st.p.action = 'wave';
      yield 0.6;
      st.p.action = 'none';
      yield* go(st.p, S.side(st.s), ROW + (st.i % 2) * 0.5, 70);
      st.p.dead = true;
    })()));
    // the hall and the table stay: the blizzard tidies up
  }

  // =====================================================================
  // THE NATIVITY PLAY — the crew puts on a nativity: they build the stable and carry in the hay
  // and the manger, then change into costume. Mary and Joseph arrive, the baby is laid in the
  // manger, the star shines, an angel appears to the shepherds (and their sheep), and three
  // kings follow the star with their gifts. Then the whole cast takes a bow.
  // =====================================================================
  // depth plan (lanes): star-holder 1 · stable 3 · angel 6 · hay 7 · Joseph 10 · Mary 13 · manger 18 ·
  // gifts 21 · kneeling shepherds and kings 24–33 · arrivals walk in at 30–36
  function* sceneNativity(S) {
    const w = S.w, r = S.r, cx = S.cx;
    const { go, toLane, route } = kit(S);
    const run = (g) => S.run(g);
    const SW = 420, SZ = 0.92;
    const kingSide = r.sign(), shepSide = -kingSide; // kings come from one side, shepherds sit on the other

    const holly = S.spawn({ kind: 'holly', x: S.side(shepSide) + shepSide * 300, lane: 13, size: SZ });
    const captain = S.spawn({ kind: 'captain', x: S.side(shepSide) + shepSide * 300, lane: 10, size: SZ });
    const pip = S.spawn({ kind: 'pip', x: S.side(kingSide) + kingSide * 300, lane: 6, size: SZ });
    const specs = S.spawn({ kind: 'specs', x: S.side(kingSide) + kingSide * 300, lane: 32, size: SZ });
    const chubby = S.spawn({ kind: 'chubby', x: S.side(kingSide) + kingSide * 300, lane: 32, size: SZ });
    const rocco = S.spawn({ kind: 'rocco', x: S.side(kingSide) + kingSide * 300, lane: 32, size: SZ });
    const [sh1, sh2, sheep, hand] = [0, 1, 2, 3].map(() => S.spawn({ kind: 'crew', x: S.side(kingSide) + kingSide * 60, lane: 4, size: SZ }));
    const all = [holly, captain, pip, specs, chubby, rocco, sh1, sh2, sheep, hand];
    [holly, captain, pip, specs, chubby, rocco].forEach((p) => { p.hidden = true; });

    // ---- 1. building the set ----
    const from = kingSide; // the stage crew bring everything on from the kings' side
    const st = S.add(new Stable(w, S.side(from) + from * (SW / 2 + 40), 3, SW));
    st.lift = 8;
    sh1.lane = sh1.laneT = sh2.lane = sh2.laneT = 3.5;
    sh1.action = sh2.action = 'carryFront';
    let carry = true;
    run((function* () { while (carry) { sh1.x = st.x - SW / 2 - 18; sh2.x = st.x + SW / 2 + 18; sh1.face(-from); sh2.face(-from); yield 0; } })());
    const sx0 = st.x;
    yield* S.tween(Math.abs(sx0 - cx) / 115, (u) => { st.x = lerp(sx0, cx, SD.easeInOut(u)); });
    carry = false;
    yield* S.tween(0.35, (u) => { st.lift = 8 * (1 - u); });
    w.puff(cx - SW / 2, st.y, 3, 9, 0.6, 0.4); w.puff(cx + SW / 2, st.y, 3, 9, 0.6, 0.4);
    sh1.action = sh2.action = 'none';
    // hay bales and the manger, while the first two step out of the way to the front
    const bales = [];
    const fetchBale = (p, x) => run((function* () {
      p.x = S.side(from) + from * 50; p.lane = p.laneT = 11; p.item = { at: 'up', draw(ctx) { ctx.translate(0, -128); drawBale(ctx); } }; p.action = 'carryUp';
      yield* go(p, x + from * 34, 11, 95);
      p.face(-from);
      p.item = null; p.action = 'plant';
      const b = S.add(new HayBale(w, x, 7)); bales.push(b);
      w.puff(x, b.y, 3, 8, 0.6, 0.4);
      yield 0.4; p.action = 'none';
      yield* route(p, S.side(from), 17, 80);
    })());
    const bx = [cx - shepSide * 150, cx + shepSide * 150]; // [kings' side, shepherds' side]
    run((function* () { yield* route(sh1, cx - SW / 2 - 18, 26, 60); yield* go(sh1, S.side(-from), 26, 80); sh1.hidden = true; })());
    run((function* () { yield* route(sh2, cx + SW / 2 + 18, 30, 60); yield* go(sh2, S.side(from), 30, 80); sh2.hidden = true; })());
    const bA = fetchBale(sheep, from > 0 ? Math.min(...bx) : Math.max(...bx)); // the far one first
    yield 1.4;
    const bB = fetchBale(hand, from > 0 ? Math.max(...bx) : Math.min(...bx));
    yield [bA, bB];
    // the manger is carried on by the stagehand
    const mg = S.add(new Manger(w, S.side(from) + from * 60, 18));
    mg.lift = 14;
    hand.lane = hand.laneT = 20; hand.action = 'carryFront'; hand.x = mg.x + from * 34; hand.face(-from);
    let mOn = true;
    run((function* () { while (mOn) { mg.x = hand.x - from * 34; yield 0; } })());
    yield* go(hand, cx + from * 34, 20, 85);
    mOn = false;
    yield* S.tween(0.3, (u) => { mg.lift = 14 * (1 - u); });
    hand.action = 'none';
    w.puff(cx, mg.y, 4, 9, 0.7, 0.4);
    yield 0.3;
    yield* route(hand, S.side(from), 26, 80);
    sheep.hidden = hand.hidden = true;

    // ---- 2. into costume, off stage ----
    dress(holly, costumes.veil('#4a78c8'));
    dress(captain, costumes.headcloth('#9a6b45', null, '#4b3423')); captain.item = staff();
    dress(sh1, costumes.headcloth('#e8d9b8', '#c0563f', '#6b3d2a')); sh1.item = crook();
    dress(sh2, costumes.headcloth('#d6e2ec', '#4b74a8', '#2f3f5e')); sh2.item = crook();
    dress(sheep, costumes.sheep());
    dress(pip, costumes.halo(), wings);
    dress(specs, costumes.crown('#3c7fd8'));
    dress(chubby, costumes.crown('#e2413b'));
    dress(rocco, costumes.crown('#2f9e5f')); rocco.shadesDown = 1;
    holly.item = holding((c, p) => bundle(c, p.t, 0), 6); holly.action = 'carryFront';
    specs.item = holding(chest, 8); chubby.item = holding(jar, 8); rocco.item = holding(casket, 8);

    // the angel sneaks into place behind the hay on the far side, ready to pop up
    const angelBale = bales.find((b) => Math.sign(b.x - cx) === kingSide) || bales[0];
    pip.hidden = false; pip.x = S.side(kingSide) + kingSide * 40; pip.lane = pip.laneT = 5.5; pip.action = 'hide';
    pip.using = angelBale;
    run((function* () { pip.loco = 'stand'; pip.action = 'none'; yield* go(pip, angelBale.x + kingSide * 4, 5.5, 75); pip.face(-kingSide); pip.action = 'hide'; })());
    // the shepherds settle down for the night with their sheep, on their side of the stage
    const shepX = [cx + shepSide * 300, cx + shepSide * 380];
    for (const [p, x, l] of [[sh1, shepX[0], 26], [sh2, shepX[1], 30], [sheep, cx + shepSide * 235, 35]]) {
      p.hidden = false; p.x = S.side(shepSide) + shepSide * 40; p.lane = p.laneT = l;
      run((function* () { yield p === sheep ? 1.2 : p === sh2 ? 0.6 : 0; yield* go(p, x, l, 75); p.face(-shepSide); p.loco = 'sit'; p.action = 'sleepy'; })());
    }
    yield 3.5;
    sh1.say('zzz', 2.5); yield 1; sh2.say('zzz', 2.5);
    // the stagehand brings the star on, behind the stable
    hand.hidden = false; hand.x = S.side(kingSide) + kingSide * 40; hand.lane = hand.laneT = 1; hand.action = 'boom';
    const star = S.add(new StarPole(w, hand, 250));
    yield* go(hand, cx + kingSide * 26, 1, 80);
    hand.face(-kingSide);
    yield* S.tween(1.5, (u) => { star.bright = u * 0.45; });

    // ---- 3. Mary and Joseph ----
    holly.hidden = captain.hidden = false;
    // Joseph leads the way to the far side of the manger; Mary follows and stops on the near side
    captain.x = S.side(shepSide) + shepSide * 40; holly.x = S.side(shepSide) + shepSide * 140;
    holly.lane = holly.laneT = 13; captain.lane = captain.laneT = 10.5;
    const maryX = cx + shepSide * 62, josephX = cx - shepSide * 78;
    run(go(captain, josephX, 10.5, 50));
    yield* go(holly, maryX, 13, 48);
    holly.face(-shepSide);
    yield* S.until(() => captain.arrived(), 15);
    captain.face(shepSide);
    yield 0.6;
    // the baby is laid in the manger
    holly.action = 'reach'; holly.reachTo = [mg.x, mg.y - 30];
    yield 0.8;
    holly.item = null;
    yield* S.tween(0.8, (u) => { mg.baby = u; });
    holly.action = 'none'; holly.reachTo = null;
    holly.loco = 'sit'; holly.action = 'kneel';
    w.sparkle(mg.x, mg.y - 34, 4, '#fff1b0', 6);
    yield* S.tween(2.4, (u) => { mg.glow = u; star.bright = lerp(0.45, 1, u); });
    captain.action = 'none';
    yield 1.5;

    // ---- 4. the angel and the shepherds ----
    const bTop = angelBale.y - 26;
    pip.action = 'none';
    yield* S.tween(0.5, (u) => { pip.attach = () => ({ x: angelBale.x + kingSide * 4, y: lerp(angelBale.y - 4, bTop, SD.backOut(u)) }); });
    pip.attach = () => ({ x: angelBale.x + kingSide * 4, y: bTop });
    pip.action = 'armsUp'; pip.flapK = 1;
    w.sparkle(pip.x, bTop - 90, 5, '#fff1b0', 7);
    yield 0.4;
    for (const p of [sh1, sh2, sheep]) { p.loco = 'stand'; p.action = 'startle'; p.jump(-160, 0); }
    sheep.say('baa', 1.2);
    yield 1.4;
    pip.flapK = 0.4; pip.action = 'wave';
    for (const p of [sh1, sh2]) p.action = 'none';
    sheep.action = 'none';
    yield 0.6;
    // the shepherds come closer and kneel; the sheep has other ideas
    const kneelX = [cx + shepSide * 222, cx + shepSide * 305];
    const sA = run((function* () { yield* go(sh1, kneelX[0], 26, 45); sh1.face(-shepSide); sh1.loco = 'sit'; sh1.action = 'kneel'; })());
    const sB = run((function* () {
      // the sheep wanders off the wrong way; the second shepherd fetches it back
      yield* go(sheep, sheep.x + shepSide * 150, 35, 30);
      sheep.say('baa', 1);
      yield* go(sh2, sheep.x - shepSide * 34, 31, 60);
      sh2.face(shepSide); sh2.action = 'point'; sheep.face(-shepSide);
      yield 0.8;
      sh2.action = 'none';
      const mid = cx + shepSide * 142;
      yield [run(go(sheep, mid, 31, 45)), run((function* () { yield 0.4; yield* go(sh2, kneelX[1], 31, 45); })())];
      sheep.face(-shepSide); sheep.loco = 'sit'; sheep.action = 'none';
      sh2.face(-shepSide); sh2.loco = 'sit'; sh2.action = 'kneel';
    })());
    yield 2;
    pip.action = 'none'; pip.flapK = 0.15;
    yield [sA, sB];

    // ---- 5. the three kings, following the star ----
    const kings = [specs, rocco, chubby];
    const KL = 31;
    kings.forEach((k, i) => { k.hidden = false; k.x = S.side(kingSide) + kingSide * (40 + i * 70); k.lane = k.laneT = KL; });
    const kneelK = [cx - shepSide * 218, cx - shepSide * 292, cx - shepSide * 366];
    const walkK = kings.map((k, i) => run((function* () { yield* go(k, kneelK[i], KL, 55); k.face(-kingSide); })()));
    // Specs leads, checking the star
    run((function* () { yield 2; specs.action = 'point'; yield 1.6; specs.action = 'none'; })());
    // Chubby's crown is a size too big
    run((function* () {
      yield 3.4;
      yield* S.tween(0.6, (u) => { chubby.crownSlip = SD.easeIn(u); });
      chubby.action = 'flail'; chubby.say('?', 1);
      yield 0.9;
      chubby.action = 'armsUp';
      yield* S.tween(0.5, (u) => { chubby.crownSlip = 1 - u; });
      chubby.action = 'none';
    })());
    yield walkK;
    // gifts set down at the manger, one by one
    const giftX = [mg.x - shepSide * 52, mg.x - shepSide * 78, mg.x - shepSide * 104];
    const giftFns = [chest, casket, jar];
    for (let i = 0; i < 3; i++) {
      const k = kings[i];
      const g = S.add(new Thing(w, giftX[i], 21 + i * 0.3, giftFns[i]));
      // up in front of the row, the gift set down at the manger, then back to kneel
      yield* toLane(k, 25);
      yield* go(k, g.x - shepSide * 30, 25, 45);
      k.face(shepSide); k.action = 'offer';
      yield 0.5;
      k.action = 'reach'; k.reachTo = [g.x, g.y - 8];
      yield 0.4;
      k.item = null;
      yield* S.tween(0.35, (u) => { g.show = u; });
      k.action = 'none'; k.reachTo = null;
      yield* go(k, kneelK[i], 25, 45);
      yield* toLane(k, KL);
      k.face(shepSide); k.loco = 'sit'; k.action = 'kneel';
      yield 0.3;
    }
    // ---- 6. the picture: everyone still, the star at its brightest ----
    captain.action = 'pray'; holly.action = 'pray';
    pip.action = 'armsUp'; pip.flapK = 0.25;
    yield* S.tween(1.6, (u) => { star.bright = 1 + u * 0.3; mg.glow = 1 + u * 0.3; });
    for (let k = 0; k < 4; k++) { w.sparkle(star.star()[0], star.star()[1], 3, '#fff1b0', 7); yield 1.1; }
    sheep.say('baa', 1.1);
    yield 1.6;

    // ---- 7. the curtain call ----
    const cast = [sh1, sh2, sheep, holly, captain, ...kings];
    cast.forEach((p) => { p.loco = 'stand'; p.action = 'none'; });
    holly.item = null;
    yield 0.6;
    hand.action = 'boom';
    pip.action = 'none';
    yield 0.3;
    // everyone bows together; the angel's halo pops off and he catches it
    cast.forEach((p) => { p.action = 'bow'; });
    pip.action = 'bow';
    run((function* () {
      yield 0.25;
      pip.haloOff = true;
      const [hx, hy] = pip.headTop();
      yield 0.9;
      pip.action = 'reach'; pip.reachTo = [pip.x, hy - 40];
      S.fling((c) => { c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.ellipse(0, 0, 11, 3.3, 0, 0, TAU); c.stroke(); c.strokeStyle = '#ffd43b'; c.lineWidth = 3.4; c.stroke(); },
        () => [hx, hy - 6], () => { const [x2, y2] = pip.headTop(); return [x2, y2 - 14]; }, 0.9, 70, () => { pip.haloOff = false; pip.action = 'none'; pip.reachTo = null; pip.say('heart', 1); });
    })());
    yield 1.6;
    cast.forEach((p) => { p.action = 'none'; });
    yield 0.4;
    cast.forEach((p) => { p.action = 'bow'; });
    yield 1.2;
    S.finale(); cast.forEach((p) => { p.action = 'cheer'; });
    hand.say('heart', 1.2);
    yield 1.6;
    cast.forEach((p) => { p.action = 'none'; });

    // ---- 8. off: the front leaves first; Mary carries the baby; the star goes last ----
    holly.loco = 'stand'; holly.action = 'reach'; holly.reachTo = [mg.x, mg.y - 30];
    yield 0.6;
    yield* S.tween(0.5, (u) => { mg.baby = 1 - u; });
    holly.item = holding((c, p) => bundle(c, p.t, 0), 6); holly.action = 'carryFront'; holly.reachTo = null;
    const offs = [
      ...kings.map((p, i) => [p, kingSide, i * 0.4]),
      [sheep, shepSide, 0], [sh1, shepSide, 0.3], [sh2, shepSide, 0.6],
      [captain, shepSide, 2.2], [holly, shepSide, 1.8],
    ];
    const outs = offs.map(([p, s, d]) => run((function* () { yield d; p.face(s); yield* go(p, S.side(s), p.laneT, 62); p.dead = true; })()));
    run((function* () {
      yield 2.6;
      pip.action = 'none'; pip.flapK = 0;
      yield* S.tween(0.4, (u) => { pip.attach = () => ({ x: angelBale.x + kingSide * (4 + 30 * u), y: lerp(bTop, angelBale.y, u) - Math.sin(u * PI) * 30 }); });
      pip.attach = null; pip.y = pip.groundY();
      yield* go(pip, S.side(kingSide), 5.5, 70); pip.dead = true;
    })());
    yield 3.5;
    yield* S.tween(1.2, (u) => { star.bright = 1.3 * (1 - u) + 0.3 * u; });
    yield* go(hand, S.side(kingSide), 1, 60);
    hand.dead = true; star.dead = true;
    yield outs;
    // the stable stays: the blizzard tidies up
  }

  Object.assign(SD.SCENES, {
    supper: { name: 'The Long Table', fn: sceneSupper, crew: 12 },
    nativity: { name: 'Nativity Play', fn: sceneNativity, crew: 10 },
  });
})();
