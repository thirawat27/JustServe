import { useEffect } from 'react';
import './style.css';
import * as runtime from '../wailsjs/runtime/runtime';
import QRCode from 'react-qr-code';
import {
    FolderOpen, Settings, Copy, Globe, Wifi, Square,
    Loader2, ArrowRight, Shield, CheckCircle2, UploadCloud,
    Terminal, Zap, Server, FileText,
    Sun, Moon, Share2, Network, Info, X, RefreshCw,
    Send, Download, Radio, Link2, Hash, ArrowUpCircle, ArrowDownCircle,
    Radar, Eye
} from 'lucide-react';
import Logo from './components/Logo';
import { ToastProvider, useToast } from './components/Toast';
import { useAppStore } from './store/useAppStore';
import { useActions, formatBytes } from './store/actions';
import { useTranslation } from './i18n';

// ── Shared sub-components ─────────────────────────────────────────────────────
const SidebarItem = ({ id, label, icon: Icon }) => {
    const { activeTab, isServing, setActiveTab } = useAppStore();
    const active = activeTab === id;
    return (
        <button
            onClick={() => !isServing && setActiveTab(id)}
            disabled={isServing}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${active
                ? 'bg-blue-600/10 text-blue-500 font-semibold'
                : 'text-theme-secondary hover:bg-[var(--input-bg)] hover:text-[var(--text-primary)]'
                } ${isServing && !active ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
            <Icon size={20} className={active ? 'text-blue-500' : 'text-[var(--text-secondary)]'} />
            <span className="text-sm">{label}</span>
        </button>
    );
};

const ConfigToggle = ({ label, active, onChange, icon: Icon }) => {
    const { isServing } = useAppStore();
    return (
        <div
            onClick={() => !isServing && onChange(!active)}
            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${active
                ? 'bg-blue-600/5 border-blue-600/30'
                : 'bg-transparent border-[var(--input-border)] hover:border-[var(--text-secondary)]'
                } ${isServing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <div className="flex items-center gap-3">
                <Icon size={18} className={active ? 'text-blue-500' : 'text-[var(--text-secondary)]'} />
                <span className={`text-sm font-medium ${active ? 'text-blue-500' : 'text-[var(--text-secondary)]'}`}>{label}</span>
            </div>
            <div className={`w-9 h-5 rounded-full relative transition-colors ${active ? 'bg-blue-600' : 'bg-[var(--input-border)]'}`}>
                <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${active ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
        </div>
    );
};

// ── Tab: Serve ────────────────────────────────────────────────────────────────
const ServeTab = ({ t, actions }) => {
    const {
        folderPath, serveMode, serveType, serverPort, usePassword, password, allowUpload,
        isServing, setServeMode, setServerPort, setUsePassword, setPassword, setAllowUpload, clearSelection
    } = useAppStore();

    return (
        <>
            <section className="space-y-3">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('source_content')}</label>
                <div className="flex gap-2">
                    <div className="flex-1 relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            {serveType === 'folder' ? <FolderOpen size={18} className="text-[var(--text-secondary)]" /> : <FileText size={18} className="text-[var(--text-secondary)]" />}
                        </div>
                        <input type="text" readOnly value={folderPath} placeholder={t('source_content') + '...'}
                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl py-3 pl-11 pr-10 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 transition-colors cursor-default" />
                        {folderPath && (
                            <button onClick={clearSelection} disabled={isServing} className="absolute inset-y-0 right-0 px-3 text-[var(--text-secondary)] hover:text-red-500 transition-colors">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => actions.handleSelectContent('folder')} disabled={isServing}
                            className="px-4 py-2 bg-[var(--input-bg)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-sm font-medium transition-colors border border-[var(--input-border)] flex items-center gap-2">
                            <FolderOpen size={16} /> {t('select_folder')}
                        </button>
                        <button onClick={() => actions.handleSelectContent('file')} disabled={isServing}
                            className="px-4 py-2 bg-[var(--input-bg)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-sm font-medium transition-colors border border-[var(--input-border)] flex items-center gap-2">
                            <FileText size={16} /> {t('select_file')}
                        </button>
                    </div>
                </div>
                {folderPath && (
                    <button onClick={actions.openInExplorer} className="text-xs text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1 transition-colors">
                        <ArrowRight size={12} /> {t('open_explorer')}
                    </button>
                )}
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="space-y-3">
                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('network_mode')}</label>
                    <div className="bg-[var(--input-bg)] p-1 rounded-xl border border-[var(--input-border)] flex">
                        <button onClick={() => !isServing && setServeMode('local')} disabled={isServing}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${serveMode === 'local' ? 'bg-emerald-600 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                            <Wifi size={16} /> {t('mode_local')}
                        </button>
                        <button onClick={() => !isServing && setServeMode('public')} disabled={isServing}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${serveMode === 'public' ? 'bg-blue-600 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                            <Globe size={16} /> {t('mode_public')}
                        </button>
                    </div>
                </section>
                <section className="space-y-3">
                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('port_config')}</label>
                    <div className="relative">
                        <input type="text" value={serverPort} onChange={e => setServerPort(e.target.value)} disabled={isServing} placeholder="8080"
                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 transition-colors" />
                        <Settings size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                    </div>
                </section>
            </div>

            <section className="space-y-3 pt-2">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('security_options')}</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ConfigToggle label={t('password_protection')} icon={Shield} active={usePassword} onChange={setUsePassword} />
                    <ConfigToggle label={t('allow_uploads')} icon={UploadCloud} active={allowUpload} onChange={setAllowUpload} />
                </div>
                {usePassword && (
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={isServing}
                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl py-2.5 px-4 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 transition-colors"
                        placeholder="Enter access password..." />
                )}
            </section>
        </>
    );
};

// ── Tab: Proxy ────────────────────────────────────────────────────────────────
const ProxyTab = ({ t }) => {
    const { proxyPort, proxyProtocol, ngrokToken, isServing, setProxyPort, setProxyProtocol, setNgrokToken } = useAppStore();
    return (
        <div className="space-y-6">
            <section className="space-y-3">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('local_service')}</label>
                <div className="grid grid-cols-3 gap-4">
                    <select value={proxyProtocol} onChange={e => setProxyProtocol(e.target.value)} disabled={isServing}
                        className="col-span-1 w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl py-2.5 px-4 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer">
                        <option value="http">HTTP</option>
                        <option value="tcp">TCP</option>
                    </select>
                    <div className="col-span-2 relative">
                        <input type="text" value={proxyPort} onChange={e => setProxyPort(e.target.value)} disabled={isServing} placeholder="Local Port (e.g. 3000)"
                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 transition-colors" />
                        <Server size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                    </div>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">{t('desc_proxy')}</p>
            </section>
            <section className="space-y-3">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('ngrok_config')}</label>
                <div className="relative">
                    <input type="password" value={ngrokToken} onChange={e => setNgrokToken(e.target.value)} disabled={isServing} placeholder="Ngrok Authtoken"
                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 transition-colors" />
                    <Shield size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                </div>
            </section>
        </div>
    );
};

