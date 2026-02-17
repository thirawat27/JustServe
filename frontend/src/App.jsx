import { useState, useEffect, useRef, useCallback } from 'react';
import './style.css';
import { SelectFolder, SelectFile, StartLocalServer, StartPublicServer, StopServer, GetLocalIPs, StartProxy, OpenInExplorer, StartP2PSend, StopP2PTransfer, ConnectP2P, DiscoverP2PPeers, GetP2PStatus, CheckUpdate, InstallUpdate, GetAppVersion } from '../wailsjs/go/main/App';
import * as runtime from '../wailsjs/runtime/runtime';
import QRCode from 'react-qr-code';
import {
    FolderOpen, Settings, Copy, Globe, Wifi, Play, Square,
    Loader2, ArrowRight, Shield, CheckCircle2, UploadCloud,
    Terminal, Zap, Server, MonitorSmartphone, FileText,
    Sun, Moon, Share2, Network, Home, Info, X, Pause, RefreshCw, LifeBuoy,
    Send, Download, Radio, Link2, Hash, ArrowUpCircle, ArrowDownCircle,
    Radar, Eye, Search
} from 'lucide-react';
import Logo from './components/Logo';
import { ToastProvider, useToast } from './components/Toast';

const translations = {
    en: {
        server: "File Server",
        proxy: "Port Forward",
        p2p: "P2P Transfer",
        settings: "Settings",
        about: "About",
        status_online: "System Online",
        status_idle: "System Idle",
        mode_local: "Local Network",
        mode_public: "Public Internet",
        source_content: "Source Content",
        select_folder: "Folder",
        select_file: "File",
        open_explorer: "Open in Explorer",
        network_mode: "Network Mode",
        port_config: "Port Configuration",
        security_options: "Security & Options",
        password_protection: "Password Protection",
        allow_uploads: "Allow File Uploads",
        start_server: "Start Server",
        stop_server: "Stop Server",
        local_service: "Local Service",
        ngrok_config: "Ngrok Configuration",
        transfer_mode: "Transfer Mode",
        send: "Send",
        receive: "Receive",
        select_content_share: "Select Content to Share",
        how_it_works: "How it works",
        step1: "1. Select file or folder",
        step2: "2. Share the 6-digit code",
        step3: "3. Direct device-to-device transfer",
        start_sharing: "Start Sharing",
        stop_sharing: "Stop Sharing",
        connect_sender: "Connect to Sender",
        auto_discover: "Auto-Discover on LAN",
        discover_peers: "Discover Peers",
        scanning: "Scanning network...",
        connect_btn: "Connect to Sender",
        connected_peer: "Connected to Peer",
        download_now: "Download Now",
        view_page: "View Page",
        back: "Back",
        global_settings: "Global Settings",
        ngrok_token: "Ngrok Authtoken (Global)",
        language: "Language",
        theme: "Theme",
        appearance: "Appearance",
        appearance_desc: "Customize the look and feel of the application",
        light_mode: "Light Mode",
        dark_mode: "Dark Mode",
        integration: "Integration",
        integration_desc: "Manage API Keys and external connections",
        ngrok_token_placeholder: "Enter your Ngrok Authtoken...",
        ngrok_token_help: "This token is required to expose your services to the public internet. You can get a token at ngrok.com",
        advanced: "Advanced",
        advanced_desc: "Options for advanced users",
        auto_start: "Auto Start",
        auto_start_desc: "Start server when app launches",
        reset_settings: "Reset Settings",
        reset_settings_desc: "Return to default values",
        reset: "Reset",
        help: "Help",
        system_logs: "System Logs",
        active_connection: "Active Connection",
        copy_url: "Copy URL",
        open_browser: "Open in Browser",
        desc_serve: "Host files and folders on your local network or public internet.",
        desc_proxy: "Expose localhost ports to the public internet securely.",
        desc_p2p: "Direct device-to-device file transfer.",
        desc_settings: "Configure application preferences.",
        desc_about: "Learn more about JustServe.",
        version: "Version",
        about_text: "A simple, powerful, and secure file sharing utility for developers and power users. Built with Wails, Go, and React.",
        created_by: "Created by",
        waiting_events: "Waiting for events...",
        scan_qr: "Scan QR Code",
        transfer_details: "Transfer Details",
        name: "Name",
        size: "Size",
        url: "URL",
        open: "Open",
        copy_code: "Copy Code",
        progress: "Progress",
        transfer_completed: "Transfer completed successfully!",
        waiting_receiver: "Waiting for receiver...",
        transferring: "Transferring...",
        transfer_completed_title: "Transfer Completed",
        share_code_msg: "Share this code with the receiver",
        software_update: "Software Update",
        software_update_desc: "Check for the latest version of JustServe",
        up_to_date: "Up to Date",
        update_available: "Update Available",
        current_version: "Current Version",
        check_for_updates: "Check for Updates"
    },
    th: {
        server: "ไฟล์เซิร์ฟเวอร์",
        proxy: "พอร์ตฟอร์เวิร์ด",
        p2p: "โอนย้ายไฟล์ P2P",
        settings: "ตั้งค่า",
        about: "เกี่ยวกับ",
        status_online: "ระบบออนไลน์",
        status_idle: "ระบบว่าง",
        mode_local: "เครือข่ายภายใน",
        mode_public: "อินเทอร์เน็ตสาธารณะ",
        source_content: "เนื้อหาต้นทาง",
        select_folder: "เลือกโฟลเดอร์",
        select_file: "เลือกไฟล์",
        open_explorer: "เปิดใน Explorer",
        network_mode: "โหมดเครือข่าย",
        port_config: "การกำหนดค่าพอร์ต",
        security_options: "ความปลอดภัย & ตัวเลือก",
        password_protection: "ป้องกันด้วยรหัสผ่าน",
        allow_uploads: "อนุญาตให้อัปโหลดไฟล์",
        start_server: "เริ่มเซิร์ฟเวอร์",
        stop_server: "หยุดเซิร์ฟเวอร์",
        local_service: "บริการภายในเครื่อง",
        ngrok_config: "การตั้งค่า Ngrok",
        transfer_mode: "โหมดการโอนย้าย",
        send: "ส่งไฟล์",
        receive: "รับไฟล์",
        select_content_share: "เลือกเนื้อหาที่จะแบ่งปัน",
        how_it_works: "วิธีการใช้งาน",
        step1: "1. เลือกไฟล์หรือโฟลเดอร์",
        step2: "2. แชร์รหัส 6 หลัก",
        step3: "3. โอนย้ายระหว่างอุปกรณ์โดยตรง",
        start_sharing: "เริ่มการแบ่งปัน",
        stop_sharing: "หยุดการแบ่งปัน",
        connect_sender: "เชื่อมต่อกับผู้ส่ง",
        auto_discover: "ค้นหาอัตโนมัติใน LAN",
        discover_peers: "ค้นหาอุปกรณ์",
        scanning: "กำลังสแกนเครือข่าย...",
        connect_btn: "เชื่อมต่อ",
        connected_peer: "เชื่อมต่อกับอุปกรณ์แล้ว",
        download_now: "ดาวน์โหลดทันที",
        view_page: "ดูหน้าเว็บ",
        back: "กลับ",
        global_settings: "การตั้งค่าทั่วไป",
        ngrok_token: "Ngrok Authtoken (Global)",
        language: "ภาษา",
        theme: "ธีม",
        appearance: "การแสดงผล",
        appearance_desc: "ปรับแต่งรูปลักษณ์ของแอปพลิเคชัน",
        light_mode: "โหมดสว่าง",
        dark_mode: "โหมดมืด",
        integration: "การเชื่อมต่อ",
        integration_desc: "จัดการ API Keys และการเชื่อมต่อภายนอก",
        ngrok_token_placeholder: "ใส่ Ngrok Authtoken ของคุณ...",
        ngrok_token_help: "Token นี้จำเป็นสำหรับการเปิดเผยบริการของคุณสู่อินเทอร์เน็ตสาธารณะ คุณสามารถรับ token ได้ที่ ngrok.com",
        advanced: "ขั้นสูง",
        advanced_desc: "ตัวเลือกสำหรับผู้ใช้ขั้นสูง",
        auto_start: "เริ่มต้นอัตโนมัติ",
        auto_start_desc: "เปิดเซิร์ฟเวอร์เมื่อเปิดแอป",
        reset_settings: "รีเซ็ตการตั้งค่า",
        reset_settings_desc: "กลับไปยังค่าเริ่มต้น",
        reset: "รีเซ็ต",
        help: "ช่วยเหลือ",
        system_logs: "บันทึกระบบ",
        active_connection: "การเชื่อมต่อที่ใช้งานอยู่",
        copy_url: "คัดลอก URL",
        open_browser: "เปิดในเบราว์เซอร์",
        desc_serve: "โฮสต์ไฟล์และโฟลเดอร์บนเครือข่ายภายในหรืออินเทอร์เน็ตสาธารณะ",
        desc_proxy: "เปิดเผยพอร์ต localhost สู่อินเทอร์เน็ตสาธารณะอย่างปลอดภัย",
        desc_p2p: "การโอนย้ายไฟล์ระหว่างอุปกรณ์โดยตรง",
        desc_settings: "กำหนดค่าการใช้งานแอปพลิเคชัน",
        desc_about: "เรียนรู้เพิ่มเติมเกี่ยวกับ JustServe",
        version: "เวอร์ชัน",
        about_text: "ยูทิลิตี้แชร์ไฟล์ที่ง่าย ทรงพลัง และปลอดภัย สำหรับนักพัฒนาและผู้ใช้ทั่วไป สร้างด้วย Wails, Go และ React",
        created_by: "สร้างโดย",
        waiting_events: "รอเหตุการณ์...",
        scan_qr: "สแกน QR Code",
        transfer_details: "รายละเอียดการโอนย้าย",
        name: "ชื่อ",
        size: "ขนาด",
        url: "URL",
        open: "เปิด",
        copy_code: "คัดลอกรหัส",
        progress: "ความคืบหน้า",
        transfer_completed: "การโอนย้ายเสร็จสมบูรณ์!",
        waiting_receiver: "กำลังรอผู้รับ...",
        transferring: "กำลังโอนย้าย...",
        transfer_completed_title: "การโอนย้ายเสร็จสิ้น",
        share_code_msg: "แชร์รหัสนี้ให้กับผู้รับ",
        software_update: "อัปเดตซอฟต์แวร์",
        software_update_desc: "ตรวจสอบเวอร์ชันล่าสุดของ JustServe",
        up_to_date: "เป็นเวอร์ชันล่าสุดแล้ว",
        update_available: "มีอัปเดตใหม่",
        current_version: "เวอร์ชันปัจจุบัน",
        check_for_updates: "ตรวจสอบอัปเดต"
    },
    zh: {
        server: "文件服务器",
        proxy: "端口转发",
        p2p: "P2P 传输",
        settings: "设置",
        about: "关于",
        status_online: "系统在线",
        status_idle: "系统空闲",
        mode_local: "本地网络",
        mode_public: "公共互联网",
        source_content: "源内容",
        select_folder: "文件夹",
        select_file: "文件",
        open_explorer: "打开资源管理器",
        network_mode: "网络模式",
        port_config: "端口配置",
        security_options: "安全选项",
        password_protection: "密码保护",
        allow_uploads: "允许上传",
        start_server: "启动服务器",
        stop_server: "停止服务器",
        local_service: "本地服务",
        ngrok_config: "Ngrok 配置",
        transfer_mode: "传输模式",
        send: "发送",
        receive: "接收",
        select_content_share: "选择要分享的内容",
        how_it_works: "如何使用",
        step1: "1. 选择文件或文件夹",
        step2: "2. 分享 6 位代码",
        step3: "3. 设备间直接传输",
        start_sharing: "开始分享",
        stop_sharing: "停止分享",
        connect_sender: "连接发送者",
        auto_discover: "局域网自动发现",
        discover_peers: "发现设备",
        scanning: "扫描网络中...",
        connect_btn: "连接发送者",
        connected_peer: "已连接设备",
        download_now: "立即下载",
        view_page: "查看页面",
        back: "返回",
        global_settings: "全局设置",
        ngrok_token: "Ngrok Authtoken (Global)",
        language: "语言",
        theme: "主题",
        appearance: "外观",
        appearance_desc: "自定义应用程序的外观",
        light_mode: "浅色模式",
        dark_mode: "深色模式",
        integration: "集成",
        integration_desc: "管理 API 密钥和外部连接",
        ngrok_token_placeholder: "输入您的 Ngrok Authtoken...",
        ngrok_token_help: "此令牌是将您的服务暴露到公共互联网所必需的。您可以在 ngrok.com 获取令牌",
        advanced: "高级",
        advanced_desc: "高级用户选项",
        auto_start: "自动启动",
        auto_start_desc: "应用启动时启动服务器",
        reset_settings: "重置设置",
        reset_settings_desc: "恢复默认值",
        reset: "重置",
        help: "帮助",
        system_logs: "系统日志",
        active_connection: "当前连接",
        copy_url: "复制链接",
        open_browser: "在浏览器打开",
        desc_serve: "在局域网或公网上托管文件和文件夹。",
        desc_proxy: "安全地将本地端口暴露给公共互联网。",
        desc_p2p: "设备间直接文件传输。",
        desc_settings: "配置应用程序首选项。",
        desc_about: "了解更多关于 JustServe 的信息。",
        version: "版本",
        about_text: "简单、强大且安全的文件共享工具，专为开发者和高级用户打造。使用 Wails, Go 和 React 构建。",
        created_by: "创建者",
        waiting_events: "等待事件...",
        scan_qr: "扫描二维码",
        transfer_details: "传输详情",
        name: "名称",
        size: "大小",
        url: "链接",
        open: "打开",
        copy_code: "复制提取码",
        progress: "进度",
        transfer_completed: "传输完成！",
        waiting_receiver: "等待接收者...",
        transferring: "传输中...",
        transfer_completed_title: "传输完成",
        share_code_msg: "将此代码分享给接收者",
        software_update: "软件更新",
        software_update_desc: "检查 JustServe 的最新版本",
        up_to_date: "已是最新版本",
        update_available: "有可用更新",
        current_version: "当前版本",
        check_for_updates: "检查更新"
    }
};

