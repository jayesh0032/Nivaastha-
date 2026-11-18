import { getSupabase } from './supabase';
import { compressImage } from './image-compression';
import type { ListingType, Property, PropertyFilterValues } from './types';

const STORAGE_BUCKET = 'property-photos';

export function isPermissionDeniedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /permission denied|42501|row-level security/i.test(msg);
}

export function normalizeBhk(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (!str) return '';
  if (/^\d+$/.test(str)) return `${str}BHK`;
  const match = str.match(/^(\d+)\s*bhk$/i);
  if (match) return `${match[1]}BHK`;
  return str;
}

function extractImageUrl(img: Record<string, any>): string {
  return String(
    img.image_url || img.url || img.public_url || img.photo_url || img.src || ''
  ).trim();
}

function sortAndExtractImages(rawImages: any): string[] {
  if (!Array.isArray(rawImages)) return [];
  const sorted = [...rawImages].sort((a, b) => {
    const orderA = a.display_order ?? a.sort_order ?? a.position ?? 0;
    const orderB = b.display_order ?? b.sort_order ?? b.position ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateA - dateB;
  });
  return sorted.map(extractImageUrl).filter(Boolean);
}

export function normalizePropertyRow(row: any, fallbackImages?: string[]): Property {
  const images =
    Array.isArray(row.property_images)
      ? sortAndExtractImages(row.property_images)
      : fallbackImages ?? [];

  return {
    id: String(row.id),
    owner_id: String(row.owner_id ?? ''),
    title: String(row.title ?? ''),
    listing_type: (row.listing_type === 'sale' ? 'sale' : 'rent') as ListingType,
    property_type: String(row.property_type ?? 'Flat'),
    price: Number(row.price ?? 0),
    bhk: normalizeBhk(row.bhk),
    area_sqft: row.area_sqft !== null && row.area_sqft !== undefined ? Number(row.area_sqft) : null,
    city: String(row.city ?? ''),
    locality: String(row.locality ?? ''),
    address: String(row.address ?? ''),
    description: String(row.description ?? ''),
    contact_phone: String(row.contact_phone ?? ''),
    status: String(row.status ?? 'pending'),
    created_at: String(row.created_at ?? new Date().toISOString()),
    images,
  };
}

async function attachImagesSeparately(rows: any[]): Promise<Property[]> {
  if (rows.length === 0) return [];
  const supabase = getSupabase();
  const ids = rows.map((r) => r.id);

  const { data: imageRows, error } = await supabase
    .from('property_images')
    .select('*')
    .in('property_id', ids);

  const grouped = new Map<string, any[]>();
  if (!error && Array.isArray(imageRows)) {
    for (const img of imageRows) {
      const pid = String(img.property_id);
      const existing = grouped.get(pid) ?? [];
      existing.push(img);
      grouped.set(pid, existing);
    }
  }

  return rows.map((row) =>
    normalizePropertyRow(row, sortAndExtractImages(grouped.get(String(row.id)) ?? []))
  );
}

export async function fetchApprovedProperties(
  filters?: Partial<PropertyFilterValues>
): Promise<Property[]> {
  const supabase = getSupabase();

  const buildQuery = (withJoin: boolean) => {
    let query = supabase
      .from('properties')
      .select(withJoin ? '*, property_images(*)' : '*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (filters?.listingType && filters.listingType !== 'all') {
      query = query.eq('listing_type', filters.listingType);
    }

    if (filters?.city && filters.city.trim()) {
      const term = filters.city.trim();
      query = query.or(
        `city.ilike.%${term}%,locality.ilike.%${term}%,address.ilike.%${term}%,title.ilike.%${term}%`
      );
    }

    if (filters?.minPrice !== undefined && filters.minPrice > 0) {
      query = query.gte('price', filters.minPrice);
    }

    if (filters?.maxPrice !== undefined && filters.maxPrice > 0) {
      query = query.lte('price', filters.maxPrice);
    }

    return query;
  };

  let { data, error } = await buildQuery(true);
  let properties: Property[] = [];

  if (error) {
    // Fallback if PostgREST relation embedding isn't configured
    const fallbackRes = await buildQuery(false);
    if (fallbackRes.error) {
      throw new Error(fallbackRes.error.message || 'Failed to fetch properties.');
    }
    properties = await attachImagesSeparately(fallbackRes.data ?? []);
  } else {
    properties = (data ?? []).map((row) => normalizePropertyRow(row));
  }

  // Apply BHK filter reliably across text ('2BHK', '2 BHK') and numeric ('2') DB representations
  if (filters?.bhk && filters.bhk !== 'all') {
    const targetBhk = normalizeBhk(filters.bhk);
    properties = properties.filter((p) => normalizeBhk(p.bhk) === targetBhk);
  }

  return properties;
}

