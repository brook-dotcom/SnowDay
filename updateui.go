//go:build windows

package main

// The update offer: a small window with what's new and three choices (update now, remind me
// later, skip this version). Critical updates don't ask (see updateTick).

import (
	"encoding/json"
	"path/filepath"
	"strings"
	"time"
	"unsafe"

	"github.com/jchv/go-webview2/pkg/edge"
)

const idUpdateNow = 107

var updWin struct {
	hwnd uintptr
	web  *edge.Chromium
}

func registerUpdateClass() {
	br, _, _ := pCreateSolidBrush.Call(0x00382414)
	registerClass("SnowDayUpdateWnd", updateProc, br, app.bigIcon)
}

// show the offer when someone is at the PC (asked: from the tray, or a manual check)
func offerUpdate(asked bool) {
	if upd.file == "" || updWin.hwnd != 0 || app.busy {
		return
	}
	if !asked {
		if saver.running || cfgWin.hwnd != 0 || idleMillis() > 60000 {
			return // not while it's snowing, Settings is open, or nobody's here
		}
		if time.Now().Before(app.settings.RemindAt) {
			return
		}
		if app.settings.SkipUpdate == upd.version {
			return
		}
	}
	app.busy = true
	defer func() { app.busy = false }()
	dpi := systemDPI()
	w, h := 480*dpi/96, 460*dpi/96
	m := preferredMonitorFor()
	x := m.R.Left + (m.R.Right-m.R.Left-int32(w))/2
	y := m.R.Top + (m.R.Bottom-m.R.Top-int32(h))/2
	updWin.hwnd, _, _ = pCreateWindowExW.Call(WS_EX_APPWINDOW,
		uintptr(unsafe.Pointer(u16("SnowDayUpdateWnd"))), uintptr(unsafe.Pointer(u16("Snow Day update"))),
		WS_OVERLAPPED|WS_CAPTION|WS_SYSMENU|WS_CLIPCHILDREN,
		uintptr(x), uintptr(y), uintptr(w), uintptr(h), 0, 0, hInstance(), 0)
	if systemUsesDarkApps() {
		on := int32(1)
		pDwmSetWindowAttribute.Call(updWin.hwnd, 20, uintptr(unsafe.Pointer(&on)), 4)
	}
	pSendMessageW.Call(updWin.hwnd, WM_SETICON, 1, app.bigIcon)
	pSendMessageW.Call(updWin.hwnd, WM_SETICON, 0, app.icon)
	pShowWindow.Call(updWin.hwnd, SW_SHOW)
	forceForeground(updWin.hwnd)
	web := edge.NewChromium()
	web.DataPath = app.dataDir
	web.MessageCallback = onUpdateMessage
	updWin.web = web
	if !web.Embed(updWin.hwnd) {
		pDestroyWindow.Call(updWin.hwnd)
		updWin.hwnd, updWin.web = 0, nil
		return
	}
	if st, err := web.GetSettings(); err == nil {
		_ = st.PutAreDefaultContextMenusEnabled(false)
		_ = st.PutAreDevToolsEnabled(false)
		_ = st.PutIsStatusBarEnabled(false)
		_ = st.PutIsZoomControlEnabled(false)
	}
	web.Resize()
	js, _ := json.Marshal(map[string]any{"current": appVersion, "version": upd.version, "notes": upd.notes, "skipped": app.settings.SkipUpdate == upd.version})
	web.Init("window.__UPD=" + string(js) + ";")
	ensureWeb()
	web.Navigate(fileURL(filepath.Join(app.webDir, "update.html")))
	web.Focus()
}

// the monitor the settings would open on (the main one)
func preferredMonitorFor() monitor {
	mons := monitors()
	for _, m := range mons {
		if m.Primary {
			return m
		}
	}
	return mons[0]
}

func closeUpdateWin() {
	if updWin.hwnd == 0 {
		return
	}
	if updWin.web != nil {
		updWin.web.Close()
	}
	h := updWin.hwnd
	updWin.hwnd, updWin.web = 0, nil
	pDestroyWindow.Call(h)
}

func onUpdateMessage(msg string) {
	switch strings.TrimPrefix(msg, "update:") {
	case "now":
		pPostMessageW.Call(app.hwnd, WM_UPDATECHOICE, 1, 0)
	case "later":
		pPostMessageW.Call(app.hwnd, WM_UPDATECHOICE, 2, 0)
	case "skip":
		pPostMessageW.Call(app.hwnd, WM_UPDATECHOICE, 3, 0)
	}
}

const WM_UPDATECHOICE = WM_APP + 10

// on the UI thread: act on the choice
func onUpdateChoice(c uintptr) {
	closeUpdateWin()
	switch c {
	case 1:
		app.settings.RemindAt, app.settings.SkipUpdate = time.Time{}, ""
		_ = saveSettings(app.settings)
		installUpdate(true)
	case 2:
		app.settings.RemindAt = time.Now().Add(24 * time.Hour)
		_ = saveSettings(app.settings)
	case 3:
		app.settings.SkipUpdate = upd.version
		_ = saveSettings(app.settings)
		upd.file = "" // forget the download; it's offered again only if asked for
	}
}

func updateProc(hwnd, msg, wp, lp uintptr) uintptr {
	switch uint32(msg) {
	case WM_SIZE:
		if updWin.web != nil {
			updWin.web.Resize()
		}
		return 0
	case WM_ACTIVATE:
		if wp&0xFFFF != 0 && updWin.web != nil {
			updWin.web.Focus()
		}
	case WM_CLOSE:
		pPostMessageW.Call(app.hwnd, WM_UPDATECHOICE, 2, 0) // closing it = remind me later
		return 0
	}
	return defProc(hwnd, msg, wp, lp)
}
