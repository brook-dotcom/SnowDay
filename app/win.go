//go:build windows

package main

import (
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	user32   = windows.NewLazySystemDLL("user32.dll")
	gdi32    = windows.NewLazySystemDLL("gdi32.dll")
	shell32  = windows.NewLazySystemDLL("shell32.dll")
	kernel32 = windows.NewLazySystemDLL("kernel32.dll")
	dwmapi   = windows.NewLazySystemDLL("dwmapi.dll")
	powrprof = windows.NewLazySystemDLL("powrprof.dll")

	pRegisterClassExW              = user32.NewProc("RegisterClassExW")
	pCreateWindowExW               = user32.NewProc("CreateWindowExW")
	pDefWindowProcW                = user32.NewProc("DefWindowProcW")
	pDestroyWindow                 = user32.NewProc("DestroyWindow")
	pShowWindow                    = user32.NewProc("ShowWindow")
	pUpdateWindow                  = user32.NewProc("UpdateWindow")
	pGetMessageW                   = user32.NewProc("GetMessageW")
	pTranslateMessage              = user32.NewProc("TranslateMessage")
	pDispatchMessageW              = user32.NewProc("DispatchMessageW")
	pPostMessageW                  = user32.NewProc("PostMessageW")
	pPostQuitMessage               = user32.NewProc("PostQuitMessage")
	pSetTimer                      = user32.NewProc("SetTimer")
	pKillTimer                     = user32.NewProc("KillTimer")
	pGetLastInputInfo              = user32.NewProc("GetLastInputInfo")
	pGetCursorPos                  = user32.NewProc("GetCursorPos")
	pEnumDisplayMonitors           = user32.NewProc("EnumDisplayMonitors")
	pGetMonitorInfoW               = user32.NewProc("GetMonitorInfoW")
	pEnumWindows                   = user32.NewProc("EnumWindows")
	pIsWindowVisible               = user32.NewProc("IsWindowVisible")
	pIsIconic                      = user32.NewProc("IsIconic")
	pGetWindowRect                 = user32.NewProc("GetWindowRect")
	pGetAncestor                   = user32.NewProc("GetAncestor")
	pGetClassNameW                 = user32.NewProc("GetClassNameW")
	pGetWindowTextLengthW          = user32.NewProc("GetWindowTextLengthW")
	pGetWindowLongPtrW             = user32.NewProc("GetWindowLongPtrW")
	pFindWindowW                   = user32.NewProc("FindWindowW")
	pSetForegroundWindow           = user32.NewProc("SetForegroundWindow")
	pGetForegroundWindow           = user32.NewProc("GetForegroundWindow")
	pBringWindowToTop              = user32.NewProc("BringWindowToTop")
	pSetFocus                      = user32.NewProc("SetFocus")
	pGetWindowThreadProcessId      = user32.NewProc("GetWindowThreadProcessId")
	pAttachThreadInput             = user32.NewProc("AttachThreadInput")
	pCreatePopupMenu               = user32.NewProc("CreatePopupMenu")
	pAppendMenuW                   = user32.NewProc("AppendMenuW")
	pTrackPopupMenu                = user32.NewProc("TrackPopupMenu")
	pDestroyMenu                   = user32.NewProc("DestroyMenu")
	pSetWindowPos                  = user32.NewProc("SetWindowPos")
	pGetDC                         = user32.NewProc("GetDC")
	pReleaseDC                     = user32.NewProc("ReleaseDC")
	pBeginPaint                    = user32.NewProc("BeginPaint")
	pEndPaint                      = user32.NewProc("EndPaint")
	pSetCursor                     = user32.NewProc("SetCursor")
	pLoadCursorW                   = user32.NewProc("LoadCursorW")
	pRegisterWindowMessageW        = user32.NewProc("RegisterWindowMessageW")
	pCreateIconFromResourceEx      = user32.NewProc("CreateIconFromResourceEx")
	pGetSystemMetrics              = user32.NewProc("GetSystemMetrics")
	pGetDpiForSystem               = user32.NewProc("GetDpiForSystem")
	pSetProcessDpiAwarenessContext = user32.NewProc("SetProcessDpiAwarenessContext")
	pSendMessageW                  = user32.NewProc("SendMessageW")
	pSendMessageTimeoutW           = user32.NewProc("SendMessageTimeoutW")
	pOpenInputDesktop              = user32.NewProc("OpenInputDesktop")
	pCloseDesktop                  = user32.NewProc("CloseDesktop")
	pGetUserObjectInformationW     = user32.NewProc("GetUserObjectInformationW")
	pMessageBoxW                   = user32.NewProc("MessageBoxW")
	pGetClientRect                 = user32.NewProc("GetClientRect")
	pFillRect                      = user32.NewProc("FillRect")

	pCreateCompatibleDC     = gdi32.NewProc("CreateCompatibleDC")
	pCreateCompatibleBitmap = gdi32.NewProc("CreateCompatibleBitmap")
	pSelectObject           = gdi32.NewProc("SelectObject")
	pBitBlt                 = gdi32.NewProc("BitBlt")
	pDeleteDC               = gdi32.NewProc("DeleteDC")
	pDeleteObject           = gdi32.NewProc("DeleteObject")
	pGetDIBits              = gdi32.NewProc("GetDIBits")
	pCreateRectRgn          = gdi32.NewProc("CreateRectRgn")
	pGetStockObject         = gdi32.NewProc("GetStockObject")
	pCreateSolidBrush       = gdi32.NewProc("CreateSolidBrush")

	pShellNotifyIconW             = shell32.NewProc("Shell_NotifyIconW")
	pSHChangeNotify               = shell32.NewProc("SHChangeNotify")
	pSHQueryUserNotificationState = shell32.NewProc("SHQueryUserNotificationState")

	pGetTickCount       = kernel32.NewProc("GetTickCount")
	pGetModuleHandleW   = kernel32.NewProc("GetModuleHandleW")
	pCreateMutexW       = kernel32.NewProc("CreateMutexW")
	pGetCurrentThreadId = kernel32.NewProc("GetCurrentThreadId")

	pDwmGetWindowAttribute     = dwmapi.NewProc("DwmGetWindowAttribute")
	pDwmEnableBlurBehindWindow = dwmapi.NewProc("DwmEnableBlurBehindWindow")
	pDwmSetWindowAttribute     = dwmapi.NewProc("DwmSetWindowAttribute")

	pCallNtPowerInformation = powrprof.NewProc("CallNtPowerInformation")
)

