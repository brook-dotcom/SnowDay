//go:build windows

package main

// Diagnostics: why didn't it snow? Snow Day keeps a small record of what happened while the PC sat
// idle (how long it stayed idle, what ended each quiet spell, what held the snow back) and, from the
// tray menu, writes it out with the Windows timers and the current "busy" checks as a short report.
// Nothing leaves the PC: the report opens in Notepad for the user to read or share.

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
)

const idDiag = 106

type idleRun struct {
	at   time.Time
	peak time.Duration
	end  string
}

var diag = struct {
	started   time.Time
	ticks     int
	lastIdle  time.Duration
	lastCur   POINT
	maxIdle   time.Duration
	maxIdleAt time.Time
	runs      []idleRun
	held      map[string]int // seconds the snow was held back, by reason
	autoStart int
}{started: time.Now(), held: map[string]int{}}

// every second, from the idle check
func diagTick() {
	diag.ticks++
	idle := time.Duration(idleMillis()) * time.Millisecond
	cur := cursorPos()
	if idle+1500*time.Millisecond < diag.lastIdle && diag.lastIdle >= 30*time.Second {
		end := "keyboard, click or other input (the pointer didn't move)"
		if cur != diag.lastCur {
			end = "the mouse moved"
		}
		if saver.running {
			end += ", while snowing"
		}
		diag.runs = append(diag.runs, idleRun{time.Now(), diag.lastIdle, end})
		if len(diag.runs) > 14 {
			diag.runs = diag.runs[1:]
		}
		log.Printf("idle for %s, ended by %s", diag.lastIdle.Round(time.Second), end)
	}
	if idle > diag.maxIdle {
		diag.maxIdle, diag.maxIdleAt = idle, time.Now()
	}
	diag.lastIdle, diag.lastCur = idle, cur
}

func diagHeld(reason string) {
	if reason != "" {
		diag.held[reason]++
	}
}

func onOff(b bool) string {
	if b {
		return "on"
	}
	return "off"
}

func durOrNever(d time.Duration) string {
	if d <= 0 {
		return "never"
	}
	return humanDur(d)
}

func clock(d time.Duration) string {
	d = d.Round(time.Second)
	if d >= time.Hour {
		return fmt.Sprintf("%dh %02dm", int(d.Hours()), int(d.Minutes())%60)
	}
	return fmt.Sprintf("%d:%02d", int(d.Minutes()), int(d.Seconds())%60)
}

// the program behind a window, e.g. "chrome.exe"
func windowProgram(h uintptr) string {
	var pid uint32
	windows.GetWindowThreadProcessId(windows.HWND(h), &pid)
	if pid == 0 {
		return "?"
	}
	ph, err := windows.OpenProcess(windows.PROCESS_QUERY_LIMITED_INFORMATION, false, pid)
	if err != nil {
		return "?"
	}
	defer windows.CloseHandle(ph)
	var buf [512]uint16
	n := uint32(len(buf))
	if windows.QueryFullProcessImageName(ph, 0, &buf[0], &n) != nil {
		return "?"
	}
	return filepath.Base(windows.UTF16ToString(buf[:n]))
}

func windowClass(h uintptr) string {
	var cls [128]uint16
	pGetClassNameW.Call(h, uintptr(unsafe.Pointer(&cls[0])), 128)
	return windows.UTF16ToString(cls[:])
}

