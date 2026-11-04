//go:build windows

// Snow Day — a wintery screensaver that lives in the tray.
package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
)

//go:embed web
var webFS embed.FS

//go:embed icons/tray16.png icons/tray24.png icons/tray32.png icons/tray48.png
var iconFS embed.FS

// appVersion is the release version (CI sets it from the git tag with -ldflags "-X main.appVersion=...")
var appVersion = "1.5.1"

// buildID is stamped at build time (-ldflags "-X main.buildID=...") so a newer exe can replace a running older one.
var buildID = "dev"

const (
	WM_TRAY       = WM_APP + 1
	WM_SHOWCONFIG = WM_APP + 2
	WM_HIDECONFIG = WM_APP + 3
	WM_QUITAPP    = WM_APP + 4
	WM_STOPSAVER  = WM_APP + 5
	WM_HELLO      = WM_APP + 6 // wParam = build hash; returns 1 if the running copy is the same build
	WM_CLOSEWIN   = WM_APP + 7 // wParam = saver window to close (one screen)
	timerIdle     = 1
	timerSaver    = 2
	timerMon      = 4
	timerMerge    = 5
	idStart       = 101
	idSettings    = 102
	idSnooze      = 103
	idPause       = 104
	idExit        = 109
)

var (
	app struct {
		hwnd        uintptr
		settings    Settings
		webDir      string
		dataDir     string
		paused      bool
		snoozeUntil time.Time
		icon        uintptr
		bigIcon     uintptr
		taskbarMsg  uint32
		busy        bool
		balloonDone bool
	}
)

func init() { runtime.LockOSThread() }

func main() {
	logf, err := os.OpenFile(filepath.Join(localDir(), "log.txt"), os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
	if err == nil {
		log.SetOutput(logf)
	}
	log.Printf("Snow Day %s starting, args=%v", appVersion, os.Args)
	trayOnly, updated := false, false
	for _, a := range os.Args[1:] {
		if strings.EqualFold(a, "--tray") || strings.EqualFold(a, "/tray") {
			trayOnly = true
		}
		if strings.EqualFold(a, "--updated") {
			updated = true
		}
	}
	// per-monitor DPI awareness (the manifest also asks for it)
	if pSetProcessDpiAwarenessContext.Find() == nil {
		pSetProcessDpiAwarenessContext.Call(^uintptr(3)) // DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2 (-4)
	}
	// single instance: the same build just reopens its settings; a different build takes over
	_, _, mErr := pCreateMutexW.Call(0, 0, uintptr(unsafe.Pointer(u16("Local\\SnowDayPenguinCrew"))))
	if mErr == windows.ERROR_ALREADY_EXISTS {
		h, _, _ := pFindWindowW.Call(uintptr(unsafe.Pointer(u16("SnowDayTrayWnd"))), 0)
		if h != 0 {
			var res uintptr
			r, _, _ := pSendMessageTimeoutW.Call(h, WM_HELLO, uintptr(buildHash()), 0, 0x0002, 2000, uintptr(unsafe.Pointer(&res))) // SMTO_ABORTIFHUNG
			if r != 0 && res == 1 {
				pPostMessageW.Call(h, WM_SHOWCONFIG, 0, 0)
				return
			}
			// an older copy is running: ask it to exit, then carry on as the new one
			log.Printf("replacing a running copy from a different build")
			pPostMessageW.Call(h, WM_QUITAPP, 0, 0)
			for i := 0; i < 50; i++ {
				time.Sleep(100 * time.Millisecond)
				if w, _, _ := pFindWindowW.Call(uintptr(unsafe.Pointer(u16("SnowDayTrayWnd"))), 0); w == 0 {
					break
				}
			}
		}
	}
	os.Setenv("WEBVIEW2_DEFAULT_BACKGROUND_COLOR", "0")

	app.settings = loadSettings()
	app.dataDir = filepath.Join(localDir(), "WebView2")
	if err := extractWeb(); err != nil {
		messageBox("Snow Day couldn't unpack its files:\n"+err.Error(), "Snow Day")
		return
	}
	refreshShellIcon()
	app.icon = loadPNGIcon(smallIconSize())
	app.bigIcon = loadPNGIcon(32)

	registerClass("SnowDayTrayWnd", trayProc, 0, app.icon)
	registerSaverClass()
	registerConfigClass()
	registerUpdateClass()
	app.hwnd, _, _ = pCreateWindowExW.Call(0, uintptr(unsafe.Pointer(u16("SnowDayTrayWnd"))), uintptr(unsafe.Pointer(u16("Snow Day"))), 0, 0, 0, 0, 0, 0, 0, hInstance(), 0)
	tm, _, _ := pRegisterWindowMessageW.Call(uintptr(unsafe.Pointer(u16("TaskbarCreated"))))
	app.taskbarMsg = uint32(tm)
	addTrayIcon()
	registerPowerNotifications()
	pSetTimer.Call(app.hwnd, timerIdle, 1000, 0)
	pSetTimer.Call(app.hwnd, timerMon, 250, 0)
	if updated {
		balloon("Snow Day updated", "Now on version "+appVersion+".")
	}
	go afterUpdateCleanup(false)
	if updatesEnabled() {
		pSetTimer.Call(app.hwnd, timerUpdate, 60*1000, 0)
	}

	if !trayOnly {
		openConfig()
	}

	var msg MSG
	for {
		r, _, _ := pGetMessageW.Call(uintptr(unsafe.Pointer(&msg)), 0, 0, 0)
		if int32(r) <= 0 {
			break
		}
		pTranslateMessage.Call(uintptr(unsafe.Pointer(&msg)))
		pDispatchMessageW.Call(uintptr(unsafe.Pointer(&msg)))
	}
	removeTrayIcon()
}

// ---------- assets ----------
func extractWeb() error {
	// a folder per build, so a page from an older build can never be shown. Older builds' folders
	// are tidied a minute later: an older copy that's still closing down may need its pages until then.
	dst := filepath.Join(localDir(), fmt.Sprintf("web-%08x", buildHash()))
	go func() {
		time.Sleep(time.Minute)
		if olds, _ := filepath.Glob(filepath.Join(localDir(), "web-*")); olds != nil {
			for _, o := range olds {
				if o != dst {
					_ = os.RemoveAll(o)
				}
			}
		}
	}()
	err := fs.WalkDir(webFS, "web", func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel := strings.TrimPrefix(p, "web")
		out := filepath.Join(dst, filepath.FromSlash(rel))
		if d.IsDir() {
			return os.MkdirAll(out, 0o755)
		}
		b, err := webFS.ReadFile(p)
		if err != nil {
			return err
		}
		return os.WriteFile(out, b, 0o644)
	})
	app.webDir = dst
	return err
}

