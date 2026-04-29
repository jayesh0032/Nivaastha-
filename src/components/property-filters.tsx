
'use client';

import * as React from 'react';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { RotateCcw, Search } from 'lucide-react';
import { usePropertyStore } from '@/hooks/use-property-store';
import type { Property } from '@/lib/types';

interface PropertyFiltersProps {
  onFilterChange: (filteredProperties: Property[]) => void;
  onReset: () => void;
  filterContext?: 'rent' | 'sale';
}

const initialFilters = {
    location: '',
    bhk: 'all',
    priceRange: [0, 50000000] as [number, number],
    suitability: 'all',
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        notation: value > 100000 ? 'compact' : 'standard',
    }).format(value);
};

export function PropertyFilters({ onFilterChange, onReset, filterContext = 'rent' }: PropertyFiltersProps) {
  const [filters, setFilters] = React.useState({
    ...initialFilters,
    priceRange: (filterContext === 'rent' ? [0, 100000] : [0, 50000000]) as [number, number],
  });
  const { properties } = usePropertyStore();

  const handleFilter = () => {
    let currentProperties = [...properties];

    if (filters.location) {
        const searchTerm = filters.location.toLowerCase();
        currentProperties = currentProperties.filter(p => 
            (p.address.city?.toLowerCase().includes(searchTerm) ||
             p.address.state?.toLowerCase().includes(searchTerm) ||
             p.address.street?.toLowerCase().includes(searchTerm) ||
             p.address.colony?.toLowerCase().includes(searchTerm) ||
             p.title.toLowerCase().includes(searchTerm)
            )
        );
    }
    if (filters.bhk && filters.bhk !== 'all') {
      currentProperties = currentProperties.filter(p => p.bhk === filters.bhk);
    }
    
    if (filterContext === 'rent') {
        currentProperties = currentProperties.filter(p => p.rent >= filters.priceRange[0] && p.rent <= filters.priceRange[1]);
    } else { // 'sale' context
        currentProperties = currentProperties.filter(p => p.salePrice && p.salePrice >= filters.priceRange[0] && p.salePrice <= filters.priceRange[1]);
    }

    if (filters.suitability && filters.suitability !== 'all') {
      currentProperties = currentProperties.filter(p => p.suitability === filters.suitability);
    }

    onFilterChange(currentProperties);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, location: e.target.value }));
  };

  const handleSelectChange = (name: string) => (value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (value: string) => {
     setFilters(prev => ({ ...prev, suitability: value }));
  }

  const handleSliderChange = (value: number[]) => {
    setFilters(prev => ({ ...prev, priceRange: [prev.priceRange[0], value[0]] }));
  };
  
  const handleReset = () => {
    setFilters({
      ...initialFilters,
      priceRange: (filterContext === 'rent' ? [0, 100000] : [0, 50000000]) as [number, number],
    });
    onReset();
  }

  const maxPrice = filterContext === 'rent' ? 100000 : 50000000;
  const priceStep = filterContext === 'rent' ? 1000 : 100000;
  const priceLabel = filterContext === 'rent' ? "Max Monthly Rent" : "Max Sale Price";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        
        <div className="space-y-2 lg:col-span-4">
          <Label htmlFor="location" className="font-semibold text-card-foreground">Location</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/>
            <Input id="location" placeholder="Search city, area, or society..." value={filters.location} onChange={handleInputChange} className="pl-10" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bhk" className="font-semibold text-card-foreground">BHK Type</Label>
          <Select name="bhk" value={filters.bhk} onValueChange={handleSelectChange('bhk')}>
            <SelectTrigger id="bhk">
              <SelectValue placeholder="Any BHK" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any BHK</SelectItem>
              <SelectItem value="N/A">N/A</SelectItem>
              <SelectItem value="1BHK">1 BHK</SelectItem>
              <SelectItem value="2BHK">2 BHK</SelectItem>
              <SelectItem value="3BHK">3 BHK</SelectItem>
              <SelectItem value="4BHK">4 BHK</SelectItem>
              <SelectItem value="5BHK">5 BHK</SelectItem>
              <SelectItem value="5+BHK">5+ BHK</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
           <Label className="font-semibold text-card-foreground">Suitable For</Label>
          <RadioGroup value={filters.suitability} onValueChange={handleRadioChange} className="flex items-center space-x-4 pt-2">
             <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="r-all" />
                <Label htmlFor="r-all" className="text-card-foreground font-normal">All</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Family" id="r-family" />
                <Label htmlFor="r-family" className="text-card-foreground font-normal">Family</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Bachelor" id="r-bachelor" />
                <Label htmlFor="r-bachelor" className="text-card-foreground font-normal">Bachelor</Label>
              </div>
               <div className="flex items-center space-x-2">
                <RadioGroupItem value="Commercial" id="r-commercial" />
                <Label htmlFor="r-commercial" className="text-card-foreground font-normal">Commercial</Label>
              </div>
          </RadioGroup>
        </div>
        
        <div className="space-y-2 lg:col-span-2">
          <div className="flex justify-between items-center">
             <Label htmlFor="price" className="font-semibold text-card-foreground">{priceLabel}</Label>
             <span className="font-semibold text-primary">{formatCurrency(filters.priceRange[1])}</span>
          </div>
          <Slider
            id="price"
            min={0}
            max={maxPrice}
            step={priceStep}
            value={[filters.priceRange[1]]}
            onValueChange={handleSliderChange}
          />
        </div>

      </div>
       <div className="flex justify-end pt-2 gap-4">
            <Button type="button" variant="ghost" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4"/>
              Reset Filters
            </Button>
            <Button type="button" onClick={handleFilter}>
              <Search className="mr-2 h-4 w-4"/>
              Search Properties
            </Button>
        </div>
    </div>
  );
}
