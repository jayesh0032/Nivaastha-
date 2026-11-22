'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSavedStore } from '@/hooks/use-saved-store';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Heart,
  MapPin,
  BedDouble,
  Phone,
  UserCircle,
  Building,
  Maximize2,
  Tag,
  Home,
  Loader2,
  Pencil,
} from 'lucide-react';
import { ImageGallery } from '@/components/image-gallery';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import type { Property } from '@/lib/types';
import { fetchPropertyById, isPermissionDeniedError } from '@/lib/properties-service';
import { SupabasePermissionAlert } from '@/components/supabase-permission-alert';
import { isSupabaseConfigured } from '@/lib/supabase';

const formatCurrency = (value: number, isSale = false) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: isSale && value >= 100000 ? 'compact' : 'standard',
  }).format(value);
};

function formatWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuthStore();
  const { isSaved, toggleSaved } = useSavedStore();

  const propertyId = String(params.id ?? '');
  const [property, setProperty] = React.useState<Property | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [permissionError, setPermissionError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    async function load() {
      if (!propertyId || !isSupabaseConfigured()) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setPermissionError(null);
      try {
        const data = await fetchPropertyById(propertyId);
        if (active) setProperty(data);
      } catch (err: any) {
        if (!active) return;
        const message = err?.message || 'Unable to load property details.';
        if (isPermissionDeniedError(err)) {
          setPermissionError(message);
        } else {
          toast({
            title: 'Error Loading Property',
            description: message,
            variant: 'destructive',
          });
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [propertyId, toast]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (permissionError) {
    return (
      <div className="max-w-3xl mx-auto py-12 space-y-6">
        <SupabasePermissionAlert message={permissionError} />
        <Button asChild variant="outline">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-20">
        <h1 className="text-4xl font-bold font-headline">Property Not Found</h1>
        <p className="text-muted-foreground mt-4">
          The property you are looking for does not exist or has been removed.
        </p>
        <Button asChild className="mt-8">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  const saved = isSaved(property.id);
  const isForSale = property.listing_type === 'sale';
  const isOwner = Boolean(user && property.owner_id === user.id);
  const cleanPhone = property.contact_phone.replace(/[^\d+]/g, '');
  const whatsappNumber = formatWhatsAppPhone(property.contact_phone);

  const locationSummary = [property.locality, property.city].filter(Boolean).join(', ');

  const handleSaveToggle = () => {
    if (!isAuthenticated) {
      toast({
        title: 'Login Required',
        description: 'You must be logged in to save properties.',
        variant: 'destructive',
      });
      router.push('/login');
      return;
    }

    toggleSaved(property.id);
    toast({
      title: saved ? 'Property Unsaved' : 'Property Saved',
      description: saved
        ? `"${property.title}" removed from your list.`
        : `"${property.title}" added to your list.`,
      duration: 3000,
    });
  };

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {isForSale ? (
              <Badge variant="destructive" className="capitalize shrink-0 flex items-center gap-1">
                <Tag className="h-3 w-3" /> For Sale
              </Badge>
            ) : (
              <Badge variant="default" className="capitalize shrink-0 flex items-center gap-1">
                <Home className="h-3 w-3" /> For Rent
              </Badge>
            )}
            <Badge variant="secondary" className="capitalize shrink-0">
              {property.property_type}
            </Badge>
            {property.status !== 'approved' && (
              <Badge variant="outline" className="capitalize border-amber-500 text-amber-500">
                Status: {property.status}
              </Badge>
            )}
            {locationSummary && (
              <div className="flex items-center text-muted-foreground ml-1">
                <MapPin className="h-4 w-4 mr-1 shrink-0" />
                <span className="text-sm">{locationSummary}</span>
              </div>
            )}
          </div>

          {isOwner && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/edit-property/${property.id}`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Listing
              </Link>
            </Button>
          )}
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold font-headline mt-2">{property.title}</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
          <ImageGallery images={property.images} title={property.title} />

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Property Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed whitespace-pre-line">
                {property.description || 'No description provided.'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Location &amp; Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-4">
                <MapPin className="h-6 w-6 text-muted-foreground mt-1 shrink-0" />
                <div className="space-y-1">
                  {property.address && <p className="font-semibold">{property.address}</p>}
                  {(property.locality || property.city) && (
                    <p className="text-muted-foreground">
                      {[property.locality, property.city].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 lg:sticky lg:top-24 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardDescription>{isForSale ? 'Asking Price' : 'Monthly Rent'}</CardDescription>
                  <div className="text-4xl font-bold flex items-baseline">
                    {isForSale ? formatCurrency(property.price, true) : formatCurrency(property.price)}
                    {!isForSale && (
                      <span className="text-lg font-normal text-muted-foreground ml-1.5">/ month</span>
                    )}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-full h-10 w-10 shrink-0"
                  onClick={handleSaveToggle}
                >
                  <Heart
                    className={cn(
                      'h-5 w-5',
                      saved && isAuthenticated ? 'text-red-500 fill-current' : 'text-foreground'
                    )}
                  />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 text-center text-sm border rounded-lg p-2">
                <div className="flex-1 p-2 bg-secondary/30 rounded min-w-[80px]">
                  <Building className="h-5 w-5 mx-auto text-primary" />
                  <p className="mt-1 font-semibold">{property.property_type}</p>
                </div>
                {property.bhk && property.bhk !== 'N/A' && (
                  <div className="flex-1 p-2 bg-secondary/30 rounded min-w-[80px]">
                    <BedDouble className="h-5 w-5 mx-auto text-primary" />
                    <p className="mt-1 font-semibold">{property.bhk}</p>
                  </div>
                )}
                {property.area_sqft ? (
                  <div className="flex-1 p-2 bg-secondary/30 rounded min-w-[80px]">
                    <Maximize2 className="h-5 w-5 mx-auto text-primary" />
                    <p className="mt-1 font-semibold">
                      {property.area_sqft.toLocaleString('en-IN')} sq.ft.
                    </p>
                  </div>
                ) : null}
              </div>

              {cleanPhone ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button size="lg" className="w-full" asChild>
                    <a href={`tel:${cleanPhone}`}>
                      <Phone className="mr-2 h-4 w-4" />
                      Call
                    </a>
                  </Button>
                  <Button size="lg" className="w-full" variant="secondary" asChild>
                    <a
                      href={`https://wa.me/${whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <WhatsAppIcon />
                      WhatsApp
                    </a>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center">
                  Contact phone number not provided.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <UserCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold">
                    {property.contact_name || 'Property Owner'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {property.contact_name ? 'Contact Person' : 'Verified Listing'}
                  </p>
                </div>
              </div>
              {property.contact_phone && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{property.contact_phone}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
