//go:build windows

package main

import (
	"encoding/json"
	"golang.org/x/sys/windows/registry"
	"log"
	"path/filepath"
	"strings"
	"time"
	"unsafe"

	"github.com/jchv/go-webview2/pkg/edge"
)

var cfgWin struct {
	hwnd uintptr
	web  *edge.Chromium
	full bool    // the preview is full screen (like a video player): the window covers its monitor
	keep RECT    // where the window was before
	kept uintptr // and its style
}

var (
	pSetWindowLongPtrW = user32.NewProc("SetWindowLongPtrW")
	pMonitorFromWindow = user32.NewProc("MonitorFromWindow")
)

// full screen for the live preview: the settings window drops its frame and covers the monitor it's
// on, and the page shows only the preview; leaving puts everything back where it was
func setConfigFullscreen(on bool) {
	h := cfgWin.hwnd
	if h == 0 || on == cfgWin.full {
		return
	}
	const gwlStyle = ^uintptr(15)    // GWL_STYLE (-16)
	const swpFrame = 0x0020 | 0x0200 // SWP_FRAMECHANGED | SWP_NOOWNERZORDER
	if on {
		pGetWindowRect.Call(h, uintptr(unsafe.Pointer(&cfgWin.keep)))
		cfgWin.kept, _, _ = pGetWindowLongPtrW.Call(h, gwlStyle)
		mon, _, _ := pMonitorFromWindow.Call(h, 2) // MONITOR_DEFAULTTONEAREST
		mi := MONITORINFO{CbSize: uint32(unsafe.Sizeof(MONITORINFO{}))}
		pGetMonitorInfoW.Call(mon, uintptr(unsafe.Pointer(&mi)))
		r := mi.RcMonitor
		pSetWindowLongPtrW.Call(h, gwlStyle, WS_POPUP|WS_VISIBLE|WS_CLIPCHILDREN)
		pSetWindowPos.Call(h, 0, uintptr(r.Left), uintptr(r.Top), uintptr(r.Right-r.Left), uintptr(r.Bottom-r.Top), swpFrame)
	} else {
		r := cfgWin.keep
		pSetWindowLongPtrW.Call(h, gwlStyle, cfgWin.kept)
		pSetWindowPos.Call(h, 0, uintptr(r.Left), uintptr(r.Top), uintptr(r.Right-r.Left), uintptr(r.Bottom-r.Top), swpFrame)
	}
	cfgWin.full = on
	forceForeground(h)
}

func registerConfigClass() {
	br, _, _ := pCreateSolidBrush.Call(0x00382414) // matches the page background (BGR)
	registerClass("SnowDayConfigWnd", configProc, br, app.bigIcon)
}

func openConfig() {
	if cfgWin.hwnd != 0 {
		pShowWindow.Call(cfgWin.hwnd, SW_RESTORE)
		forceForeground(cfgWin.hwnd)
		return
	}
	if app.busy {
		return
	}
	app.busy = true
	defer func() { app.busy = false }()
	dpi := systemDPI()
	w, h := 1080*dpi/96, 760*dpi/96
	mons := monitors()
	m := mons[0]
	for _, mm := range mons {
		if mm.Primary {
			m = mm
		}
	}
	x := m.R.Left + (m.R.Right-m.R.Left-int32(w))/2
	y := m.R.Top + (m.R.Bottom-m.R.Top-int32(h))/2
	cfgWin.hwnd, _, _ = pCreateWindowExW.Call(WS_EX_APPWINDOW,
		uintptr(unsafe.Pointer(u16("SnowDayConfigWnd"))), uintptr(unsafe.Pointer(u16("Snow Day"))),
		WS_OVERLAPPED|WS_CAPTION|WS_SYSMENU|WS_MINIMIZEBOX|WS_CLIPCHILDREN,
		uintptr(x), uintptr(y), uintptr(w), uintptr(h), 0, 0, hInstance(), 0)
	if systemUsesDarkApps() {
		// a dark title bar to match the dark settings page
		on := int32(1)
		pDwmSetWindowAttribute.Call(cfgWin.hwnd, 20, uintptr(unsafe.Pointer(&on)), 4) // DWMWA_USE_IMMERSIVE_DARK_MODE
	}
	pSendMessageW.Call(cfgWin.hwnd, WM_SETICON, 1, app.bigIcon)
	pSendMessageW.Call(cfgWin.hwnd, WM_SETICON, 0, app.icon)
	pShowWindow.Call(cfgWin.hwnd, SW_SHOW)
	pUpdateWindow.Call(cfgWin.hwnd)
	forceForeground(cfgWin.hwnd)

	web := edge.NewChromium()
	web.DataPath = app.dataDir
	web.MessageCallback = onConfigMessage
	cfgWin.web = web
	if !web.Embed(cfgWin.hwnd) {
		messageBox("Snow Day needs the Microsoft Edge WebView2 Runtime, which comes with Windows 10 and 11.\n\nIf it's missing, install it from Microsoft (search \"WebView2 Runtime\") and start Snow Day again.", "Snow Day")
		pDestroyWindow.Call(cfgWin.hwnd)
		cfgWin.hwnd, cfgWin.web = 0, nil
		return
	}
	if st, err := web.GetSettings(); err == nil {
		_ = st.PutAreDefaultContextMenusEnabled(false)
		_ = st.PutAreDevToolsEnabled(false)
		_ = st.PutIsStatusBarEnabled(false)
		_ = st.PutIsZoomControlEnabled(false)
	}
	web.Resize()
	init := map[string]any{"settings": app.settings, "version": appVersion, "screens": len(mons), "updates": updatesEnabled()}
	if cap, why := powerCap(); why != "" {
		init["idleCap"] = map[string]any{"sec": int(cap / time.Second), "why": why}
	}
	js, _ := json.Marshal(init)
	web.Init("window.__INIT=" + string(js) + ";")
	web.Navigate(fileURL(filepath.Join(app.webDir, "config.html")))
	web.Focus()
}

