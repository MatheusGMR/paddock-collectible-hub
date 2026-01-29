-- Add new columns for music suggestion and real car photos
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS music_suggestion text,
ADD COLUMN IF NOT EXISTS real_car_photos jsonb;