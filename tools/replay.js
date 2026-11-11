// Replay: the exact frame behind the stamp in the corner of the full-screen preview.
//
//   node tools/replay.js scene seed seconds [out.png] [look]
//
// e.g. the stamp "snowman · 48213 · 107.4s" → node tools/replay.js snowman 48213 107.4
// (scene "random" for a preview that wasn't set to one scene). Saves the picture and prints
// where every penguin is (place, depth, what it's doing), which is usually enough to find the bug.
const { chromium } = require('playwright');
const path = require('path');
const [scene, seed, secs, outArg, look] = process.argv.slice(2);
if (!secs) { console.log('usage: node tools/replay.js scene seed seconds [out.png] [look]'); process.exit(1); }
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const force = scene === 'random' ? null : scene, dual = ['snowball', 'zipline', 'tug'].includes(scene);
  const cfg = { kind: 'preview', look: look || 'day', fast: true, seed: +seed, layout: dual ? 'span' : 'mirror', force, skipBuild: !!force, fitAll: dual,
    screens: dual ? [{ x: 0, y: 0, w: 1600, h: 900 }, { x: 1600, y: 0, w: 1600, h: 900 }] : undefined, settings: { scenes: {} } };
  await p.goto('file://' + path.resolve(__dirname, '../app/web/saver.html') + '#' + encodeURIComponent(JSON.stringify(cfg)));
  await p.waitForTimeout(200);
  const who = await p.evaluate((t) => {
    window.postMessage({ sdSpeed: 0 }, '*');
    while (SD.simTime() < t) SD.stepN(1);
    SD.renderNow();
    return SD.world.actors.filter((a) => !a.dead && !a.hidden).map((a) => `${a.kind}#${a.id} x${Math.round(a.x)} lane${a.lane.toFixed(0)} ${a.loco}/${a.action || 'none'}${a.attach ? ' attached' : ''}`);
  }, +secs);
  const out = outArg || `replay-${scene}-${seed}-${secs}.png`;
  await p.screenshot({ path: out });
  console.log(who.join('\n') + '\n' + out);
  await b.close();
})();
