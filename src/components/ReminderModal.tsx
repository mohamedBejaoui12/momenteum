import { useEffect, useRef } from "react";
import { BellRing } from "lucide-react";

interface Props {
  text: string;
  description?: string | null;
  onDismiss: () => void;
}

export function ReminderModal({ text, description, onDismiss }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    btnRef.current?.focus(); // auto-focus dismiss button on open
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="reminder-modal-title"
    >
      <div className="relative w-full max-w-sm mx-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6">
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-950/30 mb-4 mx-auto">
          <BellRing className="w-6 h-6 text-violet-600 dark:text-violet-400" />
        </div>

        {/* Title */}
        <h2
          id="reminder-modal-title"
          className="text-base font-bold text-zinc-900 dark:text-zinc-50 text-center mb-1"
        >
          {text}
        </h2>

        {/* Description */}
        {description && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-1">
            {description}
          </p>
        )}

        {/* Dismiss */}
        <button
          ref={btnRef}
          onClick={onDismiss}
          className="w-full mt-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
