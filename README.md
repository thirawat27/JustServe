# ⚡ JustServe
> **The instant, zero-configuration file server for everyone.**

[![Go](https://img.shields.io/badge/Backend-Go-blue.svg)](https://golang.org/)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB.svg)](https://reactjs.org/)
[![Wails](https://img.shields.io/badge/Powered%20by-Wails-red.svg)](https://wails.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)]()
[![Build Status](https://img.shields.io/github/actions/workflow/status/Thirawat27/JustServe/release.yml)](https://github.com/Thirawat27/JustServe/actions)
[![Latest Release](https://img.shields.io/github/v/release/Thirawat27/JustServe)](https://github.com/Thirawat27/JustServe/releases)

JustServe transforms your computer into a powerful, instant file server. Share files, host static sites, or receive uploads from anyone, anywhere—whether they're on your local Wi-Fi or across the globe. No command line required.

---

### ✨ Key Features

*   **⚡ Instant Local Sharing**: Host files on your Local Area Network (LAN) with one click. Ideal for transferring photos to your phone without cables.
*   **🌍 World-Wide Access**: Built-in **Ngrok Tunneling** creates a secure, public HTTPS URL instantly. Share files with friends anywhere in the world.
*   **🔒 Secure & Private**: Optional **Password Protection** ensures only authorized users can access your files.
*   **📤 Two-Way Transfer**: Enable **Upload Mode** to let others send files directly to your computer.
*   **📱 QR Code Integration**: Scan to connect. No need to type lengthy IP addresses or URLs.
*   **🎨 Stunning UI**: A modern, "Cosmic Glass" aesthetic designed for clarity and ease of use.
*   **🚀 High Performance**: Built with **Go** for blazing-fast file serving and low resource usage.

---

### 🛠️ Tech Stack & Architecture

We leverage a modern hybrid stack to deliver a native desktop experience with web technologies:

*   **Backend**: [Go (Golang)](https://go.dev/) — Handles the core HTTP server, file system operations, and networking logic.
*   **Frontend**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) — dynamic user interface.
*   **Styling**: [TailwindCSS](https://tailwindcss.com/) — Utility-first CSS framework with custom glassmorphism utilities.
*   **Desktop Engine**: [Wails v2](https://wails.io/) — Bridges Go and frontend, compiling into a single lightweight binary.
*   **Tunneling**: [ngrok-go](https://github.com/ngrok/ngrok-go) — Native integration for secure tunnels without external binaries.

---

### � Installation

#### Download Pre-built Binary
Go to the [Releases Page](https://github.com/Thirawat27/JustServe/releases) and download the version for your OS (Windows, macOS, or Linux).

#### Build from Source

**Prerequisites:**
*   [Go 1.21+](https://go.dev/dl/)
*   [Node.js 18+](https://nodejs.org/)
*   [Wails CLI](https://wails.io/docs/gettingstarted/installation): `go install github.com/wailsapp/wails/v2/cmd/wails@latest`

**Setup:**
```bash
# 1. Clone the repository
git clone https://github.com/Thirawat27/JustServe.git
cd JustServe

# 2. Install frontend dependencies
cd frontend
npm install
cd ..

# 3. Run in Development Mode (Hot Reload)
wails dev
```

**Build for Production:**
```bash
wails build
```
The executable will be generated in the `build/bin` directory.

---

### 📖 User Guide

1.  **Select a Folder**: Click the folder icon to choose the directory you want to serve.
2.  **Choose Mode**:
    *   **Local Network**: Uses your machine's IP. Only accessible to devices on the same Wi-Fi/LAN.
    *   **Public URL**: Generates a secure `https://...` link accessible from anywhere. *(Requires a free Ngrok Authtoken)*.
3.  **Configure (Optional)**:
    *   **Password Protection**: Set a password to restrict access.
    *   **Upload Mode**: Allow visitors to upload files to your folder.
4.  **Start Server**: Click the large **Launch** button.
5.  **Share**: Use the displayed **QR Code** or copy the link to share with others.

---

### 🤖 CI/CD Automation

This project uses **GitHub Actions** for automated builds and releases.
*   **Trigger**: Pushing a tag starting with `v` (e.g., `v1.0.0`).
*   **Action**: Automatically builds binaries for Windows, macOS, and Linux, and publishes them to GitHub Releases.

To create a new release:
```bash
git tag v1.0.1
git push origin v1.0.1
```

---

### 👨‍💻 Credits

**Created by**: [Thirawat27](https://github.com/Thirawat27)
**License**: MIT License

---

### 🔮 Roadmap

- [x] **v1.0.0**: Initial Release (Local/Public Serving, QR Codes)
- [x] **v1.1.0**: Password Protection & File Uploads
- [x] **v1.2.0**: UI Overhaul (Cosmic Glass Theme)
- [ ] **v1.3.0**: Drag-and-drop file sharing (Single file mode)
- [ ] **v1.4.0**: Dark/Light mode toggle
- [ ] **v2.0.0**: P2P Direct Transfer (WebRTC)