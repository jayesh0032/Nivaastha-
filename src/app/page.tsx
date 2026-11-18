'use client';

import * as React from 'react';
import { PropertyCard } from '@/components/property-card';
import type { Property, PropertyFilterValues } from '@/lib/types';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Building, Search as SearchIcon, Loader2 } from 'lucide-react';
import Autoplay from 'embla-carousel-autoplay';
import { Hero } from '@/components/hero';
import { PropertyFilters } from '@/components/property-filters';
import { fetchApprovedProperties, isPermissionDeniedError } from '@/lib/properties-service';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/hooks/use-auth-store';
import { SupabasePermissionAlert } from '@/components/supabase-permission-alert';

export default function HomePage() {
  const [properties, setProperties] = React.useState<Property[]>([]);
  const [featuredProperties, setFeaturedProperties] = React.useState<Property[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSearching, setIsSearching] = React.useState(false);
  const [permissionError, setPermissionError] = React.useState<string | null>(null);
  const { toast } = useToast();
  const { initialized, isAuthenticated } = useAuthStore();

  const plugin = React.useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true })
  );

  const loadProperties = React.useCallback(
    async (filters?: Partial<PropertyFilterValues>, searching = false) => {
      if (!isSupabaseConfigured()) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setPermissionError(null);
      try {
        const results = await fetchApprovedProperties(filters);
        setProperties(results);
        if (!searching) {
          setFeaturedProperties(results.slice(0, 8));
        }
      } catch (err: any) {
        const message = err?.message || 'Unable to fetch approved properties.';
        if (isPermissionDeniedError(err)) {
          setPermissionError(message);
        } else {
          toast({
            title: 'Could Not Load Listings',
            description: message,
            variant: 'destructive',
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  React.useEffect(() => {
    if (initialized) {
      loadProperties(undefined, false);
    }
  }, [initialized, isAuthenticated, loadProperties]);

  const handleFilterChange = (filters: PropertyFilterValues) => {
    setIsSearching(true);
    loadProperties(filters, true);
  };

  const handleReset = () => {
    setIsSearching(false);
    loadProperties(undefined, false);
  };

  return (
    <div className="space-y-16">
      <Hero />

      <section className="bg-card/95 backdrop-blur-sm p-4 -mt-20 mb-10 relative z-10 rounded-lg shadow-2xl border">
        <PropertyFilters
          onFilterChange={handleFilterChange}
          onReset={handleReset}
          defaultListingType="all"
        />
      </section>

      {permissionError && (
        <section>
          <SupabasePermissionAlert message={permissionError} />
        </section>
      )}

      {!isSearching && featuredProperties.length > 0 && (
        <section>
          <div className="flex items-center gap-4 mb-8">
            <Building className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-bold font-headline">Featured Listings</h2>
          </div>
          <Carousel
            plugins={[plugin.current]}
            opts={{
              align: 'start',
              loop: featuredProperties.length > 1,
            }}
            className="w-full"
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
          >
            <CarouselContent className="-ml-4">
              {featuredProperties.map((property) => (
                <CarouselItem
                  key={property.id}
                  className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                >
                  <PropertyCard property={property} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2" />
            <CarouselNext className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2" />
          </Carousel>
        </section>
      )}

      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <SearchIcon className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold font-headline">
            {isSearching ? 'Search Results' : 'Approved Properties'}
          </h2>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>Loading properties...</span>
          </div>
        ) : properties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed rounded-lg">
            <h2 className="text-2xl font-semibold text-muted-foreground font-headline">
              No Approved Properties Found
            </h2>
            <p className="text-muted-foreground mt-2">
              {isSearching
                ? 'Try adjusting your search filters or reset to view all listings.'
                : 'Check back soon or list your property to get started.'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