export async function fetchPropertyById(id: string): Promise<Property | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('properties')
    .select('*, property_images(*)')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    const fallback = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fallback.error) {
      throw new Error(fallback.error.message || 'Failed to load property.');
    }
    if (!fallback.data) return null;
    const withImages = await attachImagesSeparately([fallback.data]);
    return withImages[0] ?? null;
  }

  if (!data) return null;
  return normalizePropertyRow(data);
}

export async function fetchPropertiesByIds(ids: string[]): Promise<Property[]> {
  if (ids.length === 0) return [];
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('properties')
    .select('*, property_images(*)')
    .in('id', ids)
    .eq('status', 'approved');

  if (error) {
    const fallback = await supabase
      .from('properties')
      .select('*')
      .in('id', ids)
      .eq('status', 'approved');
    if (fallback.error) {
      throw new Error(fallback.error.message || 'Failed to fetch saved properties.');
    }
    return attachImagesSeparately(fallback.data ?? []);
  }

  return (data ?? []).map((row) => normalizePropertyRow(row));
}

export async function fetchMyProperties(ownerId: string): Promise<Property[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('properties')
    .select('*, property_images(*)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) {
    const fallback = await supabase
      .from('properties')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (fallback.error) {
      throw new Error(fallback.error.message || 'Failed to fetch your properties.');
    }
    return attachImagesSeparately(fallback.data ?? []);
  }

  return (data ?? []).map((row) => normalizePropertyRow(row));
}

export type PropertyUpsertInput = {
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
};

async function insertPropertyImages(propertyId: string, publicUrls: string[]) {
  if (publicUrls.length === 0) return;
  const supabase = getSupabase();

  const payloadImageUrl = publicUrls.map((url) => ({
    property_id: propertyId,
    image_url: url,
  }));

  const { error } = await supabase.from('property_images').insert(payloadImageUrl);

  if (error) {
    const msg = error.message?.toLowerCase() ?? '';
    if (msg.includes('image_url') || msg.includes('column')) {
      const payloadUrl = publicUrls.map((url) => ({
        property_id: propertyId,
        url,
      }));
      const retry = await supabase.from('property_images').insert(payloadUrl);
      if (retry.error) {
        throw new Error(retry.error.message || 'Failed to save property images.');
      }
    } else {
      throw new Error(error.message || 'Failed to save property images.');
    }
  }
}

