package server

import (
	"archive/zip"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"html/template"
	"embed"
)

//go:embed templates/*.html
var templateFS embed.FS

type FileHandler struct {
	root        string
	isFile      bool
	password    string
	allowUpload bool
	fileServer  http.Handler
}

func NewFileHandler(root string, password string, allowUpload bool) *FileHandler {
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

	return &FileHandler{
		root:        root,
		isFile:      isFile,
		password:    password,
		allowUpload: allowUpload,
		fileServer:  fs,
	}
}

func (h *FileHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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

func (h *FileHandler) handleUpload(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form
	// Limit upload size to 10GB (arbitrary large limit)
	err := r.ParseMultipartForm(10 << 30) // 10 GB
	if err != nil {
		http.Error(w, "Error parsing form: "+err.Error(), http.StatusBadRequest)
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

func (h *FileHandler) streamZip(w http.ResponseWriter, dirPath string, dirName string) {
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

func (h *FileHandler) serveSingleFilePage(w http.ResponseWriter, path string) {
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
	var t *template.Template
	var errTmp error
	if t, errTmp = template.ParseFS(templateFS, "templates/single_file.html"); errTmp != nil {
		http.Error(w, "Template error: " + errTmp.Error(), http.StatusInternalServerError)
		return
	}
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

func (h *FileHandler) serveDirectory(w http.ResponseWriter, requestPath string, fsPath string) {
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
	var t *template.Template
	var errTmp error
	if t, errTmp = template.ParseFS(templateFS, "templates/directory_listing.html"); errTmp != nil {
		http.Error(w, "Template error: " + errTmp.Error(), http.StatusInternalServerError)
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
