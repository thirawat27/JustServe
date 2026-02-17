package main

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"sync"
	"time"

	"os/exec"
	stdruntime "runtime"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"golang.ngrok.com/ngrok"
	"golang.ngrok.com/ngrok/config"
	"github.com/minio/selfupdate"
	"archive/zip"
	"io"
	"os"
	"path/filepath"
	"html/template"
	"strconv"
)

const (
	CurrentVersion = "1.0.1" 
	RepoOwner      = "thirawat27"
	RepoName       = "JustServe"
)

// UpdateInfo holds information about available updates
type UpdateInfo struct {
	Available   bool   `json:"available"`
	Version     string `json:"version"`
	DownloadURL string `json:"downloadUrl"`
	Body        string `json:"body"`
	Error       string `json:"error,omitempty"`
}

// P2PTransferInfo holds the state of a P2P transfer session
type P2PTransferInfo struct {
	Code       string `json:"code"`
	URL        string `json:"url"`
	FilePath   string `json:"filePath"`
	FileName   string `json:"fileName"`
	FileSize   int64  `json:"fileSize"`
	IsDir      bool   `json:"isDir"`
	Status     string `json:"status"` // "waiting" | "transferring" | "completed" | "error"
	BytesTransferred int64 `json:"bytesTransferred"`
}

// App struct
type App struct {
	ctx        context.Context
	server     *http.Server
	ngrokTunnel ngrok.Tunnel
	mu         sync.Mutex // Mutex for state management
	isQuitting bool       // Flag to determine if we are really quitting or just minimizing
	cancel     context.CancelFunc

	// P2P Transfer
	p2pServer   *http.Server
	p2pListener net.Listener
	p2pInfo     *P2PTransferInfo
	p2pMu       sync.Mutex
	p2pUDPConn  *net.UDPConn
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// SelectFolder opens a dialog to select a folder
func (a *App) SelectFolder() (string, error) {
	selection, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Folder to Serve",
	})
	if err != nil {
		return "", err
	}
	return selection, nil
}

// SelectFile opens a dialog to select a single file
func (a *App) SelectFile() (string, error) {
	selection, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select File to Serve",
	})
	if err != nil {
		return "", err
	}
	return selection, nil
}

// beforeClose is called when the application tries to close
// Returns true to prevent closing (minimize to tray), false to allow closing
func (a *App) beforeClose(ctx context.Context) (prevent bool) {
	if a.isQuitting {
		return false
	}
	runtime.WindowHide(ctx)
	return true
}

// quitApp sets the quitting flag and actually quits the app
func (a *App) quitApp() {
	a.isQuitting = true
	runtime.Quit(a.ctx)
}

// showApp shows the window
func (a *App) showApp() {
	runtime.WindowShow(a.ctx)
	runtime.WindowSetAlwaysOnTop(a.ctx, true)
	runtime.WindowSetAlwaysOnTop(a.ctx, false)
}

// StartLocalServer starts a local file server
func (a *App) StartLocalServer(port string, path string, password string, allowUpload bool) (string, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	// Stop any existing server
	a.stopServerInternal()

	// Default port if empty
	if port == "" {
		port = "8080"
	}

	// Prepare file server handler with custom logic
	handler := newFileHandler(path, password, allowUpload)

	// Create listener first to get the actual port (in case of 0)
	// Ensure port starts with :
	if !strings.HasPrefix(port, ":") {
		port = ":" + port
	}

	listener, err := net.Listen("tcp", port)
	if err != nil {
		return "", fmt.Errorf("failed to listen on port %s: %w", port, err)
	}

	// Create server
	a.server = &http.Server{Handler: handler}

	// Calculate local IP addresses to return to frontend
	// This is useful for QR code generation
	addrs, err := net.InterfaceAddrs()
	localIP := "localhost"
	if err == nil {
		for _, address := range addrs {
			// check the address type and if it is not a loopback the display it
			if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
				if ipnet.IP.To4() != nil {
					localIP = ipnet.IP.String()
					// Prefer 192.168.x.x or 10.x.x.x over others if possible, but first found is generally okay.
					// We might want to list all or let user choose, but for now single IP is fine.
					if strings.HasPrefix(localIP, "192.168.") || strings.HasPrefix(localIP, "10.") {
						break 
					}
				}
			}
		}
	}

	url := fmt.Sprintf("http://%s:%d", localIP, listener.Addr().(*net.TCPAddr).Port)

	// Start serving in a goroutine
	go func() {
		if err := a.server.Serve(listener); err != nil && err != http.ErrServerClosed {
			runtime.EventsEmit(a.ctx, "server-error", err.Error())
		}
	}()

	return url, nil
}

