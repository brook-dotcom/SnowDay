//go:build windows

package main

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"syscall"
	"time"
	"unsafe"

	"github.com/jchv/go-webview2/pkg/edge"
	"golang.org/x/sys/windows"
)

type monitor struct {
	R       RECT
	Primary bool
}

type screenCfg struct {
	X       int32      `json:"x"`
	Y       int32      `json:"y"`
	W       int32      `json:"w"`
	H       int32      `json:"h"`
	Ledges  [][3]int32 `json:"ledges"`
	Bottoms [][3]int32 `json:"bottoms"`
	Primary bool       `json:"primary"`
}

type saverWin struct {
	hwnd    uintptr
	web     *edge.Chromium
	mon     monitor
	snapBM  uintptr
	snapDC  uintptr
	index   int
	bgURL   string
	started time.Time
	waking  bool
	wakeAt  time.Time
	scene   string
	prevFG  uintptr // what you were working in when this screen started snowing
}

type saverOpts struct {
	Fast      bool
	Force     string
	Settings  *Settings
	Studio    bool    // full-screen preview: plays on, with pause and speed controls, until closed
	SkipBuild bool    // start with the snow already down
	Speed     float64 // studio: starting speed
	Seed      uint32  // 0 = pick one
}

var saver struct {
	running      bool
	wins         []*saverWin
	started      time.Time
	baseTick     uint32
	baseCursor   POINT
	armed        bool
	waking       bool
	wakeAt       time.Time
	prevFG       uintptr
	opts         saverOpts
	perMon       bool // started one screen at a time ("only the screen I'm not using")
	merged       bool // all windows share one world
	mergePending bool // every screen is snowing: join them at the next blizzard
	merging      bool
	stormWin     *saverWin
}

var saverByHwnd = map[uintptr]*saverWin{}

func registerSaverClass() {
	black, _, _ := pGetStockObject.Call(BLACK_BRUSH)
	registerClass("SnowDaySaverWnd", saverProc, black, app.icon)
}

var (
	monOut      []monitor
	monCallback = syscall.NewCallback(func(h, hdc, rc, lp uintptr) uintptr {
		mi := MONITORINFO{CbSize: uint32(unsafe.Sizeof(MONITORINFO{}))}
		pGetMonitorInfoW.Call(h, uintptr(unsafe.Pointer(&mi)))
		monOut = append(monOut, monitor{R: mi.RcMonitor, Primary: mi.DwFlags&MONITORINFOF_PRIMARY != 0})
		return 1
	})
	ledgeFn       func(h uintptr) uintptr
	ledgeCallback = syscall.NewCallback(func(h, lp uintptr) uintptr { return ledgeFn(h) })
)

func monitors() []monitor {
	monOut = nil
	pEnumDisplayMonitors.Call(0, 0, monCallback, 0)
	out := monOut
	if len(out) == 0 {
		w, _, _ := pGetSystemMetrics.Call(0)
		h, _, _ := pGetSystemMetrics.Call(1)
		out = append(out, monitor{R: RECT{0, 0, int32(w), int32(h)}, Primary: true})
	}
	return out
}

