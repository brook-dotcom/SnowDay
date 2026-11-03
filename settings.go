//go:build windows

package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"

	"golang.org/x/sys/windows/registry"
)

type Settings struct {
	IdleMin    float64         `json:"idleMin"`
	BuildMin   float64         `json:"buildMin"`
	Intensity  string          `json:"intensity"`
	Look       string          `json:"look"`
	Layout     string          `json:"layout"`
	SkipUpdate string          `json:"skipUpdate"`   // a version the user chose to skip
	RemindAt   time.Time       `json:"remindAt"`     // "remind me later": not before this
	Prefer     int             `json:"preferScreen"` // the screen the penguins perform on (0 = main, in Settings order); -1 = any
	Scenes     map[string]bool `json:"scenes"`
	Dim        int             `json:"dim"`
	Startle    bool            `json:"startle"`
	SkipBusy   bool            `json:"skipBusy"`
	Autostart  bool            `json:"autostart"`
	Enabled    bool            `json:"enabled"`
	Toured     bool            `json:"toured"`
	PerMonitor bool            `json:"perMonitor"`
	AutoUpdate bool            `json:"autoUpdate"`
}

func defaultSettings() Settings {
	return Settings{
		IdleMin: 5, BuildMin: 3, Intensity: "steady", Look: "live", Layout: "span",
		Dim: 22, Startle: true, SkipBusy: true, Enabled: true, AutoUpdate: true,
		Scenes: map[string]bool{"tree": true, "parade": true, "ramp": true, "ice": true},
	}
}

func appDataDir() string {
	d := os.Getenv("APPDATA")
	if d == "" {
		d = os.TempDir()
	}
	p := filepath.Join(d, "SnowDay")
	os.MkdirAll(p, 0o755)
	return p
}

func localDir() string {
	d := os.Getenv("LOCALAPPDATA")
	if d == "" {
		d = os.TempDir()
	}
	p := filepath.Join(d, "SnowDay")
	os.MkdirAll(p, 0o755)
	return p
}

func loadSettings() Settings {
	s := defaultSettings()
	b, err := os.ReadFile(filepath.Join(appDataDir(), "settings.json"))
	if err == nil {
		_ = json.Unmarshal(b, &s)
	}
	s.sanitize()
	return s
}

func (s *Settings) sanitize() {
	d := defaultSettings()
	if s.IdleMin < 0.5 {
		s.IdleMin = 0.5
	}
	if s.IdleMin > 120 {
		s.IdleMin = 120
	}
	if s.BuildMin < 0.5 {
		s.BuildMin = d.BuildMin
	}
	if s.Dim < 0 || s.Dim > 70 {
		s.Dim = d.Dim
	}
	switch s.Intensity {
	case "gentle", "steady", "heavy":
	default:
		s.Intensity = d.Intensity
	}
	switch s.Look {
	case "live", "snapshot", "day", "night":
	default:
		s.Look = d.Look
	}
	switch s.Layout {
	case "span", "main":
	default:
		s.Layout = d.Layout // "same on each" / "different on each" are gone: only ever one crew
	}
	if s.Prefer < -1 || s.Prefer > 8 {
		s.Prefer = 0
	}
	if s.Scenes == nil {
		s.Scenes = d.Scenes
	}
}

func saveSettings(s Settings) error {
	b, _ := json.MarshalIndent(s, "", "  ")
	return os.WriteFile(filepath.Join(appDataDir(), "settings.json"), b, 0o644)
}

const runKey = `Software\Microsoft\Windows\CurrentVersion\Run`

func applyAutostart(on bool) {
	k, err := registry.OpenKey(registry.CURRENT_USER, runKey, registry.SET_VALUE|registry.QUERY_VALUE)
	if err != nil {
		return
	}
	defer k.Close()
	if on {
		exe, _ := os.Executable()
		_ = k.SetStringValue("SnowDay", `"`+exe+`" --tray`)
	} else {
		_ = k.DeleteValue("SnowDay")
	}
}
