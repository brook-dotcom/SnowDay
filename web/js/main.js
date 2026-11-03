// Snow Day — boot, multi-screen geometry, fixed-step loop, rendering, input -> host messages
'use strict';
(function () {
  const { clamp, lerp } = SD;
  const DT = 1 / 60;

  function readConfig() {
    let cfg = window.__SNOW;
    if (!cfg && location.hash.length > 1) {
      try { cfg = JSON.parse(decodeURIComponent(location.hash.slice(1))); } catch (e) { cfg = null; }
    }
    cfg = cfg || {};
    const d = {
      kind: 'preview', look: 'preview', layout: 'span', me: 0, seed: 12345, start: 0, fast: false, force: null,
      screens: [{ x: 0, y: 0, w: innerWidth * devicePixelRatio, h: innerHeight * devicePixelRatio, ledges: null }],
      settings: {},
    };
    cfg = Object.assign(d, cfg);
    cfg.settings = Object.assign({ buildMin: 3, intensity: 'steady', scenes: { tree: true, parade: true, ramp: true, ice: true }, dim: 22, startle: true }, cfg.settings || {});
    return cfg;
  }

  const post = (m) => { try { window.chrome && window.chrome.webview && window.chrome.webview.postMessage(m); } catch (e) {} if (window.__onPost) window.__onPost(m); };

  // boot can run again in place (SD.reboot) when separate screens join into one world
  let gen = 0;
  function boot() {
    const myGen = ++gen;
    const live = () => myGen === gen;
    const cfg = readConfig();
    SD.cfg = cfg;
    SD.mergePending = false;
    const bg = document.getElementById('bg');
    const cv = document.getElementById('cv');
    const tintEl = document.getElementById('tint');
    const ctx = cv.getContext('2d');
    const bctx = bg.getContext('2d');

    // ---------- geometry (world units: every screen is 1000 tall) ----------
    const all = cfg.screens.map((s, i) => Object.assign({ i }, s));
    let spans, me, W;
    if (cfg.layout === 'span' && all.length > 1) {
      const sorted = all.slice().sort((a, b) => a.x - b.x);
      let acc = 0;
      spans = sorted.map((s) => { const sc = s.h / 1000, wu = s.w / sc; const sp = { s, x0: acc, x1: acc + wu, scale: sc }; acc += wu; return sp; });
      W = acc;
      me = spans.find((sp) => sp.s.i === cfg.me) || spans[0];
    } else {
      const s = all[cfg.me] || all[0];
      const sc = s.h / 1000;
      spans = [{ s, x0: 0, x1: s.w / sc, scale: sc }];
      W = spans[0].x1; me = spans[0];
    }
    // ledges (window tops) converted to world units
    const ledges = [];
    const onDesktop = cfg.look === 'live' || cfg.look === 'snapshot';
    for (const sp of onDesktop ? spans : []) {
      for (const L of sp.s.ledges || []) {
        const x0 = sp.x0 + L[0] / sp.scale, x1 = sp.x0 + L[1] / sp.scale, y = L[2] / sp.scale;
        if (x1 - x0 > 24 && y > 40 && y < 1000 - 1000 / 7 - 20) ledges.push([x0, x1, y]);
      }
    }
    // bottom edges of windows grow icicles (kept well above the snow and the scenes)
    const drips = [];
    for (const sp of onDesktop ? spans : []) {
      for (const L of sp.s.bottoms || []) {
        const x0 = sp.x0 + L[0] / sp.scale, x1 = sp.x0 + L[1] / sp.scale, y = L[2] / sp.scale;
        if (x1 - x0 > 40 && y > 60 && y < 1000 - 1000 / 7 - 90) drips.push([x0, x1, y]);
      }
    }
    let fakeDesk = null;
    if (cfg.look === 'preview') {
      fakeDesk = makeFakeDesktop(W, cfg.seed);
      ledges.push(...fakeDesk.ledges);
      drips.push(...fakeDesk.drips);
    }
    const seed = (cfg.layout === 'different' ? cfg.seed + cfg.me * 7919 : cfg.seed) >>> 0;
    const world = new SD.World({ W, seed, screens: spans, settings: Object.assign({}, cfg.settings), ledges, drips, overlay: cfg.look === 'live' || cfg.look === 'snapshot' });
    const areas = spans.map((sp) => ({ x0: sp.x0, x1: sp.x1, primary: !!sp.s.primary, prefer: !!sp.s.prefer }));
    const dirCfg = Object.assign({}, cfg, { seed, sceneSeed: cfg.seed, sceneOffset: cfg.layout === 'different' ? cfg.me : 0 });
    dirCfg.onScene = (n) => post('scene:' + n);
    dirCfg.post = post;
    const director = new SD.Director(world, dirCfg, areas);
    SD.world = world; SD.director = director;

    // ---------- canvas sizing ----------
    let view = { x0: me.x0, x1: me.x1 }, scale = 1;
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
      for (const c of [cv, bg]) { c.width = w; c.height = h; }
      if (cfg.fitAll) {
        // preview of a multi-screen world: show every screen side by side
        scale = Math.min(w / W, h / 1000);
        offY = Math.round((h - 1000 * scale) / 2);
        view = { x0: 0, x1: W };
      } else {
        scale = h / 1000; offY = 0;
        view = { x0: me.x0, x1: me.x0 + w / scale };
      }
      drawBackground();
    }
    let offY = 0;
    function worldTransform(c) { c.setTransform(scale, 0, 0, scale, -view.x0 * scale, offY); }

    function drawBackground() {
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      bctx.clearRect(0, 0, bg.width, bg.height);
      if (cfg.look === 'live') return;
      if (cfg.look === 'snapshot' && cfg.bg) {
        const img = new Image();
        img.onload = () => { bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.drawImage(img, 0, 0, bg.width, bg.height); };
        img.src = cfg.bg;
        return;
      }
      worldTransform(bctx);
      if (cfg.look === 'preview') fakeDesk.draw(bctx, view);
      else SD.drawScenery(bctx, view, cfg.look, cfg.seed);
    }
    addEventListener('resize', () => { if (live()) resize(); });
    resize();

    // ---------- simulation clock ----------
    const t0 = cfg.start && cfg.kind === 'saver' ? cfg.start : Date.now();
    let steps = 0;
    let speed = cfg.speed ?? 1; // preview only: 0 = paused
    let simClock = 0, lastNow = Date.now();
    addEventListener('message', (e) => {
      if (!live() || !e.data || cfg.kind === 'saver') return;
      if (typeof e.data.sdSpeed === 'number') speed = e.data.sdSpeed;
      if (typeof e.data.sdSeek === 'number') SD.seek(e.data.sdSeek);
    });
    function simStep() {
      director.step(DT);
      world.step(DT);
      for (const p of world.actors) p.update(DT);
      SD.personalSpace(world.actors, DT);
      for (const pr of world.props) pr.update(DT);
      if (world.actors.some((a) => a.dead)) world.actors = world.actors.filter((a) => !a.dead);
      if (world.props.some((a) => a.dead)) world.props = world.props.filter((a) => !a.dead);
      steps++;
    }
    SD.view = () => ({ scale: scale / (window.devicePixelRatio || 1), offY: offY / (window.devicePixelRatio || 1), x0: view.x0 });
    SD.jump = (sec) => { const n = Math.round(sec / DT); for (let i = 0; i < n; i++) simStep(); render(); };
    SD.wake = () => {
      const o = document.getElementById('sdOut'); if (o) { o.style.transition = 'opacity .3s'; o.style.opacity = '0'; }
      director.wake(); document.body.style.cursor = 'default';
      // the last of the snow fades away with everything else, so the window never vanishes in one jump
      setTimeout(() => { if (live()) { document.body.style.transition = 'opacity .65s ease-in'; document.body.style.opacity = '0'; } }, 1150);
      setTimeout(() => { if (live()) post('done'); }, 1900);
    };
    SD.fadeWhite = (sec) => director.fadeWhite(sec);
    SD.setStage = (on) => { director.stageOn = !!on; };
    // lights out before the screen switches off
    SD.fadeOut = (sec) => {
      let d = document.getElementById('sdOut');
      if (!d) { d = document.createElement('div'); d.id = 'sdOut'; document.body.appendChild(d); }
      d.style.cssText = `position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:99;transition:opacity ${sec}s ease-in`;
      d.getBoundingClientRect();
      d.style.opacity = '1';
    };

    // ---------- render ----------
    let rcv = null, rctx = null;
    function render() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      worldTransform(ctx);
      const w = world;
      w.drawFlakes(ctx, view, 0);
      w.drawLedges(ctx, view);
      w.drawGround(ctx, view);
      w.drawIce(ctx, view);
      w.drawResting(ctx, view);
      // sort drawables by lane
      const items = [];
      for (const pr of w.props) if (!pr.dead) items.push(pr);
      for (const p of w.actors) if (!p.dead && !p.inVehicle) items.push(p);
      items.sort((a, b) => a.lane - b.lane);
      // reflections on ice: drawn solid on their own layer (so nearer things hide farther ones,
      // like a real mirror), faded with distance from the surface, then laid on the ice at low opacity
      if (w.ice.on && w.ice.glaze > 0.2) {
        if (!rcv || rcv.width !== cv.width || rcv.height !== cv.height) { rcv = document.createElement('canvas'); rcv.width = cv.width; rcv.height = cv.height; rctx = rcv.getContext('2d'); }
        const sy = w.surfaceY((view.x0 + view.x1) / 2);
        const ia = Math.max(view.x0, w.ice.a), ib = Math.min(view.x1, w.ice.b);
        rctx.setTransform(1, 0, 0, 1, 0, 0);
        rctx.globalCompositeOperation = 'source-over'; rctx.globalAlpha = 1;
        rctx.clearRect(0, 0, rcv.width, rcv.height);
        worldTransform(rctx);
        SD.reflecting = true;
        for (const it of items) {
          if (it.x < view.x0 - 200 || it.x > view.x1 + 200) continue;
          rctx.save();
          rctx.translate(0, 2 * it.y + 2); rctx.scale(1, -1);
          it.draw(rctx);
          rctx.restore();
        }
        SD.reflecting = false;
        // keep only what's on the ice, fading out with depth
        rctx.globalCompositeOperation = 'destination-in';
        const g = rctx.createLinearGradient(0, sy, 0, sy + 85);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        rctx.fillStyle = g;
        rctx.fillRect(ia, sy, ib - ia, 85);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 0.3 * w.ice.glaze;
        ctx.drawImage(rcv, 0, 0);
        ctx.restore();
        rctx.globalCompositeOperation = 'source-over';
      }
      for (const it of items) if (it.drawShadow && it.x > view.x0 - 200 && it.x < view.x1 + 200) it.drawShadow(ctx);
      w.drawParticles(ctx, view, false);
      for (const it of items) {
        if (it.x < view.x0 - 400 || it.x > view.x1 + 400) continue;
        it.draw(ctx);
      }
      w.drawParticles(ctx, view, true);
      if (w.haze > 0.003) {
        // white-out: a cool white wall of snow (fully opaque at the height of a blizzard). The nearer
        // flakes are drawn over it, so the blizzard keeps racing past even when nothing else shows.
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
        const g = ctx.createLinearGradient(0, 0, 0, cv.height);
        g.addColorStop(0, `rgba(214,225,240,${w.haze})`); g.addColorStop(0.6, `rgba(232,239,248,${w.haze})`); g.addColorStop(1, `rgba(244,248,253,${w.haze})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.restore();
      }
      w.drawFlakes(ctx, view, 1);
      w.drawFlakes(ctx, view, 2);
      if (w.gale > 0.01) drawGale(ctx, w, cv.width, cv.height);
      if (tintEl) tintEl.style.opacity = String(director.tint.toFixed(3));
      if (cfg.fitAll) {
        // monitor bezels and the empty space around the little screens
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#0d1a2b';
        ctx.fillRect(0, 0, cv.width, offY); ctx.fillRect(0, offY + 1000 * scale, cv.width, cv.height);
        for (let i = 1; i < spans.length; i++) { const x = spans[i].x0 * scale; ctx.fillRect(x - 3, offY, 6, 1000 * scale); }
      }
    }

    // wind-driven snow racing across the screen, with darker gusts rolling through
    function drawGale(c, w, Wp, Hp) {
      const g = w.gale, t = w.t, k = Hp / 1080;
      const dir = (w.windBase || 1) >= 0 ? 1 : -1;
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
      for (let i = 0; i < 6; i++) {
        const sp = Wp * (0.25 + SD.hash(i, 73) * 0.35), span = Wp * 2.4;
        let x = ((SD.hash(i, 74) * span + t * sp) % span) - Wp * 0.7;
        if (dir < 0) x = Wp - x;
        const y = (SD.hash(i, 71) * 1.1 - 0.05) * Hp, ry = Hp * (0.1 + SD.hash(i, 72) * 0.16), rx = ry * (3 + SD.hash(i, 75) * 3);
        c.save(); c.translate(x, y); c.scale(rx / ry, 1);
        const rg = c.createRadialGradient(0, 0, 0, 0, 0, ry);
        rg.addColorStop(0, `rgba(170,190,216,${0.38 * g})`); rg.addColorStop(1, 'rgba(170,190,216,0)');
        c.fillStyle = rg; c.beginPath(); c.arc(0, 0, ry, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      c.lineCap = 'round';
      const n = Math.round(190 * g);
      for (let i = 0; i < n; i++) {
        const h1 = SD.hash(i, 81), h2 = SD.hash(i, 82), h3 = SD.hash(i, 83);
        const len = (26 + h2 * 140) * k, sp = (1.1 + h3 * 1.8) * Wp, span = Wp + len * 2;
        let x = ((h1 * span + t * sp) % span) - len;
        if (dir < 0) x = Wp - x;
        const y = SD.hash(i, 84) * Hp + Math.sin(t * 1.7 + i) * 10 * k;
        const drop = len * (0.1 + h3 * 0.12);
        c.strokeStyle = i % 3 === 0 ? `rgba(150,172,204,${(0.22 + h2 * 0.3) * g})` : `rgba(255,255,255,${(0.45 + h2 * 0.55) * g})`;
        c.lineWidth = (1.2 + h3 * 2.6) * k;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x - dir * len, y - drop); c.stroke();
      }
      c.restore();
    }

    // ---------- seeking (preview timeline) ----------
    // the simulation is deterministic, so any moment can be reached again by replaying from the start
    SD.simTime = () => world.t;
    SD.stepN = (n) => { for (let i = 0; i < n; i++) simStep(); };
    SD.renderNow = () => render();
    SD.syncClock = () => { simClock = steps * DT; lastNow = Date.now(); };
    SD.speedNow = () => speed;
    let lastReport = 0;
    function report() {
      if (cfg.kind === 'saver' || window.parent === window) return;
      SD.maxT = Math.max(SD.maxT || 0, world.t);
      const d = director, k = d.sceneName;
      try { window.parent.postMessage({ sdTime: world.t, sdMax: SD.maxT, sdSeeking: !!SD.seeking, sdScene: (d.phase === 'scene' || d.phase === 'linger') && k && SD.SCENES[k] ? SD.SCENES[k].name : '' }, '*'); } catch (e) {}
    }

    // ---------- main loop ----------
    let first = true;
    function frame() {
      if (!live()) return;
      if (SD.seeking) { requestAnimationFrame(frame); return; }
      let target;
      if (cfg.kind === 'saver') target = Math.floor((Date.now() - t0) / 1000 / DT); // wall clock keeps screens in sync
      else {
        const now = Date.now();
        simClock += Math.min(0.25, (now - lastNow) / 1000) * speed;
        lastNow = now;
        target = Math.max(steps, Math.floor(simClock / DT));
      }
      let budget = cfg.kind === 'saver' ? 900 : 240;
      while (steps < target && budget-- > 0) simStep();
      if (cfg.kind === 'saver' && steps < target - 2000) steps = target; // hopelessly behind: skip
      render();
      const nowR = Date.now(); if (nowR - lastReport > 200) { lastReport = nowR; report(); }
      if (first) { first = false; if (myGen === 1) post('ready'); }
      requestAnimationFrame(frame);
    }
    render();
    requestAnimationFrame(frame);

    // ---------- input ----------
    if (cfg.kind === 'saver') {
      let mx = null, my = null, armed = false;
      setTimeout(() => { armed = true; }, 900);
      let woke = false;
      const doWake = (kind) => {
        if (!armed || !live()) return;
        if (kind !== 'move' || !cfg.settings.startle) { post('quit'); return; }
        if (woke) return;
        woke = true; post('move');
      };
      addEventListener('mousemove', (e) => {
        if (mx == null) { mx = e.screenX; my = e.screenY; return; }
        if (Math.hypot(e.screenX - mx, e.screenY - my) > 9) doWake('move');
      });
      addEventListener('keydown', (e) => { e.preventDefault(); doWake('key'); });
      addEventListener('mousedown', () => doWake('click'));
      addEventListener('wheel', () => doWake('click'));
      addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }

  // ---------- a pretend desktop for the settings preview ----------
  function makeFakeDesktop(W, seed) {
    const r = SD.mulberry(seed ^ 0x77);
    const wins = [];
    const n = 3;
    for (let i = 0; i < n; i++) {
      const w = W * (0.2 + r() * 0.12), h = 280 + r() * 220;
      const x = (W * (i + 0.3)) / n - w / 2 + r() * 40, y = 120 + r() * 220;
      wins.push({ x, y, w, h, col: ['#3c7fd8', '#2f9e5f', '#9a57c9'][i] });
    }
    const ledges = wins.map((wn) => [wn.x + 4, wn.x + wn.w - 4, wn.y]);
    const drips = wins.map((wn) => [wn.x + 6, wn.x + wn.w - 6, wn.y + wn.h]).filter((d) => d[2] < 1000 - 1000 / 7 - 90);
    return {
      ledges, drips,
      draw(c, view) {
        const g = c.createLinearGradient(0, 0, 0, 1000);
        g.addColorStop(0, '#1f3b6e'); g.addColorStop(0.55, '#3e6fa8'); g.addColorStop(1, '#8fb4d9');
        c.fillStyle = g; c.fillRect(view.x0, 0, view.x1 - view.x0, 1000);
        c.fillStyle = 'rgba(255,255,255,0.05)';
        for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(view.x0 + (k + 0.5) * (view.x1 - view.x0) / 5, 980, 380, 0, Math.PI * 2); c.fill(); }
        for (const wn of wins) {
          c.save();
          c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 30; c.shadowOffsetY = 8;
          c.fillStyle = '#f7f8fa'; c.beginPath(); SD.rrect(c, wn.x, wn.y, wn.w, wn.h, 10); c.fill();
          c.restore();
          c.fillStyle = '#e8ebf0'; c.beginPath(); SD.rrect(c, wn.x, wn.y, wn.w, 34, 10); c.fill(); c.fillRect(wn.x, wn.y + 20, wn.w, 14);
          c.fillStyle = wn.col; c.fillRect(wn.x + 18, wn.y + 58, wn.w * 0.4, 14);
          c.fillStyle = '#d5dae2';
          for (let k = 0; k < 6; k++) c.fillRect(wn.x + 18, wn.y + 92 + k * 26, wn.w * (0.5 + ((k * 37) % 40) / 100), 9);
        }
        c.fillStyle = 'rgba(20,28,45,0.82)'; c.fillRect(view.x0, 1000 - 46, view.x1 - view.x0, 46);
        const cxm = (view.x0 + view.x1) / 2;
        for (let k = -3; k <= 3; k++) { c.fillStyle = k === 0 ? '#5aa0ff' : 'rgba(255,255,255,0.75)'; c.beginPath(); SD.rrect(c, cxm + k * 44 - 13, 1000 - 36, 26, 26, 6); c.fill(); }
      },
    };
  }

  // ---------- painted winter scenery (non-overlay looks) ----------
  SD.drawScenery = function (c, view, look, seed) {
    const night = look === 'night';
    const g = c.createLinearGradient(0, 0, 0, 1000);
    if (night) { g.addColorStop(0, '#0a1530'); g.addColorStop(0.6, '#203a6b'); g.addColorStop(1, '#3d5d8f'); }
    else { g.addColorStop(0, '#6fa8dc'); g.addColorStop(0.6, '#b9d8f0'); g.addColorStop(1, '#e8f3fb'); }
    c.fillStyle = g; c.fillRect(view.x0 - 2, 0, view.x1 - view.x0 + 4, 1000);
    if (night) {
      for (let x = Math.floor(view.x0 / 23) * 23; x < view.x1; x += 23) {
        const h = SD.hash(x, 5); if (h > 0.35) continue;
        c.fillStyle = `rgba(255,255,255,${0.4 + h})`; c.beginPath(); c.arc(x + h * 20, SD.hash(x, 6) * 600, 0.8 + h * 2.4, 0, Math.PI * 2); c.fill();
      }
      const mx = view.x0 + (view.x1 - view.x0) * 0.78;
      c.drawImage(SD.SPR.glow, mx - 120, 60, 240, 240);
      c.fillStyle = '#fff8e0'; c.beginPath(); c.arc(mx, 180, 42, 0, Math.PI * 2); c.fill();
    }
    const layer = (base, amp, freq, col, sd) => {
      c.fillStyle = col; c.beginPath(); c.moveTo(view.x0 - 5, 1000);
      for (let x = view.x0 - 5; x <= view.x1 + 10; x += 8) c.lineTo(x, base + SD.fbm1(x / freq, seed + sd, 4) * amp);
      c.lineTo(view.x1 + 10, 1000); c.closePath(); c.fill();
    };
    layer(560, 120, 520, night ? '#4a6797' : '#c9dcef', 1);
    layer(640, 70, 380, night ? '#5f7fae' : '#deeaf6', 2);
    // pine line
    for (let x = Math.floor(view.x0 / 26) * 26 - 26; x < view.x1 + 26; x += 26) {
      const h = SD.hash(x, 9); if (h < 0.3) continue;
      const th = 50 + h * 90, by = 760 + SD.fbm1(x / 300, seed + 3) * 20;
      c.fillStyle = night ? '#1d3550' : '#2f6b5a';
      c.beginPath(); c.moveTo(x, by - th); c.lineTo(x + th * 0.32, by); c.lineTo(x - th * 0.32, by); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.beginPath(); c.moveTo(x, by - th); c.lineTo(x + th * 0.1, by - th * 0.7); c.lineTo(x - th * 0.1, by - th * 0.7); c.closePath(); c.fill();
    }
    const fg = c.createLinearGradient(0, 765, 0, 1000);
    fg.addColorStop(0, night ? '#4d6a96' : '#e3edf7'); fg.addColorStop(1, night ? '#2c4268' : '#c3d5e8');
    c.fillStyle = fg; c.fillRect(view.x0 - 2, 765, view.x1 - view.x0 + 4, 240);
  };

  SD.reboot = (cfg) => { window.__SNOW = cfg; boot(); };
  // jump to a moment of the preview: forward by playing on fast, back by replaying from the start
  let seekJob = 0;
  SD.seek = (t) => {
    const job = ++seekJob;
    t = Math.max(0, t);
    if (t < SD.simTime() - 1e-6) SD.reboot(Object.assign({}, SD.cfg, { speed: SD.speedNow() }));
    SD.seeking = true;
    const go = () => {
      if (job !== seekJob) return;
      const t0 = performance.now();
      while (performance.now() - t0 < 14 && SD.simTime() < t - 1e-6) SD.stepN(Math.max(1, Math.min(30, Math.round((t - SD.simTime()) * 60))));
      SD.renderNow();
      if (SD.simTime() < t - 1e-6) {
        try { window.parent.postMessage({ sdTime: SD.simTime(), sdMax: Math.max(SD.maxT || 0, t), sdSeeking: true }, '*'); } catch (e) {}
        setTimeout(go, 0); return;
      }
      SD.seeking = false; SD.syncClock();
      try { window.parent.postMessage({ sdTime: SD.simTime(), sdMax: Math.max(SD.maxT || 0, SD.simTime()), sdSeeking: false }, '*'); } catch (e) {}
    };
    go();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
