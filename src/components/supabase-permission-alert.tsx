'use client';

import * as React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Copy, Check } from 'lucide-react';

const GRANT_SQL = `GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.properties, public.property_images, public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.properties, public.property_images TO authenticated;

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved properties"
  ON public.properties FOR SELECT TO anon, authenticated
  USING (status = 'approved' OR auth.uid() = owner_id);

CREATE POLICY "Public can view property images"
  ON public.property_images FOR SELECT TO anon, authenticated
  USING (true);`;

interface SupabasePermissionAlertProps {
  message?: string | null;
}

export function SupabasePermissionAlert({ message }: SupabasePermissionAlertProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(GRANT_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard fallback ignored
    }
  };

  return (
    <Alert variant="destructive" className="bg-destructive/10 border-destructive/40 text-foreground">
      <ShieldAlert className="h-5 w-5 text-destructive" />
      <AlertTitle className="font-headline text-base">
        Supabase Table Permission Required
      </AlertTitle>
      <AlertDescription className="space-y-3 mt-2 text-sm">
        <p>
          {message ||
            'Supabase returned "permission denied for table properties". Please grant SELECT/RLS access to the anon and authenticated roles in your Supabase SQL Editor:'}
        </p>
        <div className="relative rounded-md bg-background/90 border p-3 font-mono text-xs overflow-x-auto">
          <pre className="whitespace-pre-wrap pr-16">{GRANT_SQL}</pre>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="absolute top-2 right-2 h-7 px-2 text-xs"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy SQL
              </>
            )}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
