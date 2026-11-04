// Snow Day — scenes 4: ice hockey
'use strict';
(function () {
  const { clamp, lerp, TAU } = SD;
  const PI = Math.PI;
  const INK = '#151b2b';
  const NOTE_COLS = ['#e2413b', '#2f9e5f', '#3c7fd8', '#e0a800', '#9a57c9'];
  const BLUE = '#2f6fd1', RED = '#d6313b';
  const byKind = (list, k) => list.find((p) => p.kind === k);
  function whistle(S, p, n = 2) {
    p.action = 'none';
    p.tic = { n: 'whistle', t: 0, d: 1.1 };
    const [bx, by] = p.localToWorld(26, -64);
    for (let k = 0; k < n; k++) S.w.note(bx + k * 4, by - k * 8, NOTE_COLS[k % NOTE_COLS.length]);
  }

  // ======================= props =======================
  // a goal seen from the side: red frame, white net; the open side faces the middle of the rink
  class Goal extends SD.Prop {
    constructor(w, x, lane, open, col) { super(w, x, lane); this.open = open; this.col = col; this.bulge = new SD.Spring(0, 120, 6); this.lamp = 0; }
    update(dt) { super.update(dt); this.bulge.step(0, dt); this.lamp = Math.max(0, this.lamp - dt); }
    mouth() { return this.x + this.open * 26; }
    bbox() { return [this.x - 34, this.y - 64, this.x + 34, this.y + 4]; }
    draw(ctx) {
      const o = this.open, b = this.bulge.x;
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y); ctx.scale(o, 1);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // net: from the crossbar back and down to the base, bulging when hit
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.strokeStyle = 'rgba(120,135,160,0.7)'; ctx.lineWidth = 1;
      const net = new Path2D();
      net.moveTo(24, -52); net.quadraticCurveTo(-18 - b * 10, -46, -30 - b * 6, -6); net.lineTo(-30, 0); net.lineTo(24, 0); net.closePath();
      ctx.fill(net);
      ctx.save(); ctx.clip(net);
      for (let x = -40; x < 30; x += 7) { ctx.beginPath(); ctx.moveTo(x, -60); ctx.lineTo(x + 30, 6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 30, -60); ctx.lineTo(x, 6); ctx.stroke(); }
      ctx.restore();
      // frame
      ctx.strokeStyle = INK; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(24, -52); ctx.quadraticCurveTo(-18 - b * 10, -46, -30 - b * 6, -6); ctx.lineTo(-30, 0); ctx.lineTo(24, 0); ctx.stroke();
      ctx.strokeStyle = this.col; ctx.lineWidth = 3.6; ctx.stroke();
      // goal lamp
      if (this.lamp > 0) { ctx.fillStyle = `rgba(255,70,60,${0.5 + 0.5 * Math.abs(Math.sin(this.lamp * 14))})`; ctx.beginPath(); ctx.arc(-4, -70, 6, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#ff5a4f'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(-4, -66, 3.5, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  class Puck extends SD.Prop {
    constructor(w, x, lane) { super(w, x, lane); this.vx = 0; this.h = 0; this.vh = 0; this.carrier = null; this.friction = 0.55; this.spin = 0; }
    update(dt) {
      if (this.carrier) {
        const p = this.carrier;
        this.x = p.x + p.facing * 34 * p.size / 0.74; this.lane = p.lane + 0.5; this.vx = p.vxEst || 0; this.h = 0;
      } else {
        this.vx *= Math.max(0, 1 - this.friction * dt);
        this.x += this.vx * dt;
        this.vh -= 900 * dt; this.h = Math.max(0, this.h + this.vh * dt); if (this.h === 0) this.vh = 0;
      }
      this.spin += this.vx * dt * 0.1;
      super.update(dt);
      this.y -= this.h;
    }
    drawShadow(ctx) { if (this.h > 1) { ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#1b2a44'; ctx.beginPath(); ctx.ellipse(this.x, this.y + this.h, 7, 2.5, 0, 0, TAU); ctx.fill(); ctx.restore(); } }
    draw(ctx) {
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y);
      ctx.fillStyle = '#1a1d24'; ctx.beginPath(); ctx.ellipse(0, -2.5, 8, 3.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3a404d'; ctx.beginPath(); ctx.ellipse(0, -4, 8, 2.6, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  // the scoreboard on a post: Specs keeps it up to date
  class Scoreboard extends SD.Prop {
    constructor(w, x, lane) { super(w, x, lane); this.a = 0; this.b = 0; this.flip = 0; }
    update(dt) { super.update(dt); this.flip = Math.max(0, this.flip - dt * 2.5); }
    bbox() { return [this.x - 50, this.y - 150, this.x + 50, this.y + 4]; }
    draw(ctx) {
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(this.x, this.y); ctx.rotate(this.rot || 0);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -104); ctx.stroke();
      ctx.strokeStyle = '#8a8f99'; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = '#1e2433'; ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
      ctx.beginPath(); SD.rrect(ctx, -52, -150, 104, 52, 6); ctx.fill(); ctx.stroke();
      const s = 1 + this.flip * 0.25;
      ctx.font = '700 30px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const [x, v, col] of [[-24, this.a, BLUE], [24, this.b, RED]]) {
        ctx.save(); ctx.translate(x, -124); ctx.scale(s, s);
        ctx.fillStyle = col; ctx.beginPath(); SD.rrect(ctx, -18, -18, 36, 36, 4); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.fillText(String(v), 0, 1);
        ctx.restore();
      }
      ctx.fillStyle = '#ffffff'; ctx.font = '700 18px "Segoe UI", system-ui, sans-serif'; ctx.fillText(':', 0, -126);
      ctx.restore();
    }
  }

  // rink lines painted under the ice (flat on the ice, so they run back into the distance)
  class RinkLines extends SD.Prop {
    constructor(w, x0, x1) { super(w, (x0 + x1) / 2, 0.2); this.x0 = x0; this.x1 = x1; this.show = 0; }
    draw(ctx) {
      if (this.show <= 0) return;
      const w = this.world, cx = (this.x0 + this.x1) / 2, sy = w.surfaceY(cx);
      ctx.save(); ctx.globalAlpha = this.alpha * this.show * 0.75; ctx.lineCap = 'round';
      const line = (x, col, wd) => { ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(x - 4, w.surfaceY(x) + 2); ctx.lineTo(x + 8, w.surfaceY(x) + 46); ctx.stroke(); };
      line(cx, '#d6313b', 4);
      line(lerp(this.x0, cx, 0.45), '#2f6fd1', 4); line(lerp(this.x1, cx, 0.45), '#2f6fd1', 4);
      ctx.strokeStyle = '#2f6fd1'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.ellipse(cx + 2, sy + 24, 70, 15, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#2f6fd1'; ctx.beginPath(); ctx.ellipse(cx + 2, sy + 24, 4, 1.6, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  SD.Goal = Goal; SD.Puck = Puck; SD.Scoreboard = Scoreboard;

  // a hockey stick in the front flipper, blade on the ice in front (or wound back for a shot)
  SD.items.stick = (col) => ({ at: 'front', wind: 0, draw(ctx, p, hx, hy) {
    const it = this, k = it.wind || 0; // 0 down on the ice, 1 wound back high
    const bx = lerp(36, -40, k), by = lerp(-2, -70, k);
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(hx - 4, hy - 8); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = '#c99a5b'; ctx.lineWidth = 3.6; ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(hx - 4, hy - 8); ctx.lineTo(lerp(hx - 4, bx, 0.18), lerp(hy - 8, by, 0.18)); ctx.stroke();
    ctx.save(); ctx.translate(bx, by); ctx.rotate(lerp(0, -1.2, k));
    ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(14, 0); ctx.stroke();
    ctx.strokeStyle = '#1c1f26'; ctx.lineWidth = 4.4; ctx.stroke();
    ctx.restore();
  } });

  // =====================================================================
  // ICE HOCKEY — the rink gets resurfaced, goals pushed in, then a game
  // with a different result every time
  // =====================================================================
  function* sceneHockey(S) {
    const w = S.w, r = S.r;
    const rx0 = S.ax0 + 70, rx1 = S.ax1 - 70, cx = (rx0 + rx1) / 2;
    const from = r.sign();
    const n = S.crewSize - 1;
    const enterA = S.offL, enterB = S.offR;
    // ---- the rink: Rocco drives the plow across, the fresh ice spreading out behind it ----
    const drv = S.spawn({ x: from > 0 ? S.offL : S.offR, kind: 'rocco', lane: 6 });
    const tr = S.add(new SD.Tractor(w, (from > 0 ? S.offL : S.offR) - from * 80, from, drv));
    drv.inVehicle = true;
    tr.plowing = false;
    const ice = w.ice;
    ice.on = true; ice.glaze = 1; ice.spreading = true;
    // the ice runs right off the screen at both ends (no hard edge in view)
    const ia = S.ax0 - 140, ib = S.ax1 + 140;
    if (from > 0) { ice.a = ia; ice.b = ia; } else { ice.a = ib; ice.b = ib; }
    w.snowfall = 0.16;
    tr.goTo(from > 0 ? ib + 80 : ia - 80, 90);
    yield* S.until(() => {
      const back = tr.x - from * 60;
      if (from > 0) ice.b = clamp(Math.max(ice.b, back), ia, ib); else ice.a = clamp(Math.min(ice.a, back), ia, ib);
      ice.front = from > 0 ? ice.b : ice.a;
      if (S.r() < 0.5) w.sparkle(ice.front + S.r.range(-20, 20), w.surfaceY(ice.front) + S.r.range(2, 20), 1, '#ffffff', 4);
      return tr.target == null;
    }, 40);
    ice.a = ia; ice.b = ib; ice.spreading = false;
    tr.goTo(from > 0 ? S.offR + 120 : S.offL - 120, 110);
    yield* S.until(() => tr.target == null, 20);
    tr.dead = true; drv.dead = true;
    const lines = S.add(new RinkLines(w, rx0, rx1));
    yield* S.tween(1.2, (u) => { lines.show = u; });

    // ---- the teams: a goalie and two skaters each; the captain referees, Specs keeps score ----
    const cap = S.spawn({ x: enterA - 40, kind: 'captain', lane: 22 });
    const pool = [];
    for (let i = 0; i < n - 1; i++) pool.push(S.spawn({ x: (i % 2 ? enterB + 60 + i * 30 : enterA - 60 - i * 30), lane: 12 + (i % 3) * 4 }));
    const rocco = S.spawn({ x: from > 0 ? S.offR + 40 : S.offL - 40, kind: 'rocco', lane: 14 }); // back on skates
    pool.push(rocco);
    const specs = byKind(pool, 'specs');
    let players = pool.filter((p) => p !== specs);
    const chubby = byKind(players, 'chubby');
    // chubby in goal fills half the net
    const gA = chubby || players[0];
    players = players.filter((p) => p !== gA);
    SD.shuffle(r, players);
    const teamA = [gA, players[0], players[1]];
    const gB = players[2] || players[0];
    const teamB = [gB, players[3] || players[1], players[4] || players[0]].filter((p, i, a) => a.indexOf(p) === i);
    const extras = players.slice(5); // anyone left watches with Specs
    const team = (p) => (teamA.includes(p) ? 'A' : 'B');
    const all = [cap, ...teamA, ...teamB, ...(specs ? [specs] : []), ...extras];
    const goalL = S.add(new Goal(w, rx0 - 260, 12, 1, BLUE)); // team A defends the left
    const goalR = S.add(new Goal(w, rx1 + 260, 12, -1, RED));
    // goalies push their goals in from the sides
    const gxL = rx0 + 40, gxR = rx1 - 40;
    const pushIn = (gk, goal, gx, side) => S.run((function* () {
      gk.lane = gk.laneT = 13;
      gk.x = goal.x + side * 44; gk.face(-side); gk.action = 'push';
      let on = true;
      S.run((function* () { while (on) { goal.x = gk.x - side * 44; yield 0; } })());
      yield* S.walk(gk, gx + side * 44, 46);
      on = false; gk.action = 'none'; w.puff(goal.x, goal.y, 4, 9, 1, 0.5);
    })());
    yield [pushIn(gA, goalL, gxL, -1), pushIn(gB, goalR, gxR, 1)];
    // Specs carries the scoreboard in from his side, out in front of him, and plants it at the back
    const sideS = r.sign(), bx = cx + sideS * S.r.range(30, 70);
    const sx0 = (sideS > 0 ? S.offR : S.offL) + sideS * 60;
    const score = specs ? S.add(new Scoreboard(w, sx0 - sideS * 40, 0)) : null;
    if (score) {
      specs.x = sx0; specs.lane = specs.laneT = 1; specs.face(-sideS);
      score.lift = 12; score.rot = 0.12 * sideS;
      let carry = true;
      specs.action = 'hold';
      S.run((function* () { while (carry) { score.x = specs.x - sideS * 40; yield 0; } })());
      yield* S.walk(specs, bx + sideS * 40, 75);
      carry = false; specs.action = 'none';
      yield* S.tween(0.4, (u) => { score.lift = 12 * (1 - u); score.rot = 0.12 * sideS * (1 - u); });
      w.puff(score.x, score.y, 3, 7, 0.6, 0.4);
    }
    // skates and sticks on, everyone out
    const sticks = { A: BLUE, B: RED };
    [...teamA, ...teamB].forEach((p) => { p.gear = 'skates'; p.item = SD.items.stick(sticks[team(p)]); });
    const home = (p) => {
      const T = team(p), side = T === 'A' ? -1 : 1, i = (T === 'A' ? teamA : teamB).indexOf(p);
      if (i === 0) return side < 0 ? gxL + 34 : gxR - 34;
      return cx + side * (i === 1 ? 70 : 200);
    };
    // every skater has their own depth on the ice, so a scrum reads front to back
    const laneOf = (p) => { const T = team(p), i = (T === 'A' ? teamA : teamB).indexOf(p); return i === 0 ? 14 : [[0, 17, 27], [0, 22, 32]][T === 'A' ? 0 : 1][i]; };
    // skating: steer by velocity (gliding, with a push each stride)
    const tgt = new Map();
    let skating = true;
    S.run((function* () {
      while (skating) {
        for (const p of [...teamA, ...teamB, cap]) {
          const t = tgt.get(p); if (t == null || p.air || p.attach) continue;
          p.loco = 'glide'; p.friction = 0; p.target = null;
          const want = clamp((t - p.x) * 2.4, -170, 170);
          p.vx += clamp(want - p.vx, -420 * S.dt, 420 * S.dt);
          if (Math.abs(t - p.x) < 4 && Math.abs(p.vx) < 30) p.vx *= 0.8;
          p.cyc += Math.abs(p.vx) * S.dt / 24;
        }
        yield 0;
      }
    })());
    const skateTo = (p, x) => tgt.set(p, clamp(x, rx0 + 10, rx1 - 10));
    // the referee follows the play but never parks in front of the scorekeeper or the spectators
    const watchers = () => [specs, ...extras].filter(Boolean);
    const refTo = (x) => {
      for (let k = 0; k < 2; k++) for (const o of watchers()) if (Math.abs(x - o.x) < 64) x = o.x + (x < o.x ? -64 : 64);
      skateTo(cap, x); cap.laneT = 7;
    };
    cap.gear = 'skates';
    [...teamA, ...teamB].forEach((p) => { p.laneT = laneOf(p); skateTo(p, home(p)); });
    refTo(cx); // the referee keeps to the back of the play
    yield* S.until(() => [...teamA, ...teamB].every((p) => Math.abs(p.x - home(p)) < 12), 14);
    if (specs) { specs.face(-sideS); }
    // anyone spare watches from the other side of the rink to Specs
    extras.forEach((p, i) => { p.laneT = 1; p.goTo(cx - sideS * (150 + i * 55), 70); });
    yield 0.6;
    [...teamA, ...teamB].forEach((p) => p.face(team(p) === 'A' ? 1 : -1));

    // ---- the result is decided before the puck drops (different every time) ----
    const pick = () => [0, 1, 1, 2, 2, 2, 3, 3, 4][Math.floor(S.r() * 9)];
    let gA_n = pick(), gB_n = pick();
    let overtime = false;
    if (gA_n === gB_n) { overtime = true; if (S.r() < 0.5) gA_n++; else gB_n++; }
    // level after regulation in an overtime game; the golden goal comes last
    const reg = overtime ? Math.min(gA_n, gB_n) : null;
    const plays = [];
    for (let k = 0; k < (overtime ? reg : gA_n); k++) plays.push('A');
    for (let k = 0; k < (overtime ? reg : gB_n); k++) plays.push('B');
    SD.shuffle(r, plays);
    if (overtime) plays.push('OT' + (gA_n > gB_n ? 'A' : 'B'));
    // a few chances that don't go in, sprinkled between the goals
    const seq = [];
    for (const g of plays) { const misses = Math.floor(S.r() * 2.2); for (let k = 0; k < misses; k++) seq.push(S.r() < 0.5 ? 'missA' : 'missB'); seq.push(g); }
    if (!seq.length) seq.push('missA');

    const puck = S.add(new Puck(w, cx, 18));
    const net = { A: goalR, B: goalL }; // the net each team shoots at
    let scoreA = 0, scoreB = 0;
    // faceoff: the referee drops the puck between the two centres
    function* faceoff() {
      const ca = teamA[1], cb = teamB[1];
      refTo(cx);
      skateTo(ca, cx - 36); skateTo(cb, cx + 36); ca.laneT = cb.laneT = 21;
      skateTo(teamA[2], cx - 160); skateTo(teamB[2], cx + 160);
      puck.carrier = null; puck.x = cx; puck.vx = 0; puck.h = 0; puck.lane = 21.5; puck.alpha = 0;
      yield* S.until(() => Math.abs(ca.x - (cx - 36)) < 8 && Math.abs(cb.x - (cx + 36)) < 8, 6);
      ca.face(1); cb.face(-1);
      yield 0.4;
      whistle(S, cap, 1);
      puck.alpha = 1; puck.h = 40; puck.vh = 0;
      yield 0.45;
      ca.laneT = laneOf(ca); cb.laneT = laneOf(cb);
    }
    // a rush up the ice; ends with a shot that scores, is saved, or rings off the post
    function* rush(T, outcome) {
      const att = T === 'A' ? teamA : teamB, def = T === 'A' ? teamB : teamA;
      const dir = T === 'A' ? 1 : -1, goal = net[T], keeper = def[0];
      // whoever's nearer the loose puck goes and gets it
      const carrier = Math.abs(att[1].x - puck.x) < Math.abs(att[2].x - puck.x) ? att[1] : att[2], mate = att[1] === carrier ? att[2] : att[1];
      puck.alpha = 1;
      if (!puck.carrier || puck.carrier !== carrier) {
        puck.carrier = null;
        yield* S.until(() => { skateTo(carrier, puck.x - Math.sign(puck.x - carrier.x || 1) * 30); return Math.abs(carrier.x - puck.x) < 40 && puck.h < 2; }, 5);
      }
      puck.carrier = carrier;
      const shootX = goal.mouth() - dir * (130 + S.r() * 60);
      skateTo(carrier, shootX); skateTo(mate, shootX - dir * 120);
      // defenders back-check; the keeper sets in the crease
      skateTo(def[1], shootX + dir * 80); skateTo(def[2], shootX - dir * 200);
      skateTo(keeper, goal.mouth() - dir * 20);
      refTo((carrier.x + shootX) / 2);
      yield* S.until(() => Math.abs(carrier.x - shootX) < 30, 6);
      // a pass across, sometimes
      let shooter = carrier;
      if (S.r() < 0.45) {
        puck.carrier = null; puck.vx = (mate.x - puck.x) * 2.2; puck.lane = mate.lane;
        yield* S.until(() => Math.abs(puck.x - mate.x) < 30, 1.2);
        puck.carrier = mate; shooter = mate;
        yield 0.2;
      }
      // wind up (anticipation), then the slap shot
      shooter.face(dir);
      tgt.set(shooter, shooter.x);
      yield* S.tween(0.35, (u) => { shooter.item.wind = SD.easeOut(u); shooter.anticip = u * 0.6; });
      shooter.item.wind = 0; shooter.anticip = 0;
      puck.carrier = null; puck.lane = 13.5;
      const dist = Math.abs(goal.mouth() - puck.x);
      puck.vx = dir * Math.max(520, dist * 3.2); puck.h = 4; puck.vh = outcome === 'goal' ? 220 : 160; puck.friction = 0.05;
      w.puff(puck.x, puck.y, 3, 7, 0.8, 0.4);
      yield* S.until(() => (puck.x - goal.mouth()) * dir > -28, 1.5);
      if (outcome === 'goal') {
        // past the keeper (who dives the wrong way) into the net
        keeper.rot = -dir * 0.9; S.run((function* () { yield 0.6; keeper.rot = 0; })());
        puck.vx = dir * 120; puck.friction = 3;
        yield 0.2;
        goal.bulge.kick(9); goal.lamp = 2.2; puck.vx = 0; puck.alpha = 0;
        w.sparkle(goal.x, goal.y - 40, 6, '#ff5a4f', 7);
      } else if (outcome === 'save') {
        keeper.action = 'armsOut'; keeper.rot = dir * 0.3; keeper.land.kick(-5);
        puck.vx = -dir * 260; puck.vh = 120; puck.friction = 0.9;
        w.puff(keeper.x, keeper.y - 30, 4, 8, 0.8, 0.6);
        S.run((function* () { yield 0.8; keeper.rot = 0; keeper.action = 'none'; })());
      } else {
        // off the post: clang
        puck.vx = -dir * 200; puck.vh = 200; puck.friction = 0.9;
        w.sparkle(goal.mouth(), goal.y - 50, 3, '#ffffff', 6);
        att.forEach((p) => { if (p !== keeper) p.say('!', 0.7); });
      }
      yield 0.6;
      return shooter;
    }

    whistle(S, cap, 2);
    yield 0.6;
    yield* faceoff();
    for (const ev of seq) {
      const goal = ev === 'A' || ev === 'B' || ev.startsWith('OT');
      const T = goal ? ev.slice(-1) : ev.slice(-1);
      const outcome = goal ? 'goal' : (S.r() < 0.6 ? 'save' : 'post');
      if (ev.startsWith('OT')) { whistle(S, cap, 3); cap.say('!', 1.2); yield 1.2; yield* faceoff(); }
      const shooter = yield* rush(T, outcome);
      if (!goal) {
        // the defending team clears it and play turns round
        yield 0.6;
        continue;
      }
      if (T === 'A') scoreA++; else scoreB++;
      if (score) { score.a = scoreA; score.b = scoreB; score.flip = 1; specs.action = 'point'; S.run((function* () { yield 1; specs.action = 'none'; })()); }
      // the scorer celebrates on their knees... well, on their belly
      const mates = T === 'A' ? teamA : teamB;
      tgt.delete(shooter);
      shooter.item.wind = 0; shooter.action = 'armsUp'; shooter.loco = 'prone'; shooter.vx = (T === 'A' ? 1 : -1) * 200; shooter.friction = 1.4; shooter.kick = 0.4;
      w.puff(shooter.x, shooter.y, 4, 9, 1, 0.5);
      mates.forEach((p) => { if (p !== shooter) { p.action = 'cheer'; } });
      (T === 'A' ? teamB : teamA)[0].action = 'sleepy';
      cap.face(T === 'A' ? 1 : -1); cap.action = 'point';
      yield* S.until(() => Math.abs(shooter.vx) < 20, 3);
      shooter.loco = 'glide'; shooter.kick = 0; shooter.action = 'cheer';
      yield 1.4;
      [...teamA, ...teamB].forEach((p) => { p.action = 'none'; });
      cap.action = 'none';
      if (ev !== seq[seq.length - 1]) yield* faceoff();
    }

    // ---- final whistle ----
    puck.alpha = 0;
    whistle(S, cap, 3);
    yield 1;
    const winA = scoreA > scoreB;
    const winners = winA ? teamA : teamB, losers = winA ? teamB : teamA;
    // winners pile on their goalie; losers hang their heads
    const hero = winners[0];
    winners.forEach((p) => { p.snug = true; if (p !== hero) { skateTo(p, hero.x + (winA ? 1 : -1) * (40 + winners.indexOf(p) * 30)); } });
    // the losers drift off towards their own end, heads down, out of the way of the celebration
    losers.forEach((p, i) => { p.action = 'sleepy'; p.laneT = 30 + i * 3; skateTo(p, (winA ? rx1 : rx0) + (winA ? -1 : 1) * (60 + i * 60)); });
    yield 1.2;
    winners.forEach((p) => { p.action = 'cheer'; p.jump(-260, 0); });
    w.heart(hero.x, hero.y - 90);
    yield 1.4;
    winners.forEach((p) => { p.action = 'none'; p.snug = false; });
    losers.forEach((p) => { p.action = 'none'; });
    // the handshake line: the teams glide past each other, flippers out
    const yA = 14, yB = 30; // one line nearer us, one further back
    // each line keeps the order its players are already in, so nobody skates through a teammate
    teamA.slice().sort((a, b) => b.x - a.x).forEach((p, i) => { p.laneT = yA; skateTo(p, cx - 120 - i * 50); });
    teamB.slice().sort((a, b) => a.x - b.x).forEach((p, i) => { p.laneT = yB; skateTo(p, cx + 120 + i * 50); });
    yield* S.until(() => [...teamA, ...teamB].every((p) => Math.abs(p.vx) < 30), 6);
    teamA.forEach((p) => { p.face(1); p.action = 'armsOut'; skateTo(p, p.x + 420); });
    teamB.forEach((p) => { p.face(-1); p.action = 'armsOut'; skateTo(p, p.x - 420); });
    yield 3.2;
    [...teamA, ...teamB].forEach((p) => { p.action = 'none'; });
    cap.action = 'clap'; if (specs) specs.action = 'clap';
    yield 1.2;
    skating = false;
    all.forEach((p) => { p.loco = 'stand'; p.vx = 0; p.action = 'none'; });
    yield* S.exitAll(all, 70, false);
  }

  Object.assign(SD.SCENES, {
    hockey: { name: 'Hockey Night', fn: sceneHockey, crew: 8 },
  });
})();
