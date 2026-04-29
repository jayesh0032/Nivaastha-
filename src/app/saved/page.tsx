'use client';

import * as React from 'react';
import { useSavedStore } from '@/hooks/use-saved-store';
import { PropertyCard } from '@/components/property-card';
import { Bookmark } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import { usePropertyStore } from '@/hooks/use-property-store';

function SavedPageContent() {
  const { savedIds } = useSavedStore();
  const { properties } = usePropertyStore();

  const [savedProperties, setSavedProperties] = React.useState(() => 
    properties.filter(p => savedIds.has(p.id))
  );

  React.useEffect(() => {
    setSavedProperties(properties.filter(p => savedIds.has(p.id)));
  }, [savedIds, properties]);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Bookmark className="h-8 w-8 text-accent"/>
        <h1 className="text-3xl font-bold font-headline">Saved Properties</h1>
      </div>
      
      {savedProperties.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {savedProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 border-2 border-dashed rounded-lg">
          <h2 className="text-2xl font-semibold text-muted-foreground font-headline">No saved properties yet</h2>
          <p className="text-muted-foreground mt-2">Click the heart icon on any listing to save it here.</p>
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
