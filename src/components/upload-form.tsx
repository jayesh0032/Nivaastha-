
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getAIDescription } from '@/lib/actions';
import { Loader2, Sparkles, Tag, Search, LocateFixed } from 'lucide-react';
import type { Property, PropertyImage, Address } from '@/lib/types';
import { usePropertyStore } from '@/hooks/use-property-store';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useUserStore } from '@/hooks/use-user-store';
import { PhotoUploadField } from './photo-upload-field';
import { Label } from './ui/label';
import { getAddressFromCoordinates, searchAddress } from '@/lib/location-actions';
import { Separator } from './ui/separator';
import { indianStates } from '@/lib/location-data';

const fileToDataURI = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const urlToDataURI = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const normalizeFiles = (val: any): File[] => {
  if (!val) return [];
  if (val instanceof FileList) return Array.from(val);
  if (Array.isArray(val)) return val;
  return [val];
};

const singleFileValidation = (isEditMode: boolean) => z.any()
  .refine((files) => {
    const arr = normalizeFiles(files);
    if (isEditMode && arr.length === 0) return true;
    return arr.length > 0;
  }, 'This photo is required.')
  .refine((files) => {
    const arr = normalizeFiles(files);
    if (arr.length === 0) return true;
    return arr[0]?.size <= MAX_FILE_SIZE;
  }, `Max file size is 5MB.`)
  .refine((files) => {
      const arr = normalizeFiles(files);
      if (arr.length === 0) return true;
      return ACCEPTED_IMAGE_TYPES.includes(arr[0]?.type);
  }, '.jpg, .jpeg, .png and .webp files are accepted.');

const multipleFilesValidation = (isEditMode: boolean) => z.any()
  .refine((files) => {
    const arr = normalizeFiles(files);
    if (isEditMode && arr.length === 0) return true;
    return arr.length > 0;
  }, 'At least one photo is required.')
  .refine((files) => {
    const arr = normalizeFiles(files);
    if (arr.length === 0) return true;
    return arr.every(file => file.size <= MAX_FILE_SIZE);
  }, `Max file size for each image is 5MB.`)
  .refine((files) => {
    const arr = normalizeFiles(files);
    if (arr.length === 0) return true;
    return arr.every(file => ACCEPTED_IMAGE_TYPES.includes(file.type));
  }, '.jpg, .jpeg, .png and .webp files are accepted.');

const addressSchema = z.object({
  street: z.string().min(3, 'Street is required.'),
  colony: z.string().optional(),
  sector: z.string().optional(),
  city: z.string().min(2, 'City is required.'),
  state: z.string().min(2, 'State is required.'),
  pin: z.string().min(5, 'PIN code is required.'),
  country: z.string().min(2, 'Country is required.'),
});

const createFormSchema = (isEditMode: boolean) => z.object({
  listingType: z.enum(['rent', 'sale']).default('rent'),
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  address: addressSchema,
  lat: z.number().optional(),
  lng: z.number().optional(),
  propertyType: z.enum(['House', 'Villa', 'Flat', 'Shop', 'Showroom', 'PG for boys', 'PG for girls', 'PG']),
  floorNumber: z.string().optional(),
  condition: z.enum(['New', 'Resale']).optional(),
  bhkType: z.enum(['N/A','1BHK', '2BHK', '3BHK', '4BHK', '5BHK', '5+BHK'], { required_error: 'BHK type is required.' }),
  suitableFor: z.enum(['Family', 'Bachelor', 'Commercial']),
  monthlyRentAmount: z.coerce.number().optional(),
  salePrice: z.coerce.number().optional(),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  frontViewPhoto: singleFileValidation(isEditMode),
  kitchenPhoto: singleFileValidation(isEditMode),
  roomPhotos: multipleFilesValidation(isEditMode),
  hallPhotos: multipleFilesValidation(isEditMode),
}).refine(data => {
    if (data.listingType === 'rent') {
        return data.monthlyRentAmount !== undefined && data.monthlyRentAmount > 0;
    }
    return true;
}, {
    message: 'Rent amount must be a positive number.',
    path: ['monthlyRentAmount'],
}).refine(data => {
    if (data.listingType === 'sale') {
        return data.salePrice !== undefined && data.salePrice > 0;
    }
    return true;
}, {
    message: 'Sale price must be a positive number.',
    path: ['salePrice'],
}).refine(data => {
  if (data.listingType === 'sale') {
    return !!data.condition;
  }
  return true;
}, {
  message: 'Condition is required for properties for sale.',
  path: ['condition'],
});


