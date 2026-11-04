// Snow Day — Stage: helpers shared by scenes (spawning, walking, climbing, hopping, tweens)
'use strict';
(function () {
  const { clamp, lerp } = SD;

  class Stage {
    constructor(world, sched, rng, area, settings, seed) {
      this.w = world; this.sc = sched; this.r = rng; this.settings = settings; this.seed = seed;
      this.ax0 = area.x0; this.ax1 = area.x1; this.cx = (area.x0 + area.x1) / 2; this.aw = area.x1 - area.x0;
      this.xm = area.xm ?? this.cx; // the gap between two screens (two-screen scenes)
      this.offL = -90; this.offR = world.W + 90;
      this.D = world.flatDepth;
      this.dt = 1 / 60;
      this.crewSize = 7; // each scene sets its own (SD.SCENES[k].crew)
      this.cast = [];
      this.pals = rng.shuffle ? rng.shuffle(SD.PALETTES.slice()) : shuffle(rng, SD.PALETTES.slice());
      this.nextId = (rng() * 100) | 0;
      this.kindQueue = shuffle(rng, ['chubby', 'pip', 'rocco', 'specs', 'holly']);
      this.used = new Set();
      this.palIdx = 0;
      // faster walking when off the stage screen (span mode)
      world.speedMul = (x) => (x < this.ax0 - 20 || x > this.ax1 + 20 ? 2.2 : 1);
    }
    // casting: Captain only when a scene asks for its leader; the other characters
    // turn up in a different order each scene, then the beanie crew fills in
    nextKind(want) {
      if (want && want !== 'auto') { this.used.add(want); return want; }
      const left = this.kindQueue.filter((k) => !this.used.has(k));
      const k = left.length ? left[0] : 'crew';
      if (k !== 'crew') this.used.add(k);
      return k;
    }
    spawn(opt = {}) {
      opt = Object.assign({}, opt);
      opt.kind = this.nextKind(opt.kind);
      const pal = opt.pal || this.pals[this.palIdx++ % this.pals.length];
      const p = new SD.Penguin(this.w, Object.assign({ id: this.nextId++, size: 0.74, pal }, opt));
      p.lane = p.laneT = opt.lane ?? (12 + this.r() * 8);
      if (opt.facing) p.facing = p.fx = opt.facing;
      this.w.actors.push(p); this.cast.push(p);
      return p;
    }
    add(prop) { this.w.props.push(prop); return prop; }
    remove(o) { o.dead = true; }
    run(gen) { return this.sc.run(gen); }
    ground(x) { return this.w.surfaceY(x); }
    edgeNear(x) { return x - this.offL < this.offR - x ? this.offL : this.offR; }
    edgeFar(x) { return x - this.offL < this.offR - x ? this.offR : this.offL; }
    side(dir) { return dir < 0 ? this.offL : this.offR; }

    *wait(s) { yield s; }
    *until(fn, max = 30) { const t0 = this.sc.t; while (!fn() && this.sc.t - t0 < max) yield 0; }
    *tween(dur, fn) {
      const t0 = this.sc.t;
      while (true) {
        const u = clamp((this.sc.t - t0) / dur, 0, 1);
        fn(u);
        if (u >= 1) return;
        yield 0;
      }
    }
    *walk(p, x, sp = 55) {
      // a long way across open snow, empty-flippered: penguins often toboggan on their bellies
      const d = Math.abs(x - p.x);
      if (d > 320 && this.slides !== false && !p.item && !p.item2 && !p.march && !p.attach && !p.gear &&
          (p.action === 'none' || !p.action) && p.kind !== 'captain' && p.kind !== 'stranger' && this.r() < 0.35) {
        yield* this.bellySlide(p, x);
        return;
      }
      p.goTo(x, sp);
      const t0 = this.sc.t;
      while (!p.arrived() && this.sc.t - t0 < 90) yield 0;
      p.target = null;
    }
    // run, crouch, dive, slide on the belly (flippers paddling), pop back up, walk the last bit
    *bellySlide(p, x) {
      const dir = Math.sign(x - p.x) || 1, w = this.w;
      p.goTo(p.x + dir * 36, 95);
      yield* this.until(() => p.arrived(), 3);
      p.face(dir);
      yield* this.tween(0.16, (u) => { p.anticip = SD.easeOut(u); }); // anticipation
      p.anticip = 0;
      let landed = false;
      p.onLand = () => { landed = true; };
      p.jump(-170, dir * 230);
      yield* this.until(() => landed, 2);
      const left = Math.abs(x - p.x) - 30;
      if (left > 40) {
        const v0 = 250;
        p.loco = 'prone'; p.vx = dir * v0; p.friction = v0 / left; p.kick = 0.7;
        w.puff(p.x, p.y, 4, 9, 1, 0.5);
        let prev = 0;
        yield* this.until(() => {
          // each flipper stroke shoves the penguin along and flicks up a spray of snow
          const sp = Math.min(1, Math.abs(p.vx) / 140), cur = Math.sin(p.t * (5.2 + sp * 1.6) + p.id);
          if (prev < 0.8 && cur >= 0.8 && Math.abs(p.vx) > 50) {
            p.vx += dir * 16;
            w.puff(p.x - dir * 16, p.y - 2, 2, 5, 1.5, 0.9);
          }
          prev = cur;
          return Math.abs(p.vx) < 22 || (x - p.x) * dir < 18;
        }, 6);
        p.vx = 0; p.kick = 0;
        p.loco = 'stand'; p.jump(-130, 0); // and up
        landed = false; p.onLand = () => { landed = true; };
        yield* this.until(() => landed, 2);
      }
      p.loco = 'stand';
      p.goTo(x, 60);
      yield* this.until(() => p.arrived(), 10);
      p.target = null;
    }
    *walkAll(list, xs, sp = 55) {
      list.forEach((p, i) => p.goTo(xs[i], sp));
      yield* this.until(() => list.every((p) => p.arrived()), 90);
    }
    // parabolic hop to a (possibly moving) target point
    *hop(p, target, dur = 0.6, h = 50, stay = false) {
      const x0 = p.x, y0 = p.y;
      let u = 0;
      p.target = null;
      p.attach = () => { const [tx, ty] = target(); return { x: lerp(x0, tx, u), y: lerp(y0, ty, u) - h * 4 * u * (1 - u) }; };
      p.loco = 'air';
      yield* this.tween(dur, (k) => { u = k; });
      p.pomY.kick(90); p.hatLift.kick(-25);
      if (stay) { p.attach = () => { const [tx, ty] = target(); return { x: tx, y: ty }; }; p.loco = 'stand'; }
      else { p.attach = null; p.loco = 'stand'; p.y = p.groundY(); }
      this.w.puff(p.x, p.y, 2, 7, 0.5, 0.4);
    }
    // ladder chain climbing (distance along chain)
    chainPoint(chain, d) {
      let acc = 0;
      for (let i = 0; i < chain.length; i++) {
        const L = chain[i], len = L.len;
        if (d <= acc + len || i === chain.length - 1) return L.point(clamp((d - acc) / len, 0, 1));
        acc += len;
      }
      return chain[0].point(0);
    }
    chainLen(chain) { return chain.reduce((a, L) => a + L.len, 0); }
    // distance along chain where feet height above base equals h
    chainDistForHeight(chain, h) {
      const base = chain[0].ay;
      const total = this.chainLen(chain);
      for (let d = 0; d <= total; d += 2) { const [, y] = this.chainPoint(chain, d); if (base - y >= h) return d; }
      return total;
    }
    *climb(p, chain, dTarget, speed = 48) {
      if (!Array.isArray(chain)) chain = [chain];
      if (p.ld == null || p.onChain !== chain[0]) { p.ld = 0; p.onChain = chain[0]; }
      p.target = null; p.loco = 'climb';
      const L0 = chain[0];
      p.face(L0.bx > L0.ax ? 1 : -1);
      p.laneT = L0.lane + 1.5;
      p.attach = () => { const [x, y] = this.chainPoint(chain, p.ld); return { x, y }; };
      while (Math.abs(p.ld - dTarget) > 0.01) {
        const step = speed * this.dt;
        p.ld += clamp(dTarget - p.ld, -step, step);
        yield 0;
      }
    }
    *offLadder(p, chain, lane) {
      if (!Array.isArray(chain)) chain = [chain];
      yield* this.climb(p, chain, 0, 70);
      p.attach = null; p.loco = 'stand'; p.ld = null; p.onChain = null;
      p.laneT = lane ?? 14;
      p.y = p.groundY();
    }
    // flying object between two (dynamic) points
    fling(drawFn, from, to, dur = 0.6, arc = 30, onDone) {
      const S = this;
      const f = { x: 0, y: 0, lane: 30, alpha: 1, dead: false, rot: 0, update() {}, draw(ctx) { ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rot); drawFn(ctx); ctx.restore(); } };
      this.add(f);
      this.run((function* () {
        const [x0, y0] = from();
        yield* S.tween(dur, (u) => {
          const [x1, y1] = to();
          f.x = lerp(x0, x1, u); f.y = lerp(y0, y1, u) - arc * 4 * u * (1 - u); f.rot = u * 2;
        });
        f.dead = true;
        if (onDone) onDone();
      })());
      return f;
    }
    *exitAll(list, sp = 60, waveFirst = true) {
      list = list.filter((p) => !p.dead);
      if (waveFirst) {
        list.forEach((p, i) => { p.action = 'wave'; p.face(p.x < this.cx ? 1 : -1); });
        yield 1.4;
      }
      // nearest the edge leaves first, everyone at their own depth, so the crowd thins out instead of
      // squeezing through itself
      const order = list.slice().sort((a, b) => Math.abs(a.x - this.edgeNear(a.x)) - Math.abs(b.x - this.edgeNear(b.x)));
      const cos = order.map((p, i) => this.run((function* (S) {
        p.action = 'none'; p.item = null; p.item2 = null; p.attach = null; p.loco = 'stand'; p.armF = p.armB = null; p.snug = false;
        p.laneT = 12 + (i % 4) * 4; // between the back props and the front of the stage
        yield i * 0.22;
        yield* S.walk(p, S.edgeNear(p.x), sp);
        p.dead = true;
      })(this)));
      yield cos;
    }
  }
  function shuffle(r, a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  SD.shuffle = shuffle;
  SD.Stage = Stage;
})();
