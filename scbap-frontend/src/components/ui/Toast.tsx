import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useToast, type ToastType } from "../../context/ToastContext";

const TOAST_CONFIG: Record<ToastType, { icon: any; classes: string; iconClass: string }> = {
  success: {
    icon: CheckCircle2,
    classes: "bg-[#dcfce7] border-[#86efac] text-[#166534]",
    iconClass: "text-[#166534]",
  },
  error: {
    icon: AlertCircle,
    classes: "bg-error-container border-error/20 text-on-error-container",
    iconClass: "text-on-error-container",
  },
  warning: {
    icon: AlertTriangle,
    classes: "bg-[#ffe9c7] border-[#ffcc80] text-[#6b3d00]",
    iconClass: "text-[#6b3d00]",
  },
  info: {
    icon: Info,
    classes: "bg-surface-high border-surface-highest text-on-surface",
    iconClass: "text-primary",
  },
};

export function ToastContainer() {
  const location = useLocation();
  const { toasts, removeToast, clearToasts } = useToast();

  useEffect(() => {
    clearToasts();
  }, [clearToasts, location.pathname, location.search, location.hash]);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        const config = TOAST_CONFIG[toast.type];
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-lg transition-all animate-in slide-in-from-right-full duration-300 ${config.classes}`}
          >
            <Icon size={18} className={`mt-0.5 shrink-0 ${config.iconClass}`} />
            <p className="flex-1 text-sm font-semibold leading-relaxed">
              {toast.message}
            </p>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 rounded-full p-1 transition-colors hover:bg-black/5"
              aria-label="Fermer"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
