
import { useState, useEffect, useRef } from 'react';
import './style.css';
import { SelectFolder, StartLocalServer, StartPublicServer, StopServer, GetLocalIPs } from '../wailsjs/go/main/App';
import * as runtime from '../wailsjs/runtime/runtime';
import QRCode from 'react-qr-code';
import {
    FolderOpen, Settings, Copy, Globe, Wifi, Play, Square,
    Loader2, ArrowRight, Shield, CheckCircle2, UploadCloud,
    Terminal, Zap, Server, MonitorSmartphone
} from 'lucide-react';
import Logo from './components/Logo';
import { ToastProvider, useToast } from './components/Toast';

const AppContent = () => {
    const { addToast } = useToast();

    // --- State ---
    const [folderPath, setFolderPath] = useState(localStorage.getItem("last_folder") || "");
    const [mode, setMode] = useState("local"); // 'local' | 'public'
    const [isServing, setIsServing] = useState(false);
    const [serverUrl, setServerUrl] = useState("");
    const [port, setPort] = useState(localStorage.getItem("server_port") || "8000");
    const [ngrokToken, setNgrokToken] = useState(localStorage.getItem("ngrok_token") || "");
    const [loading, setLoading] = useState(false);
    const [localIPs, setLocalIPs] = useState([]);
    const [showQR, setShowQR] = useState(false); // Toggle for mobile view possibly, or modal

    // Advanced Config
    const [usePassword, setUsePassword] = useState(false);
    const [password, setPassword] = useState("");
    const [allowUpload, setAllowUpload] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Speed/Status animations
    const [isHoveringStart, setIsHoveringStart] = useState(false);

    // --- Effects ---
    useEffect(() => {
        if (folderPath) localStorage.setItem("last_folder", folderPath);
    }, [folderPath]);

    useEffect(() => {
        if (port) localStorage.setItem("server_port", port);
    }, [port]);

    useEffect(() => {
        GetLocalIPs().then(ips => setLocalIPs(ips || [])).catch(console.error);

        runtime.EventsOn("server-error", (err) => {
            console.error("Server error:", err);
            addToast("Server Error: " + err, "error");
            setIsServing(false);
            setServerUrl("");
        });
    }, []);

    // --- Actions ---
    const saveToken = (token) => {
        setNgrokToken(token);
        localStorage.setItem("ngrok_token", token);
    };

    const handleSelectFolder = async () => {
        try {
            const path = await SelectFolder();
            if (path) setFolderPath(path);
        } catch (err) {
            console.error(err);
            addToast("Failed to select folder: " + err, "error");
        }
    };

    const startServer = async () => {
        if (!folderPath) {
            addToast("Please select a folder first.", "error");
            return;
        }
        setLoading(true);
        try {
            let url = "";
            const pwd = usePassword ? password : "";

            // Simulate a quick check/loading for UX feedback
            await new Promise(r => setTimeout(r, 400));

            if (mode === 'local') {
                url = await StartLocalServer(port, folderPath, pwd, allowUpload);
            } else {
                if (!ngrokToken) {
                    addToast("Ngrok Token is required for public mode.", "error");
                    setLoading(false);
                    return;
                }
                url = await StartPublicServer(ngrokToken, folderPath, pwd, allowUpload);
            }
            setServerUrl(url);
            setIsServing(true);
            addToast("Server started successfully!", "success");
        } catch (err) {
            console.error(err);
            addToast("Failed to start server: " + err, "error");
        } finally {
            setLoading(false);
        }
    };

    const stopServer = async () => {
        setLoading(true);
        try {
            await StopServer();
            // Artificial delay to let the UI breathe
            await new Promise(r => setTimeout(r, 300));
            setIsServing(false);
            setServerUrl("");
            addToast("Server stopped.", "info");
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        if (text) {
            runtime.ClipboardSetText(text);
            addToast("Copied to clipboard!", "success");
        }
    };

    const openUrl = () => {
        if (serverUrl) {
            runtime.BrowserOpenURL(serverUrl);
        }
    }

    // --- Render Helpers ---
    const FeatureToggle = ({ label, icon: Icon, active, onChange, colorClass = "text-blue-400" }) => (
        <label className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 ${active ? 'bg-slate-800 border-slate-600' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-md bg-slate-950 ${active ? colorClass : 'text-slate-500'}`}>
                    <Icon size={18} />
                </div>
                <span className={`text-sm font-medium ${active ? 'text-white' : 'text-slate-400'}`}>{label}</span>
            </div>
            <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${active ? 'bg-blue-600' : 'bg-slate-700'}`}>
                <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform duration-300 ${active ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <input type="checkbox" className="hidden" checked={active} onChange={(e) => onChange(e.target.checked)} disabled={isServing} />
        </label>
    );

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30 relative">

            {/* Ambient Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px]" />
                <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-emerald-600/10 rounded-full blur-[100px]" />
            </div>

            {/* Header */}
            <header className="px-8 py-5 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                    <Logo />
                </div>

                {/* Mode Switcher */}
                <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800 shadow-lg">
                    <button
                        onClick={() => !isServing && setMode("local")}
                        disabled={isServing}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${mode === 'local' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Wifi size={14} /> Local Network
                    </button>
                    <button
                        onClick={() => !isServing && setMode("public")}
                        disabled={isServing}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${mode === 'public' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Globe size={14} /> Public URL
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 px-8 pb-8 z-10 overflow-y-auto">
                <div className="max-w-6xl mx-auto h-full flex flex-col lg:flex-row gap-6">

                    {/* Left Column: Configuration */}
                    <div className="flex-1 flex flex-col gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        {/* Folder Selection */}
                        <div
                            className={`glass-card rounded-2xl p-0 overflow-hidden group transition-all duration-300 ${!folderPath && 'ring-2 ring-blue-500/20'}`}
                        >
                            <div
                                className={`p-8 cursor-pointer transition-colors ${folderPath ? 'bg-slate-900/40 hover:bg-slate-900/60' : 'bg-blue-500/5 hover:bg-blue-500/10'}`}
                                onClick={!isServing ? handleSelectFolder : undefined}
                            >
                                <div className="flex items-start gap-5">
                                    <div className={`p-4 rounded-xl shrink-0 transition-transform group-hover:scale-110 duration-300 ${folderPath ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                                        <FolderOpen size={32} strokeWidth={1.5} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Serving Directory</h3>
                                        {folderPath ? (
                                            <div className="text-lg font-medium text-white break-all leading-tight font-mono">{folderPath}</div>
                                        ) : (
                                            <div className="text-lg font-medium text-slate-500">No folder selected</div>
                                        )}
                                        <div className="mt-3 flex items-center gap-2 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="underline decoration-blue-500/30 underline-offset-4">Click to change folder</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Settings Panel */}
                        <div className="glass-card rounded-2xl p-6 flex flex-col gap-5 flex-1">
                            <h3 className="text-base font-semibold text-white flex items-center gap-2">
                                <Settings size={18} className="text-slate-400" />
                                Server Configuration
                            </h3>

                            <div className="space-y-4">
                                {mode === 'local' ? (
                                    <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                                        <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Port Number</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={port}
                                                onChange={(e) => setPort(e.target.value)}
                                                disabled={isServing}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-11 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 text-slate-200 transition-all font-mono text-sm"
                                                placeholder="8080"
                                            />
                                            <Server size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                                        <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Ngrok Authtoken</label>
                                        <div className="relative">
                                            <input
                                                type="password"
                                                value={ngrokToken}
                                                onChange={(e) => saveToken(e.target.value)}
                                                disabled={isServing}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-11 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 text-slate-200 transition-all font-mono text-sm tracking-widest"
                                                placeholder="Enter token..."
                                            />
                                            <Shield size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                                        </div>
                                    </div>
                                )}

                                <div className="h-px bg-slate-800 my-2" />

                                <div className="space-y-3">
                                    <FeatureToggle
                                        label="Password Protection"
                                        icon={Shield}
                                        active={usePassword}
                                        onChange={setUsePassword}
                                        colorClass="text-indigo-400"
                                    />

                                    {usePassword && (
                                        <div className="px-1 animate-in slide-in-from-top-2 fade-in">
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                disabled={isServing}
                                                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500/50 text-slate-200 text-sm"
                                                placeholder="Set your access password"
                                            />
                                        </div>
                                    )}

                                    <FeatureToggle
                                        label="Allow File Uploads"
                                        icon={UploadCloud}
                                        active={allowUpload}
                                        onChange={setAllowUpload}
                                        colorClass="text-emerald-400"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Status & Actions */}
                    <div className="w-full lg:w-[480px] flex flex-col gap-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>

                        {/* Status Card */}
                        <div className={`glass-card rounded-3xl p-8 relative overflow-hidden transition-all duration-500 flex flex-col justify-between min-h-[400px] ${isServing ? 'bg-slate-900' : 'bg-slate-900/80'}`}>

                            {/* Background Texture */}
                            {isServing && (
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />
                            )}

                            <div>
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${isServing ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                                        <span className={`text-sm font-semibold tracking-wide uppercase ${isServing ? 'text-emerald-400' : 'text-slate-500'}`}>
                                            {isServing ? 'Live' : 'Offline'}
                                        </span>
                                    </div>
                                    {isServing && (
                                        <span className="text-xs font-mono text-slate-500 bg-slate-950/50 px-2 py-1 rounded">
                                            {new Date().toLocaleTimeString()}
                                        </span>
                                    )}
                                </div>

                                {isServing ? (
                                    <div className="animate-in zoom-in-95 duration-500">
                                        <div className="flex flex-col items-center justify-center gap-6 mb-8">
                                            <div className="p-4 bg-white rounded-2xl shadow-2xl shadow-emerald-500/10 hover:scale-105 transition-transform duration-300">
                                                <QRCode value={serverUrl} size={160} />
                                            </div>
                                            <div className="text-center">
                                                <h2 className="text-white text-xl font-bold mb-1">Scan to Browse</h2>
                                                <p className="text-slate-500 text-sm">Or use the link below</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3 relative z-10">
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                    <Globe size={16} className="text-slate-500 group-focus-within:text-blue-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={serverUrl}
                                                    className="w-full bg-slate-950 border border-slate-800 text-blue-400 font-mono text-sm rounded-xl py-3.5 pl-10 pr-24 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all hover:border-slate-700 shadow-inner"
                                                    onClick={(e) => e.target.select()}
                                                />
                                                <div className="absolute inset-y-1.5 right-1.5">
                                                    <button
                                                        onClick={() => copyToClipboard(serverUrl)}
                                                        className="h-full px-3 flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-all"
                                                    >
                                                        <Copy size={12} /> Copy
                                                    </button>
                                                </div>
                                            </div>
                                            <button
                                                onClick={openUrl}
                                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 active:scale-[0.98]"
                                            >
                                                Open in Browser
                                                <ArrowRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-48 space-y-4 text-center opacity-60">
                                        <MonitorSmartphone size={48} className="text-slate-600" />
                                        <p className="text-slate-500 text-sm max-w-[200px]">
                                            Connect devices on your network or share publicly via Ngrok.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Main Action Button (Pinned to bottom if not serving) */}
                            <div className="mt-auto pt-6">
                                {!isServing ? (
                                    <button
                                        onClick={startServer}
                                        disabled={loading || !folderPath}
                                        onMouseEnter={() => setIsHoveringStart(true)}
                                        onMouseLeave={() => setIsHoveringStart(false)}
                                        className="w-full py-4 relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.98]"
                                    >
                                        <div className={`absolute inset-0 bg-white/20 transition-transform duration-500 ${isHoveringStart ? 'translate-x-0' : '-translate-x-full'}`} style={{ transformOrigin: 'left' }} />
                                        <div className="relative flex flex-col items-center justify-center gap-1">
                                            {loading ? (
                                                <div className="flex items-center gap-2">
                                                    <Loader2 className="animate-spin" size={20} />
                                                    <span className="font-bold">Initializing System...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        <Zap className={`fill-yellow-400 text-yellow-400 ${isHoveringStart ? 'animate-bounce' : ''}`} size={20} />
                                                        <span className="text-lg font-bold">Launch Server</span>
                                                    </div>
                                                    <span className="text-[10px] text-blue-100/70 font-medium uppercase tracking-widest">
                                                        {mode === 'local' ? 'High Performance • Local Network' : 'Secure Tunnel • Public Access'}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </button>
                                ) : (
                                    <button
                                        onClick={stopServer}
                                        disabled={loading}
                                        className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Square className="fill-current" size={20} />}
                                        Terminate Server
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Local IPs List (Only visible in Local Mode when serving) */}
                        {isServing && mode === 'local' && localIPs.length > 0 && (
                            <div className="glass-card rounded-xl p-4 animate-in slide-in-from-bottom-2 fade-in">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Alternative Access Points</h4>
                                <div className="space-y-1">
                                    {localIPs.map(ip => (
                                        <div
                                            key={ip}
                                            onClick={() => copyToClipboard(`http://${ip}:${port}`)}
                                            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer group transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Terminal size={14} className="text-slate-600 group-hover:text-blue-400" />
                                                <span className="text-sm font-mono text-slate-400 group-hover:text-white transition-colors">{ip}</span>
                                            </div>
                                            <Copy size={12} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </main>
        </div>
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
