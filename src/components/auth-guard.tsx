'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/hooks/use-auth-store';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    // This effect ensures we only check authentication after the store has been rehydrated from sessionStorage
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    // If hydration is already finished, set hydrated to true
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    
    return () => {
      unsub();
    };
  }, []);

  React.useEffect(() => {
    // Once hydrated, if the user is not authenticated, redirect them to the login page.
    if (hydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [hydrated, isAuthenticated, router]);
  
  // While we wait for hydration, or if we are redirecting, show a loader.
  if (!hydrated || !isAuthenticated) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // If hydrated and authenticated, render the protected content.
  return <>{children}</>;
}
