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
)

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
