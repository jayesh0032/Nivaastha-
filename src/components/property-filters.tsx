'use client';

import * as React from 'react';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { RotateCcw, Search } from 'lucide-react';
import type { PropertyFilterValues } from '@/lib/types';

interface PropertyFiltersProps {
  onFilterChange: (filters: PropertyFilterValues) => void;
  onReset: () => void;
  defaultListingType?: 'all' | 'rent' | 'sale';
  lockListingType?: boolean;
}

export function PropertyFilters({
  onFilterChange,
  onReset,
  defaultListingType = 'all',
  lockListingType = false,
}: PropertyFiltersProps) {
  const [city, setCity] = React.useState('');
  const [listingType, setListingType] = React.useState<'all' | 'rent' | 'sale'>(defaultListingType);
  const [bhk, setBhk] = React.useState('all');
  const [minPrice, setMinPrice] = React.useState('');
  const [maxPrice, setMaxPrice] = React.useState('');

  const handleApply = (e?: React.FormEvent) => {
    e?.preventDefault();
    onFilterChange({
      city,
      listingType,
      bhk,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
  };

  const handleReset = () => {
    setCity('');
    setListingType(defaultListingType);
    setBhk('all');
    setMinPrice('');
    setMaxPrice('');
    onReset();
  };

  return (
    <form onSubmit={handleApply} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="city-filter" className="font-semibold text-card-foreground">
            City or Locality
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="city-filter"
              placeholder="e.g., Mumbai, Bengaluru, Indiranagar..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {!lockListingType && (
          <div className="space-y-2">
            <Label className="font-semibold text-card-foreground">Listing Type</Label>
            <RadioGroup
              value={listingType}
              onValueChange={(val) => setListingType(val as 'all' | 'rent' | 'sale')}
              className="flex items-center space-x-3 h-10"
            >
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="all" id="lt-all" />
                <Label htmlFor="lt-all" className="text-card-foreground font-normal cursor-pointer">
                  All
                </Label>
              </div>
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="rent" id="lt-rent" />
                <Label htmlFor="lt-rent" className="text-card-foreground font-normal cursor-pointer">
                  Rent
                </Label>
              </div>
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="sale" id="lt-sale" />
                <Label htmlFor="lt-sale" className="text-card-foreground font-normal cursor-pointer">
                  Sale
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="bhk-filter" className="font-semibold text-card-foreground">
            BHK
          </Label>
          <Select value={bhk} onValueChange={setBhk}>
            <SelectTrigger id="bhk-filter">
              <SelectValue placeholder="Any BHK" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any BHK</SelectItem>
              <SelectItem value="1BHK">1 BHK</SelectItem>
              <SelectItem value="2BHK">2 BHK</SelectItem>
              <SelectItem value="3BHK">3 BHK</SelectItem>
              <SelectItem value="4BHK">4 BHK</SelectItem>
              <SelectItem value="5BHK">5 BHK</SelectItem>
              <SelectItem value="5+BHK">5+ BHK</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className={lockListingType ? 'space-y-2 lg:col-span-2' : 'space-y-2'}>
          <Label className="font-semibold text-card-foreground">Price Range (₹)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              placeholder="Min ₹"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              min={0}
              placeholder="Max ₹"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2 gap-4">
        <Button type="button" variant="ghost" onClick={handleReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset Filters
        </Button>
        <Button type="submit">
          <Search className="mr-2 h-4 w-4" />
          Search Properties
        </Button>
      </div>
    </form>
  );
}
