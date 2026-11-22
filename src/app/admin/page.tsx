'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  Loader2,
  Tag,
  Home,
  RefreshCw,
  User,
} from 'lucide-react';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useToast } from '@/hooks/use-toast';
import {
  fetchAdminProperties,
  isAdminEmail,
  isPermissionDeniedError,
  updatePropertyStatus,
} from '@/lib/properties-service';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Property } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SupabasePermissionAlert } from '@/components/supabase-permission-alert';
import { cn } from '@/lib/utils';

type AdminTab = 'pending' | 'approved' | 'rejected';

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

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated, initialized } = useAuthStore();

  const isAdmin = isAuthenticated && isAdminEmail(user?.email);

  const [activeTab, setActiveTab] = React.useState<AdminTab>('pending');
  const [listings, setListings] = React.useState<Property[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [updatingAction, setUpdatingAction] = React.useState<'approved' | 'rejected' | null>(null);
  const [permissionError, setPermissionError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialized && !isAdmin) {
      router.replace('/');
    }
  }, [initialized, isAdmin, router]);

  const loadListings = React.useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setPermissionError(null);
    try {
      const data = await fetchAdminProperties();
      setListings(data);
    } catch (err: any) {
      const message = err?.message || 'Unable to load listings.';
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
  }, [toast]);

  React.useEffect(() => {
    if (initialized && isAdmin) {
      loadListings();
    }
  }, [initialized, isAdmin, loadListings]);

  const handleStatusUpdate = async (property: Property, nextStatus: 'approved' | 'rejected') => {
    setUpdatingId(property.id);
    setUpdatingAction(nextStatus);
    setSuccessMessage(null);
    try {
      await updatePropertyStatus(property.id, nextStatus);
      const message =
        nextStatus === 'approved'
          ? `"${property.title}" has been approved and is now live.`
          : `"${property.title}" has been rejected.`;
      setSuccessMessage(message);
      toast({
        title: nextStatus === 'approved' ? 'Listing Approved' : 'Listing Rejected',
        description: message,
      });
      await loadListings();
    } catch (err: any) {
      const message = err?.message || `Unable to mark listing as ${nextStatus}.`;
      if (isPermissionDeniedError(err)) {
        setPermissionError(message);
      }
      toast({
        title: 'Action Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
      setUpdatingAction(null);
    }
  };

  if (!initialized || !isAdmin) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const pendingListings = listings.filter((p) => p.status.toLowerCase() === 'pending');
  const approvedListings = listings.filter((p) => p.status.toLowerCase() === 'approved');
  const rejectedListings = listings.filter((p) => p.status.toLowerCase() === 'rejected');

  const renderListingsGrid = (items: Property[], tabName: AdminTab) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading {tabName} listings...</span>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold text-muted-foreground font-headline capitalize">
            No {tabName} listings found
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {tabName === 'pending'
              ? 'All submitted properties have been reviewed.'
              : `There are currently no ${tabName} properties.`}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((property) => {
          const firstImage = property.images?.[0] || 'https://placehold.co/600x400.png';
          const isForSale = property.listing_type === 'sale';
          const isBusy = updatingId === property.id;

          return (
            <Card key={property.id} className="flex flex-col overflow-hidden">
              <CardHeader className="p-0 relative">
                <Link href={`/property/${property.id}`} className="block aspect-video relative overflow-hidden bg-muted">
                  <Image
                    src={firstImage}
                    alt={property.title}
                    fill
                    referrerPolicy="no-referrer"
                    className="object-cover transition-transform duration-200 hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </Link>
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  {isForSale ? (
                    <Badge variant="destructive" className="capitalize flex items-center gap-1">
                      <Tag className="h-3 w-3" /> For Sale
                    </Badge>
                  ) : (
                    <Badge variant="default" className="capitalize flex items-center gap-1">
                      <Home className="h-3 w-3" /> For Rent
                    </Badge>
                  )}
                </div>
                <Badge
                  className={cn(
                    'absolute top-3 right-3 capitalize font-semibold',
                    getStatusBadgeClass(property.status)
                  )}
                >
                  {property.status}
                </Badge>
              </CardHeader>

              <CardContent className="p-4 flex-grow space-y-3">
                <div>
                  <Link
                    href={`/property/${property.id}`}
                    className="font-headline text-lg font-semibold leading-tight hover:text-primary transition-colors line-clamp-1"
                  >
                    {property.title}
                  </Link>
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <MapPin className="h-4 w-4 mr-1.5 shrink-0" />
                    <span className="truncate">
                      {[property.locality, property.city].filter(Boolean).join(', ') ||
                        property.city ||
                        'City not specified'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="text-xl font-bold text-foreground">
                    {isForSale ? (
                      formatCurrency(property.price, true)
                    ) : (
                      <>
                        {formatCurrency(property.price)}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          / month
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-right space-y-0.5">
                    {property.contact_name && (
                      <div className="flex items-center justify-end text-xs text-muted-foreground">
                        <User className="h-3.5 w-3.5 mr-1 shrink-0 text-primary" />
                        <span className="font-medium text-foreground truncate max-w-[140px]">
                          {property.contact_name}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-end text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 mr-1.5 shrink-0 text-primary" />
                      <span className="font-medium text-foreground">
                        {property.contact_phone || 'No phone'}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-line border-t pt-3">
                  {property.description || 'No description provided.'}
                </p>
              </CardContent>

              <CardFooter className="p-4 pt-3 border-t flex gap-2">
                <Button
                  type="button"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={isBusy || property.status.toLowerCase() === 'approved'}
                  onClick={() => handleStatusUpdate(property, 'approved')}
                >
                  {isBusy && updatingAction === 'approved' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Approve
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1"
                  disabled={isBusy || property.status.toLowerCase() === 'rejected'}
                  onClick={() => handleStatusUpdate(property, 'rejected')}
                >
                  {isBusy && updatingAction === 'rejected' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  Reject
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold font-headline">Admin Review Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Review submitted property listings and approve or reject them.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={loadListings}
          disabled={isLoading}
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {permissionError && <SupabasePermissionAlert message={permissionError} />}

      {successMessage && (
        <Alert className="border-emerald-500/40 bg-emerald-500/10 text-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as AdminTab)}
        className="space-y-6"
      >
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="pending" className="gap-2">
            Pending
            <Badge variant="secondary" className="px-1.5 py-0 text-xs">
              {pendingListings.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            Approved
            <Badge variant="secondary" className="px-1.5 py-0 text-xs">
              {approvedListings.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            Rejected
            <Badge variant="secondary" className="px-1.5 py-0 text-xs">
              {rejectedListings.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {renderListingsGrid(pendingListings, 'pending')}
        </TabsContent>
        <TabsContent value="approved">
          {renderListingsGrid(approvedListings, 'approved')}
        </TabsContent>
        <TabsContent value="rejected">
          {renderListingsGrid(rejectedListings, 'rejected')}
        </TabsContent>
      </Tabs>
    </div>
  );
}
