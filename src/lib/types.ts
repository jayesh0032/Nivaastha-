export type ListingType = 'sale' | 'rent';

export type PropertyStatus = 'pending' | 'approved' | 'rejected' | string;

export type PropertyImageRecord = {
  id?: string;
  property_id?: string;
  image_url?: string;
  url?: string;
  created_at?: string;
};

export type PropertyImage = {
  url: string;
  hint: string;
};

export type Address = {
  street: string;
  colony?: string;
  sector?: string;
  city: string;
  state: string;
  pin: string;
  country: string;
};

export type Property = {
  id: string;
  owner_id: string;
  title: string;
  listing_type: ListingType;
  property_type: string;
  price: number;
  bhk: string;
  area_sqft: number | null;
  city: string;
  locality: string;
  address: string;
  description: string;
  contact_phone: string;
  status: PropertyStatus;
  created_at: string;
  images: string[];
};

export type UserProfile = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  name?: string | null;
  phone?: string | null;
};

export type PropertyFilterValues = {
  city: string;
  listingType: 'all' | 'rent' | 'sale';
  bhk: string;
  minPrice?: number;
  maxPrice?: number;
};