const (
	WS_OVERLAPPED               = 0x00000000
	WS_POPUP                    = 0x80000000
	WS_VISIBLE                  = 0x10000000
	WS_CAPTION                  = 0x00C00000
	WS_SYSMENU                  = 0x00080000
	WS_MINIMIZEBOX              = 0x00020000
	WS_CLIPCHILDREN             = 0x02000000
	WS_EX_TOPMOST               = 0x00000008
	WS_EX_TOOLWINDOW            = 0x00000080
	WS_EX_APPWINDOW             = 0x00040000
	SW_HIDE                     = 0
	SW_SHOW                     = 5
	SW_SHOWNOACTIVATE           = 4
	SW_RESTORE                  = 9
	WM_DESTROY                  = 0x0002
	WM_SIZE                     = 0x0005
	WM_ACTIVATE                 = 0x0006
	WM_PAINT                    = 0x000F
	WM_CLOSE                    = 0x0010
	WM_ERASEBKGND               = 0x0014
	WM_SETCURSOR                = 0x0020
	WM_MOVE                     = 0x0003
	WM_TIMER                    = 0x0113
	WM_COMMAND                  = 0x0111
	WM_NULL                     = 0x0000
	WM_LBUTTONUP                = 0x0202
	WM_LBUTTONDBLCLK            = 0x0203
	WM_RBUTTONUP                = 0x0205
	WM_CONTEXTMENU              = 0x007B
	WM_APP                      = 0x8000
	WM_DPICHANGED               = 0x02E0
	WM_SETICON                  = 0x0080
	CS_HREDRAW                  = 0x0002
	CS_VREDRAW                  = 0x0001
	MF_STRING                   = 0x0000
	MF_SEPARATOR                = 0x0800
	MF_CHECKED                  = 0x0008
	MF_GRAYED                   = 0x0001
	TPM_RETURNCMD               = 0x0100
	TPM_RIGHTBUTTON             = 0x0002
	TPM_BOTTOMALIGN             = 0x0020
	NIM_ADD                     = 0
	NIM_MODIFY                  = 1
	NIM_DELETE                  = 2
	NIM_SETVERSION              = 4
	NIF_MESSAGE                 = 0x01
	NIF_ICON                    = 0x02
	NIF_TIP                     = 0x04
	NIF_INFO                    = 0x10
	NIIF_USER                   = 0x04
	NIIF_LARGE_ICON             = 0x20
	SWP_NOACTIVATE              = 0x0010
	SWP_SHOWWINDOW              = 0x0040
	SRCCOPY                     = 0x00CC0020
	CAPTUREBLT                  = 0x40000000
	GWL_EXSTYLE                 = -20
	GWL_STYLE                   = -16
	MONITORINFOF_PRIMARY        = 1
	DWMWA_EXTENDED_FRAME_BOUNDS = 9
	DWMWA_CLOAKED               = 14
	DWM_BB_ENABLE               = 1
	DWM_BB_BLURREGION           = 2
	BLACK_BRUSH                 = 4
	IDC_ARROW                   = 32512
	SM_CXSMICON                 = 49
	SM_CXICON                   = 11
	MB_ICONERROR                = 0x10
)

var HWND_TOPMOST = ^uintptr(0) // (HWND)-1