// top edges of visible windows (z-order aware), split per monitor, in monitor-local pixels
func windowLedges(mons []monitor) ([][][3]int32, [][][3]int32) {
	type rect = RECT
	var occ []rect
	res := make([][][3]int32, len(mons))
	bots := make([][][3]int32, len(mons))
	// visible stretches of a horizontal edge at height y, given windows above it in z-order
	visible := func(r rect, y int32, above, below int32) [][2]int32 {
		ivs := [][2]int32{{r.Left, r.Right}}
		for _, o := range occ {
			if o.Top <= y+below && o.Bottom >= y-above {
				var next [][2]int32
				for _, iv := range ivs {
					if o.Right <= iv[0] || o.Left >= iv[1] {
						next = append(next, iv)
						continue
					}
					if o.Left > iv[0] {
						next = append(next, [2]int32{iv[0], o.Left - 3})
					}
					if o.Right < iv[1] {
						next = append(next, [2]int32{o.Right + 3, iv[1]})
					}
				}
				ivs = next
			}
		}
		return ivs
	}
	addTo := func(dst [][][3]int32, ivs [][2]int32, y int32, minLocalY int32, maxFromBottom int32) {
		for mi, m := range mons {
			if y < m.R.Top || y >= m.R.Bottom {
				continue
			}
			for _, iv := range ivs {
				a, b := iv[0], iv[1]
				if a < m.R.Left {
					a = m.R.Left
				}
				if b > m.R.Right {
					b = m.R.Right
				}
				if b-a < 60 {
					continue
				}
				ly := y - m.R.Top
				if ly < minLocalY || (m.R.Bottom-m.R.Top)-ly < maxFromBottom {
					continue
				}
				dst[mi] = append(dst[mi], [3]int32{a - m.R.Left, b - m.R.Left, ly})
			}
		}
	}
	skip := map[string]bool{"Progman": true, "WorkerW": true, "Shell_TrayWnd": true, "Shell_SecondaryTrayWnd": true,
		"SnowDaySaverWnd": true, "SnowDayConfigWnd": true, "SnowDayTrayWnd": true, "Windows.UI.Core.CoreWindow": true,
		"NotifyIconOverflowWindow": true, "TopLevelWindowForOverflowXamlIsland": true, "XamlExplorerHostIslandWindow": true}
	ledgeFn = func(h uintptr) uintptr {
		vis, _, _ := pIsWindowVisible.Call(h)
		if vis == 0 {
			return 1
		}
		if ic, _, _ := pIsIconic.Call(h); ic != 0 {
			return 1
		}
		var cloaked uint32
		pDwmGetWindowAttribute.Call(h, DWMWA_CLOAKED, uintptr(unsafe.Pointer(&cloaked)), 4)
		if cloaked != 0 {
			return 1
		}
		var cls [128]uint16
		pGetClassNameW.Call(h, uintptr(unsafe.Pointer(&cls[0])), 128)
		cn := windows.UTF16ToString(cls[:])
		if skip[cn] {
			return 1
		}
		var r rect
		if hr, _, _ := pDwmGetWindowAttribute.Call(h, DWMWA_EXTENDED_FRAME_BOUNDS, uintptr(unsafe.Pointer(&r)), unsafe.Sizeof(r)); hr != 0 {
			pGetWindowRect.Call(h, uintptr(unsafe.Pointer(&r)))
		}
		w, hh := r.Right-r.Left, r.Bottom-r.Top
		if w < 100 || hh < 50 {
			return 1
		}
		ex, _, _ := pGetWindowLongPtrW.Call(h, uintptr(^uintptr(19))) // GWL_EXSTYLE (-20)
		tl, _, _ := pGetWindowTextLengthW.Call(h)
		if ex&WS_EX_TOOLWINDOW != 0 || tl == 0 {
			occ = append(occ, r) // still hides windows below it
			return 1
		}
		addTo(res, visible(r, r.Top, 18, 2), r.Top, 40, 0)
		addTo(bots, visible(r, r.Bottom, 2, 40), r.Bottom, 0, 60)
		occ = append(occ, r)
		return 1
	}
	pEnumWindows.Call(ledgeCallback, 0)
	return res, bots
}

// ---------- snapshot (fallback look) ----------
func captureMonitor(m monitor, path string) (uintptr, uintptr, error) {
	w, h := m.R.Right-m.R.Left, m.R.Bottom-m.R.Top
	sdc, _, _ := pGetDC.Call(0)
	defer pReleaseDC.Call(0, sdc)
	mdc, _, _ := pCreateCompatibleDC.Call(sdc)
	bm, _, _ := pCreateCompatibleBitmap.Call(sdc, uintptr(w), uintptr(h))
	pSelectObject.Call(mdc, bm)
	pBitBlt.Call(mdc, 0, 0, uintptr(w), uintptr(h), sdc, uintptr(m.R.Left), uintptr(m.R.Top), SRCCOPY|CAPTUREBLT)
	// write a 24-bit BMP for the page to draw
	bi := BITMAPINFOHEADER{BiSize: 40, BiWidth: w, BiHeight: -h, BiPlanes: 1, BiBitCount: 32}
	pix := make([]byte, int(w)*int(h)*4)
	pGetDIBits.Call(mdc, bm, 0, uintptr(h), uintptr(unsafe.Pointer(&pix[0])), uintptr(unsafe.Pointer(&bi)), 0)
	stride := (int(w)*3 + 3) &^ 3
	size := 54 + stride*int(h)
	buf := make([]byte, size)
	buf[0], buf[1] = 'B', 'M'
	binary.LittleEndian.PutUint32(buf[2:], uint32(size))
	binary.LittleEndian.PutUint32(buf[10:], 54)
	binary.LittleEndian.PutUint32(buf[14:], 40)
	binary.LittleEndian.PutUint32(buf[18:], uint32(w))
	binary.LittleEndian.PutUint32(buf[22:], uint32(-h))
	binary.LittleEndian.PutUint16(buf[26:], 1)
	binary.LittleEndian.PutUint16(buf[28:], 24)
	for y := 0; y < int(h); y++ {
		src := pix[y*int(w)*4:]
		dst := buf[54+y*stride:]
		for x := 0; x < int(w); x++ {
			dst[x*3], dst[x*3+1], dst[x*3+2] = src[x*4], src[x*4+1], src[x*4+2]
		}
	}
	err := os.WriteFile(path, buf, 0o644)
	return mdc, bm, err
}

