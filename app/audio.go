//go:build windows

package main

// Is anything making a sound? Lots of apps ask Windows to keep the screen on and then forget to let
// go, so "something is keeping the screen on" on its own doesn't mean someone is watching a video.
// A video or a call also makes sound: Snow Day only holds back when both are true. The level comes
// from the speakers' peak meter (the same one the Windows volume mixer shows); nothing is recorded.

import (
	"syscall"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	ole32              = windows.NewLazySystemDLL("ole32.dll")
	pCoInitializeEx    = ole32.NewProc("CoInitializeEx")
	pCoCreateInstance  = ole32.NewProc("CoCreateInstance")
	clsidMMDeviceEnum  = mustGUID("bcde0395-e52f-467c-8e3d-c4579291692e")
	iidIMMDeviceEnum   = mustGUID("a95664d2-9614-4f35-a746-de8db63617e6")
	iidIAudioMeterInfo = mustGUID("c02216f6-8c67-4b5b-9d00-d008e73e0064")
)

var sound struct {
	meter     uintptr // IAudioMeterInformation on the default speakers
	madeAt    time.Time
	lastHeard time.Time
	inited    bool
}

// call a COM method by its slot in the object's vtable
func comCall(obj uintptr, slot int, args ...uintptr) uintptr {
	vtbl := *(*uintptr)(unsafe.Pointer(obj))
	fn := *(*uintptr)(unsafe.Pointer(vtbl + uintptr(slot)*unsafe.Sizeof(uintptr(0))))
	r, _, _ := syscall.SyscallN(fn, append([]uintptr{obj}, args...)...)
	return r
}

func comRelease(obj uintptr) {
	if obj != 0 {
		comCall(obj, 2)
	}
}

// the default speakers' peak meter (made again every minute, in case the speakers changed)
func audioMeter() uintptr {
	if sound.meter != 0 && time.Since(sound.madeAt) < time.Minute {
		return sound.meter
	}
	comRelease(sound.meter)
	sound.meter, sound.madeAt = 0, time.Now()
	if !sound.inited {
		pCoInitializeEx.Call(0, 2) // same apartment WebView2 uses on this thread
		sound.inited = true
	}
	var enum uintptr
	if r, _, _ := pCoCreateInstance.Call(uintptr(unsafe.Pointer(&clsidMMDeviceEnum)), 0, 0x17, uintptr(unsafe.Pointer(&iidIMMDeviceEnum)), uintptr(unsafe.Pointer(&enum))); r != 0 || enum == 0 {
		return 0
	}
	defer comRelease(enum)
	var dev uintptr
	if r := comCall(enum, 4, 0, 1, uintptr(unsafe.Pointer(&dev))); r != 0 || dev == 0 { // GetDefaultAudioEndpoint(eRender, eMultimedia)
		return 0 // no speakers
	}
	defer comRelease(dev)
	var meter uintptr
	if r := comCall(dev, 3, uintptr(unsafe.Pointer(&iidIAudioMeterInfo)), 0x17, 0, uintptr(unsafe.Pointer(&meter))); r != 0 || meter == 0 { // Activate
		return 0
	}
	sound.meter = meter
	return meter
}

// called every second: remember when something last made a sound
func listenTick() {
	m := audioMeter()
	if m == 0 {
		return
	}
	var peak float32
	if comCall(m, 3, uintptr(unsafe.Pointer(&peak))) != 0 { // GetPeakValue
		sound.madeAt = time.Time{} // try a fresh meter next time
		return
	}
	if peak > 0.002 {
		sound.lastHeard = time.Now()
	}
}

// something has played a sound in the last 20 seconds (quiet moments in a film don't count as silence)
func soundPlaying() bool {
	return !sound.lastHeard.IsZero() && time.Since(sound.lastHeard) < 20*time.Second
}

// a video or a call: an app is keeping the screen on and there's sound
func watchingSomething() bool {
	return displayHeldAwake() && soundPlaying()
}
