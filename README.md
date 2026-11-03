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
Giant Snowman, First Reindeer, Parkour (runs along your open windows), and with two screens side by side:
Snowball Fight, Zipline, Tug-of-War.

In Settings, the live preview has pause and speed controls and a full-screen button (Esc or double-click to
leave); **Play as screensaver** runs it exactly as it plays when you step away.

With **Snow on screens I'm not using**, each screen also wakes on its own: only the one you come back to
melts, unless a two-screen scene is playing across them.

## Privacy

Snow Day doesn't collect or send anything. The only network request is the update check, which reads this
repository's public release list on GitHub. Settings stay on your PC in `%APPDATA%\SnowDay`.

## Building

Cross-compiles from any OS with Go (see `go.mod` for the version); dependencies are vendored in `third_party/`:

```
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 GOFLAGS=-mod=mod GOPROXY=off GOSUMDB=off \
  go build -trimpath -ldflags "-H windowsgui -s -w" -o SnowDay.exe .
```

Every push to `main` runs `tools/secret-scan.sh` and builds the exe (`.github/workflows/build.yml`).
To ship an update, bump `appVersion` in `main.go` and add its section to `CHANGELOG.md` (that list is the
release notes and what the update prompt shows): the next push publishes the release.

Before a release, run `node tools/depth-check.js` (needs Playwright). It plays every scene on three seeds
and flags penguins standing inside each other or walking through props, with a picture of each.

The penguins, reindeer and scenes are original artwork drawn in code (`web/js/`).
