// Snow Day — scenes 8: Santa's Workshop, Christmas Biscuits, Carols round the Tree, and
// Decorating the Town. Built with the set kit from scenes 7 (SD.set).
'use strict';
(function () {
  const { clamp, lerp, TAU } = SD;
  const PI = Math.PI;
  const { Draw, carryIn, hold, overhead, dress, offstage, blob, box, line, lights, candyStripes, tree, present, elfHat, INK, RED, GREEN, GOLD, WOOD, WOOD_D, CREAM } = SD.set;
  const BLUE = '#3f8fd8';

  // =====================================================================
  // SANTA'S WORKSHOP — a bench with a moving belt: wooden blocks go in one end and come out the
  // other made, painted and wrapped, into the sack. Until somebody leans on the speed lever.
  // =====================================================================
  // depth plan: wall 2 · makers behind the bench 9 · bench 16 · sack 15 · lever 13 at the bench's
  // head · inspector, tester and anyone watching 26–32 · the wind-up toy's track 38
  function toy(ctx, kind, stage, t) {
    if (stage === 0) { box(ctx, -9, -14, 18, 14, '#d9b07a', 2); return; }
    if (stage === 3) { present(ctx, 22, 18, [RED, GREEN, BLUE, '#8b5cf6'][kind % 4], kind % 2 ? '#ffffff' : GOLD); return; }
    const c = stage === 2 ? [RED, BLUE, GOLD, GREEN][kind % 4] : '#d9b07a', c2 = stage === 2 ? [GOLD, '#ffffff', RED, '#ffffff'][kind % 4] : '#c79a63';
    const k = kind % 4;
    if (k === 0) { // engine
      box(ctx, -12, -12, 16, 10, c, 2); box(ctx, 4, -18, 9, 16, c, 2); box(ctx, -9, -17, 5, 6, c2, 1, 1.4);
      for (const x of [-7, 7]) { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, -2, 3.6, 0, TAU); ctx.fill(); ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(x, -2, 1.4, 0, TAU); ctx.fill(); }
    } else if (k === 1) { // duck on wheels
      ctx.fillStyle = c; ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(-2, -9, 10, 6.5, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(8, -16, 5, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f2952f'; ctx.beginPath(); ctx.moveTo(12, -16); ctx.lineTo(17, -14.5); ctx.lineTo(12, -13); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (const x of [-7, 5]) { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, -2, 3, 0, TAU); ctx.fill(); }
    } else if (k === 2) { // drum
      box(ctx, -10, -14, 20, 14, c, 3); ctx.strokeStyle = c2; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-10, -11); ctx.lineTo(-4, -3); ctx.lineTo(2, -11); ctx.lineTo(8, -3); ctx.stroke(); line(ctx, [[-4, -16], [-10, -22]], WOOD, 2, false); line(ctx, [[4, -16], [10, -22]], WOOD, 2, false);
    } else { // robot
      box(ctx, -8, -12, 16, 12, c, 2); box(ctx, -6, -21, 12, 9, c, 2); ctx.fillStyle = c2; ctx.fillRect(-4, -18, 3, 3); ctx.fillRect(1, -18, 3, 3); line(ctx, [[0, -21], [0, -25]], INK, 1.2, false); ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(0, -26, 1.8, 0, TAU); ctx.fill();
    }
  }
  function drawWorkshop(ctx, g) {
    const t = g.t;
    box(ctx, -330, -230, 660, 230, '#8a5a3a', 6);
    ctx.strokeStyle = 'rgba(50,25,10,0.35)'; ctx.lineWidth = 1.4; for (let y = -200; y < 0; y += 34) { ctx.beginPath(); ctx.moveTo(-328, y); ctx.lineTo(328, y); ctx.stroke(); }
    // shelves of finished toys
    for (const [sx, sy] of [[-250, -150], [-250, -90], [150, -150]]) { box(ctx, sx, sy, 150, 7, WOOD_D, 2); for (let k = 0; k < 4; k++) { ctx.save(); ctx.translate(sx + 22 + k * 36, sy); toy(ctx, k + (sy > -100 ? 2 : 0), k === 1 ? 3 : 2, t); ctx.restore(); } }
    // round window
    ctx.fillStyle = '#27375f'; ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, -150, 42, 0, TAU); ctx.fill(); ctx.stroke(); ctx.save(); ctx.beginPath(); ctx.arc(0, -150, 40, 0, TAU); ctx.clip(); ctx.fillStyle = '#ffffff'; for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(-36 + (k * 23) % 72, -190 + ((k * 31 + t * 16) % 80), 1.8, 0, TAU); ctx.fill(); } ctx.restore();
    line(ctx, [[-42, -150], [42, -150]], '#e9d9bd', 3, false); line(ctx, [[0, -192], [0, -108]], '#e9d9bd', 3, false);
    // clock, tools
    ctx.fillStyle = CREAM; ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(232, -70, 22, 0, TAU); ctx.fill(); ctx.stroke(); line(ctx, [[232, -70], [232 + Math.sin(t * 0.5) * 15, -70 - Math.cos(t * 0.5) * 15]], INK, 2, false); line(ctx, [[232, -70], [240, -64]], INK, 2.4, false);
    line(ctx, [[150, -60], [150, -30]], WOOD, 4); box(ctx, 142, -66, 16, 9, '#8c95a5', 2); line(ctx, [[180, -62], [180, -32]], '#8c95a5', 3);
    // roof, snow, lights
    ctx.fillStyle = '#5a3a2a'; ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-352, -224); ctx.lineTo(0, -290); ctx.lineTo(352, -224); ctx.lineTo(340, -212); ctx.lineTo(-340, -212); ctx.closePath(); ctx.fill(); ctx.stroke();
    const snow = []; for (let k = 0; k <= 26; k++) { const u = k / 26; snow.push([lerp(-346, 346, u), -226 - (1 - Math.abs(u - 0.5) * 2) * 64, 11 + (k % 3) * 2]); } blob(ctx, snow, '#ffffff');
    lights(ctx, -326, -214, 0, -210, 14, t, g.on, 16); lights(ctx, 0, -210, 326, -214, 14, t + 2, g.on, 16);
  }
  const ST = [-225, -75, 75]; // stations along the bench: make, paint, wrap
  function drawBench(ctx, b) {
    const L = 330, H = 34;
    for (const x of [-L + 24, -110, 110, L - 24]) box(ctx, x - 5, -H + 6, 10, H - 6, WOOD_D, 2);
    box(ctx, -L, -H, L * 2, 9, WOOD, 3);
    // the belt
    box(ctx, -L + 8, -H - 7, L * 2 - 16, 8, '#3a3f4d', 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1.4; for (let x = -L + 14 + (b.belt % 22); x < L - 12; x += 22) { ctx.beginPath(); ctx.moveTo(x, -H - 6); ctx.lineTo(x - 4, -H); ctx.stroke(); }
    for (const x of [-L + 12, L - 12]) { ctx.fillStyle = '#8c95a5'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, -H - 3, 6, 0, TAU); ctx.fill(); ctx.stroke(); }
    // station gear: a vice, paint pots, ribbon
    box(ctx, ST[0] - 40, -H - 20, 12, 13, '#8c95a5', 2); for (const [k, c] of [[0, RED], [1, BLUE], [2, GOLD]]) box(ctx, ST[1] - 48 + k * 11, -H - 16, 9, 9, c, 2, 1.4); ctx.fillStyle = RED; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(ST[2] - 42, -H - 13, 6.5, 0, TAU); ctx.fill(); ctx.stroke();
    for (const ty of b.toys) { ctx.save(); ctx.translate(ty.x, -H - 7 + (ty.fall || 0)); ctx.rotate(ty.rot || 0); toy(ctx, ty.kind, ty.stage, b.t); ctx.restore(); }
    // the speed lever at the head of the bench
    ctx.save(); ctx.translate(-L - 16, -8); box(ctx, -9, -8, 18, 16, '#3a3f4d', 3); ctx.rotate(-0.6 + b.speed / 110 * 1.2); line(ctx, [[0, 0], [0, -34]], '#8c95a5', 4); ctx.fillStyle = RED; ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(0, -36, 6, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  function drawSack(ctx, s) {
    const f = Math.min(1, s.fill / 8), wd = 34 + f * 16, h = 46 + f * 26;
    ctx.fillStyle = '#9a6b45'; ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-wd * 0.55, -h); ctx.quadraticCurveTo(-wd - 8, -h * 0.4, -wd * 0.8, 0); ctx.lineTo(wd * 0.8, 0); ctx.quadraticCurveTo(wd + 8, -h * 0.4, wd * 0.55, -h); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (s.tied > 0.5) { line(ctx, [[-wd * 0.5, -h + 2], [wd * 0.5, -h + 2]], GOLD, 4); blob(ctx, [[0, -h - 8, 9]], '#9a6b45', INK, 2.2); }
    else for (let k = 0; k < Math.min(5, s.fill); k++) { ctx.save(); ctx.translate(-wd * 0.4 + k * wd * 0.2, -h + 3 - (k % 2) * 5); ctx.rotate((k - 2) * 0.2); present(ctx, 16, 13, [RED, GREEN, BLUE, '#8b5cf6'][k % 4]); ctx.restore(); }
    ctx.strokeStyle = 'rgba(60,35,18,0.4)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-wd * 0.3, -h * 0.7); ctx.quadraticCurveTo(-wd * 0.5, -h * 0.3, -wd * 0.3, -6); ctx.stroke();
    for (const o of s.spill) { ctx.save(); ctx.translate(o[0], o[1]); ctx.rotate(o[2]); present(ctx, 18, 14, [RED, GREEN, BLUE][o[3] % 3]); ctx.restore(); }
  }
  function* sceneWorkshop(S) {
    const w = S.w, r = S.r, cx = S.cx, run = (g) => S.run(g);
    const M = S.marks({ wall: [0, 2, true], bench: [0, 16, true], make: [ST[0] + 6, 9], paint: [ST[1] + 6, 9], wrap: [ST[2] + 6, 9], lever: [-392, 14], sack: [392, 15],
      check: [318, 27], test: [-150, 31], boss: [-470, 27], toyL: [-520, 38, true], toyR: [520, 38, true] }, { scene: 'workshop' });
    const cap = S.spawn({ kind: 'captain' }), specs = S.spawn({ kind: 'specs' }), rocco = S.spawn({ kind: 'rocco' }), chubby = S.spawn({ kind: 'chubby' }), holly = S.spawn({ kind: 'holly' }), pip = S.spawn({ kind: 'pip' }), c1 = S.spawn({ kind: 'crew' }), c2 = S.spawn({ kind: 'crew' });
    const all = [cap, specs, rocco, chubby, holly, pip, c1, c2];
    all.forEach((p) => { p.hidden = true; p.x = S.offL - 200; });
    [c1, c2, holly, pip].forEach((p, i) => dress(p, elfHat([GREEN, RED, GREEN, RED][i])));
    // ---- 1. the workshop goes up ----
    const side = r.sign();
    const wall = S.add(new Draw(w, S.side(side) + side * 360, M.wall.lane, drawWorkshop, { hw: 355, h: 292, on: 0 }));
    yield* carryIn(S, wall, [c1, c2], M.wall.x, { half: 340, sp: 125, lane: 3 });
    const bench = S.add(new Draw(w, S.side(-side) - side * 360, M.bench.lane, drawBench, { hw: 350, h: 42, solid: true, toys: [], belt: 0, speed: 0 }));
    run(S.to(c1, M.make, 70)); run(S.to(c2, M.paint, 70));
    yield* carryIn(S, bench, [rocco, chubby], M.bench.x, { half: 356, sp: 125, lane: 17 });
    const sack = S.add(new Draw(w, M.sack.x, M.sack.lane, drawSack, { hw: 50, h: 76, fill: 0, tied: 0, spill: [], show: 0, solid: true }));
    yield* S.tween(0.5, (u) => { sack.show = u; wall.on = u; });
    offstage(S, holly, side, 9); offstage(S, specs, 1, M.check.lane); offstage(S, cap, -1, M.boss.lane); offstage(S, pip, -1, 38);
    run(S.to(rocco, { x: cx - side * 560, lane: 30 }, 80, 30)); // out of the way for now
    run(S.to(chubby, M.test, 70, 31));
    yield [run(S.to(holly, M.wrap, 80)), run(S.to(specs, M.check, 70)), run(S.to(cap, M.boss, 70))];
    [c1, c2, holly].forEach((p) => p.face(1)); specs.face(-1);
    specs.item = hold((ctx) => { box(ctx, -8, -20, 16, 22, CREAM, 2); line(ctx, [[-4, -10], [-1, -6], [5, -15]], '#2f9e5f', 2, false); }, 10, 6); specs.action = 'carryFront';
    // ---- 2. the belt: runs for the rest of the scene, toys stepping along and changing at each station ----
    let on = true, made = 0, nextIn = 0.5, skip = false;
    const workers = [c1, c2, holly], acts = ['tap', 'pipe', 'work'], busy = [0, 0, 0];
    run((function* () {
      while (on) {
        const dt = S.dt, v = bench.speed;
        bench.belt += v * dt; nextIn -= dt * v / 30;
        if (v > 1 && nextIn <= 0) { bench.toys.push({ x: -318, kind: made++, stage: 0 }); nextIn = 2.3; }
        for (const ty of bench.toys) {
          const x0 = ty.x; if (!ty.fall) ty.x += v * dt;
          for (let k = 0; k < 3; k++) if (x0 < ST[k] && ty.x >= ST[k]) {
            if (skip && S.r() < 0.55) continue; // too fast to keep up
            ty.stage = Math.max(ty.stage, k + 1); busy[k] = 0.5; w.sparkle(bench.x + ty.x, bench.y - 52, 1, ['#ffe9a3', '#ff8fab', '#ffffff'][k], 5);
          }
          if (ty.x > 322 && !ty.fall) { ty.fall = 0.01; }
          if (ty.fall) { ty.fall += 190 * dt; ty.x += 60 * dt; ty.rot = (ty.rot || 0) + 5 * dt; if (ty.fall > 30) { ty.gone = true; if (sack.fill < 8) sack.fill++; else sack.spill.push([S.r.range(-66, 70), -S.r.range(0, 6), S.r.range(-0.5, 0.5), sack.spill.length]); sack.pulse = 1; } }
        }
        bench.toys = bench.toys.filter((ty) => !ty.gone);
        workers.forEach((p, k) => { busy[k] -= dt; if (!p.attach && p.loco === 'stand' && p.action !== 'flail' && p.action !== 'pant') p.action = busy[k] > 0 ? acts[k] : 'none'; });
        yield 0;
      }
    })());
    cap.face(1); cap.action = 'point'; cap.say('!', 0.9); yield 0.9; cap.action = 'none';
    yield* S.to(cap, M.lever, 70, 14); cap.face(1); cap.action = 'pull';
    yield* S.tween(0.8, (u) => { bench.speed = 34 * u; }); cap.action = 'none';
    yield* S.to(cap, M.boss, 60, 27); cap.face(1);
    // ---- 3. while it runs: the tester, the inspector, and a wind-up toy that gets away ----
    run((function* () {
      yield 6;
      chubby.item = hold((ctx, p) => { box(ctx, -10, -14, 20, 16, BLUE, 2); if (p.jack > 0) { const h = 26 * SD.backOut(Math.min(1, p.jack)); ctx.strokeStyle = '#8c95a5'; ctx.lineWidth = 2; ctx.beginPath(); for (let k = 0; k <= 6; k++) ctx.lineTo((k % 2 ? 5 : -5), -14 - h * k / 6); ctx.stroke(); ctx.fillStyle = GOLD; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(0, -18 - h, 7, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(0, -17 - h, 2, 0, TAU); ctx.fill(); } }, 10, 4);
      chubby.jack = 0; chubby.action = 'inspect'; yield 1.6; chubby.action = 'tap'; yield 1.2;
      yield* S.tween(0.25, (u) => { chubby.jack = u; }); chubby.action = 'startle'; chubby.jump(-170, 0); chubby.say('!', 0.9); yield 1.3; chubby.action = 'carryFront'; chubby.say('heart', 1.2); yield 2;
    })());
    run((function* () {
      for (let k = 0; k < 5; k++) { yield 3.6; specs.action = 'inspect'; yield 1; specs.say(SD.set.tick, 0.9); specs.action = 'carryFront'; }
    })());
    // the wind-up penguin: marches along the front, Pip after it
    const wind = S.add(new Draw(w, M.toyL.x, 38, (ctx, d) => { const s = Math.sin(d.t * 14); ctx.scale(d.dir, 1); ctx.rotate(s * 0.12); ctx.fillStyle = '#1b2233'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(0, -11, 7, 10, 0, 0, TAU); ctx.fill(); ctx.fillStyle = CREAM; ctx.beginPath(); ctx.ellipse(2, -9, 4.2, 6.5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#f2952f'; ctx.fillRect(5, -15, 5, 2.4); ctx.fillRect(-4 + s * 2, -2, 6, 2.4); ctx.fillStyle = '#8c95a5'; ctx.save(); ctx.translate(-8, -12); ctx.rotate(d.t * 6); ctx.fillRect(-1, -6, 2, 12); ctx.fillRect(-4, -1, 8, 2); ctx.restore(); }, { hw: 12, h: 24, dir: 1 }));
    run((function* () {
      pip.x = M.toyL.x - 70; pip.action = 'reach';
      for (const [to, d] of [[M.toyR.x - 230, 1], [M.toyL.x + 330, -1], [S.side(1) + 60, 1]]) {
        wind.dir = d; pip.face(d); pip.goTo(to - d * 54, 48);
        const x0 = wind.x; yield* S.tween(Math.abs(to - x0) / 46, (u) => { wind.x = lerp(x0, to, u); pip.reachTo = [wind.x, wind.y - 14]; });
        yield 0.3;
      }
      wind.dead = true; pip.hidden = true; pip.reachTo = null;
    })());
    yield 22;
    // ---- 4. Rocco leans on the lever ----
    yield* S.to(rocco, { x: M.lever.x - 6, lane: 14 }, 80, 30); rocco.face(1); rocco.tic = { n: 'cool', t: 0, d: 1.2 }; yield 1.2;
    rocco.action = 'lean'; skip = true;
    yield* S.tween(1.2, (u) => { bench.speed = lerp(34, 110, SD.easeIn(u)); });
    workers.forEach((p) => { p.action = 'flail'; }); specs.action = 'startle'; specs.say('!', 1); cap.action = 'startle';
    for (let k = 0; k < 7; k++) { yield 0.9; w.puff(sack.x + r.range(-30, 30), sack.y - 70, 2, 6, 1, 0.8); if (k === 2) chubby.say('!', 1); }
    // the boss shuts it off
    cap.action = 'none'; cap.say('!', 1);
    yield* S.go(cap, M.lever.x - 62, 14, 120); rocco.action = 'shrug';
    run(S.to(rocco, { x: M.lever.x - 130, lane: 22 }, 70));
    yield* S.go(cap, M.lever.x - 2, 14, 80); cap.face(1); cap.action = 'pull';
    yield* S.tween(0.7, (u) => { bench.speed = 110 * (1 - u); }); skip = false; cap.action = 'none';
    workers.forEach((p) => { p.action = 'pant'; }); specs.action = 'shrug';
    yield 2.2;
    workers.forEach((p) => { p.action = 'none'; });
    // ---- 5. the sack is tied and goes off to the sleigh ----
    on = false; specs.item = null; chubby.item = null;
    yield* S.to(specs, { x: M.sack.x - 62, lane: 20 }, 60); specs.face(1); specs.action = 'reach'; specs.reachTo = [sack.x, sack.y - 60]; yield 0.8;
    sack.tied = 1; sack.spill = []; specs.action = 'none'; specs.reachTo = null; w.sparkle(sack.x, sack.y - 76, 3, '#ffe9a3', 6);
    S.finale(); [...workers, cap, rocco, chubby].forEach((p) => { p.face(Math.sign(sack.x - p.x) || 1); p.action = 'cheer'; });
    yield 2;
    sack.solid = false;
    yield* S.to(chubby, { x: M.sack.x + 60, lane: 21 }, 80, 31);
    [specs, chubby].forEach((p) => { p.action = 'none'; });
    yield* carryIn(S, sack, [specs, chubby], S.side(1) + 120, { half: 60, sp: 70, lane: 20 });
    specs.hidden = chubby.hidden = true; sack.dead = true;
    yield* S.exitAll(all.filter((p) => !p.hidden), 70, true, 26);
  }
  SD.set.tick = (ctx) => line(ctx, [[-10, 0], [-3, 8], [11, -9]], '#2f9e5f', 5);

  // =====================================================================
  // CHRISTMAS BISCUITS — flour everywhere, dough rolled and cut into stars and trees, a long wait
  // by the oven, icing and sprinkles, and a plate left out for Santa.
  // =====================================================================
  // depth plan: oven 6 · bakers behind the counter 8 · counter 15 · helpers and the flour 20–26 ·
  // Santa's plate 30 at the front
  const SHAPES = ['star', 'tree', 'heart', 'star', 'tree', 'heart'];
  function biscuit(ctx, kind, baked, iced) {
    ctx.fillStyle = baked ? '#d99a4e' : '#f0d9a8'; ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.lineJoin = 'round';
    ctx.beginPath();
    if (kind === 'star') { for (let k = 0; k < 10; k++) { const a = -PI / 2 + k * PI / 5, rr = k % 2 ? 3.4 : 7.5; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.6); } }
    else if (kind === 'tree') { ctx.moveTo(0, -5.5); ctx.lineTo(7, 3.5); ctx.lineTo(-7, 3.5); }
    else { ctx.moveTo(0, 4); ctx.bezierCurveTo(-11, -2, -4, -8, 0, -3); ctx.bezierCurveTo(4, -8, 11, -2, 0, 4); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (iced) { ctx.fillStyle = kind === 'tree' ? '#63d471' : kind === 'heart' ? '#ff8fab' : '#ffffff'; ctx.beginPath(); ctx.ellipse(0, -0.5, 3.6, 1.8, 0, 0, TAU); ctx.fill(); if (iced > 1) { for (const [x, c] of [[-2, RED], [1, GOLD], [3, BLUE]]) { ctx.fillStyle = c; ctx.fillRect(x, -1.5, 1.4, 1.4); } } }
  }
  function tray(ctx, c) {
    box(ctx, -42, -5, 84, 6, '#8c95a5', 2);
    for (let k = 0; k < c.cut; k++) { ctx.save(); ctx.translate(-30 + (k % 3) * 30, -7 - Math.floor(k / 3) * 0.1 + (k > 2 ? -1 : 0)); if (k > 2) ctx.translate(0, -5); biscuit(ctx, SHAPES[k], c.baked, k < c.iced ? (c.sprinkled ? 2 : 1) : 0); ctx.restore(); }
  }
  function drawCounter(ctx, c) {
    ctx.scale(1.2, 1.2);
    const L = 180, H = 30;
    box(ctx, -L + 6, -H + 6, L * 2 - 12, H - 6, '#e9d9bd', 3); ctx.strokeStyle = 'rgba(120,90,50,0.4)'; ctx.lineWidth = 1.4; for (const x of [-60, 60]) { ctx.beginPath(); ctx.moveTo(x, -H + 8); ctx.lineTo(x, -2); ctx.stroke(); }
    box(ctx, -L, -H, L * 2, 8, WOOD, 3);
    // flour, dough
    if (c.flour > 0.01) { ctx.globalAlpha *= c.flour; blob(ctx, [[-130, -H - 2, 5], [-116, -H - 3, 6], [-98, -H - 2, 5], [-70, -H - 2, 4]], '#ffffff', 'rgba(150,160,180,0.7)', 1.6); ctx.globalAlpha /= c.flour; }
    if (c.dough > 0.01) { const f = c.flat; ctx.fillStyle = '#f0d9a8'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(-110, -H - lerp(11, 3, f), lerp(20, 52, f) * c.dough, lerp(12, 3.2, f) * c.dough, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    if (c.trayAt === 'L' || c.trayAt === 'R') { ctx.save(); ctx.translate(c.trayAt === 'L' ? -10 : 100, -H - 1); tray(ctx, c); ctx.restore(); }
    // bowl of icing
    ctx.fillStyle = '#ff8fab'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(158, -H - 9, 11, 4, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = CREAM; ctx.beginPath(); ctx.moveTo(146, -H - 9); ctx.quadraticCurveTo(148, -H, 158, -H); ctx.quadraticCurveTo(168, -H, 170, -H - 9); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function drawOven(ctx, o) {
    box(ctx, -44, -92, 88, 92, '#c8443f', 8); box(ctx, -50, -98, 100, 10, '#3a3f4d', 3);
    for (const x of [-24, 0, 24]) { ctx.fillStyle = CREAM; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, -78, 4.5, 0, TAU); ctx.fill(); ctx.stroke(); }
    // door with a window; open: it swings down
    const g = ctx.createLinearGradient(0, -62, 0, -12); g.addColorStop(0, o.hot > 0.05 ? `rgba(255,${150 + 60 * o.hot},80,1)` : '#3a2a2a'); g.addColorStop(1, o.hot > 0.05 ? '#ff7a2a' : '#241a1a');
    box(ctx, -34, -66, 68, 56, '#2a1c1c', 5); ctx.fillStyle = g; ctx.beginPath(); SD.rrect(ctx, -28, -60, 56, 44, 4); ctx.fill();
    if (o.trayIn) { ctx.save(); ctx.translate(0, -30); ctx.scale(0.62, 0.62); tray(ctx, o.c); ctx.restore(); }
    if (o.open < 0.98) { ctx.save(); ctx.translate(0, -10); ctx.scale(1, 1 - o.open * 1.25); box(ctx, -34, -56, 68, 56, '#a8322e', 5); ctx.fillStyle = 'rgba(255,200,120,' + (0.25 + 0.5 * o.hot) + ')'; ctx.beginPath(); SD.rrect(ctx, -24, -46, 48, 30, 4); ctx.fill(); ctx.stroke(); line(ctx, [[-20, -52], [20, -52]], '#8c95a5', 3); ctx.restore(); }
    else box(ctx, -34, -12, 68, 9, '#a8322e', 3);
    if (o.hot > 0.05) { const gl = ctx.createRadialGradient(0, -40, 4, 0, -40, 90); gl.addColorStop(0, `rgba(255,170,90,${0.3 * o.hot})`); gl.addColorStop(1, 'rgba(255,170,90,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, -40, 90, 0, TAU); ctx.fill(); }
    // stove pipe
    box(ctx, 16, -150, 14, 54, '#3a3f4d', 3); box(ctx, 12, -156, 22, 8, '#3a3f4d', 3);
  }
  const pin = (ctx) => { ctx.rotate(0.1); box(ctx, -16, -5, 32, 9, '#d9b07a', 4); line(ctx, [[-23, -0.5], [-16, -0.5]], WOOD_D, 3); line(ctx, [[16, -0.5], [23, -0.5]], WOOD_D, 3); };
  function* sceneBiscuits(S) {
    const w = S.w, r = S.r, cx = S.cx, run = (g) => S.run(g);
    const sd = r.sign(); // the oven's side
    const CX = -sd * 110;
    const M = S.marks({ counter: [CX, 15, true], roll: [CX - 150, 5], cut: [CX - 30, 5], ice: [CX + 168, 5], oven: [sd * 262, 3, true], ovenAt: [sd * 190, 11],
      flour: [CX - 300, 22], look1: [sd * 124, 23], look2: [sd * 8, 29], plate: [-sd * 420, 30, true], plateAt: [-sd * 466, 31], w1: [sd * 344, 27] }, { scene: 'biscuits' });
    const cap = S.spawn({ kind: 'captain' }), specs = S.spawn({ kind: 'specs' }), rocco = S.spawn({ kind: 'rocco' }), chubby = S.spawn({ kind: 'chubby' }), holly = S.spawn({ kind: 'holly' }), pip = S.spawn({ kind: 'pip' });
    const all = [cap, specs, rocco, chubby, holly, pip];
    all.forEach((p) => { p.hidden = true; p.x = S.offL - 200; });
    // ---- 1. the kitchen ----
    const C = S.add(new Draw(w, S.side(-sd) - sd * 200, M.counter.lane, drawCounter, { hw: 218, h: 46, solid: true, flour: 0, dough: 0, flat: 0, cut: 0, baked: 0, iced: 0, sprinkled: 0, trayAt: 'L' }));
    yield* carryIn(S, C, [rocco, cap], M.counter.x, { half: 232, sp: 110, lane: 16 });
    const oven = S.add(new Draw(w, S.side(sd) + sd * 80, M.oven.lane, drawOven, { hw: 52, h: 156, open: 0, hot: 0, trayIn: false, c: C }));
    run(S.to(rocco, M.look1, 60, 22)); run(S.to(cap, M.w1, 60, 26));
    yield* carryIn(S, oven, [chubby], M.oven.x, { half: 60, action: 'push', lift: 0, lane: 5 });
    yield* S.tween(0.8, (u) => { oven.hot = u * 0.5; });
    // ---- 2. flour ----
    // behind the counter without anyone squeezing past anyone: Holly in from the left to the middle,
    // Chubby round the left end after her, Pip in from the right
    offstage(S, specs, -sd, M.flour.lane); offstage(S, holly, -1, 5); offstage(S, pip, 1, 5);
    const places = [run(S.to(holly, M.cut, 85)), run(S.to(pip, M.ice, 75)), run((function* () {
      yield* S.route(chubby, C.x - 262, 27, 80); yield* S.until(() => holly.x > C.x - 190, 10);
      yield* S.toLane(chubby, 5); yield* S.go(chubby, M.roll.x, 5, 60);
    })())];
    const bag = (ctx) => { ctx.fillStyle = CREAM; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(-15, -26); ctx.quadraticCurveTo(0, -34, 15, -26); ctx.lineTo(13, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = BLUE; ctx.fillRect(-9, -20, 18, 8); };
    specs.item = overhead(bag, -120); specs.action = 'carryUp';
    yield places;
    yield* S.to(specs, M.flour, 70);
    specs.face(1); specs.item = null; specs.action = 'throw';
    for (let k = 0; k < 14; k++) w.puff(C.x - 130 + r.range(-110, 110), C.y - 40 - r.range(0, 60), 4, 15, 2.2, 1.2);
    const dusted = [specs, chubby, holly, pip, cap];
    dusted.forEach((p) => { p.snowCap = 0.75; p.action = 'startle'; });
    yield* S.tween(0.4, (u) => { C.flour = u; });
    yield 1.2; specs.say('?', 1); dusted.forEach((p) => { p.action = 'none'; });
    run((function* () { yield 1; yield* S.tween(3, (u) => { dusted.forEach((p) => { p.snowCap = 0.75 * (1 - u); }); }); })());
    run(S.to(specs, M.look2, 60, 27));
    // ---- 3. dough: rolled out, then cut ----
    chubby.face(sd); yield* S.tween(0.5, (u) => { C.dough = u; });
    chubby.item = hold(pin, 14, 10); chubby.action = 'roll';
    yield* S.tween(3.2, (u) => { C.flat = SD.easeInOut(u); });
    chubby.action = 'none'; chubby.item = null;
    holly.face(-sd);
    for (let k = 0; k < 6; k++) { holly.action = 'tap'; yield 0.45; C.cut = k + 1; C.dough = 1 - (k + 1) / 7; w.sparkle(C.x - 10 + (k % 3) * 30 - 30, C.y - 46, 1, '#ffe9a3', 5); holly.action = 'none'; yield 0.2; }
    C.dough = 0; holly.say('heart', 1);
    // ---- 4. into the oven, and the wait ----
    const trayItem = hold((ctx) => { ctx.translate(10, 4); ctx.scale(0.8, 0.8); tray(ctx, C); }, 8, 8);
    yield* S.to(rocco, { x: C.x + sd * 14, lane: 22 }, 70); rocco.face(-sd); rocco.action = 'reach'; rocco.reachTo = [C.x - 10, C.y - 36]; yield 0.4;
    C.trayAt = 'none'; rocco.item = trayItem; rocco.action = 'carryFront'; rocco.reachTo = null;
    yield* S.tween(0.4, (u) => { oven.open = u; });
    yield* S.to(rocco, M.ovenAt, 60, 22); rocco.face(sd); rocco.action = 'reach'; rocco.reachTo = [oven.x, oven.y - 36]; yield 0.4;
    rocco.item = null; oven.trayIn = true; rocco.action = 'none'; rocco.reachTo = null;
    yield* S.tween(0.4, (u) => { oven.open = 1 - u; });
    yield* S.tween(1, (u) => { oven.hot = 0.5 + 0.5 * u; });
    yield* S.to(rocco, M.look1, 60, 22);
    [rocco, specs, cap, chubby, holly, pip].forEach((p) => { p.face(Math.sign(oven.x - p.x) || 1); });
    chubby.action = 'lean'; pip.action = 'none';
    const clock = (ctx, t) => { ctx.fillStyle = CREAM; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill(); ctx.stroke(); line(ctx, [[0, 0], [Math.sin(t * 2.2) * 9, -Math.cos(t * 2.2) * 9]], RED, 2, false); line(ctx, [[0, 0], [0, -6]], INK, 2, false); };
    specs.say(clock, 3.6);
    for (let k = 0; k < 4; k++) { yield 0.9; if (k % 2) pip.jump(-120, 0); w.puff(oven.x + 23, oven.y - 160, 1, 6, 0.4, 1.4); }
    chubby.action = 'none';
    w.sparkle(oven.x, oven.y - 100, 5, '#ffe9a3', 8); [pip, chubby, holly].forEach((p) => { p.say('!', 0.8); });
    C.baked = 1;
    yield* S.to(rocco, M.ovenAt, 70, 22); rocco.face(sd);
    yield* S.tween(0.4, (u) => { oven.open = u; });
    rocco.action = 'reach'; rocco.reachTo = [oven.x, oven.y - 36]; yield 0.4; oven.trayIn = false; rocco.item = trayItem; rocco.action = 'carryFront'; rocco.reachTo = null;
    for (let k = 0; k < 3; k++) w.puff(rocco.x, rocco.y - 70, 1, 5, 0.4, 1.6);
    yield* S.tween(0.4, (u) => { oven.open = 1 - u; oven.hot = 1 - 0.6 * u; });
    yield* S.to(rocco, { x: C.x + 120 + sd * 40, lane: 22 }, 60); rocco.face(-sd); rocco.action = 'reach'; rocco.reachTo = [C.x + 120, C.y - 40]; yield 0.4;
    rocco.item = null; C.trayAt = 'R'; rocco.action = 'none'; rocco.reachTo = null;
    // ---- 5. icing and sprinkles ----
    pip.attach = () => ({ x: M.ice.x, y: pip.groundY() - 16 }); // up on a box behind the counter
    pip.face(-1); const bagI = hold((ctx) => { ctx.rotate(0.5); ctx.fillStyle = '#ffffff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-7, -14); ctx.lineTo(7, -14); ctx.lineTo(0, 8); ctx.closePath(); ctx.fill(); ctx.stroke(); }, 12, 6);
    pip.item = bagI; pip.action = 'pipe';
    for (let k = 0; k < 6; k++) { yield 0.5; C.iced = k + 1; }
    pip.action = 'none'; pip.item = null; pip.attach = null; pip.y = pip.groundY();
    rocco.action = 'throw'; for (let k = 0; k < 5; k++) { w.confetti(C.x + 120 + r.range(-30, 30), C.y - 76, 3, 26); yield 0.12; } C.sprinkled = 1; rocco.action = 'none';
    yield 0.6;
    // Chubby can't wait; Holly can
    chubby.face(sd); chubby.action = 'reach'; chubby.reachTo = [C.x + 60, C.y - 40]; yield 0.6; holly.face(-sd); holly.action = 'point'; holly.say('!', 0.9); chubby.action = 'shrug'; chubby.reachTo = null; yield 1.1; holly.action = 'none'; chubby.action = 'none';
    // ---- 6. one each, and a plate for Santa ----
    const eaters = [chubby, holly, pip, rocco, specs, cap];
    const one = (k) => hold((ctx) => { ctx.scale(1.5, 1.5); biscuit(ctx, SHAPES[k], 1, 2); }, 10, 2);
    const plate = S.add(new Draw(w, M.plate.x, M.plate.lane, (ctx, d) => { box(ctx, -14, -24, 28, 5, WOOD, 2); line(ctx, [[-10, -19], [-13, 0]], WOOD_D, 3); line(ctx, [[10, -19], [13, 0]], WOOD_D, 3); if (d.n) { ctx.fillStyle = '#f4efe4'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(-3, -26, 11, 3, 0, 0, TAU); ctx.fill(); ctx.stroke(); for (let k = 0; k < d.n; k++) { ctx.save(); ctx.translate(-6 + k * 6, -28 - k * 2); biscuit(ctx, SHAPES[k], 1, 2); ctx.restore(); } box(ctx, 8, -37, 7, 12, '#ffffff', 2, 1.4); } }, { hw: 16, h: 40, n: 0, show: 0, solid: true }));
    yield* S.tween(0.4, (u) => { plate.show = u; });
    C.cut = 3;
    for (let k = 0; k < 3; k++) { const p = [holly, pip, chubby][k]; p.item = one(k); p.action = 'eat'; }
    yield 0.4; C.cut = 0; C.trayAt = 'R';
    rocco.item = hold((ctx) => { ctx.fillStyle = '#f4efe4'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, 12, 3.2, 0, 0, TAU); ctx.fill(); ctx.stroke(); for (let k = 0; k < 3; k++) { ctx.save(); ctx.translate(-6 + k * 6, -3 - k * 2); biscuit(ctx, SHAPES[k + 3], 1, 2); ctx.restore(); } }, 10, 4); rocco.action = 'carryFront';
    yield* S.to(rocco, M.plateAt, 60, 31); rocco.face(sd); rocco.action = 'reach'; rocco.reachTo = [plate.x, plate.y - 28]; yield 0.5; rocco.item = null; plate.n = 3; rocco.action = 'none'; rocco.reachTo = null; w.sparkle(plate.x, plate.y - 40, 3, '#ffe9a3', 6);
    rocco.say(SD.set.santaHatIcon, 1.8); yield 1.8;
    [holly, pip, chubby].forEach((p) => { p.item = null; p.action = 'none'; p.say('heart', 1.2); }); chubby.tic = { n: 'pat', t: 0, d: 1.4 };
    yield 1.6;
    yield* S.exitAll(all.filter((p) => !p.hidden), 55, true, 26);
  }
  SD.set.santaHatIcon = (ctx) => { ctx.fillStyle = RED; ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-11, 6); ctx.quadraticCurveTo(-6, -14, 8, -13); ctx.quadraticCurveTo(4, -4, 11, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); blob(ctx, [[-9, 8, 4], [-3, 8, 4], [3, 8, 4], [9, 8, 4], [10, -13, 3.6]], '#ffffff', INK, 1.8); };

  // =====================================================================
  // CAROLS ROUND THE TREE — a lamp post, a little tree, and the whole crew gathered round it with
  // their heads back, singing. Mostly together.
  // =====================================================================
  // depth plan: lamp post 5 · back row 8 · tree 13 · middle row 18 (half a place across) ·
  // lantern-bearer 26 under the lamp · conductor 31 out front to one side
  function drawLamp(ctx, l) {
    line(ctx, [[0, 0], [0, -190]], '#2f3a4a', 6); box(ctx, -12, -8, 24, 8, '#2f3a4a', 3);
    ctx.save(); ctx.translate(l.shake, -190);
    if (l.on > 0.02) { const g = ctx.createRadialGradient(0, -18, 4, 0, -18, 150); g.addColorStop(0, `rgba(255,220,140,${0.5 * l.on})`); g.addColorStop(1, 'rgba(255,220,140,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -18, 150, 0, TAU); ctx.fill(); }
    ctx.fillStyle = l.on > 0.02 ? '#ffe9a3' : '#c7d1de'; ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-17, -32); ctx.lineTo(17, -32); ctx.lineTo(12, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2f3a4a'; ctx.beginPath(); ctx.moveTo(-22, -32); ctx.lineTo(0, -48); ctx.lineTo(22, -32); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (l.snow > 0.02) blob(ctx, [[-14, -38, 7 * l.snow], [-3, -47, 8 * l.snow], [9, -42, 7 * l.snow], [18, -35, 5 * l.snow]], '#ffffff');
    ctx.restore();
    // a wreath on the post
    ctx.strokeStyle = INK; ctx.lineWidth = 11; ctx.beginPath(); ctx.arc(0, -120, 13, 0, TAU); ctx.stroke(); ctx.strokeStyle = GREEN; ctx.lineWidth = 8; ctx.stroke(); ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(0, -107, 4.5, 0, TAU); ctx.fill();
  }
  const sheet = hold((ctx) => { ctx.rotate(-0.15); box(ctx, -9, -12, 18, 22, CREAM, 2, 1.6); ctx.fillStyle = INK; for (const [x, y] of [[-4, -4], [2, -7], [-1, 3], [4, 1]]) { ctx.beginPath(); ctx.ellipse(x, y, 1.8, 1.3, -0.4, 0, TAU); ctx.fill(); ctx.fillRect(x + 1.2, y - 6, 1, 6); } }, 14, 2);
  function* sceneCarols(S) {
    const w = S.w, r = S.r, cx = S.cx, run = (g) => S.run(g);
    const sd = r.sign(); // the conductor's side
    const M = S.marks({ lamp: [-sd * 340, 5, true], tree: [sd * 40, 13, true], b0: [-sd * 236, 8], b1: [-sd * 144, 8], b2: [-sd * 52, 8], b3: [sd * 150, 8], m0: [-sd * 190, 18], m1: [-sd * 98, 18], m2: [sd * 114, 18], m3: [sd * 206, 18],
      lantern: [-sd * 306, 26], cond: [sd * 330, 31] }, { scene: 'carols' });
    const cap = S.spawn({ kind: 'captain' }), specs = S.spawn({ kind: 'specs' }), rocco = S.spawn({ kind: 'rocco' }), chubby = S.spawn({ kind: 'chubby' }), holly = S.spawn({ kind: 'holly' }), pip = S.spawn({ kind: 'pip' });
    const crew = [0, 1, 2].map(() => S.spawn({ kind: 'crew' }));
    const all = [cap, specs, rocco, chubby, holly, pip, ...crew];
    all.forEach((p) => { p.hidden = true; p.x = S.offL - 200; });
    const places = [[crew[0], 'b0'], [chubby, 'b1'], [crew[1], 'b2'], [rocco, 'b3'], [holly, 'm0'], [specs, 'm1'], [crew[2], 'm2']];
    // ---- 1. the lamp and the tree ----
    const lamp = S.add(new Draw(w, S.side(-sd) - sd * 40, M.lamp.lane, drawLamp, { hw: 26, h: 240, on: 0, snow: 1, shake: 0 }));
    yield* carryIn(S, lamp, [crew[0], crew[1]], M.lamp.x, { half: 34, lane: 6 });
    const tr = S.add(new Draw(w, S.side(sd) + sd * 50, M.tree.lane, (ctx, d) => { tree(ctx, 118, d.t, d.lit); blob(ctx, [[-30, -1, 9], [-14, -3, 10], [4, -2, 10], [22, -1, 9]], '#dfeaf7'); }, { hw: 46, h: 124, lit: 0, solid: true }));
    run(S.to(crew[0], M.b0, 60, 8)); run(S.to(crew[1], M.b2, 60, 8));
    yield* carryIn(S, tr, [crew[2]], M.tree.x, { half: 44, lane: 15 });
    yield* S.tween(0.8, (u) => { lamp.on = u; });
    // ---- 2. everyone gathers: the back row first, then the middle, then the small one with the lantern ----
    yield* S.to(crew[2], M.m2, 60, 18);
    const late = places.filter(([p]) => p.hidden);
    late.forEach(([p, k], i) => { offstage(S, p, k === 'b3' || k === 'm3' ? sd : -sd, M[k].lane); p.x -= Math.sign(p.x - cx) * -i * 50; });
    offstage(S, cap, sd, M.cond.lane); offstage(S, pip, -sd, M.lantern.lane);
    pip.item = hold((ctx, p) => { line(ctx, [[0, -16], [0, -8]], INK, 1.4, false); const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 26); g.addColorStop(0, 'rgba(255,214,120,0.6)'); g.addColorStop(1, 'rgba(255,214,120,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 26, 0, TAU); ctx.fill(); box(ctx, -6, -8, 12, 15, '#ffd76a', 3, 1.6); box(ctx, -7, -10, 14, 3, '#2f3a4a', 1, 1.2); }, 12, 8);
    pip.action = 'hold';
    yield [...late.map(([p, k], i) => run((function* () { yield (k[0] === 'b' ? 0 : 1.6) + i * 0.3; yield* S.to(p, M[k], 70); })())), run(S.to(cap, M.cond, 60)), run((function* () { yield 3; yield* S.to(pip, M.lantern, 60); })())];
    const choir = places.map((q) => q[0]);
    [...choir, pip].forEach((p) => { p.face(Math.sign(M.tree.x - p.x) || 1); });
    cap.face(-sd);
    choir.forEach((p) => { p.item = sheet; p.action = 'hold'; });
    yield 0.8;
    // ---- 3. tap, tap, and in ----
    const notes = (who, col) => run((function* () { while (who.action === 'sing') { const [hx, hy] = who.headTop(); w.note(hx + who.facing * 10, hy - 6, col); yield 0.7 + r() * 0.8; } })());
    const cols = ['#e94b5b', '#3f8fd8', '#2f9e5f', '#f2952f'];
    const singAll = () => [...choir, pip].forEach((p, i) => { p.action = 'sing'; notes(p, cols[i % 4]); });
    cap.action = 'baton'; cap.say('!', 0.7); yield 1.4;
    singAll(); yield 9;
    // ---- 4. Rocco takes a solo nobody asked for ----
    rocco.item = null; rocco.shadesDown = 1; rocco.action = 'armsOut'; rocco.jump(-150, 0);
    run((function* () { for (let k = 0; k < 9 && rocco.action === 'armsOut'; k++) { const [hx, hy] = rocco.headTop(); w.note(hx + r.range(-20, 20), hy - 8, RED); yield 0.22; } })());
    yield 0.8; choir.forEach((p) => { if (p !== rocco) { p.action = 'hold'; p.face(Math.sign(rocco.x - p.x) || 1); } }); pip.action = 'hold';
    yield 1.4; cap.action = 'point'; cap.say('!', 1); yield 0.8;
    rocco.action = 'shrug'; rocco.shadesDown = 0; yield 1; rocco.item = sheet; rocco.action = 'hold';
    [...choir, pip].forEach((p) => { p.face(Math.sign(M.tree.x - p.x) || 1); }); cap.action = 'baton'; yield 1;
    singAll(); yield 6;
    // ---- 5. Chubby's low note brings the snow down off the lamp ----
    chubby.say(SD.set.lowNote, 2.2);
    yield* S.tween(1.6, (u) => { lamp.shake = Math.sin(u * 40) * 3 * u; });
    yield* S.tween(0.35, (u) => { lamp.snow = 1 - u; lamp.shake = 0; });
    for (let k = 0; k < 6; k++) w.puff(lamp.x + r.range(-16, 30), lamp.y - 150 + k * 20, 3, 9, 0.8, 0.2);
    pip.snowCap = 1; pip.action = 'startle'; pip.item2 = null; yield 0.9;
    choir.forEach((p) => { p.action = 'hold'; p.face(Math.sign(pip.x - p.x) || 1); }); cap.action = 'none';
    pip.say('!', 0.9); yield 1; pip.jump(-150, 0); w.puff(pip.x, pip.y - 60, 5, 8, 1, 0.6); yield* S.tween(0.5, (u) => { pip.snowCap = 1 - u; });
    pip.say('heart', 1.2); yield 1.2;
    // ---- 6. the last verse: the tree lights, the star shines ----
    [...choir, pip].forEach((p) => { p.face(Math.sign(M.tree.x - p.x) || 1); }); cap.action = 'baton'; yield 0.8;
    singAll();
    yield* S.tween(2, (u) => { tr.lit = u; });
    for (let k = 0; k < 7; k++) { w.sparkle(tr.x + r.range(-50, 50), tr.y - r.range(20, 130), 2, '#fff1b0', 7); yield 0.9; }
    [...choir, pip].forEach((p) => { p.action = 'none'; p.item = p === pip ? p.item : null; });
    cap.action = 'bow'; yield 0.4; [...choir, pip].forEach((p) => { p.action = 'bow'; }); yield 1.6;
    [...choir, pip, cap].forEach((p) => { p.action = 'none'; });
    // ---- 7. on to the next street, still singing: one file behind the conductor ----
    const order = [cap, ...[...choir, pip].sort((a, b) => (b.x - a.x) * sd)];
    yield order.map((p, i) => run((function* () { yield i * 0.9; p.face(sd); p.action = p === cap ? 'baton' : 'sing'; if (p !== cap) notes(p, cols[i % 4]); yield* S.go(p, S.side(sd), i % 2 ? 33 : 27, 58); p.dead = true; })()));
  }
  SD.set.lowNote = (ctx) => { ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(-5, 7, 7, 5, -0.4, 0, TAU); ctx.fill(); ctx.fillRect(0.5, -14, 2.6, 21); ctx.beginPath(); ctx.moveTo(3, -14); ctx.quadraticCurveTo(14, -10, 10, 0); ctx.quadraticCurveTo(10, -7, 3, -8); ctx.fill(); };

  // =====================================================================
  // DECORATING THE TOWN — four crooked little houses, a table of greenery for making wreaths, a
  // wreath for every door, lights strung roof to roof, and then the switch.
  // =====================================================================
  // depth plan: houses 3 · doors (hanging a wreath) 7 · lights walked along 10 · wreath-makers 18 ·
  // table 24 · switch box 14 at the far end · everyone gathers 28–34 for the switch-on
  const HOUSES = [ // x, width, height, lean, colour, roof, door colour
    [-500, 180, 180, -0.05, '#e8b55a', '#b5483d', '#3f6fb5'], [-200, 156, 246, 0.045, '#c9daf0', '#3d5a8a', RED],
    [130, 192, 162, -0.03, '#f0c7b0', '#7a4a9e', GREEN], [470, 162, 222, 0.06, '#bfe0c2', '#b5483d', '#8b5cf6']];
  function drawHouse(ctx, h) {
    const [, W, H, lean, col, roof, door] = h.spec, t = h.t, hw = W / 2;
    ctx.transform(1, 0, lean, 1, 0, 0); // crooked
    // wonky walls: wider at the top
    ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-hw + 8, 0); ctx.quadraticCurveTo(-hw - 6, -H * 0.5, -hw - 4, -H); ctx.lineTo(hw + 4, -H); ctx.quadraticCurveTo(hw + 6, -H * 0.5, hw - 8, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    // roof: a curling hat of a roof with snow
    ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(-hw - 22, -H + 6); ctx.quadraticCurveTo(-hw * 0.3, -H - 30, hw * 0.15, -H - 74); ctx.quadraticCurveTo(hw * 0.5, -H - 96, hw * 0.75, -H - 78); ctx.quadraticCurveTo(hw * 0.4, -H - 70, hw * 0.55, -H - 40); ctx.quadraticCurveTo(hw * 0.8, -H - 14, hw + 22, -H + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    const sn = []; for (let k = 0; k <= 9; k++) { const u = k / 9; sn.push([lerp(-hw - 18, hw + 18, u), -H + 2 - Math.sin(u * PI) * 16 - (u > 0.3 && u < 0.7 ? 10 : 0), 8 + (k % 2) * 2]); } blob(ctx, sn, '#ffffff'); blob(ctx, [[hw * 0.62, -H - 84, 7], [hw * 0.42, -H - 88, 8]], '#ffffff');
    // chimney, crooked the other way
    ctx.save(); ctx.translate(-hw * 0.5, -H - 22); ctx.rotate(-lean * 4 - 0.12); box(ctx, -9, -34, 18, 36, '#a05a44', 2); blob(ctx, [[-6, -36, 6], [5, -37, 6]], '#ffffff'); ctx.restore();
    // door (round-topped) and windows
    const lit = h.lit;
    ctx.fillStyle = door; ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-16, -34); ctx.arc(0, -34, 16, PI, 0); ctx.lineTo(16, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(9, -22, 2.4, 0, TAU); ctx.fill();
    const win = (x, y, rr) => { ctx.fillStyle = lit > 0.05 ? `rgba(255,${205 + 20 * Math.sin(t * 2 + x)},120,1)` : '#3b4a66'; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill(); ctx.stroke(); line(ctx, [[x - rr, y], [x + rr, y]], INK, 1.4, false); line(ctx, [[x, y - rr], [x, y + rr]], INK, 1.4, false); if (lit > 0.05) { const g = ctx.createRadialGradient(x, y, 2, x, y, rr * 3); g.addColorStop(0, `rgba(255,214,120,${0.35 * lit})`); g.addColorStop(1, 'rgba(255,214,120,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr * 3, 0, TAU); ctx.fill(); } };
    win(-hw * 0.52, -H * 0.62, 13); win(hw * 0.5, -H * 0.66, 12); if (H > 170) win(0, -H * 0.84, 10);
    // decorations as they go up
    if (h.wreath > 0.01) { const s = SD.backOut(Math.min(1, h.wreath)); ctx.save(); ctx.translate(0, -40); ctx.scale(s, s); wreath(ctx, 12); ctx.restore(); }
    if (h.garland > 0.01) { ctx.save(); ctx.globalAlpha *= Math.min(1, h.garland); lights(ctx, -hw - 16, -H + 12, hw + 16, -H + 12, 9, t + h.spec[0], h.on, 9); ctx.restore(); }
  }
  function wreath(ctx, R) {
    ctx.strokeStyle = INK; ctx.lineWidth = R * 0.78; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke(); ctx.strokeStyle = GREEN; ctx.lineWidth = R * 0.56; ctx.stroke();
    ctx.strokeStyle = '#2a7045'; ctx.lineWidth = 1.2; for (let k = 0; k < 10; k++) { const a = k * TAU / 10; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8); ctx.lineTo(Math.cos(a + 0.3) * R * 1.2, Math.sin(a + 0.3) * R * 1.2); ctx.stroke(); }
    ctx.fillStyle = RED; for (const a of [0.6, 2.4, 4.4]) { ctx.beginPath(); ctx.arc(Math.cos(a) * R, Math.sin(a) * R, R * 0.17, 0, TAU); ctx.fill(); }
    ctx.fillStyle = RED; ctx.strokeStyle = INK; ctx.lineWidth = 1.4; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, R); ctx.lineTo(s * R * 0.7, R * 0.6); ctx.lineTo(s * R * 0.7, R * 1.4); ctx.closePath(); ctx.fill(); ctx.stroke(); } ctx.beginPath(); ctx.arc(0, R, R * 0.2, 0, TAU); ctx.fill(); ctx.stroke();
  }
  function* sceneTown(S) {
    const w = S.w, r = S.r, cx = S.cx, run = (g) => S.run(g);
    const md = {}; HOUSES.forEach((h, i) => { md['door' + i] = [h[0] + 34, 7]; });
    const M = S.marks(Object.assign(md, { table: [-20, 24, true], mk0: [-90, 18], mk1: [-20, 18], mk2: [50, 18], sw: [640, 14, true], swAt: [594, 16],
      g0: [-380, 30], g1: [-290, 34], g2: [-200, 30], g3: [140, 30], g4: [230, 34], g5: [320, 30], g6: [410, 34] }), { scene: 'town' });
    const cap = S.spawn({ kind: 'captain' }), specs = S.spawn({ kind: 'specs' }), rocco = S.spawn({ kind: 'rocco' }), chubby = S.spawn({ kind: 'chubby' }), holly = S.spawn({ kind: 'holly' }), pip = S.spawn({ kind: 'pip' }), c1 = S.spawn({ kind: 'crew' }), c2 = S.spawn({ kind: 'crew' });
    const all = [cap, specs, rocco, chubby, holly, pip, c1, c2];
    all.forEach((p) => { p.hidden = true; p.x = S.offL - 200; });
    // ---- 1. the town: four house flats pushed on from the wings ----
    const hs = HOUSES.map((spec, i) => S.add(new Draw(w, S.side(i < 2 ? -1 : 1) + (i < 2 ? -1 : 1) * (120 + (i % 2 ? 0 : 0)), 3, drawHouse, { hw: spec[1] / 2 + 26, h: spec[2] + 100, spec, lit: 0, wreath: 0, garland: 0, on: 0, alpha: 0 })));
    const pushers = [[c1, 1], [c2, 2], [rocco, 0], [chubby, 3]];
    for (const pair of [[pushers[0], pushers[1]], [pushers[2], pushers[3]]]) {
      yield pair.map(([p, i]) => run((function* () { hs[i].alpha = 1; yield* carryIn(S, hs[i], [p], cx + HOUSES[i][0], { half: HOUSES[i][1] / 2 + 34, action: 'push', lift: 0, sp: 105, lane: 5 }); })()));
    }
    // ---- 2. the wreath table ----
    const tb = S.add(new Draw(w, S.side(-1) - 80, M.table.lane, (ctx, d) => {
      for (const x of [-92, 92]) box(ctx, x - 4, -26, 8, 26, WOOD_D, 2); box(ctx, -104, -32, 208, 8, WOOD, 3);
      blob(ctx, [[-78, -38, 9], [-62, -42, 10], [-46, -38, 9], [-86, -34, 6]].slice(0, Math.max(0, 4 - Math.floor(d.made * 0.8))), '#3c9a62', INK, 2);
      for (let k = 0; k < d.stack; k++) { ctx.save(); ctx.translate(62 - k * 2, -36 - k * 5); ctx.scale(1, 0.38); wreath(ctx, 15); ctx.restore(); }
      for (const [x, c] of [[-10, RED], [6, GOLD]]) { ctx.fillStyle = c; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, -39, 6, 0, TAU); ctx.fill(); ctx.stroke(); }
    }, { hw: 108, h: 46, solid: true, made: 0, stack: 0 }));
    for (const [p, k] of [[c1, 'mk0'], [c2, 'mk2']]) run(S.to(p, M[k], 70, 12));
    run(S.to(rocco, M.g0, 70, 30)); run(S.to(chubby, M.g6, 70, 34));
    offstage(S, holly, -1, 25); offstage(S, specs, -1, 25);
    yield* carryIn(S, tb, [holly, specs], M.table.x, { half: 120, sp: 110, lane: 25 });
    run(S.to(specs, M.g2, 60, 30));
    yield* S.to(holly, M.mk1, 60, 30);
    const makers = [c1, holly, c2];
    makers.forEach((p, i) => { p.face(i === 0 ? 1 : i === 2 ? -1 : 1); p.action = 'work'; });
    for (let k = 0; k < 4; k++) { yield 2.2; tb.made = k + 1; tb.stack = k + 1; w.sparkle(tb.x + 62, tb.y - 52, 2, '#ffe9a3', 6); if (k === 1) makers[1].say('heart', 1); }
    makers.forEach((p) => { p.action = 'none'; });
    // Pip tries one on
    offstage(S, pip, 1, 30); yield* S.go(pip, tb.x + 150, 30, 85); pip.face(-1); pip.action = 'reach'; pip.reachTo = [tb.x + 62, tb.y - 50]; yield 0.5;
    const pw = (ctx) => { ctx.save(); ctx.translate(2, -52); ctx.scale(1.25, 0.5); wreath(ctx, 22); ctx.restore(); };
    pip.action = 'none'; pip.reachTo = null; pip.costume = pw; pip.jump(-150, 0); pip.say('heart', 1.2); yield 1.4;
    cap.hidden = false; offstage(S, cap, 1, 34); run(S.to(cap, M.g5, 60));
    // ---- 3. a wreath for every door ----
    const hangers = [[rocco, 0], [c1, 1], [c2, 2], [chubby, 3]];
    const wItem = hold((ctx) => { ctx.translate(4, -2); wreath(ctx, 12); }, 12, 4);
    yield hangers.map(([p, i], n) => run((function* () {
      yield n * 1.3;
      yield* S.to(p, { x: tb.x + 62 + (n % 2 ? 26 : -26), lane: n % 2 ? 30 : 18 }, 75, n % 2 ? 30 : 12);
      p.face(Math.sign(tb.x + 62 - p.x) || 1); p.action = 'reach'; p.reachTo = [tb.x + 62, tb.y - 44]; yield 0.4; tb.stack = Math.max(0, tb.stack - 1); p.item = wItem; p.action = 'carryFront'; p.reachTo = null;
      yield* S.to(p, M['door' + i], 75, n % 2 ? 30 : 11);
      p.face(-1); p.item = null; p.jump(-170, 0); yield 0.2;
      yield* S.tween(0.4, (u) => { hs[i].wreath = u; }); w.sparkle(hs[i].x, hs[i].y - 44, 2, '#ffe9a3', 6);
      yield 0.5;
    })()));
    // ---- 4. lights: walked along the roofs, house to house ----
    const sw = S.add(new Draw(w, M.sw.x, M.sw.lane, (ctx, d) => { line(ctx, [[0, 0], [0, -44]], WOOD_D, 5); box(ctx, -13, -70, 26, 30, '#3a3f4d', 4); ctx.save(); ctx.translate(0, -55); ctx.rotate(d.on ? 0.7 : -0.7); line(ctx, [[0, 0], [0, -16]], '#c7d1de', 3.4); ctx.fillStyle = d.on ? '#63d471' : RED; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, -18, 4.6, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }, { hw: 16, h: 74, on: 0, show: 0, solid: true }));
    yield* S.tween(0.4, (u) => { sw.show = u; });
    const wire = S.add(new Draw(w, cx, 3.4, (ctx, d) => {
      for (let i = 0; i < 3; i++) { const a = HOUSES[i], b = HOUSES[i + 1], k = clamp(d.k * 3 - i, 0, 1); if (k <= 0) continue; const x0 = a[0] + a[1] / 2 + 10, y0 = -a[2] + 4, x1 = lerp(x0, b[0] - b[1] / 2 - 10, k), y1 = lerp(y0, -b[2] + 4, k); lights(ctx, x0, y0, x1, y1, Math.max(2, Math.round(8 * k)), d.t + i, d.on, 14 * k); }
    }, { hw: 480, h: 300, k: 0, on: 0 }));
    const spool = hold((ctx) => { ctx.fillStyle = '#2b3a2f'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill(); }, 12, 6);
    yield* S.to(holly, { x: cx + HOUSES[0][0] - 20, lane: 10 }, 85, 12); holly.item = spool; holly.action = 'carryFront'; holly.face(1);
    const hx0 = holly.x, hx1 = cx + HOUSES[3][0] + 10;
    holly.goTo(hx1, 80);
    yield* S.until(() => { wire.k = clamp((holly.x - hx0) / (hx1 - hx0), 0, 1); hs.forEach((h, i) => { if (holly.x > cx + HOUSES[i][0] - 40) h.garland = Math.min(1, h.garland + 0.03); }); return holly.arrived(); }, 30);
    wire.k = 1; holly.item = null; holly.action = 'none';
    // ---- 5. everyone out front; Specs throws the switch ----
    const gather = [[rocco, 'g0'], [pip, 'g1'], [specs, null], [c1, 'g3'], [c2, 'g4'], [cap, 'g5'], [chubby, 'g6'], [holly, 'g2']];
    run((function* () { yield* S.to(specs, M.swAt, 70, 36); specs.face(1); })());
    yield gather.filter((g) => g[1]).map(([p, k], i) => run((function* () { yield i * 0.3; yield* S.to(p, M[k], 75, M[k].lane); p.face(p.x < cx ? 1 : -1); p.action = 'lookUp'; })()));
    for (const n of ['3', '2', '1']) { cap.say(n, 0.8); yield 0.85; }
    specs.action = 'reach'; specs.reachTo = [sw.x, sw.y - 60]; yield 0.4; sw.on = 1; specs.action = 'none'; specs.reachTo = null;
    for (let i = 0; i < 4; i++) { yield* S.tween(0.35, (u) => { hs[i].lit = u; hs[i].on = u; }); w.sparkle(hs[i].x, hs[i].y - HOUSES[i][2] - 40, 3, '#fff1b0', 7); }
    yield* S.tween(0.5, (u) => { wire.on = u; });
    gather.forEach(([p]) => { if (p !== specs) { p.action = 'cheer'; p.jump(-110 - r() * 50, 0); } });
    for (let k = 0; k < 6; k++) w.confetti(cx + r.range(-420, 420), S.ground(cx) - 260, 3, 90);
    yield 2.4;
    // one house blinks out; a thump on the box sorts it
    yield* S.tween(0.2, (u) => { hs[1].lit = hs[1].on = 1 - u; }); gather.forEach(([p]) => { if (p !== specs) p.action = 'none'; });
    yield 0.6; pip.say('?', 1); yield 0.9; specs.action = 'tap'; w.puff(sw.x, sw.y - 50, 2, 5); yield 0.6; specs.action = 'none';
    yield* S.tween(0.3, (u) => { hs[1].lit = hs[1].on = u; }); specs.tic = { n: 'glasses', t: 0, d: 0.9 };
    S.finale(); gather.forEach(([p]) => { if (p !== specs) p.action = 'cheer'; }); yield 2.6;
    gather.forEach(([p]) => { p.action = 'none'; });
    yield* S.exitAll(all.filter((p) => !p.hidden), 70, true, 26);
  }

  Object.assign(SD.SCENES, {
    workshop: { name: "Santa's Workshop", fn: sceneWorkshop, crew: 8 },
    biscuits: { name: 'Christmas Biscuits', fn: sceneBiscuits, crew: 6 },
    carols: { name: 'Carols round the Tree', fn: sceneCarols, crew: 9 },
    town: { name: 'Decorating the Town', fn: sceneTown, crew: 8 },
  });
})();
