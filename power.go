//go:build windows

package main

// Power awareness.
//
// Laptops usually turn the screen off, sleep or lock sooner than desktops, often sooner than the
// snow is due. The snow would then start on a dark screen and nobody would ever see it. So:
//   - start a little before the first of those timers (screen off, sleep, Windows screensaver, lock)
//   - keep the screen on for the first full show, then fade out and turn the screen off ourselves
//     once Windows would have done so
//   - stand down whenever the screen goes off, and don't start again until someone's been back
//   - say why it's waiting in the tray tooltip

import (
	"encoding/binary"
	"encoding/hex"
	"log"
	"strconv"
	"strings"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
)

var (
	pPowerGetActiveScheme             = powrprof.NewProc("PowerGetActiveScheme")
	pPowerReadACValueIndex            = powrprof.NewProc("PowerReadACValueIndex")
	pPowerReadDCValueIndex            = powrprof.NewProc("PowerReadDCValueIndex")
	pGetSystemPowerStatus             = kernel32.NewProc("GetSystemPowerStatus")
	pSetThreadExecutionState          = kernel32.NewProc("SetThreadExecutionState")
	pLocalFree                        = kernel32.NewProc("LocalFree")
	pRegisterPowerSettingNotification = user32.NewProc("RegisterPowerSettingNotification")
	pIsZoomed                         = user32.NewProc("IsZoomed")
)

const (
	WM_POWERBROADCAST      = 0x0218
	WM_SYSCOMMAND          = 0x0112
	SC_MONITORPOWER        = 0xF170
	PBT_APMSUSPEND         = 0x0004
	PBT_POWERSETTINGCHANGE = 0x8013
	esSystemRequired       = 0x00000001
	esDisplayRequired      = 0x00000002
	esContinuous           = 0x80000000
	timerPower             = 7
)

var (
	guidVideoGroup   = mustGUID("7516b95f-f776-4464-8c53-06167f40cc99")
	guidVideoOff     = mustGUID("3c0bc021-c8a8-4e07-a973-6b14cbcb2b7e")
	guidVideoDim     = mustGUID("17aaa29b-8b43-4b94-aafe-35f64daaf1ee")
	guidSleepGroup   = mustGUID("238c9fa8-0aad-41ed-83f4-97be242c8f20")
	guidSleepIdle    = mustGUID("29f6c1db-86da-48c5-9fdb-f2b67b1f44da")
	guidDisplayState = mustGUID("6fe69556-704a-47a0-8f24-c28d936fda47")
)

func mustGUID(s string) windows.GUID {
	var b [16]byte
	hex.Decode(b[:], []byte(strings.ReplaceAll(s, "-", "")))
	g := windows.GUID{Data1: binary.BigEndian.Uint32(b[0:4]), Data2: binary.BigEndian.Uint16(b[4:6]), Data3: binary.BigEndian.Uint16(b[6:8])}
	copy(g.Data4[:], b[8:])
	return g
}

type powerTimers struct {
	onBattery, saver bool          // running on battery; battery saver on (only counted on battery)
	dim, off, sleep  time.Duration // from the active power plan, for the current power source (0 = never)
	scrSaver, lock   time.Duration // the Windows screensaver; a policy lock (0 = none)
}

var power struct {
	cached     powerTimers
	cachedAt   time.Time
	displayOff bool
	offTick    uint32 // input tick when the screen went off (any input since means it's back on)
	holding    bool
	heldBefore bool // was something else keeping the screen on when we started holding
	showDone   bool // the first full show has played (first blizzard)
	fadingAt   time.Time
	fadeTick   uint32
	restTick   uint32 // don't start again until there's input after this tick
	status     string
	lastReason string
}