// StartPublicServer starts a publicly accessible tunnel using ngrok
func (a *App) StartPublicServer(token string, path string, password string, allowUpload bool) (string, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	// Stop any existing server
	a.stopServerInternal()

	// Start ngrok tunnel
	tun, err := ngrok.Listen(context.Background(),
		config.HTTPEndpoint(),
		ngrok.WithAuthtoken(token),
	)
	if err != nil {
		return "", fmt.Errorf("failed to start ngrok tunnel: %w", err)
	}

	a.ngrokTunnel = tun

	// Start file server on the tunnel
	handler := newFileHandler(path, password, allowUpload)
	a.server = &http.Server{Handler: handler} 

	go func() {
		if err := a.server.Serve(tun); err != nil && err != http.ErrServerClosed {
			runtime.EventsEmit(a.ctx, "server-error", err.Error())
		}
	}()

	return tun.URL(), nil
}

// StopServer stops any running server from frontend
func (a *App) StopServer() {
	a.mu.Lock()
	a.stopServerInternal()
	a.mu.Unlock()
}

// GetLocalIPs returns a list of all non-loopback IP addresses
func (a *App) GetLocalIPs() ([]string, error) {
	var ips []string
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return nil, err
	}
	for _, address := range addrs {
		if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				ips = append(ips, ipnet.IP.String())
			}
		}
	}
	return ips, nil
}

// Internal helper to stop servers without locking (called from within locked methods)
func (a *App) stopServerInternal() {
	if a.server != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
		defer cancel()
		// We use Shutdown for graceful shutdown, but with a short timeout.
		// If it takes too long, we call Close().
		if err := a.server.Shutdown(ctx); err != nil {
			a.server.Close()
		}
		a.server = nil
	}
	// Ensure ngrok tunnel reference is cleared and closed.
	if a.ngrokTunnel != nil {
		a.ngrokTunnel.Close()
		a.ngrokTunnel = nil
	}
}

// CheckUpdate checks GitHub for latest release
func (a *App) CheckUpdate() (*UpdateInfo, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", RepoOwner, RepoName)
	resp, err := http.Get(url)
	if err != nil {
		return &UpdateInfo{Error: err.Error()}, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return &UpdateInfo{Error: fmt.Sprintf("GitHub API returned status: %s", resp.Status)}, nil
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
		return &UpdateInfo{Error: err.Error()}, nil
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
			return &UpdateInfo{
				Available:   true,
				Version:     release.TagName,
				DownloadURL: downloadURL,
				Body:        release.Body,
			}, nil
		}
	}

	return &UpdateInfo{Available: false}, nil
}

