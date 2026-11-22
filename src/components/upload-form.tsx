'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, LocateFixed, CheckCircle2, ClipboardList, PlusSquare } from 'lucide-react';
import type { Property } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/hooks/use-auth-store';
import {
  PhotoUploadField,
  PROPERTY_PHOTO_SLOTS,
  MAX_PROPERTY_PHOTOS,
  createEmptyPhotoSlots,
  createInitialPhotoSlots,
} from './photo-upload-field';
import { Label } from './ui/label';
import { getAddressFromCoordinates, searchAddress } from '@/lib/location-actions';
import { Separator } from './ui/separator';
import {
  createPropertyListing,
  updatePropertyListing,
} from '@/lib/properties-service';
import Link from 'next/link';
import type { PropertyPhotoSlots } from '@/lib/types';

const photoSlotValueSchema = z.union([z.instanceof(File), z.string().min(1), z.null()]);

const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  listing_type: z.enum(['rent', 'sale']),
  property_type: z.string().min(1, 'Property type is required.'),
  price: z.coerce
    .number({ invalid_type_error: 'Please enter a valid price.' })
    .positive('Price must be greater than 0.'),
  bhk: z.string().min(1, 'Please select BHK.'),
  area_sqft: z.coerce
    .number({ invalid_type_error: 'Please enter a valid area.' })
    .positive('Area must be greater than 0.')
    .optional()
    .or(z.literal('')),
  city: z.string().min(2, 'City is required.'),
  locality: z.string().min(2, 'Locality / area is required.'),
  address: z.string().min(5, 'Full address is required.'),
  contact_name: z
    .string()
    .trim()
    .min(2, 'Contact person name is required.')
    .max(100, 'Contact person name is too long.'),
  contact_phone: z
    .string()
    .trim()
    .min(10, 'Enter a valid 10-digit contact phone number.')
    .max(15, 'Phone number is too long.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  photos: z
    .object({
      front: photoSlotValueSchema,
      kitchen: photoSlotValueSchema,
      bedroom: photoSlotValueSchema,
      extra1: photoSlotValueSchema,
      extra2: photoSlotValueSchema,
      extra3: photoSlotValueSchema,
    })
    .superRefine((slots, ctx) => {
      const missing: string[] = [];
      if (!slots.front) missing.push('Front');
      if (!slots.kitchen) missing.push('Kitchen');
      if (!slots.bedroom) missing.push('Bedroom');

      if (missing.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Compulsory live photo${missing.length > 1 ? 's' : ''} missing: ${missing.join(', ')}.`,
        });
      }

      const totalCount = PROPERTY_PHOTO_SLOTS.filter((meta) => Boolean(slots[meta.key])).length;
      if (totalCount > MAX_PROPERTY_PHOTOS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Maximum ${MAX_PROPERTY_PHOTOS} photos are allowed.`,
        });
      }
    }),
});

type FormValues = z.infer<typeof formSchema>;

interface UploadFormProps {
  propertyToEdit?: Property;
}