const AppContent = () => {
    const { addToast } = useToast();

    // --- State ---
    // Navigation
    const [activeTab, setActiveTab] = useState("serve"); // 'serve' | 'proxy' | 'p2p' | 'settings'

    // Serve Config
    const [folderPath, setFolderPath] = useState(localStorage.getItem("last_folder") || "");
    const [serveMode, setServeMode] = useState("local"); // 'local' | 'public'
    const [serveType, setServeType] = useState("folder"); // 'folder' | 'file'
    const [serverPort, setServerPort] = useState(localStorage.getItem("server_port") || "8080");
    const [usePassword, setUsePassword] = useState(false);
    const [password, setPassword] = useState("");
    const [allowUpload, setAllowUpload] = useState(false);
    const [autoStart, setAutoStart] = useState(false);

    // Proxy Config
    const [proxyPort, setProxyPort] = useState("3000");
    const [proxyProtocol, setProxyProtocol] = useState("http"); // 'http' | 'tcp'

    // Global Config
    const [ngrokToken, setNgrokToken] = useState(localStorage.getItem("ngrok_token") || "");
    const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
    const [lang, setLang] = useState(localStorage.getItem("lang") || "en");

    const t = (key) => translations[lang][key] || key;

    // Runtime State
    const [isServing, setIsServing] = useState(false);
    const [serverUrl, setServerUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [localIPs, setLocalIPs] = useState([]);
    const [logs, setLogs] = useState([]);

    // P2P Transfer State
    const [p2pMode, setP2pMode] = useState('send'); // 'send' | 'receive'
    const [p2pSendPath, setP2pSendPath] = useState('');
    const [p2pSendType, setP2pSendType] = useState('file'); // 'file' | 'folder'
    const [p2pActive, setP2pActive] = useState(false);
    const [p2pInfo, setP2pInfo] = useState(null); // { code, url, fileName, fileSize, isDir, status }
    const [p2pProgress, setP2pProgress] = useState(0);
    const [p2pReceiveCode, setP2pReceiveCode] = useState('');
    const [p2pReceiveAddress, setP2pReceiveAddress] = useState('');
    const [p2pPeerInfo, setP2pPeerInfo] = useState(null); // info from the connected peer
    const [p2pDiscovering, setP2pDiscovering] = useState(false);
    const [p2pPeers, setP2pPeers] = useState([]);

    // Update State
    const [updateInfo, setUpdateInfo] = useState(null);
    const [appVersion, setAppVersion] = useState("...");

    // Hover/Anim states
    const [isHoveringStart, setIsHoveringStart] = useState(false);

    // --- Effects ---
    useEffect(() => {
        if (folderPath && serveType === 'folder') localStorage.setItem("last_folder", folderPath);
    }, [folderPath, serveType]);

    useEffect(() => {
        if (serverPort) localStorage.setItem("server_port", serverPort);
    }, [serverPort]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem("lang", lang);
    }, [lang]);

    useEffect(() => {
        GetLocalIPs().then(ips => setLocalIPs(ips || [])).catch(console.error);

        runtime.EventsOn("server-error", (err) => {
            log("Error", err);
            addToast("Server Error: " + err, "error");
            setIsServing(false);
            setServerUrl("");
        });

        // P2P Events
        runtime.EventsOn("p2p-status", (status) => {
            log("P2P", `Transfer status: ${status}`);
            if (status === 'transferring') {
                addToast("Someone is downloading your file!", "info");
            } else if (status === 'completed') {
                addToast("Transfer completed successfully!", "success");
                setP2pInfo(prev => prev ? { ...prev, status: 'completed' } : null);
            }
        });

        runtime.EventsOn("p2p-progress", (bytes) => {
            setP2pProgress(bytes);
        });

        runtime.EventsOn("p2p-error", (err) => {
            log("P2P Error", err);
            addToast("P2P Error: " + err, "error");
        });
    }, []);

    useEffect(() => {
        checkForUpdates();
        GetAppVersion().then(v => setAppVersion(v)).catch(err => console.error("Failed to get version:", err));
    }, []);

    const log = (type, message) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [`[${timestamp}] [${type}] ${message}`, ...prev].slice(0, 50));
    };

    // --- Actions ---
    const toggleTheme = () => {
        setTheme(prev => prev === "dark" ? "light" : "dark");
    };

    const saveToken = (token) => {
        setNgrokToken(token);
        localStorage.setItem("ngrok_token", token);
    };

    const handleSelectContent = async (type) => {
        try {
            let path = "";
            if (type === 'folder') {
                path = await SelectFolder();
            } else {
                path = await SelectFile();
            }

            if (path) {
                setFolderPath(path);
                setServeType(type);
                log("Info", `Selected ${type}: ${path}`);
            }
        } catch (err) {
            console.error(err);
            addToast("Failed to select content: " + err, "error");
        }
    };

    const clearSelection = () => {
        setFolderPath("");
        log("Info", "Selection cleared");
    };

    const openInExplorer = async () => {
        if (folderPath) {
            try {
                // Check if the current environment has OpenInExplorer (User might not have rebuilt)
                if (OpenInExplorer) {
                    await OpenInExplorer(folderPath);
                } else {
                    addToast("Feature not available locally", "error");
                }
            } catch (err) {
                console.error(err);
                addToast("Failed to open explorer: " + err, "error");
            }
        }
    }

    const startServer = async () => {
        setLoading(true);
        setLogs([]); // Clear logs on start
        try {
            let url = "";
            log("System", "Starting server...");

            // Simulate check
            await new Promise(r => setTimeout(r, 400));

            if (activeTab === 'proxy') {
                if (!ngrokToken) {
                    addToast("Ngrok Token is required for proxy mode.", "error");
                    log("Error", "Missing Ngrok Token");
                    setLoading(false);
                    return;
                }
                url = await StartProxy(ngrokToken, proxyPort, proxyProtocol);
                log("Success", `Proxy started at ${url}`);
            } else {
                // Serve Mode
                if (!folderPath) {
                    addToast("Please select content first.", "error");
                    setLoading(false);
                    return;
                }

                const pwd = usePassword ? password : "";
                if (serveMode === 'local') {
                    url = await StartLocalServer(serverPort, folderPath, pwd, allowUpload);
                    log("Success", `Local server started at ${url}`);
                } else {
                    if (!ngrokToken) {
                        addToast("Ngrok Token is required for public mode.", "error");
                        log("Error", "Missing Ngrok Token");
                        setLoading(false);
                        return;
                    }
                    url = await StartPublicServer(ngrokToken, folderPath, pwd, allowUpload);
                    log("Success", `Public server started at ${url}`);
                }
            }
            setServerUrl(url);
            setIsServing(true);
            addToast("Server started!", "success");
        } catch (err) {
            console.error(err);
            log("Error", `Failed to start: ${err}`);
            addToast("Failed: " + err, "error");
        } finally {
            setLoading(false);
        }
    };

    const stopServer = async () => {
        setLoading(true);
        try {
            await StopServer();
            log("System", "Server stopped.");
            await new Promise(r => setTimeout(r, 300));
            setIsServing(false);
            setServerUrl("");
            addToast("Server stopped.", "info");
        } catch (err) {
            console.error(err);
            log("Error", `Failed to stop: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        if (text) {
            runtime.ClipboardSetText(text);
            addToast("Copied!", "success");
        }
    };

    const openUrl = (url) => {
        const target = url || serverUrl;
        if (target && !target.startsWith("tcp://")) {
            runtime.BrowserOpenURL(target);
        }
    }

    const checkForUpdates = async (isManual = false) => {
        if (isManual) setLoading(true);
        try {
            const info = await CheckUpdate();
            if (info && info.available) {
                setUpdateInfo(info);
                addToast(`Update available: ${info.version}`, "info");
            } else if (isManual) {
                addToast("You are using the latest version.", "success");
            }
        } catch (e) {
            console.error(e);
            if (isManual) addToast("Check failed: " + e, "error");
        } finally {
            if (isManual) setLoading(false);
        }
    }

    const installUpdate = async () => {
        if (!updateInfo) return;
        setLoading(true);
        try {
            const msg = await InstallUpdate(updateInfo.downloadUrl);
            addToast(msg, "success");
            // Optional: Ask user to restart
        } catch (e) {
            addToast("Update failed: " + e, "error");
        } finally {
            setLoading(false);
        }
    }

    // --- P2P Actions ---
    const handleP2PSelectContent = async (type) => {
        try {
            let path = '';
            if (type === 'folder') {
                path = await SelectFolder();
            } else {
                path = await SelectFile();
            }
            if (path) {
                setP2pSendPath(path);
                setP2pSendType(type);
                log('P2P', `Selected ${type}: ${path}`);
            }
        } catch (err) {
            addToast('Failed to select content: ' + err, 'error');
        }
    };

    const startP2PSend = async () => {
        if (!p2pSendPath) {
            addToast('Please select a file or folder first.', 'error');
            return;
        }
        setLoading(true);
        try {
            const result = await StartP2PSend(p2pSendPath);
            const info = JSON.parse(result);
            setP2pInfo(info);
            setP2pActive(true);
            setP2pProgress(0);
            log('P2P', `Sharing started! Code: ${info.code}`);
            addToast(`Sharing ready! Code: ${info.code}`, 'success');
        } catch (err) {
            log('P2P Error', err.toString());
            addToast('Failed to start P2P: ' + err, 'error');
        } finally {
            setLoading(false);
        }
    };

    const stopP2P = async () => {
        setLoading(true);
        try {
            await StopP2PTransfer();
            setP2pActive(false);
            setP2pInfo(null);
            setP2pPeerInfo(null);
            setP2pProgress(0);
            log('P2P', 'Transfer session stopped.');
            addToast('P2P session stopped.', 'info');
        } catch (err) {
            addToast('Failed to stop: ' + err, 'error');
        } finally {
            setLoading(false);
        }
    };

    const connectToPeer = async (address) => {
        const target = address || p2pReceiveAddress;
        if (!target) {
            addToast('Please enter a sender address.', 'error');
            return;
        }
        setLoading(true);
        try {
            const result = await ConnectP2P(target);
            const info = JSON.parse(result);
            setP2pPeerInfo({ ...info, url: target });
            log('P2P', `Connected to peer: ${info.fileName}`);
            addToast(`Found: ${info.fileName}`, 'success');
        } catch (err) {
            log('P2P Error', err.toString());
            addToast('Cannot connect: ' + err, 'error');
        } finally {
            setLoading(false);
        }
    };

    const discoverPeers = async () => {
        setP2pDiscovering(true);
        setP2pPeers([]);
        try {
            const result = await DiscoverP2PPeers(5);
            const peers = JSON.parse(result);
            setP2pPeers(peers || []);
            if (!peers || peers.length === 0) {
                addToast('No peers found on the network.', 'info');
            } else {
                addToast(`Found ${peers.length} peer(s)!`, 'success');
            }
        } catch (err) {
            addToast('Discovery failed: ' + err, 'error');
        } finally {
            setP2pDiscovering(false);
        }
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
    };

    // --- Components ---
    const SidebarItem = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => !isServing && setActiveTab(id)}
            disabled={isServing}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === id
                ? 'bg-blue-600/10 text-blue-500 font-semibold'
                : 'text-theme-secondary hover:bg-[var(--input-bg)] hover:text-[var(--text-primary)]'
                } ${isServing && activeTab !== id ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
            <Icon size={20} className={activeTab === id ? "text-blue-500" : "text-[var(--text-secondary)]"} />
            <span className="text-sm">{label}</span>
        </button>
    );

    const ConfigToggle = ({ label, active, onChange, icon: Icon }) => {
        const handleClick = () => {
            if (!isServing) {
                onChange(!active);
            }
        };

        return (
            <div
                onClick={handleClick}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${active
                    ? 'bg-blue-600/5 border-blue-600/30'
                    : 'bg-transparent border-[var(--input-border)] hover:border-[var(--text-secondary)]'} ${isServing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <div className="flex items-center gap-3">
                    <Icon size={18} className={active ? "text-blue-500" : "text-[var(--text-secondary)]"} />
                    <span className={`text-sm font-medium ${active ? 'text-blue-500' : 'text-[var(--text-secondary)]'}`}>{label}</span>
                </div>
                <div className={`w-9 h-5 rounded-full relative transition-colors ${active ? 'bg-blue-600' : 'bg-[var(--input-border)]'}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${active ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans overflow-hidden">

            {/* Sidebar */}
            <aside className="w-64 border-r border-[var(--card-border)] flex flex-col p-4 z-20 bg-[var(--bg-primary)]">
                <div className="flex items-center gap-3 px-2 mb-8 mt-2">
                    <Logo className="text-2xl" />
                </div>

                <nav className="flex-1 space-y-1">
                    <SidebarItem id="serve" label={t('server')} icon={Server} />
                    <SidebarItem id="proxy" label={t('proxy')} icon={Network} />
                    <SidebarItem id="p2p" label={t('p2p')} icon={Share2} />

                    <div className="my-4 h-px bg-[var(--card-border)]" />

                    <SidebarItem id="settings" label={t('settings')} icon={Settings} />
                    <SidebarItem id="about" label={t('about')} icon={Info} />
                </nav>

                <div className="bg-[var(--input-bg)] rounded-xl p-4 border border-[var(--card-border)]">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Status</span>
                        <div className={`w-2 h-2 rounded-full ${isServing ? 'bg-emerald-500 animate-pulse' : 'bg-[var(--input-border)]'}`} />
                    </div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                        {isServing ? t('status_online') : t('status_idle')}
                    </div>
                    {isServing && <div className="text-xs text-[var(--text-secondary)] mt-1">{serveMode === 'local' ? t('mode_local') : t('mode_public')}</div>}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2" />

                {/* Header */}
                <header className="px-8 py-6 flex items-center justify-between border-b border-[var(--card-border)] bg-[var(--bg-primary)]/80 backdrop-blur-sm z-10">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
                            {activeTab === 'serve' ? t('server') :
                                activeTab === 'proxy' ? t('proxy') :
                                    activeTab === 'p2p' ? t('p2p') :
                                        activeTab === 'settings' ? t('settings') : t('about')}
                        </h1>
                        <p className="text-sm text-[var(--text-secondary)]">
                            {activeTab === 'serve' && t('desc_serve')}
                            {activeTab === 'proxy' && t('desc_proxy')}
                            {activeTab === 'p2p' && t('desc_p2p')}
                            {activeTab === 'settings' && t('desc_settings')}
                            {activeTab === 'about' && t('desc_about')}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 rounded-xl bg-[var(--input-bg)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--card-border)]"
                        >
                            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 relative z-0">
                    {updateInfo && updateInfo.available && (
                        <div className="max-w-4xl mx-auto mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                    <Download size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold text-blue-100">Update Available: {updateInfo.version}</h3>
                                    <p className="text-sm text-blue-300/80">A new version is available for download.</p>
                                </div>
                            </div>
                            <button
                                onClick={installUpdate}
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                {loading ? "Updating..." : "Update Now"}
                            </button>
                        </div>
                    )}
                    <div className="max-w-4xl mx-auto space-y-6">

                        {activeTab === 'serve' && (
                            <>
                                {/* Source Selection */}
                                <section className="space-y-3">
                                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('source_content')}</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                {serveType === 'folder' ? <FolderOpen size={18} className="text-[var(--text-secondary)]" /> : <FileText size={18} className="text-[var(--text-secondary)]" />}
                                            </div>
                                            <input
                                                type="text"
                                                readOnly
                                                value={folderPath}
                                                placeholder={t('source_content') + "..."}
                                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl py-3 pl-11 pr-10 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 transition-colors cursor-default"
                                            />
                                            {folderPath && (
                                                <button onClick={clearSelection} className="absolute inset-y-0 right-0 px-3 text-[var(--text-secondary)] hover:text-red-500 transition-colors" disabled={isServing}>
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSelectContent('folder')}
                                                disabled={isServing}
                                                className="px-4 py-2 bg-[var(--input-bg)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-sm font-medium transition-colors border border-[var(--input-border)] flex items-center gap-2"
                                            >
                                                <FolderOpen size={16} /> {t('select_folder')}
                                            </button>
                                            <button
                                                onClick={() => handleSelectContent('file')}
                                                disabled={isServing}
                                                className="px-4 py-2 bg-[var(--input-bg)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-sm font-medium transition-colors border border-[var(--input-border)] flex items-center gap-2"
                                            >
                                                <FileText size={16} /> {t('select_file')}
                                            </button>
                                        </div>
                                    </div>
                                    {folderPath && (
                                        <div className="flex justify-start">
                                            <button onClick={openInExplorer} className="text-xs text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1 transition-colors">
                                                <ArrowRight size={12} /> {t('open_explorer')}
                                            </button>
                                        </div>
                                    )}
                                </section>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Connection Mode */}
                                    <section className="space-y-3">
                                        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('network_mode')}</label>
                                        <div className="bg-[var(--input-bg)] p-1 rounded-xl border border-[var(--input-border)] flex">
                                            <button
                                                onClick={() => !isServing && setServeMode('local')}
                                                disabled={isServing}
                                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${serveMode === 'local' ? 'bg-emerald-600 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                            >
                                                <Wifi size={16} /> {t('mode_local')}
                                            </button>
                                            <button
                                                onClick={() => !isServing && setServeMode('public')}
                                                disabled={isServing}
                                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${serveMode === 'public' ? 'bg-blue-600 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                            >
                                                <Globe size={16} /> {t('mode_public')}
                                            </button>
                                        </div>
                                    </section>

                                    {/* Port Config */}
                                    <section className="space-y-3">
                                        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('port_config')}</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={serverPort}
                                                onChange={(e) => setServerPort(e.target.value)}
                                                disabled={isServing}
                                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 transition-colors"
                                                placeholder="8080"
                                            />
                                            <Settings size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                                        </div>
                                    </section>
                                </div>

                                {/* Advanced Options */}
                                <section className="space-y-3 pt-2">
                                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('security_options')}</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <ConfigToggle label={t('password_protection')} icon={Shield} active={usePassword} onChange={setUsePassword} />
                                        <ConfigToggle label={t('allow_uploads')} icon={UploadCloud} active={allowUpload} onChange={setAllowUpload} />
                                    </div>
                                    {usePassword && (
                                        <div className="animate-in slide-in-from-top-2 fade-in">
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                disabled={isServing}
                                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl py-2.5 px-4 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 transition-colors"
                                                placeholder="Enter access password..."
                                            />
                                        </div>
                                    )}
                                </section>
                            </>
                        )}

                        {activeTab === 'proxy' && (
                            <div className="space-y-6">
                                <section className="space-y-3">
                                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('local_service')}</label>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="col-span-1">
                                            <select
                                                value={proxyProtocol}
                                                onChange={(e) => setProxyProtocol(e.target.value)}
                                                disabled={isServing}
                                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl py-2.5 px-4 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
                                            >
                                                <option value="http">HTTP</option>
                                                <option value="tcp">TCP</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2 relative">
                                            <input
                                                type="text"
                                                value={proxyPort}
                                                onChange={(e) => setProxyPort(e.target.value)}
                                                disabled={isServing}
                                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 transition-colors"
                                                placeholder="Local Port (e.g. 3000)"
                                            />
                                            <Server size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)]">
                                        {t('desc_proxy')}
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('ngrok_config')}</label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            value={ngrokToken}
                                            onChange={(e) => saveToken(e.target.value)}
                                            disabled={isServing}
                                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 transition-colors"
                                            placeholder="Ngrok Authtoken"
                                        />
                                        <Shield size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'p2p' && (
                            <div className="space-y-6">
                                {/* Mode Selector */}
                                {!p2pActive && (
                                    <section className="space-y-3">
                                        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('transfer_mode')}</label>
                                        <div className="bg-[var(--input-bg)] p-1 rounded-xl border border-[var(--input-border)] flex">
                                            <button
                                                onClick={() => setP2pMode('send')}
                                                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${p2pMode === 'send' ? 'bg-emerald-600/20 text-emerald-400 shadow-sm border border-emerald-600/30' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                            >
                                                <ArrowUpCircle size={18} /> {t('send')}
                                            </button>
                                            <button
                                                onClick={() => setP2pMode('receive')}
                                                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${p2pMode === 'receive' ? 'bg-blue-600/20 text-blue-400 shadow-sm border border-blue-600/30' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                            >
                                                <ArrowDownCircle size={18} /> {t('receive')}
                                            </button>
                                        </div>
                                    </section>
                                )}

                                {/* === SEND MODE === */}
                                {p2pMode === 'send' && !p2pActive && (
                                    <>
                                        <section className="space-y-3">
                                            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('select_content_share')}</label>
                                            <div className="flex gap-2">
                                                <div className="flex-1 relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                        {p2pSendType === 'folder' ? <FolderOpen size={18} className="text-[var(--text-secondary)]" /> : <FileText size={18} className="text-[var(--text-secondary)]" />}
                                                    </div>
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={p2pSendPath}
                                                        placeholder={t('select_content_share') + "..."}
                                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl py-3 pl-11 pr-10 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50 transition-colors cursor-default"
                                                    />
                                                    {p2pSendPath && (
                                                        <button onClick={() => setP2pSendPath('')} className="absolute inset-y-0 right-0 px-3 text-[var(--text-secondary)] hover:text-red-500 transition-colors">
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleP2PSelectContent('folder')}
                                                        className="px-4 py-2 bg-[var(--input-bg)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-sm font-medium transition-colors border border-[var(--input-border)] flex items-center gap-2"
                                                    >
                                                        <FolderOpen size={16} /> {t('select_folder')}
                                                    </button>
                                                    <button
                                                        onClick={() => handleP2PSelectContent('file')}
                                                        className="px-4 py-2 bg-[var(--input-bg)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-sm font-medium transition-colors border border-[var(--input-border)] flex items-center gap-2"
                                                    >
                                                        <FileText size={16} /> {t('select_file')}
                                                    </button>
                                                </div>
                                            </div>
                                        </section>

                                        {/* How it works */}
                                        <section className="bg-emerald-600/5 border border-emerald-600/20 rounded-2xl p-5">
                                            <div className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                                                <Info size={16} /> {t('how_it_works')}
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="text-2xl mb-1 text-emerald-500"><FolderOpen size={32} /></div>
                                                    <div className="text-xs text-[var(--text-secondary)]">{t('step1')}</div>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <div className="text-2xl mb-1 text-emerald-500"><Hash size={32} /></div>
                                                    <div className="text-xs text-[var(--text-secondary)]">{t('step2')}</div>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <div className="text-2xl mb-1 text-emerald-500"><Zap size={32} /></div>
                                                    <div className="text-xs text-[var(--text-secondary)]">{t('step3')}</div>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Start Send Button */}
                                        <button
                                            onClick={startP2PSend}
                                            disabled={loading || !p2pSendPath}
                                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                                        >
                                            {loading ? <Loader2 className="animate-spin" /> : <Send size={22} />}
                                            {t('start_sharing')}
                                        </button>
                                    </>
                                )}

                                {/* === SEND ACTIVE (Sharing Info) === */}
                                {p2pMode === 'send' && p2pActive && p2pInfo && (
                                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                        {/* Transfer Code Card */}
                                        <div className="bg-[var(--input-bg)] border border-[var(--card-border)] rounded-2xl p-8 text-center">
                                            <div className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-2 flex items-center justify-center gap-2">
                                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                                {p2pInfo.status === 'completed' ? t('transfer_completed_title') : p2pInfo.status === 'transferring' ? t('transferring') : t('waiting_receiver')}
                                            </div>

                                            <div className="text-5xl font-mono font-bold text-emerald-400 tracking-[0.4em] my-6 select-all">
                                                {p2pInfo.code}
                                            </div>

                                            <p className="text-sm text-[var(--text-secondary)] mb-4">{t('share_code_msg')}</p>

                                            <button
                                                onClick={() => copyToClipboard(p2pInfo.code)}
                                                className="px-5 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--input-border)] text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors border border-[var(--card-border)] inline-flex items-center gap-2"
                                            >
                                                <Copy size={14} /> {t('copy_code')}
                                            </button>
                                        </div>

                                        {/* QR Code + URL */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-[var(--input-bg)] border border-[var(--card-border)] rounded-2xl p-6 flex flex-col items-center">
                                                <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">{t('scan_qr')}</div>
                                                <div className="bg-white p-3 rounded-xl">
                                                    <QRCode value={p2pInfo.url} size={120} />
                                                </div>
                                            </div>

                                            <div className="bg-[var(--input-bg)] border border-[var(--card-border)] rounded-2xl p-6 space-y-4">
                                                <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('transfer_details')}</div>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <FileText size={14} className="text-[var(--text-secondary)]" />
                                                        <span className="text-[var(--text-secondary)]">{t('name')}:</span>
                                                        <span className="font-medium truncate">{p2pInfo.fileName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Hash size={14} className="text-[var(--text-secondary)]" />
                                                        <span className="text-[var(--text-secondary)]">{t('size')}:</span>
                                                        <span className="font-medium">{formatBytes(p2pInfo.fileSize)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Link2 size={14} className="text-[var(--text-secondary)]" />
                                                        <span className="text-[var(--text-secondary)]">{t('url')}:</span>
                                                        <span className="font-mono text-xs text-blue-400 truncate cursor-pointer hover:underline" onClick={() => copyToClipboard(p2pInfo.url)}>{p2pInfo.url}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 pt-2">
                                                    <button onClick={() => copyToClipboard(p2pInfo.url)} className="flex-1 px-3 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--input-border)] text-[var(--text-primary)] rounded-lg text-xs font-medium transition-colors border border-[var(--card-border)] flex items-center justify-center gap-1.5">
                                                        <Copy size={12} /> {t('copy_url')}
                                                    </button>
                                                    <button onClick={() => openUrl(p2pInfo.url)} className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5">
                                                        <Eye size={12} /> {t('open')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        {(p2pInfo.status === 'transferring' || p2pInfo.status === 'completed') && (
                                            <div className="bg-[var(--input-bg)] border border-[var(--card-border)] rounded-2xl p-5">
                                                <div className="flex justify-between text-sm mb-2">
                                                    <span className="text-[var(--text-secondary)]">{t('progress')}</span>
                                                    <span className="font-mono text-emerald-400">{formatBytes(p2pProgress)} / {formatBytes(p2pInfo.fileSize)}</span>
                                                </div>
                                                <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300"
                                                        style={{ width: p2pInfo.fileSize > 0 ? `${Math.min((p2pProgress / p2pInfo.fileSize) * 100, 100)}%` : '0%' }}
                                                    />
                                                </div>
                                                {p2pInfo.status === 'completed' && (
                                                    <div className="flex items-center gap-2 mt-3 text-sm text-emerald-400">
                                                        <CheckCircle2 size={16} /> {t('transfer_completed')}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Stop Button */}
                                        <button
                                            onClick={stopP2P}
                                            disabled={loading}
                                            className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                                        >
                                            {loading ? <Loader2 className="animate-spin" /> : <Square className="fill-current" size={18} />}
                                            {t('stop_sharing')}
                                        </button>
                                    </div>
                                )}

                                {/* === RECEIVE MODE === */}
                                {p2pMode === 'receive' && !p2pPeerInfo && (
                                    <div className="space-y-6">
                                        {/* Manual Connect */}
                                        <section className="space-y-3">
                                            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('connect_sender')}</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={p2pReceiveAddress}
                                                    onChange={(e) => setP2pReceiveAddress(e.target.value)}
                                                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 transition-colors font-mono"
                                                    placeholder="http://192.168.1.100:54321"
                                                />
                                                <Link2 size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                                            </div>
                                            <p className="text-xs text-[var(--text-secondary)]">
                                                Enter the sender's URL shown on their screen, or scan their QR code from a browser.
                                            </p>
                                        </section>

                                        {/* Auto-Discover */}
                                        <section className="space-y-3">
                                            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('auto_discover')}</label>
                                            <button
                                                onClick={discoverPeers}
                                                disabled={p2pDiscovering}
                                                className="w-full py-3 bg-[var(--input-bg)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-sm font-medium transition-colors border border-[var(--input-border)] flex items-center justify-center gap-2"
                                            >
                                                {p2pDiscovering ? (
                                                    <><Loader2 size={18} className="animate-spin" /> {t('scanning')}</>
                                                ) : (
                                                    <><Radar size={18} /> {t('discover_peers')}</>
                                                )}
                                            </button>

                                            {p2pPeers.length > 0 && (
                                                <div className="space-y-2">
                                                    {p2pPeers.map((peer, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => {
                                                                setP2pReceiveAddress(peer.url);
                                                                connectToPeer(peer.url);
                                                            }}
                                                            className="w-full flex items-center justify-between p-4 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl hover:border-blue-500/50 transition-all group"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center">
                                                                    <Radio size={18} className="text-blue-400" />
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="text-sm font-medium">Peer Code: {peer.code}</div>
                                                                    <div className="text-xs text-[var(--text-secondary)] font-mono">{peer.url}</div>
                                                                </div>
                                                            </div>
                                                            <ArrowRight size={16} className="text-[var(--text-secondary)] group-hover:text-blue-400 transition-colors" />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </section>

                                        {/* Connect Button */}
                                        <button
                                            onClick={() => connectToPeer()}
                                            disabled={loading || !p2pReceiveAddress}
                                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                                        >
                                            {loading ? <Loader2 className="animate-spin" /> : <Link2 size={22} />}
                                            {t('connect_sender')}
                                        </button>
                                    </div>
                                )}

                                {/* === RECEIVE — Peer Connected === */}
                                {p2pMode === 'receive' && p2pPeerInfo && (
                                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                        <div className="bg-[var(--input-bg)] border border-[var(--card-border)] rounded-2xl p-8 text-center">
                                            <div className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-6 flex items-center justify-center gap-2">
                                                <CheckCircle2 size={16} /> {t('connected_peer')}
                                            </div>

                                            <div className="w-20 h-20 rounded-2xl bg-blue-600/10 flex items-center justify-center mx-auto mb-4 text-4xl">
                                                {p2pPeerInfo.isDir ? <FolderOpen size={48} className="text-blue-500" /> : <FileText size={48} className="text-blue-500" />}
                                            </div>

                                            <h3 className="text-xl font-bold mb-2 break-all">{p2pPeerInfo.fileName}</h3>
                                            <p className="text-[var(--text-secondary)] text-sm mb-2">
                                                {formatBytes(p2pPeerInfo.fileSize)} • {p2pPeerInfo.isDir ? 'Folder (ZIP)' : 'File'}
                                            </p>
                                            <p className="text-xs text-[var(--text-secondary)] font-mono mb-6">
                                                Code: {p2pPeerInfo.code}
                                            </p>

                                            <div className="flex gap-3 justify-center">
                                                <button
                                                    onClick={() => openUrl(p2pPeerInfo.url + '/p2p/download')}
                                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
                                                >
                                                    <Download size={18} /> {t('download_now')}
                                                </button>
                                                <button
                                                    onClick={() => openUrl(p2pPeerInfo.url)}
                                                    className="px-6 py-3 bg-[var(--bg-secondary)] hover:bg-[var(--input-border)] text-[var(--text-primary)] rounded-xl font-medium transition-colors border border-[var(--card-border)] flex items-center gap-2"
                                                >
                                                    <Eye size={18} /> {t('view_page')}
                                                </button>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => { setP2pPeerInfo(null); setP2pReceiveAddress(''); }}
                                            className="w-full py-3 bg-[var(--input-bg)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--card-border)] rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
                                        >
                                            <ArrowRight size={16} className="rotate-180" /> {t('back')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="space-y-6">
                                {/* Appearance Section */}
                                <section className="space-y-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-9 h-9 rounded-lg bg-blue-600/10 flex items-center justify-center">
                                            <Settings size={18} className="text-blue-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-[var(--text-primary)]">{t('appearance')}</h3>
                                            <p className="text-xs text-[var(--text-secondary)]">{t('appearance_desc')}</p>
                                        </div>
                                    </div>

                                    <div className="bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl p-5 space-y-5">
                                        {/* Theme Setting */}
                                        <div className="space-y-3">
                                            <label className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                                {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                                                {t('theme')}
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => setTheme('light')}
                                                    className={`p-3 rounded-lg border transition-all ${theme === 'light'
                                                        ? 'border-blue-500 bg-blue-500/10'
                                                        : 'border-[var(--input-border)] hover:border-[var(--text-secondary)]'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                                            <Sun size={16} className="text-slate-700" />
                                                        </div>
                                                        <div className="text-left">
                                                            <div className="text-sm font-semibold text-[var(--text-primary)]">{t('light_mode')}</div>
                                                            <div className="text-xs text-[var(--text-secondary)]">Light</div>
                                                        </div>
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={() => setTheme('dark')}
                                                    className={`p-3 rounded-lg border transition-all ${theme === 'dark'
                                                        ? 'border-blue-500 bg-blue-500/10'
                                                        : 'border-[var(--input-border)] hover:border-[var(--text-secondary)]'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                                                            <Moon size={16} className="text-slate-200" />
                                                        </div>
                                                        <div className="text-left">
                                                            <div className="text-sm font-semibold text-[var(--text-primary)]">{t('dark_mode')}</div>
                                                            <div className="text-xs text-[var(--text-secondary)]">Dark</div>
                                                        </div>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="h-px bg-[var(--card-border)]" />

                                        {/* Language Setting */}
                                        <div className="space-y-3">
                                            <label className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                                <Globe size={16} />
                                                {t('language')}
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                <button
                                                    onClick={() => setLang('th')}
                                                    className={`px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${lang === 'th'
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                                        }`}
                                                >
                                                    ไทย
                                                </button>
                                                <button
                                                    onClick={() => setLang('en')}
                                                    className={`px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${lang === 'en'
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                                        }`}
                                                >
                                                    English
                                                </button>
                                                <button
                                                    onClick={() => setLang('zh')}
                                                    className={`px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${lang === 'zh'
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                                        }`}
                                                >
                                                    中文
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Integration Section */}
                                <section className="space-y-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-9 h-9 rounded-lg bg-emerald-600/10 flex items-center justify-center">
                                            <Zap size={18} className="text-emerald-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-[var(--text-primary)]">{t('integration')}</h3>
                                            <p className="text-xs text-[var(--text-secondary)]">{t('integration_desc')}</p>
                                        </div>
                                    </div>

                                    <div className="bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl p-5 space-y-4">
                                        <div className="space-y-3">
                                            <label className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                                <Shield size={16} />
                                                {t('ngrok_token')}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="password"
                                                    value={ngrokToken}
                                                    onChange={(e) => saveToken(e.target.value)}
                                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--input-border)] rounded-lg py-2.5 px-4 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                                    placeholder={t('ngrok_token_placeholder')}
                                                />
                                            </div>
                                            <div className="flex items-start gap-2 text-xs text-[var(--text-secondary)] bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                                                <Info size={14} className="mt-0.5 shrink-0 text-blue-500" />
                                                <span>{t('ngrok_token_help')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Advanced Section */}
                                <section className="space-y-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-9 h-9 rounded-lg bg-orange-600/10 flex items-center justify-center">
                                            <Terminal size={18} className="text-orange-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-[var(--text-primary)]">{t('advanced')}</h3>
                                            <p className="text-xs text-[var(--text-secondary)]">{t('advanced_desc')}</p>
                                        </div>
                                    </div>

                                    <div className="bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl p-5 space-y-3">
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)]">
                                            <div className="flex items-center gap-3">
                                                <CheckCircle2 size={18} className="text-emerald-500" />
                                                <div>
                                                    <div className="text-sm font-semibold text-[var(--text-primary)]">{t('auto_start')}</div>
                                                    <div className="text-xs text-[var(--text-secondary)]">{t('auto_start_desc')}</div>
                                                </div>
                                            </div>
                                            <div className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${autoStart ? 'bg-blue-600' : 'bg-[var(--input-border)]'}`}
                                                onClick={() => setAutoStart(!autoStart)}>
                                                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${autoStart ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                            <div className="flex items-center gap-3">
                                                <RefreshCw size={18} className="text-amber-600" />
                                                <div>
                                                    <div className="text-sm font-semibold text-[var(--text-primary)]">{t('reset_settings')}</div>
                                                    <div className="text-xs text-[var(--text-secondary)]">{t('reset_settings_desc')}</div>
                                                </div>
                                            </div>
                                            <button className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors">
                                                {t('reset')}
                                            </button>
                                        </div>
                                    </div>
                                </section>

                                {/* Update Section */}
                                <section className="space-y-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-9 h-9 rounded-lg bg-blue-600/10 flex items-center justify-center">
                                            <Download size={18} className="text-blue-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-[var(--text-primary)]">{t('software_update')}</h3>
                                            <p className="text-xs text-[var(--text-secondary)]">{t('software_update_desc')}</p>
                                        </div>
                                    </div>

                                    <div className="bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl p-5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${updateInfo?.available ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                                                <div>
                                                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                                                        {updateInfo?.available ? `${t('update_available')} ${updateInfo.version}` : t('up_to_date')}
                                                    </div>
                                                    <div className="text-xs text-[var(--text-secondary)]">
                                                        {t('current_version')}: {appVersion}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => checkForUpdates(true)}
                                                disabled={loading}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                            >
                                                {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                                {t('check_for_updates')}
                                            </button>
                                        </div>
                                    </div>
                                </section>

                                {/* App Info */}
                                <section className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-5">
                                    <div className="flex items-center justify-between">
                                        <Logo className="scale-110" />
                                        <div className="text-right">
                                            <p className="text-sm text-[var(--text-secondary)]">{t('version')} {appVersion}</p>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'about' && (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <Logo className="scale-150 mb-6" />
                                <p className="text-[var(--text-secondary)] mb-8">{t('version')} {appVersion}</p>
                                <p className="max-w-md text-[var(--text-secondary)] text-sm mb-6">
                                    {t('about_text')}
                                </p>
                                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                    <span>{t('created_by')}</span>
                                    <button
                                        onClick={() => runtime.BrowserOpenURL('https://github.com/Thirawat27')}
                                        className="text-blue-500 hover:text-blue-400 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                                        </svg>
                                        Thirawat27
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Action Area - Only show for Serve/Proxy tabs */}
                        {(activeTab === 'serve' || activeTab === 'proxy') && (
                            <div className="pt-6 border-t border-[var(--card-border)] mt-8">
                                {!isServing ? (
                                    <button
                                        onClick={startServer}
                                        disabled={loading}
                                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                                        onMouseEnter={() => setIsHoveringStart(true)}
                                        onMouseLeave={() => setIsHoveringStart(false)}
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : <Zap className={isHoveringStart ? "fill-white animate-bounce" : "fill-white/20"} />}
                                        {t('start_server')}
                                    </button>
                                ) : (
                                    <button
                                        onClick={stopServer}
                                        disabled={loading}
                                        className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : <Square className="fill-current" />}
                                        {t('stop_server')}
                                    </button>
                                )}
                            </div>
                        )}

                    </div>

                    {/* Running Status Overlay (Bottom Panel style) */}
                    {isServing && (
                        <div className="mt-8 max-w-3xl mx-auto bg-[var(--input-bg)] border border-emerald-500/20 rounded-xl p-5 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex flex-col md:flex-row gap-6 items-start">
                                {/* QR Code */}
                                <div className="bg-white p-3 rounded-lg shrink-0 border border-[var(--card-border)]">
                                    <QRCode value={serverUrl} size={100} />
                                </div>

                                {/* Info */}
                                <div className="flex-1 w-full space-y-3">
                                    <div>
                                        <div className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                            {t('active_connection')}
                                        </div>
                                        <div className="bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-lg p-3 mb-3">
                                            <p className="text-sm font-mono text-[var(--text-primary)] break-all">{serverUrl}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button onClick={() => copyToClipboard(serverUrl)} className="flex-1 px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--input-border)] text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-[var(--card-border)]">
                                            <Copy size={16} /> {t('copy_url')}
                                        </button>
                                        <button onClick={() => openUrl(serverUrl)} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                                            {t('open_browser')} <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Console Logs */}
                            <div className="mt-5 pt-5 border-t border-[var(--card-border)]">
                                <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">{t('system_logs')}</div>
                                <div className="bg-[var(--bg-secondary)] rounded-lg p-3 h-24 overflow-y-auto font-mono text-xs border border-[var(--card-border)]">
                                    {logs.map((log, i) => (
                                        <div key={i} className="text-[var(--text-secondary)] py-1">
                                            {log}
                                        </div>
                                    ))}
                                    {logs.length === 0 && <div className="text-[var(--text-secondary)] italic opacity-50">{t('waiting_events')}</div>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main >
        </div >
    );
};

function App() {
    return (
        <ToastProvider>
            <AppContent />
        </ToastProvider>
    );
}

export default App;
