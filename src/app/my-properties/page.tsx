'use client';

import * as React from 'react';
import { useAuthStore } from '@/hooks/use-auth-store';
import { AuthGuard } from '@/components/auth-guard';
import type { Property } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Trash2, Pencil, Loader2, PlusSquare, Expand } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { deletePropertyListing, fetchMyProperties, isPermissionDeniedError } from '@/lib/properties-service';
import { SupabasePermissionAlert } from '@/components/supabase-permission-alert';
import { ImageLightbox } from '@/components/image-lightbox';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number, isSale = false) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: isSale && value >= 100000 ? 'compact' : 'standard',
  }).format(value);
};

function getStatusBadgeClass(status: string) {
  switch (status.toLowerCase()) {
    case 'approved':
      return 'bg-emerald-600/90 text-white border-emerald-500';
    case 'rejected':
      return 'bg-destructive text-destructive-foreground border-destructive';
    case 'pending':
    default:
      return 'bg-amber-500/90 text-black border-amber-400';
  }
}

function MyPropertiesPageContent() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [userProperties, setUserProperties] = React.useState<Property[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [permissionError, setPermissionError] = React.useState<string | null>(null);
  const [lightboxProperty, setLightboxProperty] = React.useState<Property | null>(null);

  const loadMyListings = React.useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setPermissionError(null);
    try {
      const items = await fetchMyProperties(user.id);
      setUserProperties(items);
    } catch (err: any) {
      const message = err?.message || 'Unable to fetch your listings.';
      if (isPermissionDeniedError(err)) {
        setPermissionError(message);
      } else {
        toast({
          title: 'Failed to Load Listings',
          description: message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, toast]);

  React.useEffect(() => {
    loadMyListings();
  }, [loadMyListings]);

  const handleRemoveProperty = async (property: Property) => {
    if (!user?.id) return;
    setDeletingId(property.id);
    try {
      await deletePropertyListing(property.id, user.id, property.images);
      setUserProperties((prev) => prev.filter((p) => p.id !== property.id));
      toast({
        title: 'Property Removed',
        description: `"${property.title}" has been permanently deleted.`,
      });
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err?.message || 'Could not delete this property.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <ClipboardList className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold font-headline">My Listings</h1>
        </div>
        <Button asChild>
          <Link href="/upload">
            <PlusSquare className="mr-2 h-4 w-4" />
            Post Property
          </Link>
        </Button>
      </div>

      {permissionError && <SupabasePermissionAlert message={permissionError} />}

      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading your listings...</span>
        </div>
      ) : userProperties.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {userProperties.map((property) => {
            const firstImage = property.images?.[0] || 'https://placehold.co/600x400.png';
            const isForSale = property.listing_type === 'sale';
            const location =
              [property.locality, property.city].filter(Boolean).join(', ') ||
              property.address ||
              'Location not specified';

            return (
              <Card
                key={property.id}
                className="flex flex-col overflow-hidden transition-all duration-300 ease-in-out group"
              >
                <div className="aspect-video relative overflow-hidden bg-muted">
                  <Image
                    src={firstImage}
                    alt={property.title}
                    fill
                    referrerPolicy="no-referrer"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <Badge
                    className={cn(
                      'absolute top-3 left-3 capitalize font-semibold',
                      getStatusBadgeClass(property.status)
                    )}
                  >
                    {property.status}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="absolute top-3 right-3 capitalize bg-background/85 backdrop-blur-sm"
                  >
                    {isForSale ? 'For Sale' : 'For Rent'}
                  </Badge>
                  {property.images && property.images.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setLightboxProperty(property)}
                      className="absolute bottom-3 right-3 h-7 px-2.5 text-xs bg-black/70 hover:bg-black/90 text-white border border-white/20 backdrop-blur-sm"
                    >
                      <Expand className="h-3.5 w-3.5 mr-1" />
                      {property.images.length > 1
                        ? `${property.images.length} Photos`
                        : 'Full Size'}
                    </Button>
                  )}
                </div>

                <div className="p-4 flex-grow flex flex-col space-y-2">
                  <h3 className="font-headline text-lg leading-tight font-semibold line-clamp-1">
                    {property.title}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">{location}</p>
                  <p className="text-base font-bold text-foreground pt-1">
                    {isForSale ? formatCurrency(property.price, true) : `${formatCurrency(property.price)} / mo`}
                  </p>
                </div>

                <div className="p-4 pt-3 border-t flex gap-2">
                  <Button asChild variant="outline" className="flex-1">
                    <Link href={`/property/${property.id}`}>View</Link>
                  </Button>
                  <Button asChild variant="outline" size="icon" aria-label="Edit Property">
                    <Link href={`/edit-property/${property.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon"
                        disabled={deletingId === property.id}
                        aria-label="Delete Property"
                      >
                        {deletingId === property.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete &ldquo;
                          {property.title}&rdquo; and its photos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRemoveProperty(property)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-24 border-2 border-dashed rounded-lg">
          <h2 className="text-2xl font-semibold text-muted-foreground font-headline">
            You haven&apos;t listed any properties yet
          </h2>
          <Button asChild className="mt-4">
            <Link href="/upload">List Your First Property</Link>
          </Button>
        </div>
      )}

      <ImageLightbox
        images={lightboxProperty?.images ?? []}
        title={lightboxProperty?.title ?? ''}
        open={Boolean(lightboxProperty)}
        onClose={() => setLightboxProperty(null)}
      />
    </div>
  );
}

export default function MyPropertiesPage() {
  return (
    <AuthGuard>
      <MyPropertiesPageContent />
    </AuthGuard>
  );
}