func readTimers() powerTimers {
	var t powerTimers
	var ps struct {
		ACLine, BatteryFlag, Percent, SaverFlag uint8
		LifeTime, FullLifeTime                  uint32
	}
	if r, _, _ := pGetSystemPowerStatus.Call(uintptr(unsafe.Pointer(&ps))); r != 0 {
		t.onBattery = ps.ACLine == 0
		t.saver = t.onBattery && ps.SaverFlag == 1
	}
	if pPowerGetActiveScheme.Find() == nil {
		var scheme *windows.GUID
		if r, _, _ := pPowerGetActiveScheme.Call(0, uintptr(unsafe.Pointer(&scheme))); r == 0 && scheme != nil {
			read := pPowerReadACValueIndex
			if t.onBattery {
				read = pPowerReadDCValueIndex
			}
			get := func(group, setting *windows.GUID) time.Duration {
				var v uint32
				if r, _, _ := read.Call(0, uintptr(unsafe.Pointer(scheme)), uintptr(unsafe.Pointer(group)), uintptr(unsafe.Pointer(setting)), uintptr(unsafe.Pointer(&v))); r != 0 {
					return 0
				}
				return time.Duration(v) * time.Second
			}
			t.off = get(&guidVideoGroup, &guidVideoOff)
			t.dim = get(&guidVideoGroup, &guidVideoDim)
			t.sleep = get(&guidSleepGroup, &guidSleepIdle)
			pLocalFree.Call(uintptr(unsafe.Pointer(scheme)))
		}
	}
	t.scrSaver = windowsScreensaver()
	if k, err := registry.OpenKey(registry.LOCAL_MACHINE, `SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System`, registry.QUERY_VALUE); err == nil {
		if v, _, err := k.GetIntegerValue("InactivityTimeoutSecs"); err == nil && v > 0 {
			t.lock = time.Duration(v) * time.Second
		}
		k.Close()
	}
	return t
}

// the classic Windows screensaver, if one is chosen (a group policy wins over the user's choice)
func windowsScreensaver() time.Duration {
	exe, active, secs := "", "1", ""
	for _, path := range []string{`Control Panel\Desktop`, `Software\Policies\Microsoft\Windows\Control Panel\Desktop`} {
		k, err := registry.OpenKey(registry.CURRENT_USER, path, registry.QUERY_VALUE)
		if err != nil {
			continue
		}
		if v, _, err := k.GetStringValue("SCRNSAVE.EXE"); err == nil {
			exe = v
		}
		if v, _, err := k.GetStringValue("ScreenSaveActive"); err == nil {
			active = v
		}
		if v, _, err := k.GetStringValue("ScreenSaveTimeOut"); err == nil {
			secs = v
		}
		k.Close()
	}
	n, _ := strconv.Atoi(strings.TrimSpace(secs))
	if strings.TrimSpace(exe) == "" || active == "0" || n <= 0 {
		return 0
	}
	return time.Duration(n) * time.Second
}

func timers() powerTimers {
	if time.Since(power.cachedAt) > 20*time.Second {
		power.cached, power.cachedAt = readTimers(), time.Now()
	}
	return power.cached
}

// the latest the snow can start on this PC right now, and which Windows timer sets it ("" = none)
func powerCap() (time.Duration, string) {
	t := timers()
	at, why := time.Duration(0), ""
	try := func(limit, start time.Duration, what string) {
		if limit > 0 && (why == "" || start < at) {
			at, why = start, what
		}
	}
	// the screen and sleep we can hold off while snowing, so starting just before is enough
	try(t.off, t.off-20*time.Second, "the screen turns off")
	if t.dim > 0 && (t.off == 0 || t.dim < t.off) {
		try(t.dim, t.dim-5*time.Second, "the screen dims")
	}
	try(t.sleep, t.sleep-20*time.Second, "the PC sleeps")
	// a screensaver or a lock we leave alone, so leave time to watch
	margin := func(d time.Duration) time.Duration { return min(max(d/3, 20*time.Second), 2*time.Minute) }
	try(t.scrSaver, t.scrSaver-margin(t.scrSaver), "the Windows screensaver starts")
	try(t.lock, t.lock-margin(t.lock), "Windows locks")
	if why != "" {
		at = max(at, 30*time.Second).Truncate(10 * time.Second)
	}
	return at, why
}

