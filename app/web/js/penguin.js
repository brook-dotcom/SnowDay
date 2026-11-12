// Snow Day — the penguin crew (original characters), rigged vector drawing + procedural animation
'use strict';
(function () {
  const { clamp, lerp, damp, angDamp, TAU } = SD;
  const PI = Math.PI;

  const INK = '#151b2b';
  const BACK = '#2b3653';
  const BACK_HI = '#465a85';
  const CREAM = '#fff8ec';
  const CREAM_SH = '#eadcc4';
  const BEAK = '#f6a33b';
  const BEAK_SH = '#c96d19';
  const FOOT = '#f59a34';

  SD.PALETTES = [
    { hat: '#e2413b', alt: '#fff2dc', scarf: '#e2413b', salt: '#fff2dc', style: 'pom' },
    { hat: '#1f9e8f', alt: '#f2fbf9', scarf: '#f2b134', salt: '#d98a12', style: 'long' },
    { hat: '#f2b134', alt: '#2d4a7a', scarf: '#2d4a7a', salt: '#f2b134', style: 'flaps' },
    { hat: '#8e3b46', alt: '#f4d9a6', scarf: '#f4d9a6', salt: '#8e3b46', style: 'long' },
    { hat: '#2f7d4f', alt: '#ffffff', scarf: '#d9373f', salt: '#ffffff', style: 'pom' },
    { hat: '#ff8a3d', alt: '#22a6cc', scarf: '#22a6cc', salt: '#ff8a3d', style: 'long' },
    { hat: '#4a7fd6', alt: '#ffffff', scarf: '#ffffff', salt: '#4a7fd6', style: 'pom' },
    { hat: '#d6336c', alt: '#ffe066', scarf: '#ffe066', salt: '#d6336c', style: 'flaps' },
  ];

  // the cast: proportions, gait and idle habits per kind
  SD.KINDS = {
    crew:    { kx: 1.00, ky: 1.00, speed: 1.00, top: -131, tics: ['look', 'wave'] },
    chubby:  { kx: 1.08, ky: 0.96, speed: 0.86, top: -131, tics: ['pat', 'yawn', 'pat'] },
    pip:     { kx: 0.88, ky: 0.84, speed: 1.14, top: -114, tics: ['hop', 'look', 'hop'] },
    rocco:   { kx: 0.96, ky: 0.97, speed: 1.05, top: -120, tics: ['shades', 'cool'] },
    captain: { kx: 1.02, ky: 1.13, speed: 0.95, top: -124, tics: ['whistle', 'point'] },
    specs:   { kx: 0.97, ky: 1.03, speed: 0.95, top: -112, tics: ['glasses', 'think', 'glasses'] },
    holly:   { kx: 0.97, ky: 0.98, speed: 1.02, top: -114, tics: ['twirl', 'wave', 'twirl'] },
    // penguins from elsewhere (contest judges, onlookers): other species, fancy hats
    stranger: { kx: 1.0, ky: 1.0, speed: 0.9, top: -112, tics: ['look', 'think'] },
  };
  SD.KIND_PAL = {
    chubby: { hat: '#ffb03a', alt: '#ffffff', scarf: '#3a7bd5', salt: '#ffffff', style: 'pom' },
    pip: { hat: '#e2413b', alt: '#ffffff', scarf: '#e2413b', salt: '#ffffff', style: 'none' },
    rocco: { hat: '#222', alt: '#222', scarf: '#222', salt: '#222', style: 'none' },
    captain: { hat: '#1d2a4a', alt: '#ffffff', scarf: '#1d2a4a', salt: '#ffffff', style: 'none' },
    specs: { hat: '#1f9e8f', alt: '#ffffff', scarf: '#1f9e8f', salt: '#ffffff', style: 'none' },
    holly: { hat: '#9a57c9', alt: '#ffd3e8', scarf: '#ff8fb3', salt: '#ffffff', style: 'muffs' },
    stranger: { hat: '#222', alt: '#fff', scarf: '#222', salt: '#fff', style: 'none' },
  };
  SD.STRANGER_LOOKS = ['adelie', 'gentoo', 'chinstrap'];
  SD.STRANGER_HATS = ['tophat', 'beret', 'bowler', 'none'];

  const BODY_PATH = new Path2D('M0,-5 C24,-5 33,-20 32,-40 C31,-57 28,-68 27,-79 C26,-98 14,-107 0,-107 C-14,-107 -27,-98 -28,-80 C-29,-66 -33,-54 -33,-38 C-33,-18 -23,-5 0,-5 Z');
  const FRONT_PATH = new Path2D('M6,-9 C21,-9 28,-22 27.5,-40 C27,-52 25.5,-59 25,-64 C28.5,-72 26.5,-86.5 16.5,-88 C11.5,-88.5 8,-85.5 6.5,-82 C5,-85.5 1.5,-88.5 -3.5,-88 C-12.5,-87 -16,-76 -12.5,-66.5 C-19,-56 -22,-44 -21,-32 C-20,-15 -8,-9 6,-9 Z');
  const ROCCO_FRONT = new Path2D('M6,-9 C21,-9 28,-22 27.5,-40 C27,-47 25.5,-52 22,-55.5 C14,-52.5 2,-52.5 -11,-55 C-18,-49 -22,-42 -21,-32 C-20,-15 -8,-9 6,-9 Z');
  // Chubby is pear shaped: a normal head on wide, low hips
  const CHUBBY_BODY = new Path2D('M0,-4 C31,-4 42,-17 41,-35 C40,-51 31,-61 27,-73 C25,-96 13,-106 0,-106 C-13,-106 -26,-97 -27,-80 C-29,-64 -41,-55 -42,-37 C-42,-17 -31,-4 0,-4 Z');
  const CHUBBY_FRONT = new Path2D('M6,-8 C27,-8 35,-21 34.5,-39 C34,-52 28,-60 25,-65 C28.5,-73 26.5,-86.5 16.5,-88 C11.5,-88.5 8,-85.5 6.5,-82 C5,-85.5 1.5,-88.5 -3.5,-88 C-12.5,-87 -16,-76 -12.5,-66.5 C-23,-57 -30,-47 -29,-33 C-28,-15 -12,-8 6,-8 Z');
  const PIP_MASK = new Path2D('M6,-50 C17,-50 26,-56 26.5,-64 C28.5,-72 26.5,-86.5 16.5,-88 C11.5,-88.5 8,-85.5 6.5,-82 C5,-85.5 1.5,-88.5 -3.5,-88 C-12.5,-87 -16,-76 -13.5,-66 C-11,-56 -3,-50 6,-50 Z');
  // the belly-slide figure: one outline, tail to beak (traced from a drawn pose of the character)
  const PRONE_FIG = new Path2D('M-58,-69 C-54,-67 -52,-63 -47,-62 C-30,-66 -6,-66 13,-60 C15,-72 27,-79 45,-78 C63,-77 76,-64 76,-47 C76,-34 69,-24 57,-18 C44,-6 22,0 -2,0 C-22,0 -42,-3 -54,-13 C-64,-22 -66,-38 -63,-52 C-62,-60 -63,-66 -58,-69 Z');
  const PRONE_FRONT = new Path2D('M-52,-9 C-32,-22 0,-25 22,-23 C36,-22 44,-32 48,-44 C51,-56 55,-66 66,-67 L90,-67 L90,10 L-60,10 Z');
  const PRONE_BELLY = new Path2D('M-52,-9 C-32,-22 0,-25 22,-23 C34,-22 42,-26 50,-30 L90,-26 L90,10 L-60,10 Z');
  const PRONE_FLIPPER = new Path2D('M15,-47 C4,-57 -15,-57 -27,-51 C-32,-43 -25,-31 -11,-29 C0,-28 11,-33 15,-47 Z');
  const KCOL = {
    crew: { back: BACK, hi: BACK_HI, dark: '#1e2740', rim: 'rgba(150,175,230,0.28)' },
    chubby: { back: BACK, hi: BACK_HI, dark: '#1e2740', rim: 'rgba(150,175,230,0.28)' },
    captain: { back: '#222a3e', hi: '#3c4866', dark: '#161c2c', rim: 'rgba(150,175,230,0.25)' },
    rocco: { back: '#1d2029', hi: '#3a3f52', dark: '#12141b', rim: 'rgba(160,170,210,0.25)' },
    pip: { back: '#8d97a4', hi: '#b8c1cc', dark: '#717b88', rim: 'rgba(255,255,255,0.3)' },
    specs: { back: '#2e3a52', hi: '#4b5d82', dark: '#1d2537', rim: 'rgba(150,175,230,0.28)' },
    holly: { back: BACK, hi: BACK_HI, dark: '#1e2740', rim: 'rgba(150,175,230,0.28)' },
    stranger: { back: '#23262e', hi: '#41465a', dark: '#15171d', rim: 'rgba(160,170,210,0.25)' },
  };

  const POSE_KEYS = ['lean', 'roll', 'bob', 'crouch', 'aF', 'aB', 'fFx', 'fFy', 'fBx', 'fBy', 'beak', 'prone', 'sq', 'pitch'];

  class Penguin {
    constructor(world, opt = {}) {
      this.world = world;
      this.id = opt.id || 0;
      this.kind = opt.kind && SD.KINDS[opt.kind] ? opt.kind : 'crew';
      this.K = SD.KINDS[this.kind];
      this.pal = (this.kind !== 'crew' && SD.KIND_PAL[this.kind]) || opt.pal || SD.PALETTES[this.id % SD.PALETTES.length];
      this.baseSize = opt.size || 0.7;
      this.tic = null;
      this.x = opt.x || 0;
      this.y = world.surfaceY(this.x);
      this.lane = opt.lane ?? 10;
      this.laneT = this.lane;
      this.facing = opt.facing || 1;
      this.fx = this.facing; // animated facing scale
      this.vx = 0; this.vy = 0;
      this.target = null; this.speed = 55;
      this.loco = 'stand';
      this.action = 'none';
      this.item = null; // {draw(ctx, p, hand), at}
      this.item2 = null;
      this.ground = true;
      this.air = false;
      this.attach = null; // fn -> {x,y,rot?}
      this.phase = (this.id * 1.7) % TAU; // locomotion phase
      this.t = 0;
      this.rng = SD.mulberry((world.seed + 1013 * (this.id + 1)) >>> 0);
      this.blinkAt = 1 + this.rng() * 3; this.blinkT = 0;
      this.eyes = 'open';
      this.eyeOverride = null;
      this.bubble = null; // {text, t}
      this.pom = new SD.Spring(0, 140, 7);
      this.pomY = new SD.Spring(0, 160, 8);
      this.tail = new SD.Spring(0, 40, 5);
      this.hatLift = new SD.Spring(0, 90, 7);
      this.land = new SD.Spring(0, 240, 11); // squash on landing (negative = squashed)
      this.p = {}; this.tp = {};
      for (const k of POSE_KEYS) { this.p[k] = 0; this.tp[k] = 0; }
      this.p.sq = this.tp.sq = 1;
      this.spin = 0; // pirouette angle
      this.rot = 0; // extra body rotation (flight)
      this.alpha = 1;
      this.visible = true;
      this.hidden = false;
      this.sinkClip = false;
      this.shovelT = 0;
      this.reachTo = null; // world point
      this.walkTime = 0;
      this.lastX = this.x;
      this.breathAt = 3 + this.rng() * 6;
      this.cyc = 0; // generic cycle param for actions
      this.march = false;
      this.prevVx = 0;
      this.dizzy = 0;
      this.ticAt = 3 + this.rng() * 5;
      this.shadesDown = 0;
    }
    // where carried things / bubbles / stacked penguins sit
    headTopLocal() {
      if (this.kind === 'stranger') return { tophat: -146, bowler: -128, beret: -114, toque: -150 }[this.jhat] || -112;
      return (this.kind === 'crew' || this.kind === 'holly') && this.pal.style === 'muffs' ? -114 : this.K.top;
    }
    get darkFace() { return this.kind === 'rocco' || (this.kind === 'stranger' && this.look !== 'chinstrap'); }
    standOnTop() { return this.localToWorld(0, this.headTopLocal() + 7); }

    // ---------- movement API ----------
    goTo(x, speed) { this.target = x; if (speed) this.speed = speed; }
    arrived() { return this.target == null; }
    face(d) { this.facing = d >= 0 ? 1 : -1; }
    jump(vy = -320, vx = 0) { this.vy = vy; this.vx = vx; this.air = true; this.ground = false; }

    groundY() { return this.world.surfaceY(this.x) + this.lane; }

    update(dt) {
      const w = this.world;
      this.t += dt;
      // laneOff: a passing step in front of / behind someone in the way (see personalSpace)
      this.laneOff = damp(this.laneOff || 0, this.dodge || 0, 5, dt);
      const oldLane = this.lane;
      this.lane = damp(this.lane, this.laneT + this.laneOff, 3, dt);
      if (this.dodgeT > 0) { this.dodgeT -= dt; if (this.dodgeT <= 0) this.dodge = 0; }
      const oldX = this.x, oldY = this.y;

      if (this.attach) {
        const a = this.attach(this);
        this.x = a.x; this.y = a.y;
        if (a.rot != null) this.rot = a.rot;
        if (a.facing) this.facing = a.facing;
      } else if (this.air) {
        this.vy += 1250 * dt;
        this.x += this.vx * dt; this.y += this.vy * dt;
        const gy = this.groundY();
        if (this.vy > 0 && this.y >= gy && !this.noLand) {
          this.land.kick(-Math.min(9, this.vy / 90)); // the harder the landing, the bigger the squash
          this.y = gy; this.air = false; this.ground = true; this.vy = 0; this.vx = 0;
          this.pomY.kick(60); this.hatLift.kick(-20);
          if (this.onLand) { const f = this.onLand; this.onLand = null; f(this); }
        }
      } else if (this.loco === 'glide' || this.loco === 'ski' || this.loco === 'prone' || this.loco === 'scrabble') {
        // free sliding with low friction
        const fr = this.friction ?? 0.25;
        this.vx *= Math.max(0, 1 - fr * dt);
        this.x += this.vx * dt;
        if (this.target != null) {
          const d = this.target - this.x;
          if (Math.abs(d) < 6 || Math.sign(d) !== Math.sign(this.vx || d)) { if (Math.abs(this.vx) < 30) this.target = null; }
        }
        this.y = this.groundY();
        if (Math.abs(this.vx) > 3) this.facing = this.vx > 0 ? 1 : -1;
      } else {
        if (this.target != null) {
          const d = this.target - this.x;
          const step = Math.min(Math.abs(d), this.speed * dt * (this.crowd ?? 1) * (this.noHurry ? 1 : this.K.speed * (w.speedMul ? w.speedMul(this.x) : 1)));
          if (Math.abs(d) < 0.5) { this.x = this.target; this.target = null; }
          else {
            this.x += Math.sign(d) * step;
            if (Math.abs(d) > 2) this.facing = Math.sign(d);
          }
        }
        this.y = this.groundY();
      }
      const moved = this.x - oldX;
      this.vxEst = moved / Math.max(dt, 1e-4);
      this.stepping = false;
      if (!this.attach && !this.air && this.loco !== 'glide' && this.loco !== 'ski' && this.loco !== 'prone' && this.loco !== 'scrabble') {
        const moving = Math.abs(moved) > 0.01;
        if (this.loco === 'stand' || this.loco === 'walk' || this.loco === 'march') this.loco = moving ? (this.march ? 'march' : 'walk') : 'stand';
        // a change of depth (towards or away from us) is stepped, not slid; only the legs know
        const dl = Math.abs(this.lane - oldLane);
        this.stepping = this.loco === 'stand' && dl > 4 * dt;
        const stride = this.loco === 'march' ? 15 : this.kind === 'rocco' ? 16 : this.kind === 'chubby' ? 10 : 12;
        if (moving || this.stepping) this.phase += ((Math.abs(moved) + dl * 2.5) / stride) * PI;
        else if (this.loco === 'stand') this.phase = damp(this.phase, Math.round(this.phase / PI) * PI, 8, dt);
      }
      if (this.loco === 'climb' || this.loco === 'limbo') this.phase += Math.abs(this.y - oldY + this.x - oldX) / 9 * PI;

      // facing animation (turning squash through 0)
      const tf = this.facing;
      if (Math.sign(this.fx) !== tf || Math.abs(this.fx) < 0.999) {
        this.fx += tf * dt * 7;
        this.fx = clamp(this.fx, -1, 1);
      }

      // blinking
      this.blinkAt -= dt;
      if (this.blinkAt <= 0) { this.blinkT = 0.13; this.blinkAt = 2 + this.rng() * 4; }
      if (this.blinkT > 0) this.blinkT -= dt;
      // breath puffs in the cold
      this.breathAt -= dt;
      if (this.breathAt <= 0) {
        this.breathAt = 4 + this.rng() * 7;
        if (!this.hidden && this.loco !== 'prone' && !this.attach) {
          const s = this.size;
          w.breath(this.x + this.facing * 19 * s, this.y - 62 * s + this.p.bob, this.facing);
        }
      }
      if (this.bubble) { this.bubble.t += dt; if (this.bubble.t > this.bubble.life) this.bubble = null; }
      this._tics(dt);
      if (this.dizzy > 0) this.dizzy -= dt;

      this._computePose(dt);
      // springs
      const acc = (this.vxEst - this.prevVx) / Math.max(dt, 1e-4);
      this.prevVx = this.vxEst;
      this.pom.kick(-clamp(acc, -4000, 4000) * 0.0025 * dt * 60);
      this.pom.step(clamp(-this.vxEst * 0.03, -10, 10) + w.wind * 0.04, dt);
      this.pomY.step(0, dt);
      this.tail.step(clamp(-this.vxEst * 0.006 * this.facing, -1.4, 0.4) + Math.sin(this.t * 2.1 + this.id) * 0.06 - w.wind * 0.002 * this.facing, dt);
      this.hatLift.step(0, dt);
      this.land.step(0, dt);
      const bobDelta = this.p.bob - (this._lastBob || 0); this._lastBob = this.p.bob;
      this.pomY.kick(-bobDelta * 2.2);
    }

    _idle() { return !this.attach && !this.air && this.action === 'none' && this.loco === 'stand' && !this.item && !this.hidden && this.target == null; }
    _tics(dt) {
      if (this.tic) {
        this.tic.t += dt;
        if (!this._idle() || this.tic.t >= this.tic.d) { if (this.tic.n === 'twirl') this.spin = 0; if (this.tic.n === 'shades') this.shadesDown = this.tic.t >= this.tic.d ? 1 - this.shadesDown : this.shadesDown; this.tic = null; }
        else if (this.tic.n === 'whistle' && !this.tic.blown && this.tic.t > 0.35) {
          this.tic.blown = true;
          const [bx, by] = this.localToWorld(26, -64);
          for (let k = 0; k < 2; k++) this.world.note(bx, by - k * 6, k ? '#3c7fd8' : '#e94b5b');
        }
        return;
      }
      if (!this._idle()) return;
      this.ticAt -= dt;
      if (this.ticAt > 0) return;
      this.ticAt = 4 + this.rng() * 7;
      const n = this.K.tics[Math.floor(this.rng() * this.K.tics.length)];
      const d = { pat: 1.4, yawn: 1.6, hop: 0.6, look: 1.6, wave: 1.2, shades: 0.7, cool: 2.2, whistle: 1.1, point: 1.3, glasses: 0.8, think: 2.4, twirl: 1.0 }[n] || 1;
      this.tic = { n, t: 0, d };
      if (n === 'hop') { this.jump(-200, 0); this.pomY.kick(-60); }
      if (n === 'look') this.face(-this.facing);
    }

    _computePose(dt) {
      const P = this.tp, t = this.t, ph = this.phase;
      // defaults
      P.lean = 0; P.roll = 0; P.bob = 0; P.crouch = 0; P.beak = 0; P.prone = 0; P.sq = 1; P.pitch = 0;
      P.fFx = 0; P.fFy = 0; P.fBx = 0; P.fBy = 0;
      P.aF = 0.22 + Math.sin(t * 1.6 + this.id) * 0.03; P.aB = -0.22 - Math.sin(t * 1.6 + this.id) * 0.03;
      let eyes = 'open';
      const celNow = this.action === 'cheer' || this.action === 'clap' ? this.action : null;
      if (celNow && this._celA !== celNow) celebrate(this, celNow);
      this._celA = celNow; if (celNow) this._celT += dt;
      const s = Math.sin(ph);

      const gait = this.stepping ? 'walk' : this.loco;
      switch (gait) {
        case 'stand':
          P.bob = Math.sin(t * 2.3 + this.id) * 0.6; P.sq = 1 + Math.sin(t * 2.3 + this.id) * 0.008;
          break;
        case 'walk':
          P.roll = s * 0.11; P.bob = -Math.abs(s) * 3.2;
          P.fFy = -Math.max(0, s) * 6; P.fBy = -Math.max(0, -s) * 6;
          P.fFx = Math.cos(ph) * 4; P.fBx = -Math.cos(ph) * 4;
          P.aF = 0.45 + s * 0.18; P.aB = -0.45 + s * 0.18;
          break;
        case 'march':
          P.roll = s * 0.03; P.bob = -Math.abs(s) * 2.2; P.lean = -0.05;
          P.fFy = -Math.max(0, s) * 13; P.fBy = -Math.max(0, -s) * 13;
          P.fFx = Math.max(0, s) * 5; P.fBx = Math.max(0, -s) * 5;
          P.aF = 0.15 + s * 0.35; P.aB = -0.15 + s * 0.35;
          break;
        case 'climb':
          P.lean = 0.12; P.aF = PI - 0.5 + s * 0.35; P.aB = -(PI - 0.5) + s * 0.35;
          P.fFy = -Math.max(0, s) * 8; P.fBy = -Math.max(0, -s) * 8; P.fFx = 4; P.fBx = 4;
          break;
        case 'sit':
          P.crouch = 1; P.fFx = 14; P.fBx = 16; P.fFy = -3; P.fBy = -3; P.aF = -0.5; P.aB = -0.6;
          break;
        case 'glide': {
          const g = Math.sin(this.cyc);
          P.lean = 0.22; P.roll = g * 0.08; P.crouch = 0.25;
          P.fFx = g > 0 ? -g * 14 : 2; P.fFy = g > 0 ? -g * 5 : 0;
          P.fBx = g < 0 ? g * 14 : 2; P.fBy = g < 0 ? g * 5 : 0;
          P.aF = 0.9; P.aB = 0.7; // flippers behind the back
          break;
        }
        case 'ski':
          P.lean = 0.16; P.crouch = 0.35; P.fFx = 3; P.fBx = -3;
          P.aF = -0.9 + Math.sin(this.cyc) * 0.75; P.aB = -1.0 + Math.sin(this.cyc) * 0.75;
          break;
        case 'prone': {
          // tobogganing: flat on the belly, head up, flippers held out and back for balance (a little
          // steering flick now and then), feet pushing behind
          const sp = Math.min(1, Math.abs(this.vx || 0) / 140), st = this.t * (6 + sp * 2) + this.id;
          const kick = this.kick || 0;
          P.prone = 1; P.pitch = Math.sin(st * 0.5) * 0.02;
          P.aF = 0.5 + Math.max(0, Math.sin(st * 0.9)) * 0.22 * sp; P.aB = -0.2;
          P.fFx = -2 + Math.sin(st) * 5 * kick; P.fBx = 2 - Math.sin(st) * 5 * kick;
          P.fFy = -3 - Math.max(0, Math.sin(st)) * 8 * kick; P.fBy = -3 - Math.max(0, -Math.sin(st)) * 8 * kick;
          P.sq = 1; P.bob = 0; // eyes open: looking where it's going
          break;
        }
        case 'scrabble':
          P.lean = Math.sin(t * 9) * 0.25; P.roll = Math.sin(t * 13) * 0.12;
          P.fFx = Math.sin(t * 22) * 9; P.fBx = -Math.sin(t * 22) * 9; P.fFy = -Math.max(0, Math.sin(t * 22)) * 5; P.fBy = -Math.max(0, -Math.sin(t * 22)) * 5;
          P.aF = 1.8 + Math.sin(t * 17) * 0.7; P.aB = -1.8 + Math.sin(t * 15) * 0.7; eyes = 'wide';
          break;
        case 'limbo':
          P.lean = -(this.limbo ?? 0.7); P.crouch = 0.5 * (this.limbo ?? 0.7); P.fFx = 10 + s * 5; P.fBx = 12 - s * 5;
          P.fFy = -Math.max(0, s) * 3; P.fBy = -Math.max(0, -s) * 3;
          P.aF = 1.6 + s * 0.2; P.aB = -1.6 + s * 0.2;
          break;
        case 'air':
          P.fFy = -6; P.fBy = -4; P.aF = 1.2; P.aB = -1.2;
          P.sq = 1 + clamp(Math.abs(this.vy || 0) / 7000, 0, 0.1); // stretched by speed
          break;
      }

      // anticipation: a quick crouch and lean before a dive or a jump
      if (this.anticip) { P.crouch = Math.max(P.crouch, this.anticip * 0.9); P.lean += this.anticip * 0.35; P.aF = lerp(P.aF, 1.6, this.anticip); P.aB = lerp(P.aB, -1.6, this.anticip); P.sq *= 1 - this.anticip * 0.08; }
      // personality in the gait
      const kind = this.kind;
      if (gait === 'walk') {
        if (kind === 'chubby') { P.roll *= 1.6; P.bob *= 1.2; P.aF += 0.25; P.aB -= 0.25; }
        else if (kind === 'pip') { P.bob *= 1.5; P.roll *= 1.2; P.aF += Math.sin(ph * 2) * 0.2; }
        else if (kind === 'captain') { P.roll *= 0.35; P.lean = -0.05; P.aF = 0.85; P.aB = 0.55; P.bob *= 0.6; }
        else if (kind === 'rocco') {
          // rockhoppers hop with both feet together
          const h = Math.abs(Math.sin(ph));
          P.roll = s * 0.03; P.bob = -h * 11; P.fFy = P.fBy = -h * 3; P.fFx = 2; P.fBx = -2;
          P.aF = 0.7 + h * 0.5; P.aB = -0.7 - h * 0.5; P.sq = 1 + (1 - h) * 0.03;
        }
      }
      if (this.loco === 'stand' && this.action === 'none') {
        if (kind === 'captain') { P.aF = 0.8; P.aB = 0.6; P.lean = -0.04; }
        if (kind === 'chubby') { P.sq = 1 + Math.sin(t * 1.6 + this.id) * 0.018; }
        if (kind === 'rocco') { P.aF = 0.35; P.roll = 0.04; }
      }
      if (this.tic && this.action === 'none') {
        const u = this.tic.t / this.tic.d, n = this.tic.n;
        if (n === 'pat') { const k = Math.max(0, Math.sin(t * 12)); P.aF = -0.55 - k * 0.35; P.aB = -0.6 - k * 0.3; eyes = 'happy'; }
        if (n === 'yawn') { P.beak = Math.sin(u * PI) * 1.1; P.lean = -0.08 * Math.sin(u * PI); P.aF = 1.2 * Math.sin(u * PI); P.aB = -1.2 * Math.sin(u * PI); eyes = 'closed'; }
        if (n === 'wave') { P.aF = PI - 0.6 + Math.sin(t * 10) * 0.35; eyes = 'happy'; }
        if (n === 'shades') { P.aF = -2.65; }
        if (n === 'cool') { P.lean = -0.1; P.aF = 0.9; P.aB = 0.9; P.roll = 0.08; }
        if (n === 'whistle') { P.aF = -2.35; P.beak = 0.3; eyes = 'closed'; P.bob -= Math.sin(u * PI) * 2; }
        if (n === 'point') { P.aF = -1.75; P.beak = 0.25; }
        if (n === 'twirl') { this.spin = SD.easeInOut(u) * TAU; P.aF = 1.3; P.aB = -1.3; P.bob -= Math.sin(u * PI) * 4; eyes = 'happy'; }
        if (n === 'glasses') { P.aF = -2.75 + Math.sin(u * PI) * 0.12; P.bob -= Math.sin(u * PI) * 1.5; }
        if (n === 'think') { P.aF = -2.05; P.aB = -0.9; P.lean = -0.04; P.roll = 0.05; P.beak = 0.05; if (u > 0.75) { eyes = 'happy'; } }
      }

      // upper body actions
      const c = this.cyc;
      switch (this.action) {
        case 'carryUp': P.aF = PI - 0.18; P.aB = -(PI - 0.18); P.bob += Math.sin(ph) * 0.8; break;
        case 'carryFront': P.aF = -0.95; P.aB = -1.15; break;
        case 'carryLadder': P.aF = -1.3; P.aB = -1.4; P.lean = -0.04; P.bob += Math.sin(ph) * 0.6; break;
        case 'hold': P.aF = -0.8; break;
        case 'carryShoulder': P.aF = -0.55; P.aB = -0.25; break;
        case 'presentCane': P.aF = -1.05; P.aB = -0.25; P.lean = -0.04; break;
        case 'push': P.lean = 0.3; P.aF = -1.35; P.aB = -1.5; break;
        case 'cheer':
        case 'clap': {
          // Celebrating. Not every little success gets the full treatment: the first one in a scene
          // does, and after that only a moment the whole crew joins in, or one a good while after
          // the last. In between it's a nod, a smile, a couple of claps. And no two penguins (or two
          // occasions) celebrate quite the same way. See celebrate() below.
          const st = this._cel, ct = this._celT, k = Math.sin(t * 13 + this.id), hop = -Math.abs(Math.sin(t * 7.5 + this.id));
          eyes = 'happy';
          if (st === 0) { P.bob += hop * 10; P.aF = PI - 0.35 + Math.sin(t * 15) * 0.25; P.aB = -(PI - 0.35) - Math.sin(t * 15 + 1) * 0.25; P.beak = 0.8; P.sq = 1 + Math.sin(t * 15) * 0.03; } // both flippers up, bouncing
          else if (st === 1) { P.bob += hop * 7; P.aF = PI - 0.5 + Math.sin(t * 11) * 0.5; P.aB = -0.5; P.beak = 0.7; P.lean = -0.06; }                // one flipper punching the air
          else if (st === 2) { P.roll += Math.sin(t * 6 + this.id) * 0.15; P.aF = 1.5; P.aB = -1.5; P.bob += hop * 4; P.beak = 0.6; }                     // a happy side-to-side dance
          else if (st === 3) { P.aF = PI - 0.95 + k * 0.3; P.aB = -(PI - 0.95) + k * 0.3; P.bob += -Math.abs(k) * 3; P.beak = 0.6; }                       // clapping overhead
          else if (st === 4) { P.bob += hop * 12; P.aF = 1.1 + Math.sin(t * 20) * 0.5; P.aB = -1.1 - Math.sin(t * 20) * 0.5; P.beak = 0.9; }                // flapping jumps
          else if (st === 5) { P.aF = -1.05 + k * 0.3; P.aB = -1.15 - k * 0.3; P.beak = 0.4; P.bob += -Math.abs(k) * 1.5; }                               // clapping
          else if (st === 10) { P.lean = 0.07 * Math.max(0, Math.sin(ct * 7)) * Math.max(0, 1 - ct / 1.6); P.beak = 0.2; }                                // a nod and a smile
          else if (st === 11) { const e = Math.max(0, 1 - ct / 1.8); P.aF = lerp(P.aF, -1.05 + k * 0.25, e); P.aB = lerp(P.aB, -1.15 - k * 0.25, e); P.beak = 0.25 * e; } // a few soft claps
          else if (st === 12) { const e = SD.smooth(clamp(Math.min(ct / 0.2, (1.3 - ct) / 0.3), 0, 1)); P.aF = lerp(P.aF, PI - 0.8, e); P.beak = 0.3 * e; P.bob += -2 * e; } // a flipper up, then down
          else { const e = Math.max(0, 1 - ct / 0.5); P.bob += -Math.sin(Math.min(1, ct / 0.5) * PI) * 6; P.beak = 0.4 * e; }                              // one little hop
          break;
        }
        case 'wave': P.aF = PI - 0.6 + Math.sin(t * 10) * 0.35; P.beak = 0.3; eyes = 'happy'; break;
        case 'drum': { const a = Math.max(0, Math.sin(t * 2 * PI * 2)), b = Math.max(0, -Math.sin(t * 2 * PI * 2)); P.aF = -0.7 - a * 0.7; P.aB = -0.8 - b * 0.7; break; }
        case 'sway': P.roll += Math.sin(t * 2.4 + this.id * 0.4) * 0.12; P.beak = Math.max(0, Math.sin(t * 4.8 + this.id)) * 0.6; eyes = 'happy'; P.aF = 0.5 + Math.sin(t * 2.4) * 0.2; P.aB = -0.5 + Math.sin(t * 2.4) * 0.2; break;
        case 'shovel': {
          // c in [0,1): 0-.35 dig, .35-.6 lift, .6-.8 toss, .8-1 recover
          const u = c % 1;
          if (u < 0.35) { const k = u / 0.35; P.lean = 0.45 * SD.smooth(k); P.aF = -0.6 - 0.2 * k; P.aB = -0.75 - 0.2 * k; P.crouch = 0.3 * k; }
          else if (u < 0.6) { const k = (u - 0.35) / 0.25; P.lean = lerp(0.45, 0.05, k); P.aF = lerp(-0.8, -1.6, k); P.aB = lerp(-0.95, -1.7, k); P.crouch = 0.3 * (1 - k); }
          else if (u < 0.8) { const k = (u - 0.6) / 0.2; P.lean = lerp(0.05, -0.18, k); P.aF = lerp(-1.6, -2.7, SD.easeOut(k)); P.aB = lerp(-1.7, -2.8, SD.easeOut(k)); }
          else { const k = (u - 0.8) / 0.2; P.lean = lerp(-0.18, 0, k); P.aF = lerp(-2.7, -0.6, k); P.aB = lerp(-2.8, -0.75, k); }
          break;
        }
        case 'poles': break; // handled by loco ski
        case 'flail': P.aF = 2 + Math.sin(t * 19) * 0.8; P.aB = -2 + Math.sin(t * 17) * 0.8; eyes = 'wide'; P.beak = 1; break;
        case 'armsUp': P.aF = PI - 0.25; P.aB = -(PI - 0.25); P.beak = 0.9; eyes = 'happy'; break;
        case 'armsOut': P.aF = 1.55; P.aB = -1.55; break;
        case 'tuck': P.aF = -2.2; P.aB = -2.3; P.crouch = 0.8; P.fFy = -10; P.fBy = -10; P.fFx = 8; P.fBx = 10; eyes = 'closed'; break;
        case 'reach': {
          if (this.reachTo) {
            const lp = this.toLocal(this.reachTo[0], this.reachTo[1]);
            const dx = lp[0] - (-20), dy = lp[1] - (-58);
            P.aF = clamp(Math.atan2(-dx, dy), -PI + 0.1, PI - 0.1);
            P.aB = -0.3;
          }
          break;
        }
        case 'pass': { const u = (c % 1); P.aF = lerp(-1.0, PI - 0.3, SD.smooth(u * 1.6)); P.aB = lerp(-1.1, -(PI - 0.3), SD.smooth(u * 1.6)); break; }
        case 'baton': P.aF = PI - 0.4 + Math.sin(t * 6) * 0.25; P.aB = -0.4 - Math.sin(t * 4) * 0.1; break;
        case 'point': P.aF = -1.75; P.beak = 0.3; break;
        case 'startle': P.aF = 1.9 + Math.sin(t * 30) * 0.1; P.aB = -1.9; eyes = 'wide'; P.beak = 0.7; P.sq = 1.06; break;
        case 'dive': P.aF = PI - 0.1; P.aB = -(PI - 0.1); eyes = 'closed'; break;
        case 'plant': P.lean = 0.25; P.aF = -0.35; P.aB = -0.45; P.crouch = 0.25; break;
        case 'lookUp': P.lean = -0.12; P.beak = 0.15; break;
        case 'blowKiss': P.aF = -2.1; eyes = 'happy'; break;
        case 'sleepy': eyes = 'closed'; P.lean = 0.05; P.roll += Math.sin(t * 1.2) * 0.03; break;
        case 'flap': { const f = Math.sin(t * 30 + this.id); P.aF = 1.5 + f * 0.95; P.aB = -1.5 - f * 0.95; P.beak = 0.5; eyes = this.eyes === 'wide' ? 'wide' : 'open'; P.sq = 1 + f * 0.02; break; }
        case 'pull': P.lean = -0.38 - Math.sin(t * 3 + this.id) * 0.05; P.crouch = 0.25; P.aF = -1.35; P.aB = -1.45; P.fFx = 8; P.fBx = 10; P.beak = 0.2; eyes = 'closed'; break;
        case 'throw': {
          const u = c % 1;
          if (u < 0.45) { const k = SD.smooth(u / 0.45); P.aF = lerp(0.3, 2.7, k); P.lean = -0.15 * k; }
          else if (u < 0.62) { const k = (u - 0.45) / 0.17; P.aF = lerp(2.7, -1.9, SD.easeOut(k)); P.lean = lerp(-0.15, 0.22, k); }
          else { const k = (u - 0.62) / 0.38; P.aF = lerp(-1.9, 0.3, k); P.lean = lerp(0.22, 0, k); }
          P.aB = -0.6; break;
        }
        case 'hide': P.crouch = 0.9; P.lean = 0.2; P.aF = -0.9; P.aB = -1.0; eyes = 'closed'; break;
        case 'fish': P.aF = -1.15; P.aB = -1.0; break;
        case 'eat': { const k = Math.max(0, Math.sin(t * 9)); P.aF = -2.05; P.beak = k * 0.9; eyes = 'happy'; break; }
        case 'hug': P.aF = -1.05; P.aB = -1.1; eyes = 'closed'; P.roll += Math.sin(t * 1.4 + this.id) * 0.05; break;
        case 'shiver': P.aF = -0.85; P.aB = -0.95; eyes = 'closed'; P.roll += Math.sin(t * 38) * 0.035; P.crouch = 0.15; break;
        case 'hang': P.aF = PI - 0.12; P.aB = -(PI - 0.12); P.fFx = 4; P.fBx = -4; P.fFy = -2 + Math.sin(t * 8) * 2; P.fBy = -2 - Math.sin(t * 8) * 2; break;
        case 'cards': P.aF = PI - 0.45; P.aB = -(PI - 0.45); P.beak = 0.2; break;
        case 'cardUp': P.aF = PI - 0.3; P.aB = -0.5; P.beak = 0.15; break;
        // the kitchen and the TV studio
        case 'work': { const k = Math.sin(t * 9 + this.id); P.aF = -1.55 + k * 0.22; P.aB = -1.45 - k * 0.22; P.lean = 0.1; P.beak = 0.05; break; }
        case 'tap': { const k = Math.max(0, Math.sin(t * 14)); P.aF = -1.35 - k * 0.45; P.aB = -1.2; P.lean = 0.12; break; }
        case 'measure': P.aF = -1.62 + Math.sin(t * 1.6) * 0.04; P.aB = -1.55; P.lean = 0.14; P.beak = 0.05; break;
        case 'pipe': { const k = Math.max(0, Math.sin(t * 5)); P.aF = -1.45 + Math.sin(t * 2.2) * 0.12; P.aB = -1.0; P.lean = 0.12; P.beak = 0.1 + k * 0.1; break; }
        case 'roll': { const k = Math.sin(t * 5.5); P.aF = -1.45 + k * 0.2; P.aB = -1.5 + k * 0.2; P.lean = 0.16 + k * 0.06; break; }
        case 'stir': P.aF = -1.35 + Math.sin(t * 8) * 0.3; P.aB = -1.15; P.lean = 0.08; break;
        case 'inspect': P.lean = 0.26 + Math.sin(t * 1.3) * 0.02; P.aF = 0.55; P.aB = 0.65; P.beak = 0.08; break;
        case 'mic': P.aF = -2.3; P.beak = Math.max(0, Math.sin(t * 9 + this.id)) * 0.6; break;
        case 'ring': P.aF = PI - 0.5 + Math.sin(t * 22) * 0.3; P.beak = 0.6; eyes = 'happy'; break;
        case 'shrug': P.aF = 0.85; P.aB = -0.85; P.beak = 0.2; P.roll += 0.04; P.bob -= 2; break;
        case 'pant': P.crouch = 0.25; P.lean = 0.3; P.aF = -0.45; P.aB = -0.55; P.beak = 0.5 + Math.sin(t * 12) * 0.3; eyes = 'closed'; P.bob += Math.sin(t * 12) * 1.2; break;
        case 'boom': P.aF = -2.45; P.aB = -2.25; P.lean = -0.04; break;
        case 'present': P.aF = -1.25; P.aB = -1.35; P.beak = 0.3; eyes = 'happy'; break;
        // carols: head back, beak wide, eyes shut, swaying together (everyone shares the same beat)
        case 'sing': { const bt = this.world.t * 2.2; P.lean = -0.2; P.roll += Math.sin(bt) * 0.08; P.beak = 1.25 + 0.55 * Math.sin(bt * 2 + this.id * 1.7); P.aF = 0.5; P.aB = -0.35 - Math.max(0, Math.sin(bt + this.id)) * 0.5; P.bob = -Math.max(0, Math.sin(bt * 2)) * 2.5; eyes = Math.sin(bt * 0.5 + this.id) > 0.75 ? 'happy' : 'open'; break; }
        // the nativity and the long table
        case 'kneel': P.crouch = 0.75; P.fFx = 12; P.fBx = 14; P.fFy = -2; P.fBy = -2; P.aF = -1.0; P.aB = -1.1; P.lean = 0.08; break;
        case 'pray': P.aF = -1.32; P.aB = -1.42; P.lean = 0.06; eyes = 'closed'; P.beak = 0; break;
        case 'bow': P.lean = 0.42; P.crouch = 0.1; P.aF = 0.5; P.aB = -0.4; eyes = 'happy'; break;
        case 'lean': P.lean = 0.2 + Math.sin(t * 1.1 + this.id) * 0.02; P.aF = -0.9; P.aB = -0.7; P.beak = Math.max(0, Math.sin(t * 6 + this.id)) * 0.4; break;
        case 'self': P.aF = -1.8; P.aB = -0.3; P.lean = -0.06; P.beak = 0.5; eyes = 'wide'; break;
        case 'raise': P.aF = 2.0 + Math.sin(t * 1.5 + this.id) * 0.05; P.aB = -2.0; P.lean = -0.08; P.beak = 0.6; eyes = 'wide'; break;
        case 'offer': P.aF = -1.5; P.aB = -1.6; P.lean = 0.1; P.beak = 0.15; break;
        case 'drill': P.crouch = 0.35; P.lean = 0.3; P.aF = -0.75; P.aB = -0.85; P.roll += Math.sin(t * 24) * 0.02; break;
      }
      if (this.armF != null) P.aF = this.armF;
      if (this.armB != null) P.aB = this.armB;
      if (this.dizzy > 0) { eyes = 'dizzy'; P.roll += Math.sin(t * 5) * 0.12; }
      if (this.eyeOverride) eyes = this.eyeOverride;
      if (this.blinkT > 0 && eyes === 'open') eyes = 'blink';
      this.eyes = eyes;

      const k = this.loco === 'climb' || this.loco === 'march' ? 18 : 12;
      for (const key of POSE_KEYS) {
        if (key === 'aF' || key === 'aB') this.p[key] = angDamp(this.p[key], P[key], 14, dt);
        else if (key === 'bob' || key.startsWith('f')) this.p[key] = damp(this.p[key], P[key], 22, dt);
        else this.p[key] = damp(this.p[key], P[key], k, dt);
      }
      // squash on landing goes straight on (no smoothing), springing back with a little overshoot
      if (this.land) this.p.sq = Math.max(0.78, this.p.sq * (1 + this.land.x * 0.022));
    }

    // world -> penguin local (ignores rotation, fine for reach targets)
    toLocal(wx, wy) {
      const s = this.size;
      return [((wx - this.x) / (s * this.K.kx)) * Math.sign(this.fx || 1), (wy - (this.y + this.p.bob)) / (s * this.K.ky)];
    }
    // local hand point -> world
    // drawn size: the penguin's own size, scaled by how near it stands
    get size() { return this.baseSize * SD.depthScale(this.lane); }
    set size(v) { this.baseSize = v; }
    handWorld(which = 'F') {
      const p = this.p;
      const piv = which === 'F' ? [-20, -58] : [22, -58];
      const a = which === 'F' ? p.aF : p.aB;
      const lx = piv[0] - Math.sin(a) * 30, ly = piv[1] + Math.cos(a) * 30 + p.crouch * 12;
      return this.localToWorld(lx, ly);
    }
    localToWorld(lx, ly) {
      const p = this.p, s = this.size;
      const r = (p.lean + p.roll + this.rot) * Math.sign(this.fx || 1);
      const fx = this.fx;
      const x0 = lx * fx * s * this.K.kx / Math.sqrt(p.sq), y0 = ly * s * p.sq * this.K.ky;
      const c = Math.cos(r), sn = Math.sin(r);
      return [this.x + x0 * c - y0 * sn, this.y + p.bob + x0 * sn + y0 * c];
    }
    headTop() { return this.localToWorld(0, this.headTopLocal()); }

    // ---------- drawing ----------
    drawShadow(ctx) {
      if (this.hidden || !this.visible || this.noShadow) return;
      const w = this.world;
      const gy = w.surfaceY(this.x) + this.lane;
      const h = Math.max(0, gy - this.y);
      const s = this.size * this.K.kx * (1 - clamp(h / 300, 0, 0.7));
      ctx.save();
      ctx.globalAlpha = 0.2 * this.alpha * (1 - clamp(h / 400, 0, 0.8));
      ctx.fillStyle = '#2a4068';
      ctx.beginPath();
      ctx.ellipse(this.x + (this.p.prone ? this.facing * 10 * this.size : 0), gy + 1, (this.p.prone > 0.5 ? 50 : 30) * s, 6 * s, 0, 0, TAU);
      ctx.fill();
      if (this.p.prone > 0.5 && Math.abs(this.vx || 0) > 30) {
        // the groove the belly cuts, and the bow-wave of snow it shoves along
        const f = Math.sign(this.fx) || 1, L = clamp(Math.abs(this.vx) * 0.45, 20, 120) * this.size;
        ctx.globalAlpha = 0.16 * this.alpha; ctx.fillStyle = '#35507e';
        ctx.beginPath(); ctx.ellipse(this.x - f * (L * 0.55 + 20 * s), gy + 1, L * 0.55, 2.6 * s, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    // redraw just one flipper on top of something held (so a hand grips a bar in front of the body)
    drawFlipper(ctx, which = 'F') { this._partOnly = which; this.draw(ctx); this._partOnly = null; }

    draw(ctx) {
      if (this.hidden || !this.visible) return;
      const p = this.p, s = this.size;
      ctx.save();
      if (this.sinkClip) {
        const sy = this.world.surfaceY(this.x) + this.lane * 0.3;
        ctx.beginPath(); ctx.rect(this.x - 200, sy - 600, 400, 600); ctx.clip();
      }
      ctx.globalAlpha = this.alpha;
      ctx.translate(this.x, this.y + p.bob);
      const dir = Math.sign(this.fx) || 1;
      let sx = Math.abs(this.fx) < 0.12 ? 0.12 * dir : this.fx;
      if (this.spin) sx *= Math.cos(this.spin);
      ctx.rotate((p.lean + p.roll) * dir + this.rot);
      ctx.scale(sx * s * this.K.kx / Math.sqrt(p.sq), s * p.sq * this.K.ky);
      const cr = p.crouch * 12;
      if (p.prone > 0.5 && !this._partOnly) this._drawProne(ctx);
      else if (p.prone > 0.001) {
        // going down or getting up: tip forward; the belly figure takes over from there
        ctx.translate(0, -34); ctx.rotate(p.prone * 1.5 + p.pitch); ctx.translate(0, 34);
        this._drawBody(ctx, cr);
      } else this._drawBody(ctx, cr);
      ctx.restore();
      if (p.prone > 0.5 && !this._partOnly && !this.air) this._snowLip(ctx);

      if (this._partOnly || SD.reflecting) return;
      // bubble / dizzy overlay (unrotated)
      if (this.bubble) this._drawBubble(ctx);
      if (this.dizzy > 0) this._drawDizzy(ctx);
    }

    // On the belly, tobogganing: its own drawing, not the standing one moved about. Side on, one
    // outline from tail to beak; belly on the snow, tail up, feet trailing, a flipper back along the
    // side, head up and looking where it's going, scarf streaming.
    _drawProne(ctx) {
      const p = this.p, K = this.kind, pal = this.pal, C = KCOL[K] || KCOL.crew, t = this.t;
      const sp = Math.min(1, Math.abs(this.vx || 0) / 140), st = t * (6 + sp * 2) + this.id, kick = Math.sin(st) * (this.kick || 0);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.rotate(p.pitch);
      // feet, soles up, trailing
      ctx.save(); ctx.translate(-65, -24 - kick * 4); ctx.rotate(PI - 0.4 + kick * 0.25); this._foot(ctx, 0, 0, true); ctx.restore();
      ctx.save(); ctx.translate(-63, -13 + kick * 4); ctx.rotate(PI - 0.12 - kick * 0.25); this._foot(ctx, 0, 0, false); ctx.restore();
      // things behind the head
      if (K === 'chubby') ctx.scale(1.05, 1.1);
      // the figure
      const g = ctx.createRadialGradient(-10, -60, 4, 0, -36, 80);
      g.addColorStop(0, C.hi); g.addColorStop(0.55, C.back); g.addColorStop(1, C.dark);
      ctx.fillStyle = g; ctx.fill(PRONE_FIG);
      ctx.save(); ctx.clip(PRONE_FIG);
      if (K === 'pip') {
        ctx.fillStyle = '#c9d0d8'; ctx.fill(PRONE_BELLY);
        ctx.fillStyle = '#1f232b'; ctx.beginPath(); ctx.moveTo(8, -90); ctx.lineTo(90, -90); ctx.lineTo(90, -28); ctx.quadraticCurveTo(50, -14, 30, -34); ctx.quadraticCurveTo(16, -48, 8, -62); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f4f7fa'; ctx.beginPath(); ctx.ellipse(64, -46, 15, 19, 0.15, 0, TAU); ctx.fill();
      } else {
        const bg = ctx.createLinearGradient(0, -40, 0, 2);
        bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.55, CREAM); bg.addColorStop(1, CREAM_SH);
        ctx.fillStyle = bg; ctx.fill(this.darkFace ? PRONE_BELLY : PRONE_FRONT);
        if (K === 'captain') { const gg = ctx.createRadialGradient(54, -30, 1, 54, -30, 15); gg.addColorStop(0, 'rgba(255,190,90,0.8)'); gg.addColorStop(1, 'rgba(255,214,140,0)'); ctx.fillStyle = gg; ctx.fill(PRONE_FRONT); }
      }
      ctx.strokeStyle = C.rim; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-50, -58); ctx.bezierCurveTo(-30, -63, -8, -63, 8, -59); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.stroke(PRONE_FIG);
      // flipper along the side, lifting a little with speed
      ctx.save(); ctx.translate(14, -45); ctx.rotate(Math.max(0, Math.sin(st * 0.9)) * 0.22 * sp); ctx.translate(-14, 45);
      ctx.fillStyle = K === 'pip' ? '#8f98a4' : BACK; ctx.fill(PRONE_FLIPPER);
      ctx.strokeStyle = 'rgba(140,165,215,0.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(6, -49); ctx.bezierCurveTo(-4, -54, -14, -54, -22, -50); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke(PRONE_FLIPPER);
      ctx.restore();
      // face, in profile: cheek, the one eye we can see, the beak out in front
      ctx.fillStyle = K === 'chubby' || K === 'holly' ? 'rgba(255,118,140,0.5)' : K === 'rocco' ? 'rgba(255,135,165,0.26)' : 'rgba(255,128,150,0.38)';
      ctx.beginPath(); ctx.ellipse(63, -37, 4.6, 3, 0, 0, TAU); ctx.fill();
      this._eyes(ctx, [63, -50]);
      ctx.save(); ctx.translate(69.5, 19.5); this._beak(ctx, p.beak); ctx.restore();
      if (K === 'specs') {
        ctx.fillStyle = 'rgba(205,232,255,0.28)'; ctx.beginPath(); ctx.arc(63, -50, 8.2, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#3a2416'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(63, -50, 8.2, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(55, -51); ctx.lineTo(30, -56); ctx.stroke();
      }
      // neckwear
      if (K === 'specs') { ctx.save(); ctx.translate(55, -19); ctx.rotate(-0.35); ctx.translate(-5, 51); this._bowtie(ctx); ctx.restore(); }
      else if (K !== 'captain' && K !== 'stranger' && K !== 'rocco') {
        const band = new Path2D('M9,-60 Q20,-34 44,-11 L55,-19 Q33,-38 21,-63 Z');
        ctx.fillStyle = pal.scarf; ctx.fill(band);
        ctx.save(); ctx.clip(band); ctx.fillStyle = pal.salt;
        for (let k = 0; k < 6; k++) { const y = -60 + k * 10; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(70, y - 12); ctx.lineTo(70, y - 8); ctx.lineTo(0, y + 4); ctx.closePath(); ctx.fill(); }
        ctx.restore();
        ctx.strokeStyle = INK; ctx.lineWidth = 2.3; ctx.stroke(band);
        ctx.save(); ctx.translate(15, -60); ctx.rotate(2.2 + Math.sin(t * 9 + this.id) * 0.12 * (0.4 + sp) - this.tail.x * 0.15);
        const tail = new Path2D('M-5,0 L5,0 L6.5,24 L-4,25 Z');
        ctx.fillStyle = pal.scarf; ctx.fill(tail);
        ctx.save(); ctx.clip(tail); ctx.fillStyle = pal.salt; ctx.fillRect(-8, 8, 16, 4); ctx.fillRect(-8, 16, 16, 4); ctx.restore();
        ctx.strokeStyle = INK; ctx.lineWidth = 2.1; ctx.stroke(tail);
        ctx.lineWidth = 1.6; ctx.strokeStyle = pal.scarf; ctx.beginPath();
        for (let k = 0; k < 4; k++) { const fx = -3.3 + k * 3; ctx.moveTo(fx, 25); ctx.lineTo(fx + 0.6, 30); }
        ctx.stroke(); ctx.restore();
        ctx.beginPath(); ctx.ellipse(15, -60, 5.5, 4.6, 0.3, 0, TAU); ctx.fillStyle = SD.shade(pal.scarf, -0.08); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.1; ctx.stroke();
      }
      // headwear, sitting on this head (a little back, as the head is up)
      ctx.save(); ctx.translate(45, -47); ctx.rotate(-0.16); ctx.translate(-1, 47 + 26 - this.hatLift.x);
      if (this.hatOff && (K === 'crew' || K === 'chubby' || K === 'captain' || K === 'holly')) { /* blown away */ }
      else if (K === 'captain') this._captainCap(ctx);
      else if (K === 'rocco') { ctx.translate(-2, -4); this._crest(ctx); ctx.translate(3, -2); this._plumes(ctx, false); }
      else if (K === 'pip') this._tuft(ctx);
      else if (K === 'specs') this._cowlick(ctx);
      else if (K === 'stranger') this._fancyHat(ctx);
      else if (pal.style === 'muffs') {
        ctx.strokeStyle = INK; ctx.lineWidth = 6.5; ctx.beginPath(); ctx.moveTo(-6, -76); ctx.bezierCurveTo(-8, -100, 4, -110, 14, -106); ctx.stroke();
        ctx.strokeStyle = pal.alt; ctx.lineWidth = 3.6; ctx.stroke();
        this._muff(ctx, -6, -74, false);
      } else this._hat(ctx);
      if (this.costume) this.costume(ctx, this);
      ctx.restore();
    }

    _drawBody(ctx, cr) {
      const p = this.p, pal = this.pal;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (this._partOnly) {
        ctx.save(); ctx.translate(0, cr);
        if (this._partOnly === 'F') this._flipper(ctx, -20, -58 + 22 * p.prone, p.aF, false); else this._flipper(ctx, 22, -58 + 22 * p.prone, p.aB, true);
        ctx.restore();
        return;
      }
      const LW = 2.6;
      // back foot
      this._foot(ctx, 9 + p.fBx, p.fBy, true);
      // back flipper (behind body)
      ctx.save(); ctx.translate(0, cr);
      if (this.item && this.item.at === 'back') this._drawItem(ctx, this.item, 'F');
      if (this.item2 && this.item2.at === 'back') this._drawItem(ctx, this.item2, 'B');
      this._flipper(ctx, 22, -58 + 22 * p.prone, p.aB, true);
      if (pal.style === 'muffs') this._muff(ctx, 22, -80, true);
      if (pal.style === 'flaps') { ctx.save(); ctx.translate(0, -6); this._flap(ctx, 1); ctx.restore(); }
      if (this.kind === 'rocco') this._plumes(ctx, true);
      // scarf tail (behind if blown back)
      ctx.restore();
      // costume parts that hang behind the body (wings, a cloak's back)
      if (this.costumeBack) { ctx.save(); ctx.translate(0, cr); this.costumeBack(ctx, this); ctx.restore(); }

      ctx.save();
      ctx.translate(0, cr);
      // squash body when crouching
      if (cr) { ctx.translate(0, -5); ctx.scale(1 + p.crouch * 0.06, 1 - p.crouch * 0.1); ctx.translate(0, 5); }
      // body
      const K = this.kind;
      const body = K === 'chubby' ? CHUBBY_BODY : BODY_PATH;
      const C = KCOL[K] || KCOL.crew;
      const g = ctx.createRadialGradient(-12, -78, 4, -4, -50, 62);
      g.addColorStop(0, C.hi); g.addColorStop(0.55, C.back); g.addColorStop(1, C.dark);
      ctx.fillStyle = g; ctx.fill(body);
      ctx.save();
      ctx.clip(body);
      if (K === 'pip') this._pipFace(ctx);
      else {
        const front = this.darkFace ? ROCCO_FRONT : K === 'chubby' ? CHUBBY_FRONT : FRONT_PATH;
        const bg = ctx.createRadialGradient(8, -42, 6, 6, -40, 40);
        bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.65, CREAM); bg.addColorStop(1, CREAM_SH);
        ctx.fillStyle = bg; ctx.fill(front);
        if (K === 'captain') {
          // golden throat of a king-style penguin
          const gg = ctx.createRadialGradient(8, -57, 1, 8, -56, 13);
          gg.addColorStop(0, 'rgba(255,200,110,0.75)'); gg.addColorStop(1, 'rgba(255,214,140,0)');
          ctx.fillStyle = gg; ctx.fill(front);
        }
        ctx.strokeStyle = 'rgba(160,130,95,0.18)'; ctx.lineWidth = 1; ctx.stroke(front);
      }
      // soft rim light on the back edge
      ctx.strokeStyle = C.rim; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-29, -45); ctx.bezierCurveTo(-30, -62, -26, -86, -12, -97); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.stroke(body);
      if (K === 'pip') this._fluff(ctx, C);
      if (K === 'stranger') this._species(ctx);
      if (K === 'captain') this._earPatch(ctx);

      // cheeks
      {
        ctx.fillStyle = K === 'chubby' || K === 'holly' ? 'rgba(255,118,140,0.5)' : K === 'rocco' ? 'rgba(255,135,165,0.26)' : 'rgba(255,128,150,0.38)';
        const cr2 = K === 'chubby' ? 1.25 : 1;
        ctx.beginPath(); ctx.ellipse(21.5, -62, 4.2 * cr2, 2.7 * cr2, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(-8.5, -62, 3 * cr2, 2.2 * cr2, 0, 0, TAU); ctx.fill();
      }
      // eyes
      this._eyes(ctx);
      if (K === 'rocco') this._plumes(ctx, false);
      // beak
      this._beak(ctx, p.beak);
      if (K === 'specs') this._glasses(ctx);
      if (K === 'stranger' && this.look === 'chinstrap') {
        ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-12, -64); ctx.quadraticCurveTo(6, -51, 25.5, -64); ctx.stroke();
      }
      // neckwear
      if (K === 'captain') this._whistle(ctx);
      else if (K === 'stranger') { if (this.rosette) this._rosette(ctx); }
      else if (K === 'specs') this._bowtie(ctx);
      else if (K === 'chubby') { ctx.save(); ctx.translate(0, -50); ctx.scale(1.13, 1); ctx.translate(0, 50); this._scarf(ctx); ctx.restore(); }
      else if (K !== 'rocco') this._scarf(ctx);
      // headwear
      ctx.save(); ctx.translate(0, -this.hatLift.x - 6);
      if (this.hatOff && (K === 'crew' || K === 'chubby' || K === 'captain' || K === 'holly')) { /* hat blown away */ }
      else if (K === 'captain') this._captainCap(ctx);
      else if (K === 'rocco') this._crest(ctx);
      else if (K === 'pip') this._tuft(ctx);
      else if (K === 'specs') this._cowlick(ctx);
      else if (K === 'stranger') this._fancyHat(ctx);
      else this._hat(ctx);
      ctx.restore();
      // dressing up: head-dresses, crowns, a halo (head-local, drawn over the hat)
      if (this.costume) { ctx.save(); this.costume(ctx, this); ctx.restore(); }
      if (this.snowCap > 0.05) this._snowDrift(ctx);
      ctx.restore();

      // front foot
      this._foot(ctx, -7 + p.fFx, p.fFy, false);
      if (this.gear) SD.drawGear(ctx, this);
      // front flipper + held items
      ctx.save(); ctx.translate(0, cr);
      if (this.item && this.item.at !== 'up' && this.item.at !== 'back') this._drawItem(ctx, this.item, 'F');
      this._flipper(ctx, -20, -58 + 22 * p.prone, p.aF, false);
      if (this.item && this.item.at === 'up') {
        // carried things rest on whatever is on top of the head
        ctx.translate(0, 131 + this.headTopLocal()); // shorter heads: the load sits lower, right on top
        this._drawItem(ctx, this.item, 'F');
      }
      if (this.item2 && this.item2.at !== 'back') this._drawItem(ctx, this.item2, this.item2.hand || 'F');
      ctx.restore();
    }

    // ----- young emperor: grey down, black cap, white goggles -----
    _pipFace(ctx) {
      ctx.fillStyle = '#c9d0d8';
      ctx.beginPath(); ctx.ellipse(5, -30, 23, 26, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1f232b';
      ctx.beginPath(); ctx.moveTo(-45, -54); ctx.quadraticCurveTo(5, -42, 45, -56); ctx.lineTo(45, -130); ctx.lineTo(-45, -130); ctx.closePath(); ctx.fill();
      const mg = ctx.createRadialGradient(6, -72, 4, 6, -70, 26);
      mg.addColorStop(0, '#ffffff'); mg.addColorStop(1, '#e9eef3');
      ctx.fillStyle = mg; ctx.fill(PIP_MASK);
    }
    _fluff(ctx, C) {
      const pts = [[-33, -26, -1, 0.1], [-33.5, -40, -1, 0], [-31.5, -53, -1, -0.15], [32.5, -26, 1, 0.1], [32, -42, 1, 0], [-27, -12, -0.7, 0.7], [25, -12, 0.7, 0.7]];
      ctx.lineWidth = 1.7; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
      for (const [x, y, nx, ny] of pts) {
        const tx = -ny, ty = nx; // tangent
        ctx.fillStyle = C.back;
        ctx.beginPath();
        ctx.moveTo(x - tx * 4 - nx * 1.5, y - ty * 4 - ny * 1.5);
        ctx.quadraticCurveTo(x + nx * 3 - tx * 2, y + ny * 3 - ty * 2, x + nx * 5.5 + tx * 1.5, y + ny * 5.5 + ty * 1.5);
        ctx.quadraticCurveTo(x + nx * 1.5 + tx * 2, y + ny * 1.5 + ty * 2, x + tx * 4 - nx * 1.5, y + ty * 4 - ny * 1.5);
        ctx.fill(); ctx.stroke();
      }
    }
    _tuft(ctx) {
      ctx.strokeStyle = '#1f232b'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      const sway = this.pom.x * 0.15;
      ctx.beginPath();
      ctx.moveTo(-2, -100); ctx.quadraticCurveTo(-6 + sway, -112, 2 + sway, -114);
      ctx.moveTo(3, -100); ctx.quadraticCurveTo(4 + sway, -110, 10 + sway, -110);
      ctx.moveTo(-6, -99); ctx.quadraticCurveTo(-14 + sway, -106, -11 + sway, -110);
      ctx.stroke();
    }
    // ----- northern rockhopper: spiky crest, yellow eyebrow plumes, shades -----
    // plumes sit above the eyes like happy raised eyebrows and flick out past the head
    _plumes(ctx, far) {
      if (far) return;
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const sw = this.pom.x * 0.22, bob = this.pomY.x * 0.12;
      // a strand that tapers from w0 to a point
      const strand = (x0, y0, cx, cy, x1, y1, w0) => {
        const L = [], R = [], N = 10;
        for (let i = 0; i <= N; i++) {
          const t = i / N, u = 1 - t;
          const x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1;
          const dx = 2 * u * (cx - x0) + 2 * t * (x1 - cx), dy = 2 * u * (cy - y0) + 2 * t * (y1 - cy);
          const d = Math.hypot(dx, dy) || 1, w = w0 * (1 - t * 0.85) / 2;
          L.push([x - (dy / d) * w, y + (dx / d) * w]); R.push([x + (dy / d) * w, y - (dx / d) * w]);
        }
        const path = new Path2D();
        path.moveTo(L[0][0], L[0][1]);
        for (const q of L.slice(1)) path.lineTo(q[0], q[1]);
        for (const q of R.reverse()) path.lineTo(q[0], q[1]);
        path.closePath();
        return path;
      };
      const paths = [
        // near eye: an arch over the eye, then two plumes flicking up and out
        strand(9.5, -83.5, 16.5, -91, 24, -87.5, 3.2),
        strand(22, -88, 31, -92 + bob, 37 + sw, -101 + bob, 2.8),
        strand(23, -87, 33, -88 + bob, 40 + sw, -91 + bob * 1.4, 2.4),
        // far eye: a smaller arch, plume out the back of the head
        strand(2.5, -83, -3, -89, -9, -87, 2.6),
        strand(-7, -87.5, -16, -92 + bob, -24 + sw, -99 + bob, 2.4),
        strand(-8, -86.5, -18, -87 + bob, -26 + sw, -89 + bob * 1.4, 2),
      ];
      ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
      for (const pth of paths) ctx.stroke(pth);
      ctx.fillStyle = '#ffd23f';
      for (const pth of paths) ctx.fill(pth);
      ctx.restore();
    }
    _crest(ctx) {
      ctx.fillStyle = '#1d2029'; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-14, -99);
      ctx.lineTo(-26 + this.pom.x * 0.3, -110); ctx.lineTo(-8, -103);
      ctx.lineTo(-16 + this.pom.x * 0.3, -117); ctx.lineTo(-1, -104);
      ctx.lineTo(-5 + this.pom.x * 0.3, -119); ctx.lineTo(7, -104);
      ctx.lineTo(9 + this.pom.x * 0.3, -116); ctx.lineTo(14, -101);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // shades: pushed up on the crest, or down over the eyes
      const down = this.tic && this.tic.n === 'shades' ? (this.shadesDown ? 1 - this.tic.t / this.tic.d : this.tic.t / this.tic.d) : this.shadesDown;
      const y = lerp(-95, -67.2, SD.smooth(down));
      ctx.save(); ctx.translate(0, y); ctx.rotate(lerp(-0.12, 0, down));
      // mirrored lenses in pale frames: reads as sunglasses on a dark head, never as glowing eyes
      const FR = '#f4efe2';
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // temple arm back over the head
      ctx.strokeStyle = INK; ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(-9, -1); ctx.lineTo(-27, -4); ctx.stroke();
      ctx.strokeStyle = FR; ctx.lineWidth = 2; ctx.stroke();
      // bridge
      ctx.strokeStyle = INK; ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(4, -2); ctx.quadraticCurveTo(7, -5, 9.5, -2); ctx.stroke();
      ctx.strokeStyle = FR; ctx.lineWidth = 2; ctx.stroke();
      for (const [cx, w, h] of [[-3, 14, 11.5], [18, 17, 12.5]]) {
        ctx.beginPath(); SD.rrect(ctx, cx - w / 2, -h / 2 - 0.5, w, h, 4.5);
        const lg = ctx.createLinearGradient(cx - w / 2, -h / 2, cx + w / 2, h / 2);
        lg.addColorStop(0, '#5fe3d6'); lg.addColorStop(0.5, '#3f79d8'); lg.addColorStop(1, '#b24fd1');
        ctx.fillStyle = lg; ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.stroke();
        ctx.strokeStyle = FR; ctx.lineWidth = 2.8; ctx.stroke();
        // sheen
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(cx - w * 0.28, -h * 0.18); ctx.lineTo(cx - w * 0.02, -h * 0.34); ctx.stroke();
      }
      ctx.restore();
    }
    // ----- Specs, the brainy one: round glasses, bow tie, a cowlick that won't lie flat -----
    _glasses(ctx) {
      ctx.save();
      const nudge = this.tic && this.tic.n === 'glasses' ? -Math.sin((this.tic.t / this.tic.d) * PI) * 1.6 : 0;
      ctx.translate(0, nudge);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const lens = [[-3, -73, 6.6], [16.5, -73, 7.6]];
      for (const [x, y, r] of lens) {
        ctx.fillStyle = 'rgba(205,232,255,0.28)';
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      }
      ctx.strokeStyle = '#3a2416'; ctx.lineWidth = 2.6;
      for (const [x, y, r] of lens) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); }
      // bridge and the arm back to the ear
      ctx.beginPath(); ctx.moveTo(3.4, -74.5); ctx.quadraticCurveTo(6, -77, 8.9, -74.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-9.5, -74); ctx.lineTo(-24, -77); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.3;
      for (const [x, y, r] of lens) { ctx.beginPath(); ctx.arc(x, y, r - 2.4, -2.5, -1.7); ctx.stroke(); }
      ctx.restore();
    }
    _bowtie(ctx) {
      ctx.save();
      ctx.translate(5, -51); ctx.rotate(-0.04);
      ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 1.7;
      const flap = (sx) => {
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(sx * 6, -7, sx * 12, -6.5); ctx.quadraticCurveTo(sx * 13.5, 0, sx * 12, 6.5);
        ctx.quadraticCurveTo(sx * 6, 7, 0, 0); ctx.closePath();
        ctx.fillStyle = sx < 0 ? '#c22c3a' : '#e0414f'; ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (const [dx, dy] of [[5, -2.5], [9, 2], [6, 3.5]]) { ctx.beginPath(); ctx.arc(sx * dx, dy, 0.95, 0, TAU); ctx.fill(); }
      };
      flap(-1); flap(1);
      ctx.fillStyle = '#a5202d'; ctx.beginPath(); SD.rrect(ctx, -2.6, -3.4, 5.2, 6.8, 1.6); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    _cowlick(ctx) {
      ctx.save();
      ctx.strokeStyle = INK; ctx.fillStyle = '#2e3a52'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
      const sw = this.pom.x * 0.2;
      ctx.beginPath();
      ctx.moveTo(-4, -100); ctx.quadraticCurveTo(-6 + sw, -114, 6 + sw, -113);
      ctx.quadraticCurveTo(12 + sw, -112, 9 + sw, -106); ctx.quadraticCurveTo(6 + sw, -109, 3, -100);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    // ----- strangers: species markings, fancy hats, a judge's rosette -----
    _species(ctx) {
      ctx.save();
      if (this.look === 'gentoo') {
        // white band over the crown from eye to eye
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(21,27,43,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-10, -79); ctx.quadraticCurveTo(-6, -93, 6, -92); ctx.quadraticCurveTo(20, -93, 25, -80);
        ctx.quadraticCurveTo(17, -86, 7, -86.5); ctx.quadraticCurveTo(-3, -86, -10, -79); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (this.look === 'adelie') {
        // white eye rings
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(-3, -73, 6.6, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(16.5, -73, 7.6, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }
    _rosette(ctx) {
      ctx.save(); ctx.translate(16, -40);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
      ctx.fillStyle = '#2f6fd0';
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 2, 2); ctx.lineTo(sx * 6, 15); ctx.lineTo(sx * 2.5, 12.5); ctx.lineTo(0, 16); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2f6fd0'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill();
      ctx.restore();
    }
    _fancyHat(ctx) {
      const h = this.jhat;
      if (!h || h === 'none') return;
      ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
      if (h === 'tophat') {
        ctx.translate(0, -96); ctx.rotate(-0.06);
        const cg = ctx.createLinearGradient(-15, 0, 17, 0); cg.addColorStop(0, '#2b2f3a'); cg.addColorStop(0.4, '#454b5c'); cg.addColorStop(1, '#1b1e26');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-16, -40); ctx.quadraticCurveTo(0, -44, 17, -40); ctx.lineTo(16, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#b02a37'; ctx.beginPath(); ctx.moveTo(-15.2, -4); ctx.lineTo(-15.5, -11); ctx.quadraticCurveTo(0, -13, 16.4, -11); ctx.lineTo(16.1, -4); ctx.quadraticCurveTo(0, -6, -15.2, -4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#20232c'; ctx.beginPath(); ctx.ellipse(0.5, 0, 27, 5, 0, 0, TAU); ctx.fill(); ctx.stroke();
      } else if (h === 'bowler') {
        ctx.translate(0, -97); ctx.rotate(-0.05);
        ctx.fillStyle = '#5a3b26'; ctx.beginPath(); ctx.moveTo(-17, 0); ctx.bezierCurveTo(-18, -26, 18, -26, 18, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#2b1c12'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-16.5, -4); ctx.quadraticCurveTo(0, -7, 17.5, -4); ctx.stroke();
        ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
        ctx.fillStyle = '#4a2f1e'; ctx.beginPath(); ctx.moveTo(-26, 1); ctx.quadraticCurveTo(0, -6, 27, 1); ctx.quadraticCurveTo(0, 5, -26, 1); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(-6, -14, 5, 3, -0.4, 0, TAU); ctx.fill();
      } else if (h === 'toque') {
        // a chef's hat: pleated band, puffed crown
        ctx.translate(0, -95); ctx.rotate(-0.05);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-16, -18); ctx.quadraticCurveTo(0, -21, 16, -18); ctx.lineTo(15, 0); ctx.quadraticCurveTo(0, 3, -15, 0); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(120,135,160,0.55)'; ctx.lineWidth = 1.2;
        for (const x of [-9, -3, 3, 9]) { ctx.beginPath(); ctx.moveTo(x, -2); ctx.lineTo(x * 1.05, -17); ctx.stroke(); }
        ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(-17, -16);
        ctx.bezierCurveTo(-30, -26, -24, -48, -10, -44); ctx.bezierCurveTo(-8, -58, 10, -58, 11, -44);
        ctx.bezierCurveTo(25, -48, 30, -26, 17, -16); ctx.quadraticCurveTo(0, -20, -17, -16); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(150,170,200,0.25)'; ctx.beginPath(); ctx.ellipse(8, -32, 7, 10, 0.3, 0, TAU); ctx.fill();
      } else if (h === 'beret') {
        ctx.translate(0, -99); ctx.rotate(-0.22);
        ctx.fillStyle = '#c7364a'; ctx.beginPath(); ctx.ellipse(-2, -3, 27, 9, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(-2, 1, 24, 4, 0, 0, PI); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(1, -18); ctx.stroke();
      }
      ctx.restore();
    }
    // ----- the captain: peaked cap, whistle, golden ear patch -----
    _earPatch(ctx) {
      ctx.save();
      const g = ctx.createLinearGradient(-20, -80, -10, -56);
      g.addColorStop(0, '#ffb43c'); g.addColorStop(1, '#ffd98a');
      ctx.fillStyle = g; ctx.strokeStyle = 'rgba(21,27,43,0.5)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-19, -81); ctx.quadraticCurveTo(-27, -66, -15, -57); ctx.quadraticCurveTo(-9, -64, -11, -76); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    _whistle(ctx) {
      ctx.save();
      ctx.strokeStyle = '#d9b24a'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-17, -55); ctx.quadraticCurveTo(-4, -38, 9, -40); ctx.quadraticCurveTo(18, -44, 23, -56); ctx.stroke();
      ctx.translate(9, -38); ctx.rotate(0.25);
      const g = ctx.createLinearGradient(0, -4, 0, 4); g.addColorStop(0, '#f2f4f8'); g.addColorStop(1, '#9aa3b2');
      ctx.fillStyle = g; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
      ctx.beginPath(); SD.rrect(ctx, -4, -3, 13, 6, 2.5); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-4, 0, 3.4, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    _captainCap(ctx) {
      ctx.save();
      ctx.translate(0, -94); ctx.rotate(-0.06); ctx.translate(0, 94);
      ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 2.3;
      // crown
      const crown = new Path2D('M-27,-99 C-34,-110 -20,-120 2,-121 C24,-121 36,-112 29,-101 Z');
      const cg = ctx.createLinearGradient(0, -121, 0, -100);
      cg.addColorStop(0, '#ffffff'); cg.addColorStop(1, '#dfe5ee');
      ctx.fillStyle = cg; ctx.fill(crown); ctx.stroke(crown);
      // band
      const band = new Path2D('M-26,-90 Q1,-95 28,-91 L29,-101 Q1,-106 -27,-100 Z');
      ctx.fillStyle = '#1d2a4a'; ctx.fill(band); ctx.stroke(band);
      ctx.strokeStyle = '#d9b24a'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-25, -92.5); ctx.quadraticCurveTo(1, -97, 28, -93.5); ctx.stroke();
      // visor
      ctx.fillStyle = '#121620'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(4, -92); ctx.quadraticCurveTo(26, -94, 37, -88); ctx.quadraticCurveTo(26, -86, 6, -88); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(12, -91.5); ctx.quadraticCurveTo(24, -92.5, 32, -89.5); ctx.stroke();
      // badge
      SD.drawStar(ctx, 9, -98.5, 4.2, 0, 0.3);
      ctx.restore();
    }

    _drawItem(ctx, item, which) {
      const p = this.p;
      const piv = which === 'F' ? [-20, -58] : [22, -58];
      const a = which === 'F' ? p.aF : p.aB;
      const hx = piv[0] - Math.sin(a) * 30, hy = piv[1] + Math.cos(a) * 30;
      ctx.save();
      item.draw(ctx, this, hx, hy, a);
      ctx.restore();
    }

    _foot(ctx, x, y, back) {
      ctx.save();
      ctx.translate(x, y);
      const fc = this.kind === 'rocco' ? '#f29aa6' : this.kind === 'pip' ? '#5d6470' : FOOT;
      ctx.fillStyle = back ? SD.shade(fc, -0.12) : fc;
      ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-8, -1.5);
      ctx.bezierCurveTo(-9, -6, -2, -7.5, 5, -6);
      ctx.bezierCurveTo(9, -5.5, 13, -3.5, 13.5, -1.2);
      ctx.bezierCurveTo(13.8, 0.8, 11.5, 1.5, 10.5, 0.6);
      ctx.bezierCurveTo(9.5, 1.8, 7, 1.8, 6, 0.8);
      ctx.bezierCurveTo(5, 1.9, 2, 1.9, 1, 0.8);
      ctx.bezierCurveTo(-3, 1.5, -7.5, 1, -8, -1.5);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    // blizzard: snow gathers in lumps on the hat, the back and the flipper tops, drips over the brim, and clings in flakes
    _snowDrift(ctx) {
      const c = this.snowCap, id = this.id || 0;
      const rnd = (i) => { const v = Math.sin((id + 1) * 91.7 + i * 47.3) * 43758.5; return v - Math.floor(v); };
      const top = this.hatOff ? -107 : this.headTopLocal() + 8;
      const lumps = [];
      const n = 3 + Math.round(c * 4);
      for (let i = 0; i < n; i++) {
        const u = n === 1 ? 0 : i / (n - 1) * 2 - 1;                 // -1..1 across the crown
        const prof = 1 - Math.abs(u) * 0.55;                         // higher in the middle
        const r = (3 + c * 7.5) * (0.65 + 0.55 * rnd(i)) * (0.7 + 0.5 * prof);
        lumps.push([u * (11 + c * 8) + (rnd(i + 9) - 0.5) * 4, top + 2 - r * 0.55 - c * 4 * prof, r]);
      }
      // sides of the pile that sag over the brim
      if (c > 0.45) lumps.push([-(16 + c * 6), top + 4 + c * 2, 3.2 + c * 2.6], [17 + c * 6, top + 5 + c * 2, 3 + c * 2.4]);
      // back shoulder and flipper-top drifts come later
      if (c > 0.3) lumps.push([-27, -83 + rnd(20) * 3, 3 + (c - 0.3) * 8], [-29.5, -70, 2.4 + (c - 0.3) * 6]);
      if (c > 0.6) lumps.push([-31, -57, 2 + (c - 0.6) * 8]);
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(96,126,176,0.85)'; ctx.lineWidth = 2.6;
      for (const [x, y, r] of lumps) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = '#ffffff';
      for (const [x, y, r] of lumps) { ctx.beginPath(); ctx.arc(x, y, r + 0.2, 0, TAU); ctx.fill(); }
      // soft shading under each lump and a few glints so it reads as packed snow
      ctx.fillStyle = 'rgba(176,204,238,0.55)';
      for (const [x, y, r] of lumps) { ctx.beginPath(); ctx.ellipse(x + r * 0.15, y + r * 0.55, r * 0.8, r * 0.38, 0, 0, PI); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      // flakes stuck to the dark back
      const flakes = [[-24, -62], [-20, -91], [-26, -46], [-12, -100], [-15, -75], [-28, -34], [20, -99], [-22, -22]];
      const nf = Math.round(c * flakes.length);
      for (let i = 0; i < nf; i++) { const [x, y] = flakes[(i * 3 + id) % flakes.length]; ctx.beginPath(); ctx.arc(x + rnd(i + 30) * 2, y, 1 + rnd(i + 40) * 1.2, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    // a sliding belly sits down in the snow: a soft lip of snow along it, heaped up at the front
    _snowLip(ctx) {
      const f = Math.sign(this.fx) || 1, s = this.size, gy = this.world.surfaceY(this.x) + this.lane;
      const v = Math.min(1, Math.abs(this.vx || 0) / 160);
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.translate(this.x, gy); ctx.scale(f * s, s);
      const front = 46, back = -66, hf = 5 + v * 4, hb = 4.5;
      const edge = () => {
        ctx.moveTo(back, 1);
        ctx.bezierCurveTo(back + 18, -hb, front - 50, -hb - 1, front - 18, -hf * 0.75);
        ctx.quadraticCurveTo(front - 6, -hf - 1.5, front + 5, -2);
        ctx.quadraticCurveTo(front + 9, 1, front + 3, 3);
      };
      ctx.beginPath(); edge(); ctx.lineTo(back, 3); ctx.closePath();
      const g = ctx.createLinearGradient(0, -hf, 0, 3);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e3ecf7');
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(120,150,200,0.6)'; ctx.lineWidth = 1.3;
      ctx.beginPath(); edge(); ctx.stroke();
      // snow kicked up off the front
      if (v > 0.3) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        const t = this.t * 9;
        for (let k = 0; k < 4; k++) { const u = ((t + k * 0.25) % 1); ctx.beginPath(); ctx.arc(front + 4 + u * 16, -hf - u * 10 + u * u * 14, 2.2 * (1 - u) + 0.6, 0, TAU); ctx.fill(); }
      }
      ctx.restore();
    }
    _flipper(ctx, px, py, a, back) {
      ctx.save();
      ctx.translate(px, py); ctx.rotate(a);
      const fl = new Path2D('M-5,-3 C-11,9 -10,24 -2,34 Q3,37 5.5,30.5 C8.5,19 8,6 5.5,-3 Z');
      ctx.fillStyle = back ? '#232d47' : BACK;
      ctx.fill(fl);
      ctx.strokeStyle = 'rgba(140,165,215,0.25)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-6, 6); ctx.bezierCurveTo(-8, 16, -6, 25, -2, 31); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke(fl);
      ctx.restore();
    }

    _eyes(ctx, one) { // one: [x, y] draws just the near eye there (profile)
      const e = this.eyes;
      const lineCol = this.darkFace ? '#eef2f8' : INK; // closed eyes must show on a dark face
      const eye = (x, y, sc, outer = 1) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
        if (this.kind === 'holly' && e !== 'dizzy') {
          // Holly's lashes on the outer corner
          ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
          const top = e === 'blink' || e === 'closed' ? 0.5 : e === 'happy' ? -1.5 : -4.2;
          ctx.beginPath();
          ctx.moveTo(outer * 3.4, top + 0.3); ctx.lineTo(outer * 6.2, top - 1.8);
          ctx.moveTo(outer * 2.2, top - 0.8); ctx.lineTo(outer * 4.0, top - 3.6);
          ctx.stroke(); ctx.restore();
        }
        if (e === 'blink' || e === 'closed') {
          ctx.strokeStyle = lineCol; ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.moveTo(-4, 0.5); ctx.quadraticCurveTo(0, 3, 4, 0.5); ctx.stroke();
        } else if (e === 'happy') {
          ctx.strokeStyle = lineCol; ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.moveTo(-4.2, 1.5); ctx.quadraticCurveTo(0, -4.6, 4.2, 1.5); ctx.stroke();
        } else if (e === 'wide') {
          ctx.fillStyle = '#ffffff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.ellipse(0, -0.5, 5.2, 6.4, 0, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0.8, -0.2, 2.2, 0, TAU); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(1.4, -1.1, 0.7, 0, TAU); ctx.fill();
        } else if (e === 'dizzy') {
          ctx.strokeStyle = lineCol; ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (let k = 0; k < 18; k++) { const a = k * 0.7 + this.t * 6, r = k * 0.25; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
          ctx.stroke();
        } else if (this.kind === 'rocco' || (this.kind === 'stranger' && this.look === 'gentoo')) {
          // big friendly eyes that read on a dark face
          ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(0, -0.2, 4.6, 5.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#7a4a2c'; ctx.beginPath(); ctx.ellipse(0.9, 0.5, 3.3, 3.9, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(1.0, 0.6, 2.2, 2.7, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(2.0, -1.2, 1.35, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.arc(-0.2, 2.1, 0.6, 0, TAU); ctx.fill();
          if (this.kind === 'rocco') {
            // Rocco is never surprised: a heavy lid over the top half, level and unbothered
            ctx.save(); ctx.beginPath(); ctx.ellipse(0, -0.2, 5.4, 6.4, 0, 0, TAU); ctx.clip();
            ctx.fillStyle = '#1d2029'; ctx.fillRect(-7, -8, 14, 7.4);
            ctx.restore();
            ctx.strokeStyle = '#eef2f8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-4.4, -0.9); ctx.quadraticCurveTo(0, -0.1, 4.4, -0.9); ctx.stroke();
          }
        } else {
          ctx.fillStyle = INK;
          ctx.beginPath(); ctx.ellipse(0, 0, 4.1, 5.4, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(120,150,215,0.55)';
          ctx.beginPath(); ctx.ellipse(0, 2.6, 2.6, 1.6, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(1.3, -2.1, 1.6, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.arc(-1.3, 1.6, 0.7, 0, TAU); ctx.fill();
        }
        ctx.restore();
      };
      const es = this.kind === 'pip' ? 1.22 : this.kind === 'specs' ? 1.12 : 1;
      if (one) { eye(one[0], one[1], es * 1.05, 1); return; }
      eye(-3, -73, 0.86 * es, -1);
      eye(16.5, -73, es, 1);
    }

    _beak(ctx, open) {
      ctx.save();
      ctx.lineWidth = 1.8; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
      // lower mandible (hinges open)
      ctx.save();
      ctx.translate(2, -62.4); ctx.rotate(open * 0.5);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(6, 0.4, 11.5, -0.2); ctx.quadraticCurveTo(6, 4.2, 0, 2.8);
      const BC = this.kind === 'stranger' ? (this.look === 'gentoo' ? ['#ff8a4a', '#e85a2a', '#c94a1e'] : ['#3a404d', '#2a2f3a', '#2a2f3a'])
        : { captain: ['#3a404d', '#2a2f3a', '#ff8f2e'], pip: ['#575e6b', '#3a3f4a', '#2e333c'], rocco: ['#ff7a45', '#e3502a', '#c2401e'] }[this.kind] || ['#ffc46b', BEAK, BEAK_SH];
      ctx.closePath(); ctx.fillStyle = BC[2]; ctx.fill(); ctx.stroke();
      ctx.restore();
      // past fully open the top half lifts too and you can see right in: singing, shouting
      const wide = Math.max(0, open - 0.9);
      if (wide > 0) {
        const a0 = -wide * 0.5 - 0.1, a1 = open * 0.5 + 0.12;
        ctx.fillStyle = '#8e2433'; ctx.beginPath(); ctx.moveTo(1, -63); ctx.lineTo(1 + Math.cos(a0) * 12, -63 + Math.sin(a0) * 12); ctx.quadraticCurveTo(13, -62, 1 + Math.cos(a1) * 11, -62 + Math.sin(a1) * 11); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ff8fa3'; ctx.beginPath(); ctx.ellipse(5.5, -60.6 + open, 3.2, 1.6, 0.35, 0, TAU); ctx.fill();
      } else if (open > 0.3) {
        ctx.fillStyle = '#b8323f';
        ctx.beginPath(); ctx.moveTo(2, -62.4); ctx.lineTo(10, -62 + open * 1.6); ctx.lineTo(2, -60.2 + open * 2.2); ctx.closePath(); ctx.fill();
      }
      // upper mandible
      if (wide > 0) { ctx.translate(1, -63.5); ctx.rotate(-wide * 0.55); ctx.translate(-1, 63.5); }
      ctx.beginPath();
      const bl = this.kind === 'captain' ? 5 : this.kind === 'pip' ? -3 : 0; // captain's beak is longer, Pip's smaller
      const bt = this.kind === 'rocco' ? -1.2 : 0; // rocco's is chunkier
      ctx.moveTo(0.5, -66.6 + bt);
      ctx.quadraticCurveTo(9 + bl * 0.5, -70 + bt, 17 + bl, -63.2);
      ctx.quadraticCurveTo(9, -60.6, 1.2, -62.2);
      ctx.quadraticCurveTo(-0.6, -64.4, 0.5, -66.6);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, -69, 0, -61);
      g.addColorStop(0, BC[0]); g.addColorStop(1, BC[1]);
      ctx.fillStyle = g; ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.ellipse(6.5, -66.3, 2.6, 0.9, -0.15, 0, TAU); ctx.fill();
      ctx.restore();
    }

    _scarf(ctx) {
      const pal = this.pal;
      ctx.save();
      const band = new Path2D('M-31.5,-55 Q0,-48 30.5,-56 L30,-46 Q0,-38 -32.5,-45.5 Z');
      ctx.fillStyle = pal.scarf; ctx.fill(band);
      ctx.save(); ctx.clip(band);
      ctx.fillStyle = pal.salt;
      for (let x = -34; x < 34; x += 10) { ctx.beginPath(); ctx.moveTo(x, -60); ctx.lineTo(x + 4, -60); ctx.lineTo(x + 1, -38); ctx.lineTo(x - 3, -38); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(-40, -47, 80, 6);
      ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = 2.3; ctx.stroke(band);
      // tail
      ctx.save();
      ctx.translate(14, -47);
      ctx.rotate(0.12 + this.tail.x);
      const tail = new Path2D('M-5,0 L5,0 L6.5,24 L-4,25 Z');
      ctx.fillStyle = pal.scarf; ctx.fill(tail);
      ctx.save(); ctx.clip(tail); ctx.fillStyle = pal.salt; ctx.fillRect(-8, 8, 16, 4); ctx.fillRect(-8, 16, 16, 4); ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = 2.1; ctx.stroke(tail);
      ctx.lineWidth = 1.6; ctx.strokeStyle = pal.scarf;
      ctx.beginPath();
      for (let k = 0; k < 4; k++) { const fx = -3.3 + k * 3; ctx.moveTo(fx, 25); ctx.lineTo(fx + 0.6, 30); }
      ctx.stroke();
      ctx.restore();
      // knot
      ctx.beginPath(); ctx.ellipse(14, -47.5, 5.5, 4.6, 0.3, 0, TAU);
      ctx.fillStyle = SD.shade(pal.scarf, -0.08); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.1; ctx.stroke();
      ctx.restore();
    }

    _pompom(ctx, x, y, r, col) {
      ctx.save(); ctx.translate(x, y);
      ctx.beginPath();
      const n = 11;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * TAU, a2 = ((i + 0.5) / n) * TAU;
        const rr = r * (0.92 + ((i * 37) % 7) * 0.02);
        if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.quadraticCurveTo(Math.cos(a2 - TAU / n) * r * 1.22, Math.sin(a2 - TAU / n) * r * 1.22, Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.35, r * 0.35, 0, TAU); ctx.fill();
      ctx.restore();
    }

    _muff(ctx, x, y, back) {
      const pal = this.pal;
      this._pompom(ctx, x, y, back ? 8 : 9.5, back ? SD.shade(pal.hat, -0.15) : pal.hat);
    }

    _hat(ctx) {
      const pal = this.pal, st = pal.style;
      ctx.save();
      ctx.translate(0, -90); ctx.rotate(-0.07); ctx.translate(0, 90);
      if (st === 'muffs') {
        ctx.strokeStyle = INK; ctx.lineWidth = 6.5;
        ctx.beginPath(); ctx.moveTo(-23, -80); ctx.bezierCurveTo(-24, -112, 22, -114, 22, -82); ctx.stroke();
        ctx.strokeStyle = pal.alt; ctx.lineWidth = 3.6; ctx.stroke();
        this._muff(ctx, -23, -78, false);
        ctx.restore();
        return;
      }
      if (st === 'flaps') this._flap(ctx, -1);
      // dome
      let dome;
      if (st === 'long') {
        const tx = -30 + this.pom.x * 1.6, ty = -108 + this.pomY.x * 0.6;
        dome = new Path2D(`M-26,-92 C-28,-108 -16,-120 -2,-121 C14,-121 26,-110 26,-94 Q0,-101 -26,-92 Z`);
        // the floppy tail of the stocking cap
        const tail = new Path2D(`M-14,-117 C-30,-122 ${tx - 10},${ty - 18} ${tx},${ty} C${tx + 6},${ty - 2} ${-22},-106 ${-6},-104 Z`);
        ctx.fillStyle = pal.hat; ctx.fill(tail);
        ctx.save(); ctx.clip(tail); ctx.fillStyle = pal.alt;
        for (let k = 0; k < 3; k++) { const u = 0.3 + k * 0.22; ctx.beginPath(); ctx.arc(lerp(-12, tx, u), lerp(-114, ty, u), 3.2, 0, TAU); ctx.fill(); }
        ctx.restore();
        ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke(tail);
        ctx.fillStyle = pal.hat; ctx.fill(dome);
        ctx.save(); ctx.clip(dome); ctx.fillStyle = pal.alt; ctx.fillRect(-40, -110, 80, 5); ctx.restore();
        ctx.stroke(dome);
        this._cuff(ctx);
        this._pompom(ctx, tx, ty, 6.5, pal.alt);
      } else {
        dome = new Path2D('M-26,-92 C-27,-112 -12,-121 0,-121 C12,-121 26,-112 26,-94 Q0,-101 -26,-92 Z');
        ctx.fillStyle = pal.hat; ctx.fill(dome);
        ctx.save(); ctx.clip(dome);
        ctx.fillStyle = pal.alt; ctx.fillRect(-40, -110, 80, 4.5); ctx.fillRect(-40, -117, 80, 2.5);
        ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.lineWidth = 1.2;
        for (let x = -24; x <= 24; x += 6) { ctx.beginPath(); ctx.moveTo(x, -96); ctx.quadraticCurveTo(x * 0.85, -110, x * 0.5, -121); ctx.stroke(); }
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(-10, -110, 7, 4, -0.5, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke(dome);
        this._cuff(ctx);
        this._pompom(ctx, this.pom.x * 0.5, -124 + this.pomY.x * 0.4, 8.2, pal.alt);
      }
      ctx.restore();
    }
    _flap(ctx, sx) {
      const pal = this.pal;
      const fx = sx < 0 ? -25 : 27;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(fx + 7 * sx * -1, -90); ctx.quadraticCurveTo(fx + sx * 4, -80, fx + sx * 1, -69); ctx.quadraticCurveTo(fx - sx * 6, -70, fx - sx * 9, -84); ctx.closePath();
      ctx.fillStyle = sx < 0 ? pal.hat : SD.shade(pal.hat, -0.2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.strokeStyle = pal.alt; ctx.lineWidth = 2;
      const ex = fx + sx * 1, tx = ex + this.pom.x * 0.4;
      ctx.beginPath(); ctx.moveTo(ex, -69); ctx.quadraticCurveTo(ex + this.pom.x * 0.2, -62, tx, -56); ctx.stroke();
      this._pompom(ctx, tx, -55, 3, pal.alt);
      ctx.restore();
    }
    _cuff(ctx) {
      const pal = this.pal;
      const cuff = new Path2D('M-29,-83 Q0,-91 29,-85 L28.5,-94.5 Q0,-101.5 -28.5,-92.5 Z');
      ctx.fillStyle = SD.shade(pal.hat, -0.12); ctx.fill(cuff);
      ctx.save(); ctx.clip(cuff);
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.4;
      for (let x = -28; x <= 28; x += 4) { ctx.beginPath(); ctx.moveTo(x, -102); ctx.lineTo(x, -80); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke(cuff);
    }

    _drawBubble(ctx) {
      const b = this.bubble, [hx, hy] = this.headTop();
      const u = b.t / b.life;
      const pop = SD.backOut(Math.min(1, b.t / 0.18));
      const s = this.size * 1.1 * pop;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1 - u) * 4) * this.alpha;
      ctx.translate(hx + this.facing * 8 * this.size, hy - 18 * this.size);
      ctx.scale(s, s);
      if (typeof b.text === 'function') {
        // a picture in a speech bubble: say((ctx) => draw…), drawn in a box about 30 across
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineJoin = 'round';
        ctx.beginPath(); SD.rrect(ctx, -23, -54, 46, 42, 13); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-6, -12.5); ctx.lineTo(-1, -1); ctx.lineTo(6, -12.5); ctx.fill(); ctx.stroke();
        ctx.fillRect(-7, -15.5, 14, 4);
        ctx.translate(0, -33); b.text(ctx, b.t);
      } else if (b.text === '!') {
        ctx.fillStyle = '#ffd43b'; ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(-5, -30); ctx.lineTo(5, -30); ctx.lineTo(2.5, -7); ctx.lineTo(-2.5, -7); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill(); ctx.stroke();
      } else if (b.text === '?') {
        ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, -20, 7, -PI * 0.9, PI * 0.4); ctx.quadraticCurveTo(0, -10, 0, -6); ctx.stroke();
        ctx.strokeStyle = '#7fd3ff'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#7fd3ff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(0, 2, 3.2, 0, TAU); ctx.fill(); ctx.stroke();
      } else if (b.text === 'heart') {
        ctx.fillStyle = '#ff6f86'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 2); ctx.bezierCurveTo(-14, -8, -6, -20, 0, -12); ctx.bezierCurveTo(6, -20, 14, -8, 0, 2); ctx.fill(); ctx.stroke();
      } else if (b.text === 'zzz') {
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
        ctx.font = 'bold 14px "Segoe UI", sans-serif';
        for (let k = 0; k < 3; k++) { const yy = -k * 10 - (b.t * 6 % 10); ctx.globalAlpha *= 0.9; ctx.strokeText('z', k * 7, yy); ctx.fillText('z', k * 7, yy); }
      } else if (b.text === 'note') {
        ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(0, 0, 4, 3, -0.4, 0, TAU); ctx.fill(); ctx.fillRect(3, -16, 1.8, 16);
      } else {
        // a little speech bubble with a word or number in it
        ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
        const tw = Math.max(16, ctx.measureText(b.text).width + 12);
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
        ctx.beginPath(); SD.rrect(ctx, -tw / 2, -30, tw, 22, 9); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-4, -8.5); ctx.lineTo(0, -1); ctx.lineTo(4, -8.5); ctx.fill(); ctx.stroke();
        ctx.fillRect(-5, -11, 10, 3);
        ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(b.text, 0, -18.5);
      }
      ctx.restore();
    }
    _drawDizzy(ctx) {
      const [hx, hy] = this.headTop();
      for (let k = 0; k < 3; k++) {
        const a = this.t * 5 + (k * TAU) / 3;
        SD.drawTwinkle(ctx, hx + Math.cos(a) * 20 * this.size, hy + 8 * this.size + Math.sin(a) * 6 * this.size, 3.5 * this.size, '#ffd43b', 1);
      }
    }
    say(text, life = 1.6) { this.bubble = { text, t: 0, life }; }
  }

  SD.Penguin = Penguin;

  // how a penguin celebrates this time (see the 'cheer' pose). One "occasion" is everyone who starts
  // within about a second of each other.
  function celebrate(p, kind) {
    const w = p.world, c = w.celeb || (w.celeb = { t0: -1e9, lastFull: -1e9, n: 0, full: false });
    if (w.t - c.t0 > 1.2) {
      const cast = w.actors.filter((a) => a instanceof Penguin && !a.dead && !a.hidden);
      const joining = cast.filter((a) => a.action === 'cheer' || a.action === 'clap').length;
      const everyone = cast.length > 0 && joining >= Math.max(2, cast.length * 0.6);
      c.n++; c.t0 = w.t;
      c.full = c.forceUntil > w.t || w.t - c.lastFull > (everyone ? 22 : 48);
      if (c.full) c.lastFull = w.t;
    }
    const pick = (p.id * 7 + c.n * 5) % 20;
    p._celT = 0;
    if (c.full) p._cel = kind === 'clap' ? [5, 3, 5, 2][pick % 4] : [0, 1, 2, 4, 0, 3, 1][pick % 7];
    else p._cel = [10, 11, 12, 13, 10, 11][pick % 6];
  }
  SD.finale = (world, secs = 4) => { (world.celeb || (world.celeb = { t0: -1e9, lastFull: -1e9, n: 0, full: false })).forceUntil = world.t + secs; };

  // Personal space: penguins standing about at much the same depth shuffle apart instead of standing
  // inside each other. Huddles and hugs opt out (p.snug, or the 'hug' action); anyone walking, carried,
  // sitting, climbing or up on a ledge is left alone.
  SD.personalSpace = (actors, dt) => {
    const free = [];
    for (const p of actors) {
      if (!(p instanceof Penguin) || p.dead || p.hidden || p.snug || p.attach || p.inVehicle) continue;
      if ((p.loco !== 'stand' && p.loco !== 'glide') || p.target != null || p.action === 'hug' || p.limbo) continue;
      if (Math.abs(p.y - p.groundY()) > 2) continue;
      free.push(p);
    }
    // walkers step round people in their way (in front if they're nearer, behind if not) instead of
    // walking through them; a line all walking the same way (a march, a queue) is left alone
    // someone walking the same way just ahead: keep a step behind them (no walking into their back)
    for (const a of actors) {
      if (!(a instanceof Penguin)) continue;
      a.crowd = 1;
      if (a.dead || a.hidden || a.attach || a.target == null || a.loco !== 'walk' || a.snug) continue;
      const dir = Math.sign(a.target - a.x);
      if (!dir) continue;
      for (const b of actors) {
        if (b === a || !(b instanceof Penguin) || b.dead || b.hidden || b.attach || b.snug) continue;
        const ahead = (b.x - a.x) * dir;
        if (ahead < -10 || ahead > 80 || Math.abs(a.target - a.x) < 20) continue;
        if (Math.abs(a.lane - b.lane) > 6) continue;
        if (b.target != null && Math.sign(b.target - b.x) === dir) {
          if (ahead > 0 && ahead < 46 * (a.size + b.size) / 1.48 && Math.abs(b.target - b.x) > 10) a.crowd = Math.min(a.crowd, 0.25);
          continue;
        }
        a.dodge = 8; a.dodgeT = 0.9; // pass in front of them, nearer the viewer
      }
    }
    // nobody idles with their face behind someone standing nearer the glass, half off the side of the
    // screen, or across the join between two screens: they sidle clear (slowly, it reads as a shuffle)
    const idle = (p) => !p.item && !p.item2 && !p.using && p.loco === 'stand';
    for (const a of free) {
      // someone busy at their work stays put: whoever idles in front of their face moves instead
      if (!idle(a)) {
        for (const b of free) {
          const dl = b.lane - a.lane, need = 17 * (a.size + b.size) / 2 / 0.74, dx = b.x - a.x;
          if (b !== a && idle(b) && dl > 6 && dl < 24 * b.size / 0.74 && Math.abs(dx) < need) b.x += (dx > 0 || (dx === 0 && b.id > a.id) ? 1 : -1) * 26 * dt;
        }
        continue;
      }
      const half = 30 * a.size * a.K.kx, scr = a.world.screens;
      if (scr && scr.length) {
        const L = scr[0].x0, R = scr[scr.length - 1].x1;
        if (a.x > L - half && a.x < L + half) a.x += 40 * dt;
        else if (a.x < R + half && a.x > R - half) a.x -= 40 * dt;
        for (let k = 1; k < scr.length; k++) { const j = scr[k].x0, d = a.x - j; if (Math.abs(d) < half) a.x += (d >= 0 ? 1 : -1) * 40 * dt; }
      }
      for (const b of free) {
        if (b === a) continue;
        const dl = b.lane - a.lane, need = 17 * (a.size + b.size) / 2 / 0.74, dx = a.x - b.x;
        if (dl > 6 && dl < 24 * b.size / 0.74 && Math.abs(dx) < need) a.x += (dx > 0 || (dx === 0 && a.id > b.id) ? 1 : -1) * 26 * dt;
      }
    }
    free.sort((a, b) => a.x - b.x || a.id - b.id);
    for (let i = 0; i < free.length; i++) {
      const a = free[i];
      for (let j = i + 1; j < free.length; j++) {
        const b = free[j];
        const min = 34 * (a.size * a.K.kx + b.size * b.K.kx); // bodies just clear of each other
        const dx = b.x - a.x;
        if (dx >= min) break;
        if (Math.abs(a.lane - b.lane) > 6) continue;
        const step = Math.min(min - dx, (a.loco === 'glide' || b.loco === 'glide' ? 140 : 72) * dt) / 2; // skaters are quicker to make room
        a.x -= step; b.x += step;
      }
    }
  };
})();
