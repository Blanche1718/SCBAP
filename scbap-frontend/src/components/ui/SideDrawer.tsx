import type { ReactNode } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";

type SideDrawerProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  panelClassName?: string;
  showCloseButton?: boolean;
};

export function SideDrawer({
  open,
  onClose,
  children,
  className,
  panelClassName,
  showCloseButton = false,
}: SideDrawerProps) {
  return (
    <>
      <div
        className={clsx(
          "fixed inset-0 z-40 bg-black/20 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
          className,
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={clsx(
          "fixed inset-y-0 right-0 z-50 w-full max-w-full border-l border-[#e1e3e2] bg-white shadow-[0_24px_60px_rgba(23,54,46,0.18)] transition-transform duration-300 ease-out sm:max-w-[40rem]",
          open ? "translate-x-0" : "translate-x-full",
          panelClassName,
        )}
      >
        {showCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f2f4f3] text-[#17362e] transition hover:bg-[#e6e9e8]"
            aria-label="Fermer le panneau"
          >
            <X size={16} />
          </button>
        ) : null}
        {children}
      </div>
    </>
  );
}