// when the snow should start, and which Windows timer (if any) pulled it earlier than the setting
func startAfter() (time.Duration, string) {
	want := time.Duration(app.settings.IdleMin * float64(time.Minute))
	if at, why := powerCap(); why != "" && at < want {
		return at, why
	}
	return want, ""
}

// global reasons not to snow right now ("" = fine)
func blockedReason() string {
	s := app.settings
	switch {
	case !s.Enabled:
		return "off"
	case app.paused:
		return "paused"
	case time.Now().Before(app.snoozeUntil):
		return "snoozing until " + app.snoozeUntil.Format("15:04")
	case power.displayOff && lastInputTick() == power.offTick:
		return "the screen is off"
	case power.restTick != 0 && lastInputTick() == power.restTick:
		return "resting until you're back"
	case !inputDesktopIsDefault():
		return "the PC is locked"
	case timers().saver:
		return "battery saver is on"
	}
	return ""
}

// a full-screen app, a game, a presentation, or an app keeping the screen on ("" = none)
func busyReason() string {
	var st int32
	if r, _, _ := pSHQueryUserNotificationState.Call(uintptr(unsafe.Pointer(&st))); r == 0 {
		switch st {
		case 3:
			return "a game is running full screen"
		case 4:
			return "presentation mode is on"
		}
	}
	// QUNS_BUSY also fires for a maximised window when the taskbar auto-hides, so check for ourselves
	if fg, _, _ := pGetForegroundWindow.Call(); fg != 0 {
		mons := sortedMonitors()
		if i := monitorOfWindow(mons, fg); i >= 0 && isFullscreen(fg, mons[i]) {
			return "a full-screen app is open"
		}
	}
	if displayHeldAwake() {
		return "an app is keeping the screen on"
	}
	return ""
}

// truly full screen: covers the monitor, no title bar, not just maximised, not the desktop itself
func isFullscreen(h uintptr, m monitor) bool {
	var r RECT
	pGetWindowRect.Call(h, uintptr(unsafe.Pointer(&r)))
	if r.Left > m.R.Left || r.Top > m.R.Top || r.Right < m.R.Right || r.Bottom < m.R.Bottom {
		return false
	}
	if z, _, _ := pIsZoomed.Call(h); z != 0 {
		return false
	}
	style, _, _ := pGetWindowLongPtrW.Call(h, uintptr(^uintptr(15))) // GWL_STYLE (-16)
	if style&WS_CAPTION == WS_CAPTION {
		return false
	}
	var cls [64]uint16
	pGetClassNameW.Call(h, uintptr(unsafe.Pointer(&cls[0])), 64)
	switch windows.UTF16ToString(cls[:]) {
	case "Progman", "WorkerW", "Shell_TrayWnd", "Shell_SecondaryTrayWnd", "SnowDaySaverWnd", "SnowDayConfigWnd":
		return false
	}
	return true
}

func humanDur(d time.Duration) string {
	m, s := int(d/time.Minute), int(d%time.Minute/time.Second)
	switch {
	case m == 0:
		return strconv.Itoa(s) + " sec"
	case s == 0:
		return strconv.Itoa(m) + " min"
	}
	return strconv.Itoa(m) + " min " + strconv.Itoa(s) + " sec"
}

// the tray tooltip: when it will snow, or why it's waiting
func powerStatus(waiting string) string {
	if waiting != "" {
		return "Snow Day — waiting: " + waiting
	}
	d, why := startAfter()
	if why != "" {
		return "Snow Day — snows after " + humanDur(d) + " idle, before " + why
	}
	return "Snow Day — snows after " + humanDur(d) + " idle"
}

func humanDurNow() string {
	d, _ := startAfter()
	return humanDur(d)
}

func setStatus(waiting string) {
	if waiting != power.lastReason {
		if waiting != "" {
			log.Printf("waiting: %s", waiting)
		}
		power.lastReason = waiting
	}
	if st := powerStatus(waiting); st != power.status {
		power.status = st
		updateTrayTip()
	}
}

