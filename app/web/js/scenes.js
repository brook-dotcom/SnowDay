// Snow Day — the four scenes. Each is a generator driven by the scheduler (deterministic).
'use strict';
(function () {
  const { clamp, lerp, TAU } = SD;
  const PI = Math.PI;
  const NOTE_COLS = ['#e94b5b', '#2f9e5f', '#3c7fd8', '#9a57c9', '#f08c00'];

  // =====================================================================
  // 1) DECK THE TREE — a plow clears a path, the crew carries in a tree,
  //    raises it, decorates it, builds a penguin tower for the star.
  // =====================================================================
  function* sceneTree(S) {
    const w = S.w, r = S.r;
    const pdir = r.sign();
    const cx = clamp(S.cx + r.range(-140, 140), S.ax0 + 320, S.ax1 - 320);

    // ---- 1. the plow ----
    const tStart = pdir > 0 ? S.offL - 150 : S.offR + 150;
    const driver = S.spawn({ x: tStart });
    const tr = S.add(new SD.Tractor(w, tStart, pdir, driver));
    driver.inVehicle = true;
    tr.plowLevel = S.D * 0.62;
    const plowA = pdir > 0 ? S.ax0 + 30 : S.ax1 - 30;
    const plowB = pdir > 0 ? S.ax1 - 190 : S.ax0 + 190;
    tr.goTo(plowA - 90 * pdir, 85);
    yield* S.until(() => tr.target == null, 60);
    tr.plowing = true;
    yield 0.8;
    tr.goTo(plowB, 60);
    yield* S.until(() => tr.target == null, 80);
    tr.plowing = false;
    // let the plowed edges and the pushed bank settle naturally
    w.setPacked(0, w.W, 0);
    yield 1.0;
    driver.say('heart', 1.6);
    yield 1.4;
    tr.goTo(tStart, 95);
    yield* S.until(() => tr.target == null, 60);
    tr.dead = true; driver.dead = true;

    // ---- 2. the tree arrives on the crew's heads ----
    const wd = r.sign();
    const Ht = 320;
    const T = S.add(new SD.PineTree(w, 0, 5, S.seed + 101, Ht));
    T.angle = -wd * PI / 2;
    const base0 = wd > 0 ? S.offL - 30 : S.offR + 30;
    const d = [40, 118, 196, 274];
    const carriers = d.map((dd, i) => S.spawn({ x: base0 - wd * dd, lane: 13 + (i % 2) * 5, facing: wd, kind: i === 0 ? 'captain' : 'auto' }));
    carriers.forEach((p) => { p.action = 'carryUp'; p.noHurry = true; });
    let carrying = true;
    S.run((function* () {
      while (carrying) {
        const c0 = carriers[0];
        T.x = c0.x + wd * 40;
        T.y = S.ground(c0.x) - 108 + Math.sin(c0.phase * 2) * 1.4;
        T.angle = -wd * (PI / 2 - 0.06);
        yield 0;
      }
    })());
    carriers.forEach((p, i) => p.goTo(cx - wd * d[i], 42));
    yield* S.until(() => carriers.every((p) => p.arrived()), 90);
    yield 0.5;
    carrying = false;

    // lower the trunk end, then swing the tree upright
    const gy = S.ground(cx) + 10;
    const y0 = T.y, a0 = T.angle, aMid = -wd * 1.18;
    carriers[0].action = 'none';
    carriers[0].goTo(cx + wd * 70, 50);
    yield* S.tween(1.3, (u) => { const e = SD.easeInOut(u); T.y = lerp(y0, gy, e); T.x = lerp(T.x, cx, e); T.angle = lerp(a0, aMid, e); });
    w.puff(cx, gy - 4, 7, 16);
    carriers.slice(1).forEach((p, i) => { p.action = 'push'; p.goTo(cx - wd * (46 + i * 30), 26); });
    carriers[0].action = 'point';
    yield 0.6;
    yield* S.tween(4.2, (u) => { T.angle = lerp(aMid, 0, SD.easeInOut(u)); });
    T.wob.kick(wd * 0.75);
    for (let k = 0; k < 12; k++) {
      const [px, py] = T.localToWorld(r.range(-90, 90), -r.range(40, Ht - 20));
      w.puff(px, py, 1, 10, 0.6, -0.3);
    }
    carriers.forEach((p) => { p.action = 'cheer'; });
    yield 1.8;
    carriers.forEach((p) => { p.action = 'none'; p.noHurry = false; p.face(p.x < cx ? 1 : -1); });

    // ---- 3. box of decorations + a ladder ----
    const boxSide = r.sign();
    const boxer = S.spawn({ x: S.side(boxSide), pal: driver.pal, kind: driver.kind, lane: 15 });
    boxer.item = SD.items.box(); boxer.action = 'carryUp';
    const boxX = cx + boxSide * 175;
    const lad = { side: -boxSide, busy: null, L: null };
    const ladderGuy = carriers[3];
    const ladderTrip = S.run((function* () {
      yield* S.walk(ladderGuy, S.side(-boxSide) * 0 + (boxSide > 0 ? S.ax0 - 40 : S.ax1 + 40), 120);
      ladderGuy.item = SD.items.ladder(); ladderGuy.action = 'carryLadder';
      yield* S.walk(ladderGuy, cx - boxSide * 140, 70);
      ladderGuy.item = null; ladderGuy.action = 'none';
      lad.L = placeLadder(-boxSide);
      yield* S.tween(0.8, (u) => { lad.L.show = SD.backOut(u); });
    })());
    function placeLadder(side) {
      const ax = cx + side * 112, ay = S.ground(ax) + 7;
      const L = S.add(new SD.Ladder(w, ax, ay, cx + side * 44, ay - 190, 7));
      L.show = 0;
      return L;
    }
    yield* S.walk(boxer, boxX, 60);
    boxer.action = 'plant'; yield 0.4;
    boxer.item = null;
    const box = S.add(new SD.DecoBox(w, boxX, 11));
    w.puff(boxX, box.y, 4, 10);
    boxer.action = 'none';
    yield ladderTrip;

    // ---- 4. decorating ----
    const queue = T.baubles.slice().sort((a, b) => b.y - a.y);
    const decorators = [boxer, carriers[0], carriers[1], carriers[2], carriers[3]];
    const ladderMutex = { owner: null };
    // one at a time at the box and on the ladder; the rest wait their turn in a line, a step apart,
    // instead of crowding into each other
    const boxQ = [], ladQ = [];
    function* atBox(p) {
      boxQ.push(p);
      while (true) {
        const k = boxQ.indexOf(p);
        p.laneT = 8 + Math.min(k, 2) * 5; // each place in the line its own depth, all behind the way back to the tree
        yield* S.walk(p, boxX - boxSide * (26 + k * 46) + (k ? 0 : S.r.range(-6, 6)), 62);
        yield* S.until(() => Math.abs(p.lane - p.laneT) < 1.2, 1.5);
        if (boxQ[0] === p) return;
        yield* S.until(() => boxQ.indexOf(p) < k, 30);
      }
    }
    // the next one steps up once this one has carried their things clear of the box
    const leaveBox = (p) => S.run((function* () {
      yield* S.until(() => Math.abs(p.x - boxX) > 70, 6);
      const i = boxQ.indexOf(p); if (i >= 0) boxQ.splice(i, 1);
    })());
    function* takeLadder(p) {
      ladQ.push(p);
      while ((ladderMutex.owner && ladderMutex.owner !== p) || ladQ[0] !== p) {
        const k = ladQ.indexOf(p), wx = lad.L.ax + lad.side * (60 + k * 46);
        if (Math.abs(p.x - wx) > 3) { p.goTo(wx, 60); yield 0; } else { p.target = null; yield 0; }
      }
      p.target = null;
      ladQ.shift(); ladderMutex.owner = p;
    }
    function* moveLadder(p, side) {
      const L = lad.L;
      yield* S.walk(p, L.ax + side * 0, 70);
      p.action = 'plant'; yield 0.3;
      L.show = 0; p.item = SD.items.ladder(); p.action = 'carryLadder';
      L.dead = true;
      yield* S.walk(p, cx + side * 130, 60);
      p.item = null; p.action = 'none';
      lad.L = placeLadder(side); lad.side = side;
      yield* S.tween(0.6, (u) => { lad.L.show = SD.backOut(u); });
    }
    function* decorateOne(p, b) {
      yield* atBox(p);
      p.face(boxSide); p.action = 'plant'; yield 0.45;
      p.item = SD.items.bauble(b.col, b.shape); p.action = 'hold'; yield 0.25;
      leaveBox(p);
      p.laneT = 26; // back to the tree along the front, past anyone waiting
      const [bx, by] = T.localToWorld(b.x, b.y);
      const reachH = S.ground(bx) - by;
      const side = b.x < 0 ? -1 : 1;
      if (reachH < 58) {
        yield* S.walk(p, bx - side * 6 + side * 12, 55);
        p.face(-side);
        p.reachTo = [bx, by + 8]; p.action = 'reach'; yield 0.55;
      } else {
        yield* takeLadder(p);
        if (lad.side !== side) yield* moveLadder(p, side);
        const L = lad.L;
        yield* S.walk(p, L.ax, 60);
        const hNeed = reachH - 54;
        const dT = clamp(S.chainDistForHeight([L], hNeed), 0, L.len * 0.98);
        yield* S.climb(p, [L], dT, 46);
        p.reachTo = [bx, by + 8]; p.action = 'reach'; yield 0.5;
      }
      b.placed = true; b.sw.kick(S.r.sign() * 2.4);
      p.item = null;
      w.sparkle(bx, by + 10, 3, '#fff6c2', 6);
      yield 0.35;
      p.action = 'none'; p.reachTo = null;
      if (p.attach) { yield* S.offLadder(p, [lad.L], 14 + S.r() * 4); ladderMutex.owner = null; }
    }
    const decos = decorators.map((p, i) => S.run((function* () {
      yield i * 0.9;
      while (queue.length) { const b = queue.shift(); yield* decorateOne(p, b); }
      p.action = 'none';
    })()));
    yield decos;

    // ---- 5. lights ----
    for (let gi = 0; gi < T.garlands.length; gi++) {
      const G = T.garlands[gi];
      const p = decorators[gi % 2 === 0 ? 1 : 2];
      const [x1, y1] = T.localToWorld(G.x1, G.y1), [x2, y2] = T.localToWorld(G.x2, G.y2);
      yield* S.walk(p, x1 - 10, 70);
      p.laneT = 24; // along the front, nearer us than anyone standing about
      p.face(1); p.action = 'reach';
      const pt = G.pts;
      yield* S.tween(2.6, (u) => {
        G.reveal = u;
        p.x = lerp(x1 - 10, x2 + 10, u);
        const k = Math.min(pt.length - 1, Math.round((pt.length - 1) * u));
        const [tx, ty] = T.localToWorld(pt[k].x, pt[k].y);
        p.reachTo = [tx, ty];
        p.phase += 0.12;
        if (S.r() < 0.2) w.sparkle(tx, ty, 1, '#fffbe0', 4);
      });
      p.action = 'none'; p.reachTo = null;
    }

    // ---- 6. penguin tower for the star ----
    const [a, b2, c] = [carriers[1], carriers[2], boxer];
    if (lad.L) { lad.L.show = 0; lad.L.dead = true; }
    const tx = cx + S.r.range(-8, 8);
    a.laneT = 17; b2.laneT = 17.2; c.laneT = 17.4;
    yield* S.walk(a, tx, 55);
    a.face(1); a.action = 'armsOut';
    yield* S.walk(b2, tx - 46, 55);
    b2.face(1);
    yield* S.hop(b2, () => a.localToWorld(0, -124), 0.65, 60, true);
    b2.action = 'armsOut';
    c.item = SD.items.star(); c.action = 'carryUp';
    yield* S.walk(c, tx + 50, 55);
    c.face(-1);
    let towering = true;
    S.run((function* () { while (towering) { const t = S.sc.t; a.rot = Math.sin(t * 2.6) * 0.035; b2.rot = Math.sin(t * 3.1 + 1) * 0.06; c.rot = Math.sin(t * 3.7 + 2) * 0.08; yield 0; } a.rot = b2.rot = c.rot = 0; })());
    yield* S.hop(c, () => b2.localToWorld(0, -124), 0.75, 70, true);
    a.eyeOverride = 'closed';
    yield 0.9;
    // toss the star up the last bit
    const from = () => c.localToWorld(0, -146), to = () => T.localToWorld(0, -Ht - 10);
    c.item = null; c.action = 'armsUp';
    let starDone = false;
    S.fling((ctx) => SD.drawStar(ctx, 0, 0, 20, S.sc.t, 0.4), from, to, 0.85, 40, () => { starDone = true; });
    yield* S.until(() => starDone, 3);
    T.star.placed = true; T.wob.kick(0.12);
    { const [sx, sy] = to(); w.sparkle(sx, sy, 10, '#ffe066', 9); }
    c.action = 'cheer'; b2.action = 'cheer';
    yield 1.4;
    a.eyeOverride = null;
    c.action = 'none'; b2.action = 'none';
    yield* S.hop(c, () => [tx + 70, S.ground(tx + 70) + c.lane], 0.8, 50);
    yield* S.hop(b2, () => [tx - 70, S.ground(tx - 70) + b2.lane], 0.7, 40);
    towering = false;
    a.action = 'none';

    // ---- 7. lights on! ----
    const sw = S.add(new SD.SwitchBox(w, cx - boxSide * 150, 16, T));
    sw.alpha = 0;
    const presser = carriers[0];
    yield* S.walk(presser, sw.x - boxSide * 34, 60);
    presser.face(boxSide); presser.action = 'plant';
    yield* S.tween(0.4, (u) => { sw.alpha = u; });
    w.puff(sw.x, sw.y, 3, 8);
    presser.action = 'none';
    const swTop = () => [sw.x, sw.y - 20];
    yield* S.hop(presser, swTop, 0.55, 40, true);
    sw.press = 1; sw.on = 1;
    yield 0.25;
    yield* S.hop(presser, () => [sw.x + boxSide * 36, S.ground(sw.x + boxSide * 36) + presser.lane], 0.5, 30);
    S.run(S.tween(2.6, (u) => { T.lights = u; }));
    yield 0.6;
    const all = [carriers[0], carriers[1], carriers[2], carriers[3], boxer];
    all.forEach((p) => { p.action = 'cheer'; p.face(p.x < cx ? 1 : -1); });
    for (let k = 0; k < 6; k++) { const p = all[k % all.length]; w.heart(p.x, p.y - 70); yield 0.25; }
    yield 1.2;
    all.forEach((p) => { p.action = 'none'; });

    // ---- 8. presents from the box ----
    const giftCols = [['#3c7fd8', '#ffd43b'], ['#e2413b', '#ffffff'], ['#2f9e5f', '#e2413b'], ['#9a57c9', '#ffe066']];
    const giftSpots = [-62, 48, -28, 78];
    const gifters = [carriers[2], carriers[3], boxer];
    const gcos = gifters.map((p, i) => S.run((function* () {
      yield i * 1.2;
      yield* atBox(p);
      p.face(boxSide); p.action = 'plant'; yield 0.4;
      const [gc, rc] = giftCols[i];
      p.item = SD.items.giftFront(gc, rc); p.action = 'hold';
      leaveBox(p);
      const gx = cx + giftSpots[i];
      p.laneT = 18 + i * 5; // each sets theirs down at their own depth, so nobody walks through another
      yield* S.walk(p, gx - Math.sign(giftSpots[i]) * -24, 55);
      p.face(gx > p.x ? 1 : -1);
      p.action = 'plant'; yield 0.3;
      p.item = null;
      const g = S.add(new SD.Gift(w, gx, 9 + i * 0.3, gc, rc, 26 + (i % 2) * 8, 20 + (i % 3) * 5));
      yield* S.tween(0.45, (u) => { g.pop = u; });
      p.action = 'none';
    })()));
    yield gcos;

    // ---- 9. carols ----
    const spots = [-210, -140, 140, 210, -70];
    all.forEach((p, i) => p.goTo(cx + spots[i] + S.r.range(-10, 10), 50));
    yield* S.until(() => all.every((p) => p.arrived()), 20);
    all.forEach((p, i) => { p.face(p.x < cx ? 1 : -1); p.action = 'sway'; p.laneT = 18 + (i % 3) * 2; });
    for (let k = 0; k < 28; k++) {
      const p = all[k % all.length];
      w.note(p.x + p.facing * 14, p.y - 60, NOTE_COLS[k % NOTE_COLS.length]);
      yield 0.65;
    }
    all.forEach((p) => { p.action = 'none'; p.face(-1 * Math.sign(p.x - cx) || 1); });
    yield 2.5;
    yield* S.exitAll(all, 58);
  }

  // =====================================================================
  // 2) CANDY CANE PARADE — drum and baton parade, a cane fence,
  //    then a limbo contest under a candy cane.
  // =====================================================================
  function* sceneParade(S) {
    const w = S.w, r = S.r;
    const wd = r.sign();
    const n = S.crewSize;
    const start = wd > 0 ? S.offL : S.offR;
    const gap = 78;
    const leader = S.spawn({ x: start, lane: 16, facing: wd, kind: 'captain' });
    leader.item = SD.items.baton(); leader.action = 'baton'; leader.march = true;
    const drummer = S.spawn({ x: start - wd * gap, lane: 15, facing: wd });
    drummer.item = SD.items.drum(); drummer.action = 'drum'; drummer.march = true;
    const bearers = [];
    for (let i = 0; i < n - 2; i++) {
      const p = S.spawn({ x: start - wd * gap * (i + 2), lane: 14 + (i % 2) * 3, facing: wd });
      p.item = SD.items.cane(); p.action = 'carryShoulder'; p.march = true;
      bearers.push(p);
    }
    const band = [leader, drummer, ...bearers];
    band.forEach((p) => { p.noHurry = true; });
    let music = true;
    S.run((function* () {
      let k = 0;
      while (music) {
        w.note(drummer.x + wd * 14, drummer.y - 62, NOTE_COLS[k++ % NOTE_COLS.length]);
        yield 0.5;
      }
    })());
    // keep everyone in step with the drum
    let inStep = true;
    S.run((function* () { while (inStep) { const ph = S.sc.t * PI * 2.2; band.forEach((p, i) => { if (p.march && !p.arrived()) p.phase = ph + (i % 2) * 0; }); yield 0; } })());
    const fenceC = S.cx + wd * S.aw * 0.17;
    const lineHead = fenceC + wd * ((band.length - 1) * gap) / 2;
    band.forEach((p, k) => p.goTo(lineHead - wd * k * gap, 40));
    yield* S.until(() => band.every((p) => p.arrived()), 120);
    inStep = false;
    band.forEach((p) => { p.march = false; });
    yield 0.5;
    // salute wave
    leader.action = 'point';
    // a hop runs down the line like a wave (canes stay shouldered, clear of faces and neighbours)
    for (const p of bearers) { p.jump(-190, 0); p.say('heart', 0.6); yield 0.2; }
    yield 1.0;
    leader.action = 'baton';
    yield 0.6;
    // plant a cane fence
    const canes = [];
    for (let i = 0; i < bearers.length; i++) {
      const p = bearers[i];
      p.action = 'plant'; yield 0.25;
      p.item = null;
      const c = S.add(new SD.Cane(w, p.x + wd * 22, p.lane - 4, 96 + (i % 3) * 6, (i % 2 ? 1 : -1) * wd));
      c.depth = -30;
      S.run(S.tween(0.45, (u) => { c.depth = lerp(-30, 8, SD.easeIn(u)); }));
      S.run((function* () { yield 0.45; w.puff(c.x, c.y + 6, 5, 10); c.wob.kick(1.2); })());
      yield 0.3;
      p.action = 'none';
      canes.push(c);
    }
    music = false; drummer.action = 'none';
    yield 0.8;
    // the leader inspects each cane with a tap of the baton
    for (const c of canes.slice().reverse()) {
      yield* S.walk(leader, c.x + wd * 26, 70);
      leader.face(-wd); leader.action = 'point';
      yield 0.25;
      c.wob.kick(wd * 1.6); w.sparkle(c.x, c.y - 96, 3, '#ffd43b', 6);
      yield 0.35;
      leader.action = 'baton';
    }
    leader.say('heart', 1.2);
    yield 1.4;

    // ---- limbo! ----
    // Staged in depth, the way you'd see it from the side: one holder near us (lower, bigger), one
    // far away (higher, smaller), so the bar runs away from us and the dancers cross it. The bar's
    // shadow on the snow shows which way it runs. Dancers queue at mid-depth and walk back round
    // behind both holders, so nobody ever walks through the bar.
    const bx = S.cx - wd * S.aw * 0.2;
    const [h1, h2] = [bearers[0], bearers[1] || drummer];
    const NEAR = 46, FAR = 3, PASS = 22; // lanes
    // up to four contestants; anyone else cheers from the far side
    const performers = band.filter((p) => p !== h1 && p !== h2).slice(0, 4);
    const fans = band.filter((p) => p !== h1 && p !== h2 && !performers.includes(p));
    // the near holder stands on the exit side, so a dancer's trailing head and body stay in view as
    // they cross, and only their feet slip behind the near holder
    // everyone takes their places first (the dancers cross where the bar will be before it's there)
    const queueX = bx - wd * 210;
    const qLane = (i) => PASS - 1 + (i % 2) * 2;
    performers.forEach((p, i) => { p.action = 'none'; p.item = null; p.laneT = qLane(i); p.goTo(queueX - wd * i * 50, 65); });
    fans.forEach((p, j) => { p.action = 'none'; p.item = null; p.laneT = 6 + (j % 2) * 2; p.goTo(bx + wd * (210 + j * 44), 65); });
    yield* S.until(() => performers.every((p) => p.arrived()), 30);
    performers.forEach((p) => p.face(wd));
    h1.laneT = NEAR; h2.laneT = FAR;
    S.run(S.walk(h1, bx + wd * 56, 60));
    yield* S.walk(h2, bx - wd * 46, 60);
    yield* S.until(() => h1.arrived(), 10);
    h1.face(-wd); h2.face(wd);
    h1.action = h2.action = 'hold';
    yield* S.until(() => Math.abs(h1.lane - NEAR) < 0.5 && Math.abs(h2.lane - FAR) < 0.5, 4);
    const bar = S.add(new SD.Bar(w, h1, h2, 0, 0.5)); bar.lane = (NEAR + PASS) / 2;
    const barFar = S.add(new SD.Bar(w, h1, h2, 0.5, 1)); barFar.lane = (PASS + FAR) / 2;
    const cross = () => bar.atLane(PASS); // where a dancer passes under
    fans.forEach((p) => { p.face(-wd); p.action = 'clap'; });
    performers.forEach((p) => p.face(wd));
    // the bar starts at chest height and drops each round
    const rounds = [{ arm: -1.45 }, { arm: -1.2 }, { arm: -0.95 }];
    // highest point of a (possibly leaning) penguin
    const TOP = [[0, -112], [-22, -100], [22, -100], [-30, -80], [30, -80], [-32, -55], [32, -55], [-30, -30], [30, -30]];
    const topY = (p) => { let m = 1e9; for (const [lx, ly] of TOP) m = Math.min(m, p.localToWorld(lx, ly)[1]); return m; };
    // lean back until the top of the penguin is `gap` below the bar (negative gap: not quite low enough)
    function* leanUnder(p, gap) {
      p.loco = 'limbo'; p.limbo = 0.1; p.target = null;
      let t = 0;
      while (topY(p) < cross()[1] + gap && p.limbo < 1.62 && t < 4) { p.limbo = Math.min(1.62, p.limbo + S.dt * 0.85); t += S.dt; yield 0; }
      yield 0.25;
    }
    let alive = performers.slice();
    let returning = [];
    for (let ri = 0; ri < rounds.length; ri++) {
      const R = rounds[ri];
      yield returning; returning = [];
      yield* S.tween(0.8, (u) => { h1.armF = h2.armF = lerp(ri ? rounds[ri - 1].arm : -0.8, R.arm, SD.easeInOut(u)); });
      yield 0.4;
      const next = [];
      for (let k = 0; k < alive.length; k++) {
        const p = alive[k];
        const fail = (ri === 1 && k === 0 && alive.length > 2) || (ri === 2 && k < alive.length - 1);
        p.laneT = PASS;
        yield* S.walk(p, cross()[0] - wd * 95, 60);
        yield* leanUnder(p, fail ? -10 : 5);
        if (fail) {
          p.goTo(cross()[0] - wd * 30, 20);
          yield* S.until(() => p.arrived(), 8);
          // bonk!
          h1.armF = R.arm - 0.25; h2.armF = R.arm + 0.2;
          p.loco = 'stand'; p.limbo = 0;
          const r0 = p.rot;
          yield* S.tween(0.35, (u) => { p.rot = lerp(r0, -1.45 * p.facing, SD.easeIn(u)); });
          w.puff(p.x - p.facing * 30, p.y, 6, 12);
          p.dizzy = 2.6;
          h1.armF = h2.armF = R.arm;
          band.forEach((q) => { if (q !== p && q !== h1 && q !== h2) q.action = 'clap'; });
          yield 2.2;
          yield* S.tween(0.5, (u) => { p.rot = lerp(-1.45 * p.facing, 0, SD.easeOut(u)); });
          band.forEach((q) => { if (q !== h1 && q !== h2) q.action = 'none'; });
          p.dizzy = 0.6;
          // out: step forward out of the line and watch from the near side
          p.laneT = NEAR - 8;
          yield* S.walk(p, bx - wd * 300 + S.r.range(-20, 20), 50);
          p.face(wd); p.action = 'clap';
        } else {
          p.goTo(cross()[0] + wd * 95, 38);
          yield* S.until(() => p.arrived(), 15);
          const l0 = p.limbo;
          yield* S.tween(0.4, (u) => { p.limbo = lerp(l0, 0, u); });
          p.loco = 'stand';
          // while they celebrate and walk back round behind the holders, the next one goes
          const slot = alive.length + next.length;
          returning.push(S.run((function* () {
            p.action = 'cheer'; yield 0.8; p.action = 'none';
            p.laneT = 0;
            yield* S.walk(p, cross()[0] + wd * 150, 40); // step away and back before turning round
            yield* S.until(() => p.lane < 1, 3);
            yield* S.walk(p, queueX - wd * slot * 50, 120);
            p.laneT = qLane(slot); p.face(wd);
          })()));
          next.push(p);
        }
      }
      alive = next.length ? next : alive.slice(0, 1);
      yield 0.5;
    }
    yield returning;
    // champion! the holders drop the bar and everyone gathers round
    const champ = alive[0];
    h1.armF = h2.armF = null; h1.action = h2.action = 'clap';
    bar.dead = barFar.dead = true;
    yield 0.3;
    yield* S.walk(champ, bx, 60);
    champ.action = 'cheer'; champ.say('heart', 2);
    band.forEach((q) => { if (q !== champ && q !== h1 && q !== h2) { q.action = 'clap'; q.face(q.x < bx ? 1 : -1); } });
    for (let k = 0; k < 6; k++) { w.sparkle(champ.x + S.r.range(-30, 30), champ.y - 80 + S.r.range(-20, 20), 2, '#ffd43b', 6); yield 0.25; }
    yield 1.5;
    band.forEach((p) => { p.action = 'none'; });

    // ---- march off, past the cane fence ----
    leader.item = SD.items.baton(); leader.action = 'baton';
    drummer.item = SD.items.drum(); drummer.action = 'drum';
    band.forEach((p) => { p.march = true; p.laneT = 16; p.face(wd); });
    music = true;
    S.run((function* () { let k = 0; while (music) { w.note(drummer.x + wd * 14, drummer.y - 62, NOTE_COLS[k++ % NOTE_COLS.length]); yield 0.5; } })());
    const exitX = wd > 0 ? S.offR : S.offL;
    const order = band.slice().sort((p, q) => (q.x - p.x) * wd);
    const cos = order.map((p, k) => S.run((function* () { yield k * 0.55; yield* S.walk(p, exitX + wd * k * 10, 46); p.dead = true; })()));
    yield cos;
    music = false;
  }

  // =====================================================================
  // 3) THE BIG RAMP — shovel a kicker, test it, grow it with mini ladders,
  //    a bucket brigade, then sled jumps (and a toboggan pile-up).
  // =====================================================================
  function* sceneRamp(S) {
    const w = S.w, r = S.r, D = S.D;
    const dir = r.sign();
    const A0 = dir > 0 ? S.ax0 : S.ax1;
    const X = (lx) => A0 + dir * lx;
    const L = (x) => (x - A0) * dir;
    const xsL = Math.max(150, S.aw * 0.06 + 70);
    const geom = (Hp) => {
      const Lrun = 110 + Hp * 1.55, kl = 64 + Hp * 0.18, kh = 16 + Hp * 0.13;
      const xs = xsL, xp = xs + 44, xr = xp + 36, xb = xr + Lrun, xk = xb + kl;
      return { Hp, xs, xp, xr, xb, xk, kh };
    };
    const profile = (lx, g) => {
      if (g.Hp < 1) return 0;
      if (lx < g.xs) return 0;
      if (lx < g.xp) { const u = (lx - g.xs) / (g.xp - g.xs); return g.Hp * Math.pow(u, 0.55); }
      if (lx < g.xr) return g.Hp;
      if (lx < g.xb) { const u = (lx - g.xr) / (g.xb - g.xr); return g.Hp * (1 - u) * (1 - u); }
      if (lx < g.xk) { const v = (lx - g.xb) / (g.xk - g.xb); return g.kh * v * v; }
      if (lx < g.xk + 7) { const v = (lx - g.xk) / 7; return g.kh * (1 - v); }
      return 0;
    };
    let Hcur = 0, shaping = true;
    const baseD = w.meanDepth(Math.min(X(xsL - 100), X(xsL + 900)), Math.max(X(xsL - 100), X(xsL + 900)));
    S.run((function* () {
      while (shaping) {
        const g = geom(Hcur);
        const lo = Math.min(X(g.xs - 2), X(g.xk + 10)), hi = Math.max(X(g.xs - 2), X(g.xk + 10));
        w.shapeToward(lo, hi, (x) => { const pr = profile(L(x), g); return pr > 0.3 ? baseD + pr : null; }, 70, S.dt);
        yield 0;
      }
    })());
    const g = () => geom(Hcur);
    const crew = [];
    const n = S.crewSize;
    const enter = dir > 0 ? S.offL : S.offR;
    // ---- shovel crew ----
    const shovelCols = ['#4a7fd6', '#e2413b', '#2f9e5f', '#f2b134'];
    const digSpots = [xsL - 120, xsL - 60, xsL + 360, xsL + 430];
    const shovelers = digSpots.map((lx, i) => S.spawn({ x: enter - dir * i * 50, lane: 12 + (i % 2) * 5, facing: dir, kind: i === 0 ? 'captain' : 'auto' }));
    crew.push(...shovelers);
    let shovelOn = true;
    const target = () => X(g().xr + r.range(-30, Math.max(40, g().xb - g().xr) * 0.6));
    function* shovelLoop(p, lx, until) {
      yield* S.walk(p, X(lx), 70);
      p.item = SD.items.shovel(shovelCols[crew.indexOf(p) % 4]);
      p.face(L(p.x) < g().xr ? dir : -dir);
      p.action = 'shovel';
      while (shovelOn && !until()) {
        let thrown = false;
        const item = p.item;
        yield* S.tween(1.45, (u) => {
          p.cyc = u;
          if (item) item.full = u > 0.3 && u < 0.62 ? 1 : 0;
          if (u > 0.3 && !p._dug) { p._dug = true; if (w.depthAt(p.x + p.facing * 30) > D * 0.6) w.addSnow(p.x + p.facing * 28, -26, 9); }
          if (u >= 0.62 && !thrown) {
            thrown = true;
            const [hx, hy] = p.localToWorld(30, -105);
            const tx = target(), ty = w.surfaceY(tx);
            const T = 0.85, gg = 900;
            w.chunk(hx, hy, (tx - hx) / T, (ty - hy - 0.5 * gg * T * T) / T, 5.5, () => { Hcur = Math.min(Hcur + 1.05, 400); });
          }
        });
        p._dug = false;
        p.face(L(p.x) < g().xr ? dir : -dir);
      }
      p.action = 'none'; p.item = null; p.cyc = 0;
    }
    const shCos = shovelers.map((p, i) => S.run(shovelLoop(p, digSpots[i], () => false)));
    yield* S.until(() => Hcur >= 66, 70);
    shovelOn = false;
    yield shCos;
    shovelers.forEach((p) => { p.action = 'clap'; p.face(L(p.x) < g().xr ? dir : -dir); });
    yield 1;
    shovelers.forEach((p) => { p.action = 'none'; });

    // ---- a sled and the test run ----
    const sled = S.add(new SD.Sled(w, X(xsL - 160), 3)); sled.facing = dir; sled.alpha = 0;
    const sledder = S.spawn({ x: enter, lane: 14, facing: dir });
    crew.push(sledder);
    sledder.item = SD.items.sledUp(); sledder.action = 'carryUp';
    sled.dead = true;

    function* ride(riders, sl, opts = {}) {
      riders.forEach((p, i) => {
        p.loco = 'sit'; p.target = null; p.laneT = p.lane = sl.lane + 0.5 + i * 0.01; p.action = 'none';
        p.attach = () => { const s = sl.seat(i); return { x: s.x, y: s.y, rot: s.rot, facing: sl.facing }; };
      });
      yield 0.7;
      riders.forEach((p) => { p.action = 'armsUp'; p.beakOpen = 1; });
      yield 0.5;
      riders.forEach((p) => { p.action = 'none'; });
      sl.riding = true; sl.vx = dir * 70; sl.fric = opts.fric ?? 85; sl.brake = 0;
      let landed = false, impact = 0, wasAir = false;
      sl.landed = (v) => { landed = true; impact = v; };
      const t0 = S.sc.t;
      while (S.sc.t - t0 < 14) {
        riders.forEach((p) => { p.action = sl.air ? 'armsUp' : (Math.abs(sl.vx) > 220 ? 'armsOut' : 'none'); p.eyeOverride = sl.air ? 'happy' : null; });
        if (sl.air) wasAir = true;
        if (opts.onAir && sl.air && sl.vy > -40) { const f = opts.onAir; opts.onAir = null; yield* f(); }
        if (landed && wasAir) break;
        if (!sl.air && Math.abs(sl.vx) < 4 && S.sc.t - t0 > 3) break;
        if (!sl.air && w.rng() < 0.3 && Math.abs(sl.vx) > 150) w.puff(sl.x - dir * 30, sl.y, 1, 6, 0.4, 0.4);
        yield 0;
      }
      riders.forEach((p) => { p.eyeOverride = null; });
      return impact;
    }
    function* stopSled(sl) {
      sl.brake = 1.6;
      yield* S.until(() => Math.abs(sl.vx) < 10 && !sl.air, 8);
      sl.riding = false; sl.vx = 0;
    }
    function* dismount(p, lane = 14) {
      p.attach = null; p.rot = 0; p.loco = 'stand'; p.laneT = lane; p.y = p.groundY(); p.action = 'none';
      yield 0;
    }

    // walk up the run to the top
    yield* S.walk(sledder, X(g().xb + 20), 70);
    sledder.laneT = 0.5;
    yield* S.walk(sledder, X(g().xr - 6), 34);
    sledder.item = null; sledder.action = 'plant';
    const s1 = S.add(new SD.Sled(w, X(g().xp + 14), 0)); s1.facing = dir;
    w.puff(s1.x, s1.y, 3, 8);
    yield 0.4;
    shovelers.forEach((p) => { p.face(Math.sign(s1.x - p.x) || 1); p.action = 'lookUp'; });
    yield* ride([sledder], s1);
    w.puff(s1.x, s1.y, 6, 12);
    yield* stopSled(s1);
    yield* dismount(sledder);
    sledder.action = 'cheer'; shovelers.forEach((p) => { p.action = 'clap'; });
    yield 1.6;
    crew.forEach((p) => { p.action = 'none'; });
    sledder.say('?', 1.5); // bigger?
    yield 1.2;

    // ---- stage B: mini ladders + block carriers ----
    const lb = X(xsL - 62), lby = S.ground(lb) + 3;
    const L1 = S.add(new SD.Ladder(w, lb, lby, X(xsL + 40), lby - 172, 3)); L1.show = 0;
    const ladGuy = shovelers[0];
    yield* S.walk(ladGuy, enter, 140);
    ladGuy.item = SD.items.ladder(); ladGuy.action = 'carryLadder';
    yield* S.walk(ladGuy, X(xsL - 100), 70);
    ladGuy.item = null; ladGuy.action = 'plant';
    yield* S.tween(0.9, (u) => { L1.show = SD.backOut(u); });
    ladGuy.action = 'none';
    const mutex = { o: null };
    let blocksOn = true;
    function* blockRun(p, k) {
      yield k * 1.4;
      while (blocksOn && Hcur < 158) {
        yield* S.walk(p, X(xsL - 160 - k * 18), 70);
        p.face(-dir); p.action = 'plant'; yield 0.7;
        p.item = SD.items.block(); p.action = 'carryUp';
        p.face(dir);
        yield* S.walk(p, L1.ax, 60);
        while (mutex.o && mutex.o !== p) yield 0;
        if (!blocksOn || Hcur >= 158) { p.item = null; p.action = 'none'; break; }
        mutex.o = p;
        const dT = clamp(S.chainDistForHeight([L1], Hcur - 4), 20, L1.len);
        yield* S.climb(p, [L1], dT, 60);
        p.item = null; p.action = 'pass'; p.cyc = 0.8;
        const [hx, hy] = p.localToWorld(0, -131);
        S.fling((ctx) => SD.drawBlock(ctx, 28, 18), () => [hx, hy], () => [X(g().xp + 16), w.surfaceY(X(g().xp + 16))], 0.5, 30, () => { Hcur = Math.min(Hcur + 9, 400); w.puff(X(g().xp + 16), w.surfaceY(X(g().xp + 16)), 4, 9); });
        yield 0.5;
        p.action = 'none';
        yield* S.offLadder(p, [L1], 12 + k * 2);
        mutex.o = null;
      }
      p.action = 'none';
    }
    shovelOn = true;
    const helpers = shovelers.slice(1).concat([sledder]);
    const bCos = helpers.map((p, k) => S.run(blockRun(p, k)));
    const sh2 = S.run(shovelLoop(ladGuy, xsL + 420, () => Hcur >= 158));
    yield* S.until(() => Hcur >= 158, 120);
    blocksOn = false; shovelOn = false;
    yield bCos; yield sh2;

    // test run 2 — up the ladder with the sled
    const r2 = helpers[1];
    s1.dead = true;
    r2.item = SD.items.sledUp(); r2.action = 'carryUp';
    crew.forEach((p) => { if (p !== r2) { p.face(Math.sign(X(xsL + 300) - p.x) || 1); } });
    yield* S.walk(r2, L1.ax, 60);
    yield* S.climb(r2, [L1], clamp(S.chainDistForHeight([L1], Hcur - 4), 0, L1.len), 48);
    r2.attach = null; r2.loco = 'stand'; r2.laneT = r2.lane = 0.5; r2.ld = null; r2.onChain = null;
    r2.x = X(g().xp + 4); r2.y = r2.groundY();
    r2.item = null; r2.action = 'plant';
    const s2 = S.add(new SD.Sled(w, X(g().xp + 16), 0)); s2.facing = dir;
    yield 0.35;
    crew.forEach((p) => { if (p !== r2) p.action = 'lookUp'; });
    yield* ride([r2], s2);
    w.puff(s2.x, s2.y, 8, 14);
    yield* stopSled(s2);
    yield* dismount(r2);
    r2.action = 'cheer'; crew.forEach((p) => { if (p !== r2) p.action = 'clap'; });
    yield 1.8;
    crew.forEach((p) => { p.action = 'none'; });

    // ---- stage C: stack a second ladder + bucket brigade ----
    const top1 = L1.point(1);
    // the second ladder sits in front of the first, overlapping it and lashed on
    const L2 = S.add(new SD.Ladder(w, top1[0], top1[1], X(xsL + 52), top1[1] - 122, 3.4)); L2.show = 0;
    L2.col = '#c9884a'; L2.overlap = 32; L2.stacked = true;
    const stacker = helpers[0];
    stacker.item = SD.items.ladder('#c9884a'); stacker.action = 'carryLadder';
    yield* S.walk(stacker, L1.ax, 60);
    stacker.item = SD.items.ladderBack(); stacker.action = 'none';
    yield* S.climb(stacker, [L1], L1.len * 0.93, 46);
    stacker.item = null; stacker.action = 'armsUp';
    yield* S.tween(0.9, (u) => { L2.show = SD.backOut(u); });
    w.sparkle(top1[0], top1[1], 4, '#ffffff', 6);
    stacker.action = 'none';
    const chain = [L1, L2];
    const len1 = L1.len, lenT = len1 + L2.len;
    // brigade positions
    const bg = [ladGuy, helpers[2] || shovelers[1], stacker, helpers[1]];
    const P0 = bg[0];
    yield* S.walk(P0, L1.ax - dir * 26, 60);
    P0.face(dir);
    const climbers = [[bg[1], len1 * 0.42], [bg[2], len1 * 0.93], [bg[3], len1 + L2.len * 0.72]];
    const ccos = climbers.map(([p, dd], i) => S.run((function* () {
      if (p.onChain !== L1) { yield* S.walk(p, L1.ax, 60); }
      yield* S.climb(p, chain, dd, 46);
      p.action = 'pass';
    })()));
    // the remaining crew keeps shoveling
    shovelOn = true;
    const extra = crew.filter((p) => !bg.includes(p));
    const sh3 = extra.map((p, i) => S.run(shovelLoop(p, [xsL + 380, xsL + 450, xsL - 210][i % 3], () => Hcur >= 252)));
    yield ccos;
    P0.action = 'pass';
    const passers = [P0, bg[1], bg[2], bg[3]];
    let brigade = true;
    S.run((function* () { while (brigade) { const t = S.sc.t; passers.forEach((p, i) => { p.cyc = (t * 1.1 + i * 0.25) % 1; }); yield 0; } })());
    while (Hcur < 252) {
      // spawn a block that travels up the line hand to hand
      const hands = passers.map((p) => () => p.localToWorld(0, -110));
      const legs = hands.length;
      let leg = 0;
      const blk = { x: 0, y: 0, lane: 30, alpha: 1, dead: false, update() {}, draw(ctx) { ctx.save(); ctx.translate(this.x, this.y); SD.drawBlock(ctx, 24, 16); ctx.restore(); } };
      S.add(blk);
      S.run((function* () {
        for (leg = 0; leg < legs; leg++) {
          const a = hands[leg], b = leg + 1 < legs ? hands[leg + 1] : () => [X(g().xp + 14), w.surfaceY(X(g().xp + 14))];
          const [x0, y0] = a();
          yield* S.tween(0.5, (u) => { const [x1, y1] = b(); blk.x = lerp(x0, x1, u); blk.y = lerp(y0, y1, u) - 18 * 4 * u * (1 - u); });
        }
        blk.dead = true;
        Hcur = Math.min(Hcur + 7.5, 400);
        w.puff(blk.x, blk.y, 3, 8);
      })());
      yield 0.85;
    }
    yield 2.2;
    brigade = false; shovelOn = false;
    yield sh3;
    passers.forEach((p) => { p.action = 'cheer'; });
    yield 1.4;
    // climb down (top first)
    for (const [p] of climbers.slice().reverse()) { yield* S.offLadder(p, chain, 12 + S.r() * 6); p.action = 'none'; }
    passers.forEach((p) => { p.action = 'none'; });

    // ---- the big jump ----
    const hero = sledder;
    hero.item = SD.items.sledUp(); hero.action = 'carryUp';
    yield* S.walk(hero, L1.ax, 60);
    const topD = S.chainDistForHeight(chain, Hcur - 3);
    yield* S.climb(hero, chain, Math.min(topD, lenT), 52);
    hero.attach = null; hero.loco = 'stand'; hero.ld = null; hero.onChain = null; hero.laneT = hero.lane = 0.5;
    hero.x = X(g().xp + 4); hero.y = hero.groundY();
    hero.item = null; hero.action = 'plant';
    const s3 = S.add(new SD.Sled(w, X(g().xp + 16), 0)); s3.facing = dir;
    yield 0.4;
    crew.forEach((p) => { if (p !== hero) { p.action = 'lookUp'; p.face(Math.sign(X(xsL + 500) - p.x) || 1); } });
    hero.say('!', 1.0);
    yield 1.0;
    const impact = yield* ride([hero], s3);
    // buried head-first!
    const lx = s3.x + dir * 20;
    hero.attach = null; hero.loco = 'stand'; hero.laneT = hero.lane = 4;
    w.puff(lx, w.surfaceY(lx), 16, 22, 1.2, 1.3);
    w.addSnow(lx + dir * 26, 380, 18);
    hero.sinkClip = true; hero.rot = dir * PI * 0.92;
    hero.attach = () => ({ x: lx, y: w.surfaceY(lx) - 12 });
    hero.loco = 'prone'; hero.kick = 1; hero.p.prone = 0;
    S.run(stopSled(s3));
    crew.forEach((p) => { if (p !== hero) p.action = 'flail'; });
    yield 0.8;
    crew.forEach((p) => { if (p !== hero) { p.action = 'none'; p.goTo(lx - dir * (60 + S.r() * 80), 90); } });
    yield 1.4;
    // pop out
    hero.loco = 'stand'; hero.kick = 0;
    hero.attach = null; hero.sinkClip = false;
    hero.x = lx; hero.y = hero.groundY();
    yield* S.tween(0.25, (u) => { hero.rot = lerp(dir * PI * 0.92, 0, u); });
    hero.jump(-360, 0);
    w.puff(lx, w.surfaceY(lx), 10, 14);
    hero.say('heart', 1.6);
    yield* S.until(() => !hero.air, 2);
    hero.action = 'cheer'; crew.forEach((p) => { if (p !== hero) { p.face(Math.sign(hero.x - p.x) || 1); p.action = 'cheer'; } });
    yield 2.2;
    crew.forEach((p) => { p.action = 'none'; });

    // ---- encore: three on a toboggan ----
    const tob = S.add(new SD.Sled(w, X(xsL - 150), 2, true)); tob.facing = dir;
    const trio = [helpers[0], helpers[1], shovelers[0]];
    const tobHeld = { u: 0 };
    tob.follow = false;
    tob.held = () => { const [bx, by] = S.chainPoint(chain, lenT * tobHeld.u); return { x: bx - dir * 16, y: by + 8, ang: -dir * 1.2 * (tobHeld.u > 0 && tobHeld.u < 1 ? 1 : 0) }; };
    tob.alpha = 0;
    // they climb up first
    for (const [i, p] of trio.entries()) {
      S.run((function* () {
        yield i * 0.9;
        yield* S.walk(p, L1.ax, 70);
        yield* S.climb(p, chain, Math.min(S.chainDistForHeight(chain, Hcur - 3), lenT), 55);
        p.attach = null; p.loco = 'stand'; p.ld = null; p.onChain = null; p.laneT = p.lane = 0.5 + i * 0.01;
        p.x = X(g().xp + 2 + i * 8); p.y = p.groundY();
      })());
    }
    yield 4.5;
    tob.alpha = 1;
    yield* S.tween(2.6, (u) => { tobHeld.u = SD.easeInOut(u); });
    tob.held = null; tob.x = X(g().xp + 40); tob.lane = 0; tob.follow = true;
    yield 0.3;
    yield* S.until(() => trio.every((p) => p.loco === 'stand' && !p.attach), 6);
    crew.forEach((p) => { if (!trio.includes(p)) p.action = 'lookUp'; });
    const ejected = [];
    yield* ride(trio, tob, {
      onAir: function* () {
        // everybody flies off separately!
        trio.forEach((p, i) => {
          p.attach = null; p.loco = 'air'; p.action = 'flail'; p.rot = 0;
          p.jump(tob.vy - 90 - i * 60, tob.vx * (0.7 + i * 0.18));
          p.onLand = (q) => { w.puff(q.x, q.y, 8, 14); q.dizzy = 2.4; q.action = 'none'; q.rot = 0; q.loco = 'stand'; };
          ejected.push(p);
        });
        S.run((function* () { while (ejected.some((p) => p.air)) { ejected.forEach((p, i) => { if (p.air) p.rot += (i % 2 ? -1 : 1) * 0.12; }); yield 0; } ejected.forEach((p) => { p.rot = 0; }); })());
        yield 0;
      },
    });
    S.run(stopSled(tob));
    yield* S.until(() => trio.every((p) => !p.air), 5);
    trio.forEach((p) => { p.attach = null; p.loco = 'stand'; p.laneT = 12 + S.r() * 6; p.rot = 0; });
    yield 2.4;
    trio.forEach((p) => { p.action = 'cheer'; });
    crew.forEach((p) => { if (!trio.includes(p)) p.action = 'clap'; });
    yield 2.0;
    shaping = false;
    crew.forEach((p) => { p.action = 'none'; });
    yield 1.0;
    yield* S.exitAll(crew, 62);
  }

  // =====================================================================
  // 4) ICE DAY — the snow glazes over; slips, skis, skates, a belly train.
  // =====================================================================
  function* sceneIce(S) {
    const w = S.w, r = S.r;
    const from = r.sign();
    const ice = w.ice;
    ice.on = true; ice.glaze = 0; ice.spreading = true;
    // freeze sweeping across the whole world
    if (from > 0) { ice.a = 0; ice.b = 0; } else { ice.a = w.W; ice.b = w.W; }
    w.snowfall = 0.12;
    yield* S.tween(7, (u) => {
      const e = SD.easeInOut(u);
      if (from > 0) { ice.b = e * w.W; ice.front = ice.b; } else { ice.a = w.W * (1 - e); ice.front = ice.a; }
      ice.glaze = 1;
      if (S.r() < 0.7) { const fx = ice.front; w.sparkle(fx + S.r.range(-20, 20), w.surfaceY(fx) + S.r.range(0, 14), 1, '#ffffff', 4); }
    });
    ice.a = 0; ice.b = w.W; ice.spreading = false;
    w.setPacked(0, w.W, 1);
    yield 1.5;

    const cast = [];
    const inX = (s) => (s > 0 ? S.offL : S.offR);
    // ---- first one slips ----
    const sd = r.sign();
    const slip = S.spawn({ x: inX(sd), lane: 16, facing: sd, kind: 'pip' });
    cast.push(slip);
    yield* S.walk(slip, S.cx - sd * S.aw * 0.3, 50);
    slip.loco = 'scrabble'; slip.vx = sd * 60; slip.friction = 0.6;
    slip.say('!', 1.2);
    yield 1.3;
    slip.loco = 'prone'; slip.vx = sd * 230; slip.friction = 0.32; slip.kick = 1; slip.eyeOverride = 'happy';
    w.puff(slip.x, slip.y, 3, 8);
    yield* S.until(() => Math.abs(slip.vx) < 25, 9);
    slip.vx = 0; slip.loco = 'stand'; slip.kick = 0; slip.eyeOverride = null;
    slip.say('heart', 1.4);
    slip.action = 'cheer'; yield 1.2; slip.action = 'none';

    // ---- gliding helpers ----
    const bounds = [S.ax0 + 120, S.ax1 - 120];
    function* skater(p, dur, opts = {}) {
      p.gear = 'skates'; p.loco = 'glide'; p.friction = 0.18; p.target = null;
      const t0 = S.sc.t; let nextPush = 0, spun = false;
      let d = p.facing;
      while (S.sc.t - t0 < dur) {
        if (p.x < bounds[0]) d = 1; if (p.x > bounds[1]) d = -1;
        if (S.sc.t >= nextPush) { p.vx += d * 55; p.vx = clamp(p.vx, -150, 150); nextPush = S.sc.t + 0.9; }
        p.cyc += S.dt * 7;
        if (opts.spin && !spun && S.sc.t - t0 > opts.spin) {
          spun = true;
          const v0 = p.vx;
          yield* S.tween(0.6, (u) => { p.vx = lerp(v0, 0, u); });
          p.action = 'armsUp'; p.eyeOverride = 'happy';
          yield* S.tween(2.2, (u) => { p.spin = u * TAU * 5; p.cyc += 0.2; });
          p.spin = 0; p.action = 'none'; p.eyeOverride = null;
          if (opts.bow) { p.action = 'plant'; yield 0.6; p.action = 'none'; }
        }
        if (opts.hop && S.sc.t - t0 > opts.hop && !p._hopped) {
          p._hopped = true;
          p.jump(-330, p.vx); p.action = 'armsOut';
          yield* S.tween(0.55, (u) => { p.spin = u * TAU; });
          p.spin = 0; p.action = 'none';
          yield* S.until(() => !p.air, 2);
          p.loco = 'glide';
          w.sparkle(p.x, p.y, 4, '#ffffff', 5);
        }
        yield 0;
      }
    }
    function* skier(p, dur) {
      p.gear = 'skis'; p.item = SD.items.poles(); p.loco = 'ski'; p.friction = 0.12; p.target = null;
      const t0 = S.sc.t; let d = p.facing, nextPush = 0;
      while (S.sc.t - t0 < dur) {
        if (p.x < bounds[0]) d = 1; if (p.x > bounds[1]) d = -1;
        if (S.sc.t >= nextPush) {
          nextPush = S.sc.t + 1.3;
          S.run(S.tween(0.55, (u) => { p.cyc = -PI / 2 + u * PI; }));
          S.run((function* () { yield 0.3; p.vx = clamp(p.vx + d * 65, -170, 170); })());
        }
        yield 0;
      }
    }
    // ---- skiers and skaters arrive ----
    const k1 = S.spawn({ x: inX(-sd), lane: 13, facing: -sd }); k1.gear = 'skis'; k1.item = SD.items.poles();
    const k2 = S.spawn({ x: inX(-sd) - sd * 120, lane: 18, facing: -sd, kind: 'captain' }); k2.gear = 'skis'; k2.item = SD.items.poles();
    const sk1 = S.spawn({ x: inX(sd), lane: 14, facing: sd }); sk1.gear = 'skates';
    const sk2 = S.spawn({ x: inX(sd) - sd * 90, lane: 19, facing: sd }); sk2.gear = 'skates';
    cast.push(k1, k2, sk1, sk2);
    // glide in from the edges
    k1.loco = k2.loco = 'ski'; k1.vx = -sd * 150; k2.vx = -sd * 150;
    sk1.loco = sk2.loco = 'glide'; sk1.vx = sd * 140; sk2.vx = sd * 140;
    [k1, k2, sk1, sk2].forEach((p) => { p.friction = 0.02; });
    yield* S.until(() => Math.abs(k1.x - S.cx) < S.aw * 0.35 && Math.abs(sk1.x - S.cx) < S.aw * 0.35, 30);
    const A = [
      S.run(skier(k1, 42)),
      S.run(skier(k2, 40)),
      S.run(skater(sk1, 42, { spin: 7, bow: true })),
      S.run(skater(sk2, 42, { hop: 10, spin: 24 })),
    ];
    // the slipper gets skates too and joins
    yield 3;
    slip.gear = 'skates';
    const A5 = S.run(skater(slip, 34, { hop: 14 }));
    yield A; yield A5;

    // ---- belly train pulled by a skier ----
    const loco = k1; loco.item = SD.items.poles();
    const cars = [slip, sk1, sk2];
    const td = r.sign();
    // everyone gathers at one side
    const startX = td > 0 ? S.ax0 + 60 : S.ax1 - 60;
    [loco, ...cars, k2].forEach((p) => { p.loco = 'stand'; p.vx = 0; p.gear = p === loco || p === k2 ? 'skis' : null; p.spin = 0; p.action = 'none'; });
    const glideTo = (p, x) => S.run((function* () { p.loco = 'glide'; p.gear = p.gear || 'skates'; p.target = null; while (Math.abs(p.x - x) > 12) { p.vx = clamp((x - p.x) * 1.4, -160, 160); p.cyc += S.dt * 6; yield 0; } p.vx = 0; p.loco = 'stand'; })());
    yield [glideTo(loco, startX), ...cars.map((p, i) => glideTo(p, startX - td * (60 + i * 62)))];
    [loco, ...cars].forEach((p) => p.face(td));
    cars.forEach((p) => { p.gear = null; p.loco = 'prone'; p.kick = 0.4; p.eyeOverride = 'happy'; p.friction = 0; });
    loco.loco = 'ski'; loco.friction = 0;
    loco.say('!', 1);
    yield 1;
    let train = true;
    S.run((function* () {
      while (train) {
        cars.forEach((p, i) => { const lead = i === 0 ? loco : cars[i - 1]; p.x = lead.x - td * (i === 0 ? 74 : 92); p.vx = loco.vx; p.y = p.groundY(); });
        loco.cyc += S.dt * 5;
        yield 0;
      }
    })());
    const trainEnd = td > 0 ? S.offR + 300 : S.offL - 300;
    yield* S.tween(Math.abs(trainEnd - loco.x) / 150, (u) => { loco.vx = td * 150; });
    train = false;
    [loco, ...cars].forEach((p) => { p.dead = true; });
    // k2 (left behind) waves and skis off the other way
    k2.face(-td); k2.action = 'wave'; yield 1.2; k2.action = 'none';
    k2.loco = 'ski'; k2.friction = 0;
    yield* S.tween(Math.abs((td > 0 ? S.offL - 100 : S.offR + 100) - k2.x) / 140, () => { k2.vx = -td * 140; k2.cyc += S.dt * 5; });
    k2.dead = true;
  }

  SD.SCENES = {
    tree: { name: 'Deck the Tree', fn: sceneTree },
    parade: { name: 'Candy Cane Parade', fn: sceneParade, crew: 7 },
    ramp: { name: 'The Big Ramp', fn: sceneRamp, crew: 7 },
    ice: { name: 'Ice Day', fn: sceneIce },
  };
})();