// ---------- saver lifecycle ----------
func sortedMonitors() []monitor {
	mons := monitors()
	// primary first, then left to right
	sort.SliceStable(mons, func(i, j int) bool {
		if mons[i].Primary != mons[j].Primary {
			return mons[i].Primary
		}
		return mons[i].R.Left < mons[j].R.Left
	})
	return mons
}

func monKey(m monitor) string {
	return fmt.Sprintf("%d,%d,%d,%d", m.R.Left, m.R.Top, m.R.Right, m.R.Bottom)
}

func buildScreens(use []monitor) []screenCfg {
	ledges, bottoms := windowLedges(use)
	screens := make([]screenCfg, len(use))
	for i, m := range use {
		screens[i] = screenCfg{X: m.R.Left, Y: m.R.Top, W: m.R.Right - m.R.Left, H: m.R.Bottom - m.R.Top, Ledges: ledges[i], Bottoms: bottoms[i], Primary: m.Primary}
		if screens[i].Ledges == nil {
			screens[i].Ledges = [][3]int32{}
		}
		if screens[i].Bottoms == nil {
			screens[i].Bottoms = [][3]int32{}
		}
	}
	return screens
}

func activeSettings() Settings {
	if saver.opts.Settings != nil {
		return *saver.opts.Settings
	}
	return app.settings
}

func saverConfig(s Settings, o saverOpts, bgURL string, screens []screenCfg, me int, layout string, seed uint32, start int64) map[string]any {
	cfg := map[string]any{
		"kind": "saver", "look": s.Look, "bg": bgURL, "screens": screens, "me": me,
		"layout": layout, "seed": seed, "start": start, "fast": o.Fast, "force": nil,
		"settings": map[string]any{
			"buildMin": s.BuildMin, "intensity": s.Intensity,
			"scenes": s.Scenes, "dim": s.Dim, "startle": s.Startle,
		},
	}
	if o.Force != "" {
		cfg["force"] = o.Force
	}
	if o.Studio {
		cfg["studio"], cfg["skipBuild"], cfg["speed"] = true, o.SkipBuild, o.Speed
	}
	return cfg
}

