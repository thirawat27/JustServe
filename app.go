package main

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os/exec"
	stdruntime "runtime"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"golang.ngrok.com/ngrok"

	"JustServe/pkg/p2p"
	"JustServe/pkg/server"
	"JustServe/pkg/tunnel"
	"JustServe/pkg/update"
	"JustServe/pkg/utils"
)

// App struct
type App struct {
	ctx         context.Context
	server      *http.Server
	ngrokTunnel ngrok.Tunnel
	mu          sync.Mutex // Mutex for state management
	isQuitting  bool       // Flag to determine if we are really quitting or just minimizing
	cancel      context.CancelFunc

	// P2P Manager
	p2pManager *p2p.Manager
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		p2pManager: p2p.NewManager(),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	// Pass context to P2P manager
	a.p2pManager.SetContext(ctx)
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
	handler := server.NewFileHandler(path, password, allowUpload)

	// Create listener first to get the actual port (in case of 0)
	// Ensure port starts with :
	if !strings.HasPrefix(port, ":") {
		port = ":" + port
	}

	listener, err := net.Listen("tcp", port)
	if err != nil {
		// Try to find a better error message or recovery?
		// For now return error
		return "", fmt.Errorf("failed to listen on port %s: %w", port, err)
	}

	// Create server
	a.server = &http.Server{Handler: handler}

	// Get preferred local IP for display
	localIP := utils.GetPreferredLocalIP()

	// We need to get the actual port if ":0" was used, though here 'port' might be fixed?
	// listener.Addr() ensures we get the real port
	actualPort := listener.Addr().(*net.TCPAddr).Port
	url := fmt.Sprintf("http://%s:%d", localIP, actualPort)

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

	// Start ngrok tunnel using pkg/tunnel helper
	// We use a background context for the tunnel itself so it doesn't die if the request context cancels (though wails calls are one-off?)
	// Actually, keeping it simple with context.Background() is safer for persistence until StopServer is called.
	tun, err := tunnel.StartNgrokTunnel(context.Background(), token)
	if err != nil {
		return "", fmt.Errorf("failed to start ngrok tunnel: %w", err)
	}

	a.ngrokTunnel = tun

	// Start file server on the tunnel
	handler := server.NewFileHandler(path, password, allowUpload)
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
	return utils.GetAllLocalIPs()
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
func (a *App) CheckUpdate() (*update.Info, error) {
	return update.CheckUpdate()
}

// InstallUpdate downloads and applies the update
func (a *App) InstallUpdate(url string) (string, error) {
	return update.InstallUpdate(url)
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
		tun, err := tunnel.StartNgrokTunnel(ctx, token)
		if err != nil {
			cancel()
			return "", err
		}

		a.ngrokTunnel = tun
		tunURL := tun.URL()

		go func() {
			target := fmt.Sprintf("http://localhost:%s", port)
			server, err := tunnel.CreateProxyHandler(target)
			if err != nil {
				runtime.EventsEmit(a.ctx, "server-error", err.Error())
				return
			}
			
			a.server = server
			
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
		localIP := utils.GetPreferredLocalIP()
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
				go tunnel.HandleTCPConnection(conn, port)
			}
		}()

		return proxyURL, nil
	}
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
// P2P Direct Transfer Implementation (Delegated to P2P Manager)
// ============================================================

// StartP2PSend starts a P2P send server for the given file or folder
func (a *App) StartP2PSend(filePath string) (string, error) {
	// Delegate to P2P manager
	return a.p2pManager.StartSend(filePath)
}

// DiscoverP2PPeers listens for P2P broadcast messages on the LAN
func (a *App) DiscoverP2PPeers(timeoutSeconds int) (string, error) {
	return a.p2pManager.DiscoverPeers(timeoutSeconds)
}

// ConnectP2P connects to a peer using transfer code and IP address
func (a *App) ConnectP2P(address string) (string, error) {
	return a.p2pManager.ConnectToPeer(address)
}

// StopP2PTransfer stops the current P2P transfer session
func (a *App) StopP2PTransfer() {
	a.p2pManager.StopTransfer()
}

// GetP2PStatus returns the current P2P transfer status
func (a *App) GetP2PStatus() string {
	return a.p2pManager.GetStatus()
}
