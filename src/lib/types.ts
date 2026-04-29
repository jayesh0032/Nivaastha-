
export type PropertyImage = {
  url?: string;
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
}

export type Property = {
  id: string;
  title: string;
  type: 'House' | 'Villa' | 'Flat' | 'Shop' | 'Showroom' | 'PG for boys' | 'PG for girls' | 'PG';
  address: Address;
  floorNumber?: string;
  images: {
    hall: PropertyImage[];
    rooms: PropertyImage[];
    kitchen: PropertyImage;
    frontView: PropertyImage;
  };
  owner: {
    name: string;
    mobile: string;
  };
  bhk: string;
  suitability: 'Family' | 'Bachelor' | 'Commercial';
  rent: number;
  salePrice?: number;
  condition?: 'New' | 'Resale';
  description: string;
  lat?: number;
  lng?: number;
  isRented?: boolean;
};