async function uploadPropertyFiles(
  ownerId: string,
  propertyId: string,
  files: File[]
): Promise<string[]> {
  if (files.length === 0) return [];
  const supabase = getSupabase();
  const uploadedUrls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const compressed = await compressImage(files[i], 1600, 0.82);
    const ext = compressed.name.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueSuffix = `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`;
    const filePath = `${ownerId}/${propertyId}/${uniqueSuffix}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, compressed, {
        contentType: compressed.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Photo upload failed: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    if (publicUrlData?.publicUrl) {
      uploadedUrls.push(publicUrlData.publicUrl);
    }
  }

  return uploadedUrls;
}

export async function createPropertyListing(
  ownerId: string,
  input: PropertyUpsertInput,
  files: File[]
): Promise<Property> {
  const supabase = getSupabase();

  const buildPayload = (bhkVal: string | number | null) => ({
    owner_id: ownerId,
    title: input.title.trim(),
    listing_type: input.listing_type,
    property_type: input.property_type,
    price: Number(input.price),
    bhk: bhkVal,
    area_sqft: input.area_sqft ? Number(input.area_sqft) : null,
    city: input.city.trim(),
    locality: input.locality.trim(),
    address: input.address.trim(),
    description: input.description.trim(),
    contact_phone: input.contact_phone.trim(),
    status: 'pending',
  });

  const initialBhk = input.bhk === 'N/A' || !input.bhk ? null : input.bhk;
  let { data, error } = await supabase
    .from('properties')
    .insert(buildPayload(initialBhk))
    .select('*')
    .single();

  if (error && /invalid input syntax for type integer/i.test(error.message ?? '')) {
    const numericBhk = initialBhk ? parseInt(initialBhk, 10) || null : null;
    const retry = await supabase
      .from('properties')
      .insert(buildPayload(numericBhk))
      .select('*')
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create property listing.');
  }

  const propertyId = String(data.id);

  try {
    const uploadedUrls = await uploadPropertyFiles(ownerId, propertyId, files);
    await insertPropertyImages(propertyId, uploadedUrls);
    return normalizePropertyRow(data, uploadedUrls);
  } catch (err) {
    // Clean up property row if image upload fails so no orphan half-created listing remains
    await supabase.from('properties').delete().eq('id', propertyId).eq('owner_id', ownerId);
    throw err;
  }
}

export async function updatePropertyListing(
  propertyId: string,
  ownerId: string,
  input: PropertyUpsertInput,
  newFiles: File[],
  removedImageUrls: string[] = []
): Promise<Property> {
  const supabase = getSupabase();

  const buildPayload = (bhkVal: string | number | null) => ({
    title: input.title.trim(),
    listing_type: input.listing_type,
    property_type: input.property_type,
    price: Number(input.price),
    bhk: bhkVal,
    area_sqft: input.area_sqft ? Number(input.area_sqft) : null,
    city: input.city.trim(),
    locality: input.locality.trim(),
    address: input.address.trim(),
    description: input.description.trim(),
    contact_phone: input.contact_phone.trim(),
  });

  const initialBhk = input.bhk === 'N/A' || !input.bhk ? null : input.bhk;
  let { data, error } = await supabase
    .from('properties')
    .update(buildPayload(initialBhk))
    .eq('id', propertyId)
    .eq('owner_id', ownerId)
    .select('*')
    .single();

  if (error && /invalid input syntax for type integer/i.test(error.message ?? '')) {
    const numericBhk = initialBhk ? parseInt(initialBhk, 10) || null : null;
    const retry = await supabase
      .from('properties')
      .update(buildPayload(numericBhk))
      .eq('id', propertyId)
      .eq('owner_id', ownerId)
      .select('*')
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update property listing.');
  }

  if (removedImageUrls.length > 0) {
    const delRes = await supabase
      .from('property_images')
      .delete()
      .eq('property_id', propertyId)
      .in('image_url', removedImageUrls);

    if (delRes.error && delRes.error.message?.toLowerCase().includes('image_url')) {
      await supabase
        .from('property_images')
        .delete()
        .eq('property_id', propertyId)
        .in('url', removedImageUrls);
    }
  }

  if (newFiles.length > 0) {
    const uploadedUrls = await uploadPropertyFiles(ownerId, propertyId, newFiles);
    await insertPropertyImages(propertyId, uploadedUrls);
  }

  const updated = await fetchPropertyById(propertyId);
  return updated ?? normalizePropertyRow(data);
}

export async function deletePropertyListing(
  propertyId: string,
  ownerId: string,
  imageUrls: string[] = []
): Promise<void> {
  const supabase = getSupabase();

  // Best-effort remove files from storage bucket
  const storageMarker = `/object/public/${STORAGE_BUCKET}/`;
  const storagePaths = imageUrls
    .map((url) => {
      const idx = url.indexOf(storageMarker);
      return idx !== -1 ? decodeURIComponent(url.slice(idx + storageMarker.length)) : null;
    })
    .filter((p): p is string => Boolean(p));

  if (storagePaths.length > 0) {
    await supabase.storage.from(STORAGE_BUCKET).remove(storagePaths);
  }

  await supabase.from('property_images').delete().eq('property_id', propertyId);

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', propertyId)
    .eq('owner_id', ownerId);

  if (error) {
    throw new Error(error.message || 'Failed to delete property listing.');
  }
}
