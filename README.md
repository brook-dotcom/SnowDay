# Snow Day

A cosy Windows screensaver. When you step away, snow falls on your desktop and builds up, then a crew of
penguins turns up and gets into trouble: decorating a tree, a limbo contest, igloo building with a panel of
judges, a giant snowman (where's Pip?), meeting a reindeer for the first time, and more. Move the mouse and
they dive into the snow as it melts away.

## Install

1. Download **SnowDay.exe** from the [latest release](../../releases/latest).
2. Run it. The first time, Windows SmartScreen may say "Windows protected your PC" because the app isn't
   code-signed: choose **More info → Run anyway**.
3. Settings open; press **Done** and Snow Day waits in the system tray.

Snow Day checks this repository's releases every hour and offers new versions with what's changed
(update, remind me later, or skip). Critical fixes install themselves. You can turn checking off in
Settings, or use **Check for updates** in the tray menu.

Needs Windows 10 or 11 (uses the built-in WebView2).

On laptops, if Windows turns the screen off, sleeps or locks sooner than your idle time, the snow starts just
before that. Hover over the tray icon to see when it will start, or what it's waiting for. If it still
doesn't start, **Diagnostics** in the tray menu writes a short report (it stays on your PC).

## The crew

Captain (the leader), Chubby, Pip (a young emperor), Rocco (a rockhopper), Specs (the brainy one), Holly and the
beanie penguins.

## Scenes

Deck the Tree, Candy Parade, The Big Ramp, Ice Day, Igloo Contest, Ice Fishing, Blizzard, Flying Lessons,
Giant Snowman, First Reindeer, Hockey Night, Gingerbread Bake-Off, The Long Table, Nativity Play, The Trebuchet, The Christmas Card, Santa's Grotto, The Countdown, Santa's Workshop, Christmas Biscuits, Carols round the Tree, Decorating the Town, Parkour (runs along your open windows),
and with two screens side by side:
Snowball Fight, Zipline, Tug-of-War.

In Settings, the live preview has pause and speed controls and a full-screen button (Esc or double-click to
leave); **Play as screensaver** runs it exactly as it plays when you step away.

With **Snow on screens I'm not using**, each screen also wakes on its own: only the one you come back to
melts, unless a two-screen scene is playing across them.

## Privacy

Snow Day doesn't collect or send anything. The only network request is the update check, which reads this
repository's public release list on GitHub. Settings stay on your PC in `%APPDATA%\SnowDay`.

## Building

```
app/           the Windows app (Go) and, in app/web, the snow and scenes it shows
third_party/   vendored Go dependencies
tools/         depth check, secret scan, icon resource builder
```

Cross-compiles from any OS with Go (see `go.mod` for the version):

```
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 GOFLAGS=-mod=mod GOPROXY=off GOSUMDB=off \
  go build -trimpath -ldflags "-H windowsgui -s -w" -o SnowDay.exe ./app
```

Work happens on `dev`. Every push to `main` runs `tools/secret-scan.sh` and builds the exe
(`.github/workflows/build.yml`); when `appVersion` in `app/main.go` is new, that push publishes the release,
with its `CHANGELOG.md` section as the notes the update prompt shows.

## Staging a scene

Lanes are depth: a bigger lane is nearer the glass (0–5 set, 6–16 back row, 17–27 middle, 28–38 front).

1. **Plan the blocking first.** A scene starts with `S.marks({ name: [x from centre, lane], … })` and a
   one-line depth plan in a comment. `marks()` checks the plan itself and reports two places that would put
   penguins inside each other or hide a face.
2. **Move safely.** `S.to(p, mark)`, `S.route()` and `S.toLane()` change depth first and then walk across.
   Set pieces are `SD.set.Draw` props carried on with `SD.set.carryIn`.
3. **Look from above.** `node tools/stage-map.js scene [seed]` draws the whole scene as a plan, one strip a
   minute: where everyone walked and stood.
4. **Gate.** `node tools/depth-check.js [scene]` plays every scene on three seeds and flags penguins inside
   each other, walking through props, hidden behind one another, half off the screen, or on the join between
   two screens, with a picture of each. Run it before a release.
5. **Replay a report.** The full-screen preview stamps scene, seed and time in the corner;
   `node tools/replay.js scene seed seconds` gives that exact frame and where everyone is.

The penguins, reindeer and scenes are original artwork drawn in code (`app/web/js/`).