// ---------- keeping the screen on for the show ----------

func registerPowerNotifications() {
	if pRegisterPowerSettingNotification.Find() == nil {
		pRegisterPowerSettingNotification.Call(app.hwnd, uintptr(unsafe.Pointer(&guidDisplayState)), 0) // DEVICE_NOTIFY_WINDOW_HANDLE
	}
}

func onPowerBroadcast(wp, lp uintptr) {
	switch wp {
	case PBT_APMSUSPEND:
		if saver.running {
			log.Printf("going to sleep: stopping the snow")
			restAfterStop()
		}
	case PBT_POWERSETTINGCHANGE:
		if lp == 0 {
			return
		}
		ps := (*struct {
			Guid windows.GUID
			Len  uint32
			Data uint32
		})(unsafe.Pointer(lp))
		if ps.Guid != guidDisplayState || ps.Len < 1 {
			return
		}
		state := ps.Data & 0xff // 0 off, 1 on, 2 dimmed
		off := state == 0
		if off != power.displayOff {
			log.Printf("screen %s", map[bool]string{true: "off", false: "on"}[off])
		}
		power.displayOff = off
		if off {
			power.offTick = lastInputTick()
		}
		if off && saver.running {
			restAfterStop() // nobody can see it: save the battery
		}
		if !off {
			power.cachedAt = time.Time{} // plugged in / unplugged often comes with this
		}
	}
}

// stop the show without waking anything, and don't start again until someone's been back
func restAfterStop() {
	stopSaver()
	power.restTick = lastInputTick()
}

// called when a show starts: hold the screen and sleep off if Windows would cut the show short
func holdAwake() {
	t := timers()
	if t.off == 0 && t.sleep == 0 {
		return
	}
	if !power.holding {
		power.heldBefore = displayHeldAwake()
		pSetThreadExecutionState.Call(esContinuous | esDisplayRequired | esSystemRequired)
		power.holding = true
	}
	power.showDone = false
	power.fadingAt = time.Time{}
}

func releaseAwake() {
	if power.holding {
		pSetThreadExecutionState.Call(esContinuous)
		power.holding = false
	}
	power.fadingAt = time.Time{}
	pKillTimer.Call(app.hwnd, timerPower)
}

// every second while snowing: once the first show is over (or after 15 minutes) and Windows
// would have turned the screen off by now, fade out and turn it off
func powerTick() {
	if !saver.running || !power.holding || saver.waking || !power.fadingAt.IsZero() {
		return
	}
	t := timers()
	limit := t.off
	if limit == 0 || (t.sleep > 0 && t.sleep < limit) {
		limit = t.sleep
	}
	if limit == 0 || time.Duration(idleMillis())*time.Millisecond < limit {
		return
	}
	if !power.showDone && time.Since(saver.started) < 15*time.Minute {
		return
	}
	log.Printf("show finished and the screen is due off: fading out")
	power.fadingAt, power.fadeTick = time.Now(), lastInputTick()
	for _, w := range saver.wins {
		if w.web != nil && w.web.Ready() {
			w.web.Eval("window.SD && SD.fadeOut && SD.fadeOut(2.5)")
		}
	}
	pSetTimer.Call(app.hwnd, timerPower, 3000, 0)
}

// the fade has finished: switch the screen off the way Windows would
func screenOffNow() {
	pKillTimer.Call(app.hwnd, timerPower)
	if !saver.running || power.fadingAt.IsZero() || saver.waking || lastInputTick() != power.fadeTick {
		power.fadingAt = time.Time{}
		for _, w := range saver.wins {
			if w.web != nil && w.web.Ready() {
				w.web.Eval("document.getElementById('sdOut')?.remove()")
			}
		}
		return // someone came back during the fade
	}
	restAfterStop()
	pPostMessageW.Call(app.hwnd, WM_SYSCOMMAND, SC_MONITORPOWER, 2)
}

func onFirstShowDone() {
	if !power.showDone {
		power.showDone = true
	}
}