func diagReport() string {
	var b strings.Builder
	p := func(f string, a ...any) { fmt.Fprintf(&b, f+"\n", a...) }
	s := app.settings
	now := time.Now()
	p("Snow Day diagnostics: v%s, %s", appVersion, now.Format("2 Jan 2006 15:04"))
	p("")
	p("Private: this report was made on this PC and stays here. Snow Day never sends it anywhere.")
	p("It holds no window titles, file names or typing: only Snow Day's settings, Windows power timers,")
	p("idle times and the name of the program in front. Share it only if you want help.")
	up := now.Sub(diag.started)
	p("Running for %s; idle checks %d (expected about %d).", clock(up), diag.ticks, int(up.Seconds()))
	p("")
	p("Settings: on %s, paused %s, snoozed %s, start after %s idle, pause for full-screen apps %s,",
		onOff(s.Enabled), onOff(app.paused), onOff(now.Before(app.snoozeUntil)), humanDur(time.Duration(s.IdleMin*float64(time.Minute))), onOff(s.SkipBusy))
	p("  screens %d, layout %s, snow on screens I'm not using %s", len(sortedMonitors()), s.Layout, onOff(s.PerMonitor))
	p("")
	power.cachedAt = time.Time{}
	t := timers()
	src := "plugged in"
	if t.onBattery {
		src = "on battery"
	}
	p("Windows (%s): screen dims %s, screen off %s, sleep %s, Windows screensaver %s, lock policy %s, battery saver %s",
		src, durOrNever(t.dim), durOrNever(t.off), durOrNever(t.sleep), durOrNever(t.scrSaver), durOrNever(t.lock), onOff(t.saver))
	after, why := startAfter()
	if why != "" {
		p("  So the snow starts after %s idle, before %s.", humanDur(after), why)
	} else {
		p("  So the snow starts after %s idle.", humanDur(after))
	}
	p("")
	idle := time.Duration(idleMillis()) * time.Millisecond
	p("Right now: idle %s, screen %s, desktop %s, snowing %s", clock(idle), map[bool]string{true: "off", false: "on"}[power.displayOff],
		map[bool]string{true: "unlocked", false: "locked"}[inputDesktopIsDefault()], onOff(saver.running))
	var st int32
	pSHQueryUserNotificationState.Call(uintptr(unsafe.Pointer(&st)))
	var es uint32
	if pCallNtPowerInformation.Find() == nil {
		pCallNtPowerInformation.Call(16, 0, 0, uintptr(unsafe.Pointer(&es)), 4)
	}
	fg, _, _ := pGetForegroundWindow.Call()
	full := false
	if fg != 0 {
		mons := sortedMonitors()
		if i := monitorOfWindow(mons, fg); i >= 0 {
			full = isFullscreen(fg, mons[i])
		}
	}
	p("  Front window: %s (%s), full screen %s", windowProgram(fg), windowClass(fg), onOff(full))
	p("  Windows notification state %d, screen kept on by an app %s (state 0x%x)", st, onOff(es&0x2 != 0 && !power.holding), es)
	why2 := blockedReason()
	if why2 == "" && s.SkipBusy {
		why2 = busyReason()
	}
	if why2 == "" {
		why2 = "nothing"
	}
	p("  Would be held back by: %s", why2)
	p("")
	p("Longest idle since start: %s (at %s). Snow started on its own %d time(s).", clock(diag.maxIdle), diag.maxIdleAt.Format("15:04"), diag.autoStart)
	if len(diag.runs) > 0 {
		p("Quiet spells of 30 sec or more, and what ended them:")
		for _, r := range diag.runs {
			p("  %s  %s, %s", r.at.Format("15:04"), clock(r.peak), r.end)
		}
	}
	if len(diag.held) > 0 {
		type kv struct {
			k string
			v int
		}
		var hs []kv
		for k, v := range diag.held {
			hs = append(hs, kv{k, v})
		}
		sort.Slice(hs, func(i, j int) bool { return hs[i].v > hs[j].v })
		p("Held back while idle:")
		for _, h := range hs {
			p("  %s: %s", h.k, clock(time.Duration(h.v)*time.Second))
		}
	}
	p("")
	p("Recent log:")
	if data, err := os.ReadFile(filepath.Join(localDir(), "log.txt")); err == nil {
		lines := strings.Split(strings.TrimRight(string(data), "\r\n"), "\n")
		if len(lines) > 40 {
			lines = lines[len(lines)-40:]
		}
		for _, l := range lines {
			p("  %s", strings.TrimRight(l, "\r"))
		}
	}
	out := b.String()
	if home, err := os.UserHomeDir(); err == nil && home != "" {
		out = strings.ReplaceAll(out, home, "%USERPROFILE%")
	}
	return out
}

func showDiagnostics() {
	f := filepath.Join(localDir(), "diagnostics.txt")
	if err := os.WriteFile(f, []byte(strings.ReplaceAll(diagReport(), "\n", "\r\n")), 0o644); err != nil {
		balloon("Snow Day", "Couldn't write the diagnostics file.")
		return
	}
	exec.Command("notepad.exe", f).Start()
}
