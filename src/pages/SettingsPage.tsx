import { useAuthStore } from "../stores/authStore";
import { useTheme } from "../components/ThemeProvider";
import { User, Sun, Moon, Monitor } from "lucide-react";

export function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6 max-w-md animate-float-in">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">Manage your account and preferences</p>
      </div>

      {/* Account */}
      <div className="card p-5 shadow-sm border-zinc-200 dark:border-zinc-800">
        <p className="section-title mb-3">Account</p>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 font-bold shrink-0">
            {user?.email?.[0]?.toUpperCase() ?? <User className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm truncate">{user?.email}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Free plan</p>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="card p-5 shadow-sm border-zinc-200 dark:border-zinc-800">
        <p className="section-title mb-4">Appearance</p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Theme</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">Choose your display preference</p>
          </div>
          <div className="flex gap-2">
            {(["light", "system", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  theme === t
                    ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white shadow-sm"
                    : "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {t === "light" ? <Sun className="w-3.5 h-3.5" /> : t === "dark" ? <Moon className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card p-5 shadow-sm border-zinc-200 dark:border-zinc-800">
        <p className="section-title mb-2">About</p>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Daily Progress Tracker — track habits, tasks, and reminders all in one place.
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">v1.0.0 · Built with React + Supabase</p>
      </div>
    </div>
  );
}