// the pages are on disk before a window opens them (if anything removed them, unpack them again),
// so a window can never show a "file not found" page
func ensureWeb() {
	if _, err := os.Stat(filepath.Join(app.webDir, "saver.html")); err != nil {
		log.Printf("web files missing (%v): unpacking again", err)
		if err := extractWeb(); err != nil {
			log.Printf("unpack failed: %v", err)
		}
	}
}

func fileURL(p string) string {
	u := url.URL{Scheme: "file", Path: "/" + filepath.ToSlash(p)}
	return u.String()
}

func smallIconSize() int {
	s, _, _ := pGetSystemMetrics.Call(SM_CXSMICON)
	if s == 0 {
		return 16
	}
	return int(s)
}

func loadPNGIcon(size int) uintptr {
	name := "icons/tray16.png"
	switch {
	case size >= 40:
		name = "icons/tray48.png"
	case size >= 28:
		name = "icons/tray32.png"
	case size >= 20:
		name = "icons/tray24.png"
	}
	b, err := iconFS.ReadFile(name)
	if err != nil || len(b) == 0 {
		return 0
	}
	h, _, _ := pCreateIconFromResourceEx.Call(uintptr(unsafe.Pointer(&b[0])), uintptr(len(b)), 1, 0x00030000, uintptr(size), uintptr(size), 0)
	return h
}

// ---------- tray ----------
func trayData() *NOTIFYICONDATAW {
	nid := &NOTIFYICONDATAW{}
	nid.CbSize = uint32(unsafe.Sizeof(*nid))
	nid.HWnd = app.hwnd
	nid.UID = 1
	return nid
}

func addTrayIcon() {
	nid := trayData()
	nid.UFlags = NIF_MESSAGE | NIF_ICON | NIF_TIP
	nid.UCallbackMessage = WM_TRAY
	nid.HIcon = app.icon
	copyU16(nid.SzTip[:], trayTip())
	pShellNotifyIconW.Call(NIM_ADD, uintptr(unsafe.Pointer(nid)))
}

