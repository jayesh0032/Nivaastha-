'use client';

import type { Property } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Heart, MapPin, BedDouble, Users, Building2, Tag } from 'lucide-react';
import { useSavedStore } from '@/hooks/use-saved-store';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PropertyCardProps {
  property: Property;
}

const formatCurrency = (value: number, isSale = false) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        notation: isSale ? 'compact' : 'standard',
    }).format(value);
};

export function PropertyCard({ property }: PropertyCardProps) {
  const { isSaved, toggleSaved } = useSavedStore();
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();
  const saved = isSaved(property.id);

  const handleSaveToggle = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();

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
      description: saved ? `"${property.title}" removed from your list.` : `"${property.title}" added to your list.`,
      duration: 3000,
    });
  };

  const getBadgeVariant = (type: Property['type']) => {
    switch(type) {
      case 'House': return 'default';
      case 'Villa': return 'accent';
      case 'PG for boys': return 'default';
      case 'PG for girls': return 'accent';
      case 'PG': return 'secondary';
      default: return 'secondary';
    }
  }

  const imageUrl = property.images?.frontView?.url || 'https://placehold.co/600x400.png';
  const location = property.address ? `${property.address.city}, ${property.address.state}` : 'Location not available';
  const isForSale = property.salePrice && property.salePrice > 0;

  return (
    <Link href={`/property/${property.id}`} className="group block h-full">
      <Card className="flex flex-col overflow-hidden transition-all duration-200 ease-in-out h-full group-hover:shadow-xl group-hover:-translate-y-1">
        <CardHeader className="p-0 relative">
          <div className="aspect-video relative overflow-hidden">
            <Image 
              src={imageUrl} 
              alt={property.title} 
              fill 
              className="object-cover transition-transform duration-200 group-hover:scale-105" 
              data-ai-hint={property.images?.frontView?.hint || 'property exterior'} 
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-200" />
          </div>
          <Button size="icon" variant="secondary" className="absolute top-3 right-3 rounded-full h-8 w-8 bg-background/80 hover:bg-background backdrop-blur-sm" onClick={handleSaveToggle}>
            <Heart className={cn("h-4 w-4", saved && isAuthenticated ? 'text-red-500 fill-current' : 'text-foreground')} />
          </Button>
          {isForSale ? (
             <Badge variant="destructive" className="capitalize absolute top-3 left-3 flex items-center gap-1">
                <Tag className="h-3 w-3" /> For Sale
             </Badge>
          ) : (
             <Badge variant={getBadgeVariant(property.type)} className="capitalize absolute top-3 left-3">{property.type}</Badge>
          )}
        </CardHeader>
        <CardContent className="flex-grow p-4 space-y-3">
            <CardTitle className="font-headline text-lg leading-tight group-hover:text-primary transition-colors duration-200">{property.title}</CardTitle>
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mr-1.5 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
          <div className="text-xl font-bold flex items-baseline text-foreground">
              {isForSale ? formatCurrency(property.salePrice!, true) : 
                (
                    <>
                     {formatCurrency(property.rent)} <span className="text-sm font-normal text-muted-foreground ml-1.5">/ month</span>
                    </>
                )
              }
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-between items-center text-sm text-muted-foreground border-t mt-auto">
          {property.suitability !== 'Commercial' && property.bhk !== 'N/A' ? (
             <div className="flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-accent-foreground" />
                <span className="font-medium">{property.bhk}</span>
             </div>
          ) : <div />}
          <div className="flex items-center gap-2">
            {property.suitability === 'Commercial' ? (
                <Building2 className="h-4 w-4 text-accent-foreground" />
            ) : (
                <Users className="h-4 w-4 text-accent-foreground" />
            )}
            <span className="font-medium">{property.suitability}</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