interface UploadFormProps {
  propertyToEdit?: Property;
}

export function UploadForm({ propertyToEdit }: UploadFormProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = React.useState(false);
  const [addressQuery, setAddressQuery] = React.useState('');
  const [addressResults, setAddressResults] = React.useState<any[]>([]);
  const [isAddressSelected, setIsAddressSelected] = React.useState(false);

  const { addProperty, updateProperty } = usePropertyStore();
  const router = useRouter();
  
  const { userMobile } = useAuthStore();
  const { findUserByMobile, addPropertyToUser } = useUserStore();
  
  const isEditMode = !!propertyToEdit;
  const formSchema = createFormSchema(isEditMode);
  type FormValues = z.infer<typeof formSchema>;
  
  const user = userMobile ? findUserByMobile(userMobile) : null;
  const isFirstListing = user ? user.listedProperties.length === 0 : true;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode ? {
      ...propertyToEdit,
      listingType: propertyToEdit?.salePrice && propertyToEdit.salePrice > 0 ? 'sale' : 'rent',
      propertyType: propertyToEdit?.type,
      monthlyRentAmount: propertyToEdit?.rent,
      salePrice: propertyToEdit?.salePrice,
      bhkType: propertyToEdit?.bhk as any,
      suitableFor: propertyToEdit?.suitability,
      condition: propertyToEdit?.condition,
    } : {
      listingType: 'rent',
      propertyType: 'House',
      bhkType: '1BHK',
      suitableFor: 'Family',
      description: '',
      title: '',
      address: {
        street: '',
        colony: '',
        sector: '',
        city: '',
        state: '',
        pin: '',
        country: 'India',
      },
      floorNumber: '',
      monthlyRentAmount: 0,
      salePrice: 0,
      condition: undefined,
    },
  });

  const propertyType = form.watch('propertyType');
  const listingType = form.watch('listingType');

  React.useEffect(() => {
    if (propertyType === 'Shop' || propertyType === 'Showroom') {
      form.setValue('bhkType', 'N/A');
      form.setValue('suitableFor', 'Commercial');
    } else if (propertyType.startsWith('PG')) {
      form.setValue('bhkType', 'N/A');
      form.setValue('suitableFor', 'Bachelor');
    } else {
        if (form.getValues('bhkType') === 'N/A') {
             form.setValue('bhkType', '1BHK');
        }
        if (form.getValues('suitableFor') === 'Commercial') {
            form.setValue('suitableFor', 'Family');
        }
    }
  }, [propertyType, form]);


  const handleGenerateDescription = async () => {
    setIsGenerating(true);
    form.trigger(["propertyType", "bhkType", "suitableFor", "monthlyRentAmount", "frontViewPhoto", "kitchenPhoto", "hallPhotos", "roomPhotos", "floorNumber"]).then(async (isValid) => {
        const values = form.getValues();
        
        const photoIsAvailable = (files: any, existingImage?: PropertyImage | PropertyImage[]) => {
            const arr = normalizeFiles(files);
            if (arr.length > 0) return true;
            if (isEditMode) {
                if (Array.isArray(existingImage)) {
                    return existingImage.length > 0 && existingImage.every(img => img.url);
                }
                return !!existingImage?.url;
            }
            return false;
        };

        const allPhotosAvailable = 
            photoIsAvailable(values.frontViewPhoto, propertyToEdit?.images.frontView) &&
            photoIsAvailable(values.kitchenPhoto, propertyToEdit?.images.kitchen) &&
            photoIsAvailable(values.hallPhotos, propertyToEdit?.images.hall) &&
            photoIsAvailable(values.roomPhotos, propertyToEdit?.images.rooms);

        if (!isValid || !allPhotosAvailable) {
            toast({ title: "Missing Information", description: "Please fill all required fields and upload all photos before generating a description.", variant: 'destructive'});
            setIsGenerating(false);
            return;
        }
        
        try {
             const getUri = async (files: any, existingImage?: {url?: string}): Promise<string> => {
                const arr = normalizeFiles(files);
                if (arr.length > 0) {
                    return fileToDataURI(arr[0]);
                }
                if (isEditMode && existingImage?.url) {
                    return urlToDataURI(existingImage.url);
                }
                return Promise.reject('No image provided');
            };

            const getUris = async (files: any, existingImages?: {url?: string}[]): Promise<string[]> => {
                const arr = normalizeFiles(files);
                if (arr.length > 0) {
                    return Promise.all(arr.map(fileToDataURI));
                }
                if (isEditMode && existingImages && existingImages.length > 0) {
                    const validUrls = existingImages.map(img => img.url).filter((url): url is string => !!url);
                    return Promise.all(validUrls.map(urlToDataURI));
                }
                 return Promise.reject('No images provided');
            };
            
            const existingOrUploadedImages = propertyToEdit?.images;

            const input = {
              propertyType: values.propertyType,
              bhkType: values.bhkType,
              suitableFor: values.suitableFor,
              monthlyRentAmount: Number(values.monthlyRentAmount) || 0,
              floorNumber: values.floorNumber,
              frontViewPhoto: await getUri(values.frontViewPhoto, existingOrUploadedImages?.frontView),
              kitchenPhoto: await getUri(values.kitchenPhoto, existingOrUploadedImages?.kitchen),
              hallPhotos: await getUris(values.hallPhotos, existingOrUploadedImages?.hall),
              roomPhotos: await getUris(values.roomPhotos, existingOrUploadedImages?.rooms),
            };

            const result = await getAIDescription(input);
            if (result.success && result.description) {
              form.setValue('description', result.description, { shouldValidate: true });
              toast({ title: 'Description Generated!', description: 'The AI has crafted a description for your property.' });
            } else {
              toast({ title: 'Generation Failed', description: result.error, variant: 'destructive' });
            }
        } catch(error) {
            console.error("Error generating description: ", error);
            toast({ title: 'An Error Occurred', description: "Could not process photos for AI. Please ensure they are valid image files and available.", variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    });
  };

  const handleFindOnMap = async () => {
    setIsSearchingAddress(true);
    if (!addressQuery) {
        toast({ title: 'Address missing', description: 'Please enter an address to search.', variant: 'destructive' });
        setIsSearchingAddress(false);
        return;
    }
    const results = await searchAddress(addressQuery);
    if (results && results.length > 0) {
        setAddressResults(results);
        setIsAddressSelected(false);
        toast({ title: 'Address Found!', description: 'Select an address from the list below.' });
    } else {
        toast({ title: 'Address not found', description: 'Could not find the specified address. Try being more specific.', variant: 'destructive' });
    }
    setIsSearchingAddress(false);
  };
  
  const handleSelectAddress = (result: any) => {
    const addr = result.address;

    const street = [addr.building, addr.house_number, addr.road, addr.pedestrian, addr.neighbourhood].filter(Boolean).join(', ') || result.display_name.split(',')[0];
    const colony = [addr.suburb, addr.residential].find(Boolean) || '';
    const sector = addr.quarter || '';
    const city = addr.city || addr.town || addr.village || addr.state_district || '';
    const state = addr.state || '';
    const pin = addr.postcode || '';
    const country = addr.country || 'India';
    
    form.setValue('address.street', street, { shouldValidate: true });
    form.setValue('address.colony', colony, { shouldValidate: true });
    form.setValue('address.sector', sector, { shouldValidate: true });
    form.setValue('address.city', city, { shouldValidate: true });
    form.setValue('address.state', state, { shouldValidate: true });
    form.setValue('address.pin', pin, { shouldValidate: true });
    form.setValue('address.country', country, { shouldValidate: true });
    
    if (result.lat && result.lon) {
        form.setValue('lat', parseFloat(result.lat));
        form.setValue('lng', parseFloat(result.lon));
    }
    
    setAddressQuery(result.display_name);
    setAddressResults([]);
    setIsAddressSelected(true);
  }

  const handleUseMyLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
        toast({ title: 'Geolocation Not Supported', description: 'Your browser does not support geolocation.', variant: 'destructive' });
        setIsLocating(false);
        return;
    }
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            toast({ title: 'Location Found!', description: 'Fetching address details...' });
            const address = await getAddressFromCoordinates(latitude, longitude);
            if (address) {
                form.setValue('address', address, { shouldValidate: true });
                form.setValue('lat', latitude);
                form.setValue('lng', longitude);
                setAddressQuery(Object.values(address).filter(Boolean).join(', '));
                setIsAddressSelected(true);
                toast({ title: 'Address Updated', description: 'Address has been set to your current location.' });
            } else {
                toast({ title: 'Could Not Get Address', description: 'Unable to determine address from your location.', variant: 'destructive' });
            }
            setIsLocating(false);
        },
        (error) => {
            console.error('Geolocation Error:', error);
            const errorMessage = error.message && error.message.trim() !== '' ? error.message : "Failed to retrieve location. Please make sure location access is allowed.";
            toast({ title: 'Geolocation Error', description: errorMessage, variant: 'destructive' });
            setIsLocating(false);
        }
    );
  };

  async function onSubmit(values: FormValues) {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to list or edit a property.', variant: 'destructive' });
      router.push('/login');
      return;
    }

    try {
        const processImages = async (files: any, hint: string, existingImages: PropertyImage[] = []): Promise<PropertyImage[]> => {
            const arr = normalizeFiles(files);
            if (arr.length > 0) {
              const dataUris = await Promise.all(arr.map(fileToDataURI));
              return dataUris.map(url => ({ url, hint }));
            }
            return existingImages;
        };

        const processSingleImage = async (files: any, hint: string, existingImage?: PropertyImage): Promise<PropertyImage> => {
            const arr = normalizeFiles(files);
            if (arr.length > 0) {
                const url = await fileToDataURI(arr[0]);
                return { url, hint };
            }
            return existingImage || { url: '', hint };
        };
        
        const images = {
            frontView: await processSingleImage(values.frontViewPhoto, 'front view', propertyToEdit?.images.frontView),
            kitchen: await processSingleImage(values.kitchenPhoto, 'kitchen', propertyToEdit?.images.kitchen),
            rooms: await processImages(values.roomPhotos, 'room', propertyToEdit?.images.rooms),
            hall: await processImages(values.hallPhotos, 'hall', propertyToEdit?.images.hall),
        };

        if (isEditMode && propertyToEdit) {
            const updatedPropertyData: Partial<Property> = {
                title: values.title,
                address: values.address,
                lat: values.lat,
                lng: values.lng,
                type: values.propertyType,
                floorNumber: values.floorNumber,
                condition: values.condition,
                bhk: values.bhkType,
                suitability: values.suitableFor,
                rent: values.listingType === 'rent' ? (values.monthlyRentAmount || 0) : 0,
                salePrice: values.listingType === 'sale' ? (values.salePrice || 0) : 0,
                description: values.description,
                images: images,
            };
            updateProperty(propertyToEdit.id, updatedPropertyData);
            toast({ title: 'Property Updated!', description: 'Your changes have been saved.' });
            router.push(`/property/${propertyToEdit.id}`);
        } else {
            const newId = Date.now().toString();
            
            const newProperty: Property = {
              id: newId,
              title: values.title,
              type: values.propertyType,
              address: values.address,
              lat: values.lat,
              lng: values.lng,
              floorNumber: values.floorNumber,
              condition: values.condition,
              images: images,
              owner: {
                name: user.name,
                mobile: user.mobileNumber,
              },
              bhk: values.bhkType,
              suitability: values.suitableFor,
              rent: values.listingType === 'rent' ? (values.monthlyRentAmount || 0) : 0,
              salePrice: values.listingType === 'sale' ? (values.salePrice || 0) : 0,
              description: values.description,
            };

            addProperty(newProperty);
            addPropertyToUser(user.mobileNumber, newId);
            toast({ title: 'Property Listed!', description: 'Your property has been successfully submitted.' });
            router.push(`/property/${newId}`);
        }
        form.reset();
    } catch(error) {
        console.error("Error submitting form: ", error);
        toast({ title: 'Submission Failed', description: "There was an unexpected problem submitting the form.", variant: 'destructive' });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        
        {!isEditMode && isFirstListing && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 text-primary p-3 rounded-full flex items-center justify-center">
                  <Tag className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-headline">
                    List Your First Property
                  </h3>
                  <p className="text-muted-foreground">
                    Welcome! We're excited you're here. Listing your property on Nivaastha is completely free of charge. Let's get it online in just a few minutes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Property Details</CardTitle>
            <CardDescription>Start with the basics. Give your property a clear title and address.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField control={form.control} name="title" render={({ field }) => ( <FormItem> <FormLabel>Property Title</FormLabel> <FormControl><Input placeholder="e.g., Spacious 2BHK in the city center" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
            
             <div className="space-y-4 rounded-lg border p-4">
                <h3 className="text-lg font-medium">Property Address</h3>
                 <div className="space-y-2">
                    <Label htmlFor="address-search">Search for Address</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Input 
                            id="address-search" 
                            placeholder="Enter a landmark, area, or full address"
                            value={addressQuery}
                            onChange={(e) => {
                                setAddressQuery(e.target.value);
                                setIsAddressSelected(false);
                            }}
                            onBlur={() => {
                                setTimeout(() => {
                                    if(!isAddressSelected) {
                                        setAddressResults([]);
                                    }
                                }, 200);
                            }}
                        />
                        <div className="flex gap-2">
                            <Button type="button" variant="secondary" onClick={handleFindOnMap} disabled={isSearchingAddress || isLocating}>
                                {isSearchingAddress ? <Loader2 className="animate-spin" /> : <Search />}
                                Find
                            </Button>
                             <Button type="button" variant="secondary" onClick={handleUseMyLocation} disabled={isLocating || isSearchingAddress}>
                                {isLocating ? <Loader2 className="animate-spin" /> : <LocateFixed />}
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
                 <p className="text-sm text-muted-foreground">Or, fill the details manually:</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="address.street" render={({ field }) => ( <FormItem> <FormLabel>Street / Building</FormLabel> <FormControl><Input placeholder="e.g., 123 Main St, Sunshine Apartments" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="address.colony" render={({ field }) => ( <FormItem> <FormLabel>Colony / Suburb</FormLabel> <FormControl><Input placeholder="e.g., Bandra West" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="address.sector" render={({ field }) => ( <FormItem> <FormLabel>Sector / Landmark</FormLabel> <FormControl><Input placeholder="e.g., Sector 15, Near City Mall" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="address.pin" render={({ field }) => ( <FormItem> <FormLabel>Pin Code</FormLabel> <FormControl><Input placeholder="e.g., 400050" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="address.city" render={({ field }) => ( <FormItem> <FormLabel>City</FormLabel> <FormControl><Input placeholder="e.g., Mumbai" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField
                      control={form.control}
                      name="address.state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {indianStates.map((stateName) => (
                                <SelectItem key={stateName} value={stateName}>
                                  {stateName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address.country"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input {...field} disabled />
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
                <CardTitle className="font-headline">Specifications & Price</CardTitle>
                <CardDescription>Details about property type, size, price, and ideal tenants.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="listingType"
                  render={({ field }) => (
                    <FormItem className="space-y-3 md:col-span-2">
                      <FormLabel>Listing For</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex items-center gap-4 pt-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="rent" id="rent-radio" />
                            <Label htmlFor="rent-radio" className="font-normal">For Rent</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="sale" id="sale-radio" />
                            <Label htmlFor="sale-radio" className="font-normal">For Sale</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                 <FormField
                  control={form.control}
                  name="propertyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger ref={field.ref}>
                            <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="House">House</SelectItem>
                          <SelectItem value="Villa">Villa</SelectItem>
                          <SelectItem value="Flat">Flat</SelectItem>
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
                 {['House', 'Flat', 'Showroom'].includes(propertyType) && (
                    <FormField
                        control={form.control}
                        name="floorNumber"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Floor Number</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., 3 or Ground" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                 )}

                 {listingType === 'sale' && (
                   <FormField
                     control={form.control}
                     name="condition"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Property Condition</FormLabel>
                         <Select onValueChange={field.onChange} value={field.value}>
                           <FormControl>
                             <SelectTrigger>
                               <SelectValue placeholder="New or Resale?" />
                             </SelectTrigger>
                           </FormControl>
                           <SelectContent>
                             <SelectItem value="New">New Property</SelectItem>
                             <SelectItem value="Resale">Resale (Old)</SelectItem>
                           </SelectContent>
                         </Select>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                 )}

                 <FormField
                  control={form.control}
                  name="bhkType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>BHK Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={propertyType === 'Shop' || propertyType === 'Showroom' || propertyType.startsWith('PG')}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select BHK type" />
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
                
                {listingType === 'rent' ? (
                     <FormField
                       control={form.control}
                       name="monthlyRentAmount"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Monthly Rent</FormLabel>
                           <FormControl>
                             <Input type="number" placeholder="e.g., 25000" {...field} value={field.value || ''} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                ) : (
                    <FormField
                       control={form.control}
                       name="salePrice"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Sale Price</FormLabel>
                           <FormControl>
                             <Input type="number" placeholder="e.g., 5000000" {...field} value={field.value || ''} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                )}

                 <FormField
                  control={form.control}
                  name="suitableFor"
                  render={({ field }) => (
                    <FormItem className="space-y-3 md:col-span-2">
                      <FormLabel>Suitable For</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4 pt-2"
                          disabled={propertyType.startsWith('PG')}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Family" id="family-radio" />
                            <Label htmlFor="family-radio" className="font-normal">Family</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Bachelor" id="bachelor-radio" />
                            <Label htmlFor="bachelor-radio" className="font-normal">Bachelor</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Commercial" id="commercial-radio" />
                            <Label htmlFor="commercial-radio" className="font-normal">Commercial</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Property Photos</CardTitle>
                <CardDescription>Good photos attract more tenants. Upload or take live photos of each area.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PhotoUploadField name="frontViewPhoto" label="Front View" description="Upload or take one photo" initialPreviews={propertyToEdit?.images.frontView.url ? [propertyToEdit.images.frontView.url] : []}/>
                <PhotoUploadField name="kitchenPhoto" label="Kitchen / Pantry" description="Upload or take one photo" initialPreviews={propertyToEdit?.images.kitchen.url ? [propertyToEdit.images.kitchen.url] : []} />
                <PhotoUploadField name="roomPhotos" label="Bedrooms / Interior" description="Upload or take photos" multiple initialPreviews={propertyToEdit?.images.rooms.map(i => i.url ?? '').filter(Boolean)} />
                <PhotoUploadField name="hallPhotos" label="Hall / Main Area" description="Upload or take photos" multiple initialPreviews={propertyToEdit?.images.hall.map(i => i.url ?? '').filter(Boolean)} />
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Property Description</CardTitle>
                <CardDescription>Write a compelling summary or let our AI generate one for you based on the photos.</CardDescription>
            </CardHeader>
            <CardContent>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center mb-2">
                         <FormLabel className="sr-only">Description</FormLabel>
                         <Button type="button" size="sm" variant="outline" onClick={handleGenerateDescription} disabled={isGenerating}>
                          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-yellow-400" />}
                          Generate with AI
                        </Button>
                      </div>
                      <FormControl>
                        <Textarea placeholder="Describe your property, highlighting its best features..." className="min-h-[120px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </CardContent>
        </Card>
        
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Update Property' : 'List My Property'}
        </Button>

      </form>
    </Form>
  );
}
