'use client';

import { useParams, useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth-guard';
import { UploadForm } from '@/components/upload-form';
import { Pencil, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useEffect, useState } from 'react';
import type { Property } from '@/lib/types';
import { fetchPropertyById } from '@/lib/properties-service';

function EditPropertyPageContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const propertyId = String(params.id ?? '');

  const [propertyToEdit, setPropertyToEdit] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!propertyId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const data = await fetchPropertyById(propertyId);
        if (active) setPropertyToEdit(data);
      } catch {
        if (active) setPropertyToEdit(null);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [propertyId]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!propertyToEdit) {
    return (
      <div className="text-center py-20">
        <h1 className="text-4xl font-bold font-headline">Property Not Found</h1>
        <p className="text-muted-foreground mt-4">
          The property you are looking for does not exist or has been removed.
        </p>
        <Button asChild className="mt-8">
          <Link href="/my-properties">Back to My Listings</Link>
        </Button>
      </div>
    );
  }

  const isAuthorized = Boolean(user && propertyToEdit.owner_id === user.id);

  if (!isAuthorized) {
    return (
      <div className="text-center py-20">
        <h1 className="text-4xl font-bold font-headline">Unauthorized</h1>
        <p className="text-muted-foreground mt-4">
          You do not have permission to edit this property.
        </p>
        <Button className="mt-8" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Pencil className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline">Edit Property</h1>
      </div>
      <UploadForm propertyToEdit={propertyToEdit} />
    </div>
  );
}

export default function EditPropertyPage() {
  return (
    <AuthGuard>
      <EditPropertyPageContent />
    </AuthGuard>
  );
}
