-- Run this in your Supabase Dashboard -> SQL Editor if you see
-- "permission denied for table properties" or RLS errors.

-- 1. Grant API role privileges on public schema & tables
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.properties, public.property_images, public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.properties, public.property_images TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.profiles TO authenticated;

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Properties policies
DROP POLICY IF EXISTS "Public can view approved properties" ON public.properties;
CREATE POLICY "Public can view approved properties"
  ON public.properties FOR SELECT
  TO anon, authenticated
  USING (status = 'approved' OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Authenticated users can insert properties" ON public.properties;
CREATE POLICY "Authenticated users can insert properties"
  ON public.properties FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update own properties" ON public.properties;
CREATE POLICY "Owners can update own properties"
  ON public.properties FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete own properties" ON public.properties;
CREATE POLICY "Owners can delete own properties"
  ON public.properties FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- 4. Property Images policies
DROP POLICY IF EXISTS "Public can view images of accessible properties" ON public.property_images;
CREATE POLICY "Public can view images of accessible properties"
  ON public.property_images FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id
        AND (p.status = 'approved' OR p.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owners can insert own property images" ON public.property_images;
CREATE POLICY "Owners can insert own property images"
  ON public.property_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can delete own property images" ON public.property_images;
CREATE POLICY "Owners can delete own property images"
  ON public.property_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_images.property_id AND p.owner_id = auth.uid()
    )
  );

-- 5. Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 6. Storage bucket 'property-photos' policies
DROP POLICY IF EXISTS "Public can view property photos" ON storage.objects;
CREATE POLICY "Public can view property photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'property-photos');

DROP POLICY IF EXISTS "Authenticated users can upload property photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload property photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'property-photos');

DROP POLICY IF EXISTS "Owners can delete own property photos" ON storage.objects;
CREATE POLICY "Owners can delete own property photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'property-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