// InstallUpdate downloads and applies the update
func (a *App) InstallUpdate(url string) (string, error) {
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

// --- Custom File Handler Implementation ---

type fileHandler struct {
	root        string
	isFile      bool
	password    string
	allowUpload bool
	fileServer  http.Handler
}

func newFileHandler(root string, password string, allowUpload bool) *fileHandler {
	isFile := false
	info, err := os.Stat(root)
	if err == nil && !info.IsDir() {
		isFile = true
	}

	var fs http.Handler
	if isFile {
		// For single file, serve the directory containing it, but we'll restrict access in ServeHTTP
		fs = http.FileServer(http.Dir(filepath.Dir(root)))
	} else {
		fs = http.FileServer(http.Dir(root))
	}

	return &fileHandler{
		root:        root,
		isFile:      isFile,
		password:    password,
		allowUpload: allowUpload,
		fileServer:  fs,
	}
}

func (h *fileHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// 1. Basic Auth Check
	if h.password != "" {
		w.Header().Set("WWW-Authenticate", `Basic realm="Restricted"`)
		username, password, ok := r.BasicAuth()
		// We ignore username, only check password
		if !ok || password != h.password {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		// Also standard empty username check if browser sends one
		_ = username
	}

	// 2. Upload Handling (Only for directories)
	if !h.isFile && h.allowUpload && r.Method == http.MethodPost {
		// handle upload
		h.handleUpload(w, r)
		return
	}

	// 3. Single File Mode
	if h.isFile {
		filename := filepath.Base(h.root)
		
		// If requesting the root, show download page (metadata)
		if r.URL.Path == "/" || r.URL.Path == "/index.html" {
			h.serveSingleFilePage(w, h.root)
			return
		}

		// If requesting the specific file
		if strings.TrimPrefix(r.URL.Path, "/") == filename {
			http.ServeFile(w, r, h.root)
			return
		}

		// Block access to other files in the same directory
		http.NotFound(w, r)
		return
	}

	// 4. Directory Listing & File Serving
	// Check if path is a directory
	path := filepath.Join(h.root, r.URL.Path)
	info, err := os.Stat(path)
	if err == nil && info.IsDir() {
		// Checks for Zip download request
		if r.URL.Query().Get("download") == "zip" {
			h.streamZip(w, path, filepath.Base(path))
			return
		}

		// Serve custom directory listing
		h.serveDirectory(w, r.URL.Path, path)
		return
	}

	// Default file server
	h.fileServer.ServeHTTP(w, r)
}

func (h *fileHandler) handleUpload(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form
	// Limit upload size to 10GB (arbitrary large limit)
	err := r.ParseMultipartForm(10 << 30) // 10 GB
	if err != nil {
		http.Error(w, "Error parsing form: " + err.Error(), http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Error retrieving the file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Create destination file
	dstPath := filepath.Join(h.root, header.Filename)
	dst, err := os.Create(dstPath)
	if err != nil {
		http.Error(w, "Error creating the file on server", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	// Copy file
	if _, err := io.Copy(dst, file); err != nil {
		http.Error(w, "Error saving the file", http.StatusInternalServerError)
		return
	}

	// Redirect back to root or success page
	http.Redirect(w, r, r.URL.Path, http.StatusSeeOther)
}

func (h *fileHandler) streamZip(w http.ResponseWriter, dirPath string, dirName string) {
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.zip\"", dirName))

	zw := zip.NewWriter(w)
	defer zw.Close()

	// streamZip with optimized WalkDir
	filepath.WalkDir(dirPath, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}

		relPath, err := filepath.Rel(dirPath, path)
		if err != nil {
			return err
		}

		// Use forward slashes for zip compatibility
		relPath = filepath.ToSlash(relPath)

		zipFile, err := zw.Create(relPath)
		if err != nil {
			return err
		}

		fsFile, err := os.Open(path)
		if err != nil {
			return err
		}
		defer fsFile.Close()

		_, err = io.Copy(zipFile, fsFile)
		return err
	})
}

func (h *fileHandler) serveSingleFilePage(w http.ResponseWriter, path string) {
	info, err := os.Stat(path)
	if err != nil {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	filename := filepath.Base(path)
	size := fmt.Sprintf("%.2f MB", float64(info.Size())/(1024*1024))
	if info.Size() < 1024*1024 {
		size = fmt.Sprintf("%.2f KB", float64(info.Size())/1024)
	}

	// Reusing similar template structure for consistency
	const tpl = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JustServe - {{.Name}}</title>
    <style>
        :root {
            --bg: #0f172a;
            --card-bg: #1e293b;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --accent: #3b82f6;
            --accent-hover: #2563eb;
            --border: #334155;
        }
        body { 
            font-family: 'Inter', -apple-system, sans-serif; 
            background: var(--bg); 
            color: var(--text-primary); 
            margin: 0; 
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .card { 
            background: var(--card-bg); 
            padding: 3rem; 
            border-radius: 24px; 
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); 
            border: 1px solid var(--border);
            text-align: center;
            max-width: 400px;
            width: 90%;
        }
        .icon { font-size: 4rem; margin-bottom: 1.5rem; }
        h1 { margin: 0 0 0.5rem 0; font-size: 1.5rem; word-break: break-all; }
        p { color: var(--text-secondary); margin: 0 0 2rem 0; }
        .btn {
            background: var(--accent);
            color: white;
            text-decoration: none;
            padding: 1rem 2rem;
            border-radius: 12px;
            font-weight: 600;
            display: inline-block;
            transition: all 0.2s;
            width: 100%;
            box-sizing: border-box;
        }
        .btn:hover { background: var(--accent-hover); transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3); }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">📄</div>
        <h1>{{.Name}}</h1>
        <p>{{.Size}}</p>
        <a href="{{.Name}}" class="btn" download>Download File</a>
    </div>
</body>
</html>
`
	t, _ := template.New("single").Parse(tpl)
	data := struct {
		Name string
		Size string
	}{
		Name: filename,
		Size: size,
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	t.Execute(w, data)
}

func (h *fileHandler) serveDirectory(w http.ResponseWriter, requestPath string, fsPath string) {
	entries, err := os.ReadDir(fsPath)
	if err != nil {
		http.Error(w, "Unable to read directory", http.StatusInternalServerError)
		return
	}

	type FileEntry struct {
		Name   string
		IsDir  bool
		Size   string
		Icon   string
		Params string
	}

	var fileList []FileEntry
	
	// Add Go Back link if not root
	if requestPath != "/" {
		// Parent directory logic
		parent := filepath.Dir(requestPath)
		if parent == "." { parent = "/" }
		// Ensure it starts with / and uses forward slashes
		parent = filepath.ToSlash(parent)
		if !strings.HasPrefix(parent, "/") { parent = "/" + parent }
		
		fileList = append(fileList, FileEntry{Name: "..", IsDir: true, Size: "-", Icon: "↩️", Params: "?dir=back"}) 
	}

	// Sort entries: Directories first, then files. Both alphabetical.
	// We can use a stable sort or two passes.
	var dirs, files []os.DirEntry
	for _, entry := range entries {
		if entry.IsDir() {
			dirs = append(dirs, entry)
		} else {
			files = append(files, entry)
		}
	}
	// Append processed entries
	processEntry := func(entry os.DirEntry) {
		info, err := entry.Info()
		size := "-"
		icon := "📄"
		if err == nil {
			if entry.IsDir() {
				icon = "📁"
			} else {
				ext := strings.ToLower(filepath.Ext(entry.Name()))
				switch ext {
				case ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico":
					icon = "🖼️"
				case ".mp4", ".mov", ".avi", ".mkv", ".webm":
					icon = "🎬"
				case ".mp3", ".wav", ".ogg", ".flac":
					icon = "🎵"
				case ".pdf":
					icon = "📕"
				case ".zip", ".rar", ".7z", ".tar", ".gz":
					icon = "📦"
				case ".exe", ".msi", ".bat", ".sh":
					icon = "💿"
				case ".txt", ".md", ".json", ".xml", ".yaml", ".css", ".js", ".html", ".go", ".py":
					icon = "📝"
				}
				size = fmt.Sprintf("%.2f KB", float64(info.Size())/1024)
				if info.Size() > 1024*1024 {
					size = fmt.Sprintf("%.2f MB", float64(info.Size())/(1024*1024))
				}
			}
		}
		
		fileList = append(fileList, FileEntry{
			Name:  entry.Name(),
			IsDir: entry.IsDir(),
			Size:  size,
			Icon:  icon,
		})
	}
	
	for _, d := range dirs { processEntry(d) }
	for _, f := range files { processEntry(f) }

	// HTML Template - Modernized
	const tpl = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JustServe - {{.Path}}</title>
    <style>
        :root {
            --bg: #0f172a;
            --card-bg: #1e293b;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --accent: #3b82f6;
            --accent-hover: #2563eb;
            --border: #334155;
            --success: #10b981;
        }
        * { box-sizing: border-box; }
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            background: var(--bg); 
            color: var(--text-primary); 
            margin: 0; 
            padding: 20px; 
            min-height: 100vh;
        }
        .container { 
            max-width: 900px; 
            margin: 0 auto; 
            background: var(--card-bg); 
            padding: 2rem; 
            border-radius: 16px; 
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); 
            border: 1px solid var(--border);
        }
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid var(--border);
            padding-bottom: 1.5rem;
            margin-bottom: 1.5rem;
            flex-wrap: wrap;
            gap: 1rem;
        }
        h1 { 
            font-size: 1.25rem; 
            margin: 0; 
            font-weight: 600; 
            color: var(--text-primary); 
            word-break: break-all;
        }
        .path-badge {
            background: rgba(59, 130, 246, 0.1);
            color: var(--accent);
            padding: 0.25rem 0.75rem;
            border-radius: 8px;
            font-family: monospace;
            font-size: 0.9em;
        }
        .actions {
            display: flex;
            gap: 10px;
        }
        .btn {
            background: var(--accent);
            color: white;
            border: none;
            padding: 0.6rem 1.2rem;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 500;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s ease;
        }
        .btn:hover { background: var(--accent-hover); transform: translateY(-1px); }
        .btn-download { background: #0ea5e9; }
        .btn-download:hover { background: #0284c7; }

        ul { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
        li { 
            padding: 1rem; 
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid transparent;
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            transition: all 0.2s;
        }
        li:hover { 
            background: rgba(255, 255, 255, 0.05); 
            border-color: var(--border);
            transform: translateX(5px);
        }
        .file-info { display: flex; align-items: center; gap: 1rem; flex: 1; min-width: 0; }
        .file-icon { font-size: 1.5rem; }
        .file-name { 
            color: var(--text-primary); 
            text-decoration: none; 
            font-weight: 500; 
            overflow: hidden; 
            text-overflow: ellipsis; 
            white-space: nowrap;
        }
        .file-name:hover { color: var(--accent); }
        .file-meta { 
            color: var(--text-secondary); 
            font-size: 0.85rem; 
            font-variant-numeric: tabular-nums;
            white-space: nowrap;
            margin-left: 1rem;
        }

        .upload-section { 
            margin-top: 2.5rem; 
            padding-top: 2rem; 
            border-top: 1px dashed var(--border); 
        }
        .upload-area {
            border: 2px dashed var(--border);
            border-radius: 12px;
            padding: 2rem;
            text-align: center;
            transition: all 0.2s;
            cursor: pointer;
            position: relative;
        }
        .upload-area:hover { border-color: var(--accent); background: rgba(59, 130, 246, 0.05); }
        .upload-title { font-weight: 600; margin-bottom: 0.5rem; display: block; }
        .upload-desc { font-size: 0.85rem; color: var(--text-secondary); }
        input[type="file"] { 
            position: absolute; 
            inset: 0; 
            opacity: 0; 
            cursor: pointer; 
            width: 100%; 
            height: 100%; 
        }
        .upload-btn-submit {
            margin-top: 1rem;
            width: 100%;
            justify-content: center;
        }
        @media (max-width: 600px) {
            .container { padding: 1.5rem; }
            li { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
            .file-meta { margin-left: auto; width: 100%; text-align: right; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.5rem; }
            header { flex-direction: column; align-items: flex-start; }
            .actions { width: 100%; }
            .btn { flex: 1; justify-content: center; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Current Directory</div>
                <h1><span class="path-badge">{{.Path}}</span></h1>
            </div>
            <div class="actions">
                 <a href="?download=zip" class="btn btn-download">
                    <span>⚡ Download All (.zip)</span>
                </a>
            </div>
        </header>

        <ul>
            {{range .Files}}
            <li>
                <div class="file-info">
                    <span class="file-icon">{{.Icon}}</span>
                    <a href="{{.Name}}{{if .IsDir}}/{{end}}" class="file-name">{{.Name}}</a>
                </div>
                <div class="file-meta">{{.Size}}</div>
            </li>
            {{end}}
        </ul>

        {{if .AllowUpload}}
        <div class="upload-section">
            <form action="{{.Path}}" method="POST" enctype="multipart/form-data">
                <div class="upload-area">
                    <span class="upload-title">📤 Upload File</span>
                    <span class="upload-desc">Drag & drop or click to select a file</span>
                    <input type="file" name="file" onchange="this.form.submit()" required>
                </div>
                <!-- Fallback button if JS doesn't trigger onchange -->
                <noscript>
                    <button type="submit" class="btn upload-btn-submit">Upload Selected File</button>
                </noscript>
            </form>
        </div>
        {{end}}
    </div>
</body>
</html>
`
	t, err := template.New("listing").Parse(tpl)
	if err != nil {
		http.Error(w, "Template error", http.StatusInternalServerError)
		return
	}

	data := struct {
		Path        string
		Files       []FileEntry
		AllowUpload bool
	}{
		Path:        requestPath,
		Files:       fileList,
		AllowUpload: h.allowUpload,
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	t.Execute(w, data)
}

// StartProxy exposes a local port via Ngrok (HTTP) or net.Listen (TCP)
func (a *App) StartProxy(token string, port string, protocol string) (string, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.cancel != nil {
		a.cancel()
	}

	ctx, cancel := context.WithCancel(context.Background())
	a.cancel = cancel

	if protocol == "http" {
		// Use Ngrok for HTTP (Public URL)
		tun, err := ngrok.Listen(ctx,
			config.HTTPEndpoint(),
			ngrok.WithAuthtoken(token),
		)
		if err != nil {
			cancel()
			return "", err
		}

		a.ngrokTunnel = tun
		tunURL := tun.URL()

		go func() {
			targetUrl, _ := url.Parse(fmt.Sprintf("http://localhost:%s", port))
			proxy := httputil.NewSingleHostReverseProxy(targetUrl)
			
			a.server = &http.Server{
				Handler: proxy,
			}
			
			if err := a.server.Serve(tun); err != nil && err != http.ErrServerClosed {
				runtime.EventsEmit(a.ctx, "server-error", err.Error())
			}
		}()

		return tunURL, nil
	} else {
		// Use local net.Listen for TCP (Sidesteps Ngrok Credit Card requirement)
		listener, err := net.Listen("tcp", ":0")
		if err != nil {
			cancel()
			return "", fmt.Errorf("failed to start local TCP listener: %w", err)
		}

		assignedPort := listener.Addr().(*net.TCPAddr).Port
		localIP := getPreferredLocalIP()
		proxyURL := fmt.Sprintf("tcp://%s:%d", localIP, assignedPort)

		go func() {
			<-ctx.Done()
			listener.Close()
		}()

		go func() {
			defer listener.Close()
			for {
				conn, err := listener.Accept()
				if err != nil {
					select {
					case <-ctx.Done():
						return
					default:
						runtime.EventsEmit(a.ctx, "server-error", "Accept error: "+err.Error())
						continue
					}
				}
				go a.handleTCPConnection(conn, port)
			}
		}()

		return proxyURL, nil
	}
}

func (a *App) handleTCPConnection(conn net.Conn, port string) {
	defer conn.Close()

	local, err := net.Dial("tcp", fmt.Sprintf("localhost:%s", port))
	if err != nil {
		return
	}
	defer local.Close()

	// Pipe data with a wait group or channels
	// Simple bidirectional copy
	go io.Copy(local, conn)
	io.Copy(conn, local)
}

// OpenInExplorer opens the OS file explorer at the given path
func (a *App) OpenInExplorer(path string) error {
	var cmd *exec.Cmd
	
	switch stdruntime.GOOS {
	case "windows":
		cmd = exec.Command("explorer", path)
	case "darwin":
		cmd = exec.Command("open", path)
	case "linux":
		cmd = exec.Command("xdg-open", path)
	default:
		return fmt.Errorf("unsupported platform")
	}

	return cmd.Start()
}

// ============================================================
// P2P Direct Transfer Implementation
// ============================================================

// generateTransferCode creates a 6-digit code for easy sharing
func generateTransferCode() string {
	code := rand.Intn(900000) + 100000 // 100000-999999
	return fmt.Sprintf("%d", code)
}

// getPreferredLocalIP returns the best local IP for LAN transfer
func getPreferredLocalIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "localhost"
	}

	var fallbackIP string
	for _, address := range addrs {
		if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				ip := ipnet.IP.String()
				if strings.HasPrefix(ip, "192.168.") || strings.HasPrefix(ip, "10.") {
					return ip
				}
				if fallbackIP == "" {
					fallbackIP = ip
				}
			}
		}
	}
	if fallbackIP != "" {
		return fallbackIP
	}
	return "localhost"
}

