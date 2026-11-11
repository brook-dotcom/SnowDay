// Stage map: a scene seen from above, one strip per minute.
//
//   node tools/stage-map.js scene [seed] [out.png]
//
// Across is the stage, up is depth (the back of the stage at the top, the glass at the bottom).
// Every penguin leaves a line where it walked and a ring where it stood for two seconds or more,
// with the second it arrived; props are bars at their depth. Rings that touch are penguins inside
// each other; a ring straight below another, close by, is a penguin hiding a face. It is the
// quick way to see a whole scene's blocking without watching it.
const { chromium } = require('playwright');
const path = require('path');

const [scene, seedArg, outArg] = process.argv.slice(2);
if (!scene) { console.log('usage: node tools/stage-map.js scene [seed] [out.png]'); process.exit(1); }
const seed = +(seedArg || 1), out = outArg || `stage-map-${scene}-${seed}.png`;
const page = 'file://' + path.resolve(__dirname, '../app/web/saver.html');
const COL = { captain: '#1f3b73', holly: '#e0559a', specs: '#2f9e5f', chubby: '#e2832b', pip: '#8b5cf6', rocco: '#d92f2f', crew: '#4b8fd6', stranger: '#777' };

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const dual = ['snowball', 'zipline', 'tug'].includes(scene);
  const cfg = { kind: 'preview', look: 'day', fast: true, skipBuild: true, force: scene, seed, fitAll: dual,
    screens: dual ? [{ x: 0, y: 0, w: 1920, h: 1080 }, { x: 1920, y: 0, w: 1920, h: 1080 }] : [{ x: 0, y: 0, w: 1920, h: 1080 }], settings: { scenes: {} } };
  await p.goto(page + '#' + encodeURIComponent(JSON.stringify(cfg)));
  await p.waitForTimeout(200);
  const data = await p.evaluate(() => {
    window.postMessage({ sdSpeed: 0 }, '*');
    const d = SD.director, w = SD.world, tr = {}, props = {};
    let t0 = null;
    for (let i = 0; i < 60 * 60 * 8; i++) {
      SD.stepN(1);
      if (d.phase === 'scene') { if (t0 == null) t0 = w.t; } else if (t0 != null) break;
      if (t0 == null || i % 30) continue;
      const t = w.t - t0;
      for (const a of w.actors) {
        if (a.dead || a.hidden) continue;
        (tr[a.id] = tr[a.id] || { kind: a.kind, pts: [] }).pts.push([t, a.x, a.lane, a.loco === 'stand' && !a.target ? 1 : 0, 30 * a.size * a.K.kx]);
      }
      for (const pr of w.props) {
        if (pr.dead || !pr.constructor || pr.constructor.name === 'Object' || pr.alpha < 0.3) continue;
        const e = pr.extent ? pr.extent() : pr.bbox ? [pr.bbox()[0], pr.bbox()[2]] : null;
        if (!e) continue;
        const k = pr.constructor.name + '@' + Math.round((e[0] + e[1]) / 40) + '/' + Math.round(pr.lane) + '#' + Math.floor(t / 60);
        props[k] = { n: pr.constructor.name, x0: e[0], x1: e[1], lane: pr.lane, m: Math.floor(t / 60) };
      }
    }
    const v = SD.view();
    return { tr, props: Object.values(props), x0: v.x0, x1: v.x0 + innerWidth / v.scale, end: w.t - t0 };
  });
  const W = 1500, LH = 7, TOP = 26, SH = 50 * LH + TOP + 14, mins = Math.ceil(data.end / 60);
  const X = (x) => 40 + (x - data.x0) / (data.x1 - data.x0) * (W - 80), Y = (l) => TOP + Math.max(-2, Math.min(48, l)) * LH;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${mins * SH}" font-family="sans-serif" font-size="11">`;
  for (let m = 0; m < mins; m++) {
    svg += `<g transform="translate(0,${m * SH})"><rect x="40" y="${TOP}" width="${W - 80}" height="${48 * LH}" fill="#f6f8fb" stroke="#99a"/>`;
    for (const [l, n] of [[5, 'set'], [16, 'back'], [27, 'middle'], [38, 'front']]) svg += `<line x1="40" x2="${W - 40}" y1="${Y(l)}" y2="${Y(l)}" stroke="#ccd" stroke-dasharray="4 4"/><text x="4" y="${Y(l) - 2}" fill="#889">${n}</text>`;
    svg += `<text x="40" y="16" font-size="13" fill="#334">${scene} seed ${seed} · ${m}:00–${m + 1}:00</text>`;
    for (const pr of data.props.filter((q) => q.m === m)) svg += `<rect x="${X(pr.x0)}" y="${Y(pr.lane) - 2}" width="${Math.max(2, X(pr.x1) - X(pr.x0))}" height="4" fill="#b9a27a" opacity="0.55"/><text x="${X(pr.x0)}" y="${Y(pr.lane) - 4}" fill="#8a7448" font-size="9">${pr.n}</text>`;
    for (const id of Object.keys(data.tr)) {
      const a = data.tr[id], c = COL[a.kind] || '#555', pts = a.pts.filter((q) => q[0] >= m * 60 && q[0] < (m + 1) * 60);
      if (!pts.length) continue;
      svg += `<polyline fill="none" stroke="${c}" stroke-width="1.3" opacity="0.6" points="${pts.map((q) => X(q[1]).toFixed(0) + ',' + Y(q[2]).toFixed(0)).join(' ')}"/>`;
      // stands: runs of standing samples at one spot
      let run = null;
      const flush = () => { if (run && run.t1 - run.t0 >= 2) svg += `<ellipse cx="${X(run.x)}" cy="${Y(run.l)}" rx="${(run.h / (data.x1 - data.x0)) * (W - 80)}" ry="${2 * LH}" fill="${c}" fill-opacity="0.18" stroke="${c}"/><text x="${X(run.x)}" y="${Y(run.l) + 4}" text-anchor="middle" fill="${c}" font-weight="bold">${a.kind[0].toUpperCase()}${id % 100}</text><text x="${X(run.x)}" y="${Y(run.l) + 14}" text-anchor="middle" fill="#556" font-size="9">${Math.round(run.t0 % 60)}s</text>`; run = null; };
      for (const q of pts) {
        if (q[3] && run && Math.abs(q[1] - run.x) < 4 && Math.abs(q[2] - run.l) < 1.5) run.t1 = q[0];
        else { flush(); if (q[3]) run = { x: q[1], l: q[2], t0: q[0], t1: q[0], h: q[4] }; }
      }
      flush();
    }
    svg += '</g>';
  }
  svg += '</svg>';
  await p.setViewportSize({ width: W, height: Math.min(mins * SH, 4000) });
  await p.setContent(`<body style="margin:0;background:#fff">${svg}</body>`);
  await p.screenshot({ path: out, fullPage: true });
  await b.close();
  console.log(`${out}  (${mins} min, ${Object.keys(data.tr).length} penguins)`);
})();