func updateTrayTip() {
	nid := trayData()
	nid.UFlags = NIF_TIP
	copyU16(nid.SzTip[:], trayTip())
	pShellNotifyIconW.Call(NIM_MODIFY, uintptr(unsafe.Pointer(nid)))
}

func trayTip() string {
	if app.paused {
		return "Snow Day — paused"
	}
	if time.Now().Before(app.snoozeUntil) {
		return "Snow Day — snoozing until " + app.snoozeUntil.Format("15:04")
	}
	if !app.settings.Enabled {
		return "Snow Day — off"
	}
	return powerStatus(power.lastReason)
}

func balloon(title, text string) {
	nid := trayData()
	nid.UFlags = NIF_INFO
	copyU16(nid.SzInfoTitle[:], title)
	copyU16(nid.SzInfo[:], text)
	nid.DwInfoFlags = NIIF_USER | NIIF_LARGE_ICON
	nid.HBalloonIcon = app.bigIcon
	pShellNotifyIconW.Call(NIM_MODIFY, uintptr(unsafe.Pointer(nid)))
}

func removeTrayIcon() {
	nid := trayData()
	pShellNotifyIconW.Call(NIM_DELETE, uintptr(unsafe.Pointer(nid)))
}

func showTrayMenu() {
	m, _, _ := pCreatePopupMenu.Call()
	add := func(id int, text string, flags uintptr) {
		pAppendMenuW.Call(m, MF_STRING|flags, uintptr(id), uintptr(unsafe.Pointer(u16(text))))
	}
	add(idStart, "Let it snow now", 0)
	add(idSettings, "Settings…", 0)
	pAppendMenuW.Call(m, MF_SEPARATOR, 0, 0)
	if time.Now().Before(app.snoozeUntil) {
		add(idSnooze, "Snoozing until "+app.snoozeUntil.Format("15:04")+" (cancel)", MF_CHECKED)
	} else {
		add(idSnooze, "Snooze for 1 hour", 0)
	}
	var pf uintptr
	if app.paused {
		pf = MF_CHECKED
	}
	add(idPause, "Paused", pf)
	pAppendMenuW.Call(m, MF_SEPARATOR, 0, 0)
	if updatesEnabled() {
		if upd.file != "" {
			add(idUpdateNow, "Update to version "+upd.version+"…", 0)
		}
		add(idCheckUpdate, "Check for updates", 0)
	}
	add(idDiag, "Diagnostics…", 0)
	add(idExit, "Exit Snow Day", 0)
	pt := cursorPos()
	pSetForegroundWindow.Call(app.hwnd)
	cmd, _, _ := pTrackPopupMenu.Call(m, TPM_RETURNCMD|TPM_RIGHTBUTTON|TPM_BOTTOMALIGN, uintptr(pt.X), uintptr(pt.Y), 0, app.hwnd, 0)
	pPostMessageW.Call(app.hwnd, WM_NULL, 0, 0)
	pDestroyMenu.Call(m)
	switch cmd {
	case idStart:
		startSaver(saverOpts{})
	case idSettings:
		openConfig()
	case idSnooze:
		if time.Now().Before(app.snoozeUntil) {
			app.snoozeUntil = time.Time{}
		} else {
			app.snoozeUntil = time.Now().Add(time.Hour)
		}
		updateTrayTip()
	case idPause:
		app.paused = !app.paused
		updateTrayTip()
	case idCheckUpdate:
		startUpdateCheck(true)
	case idUpdateNow:
		offerUpdate(true)
	case idDiag:
		showDiagnostics()
	case idExit:
		quitApp()
	}
}

func quitApp() {
	stopSaver()
	closeConfig()
	removeTrayIcon()
	pPostQuitMessage.Call(0)
}

