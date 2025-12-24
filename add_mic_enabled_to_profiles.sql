-- Add is_mic_enabled column to profiles table
ALTER TABLE public.profiles
ADD COLUMN is_mic_enabled BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.profiles.is_mic_enabled IS 'User preference for microphone access';