// one topmost window + WebView2 per screen
func openSaverWindow(m monitor, idx int, s Settings, makeCfg func(bgURL string) map[string]any, noActivate bool) *saverWin {
	sw := &saverWin{mon: m, index: idx, started: time.Now()}
	if s.Look == "snapshot" {
		cacheDir := filepath.Join(localDir(), "cache")
		os.MkdirAll(cacheDir, 0o755)
		p := filepath.Join(cacheDir, fmt.Sprintf("screen-%d-%d.bmp", m.R.Left, m.R.Top))
		dc, bm, err := captureMonitor(m, p)
		sw.snapDC, sw.snapBM = dc, bm
		if err == nil {
			sw.bgURL = fileURL(p) + fmt.Sprintf("?t=%d", time.Now().UnixNano())
		}
	}
	js, _ := json.Marshal(makeCfg(sw.bgURL))
	w, h := m.R.Right-m.R.Left, m.R.Bottom-m.R.Top
	ex := uintptr(WS_EX_TOPMOST | WS_EX_TOOLWINDOW)
	if noActivate {
		ex |= 0x08000000 // WS_EX_NOACTIVATE: keep working on your other screen
	}
	sw.hwnd, _, _ = pCreateWindowExW.Call(ex,
		uintptr(unsafe.Pointer(u16("SnowDaySaverWnd"))), uintptr(unsafe.Pointer(u16("Snow Day"))),
		WS_POPUP|WS_CLIPCHILDREN, uintptr(m.R.Left), uintptr(m.R.Top), uintptr(w), uintptr(h), 0, 0, hInstance(), 0)
	saverByHwnd[sw.hwnd] = sw
	if s.Look != "snapshot" {
		// let the desktop show through wherever the page is transparent
		rgn, _, _ := pCreateRectRgn.Call(0, 0, ^uintptr(0), ^uintptr(0))
		bb := DWM_BLURBEHIND{DwFlags: DWM_BB_ENABLE | DWM_BB_BLURREGION, FEnable: 1, HRgnBlur: rgn}
		pDwmEnableBlurBehindWindow.Call(sw.hwnd, uintptr(unsafe.Pointer(&bb)))
		pDeleteObject.Call(rgn)
	}
	pShowWindow.Call(sw.hwnd, SW_SHOWNOACTIVATE)
	pSetWindowPos.Call(sw.hwnd, HWND_TOPMOST, uintptr(m.R.Left), uintptr(m.R.Top), uintptr(w), uintptr(h), SWP_NOACTIVATE|SWP_SHOWWINDOW)
	pUpdateWindow.Call(sw.hwnd)

	web := edge.NewChromium()
	web.DataPath = app.dataDir
	sw.web = web
	web.MessageCallback = func(msg string) { onSaverMessage(sw, msg) }
	web.AcceleratorKeyCallback = func(uint) bool { return true }
	saver.wins = append(saver.wins, sw)
	if !web.Embed(sw.hwnd) {
		log.Printf("saver: webview embed failed on a screen")
		return sw
	}
	if !saver.running || !web.Ready() {
		return sw
	}
	if c2 := web.GetController().GetICoreWebView2Controller2(); c2 != nil {
		_ = c2.PutDefaultBackgroundColor(edge.COREWEBVIEW2_COLOR{A: 0, R: 0, G: 0, B: 0})
	}
	if st, err := web.GetSettings(); err == nil {
		_ = st.PutAreDefaultContextMenusEnabled(false)
		_ = st.PutAreDevToolsEnabled(false)
		_ = st.PutIsStatusBarEnabled(false)
		_ = st.PutIsZoomControlEnabled(false)
	}
	web.Resize()
	web.Init("window.__SNOW=" + string(js) + ";")
	web.Navigate(fileURL(filepath.Join(app.webDir, "saver.html")))
	return sw
}

func resetSaverState(o saverOpts) {
	saver.prevFG, _, _ = pGetForegroundWindow.Call()
	saver.running = true
	saver.waking = false
	saver.armed = false
	saver.opts = o
	saver.started = time.Now()
	saver.perMon, saver.merged, saver.mergePending, saver.merging, saver.stormWin = false, false, false, false, nil
}

func tidyIfStopped() bool {
	if saver.running {
		return false
	}
	for _, w := range saver.wins {
		if w.web != nil {
			w.web.Close()
		}
		delete(saverByHwnd, w.hwnd)
		pDestroyWindow.Call(w.hwnd)
	}
	saver.wins = nil
	return true
}

// all screens at once (the classic screensaver)
func startSaver(o saverOpts) {
	if saver.running || app.busy {
		return
	}
	app.busy = true
	defer func() { app.busy = false }()
	s := app.settings
	if o.Settings != nil {
		s = *o.Settings
	}
	mons := sortedMonitors()
	use := mons
	if s.Layout == "main" {
		use = mons[:1]
	}
	screens := buildScreens(use)
	resetSaverState(o)
	saver.merged = true
	seed := uint32(time.Now().UnixNano()&0x7fffffff) | 1
	if o.Seed != 0 {
		seed = o.Seed
	}
	start := time.Now().Add(1500 * time.Millisecond).UnixMilli()
	for i, m := range use {
		if !saver.running {
			break
		}
		idx := i
		openSaverWindow(m, i, s, func(bg string) map[string]any { return saverConfig(s, o, bg, screens, idx, s.Layout, seed, start) }, false)
	}
	if tidyIfStopped() {
		return
	}
	if len(saver.wins) > 0 && saver.wins[0].web != nil {
		forceForeground(saver.wins[0].hwnd)
		saver.wins[0].web.Focus()
	}
	saver.baseTick = lastInputTick()
	saver.baseCursor = cursorPos()
	pSetTimer.Call(app.hwnd, timerSaver, 100, 0)
	holdAwake()
	log.Printf("saver started on %d screen(s), look=%s layout=%s", len(use), s.Look, s.Layout)
}

// ---------- "only the screen I'm not using" ----------
var act = struct {
	last       map[string]time.Time
	prevTick   uint32
	prevCursor POINT
	mons       []monitor
	monsAt     time.Time
	on         bool
}{last: map[string]time.Time{}}

