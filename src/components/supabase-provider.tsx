'use client';

import * as React from 'react';
import { initSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/hooks/use-auth-store';
import type { UserProfile } from '@/lib/types';

interface SupabaseProviderProps {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  children: React.ReactNode;
}

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const supabase = initSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as UserProfile;
  } catch {
    return null;
  }
}

export function SupabaseProvider({
  supabaseUrl,
  supabaseAnonKey,
  children,
}: SupabaseProviderProps) {
  const setSessionState = useAuthStore((s) => s.setSessionState);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  // Initialize synchronously on first client render so child components have client ready immediately
  if (supabaseUrl && supabaseAnonKey) {
    initSupabase(supabaseUrl, supabaseAnonKey);
  }

  React.useEffect(() => {
    const supabase = initSupabase(supabaseUrl, supabaseAnonKey);
    if (!supabase) {
      setInitialized(true);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const session = data.session;
      const profile = session?.user ? await fetchUserProfile(session.user.id) : null;
      if (!active) return;
      setSessionState(session, profile);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      const profile = session?.user ? await fetchUserProfile(session.user.id) : null;
      if (!active) return;
      setSessionState(session, profile);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabaseUrl, supabaseAnonKey, setSessionState, setInitialized]);

  return <>{children}</>;
}
