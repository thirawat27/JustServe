
import { createContext, useContext, useState, useCallback, useRef } from "react";
import { X, CheckCircle2, AlertTriangle, Info } from "lucide-react";

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const toastIdCounter = useRef(0);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const addToast = useCallback((message, type = "info", duration = 3000) => {
        const id = ++toastIdCounter.current;
        setToasts((prev) => [...prev, { id, message, type }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto flex items-center gap-4 px-5 py-4 rounded-xl shadow-2xl backdrop-blur-xl border transform transition-all animate-in slide-in-from-right-full duration-300 ${toast.type === "success"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-100 shadow-emerald-900/10"
                                : toast.type === "error"
                                    ? "bg-rose-500/10 border-rose-500/20 text-rose-100 shadow-rose-900/10"
                                    : "bg-slate-800/90 border-slate-700 text-slate-100 shadow-black/20"
                            }`}
                        role="alert"
                    >
                        <div className={`p-1 rounded-full ${toast.type === "success" ? "bg-emerald-500/20 text-emerald-400" :
                                toast.type === "error" ? "bg-rose-500/20 text-rose-400" :
                                    "bg-blue-500/20 text-blue-400"
                            }`}>
                            {toast.type === "success" && <CheckCircle2 size={18} />}
                            {toast.type === "error" && <AlertTriangle size={18} />}
                            {toast.type === "info" && <Info size={18} />}
                        </div>

                        <span className="text-sm font-medium tracking-wide">{toast.message}</span>

                        <button
                            onClick={() => removeToast(toast.id)}
                            className="ml-2 hover:bg-white/10 p-1.5 rounded-lg transition-colors text-white/50 hover:text-white"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
