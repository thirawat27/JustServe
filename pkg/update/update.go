package update

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	stdruntime "runtime"
	"strconv"
	"strings"
	"time"

	"github.com/minio/selfupdate"
)

const (
	CurrentVersion = "1.1.0"
	RepoOwner      = "thirawat27"
	RepoName       = "JustServe"
)

// Info holds information about available updates
type Info struct {
	Available   bool   `json:"available"`
	Version     string `json:"version"`
	DownloadURL string `json:"downloadUrl"`
	Body        string `json:"body"`
	Error       string `json:"error,omitempty"`
}

// CheckUpdate checks GitHub for latest release
func CheckUpdate() (*Info, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", RepoOwner, RepoName)
	resp, err := http.Get(url)
	if err != nil {
		return &Info{Error: err.Error()}, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return &Info{Error: fmt.Sprintf("GitHub API returned status: %s", resp.Status)}, nil
	}

	var release struct {
		TagName string `json:"tag_name"`
		Body    string `json:"body"`
		Assets  []struct {
			BrowserDownloadURL string `json:"browser_download_url"`
			Name               string `json:"name"`
		} `json:"assets"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return &Info{Error: err.Error()}, nil
	}

	// Compare versions
	isNewer := compareVersions(release.TagName, CurrentVersion)

	if isNewer {
		// Determine required suffix based on OS
		var requiredSuffix string
		var osKeyword string

		switch stdruntime.GOOS {
		case "windows":
			requiredSuffix = ".exe"
			osKeyword = "windows"
		case "darwin": // macOS
			requiredSuffix = "" // Binary usually has no extension or is .app/zip, assuming binary or specific naming
			osKeyword = "darwin"
		case "linux":
			requiredSuffix = ""
			osKeyword = "linux"
		default:
			// Fallback or unhandled OS
			requiredSuffix = ".exe"
		}

		// Find asset matching the current OS
		var downloadURL string
		for _, asset := range release.Assets {
			name := strings.ToLower(asset.Name)
			
			// Check if asset matches OS keyword (e.g., "JustServe_linux_amd64")
			// and has the correct extension if required
			if osKeyword != "" && !strings.Contains(name, osKeyword) {
				continue
			}

			if requiredSuffix != "" && !strings.HasSuffix(name, requiredSuffix) {
				continue
			}

			// Found a candidate
			downloadURL = asset.BrowserDownloadURL
			break
		}
		
		// Fallback: if specific OS asset not found, try finding just by extension for Windows
		if downloadURL == "" && stdruntime.GOOS == "windows" {
			for _, asset := range release.Assets {
				if strings.HasSuffix(strings.ToLower(asset.Name), ".exe") {
					downloadURL = asset.BrowserDownloadURL
					break
				}
			}
		}

		if downloadURL != "" {
			return &Info{
				Available:   true,
				Version:     release.TagName,
				DownloadURL: downloadURL,
				Body:        release.Body,
			}, nil
		}
	}

	return &Info{Available: false}, nil
}

// InstallUpdate downloads, applies the update, then relaunches the app automatically
func InstallUpdate(url string) (string, error) {
	// Get current executable path before overwriting
	execPath, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("failed to get executable path: %w", err)
	}
	// Resolve symlinks to get the real path
	execPath, err = filepath.EvalSymlinks(execPath)
	if err != nil {
		return "", fmt.Errorf("failed to resolve executable path: %w", err)
	}

	// Download the new binary
	resp, err := http.Get(url)
	if err != nil {
		return "", fmt.Errorf("failed to download update: %w", err)
	}
	defer resp.Body.Close()

	// Apply the update (replaces the running binary on disk)
	err = selfupdate.Apply(resp.Body, selfupdate.Options{})
	if err != nil {
		return "", fmt.Errorf("failed to apply update: %w", err)
	}

	// Launch the new version as a detached process
	cmd := exec.Command(execPath)
	cmd.Stdout = nil
	cmd.Stderr = nil
	cmd.Stdin = nil
	// SysProcAttr is set per-platform via build tags (see below)
	setSysProcAttr(cmd)

	if err := cmd.Start(); err != nil {
		// Update was applied but relaunch failed — user can restart manually
		return "Update applied. Please restart the application manually.", nil
	}

	// Exit the current (old) process
	go func() {
		time.Sleep(500 * time.Millisecond)
		os.Exit(0)
	}()

	return "Update applied! Restarting...", nil
}


// Helper to compare semantic versions v1.0.0 vs 1.0.1
func compareVersions(newV, oldV string) bool {
	newV = strings.TrimPrefix(newV, "v")
	oldV = strings.TrimPrefix(oldV, "v")

	v1Parts := strings.Split(newV, ".")
	v2Parts := strings.Split(oldV, ".")

	length := len(v1Parts)
	if len(v2Parts) > length {
		length = len(v2Parts)
	}

	for i := 0; i < length; i++ {
		var n1, n2 int
		if i < len(v1Parts) {
			n1, _ = strconv.Atoi(v1Parts[i])
		}
		if i < len(v2Parts) {
			n2, _ = strconv.Atoi(v2Parts[i])
		}
		if n1 > n2 {
			return true
		}
		if n1 < n2 {
			return false
		}
	}
	return false
}
