import { useAppStore } from './useAppStore';
import { translations } from '../i18n';
import {
    SelectFolder, SelectFile, StartLocalServer, StartPublicServer,
    StopServer, GetLocalIPs, StartProxy, OpenInExplorer,
    StartP2PSend, StopP2PTransfer, ConnectP2P, DiscoverP2PPeers,
    CheckUpdate, InstallUpdate, GetAppVersion
} from '../../wailsjs/go/main/App';
import * as runtime from '../../wailsjs/runtime/runtime';

// ── Utility ──────────────────────────────────────────────────────────────────
export const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
};

// Shorthand: always reads fresh state (no stale closure)
const gs = () => useAppStore.getState();

const t = (key) => {
    const lang = gs().lang || 'en';
    return translations[lang]?.[key] ?? key;
};

// ── useActions hook ───────────────────────────────────────────────────────────
export const useActions = (addToast) => {

    const log = (type, message) => gs().addLog(type, message);

    // ── Init ─────────────────────────────────────────────────────────────────
    const init = () => {
        document.documentElement.setAttribute('data-theme', gs().theme);

        GetLocalIPs()
            .then(ips => gs().setLocalIPs(ips || []))
            .catch(console.error);

        GetAppVersion()
            .then(v => gs().setAppVersion(v))
            .catch(err => console.error('Failed to get version:', err));

        checkForUpdates(false);

        // 🛡️ Self-Healing: Reset runtime states to avoid zombies
        if (gs().loading) gs().setLoading(false);
        if (gs().isServing) {
             // Assume clean start
             gs().setIsServing(false);
             gs().setServerUrl('');
        }

        runtime.EventsOn('server-error', (err) => {
            log('Error', err);
            addToast(t('toast_server_error') + ': ' + err, 'error');
            gs().stopServerState();
        });

        runtime.EventsOn('p2p-status', (status) => {
            log('P2P', `Transfer status: ${status}`);
            if (status === 'transferring') {
                addToast(t('toast_p2p_downloading'), 'info');
            } else if (status === 'completed') {
                addToast(t('toast_p2p_completed'), 'success');
                gs().updateP2pInfoStatus('completed');
            }
        });

        runtime.EventsOn('p2p-progress', (bytes) => {
            gs().setP2pProgress(bytes);
        });

        runtime.EventsOn('p2p-error', (err) => {
            log('P2P Error', err);
            addToast(t('toast_p2p_error') + ': ' + err, 'error');
        });

        return () => {
            runtime.EventsOff('server-error');
            runtime.EventsOff('p2p-status');
            runtime.EventsOff('p2p-progress');
            runtime.EventsOff('p2p-error');
        };
    };

    // ── Server ────────────────────────────────────────────────────────────────
    const handleSelectContent = async (type) => {
        try {
            const path = type === 'folder' ? await SelectFolder() : await SelectFile();
            if (path) {
                gs().setFolderPath(path);
                gs().setServeType(type);
                log('Info', `Selected ${type}: ${path}`);
            }
        } catch (err) {
            addToast(t('toast_failed_select') + ': ' + err, 'error');
        }
    };

    const openInExplorer = async () => {
        const { folderPath } = gs();
        if (!folderPath) return;
        try {
            await OpenInExplorer(folderPath);
        } catch (err) {
            addToast(t('toast_failed_explorer') + ': ' + err, 'error');
        }
    };

    const startServer = async (retryCount = 0) => {
        gs().setLoading(true);
        gs().clearLogs();
        try {
            log('System', retryCount === 0 ? 'Starting server...' : `Retrying start (Attempt ${retryCount + 1})...`);
            await new Promise(r => setTimeout(r, 400));

            const { activeTab, ngrokToken, proxyPort, proxyProtocol,
                folderPath, serveMode, serverPort, usePassword, password, allowUpload } = gs();

            let url = '';
            if (activeTab === 'proxy') {
                 // ... proxy logic (omitted for brevity, keep existing) ...
                if (!ngrokToken) {
                    addToast(t('toast_missing_token'), 'error');
                    log('Error', 'Missing Ngrok Token');
                    return;
                }
                url = await StartProxy(ngrokToken, proxyPort, proxyProtocol);
                log('Success', `Proxy started at ${url}`);
                addToast(t('toast_proxy_started') + ` ${url}`, 'success');
            } else {
                if (!folderPath) {
                    addToast(t('toast_select_content'), 'error');
                    return;
                }
                const pwd = usePassword ? password : '';
                
                try {
                    if (serveMode === 'local') {
                        url = await StartLocalServer(serverPort, folderPath, pwd, allowUpload);
                        log('Success', `Local server started at ${url}`);
                    } else {
                         // ... public logic ...
                        if (!ngrokToken) {
                            addToast(t('toast_missing_token'), 'error');
                            log('Error', 'Missing Ngrok Token');
                            return;
                        }
                        url = await StartPublicServer(ngrokToken, folderPath, pwd, allowUpload);
                        log('Success', `Public server started at ${url}`);
                    }
                    addToast(t('toast_server_started'), 'success');
                } catch (e) {
                    // 🛡️ Self-Healing: Port Conflict Auto-Fix
                    if (e.toString().includes('address already in use') && retryCount < 3) {
                        log('Warning', `Port ${serverPort} matches conflict. Self-healing: Switching to ${parseInt(serverPort) + 1}...`);
                        addToast(`Port ${serverPort} busy. Auto-switching to ${parseInt(serverPort) + 1}...`, 'warning');
                        gs().setServerPort((parseInt(serverPort) + 1).toString());
                        // Recursive retry with backoff
                        setTimeout(() => startServer(retryCount + 1), 1000);
                        return; // Exit this execution, next one is scheduled
                    }
                    throw e; // Propagate other errors
                }
            }
            gs().setServerUrl(url);
            gs().setIsServing(true);
            gs().setLoading(false); // Success path
        } catch (err) {
            // Check if we already handled retry (returned early)
            if (gs().loading && retryCount < 3 && err.toString().includes('address already in use')) {
                 // Do not set loading false, just exit. The next attempt is running.
                 return;
            }
            log('Error', `Failed to start: ${err}`);
            addToast('Failed: ' + err, 'error');
            gs().setLoading(false); // Failure path
        }
    };

    const stopServer = async () => {
        gs().setLoading(true);
        try {
            await StopServer();
            log('System', 'Server stopped.');
            await new Promise(r => setTimeout(r, 300));
            gs().stopServerState();
            addToast(t('toast_server_stopped'), 'info');
        } catch (err) {
            addToast(t('toast_failed_stop') + ': ' + err, 'error');
            log('Error', `Failed to stop: ${err}`);
        } finally {
            gs().setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        if (text) {
            runtime.ClipboardSetText(text);
            addToast(t('toast_copied'), 'success');
        }
    };

    const openUrl = (url) => {
        const target = url || gs().serverUrl;
        if (target && !target.startsWith('tcp://')) {
            runtime.BrowserOpenURL(target);
        }
    };

    // ── Updates ───────────────────────────────────────────────────────────────
    const checkForUpdates = async (isManual = false) => {
        if (isManual) gs().setLoading(true);
        try {
            const info = await CheckUpdate();
            if (info?.available) {
                gs().setUpdateInfo(info);
                if (isManual) addToast(t('update_available') + `: ${info.version}`, 'info');
            } else if (isManual) {
                addToast(t('toast_latest_version'), 'success');
            }
        } catch (e) {
            if (isManual) addToast(t('toast_check_failed') + ': ' + e, 'error');
        } finally {
            if (isManual) gs().setLoading(false);
        }
    };

    const installUpdate = async () => {
        const { updateInfo } = gs();
        if (!updateInfo) return;
        gs().setLoading(true);
        addToast(t('toast_downloading'), 'info');
        try {
            const msg = await InstallUpdate(updateInfo.downloadUrl);
            // App will auto-restart — show final message briefly
            addToast(t('toast_updating'), 'success');
        } catch (e) {
            addToast(t('toast_update_failed') + `: ` + e, 'error');
            gs().setLoading(false);
        }
        // Note: setLoading(false) is intentionally omitted on success
        // because the app will exit & relaunch automatically
    };

    // ── P2P ───────────────────────────────────────────────────────────────────
    const handleP2PSelectContent = async (type) => {
        try {
            const path = type === 'folder' ? await SelectFolder() : await SelectFile();
            if (path) {
                gs().setP2pSendPath(path);
                gs().setP2pSendType(type);
                log('P2P', `Selected ${type}: ${path}`);
            }
        } catch (err) {
            addToast(t('toast_failed_select') + ': ' + err, 'error');
        }
    };

    const startP2PSend = async () => {
        const { p2pSendPath } = gs();
        if (!p2pSendPath) {
            addToast(t('toast_select_content'), 'error');
            return;
        }
        gs().setLoading(true);
        try {
            const result = await StartP2PSend(p2pSendPath);
            const info = JSON.parse(result);
            gs().setP2pInfo(info);
            gs().setP2pActive(true);
            gs().setP2pProgress(0);
            log('P2P', `Sharing started! Code: ${info.code}`);
            addToast(t('toast_sharing_ready') + ` ${info.code}`, 'success');
        } catch (err) {
            log('P2P Error', err.toString());
            addToast('Failed to start P2P: ' + err, 'error');
        } finally {
            gs().setLoading(false);
        }
    };

    const stopP2P = async () => {
        gs().setLoading(true);
        try {
            await StopP2PTransfer();
            gs().resetP2pSession();
            log('P2P', 'Transfer session stopped.');
            addToast('P2P session stopped.', 'info');
        } catch (err) {
            addToast(t('toast_failed_stop') + ': ' + err, 'error');
        } finally {
            gs().setLoading(false);
        }
    };

    const connectToPeer = async (address) => {
        const target = address || gs().p2pReceiveAddress;
        if (!target) {
            addToast(t('toast_select_sender'), 'error');
            return;
        }
        gs().setLoading(true);
        try {
            const result = await ConnectP2P(target);
            const info = JSON.parse(result);
            gs().setP2pPeerInfo({ ...info, url: target });
            log('P2P', `Connected to peer: ${info.fileName}`);
            addToast(`${t('toast_found_peers')}: ${info.fileName}`, 'success');
        } catch (err) {
            log('P2P Error', err.toString());
            addToast('Cannot connect: ' + err, 'error');
        } finally {
            gs().setLoading(false);
        }
    };

    const discoverPeers = async () => {
        gs().setP2pDiscovering(true);
        gs().setP2pPeers([]);
        try {
            const result = await DiscoverP2PPeers(5);
            const peers = JSON.parse(result);
            gs().setP2pPeers(peers || []);
            if (!peers?.length) addToast(t('toast_no_peers'), 'info');
            else addToast(t('toast_found_peers').replace('(s)', '') + ` (${peers.length})`, 'success');
        } catch (err) {
            addToast('Discovery failed: ' + err, 'error');
        } finally {
            gs().setP2pDiscovering(false);
        }
    };

    return {
        init, log,
        handleSelectContent, openInExplorer, startServer, stopServer,
        copyToClipboard, openUrl,
        checkForUpdates, installUpdate,
        handleP2PSelectContent, startP2PSend, stopP2P, connectToPeer, discoverPeers,
    };
};
