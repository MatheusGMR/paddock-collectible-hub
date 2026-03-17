
-- Add shipping tracking columns to sales
ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS shipping_status text NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS shipping_photo_url text,
  ADD COLUMN IF NOT EXISTS tracking_code text;

-- Allow sellers to update their own sales (for shipping status advancement)
CREATE POLICY "Sellers can update own sales"
ON public.sales
FOR UPDATE
USING (seller_id = (auth.uid())::text)
WITH CHECK (seller_id = (auth.uid())::text);

-- Allow listing SELECT for sold items too (needed for order details and storefront display)
DROP POLICY IF EXISTS "Anyone can view active listings" ON public.listings;
CREATE POLICY "Anyone can view listings"
ON public.listings
FOR SELECT
USING (status IN ('active', 'sold'));
