ALTER TABLE public.user_collection ADD COLUMN IF NOT EXISTS original_image_url text;
GRANT SELECT, INSERT, UPDATE ON public.user_collection TO authenticated;