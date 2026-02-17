package utils

import (
	"net"
	"strings"
)

// GetPreferredLocalIP returns the best local IP for LAN transfer
// Prefers 192.168.x.x or 10.x.x.x
func GetPreferredLocalIP() string {
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

// GetAllLocalIPs returns all non-loopback IPv4 addresses
func GetAllLocalIPs() ([]string, error) {
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