func monitorAt(mons []monitor, p POINT) int {
	for i, m := range mons {
		if p.X >= m.R.Left && p.X < m.R.Right && p.Y >= m.R.Top && p.Y < m.R.Bottom {
			return i
		}
	}
	return 0
}

func monitorOfWindow(mons []monitor, hwnd uintptr) int {
	var r RECT
	if hwnd == 0 {
		return -1
	}
	pGetWindowRect.Call(hwnd, uintptr(unsafe.Pointer(&r)))
	return monitorAt(mons, POINT{(r.Left + r.Right) / 2, (r.Top + r.Bottom) / 2})
}

func winOn(m monitor) *saverWin {
	k := monKey(m)
	for _, w := range saver.wins {
		if monKey(w.mon) == k {
			return w
		}
	}
	return nil
}

func perMonitorActive() bool {
	if !app.settings.PerMonitor {
		return false
	}
	if time.Since(act.monsAt) > 2*time.Second || act.mons == nil {
		act.mons = sortedMonitors()
		act.monsAt = time.Now()
	}
	return len(act.mons) > 1
}

// runs every 250 ms: who is using which screen, and which screens have gone quiet
func monitorTick() {
	if !perMonitorActive() {
		act.on = false
		return
	}
	if !act.on {
		act.on = true
		act.last = map[string]time.Time{} // start counting from now
	}
	mons := act.mons
	now := time.Now()
	for _, m := range mons {
		if _, ok := act.last[monKey(m)]; !ok {
			act.last[monKey(m)] = now
		}
	}
	t, c := lastInputTick(), cursorPos()
	if t != act.prevTick {
		mi := -1
		if c != act.prevCursor {
			mi = monitorAt(mons, c)
		} else {
			fg, _, _ := pGetForegroundWindow.Call()
			mi = monitorOfWindow(mons, fg)
		}
		if mi >= 0 && winOn(mons[mi]) == nil {
			act.last[monKey(mons[mi])] = now
		}
		act.prevTick, act.prevCursor = t, c
	}
	if saver.running && !saver.perMon {
		return // the classic all-screens saver is up
	}
	s := app.settings
	after, _ := startAfter()
	allIdle := time.Duration(idleMillis())*time.Millisecond >= after // nobody's here: beat the screen-off
	if app.busy {
		return
	}
	if why := blockedReason(); why != "" {
		if allIdle && !saver.running {
			diagHeld(why)
		}
		return
	}
	limit := time.Duration(s.IdleMin * float64(time.Minute))
	var due []monitor
	for _, m := range mons {
		if winOn(m) != nil || (!allIdle && now.Sub(act.last[monKey(m)]) < limit) {
			continue
		}
		if s.SkipBusy {
			if why := screenBusyReason(mons, m); why != "" {
				if allIdle && !saver.running {
					diagHeld(why)
				}
				continue
			}
		}
		due = append(due, m)
	}
	if len(due) == len(mons) && !saver.running {
		// nobody's using any screen: the normal all-screens saver
		diag.autoStart++
		startSaver(saverOpts{})
		return
	}
	if len(due) > 0 {
		diag.autoStart++
		startMonitorSaver(due[0])
	}
	// every screen is snowing: join them into one world at the next blizzard
	if saver.perMon && !saver.merged && !saver.mergePending && !saver.merging && len(saver.wins) >= len(mons) {
		saver.mergePending = true
		for _, w := range saver.wins {
			if w.web != nil && w.web.Ready() {
				w.web.Eval("window.SD && (SD.mergePending = true)")
			}
		}
		log.Printf("all screens snowing; will join them at the next blizzard")
	}
}

// a full-screen app or a playing video on this screen ("" = free)
func screenBusyReason(mons []monitor, m monitor) string {
	if displayHeldAwake() {
		return "an app is keeping the screen on" // a video somewhere: can't tell which screen it's on, so hold off
	}
	var st int32
	if r, _, _ := pSHQueryUserNotificationState.Call(uintptr(unsafe.Pointer(&st))); r == 0 && (st == 3 || st == 4) {
		return "a game or presentation is full screen"
	}
	fg, _, _ := pGetForegroundWindow.Call()
	if fg == 0 {
		return ""
	}
	if i := monitorOfWindow(mons, fg); i >= 0 && monKey(mons[i]) == monKey(m) && isFullscreen(fg, m) {
		return "a full-screen app is open"
	}
	return ""
}

