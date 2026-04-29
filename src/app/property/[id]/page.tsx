
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSavedStore } from '@/hooks/use-saved-store';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AuthGuard } from '@/components/auth-guard';
import { usePropertyStore } from '@/hooks/use-property-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Heart, MapPin, BedDouble, Users, Phone, UserCircle, Building, Building2, Layers, Tag, Sparkles } from 'lucide-react';
import { ImageGallery } from '@/components/image-gallery';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import type { Property, PropertyImage, Address } from '@/lib/types';
import dynamic from 'next/dynamic';

const formatAddress = (address: Address) => {
    return [
        address.street,
        address.colony,
        address.sector,
        address.city,
        address.state,
        address.pin,
        address.country
    ].filter(Boolean).join(', ');
};

const formatCurrency = (value: number, isSale = false) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        notation: isSale ? 'compact' : 'standard',
    }).format(value);
};

function PropertyDetailPageContent() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { isAuthenticated } = useAuthStore();
    const { isSaved, toggleSaved } = useSavedStore();
    const { properties } = usePropertyStore();

    const property = properties.find(p => p.id === params.id);

    if (!property) {
        return (
            <div className="text-center py-20">
                <h1 className="text-4xl font-bold font-headline">Property Not Found</h1>
                <p className="text-muted-foreground mt-4">The property you are looking for does not exist or has been removed.</p>
                <Button asChild className="mt-8">
                    <Link href="/">Back to Home</Link>
                </Button>
            </div>
        );
    }
    
    const saved = isSaved(property.id);
    const fullAddress = property.address ? formatAddress(property.address) : 'Address not available';
    const isForSale = property.salePrice && property.salePrice > 0;


    const allImages: PropertyImage[] = [];
    if (property.images.frontView) allImages.push(property.images.frontView);
    if (property.images.kitchen) allImages.push(property.images.kitchen);
    if (property.images.rooms) allImages.push(...property.images.rooms);
    if (property.images.hall) allImages.push(...property.images.hall);

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
          description: saved ? `"${property.title}" removed from your list.` : `"${property.title}" added to your list.`,
          duration: 3000,
        });
    };
    
    const handleContactClick = (e: React.MouseEvent) => {
        if (!isAuthenticated) {
            e.preventDefault();
            toast({
                title: 'Login Required',
                description: 'You need to be logged in to contact property owners.',
                variant: 'destructive',
            });
            router.push('/login');
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-8">
            <div className="mb-6">
                 <div className="flex items-center gap-2">
                    {isForSale ? (
                         <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="capitalize shrink-0 flex items-center gap-1">
                                <Tag className="h-3 w-3" /> For Sale
                            </Badge>
                            {property.condition && (
                                <Badge variant="outline" className="capitalize border-primary text-primary bg-primary/5">
                                    {property.condition}
                                </Badge>
                            )}
                         </div>
                    ) : (
                        <Badge variant={getBadgeVariant(property.type)} className="capitalize shrink-0">{property.type}</Badge>
                    )}
                    {property.address && (
                        <div className="flex items-center text-muted-foreground">
                            <MapPin className="h-4 w-4 mr-1.5 shrink-0" />
                            <span className="text-sm">{property.address.city}, {property.address.state}</span>
                        </div>
                    )}
                 </div>
                 <h1 className="text-4xl lg:text-5xl font-bold font-headline mt-2">{property.title}</h1>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    <ImageGallery images={allImages} title={property.title} />

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline text-2xl">Property Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="leading-relaxed whitespace-pre-line">{property.description}</p>
                        </CardContent>
                    </Card>

                    {property.address && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline text-2xl">Address</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <MapPin className="h-6 w-6 text-muted-foreground mt-1 shrink-0" />
                                    <div>
                                        <p className="font-semibold">{property.address.street}{property.address.colony ? `, ${property.address.colony}` : ''}</p>
                                        {property.address.sector && <p>{property.address.sector}</p>}
                                        <p>{property.address.city}, {property.address.state} - {property.address.pin}</p>
                                        <p>{property.address.country}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                </div>
                
                <div className="lg:col-span-1 lg:sticky lg:top-24 space-y-6">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardDescription>{isForSale ? 'Asking Price' : 'Rent Starting From'}</CardDescription>
                                    <div className="text-4xl font-bold flex items-baseline">
                                        {isForSale ? formatCurrency(property.salePrice!, true) : formatCurrency(property.rent)}
                                        {!isForSale && <span className="text-lg font-normal text-muted-foreground ml-1.5">/ month</span>}
                                    </div>
                                </div>
                                <Button size="icon" variant="outline" className="rounded-full h-10 w-10 shrink-0" onClick={handleSaveToggle}>
                                    <Heart className={cn("h-5 w-5", saved && isAuthenticated ? 'text-red-500 fill-current' : 'text-foreground')} />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2 text-center text-sm border rounded-lg p-2">
                                <div className="flex-1 p-2 bg-secondary/30 rounded min-w-[80px]">
                                    <Building className="h-5 w-5 mx-auto text-accent-foreground" />
                                    <p className="mt-1 font-semibold">{property.type}</p>
                                </div>
                                {property.floorNumber && (
                                    <div className="flex-1 p-2 bg-secondary/30 rounded min-w-[80px]">
                                        <Layers className="h-5 w-5 mx-auto text-accent-foreground" />
                                        <p className="mt-1 font-semibold">{property.floorNumber}</p>
                                    </div>
                                )}
                                {property.suitability !== 'Commercial' && property.bhk !== 'N/A' && (
                                    <div className="flex-1 p-2 bg-secondary/30 rounded min-w-[80px]">
                                        <BedDouble className="h-5 w-5 mx-auto text-accent-foreground" />
                                        <p className="mt-1 font-semibold">{property.bhk}</p>
                                    </div>
                                )}
                                <div className="flex-1 p-2 bg-secondary/30 rounded min-w-[80px]">
                                    {property.suitability === 'Commercial' ? (
                                        <Building2 className="h-5 w-5 mx-auto text-accent-foreground" />
                                    ) : (
                                        <Users className="h-5 w-5 mx-auto text-accent-foreground" />
                                    )}
                                    <p className="mt-1 font-semibold">{property.suitability}</p>

                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button size="lg" className="w-full" asChild>
                                    <Link href={`tel:${property.owner.mobile.replace(/\D/g, '')}`} onClick={handleContactClick}>
                                        <Phone />
                                        Call Owner
                                    </Link>
                                </Button>
                                <Button size="lg" className="w-full" variant="secondary" asChild>
                                    <Link href={`https://wa.me/91${property.owner.mobile.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={handleContactClick}>
                                        <WhatsAppIcon />
                                        WhatsApp
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline text-xl">Owner Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                    <UserCircle className="w-8 h-8 text-muted-foreground"/>
                                </div>
                                <div>
                                    <p className="font-semibold">{property.owner.name}</p>
                                    <p className="text-sm text-muted-foreground">Property Owner</p>
                                </div>
                            </div>
                            <Separator />
                            <div className="flex items-center gap-3">
                                <Phone className="h-5 w-5 text-muted-foreground" />
                                <span className="font-medium text-foreground">{property.owner.mobile}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function PropertyDetailPage() {
  return (
    <AuthGuard>
      <PropertyDetailPageContent />
    </AuthGuard>
  );
}
