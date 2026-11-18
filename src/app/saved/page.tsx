'use client';

import * as React from 'react';
import { useSavedStore } from '@/hooks/use-saved-store';
import { PropertyCard } from '@/components/property-card';
import { Bookmark, Loader2 } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import type { Property } from '@/lib/types';
import { fetchPropertiesByIds } from '@/lib/properties-service';
import { isSupabaseConfigured } from '@/lib/supabase';

function SavedPageContent() {
  const { savedList } = useSavedStore();
  const [savedProperties, setSavedProperties] = React.useState<Property[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    async function load() {
      if (!isSupabaseConfigured() || savedList.length === 0) {
        setSavedProperties([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const items = await fetchPropertiesByIds(savedList);
        if (active) setSavedProperties(items);
      } catch {
        if (active) setSavedProperties([]);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [savedList]);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Bookmark className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline">Saved Properties</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading saved properties...</span>
        </div>
      ) : savedProperties.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {savedProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 border-2 border-dashed rounded-lg">
          <h2 className="text-2xl font-semibold text-muted-foreground font-headline">
            No saved properties yet
          </h2>
          <p className="text-muted-foreground mt-2">
            Click the heart icon on any listing to save it here.
          </p>
        </div>
      )}
    </div>
  );
}

export default function SavedPage() {
  return (
    <AuthGuard>
      <SavedPageContent />
    </AuthGuard>
  );
}