func startMonitorSaver(m monitor) {
	if app.busy {
		return
	}
	app.busy = true
	defer func() { app.busy = false }()
	s := app.settings
	if !saver.running {
		resetSaverState(saverOpts{})
		saver.perMon = true
		saver.baseTick = lastInputTick()
		saver.baseCursor = cursorPos()
		pSetTimer.Call(app.hwnd, timerSaver, 100, 0)
		holdAwake()
	}
	screens := buildScreens([]monitor{m})
	seed := uint32(time.Now().UnixNano()&0x7fffffff) | 1
	start := time.Now().Add(1200 * time.Millisecond).UnixMilli()
	fg, _, _ := pGetForegroundWindow.Call()
	sw := openSaverWindow(m, len(saver.wins), s, func(bg string) map[string]any {
		return saverConfig(s, saverOpts{}, bg, screens, 0, "mirror", seed, start)
	}, true)
	sw.prevFG = fg
	tidyIfStopped()
	log.Printf("snowing on one screen (%s); %d screen(s) now", monKey(m), len(saver.wins))
}

func closeWin(sw *saverWin) {
	for i, w := range saver.wins {
		if w == sw {
			saver.wins = append(saver.wins[:i], saver.wins[i+1:]...)
			break
		}
	}
	if sw.web != nil {
		sw.web.Close()
	}
	delete(saverByHwnd, sw.hwnd)
	pDestroyWindow.Call(sw.hwnd)
	if sw.snapBM != 0 {
		pDeleteObject.Call(sw.snapBM)
	}
	if sw.snapDC != 0 {
		pDeleteDC.Call(sw.snapDC)
	}
	act.last[monKey(sw.mon)] = time.Now()
	if saver.mergePending || saver.merging {
		// someone came back before the screens joined up: carry on separately
		saver.mergePending, saver.merging, saver.stormWin = false, false, nil
		pKillTimer.Call(app.hwnd, timerMerge)
		for _, w := range saver.wins {
			if w.web != nil && w.web.Ready() {
				w.web.Eval("window.SD && (SD.mergePending = false)")
			}
		}
	}
	if len(saver.wins) == 0 {
		saver.running = false
		pKillTimer.Call(app.hwnd, timerSaver)
		releaseAwake()
		log.Printf("all screens clear")
	}
}

func wakeWin(sw *saverWin) {
	if sw.waking {
		return
	}
	if !activeSettings().Startle {
		closeWin(sw)
		return
	}
	sw.waking = true
	sw.wakeAt = time.Now()
	if sw.web != nil && sw.web.Ready() {
		sw.web.Eval("window.SD && SD.wake && SD.wake()")
	}
}

func fadeOthers(except *saverWin, sec float64) {
	for _, w := range saver.wins {
		if w != except && w.web != nil && w.web.Ready() {
			w.web.Eval(fmt.Sprintf("window.SD && SD.fadeWhite && SD.fadeWhite(%.2f)", sec))
		}
	}
}

// one screen's blizzard is rolling in: bring the same blizzard to the other screens
func onStorm(sw *saverWin) {
	if !saver.mergePending || saver.merging || saver.stormWin != nil {
		return
	}
	saver.stormWin = sw
	fadeOthers(sw, 6.5)
}

// the blizzard has covered everything: turn every window into one shared world
func onStormPeak(sw *saverWin) {
	if !saver.mergePending || saver.merging {
		return
	}
	saver.merging = true
	delay := uintptr(350)
	if saver.stormWin == nil {
		fadeOthers(sw, 1.2)
		delay = 1500
	}
	pSetTimer.Call(app.hwnd, timerMerge, delay, 0)
}

func doMerge() {
	pKillTimer.Call(app.hwnd, timerMerge)
	if !saver.running || !saver.perMon || saver.merged || !saver.merging {
		return
	}
	saver.mergePending, saver.merging, saver.stormWin = false, false, nil
	s := app.settings
	layout := s.Layout
	if layout == "main" {
		layout = "span"
	}
	var use []monitor
	for _, m := range sortedMonitors() {
		if winOn(m) != nil {
			use = append(use, m)
		}
	}
	screens := buildScreens(use)
	seed := uint32(time.Now().UnixNano()&0x7fffffff) | 1
	start := time.Now().Add(700 * time.Millisecond).UnixMilli()
	recent := []string{}
	for _, w := range saver.wins {
		if w.scene != "" {
			recent = append(recent, w.scene)
		}
	}
	for i, m := range use {
		w := winOn(m)
		cfg := saverConfig(s, saverOpts{}, w.bgURL, screens, i, layout, seed, start)
		cfg["resume"] = true
		cfg["preferPrimary"] = true
		cfg["recent"] = recent
		js, _ := json.Marshal(cfg)
		w.index = i
		if w.web != nil && w.web.Ready() {
			w.web.Eval("window.SD && SD.reboot && SD.reboot(" + string(js) + ")")
		}
	}
	saver.merged = true
	log.Printf("joined %d screens into one world", len(use))
}

