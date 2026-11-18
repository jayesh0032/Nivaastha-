'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/hooks/use-auth-store';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const initialized = useAuthStore((state) => state.initialized);

  React.useEffect(() => {
    if (initialized && !isAuthenticated) {
      const nextParam = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${nextParam}`);
    }
  }, [initialized, isAuthenticated, pathname, router]);

  if (!initialized || !isAuthenticated) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
