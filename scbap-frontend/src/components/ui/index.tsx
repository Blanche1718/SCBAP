import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { clsx } from "clsx";

/* ── Badge ── */
type BadgeVariant = "compliant" | "alert" | "inactive" ;

const BADGE_STYLES: Record<BadgeVariant, string> = {
  compliant: "bg-primary-fixed text-[#2e4d44]",
  alert: "bg-error-container text-on-error-container",
  inactive: "bg-[#d3e3de] text-on-secondary-container",
};

export function Badge({ variant, children }: { variant: BadgeVariant; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide",
        BADGE_STYLES[variant]
      )}
    >
      {children}
    </span>
  );
}

/* ── Button ── */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-md transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "text-white hover:opacity-90 active:scale-[0.98]",
    ghost:
      "text-on-surface-variant bg-transparent hover:bg-surface-high active:bg-outline-variant",
    danger:
      "bg-error-container text-on-error-container hover:bg-error-container/80",
  };

  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" };

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      style={
        variant === "primary"
          ? { background: "linear-gradient(135deg, #17362e 0%, #2e4d44 100%)" }
          : undefined
      }
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {children}
    </button>
  );
}

/* ── Input ── */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-semibold text-on-surface-variant tracking-wide uppercase">
          {label}
        </label>
      )}
      <input
        className={clsx(
          "w-full px-3 py-2 rounded-sm text-sm font-medium text-on-surface placeholder:text-outline-variant",
          "bg-surface-highest border-0 outline-none",
          "focus:ring-0 focus:border-b-2 focus:border-primary transition-all",
          "disabled:opacity-50",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-on-error-container">{error}</p>}
    </div>
  );
}

/* ── Textarea ── */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-semibold text-on-surface-variant tracking-wide uppercase">
          {label}
        </label>
      )}
      <textarea
        className={clsx(
          "w-full px-3 py-2 rounded-sm text-sm font-medium text-on-surface placeholder:text-outline-variant",
          "bg-surface-highest border-0 outline-none resize-none",
          "focus:ring-0 focus:border-b-2 focus:border-primary transition-all",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-on-error-container">{error}</p>}
    </div>
  );
}

/* ── Select ── */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-semibold text-on-surface-variant tracking-wide uppercase">
          {label}
        </label>
      )}
      <select
        className={clsx(
          "w-full px-3 py-2 rounded-sm text-sm font-medium text-on-surface",
          "bg-surface-highest border-0 outline-none",
          "focus:ring-0 transition-all appearance-none",
          className
        )}
        {...props}
      >
        <option value="">-- Sélectionner --</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-on-error-container">{error}</p>}
    </div>
  );
}

/* ── Card ── */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx("rounded-lg bg-white p-5", className)}
    >
      {children}
    </div>
  );
}