func saverTick() {
	if !saver.running {
		pKillTimer.Call(app.hwnd, timerSaver)
		return
	}
	if saver.perMon && !saver.merged {
		perMonSaverTick()
		return
	}
	if saver.opts.Studio {
		if !inputDesktopIsDefault() {
			stopSaver()
		}
		return // the mouse and keyboard drive the controls instead
	}
	since := time.Since(saver.started)
	if !saver.armed {
		if since > 1200*time.Millisecond {
			saver.armed = true
			saver.baseTick = lastInputTick()
			saver.baseCursor = cursorPos()
		}
		return
	}
	if saver.waking {
		if time.Since(saver.wakeAt) > 2600*time.Millisecond {
			stopSaver()
			return
		}
		if t := lastInputTick(); t != saver.baseTick {
			saver.baseTick = t
			c := cursorPos()
			if c == saver.baseCursor { // a key or click while waking: get out of the way
				stopSaver()
			}
			saver.baseCursor = c
		}
		return
	}
	if !inputDesktopIsDefault() {
		stopSaver()
		return
	}
	if t := lastInputTick(); t != saver.baseTick {
		c := cursorPos()
		dx, dy := c.X-saver.baseCursor.X, c.Y-saver.baseCursor.Y
		moved := dx*dx+dy*dy > 12*12
		if c == saver.baseCursor {
			stopSaver() // keyboard, click or wheel
			return
		}
		if moved {
			beginWake()
			return
		}
		saver.baseTick = t // tiny jitter: ignore
	}
}

// separate screens: only the screen you come back to wakes up
func perMonSaverTick() {
	fg, _, _ := pGetForegroundWindow.Call()
	fgRoot, _, _ := pGetAncestor.Call(fg, 2) // GA_ROOT
	for _, w := range append([]*saverWin(nil), saver.wins...) {
		if w.waking && time.Since(w.wakeAt) > 2600*time.Millisecond {
			closeWin(w)
			continue
		}
		// never take the keyboard away from the screen you're working on
		if fgRoot == w.hwnd && w.prevFG != 0 && !w.waking {
			pSetForegroundWindow.Call(w.prevFG)
		}
	}
	if !saver.running {
		return
	}
	if !inputDesktopIsDefault() {
		stopSaver()
		return
	}
	mons := act.mons
	if mons == nil {
		mons = sortedMonitors()
	}
	allCovered := len(saver.wins) >= len(mons)
	t := lastInputTick()
	if t == saver.baseTick {
		return
	}
	c := cursorPos()
	dx, dy := c.X-saver.baseCursor.X, c.Y-saver.baseCursor.Y
	moved := dx*dx+dy*dy > 12*12
	saver.baseTick = t
	if c == saver.baseCursor {
		// keys/clicks: only matter once every screen is snowing (you've come back)
		if allCovered {
			stopSaver()
		}
		return
	}
	if !moved {
		return
	}
	saver.baseCursor = c
	w := winOn(mons[monitorAt(mons, c)])
	if w == nil || time.Since(w.started) < 1200*time.Millisecond {
		return
	}
	if allCovered {
		for _, x := range saver.wins {
			wakeWin(x)
		}
	} else {
		wakeWin(w)
	}
}

func beginWake() {
	if saver.waking {
		return
	}
	if !activeSettings().Startle {
		stopSaver()
		return
	}
	saver.waking = true
	saver.wakeAt = time.Now()
	saver.baseTick = lastInputTick()
	saver.baseCursor = cursorPos()
	for _, w := range saver.wins {
		if w.web != nil && w.web.Ready() {
			w.web.Eval("window.SD && SD.wake && SD.wake()")
		}
	}
}

