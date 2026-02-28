import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import type { Profile } from "../lib/types";

export function useProfile() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user?.id,
    retry: false, // Don't retry 406 errors
  });
}

export function useUpdateProfile() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { display_name?: string; avatar_url?: string; timezone?: string }) => {
      const payload = {
        id: user!.id,
        timezone: "UTC",
        ...updates,
      };
      const { data, error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });
}

/** Upload avatar to user_avatar bucket, returns the public URL */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (file.size > 500 * 1024) {
    throw new Error("Image must be smaller than 500 KB");
  }
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
    throw new Error("Only JPEG, PNG, WebP, or GIF images are supported");
  }

  // Use a fixed filename so re-uploading replaces the previous one
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  // Always store as avatar.ext — simple path, no subfolder needed
  const path = `${userId}/avatar.${ext}`;

  // First try to remove the old file (ignore errors if not exists)
  await supabase.storage.from("user_avatar").remove([path]).catch(() => null);

  const { error: upErr } = await supabase.storage
    .from("user_avatar")
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (upErr) {
    // Give the user a clear, actionable message
    if (upErr.message.includes("Bucket not found")) {
      throw new Error("Storage bucket 'user_avatar' not found — please run migration 005 in Supabase SQL editor");
    }
    if (upErr.message.includes("row-level security") || upErr.message.includes("Unauthorized") || upErr.message.includes("403")) {
      throw new Error("Storage permission denied — please run migration 005 in Supabase SQL editor to set up the bucket policies");
    }
    throw new Error(`Upload failed: ${upErr.message}`);
  }

  // Get the permanent public URL (no cache-busting needed since bucket is public)
  const { data } = supabase.storage.from("user_avatar").getPublicUrl(path);
  // Append cache-buster so the browser fetches the new image
  return `${data.publicUrl}?v=${Date.now()}`;
}
