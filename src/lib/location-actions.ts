
'use server';

import type { Address } from './types';

export async function searchAddress(query: string) {
    if (!query) return null;
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=in`,
            {
                headers: {
                    'User-Agent': 'Nivaastha-Property-App/1.0',
                },
            }
        );
        if (!response.ok) {
            throw new Error('Failed to fetch from Nominatim API');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error searching address:', error);
        return null;
    }
}


export async function getAddressFromCoordinates(lat: number, lon: number): Promise<Address | null> {
    if (lat === undefined || lon === undefined) return null;
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'Nivaastha-Property-App/1.0',
                },
            }
        );
        if (!response.ok) {
            throw new Error('Failed to fetch from Nominatim API');
        }
        const data = await response.json();
        if (data && data.address) {
            const addr = data.address;
            const fullAddress: Address = {
                street: addr.road || data.display_name.split(',')[0] || '',
                colony: addr.neighbourhood || addr.suburb || '',
                sector: addr.quarter || '',
                city: addr.city || addr.town || addr.village || '',
                state: addr.state || '',
                pin: addr.postcode || '',
                country: addr.country || '',
            };
            return fullAddress;
        }
        return null;
    } catch (error) {
        console.error('Error getting address from coordinates:', error);
        return null;
    }
}
