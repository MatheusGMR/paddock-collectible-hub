-- Add new fields to profiles table for city and phone
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS phone text;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.city IS 'User city for contact/location';
COMMENT ON COLUMN public.profiles.phone IS 'User phone number for contact';