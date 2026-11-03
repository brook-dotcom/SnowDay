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
    const areas = spans.map((sp) => ({ x0: sp.x0, x1: sp.x1, primary: !!sp.s.primary }));
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
    // the screensaver runs on the wall clock (so every screen shows the same moment). In the
    // full-screen preview the speed can change: each change starts a new segment at an agreed time.
    let segWall = t0, segSim = 0, segSpeed = cfg.kind === 'saver' && cfg.studio ? (cfg.speed ?? 1) : 1, pendingSpeed = null;
    const simAt = (now) => segSim + (Math.max(0, now - segWall) / 1000) * segSpeed;
    SD.setSpeedAt = (at, sp) => { pendingSpeed = { at, sp }; if (SD.onSpeed) SD.onSpeed(sp); };
    SD.speedNow = () => (pendingSpeed ? pendingSpeed.sp : segSpeed);
    addEventListener('message', (e) => { if (live() && e.data && typeof e.data.sdSpeed === 'number' && cfg.kind !== 'saver') speed = e.data.sdSpeed; });
    function simStep() {
      director.step(DT);
      world.step(DT);
      for (const p of world.actors) p.update(DT);
      for (const pr of world.props) pr.update(DT);
      if (world.actors.some((a) => a.dead)) world.actors = world.actors.filter((a) => !a.dead);
      if (world.props.some((a) => a.dead)) world.props = world.props.filter((a) => !a.dead);
      steps++;
    }
    SD.view = () => ({ scale: scale / (window.devicePixelRatio || 1), offY: offY / (window.devicePixelRatio || 1), x0: view.x0 });
    SD.jump = (sec) => { const n = Math.round(sec / DT); for (let i = 0; i < n; i++) simStep(); render(); };
    SD.wake = () => { const o = document.getElementById('sdOut'); if (o) { o.style.transition = 'opacity .3s'; o.style.opacity = '0'; } director.wake(); document.body.style.cursor = 'default'; setTimeout(() => { if (live()) post('done'); }, 1900); };
    SD.fadeWhite = (sec) => director.fadeWhite(sec);
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
      w.drawFlakes(ctx, view, 1);
      w.drawFlakes(ctx, view, 2);
      if (w.haze > 0.003) {
        // white-out: a cool white wall of snow (fully opaque at the height of a blizzard)
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const g = ctx.createLinearGradient(0, 0, 0, cv.height);
        g.addColorStop(0, `rgba(222,232,244,${w.haze})`); g.addColorStop(0.6, `rgba(236,242,250,${w.haze})`); g.addColorStop(1, `rgba(246,249,253,${w.haze})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
      }
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

    // ---------- main loop ----------
    let first = true;
    function frame() {
      if (!live()) return;
      let target;
      if (cfg.kind === 'saver') {
        const now = Date.now();
        if (pendingSpeed && now >= pendingSpeed.at) { segSim = simAt(pendingSpeed.at); segWall = pendingSpeed.at; segSpeed = pendingSpeed.sp; pendingSpeed = null; }
        target = Math.floor(simAt(now) / DT); // wall clock keeps screens in sync
      }
      else {
        const now = Date.now();
        simClock += Math.min(0.25, (now - lastNow) / 1000) * speed;
        lastNow = now;
        target = Math.max(steps, Math.floor(simClock / DT));
      }
      let budget = cfg.kind === 'saver' ? 900 : 240;
      while (steps < target && budget-- > 0) simStep();
      if (steps < target - 2000) steps = target; // hopelessly behind: skip
      render();
      if (first) { first = false; if (myGen === 1) post('ready'); }
      requestAnimationFrame(frame);
    }
    render();
    requestAnimationFrame(frame);

    // ---------- input ----------
    if (cfg.kind === 'saver' && cfg.studio) studioControls(cfg, director, live);
    else if (cfg.kind === 'saver') {
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

  // ---------- full-screen preview controls (on the main screen) ----------
  const PAUSE = '<svg viewBox="0 0 12 12"><rect x="2.5" y="2" width="2.5" height="8" rx=".5"/><rect x="7" y="2" width="2.5" height="8" rx=".5"/></svg>';
  const CLOSE = '<svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3 3 9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  function studioControls(cfg, director, live) {
    document.body.style.cursor = 'default';
    let last = 1;
    const setSpeed = (sp) => { if (sp > 0) last = sp; post('speed:' + sp); };
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); post('close'); }
      else if (e.key === ' ') { e.preventDefault(); setSpeed(SD.speedNow() === 0 ? last : 0); }
    });
    addEventListener('contextmenu', (e) => e.preventDefault());
    if (cfg.me !== 0) return;
    const st = document.createElement('style');
    st.textContent = `
      #sdBar { position: fixed; left: 50%; top: 24px; transform: translateX(-50%); z-index: 50; display: flex; align-items: center; gap: 2px;
        height: 40px; padding: 4px; border-radius: 8px; background: rgba(18,22,28,0.78); backdrop-filter: blur(8px); color: #eef1f5;
        box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.3); font: 600 13px/1 "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;
        transition: opacity .3s ease; user-select: none; }
      #sdBar.hide { opacity: 0; pointer-events: none; }
      #sdBar .nm { padding: 0 12px 0 10px; min-width: 120px; color: #eef1f5; white-space: nowrap; }
      #sdBar i { width: 1px; height: 20px; background: rgba(255,255,255,0.14); margin: 0 4px; }
      #sdBar button { border: 0; background: transparent; color: rgba(238,241,245,0.82); height: 32px; min-width: 40px; padding: 0 10px; border-radius: 6px;
        font: inherit; font-variant-numeric: tabular-nums; cursor: pointer; display: grid; place-items: center; }
      #sdBar button:hover { color: #fff; background: rgba(255,255,255,0.1); }
      #sdBar button.on { background: #4aa3df; color: #0b1a26; }
      #sdBar svg { width: 12px; height: 12px; fill: currentColor; }
      #sdBar .x { display: flex; gap: 8px; align-items: center; padding: 0 12px; }`;
    document.head.appendChild(st);
    const bar = document.createElement('div');
    bar.id = 'sdBar';
    bar.innerHTML = `<span class="nm"></span><i></i><button data-s="0" aria-label="Pause">${PAUSE}</button><button data-s="1">1×</button><button data-s="4">4×</button><button data-s="16">16×</button><i></i><button class="x" data-close>${CLOSE}<span>Close</span></button>`;
    document.body.appendChild(bar);
    const nm = bar.querySelector('.nm');
    const paint = (sp) => bar.querySelectorAll('[data-s]').forEach((b) => b.classList.toggle('on', +b.dataset.s === sp));
    SD.onSpeed = paint; paint(SD.speedNow());
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-close')) post('close'); else setSpeed(+b.dataset.s);
    });
    // the bar and the pointer step aside while you watch
    let idleT = null;
    const wake = () => { bar.classList.remove('hide'); document.body.style.cursor = 'default'; clearTimeout(idleT); idleT = setTimeout(() => { if (!bar.matches(':hover')) { bar.classList.add('hide'); document.body.style.cursor = 'none'; } }, 2500); };
    addEventListener('mousemove', wake); wake();
    (function label() {
      if (!live()) return;
      const k = director.sceneName;
      nm.textContent = (director.phase === 'scene' || director.phase === 'linger') && k && SD.SCENES[k] ? SD.SCENES[k].name : director.phase === 'storm' ? 'Snowstorm' : 'Snowfall';
      setTimeout(label, 400);
    })();
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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
