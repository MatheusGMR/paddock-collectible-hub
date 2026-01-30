-- Allow anyone to view user collections (needed for public profiles)
DROP POLICY IF EXISTS "Users can view own collection" ON public.user_collection;

-- Create new policy that allows viewing any collection (for public profiles)
CREATE POLICY "Anyone can view user collections" 
ON public.user_collection 
FOR SELECT 
USING (true);

-- Keep the insert, update, delete policies for owner only (they already exist)