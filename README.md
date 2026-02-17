# JustServe 🚀
> **Universal Localhost Exposer, File Server & P2P Transfer**  
> Instantly share files, expose local services, or transfer data directly between devices.

[![Go](https://img.shields.io/badge/Backend-Go-blue.svg)](https://golang.org/)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB.svg)](https://reactjs.org/)
[![Wails](https://img.shields.io/badge/Powered%20by-Wails-red.svg)](https://wails.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)]()

JustServe is a versatile, all-in-one tool designed for developers and power users. Whether you need to quickly share a file, host a static website, transfer files directly between PCs, or open a tunnel to your local server, JustServe handles it with a beautiful modern interface.

---

## ✨ Key Features

- **📂 Instant File Sharing**: Serve directories or single files over HTTP (Local/Public).
- **🚀 P2P Direct Transfer**: Direct device-to-device transfer using a simple 6-digit code. No cloud middleman.
- **🌐 Smart Proxying**: 
  - **HTTP**: Expose web apps with a public Ngrok URL.
  - **TCP**: Local port forwarding via Go `net` library (Bypasses Ngrok credit card requirement).
- **🔄 Auto-Updater**: Stay up-to-date with one click. Built-in GitHub Release integration.
- **🌍 Multi-language**: Fully localized in **English**, **Thai (ไทย)**, and **Chinese (中文)**.
- **🔒 Security First**: Optional password protection and auto-discovery toggle.
- **🎨 Premium UI**: Sleek dark/light mode with glassmorphism effects and real-time logs.

---

### 🛠️ Tech Stack & Architecture

We leverage a modern hybrid stack to deliver a native desktop experience:

*   **Backend**: [Go (Golang)](https://go.dev/) — Core logic, networking, and P2P handling.
*   **Frontend**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) — High-performance UI.
*   **Desktop Engine**: [Wails v2](https://wails.io/) — Native bridge between Go and JS.
*   **Tunneling**: Native [Ngrok](https://github.com/ngrok/ngrok-go) integration.
*   **Update System**: [minio/selfupdate](https://github.com/minio/selfupdate) for seamless binary replacement.

---

### 📥 Installation & Usage

#### Download Pre-built Binary
Go to the [Releases Page](https://github.com/thirawat27/JustServe/releases) and download `JustServe.exe`.

#### Build from Source
**Prerequisites:** Go 1.21+, Node.js 18+, Wails CLI.

```bash
# 1. Clone & Setup
git clone https://github.com/thirawat27/JustServe.git
cd JustServe/frontend && npm install && cd ..

# 2. Run Dev
wails dev

# 3. Build Production
wails build
```

---

### 📖 User Guide

1.  **File Server**: Choose a folder/file -> Select **Local** (LAN) or **Public** (Ngrok) -> Launch!
2.  **Port Forward**: Enter target port -> Choose **HTTP** (Public link) or **TCP** (Local IP) -> Start Proxy.
3.  **P2P Transfer**:
    *   **Sender**: Drag & drop file -> Share the 6-digit code.
    *   **Receiver**: Enter code -> High-speed direct download.
4.  **Settings**: Toggle Theme, change Language, or **Check for Updates** in the software update section.

---

### 👨‍💻 Credits

**Created by**: [Thirawat27](https://github.com/Thirawat27)  
**License**: MIT License
