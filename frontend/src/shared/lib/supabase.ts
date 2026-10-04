import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = url.startsWith("https://") && anonKey.length > 20;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export async function mirrorTask(row: Record<string, unknown>): Promise<string | null> {
  if (!supabase) {
    return null;
  }
  const { error } = await supabase.from("tasks").upsert(row);
  return error ? error.message : null;
}

export async function removeRemoteTask(id: string): Promise<string | null> {
  if (!supabase) {
    return null;
  }
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  return error ? error.message : null;
}

export function subscribeToTasks(userId: string, onChange: () => void): () => void {
  if (!supabase) {
    return () => undefined;
  }
  const channel = supabase
    .channel(`tasks-${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${userId}` },
      () => {
        onChange();
      },
    )
    .subscribe();
  return () => {
    void supabase?.removeChannel(channel);
  };
}
