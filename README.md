# JustServe 🚀
> **Universal Localhost Exposer & File Server**  
> Instantly share files or expose local services (Minecraft, Web Apps) to the world.

[![Go](https://img.shields.io/badge/Backend-Go-blue.svg)](https://golang.org/)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB.svg)](https://reactjs.org/)
[![Wails](https://img.shields.io/badge/Powered%20by-Wails-red.svg)](https://wails.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)]()

JustServe is a versatile, all-in-one tool designed for developers and gamers. Whether you need to quickly share a file, host a static website, or open a tunnel to your local Minecraft server, JustServe handles it with a beautiful "Cosmic Glass" interface.

---

## ✨ Key Features

- **📂 Instant File Sharing**: Serve directories or single files over HTTP.
- **🌐 Public Tunneling**: Expose your localhost to the internet via secure Ngrok tunnels.
- **🔌 Port Forwarding**: Tunnel any TCP/HTTP traffic (e.g., Minecraft, React Apps, C++ Servers).
- **🔒 Security First**: Optional password protection and granular access control.
- **⚡ High Performance**: Built with Go for the backend and React for the frontend.
- **🎨 Modern UI**: Beautiful glassmorphism aesthetic with Dark/Light mode.
- **🐈‍⬛ CI/CD Automated**: Built-in GitHub Actions for automated releases.

---

### 🛠️ Tech Stack & Architecture

We leverage a modern hybrid stack to deliver a native desktop experience with web technologies:

*   **Backend**: [Go (Golang)](https://go.dev/) — Handles the core HTTP server, file system operations, and networking logic.
*   **Frontend**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) — dynamic user interface.
*   **Styling**: [TailwindCSS](https://tailwindcss.com/) — Utility-first CSS framework with custom glassmorphism utilities.
*   **Desktop Engine**: [Wails v2](https://wails.io/) — Bridges Go and frontend, compiling into a single lightweight binary.
*   **Tunneling**: [ngrok-go](https://github.com/ngrok/ngrok-go) — Native integration for secure tunnels without external binaries.

---

###  Installation

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

### 👨‍💻 Credits

**Created by**: [Thirawat27](https://github.com/Thirawat27)
**License**: MIT License
