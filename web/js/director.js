// Snow Day — director: build-up -> flatten -> random scene -> blizzard reset -> next scene
'use strict';
(function () {
  const { clamp, lerp, smooth } = SD;
  const PEAK = 6.3; // storm time when the screen is fully white
  const INTENSITY = { gentle: 0.6, steady: 1.0, heavy: 1.45 };

  class Director {
    constructor(world, cfg, areas) {
      this.w = world; this.cfg = cfg; this.s = cfg.settings;
      this.areas = areas; // candidate stage areas (screens in world units)
      this.sc = new SD.Scheduler();
      this.r = SD.mulberry((cfg.sceneSeed ?? cfg.seed) ^ 0x2545f491);
      this.offset = cfg.sceneOffset || 0;
      this.phase = 'build'; this.pt = 0;
      this.last = null; this.count = 0;
      this.D = world.H / 7; world.flatDepth = this.D;
      this.buildSec = cfg.fast ? 16 : Math.max(20, (this.s.buildMin || 3) * 60);
      this.intensity = INTENSITY[this.s.intensity] || 1;
      world.settings.density = this.intensity;
      world.settings.ledgeRate = 1;
      this.tint = 0; this.tintTarget = 0;
      this.co = null; this.stage = null;
      this.recent = [];
      // pairs of screens that sit next to each other (for the two-screen scenes)
      this.dualAreas = [];
      for (let i = 0; i + 1 < areas.length; i++) {
        const a = areas[i], b = areas[i + 1];
        if (Math.abs(a.x1 - b.x0) < 1) this.dualAreas.push({ x0: a.x0, x1: b.x1, xm: a.x1 });
      }
      if (cfg.skipBuild) { world.resetSnow(this.D); world.buildProg = 1; world._peakProg = 1; this.phase = 'flatten'; this.pt = 3; world.snowNow = world.snowfall = 0.5; this.tint = this.tintTarget = (this.s.dim ?? 22) / 100; }
      this.waking = false;
      this.sceneName = null;
      if (cfg.recent && cfg.recent.length) { this.recent = cfg.recent.slice(0, 3); this.last = this.recent[0]; }
      if (cfg.resume) {
        // separate screens just joined up under a blizzard: pick up from the white-out
        world.resetSnow(this.D); world.buildProg = 1; world._peakProg = 1;
        world.snowNow = world.snowfall = 1.7; world.windBase = 70; world.haze = 1; world.gale = 1;
        this.phase = 'storm'; this.pt = 8.2; this._cleared = true; this._peak = true;
        this.tint = this.tintTarget = (this.s.dim ?? 22) / 100;
      }
      this.firstHere = !!cfg.preferPrimary; // the first scene after joining plays on the main screen
      // only one crew at a time: a screen snowing on its own while another hosts the crew just snows
      this.stageOn = cfg.stage !== false;
      this.anyScreen = !!(cfg.settings && cfg.settings.preferScreen < 0);
    }

    post(m) { if (this.cfg.post) this.cfg.post(m); }
    toStorm() { this.phase = 'storm'; this.pt = 0; this._peak = false; this._hold = 0; this._rampFrom = null; this.post('storm'); }
    // another screen's blizzard is rolling in: white out to match
    fadeWhite(sec) {
      if (this.waking) return;
      sec = Math.max(0.6, Math.min(6.5, sec || 1.2));
      SD.mergePending = true;
      if (this.phase === 'storm' && this.pt >= PEAK - sec) return;
      this.phase = 'storm'; this.pt = Math.max(0, PEAK - sec); this._peak = false; this._hold = 0;
      this._rampFrom = this.pt; this._hz0 = this.w.haze;
    }
    // the screen the penguins prefer (Settings), else the main screen
    primaryArea() { return this.areas.find((a) => a.prefer) || this.areas.find((a) => a.primary) || this.areas[0]; }

    // which scenes can play here: two-screen scenes need two screens side by side,
    // window parkour needs real windows to run along
    available() {
      const en = this.s.scenes || {};
      const regular = ['tree', 'parade', 'ramp', 'ice', 'igloo', 'fishing', 'blizzard', 'flying', 'snowman', 'reindeer'];
      const out = regular.filter((k) => en[k] !== false);
      const areas = this.firstHere ? [this.primaryArea()] : this.areas;
      if (en.parkour !== false && areas.some((a) => SD.parkourCourse(this.w, a))) out.push('parkour');
      if (this.dualAreas.length && !this.firstHere) for (const k of ['snowball', 'zipline', 'tug']) if (en[k] !== false) out.push(k);
      return out;
    }
    pickScene() {
      const list = this.available();
      const f = this.cfg.force;
      if (f && SD.SCENES[f]) {
        const F = SD.SCENES[f];
        const ok = (!F.dual || this.dualAreas.length) && (!F.needsLedges || this.areas.some((a) => SD.parkourCourse(this.w, a)));
        if (ok) return f;
      }
      const pickIdx = this.r();
      if (this.offset && list.length > 1) {
        // "different scene on each screen": rotate through the list
        const base = Math.floor(pickIdx * list.length);
        return list[(base + this.offset) % list.length];
      }
      // two-screen scenes come up a bit more often when they're possible
      let pool = list.filter((k) => k !== this.last && !this.recent.includes(k));
      if (!pool.length) pool = list.filter((k) => k !== this.last);
      if (!pool.length) pool = list.length ? list : ['tree'];
      const weighted = pool.flatMap((k) => (SD.SCENES[k].dual ? [k, k] : [k]));
      return weighted[Math.floor(pickIdx * weighted.length)];
    }

    startScene() {
      const name = this.pickScene();
      this.sceneName = name;
      this.last = name; this.count++;
      this.recent = [name, ...this.recent].slice(0, 3);
      const sc = SD.SCENES[name];
      let area;
      if (sc.dual && this.dualAreas.length) area = this.dualAreas[Math.floor(this.r() * this.dualAreas.length)];
      else if (sc.needsLedges) area = this.areas.find((a) => SD.parkourCourse(this.w, a)) || this.areas[0];
      else area = this.areas[Math.floor(this.r() * this.areas.length)];
      if (!sc.dual && !this.anyScreen && this.areas.length > 1) {
        const pa = this.primaryArea();
        if (!sc.needsLedges || SD.parkourCourse(this.w, pa)) area = pa;
      }
      if (this.firstHere && !sc.dual) {
        const pa = this.primaryArea();
        if (!sc.needsLedges || SD.parkourCourse(this.w, pa)) area = pa;
      }
      this.firstHere = false;
      const seed = (this.cfg.seed + this.count * 7919) >>> 0;
      const rng = SD.mulberry(seed);
      this.stage = new SD.Stage(this.w, this.sc, rng, area, this.s, seed);
      this.stage.crewSize = sc.crew || 7;
      this.co = this.sc.run(sc.fn(this.stage), 'scene');
      this.phase = 'scene'; this.pt = 0;
      if (this.cfg.onScene) this.cfg.onScene(name);
    }

    clearStage() {
      this.sc.killAll();
      const w = this.w;
      w.actors = []; w.props = [];
      w.ice.on = false; w.ice.glaze = 0;
      w.windBase = 8;
      w.resetSnow(this.D);
      w.speedMul = null;
      w.particles = w.particles.filter((p) => p.k === 'note' && false);
    }

    wake() {
      if (this.waking) return;
      this.waking = true; this.phase = 'wake'; this.pt = 0;
      this.sc.killAll();
      const w = this.w, r = this.r;
      w.snowfall = 0;
      // (a white-out clears smoothly in the wake phase rather than snapping away)
      const ps = w.actors.slice();
      ps.forEach((p, i) => {
        if (p.inVehicle) { p.inVehicle = false; p.attach = null; p.size = 0.66; p.y -= 30; }
        p.attach = null; p.target = null; p.vx = 0; p.item = null; p.item2 = null; p.gear = null;
        p.armF = p.armB = null; p.spin = 0; p.dizzy = 0; p.eyeOverride = null; p.sinkClip = false;
        p.loco = 'stand'; p.action = 'startle'; p.rot = 0; p.limbo = 0;
        p.say('!', 1.0);
        p.hatLift.kick(260);
        p.pomY.kick(-200);
        p.jump(-260 - (i % 3) * 30, 0);
        p.noLand = false;
        p.onLand = null;
      });
      // stagger the dives
      ps.forEach((p, i) => {
        this.sc.run((function* () {
          yield 0.4 + (i % 4) * 0.07;
          p.action = 'dive'; p.noLand = true; p.sinkClip = true;
          p.jump(-200, p.facing * 40);
          const r0 = p.rot;
          const t0 = w.t;
          while (w.t - t0 < 0.9) {
            const u = Math.min(1, (w.t - t0) / 0.35);
            p.rot = lerp(r0, p.facing * Math.PI * 0.95, SD.easeInOut(u));
            if (p.y > w.surfaceY(p.x) + p.lane + 70) break;
            yield 0;
          }
          w.puff(p.x, w.surfaceY(p.x) + p.lane * 0.3, 5, 12);
          p.hidden = true;
        })());
      });
      w.props.forEach((pr) => { pr.fadeOut = true; });
      this.sc.run((function* () { yield 0.85; w.melting = true; })());
      this.tintTarget = 0;
    }

    step(dt) {
      const w = this.w;
      this.pt += dt;
      if (this.phase !== 'wake') this.sc.step(dt);
      switch (this.phase) {
        case 'build': {
          const ramp = smooth(this.pt / 18);
          w.snowfall = (0.22 + 0.78 * ramp) * 1.0;
          w.accum = ramp * (this.D / this.buildSec) * 1.08;
          this.tintTarget = (this.s.dim ?? 22) / 100;
          if (w.meanDepth() >= this.D * 0.985) { this.phase = 'flatten'; this.pt = 0; }
          break;
        }
        case 'flatten': {
          w.accum = 0;
          w.flatten = 0.9 * smooth(this.pt / 2);
          w.snowfall = lerp(w.snowfall, 0.42, dt * 0.5);
          if (this.pt > 6.5) { w.flatten = 0.02; if (this.stageOn) this.startScene(); else { this.phase = 'idle'; this.pt = 0; } }
          break;
        }
        case 'idle': {
          // just snow: the crew is on another screen (they may come here next)
          w.accum = 0; w.flatten = 0.02;
          w.snowfall = lerp(w.snowfall, 0.45, dt * 0.3);
          if (this.stageOn && this.pt > 2) this.startScene();
          break;
        }
        case 'scene': {
          w.accum = 0;
          w.flatten = 0;
          if (this.sceneName !== 'ice' && !(this.stage && this.stage.weather)) w.snowfall = 0.4;
          if (this.co && this.co.done) { this.phase = 'linger'; this.pt = 0; }
          if (this.pt > 600) this.toStorm();
          break;
        }
        case 'linger': {
          w.snowfall = lerp(w.snowfall, 0.5, dt * 0.3);
          if (this.pt > 6) this.toStorm();
          break;
        }
        case 'storm': {
          const t = this.pt;
          w.snowfall = t < 9 ? 1.7 : lerp(1.7, 0.45, smooth((t - 9) / 6));
          w.windBase = t < 9 ? lerp(8, 70, smooth(t / 3)) : lerp(70, 8, smooth((t - 9) / 4));
          // the blizzard rolls in until the screen is solid white, the stage is cleared
          // while nothing can be seen, then it blows itself out
          const rf = this._rampFrom;
          if (t < PEAK) w.haze = rf != null ? lerp(this._hz0, 1, smooth((t - rf) / (PEAK - rf))) : smooth((t - 1) / (PEAK - 1));
          else if (t < 8.4) { w.haze = 1; if (t >= 7 && !this._cleared) { this._cleared = true; this.clearStage(); } }
          else w.haze = 1 - smooth((t - 8.4) / 4.5);
          w.gale = t < 8.4 ? (rf != null ? smooth((t - rf) / Math.max(0.5, (PEAK - rf) * 0.6)) : smooth((t - 0.3) / 3.2)) : 1 - smooth((t - 8.4) / 4);
          if (t >= 7.2 && !this._peak) { this._peak = true; this.post('stormpeak'); }
          // waiting for the other screens to join this world (gives up after a few seconds)
          if (SD.mergePending && t >= 7.6 && t < 8.2 && (this._hold = (this._hold || 0) + dt) < 2.5) this.pt = 7.6;
          if (t > 13) { w.haze = 0; w.gale = 0; this._cleared = false; this._rampFrom = null; w.windBase = 8; this.phase = 'flatten'; this.pt = 3; }
          break;
        }
        case 'wake': {
          // only run the wake coroutines
          this.sc.step(dt);
          w.haze = Math.max(0, w.haze - dt * 2); w.gale = Math.max(0, w.gale - dt * 2);
          for (const pr of w.props) if (pr.fadeOut) pr.alpha = Math.max(0, pr.alpha - dt * 2.2);
          break;
        }
      }
      this.tint = SD.damp(this.tint, this.tintTarget, this.phase === 'wake' ? 6 : 0.25, dt);
    }
  }
  SD.Director = Director;
})();
