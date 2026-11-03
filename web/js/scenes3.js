// Snow Day — the giant snowman (where's Pip?) and the crew's first reindeer
'use strict';
(function () {
  const { clamp, lerp } = SD;
  const PI = Math.PI;
  const NOTE_COLS = ['#e94b5b', '#2f9e5f', '#3c7fd8', '#9a57c9', '#f08c00'];

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

  // push a snowball along, growing it as it rolls; pushers walk behind it
  function* rollBall(S, ball, pushers, toX, rTo, sp = 34) {
    const dir = Math.sign(toX - ball.x) || 1;
    const x0 = ball.x, r0 = ball.r, dist = Math.abs(toX - x0);
    pushers.forEach((p) => { p.face(dir); p.action = 'push'; p.target = null; });
    const place = () => pushers.forEach((p, i) => { p.attach = () => ({ x: ball.x - dir * (ball.r + 24 + i * 34), y: p.groundY() }); });
    place();
    while (Math.abs(toX - ball.x) > 0.5) {
      const step = Math.min(Math.abs(toX - ball.x), sp * S.dt);
      ball.roll(dir * step);
      ball.r = lerp(r0, rTo, SD.smooth(Math.abs(ball.x - x0) / dist));
      pushers.forEach((p) => { p.phase += step / 9 * PI; p.loco = 'walk'; });
      if (S.r() < 0.05) S.w.puff(ball.x - dir * ball.r * 0.6, ball.y, 1, 6, 0.6, 0.4);
      yield 0;
    }
    pushers.forEach((p) => { p.attach = null; p.loco = 'stand'; p.action = 'none'; p.y = p.groundY(); });
  }

  // =====================================================================
  // GIANT SNOWMAN — three balls, a face, a hat... and one penguin short
  // =====================================================================
  function* sceneSnowman(S) {
    const w = S.w, r = S.r;
    const dir = r.sign();
    const start = dir > 0 ? S.offL : S.offR;
    const cap = S.spawn({ x: start, kind: 'captain', lane: 18 });
    const pip = S.spawn({ x: start - dir * 70, kind: 'pip', lane: 15 });
    const n = S.crewSize - 2;
    const crew = [];
    for (let i = 0; i < n; i++) crew.push(S.spawn({ x: start - dir * (130 + i * 55), lane: 12 + (i % 3) * 3 }));
    const all = [cap, pip, ...crew];
    const sx = S.cx + dir * S.aw * 0.06; // where the snowman will stand
    // everyone in
    S.run(S.walk(cap, sx + dir * 150, 70));
    yield [pip, ...crew].map((p, i) => S.run(S.walk(p, sx - dir * (60 + i * 50), 70)));
    yield* S.until(() => cap.arrived(), 15);
    cap.face(-dir); cap.action = 'point'; yield 0.8;
    whistle(S, cap, 3); yield 1.2; cap.action = 'none';
    pip.action = 'cheer'; pip.say('heart', 1.2); yield 1; pip.action = 'none';

    // ---- 1. the base: rolled in from the far side ----
    const pushA = crew.slice(0, Math.min(2, crew.length));
    const bx0 = sx - dir * S.aw * 0.38;
    yield pushA.map((p, i) => S.run(S.walk(p, bx0 - dir * (40 + i * 26), 80)));
    const b1 = S.add(new SD.SnowBall(w, bx0, 8, 16));
    pushA.forEach((p) => { p.action = 'plant'; }); yield 0.6;
    yield* rollBall(S, b1, pushA, sx, 84, 40);
    w.puff(b1.x, b1.y, 6, 12);
    cap.action = 'clap'; yield 0.8; cap.action = 'none';

    // ---- 2. the middle: Pip packs it... and gets rolled up inside ----
    const pushB = crew.slice(Math.min(2, crew.length), Math.min(4, crew.length));
    if (!pushB.length) pushB.push(crew[0]);
    const mx0 = sx + dir * S.aw * 0.36;
    yield pushB.map((p, i) => S.run(S.walk(p, mx0 + dir * (40 + i * 26), 80)));
    const b2 = S.add(new SD.SnowBall(w, mx0, 8, 14));
    // Pip runs ahead to pat the ball as it comes
    const pipStop = mx0 - dir * 160;
    yield* S.walk(pip, pipStop, 80);
    pip.face(dir); pip.action = 'clap';
    pushB.forEach((p) => { p.action = 'plant'; }); yield 0.5;
    let swallowed = false;
    const rollB = S.run(rollBall(S, b2, pushB, sx + dir * 2, 60, 36));
    pushB.forEach((p) => { p.eyeOverride = 'closed'; }); // heads down, pushing hard
    yield* S.until(() => Math.abs(b2.x - pip.x) < b2.r * 0.75, 30);
    // gulp
    pip.say('!', 0.5); pip.eyeOverride = 'wide';
    yield 0.18;
    pip.hidden = true; pip.attach = () => ({ x: b2.x, y: pip.groundY() });
    b2.shake.kick(4); w.puff(b2.x, b2.y - b2.r, 4, 9);
    swallowed = true;
    yield rollB;
    pushB.forEach((p) => { p.eyeOverride = null; });

    // ---- 3. heave the middle ball up onto the base ----
    const lifters = [...pushB, ...pushA].slice(0, 3);
    yield lifters.map((p, i) => S.run(S.walk(p, sx + (i - 1) * 50 + dir * 10, 70)));
    lifters.forEach((p) => { p.face(Math.sign(sx - p.x) || dir); p.action = 'armsUp'; });
    for (const k of ['1', '2', '3!']) { cap.say(k, 0.6); yield 0.6; }
    const [b1x, b1y] = b1.centre();
    const restY = b1y - b1.r - b2.r * 0.82;
    const y0 = b2.centre()[1], xm0 = b2.x;
    b2.follow = false;
    yield* S.tween(0.9, (u) => { b2.x = lerp(xm0, b1x, u); b2.cy = lerp(y0, restY, SD.easeOut(u)) - Math.sin(u * PI) * 60; b2.lane = 8.5; });
    b2.cy = restY; b1.shake.kick(5); w.puff(b1x, restY + b2.r, 6, 12);
    lifters.forEach((p) => { p.action = 'cheer'; }); yield 0.9; lifters.forEach((p) => { p.action = 'none'; });

    // ---- 4. the head goes up a ladder ----
    const headR = 40;
    const b3 = S.add(new SD.SnowBall(w, b1x, 9, headR)); b3.follow = false; b3.alpha = 0;
    const carrier = byKind(crew, 'rocco') || byKind(crew, 'chubby') || crew[crew.length - 1];
    const lx = b1x - dir * (b1.r + 52);
    const L = S.add(new SD.Ladder(w, lx, S.ground(lx) + 3, b1x - dir * (b2.r * 0.7), restY - b2.r * 0.75, 7)); L.show = 0;
    const ladGuy = crew.find((p) => p !== carrier) || cap;
    ladGuy.item = SD.items.ladder(); ladGuy.action = 'carryLadder';
    yield* S.walk(ladGuy, lx - dir * 20, 70);
    ladGuy.item = null; ladGuy.action = 'plant';
    yield* S.tween(0.8, (u) => { L.show = SD.backOut(u); });
    ladGuy.action = 'none';
    carrier.item = SD.items.bigSnowball(headR * 0.62); carrier.action = 'carryUp';
    yield* S.walk(carrier, L.ax, 60);
    carrier.item = null;
    carrier.item = SD.items.bigSnowball(headR * 0.62);
    yield* S.climb(carrier, [L], L.len * 0.86, 44);
    const [tx, ty] = carrier.headTop();
    carrier.item = null; carrier.action = 'armsUp';
    const headY = restY - b2.r - headR * 0.8;
    b3.alpha = 1; b3.cy = ty - headR * 0.6; b3.x = tx; b3.r = headR;
    yield* S.tween(0.6, (u) => { b3.x = lerp(tx, b1x, u); b3.cy = lerp(ty - headR * 0.6, headY, u) - Math.sin(u * PI) * 40; });
    b3.cy = headY; b2.shake.kick(3); w.puff(b1x, headY + headR, 4, 9);
    yield 0.4;

    // ---- 5. dressing up ----
    const deco = S.add(new SD.SnowmanDeco(w, b1, b2, b3, 9.5)); deco.facing = dir;
    carrier.action = 'none';
    const specs = byKind(crew, 'specs');
    const steps = [
      ['eyes', specs || carrier, SD.items.coal()],
      ['nose', byKind(crew, 'chubby') || carrier, SD.items.carrot()],
      ['smile', specs || carrier, SD.items.coal()],
    ];
    for (const [key, who, item] of steps) {
      if (who === carrier) {
        carrier.item = item; carrier.action = 'reach'; carrier.reachTo = b3.centre();
        yield 0.5; carrier.item = null;
      } else {
        who.item = item;
        yield* S.walk(who, b1x + dir * (b1.r + 26), 70);
        who.face(-dir); who.action = 'reach'; who.reachTo = b3.centre();
        S.fling((ctx) => { if (key === 'nose') { ctx.fillStyle = '#ff8a1f'; ctx.beginPath(); ctx.moveTo(-3, -2); ctx.lineTo(16, 0); ctx.lineTo(-3, 3); ctx.closePath(); ctx.fill(); } else { ctx.fillStyle = '#22252c'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, PI * 2); ctx.fill(); } },
          () => who.handWorld('F'), () => b3.centre(), 0.45, 26);
        who.item = null;
        yield 0.45;
        who.action = 'none';
      }
      yield* S.tween(0.35, (u) => { deco[key] = u; });
      w.sparkle(b3.centre()[0], b3.centre()[1], 2, '#ffffff', 5);
      yield 0.2;
    }
    // climb down, buttons and arms from the ground
    yield* S.offLadder(carrier, [L], 14);
    carrier.action = 'none';
    const armGuy = crew.find((p) => p !== carrier && p !== specs) || cap;
    yield* S.walk(armGuy, b1x - dir * (b1.r + 30), 70);
    armGuy.face(dir); armGuy.action = 'reach'; armGuy.reachTo = b2.centre();
    yield* S.tween(0.6, (u) => { deco.buttons = u; });
    yield* S.tween(0.6, (u) => { deco.arms = SD.backOut(u); });
    armGuy.action = 'none';
    // Rocco donates his shades, the captain a scarf; then a hat from the box
    const rocco = byKind(crew, 'rocco');
    if (rocco) {
      yield* S.walk(rocco, L.ax, 60);
      yield* S.climb(rocco, [L], L.len * 0.86, 50);
      rocco.shadesDown = 0; rocco.action = 'reach'; rocco.reachTo = b3.centre();
      yield* S.tween(0.6, (u) => { deco.shades = u; });
      rocco.action = 'cool'; yield 0.8; rocco.action = 'none';
      yield* S.offLadder(rocco, [L], 13);
    } else {
      yield* S.tween(0.6, (u) => { deco.hat = u; });
    }
    yield* S.tween(0.6, (u) => { deco.scarf = u; });
    L.dead = true; w.puff(L.ax, L.ay, 3, 8);
    if (rocco) yield* S.tween(0.6, (u) => { deco.hat = u; });

    // ---- 6. admire it ----
    const others = [cap, ...crew];
    yield others.map((p, i) => S.run((function* () { yield* S.walk(p, sx + (i % 2 ? 1 : -1) * (b1.r + 60 + Math.floor(i / 2) * 50), 70); p.face(Math.sign(sx - p.x) || 1); })()));
    yield* cheerAll(S, others, 2.2, 5);
    // ---- 7. headcount ----
    yield* S.walk(cap, sx + dir * (b1.r + 40), 50);
    cap.face(-dir);
    const line = crew.slice().sort((a, b) => (a.x - b.x) * dir);
    for (let k = 0; k < line.length; k++) {
      cap.face(Math.sign(line[k].x - cap.x) || 1); cap.action = 'point';
      cap.say(String(k + 2), 0.55); // the captain counts himself first
      yield 0.6;
    }
    cap.action = 'none'; cap.say('?', 1.4); yield 1.4;
    cap.say(String(all.length) + '?', 1.2); yield 1.3;
    // where's Pip?!
    cap.say('!', 1); cap.eyeOverride = 'wide'; whistle(S, cap, 4);
    yield 0.6; cap.eyeOverride = null;
    let panic = true;
    const searchers = [cap, ...crew];
    const search = searchers.map((p, i) => S.run((function* () {
      p.action = 'flail';
      let k = 0;
      while (panic) {
        const tx2 = sx + S.r.range(-S.aw * 0.4, S.aw * 0.4);
        p.goTo(clamp(tx2, S.ax0 + 60, S.ax1 - 60), 120 + S.r() * 40);
        yield* S.until(() => p.arrived() || !panic, 4);
        if (!panic) break;
        if (k++ % 2 === 0) { p.say(S.r() < 0.5 ? '?' : '!', 0.9); }
        if (S.r() < 0.35) { // peek into a snowdrift
          p.action = 'hide'; w.puff(p.x + p.facing * 20, p.y, 3, 8); yield 0.8; p.action = 'flail';
        }
      }
      p.action = 'none'; p.target = null;
    })()));
    // the snowman's tummy starts to wobble
    for (let k = 0; k < 4; k++) {
      yield 1.3 + S.r() * 0.6;
      b2.shake.kick(5 + k * 2); deco.muffle = { text: k < 2 ? 'mmf!' : 'MMF!!', t: 0, life: 1 };
      w.puff(b2.x, b2.centre()[1], 2, 6);
    }
    yield 0.8;
    // POP
    panic = false;
    yield search;
    searchers.forEach((p) => { p.action = 'none'; p.target = null; p.face(Math.sign(sx - p.x) || 1); p.say('!', 0.8); p.eyeOverride = 'wide'; });
    deco.hole = 1; deco.mouthO = 1; deco.buttons = 1;
    const [px, py] = b2.centre();
    w.puff(px, py, 18, 22, 1.4, 1.1);
    pip.hidden = false; pip.eyeOverride = null; pip.attach = null;
    pip.x = px; pip.y = py + 20;
    pip.jump(-320, dir * 90); pip.action = 'armsUp';
    let landed = false; pip.onLand = () => { landed = true; };
    yield* S.until(() => landed, 3);
    pip.onLand = null; pip.action = 'none'; pip.dizzy = 1.6; pip.snowCap = 1;
    yield 1;
    searchers.forEach((p) => { p.eyeOverride = null; });
    // group hug
    yield searchers.map((p, i) => S.run(S.walk(p, pip.x + (i % 2 ? 1 : -1) * (34 + Math.floor(i / 2) * 26), 120)));
    searchers.forEach((p) => { p.face(Math.sign(pip.x - p.x) || 1); p.action = 'hug'; });
    pip.action = 'cheer'; pip.say('heart', 1.6);
    for (let k = 0; k < 4; k++) { w.heart(pip.x + S.r.range(-40, 40), pip.y - 90); yield 0.4; }
    yield 0.8;
    all.forEach((p) => { p.action = 'none'; });
    pip.snowCap = 0;
    // a last look at the snowman, then off
    all.forEach((p) => p.face(Math.sign(sx - p.x) || 1));
    deco.mouthO = 0; yield 1.2;
    yield* S.exitAll(all, 62);
    yield* S.tween(1.2, (u) => { const a = 1 - u; b1.alpha = b2.alpha = b3.alpha = deco.alpha = a; });
    b1.dead = b2.dead = b3.dead = deco.dead = true;
  }

  // =====================================================================
  // FIRST REINDEER — something big is coming... and it's very friendly
  // =====================================================================
  function* sceneReindeer(S) {
    const w = S.w, r = S.r;
    const dir = r.sign(); // the reindeer arrives from this side
    const crewSide = -dir;
    const cap = S.spawn({ x: S.side(crewSide), kind: 'captain', lane: 16 });
    const n = S.crewSize - 1;
    const crew = [];
    for (let i = 0; i < n; i++) crew.push(S.spawn({ x: S.side(crewSide) + crewSide * (60 + i * 50), lane: 12 + (i % 3) * 3 }));
    const all = [cap, ...crew];
    const chubby = byKind(crew, 'chubby') || crew[0];
    const pip = byKind(crew, 'pip') || crew[1] || crew[0];
    const specs = byKind(crew, 'specs');
    const rocco = byKind(crew, 'rocco');
    // a cosy cocoa break
    const spot = S.cx + crewSide * S.aw * 0.12;
    yield all.map((p, i) => S.run((function* () { yield* S.walk(p, spot + (i - all.length / 2) * 46, 70); p.face(i % 2 ? -1 : 1); p.item = SD.items.mug(); p.action = 'eat'; })()));
    yield 2.2;
    // jingle jingle... from off-screen
    for (let k = 0; k < 3; k++) { w.note(dir > 0 ? S.ax1 - 30 : S.ax0 + 30, S.ground(S.cx) - 160 - k * 20, '#e0a800'); yield 0.5; }
    all.forEach((p) => { p.action = 'none'; p.face(dir); p.say('?', 1.2); });
    yield 1.2;
    // hoof prints appear, then it walks in
    const deer = S.add(new SD.Reindeer(w, S.side(dir) + dir * 60, 9));
    deer.face(-dir);
    const stopX = spot + dir * 260;
    deer.goTo(stopX, 55);
    yield* S.until(() => deer.arrived() || Math.abs(deer.x - stopX) < 200, 20);
    all.forEach((p) => { p.say('!', 1); p.eyeOverride = 'wide'; p.item = null; });
    yield 0.5;
    // everyone hides behind Chubby
    const hiders = all.filter((p) => p !== chubby);
    chubby.laneT = 20; chubby.action = 'shiver';
    hiders.forEach((p, i) => { p.loco = 'scrabble'; p.laneT = 8 + (i % 3) * 1.5; p.goTo(chubby.x + crewSide * (14 + (i % 3) * 10) + S.r.range(-6, 6), 160); });
    yield* S.until(() => hiders.every((p) => p.arrived()), 4);
    hiders.forEach((p) => { p.loco = 'stand'; p.action = 'shiver'; p.face(dir); });
    if (rocco) rocco.shadesDown = 1;
    yield* S.until(() => deer.arrived(), 10);
    yield 0.6;
    // it lowers its head for a sniff
    deer.goTo(chubby.x + dir * 120, 30);
    yield* S.until(() => deer.arrived(), 6);
    deer.neckT = 0.75;
    yield 1.2;
    w.puff(deer.headPoint()[0] - dir * 30, deer.headPoint()[1] + 10, 5, 9, 1, 0.3);
    chubby.hatLift.kick(220); chubby.say('!', 0.8);
    yield 1;
    deer.neckT = 0;
    yield 0.8;
    // Specs looks it up
    if (specs) {
      specs.action = 'none'; specs.laneT = 22;
      yield* S.walk(specs, chubby.x + dir * 40, 50);
      specs.face(dir); specs.item = SD.items.book(); specs.action = 'hold';
      specs.tic = { n: 'glasses', t: 0, d: 0.8 };
      yield 1.6;
      specs.face(-dir); specs.say('heart', 1.2); yield 1.2;
      specs.item = null; specs.action = 'none';
    }
    // Pip offers a fish... no thank you
    pip.action = 'none'; pip.laneT = 22; pip.eyeOverride = null;
    yield* S.walk(pip, deer.x - dir * 95, 45);
    pip.face(dir); pip.item = SD.items.fish(26); pip.action = 'reach'; pip.reachTo = deer.headPoint();
    deer.neckT = 0.6; yield 0.9;
    deer.shake = 1; yield 1.1; deer.shake = 0;
    deer.neckT = 0;
    pip.item = null; pip.action = 'none'; pip.say('?', 1.2);
    yield 1.2;
    // Chubby has a carrot — yes please!
    chubby.action = 'none'; chubby.eyeOverride = null; chubby.laneT = 21;
    yield* S.walk(chubby, deer.x - dir * 110, 50);
    chubby.face(dir); chubby.item = SD.items.carrot(); chubby.action = 'reach'; chubby.reachTo = deer.headPoint();
    deer.neckT = 0.7; yield 1;
    chubby.item = null; chubby.action = 'none';
    deer.chew = 1; deer.eyeOverride = 'happy'; deer.say('heart', 1.6);
    yield 2;
    deer.chew = 0; deer.eyeOverride = null; deer.neckT = 0;
    all.forEach((p) => { p.action = 'cheer'; p.eyeOverride = null; });
    yield 1.4;
    all.forEach((p) => { p.action = 'none'; });
    // it kneels down: climb aboard!
    deer.kneelT = 1;
    yield 1.4;
    const riders = [pip, chubby, ...crew.filter((p) => p !== pip && p !== chubby)].slice(0, 4);
    for (let i = 0; i < riders.length; i++) {
      const p = riders[i];
      p.laneT = deer.lane + 1 + i * 0.1;
      yield* S.walk(p, deer.x - dir * 40, 70);
      yield* S.hop(p, () => { const [x, y] = deer.backPoint(i, riders.length); return [x, y + 6]; }, 0.6, 50, true);
      p.loco = 'sit'; p.face(-dir);
    }
    deer.kneelT = 0;
    yield 1.2;
    // a lap of the field
    riders.forEach((p) => { p.action = 'cheer'; });
    const farX = clamp(deer.x - dir * S.aw * 0.55, S.ax0 + 140, S.ax1 - 140);
    deer.goTo(farX, 120);
    yield* S.until(() => deer.arrived(), 15);
    deer.face(dir); yield 0.3;
    deer.goTo(stopX, 120);
    const hopRide = S.run((function* () { while (!deer.arrived()) { riders.forEach((p) => { p.pomY.kick(Math.sin(deer.phase) * 2); }); yield 0; } })());
    cap.action = 'clap'; crew.forEach((p) => { if (!riders.includes(p)) p.action = 'clap'; });
    yield* S.until(() => deer.arrived(), 15);
    yield hopRide;
    deer.face(-dir);
    // down the neck like a slide
    deer.neckT = 0.85;
    yield 1;
    for (let i = riders.length - 1; i >= 0; i--) {
      const p = riders[i];
      const [hx, hy] = deer.headPoint();
      const sx0 = p.x, sy0 = p.y;
      p.action = 'armsUp'; p.loco = 'stand';
      yield* S.tween(0.55, (u) => { p.attach = () => ({ x: lerp(sx0, hx - dir * 10, u), y: lerp(sy0, hy + 20, u) }); });
      p.attach = null; p.y = p.groundY(); p.jump(-200, -dir * 80); p.action = 'cheer';
      w.puff(p.x, p.groundY(), 3, 8);
      yield 0.3;
    }
    deer.neckT = 0;
    yield 1.2;
    all.forEach((p) => { p.action = 'none'; p.attach = null; p.loco = 'stand'; p.laneT = 12 + (p.id % 3) * 3; });
    // a nuzzle for Pip, then off it goes
    yield* S.walk(pip, deer.x - dir * 100, 50);
    pip.face(dir);
    deer.neckT = 0.8; yield 0.8;
    pip.action = 'hug'; deer.eyeOverride = 'happy'; deer.say('heart', 1.4); pip.say('heart', 1.4);
    yield 1.6;
    pip.action = 'none'; deer.eyeOverride = null; deer.neckT = 0;
    yield 0.6;
    all.forEach((p) => { p.face(dir); p.action = 'wave'; });
    deer.face(dir);
    deer.goTo(S.side(dir) + dir * 140, 80);
    yield* S.until(() => deer.arrived(), 20);
    deer.dead = true;
    yield 0.6;
    if (rocco) { rocco.shadesDown = 0; rocco.say('heart', 1.2); }
    all.forEach((p) => { p.action = 'none'; });
    yield* S.exitAll(all, 62, false);
  }

  Object.assign(SD.SCENES, {
    snowman: { name: 'Giant Snowman', fn: sceneSnowman },
    reindeer: { name: 'First Reindeer', fn: sceneReindeer },
  });
})();
