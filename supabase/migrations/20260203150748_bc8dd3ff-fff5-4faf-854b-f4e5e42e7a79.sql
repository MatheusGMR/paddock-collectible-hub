-- Add challenge tracking columns to user_subscriptions table
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS challenge_target INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS challenge_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS challenge_rewarded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS discount_applied BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.user_subscriptions.challenge_target IS 'Number of cars needed to complete the challenge (default 50)';
COMMENT ON COLUMN public.user_subscriptions.challenge_completed_at IS 'When the user completed the 50 cars challenge';
COMMENT ON COLUMN public.user_subscriptions.challenge_rewarded IS 'Whether the free month reward has been applied';
COMMENT ON COLUMN public.user_subscriptions.discount_applied IS 'Whether the 50% permanent discount has been applied';

-- Create a function to check and update challenge completion
CREATE OR REPLACE FUNCTION public.check_collection_challenge()
RETURNS TRIGGER AS $$
DECLARE
  collection_count INTEGER;
  user_subscription RECORD;
BEGIN
  -- Count items in user's collection
  SELECT COUNT(*) INTO collection_count
  FROM public.user_collection
  WHERE user_id = NEW.user_id;
  
  -- Get user's subscription
  SELECT * INTO user_subscription
  FROM public.user_subscriptions
  WHERE user_id = NEW.user_id;
  
  -- If user has subscription and hasn't completed challenge yet
  IF user_subscription IS NOT NULL 
     AND user_subscription.challenge_completed_at IS NULL 
     AND collection_count >= COALESCE(user_subscription.challenge_target, 50) THEN
    
    -- Mark challenge as completed
    UPDATE public.user_subscriptions
    SET challenge_completed_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to check challenge on new collection items
DROP TRIGGER IF EXISTS on_collection_item_added ON public.user_collection;
CREATE TRIGGER on_collection_item_added
AFTER INSERT ON public.user_collection
FOR EACH ROW
EXECUTE FUNCTION public.check_collection_challenge();