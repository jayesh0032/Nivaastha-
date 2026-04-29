
'use client';

import { useParams, useRouter } from 'next/navigation';
import { usePropertyStore } from '@/hooks/use-property-store';
import { AuthGuard } from '@/components/auth-guard';
import { UploadForm } from '@/components/upload-form';
import { Pencil } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useEffect, useState } from 'react';

function EditPropertyPageContent() {
  const params = useParams();
  const router = useRouter();
  const { properties } = usePropertyStore();
  const { userMobile } = useAuthStore();
  const propertyId = params.id as string;
  
  const [propertyToEdit, setPropertyToEdit] = useState(() => properties.find(p => p.id === propertyId));
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const property = properties.find(p => p.id === propertyId);
    setPropertyToEdit(property);

    if (property) {
      // Simple authorization check: does the logged-in user own this property?
      if (userMobile && property.owner.mobile === userMobile) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    }
    setIsLoading(false);
  }, [propertyId, properties, userMobile]);

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-semibold text-muted-foreground">Loading...</h1>
      </div>
    );
  }

  if (!propertyToEdit) {
    return (
        <div className="text-center py-20">
            <h1 className="text-4xl font-bold font-headline">Property Not Found</h1>
            <p className="text-muted-foreground mt-4">The property you are looking for does not exist or has been removed.</p>
            <Button asChild className="mt-8">
                <Link href="/my-properties">Back to My Properties</Link>
            </Button>
        </div>
    );
  }

  if (!isAuthorized) {
     return (
        <div className="text-center py-20">
            <h1 className="text-4xl font-bold font-headline">Unauthorized</h1>
            <p className="text-muted-foreground mt-4">You do not have permission to edit this property.</p>
            <Button className="mt-8" onClick={() => router.back()}>
                Go Back
            </Button>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Pencil className="h-8 w-8 text-accent" />
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
