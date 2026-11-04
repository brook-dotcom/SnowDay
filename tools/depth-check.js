// Depth check: run before every release.
//
//   node tools/depth-check.js [scene,scene...] [outDir]
//
// Plays every scene on three seeds and looks, four times a second, for the two mistakes that
// break the picture:
//   overlap  two penguins standing at much the same depth, bodies inside each other
//   through  a penguin walking through a solid prop it isn't using (seesaw, desk, easel, igloo,
//            kitchen bench, TV camera, the limbo bar), at that prop's depth
// Hugs, huddles (p.snug), anyone carried, riding, sitting, climbing or in the air are ignored.
// Prints each problem once (with how long it lasted) and saves a picture of each to outDir
// (default ./depth-check) for a look before shipping. Exits 1 if anything was found.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ALL = ['tree', 'parade', 'ramp', 'ice', 'igloo', 'fishing', 'blizzard', 'flying', 'snowman', 'reindeer', 'parkour', 'snowball', 'zipline', 'tug', 'hockey', 'bakeoff'];
const scenes = (process.argv[2] || ALL.join(',')).split(',');
const outDir = process.argv[3] || 'depth-check';
const page = 'file://' + path.resolve(__dirname, '../web/saver.html');

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  let problems = 0;
  for (const scene of scenes) {
    for (const seed of [1, 2, 3]) {
      const dual = ['snowball', 'zipline', 'tug'].includes(scene);
      const cfg = { kind: 'preview', look: scene === 'parkour' ? 'preview' : 'day', fast: true, skipBuild: true, force: scene, seed, fitAll: dual,
        screens: dual ? [{ x: 0, y: 0, w: 1920, h: 1080 }, { x: 1920, y: 0, w: 1920, h: 1080 }] : [{ x: 0, y: 0, w: 1920, h: 1080 }], settings: { scenes: {} } };
      await p.goto(page + '?r=' + Math.random() + '#' + encodeURIComponent(JSON.stringify(cfg)));
      await p.waitForTimeout(150);
      const ok = await p.evaluate(() => !!(window.SD && SD.SCENES && SD.director));
      if (!ok) { console.log(`${scene}: not available`); break; }
      if (!(await p.evaluate((s) => !!SD.SCENES[s], scene))) { console.log(`${scene}: no such scene`); break; }
      await p.evaluate(() => window.postMessage({ sdSpeed: 0 }, '*'));
      const found = await p.evaluate(() => {
        const SOLID = ['Seesaw', 'JudgeTable', 'Easel', 'Igloo', 'Bench', 'TVCam'];
        const free = (a) => !a.dead && !a.hidden && !a.snug && !a.attach && !a.inVehicle && !a.air && a.action !== 'hug' &&
          (a.loco === 'stand' || a.loco === 'walk' || a.loco === 'march' || a.loco === 'glide') && Math.abs(a.y - a.groundY()) < 3;
        const half = (a) => 30 * a.size * a.K.kx;
        const runs = new Map(), done = [], out = [];
        const d = SD.director, w = SD.world;
        let started = false, t0 = 0;
        for (let i = 0; i < 60 * 60 * 8; i++) {
          SD.stepN(1); // no drawing: just the simulation
          if (d.phase === 'scene') { if (!started) { started = true; t0 = w.t; } } else if (started) break;
          if (!started || i % 15) continue;
          const t = w.t - t0, seen = new Set();
          const v = SD.view(), vx1 = v.x0 + innerWidth / v.scale;
          const as = w.actors.filter((a) => free(a) && a.x > v.x0 + 20 && a.x < vx1 - 20); // on screen only
          for (let x = 0; x < as.length; x++) for (let y = x + 1; y < as.length; y++) {
            const a = as[x], c = as[y];
            if (Math.abs(a.lane - c.lane) > 4) continue;
            const lim = 0.62 * (half(a) + half(c));
            if (Math.abs(a.x - c.x) < lim) seen.add(`overlap|${a.kind}#${a.id}|${c.kind}#${c.id}|${(a.x + c.x) / 2}|${a.y}`);
          }
          for (const pr of w.props) {
            if (pr.dead || !SOLID.includes(pr.constructor.name) || !pr.bbox || pr.lift > 0 || pr.alpha < 0.5) continue;
            const [x0, , x1] = pr.bbox();
            for (const a of as) {
              if (a.loco !== 'walk' || a.using === pr || Math.abs(a.lane - pr.lane) > 3) continue; // a.using: meant to (going into an igloo)
              if (a.x > x0 + 8 && a.x < x1 - 8) seen.add(`through|${a.kind}#${a.id}|${pr.constructor.name}|${a.x}|${a.y}`);
            }
          }
          // the limbo bar: nobody but a limbo dancer crosses its line on the snow
          for (const pr of w.props) {
            if (pr.dead || pr.constructor.name !== 'Bar' || pr.u0 !== 0) continue;
            const [ha, hb] = pr.ends(), la = pr.a.lane, lb = pr.b.lane;
            for (const a of w.actors) {
              if (a.dead || a === pr.a || a === pr.b || a.loco === 'limbo' || a.limbo) continue;
              const u = (la - a.lane) / ((la - lb) || 1);
              if (u <= 0 || u >= 1) continue;
              const bx = ha[0] + (hb[0] - ha[0]) * u;
              if (Math.abs(a.x - bx) < 10) seen.add(`through|${a.kind}#${a.id}|limbo bar|${a.x}|${a.y}`);
            }
          }
          // continuous runs per pair: a gap of more than half a second starts a new one
          for (const k of seen) {
            const id = k.split('|').slice(0, 3).join('|'), r = runs.get(id);
            if (r && t - r.t1 <= 0.5) { r.t1 = t; continue; }
            if (r) done.push(r);
            runs.set(id, { k, t0: t, t1: t });
          }
        }
        done.push(...runs.values());
        for (const r of done) if (r.t1 - r.t0 >= (r.k.startsWith('overlap') ? 1 : 0.25)) { const [kind, a, b2, x, y] = r.k.split('|'); out.push({ kind, a, b: b2, x: +x, y: +y, t0: r.t0, t1: r.t1 }); }
        return { out, started };
      });
      for (const f of found.out) {
        problems++;
        console.log(`${scene} seed ${seed}  ${f.kind.padEnd(7)} ${f.a} / ${f.b}  ${f.t0.toFixed(1)}–${f.t1.toFixed(1)}s`);
        // a picture of the moment
        await p.goto(page + '?r=' + Math.random() + '#' + encodeURIComponent(JSON.stringify(cfg)));
        await p.waitForTimeout(120);
        const at = await p.evaluate((f) => {
          window.postMessage({ sdSpeed: 0 }, '*');
          const d = SD.director, w = SD.world; let t0 = null;
          for (let i = 0; i < 60 * 60 * 8; i++) { SD.stepN(1); if (d.phase === 'scene' && t0 == null) t0 = w.t; if (t0 != null && w.t - t0 >= f.t0) break; }
          SD.renderNow();
          const v = SD.view(); return [(f.x - v.x0) * v.scale, v.offY + f.y * v.scale];
        }, f);
        const cx = Math.max(300, Math.min(1620, at[0])), cy = Math.max(200, Math.min(880, at[1] - 60));
        await p.screenshot({ path: path.join(outDir, `${scene}-${seed}-${f.t0.toFixed(1)}-${f.kind}.png`), clip: { x: cx - 300, y: cy - 200, width: 600, height: 400 } });
      }
      if (!found.out.length) console.log(`${scene} seed ${seed}  ok`);
    }
  }
  await b.close();
  console.log(problems ? `\n${problems} problem(s): pictures in ${outDir}` : '\nall clear');
  process.exit(problems ? 1 : 0);
})();
