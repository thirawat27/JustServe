import { create } from 'zustand';
import { persist, subscribeWithSelector, createJSONStorage } from 'zustand/middleware';

// ─── Helpers ────────────────────────────────────────────────────────────────
const getLS = (key, fallback) => {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
};

// ─── Store ──────────────────────────────────────────────────────────────────
export const useAppStore = create(
    subscribeWithSelector(
        persist(
            (set, get) => ({

                // ── UI / Navigation ─────────────────────────────────────────
                activeTab: 'serve',          // 'serve' | 'proxy' | 'p2p' | 'settings' | 'about'
                theme: getLS('theme', 'dark'),
                lang: getLS('lang', 'en'),
                loading: false,
                logs: [],

                setActiveTab: (tab) => set({ activeTab: tab }),
                setTheme: (theme) => {
                    document.documentElement.setAttribute('data-theme', theme);
                    set({ theme });
                },
                toggleTheme: () => {
                    const next = get().theme === 'dark' ? 'light' : 'dark';
                    document.documentElement.setAttribute('data-theme', next);
                    set({ theme: next });
                },
                setLang: (lang) => set({ lang }),
                setLoading: (loading) => set({ loading }),

                addLog: (type, message) => {
                    const timestamp = new Date().toLocaleTimeString();
                    set((state) => ({
                        logs: [`[${timestamp}] [${type}] ${message}`, ...state.logs].slice(0, 100),
                    }));
                },
                clearLogs: () => set({ logs: [] }),

                // ── Server Config ────────────────────────────────────────────
                folderPath: getLS('last_folder', ''),
                serveMode: 'local',          // 'local' | 'public'
                serveType: 'folder',         // 'folder' | 'file'
                serverPort: getLS('server_port', '8080'),
                usePassword: false,
                password: '',
                allowUpload: false,
                autoStart: false,

                // Server Runtime
                isServing: false,
                serverUrl: '',

                setFolderPath: (path) => set({ folderPath: path }),
                setServeMode: (mode) => set({ serveMode: mode }),
                setServeType: (type) => set({ serveType: type }),
                setServerPort: (port) => set({ serverPort: port }),
                setUsePassword: (v) => set({ usePassword: v }),
                setPassword: (v) => set({ password: v }),
                setAllowUpload: (v) => set({ allowUpload: v }),
                setAutoStart: (v) => set({ autoStart: v }),
                clearSelection: () => set({ folderPath: '' }),

                setIsServing: (v) => set({ isServing: v }),
                setServerUrl: (url) => set({ serverUrl: url }),

                stopServerState: () => set({
                    isServing: false,
                    serverUrl: '',
                }),

                // ── Proxy Config ─────────────────────────────────────────────
                proxyPort: '3000',
                proxyProtocol: 'http',       // 'http' | 'tcp'

                setProxyPort: (port) => set({ proxyPort: port }),
                setProxyProtocol: (proto) => set({ proxyProtocol: proto }),

                // ── Global / Settings ────────────────────────────────────────
                ngrokToken: getLS('ngrok_token', ''),
                localIPs: [],

                setNgrokToken: (token) => set({ ngrokToken: token }),
                setLocalIPs: (ips) => set({ localIPs: ips }),

                // ── P2P State ────────────────────────────────────────────────
                p2pMode: 'send',             // 'send' | 'receive'
                p2pSendPath: '',
                p2pSendType: 'file',         // 'file' | 'folder'
                p2pActive: false,
                p2pInfo: null,               // { code, url, fileName, fileSize, isDir, status }
                p2pProgress: 0,
                p2pReceiveAddress: '',
                p2pPeerInfo: null,
                p2pDiscovering: false,
                p2pPeers: [],

                setP2pMode: (mode) => set({ p2pMode: mode }),
                setP2pSendPath: (path) => set({ p2pSendPath: path }),
                setP2pSendType: (type) => set({ p2pSendType: type }),
                setP2pActive: (v) => set({ p2pActive: v }),
                setP2pInfo: (info) => set({ p2pInfo: info }),
                updateP2pInfoStatus: (status) =>
                    set((state) => ({
                        p2pInfo: state.p2pInfo ? { ...state.p2pInfo, status } : null,
                    })),
                setP2pProgress: (bytes) => set({ p2pProgress: bytes }),
                setP2pReceiveAddress: (addr) => set({ p2pReceiveAddress: addr }),
                setP2pPeerInfo: (info) => set({ p2pPeerInfo: info }),
                setP2pDiscovering: (v) => set({ p2pDiscovering: v }),
                setP2pPeers: (peers) => set({ p2pPeers: peers }),

                resetP2pSession: () => set({
                    p2pActive: false,
                    p2pInfo: null,
                    p2pPeerInfo: null,
                    p2pProgress: 0,
                    p2pPeers: [],
                }),

                // ── Update State ─────────────────────────────────────────────
                updateInfo: null,
                appVersion: '...',

                setUpdateInfo: (info) => set({ updateInfo: info }),
                setAppVersion: (v) => set({ appVersion: v }),

                // ── Hover / Anim ─────────────────────────────────────────────
                isHoveringStart: false,
                setIsHoveringStart: (v) => set({ isHoveringStart: v }),

                // ── Reset All Settings ───────────────────────────────────────
                resetSettings: () => {
                    localStorage.clear();
                    set({
                        theme: 'dark',
                        lang: 'en',
                        ngrokToken: '',
                        serverPort: '8080',
                        folderPath: '',
                        autoStart: false,
                        usePassword: false,
                        password: '',
                        allowUpload: false,
                    });
                    document.documentElement.setAttribute('data-theme', 'dark');
                },
            }),
            {
                name: 'justserve-store',
                version: 1, // Add versioning for self-healing
                storage: createJSONStorage(() => localStorage),
                partialize: (state) => ({
                    theme: state.theme,
                    lang: state.lang,
                    ngrokToken: state.ngrokToken,
                    serverPort: state.serverPort,
                    folderPath: state.folderPath,
                    autoStart: state.autoStart,
                    proxyPort: state.proxyPort,
                    proxyProtocol: state.proxyProtocol,
                    serveMode: state.serveMode,
                    p2pReceiveAddress: state.p2pReceiveAddress, // Persist receiver address too
                }),
                // Self-healing: If state version mismatches or error occurs, migrate/reset
                migrate: (persistedState, version) => {
                    if (version !== 1) {
                        // Migration logic or reset for breaking changes
                        return persistedState; 
                    }
                    return persistedState;
                },
                onRehydrateStorage: () => (state) => {
                    if (!state) {
                         // Corrupted storage detected, nuke it
                         localStorage.removeItem('justserve-store');
                         window.location.reload();
                    }
                }
            }
        )
    )
);

// ─── Selectors (memoized slices to prevent unnecessary re-renders) ───────────
export const useServerState = () => useAppStore((s) => ({
    isServing: s.isServing,
    serverUrl: s.serverUrl,
    loading: s.loading,
    folderPath: s.folderPath,
    serveMode: s.serveMode,
    serveType: s.serveType,
    serverPort: s.serverPort,
    usePassword: s.usePassword,
    password: s.password,
    allowUpload: s.allowUpload,
}));

export const useP2PState = () => useAppStore((s) => ({
    p2pMode: s.p2pMode,
    p2pSendPath: s.p2pSendPath,
    p2pSendType: s.p2pSendType,
    p2pActive: s.p2pActive,
    p2pInfo: s.p2pInfo,
    p2pProgress: s.p2pProgress,
    p2pReceiveAddress: s.p2pReceiveAddress,
    p2pPeerInfo: s.p2pPeerInfo,
    p2pDiscovering: s.p2pDiscovering,
    p2pPeers: s.p2pPeers,
}));

export const useUIState = () => useAppStore((s) => ({
    activeTab: s.activeTab,
    theme: s.theme,
    lang: s.lang,
    loading: s.loading,
    logs: s.logs,
    isHoveringStart: s.isHoveringStart,
}));
