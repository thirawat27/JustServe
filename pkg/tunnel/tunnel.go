package tunnel

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"

	"golang.ngrok.com/ngrok"
	"golang.ngrok.com/ngrok/config"
)

// StartNgrokTunnel creates an HTTP tunnel with Ngrok
func StartNgrokTunnel(ctx context.Context, token string) (ngrok.Tunnel, error) {
	tun, err := ngrok.Listen(ctx,
		config.HTTPEndpoint(),
		ngrok.WithAuthtoken(token),
	)
	if err != nil {
		return nil, err
	}
	return tun, nil
}

// CreateProxyHandler returns a reverse proxy handler for the target URL
func CreateProxyHandler(target string) (*http.Server, error) {
	targetUrl, err := url.Parse(target)
	if err != nil {
		return nil, err
	}
	proxy := httputil.NewSingleHostReverseProxy(targetUrl)
	server := &http.Server{
		Handler: proxy,
	}
	return server, nil
}

// HandleTCPConnection copies data between the incoming connection and local port
func HandleTCPConnection(conn net.Conn, localPort string) {
	defer conn.Close()

	local, err := net.Dial("tcp", fmt.Sprintf("localhost:%s", localPort))
	if err != nil {
		fmt.Printf("Failed to dial local port %s: %v\n", localPort, err)
		return
	}
	defer local.Close()

	// Pipe data bidirectionally
	go func() {
		defer local.Close()
		defer conn.Close()
		io.Copy(local, conn)
	}()
	io.Copy(conn, local)
}