func onSaverMessage(sw *saverWin, msg string) {
	if saver.opts.Studio {
		switch {
		case strings.HasPrefix(msg, "speed:"):
			if sp, err := strconv.ParseFloat(msg[6:], 64); err == nil && sp >= 0 && sp <= 64 {
				// every screen changes speed at the same moment, so they stay in step
				at := time.Now().Add(150 * time.Millisecond).UnixMilli()
				for _, w := range saver.wins {
					if w.web != nil && w.web.Ready() {
						w.web.Eval(fmt.Sprintf("window.SD && SD.setSpeedAt && SD.setSpeedAt(%d, %g)", at, sp))
					}
				}
			}
		case msg == "close":
			pPostMessageW.Call(app.hwnd, WM_STOPSAVER, 0, 0)
		case strings.HasPrefix(msg, "scene:"):
			log.Printf("full-screen preview: %s", msg)
		}
		return
	}
	separate := saver.perMon && !saver.merged
	switch {
	case msg == "move":
		if separate {
			if time.Since(sw.started) > 1200*time.Millisecond {
				wakeWin(sw)
			}
		} else if saver.armed {
			beginWake()
		}
	case msg == "quit":
		if separate {
			if time.Since(sw.started) > 1200*time.Millisecond {
				pPostMessageW.Call(app.hwnd, WM_CLOSEWIN, sw.hwnd, 0)
			}
		} else if saver.armed {
			pPostMessageW.Call(app.hwnd, WM_STOPSAVER, 0, 0)
		}
	case msg == "done":
		if separate {
			pPostMessageW.Call(app.hwnd, WM_CLOSEWIN, sw.hwnd, 0)
		} else {
			pPostMessageW.Call(app.hwnd, WM_STOPSAVER, 0, 0)
		}
	case msg == "ready":
		if saver.mergePending && sw.web != nil {
			sw.web.Eval("window.SD && (SD.mergePending = true)")
		}
	case msg == "storm":
		onStorm(sw)
	case msg == "stormpeak":
		onFirstShowDone()
		onStormPeak(sw)
	case strings.HasPrefix(msg, "scene:"):
		sw.scene = strings.TrimPrefix(msg, "scene:")
		log.Printf("screen %d: %s", sw.index, msg)
	}
}

func closeWinByHwnd(h uintptr) {
	if sw := saverByHwnd[h]; sw != nil {
		closeWin(sw)
	}
}

func stopSaver() {
	if !saver.running {
		return
	}
	saver.running = false
	pKillTimer.Call(app.hwnd, timerSaver)
	pKillTimer.Call(app.hwnd, timerMerge)
	releaseAwake()
	wins := saver.wins
	saver.wins = nil
	for _, w := range wins {
		if w.web != nil {
			w.web.Close()
		}
		delete(saverByHwnd, w.hwnd)
		pDestroyWindow.Call(w.hwnd)
		if w.snapBM != 0 {
			pDeleteObject.Call(w.snapBM)
		}
		if w.snapDC != 0 {
			pDeleteDC.Call(w.snapDC)
		}
		act.last[monKey(w.mon)] = time.Now()
	}
	saver.mergePending, saver.merging, saver.stormWin = false, false, nil
	if saver.prevFG != 0 && !saver.perMon {
		pSetForegroundWindow.Call(saver.prevFG)
	}
	log.Printf("saver stopped after %s", time.Since(saver.started).Round(time.Second))
}

func saverProc(hwnd, msg, wp, lp uintptr) uintptr {
	sw := saverByHwnd[hwnd]
	switch uint32(msg) {
	case WM_SIZE:
		if sw != nil && sw.web != nil {
			sw.web.Resize()
		}
		return 0
	case WM_MOVE:
		if sw != nil && sw.web != nil {
			_ = sw.web.NotifyParentWindowPositionChanged()
		}
	case WM_SETCURSOR:
		pSetCursor.Call(0)
		return 1
	case WM_CLOSE:
		stopSaver()
		return 0
	case WM_PAINT:
		if sw != nil && sw.snapDC != 0 {
			var ps PAINTSTRUCT
			hdc, _, _ := pBeginPaint.Call(hwnd, uintptr(unsafe.Pointer(&ps)))
			w, h := sw.mon.R.Right-sw.mon.R.Left, sw.mon.R.Bottom-sw.mon.R.Top
			pBitBlt.Call(hdc, 0, 0, uintptr(w), uintptr(h), sw.snapDC, 0, 0, SRCCOPY)
			pEndPaint.Call(hwnd, uintptr(unsafe.Pointer(&ps)))
			return 0
		}
	case WM_ERASEBKGND:
		if sw != nil && sw.snapDC != 0 {
			return 1
		}
	}
	return defProc(hwnd, msg, wp, lp)
}
