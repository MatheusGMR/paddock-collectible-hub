-- Create table for scan feedback (likes and error reports)
CREATE TABLE public.scan_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('like', 'error_report')),
  error_field TEXT, -- Which field was wrong (manufacturer, model, year, etc.)
  error_correction TEXT, -- User's suggested correction
  original_value TEXT, -- The original AI-detected value
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scan_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can submit feedback"
ON public.scan_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.scan_feedback
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for analytics
CREATE INDEX idx_scan_feedback_item ON public.scan_feedback(item_id);
CREATE INDEX idx_scan_feedback_type ON public.scan_feedback(feedback_type);