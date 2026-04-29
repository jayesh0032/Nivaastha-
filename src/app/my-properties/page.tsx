
'use client';

import * as React from 'react';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useUserStore } from '@/hooks/use-user-store';
import { usePropertyStore } from '@/hooks/use-property-store';
import { AuthGuard } from '@/components/auth-guard';
import type { Property } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ClipboardList, Trash2, Pencil, CheckCircle, XCircle } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';

function MyPropertiesPageContent() {
  const { userMobile } = useAuthStore();
  const { findUserByMobile, removePropertyFromUser } = useUserStore();
  const { properties, removeProperty, toggleRentedStatus } = usePropertyStore();
  const { toast } = useToast();
  
  const user = userMobile ? findUserByMobile(userMobile) : null;
  
  const [userProperties, setUserProperties] = React.useState<Property[]>([]);

  React.useEffect(() => {
    if (user && properties) {
      const filtered = properties.filter(p => user.listedProperties.includes(p.id));
      setUserProperties(filtered);
    } else {
      setUserProperties([]);
    }
  }, [user, properties, user?.listedProperties]);

  const handleRemoveProperty = (propertyId: string, propertyTitle: string) => {
    if (!userMobile) return;
    
    removeProperty(propertyId);
    removePropertyFromUser(userMobile, propertyId);

    toast({
      title: 'Property Removed',
      description: `"${propertyTitle}" has been successfully removed.`,
    });
  };

  const handleToggleRented = (propertyId: string, propertyTitle: string, isCurrentlyRented: boolean) => {
    toggleRentedStatus(propertyId);
    toast({
        title: 'Status Updated',
        description: `"${propertyTitle}" has been marked as ${isCurrentlyRented ? 'available' : 'rented'}.`
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <ClipboardList className="h-8 w-8 text-accent"/>
        <h1 className="text-3xl font-bold font-headline">My Listed Properties</h1>
      </div>
      
      {userProperties.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {userProperties.map((property) => (
            <Card key={property.id} className="flex flex-col overflow-hidden transition-all duration-300 ease-in-out group">
              <div className="aspect-video relative overflow-hidden">
                <Image 
                  src={property.images.frontView.url || 'https://placehold.co/600x400.png'} 
                  alt={property.title} 
                  fill 
                  className="object-cover transition-transform duration-300 group-hover:scale-105" 
                  data-ai-hint={property.images.frontView.hint} 
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                 {property.isRented && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-lg font-bold bg-primary/80 px-4 py-2 rounded-md">RENTED</span>
                    </div>
                )}
              </div>
              <div className="p-4 flex-grow flex flex-col">
                <h3 className="font-headline text-lg leading-tight flex-grow">{property.title}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {property.address ? `${property.address.city}, ${property.address.state}` : 'Location not available'}
                </p>
              </div>
              <div className="p-4 pt-0 border-t mt-4 flex gap-2">
                 <Button asChild variant="outline" className="flex-1">
                    <Link href={`/property/${property.id}`}>View</Link>
                 </Button>
                 <Button asChild variant="outline" className="flex-1">
                    <Link href={`/edit-property/${property.id}`} aria-label="Edit Property">
                        <Pencil className="h-4 w-4" />
                    </Link>
                 </Button>
                 <Button
                    variant={property.isRented ? 'secondary' : 'outline'}
                    className="flex-1"
                    onClick={() => handleToggleRented(property.id, property.title, !!property.isRented)}
                 >
                   {property.isRented ? <XCircle /> : <CheckCircle />}
                 </Button>
                 <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="flex-1">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently remove "{property.title}" from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleRemoveProperty(property.id, property.title)}>
                        Continue
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 border-2 border-dashed rounded-lg">
          <h2 className="text-2xl font-semibold text-muted-foreground font-headline">You haven't listed any properties yet</h2>
          <Button asChild className="mt-4">
            <Link href="/upload">List Your First Property</Link>
          </Button>
        </div>
      )}
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
