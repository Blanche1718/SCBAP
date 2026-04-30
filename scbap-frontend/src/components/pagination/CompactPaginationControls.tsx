import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

type CompactPaginationControlsProps = {
  page: number;
  totalPages: number;
  loading?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
  buttonClassName?: string;
  labelClassName?: string;
};

export function CompactPaginationControls({
  page,
  totalPages,
  loading = false,
  onPrevious,
  onNext,
  className,
  buttonClassName,
  labelClassName,
}: CompactPaginationControlsProps) {
  const safeTotalPages = Math.max(totalPages, 1);
  const previousDisabled = loading || page <= 1;
  const nextDisabled = loading || totalPages === 0 || page >= safeTotalPages;

  return (
    <div className={clsx("inline-flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={onPrevious}
        disabled={previousDisabled}
        aria-label="Page précédente"
        className={clsx(
          "inline-flex h-9 w-9 items-center justify-center rounded-md bg-surface-low text-on-surface-variant transition-colors hover:bg-surface-high disabled:cursor-not-allowed disabled:opacity-60",
          buttonClassName,
        )}
      >
        <ChevronLeft size={16} />
      </button>
      <span
        className={clsx(
          "min-w-24 text-center text-xs font-semibold text-on-surface-variant",
          labelClassName,
        )}
      >
        Page {page} / {safeTotalPages}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        aria-label="Page suivante"
        className={clsx(
          "inline-flex h-9 w-9 items-center justify-center rounded-md bg-surface-low text-on-surface-variant transition-colors hover:bg-surface-high disabled:cursor-not-allowed disabled:opacity-60",
          buttonClassName,
        )}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
