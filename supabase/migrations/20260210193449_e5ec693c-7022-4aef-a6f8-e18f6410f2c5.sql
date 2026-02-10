
-- Create storage bucket for collection images
INSERT INTO storage.buckets (id, name, public)
VALUES ('collection-images', 'collection-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Collection images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'collection-images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload collection images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'collection-images' AND auth.role() = 'authenticated');

-- Allow users to update their own uploads
CREATE POLICY "Users can update their own collection images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'collection-images' AND auth.role() = 'authenticated');
