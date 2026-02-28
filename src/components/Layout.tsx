import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import { useProfile } from "../hooks/useProfile";
import { FocusTrap } from "./FocusTrap";
import { PageTransition } from "./PageTransition";
import {
  Sun,
  CheckSquare,
  Flame,
  Bell,
  Calendar,
  BarChart2,
  Settings,
  LogOut
} from "lucide-react";

const nav = [
  { to: "/today",     label: "Today",     icon: <Sun className="w-5 h-5" /> },
  { to: "/tasks",     label: "Tasks",     icon: <CheckSquare className="w-5 h-5" /> },
  { to: "/counters",  label: "Habits",    icon: <Flame className="w-5 h-5" /> },
  { to: "/reminders", label: "Reminders", icon: <Bell className="w-5 h-5" /> },
  { to: "/calendar",  label: "Calendar",  icon: <Calendar className="w-5 h-5" /> },
  { to: "/analytics", label: "Analytics", icon: <BarChart2 className="w-5 h-5" /> },
];

export function Layout() {
  const { user } = useAuthStore();
  const { data: profile } = useProfile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().signOut();
  };

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Me";
  const initials = displayName[0]?.toUpperCase();
  const avatarUrl = profile?.avatar_url ?? null;

  const NavItem = ({ to, label, icon, onClick }: { to: string; label: string; icon: React.ReactNode; onClick?: () => void }) => (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
          isActive
            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
            : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100"
        }`
      }
    >
      <span className="flex items-center justify-center w-5">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );

  const ProfileBadge = ({ onClick }: { onClick?: () => void }) => (
    <NavLink to="/profile" onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
          isActive
            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
            : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100"
        }`
      }
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="avatar" className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-zinc-200 dark:ring-zinc-700" />
      ) : (
        <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 text-xs font-bold shrink-0">
          {initials}
        </div>
      )}
      <span className="truncate">{displayName}</span>
    </NavLink>
  );

  const NavContent = ({ onClose }: { onClose?: () => void }) => (
    <>
      <div className="flex items-center gap-2 px-3 mb-6 mt-2">
        <img src="/assets/logo.png" alt="Momentum Logo" className="h-32 w-auto object-contain dark:invert" />
      </div>
      {nav.map(({ to, label, icon }) => (
        <NavItem key={to} to={to} label={label} icon={icon} onClick={onClose} />
      ))}

      <div className="flex-1" />

      {/* Bottom section */}
      <div className="flex flex-col gap-1 border-t border-zinc-200 dark:border-zinc-800 pt-3 mt-3">
        <ProfileBadge onClick={onClose} />
        <NavItem to="/settings" label="Settings" icon={<Settings className="w-5 h-5" />} onClick={onClose} />
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 dark:hover:text-red-400 transition-colors mt-1"
        >
          <span className="flex items-center justify-center w-5"><LogOut className="w-5 h-5" /></span>
          <span>Sign out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen flex-col md:flex-row overflow-hidden bg-white dark:bg-zinc-900">
      {/* Mobile top bar */}
      <header className="relative z-30 md:hidden flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <img src="/assets/logo.png" alt="Momentum Logo" className="h-20 w-auto object-contain dark:invert" />
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <FocusTrap>
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
            <nav className="absolute left-0 top-0 h-full w-72 bg-white dark:bg-zinc-900 shadow-xl border-r border-zinc-200 dark:border-zinc-800 flex flex-col px-3 py-6 gap-1">
              <NavContent onClose={() => setDrawerOpen(false)} />
            </nav>
          </div>
        </FocusTrap>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex relative z-10 w-64 flex-col gap-1 px-3 py-6 bg-zinc-50/50 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800">
        <NavContent />
      </aside>

      {/* Main content */}
      <main className="relative z-10 flex-1 overflow-y-auto bg-white dark:bg-zinc-900">
        <div className="max-w-4xl mx-auto px-4 py-8 md:px-10 md:py-10">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </main>
    </div>
  );
}