// progressWriter wraps an io.Writer to track bytes written
type progressWriter struct {
	writer  io.Writer
	total   int64
	written int64
	onProgress func(written int64)
}

func (pw *progressWriter) Write(p []byte) (int, error) {
	n, err := pw.writer.Write(p)
	pw.written += int64(n)
	if pw.onProgress != nil {
		pw.onProgress(pw.written)
	}
	return n, err
}

// StartP2PSend starts a P2P send server for the given file or folder
func (a *App) StartP2PSend(filePath string) (string, error) {
	a.p2pMu.Lock()
	defer a.p2pMu.Unlock()

	// Stop any existing P2P session
	a.stopP2PInternal()

	// Validate path
	info, err := os.Stat(filePath)
	if err != nil {
		return "", fmt.Errorf("cannot access path: %w", err)
	}

	// Generate a transfer code
	code := generateTransferCode()
	localIP := getPreferredLocalIP()

	// Start listener on random port
	listener, err := net.Listen("tcp", ":0")
	if err != nil {
		return "", fmt.Errorf("failed to start listener: %w", err)
	}

	port := listener.Addr().(*net.TCPAddr).Port
	transferURL := fmt.Sprintf("http://%s:%d", localIP, port)

	a.p2pListener = listener
	a.p2pInfo = &P2PTransferInfo{
		Code:     code,
		URL:      transferURL,
		FilePath: filePath,
		FileName: filepath.Base(filePath),
		FileSize: info.Size(),
		IsDir:    info.IsDir(),
		Status:   "waiting",
	}

	// Create HTTP handler for the transfer
	mux := http.NewServeMux()

	// Info endpoint - returns transfer metadata
	mux.HandleFunc("/p2p/info", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"fileName": a.p2pInfo.FileName,
			"fileSize": a.p2pInfo.FileSize,
			"isDir":    a.p2pInfo.IsDir,
			"code":     a.p2pInfo.Code,
		})
	})

	// Download endpoint
	mux.HandleFunc("/p2p/download", func(w http.ResponseWriter, r *http.Request) {
		a.p2pMu.Lock()
		if a.p2pInfo != nil {
			a.p2pInfo.Status = "transferring"
		}
		a.p2pMu.Unlock()

		runtime.EventsEmit(a.ctx, "p2p-status", "transferring")

		if a.p2pInfo.IsDir {
			// Stream as zip
			w.Header().Set("Content-Type", "application/zip")
			w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.zip"`, a.p2pInfo.FileName))

			pw := &progressWriter{
				writer: w,
				onProgress: func(written int64) {
					a.p2pMu.Lock()
					if a.p2pInfo != nil {
						a.p2pInfo.BytesTransferred = written
					}
					a.p2pMu.Unlock()
					runtime.EventsEmit(a.ctx, "p2p-progress", written)
				},
			}

			zw := zip.NewWriter(pw)
			filepath.WalkDir(filePath, func(path string, d os.DirEntry, err error) error {
				if err != nil {
					return err
				}
				if d.IsDir() {
					return nil
				}
				relPath, err := filepath.Rel(filePath, path)
				if err != nil {
					return err
				}
				relPath = filepath.ToSlash(relPath)
				zipFile, err := zw.Create(relPath)
				if err != nil {
					return err
				}
				fsFile, err := os.Open(path)
				if err != nil {
					return err
				}
				defer fsFile.Close()
				_, err = io.Copy(zipFile, fsFile)
				return err
			})
			zw.Close()
		} else {
			// Send single file
			file, err := os.Open(filePath)
			if err != nil {
				http.Error(w, "Failed to open file", http.StatusInternalServerError)
				return
			}
			defer file.Close()

			w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, a.p2pInfo.FileName))
			w.Header().Set("Content-Type", "application/octet-stream")
			w.Header().Set("Content-Length", fmt.Sprintf("%d", a.p2pInfo.FileSize))

			pw := &progressWriter{
				writer: w,
				total:  a.p2pInfo.FileSize,
				onProgress: func(written int64) {
					a.p2pMu.Lock()
					if a.p2pInfo != nil {
						a.p2pInfo.BytesTransferred = written
					}
					a.p2pMu.Unlock()
					runtime.EventsEmit(a.ctx, "p2p-progress", written)
				},
			}

			io.Copy(pw, file)
		}

		// Mark as completed
		a.p2pMu.Lock()
		if a.p2pInfo != nil {
			a.p2pInfo.Status = "completed"
		}
		a.p2pMu.Unlock()
		runtime.EventsEmit(a.ctx, "p2p-status", "completed")
	})

	// Browser-friendly download page
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		serveP2PDownloadPage(w, a.p2pInfo)
	})

	a.p2pServer = &http.Server{Handler: mux}

	go func() {
		if err := a.p2pServer.Serve(listener); err != nil && err != http.ErrServerClosed {
			runtime.EventsEmit(a.ctx, "p2p-error", err.Error())
		}
	}()

	// Start UDP broadcast for discovery
	go a.startP2PBroadcast(code, transferURL, port)

	// Return info as JSON string
	result, _ := json.Marshal(a.p2pInfo)
	return string(result), nil
}

