// Snow Day — scenes 7: The Trebuchet (they notice the glass), The Christmas Card, Santa's Grotto,
// and the Countdown billboard. Also the little set-building kit the later scenes share (SD.set).
'use strict';
(function () {
  const { clamp, lerp, TAU } = SD;
  const PI = Math.PI;
  const INK = '#151b2b', RED = '#d8343c', GREEN = '#2f8f57', GOLD = '#f2c14e', WOOD = '#a6754a', WOOD_D = '#7a5032', CREAM = '#fbf6ea';

  // ======================= the set kit =======================
  // a prop that is just a drawing: fn(ctx, prop) draws around (0,0) = its place on the snow.
  // hw/h: half width and height (for culling and the depth check); solid: nobody walks through it
  class Draw extends SD.Prop {
    constructor(w, x, lane, fn, o) { super(w, x, lane); this.fn = fn; this.hw = 60; this.h = 60; this.show = 1; this.lift = 0; this.solid = false; Object.assign(this, o); }
    extent() { return [this.x - this.hw, this.x + this.hw]; }
    bbox() { return [this.x - this.hw, this.y - this.h, this.x + this.hw, this.y]; }
    draw(ctx) {
      if (this.show <= 0.01 || this.alpha <= 0.01) return;
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (this.show < 1) { const s = SD.backOut(this.show); ctx.scale(s, s); }
      this.fn(ctx, this);
      ctx.restore();
    }
  }
  // something drawn in screen space over everything (a flash, snow on the glass, a printed photo)
  class Glass extends SD.Prop {
    constructor(w, fn) { super(w, 0, 999); this.fn = fn; this.follow = false; this.k = 0; }
    extent() { return [-1e6, 1e6]; }
    reflect() { return false; }
    draw(ctx) { if (SD.reflecting) return; const v = SD.view(); ctx.save(); this.fn(ctx, this, v, v.x0, v.x0 + innerWidth / v.scale, -v.offY / v.scale, (innerHeight - v.offY) / v.scale); ctx.restore(); }
  }
  // carry a prop in: the carriers hold its ends (or push from behind if there's one) and it's set down
  function* carryIn(S, prop, ps, toX, o = {}) {
    const half = o.half ?? prop.hw + 16, sp = o.sp ?? 95, lane = o.lane ?? prop.lane + 0.6, up = o.lift ?? 8;
    const dir = Math.sign(toX - prop.x) || 1;
    ps.forEach((p, i) => {
      p.hidden = false; p.dead = false; p.lane = p.laneT = lane + i * 0.2; p.action = o.action || 'carryFront'; p.face(dir); p.target = null; p.loco = 'walk';
      p.attach = () => ({ x: prop.x + (ps.length === 1 ? -dir * half : (i ? 1 : -1) * half), y: p.groundY() });
    });
    prop.lift = up; const x0 = prop.x; let last = x0;
    yield* S.tween(Math.abs(toX - x0) / sp, (u) => { prop.x = lerp(x0, toX, SD.easeInOut(u)); const d = Math.abs(prop.x - last); last = prop.x; ps.forEach((p) => { p.phase += d / 9 * PI; }); });
    yield* S.tween(0.3, (u) => { prop.lift = up * (1 - u); });
    prop.lift = 0;
    S.w.puff(toX, prop.y, 4, 9, 0.7, 0.4);
    ps.forEach((p) => { p.attach = null; p.loco = 'stand'; p.action = 'none'; p.y = p.groundY(); });
  }
  const hold = (draw, dx = 8, dy = 8) => ({ at: 'front', draw(ctx, p, hx, hy) { ctx.translate(hx + dx, hy + dy); draw(ctx, p); } });
  const overhead = (draw, y = -128) => ({ at: 'up', draw(ctx, p) { ctx.translate(0, y); draw(ctx, p); } });
  function dress(p, front, back) { p.hatOff = true; p.pal = Object.assign({}, p.pal, { style: 'none' }); p.costume = front; p.costumeBack = back || null; }
  const offstage = (S, p, side, lane) => { p.hidden = false; p.dead = false; p.loco = 'stand'; p.attach = null; p.target = null; p.x = S.side(side) + side * 40; p.lane = p.laneT = lane; p.y = p.groundY(); p.face(-side); };
  const blob = (ctx, pts, fill, edge = 'rgba(96,126,176,0.85)', lw = 2.4) => { // lumps merged into one soft shape
    ctx.strokeStyle = edge; ctx.lineWidth = lw; for (const [x, y, r] of pts) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = fill; for (const [x, y, r] of pts) { ctx.beginPath(); ctx.arc(x, y, r + 0.2, 0, TAU); ctx.fill(); }
  };
  const box = (ctx, x, y, w, h, fill, r = 3, lw = 2) => { ctx.fillStyle = fill; ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.beginPath(); SD.rrect(ctx, x, y, w, h, r); ctx.fill(); ctx.stroke(); };
  const line = (ctx, pts, col, lw, edge = true) => {
    const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); };
    if (edge) { path(); ctx.strokeStyle = INK; ctx.lineWidth = lw + 2.6; ctx.stroke(); }
    path(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke();
  };
  // a string of fairy lights along a sagging line; on: 0..1
  function lights(ctx, x0, y0, x1, y1, n, t, on = 1, sag = 14) {
    ctx.strokeStyle = '#2b3a2f'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1); ctx.stroke();
    const cols = ['#ff5a5f', '#ffd43b', '#4cc9f0', '#63d471', '#ff8fab'];
    for (let i = 1; i < n; i++) {
      const u = i / n, x = lerp(x0, x1, u), y = lerp(y0, y1, u) + sag * 4 * u * (1 - u) + 3, c = cols[i % cols.length];
      const lit = on * (0.65 + 0.35 * Math.sin(t * 3 + i * 1.7));
      if (on > 0.05) { ctx.globalAlpha *= 1; ctx.fillStyle = c; ctx.save(); ctx.globalAlpha *= 0.28 * lit; ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.fill(); ctx.restore(); }
      ctx.fillStyle = on > 0.05 ? c : '#8d97a8'; ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, 2.6, 3.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
    }
  }
  function candyStripes(ctx, path, w) { // red stripes clipped to a stroked path of width w
    ctx.save(); ctx.lineWidth = w + 2.6; ctx.strokeStyle = INK; ctx.stroke(path);
    ctx.lineWidth = w; ctx.strokeStyle = '#ffffff'; ctx.stroke(path);
    ctx.lineWidth = w; ctx.strokeStyle = RED; ctx.setLineDash([w * 0.9, w * 1.1]); ctx.lineCap = 'butt'; ctx.stroke(path); ctx.setLineDash([]);
    ctx.restore();
  }
  function tree(ctx, h, t, lit = 0, star = 1) { // a little Christmas tree, h tall, base at 0
    box(ctx, -5, -h * 0.12, 10, h * 0.12, WOOD_D, 1);
    ctx.fillStyle = GREEN; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) { const y0 = -h * (0.1 + k * 0.27), hw = h * (0.36 - k * 0.08); ctx.beginPath(); ctx.moveTo(-hw, y0); ctx.lineTo(0, y0 - h * 0.42); ctx.lineTo(hw, y0); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    const cols = ['#ff5a5f', '#ffd43b', '#4cc9f0', '#ff8fab'];
    for (let k = 0; k < 7; k++) { const u = k / 6, y = -h * (0.16 + u * 0.6), x = Math.sin(k * 2.4) * h * (0.26 - u * 0.2); ctx.fillStyle = cols[k % 4]; ctx.beginPath(); ctx.arc(x, y, h * 0.035 * (1 + lit * 0.4 * Math.sin(t * 4 + k)), 0, TAU); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke(); }
    if (star) SD.drawStar(ctx, 0, -h * 0.98, h * 0.09, t, lit);
  }
  function present(ctx, w, h, col, rib = GOLD) {
    box(ctx, -w / 2, -h, w, h, col, 2);
    ctx.fillStyle = rib; ctx.fillRect(-w * 0.09, -h, w * 0.18, h); ctx.fillRect(-w / 2, -h * 0.58, w, h * 0.16);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.fillStyle = rib;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * w * 0.14, -h - 4, w * 0.14, 4.5, s * 0.5, 0, TAU); ctx.fill(); ctx.stroke(); }
  }
  // hats
  const santaHat = (ctx, p) => {
    ctx.translate(0, p.kind === 'rocco' ? -7 : 0);
    ctx.fillStyle = RED; ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-30, -92); ctx.quadraticCurveTo(-22, -128, 0, -128); ctx.quadraticCurveTo(-34, -138, -48, -112 + Math.sin(p.t * 3) * 1.5); ctx.quadraticCurveTo(-40, -112, -34, -104); ctx.quadraticCurveTo(-10, -112, 24, -96); ctx.closePath(); ctx.fill(); ctx.stroke();
    blob(ctx, [[-28, -93, 6], [-18, -96, 6.5], [-7, -98, 6.5], [4, -98, 6.5], [14, -97, 6], [23, -94, 5.5]], '#ffffff', INK, 2.6);
    blob(ctx, [[-48, -110 + Math.sin(p.t * 3) * 1.5, 6.5]], '#ffffff', INK, 2.6);
  };
  const beard = (ctx) => blob(ctx, [[2, -56, 7], [12, -50, 9], [24, -48, 9], [34, -54, 7], [28, -40, 8], [16, -38, 8], [22, -30, 6]], '#ffffff', 'rgba(110,125,150,0.9)', 2.4);
  const santa = (ctx, p) => { ctx.save(); beard(ctx); ctx.restore(); santaHat(ctx, p); };
  const cape = (ctx) => { ctx.fillStyle = RED; ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-18, -74); ctx.quadraticCurveTo(-46, -50, -44, -4); ctx.lineTo(-16, -4); ctx.closePath(); ctx.fill(); ctx.stroke(); blob(ctx, [[-42, -6, 5], [-33, -5, 5], [-24, -5, 5], [-16, -5, 4.5]], '#ffffff', INK, 2.4); };
  const elfHat = (col = GREEN) => (ctx, p) => {
    ctx.translate(0, p.kind === 'rocco' ? -7 : 0);
    ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-30, -92); ctx.quadraticCurveTo(-20, -124, -34, -142); ctx.quadraticCurveTo(-4, -126, 24, -96); ctx.quadraticCurveTo(-4, -108, -30, -92); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-30, -92); ctx.quadraticCurveTo(-4, -108, 24, -96); ctx.stroke(); ctx.strokeStyle = RED; ctx.lineWidth = 4.4; ctx.stroke();
    ctx.fillStyle = GOLD; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(-35, -143 + Math.sin(p.t * 5) * 1.2, 4, 0, TAU); ctx.fill(); ctx.stroke();
  };
  SD.set = { Draw, Glass, carryIn, hold, overhead, dress, offstage, blob, box, line, lights, candyStripes, tree, present, santaHat, santa, cape, elfHat, INK, RED, GREEN, GOLD, WOOD, WOOD_D, CREAM };

  // =====================================================================
  // THE TREBUCHET — the crew builds a siege engine, winds it back, and discovers which way it's
  // pointing: straight at the glass. Then somebody has to clean the screen.
  // =====================================================================
  // depth plan: engine 10 · crank and lever hands 12–16 · planners and watchers 22–28 (left of the
  // engine) · the window-cleaners come back at 62–70, big, right up against the glass
  const TK = 1.5; // it's a big machine
  // where the sling's pouch is, in the world (the scene needs it whether or not a frame is drawn)
  function pouchOf(tb) {
    const lx = Math.cos(tb.th) * 150, ly = -118 + Math.sin(tb.th) * 150, sa = tb.th + tb.lag;
    return [tb.x + (lx + Math.cos(sa + 0.9) * 40) * TK, tb.y + (Math.min(-4, ly + Math.sin(sa + 0.9) * 40) - 2) * TK];
  }
  function drawTreb(ctx, tb) {
    ctx.scale(TK, TK);
    const th = tb.th, P = [0, -118];
    // base and A-frame
    line(ctx, [[-120, -6], [110, -6]], WOOD_D, 9);
    for (const x of [-96, 86]) { ctx.fillStyle = WOOD_D; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, -6, 12, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = WOOD; ctx.beginPath(); ctx.arc(x, -6, 4, 0, TAU); ctx.fill(); ctx.stroke(); }
    line(ctx, [[-46, -8], P, [46, -8]], WOOD, 8);
    line(ctx, [[-26, -56], [26, -56]], WOOD, 6);
    // the arm: long end out to the sling, short end to the weight box
    const L = 150, Sh = 48, lx = P[0] + Math.cos(th) * L, ly = P[1] + Math.sin(th) * L, sx = P[0] - Math.cos(th) * Sh, sy = P[1] - Math.sin(th) * Sh;
    line(ctx, [[sx, sy], [lx, ly]], '#b88352', 7);
    // weight box, hanging
    line(ctx, [[sx, sy], [sx, sy + 14]], '#8c95a5', 2, false);
    box(ctx, sx - 20, sy + 14, 40, 32, WOOD_D, 3);
    for (let k = 0; k < Math.round(tb.fill * 4); k++) box(ctx, sx - 16 + (k % 2) * 16, sy + 30 - Math.floor(k / 2) * 13, 15, 12, '#cfe6f7', 2, 1.4);
    // sling and pouch
    const sa = th + tb.lag, px = lx + Math.cos(sa + 0.9) * 40, py = Math.min(-4, ly + Math.sin(sa + 0.9) * 40);
    line(ctx, [[lx, ly], [px, py]], '#d8c9a3', 2, false);
    ctx.fillStyle = '#8b5e3c'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(px, py, 13, 5, 0, 0, PI); ctx.fill(); ctx.stroke();
    // axle, crank wheel and lever
    ctx.fillStyle = '#8c95a5'; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(P[0], P[1], 6, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.translate(-74, -30); ctx.rotate(tb.crank); ctx.fillStyle = WOOD; ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill(); ctx.stroke(); for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(k * PI / 2) * 20, Math.sin(k * PI / 2) * 20); ctx.stroke(); } ctx.restore();
    ctx.save(); ctx.translate(58, -10); ctx.rotate(-0.5 + tb.lever * 1.1); line(ctx, [[0, 0], [0, -40]], '#8c95a5', 4); ctx.fillStyle = RED; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(0, -42, 6, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  const snowball = (ctx, r) => {
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(96,126,176,0.9)'; ctx.lineWidth = Math.max(1.6, r * 0.05); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(176,204,238,0.5)'; ctx.beginPath(); ctx.arc(r * 0.18, r * 0.2, r * 0.72, 0.2, PI - 0.4); ctx.fill();
    ctx.strokeStyle = 'rgba(150,180,220,0.6)'; ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.2, r * 0.5, PI * 1.1, PI * 1.6); ctx.stroke();
  };
  const blueprint = (ctx) => { box(ctx, -13, -18, 26, 20, '#3f6fb5', 2); ctx.strokeStyle = '#dce9ff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(0, -13); ctx.lineTo(8, -4); ctx.moveTo(-9, -3); ctx.lineTo(9, -3); ctx.moveTo(-6, -9); ctx.lineTo(7, -12); ctx.stroke(); };
  const squeegee = { at: 'front', draw(ctx, p, hx, hy) { ctx.translate(hx, hy); ctx.rotate(-0.5); line(ctx, [[0, 14], [0, -22]], '#8c95a5', 3.4); box(ctx, -14, -28, 28, 7, '#3f6fb5', 2); ctx.fillStyle = INK; ctx.fillRect(-14, -31, 28, 3); } };

  function* sceneTrebuchet(S) {
    const w = S.w, r = S.r, cx = S.cx, run = (g) => S.run(g);
    const M = S.marks({ eng: [60, 10, true], crank: [-78, 14], lever: [196, 15], load: [-160, 11], specs: [-330, 24], cap: [-262, 27], w1: [-420, 20], w2: [-486, 26], w3: [-390, 31], w4: [320, 24], w5: [392, 28] }, { scene: 'trebuchet' });
    const cap = S.spawn({ kind: 'captain' }), specs = S.spawn({ kind: 'specs' }), rocco = S.spawn({ kind: 'rocco' }), chubby = S.spawn({ kind: 'chubby' }), holly = S.spawn({ kind: 'holly' }), pip = S.spawn({ kind: 'pip' }), c1 = S.spawn({ kind: 'crew' }), c2 = S.spawn({ kind: 'crew' });
    const all = [cap, specs, rocco, chubby, holly, pip, c1, c2];
    all.forEach((p) => { p.hidden = true; p.x = S.offL - 200; });

    // ---- 1. the plan ----
    offstage(S, specs, -1, M.specs.lane); offstage(S, cap, -1, M.cap.lane); cap.x -= 70;
    specs.item = hold(blueprint, 10, 6); specs.action = 'carryFront';
    run(S.to(cap, M.cap, 70)); yield* S.to(specs, M.specs, 70);
    specs.face(1); cap.face(-1); specs.action = 'inspect'; yield 1.2;
    specs.action = 'point'; specs.say('!', 1); yield 1; specs.action = 'inspect'; cap.face(1); cap.action = 'point'; yield 0.8; cap.action = 'none';

    // ---- 2. the engine is wheeled on ----
    const tb = S.add(new Draw(w, S.side(1) + 180, M.eng.lane, drawTreb, { hw: 190, h: 190, solid: true, th: 4.3, lag: 0.2, fill: 0, crank: 0, lever: 0 }));
    yield* carryIn(S, tb, [rocco, c1], M.eng.x, { half: 200, sp: 100, lift: 0, action: 'push', lane: M.eng.lane + 3 });
    run(S.to(c1, M.w4, 60, 20)); yield* S.to(rocco, M.lever, 60, 16);
    rocco.face(-1);
    // ---- 3. ice for the weight box; the arm is cranked down ----
    const ice = (ctx) => box(ctx, -12, -18, 24, 18, '#cfe6f7', 3);
    for (const p of [chubby, c2]) {
      offstage(S, p, 1, 15); p.item = overhead(ice, -122); p.action = 'carryUp';
      yield* S.go(p, M.eng.x + 60, 16, 85);
      p.item = null; p.action = 'throw'; yield 0.25;
      yield* S.tween(0.3, (u) => { tb.fill = tb.fill + (p === chubby ? 0.5 : 0.5) * u * 0.2; });
      tb.fill = p === chubby ? 0.5 : 1; w.puff(tb.x + 30, tb.y - 130, 2, 5); p.action = 'none';
      run(S.to(p, p === chubby ? M.w5 : M.w1, 70, p === chubby ? 22 : 34));
    }
    offstage(S, holly, -1, 13);
    yield* S.go(holly, M.crank.x, M.crank.lane, 80); holly.face(1); holly.action = 'pull';
    yield* S.tween(3.4, (u) => { tb.th = lerp(4.3, 2.72, SD.easeInOut(u)); tb.crank = u * 14; tb.lag = 0.2 * (1 - u); if (((u * 12) | 0) !== (((u - 0.01) * 12) | 0)) w.puff(tb.x - 74, tb.y - 30, 1, 3, 0.3, 0.3); });
    holly.action = 'none'; holly.say('heart', 0.8);
    // ---- 4. the snowball, rolled in and loaded ----
    const ball = S.add(new SD.SnowBall(w, S.side(-1) - 30, M.load.lane, 8));
    offstage(S, pip, -1, M.load.lane); pip.action = 'push'; pip.loco = 'walk';
    pip.attach = () => ({ x: ball.x - ball.r - 18, y: pip.groundY() });
    const bx0 = ball.x, bx1 = tb.x - 215;
    yield* S.tween(Math.abs(bx1 - bx0) / 62, (u) => { const nx = lerp(bx0, bx1, u); ball.roll(nx - ball.x); ball.r = lerp(8, 30, u); pip.phase += 0.18; });
    pip.attach = null; pip.loco = 'stand'; pip.action = 'none'; pip.y = pip.groundY();
    run(S.to(holly, M.w2, 60, 30));
    const b0 = [ball.x, ball.y - ball.r];
    ball.follow = false;
    yield* S.tween(0.6, (u) => { ball.x = lerp(b0[0], pouchOf(tb)[0], u); ball.cy = lerp(b0[1], pouchOf(tb)[1] - 26, u) - Math.sin(u * PI) * 26; });
    pip.action = 'cheer'; yield 0.6; pip.action = 'none';
    yield* S.to(pip, M.w3, 70, 34);
    // ---- 5. three, two, one ----
    all.forEach((p) => { if (p !== rocco) p.face(Math.sign(tb.x - p.x) || 1); });
    cap.action = 'point';
    for (const n of ['3', '2', '1']) { cap.say(n, 0.8); yield 0.85; }
    specs.action = 'hide'; rocco.action = 'pull';
    yield* S.tween(0.25, (u) => { tb.lever = u; });
    // ---- 6. loose! the arm comes over... and the ball comes straight at us ----
    const fly = S.add(new Glass(w, (ctx, g) => { if (g.r > 0) { ctx.translate(g.bx, g.by); if (g.r > 60) { ctx.fillStyle = `rgba(20,30,50,${Math.min(0.35, g.r / 3000)})`; ctx.fillRect(-5000, -5000, 10000, 10000); } snowball(ctx, g.r); } }));
    fly.r = 0;
    let rel = null;
    yield* S.tween(0.5, (u) => {
      tb.th = lerp(2.72, 5.25, SD.easeIn(u)); tb.lag = -0.9 * Math.sin(u * PI);
      if (!rel) { ball.x = pouchOf(tb)[0]; ball.cy = pouchOf(tb)[1] - 26; if (u > 0.72) { rel = [ball.x, ball.cy]; ball.dead = true; } }
    });
    if (!rel) { rel = [ball.x, ball.cy]; ball.dead = true; }
    w.puff(tb.x, tb.y, 6, 10, 1, 0.5);
    all.forEach((p) => { if (!p.hidden) p.action = 'lookUp'; });
    const gy = S.ground(cx), tgt = [cx, gy - 330];
    yield* S.tween(1.9, (u) => {
      const k = SD.easeIn(u);
      fly.bx = lerp(rel[0], tgt[0], u) + Math.sin(u * 5) * 6; fly.by = lerp(rel[1], tgt[1], Math.min(1, u * 1.6)) - Math.sin(Math.min(1, u * 1.6) * PI) * 120;
      fly.r = 24 + k * k * 620;
      if (u > 0.55) all.forEach((p) => { if (!p.hidden && p.action === 'lookUp') { p.action = 'startle'; } });
    });
    fly.dead = true;
    // ---- 7. SPLAT ----
    const cv = document.createElement('canvas'); cv.width = 1300; cv.height = 900;
    const sc = cv.getContext('2d'), sr = SD.mulberry(S.seed ^ 77);
    sc.translate(650, 380);
    const lumps = []; for (let k = 0; k < 46; k++) { const a = sr() * TAU, d = sr() * 250; lumps.push([Math.cos(a) * d * 1.35, Math.sin(a) * d * 0.9, 70 + sr() * 110]); }
    for (let k = 0; k < 26; k++) { const a = (k / 26) * TAU + sr() * 0.2, d = 360 + sr() * 190; lumps.push([Math.cos(a) * d * 1.25, Math.sin(a) * d * 0.8, 10 + sr() * 26]); lumps.push([Math.cos(a) * d * 1.02, Math.sin(a) * d * 0.66, 22 + sr() * 30]); }
    blob(sc, lumps, '#ffffff', 'rgba(110,140,190,0.9)', 5);
    sc.fillStyle = 'rgba(176,204,238,0.45)'; for (let k = 0; k < 16; k++) { const [x, y, rr] = lumps[k]; sc.beginPath(); sc.arc(x + rr * 0.15, y + rr * 0.3, rr * 0.7, 0.2, PI - 0.3); sc.fill(); }
    const splat = S.add(new Glass(w, (ctx, g) => {
      if (g.k <= 0) return;
      const s = SD.backOut(Math.min(1, g.k)) * 1.0;
      ctx.translate(cx, gy - 330 + g.slide); ctx.scale(s, s * (1 + g.slide / 1400));
      ctx.globalAlpha = g.alpha; ctx.drawImage(cv, -650, -380);
    }));
    splat.slide = 0;
    splat.wipe = (x, y, rr) => { sc.save(); sc.globalCompositeOperation = 'destination-out'; sc.beginPath(); sc.arc(x - cx, (y - (gy - 330 + splat.slide)) / (1 + splat.slide / 1400), rr, 0, TAU); sc.fill(); sc.restore(); };
    yield* S.tween(0.16, (u) => { splat.k = u; });
    for (let k = 0; k < 10; k++) w.puff(cx + r.range(-500, 500), gy - r.range(40, 420), 3, 16, 2, 1);
    all.forEach((p) => { if (!p.hidden) { p.action = 'startle'; p.jump(-150, 0); } });
    yield 1.4;
    all.forEach((p) => { if (!p.hidden) { p.action = 'none'; p.face(Math.sign(cx - p.x) || 1); } });
    yield 0.8;
    specs.action = 'inspect'; yield 0.9; specs.say('?', 1.2); specs.action = 'shrug';
    cap.action = 'shrug'; yield 1.4; cap.action = 'point'; cap.face(-1); specs.action = 'none';
    // the snow slumps down the glass
    run(S.tween(7, (u) => { splat.slide = 210 * SD.easeInOut(u); }));
    // ---- 8. cleaning the screen: three of them come round to our side of the glass ----
    const cleaners = [pip, chubby, holly];
    yield cleaners.map((p, i) => run((function* () { yield i * 0.3; p.face(-1); yield* S.go(p, S.side(-1), p.laneT, 95); p.hidden = true; })()));
    cap.action = 'none';
    yield 0.6;
    const wipeY = [150, 260, 370];
    const sweeps = cleaners.map((p, i) => run((function* () {
      p.size = 1.5; offstage(S, p, -1, 62 + i * 4); p.item = squeegee; p.action = 'reach';
      yield i * 1.7;
      p.goTo(S.side(1), 150);
      while (p.x < S.ax1 + 60) {
        p.reachTo = [p.x + 40, gy - wipeY[i]];
        for (let dy = -70; dy <= 70; dy += 35) splat.wipe(p.x + 30, gy - wipeY[i] + dy + Math.sin(p.x / 40) * 30, 62);
        if (p === pip && Math.abs(p.x - cx) < 3 && !pip.peeked) {
          // Pip stops in the middle and looks straight at us
          pip.peeked = true; p.target = null; p.action = 'none'; p.reachTo = null; yield 0.4;
          p.action = 'tap'; for (let k = 0; k < 3; k++) { w.sparkle(p.x + 34, gy - 96, 1, '#ffffff', 8); yield 0.35; }
          p.say('?', 1); yield 1.1; p.action = 'wave'; p.say('heart', 1.4); yield 1.6;
          p.action = 'reach'; p.goTo(S.side(1), 150);
        }
        yield 0;
      }
      p.hidden = true; p.item = null; p.size = 0.74;
    })()));
    yield sweeps;
    yield* S.tween(0.8, (u) => { splat.alpha = 1 - u; });
    splat.dead = true;
    // ---- 9. and wind it back again ----
    const rest = all.filter((p) => !p.hidden);
    S.finale(); rest.forEach((p) => { p.action = 'cheer'; }); yield 1.4;
    rocco.action = 'pull'; yield* S.tween(0.3, (u) => { tb.lever = 1 - u; }); rocco.action = 'none';
    cap.say('!', 1); cap.action = 'point'; cap.face(-1); yield 1; cap.action = 'none';
    yield* S.exitAll(rest, 70, true, 26);
  }

  // =====================================================================
  // THE CHRISTMAS CARD — the crew poses for this year's card. The camera is on a timer. It takes
  // three goes.
  // =====================================================================
  // depth plan: bunting poles 4 · back row 10 · middle row 17 (half a place across) · front row 25
  // (small ones, across again) · camera 34 and the photographer's place by it
  const camera = (ctx, c) => {
    line(ctx, [[-14, 0], [0, -46], [14, 0]], '#5a4632', 3); line(ctx, [[0, -46], [4, -2]], '#5a4632', 3);
    ctx.save(); ctx.translate(0, -56 + c.sink); ctx.rotate(c.tilt);
    box(ctx, -17, -13, 34, 24, '#3a3f4d', 4); box(ctx, -6, -18, 14, 6, '#3a3f4d', 2);
    ctx.fillStyle = '#9fd0ee'; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-c.dir * 17, -1, 8, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c.blink > 0 ? '#ff4d4d' : '#6b2a2a'; ctx.beginPath(); ctx.arc(c.dir * 10, -8, 2.4, 0, TAU); ctx.fill();
    ctx.restore();
  };
  function printOf(kind) { // what came out: a little picture of the mistake, or of the keeper
    return (ctx) => {
      ctx.fillStyle = '#b9d6ee'; ctx.fillRect(-44, -36, 88, 56);
      ctx.fillStyle = '#f4f8ff'; ctx.fillRect(-44, 8, 88, 12);
      const peng = (x, y, s, blink) => { ctx.fillStyle = '#1b2233'; ctx.beginPath(); ctx.ellipse(x, y, 7 * s, 10 * s, 0, 0, TAU); ctx.fill(); ctx.fillStyle = CREAM; ctx.beginPath(); ctx.ellipse(x + 1.5 * s, y + 2 * s, 4.4 * s, 6.5 * s, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#f2952f'; ctx.fillRect(x + 4 * s, y - 3 * s, 4 * s, 2 * s); ctx.fillStyle = INK; if (blink) ctx.fillRect(x, y - 5.6 * s, 3.2 * s, 1); else { ctx.beginPath(); ctx.arc(x + 1.5 * s, y - 5 * s, 1.1 * s, 0, TAU); ctx.fill(); } };
      if (kind === 'blink') { for (let k = 0; k < 5; k++) peng(-30 + k * 15, 2, 1, true); }
      else if (kind === 'feet') { ctx.fillStyle = '#f4f8ff'; ctx.fillRect(-44, -36, 88, 56); ctx.fillStyle = '#f2952f'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(-32 + k * 16, -30, 5, 2.6, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(-25 + k * 16, -30, 5, 2.6, 0, 0, TAU); ctx.fill(); } }
      else { ctx.save(); ctx.translate(26, 10); tree(ctx, 40, 0, 1); ctx.restore(); for (let k = 0; k < 4; k++) peng(-32 + k * 13, 2 - (k % 2) * 5, 1, false); }
    };
  }
  function* sceneCard(S) {
    const w = S.w, r = S.r, cx = S.cx, run = (g) => S.run(g);
    const side = r.sign(); // which side the camera stands
    const rows = { b0: [-147, 10], b1: [-49, 10], b2: [49, 10], b3: [147, 10], m0: [-98, 17], m1: [0, 17], m2: [98, 17], f0: [-24, 26], f1: [26, 26] };
    const M = S.marks(Object.assign({ cam: [side * 330, 34, true], shooter: [side * 392, 33], tree: [-250, 6, true], gift: [250, 7, true] }, rows), { scene: 'card' });
    const cap = S.spawn({ kind: 'captain' }), specs = S.spawn({ kind: 'specs' }), rocco = S.spawn({ kind: 'rocco' }), chubby = S.spawn({ kind: 'chubby' }), holly = S.spawn({ kind: 'holly' }), pip = S.spawn({ kind: 'pip' });
    const crew = [0, 1, 2].map(() => S.spawn({ kind: 'crew' }));
    const posers = [[cap, 'b1'], [rocco, 'b2'], [crew[0], 'b0'], [crew[1], 'b3'], [chubby, 'm1'], [holly, 'm0'], [crew[2], 'm2'], [pip, 'f0']];
    const all = [cap, specs, rocco, chubby, holly, pip, ...crew];
    all.forEach((p) => { p.hidden = true; p.x = S.offL - 200; });

    // ---- 1. dressing the spot: a tree, a great big present, bunting overhead ----
    const tr = S.add(new Draw(w, S.side(-1) - 60, M.tree.lane, (ctx, d) => tree(ctx, 150, d.t, d.lit), { hw: 55, h: 150, lit: 0 }));
    yield* carryIn(S, tr, [crew[0], crew[1]], M.tree.x, { half: 50 });
    const gift = S.add(new Draw(w, S.side(1) + 60, M.gift.lane, (ctx) => { present(ctx, 70, 56, '#3f8fd8'); ctx.save(); ctx.translate(46, 0); present(ctx, 36, 30, RED, '#ffffff'); ctx.restore(); }, { hw: 60, h: 60 }));
    run((function* () { for (const [p, k] of [[crew[0], 'b0'], [crew[1], 'b3']]) run(S.to(p, M[k], 60, 14)); })());
    yield* carryIn(S, gift, [chubby], M.gift.x, { half: 50, action: 'push', lift: 0, lane: M.gift.lane + 4 });
    const bunt = S.add(new Draw(w, cx, 4, (ctx, d) => { for (const s of [-1, 1]) line(ctx, [[s * 300, 0], [s * 300, -190]], WOOD, 5); lights(ctx, -300, -188, 300, -188, 22, d.t, d.on, 16); }, { hw: 310, h: 190, on: 0, show: 0 }));
    yield* S.tween(0.6, (u) => { bunt.show = u; });
    // ---- 2. the photographer and the camera ----
    const cam = S.add(new Draw(w, S.side(side) + side * 40, M.cam.lane, camera, { hw: 20, h: 76, dir: side, sink: 0, tilt: 0, blink: 0, solid: true }));
    yield* carryIn(S, cam, [specs], M.cam.x, { half: 30, lane: M.cam.lane });
    yield* S.to(specs, M.shooter, 60);
    specs.face(-side); specs.action = 'point';
    // everyone to their places: back row first, so nobody has to push through
    for (const [p, k] of posers) {
      if (p.hidden) offstage(S, p, k[0] === 'f' ? -side : (posers.indexOf(posers.find((q) => q[0] === p)) % 2 ? 1 : -1), M[k].lane);
    }
    yield posers.map(([p, k], i) => run((function* () { yield (k[0] === 'b' ? 0 : k[0] === 'm' ? 2.2 : 4) + i * 0.15; yield* S.to(p, M[k], 78, M[k].lane); p.face(side); })()));
    specs.action = 'none';
    const group = posers.map((q) => q[0]);
    const flash = S.add(new Glass(w, (ctx, g) => { if (g.k > 0.01) { ctx.fillStyle = `rgba(255,255,255,${g.k})`; ctx.fillRect(-1e5, -1e5, 2e5, 2e5); } }));
    const gy = S.ground(cx);
    const shot = function* (kind, during) {
      // set the timer, run round to the last place, 3-2-1, flash, and see what came out
      specs.face(-side); specs.action = 'tap'; yield 0.7; specs.action = 'none';
      yield* S.to(specs, M.f1, 120, 30); specs.face(side);
      group.forEach((p) => { p.action = 'none'; p.face(side); });
      for (const n of ['3', '2', '1']) { cam.blink = 1; w.sparkle(cam.x, cam.y - 66, 1, '#ff6b6b', 5); yield 0.35; cam.blink = 0; yield 0.35; if (n === '2' && during) run(during()); }
      [...group, specs].forEach((p) => { if (p.action === 'none') p.action = 'cheer'; });
      yield* S.tween(0.12, (u) => { flash.k = u * 0.9; }); yield* S.tween(0.5, (u) => { flash.k = 0.9 * (1 - u); });
      // the print
      const pr = S.add(new Glass(w, (ctx, g) => {
        const u = SD.backOut(Math.min(1, g.k));
        ctx.translate(lerp(cam.x, cx, u), lerp(cam.y - 60, gy - 330, u)); ctx.rotate((1 - u) * 0.6 - 0.04); ctx.scale(0.3 + u * 2.3, 0.3 + u * 2.3);
        ctx.globalAlpha = g.alpha; ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(-49, -41, 104, 84);
        box(ctx, -52, -44, 104, 84, '#ffffff', 3); printOf(kind)(ctx);
      }));
      yield* S.tween(0.7, (u) => { pr.k = u; });
      yield 2.2;
      return pr;
    };
    // ---- 3. take one: everybody blinked ----
    let pr = yield* shot('blink', function* () { group.forEach((p) => { p.eyeOverride = 'closed'; }); yield 2; group.forEach((p) => { p.eyeOverride = null; }); });
    [...group, specs].forEach((p) => { p.action = 'shrug'; }); yield 1.2;
    yield* S.tween(0.4, (u) => { pr.alpha = 1 - u; }); pr.dead = true;
    [...group, specs].forEach((p) => { p.action = 'none'; });
    yield* S.to(specs, M.shooter, 110, 30);
    // ---- 4. take two: the tripod sinks into the snow ----
    pr = yield* shot('feet', function* () { yield* S.tween(0.6, (u) => { cam.sink = 26 * SD.easeIn(u); cam.tilt = -side * 0.5 * u; }); w.puff(cam.x, cam.y, 4, 8); });
    specs.say('?', 1); [...group].forEach((p, i) => { p.action = i % 2 ? 'shrug' : 'none'; }); yield 1.4;
    yield* S.tween(0.4, (u) => { pr.alpha = 1 - u; }); pr.dead = true;
    group.forEach((p) => { p.action = 'none'; });
    yield* S.to(specs, M.shooter, 110, 30);
    specs.face(-side); specs.action = 'pull'; yield* S.tween(0.7, (u) => { cam.sink = 26 * (1 - u); cam.tilt = -side * 0.5 * (1 - u); }); specs.action = 'none';
    // ---- 5. take three: the lights come on, and it's the one ----
    yield* S.tween(0.8, (u) => { bunt.on = u; tr.lit = u; });
    pr = yield* shot('good', null);
    for (let k = 0; k < 6; k++) w.confetti(cx + r.range(-260, 260), gy - 240, 3, 80);
    S.finale(); [...group, specs].forEach((p) => { p.action = 'cheer'; p.jump(-120, 0); });
    yield 2.6;
    yield* S.tween(0.5, (u) => { pr.alpha = 1 - u; }); pr.dead = true; flash.dead = true;
    yield* S.exitAll([...group, specs], 70, true, 26);
  }

  // =====================================================================
  // SANTA'S GROTTO — a cosy grotto goes up, Santa takes his chair, and the grown-ups queue to say
  // what they'd like for Christmas. Then it's Chubby's turn.
  // =====================================================================
  // depth plan: grotto wall 2 · tree and presents 5–7 · chair 11 · Santa 12 · knee 14 · elf 19 ·
  // queue 24/27 alternating to one side · the way out is along the front at 34
  function drawGrotto(ctx, g) {
    const t = g.t, on = g.on;
    // the wall: warm boards under a snowy roof, an arch of garland
    box(ctx, -250, -210, 500, 210, '#7b3f33', 6);
    ctx.strokeStyle = 'rgba(40,15,10,0.35)'; ctx.lineWidth = 1.4; for (let x = -220; x < 250; x += 34) { ctx.beginPath(); ctx.moveTo(x, -208); ctx.lineTo(x, -2); ctx.stroke(); }
    // window with the night outside
    box(ctx, -210, -160, 72, 78, '#27375f', 4); ctx.fillStyle = '#ffffff'; for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.arc(-200 + (k * 23) % 60, -150 + ((k * 31 + t * 14) % 64), 1.6, 0, TAU); ctx.fill(); }
    line(ctx, [[-174, -160], [-174, -82]], '#e9d9bd', 3, false); line(ctx, [[-210, -121], [-138, -121]], '#e9d9bd', 3, false);
    blob(ctx, [[-206, -80, 6], [-194, -82, 7], [-180, -81, 7], [-166, -82, 7], [-152, -81, 6], [-142, -80, 5]], '#ffffff');
    // fireplace: stone, fire, stockings
    box(ctx, 96, -128, 136, 128, '#b9b4ad', 6); box(ctx, 86, -140, 156, 16, '#8a5a3a', 3);
    ctx.fillStyle = '#2a1c1c'; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(120, 0); ctx.lineTo(120, -62); ctx.quadraticCurveTo(164, -100, 208, -62); ctx.lineTo(208, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (const [x, h, c, ph] of [[150, 46, '#ff8a2a', 0], [176, 56, '#ffb02e', 1.3], [164, 34, '#ffe08a', 2.1]]) { const hh = h * (0.85 + 0.15 * Math.sin(t * 9 + ph)); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - 13, -4); ctx.quadraticCurveTo(x - 10, -hh * 0.6, x + Math.sin(t * 7 + ph) * 4, -hh); ctx.quadraticCurveTo(x + 12, -hh * 0.5, x + 13, -4); ctx.closePath(); ctx.fill(); }
    line(ctx, [[134, -4], [196, -8]], WOOD_D, 6);
    const glow = ctx.createRadialGradient(164, -40, 4, 164, -40, 150); glow.addColorStop(0, 'rgba(255,180,90,0.42)'); glow.addColorStop(1, 'rgba(255,180,90,0)'); ctx.fillStyle = glow; ctx.fillRect(10, -200, 240, 200);
    for (const [x, c] of [[104, RED], [136, GREEN], [192, RED], [222, '#3f8fd8']]) { ctx.fillStyle = c; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 6, -124); ctx.lineTo(x + 6, -124); ctx.lineTo(x + 6, -104); ctx.quadraticCurveTo(x + 16, -98, x + 10, -92); ctx.lineTo(x - 6, -96); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 7, -127, 14, 6); ctx.strokeRect(x - 7, -127, 14, 6); }
    // roof with snow and icicles, garland and lights
    ctx.fillStyle = '#5a2d27'; ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-272, -204); ctx.lineTo(0, -262); ctx.lineTo(272, -204); ctx.lineTo(262, -192); ctx.lineTo(-262, -192); ctx.closePath(); ctx.fill(); ctx.stroke();
    const snow = []; for (let k = 0; k <= 20; k++) { const u = k / 20, x = lerp(-266, 266, u); snow.push([x, -206 - (1 - Math.abs(u - 0.5) * 2) * 56, 11 + (k % 3) * 2]); } blob(ctx, snow, '#ffffff');
    ctx.strokeStyle = '#2f7d4b'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-246, -190); ctx.quadraticCurveTo(-120, -150, 0, -186); ctx.quadraticCurveTo(120, -150, 246, -190); ctx.stroke();
    ctx.fillStyle = RED; for (const [x, y] of [[-180, -170], [-60, -171], [60, -171], [180, -170], [0, -186]]) { ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU); ctx.fill(); }
    lights(ctx, -246, -196, 0, -192, 12, t, on, 20); lights(ctx, 0, -192, 246, -196, 12, t + 2, on, 20);
    // a framed list on the wall, and a rug
    box(ctx, -110, -150, 44, 56, CREAM, 3); ctx.strokeStyle = 'rgba(60,70,90,0.6)'; ctx.lineWidth = 1.4; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(-102, -140 + k * 9); ctx.lineTo(-76, -140 + k * 9); ctx.stroke(); }
    ctx.fillStyle = '#b8323b'; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(-10, 14, 170, 15, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(-10, 14, 150, 10.5, 0, 0, TAU); ctx.stroke();
  }
  function drawChair(ctx, c) {
    ctx.rotate(c.tip * 0.09); ctx.translate(0, c.tip * 5);
    box(ctx, -46, -112 + c.squash * 6, 80, 112, '#8f2f3a', 16); // back
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.beginPath(); SD.rrect(ctx, -38, -104 + c.squash * 6, 64, 60, 12); ctx.stroke();
    box(ctx, -52, -44 + c.squash * 8, 100, 34 - c.squash * 8, '#a63a45', 9); // seat cushion
    box(ctx, -58, -62 + c.squash * 5, 20, 54, '#8f2f3a', 8); box(ctx, 36, -62 + c.squash * 5, 20, 54, '#8f2f3a', 8); // arms
    for (const x of [-48, 40]) box(ctx, x, -10, 10, 10, WOOD_D, 2);
  }
  const WISH = {
    skates: (ctx) => { ctx.fillStyle = '#ffffff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(0, -12); ctx.lineTo(1, -2); ctx.lineTo(12, 2); ctx.lineTo(12, 7); ctx.lineTo(-9, 7); ctx.closePath(); ctx.fill(); ctx.stroke(); line(ctx, [[-11, 11], [14, 11]], '#9fb3c8', 2.4); ctx.strokeStyle = RED; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(2, -6); ctx.moveTo(-3, -2); ctx.lineTo(3, -2); ctx.stroke(); },
    telescope: (ctx) => { ctx.save(); ctx.rotate(-0.5); box(ctx, -15, -4, 16, 8, '#c99b3b', 2); box(ctx, 1, -5.5, 14, 11, '#3f6fb5', 2); ctx.restore(); line(ctx, [[-3, 4], [-8, 14]], '#5a4632', 2); line(ctx, [[-1, 4], [5, 14]], '#5a4632', 2); SD.drawTwinkle(ctx, 13, -13, 3.2, '#ffd43b', 1); },
    guitar: (ctx) => { ctx.save(); ctx.rotate(-0.7); ctx.fillStyle = RED; ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(-6, 4, 9, 7.5, 0, 0, TAU); ctx.fill(); ctx.stroke(); box(ctx, 1, 2, 18, 4, '#e9d9bd', 1, 1.4); box(ctx, 18, 0.5, 6, 7, '#3a3f4d', 1, 1.4); ctx.restore(); },
    fish: (ctx) => { ctx.fillStyle = '#7fb6e6'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(-2, 0, 12, 7, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(17, -7); ctx.lineTo(17, 7); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-8, -2, 1.4, 0, TAU); ctx.fill(); },
    cake: (ctx) => { box(ctx, -14, 0, 28, 10, '#f3d6a0', 2); box(ctx, -11, -9, 22, 9, '#ff8fab', 2); box(ctx, -7, -16, 14, 7, '#f3d6a0', 2); ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(0, -19, 3, 0, TAU); ctx.fill(); ctx.stroke(); },
    teddy: (ctx) => { ctx.fillStyle = '#b07a4a'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8; for (const [x, y, r] of [[-7, -11, 4], [7, -11, 4], [0, -6, 8], [0, 7, 9]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke(); } ctx.fillStyle = '#e9cba3'; ctx.beginPath(); ctx.arc(0, -4, 3.6, 0, TAU); ctx.fill(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-3, -8, 1, 0, TAU); ctx.arc(3, -8, 1, 0, TAU); ctx.fill(); },
    chair: (ctx) => { box(ctx, -9, -14, 6, 26, '#8f2f3a', 2); box(ctx, -9, 0, 20, 6, '#a63a45', 2); line(ctx, [[9, 6], [9, 13]], WOOD_D, 2.4); SD.drawTwinkle(ctx, 12, -11, 3, '#ffd43b', 1); },
    tick: (ctx) => { line(ctx, [[-10, 0], [-3, 8], [11, -9]], '#2f9e5f', 5); },
    hoho: (ctx) => { ctx.fillStyle = RED; ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Ho ho', 0, -4); ctx.fillText('ho!', 0, 10); },
  };
  function* sceneGrotto(S) {
    const w = S.w, r = S.r, cx = S.cx, run = (g) => S.run(g);
    const q = r.sign(); // the queue forms on this side; people leave by the other
    const M = S.marks({ wall: [0, 2, true], tree: [-q * 200, 6, true], gifts: [-q * 146, 7, true], chair: [0, 11, true], santa: [-q * 10, 12], knee: [q * 46, 14], elf: [-q * 100, 20],
      q0: [q * 160, 24], q1: [q * 236, 27], q2: [q * 312, 24], q3: [q * 388, 27], q4: [q * 464, 24] }, { scene: 'grotto' });
    const cap = S.spawn({ kind: 'captain' }), pip = S.spawn({ kind: 'pip' }), holly = S.spawn({ kind: 'holly' }), specs = S.spawn({ kind: 'specs' }), rocco = S.spawn({ kind: 'rocco' }), chubby = S.spawn({ kind: 'chubby' }), c1 = S.spawn({ kind: 'crew' });
    const all = [cap, pip, holly, specs, rocco, chubby, c1];
    all.forEach((p) => { p.hidden = true; p.x = S.offL - 200; });
    // ---- 1. the grotto goes up ----
    const wall = S.add(new Draw(w, S.side(q) + q * 300, M.wall.lane, drawGrotto, { hw: 275, h: 265, on: 0 }));
    yield* carryIn(S, wall, [rocco, c1], M.wall.x, { half: 262, sp: 115, lane: 3 });
    const tr = S.add(new Draw(w, S.side(-q) - q * 60, M.tree.lane, (ctx, d) => tree(ctx, 130, d.t, d.lit), { hw: 48, h: 130, lit: 0 }));
    const gifts = S.add(new Draw(w, M.gifts.x, M.gifts.lane, (ctx) => { present(ctx, 44, 36, GREEN); ctx.save(); ctx.translate(-34, 0); present(ctx, 30, 26, '#3f8fd8', '#ffffff'); ctx.translate(60, 0); present(ctx, 26, 44, RED); ctx.restore(); }, { hw: 60, h: 46, show: 0 }));
    run((function* () { yield* S.route(rocco, S.side(q), 30, 85); rocco.hidden = true; })());
    run((function* () { yield* S.route(c1, S.side(q), 34, 85); c1.hidden = true; })());
    yield* carryIn(S, tr, [holly], M.tree.x, { half: 44, lane: M.tree.lane + 2 });
    yield* S.tween(0.5, (u) => { gifts.show = u; });
    const chair = S.add(new Draw(w, S.side(-q) - q * 60, M.chair.lane, drawChair, { hw: 58, h: 112, tip: 0, squash: 0, solid: true }));
    run((function* () { yield* S.route(holly, S.side(-q), 32, 85); holly.hidden = true; })());
    yield* carryIn(S, chair, [chubby], M.chair.x, { half: 64, action: 'push', lift: 0, lane: M.chair.lane + 2 });
    chubby.tic = { n: 'pat', t: 0, d: 1 };
    yield* S.route(chubby, S.side(-q), 34, 85); chubby.hidden = true;
    yield* S.tween(1, (u) => { wall.on = u; tr.lit = u; });
    w.sparkle(cx, wall.y - 230, 4, '#ffe9a3', 7);
    // ---- 2. Santa and his elf ----
    dress(cap, santa, cape); dress(pip, elfHat());
    offstage(S, cap, -q, 15); offstage(S, pip, -q, M.elf.lane); pip.x -= q * 70;
    cap.item = overhead((ctx) => { ctx.translate(-16, 96); ctx.fillStyle = '#9a6b45'; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -40); ctx.quadraticCurveTo(-34, -6, -14, 6); ctx.quadraticCurveTo(10, 10, 14, -10); ctx.quadraticCurveTo(8, -34, -2, -42); ctx.closePath(); ctx.fill(); ctx.stroke(); });
    run(S.to(pip, M.elf, 70));
    yield* S.go(cap, M.santa.x - q * 4, 15, 62);
    cap.item = null; cap.face(q);
    const sack = S.add(new Draw(w, cx - q * 62, 13, (ctx) => { ctx.fillStyle = '#9a6b45'; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, -46); ctx.quadraticCurveTo(-34, -10, -22, 0); ctx.lineTo(22, 0); ctx.quadraticCurveTo(34, -12, 8, -46); ctx.closePath(); ctx.fill(); ctx.stroke(); line(ctx, [[-9, -44], [9, -44]], GOLD, 3); present(ctx, 16, 12, GREEN); }, { hw: 30, h: 50, show: 0 }));
    yield* S.tween(0.4, (u) => { sack.show = u; });
    const seat = () => ({ x: chair.x - q * 12, y: chair.y - 30 + chair.squash * 8 + chair.tip * 5 });
    cap.lane = cap.laneT = M.santa.lane; cap.attach = seat; cap.loco = 'sit';
    cap.say(WISH.hoho, 2); cap.action = 'wave'; yield 1.8; cap.action = 'none';
    pip.face(q); pip.item = hold((ctx) => { box(ctx, -8, -20, 16, 22, CREAM, 2); ctx.strokeStyle = 'rgba(60,70,90,0.7)'; ctx.lineWidth = 1; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-5, -15 + k * 5); ctx.lineTo(5, -15 + k * 5); ctx.stroke(); } }, 10, 6);
    // ---- 3. the queue ----
    const line1 = [[holly, 'skates'], [specs, 'telescope'], [rocco, 'guitar'], [c1, 'fish'], [chubby, 'cake']];
    line1.forEach(([p], i) => { offstage(S, p, q, M['q' + i].lane); p.x += q * i * 66; });
    yield line1.map(([p], i) => run((function* () { yield* S.to(p, M['q' + i], 75); p.face(-q); })()));
    const kneeAt = () => ({ x: chair.x + q * 40, y: chair.y - 24 + chair.squash * 8 });
    for (let i = 0; i < line1.length; i++) {
      const [p, wish] = line1[i], heavy = p === chubby;
      yield* S.go(p, M.knee.x + q * 34, M.knee.lane, heavy ? 95 : 60);
      p.face(-q);
      if (heavy) { p.anticip = 1; yield 0.35; p.anticip = 0; }
      yield* S.hop(p, () => { const k = kneeAt(); return [k.x, k.y]; }, heavy ? 0.75 : 0.5, heavy ? 80 : 34, true);
      p.loco = 'sit';
      if (heavy) {
        // the whole chair goes down
        yield* S.tween(0.18, (u) => { chair.squash = u; chair.tip = u; });
        w.puff(chair.x, chair.y, 8, 11, 1.2, 0.5); for (let k = 0; k < 5; k++) w.sparkle(chair.x + r.range(-50, 50), chair.y - r.range(40, 120), 1, '#ffd43b', 6);
        cap.action = 'flail'; cap.eyeOverride = 'wide'; cap.say('!', 1.4); cap.dizzy = 2.5;
        pip.action = 'startle'; pip.jump(-150, 0);
        
        yield* S.tween(0.5, (u) => { chair.squash = 1 - 0.3 * SD.backOut(u); });
        yield 1.2; pip.action = 'none'; cap.action = 'none'; cap.eyeOverride = null;
      }
      yield 0.3;
      p.say(WISH[wish], 2.4); p.action = heavy ? 'armsOut' : 'point';
      yield 1.3; pip.action = 'tap';
      yield 1.2;
      p.action = 'none';
      if (heavy) { cap.say(WISH.chair, 2.2); yield 2.2; } else { cap.say(WISH.tick, 1.2); cap.action = 'point'; yield 1.1; cap.action = 'none'; }
      pip.action = 'none';
      // down, and off along the front with a spring in the step
      p.loco = 'stand';
      const land = [chair.x - q * 70, S.ground(chair.x - q * 70) + 30];
      yield* S.hop(p, () => land, 0.45, 26, false);
      p.lane = p.laneT = 30; p.y = p.groundY();
      if (heavy) yield* S.tween(0.6, (u) => { chair.squash = 0.7 * (1 - u); chair.tip = 1 - u; });
      p.say('heart', 1);
      run((function* () { yield* S.go(p, S.side(-q), 32 + (i % 2) * 3, 80); p.hidden = true; })());
      line1[i][0] = null;
      const rest = line1.slice(i + 1);
      yield rest.map(([o], j) => run((function* () { yield j * 0.2; yield* S.to(o, M['q' + j], 55); o.face(-q); })()));
    }
    // ---- 4. and the elf gets his turn ----
    yield 0.5;
    pip.item = null; pip.face(q); pip.action = 'point'; pip.say(WISH.teddy, 2.2); yield 2.2;
    pip.action = 'none'; cap.action = 'reach'; cap.reachTo = [sack.x, sack.y - 30]; yield 0.7; cap.action = 'offer'; cap.reachTo = null;
    pip.item = hold((ctx) => { ctx.translate(0, 8); WISH.teddy(ctx); }, 10, 0); pip.action = 'carryFront'; pip.jump(-170, 0); pip.say('heart', 1.4);
    for (let k = 0; k < 4; k++) w.confetti(cx + r.range(-120, 120), wall.y - 180, 3, 70);
    yield 2; cap.action = 'wave'; cap.say(WISH.hoho, 2); yield 2.2;
    // ---- 5. closing time ----
    cap.attach = null; cap.loco = 'stand'; cap.action = 'none'; cap.lane = cap.laneT = 15; cap.x = chair.x - q * 66; cap.y = cap.groundY();
    yield [run((function* () { yield* S.go(pip, S.side(-q), 22, 75); pip.dead = true; })()), run((function* () { yield 0.5; yield* S.go(cap, S.side(-q), 16, 60); cap.dead = true; })())];
    all.forEach((p) => { p.dead = true; });
  }

  // =====================================================================
  // THE COUNTDOWN — two giant candy canes, a board hoisted between them, and the number of days
  // left until Christmas, put up one big card at a time (not always the right way up).
  // =====================================================================
  // depth plan: canes and board 5 · ladder 7 · card-passers 14–20 · rope crew 22–26 at the sides ·
  // onlookers 30+
  function daysToChristmas() {
    const now = new Date(), y = now.getFullYear();
    let x = new Date(y, 11, 25); const today = new Date(y, now.getMonth(), now.getDate());
    if (today > x) x = new Date(y + 1, 11, 25);
    return Math.round((x - today) / 864e5);
  }
  function drawBoard(ctx, b) {
    const H = 250, t = b.t;
    // candy canes: posts that curl inward at the top
    for (const s of [-1, 1]) {
      if (b.cane[s < 0 ? 0 : 1] <= 0.01) continue;
      ctx.save(); ctx.translate(s * 190, 0); ctx.rotate(s * (1 - SD.easeOut(b.cane[s < 0 ? 0 : 1])) * 1.45);
      const p = new Path2D(); p.moveTo(0, 0); p.lineTo(0, -H); p.arc(-s * 26, -H, 26, s > 0 ? 0 : PI, s > 0 ? PI : 0, s > 0); p.lineTo(-s * 52, -H + 14);
      candyStripes(ctx, p, 15); ctx.restore();
    }
    if (b.up <= 0.01) return;
    // the board, hanging from the crooks
    const by = lerp(-40, -206, SD.easeInOut(b.up));
    for (const s of [-1, 1]) line(ctx, [[s * 138, -H + 14], [s * 130, by]], '#d8c9a3', 2, false);
    box(ctx, -150, by, 300, 150, '#1f3d2b', 10, 3);
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2.4; ctx.beginPath(); SD.rrect(ctx, -142, by + 8, 284, 134, 7); ctx.stroke();
    // slots and cards
    const n = b.digits.length, cw = 78, gap = 12, x0 = -(n * cw + (n - 1) * gap) / 2;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (cw + gap) + cw / 2, y = by + 58;
      box(ctx, x - cw / 2, y - 44, cw, 88, '#16301f', 6, 1.6);
      const c = b.cards[i];
      if (c && c.show > 0.01) { ctx.save(); ctx.translate(x, y); ctx.rotate(c.rot); ctx.scale(SD.backOut(Math.min(1, c.show)), SD.backOut(Math.min(1, c.show))); digitCard(ctx, c.d); ctx.restore(); }
    }
    // the caption strip
    ctx.fillStyle = CREAM; ctx.font = 'bold 17px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b.days === 0 ? "IT'S CHRISTMAS!" : b.days === 1 ? 'SLEEP TO GO' : 'SLEEPS TO GO', 0, by + 126);
    ctx.save(); ctx.translate(-118, by + 138); tree(ctx, 26, t, b.on, 0); ctx.restore(); ctx.save(); ctx.translate(118, by + 138); tree(ctx, 26, t, b.on, 0); ctx.restore();
    lights(ctx, -150, by - 2, 150, by - 2, 16, t, b.on, 5); lights(ctx, -150, by + 152, 150, by + 152, 16, t + 1, b.on, 4);
  }
  function slotOf(b, i) {
    const n = b.digits.length, cw = 78, gap = 12, x0 = -(n * cw + (n - 1) * gap) / 2, by = lerp(-40, -206, SD.easeInOut(b.up));
    return [b.x + x0 + i * (cw + gap) + cw / 2, b.y + by + 58];
  }
  function digitCard(ctx, d) {
    box(ctx, -34, -40, 68, 80, CREAM, 6);
    ctx.fillStyle = RED; ctx.font = 'bold 66px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(d), 0, 3);
    ctx.fillStyle = 'rgba(21,27,43,0.25)'; ctx.fillRect(-34, -1, 68, 2);
  }
  function* sceneCountdown(S) {
    const w = S.w, r = S.r, cx = S.cx, run = (g) => S.run(g);
    const days = daysToChristmas(), digits = String(days).split('').map(Number);
    const M = S.marks({ board: [0, 5, true], ladder: [118, 7, true], pass: [150, 16], pile: [300, 20], ropeL: [-250, 23], ropeR: [250, 25], check: [-330, 30], plug: [-216, 12], w1: [-410, 24], w2: [380, 30], w3: [452, 25] }, { scene: 'countdown' });
    const cap = S.spawn({ kind: 'captain' }), specs = S.spawn({ kind: 'specs' }), rocco = S.spawn({ kind: 'rocco' }), chubby = S.spawn({ kind: 'chubby' }), holly = S.spawn({ kind: 'holly' }), pip = S.spawn({ kind: 'pip' }), c1 = S.spawn({ kind: 'crew' });
    const all = [cap, specs, rocco, chubby, holly, pip, c1];
    all.forEach((p) => { p.hidden = true; p.x = S.offL - 200; });
    const bd = S.add(new Draw(w, cx, M.board.lane, drawBoard, { hw: 250, h: 290, cane: [0, 0], up: 0, on: 0, days, digits, cards: digits.map(() => null), slot: [] }));
    // ---- 1. the canes: carried on lying down, then walked upright ----
    const caneItem = overhead((ctx) => { const p = new Path2D(); p.moveTo(-70, 0); p.lineTo(60, 0); p.arc(60, 16, 16, -PI / 2, PI / 2); candyStripes(ctx, p, 10); }, -124);
    const raise = (k, a, b, s) => run((function* () {
      for (const [p, off] of [[a, -40], [b, 40]]) { offstage(S, p, s, 8 + (off > 0 ? 3 : 0)); p.x += s * (60 + off); p.item = off < 0 ? caneItem : null; p.action = 'carryUp'; }
      yield [run(S.go(a, cx + s * 190 + s * 40, 8, 90)), run(S.go(b, cx + s * 190 + s * 110, 11, 90))];
      a.item = null; a.face(-s); b.face(-s); a.action = 'push'; b.action = 'pull';
      yield* S.tween(1.6, (u) => { bd.cane[k] = Math.max(0.02, u); });
      w.puff(cx + s * 190, bd.y, 5, 9, 0.8, 0.5); a.action = b.action = 'none';
    })());
    yield [raise(0, rocco, c1, -1), raise(1, chubby, holly, 1)];
    // ---- 2. the board is hauled up ----
    bd.up = 0.02;
    yield [run(S.to(rocco, M.ropeL, 70, 23)), run(S.to(chubby, M.ropeR, 70, 25)), run(S.to(c1, M.w1, 70, 24)), run(S.to(holly, M.w2, 70, 30))];
    rocco.face(1); chubby.face(-1); rocco.action = chubby.action = 'pull';
    yield* S.tween(3, (u) => { bd.up = Math.max(0.02, u); if (((u * 9) | 0) !== (((u - 0.01) * 9) | 0)) { rocco.pomY && rocco.pomY.kick(30); } });
    rocco.action = chubby.action = 'none'; w.sparkle(cx, bd.y - 206, 4, '#ffe9a3', 7);
    run(S.to(chubby, M.w3, 60));
    // ---- 3. how many days? Specs has it on his calendar ----
    offstage(S, specs, -1, M.check.lane); offstage(S, cap, -1, 34); cap.x -= 70;
    specs.item = hold((ctx) => { box(ctx, -11, -20, 22, 22, CREAM, 2); ctx.fillStyle = RED; ctx.fillRect(-11, -20, 22, 6); ctx.fillStyle = INK; ctx.font = 'bold 12px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(days), 0, -6); }, 10, 6); specs.action = 'carryFront';
    run(S.go(cap, M.check.x - 66, 34, 70)); yield* S.to(specs, M.check, 70);
    specs.face(1); specs.action = 'inspect'; yield 1; specs.say(String(days), 1.6); specs.action = 'point'; yield 1.6; specs.action = 'carryFront';
    // ---- 4. the cards go up the ladder, one at a time ----
    const gy = S.ground(M.ladder.x);
    const L = S.add(new SD.Ladder(w, M.ladder.x + 40, gy + M.ladder.lane, M.ladder.x - 6, gy - 150, M.ladder.lane)); L.show = 0;
    offstage(S, pip, 1, 9); pip.item = SD.items.ladder ? SD.items.ladder() : null; pip.action = pip.item ? 'carryLadder' : 'none';
    yield* S.go(pip, M.ladder.x + 70, 9, 85); pip.item = null; pip.action = 'plant';
    yield* S.tween(0.7, (u) => { L.show = SD.backOut(u); }); pip.action = 'none';
    yield* S.climb(pip, [L], S.chainDistForHeight([L], 96), 60);
    const pile = S.add(new Draw(w, M.pile.x + 30, M.pile.lane - 2, (ctx, d) => { for (let k = 0; k < d.n; k++) { ctx.save(); ctx.translate(k * 5 - 6, -40 - k * 3); ctx.rotate(0.05 * k - 0.05); ctx.scale(0.62, 0.62); digitCard(ctx, digits[digits.length - 1 - k]); ctx.restore(); } }, { hw: 34, h: 70, n: digits.length, show: 0 }));
    yield* S.tween(0.4, (u) => { pile.show = u; });
    offstage(S, c1, 1, M.pass.lane); c1.dead = false;
    const passer = holly; // she hands them up; the crew-mate fetches from the pile
    yield* S.to(passer, M.pass, 70, 20); passer.face(-1);
    const order = digits.map((_, i) => i);
    const cardItem = (d) => overhead((ctx) => { ctx.scale(0.62, 0.62); digitCard(ctx, d); }, -132);
    for (const i of order) {
      const d = digits[i], upside = i === 0 && days !== 0;
      yield* S.go(c1, M.pile.x - 18, M.pile.lane, 80); c1.face(1); c1.action = 'reach'; yield 0.3; pile.n--; c1.item = cardItem(d); c1.action = 'carryUp';
      yield* S.go(c1, M.pass.x + 52, M.pass.lane + 1, 80); c1.face(-1); c1.item = null; c1.action = 'pass'; passer.item = cardItem(d); passer.action = 'carryUp'; yield 0.35; c1.action = 'none';
      passer.item = null; passer.action = 'throw';
      const card = { d, show: 0, rot: upside ? PI : 0 };
      let done = false;
      S.fling((ctx) => { ctx.scale(0.62, 0.62); digitCard(ctx, d); }, () => [passer.x - 6, passer.y - 120], () => { const [x, y] = pip.headTop(); return [x - 10, y - 16]; }, 0.55, 40, () => { done = true; });
      yield* S.until(() => done, 2); passer.action = 'none';
      pip.action = 'reach'; pip.reachTo = slotOf(bd, i);
      bd.cards[i] = card; yield* S.tween(0.35, (u) => { card.show = u; });
      pip.action = 'none'; pip.reachTo = null; w.sparkle(slotOf(bd, i)[0], slotOf(bd, i)[1], 2, '#ffe9a3', 6);
      if (upside) {
        yield 0.7; specs.say('?', 1.2); specs.action = 'point'; cap.action = 'shrug'; yield 1.2;
        pip.action = 'reach'; pip.reachTo = slotOf(bd, i); yield* S.tween(0.6, (u) => { card.rot = PI * (1 - SD.easeInOut(u)); }); pip.action = 'none'; pip.reachTo = null;
        specs.action = 'carryFront'; cap.action = 'none'; pip.say('heart', 0.9); yield 0.5;
      }
      yield 0.3;
    }
    pile.dead = true;
    run(S.to(c1, M.w2, 60, 36));
    yield* S.offLadder(pip, [L], 10);
    // ---- 5. the lights ----
    yield* S.to(rocco, M.plug, 70, 16); rocco.face(1); rocco.action = 'reach'; rocco.reachTo = [cx - 190, bd.y - 20]; yield 0.6;
    for (let k = 0; k < 3; k++) { w.sparkle(cx - 192, bd.y - 24, 2, '#fff7c2', 6); bd.on = k % 2 ? 0 : 0.5; yield 0.22; }
    yield* S.tween(0.8, (u) => { bd.on = u; }); rocco.action = 'none'; rocco.reachTo = null; rocco.tic = { n: 'cool', t: 0, d: 1.6 };
    for (let k = 0; k < 5; k++) w.confetti(cx + r.range(-200, 200), bd.y - 260, 3, 80);
    S.finale(); all.forEach((p) => { if (!p.hidden && !p.attach) { p.face(Math.sign(cx - p.x) || 1); p.action = 'cheer'; } });
    specs.item = null;
    yield 3.2;
    yield* S.exitAll(all.filter((p) => !p.hidden), 70, true, 26);
  }

  Object.assign(SD.SCENES, {
    trebuchet: { name: 'The Trebuchet', fn: sceneTrebuchet, crew: 8 },
    card: { name: 'The Christmas Card', fn: sceneCard, crew: 9 },
    grotto: { name: "Santa's Grotto", fn: sceneGrotto, crew: 7 },
    countdown: { name: 'The Countdown', fn: sceneCountdown, crew: 7 },
  });
})();