export function UploadForm({ propertyToEdit }: UploadFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { user, profile } = useAuthStore();

  const isEditMode = Boolean(propertyToEdit);
  const [removedImages, setRemovedImages] = React.useState<string[]>([]);
  const [submittedPending, setSubmittedPending] = React.useState(false);

  const [isLocating, setIsLocating] = React.useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = React.useState(false);
  const [addressQuery, setAddressQuery] = React.useState('');
  const [addressResults, setAddressResults] = React.useState<any[]>([]);

  const initialSlots = React.useMemo<PropertyPhotoSlots>(
    () => (propertyToEdit ? createInitialPhotoSlots(propertyToEdit.images) : createEmptyPhotoSlots()),
    [propertyToEdit]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: propertyToEdit
      ? {
          title: propertyToEdit.title,
          listing_type: propertyToEdit.listing_type,
          property_type: propertyToEdit.property_type || 'Flat',
          price: propertyToEdit.price,
          bhk: propertyToEdit.bhk || 'N/A',
          area_sqft: propertyToEdit.area_sqft ?? '',
          city: propertyToEdit.city,
          locality: propertyToEdit.locality,
          address: propertyToEdit.address,
          contact_name: propertyToEdit.contact_name || '',
          contact_phone: propertyToEdit.contact_phone,
          description: propertyToEdit.description,
          photos: initialSlots,
        }
      : {
          title: '',
          listing_type: 'rent',
          property_type: 'Flat',
          price: undefined as any,
          bhk: '2BHK',
          area_sqft: '' as any,
          city: '',
          locality: '',
          address: '',
          contact_name: profile?.full_name || profile?.name || '',
          contact_phone: profile?.phone || '',
          description: '',
          photos: createEmptyPhotoSlots(),
        },
  });

  const propertyType = form.watch('property_type');
  const listingType = form.watch('listing_type');

  React.useEffect(() => {
    if (propertyType === 'Shop' || propertyType === 'Showroom' || propertyType.startsWith('PG')) {
      form.setValue('bhk', 'N/A');
    } else if (form.getValues('bhk') === 'N/A') {
      form.setValue('bhk', '1BHK');
    }
  }, [propertyType, form]);

  const handleRemoveExistingImage = (url: string) => {
    setRemovedImages((prev) => (prev.includes(url) ? prev : [...prev, url]));
  };

  const handleFindOnMap = async () => {
    if (!addressQuery.trim()) {
      toast({
        title: 'Address Missing',
        description: 'Please enter a street, locality, or city to search.',
        variant: 'destructive',
      });
      return;
    }
    setIsSearchingAddress(true);
    try {
      const results = await searchAddress(addressQuery);
      if (results && results.length > 0) {
        setAddressResults(results);
        toast({
          title: 'Locations Found',
          description: 'Select a matching address from the suggestions below.',
        });
      } else {
        toast({
          title: 'Address Not Found',
          description: 'Could not find that address. You can enter it manually below.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleSelectAddress = (result: any) => {
    const addr = result.address ?? {};
    const street =
      [addr.building, addr.house_number, addr.road, addr.pedestrian, addr.neighbourhood]
        .filter(Boolean)
        .join(', ') || result.display_name.split(',')[0];
    const locality =
      [addr.suburb, addr.residential, addr.quarter].find(Boolean) || '';
    const city =
      addr.city || addr.town || addr.village || addr.state_district || '';

    if (street) form.setValue('address', result.display_name || street, { shouldValidate: true });
    if (locality) form.setValue('locality', locality, { shouldValidate: true });
    if (city) form.setValue('city', city, { shouldValidate: true });

    setAddressQuery(result.display_name);
    setAddressResults([]);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Geolocation Not Supported',
        description: 'Your browser does not support geolocation.',
        variant: 'destructive',
      });
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const addr = await getAddressFromCoordinates(latitude, longitude);
        if (addr) {
          const fullAddress = [addr.street, addr.colony, addr.sector, addr.city, addr.state, addr.pin]
            .filter(Boolean)
            .join(', ');
          form.setValue('address', fullAddress, { shouldValidate: true });
          if (addr.colony || addr.sector) {
            form.setValue('locality', addr.colony || addr.sector || '', { shouldValidate: true });
          }
          if (addr.city) {
            form.setValue('city', addr.city, { shouldValidate: true });
          }
          toast({
            title: 'Location Updated',
            description: 'Address fields have been filled from your current location.',
          });
        } else {
          toast({
            title: 'Could Not Fetch Address',
            description: 'Unable to resolve an address from your coordinates.',
            variant: 'destructive',
          });
        }
        setIsLocating(false);
      },
      (error) => {
        toast({
          title: 'Geolocation Error',
          description: error.message || 'Location permission denied.',
          variant: 'destructive',
        });
        setIsLocating(false);
      }
    );
  };

  async function onSubmit(values: FormValues) {
    if (!user?.id) {
      toast({
        title: 'Login Required',
        description: 'You must be logged in to post or edit a property.',
        variant: 'destructive',
      });
      router.push('/login');
      return;
    }

    const newFiles: File[] = PROPERTY_PHOTO_SLOTS.map((meta) => values.photos[meta.key])
      .filter((item): item is File => item instanceof File)
      .slice(0, MAX_PROPERTY_PHOTOS);

    try {
      const payload = {
        title: values.title,
        listing_type: values.listing_type,
        property_type: values.property_type,
        price: Number(values.price),
        bhk: values.bhk,
        area_sqft: values.area_sqft ? Number(values.area_sqft) : null,
        city: values.city,
        locality: values.locality,
        address: values.address,
        description: values.description,
        contact_name: values.contact_name,
        contact_phone: values.contact_phone,
      };

      if (isEditMode && propertyToEdit) {
        await updatePropertyListing(
          propertyToEdit.id,
          user.id,
          payload,
          newFiles,
          removedImages
        );
        toast({
          title: 'Listing Updated',
          description: 'Your property changes have been saved.',
        });
        router.push('/my-properties');
      } else {
        await createPropertyListing(user.id, payload, newFiles);
        toast({
          title: 'Property Submitted',
          description: 'Your listing will go live after review',
          duration: 7000,
        });
        setSubmittedPending(true);
        form.reset({
          ...form.getValues(),
          title: '',
          price: undefined as any,
          area_sqft: '' as any,
          city: '',
          locality: '',
          address: '',
          description: '',
          photos: createEmptyPhotoSlots(),
        });
      }
    } catch (error: any) {
      toast({
        title: 'Submission Failed',
        description: error?.message || 'Unable to save your property listing.',
        variant: 'destructive',
      });
    }
  }

  if (submittedPending) {
    return (
      <Card className="max-w-xl mx-auto shadow-lg border-primary/30">
        <CardContent className="p-8 text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center text-primary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-headline">Property Submitted!</h2>
            <p className="text-lg text-foreground font-medium">
              Your listing will go live after review
            </p>
            <p className="text-sm text-muted-foreground">
              You can track its approval status, edit details, or manage photos anytime from My
              Listings.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button asChild>
              <Link href="/my-properties">
                <ClipboardList className="mr-2 h-4 w-4" />
                Go to My Listings
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSubmittedPending(false);
              }}
            >
              <PlusSquare className="mr-2 h-4 w-4" />
              Post Another Property
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Property Details</CardTitle>
            <CardDescription>
              Provide a clear title, location, and contact phone for interested buyers or tenants.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Spacious 2BHK Apartment in Bandra West" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="text-lg font-medium">Location &amp; Address</h3>
              <div className="space-y-2">
                <Label htmlFor="address-search">Quick Address Lookup (Optional)</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="address-search"
                    placeholder="Search landmark, locality, or city"
                    value={addressQuery}
                    onChange={(e) => setAddressQuery(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleFindOnMap}
                      disabled={isSearchingAddress || isLocating}
                    >
                      {isSearchingAddress ? (
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      ) : (
                        <Search className="mr-2 h-4 w-4" />
                      )}
                      Find
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleUseMyLocation}
                      disabled={isLocating || isSearchingAddress}
                    >
                      {isLocating ? (
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      ) : (
                        <LocateFixed className="mr-2 h-4 w-4" />
                      )}
                      My Location
                    </Button>
                  </div>
                </div>
              </div>

              {addressResults.length > 0 && (
                <div className="space-y-2">
                  <Label>Select an Address</Label>
                  <ul className="max-h-40 overflow-y-auto rounded-md border">
                    {addressResults.map((result) => (
                      <li key={result.place_id}>
                        <button
                          type="button"
                          className="w-full text-left p-2 text-sm hover:bg-accent"
                          onClick={() => handleSelectAddress(result)}
                        >
                          <p className="font-medium">{result.display_name}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Mumbai" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="locality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Locality / Area</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Bandra West" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Full Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Flat 402, Sunshine Towers, Hill Road, Bandra West"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Specifications &amp; Pricing</CardTitle>
            <CardDescription>
              Choose whether the property is for rent or sale, and enter its specifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="listing_type"
              render={({ field }) => (
                <FormItem className="space-y-3 md:col-span-2">
                  <FormLabel>Listing Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex items-center gap-6 pt-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="rent" id="rent-radio" />
                        <Label htmlFor="rent-radio" className="font-normal cursor-pointer">
                          For Rent
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sale" id="sale-radio" />
                        <Label htmlFor="sale-radio" className="font-normal cursor-pointer">
                          For Sale
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="property_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select property type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Flat">Flat / Apartment</SelectItem>
                      <SelectItem value="House">House</SelectItem>
                      <SelectItem value="Villa">Villa</SelectItem>
                      <SelectItem value="Shop">Shop</SelectItem>
                      <SelectItem value="Showroom">Showroom</SelectItem>
                      <SelectItem value="PG for boys">PG for boys</SelectItem>
                      <SelectItem value="PG for girls">PG for girls</SelectItem>
                      <SelectItem value="PG">PG (Co-ed)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bhk"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>BHK</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={
                      propertyType === 'Shop' ||
                      propertyType === 'Showroom' ||
                      propertyType.startsWith('PG')
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select BHK" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="N/A">N/A</SelectItem>
                      <SelectItem value="1BHK">1 BHK</SelectItem>
                      <SelectItem value="2BHK">2 BHK</SelectItem>
                      <SelectItem value="3BHK">3 BHK</SelectItem>
                      <SelectItem value="4BHK">4 BHK</SelectItem>
                      <SelectItem value="5BHK">5 BHK</SelectItem>
                      <SelectItem value="5+BHK">5+ BHK</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {listingType === 'rent' ? 'Monthly Rent (₹)' : 'Sale Price (₹)'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder={listingType === 'rent' ? 'e.g., 25000' : 'e.g., 7500000'}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="area_sqft"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Area (sq. ft.)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="e.g., 1200"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Rajesh Sharma" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="e.g., 9876543210"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Property Photos (Live Camera Only)</CardTitle>
            <CardDescription>
              Capture up to 6 live photos using the full-screen camera. Front, Kitchen, and Bedroom
              photos are compulsory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PhotoUploadField
              name="photos"
              label="Live Property Photos"
              description="Tap any slot below to open the full-screen camera and capture a live photo."
              onRemoveExistingUrl={handleRemoveExistingImage}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Property Description</CardTitle>
            <CardDescription>
              Highlight amenities, nearby landmarks, furnishing, and parking details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your property, highlighting its best features..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditMode ? 'Save Changes' : 'Submit Property for Review'}
        </Button>
      </form>
    </Form>
  );
}
