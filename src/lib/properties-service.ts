import { getSupabase } from './supabase';
import { compressImage } from './image-compression';
import type { ListingType, Property, PropertyFilterValues } from './types';

const STORAGE_BUCKET = 'property-photos';

export const ADMIN_EMAIL = 'jayesh743@gmail.com';

export function isAdminEmail(email?: string | null): boolean {
  return Boolean(email && email.trim().toLowerCase() === ADMIN_EMAIL);
}

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

function getSlotOrderFromUrl(url: string): number | null {
  const match = url.match(/slot-(\d+)-/i);
  if (!match) return null;
  const idx = Number(match[1]);
  return Number.isFinite(idx) ? idx : null;
}

function sortAndExtractImages(rawImages: any): string[] {
  if (!Array.isArray(rawImages)) return [];
  const sorted = [...rawImages].sort((a, b) => {
    const urlA = extractImageUrl(a);
    const urlB = extractImageUrl(b);
    const slotA = getSlotOrderFromUrl(urlA);
    const slotB = getSlotOrderFromUrl(urlB);
    if (slotA !== null && slotB !== null && slotA !== slotB) {
      return slotA - slotB;
    }
    if (slotA !== null && slotB === null) return -1;
    if (slotA === null && slotB !== null) return 1;

    const orderA = a.display_order ?? a.sort_order ?? a.position ?? 0;
    const orderB = b.display_order ?? b.sort_order ?? b.position ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateA - dateB;
  });
  return sorted.map(extractImageUrl).filter(Boolean);
}

const CONTACT_NAME_FALLBACK_REGEX = /^Contact Person:\s*(.+?)\r?\n---\r?\n([\s\S]*)$/;

function parseContactNameAndDescription(row: any): { contact_name: string; description: string } {
  const rawDescription = String(row.description ?? '');
  const columnContactName = String(
    row.contact_name ?? row.contact_person_name ?? row.owner_name ?? ''
  ).trim();

  if (columnContactName) {
    const match = rawDescription.match(CONTACT_NAME_FALLBACK_REGEX);
    return {
      contact_name: columnContactName,
      description: match ? match[2] : rawDescription,
    };
  }

  const match = rawDescription.match(CONTACT_NAME_FALLBACK_REGEX);
  if (match) {
    return {
      contact_name: match[1].trim(),
      description: match[2],
    };
  }

  return {
    contact_name: '',
    description: rawDescription,
  };
}

function isMissingContactNameColumnError(message?: string): boolean {
  if (!message) return false;
  return /contact_name/i.test(message) && /(column|schema cache|does not exist)/i.test(message);
}

