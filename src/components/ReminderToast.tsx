import { useEffect, useState, createContext, useContext } from "react";
import { useReminders } from "../hooks/useReminders";
import { localTimeHHMM } from "../lib/dateUtils";

// Context to allow triggering toasts from anywhere if needed, though primarily system-driven
interface ToastContextType {
  showToast: (msg: string, desc?: string) => void;
}
const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastContainer({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; desc?: string }>>([]);

  const showToast = (msg: string, desc?: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, desc }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000); // hide after 5s
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-white px-4 py-3 rounded-xl shadow-lg border border-slate-100 ring-1 ring-black/5 pointer-events-auto min-w-[250px] max-w-sm"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">🔔</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{t.msg}</p>
                {t.desc && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.desc}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function ReminderScheduler() {
  const { data: reminders } = useReminders();
  const { showToast } = useToast();

  useEffect(() => {
    if (!reminders || reminders.length === 0) return;

    const checkReminders = () => {
      const now = localTimeHHMM();
      const firedKey = `reminders_fired_${new Date().toISOString().split("T")[0]}`;
      const firedSet = new Set<string>(JSON.parse(sessionStorage.getItem(firedKey) || "[]"));

      let updated = false;

      for (const r of reminders) {
        if (!r.remind_at) continue;
        
        // Check if remind_at is within ±2 minutes of now
        const [h, m] = r.remind_at.split(":").map(Number);
        const [nowH, nowM] = now.split(":").map(Number);
        
        const rTime = h * 60 + m;
        const nTime = nowH * 60 + nowM;
        
        // within 2 minutes and not already fired
        if (Math.abs(rTime - nTime) <= 2 && !firedSet.has(r.id)) {
          showToast(r.text, r.description || undefined);
          firedSet.add(r.id);
          updated = true;
        }
      }

      if (updated) {
        sessionStorage.setItem(firedKey, JSON.stringify(Array.from(firedSet)));
      }
    };

    // Check immediately and then every 60s
    checkReminders();
    const interval = setInterval(checkReminders, 60000);

    return () => clearInterval(interval);
  }, [reminders, showToast]);

  return null;
}