type POINT struct{ X, Y int32 }
type RECT struct{ Left, Top, Right, Bottom int32 }
type MSG struct {
	Hwnd    uintptr
	Message uint32
	WParam  uintptr
	LParam  uintptr
	Time    uint32
	Pt      POINT
	_       uint32
}
type WNDCLASSEXW struct {
	CbSize        uint32
	Style         uint32
	LpfnWndProc   uintptr
	CbClsExtra    int32
	CbWndExtra    int32
	HInstance     uintptr
	HIcon         uintptr
	HCursor       uintptr
	HbrBackground uintptr
	LpszMenuName  *uint16
	LpszClassName *uint16
	HIconSm       uintptr
}
type LASTINPUTINFO struct {
	CbSize uint32
	DwTime uint32
}
type MONITORINFO struct {
	CbSize    uint32
	RcMonitor RECT
	RcWork    RECT
	DwFlags   uint32
}
type NOTIFYICONDATAW struct {
	CbSize           uint32
	HWnd             uintptr
	UID              uint32
	UFlags           uint32
	UCallbackMessage uint32
	HIcon            uintptr
	SzTip            [128]uint16
	DwState          uint32
	DwStateMask      uint32
	SzInfo           [256]uint16
	UVersion         uint32
	SzInfoTitle      [64]uint16
	DwInfoFlags      uint32
	GuidItem         windows.GUID
	HBalloonIcon     uintptr
}
type PAINTSTRUCT struct {
	Hdc         uintptr
	FErase      int32
	RcPaint     RECT
	FRestore    int32
	FIncUpdate  int32
	RgbReserved [32]byte
}
type DWM_BLURBEHIND struct {
	DwFlags                uint32
	FEnable                int32
	HRgnBlur               uintptr
	FTransitionOnMaximized int32
}
type BITMAPINFOHEADER struct {
	BiSize          uint32
	BiWidth         int32
	BiHeight        int32
	BiPlanes        uint16
	BiBitCount      uint16
	BiCompression   uint32
	BiSizeImage     uint32
	BiXPelsPerMeter int32
	BiYPelsPerMeter int32
	BiClrUsed       uint32
	BiClrImportant  uint32
}

func u16(s string) *uint16 { p, _ := windows.UTF16PtrFromString(s); return p }

func copyU16(dst []uint16, s string) {
	src, _ := windows.UTF16FromString(s)
	n := len(src)
	if n > len(dst) {
		n = len(dst)
		src[n-1] = 0
	}
	copy(dst, src[:n])
}

func hInstance() uintptr { h, _, _ := pGetModuleHandleW.Call(0); return h }

func registerClass(name string, proc func(hwnd, msg, wp, lp uintptr) uintptr, brush uintptr, icon uintptr) {
	wc := WNDCLASSEXW{
		CbSize:        uint32(unsafe.Sizeof(WNDCLASSEXW{})),
		Style:         CS_HREDRAW | CS_VREDRAW,
		LpfnWndProc:   syscall.NewCallback(proc),
		HInstance:     hInstance(),
		HbrBackground: brush,
		LpszClassName: u16(name),
		HIcon:         icon,
		HIconSm:       icon,
	}
	cur, _, _ := pLoadCursorW.Call(0, IDC_ARROW)
	wc.HCursor = cur
	pRegisterClassExW.Call(uintptr(unsafe.Pointer(&wc)))
}

func defProc(hwnd, msg, wp, lp uintptr) uintptr {
	r, _, _ := pDefWindowProcW.Call(hwnd, msg, wp, lp)
	return r
}

func idleMillis() uint32 {
	li := LASTINPUTINFO{CbSize: uint32(unsafe.Sizeof(LASTINPUTINFO{}))}
	pGetLastInputInfo.Call(uintptr(unsafe.Pointer(&li)))
	now, _, _ := pGetTickCount.Call()
	return uint32(now) - li.DwTime
}

func lastInputTick() uint32 {
	li := LASTINPUTINFO{CbSize: uint32(unsafe.Sizeof(LASTINPUTINFO{}))}
	pGetLastInputInfo.Call(uintptr(unsafe.Pointer(&li)))
	return li.DwTime
}

func cursorPos() POINT {
	var p POINT
	pGetCursorPos.Call(uintptr(unsafe.Pointer(&p)))
	return p
}

func systemDPI() int {
	if pGetDpiForSystem.Find() == nil {
		d, _, _ := pGetDpiForSystem.Call()
		if d > 0 {
			return int(d)
		}
	}
	return 96
}

func forceForeground(hwnd uintptr) {
	fg, _, _ := pGetForegroundWindow.Call()
	fgThread, _, _ := pGetWindowThreadProcessId.Call(fg, 0)
	cur, _, _ := pGetCurrentThreadId.Call()
	if fgThread != 0 && fgThread != cur {
		pAttachThreadInput.Call(cur, fgThread, 1)
		pSetForegroundWindow.Call(hwnd)
		pBringWindowToTop.Call(hwnd)
		pSetFocus.Call(hwnd)
		pAttachThreadInput.Call(cur, fgThread, 0)
	} else {
		pSetForegroundWindow.Call(hwnd)
		pSetFocus.Call(hwnd)
	}
}

func messageBox(text, title string) {
	pMessageBoxW.Call(0, uintptr(unsafe.Pointer(u16(text))), uintptr(unsafe.Pointer(u16(title))), MB_ICONERROR)
}
