// Snow Day — more scenes: igloo contest, ice fishing, blizzard, flying lessons, window parkour,
// and three two-screen scenes: snowball fight, zipline, tug-of-war.
'use strict';
(function () {
  const { clamp, lerp, TAU } = SD;
  const PI = Math.PI;
  const NOTE_COLS = ['#e94b5b', '#2f9e5f', '#3c7fd8', '#9a57c9', '#f08c00'];

  // ---------- small shared helpers ----------
  function whistle(S, p, n = 2) {
    p.action = 'none';
    p.tic = { n: 'whistle', t: 0, d: 1.1 };
    const [bx, by] = p.localToWorld(26, -64);
    for (let k = 0; k < n; k++) S.w.note(bx + k * 4, by - k * 8, NOTE_COLS[k % NOTE_COLS.length]);
  }
  function* cheerAll(S, list, t = 1.6, hearts = 3) {
    list.forEach((p) => { if (!p.dead) p.action = 'cheer'; });
    for (let k = 0; k < hearts; k++) { const p = list[k % list.length]; if (p && !p.dead) S.w.heart(p.x, p.y - 80); yield t / Math.max(1, hearts); }
    list.forEach((p) => { if (!p.dead) p.action = 'none'; });
  }
  const byKind = (list, k) => list.find((p) => p.kind === k);
  function ballistic(x0, y0, x1, y1, T, g = 900) { return [(x1 - x0) / T, (y1 - y0 - 0.5 * g * T * T) / T]; }

  // =====================================================================
  // IGLOO COMPETITION
  // =====================================================================
  function* sceneIgloo(S) {
    const w = S.w, r = S.r;
    const cap = S.spawn({ x: S.offL, kind: 'captain', lane: 20 });
    const n = S.crewSize - 1;
    const teamA = [], teamB = [];
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      const p = S.spawn({ x: side < 0 ? S.offL - 60 - i * 40 : S.offR + 60 + i * 40, facing: -side, lane: 12 + (i % 3) * 3 });
      (side < 0 ? teamA : teamB).push(p);
    }
    // two different designs; if Specs is on a team, his team goes geodesic
    const specsTeam = [teamA, teamB].find((t) => t.some((p) => p.kind === 'specs'));
    const pool = SD.shuffle(r, SD.IGLOO_DESIGNS.filter((d) => d !== 'geodesic' || !specsTeam));
    let dA = pool[0], dB = pool[1];
    if (specsTeam === teamA) dA = 'geodesic';
    if (specsTeam === teamB) dB = 'geodesic';
    const xA = S.cx - S.aw * 0.25, xB = S.cx + S.aw * 0.25;
    const A = S.add(new SD.Igloo(w, xA, 6, 112, '#3c7fd8', 1, dA));
    const B = S.add(new SD.Igloo(w, xB, 6, 112, '#e2413b', -1, dB));
    // a panel of judges nobody has met before, behind a snow desk
    const looks = SD.shuffle(r, SD.STRANGER_LOOKS.slice());
    const hats = SD.shuffle(r, SD.STRANGER_HATS.slice());
    // two of them carry the desk in between them; the third brings up the rear
    const desk = S.add(new SD.JudgeTable(w, S.offR + 140, 30, 200));
    desk.lift = 16;
    const judges = [];
    for (let j = 0; j < 3; j++) {
      const J = S.spawn({ x: j < 2 ? S.offR + 140 + (j ? 92 : -92) : S.offR + 330, kind: 'stranger', lane: 26, facing: -1 });
      J.look = looks[j % looks.length]; J.jhat = hats[j % hats.length]; J.rosette = true;
      judges.push(J);
    }
    const all = [cap, ...teamA, ...teamB, ...judges];
    judges[0].action = judges[1].action = 'hold';
    let deskMove = true;
    S.run((function* () { while (deskMove) { desk.x = (judges[0].x + judges[1].x) / 2; yield 0; } })());
    S.run(S.walk(judges[2], S.cx + 140, 70));
    yield [S.run(S.walk(judges[0], S.cx - 92, 60)), S.run(S.walk(judges[1], S.cx + 92, 60))];
    deskMove = false;
    yield* S.tween(0.4, (u) => { desk.lift = 16 * (1 - SD.easeIn(u)); });
    w.puff(desk.x, desk.y, 5, 10, 1, 0.5);
    judges[0].action = judges[1].action = 'none';
    yield judges.map((J, j) => S.run((function* () { yield j * 0.2; yield* S.walk(J, S.cx - 58 + j * 58, 60); J.face(j === 0 ? -1 : j === 2 ? 1 : (r() < 0.5 ? -1 : 1)); })()));
    // walk in
    S.run(S.walk(cap, S.cx - 175, 70));
    yield [...teamA.map((p, i) => S.run(S.walk(p, xA - 140 - i * 46, 70))), ...teamB.map((p, i) => S.run(S.walk(p, xB + 140 + i * 46, 70)))];
    yield* S.until(() => cap.arrived(), 20);
    cap.face(-1); cap.action = 'point'; yield 0.8; cap.face(1); yield 0.8;
    judges.forEach((J) => { J.action = 'wave'; }); yield 0.9; judges.forEach((J) => { J.action = 'none'; });
    whistle(S, cap, 3); yield 1.2;
    cap.action = 'none';
    cap.laneT = 8;
    // who gets too comfy on their own igloo?
    const lounger = byKind([...teamA, ...teamB], 'chubby') || teamB[teamB.length - 1];
    const loungeTeam = teamA.includes(lounger) ? teamA : teamB;
    const LI = loungeTeam === teamA ? A : B;
    const OI = LI === A ? B : A;
    const plan = new Map([[A, 15], [B, 15]]);
    plan.set(LI, 11); // the loungers' team rushes it
    const placed = new Map([[A, 0], [B, 0]]);
    const quarry = (ig) => (ig === A ? xA - 210 : xB + 210);
    function* builder(p, ig, k) {
      yield k * 0.8;
      const side = ig === A ? -1 : 1;
      while (placed.get(ig) < plan.get(ig)) {
        yield* S.walk(p, quarry(ig) + side * S.r.range(0, 40), 75);
        p.face(side); p.action = 'plant';
        w.puff(p.x + side * 22, p.y, 2, 8);
        yield 0.8;
        p.item = SD.items.block(); p.action = 'carryUp';
        if (placed.get(ig) >= plan.get(ig)) break;
        yield* S.walk(p, ig.x + side * (ig.R + 18), 70);
        p.face(-side); p.item = null; p.action = 'pass'; p.cyc = 0.7;
        const tgt = () => { const h = ig.prog * ig.H; const hw = ig.halfWidth(h); return [ig.x + S.r.range(-hw, hw) * 0.8, ig.y - h]; };
        const [hx, hy] = p.headTop();
        placed.set(ig, placed.get(ig) + 1);
        S.fling((ctx) => SD.drawBlock(ctx, 24, 15), () => [hx, hy], tgt, 0.5, 26, () => { ig.prog = Math.min(1, ig.prog + 1 / plan.get(ig)); w.puff(ig.x, ig.y - ig.prog * ig.H, 2, 8); });
        yield 0.5;
        p.action = 'none';
      }
      p.item = null; p.action = 'none';
    }
    const bA = teamA.map((p, k) => S.run(builder(p, A, k)));
    const bB = teamB.map((p, k) => S.run(builder(p, B, k)));
    // the hurried team finishes first... and someone sits on top
    yield* S.until(() => LI.prog >= 0.999, 120);
    yield (loungeTeam === teamA ? bA : bB);
    LI.flag = 0; S.run(S.tween(0.8, (u) => { LI.flag = u; }));
    loungeTeam.forEach((p) => { p.action = 'cheer'; });
    yield 1.4;
    loungeTeam.forEach((p) => { p.action = 'none'; });
    yield* S.walk(lounger, LI.x + LI.door * -(LI.R + 30), 60);
    lounger.say('heart', 1.2);
    yield* S.hop(lounger, () => LI.seat(), 0.7, 50, true);
    lounger.loco = 'sit'; lounger.eyeOverride = 'happy';
    LI.wob.kick(1.2);
    yield 1.4;
    LI.wob.kick(2.4); w.puff(LI.x, LI.y - LI.H, 3, 8);
    lounger.say('!', 0.8); lounger.eyeOverride = 'wide';
    yield 0.7;
    yield* S.tween(0.35, (u) => { LI.squash = SD.easeIn(u); });
    w.puff(LI.x, LI.y - 20, 18, 26, 1.6, 1.2);
    LI.flag = 0; LI.prog = 0.3;
    judges.forEach((J, j) => { J.face(Math.sign(LI.x - J.x) || 1); if (j === 1) J.eyeOverride = 'wide'; else J.say(j ? '!' : '?', 1.2); });
    S.run((function* () { yield 2; judges.forEach((J) => { J.eyeOverride = null; }); })());
    yield* S.tween(0.3, (u) => { LI.squash = 1 - u; });
    lounger.attach = null; lounger.loco = 'stand'; lounger.eyeOverride = null; lounger.y = lounger.groundY();
    lounger.dizzy = 2.4;
    loungeTeam.forEach((p) => { if (p !== lounger) { p.action = 'sleepy'; p.say('?', 1.2); } });
    yield 2.4;
    loungeTeam.forEach((p) => { p.action = 'none'; });
    // rebuild — smaller this time
    LI.R = 58; LI.prog = 0;
    placed.set(LI, 0); plan.set(LI, 8);
    const re = loungeTeam.map((p, k) => S.run(builder(p, LI, k)));
    yield* S.until(() => OI.prog >= 0.999, 120);
    S.run(S.tween(0.8, (u) => { OI.flag = u; }));
    yield* S.until(() => LI.prog >= 0.999, 60);
    yield re; yield (loungeTeam === teamA ? bB : bA);
    S.run(S.tween(0.8, (u) => { LI.flag = u; }));
    [...teamA, ...teamB].forEach((p) => { p.action = 'none'; p.item = null; });
    // judging
    cap.laneT = 18;
    for (const ig of [OI, LI]) {
      yield* S.walk(cap, ig.x + ig.door * (ig.R + 24), 55);
      cap.face(-ig.door); cap.action = 'point'; yield 0.8; cap.action = 'none';
      if (ig === OI) {
        // crawls inside to inspect
        cap.using = ig; cap.laneT = 5.5; yield* S.walk(cap, ig.doorX(), 30);
        yield* S.tween(0.4, (u) => { cap.alpha = 1 - u; });
        yield 1.4;
        yield* S.tween(0.4, (u) => { cap.alpha = u; });
        cap.say('heart', 1.2); cap.laneT = 18;
        yield* S.walk(cap, ig.x + ig.door * (ig.R + 30), 40);
        cap.using = null;
      } else {
        // too small to get in: the igloo ends up on his head
        cap.using = ig; cap.laneT = 5.5; yield* S.walk(cap, lerp(ig.x, ig.doorX(), 0.7), 30);
        cap.say('!', 0.8);
        ig.follow = false;
        const holdY = () => { const [hx, hy] = cap.headTop(); return [hx, hy + 6]; };
        const [x0, y0] = [ig.x, ig.y];
        yield* S.tween(0.5, (u) => { const [hx, hy] = holdY(); ig.x = lerp(x0, hx, u); ig.y = lerp(y0, hy, u); });
        cap.laneT = 18;
        let carry = true;
        S.run((function* () { while (carry) { const [hx, hy] = holdY(); ig.x = hx; ig.y = hy; ig.lane = cap.lane + 0.5; yield 0; } })());
        cap.action = 'flail';
        loungeTeam.forEach((p) => { p.action = 'flail'; });
        yield* S.walk(cap, cap.x + S.r.sign() * 40, 35);
        yield* S.walk(cap, cap.x - S.r.sign() * 60, 35);
        carry = false;
        const gx = cap.x + ig.door * 70;
        yield* S.tween(0.6, (u) => { ig.x = lerp(ig.x, gx, u); ig.y = lerp(ig.y, S.ground(gx) + 6, SD.easeIn(u)); });
        ig.lane = 6; ig.follow = true; ig.wob.kick(1.5); w.puff(gx, ig.y, 6, 12);
        cap.action = 'none'; loungeTeam.forEach((p) => { p.action = 'none'; });
        cap.dizzy = 1; cap.using = null;
        yield 1.2;
      }
    }
    // the judges hold up their scores, one igloo at a time
    cap.laneT = 20;
    yield* S.walk(cap, S.cx - 175, 55);
    const oiTeam = loungeTeam === teamA ? teamB : teamA;
    // every judge has an opinion: the steady build usually scores better, but not always
    const scores = (base) => judges.map(() => clamp(base + Math.floor(S.r() * 5) - 2, 1, 10));
    const high = scores(6 + Math.floor(S.r() * 4));
    const low = scores(4 + Math.floor(S.r() * 5));
    const fan = S.r() < 0.4 ? Math.floor(S.r() * 3) : -1; // sometimes one judge adores the underdog
    if (fan >= 0) low[fan] = 10;
    const sum = (a) => a.reduce((x, y) => x + y, 0);
    const winner = sum(high) > sum(low) ? OI : sum(low) > sum(high) ? LI : null; // null: a tie
    for (const [ig, sc] of [[OI, high], [LI, low]]) {
      cap.face(Math.sign(ig.x - cap.x) || 1); cap.action = 'point'; yield 0.9; cap.action = 'none';
      judges.forEach((J) => J.face(Math.sign(ig.x - J.x) || 1));
      yield 0.8;
      for (let j = 0; j < judges.length; j++) {
        const J = judges[j];
        J.item = SD.items.card(sc[j], 'F'); J.action = 'cardUp';
        if (sc[j] >= 9) w.sparkle(J.x, J.y - 150, 3, '#ffd43b', 6);
        yield 0.55;
      }
      if (ig === LI && fan >= 0) {
        // the other two turn and stare at the generous one
        judges.forEach((J, j) => { if (j !== fan) { J.face(Math.sign(judges[fan].x - J.x) || 1); J.say('?', 1.2); } });
        judges[fan].eyeOverride = 'happy';
      }
      S.finale(); (ig === LI ? loungeTeam : oiTeam).forEach((p) => { p.action = sum(sc) >= 21 ? 'cheer' : sum(sc) >= 15 ? 'clap' : 'sleepy'; });
      yield 2.2;
      judges.forEach((J) => { J.item = null; J.action = 'none'; J.eyeOverride = null; });
      [...teamA, ...teamB].forEach((p) => { p.action = 'none'; });
      yield 0.6;
    }
    // winners! (or, on a tie, everyone)
    const winIgs = winner ? [winner] : [OI, LI];
    for (const ig of winIgs) S.run(S.tween(0.6, (u) => { ig.flag = 1 + Math.sin(u * PI * 4) * 0.08; }));
    judges.forEach((J) => { J.face(Math.sign((winner || OI).x - J.x) || 1); J.action = 'clap'; });
    const winTeam = winner === OI ? oiTeam : winner === LI ? loungeTeam : [...oiTeam, ...loungeTeam];
    const loseTeam = winner ? (winner === OI ? loungeTeam : oiTeam) : [];
    loseTeam.forEach((p) => { p.action = 'clap'; });
    if (winner === LI) lounger.say('heart', 1.4); else if (winner) lounger.say('?', 1.2);
    yield* cheerAll(S, winTeam, 2.2, 6);
    yield 1;
    [...all].forEach((p) => { p.action = 'none'; });
    // the desk stays: the blizzard tidies up
    yield* S.exitAll(all, 62);
  }

  // =====================================================================
  // ICE FISHING
  // =====================================================================
  function* sceneFishing(S) {
    const w = S.w, r = S.r;
    const ice = w.ice;
    const ia = S.cx - S.aw * 0.36, ib = S.cx + S.aw * 0.36;
    ice.on = true; ice.glaze = 0; ice.spreading = true; ice.a = S.cx; ice.b = S.cx;
    yield* S.tween(3, (u) => { const e = SD.easeInOut(u); ice.a = lerp(S.cx, ia, e); ice.b = lerp(S.cx, ib, e); ice.glaze = 1; ice.front = S.r() < 0.5 ? ice.a : ice.b; });
    ice.spreading = false;
    w.setPacked(ia, ib, 1);
    const cap = S.spawn({ x: S.offL, kind: 'captain', lane: 16 });
    cap.item = SD.items.auger(); cap.action = 'hold';
    const hx = [S.cx - S.aw * 0.22, S.cx, S.cx + S.aw * 0.22];
    const holes = hx.map((x) => S.add(new SD.Hole(w, x, 9)));
    for (const h of holes) {
      yield* S.walk(cap, h.x - 26, 70);
      cap.face(1); cap.action = 'drill';
      yield* S.tween(1.6, (u) => { h.r = 16 * SD.easeOut(u); if (S.r() < 0.4) w.sparkle(h.x + S.r.range(-12, 12), h.y - 4, 1, '#ffffff', 4); });
      w.puff(h.x, h.y, 4, 8, 0.6, 0.6);
      cap.action = 'hold';
    }
    cap.item = null; cap.action = 'none';
    yield* S.walk(cap, S.cx + S.aw * 0.3, 60);
    cap.face(-1);
    // three anglers with buckets
    const cols = ['#3c7fd8', '#e2413b', '#2f9e5f'];
    const anglers = hx.map((x, i) => S.spawn({ x: i < 2 ? S.offL - i * 70 : S.offR, lane: 13 + i }));
    const buckets = [];
    yield anglers.map((p, i) => S.run((function* () {
      p.item = SD.items.bucket(cols[i]); p.action = 'hold';
      yield* S.walk(p, holes[i].x - 44, 65);
      p.face(1); p.action = 'plant'; yield 0.3;
      p.item = null;
      buckets[i] = S.add(new SD.Bucket(w, holes[i].x - 44, p.lane - 1, cols[i]));
      yield* S.hop(p, () => buckets[i].top(), 0.4, 18, true);
      p.loco = 'sit'; p.face(1);
      p.item = SD.items.rod(); p.action = 'fish';
    })()));
    // fishing lines (drawn in world space from rod tip to the hole)
    const lines = anglers.map((p, i) => ({ p, h: holes[i], bite: 0, on: true }));
    const tipOf = (p) => {
      const a = p.p.aF, th = 0.95 + (p.item && p.item.tug ? p.item.tug * 0.5 : 0);
      const hx2 = -20 - Math.sin(a) * 30, hy2 = -58 + Math.cos(a) * 30 + p.p.crouch * 12;
      return p.localToWorld(hx2 + Math.sin(th) * 46, hy2 - Math.cos(th) * 46);
    };
    const lineProp = S.add({ x: S.cx, y: 0, lane: 25, alpha: 1, dead: false, update() {}, draw(ctx) {
      for (const L of lines) {
        if (!L.on || L.p.dead) continue;
        const [tx, ty] = tipOf(L.p), bx = L.h.x, by = L.h.y + 1 + L.bite * 3;
        ctx.strokeStyle = 'rgba(30,40,60,0.75)'; ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo((tx + bx) / 2, Math.max(ty, by) - (L.bite ? 0 : -12), bx, by); ctx.stroke();
        const bob = Math.sin(S.sc.t * 2 + L.h.x) * 1.2 + L.bite * 4;
        ctx.fillStyle = '#e2413b'; ctx.beginPath(); ctx.arc(bx, by - 2 + bob, 2.6, PI, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(bx, by - 2 + bob, 2.6, 0, PI); ctx.fill();
      }
    } });
    yield 2.5;
    const catchUp = function* (L, drawFn, landOn) {
      const p = L.p;
      L.bite = 1; p.say('!', 0.9);
      for (let k = 0; k < 4; k++) { p.item.tug = 1; yield 0.15; p.item.tug = 0; yield 0.15; }
      L.on = false; L.bite = 0;
      w.puff(L.h.x, L.h.y, 4, 7, 0.6, 1);
      let done = false;
      S.fling(drawFn, () => [L.h.x, L.h.y - 4], landOn, 0.8, 70, () => { done = true; });
      yield* S.until(() => done, 3);
    };
    // 1) the young one lands a tiny fish
    const order = anglers.slice().sort((a, b) => (a.kind === 'pip' ? -1 : b.kind === 'pip' ? 1 : 0));
    const small = order[0];
    yield* catchUp(lines[anglers.indexOf(small)], (ctx) => SD.drawFish(ctx, 16, '#f2b134', Math.sin(S.sc.t * 20) * 0.4), () => small.handWorld('F'));
    small.item = SD.items.fish(16, '#f2b134'); small.action = 'hold'; small.eyeOverride = 'happy';
    for (let k = 0; k < 3; k++) { w.heart(small.x, small.y - 80); yield 0.35; }
    small.eyeOverride = null;
    yield 1.4;
    // 2) the next angler reels in... a boot
    const bootGuy = order.find((p) => p.kind === 'rocco') || order[1];
    const bl = lines[anglers.indexOf(bootGuy)];
    yield* catchUp(bl, (ctx) => SD.drawBoot(ctx, 1.2), () => bootGuy.headTop());
    bootGuy.item = null; bootGuy.action = 'none'; bootGuy.say('?', 1.6);
    if (bootGuy.kind === 'rocco') { bootGuy.shadesDown = 1; }
    const bootOn = S.add({ x: 0, y: 0, lane: bootGuy.lane + 0.5, alpha: 1, dead: false, update() { const [x, y] = bootGuy.headTop(); this.x = x; this.y = y + 4; }, draw(ctx) { ctx.save(); ctx.translate(this.x, this.y); SD.drawBoot(ctx, 1.2); ctx.restore(); } });
    yield 1.8;
    bootGuy.action = 'throw'; bootGuy.cyc = 0;
    yield* S.tween(0.6, (u) => { bootGuy.cyc = u; });
    bootOn.dead = true;
    S.fling((ctx) => SD.drawBoot(ctx, 1.2), () => bootGuy.headTop(), () => [bootGuy.x - 220, S.ground(bootGuy.x - 220)], 0.9, 90, () => w.puff(bootGuy.x - 220, S.ground(bootGuy.x - 220), 4, 9));
    bootGuy.action = 'none'; bootGuy.item = SD.items.rod(); bootGuy.action = 'fish'; bl.on = true;
    yield 1.2;
    // 3) a snack
    const eater = order.find((p) => p.kind === 'chubby') || order[2];
    const el = lines[anglers.indexOf(eater)];
    yield* catchUp(el, (ctx) => SD.drawFish(ctx, 26, '#7fb2d9', Math.sin(S.sc.t * 20) * 0.3), () => eater.handWorld('F'));
    eater.item = SD.items.fish(26); eater.action = 'eat';
    yield 1.6;
    eater.item = null; eater.action = 'none'; eater.tic = { n: 'pat', t: 0, d: 1.4 }; w.heart(eater.x, eater.y - 90);
    yield 1.8;
    el.on = true; eater.item = SD.items.rod(); eater.action = 'fish';
    // 4) the big one — the captain tries the middle hole himself
    yield* S.walk(cap, holes[1].x + 40, 60);
    cap.face(-1); cap.item = SD.items.rod(); cap.action = 'fish';
    const cl = { p: cap, h: holes[1], bite: 0, on: true };
    lines.push(cl);
    lines[1].on = false; // the middle angler makes room
    const mid = anglers[1];
    mid.attach = null; mid.loco = 'stand'; mid.item = null; mid.action = 'none'; mid.y = mid.groundY();
    yield* S.walk(mid, holes[1].x - 110, 60);
    yield 1.5;
    cl.bite = 1; cap.say('!', 1.2);
    // he's dragged toward the hole
    cap.loco = 'scrabble';
    yield* S.tween(1.2, (u) => { cap.x = lerp(holes[1].x + 40, holes[1].x + 22, u); cap.item.tug = Math.sin(u * 30) * 0.5 + 0.5; });
    // everyone forms a chain behind him
    const chain = [cap, ...anglers];
    anglers.forEach((p) => { p.attach = null; p.loco = 'stand'; p.item = null; p.action = 'none'; p.y = p.groundY(); });
    const slot = (k) => holes[1].x + 22 + k * 58;
    yield chain.slice(1).map((p, k) => S.run(S.walk(p, slot(k + 1), 110)));
    chain.forEach((p) => { p.face(-1); p.loco = 'stand'; p.action = 'pull'; });
    cap.action = 'pull';
    let tugging = true, off = 0;
    S.run((function* () { while (tugging) { chain.forEach((p, k) => { p.x = slot(k) + off; p.y = p.groundY(); p.phase += 0.2; }); yield 0; } })());
    yield* S.tween(1.2, (u) => { off = Math.sin(u * PI) * 40; });
    yield* S.tween(1.0, (u) => { off = -Math.sin(u * PI) * 24; });
    yield* S.tween(1.4, (u) => { off = Math.sin(u * PI) * 60; });
    // the giant fish erupts, sails over them and flops back down another hole
    tugging = false;
    cl.on = false; cap.item = null;
    w.puff(holes[1].x, holes[1].y, 14, 18, 1.4, 1.6);
    let flopDone = false;
    const bigLand = [holes[1].x + 360, S.ground(holes[1].x + 360) - 18];
    S.fling((ctx) => { ctx.scale(-1, 1); SD.drawFish(ctx, 110, '#5f8fc0', Math.sin(S.sc.t * 9) * 0.25); }, () => [holes[1].x, holes[1].y - 10], () => bigLand, 1.4, 260, () => { flopDone = true; });
    chain.forEach((p, k) => { p.action = 'none'; p.jump(-200 - k * 20, 140 + k * 30); p.onLand = (q) => { w.puff(q.x, q.y, 5, 10); q.dizzy = 2.4; q.rot = 0; }; });
    S.run((function* () { while (chain.some((p) => p.air)) { chain.forEach((p) => { if (p.air) p.rot += 0.12; }); yield 0; } chain.forEach((p) => { p.rot = 0; }); })());
    yield* S.until(() => flopDone, 3);
    // flopping fish
    const fish = S.add({ x: bigLand[0], y: bigLand[1], lane: 22, alpha: 1, dead: false, t: 0, update(dt) { this.t += dt; }, draw(ctx) { ctx.save(); ctx.translate(this.x, this.y - Math.abs(Math.sin(this.t * 6)) * 14); ctx.scale(-1, 1); SD.drawFish(ctx, 110, '#5f8fc0', Math.sin(this.t * 12) * 0.3); ctx.restore(); } });
    yield 2.6;
    chain.forEach((p) => { p.face(1); p.say('!', 1); });
    yield 1.0;
    fish.dead = true;
    let back = false;
    S.fling((ctx) => SD.drawFish(ctx, 110, '#5f8fc0', 0.6), () => bigLand, () => [holes[2].x, holes[2].y], 1.0, 160, () => { back = true; });
    yield* S.until(() => back, 3);
    w.puff(holes[2].x, holes[2].y, 16, 18, 1.2, 1.6);
    yield 0.8;
    yield* cheerAll(S, [...chain], 2.2, 5);
    lineProp.dead = true;
    yield 0.8;
    yield* S.exitAll(chain, 60);
  }

  // =====================================================================
  // BLIZZARD — battle the wind, chase hats, huddle, one long scarf
  // =====================================================================
  function* sceneBlizzard(S) {
    const w = S.w, r = S.r;
    S.weather = true;
    const wd = r.sign(); // wind blows toward +wd
    w.snowfall = 1.0;
    yield* S.tween(4, (u) => { w.windBase = lerp(8, wd * 120, SD.smooth(u)); w.snowfall = lerp(1.0, 1.7, u); w.haze = 0.22 * u; w.gale = 0.32 * u; });
    const cap = S.spawn({ x: wd > 0 ? S.offR : S.offL, kind: 'captain', lane: 18, facing: -wd });
    const n = S.crewSize - 1;
    const crew = [];
    for (let i = 0; i < n; i++) crew.push(S.spawn({ x: (wd > 0 ? S.offR : S.offL) + wd * (70 + i * 60), lane: 12 + (i % 4) * 3, facing: -wd }));
    const all = [cap, ...crew];
    all.forEach((p) => { p.action = 'push'; });
    // trudging into the wind
    const goal = (i) => S.cx + wd * (i - all.length / 2) * 70;
    const walks = all.map((p, i) => S.run(S.walk(p, goal(i), 24)));
    // gusts
    const gust = function* (power = 220) {
      const b = w.windBase;
      yield* S.tween(0.4, (u) => { w.windBase = lerp(b, wd * power, u); });
      all.forEach((p) => { if (!p.attach && !p.air) { p.x += wd * 4; } });
      yield 0.9;
      yield* S.tween(0.6, (u) => { w.windBase = lerp(wd * power, b, u); });
    };
    yield 5;
    // a hat flies off; its owner chases it
    const hatGuy = crew.find((p) => p.kind === 'crew' || p.kind === 'chubby') || cap;
    S.run(gust(260));
    yield 0.5;
    hatGuy.hatOff = true;
    const hat = S.add(new SD.FlyingHat(w, hatGuy));
    hatGuy.say('!', 1);
    yield 0.6;
    hatGuy.action = 'none'; hatGuy.target = null;
    yield* S.until(() => Math.abs(hat.x - hatGuy.x) > 200, 3);
    yield* S.walk(hatGuy, clamp(hat.x, S.ax0 + 60, S.ax1 - 60), 140);
    hatGuy.goTo(hat.x, 160);
    yield* S.until(() => Math.abs(hat.x - hatGuy.x) < 30 || hat.x < S.ax0 + 40 || hat.x > S.ax1 - 40, 6);
    hat.held = () => hatGuy.handWorld('F');
    hatGuy.action = 'hold';
    yield 0.5;
    hat.dead = true; hatGuy.hatOff = false; hatGuy.hatLift.kick(-120); hatGuy.say('heart', 1);
    hatGuy.action = 'push';
    S.run(S.walk(hatGuy, goal(all.indexOf(hatGuy)), 30));
    yield 2;
    // the little one gets blown away — and caught
    const pip = crew.find((p) => p.kind === 'pip') || crew[crew.length - 1];
    S.run(gust(280));
    yield 0.4;
    pip.target = null; pip.loco = 'scrabble'; pip.vx = wd * 180; pip.friction = 0.6; pip.action = 'flail';
    yield 0.9;
    cap.target = null; cap.action = 'reach';
    yield* S.walk(cap, pip.x - wd * 40, 140);
    pip.vx = 0; pip.loco = 'stand';
    pip.attach = () => { const [hx, hy] = cap.handWorld('F'); return { x: hx + wd * 10, y: S.ground(hx) + pip.lane }; };
    pip.action = 'hug'; pip.say('heart', 1.4);
    yield 1.2;
    yield* S.until(() => walks.every((c) => c.done) || true, 0);
    // huddle up
    const hx0 = S.cx;
    // two rows, staggered: each penguin overlaps only the ones in the other row, so every face shows
    const ROW = [10, 22];
    const spots = all.map((p, i) => hx0 + (i - (all.length - 1) / 2) * 36);
    pip.attach = null;
    all.forEach((p) => { p.snug = true; }); // a huddle is meant to be tight
    yield all.map((p, i) => S.run((function* () { p.action = 'push'; p.laneT = ROW[i % 2]; yield* S.walk(p, spots[i], 40); p.face(p.x < hx0 ? 1 : -1); p.action = 'shiver'; })()));
    let huddle = true;
    S.run((function* () {
      // snow piles on their heads; the upwind penguin keeps cycling round to the sheltered side
      while (huddle) {
        all.forEach((p) => { p.snowCap = Math.min(1, (p.snowCap || 0) + S.dt * 0.06); });
        yield 0;
      }
    })());
    for (let k = 0; k < 3; k++) {
      yield 3;
      const sorted = all.slice().sort((a, b) => (a.x - b.x) * wd);
      const p = sorted[0];
      const tail = sorted[sorted.length - 1];
      p.action = 'push'; p.laneT = 4; // round the back
      yield* S.walk(p, tail.x + wd * 36, 45);
      p.face(-wd); p.action = 'shiver'; p.laneT = tail.laneT > 16 ? ROW[0] : ROW[1];
      // everyone shuffles upwind a little to stay together
      all.forEach((q) => { if (q !== p) q.goTo(q.x + wd * 18, 20); });
      yield 1;
    }
    // the captain's long scarf
    cap.action = 'point'; whistle(S, cap, 1); yield 1;
    const scarf = S.add(new SD.LongScarf(w, all));
    all.forEach((p) => { p.action = 'hug'; });
    yield* S.tween(3, (u) => { scarf.reveal = u; });
    for (let k = 0; k < 5; k++) { const p = all[k % all.length]; w.heart(p.x, p.y - 90); yield 0.6; }
    // storm passes
    yield* S.tween(5, (u) => { w.windBase = lerp(wd * 120, 8, SD.smooth(u)); w.snowfall = lerp(1.7, 0.3, u); w.haze = 0.22 * (1 - u); w.gale = 0.32 * (1 - u); });
    huddle = false;
    all.forEach((p) => { p.snug = false; });
    S.weather = false;
    yield 1;
    // shake the snow off
    for (const p of all) {
      p.action = 'none'; p.jump(-160, 0);
      const [hx, hy] = p.headTop();
      w.puff(hx, hy + 6, 6, 9, 1, 0.8);
      p.snowCap = 0;
      yield 0.2;
    }
    scarf.dead = true;
    yield 0.6;
    // cocoa
    cap.item = SD.items.box(); cap.action = 'carryUp';
    yield 0.4;
    all.forEach((p) => { if (p !== cap) { p.item = SD.items.mug(); p.action = 'hold'; } });
    cap.item = SD.items.mug(); cap.action = 'hold';
    yield 1.2;
    all.forEach((p, i) => { p.action = i % 2 ? 'eat' : 'hold'; });
    yield 2.4;
    all.forEach((p) => { p.action = 'sway'; });
    for (let k = 0; k < 6; k++) { const p = all[k % all.length]; w.note(p.x, p.y - 80, NOTE_COLS[k % 5]); yield 0.5; }
    all.forEach((p) => { p.item = null; p.action = 'none'; });
    yield* S.exitAll(all, 60);
  }

  // =====================================================================
  // FLYING LESSONS
  // =====================================================================
  function* sceneFlying(S) {
    const w = S.w, r = S.r;
    const dir = r.sign();
    const enter = dir > 0 ? S.offL : S.offR;
    const ex = S.cx - dir * S.aw * 0.32;
    const cap = S.spawn({ x: enter, kind: 'captain', lane: 16 });
    const n = S.crewSize - 1;
    const kids = [];
    for (let i = 0; i < n; i++) kids.push(S.spawn({ x: enter - dir * (80 + i * 55), lane: 12 + (i % 3) * 3 }));
    const all = [cap, ...kids];
    const pip = byKind(kids, 'pip') || kids[0];
    const jumper = byKind(kids, 'chubby') || kids[1];
    const flyer = byKind(kids, 'rocco') || kids[2] || kids[0];
    const helpers = kids.filter((p) => p !== pip && p !== jumper && p !== flyer);
    const diggers = (helpers.length >= 2 ? helpers : kids.filter((p) => p !== jumper)).slice(0, 2);
    const row = (i) => ex + dir * (150 + i * 64);
    // ---- the captain brings the chalkboard; two of the class dig a practice hill ----
    const easel = S.add(new SD.Easel(w, enter - dir * 46, 6));
    easel.lift = 10; easel.rot = -0.16 * dir;
    let carrying = true;
    S.run((function* () { while (carrying) { easel.x = cap.x - dir * 46; yield 0; } })());
    const hillX = S.cx + dir * S.aw * 0.08, hillH = 74;
    const base = w.depthAt(hillX);
    let Hcur = 0, digging = true;
    const hillAt = (x) => base + Hcur * Math.max(0, 1 - ((x - hillX) / 120) ** 2);
    S.run((function* () { while (digging || w.depthAt(hillX) < base + Hcur - 0.5) { w.shapeToward(hillX - 130, hillX + 130, hillAt, 300, S.dt); yield 0; } })());
    const digCos = diggers.map((p, i) => S.run((function* () {
      const side = i === 0 ? -1 : 1;
      p.laneT = 14 + i * 4;
      yield* S.walk(p, hillX + side * 150, 80);
      p.item = SD.items.shovel(['#4a7fd6', '#e2413b'][i]); p.face(-side); p.action = 'shovel';
      while (Hcur < hillH) {
        let thrown = false;
        const item = p.item;
        yield* S.tween(1.3 + i * 0.12, (u) => {
          p.cyc = u;
          if (item) item.full = u > 0.3 && u < 0.62 ? 1 : 0;
          if (u >= 0.62 && !thrown) {
            thrown = true;
            const [hx, hy] = p.localToWorld(30, -105);
            const tx = hillX + S.r.range(-45, 45), ty = w.surfaceY(tx);
            const T = 0.75, gg = 900;
            w.chunk(hx, hy, (tx - hx) / T, (ty - hy - 0.5 * gg * T * T) / T, 5.5, () => { Hcur = Math.min(hillH, Hcur + 5.5); });
          }
        });
        // shuffle a step closer as the pile grows
        if (Math.abs(p.x - hillX) > 128) p.x -= side * 2;
      }
      p.action = 'none'; p.item = null; p.cyc = 0;
    })()));
    yield* S.walk(cap, ex + dir * 46, 70);
    carrying = false;
    cap.face(-dir); cap.action = 'plant';
    yield* S.tween(0.45, (u) => { easel.lift = 10 * (1 - u); easel.rot = -0.16 * dir * (1 - SD.easeOut(u)); });
    w.puff(easel.x, easel.y, 4, 9, 0.8, 0.5);
    cap.action = 'none'; cap.face(dir);
    const rest = kids.filter((p) => !diggers.includes(p));
    yield rest.map((p) => S.run((function* () { yield* S.walk(p, row(kids.indexOf(p)), 70); p.face(-dir); })()));
    yield digCos;
    digging = false;
    yield diggers.map((p) => S.run((function* () { p.laneT = 12 + (kids.indexOf(p) % 3) * 3; yield* S.walk(p, row(kids.indexOf(p)), 80); p.face(-dir); })()));
    // lesson
    cap.face(-dir); cap.action = 'point'; easel.page = 1; yield 1.6;
    cap.face(dir); whistle(S, cap); yield 1;
    cap.action = 'flap'; for (let k = 0; k < 2; k++) { cap.jump(-180, 0); yield 0.6; }
    cap.action = 'none'; yield 0.6;
    // the class tries
    kids.forEach((p) => { p.action = 'flap'; });
    for (let k = 0; k < 3; k++) { kids.forEach((p) => p.jump(-150 - S.r() * 40, 0)); yield 0.7; }
    // the little one actually hovers... for a moment
    kids.forEach((p) => { if (p !== pip) p.action = 'none'; });
    const gy = pip.groundY();
    let hov = 0;
    pip.attach = () => ({ x: pip.x, y: gy - hov });
    pip.eyeOverride = 'wide';
    yield* S.tween(0.8, (u) => { hov = 60 * SD.easeOut(u); });
    kids.forEach((p) => { if (p !== pip) { p.face(Math.sign(pip.x - p.x) || 1); p.action = 'lookUp'; } });
    pip.say('!', 1);
    yield 1.1;
    pip.action = 'none'; pip.eyeOverride = null;
    yield* S.tween(0.25, (u) => { hov = 60 * (1 - SD.easeIn(u)); });
    pip.attach = null; pip.loco = 'sit'; w.puff(pip.x, gy, 5, 9); pip.dizzy = 1.6;
    yield 1.8; pip.loco = 'stand';
    kids.forEach((p) => { p.action = 'clap'; }); yield 1.2; kids.forEach((p) => { p.action = 'none'; p.face(-dir); });
    // the hill launch — a belly flop
    jumper.laneT = 0.5;
    yield* S.walk(jumper, hillX - dir * 115, 70);
    yield* S.walk(jumper, hillX, 55);
    jumper.action = 'flap'; jumper.say('!', 0.8);
    jumper.jump(-360, dir * 150);
    let landed = false;
    jumper.onLand = () => { landed = true; };
    yield* S.until(() => landed, 4);
    jumper.action = 'none'; jumper.loco = 'prone'; jumper.vx = dir * 120; jumper.friction = 1.4; jumper.kick = 0.4;
    w.puff(jumper.x, jumper.y, 12, 16, 1.2, 0.9);
    yield* S.until(() => Math.abs(jumper.vx) < 10, 4);
    jumper.vx = 0; yield 0.6; jumper.loco = 'stand'; jumper.kick = 0; jumper.dizzy = 1.4; jumper.laneT = 13;
    yield 1.4;
    S.run(S.walk(jumper, row(kids.indexOf(jumper)), 60)); // back to the class, out of the way
    // the seesaw: two of the class fetch it and carry it in over their heads; everyone else watches
    // from well behind where it'll go (and where Rocco will land)
    const ssx = hillX + dir * 210;
    const low = -dir; // the hill-side end
    const watchers = kids.filter((p) => p !== flyer && p !== jumper);
    const porters = watchers.slice(0, 2);
    watchers.forEach((p, j) => { if (!porters.includes(p)) { p.laneT = 5 + (j % 2) * 3; p.goTo(ssx + dir * (330 + j * 46), 75); } });
    const far = S.side(dir) + dir * 60;
    yield porters.map((p) => S.run(S.walk(p, far, 90)));
    const ss = S.add(new SD.Seesaw(w, far, 10));
    ss.lift = 70; ss.target = 0; ss.ws.x = 0;
    porters.forEach((p, i) => { p.laneT = 12; p.x = far + (i ? 1 : -1) * 48; p.action = 'carryUp'; });
    let porting = true;
    S.run((function* () { while (porting) { ss.x = (porters[0].x + porters[1].x) / 2; yield 0; } })());
    yield porters.map((p, i) => S.run(S.walk(p, ssx + (i ? 1 : -1) * 48, 60)));
    porting = false;
    yield* S.tween(0.6, (u) => { ss.lift = 70 * (1 - SD.easeIn(u)); });
    ss.target = 0.28 * low; w.puff(ssx, ss.y, 5, 10, 1, 0.5);
    // the porters step out in front of the seesaw, then round to join the others at the back
    yield porters.map((p, j) => S.run((function* () {
      p.action = 'none'; p.laneT = 17;
      yield* S.walk(p, ssx + dir * (150 + j * 30), 70);
      p.laneT = 6 + j * 3;
      yield* S.walk(p, ssx + dir * (420 + j * 46), 75);
    })()));
    yield* S.until(() => watchers.every((p) => p.arrived()), 8);
    watchers.forEach((p) => p.face(-dir));
    // Rocco climbs onto the far end (standing on the plank, so in front of it); his weight tips it down
    flyer.laneT = 18; // round the front of the plank
    yield* S.walk(flyer, ss.end(-low)[0] + dir * 34, 70);
    flyer.lane = flyer.laneT = ss.lane + 1;
    yield* S.hop(flyer, () => ss.end(-low), 0.5, 30, true);
    ss.target = -0.28 * low;
    flyer.face(-dir); flyer.loco = 'stand';
    if (flyer.kind === 'rocco') { flyer.shadesDown = 1; }
    yield 0.8;
    // the jumper climbs the hill and drops onto the raised end
    yield* S.walk(jumper, hillX - dir * 115, 70); jumper.laneT = 0.5;
    yield* S.walk(jumper, hillX, 50);
    jumper.lane = jumper.laneT = ss.lane + 1;
    yield* S.hop(jumper, () => ss.end(low), 0.8, 60, true);
    ss.target = 0.28 * low; ss.ws.v = 6 * low; w.puff(ss.end(low)[0], ss.end(low)[1] + 26, 6, 10);
    yield 0.06;
    // launch: one tucked somersault, timed to the flight so it finishes exactly as he lands
    const vy0 = -720, vx0 = dir * 140, G = 1250;
    const y0 = flyer.y, gyLand = S.ground(flyer.x + vx0 * 1.2) + flyer.lane;
    const T = (-vy0 + Math.sqrt(vy0 * vy0 + 2 * G * (gyLand - y0))) / G;
    flyer.attach = null; flyer.loco = 'air'; flyer.action = 'tuck';
    flyer.jump(vy0, vx0);
    let fl = false;
    flyer.onLand = () => { fl = true; };
    const t0 = S.sc.t;
    S.run((function* () {
      while (!fl) {
        const u = clamp((S.sc.t - t0) / T, 0, 1);
        // slow out of the launch, spin fast at the top, open out for the landing
        flyer.rot = dir * TAU * (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u));
        flyer.action = u > 0.82 ? 'armsOut' : 'tuck';
        yield 0;
      }
      flyer.rot = 0;
    })());
    yield* S.until(() => fl, 4);
    flyer.rot = 0; flyer.loco = 'stand'; flyer.action = 'cool'; flyer.land.kick(-6);
    w.puff(flyer.x, flyer.y, 6, 10);
    flyer.laneT = 12;
    kids.forEach((p) => { if (p !== flyer) { p.face(Math.sign(flyer.x - p.x) || 1); p.action = 'clap'; } });
    yield 2;
    flyer.action = 'none';
    // the jumper hops off the plank, out in front of it
    jumper.lane = jumper.laneT = 18;
    yield* S.hop(jumper, () => [ss.x - dir * 96, S.ground(ss.x - dir * 96) + 18], 0.5, 30);
    kids.forEach((p) => { p.action = 'none'; });
    // balloons
    const lofty = kids.find((p) => p !== pip && p !== jumper && p !== flyer) || pip;
    yield* S.walk(cap, lofty.x - dir * 50, 60);
    cap.face(dir); cap.item = SD.items.balloons(); cap.action = 'hold';
    yield 0.8;
    const bal = cap.item; cap.item = null; cap.action = 'none';
    lofty.item = bal; lofty.action = 'wave';
    const g0 = lofty.groundY();
    let lift = 0, drift = 0;
    lofty.attach = () => ({ x: lofty._bx + drift, y: g0 - lift });
    lofty._bx = lofty.x;
    yield* S.tween(4, (u) => { lift = 230 * SD.easeInOut(u); drift = Math.sin(u * 3) * 40 + w.wind * u * 0.6; });
    cap.say('!', 1); whistle(S, cap, 2);
    // they run to stand under him: spread out across the stage and in depth, and never off the edge
    kids.forEach((p, i) => { if (p !== lofty) { p.action = 'lookUp'; p.laneT = 16 + i * 4.5; p.goTo(clamp(lofty._bx + drift + (i - kids.length / 2) * 52 + S.r.range(-12, 12), S.ax0 + 70, S.ax1 - 70), 90); } });
    for (let k = 0; k < 4; k++) {
      yield 0.9;
      bal.pops++;
      const [hx, hy] = lofty.handWorld('F');
      w.sparkle(hx, hy - 70, 4, '#ffffff', 6); w.puff(hx, hy - 70, 2, 6, 1, 0.4);
      const l0 = lift;
      yield* S.tween(0.9, (u) => { lift = l0 - 55 * u; });
    }
    yield* S.tween(1, (u) => { lift = Math.max(0, lift * (1 - u)); });
    lofty.attach = null; lofty.x = lofty._bx + drift; lofty.y = lofty.groundY(); lofty.item = null; lofty.action = 'cheer';
    yield 1.4; lofty.action = 'none';
    // umbrella glide off the hill
    const glider = kids.find((p) => p !== lofty && p !== jumper) || kids[0];
    kids.forEach((p) => { if (p !== glider) { p.action = 'none'; } });
    glider.laneT = 0.5;
    yield* S.walk(glider, hillX - dir * 115, 70);
    yield* S.walk(glider, hillX, 50);
    glider.face(-dir); glider.item = SD.items.umbrella('#3c7fd8'); glider.item.open = 0; glider.action = 'carryUp';
    yield* S.tween(0.6, (u) => { glider.item.open = u; });
    glider.armF = PI - 0.25;
    const sx0 = glider.x, sy0 = glider.y;
    let k2 = 0;
    glider.face(-dir); // off the class side of the hill, well away from the seesaw
    glider.attach = () => ({ x: sx0 - dir * 260 * k2 + Math.sin(k2 * 10) * 14, y: lerp(sy0, S.ground(sx0 - dir * 260 * k2) + 12, SD.smooth(k2)) - Math.sin(k2 * PI) * 50, rot: Math.sin(k2 * 10) * 0.12 });
    yield* S.tween(4.5, (u) => { k2 = u; });
    glider.attach = null; glider.rot = 0; glider.y = glider.groundY(); glider.laneT = 13;
    glider.armF = null; glider.item = null;
    kids.forEach((p) => { if (p !== glider) { p.face(Math.sign(glider.x - p.x) || 1); p.action = 'clap'; } });
    // a gold star for the class
    yield* S.walk(cap, glider.x - dir * 50, 60);
    cap.face(dir);
    S.finale(); glider.item = SD.items.star(); glider.action = 'cheer';
    w.sparkle(glider.x, glider.y - 120, 8, '#ffe066', 8);
    yield 2;
    glider.item = null;
    yield* cheerAll(S, all, 1.6, 4);
    // the hill, board and seesaw stay where they are: the blizzard tidies up
    yield* S.exitAll(all, 62);
  }

  // =====================================================================
  // WINDOW PARKOUR — the tops of your real windows become the course
  // =====================================================================
  function parkourCourse(w, area) {
    const ls = w.ledges.filter((L) => L.x1 > area.x0 + 30 && L.x0 < area.x1 - 30 && L.x1 - L.x0 > 110 && L.y > 160 && L.y < w.surfaceY((L.x0 + L.x1) / 2) - 150);
    if (!ls.length) return null;
    ls.sort((a, b) => a.x0 - b.x0);
    // longest chain of ledges you can jump between
    let best = null;
    for (let i = 0; i < ls.length; i++) {
      const ch = [ls[i]];
      for (let j = i + 1; j < ls.length; j++) {
        const c = ch[ch.length - 1], L = ls[j];
        const gap = L.x0 - c.x1, dy = c.y - L.y; // dy > 0 means next is higher
        if (gap > -20 && gap < 360 && dy < 220 && dy > -320) ch.push(L);
      }
      if (!best || ch.length > best.length || (ch.length === best.length && ch[0].y > best[0].y)) best = ch;
    }
    return best;
  }
  SD.parkourCourse = parkourCourse;
  function ledgeTop(L, x) {
    const i = clamp(Math.floor((x - L.x0) / L.bin), 0, L.n - 1);
    return L.y - L.h[i];
  }
  function* sceneParkour(S) {
    const w = S.w, r = S.r;
    const course = parkourCourse(w, { x0: S.ax0, x1: S.ax1 });
    if (!course) { yield* SD.SCENES.flying.fn(S); return; }
    const first = course[0], last = course[course.length - 1];
    const tx = clamp(first.x0 - 60, S.ax0 + 60, S.ax1 - 60);
    const tramp = S.add(new SD.Trampoline(w, tx, 14)); tramp.alpha = 0;
    const cap = S.spawn({ x: S.offL, kind: 'captain', lane: 18 });
    const n = Math.min(S.crewSize - 1, 4);
    const runners = [];
    for (let i = 0; i < n; i++) runners.push(S.spawn({ x: S.offL - 70 - i * 60, lane: 12 + i * 2 }));
    yield* S.walk(cap, tx + 90, 70);
    cap.face(-1);
    yield* S.tween(0.6, (u) => { tramp.alpha = u; });
    w.puff(tx, tramp.y, 4, 10);
    yield runners.map((p, i) => S.run(S.walk(p, tx - 110 - i * 52, 70)));
    runners.forEach((p) => p.face(1));
    cap.action = 'point'; yield 1; cap.action = 'none';
    // run one penguin along the course
    function* run(p, idx) {
      p.laneT = 30;
      yield* S.walk(p, tx - 40, 80);
      yield* S.hop(p, () => tramp.top(), 0.45, 30, true);
      p.loco = 'stand';
      for (const hgt of [70, 110]) {
        tramp.dip.kick(260); w.puff(tx, tramp.y - 20, 2, 6);
        const [bx, by] = tramp.top();
        let u0 = 0;
        p.attach = () => ({ x: bx, y: tramp.top()[1] - Math.sin(u0 * PI) * hgt });
        p.action = 'armsUp';
        yield* S.tween(0.55, (u) => { u0 = u; });
      }
      tramp.dip.kick(320);
      // launch up onto the first window
      const startX = first.x0 + 22;
      p.action = idx % 2 ? 'armsOut' : 'armsUp';
      const lift = Math.max(60, tramp.top()[1] - ledgeTop(first, startX) + 50);
      yield* S.hop(p, () => [startX, ledgeTop(first, startX)], 0.75, lift, true);
      p.action = 'none';
      for (let k = 0; k < course.length; k++) {
        const L = course[k];
        // run along the top, kicking snow off the edge
        let px = Math.max(p.x, L.x0 + 18);
        const endX = L.x1 - 18;
        p.attach = () => ({ x: px, y: ledgeTop(L, px) + 1 });
        p.loco = 'walk'; p.face(1);
        while (px < endX) {
          px = Math.min(endX, px + 125 * S.dt);
          p.phase += 0.45;
          const i = clamp(Math.floor((px - L.x0) / L.bin), 0, L.n - 1);
          if (L.h[i] > 1.5) {
            for (let j = Math.max(0, i - 3); j <= Math.min(L.n - 1, i + 3); j++) L.h[j] *= 0.9;
            if (S.r() < 0.18) w.chunk(px, L.y - 2, S.r.range(-30, 30), -40, 3 + S.r() * 2);
          }
          yield 0;
        }
        p.loco = 'stand';
        const next = course[k + 1];
        if (next) {
          const nx = next.x0 + 22;
          const clumsy = p.kind === 'pip' && k === 0;
          const flip = p.kind === 'rocco';
          p.action = clumsy ? 'flail' : 'armsOut';
          if (clumsy) {
            // comes up short and dangles from the edge
            const hangX = next.x0 + 4;
            yield* S.hop(p, () => [hangX, next.y + 72], 0.6, 50, true);
            p.action = 'hang'; p.say('!', 1);
            yield 1.6;
            p.attach = null; p.loco = 'air'; p.jump(0, 0);
            let down = false; p.onLand = () => { down = true; };
            yield* S.until(() => down, 3);
            w.puff(p.x, p.y, 8, 12); p.dizzy = 1.6; p.action = 'none'; p.loco = 'stand';
            p.laneT = 14;
            return;
          }
          let sp = 0;
          if (flip) S.run((function* () { const t0 = S.sc.t; while (S.sc.t - t0 < 0.7) { sp = (S.sc.t - t0) / 0.7; p.rot = sp * TAU; yield 0; } p.rot = 0; })());
          yield* S.hop(p, () => [nx, ledgeTop(next, nx)], 0.7, 60 + Math.max(0, L.y - next.y) * 0.8, true);
          p.rot = 0; p.action = 'none';
          w.puff(nx, next.y - 4, 3, 7);
        }
      }
      // dismount: wall slide or a backflip
      const ex = last.x1 + 8;
      if (idx % 2 === 0) {
        p.action = 'armsUp';
        let yy = ledgeTop(last, last.x1 - 18);
        p.attach = () => ({ x: ex, y: yy });
        const gy = S.ground(ex) + 14;
        while (yy < gy) { yy = Math.min(gy, yy + 260 * S.dt); if (S.r() < 0.3) w.sparkle(ex - 6, yy - 30, 1, '#ffffff', 4); yield 0; }
        p.attach = null;
      } else {
        const lx = Math.min(S.ax1 - 40, ex + 110);
        S.run((function* () { const t0 = S.sc.t; while (S.sc.t - t0 < 0.9) { p.rot = -((S.sc.t - t0) / 0.9) * TAU; yield 0; } p.rot = 0; })());
        yield* S.hop(p, () => [lx, S.ground(lx) + 14], 0.9, 80);
        p.rot = 0;
      }
      w.puff(p.x, p.y, 6, 10);
      S.finale(); p.laneT = 14; p.action = 'cheer';
      yield 1.2;
      p.action = 'none';
    }
    const order = runners.slice().sort((a, b) => (a.kind === 'rocco' ? -1 : b.kind === 'rocco' ? 1 : 0));
    const cos = [];
    for (let i = 0; i < order.length; i++) {
      whistle(S, cap, 1);
      cos.push(S.run(run(order[i], i)));
      yield 3.6;
    }
    yield cos;
    // scores
    yield* S.walk(cap, S.cx, 60);
    cap.face(-1);
    cap.item = SD.items.card(10, 'F'); cap.item2 = SD.items.card(9, 'B'); cap.action = 'cards';
    yield 2.2;
    cap.item = cap.item2 = null; cap.action = 'none';
    yield* cheerAll(S, [cap, ...runners], 1.6, 4);
    yield* S.tween(0.5, (u) => { tramp.alpha = 1 - u; });
    tramp.dead = true;
    yield* S.exitAll([cap, ...runners], 62);
  }

  // =====================================================================
  // TWO-SCREEN: SNOWBALL FIGHT across the gap
  // =====================================================================
  function* sceneSnowball(S) {
    const w = S.w, r = S.r, xm = S.xm;
    const L0 = S.ax0, R0 = S.ax1;
    const fL = xm - Math.min(330, (xm - L0) * 0.36), fR = xm + Math.min(330, (R0 - xm) * 0.36);
    const n = S.crewSize;
    const left = [], right = [];
    for (let i = 0; i < n; i++) {
      const p = S.spawn({ x: i % 2 ? S.offR + i * 30 : S.offL - i * 30, lane: 12 + (i % 3) * 4, kind: i === 0 ? 'captain' : 'auto' });
      (i % 2 ? right : left).push(p);
    }
    const all = [...left, ...right];
    const spotL = (k) => fL - 70 - k * 56, spotR = (k) => fR + 70 + k * 56;
    yield [...left.map((p, k) => S.run(S.walk(p, spotL(k), 80))), ...right.map((p, k) => S.run(S.walk(p, spotR(k), 80)))];
    // build the forts
    const base = w.meanDepth(L0, R0);
    const wall = (fx, h) => (x) => { const d = Math.abs(x - fx) / 36; return d < 1 ? base + h * Math.pow(1 - d * d, 0.6) : null; };
    left.forEach((p) => { p.face(1); p.action = 'plant'; }); right.forEach((p) => { p.face(-1); p.action = 'plant'; });
    let wallH = 0;
    yield* S.tween(4, (u) => { wallH = 56 * u; w.shapeToward(fL - 40, fL + 40, wall(fL, wallH), 200, S.dt); w.shapeToward(fR - 40, fR + 40, wall(fR, wallH), 200, S.dt); if (S.r() < 0.3) { w.puff(fL + S.r.range(-30, 30), S.ground(fL) + 4, 1, 8); w.puff(fR + S.r.range(-30, 30), S.ground(fR) + 4, 1, 8); } });
    all.forEach((p) => { p.action = 'hide'; });
    whistle(S, left[0], 2);
    yield 1;
    // the fight
    let fighting = true;
    const thrower = (p, foes, dir) => S.run((function* () {
      yield S.r() * 2;
      while (fighting) {
        p.action = 'hide';
        yield 1 + S.r() * 2.2;
        if (!fighting) break;
        p.action = 'none'; p.face(dir);
        p.item = SD.items.snowball(); p.action = 'hold';
        yield 0.35;
        const tgt = foes[Math.floor(S.r() * foes.length)];
        p.action = 'throw'; p.cyc = 0;
        let thrown = false;
        yield* S.tween(0.7, (u) => {
          p.cyc = u;
          if (u > 0.55 && !thrown) {
            thrown = true; p.item = null;
            const [hx, hy] = p.headTop();
            const aimX = tgt.x + S.r.range(-50, 50), aimY = tgt.y - 50;
            const T = 0.9 + Math.abs(aimX - hx) / 1400;
            const [vx, vy] = ballistic(hx, hy, aimX, aimY, T);
            w.chunk(hx, hy, vx, vy, 6.5, (lx, ly) => {
              const hit = foes.find((q) => Math.abs(q.x - lx) < 30 && q.action !== 'hide');
              if (hit) { hit.say('!', 0.8); hit.dizzy = 1.2; w.puff(hit.x, hit.y - 60, 6, 10, 1, 0.6); hit.hatLift.kick(150); }
              const fort = Math.abs(lx - fL) < 40 ? fL : Math.abs(lx - fR) < 40 ? fR : null;
              if (fort != null) { w.addSnow(lx, -30, 12); w.puff(lx, ly, 4, 9); }
            });
          }
        });
        p.action = 'none';
      }
      p.action = 'none'; p.item = null;
    })());
    const tc = [...left.map((p) => thrower(p, right, 1)), ...right.map((p) => thrower(p, left, -1))];
    yield 32;
    // the giant snowball
    const roller = byKind(all, 'chubby') || left[left.length - 1];
    const rTeam = left.includes(roller) ? left : right;
    const foes = rTeam === left ? right : left;
    const dir = rTeam === left ? 1 : -1;
    const myFort = dir > 0 ? fL : fR, foeFort = dir > 0 ? fR : fL;
    fighting = false;
    yield tc;
    roller.action = 'none';
    yield* S.hop(roller, () => [myFort + dir * 60, S.ground(myFort + dir * 60) + roller.lane], 0.7, 70);
    const ball = S.add(new SD.BigBall(w, roller.x + dir * 40, roller.lane + 1));
    roller.action = 'push'; roller.face(dir);
    foes.forEach((p) => { p.action = 'none'; });
    let bx = ball.x;
    const endX = foeFort + dir * 260;
    while ((endX - bx) * dir > 0) {
      bx += dir * 95 * S.dt;
      ball.x = bx; ball.r = Math.min(66, 12 + Math.abs(bx - (myFort + dir * 100)) * 0.09);
      ball.rot += (95 * S.dt) / ball.r * dir;
      roller.x = bx - dir * (ball.r + 26); roller.y = roller.groundY(); roller.phase += 0.25;
      if (Math.abs(bx - foeFort) < 70 && !ball.smashed) {
        ball.smashed = true;
        w.shapeToward(foeFort - 60, foeFort + 60, () => base, 1e6, 1);
        w.puff(foeFort, S.ground(foeFort) - 30, 22, 28, 1.6, 1.4);
        foes.forEach((p, k) => { p.say('!', 1); p.target = null; p.goTo(dir > 0 ? Math.min(S.ax1 - 30, p.x + 200 + k * 30) : Math.max(S.ax0 + 30, p.x - 200 - k * 30), 160); });
      }
      if (!roller.dead && Math.abs(bx - xm) < 4) roller.say('heart', 1.2);
      yield 0;
    }
    w.puff(ball.x, ball.y, 26, 30, 1.6, 1.2);
    ball.dead = true;
    S.finale(); roller.action = 'cheer'; rTeam.forEach((p) => { p.action = 'cheer'; });
    yield 2;
    // truce in the middle (one team on each screen)
    all.forEach((p) => { p.action = 'none'; });
    yield [...left.map((p, k) => S.run(S.walk(p, xm - 60 - k * 44, 80))), ...right.map((p, k) => S.run(S.walk(p, xm + 60 + k * 44, 80)))];
    left.forEach((p) => { p.face(1); p.action = 'wave'; }); right.forEach((p) => { p.face(-1); p.action = 'wave'; });
    for (let k = 0; k < 6; k++) { w.heart(xm + S.r.range(-60, 60), S.ground(xm) - 100); yield 0.35; }
    yield 1;
    yield* S.exitAll(all, 66, false);
  }

  // =====================================================================
  // TWO-SCREEN: ZIPLINE from one screen to the other
  // =====================================================================
  function* sceneZipline(S) {
    const w = S.w, r = S.r, xm = S.xm;
    const dir = r.sign();
    const L0 = S.ax0, R0 = S.ax1;
    const towerX = dir > 0 ? L0 + (xm - L0) * 0.24 : R0 - (R0 - xm) * 0.24;
    const anchorX = dir > 0 ? R0 - (R0 - xm) * 0.2 : L0 + (xm - L0) * 0.2;
    const tower = S.add(new SD.Post(w, towerX, 6, 0, true));
    const anchor = S.add(new SD.Post(w, anchorX, 6, 0, false));
    const cap = S.spawn({ x: dir > 0 ? S.offL : S.offR, kind: 'captain', lane: 16 });
    const n = S.crewSize - 1;
    const crew = [];
    for (let i = 0; i < n; i++) crew.push(S.spawn({ x: (dir > 0 ? S.offL : S.offR) - dir * (70 + i * 55), lane: 12 + (i % 3) * 3 }));
    const all = [cap, ...crew];
    yield* S.walk(cap, towerX + dir * 60, 80);
    yield crew.map((p, i) => S.run(S.walk(p, towerX - dir * (80 + i * 50), 80)));
    // raise the posts
    cap.action = 'plant';
    yield* S.tween(2.4, (u) => { tower.h = 300 * SD.backOut(u); anchor.h = 70 * SD.backOut(u); if (S.r() < 0.2) w.puff(towerX, tower.y, 1, 8); });
    cap.action = 'none';
    // a soft landing pile at the far end
    w.addSnow(anchorX + dir * 70, 2600, 46);
    const deck = () => [towerX, tower.y - tower.h];
    const A = [towerX + dir * 22, tower.y - tower.h - 44];
    const B = [anchorX, anchor.y - anchor.h];
    const mast = S.add({ x: towerX, y: 0, lane: 6.5, alpha: 1, dead: false, update() {}, draw(ctx) { ctx.save(); ctx.strokeStyle = '#151b2b'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(A[0], deck()[1]); ctx.lineTo(A[0], A[1]); ctx.stroke(); ctx.strokeStyle = '#9b6a3d'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#58606e'; ctx.beginPath(); ctx.arc(A[0], A[1], 4, 0, TAU); ctx.fill(); ctx.restore(); } });
    const cable = S.add(new SD.Cable(w, A, B, 60));
    const ladder = S.add(new SD.Ladder(w, towerX - dir * 74, S.ground(towerX - dir * 74) + 4, towerX - dir * 14, tower.y - tower.h + 4, 5.5));
    whistle(S, cap, 2);
    yield 1;
    const xToU = (x) => (x - A[0]) / (B[0] - A[0]);
    const hangOffset = (p) => 108 * p.size * p.K.ky;
    function* climbUp(p) {
      yield* S.walk(p, ladder.ax, 70);
      yield* S.climb(p, [ladder], ladder.len * 0.98, 60);
      p.attach = () => { const [x, y] = deck(); return { x: x + dir * 4, y: y - 2 }; };
      p.loco = 'stand'; p.face(dir); p.ld = null; p.onChain = null; p.laneT = 7;
      yield 0.4;
    }
    function* ride(p, opts = {}) {
      p.action = 'hang'; p.item = SD.items.handle();
      const load = opts.heavy ? 90 : 30;
      let u = 0.02, v = 0;
      const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
      p.attach = () => { const [x, y] = cable.point(u); return { x, y: y + hangOffset(p) }; };
      p.laneT = 8;
      const stopU = opts.stopAt != null ? opts.stopAt : 2;
      while (u < 0.985) {
        const [x0, y0] = cable.point(Math.max(0, u - 0.01)), [x1, y1] = cable.point(Math.min(1, u + 0.01));
        const slope = (y1 - y0) / Math.max(1e-3, Math.hypot(x1 - x0, y1 - y0));
        v += (slope * 900 - v * 0.35) * S.dt;
        if (u > stopU - 0.08 && opts.stopAt != null) v *= 0.92;
        v = Math.max(v, opts.stopAt != null && u > stopU - 0.02 ? 0 : 40);
        u += (v / len) * S.dt;
        cable.load = load; cable.loadU = u;
        p.rot = -dir * clamp(v / 2500, 0, 0.25) + Math.sin(S.sc.t * 3) * 0.03;
        if (opts.squeal && S.r() < 0.05) w.note(p.x, p.y - 100, NOTE_COLS[0]);
        if (opts.stopAt != null && u >= stopU - 0.02 && v < 5) return u;
        yield 0;
      }
      return 1;
    }
    function* land(p, bury) {
      p.attach = null; p.item = null; p.action = 'armsUp'; p.rot = 0;
      cable.load = 0;
      p.jump(-200, dir * 160);
      let done = false; p.onLand = () => { done = true; };
      yield* S.until(() => done, 3);
      w.puff(p.x, p.y, 10, 16, 1.2, 1.1);
      if (bury) {
        p.sinkClip = true; p.rot = dir * PI * 0.92; p.loco = 'prone'; p.kick = 1;
        const bx = p.x; p.attach = () => ({ x: bx, y: S.ground(bx) - 12 });
        yield 1.4;
        p.attach = null; p.sinkClip = false; p.loco = 'stand'; p.kick = 0;
        yield* S.tween(0.25, (u) => { p.rot = dir * PI * 0.92 * (1 - u); });
        p.jump(-260, 0); w.puff(p.x, p.y, 6, 10);
        yield* S.until(() => !p.air, 2);
      }
      S.finale(); p.action = 'cheer'; yield 1; p.action = 'none';
      p.laneT = 14;
      yield* S.walk(p, anchorX + dir * 160 + S.r.range(-40, 40), 70);
      p.face(-dir);
    }
    // rider 1: cool
    const cool = byKind(crew, 'rocco') || crew[0];
    yield* climbUp(cool);
    if (cool.kind === 'rocco') cool.shadesDown = 1;
    yield* ride(cool);
    yield* land(cool, false);
    // rider 2: little and squeaky
    const tiny = byKind(crew, 'pip') || crew[1] || crew[0];
    yield* climbUp(tiny);
    yield* ride(tiny, { squeal: true });
    yield* land(tiny, true);
    // rider 3: heavy — stops right over the gap between the screens
    const heavy = byKind(crew, 'chubby') || crew[crew.length - 1];
    yield* climbUp(heavy);
    const um = clamp(xToU(xm), 0.3, 0.75);
    const stuckU = yield* ride(heavy, { heavy: true, stopAt: um });
    heavy.say('!', 1.2); heavy.eyeOverride = 'wide';
    const others = all.filter((p) => p !== heavy && !p.attach);
    others.forEach((p) => { p.face(Math.sign(heavy.x - p.x) || 1); p.action = 'lookUp'; });
    yield 2.4;
    heavy.say('?', 1.2);
    yield 1.4;
    // rescue: someone zips down and bumps him along
    const rescuer = crew.find((p) => p !== heavy && p !== cool && p !== tiny) || cap;
    rescuer.action = 'none';
    yield* climbUp(rescuer);
    let u2 = 0.02, uh = stuckU;
    rescuer.action = 'hang'; rescuer.item = SD.items.handle();
    rescuer.attach = () => { const [x, y] = cable.point(u2); return { x, y: y + hangOffset(rescuer) }; };
    while (u2 < uh - 0.03) { u2 += 0.32 * S.dt; yield 0; }
    heavy.say('heart', 1); heavy.eyeOverride = 'happy';
    w.sparkle(heavy.x, heavy.y - 100, 4, '#ffd43b', 6);
    heavy.attach = () => { const [x, y] = cable.point(uh); return { x, y: y + hangOffset(heavy) }; };
    while (uh < 0.985) { uh += 0.38 * S.dt; u2 = uh - 0.04; cable.load = 110; cable.loadU = uh; yield 0; }
    S.run(land(rescuer, true));
    yield* land(heavy, true);
    heavy.eyeOverride = null;
    // the captain goes last, saluting
    others.forEach((p) => { p.action = 'none'; });
    yield* climbUp(cap);
    cap.say('heart', 1);
    yield* ride(cap);
    yield* land(cap, false);
    whistle(S, cap, 2);
    yield* cheerAll(S, all, 1.6, 4);
    yield* S.tween(0.6, (u) => { for (const pr of [tower, anchor, cable, ladder, mast]) pr.alpha = 1 - u; });
    for (const pr of [tower, anchor, cable, ladder, mast]) pr.dead = true;
    yield* S.exitAll(all, 62);
  }

  // =====================================================================
  // TWO-SCREEN: TUG-OF-WAR over the gap
  // =====================================================================
  function* sceneTug(S) {
    const w = S.w, r = S.r, xm = S.xm;
    const cap = S.spawn({ x: S.offL, kind: 'captain', lane: 4 });
    const n = Math.max(4, S.crewSize - 1);
    const left = [], right = [];
    for (let i = 0; i < n; i++) {
      const p = S.spawn({ x: i % 2 ? S.offR + i * 30 : S.offL - 60 - i * 30, lane: 16 + (i % 2) * 2 });
      (i % 2 ? right : left).push(p);
    }
    // the heaviest one anchors the end of a team
    const anchorP = byKind([...left, ...right], 'chubby');
    for (const team of [left, right]) {
      const i = team.indexOf(anchorP);
      if (i >= 0) { team.splice(i, 1); team.push(anchorP); }
    }
    const pullers = [...left, ...right];
    const mark = S.add(new SD.Mark(w, xm + 14, 10)); // just off the join, so the whole flag shows
    const baseL = (k) => xm - 120 - k * 72, baseR = (k) => xm + 120 + k * 72;
    S.run(S.walk(cap, xm - 54, 70));
    yield [...left.map((p, k) => S.run(S.walk(p, baseL(k), 80))), ...right.map((p, k) => S.run(S.walk(p, baseR(k), 80)))];
    left.forEach((p) => p.face(1)); right.forEach((p) => p.face(-1));
    yield* S.until(() => cap.arrived(), 10);
    cap.face(1);
    // the rope runs through everyone's flippers
    let off = 0, snapped = false;
    const rope = S.add(new SD.Rope(w, () => {
      if (snapped) return [];
      const pts = pullers.map((p) => (p === anchorP ? p.localToWorld(8, -42) : p.handWorld('F'))).sort((a, b) => a[0] - b[0]);
      const li = left.length;
      const mid = [(pts[li - 1][0] + pts[li][0]) / 2, (pts[li - 1][1] + pts[li][1]) / 2 + 6];
      rope.flag = mid;
      return [...pts.slice(0, li), mid, ...pts.slice(li)];
    }));
    pullers.forEach((p) => { p.action = 'pull'; });
    if (anchorP) anchorP.action = 'pull';
    cap.action = 'point'; yield 1; whistle(S, cap, 3); yield 0.8; cap.action = 'none';
    let pulling = true;
    S.run((function* () {
      while (pulling) {
        left.forEach((p, k) => { if (!p.attach && !p.air) { p.x = baseL(k) + off; p.y = p.groundY(); } });
        right.forEach((p, k) => { if (!p.attach && !p.air) { p.x = baseR(k) + off; p.y = p.groundY(); } });
        // the referee keeps near the ribbon, behind the rope and clear of both front pullers, but never
        // right on the join between the screens (he'd be cut in half by the bezels)
        let rx = xm + off;
        if (Math.abs(rx - xm) < 54) rx = xm + (off >= 0 ? 54 : -54);
        if (Math.abs(cap.x - rx) > 6) cap.goTo(rx, 90);
        pullers.forEach((p) => { p.phase += Math.abs(off - (p._lo ?? off)) * 0.5; p._lo = off; });
        yield 0;
      }
    })());
    const heave = function* (to, dur) { const o0 = off; yield* S.tween(dur, (u) => { off = lerp(o0, to, SD.easeInOut(u)) + Math.sin(u * 40) * 2; }); };
    yield* heave(50, 2.2);
    yield* heave(-30, 2.0);
    yield* heave(70, 2.4);
    // someone gets yanked off their feet
    const yanked = (byKind(right, 'pip') || right[0]);
    const yTeam = right.includes(yanked) ? right : left;
    yanked.say('!', 1);
    yield* heave(off - 90 * (yTeam === right ? 1 : -1), 1.4);
    yield* heave(off - 40 * (yTeam === right ? 1 : -1), 1.2);
    // the anchor plants himself
    if (anchorP) { anchorP.say('!', 1); anchorP.action = 'pull'; anchorP.p.crouch = 1; }
    const aTeamLeft = anchorP ? left.includes(anchorP) : true;
    yield* heave(aTeamLeft ? -80 : 80, 2.6);
    cap.action = 'clap';
    yield* heave(aTeamLeft ? 60 : -60, 2.6);
    yield* heave(aTeamLeft ? -110 : 110, 2.2);
    // ...and the rope snaps
    pulling = false;
    snapped = true;
    const [fx, fy] = rope.flag || [xm, S.ground(xm) - 60];
    w.puff(fx, fy, 10, 12, 1.2, 0.8); w.sparkle(fx, fy, 6, '#ffd43b', 7);
    rope.dead = true;
    cap.action = 'startle'; cap.say('!', 1);
    pullers.forEach((p, k) => {
      const away = left.includes(p) ? -1 : 1;
      p.action = 'flail'; p.jump(-260 - S.r() * 80, away * (160 + S.r() * 120));
      p.onLand = (q) => { w.puff(q.x, q.y, 6, 12); q.dizzy = 2.6; q.action = 'none'; q.rot = 0; };
    });
    S.run((function* () { while (pullers.some((p) => p.air)) { pullers.forEach((p) => { if (p.air) p.rot += (left.includes(p) ? -1 : 1) * 0.14; }); yield 0; } pullers.forEach((p) => { p.rot = 0; }); })());
    yield* S.until(() => pullers.every((p) => !p.air), 4);
    yield 2.6;
    cap.action = 'none';
    cap.item = SD.items.card(5, 'F'); cap.item2 = SD.items.card(5, 'B'); cap.action = 'cards';
    yield 2;
    cap.item = cap.item2 = null; cap.action = 'none';
    yield* cheerAll(S, [cap, ...pullers], 2, 5);
    mark.dead = true;
    yield* S.exitAll([cap, ...pullers], 66, false);
  }

  Object.assign(SD.SCENES, {
    igloo: { name: 'Igloo Contest', fn: sceneIgloo, crew: 7 },
    fishing: { name: 'Ice Fishing', fn: sceneFishing },
    blizzard: { name: 'Blizzard', fn: sceneBlizzard, crew: 7 },
    flying: { name: 'Flying Lessons', fn: sceneFlying, crew: 6 },
    parkour: { name: 'Window Parkour', fn: sceneParkour, crew: 5, needsLedges: true },
    snowball: { name: 'Snowball Fight', fn: sceneSnowball, crew: 8, dual: true },
    zipline: { name: 'Zipline', fn: sceneZipline, crew: 6, dual: true },
    tug: { name: 'Tug-of-War', fn: sceneTug, crew: 8, dual: true },
  });
})();