func closeConfig() {
	if cfgWin.hwnd == 0 {
		return
	}
	if cfgWin.web != nil {
		cfgWin.web.Close()
	}
	h := cfgWin.hwnd
	cfgWin.hwnd, cfgWin.web, cfgWin.full = 0, nil, false
	pDestroyWindow.Call(h)
	if !app.balloonDone && !app.settings.Toured {
		app.balloonDone = true
		app.settings.Toured = true
		_ = saveSettings(app.settings)
		balloon("Snow Day is in your tray", "Snows after "+humanDurNow()+" idle.")
	}
}

func onConfigMessage(msg string) {
	switch {
	case strings.HasPrefix(msg, "save:"):
		var s Settings
		if err := json.Unmarshal([]byte(msg[5:]), &s); err != nil {
			log.Printf("bad settings: %v", err)
			return
		}
		s.Toured = app.settings.Toured
		s.sanitize()
		app.settings = s
		_ = saveSettings(s)
		applyAutostart(s.Autostart)
		updateTrayTip()
	case strings.HasPrefix(msg, "preview:"):
		var p struct {
			Scene    string   `json:"scene"`
			Settings Settings `json:"settings"`
		}
		if err := json.Unmarshal([]byte(msg[8:]), &p); err != nil {
			return
		}
		p.Settings.sanitize()
		st := p.Settings
		previewReq = &saverOpts{Fast: true, Force: p.Scene, Settings: &st}
		pSetTimer.Call(app.hwnd, timerPreview, 50, 0)
	case msg == "fullscreen:1" || msg == "fullscreen:0":
		setConfigFullscreen(msg == "fullscreen:1")
	case msg == "hide":
		pPostMessageW.Call(app.hwnd, WM_HIDECONFIG, 0, 0)
	case msg == "quit":
		pPostMessageW.Call(app.hwnd, WM_QUITAPP, 0, 0)
	}
}

var previewReq *saverOpts

const timerPreview = 3

func runPreview() {
	pKillTimer.Call(app.hwnd, timerPreview)
	if previewReq == nil {
		return
	}
	o := *previewReq
	previewReq = nil
	stopSaver()
	startSaver(o)
}

func configProc(hwnd, msg, wp, lp uintptr) uintptr {
	switch uint32(msg) {
	case WM_SIZE:
		if cfgWin.web != nil {
			cfgWin.web.Resize()
		}
		return 0
	case WM_MOVE:
		if cfgWin.web != nil {
			_ = cfgWin.web.NotifyParentWindowPositionChanged()
		}
	case WM_ACTIVATE:
		if wp&0xFFFF != 0 && cfgWin.web != nil {
			cfgWin.web.Focus()
		}
	case WM_CLOSE:
		closeConfig()
		return 0
	case WM_DPICHANGED:
		r := (*RECT)(unsafe.Pointer(lp))
		pSetWindowPos.Call(hwnd, 0, uintptr(r.Left), uintptr(r.Top), uintptr(r.Right-r.Left), uintptr(r.Bottom-r.Top), 0x0004|SWP_NOACTIVATE)
		return 0
	}
	return defProc(hwnd, msg, wp, lp)
}

// Windows "Choose your app mode": dark when AppsUseLightTheme is 0
func systemUsesDarkApps() bool {
	k, err := registry.OpenKey(registry.CURRENT_USER, `Software\Microsoft\Windows\CurrentVersion\Themes\Personalize`, registry.QUERY_VALUE)
	if err != nil {
		return false
	}
	defer k.Close()
	v, _, err := k.GetIntegerValue("AppsUseLightTheme")
	return err == nil && v == 0
}