// startP2PBroadcast broadcasts the transfer info on the LAN for auto-discovery
func (a *App) startP2PBroadcast(code string, transferURL string, port int) {
	addr, err := net.ResolveUDPAddr("udp4", "255.255.255.255:41234")
	if err != nil {
		return
	}

	conn, err := net.DialUDP("udp4", nil, addr)
	if err != nil {
		return
	}

	a.p2pMu.Lock()
	a.p2pUDPConn = conn
	a.p2pMu.Unlock()

	msg := fmt.Sprintf("JUSTSERVE_P2P:%s:%s:%d", code, transferURL, port)

	for {
		a.p2pMu.Lock()
		if a.p2pInfo == nil || a.p2pUDPConn == nil {
			a.p2pMu.Unlock()
			return
		}
		a.p2pMu.Unlock()

		conn.Write([]byte(msg))
		time.Sleep(2 * time.Second)
	}
}

// DiscoverP2PPeers listens for P2P broadcast messages on the LAN
func (a *App) DiscoverP2PPeers(timeoutSeconds int) (string, error) {
	addr, err := net.ResolveUDPAddr("udp4", ":41234")
	if err != nil {
		return "", fmt.Errorf("failed to resolve UDP address: %w", err)
	}

	conn, err := net.ListenUDP("udp4", addr)
	if err != nil {
		return "", fmt.Errorf("failed to listen for broadcasts: %w", err)
	}
	defer conn.Close()

	if timeoutSeconds <= 0 {
		timeoutSeconds = 10
	}
	conn.SetReadDeadline(time.Now().Add(time.Duration(timeoutSeconds) * time.Second))

	var peers []map[string]string
	seen := make(map[string]bool)

	buf := make([]byte, 1024)
	for {
		n, _, err := conn.ReadFromUDP(buf)
		if err != nil {
			break // timeout or error
		}

		msg := string(buf[:n])
		if !strings.HasPrefix(msg, "JUSTSERVE_P2P:") {
			continue
		}

		parts := strings.Split(msg, ":")
		if len(parts) >= 4 {
			code := parts[1]
			// Reconstruct URL (parts[2] has http, parts[3] has //host, parts[4] has port)
			transferURL := parts[2] + ":" + parts[3] + ":" + parts[4]

			if !seen[code] {
				seen[code] = true
				peers = append(peers, map[string]string{
					"code": code,
					"url":  transferURL,
				})
			}
		}
	}

	result, _ := json.Marshal(peers)
	return string(result), nil
}

