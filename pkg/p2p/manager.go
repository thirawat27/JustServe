package p2p

import (
	"archive/zip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
	"html/template"

	"JustServe/pkg/utils"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// TransferInfo holds the state of a P2P transfer session
type TransferInfo struct {
	Code             string `json:"code"`
	URL              string `json:"url"`
	FilePath         string `json:"filePath"`
	FileName         string `json:"fileName"`
	FileSize         int64  `json:"fileSize"`
	IsDir            bool   `json:"isDir"`
	Status           string `json:"status"` // "waiting" | "transferring" | "completed" | "error"
	BytesTransferred int64  `json:"bytesTransferred"`
}

type Manager struct {
	ctx      context.Context
	info     *TransferInfo
	server   *http.Server
	listener net.Listener
	udpConn  *net.UDPConn
	mu       sync.Mutex
}

func NewManager() *Manager {
	return &Manager{}
}

func (m *Manager) SetContext(ctx context.Context) {
	m.ctx = ctx
}

func (m *Manager) GetStatus() string {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.info == nil {
		return ""
	}

	result, _ := json.Marshal(m.info)
	return string(result)
}

// GenerateTransferCode creates a 6-digit code for easy sharing
func GenerateTransferCode() string {
	code := rand.Intn(900000) + 100000 // 100000-999999
	return fmt.Sprintf("%d", code)
}

// StopTransfer stops the current P2P transfer session
func (m *Manager) StopTransfer() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.stopInternal()
}

func (m *Manager) stopInternal() {
	if m.udpConn != nil {
		m.udpConn.Close()
		m.udpConn = nil
	}

	if m.server != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		m.server.Shutdown(ctx)
		m.server = nil
	}

	if m.listener != nil {
		m.listener.Close()
		m.listener = nil
	}

	m.info = nil
}

// StartSend starts a P2P send server for the given file or folder
func (m *Manager) StartSend(filePath string) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Stop any existing P2P session
	m.stopInternal()

	// Validate path
	info, err := os.Stat(filePath)
	if err != nil {
		return "", fmt.Errorf("cannot access path: %w", err)
	}

	// Generate a transfer code
	code := GenerateTransferCode()
	localIP := utils.GetPreferredLocalIP()

	// Start listener on random port
	listener, err := net.Listen("tcp", ":0")
	if err != nil {
		return "", fmt.Errorf("failed to start listener: %w", err)
	}

	port := listener.Addr().(*net.TCPAddr).Port
	transferURL := fmt.Sprintf("http://%s:%d", localIP, port)

	m.listener = listener
	m.info = &TransferInfo{
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
			"fileName": m.info.FileName,
			"fileSize": m.info.FileSize,
			"isDir":    m.info.IsDir,
			"code":     m.info.Code,
		})
	})

	// Download endpoint
	mux.HandleFunc("/p2p/download", func(w http.ResponseWriter, r *http.Request) {
		m.mu.Lock()
		if m.info != nil {
			m.info.Status = "transferring"
		}
		m.mu.Unlock()

		if m.ctx != nil {
			runtime.EventsEmit(m.ctx, "p2p-status", "transferring")
		}

		if m.info.IsDir {
			// Stream as zip
			w.Header().Set("Content-Type", "application/zip")
			w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.zip"`, m.info.FileName))

			pw := &progressWriter{
				writer: w,
				onProgress: func(written int64) {
					m.mu.Lock()
					if m.info != nil {
						m.info.BytesTransferred = written
					}
					m.mu.Unlock()
					if m.ctx != nil {
						runtime.EventsEmit(m.ctx, "p2p-progress", written)
					}
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

			w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, m.info.FileName))
			w.Header().Set("Content-Type", "application/octet-stream")
			w.Header().Set("Content-Length", fmt.Sprintf("%d", m.info.FileSize))

			pw := &progressWriter{
				writer: w,
				total:  m.info.FileSize,
				onProgress: func(written int64) {
					m.mu.Lock()
					if m.info != nil {
						m.info.BytesTransferred = written
					}
					m.mu.Unlock()
					if m.ctx != nil {
						runtime.EventsEmit(m.ctx, "p2p-progress", written)
					}
				},
			}

			io.Copy(pw, file)
		}

		// Mark as completed
		m.mu.Lock()
		if m.info != nil {
			m.info.Status = "completed"
		}
		m.mu.Unlock()
		if m.ctx != nil {
			runtime.EventsEmit(m.ctx, "p2p-status", "completed")
		}
	})

	// Browser-friendly download page
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		ServeP2PDownloadPage(w, m.info)
	})

	m.server = &http.Server{Handler: mux}

	go func() {
		if err := m.server.Serve(listener); err != nil && err != http.ErrServerClosed {
			if m.ctx != nil {
				runtime.EventsEmit(m.ctx, "p2p-error", err.Error())
			}
		}
	}()

	// Start UDP broadcast for discovery
	go m.startBroadcast(code, transferURL, port)

	// Return info as JSON string
	result, _ := json.Marshal(m.info)
	return string(result), nil
}

func (m *Manager) startBroadcast(code string, transferURL string, port int) {
	addr, err := net.ResolveUDPAddr("udp4", "255.255.255.255:41234")
	if err != nil {
		return
	}

	conn, err := net.DialUDP("udp4", nil, addr)
	if err != nil {
		return
	}

	m.mu.Lock()
	m.udpConn = conn
	m.mu.Unlock()

	msg := fmt.Sprintf("JUSTSERVE_P2P:%s:%s:%d", code, transferURL, port)

	for {
		m.mu.Lock()
		if m.info == nil || m.udpConn == nil {
			m.mu.Unlock()
			return
		}
		m.mu.Unlock()

		conn.Write([]byte(msg))
		time.Sleep(2 * time.Second)
	}
}

// DiscoverPeers listens for P2P broadcast messages on the LAN
func (m *Manager) DiscoverPeers(timeoutSeconds int) (string, error) {
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

// ConnectToPeer connects to a peer using transfer code and IP address
func (m *Manager) ConnectToPeer(address string) (string, error) {
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

// progressWriter wraps an io.Writer to track bytes written
type progressWriter struct {
	writer     io.Writer
	total      int64
	written    int64
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

// ServeP2PDownloadPage serves a beautiful download page for browser-based P2P download
func ServeP2PDownloadPage(w http.ResponseWriter, info *TransferInfo) {
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