func trayProc(hwnd, msg, wp, lp uintptr) uintptr {
	switch uint32(msg) {
	case WM_TRAY:
		switch uint32(lp & 0xFFFF) {
		case WM_LBUTTONUP, WM_LBUTTONDBLCLK:
			openConfig()
		case WM_RBUTTONUP, WM_CONTEXTMENU:
			showTrayMenu()
		}
		return 0
	case WM_SHOWCONFIG:
		openConfig()
		return 0
	case WM_HELLO:
		if uint32(wp) == buildHash() {
			return 1
		}
		return 0
	case WM_HIDECONFIG:
		closeConfig()
		return 0
	case WM_QUITAPP:
		quitApp()
		return 0
	case WM_STOPSAVER:
		stopSaver()
		return 0
	case WM_CLOSEWIN:
		closeWinByHwnd(wp)
		return 0
	case WM_UPDATEREADY:
		asked := upd.manual
		upd.manual = false
		if upd.critical {
			balloon("Snow Day update", "Installing an important fix (version "+upd.version+")…")
			installUpdate(asked)
		} else {
			offerUpdate(asked)
		}
		return 0
	case WM_UPDATEINFO:
		balloon("Snow Day", upd.lastMsg)
		return 0
	case WM_UPDATECHOICE:
		onUpdateChoice(wp)
		return 0
	case WM_TIMER:
		switch wp {
		case timerIdle:
			checkIdle()
		case timerSaver:
			saverTick()
		case timerPreview:
			runPreview()
		case timerMon:
			monitorTick()
		case timerMerge:
			doMerge()
		case timerUpdate:
			updateTick()
		case timerPower:
			screenOffNow()
		}
		return 0
	case WM_POWERBROADCAST:
		onPowerBroadcast(wp, lp)
		return 1
	case WM_DESTROY:
		pPostQuitMessage.Call(0)
		return 0
	}
	if app.taskbarMsg != 0 && uint32(msg) == app.taskbarMsg {
		addTrayIcon()
		return 0
	}
	return defProc(hwnd, msg, wp, lp)
}

// ---------- idle watching ----------
func checkIdle() {
	diagTick()
	powerTick()
	if displayHeldAwake() {
		listenTick()
	}
	if saver.running || app.busy || perMonitorActive() {
		return
	}
	after, _ := startAfter()
	if time.Duration(idleMillis())*time.Millisecond < after {
		setStatus("")
		return
	}
	reason := blockedReason()
	if reason == "" && app.settings.SkipBusy {
		reason = busyReason()
	}
	setStatus(reason)
	diagHeld(reason)
	if reason == "" {
		diag.autoStart++
		startSaver(saverOpts{})
	}
}

// a video player (or anything) asking Windows to keep the display on
func displayHeldAwake() bool {
	if power.holding {
		return power.heldBefore // our own request would hide anyone else's
	}
	if pCallNtPowerInformation.Find() != nil {
		return false
	}
	var state uint32
	r, _, _ := pCallNtPowerInformation.Call(16, 0, 0, uintptr(unsafe.Pointer(&state)), 4) // SystemExecutionState
	if r != 0 {
		return false
	}
	return state&0x2 != 0 // ES_DISPLAY_REQUIRED
}

// false while the workstation is locked / on the secure desktop
func inputDesktopIsDefault() bool {
	h, _, _ := pOpenInputDesktop.Call(0, 0, 0x0001) // DESKTOP_READOBJECTS
	if h == 0 {
		return false
	}
	defer pCloseDesktop.Call(h)
	var buf [64]uint16
	var need uint32
	pGetUserObjectInformationW.Call(h, 2, uintptr(unsafe.Pointer(&buf[0])), uintptr(len(buf)*2), uintptr(unsafe.Pointer(&need))) // UOI_NAME
	return strings.EqualFold(windows.UTF16ToString(buf[:]), "Default")
}

func buildHash() uint32 {
	h := uint32(2166136261)
	for _, c := range []byte(appVersion + "|" + buildID) {
		h = (h ^ uint32(c)) * 16777619
	}
	return h
}

// Explorer keeps old exe icons in its cache. The first time a new build runs,
// tell the shell this file changed so it re-reads the icon.
func refreshShellIcon() {
	stamp := filepath.Join(appDataDir(), "last-build")
	cur := fmt.Sprintf("%08x", buildHash())
	if b, err := os.ReadFile(stamp); err == nil && string(b) == cur {
		return
	}
	_ = os.WriteFile(stamp, []byte(cur), 0o644)
	exe, err := os.Executable()
	if err != nil {
		return
	}
	p := u16(exe)
	pSHChangeNotify.Call(0x00002000, 0x0005, uintptr(unsafe.Pointer(p)), 0) // SHCNE_UPDATEITEM, SHCNF_PATHW
	pSHChangeNotify.Call(0x08000000, 0x0000, 0, 0)                          // SHCNE_ASSOCCHANGED: refresh cached icons
	log.Printf("asked Explorer to refresh the icon")
}
