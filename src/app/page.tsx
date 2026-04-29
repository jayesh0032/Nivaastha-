
'use client';

import * as React from 'react';
import { PropertyCard } from '@/components/property-card';
import type { Property } from '@/lib/types';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Building, Search as SearchIcon } from 'lucide-react';
import { usePropertyStore } from '@/hooks/use-property-store';
import Autoplay from "embla-carousel-autoplay";
import { Hero } from '@/components/hero';
import { PropertyFilters } from '@/components/property-filters';

export default function HomePage() {
  const { properties, initializeProperties, isInitialized } = usePropertyStore();
  
  const [filteredProperties, setFilteredProperties] = React.useState<Property[]>([]);
  const [topProperties, setTopProperties] = React.useState<Property[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  
  const rentalProperties = React.useMemo(() => 
    properties.filter(p => !p.isRented && (!p.salePrice || p.salePrice === 0)), 
    [properties]
  );
  
  React.useEffect(() => {
    if (!isInitialized) {
      initializeProperties();
    }
  }, [isInitialized, initializeProperties]);

  const plugin = React.useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true })
  );

  React.useEffect(() => {
    setFilteredProperties(rentalProperties);
    
    if (rentalProperties.length > 0) {
      const shuffled = [...rentalProperties].sort(() => 0.5 - Math.random());
      setTopProperties(shuffled.slice(0, 8));
    }
  }, [rentalProperties]);

  const handleFilterChange = (newProperties: Property[]) => {
      // Further filter the already-rental properties
      const rentOnlyFiltered = newProperties.filter(p => !p.salePrice || p.salePrice === 0);
      setFilteredProperties(rentOnlyFiltered);
      setIsSearching(true);
  }
  
  const handleReset = () => {
    setFilteredProperties(rentalProperties);
    setIsSearching(false);
  }

  return (
    <div className="space-y-16">
      <Hero />

      <section className="bg-card/95 backdrop-blur-sm p-4 -mt-20 mb-10 relative z-10 rounded-lg shadow-2xl border">
          <PropertyFilters onFilterChange={handleFilterChange} onReset={handleReset} filterContext="rent" />
      </section>

      {!isSearching && (
        <section>
          <div className="flex items-center gap-4 mb-8">
            <Building className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-bold font-headline">Featured Rental Listings</h2>
          </div>
          {topProperties.length > 0 ? (
              <Carousel 
                plugins={[plugin.current]}
                opts={{
                  align: 'start',
                  loop: true,
                }}
                className="w-full"
                onMouseEnter={plugin.current.stop}
                onMouseLeave={plugin.current.reset}
              >
                <CarouselContent className="-ml-4">
                  {topProperties.map((property) => (
                    <CarouselItem key={property.id} className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                      <PropertyCard property={property} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2" />
                <CarouselNext className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2" />
              </Carousel>
          ) : (
              <div className="text-center py-16 text-muted-foreground">Loading properties...</div>
          )}
        </section>
      )}

      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <SearchIcon className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold font-headline">
            {isSearching ? 'Search Results' : 'All Rental Properties'}
          </h2>
        </div>
        {filteredProperties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed rounded-lg">
            <h2 className="text-2xl font-semibold text-muted-foreground font-headline">No Rental Properties Found</h2>
            <p className="text-muted-foreground mt-2">Try adjusting your search filters or check back later.</p>
          </div>
        )}
      </section>

    </div>
  );
}