export function normalizePropertyRow(row: any, fallbackImages?: string[]): Property {
  const images =
    Array.isArray(row.property_images)
      ? sortAndExtractImages(row.property_images)
      : fallbackImages ?? [];

  const { contact_name, description } = parseContactNameAndDescription(row);

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
    description,
    contact_name,
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
  contact_name: string;
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
  const boundedFiles = files.slice(0, 6);
  if (boundedFiles.length === 0) return [];
  const supabase = getSupabase();
  const uploadedUrls: string[] = [];

  for (let i = 0; i < boundedFiles.length; i++) {
    const originalFile = boundedFiles[i];
    const compressed = await compressImage(originalFile, 1600, 0.82);
    const ext = compressed.name.split('.').pop()?.toLowerCase() || 'jpg';
    const slotPrefixMatch = originalFile.name.match(/^(slot-\d+-[a-z0-9]+)/i);
    const prefix = slotPrefixMatch ? `${slotPrefixMatch[1]}-` : '';
    const uniqueSuffix = `${prefix}${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`;
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
  const trimmedContactName = input.contact_name.trim();
  const trimmedDescription = input.description.trim();

  const buildPayload = (bhkVal: string | number | null, includeContactNameColumn: boolean) => {
    const base: Record<string, any> = {
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
      description: includeContactNameColumn
        ? trimmedDescription
        : trimmedContactName
          ? `Contact Person: ${trimmedContactName}\n---\n${trimmedDescription}`
          : trimmedDescription,
      contact_phone: input.contact_phone.trim(),
      status: 'pending',
    };
    if (includeContactNameColumn) {
      base.contact_name = trimmedContactName;
    }
    return base;
  };

  let currentBhk: string | number | null = input.bhk === 'N/A' || !input.bhk ? null : input.bhk;
  let includeContactNameColumn = true;
  let data: any = null;
  let error: any = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await supabase
      .from('properties')
      .insert(buildPayload(currentBhk, includeContactNameColumn))
      .select('*')
      .single();
    data = res.data;
    error = res.error;
    if (!error) break;

    if (includeContactNameColumn && isMissingContactNameColumnError(error.message)) {
      includeContactNameColumn = false;
      continue;
    }
    if (
      typeof currentBhk === 'string' &&
      /invalid input syntax for type integer/i.test(error.message ?? '')
    ) {
      currentBhk = parseInt(currentBhk, 10) || null;
      continue;
    }
    break;
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
  const trimmedContactName = input.contact_name.trim();
  const trimmedDescription = input.description.trim();

  const buildPayload = (bhkVal: string | number | null, includeContactNameColumn: boolean) => {
    const base: Record<string, any> = {
      title: input.title.trim(),
      listing_type: input.listing_type,
      property_type: input.property_type,
      price: Number(input.price),
      bhk: bhkVal,
      area_sqft: input.area_sqft ? Number(input.area_sqft) : null,
      city: input.city.trim(),
      locality: input.locality.trim(),
      address: input.address.trim(),
      description: includeContactNameColumn
        ? trimmedDescription
        : trimmedContactName
          ? `Contact Person: ${trimmedContactName}\n---\n${trimmedDescription}`
          : trimmedDescription,
      contact_phone: input.contact_phone.trim(),
    };
    if (includeContactNameColumn) {
      base.contact_name = trimmedContactName;
    }
    return base;
  };

  let currentBhk: string | number | null = input.bhk === 'N/A' || !input.bhk ? null : input.bhk;
  let includeContactNameColumn = true;
  let data: any = null;
  let error: any = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await supabase
      .from('properties')
      .update(buildPayload(currentBhk, includeContactNameColumn))
      .eq('id', propertyId)
      .eq('owner_id', ownerId)
      .select('*')
      .single();
    data = res.data;
    error = res.error;
    if (!error) break;

    if (includeContactNameColumn && isMissingContactNameColumnError(error.message)) {
      includeContactNameColumn = false;
      continue;
    }
    if (
      typeof currentBhk === 'string' &&
      /invalid input syntax for type integer/i.test(error.message ?? '')
    ) {
      currentBhk = parseInt(currentBhk, 10) || null;
      continue;
    }
    break;
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

export async function fetchAdminProperties(
  status?: 'pending' | 'approved' | 'rejected'
): Promise<Property[]> {
  const supabase = getSupabase();

  const buildQuery = (withJoin: boolean) => {
    let query = supabase
      .from('properties')
      .select(withJoin ? '*, property_images(*)' : '*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    return query;
  };

  const { data, error } = await buildQuery(true);

  if (error) {
    const fallback = await buildQuery(false);
    if (fallback.error) {
      throw new Error(fallback.error.message || 'Failed to fetch listings for admin review.');
    }
    return attachImagesSeparately(fallback.data ?? []);
  }

  return (data ?? []).map((row) => normalizePropertyRow(row));
}

export async function updatePropertyStatus(
  propertyId: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('properties')
    .update({ status })
    .eq('id', propertyId)
    .select('id, status');

  if (error) {
    throw new Error(error.message || `Failed to mark listing as ${status}.`);
  }

  if (!data || data.length === 0) {
    throw new Error(
      'Permission denied: unable to update listing status. Check Supabase RLS policies for admin updates.'
    );
  }
}