// ConnectP2P connects to a peer using transfer code and IP address
func (a *App) ConnectP2P(address string) (string, error) {
	// Try to get info from the peer
	resp, err := http.Get(address + "/p2p/info")
	if err != nil {
		return "", fmt.Errorf("cannot connect to peer: %w", err)
	}
	defer resp.Body.Close()

	var info map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return "", fmt.Errorf("invalid response from peer: %w", err)
	}

	result, _ := json.Marshal(info)
	return string(result), nil
}

// StopP2PTransfer stops the current P2P transfer session
func (a *App) StopP2PTransfer() {
	a.p2pMu.Lock()
	defer a.p2pMu.Unlock()
	a.stopP2PInternal()
}

// stopP2PInternal stops P2P transfer without locking
func (a *App) stopP2PInternal() {
	if a.p2pUDPConn != nil {
		a.p2pUDPConn.Close()
		a.p2pUDPConn = nil
	}

	if a.p2pServer != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		a.p2pServer.Shutdown(ctx)
		a.p2pServer = nil
	}

	if a.p2pListener != nil {
		a.p2pListener.Close()
		a.p2pListener = nil
	}

	a.p2pInfo = nil
}

// GetP2PStatus returns the current P2P transfer status
func (a *App) GetP2PStatus() string {
	a.p2pMu.Lock()
	defer a.p2pMu.Unlock()

	if a.p2pInfo == nil {
		return ""
	}

	result, _ := json.Marshal(a.p2pInfo)
	return string(result)
}

