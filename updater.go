//go:build windows

package main

// Automatic updates from GitHub Releases.
//
// The repository is baked in at build time (-ldflags "-X main.updateRepo=owner/name"); when it's empty
// the updater is off. Only public release metadata is read: no tokens or credentials are involved.
// A new SnowDay.exe is downloaded next to the settings, checked against the release's SHA-256 file,
// and swapped in when the screensaver isn't showing. The new copy then takes over from this one
// through the normal single-instance hand-over.

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

var updateRepo = "" // owner/name, set at build time

const (
	WM_UPDATEREADY = WM_APP + 8 // a verified update has been downloaded
	WM_UPDATEINFO  = WM_APP + 9 // a manual check finished with nothing to install
	timerUpdate    = 6
	idCheckUpdate  = 105
)

var upd struct {
	checking bool
	file     string // verified download waiting to be installed
	version  string
	manual   bool
	lastMsg  string
}

func updatesEnabled() bool { return updateRepo != "" }

// parse "v1.2.3" / "1.2.3" into comparable numbers
func parseVersion(s string) [3]int {
	var v [3]int
	s = strings.TrimPrefix(strings.TrimSpace(s), "v")
	for i, part := range strings.SplitN(s, ".", 3) {
		n, _ := strconv.Atoi(strings.TrimFunc(part, func(r rune) bool { return r < '0' || r > '9' }))
		v[i] = n
	}
	return v
}

func newerThan(a, b string) bool {
	x, y := parseVersion(a), parseVersion(b)
	for i := 0; i < 3; i++ {
		if x[i] != y[i] {
			return x[i] > y[i]
		}
	}
	return false
}

type ghRelease struct {
	Tag    string `json:"tag_name"`
	Draft  bool   `json:"draft"`
	Pre    bool   `json:"prerelease"`
	Assets []struct {
		Name string `json:"name"`
		URL  string `json:"browser_download_url"`
		Size int64  `json:"size"`
	} `json:"assets"`
}

var httpClient = &http.Client{Timeout: 90 * time.Second, Transport: &http.Transport{Proxy: http.ProxyFromEnvironment}}

func httpGet(url string, limit int64) ([]byte, error) {
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("User-Agent", "SnowDay-updater/"+appVersion)
	req.Header.Set("Accept", "application/vnd.github+json")
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("%s: HTTP %d", url, resp.StatusCode)
	}
	return io.ReadAll(io.LimitReader(resp.Body, limit))
}

func updateDir() string {
	d := filepath.Join(localDir(), "update")
	os.MkdirAll(d, 0o755)
	return d
}

// startUpdateCheck runs in the background; the UI thread hears back through window messages
func startUpdateCheck(manual bool) {
	if !updatesEnabled() || upd.checking || upd.file != "" {
		if manual && upd.file != "" {
			pPostMessageW.Call(app.hwnd, WM_UPDATEREADY, 0, 0)
		}
		return
	}
	upd.checking = true
	upd.manual = manual
	go func() {
		msg, err := checkAndDownload()
		upd.checking = false
		if err != nil {
			log.Printf("update check: %v", err)
			msg = "Couldn't check for updates right now."
		}
		if upd.file != "" {
			pPostMessageW.Call(app.hwnd, WM_UPDATEREADY, 0, 0)
		} else if manual {
			upd.lastMsg = msg
			pPostMessageW.Call(app.hwnd, WM_UPDATEINFO, 0, 0)
		}
	}()
}

func checkAndDownload() (string, error) {
	b, err := httpGet("https://api.github.com/repos/"+updateRepo+"/releases/latest", 1<<20)
	if err != nil {
		return "", err
	}
	var rel ghRelease
	if err := json.Unmarshal(b, &rel); err != nil {
		return "", err
	}
	if rel.Draft || rel.Pre || !newerThan(rel.Tag, appVersion) {
		return "Snow Day is up to date (v" + appVersion + ").", nil
	}
	var exeURL, sumURL string
	var exeSize int64
	for _, a := range rel.Assets {
		switch strings.ToLower(a.Name) {
		case "snowday.exe":
			exeURL, exeSize = a.URL, a.Size
		case "snowday.exe.sha256":
			sumURL = a.URL
		}
	}
	if exeURL == "" || sumURL == "" {
		return "", errors.New("release " + rel.Tag + " has no SnowDay.exe + .sha256")
	}
	sumTxt, err := httpGet(sumURL, 4096)
	if err != nil {
		return "", err
	}
	want := strings.ToLower(strings.Fields(string(sumTxt) + " x")[0])
	data, err := httpGet(exeURL, 64<<20)
	if err != nil {
		return "", err
	}
	got := sha256.Sum256(data)
	if hex.EncodeToString(got[:]) != want || len(data) < 1<<20 || (exeSize > 0 && int64(len(data)) != exeSize) || data[0] != 'M' || data[1] != 'Z' {
		return "", errors.New("downloaded update failed verification")
	}
	ver := strings.TrimPrefix(rel.Tag, "v")
	f := filepath.Join(updateDir(), "SnowDay-"+ver+".exe")
	if err := os.WriteFile(f, data, 0o755); err != nil {
		return "", err
	}
	upd.file, upd.version = f, ver
	log.Printf("update %s downloaded and verified", ver)
	return "", nil
}

// installUpdate swaps the new exe into place and hands over to it. Called on the UI thread.
func installUpdate() {
	if upd.file == "" || saver.running || cfgWin.hwnd != 0 {
		return // try again later (timerUpdate keeps asking)
	}
	exe, err := os.Executable()
	if err != nil {
		return
	}
	old := exe + ".old"
	os.Remove(old)
	if err := os.Rename(exe, old); err != nil {
		log.Printf("update: can't replace %s: %v", exe, err)
		balloon("Snow Day update", "A new version is ready, but this folder can't be written to. Download it from GitHub.")
		upd.file = ""
		return
	}
	if err := copyFile(upd.file, exe); err != nil {
		os.Rename(old, exe)
		log.Printf("update: copy failed: %v", err)
		upd.file = ""
		return
	}
	log.Printf("update: installed v%s, handing over", upd.version)
	cmd := exec.Command(exe, "--tray", "--updated")
	if err := cmd.Start(); err != nil {
		os.Remove(exe)
		os.Rename(old, exe)
		upd.file = ""
		return
	}
	upd.file = ""
	// the new copy asks this one to quit (WM_QUITAPP) once it starts
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o755)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, in); err != nil {
		out.Close()
		return err
	}
	return out.Close()
}

// every minute: install a waiting update when the coast is clear; check GitHub every hour
var updTicks = 0

func updateTick() {
	if upd.file != "" {
		installUpdate()
		return
	}
	if updTicks%60 == 0 && app.settings.AutoUpdate {
		startUpdateCheck(false)
	}
	updTicks++
}

// tidy the previous exe and old downloads (runs in the background at start-up)
func afterUpdateCleanup(updated bool) {
	if exe, err := os.Executable(); err == nil {
		for i := 0; i < 20; i++ {
			if err := os.Remove(exe + ".old"); err == nil || os.IsNotExist(err) {
				break
			}
			time.Sleep(250 * time.Millisecond)
		}
	}
	if ents, err := os.ReadDir(updateDir()); err == nil {
		for _, e := range ents {
			os.Remove(filepath.Join(updateDir(), e.Name()))
		}
	}
	_ = updated
}
