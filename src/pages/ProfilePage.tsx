import { useState, useRef } from "react";
import { useProfile, useUpdateProfile, uploadAvatar } from "../hooks/useProfile";
import { useAuthStore } from "../stores/authStore";
import { Camera, CheckCircle2 } from "lucide-react";

/** Renders avatar img with graceful fallback to initials on load error */
function AvatarDisplay({
  src,
  initials,
  size = "w-24 h-24",
}: {
  src: string | null;
  initials: string;
  size?: string;
}) {
  const [imgError, setImgError] = useState(false);

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt="Avatar"
        className={`${size} rounded-full object-cover ring-4 ring-zinc-100 dark:ring-zinc-800`}
        onError={() => setImgError(true)}
        // For blob: URLs (local preview) this is fine; for Supabase public URLs no crossOrigin needed
      />
    );
  }

  return (
    <div
      className={`${size} rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 font-bold ring-4 ring-zinc-50 dark:ring-zinc-900`}
      style={{ fontSize: size.includes("24") ? "1.875rem" : "1rem" }}
    >
      {initials}
    </div>
  );
}

export function ProfilePage() {
  const { user } = useAuthStore();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const [displayName, setDisplayName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Use local state if the user typed something, otherwise fall back to profile data
  const currentName = displayName !== "" ? displayName : (profile?.display_name ?? "");
  // avatarPreview is a local blob: URL; fall back to saved URL from profile
  const currentAvatarSrc = avatarPreview ?? profile?.avatar_url ?? null;
  const initials = (currentName || user?.email || "?")[0]?.toUpperCase() ?? "?";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      setAvatarError("Image must be smaller than 500 KB");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setAvatarError("Only JPEG, PNG, WebP, or GIF supported");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSuccess(false);
    setAvatarError(null);
    try {
      let avatarUrl = profile?.avatar_url ?? undefined;
      if (avatarFile) {
        avatarUrl = await uploadAvatar(user.id, avatarFile);
      }
      await updateProfile.mutateAsync({
        display_name: currentName.trim() || undefined,
        avatar_url: avatarUrl,
      });
      setAvatarFile(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setAvatarError(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md animate-float-in">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Profile</h1>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">Update your name and avatar</p>
      </div>

      {isLoading ? (
        <div className="card p-8 animate-pulse bg-zinc-50/50 dark:bg-zinc-900/10 h-48 shadow-sm border-zinc-200 dark:border-zinc-800" />
      ) : (
        <div className="card p-6 flex flex-col gap-6 shadow-sm border-zinc-200 dark:border-zinc-800">
          {/* ── Avatar picker ── */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="relative w-24 h-24 rounded-full cursor-pointer group"
              onClick={() => fileRef.current?.click()}
              role="button"
              aria-label="Change avatar"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
            >
              <AvatarDisplay src={currentAvatarSrc} initials={initials} />

              {/* Camera overlay on hover */}
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <Camera className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={handleFileChange}
              aria-label="Upload avatar"
            />

            <p className="text-xs text-slate-400 dark:text-slate-500">
              Click to upload · Max 500 KB · JPEG / PNG / WebP / GIF
            </p>
            {avatarError && (
              <p className="text-xs text-red-500 font-medium text-center">{avatarError}</p>
            )}
          </div>

          {/* ── Display name ── */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
              Display Name
            </label>
            <input
              value={currentName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="input-field"
              maxLength={80}
            />
          </div>

          {/* ── Email (read-only) ── */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
              Email
            </label>
            <input
              value={user?.email ?? ""}
              readOnly
              className="input-field cursor-not-allowed opacity-60"
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Email cannot be changed here</p>
          </div>

          {/* ── Feedback ── */}
          {success && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Profile saved!</p>
            </div>
          )}
          {updateProfile.isError && (
            <p className="text-sm text-red-500 text-center">{(updateProfile.error as any)?.message}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full justify-center"
            style={{ borderRadius: "0.875rem", padding: "0.75rem" }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}
    </div>
  );
}