// serveP2PDownloadPage serves a beautiful download page for browser-based P2P download
func serveP2PDownloadPage(w http.ResponseWriter, info *P2PTransferInfo) {
	sizeStr := fmt.Sprintf("%.2f MB", float64(info.FileSize)/(1024*1024))
	if info.FileSize < 1024*1024 {
		sizeStr = fmt.Sprintf("%.2f KB", float64(info.FileSize)/1024)
	}
	if info.FileSize > 1024*1024*1024 {
		sizeStr = fmt.Sprintf("%.2f GB", float64(info.FileSize)/(1024*1024*1024))
	}

	typeStr := "File"
	if info.IsDir {
		typeStr = "Folder (ZIP)"
	}

	const tpl = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JustServe - P2P Transfer</title>
    <style>
        :root {
            --bg: #0f172a;
            --card-bg: #1e293b;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --accent: #3b82f6;
            --accent-hover: #2563eb;
            --border: #334155;
            --success: #10b981;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: var(--bg);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 24px;
            padding: 3rem;
            max-width: 480px;
            width: 100%;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4);
        }
        .logo { font-size: 1.5rem; font-weight: 800; margin-bottom: 2rem; }
        .logo span { color: var(--accent); }
        .icon-wrap {
            width: 80px; height: 80px;
            border-radius: 20px;
            background: rgba(59, 130, 246, 0.1);
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 1.5rem;
            font-size: 2.5rem;
        }
        h1 { font-size: 1.5rem; margin-bottom: 0.5rem; word-break: break-all; }
        .meta {
            color: var(--text-secondary);
            font-size: 0.9rem;
            margin-bottom: 2rem;
        }
        .meta span {
            display: inline-block;
            background: rgba(255,255,255,0.05);
            padding: 0.25rem 0.75rem;
            border-radius: 8px;
            margin: 0.25rem;
        }
        .code {
            font-family: monospace;
            font-size: 2rem;
            letter-spacing: 0.5rem;
            color: var(--accent);
            background: rgba(59,130,246,0.1);
            padding: 0.75rem 1.5rem;
            border-radius: 12px;
            display: inline-block;
            margin-bottom: 2rem;
        }
        .btn {
            display: block;
            width: 100%;
            padding: 1rem;
            background: var(--accent);
            color: white;
            text-decoration: none;
            border-radius: 16px;
            font-weight: 700;
            font-size: 1.1rem;
            transition: all 0.2s;
        }
        .btn:hover {
            background: var(--accent-hover);
            transform: translateY(-2px);
            box-shadow: 0 10px 25px -5px rgba(59,130,246,0.4);
        }
        .progress { display: none; margin-top: 1.5rem; }
        .progress-bar {
            height: 6px;
            background: var(--border);
            border-radius: 3px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background: var(--accent);
            border-radius: 3px;
            width: 0%;
            transition: width 0.3s;
        }
        .footer {
            margin-top: 2rem;
            color: var(--text-secondary);
            font-size: 0.8rem;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">Just<span>Serve</span></div>
        <div class="icon-wrap">{{if .IsDir}}📁{{else}}📄{{end}}</div>
        <h1>{{.FileName}}</h1>
        <div class="meta">
            <span>{{.TypeStr}}</span>
            <span>{{.SizeStr}}</span>
        </div>
        <div class="code">{{.Code}}</div>
        <a href="/p2p/download" class="btn" id="downloadBtn">⬇ Download Now</a>
        <div class="progress" id="progress">
            <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
        </div>
        <div class="footer">Served via JustServe P2P Direct Transfer</div>
    </div>
</body>
</html>`

	t, _ := template.New("p2p").Parse(tpl)
	data := struct {
		FileName string
		SizeStr  string
		TypeStr  string
		Code     string
		IsDir    bool
	}{
		FileName: info.FileName,
		SizeStr:  sizeStr,
		TypeStr:  typeStr,
		Code:     info.Code,
		IsDir:    info.IsDir,
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	t.Execute(w, data)
}