// ── Tab: P2P ──────────────────────────────────────────────────────────────────
const P2PTab = ({ t, actions }) => {
    const {
        p2pMode, p2pSendPath, p2pSendType, p2pActive, p2pInfo, p2pProgress,
        p2pReceiveAddress, p2pPeerInfo, p2pDiscovering, p2pPeers, loading,
        setP2pMode, setP2pSendPath, setP2pReceiveAddress, setP2pPeerInfo
    } = useAppStore();

    return (
        <div className="space-y-6">
            {!p2pActive && (
                <section className="space-y-3">
                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('transfer_mode')}</label>
                    <div className="bg-[var(--input-bg)] p-1 rounded-xl border border-[var(--input-border)] flex">
                        <button onClick={() => setP2pMode('send')}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${p2pMode === 'send' ? 'bg-emerald-600/20 text-emerald-400 shadow-sm border border-emerald-600/30' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                            <ArrowUpCircle size={18} /> {t('send')}
                        </button>
                        <button onClick={() => setP2pMode('receive')}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${p2pMode === 'receive' ? 'bg-blue-600/20 text-blue-400 shadow-sm border border-blue-600/30' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                            <ArrowDownCircle size={18} /> {t('receive')}
                        </button>
                    </div>
                </section>
            )}

            {/* SEND — idle */}
            {p2pMode === 'send' && !p2pActive && (
                <>
                    <section className="space-y-3">
                        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('select_content_share')}</label>
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    {p2pSendType === 'folder' ? <FolderOpen size={18} className="text-[var(--text-secondary)]" /> : <FileText size={18} className="text-[var(--text-secondary)]" />}
                                </div>
                                <input type="text" readOnly value={p2pSendPath} placeholder={t('select_content_share') + '...'}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl py-3 pl-11 pr-10 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50 transition-colors cursor-default" />
                                {p2pSendPath && (
                                    <button onClick={() => setP2pSendPath('')} className="absolute inset-y-0 right-0 px-3 text-[var(--text-secondary)] hover:text-red-500 transition-colors">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => actions.handleP2PSelectContent('folder')}
                                    className="px-4 py-2 bg-[var(--input-bg)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-sm font-medium transition-colors border border-[var(--input-border)] flex items-center gap-2">
                                    <FolderOpen size={16} /> {t('select_folder')}
                                </button>
                                <button onClick={() => actions.handleP2PSelectContent('file')}
                                    className="px-4 py-2 bg-[var(--input-bg)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-sm font-medium transition-colors border border-[var(--input-border)] flex items-center gap-2">
                                    <FileText size={16} /> {t('select_file')}
                                </button>
                            </div>
                        </div>
                    </section>
                    <section className="bg-emerald-600/5 border border-emerald-600/20 rounded-2xl p-5">
                        <div className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2"><Info size={16} /> {t('how_it_works')}</div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            {[{ icon: <FolderOpen size={32} />, key: 'step1' }, { icon: <Hash size={32} />, key: 'step2' }, { icon: <Zap size={32} />, key: 'step3' }].map(({ icon, key }) => (
                                <div key={key} className="flex flex-col items-center">
                                    <div className="text-2xl mb-1 text-emerald-500">{icon}</div>
                                    <div className="text-xs text-[var(--text-secondary)]">{t(key)}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                    <button onClick={actions.startP2PSend} disabled={loading || !p2pSendPath}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
                        {loading ? <Loader2 className="animate-spin" /> : <Send size={22} />} {t('start_sharing')}
                    </button>
                </>
            )}

            {/* SEND — active */}
            {p2pMode === 'send' && p2pActive && p2pInfo && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-[var(--input-bg)] border border-[var(--card-border)] rounded-2xl p-8 text-center">
                        <div className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-2 flex items-center justify-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            {p2pInfo.status === 'completed' ? t('transfer_completed_title') : p2pInfo.status === 'transferring' ? t('transferring') : t('waiting_receiver')}
                        </div>
                        <div className="text-5xl font-mono font-bold text-emerald-400 tracking-[0.4em] my-6 select-all">{p2pInfo.code}</div>
                        <p className="text-sm text-[var(--text-secondary)] mb-4">{t('share_code_msg')}</p>
                        <button onClick={() => actions.copyToClipboard(p2pInfo.code)}
                            className="px-5 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--input-border)] text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors border border-[var(--card-border)] inline-flex items-center gap-2">
                            <Copy size={14} /> {t('copy_code')}
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[var(--input-bg)] border border-[var(--card-border)] rounded-2xl p-6 flex flex-col items-center">
                            <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">{t('scan_qr')}</div>
                            <div className="bg-white p-3 rounded-xl"><QRCode value={p2pInfo.url} size={120} /></div>
                        </div>
                        <div className="bg-[var(--input-bg)] border border-[var(--card-border)] rounded-2xl p-6 space-y-4">
                            <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('transfer_details')}</div>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2"><FileText size={14} className="text-[var(--text-secondary)]" /><span className="text-[var(--text-secondary)]">{t('name')}:</span><span className="font-medium truncate">{p2pInfo.fileName}</span></div>
                                <div className="flex items-center gap-2"><Hash size={14} className="text-[var(--text-secondary)]" /><span className="text-[var(--text-secondary)]">{t('size')}:</span><span className="font-medium">{formatBytes(p2pInfo.fileSize)}</span></div>
                                <div className="flex items-center gap-2"><Link2 size={14} className="text-[var(--text-secondary)]" /><span className="text-[var(--text-secondary)]">{t('url')}:</span>
                                    <span className="font-mono text-xs text-blue-400 truncate cursor-pointer hover:underline" onClick={() => actions.copyToClipboard(p2pInfo.url)}>{p2pInfo.url}</span>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => actions.copyToClipboard(p2pInfo.url)} className="flex-1 px-3 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--input-border)] text-[var(--text-primary)] rounded-lg text-xs font-medium transition-colors border border-[var(--card-border)] flex items-center justify-center gap-1.5">
                                    <Copy size={12} /> {t('copy_url')}
                                </button>
                                <button onClick={() => actions.openUrl(p2pInfo.url)} className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5">
                                    <Eye size={12} /> {t('open')}
                                </button>
                            </div>
                        </div>
                    </div>
                    {(p2pInfo.status === 'transferring' || p2pInfo.status === 'completed') && (
                        <div className="bg-[var(--input-bg)] border border-[var(--card-border)] rounded-2xl p-5">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-[var(--text-secondary)]">{t('progress')}</span>
                                <span className="font-mono text-emerald-400">{formatBytes(p2pProgress)} / {formatBytes(p2pInfo.fileSize)}</span>
                            </div>
                            <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300"
                                    style={{ width: p2pInfo.fileSize > 0 ? `${Math.min((p2pProgress / p2pInfo.fileSize) * 100, 100)}%` : '0%' }} />
                            </div>
                            {p2pInfo.status === 'completed' && (
                                <div className="flex items-center gap-2 mt-3 text-sm text-emerald-400"><CheckCircle2 size={16} /> {t('transfer_completed')}</div>
                            )}
                        </div>
                    )}
                    <button onClick={actions.stopP2P} disabled={loading}
                        className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
                        {loading ? <Loader2 className="animate-spin" /> : <Square className="fill-current" size={18} />} {t('stop_sharing')}
                    </button>
                </div>
            )}

            {/* RECEIVE — idle */}
            {p2pMode === 'receive' && !p2pPeerInfo && (
                <div className="space-y-6">
                    <section className="space-y-3">
                        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('connect_sender')}</label>
                        <div className="relative">
                            <input type="text" value={p2pReceiveAddress} onChange={e => setP2pReceiveAddress(e.target.value)}
                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 transition-colors font-mono"
                                placeholder="http://192.168.1.100:54321" />
                            <Link2 size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">Enter the sender's URL shown on their screen, or scan their QR code from a browser.</p>
                    </section>
                    <section className="space-y-3">
                        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('auto_discover')}</label>
                        <button onClick={actions.discoverPeers} disabled={p2pDiscovering}
                            className="w-full py-3 bg-[var(--input-bg)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-sm font-medium transition-colors border border-[var(--input-border)] flex items-center justify-center gap-2">
                            {p2pDiscovering ? <><Loader2 size={18} className="animate-spin" /> {t('scanning')}</> : <><Radar size={18} /> {t('discover_peers')}</>}
                        </button>
                        {p2pPeers.length > 0 && (
                            <div className="space-y-2">
                                {p2pPeers.map((peer, i) => (
                                    <button key={i} onClick={() => { setP2pReceiveAddress(peer.url); actions.connectToPeer(peer.url); }}
                                        className="w-full flex items-center justify-between p-4 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl hover:border-blue-500/50 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center"><Radio size={18} className="text-blue-400" /></div>
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
                    <button onClick={() => actions.connectToPeer()} disabled={loading || !p2pReceiveAddress}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
                        {loading ? <Loader2 className="animate-spin" /> : <Link2 size={22} />} {t('connect_sender')}
                    </button>
                </div>
            )}

            {/* RECEIVE — connected */}
            {p2pMode === 'receive' && p2pPeerInfo && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-[var(--input-bg)] border border-[var(--card-border)] rounded-2xl p-8 text-center">
                        <div className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-6 flex items-center justify-center gap-2"><CheckCircle2 size={16} /> {t('connected_peer')}</div>
                        <div className="w-20 h-20 rounded-2xl bg-blue-600/10 flex items-center justify-center mx-auto mb-4 text-4xl">
                            {p2pPeerInfo.isDir ? <FolderOpen size={48} className="text-blue-500" /> : <FileText size={48} className="text-blue-500" />}
                        </div>
                        <h3 className="text-xl font-bold mb-2 break-all">{p2pPeerInfo.fileName}</h3>
                        <p className="text-[var(--text-secondary)] text-sm mb-2">{formatBytes(p2pPeerInfo.fileSize)} • {p2pPeerInfo.isDir ? 'Folder (ZIP)' : 'File'}</p>
                        <p className="text-xs text-[var(--text-secondary)] font-mono mb-6">Code: {p2pPeerInfo.code}</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => actions.openUrl(p2pPeerInfo.url + '/p2p/download')}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20">
                                <Download size={18} /> {t('download_now')}
                            </button>
                            <button onClick={() => actions.openUrl(p2pPeerInfo.url)}
                                className="px-6 py-3 bg-[var(--bg-secondary)] hover:bg-[var(--input-border)] text-[var(--text-primary)] rounded-xl font-medium transition-colors border border-[var(--card-border)] flex items-center gap-2">
                                <Eye size={18} /> {t('view_page')}
                            </button>
                        </div>
                    </div>
                    <button onClick={() => { setP2pPeerInfo(null); setP2pReceiveAddress(''); }}
                        className="w-full py-3 bg-[var(--input-bg)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--card-border)] rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2">
                        <ArrowRight size={16} className="rotate-180" /> {t('back')}
                    </button>
                </div>
            )}
        </div>
    );
};

