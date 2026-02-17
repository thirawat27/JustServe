package update

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/minio/selfupdate"
)

const (
	CurrentVersion = "1.0.2"
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
		// Find asset for Windows
		var downloadURL string
		for _, asset := range release.Assets {
			// Basic check for .exe extension for Windows
			if strings.HasSuffix(strings.ToLower(asset.Name), ".exe") {
				downloadURL = asset.BrowserDownloadURL
				break
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

// InstallUpdate downloads and applies the update
func InstallUpdate(url string) (string, error) {
	resp, err := http.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	err = selfupdate.Apply(resp.Body, selfupdate.Options{})
	if err != nil {
		return "", err
	}

	return "Update applied successfully. Please restart the application.", nil
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
