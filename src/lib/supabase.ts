import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let configuredUrl = '';
let configuredKey = '';

function resolveCredentials(url?: string, anonKey?: string) {
  const resolvedUrl =
    url ||
    configuredUrl ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    '';
  const resolvedKey =
    anonKey ||
    configuredKey ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';
  return { resolvedUrl: resolvedUrl.trim(), resolvedKey: resolvedKey.trim() };
}

export function initSupabase(url?: string, anonKey?: string): SupabaseClient | null {
  const { resolvedUrl, resolvedKey } = resolveCredentials(url, anonKey);
  if (!resolvedUrl || !resolvedKey) {
    return null;
  }

  if (supabaseInstance && configuredUrl === resolvedUrl && configuredKey === resolvedKey) {
    return supabaseInstance;
  }

  configuredUrl = resolvedUrl;
  configuredKey = resolvedKey;
  supabaseInstance = createClient(resolvedUrl, resolvedKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
  const { resolvedUrl, resolvedKey } = resolveCredentials();
  return Boolean(resolvedUrl && resolvedKey);
}

export function getSupabase(): SupabaseClient {
  const client = initSupabase();
  if (!client) {
    throw new Error(
      'Supabase credentials are not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
    );
  }
  return client;
}