// ── Tab: Settings ─────────────────────────────────────────────────────────────
const SettingsTab = ({ t, actions }) => {
    const {
        theme, lang, ngrokToken, autoStart, updateInfo, appVersion, loading,
        setTheme, setLang, setNgrokToken, setAutoStart, resetSettings
    } = useAppStore();

    return (
        <div className="space-y-6">
            {/* Appearance */}
            <section className="space-y-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-600/10 flex items-center justify-center"><Settings size={18} className="text-blue-500" /></div>
                    <div><h3 className="text-base font-bold text-[var(--text-primary)]">{t('appearance')}</h3><p className="text-xs text-[var(--text-secondary)]">{t('appearance_desc')}</p></div>
                </div>
                <div className="bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl p-5 space-y-5">
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />} {t('theme')}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {[{ val: 'light', icon: <Sun size={16} className="text-slate-700" />, bg: 'from-slate-100 to-slate-200', label: t('light_mode'), sub: 'Light' },
                            { val: 'dark', icon: <Moon size={16} className="text-slate-200" />, bg: 'from-slate-700 to-slate-900', label: t('dark_mode'), sub: 'Dark' }].map(({ val, icon, bg, label, sub }) => (
                                <button key={val} onClick={() => setTheme(val)}
                                    className={`p-3 rounded-lg border transition-all ${theme === val ? 'border-blue-500 bg-blue-500/10' : 'border-[var(--input-border)] hover:border-[var(--text-secondary)]'}`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-md bg-gradient-to-br ${bg} flex items-center justify-center`}>{icon}</div>
                                        <div className="text-left">
                                            <div className="text-sm font-semibold text-[var(--text-primary)]">{label}</div>
                                            <div className="text-xs text-[var(--text-secondary)]">{sub}</div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="h-px bg-[var(--card-border)]" />
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2"><Globe size={16} /> {t('language')}</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[{ val: 'th', label: 'ไทย' }, { val: 'en', label: 'English' }, { val: 'zh', label: '中文' }].map(({ val, label }) => (
                                <button key={val} onClick={() => setLang(val)}
                                    className={`px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${lang === val ? 'bg-blue-600 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Integration */}
            <section className="space-y-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-600/10 flex items-center justify-center"><Zap size={18} className="text-emerald-500" /></div>
                    <div><h3 className="text-base font-bold text-[var(--text-primary)]">{t('integration')}</h3><p className="text-xs text-[var(--text-secondary)]">{t('integration_desc')}</p></div>
                </div>
                <div className="bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl p-5">
                    <label className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-3"><Shield size={16} /> {t('ngrok_token')}</label>
                    <input type="password" value={ngrokToken} onChange={e => setNgrokToken(e.target.value)}
                        className="w-full bg-[var(--bg-secondary)] border border-[var(--input-border)] rounded-lg py-2.5 px-4 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder={t('ngrok_token_placeholder')} />
                    <div className="flex items-start gap-2 text-xs text-[var(--text-secondary)] bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 mt-3">
                        <Info size={14} className="mt-0.5 shrink-0 text-blue-500" /><span>{t('ngrok_token_help')}</span>
                    </div>
                </div>
            </section>

            {/* Advanced */}
            <section className="space-y-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-600/10 flex items-center justify-center"><Terminal size={18} className="text-orange-500" /></div>
                    <div><h3 className="text-base font-bold text-[var(--text-primary)]">{t('advanced')}</h3><p className="text-xs text-[var(--text-secondary)]">{t('advanced_desc')}</p></div>
                </div>
                <div className="bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)]">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 size={18} className="text-emerald-500" />
                            <div><div className="text-sm font-semibold text-[var(--text-primary)]">{t('auto_start')}</div><div className="text-xs text-[var(--text-secondary)]">{t('auto_start_desc')}</div></div>
                        </div>
                        <div className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${autoStart ? 'bg-blue-600' : 'bg-[var(--input-border)]'}`} onClick={() => setAutoStart(!autoStart)}>
                            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${autoStart ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-center gap-3">
                            <RefreshCw size={18} className="text-amber-600" />
                            <div><div className="text-sm font-semibold text-[var(--text-primary)]">{t('reset_settings')}</div><div className="text-xs text-[var(--text-secondary)]">{t('reset_settings_desc')}</div></div>
                        </div>
                        <button onClick={resetSettings} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors">{t('reset')}</button>
                    </div>
                </div>
            </section>

            {/* Updates */}
            <section className="space-y-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-600/10 flex items-center justify-center"><Download size={18} className="text-blue-500" /></div>
                    <div><h3 className="text-base font-bold text-[var(--text-primary)]">{t('software_update')}</h3><p className="text-xs text-[var(--text-secondary)]">{t('software_update_desc')}</p></div>
                </div>
                <div className="bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${updateInfo?.available ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                            <div>
                                <div className="text-sm font-semibold text-[var(--text-primary)]">{updateInfo?.available ? `${t('update_available')} ${updateInfo.version}` : t('up_to_date')}</div>
                                <div className="text-xs text-[var(--text-secondary)]">{t('current_version')}: {appVersion}</div>
                            </div>
                        </div>
                        <button onClick={() => actions.checkForUpdates(true)} disabled={loading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} {t('check_for_updates')}
                        </button>
                    </div>
                </div>
            </section>

            <section className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-5">
                <div className="flex items-center justify-between">
                    <Logo className="scale-110" />
                    <div className="text-right"><p className="text-sm text-[var(--text-secondary)]">{t('version')} {appVersion}</p></div>
                </div>
            </section>
        </div>
    );
};

// ── Tab: About ────────────────────────────────────────────────────────────────
const AboutTab = ({ t }) => {
    const { appVersion } = useAppStore();
    return (
        <div className="flex flex-col items-center justify-center py-10 text-center">
            <Logo className="scale-150 mb-6" />
            <p className="text-[var(--text-secondary)] mb-8">{t('version')} {appVersion}</p>
            <p className="max-w-md text-[var(--text-secondary)] text-sm mb-6">{t('about_text')}</p>
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <span>{t('created_by')}</span>
                <button onClick={() => runtime.BrowserOpenURL('https://github.com/Thirawat27')}
                    className="text-blue-500 hover:text-blue-400 font-medium transition-colors flex items-center gap-1 cursor-pointer">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    Thirawat27
                </button>
            </div>
        </div>
    );
};

// ── Main AppContent ───────────────────────────────────────────────────────────
const AppContent = () => {
    const { addToast } = useToast();
    const actions = useActions(addToast);

    const {
        activeTab, theme, lang, isServing, serverUrl, loading,
        serveMode, updateInfo, logs, isHoveringStart, setIsHoveringStart,
        toggleTheme
    } = useAppStore();

    const t = useTranslation(lang);

    useEffect(() => {
        const cleanup = actions.init();
        return cleanup;
    }, []);

    const tabLabels = {
        serve: t('server'), proxy: t('proxy'), p2p: t('p2p'),
        settings: t('settings'), about: t('about')
    };

    return (
        <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 border-r border-[var(--card-border)] flex flex-col p-4 z-20 bg-[var(--bg-primary)]">
                <div className="flex items-center gap-3 px-2 mb-8 mt-2"><Logo className="text-2xl" /></div>
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
                    <div className="text-sm font-medium text-[var(--text-primary)]">{isServing ? t('status_online') : t('status_idle')}</div>
                    {isServing && <div className="text-xs text-[var(--text-secondary)] mt-1">{serveMode === 'local' ? t('mode_local') : t('mode_public')}</div>}
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
                <header className="px-8 py-6 flex items-center justify-between border-b border-[var(--card-border)] bg-[var(--bg-primary)]/80 backdrop-blur-sm z-10">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">{tabLabels[activeTab]}</h1>
                        <p className="text-sm text-[var(--text-secondary)]">{t(`desc_${activeTab}`)}</p>
                    </div>
                    <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-[var(--input-bg)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--card-border)]">
                        {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-8 relative z-0">
                    {/* Update banner */}
                    {updateInfo?.available && (
                        <div className="max-w-4xl mx-auto mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Download size={20} /></div>
                                <div className="text-left">
                                    <h3 className="font-semibold text-blue-100">Update Available: {updateInfo.version}</h3>
                                    <p className="text-sm text-blue-300/80">A new version is available for download.</p>
                                </div>
                            </div>
                            <button onClick={actions.installUpdate} disabled={loading}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                {loading ? 'Updating...' : 'Update Now'}
                            </button>
                        </div>
                    )}

                    <div className="max-w-4xl mx-auto space-y-6">
                        {activeTab === 'serve' && <ServeTab t={t} actions={actions} />}
                        {activeTab === 'proxy' && <ProxyTab t={t} />}
                        {activeTab === 'p2p' && <P2PTab t={t} actions={actions} />}
                        {activeTab === 'settings' && <SettingsTab t={t} actions={actions} />}
                        {activeTab === 'about' && <AboutTab t={t} />}

                        {/* Start/Stop button for serve & proxy */}
                        {(activeTab === 'serve' || activeTab === 'proxy') && (
                            <div className="pt-6 border-t border-[var(--card-border)] mt-8">
                                {!isServing ? (
                                    <button onClick={actions.startServer} disabled={loading}
                                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                                        onMouseEnter={() => setIsHoveringStart(true)} onMouseLeave={() => setIsHoveringStart(false)}>
                                        {loading ? <Loader2 className="animate-spin" /> : <Zap className={isHoveringStart ? 'fill-white animate-bounce' : 'fill-white/20'} />}
                                        {t('start_server')}
                                    </button>
                                ) : (
                                    <button onClick={actions.stopServer} disabled={loading}
                                        className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
                                        {loading ? <Loader2 className="animate-spin" /> : <Square className="fill-current" />}
                                        {t('stop_server')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Active server panel */}
                    {isServing && (
                        <div className="mt-8 max-w-3xl mx-auto bg-[var(--input-bg)] border border-emerald-500/20 rounded-xl p-5 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex flex-col md:flex-row gap-6 items-start">
                                <div className="bg-white p-3 rounded-lg shrink-0 border border-[var(--card-border)]">
                                    <QRCode value={serverUrl} size={100} />
                                </div>
                                <div className="flex-1 w-full space-y-3">
                                    <div className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> {t('active_connection')}
                                    </div>
                                    <div className="bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-lg p-3 mb-3">
                                        <p className="text-sm font-mono text-[var(--text-primary)] break-all">{serverUrl}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => actions.copyToClipboard(serverUrl)} className="flex-1 px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--input-border)] text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-[var(--card-border)]">
                                            <Copy size={16} /> {t('copy_url')}
                                        </button>
                                        <button onClick={() => actions.openUrl(serverUrl)} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                                            {t('open_browser')} <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            {/* Logs */}
                            <div className="mt-5 pt-5 border-t border-[var(--card-border)]">
                                <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">{t('system_logs')}</div>
                                <div className="bg-[var(--bg-secondary)] rounded-lg p-3 h-24 overflow-y-auto font-mono text-xs border border-[var(--card-border)]">
                                    {logs.map((entry, i) => <div key={i} className="text-[var(--text-secondary)] py-1">{entry}</div>)}
                                    {logs.length === 0 && <div className="text-[var(--text-secondary)] italic opacity-50">{t('waiting_events')}</div>}
                                </div>
                            </div>
                        </div>
                    )}
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
