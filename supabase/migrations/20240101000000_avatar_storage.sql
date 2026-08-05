-- Create an 'avatars' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up policies for the 'avatars' bucket
-- Allow public viewing
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Allow authenticated users to upload avatars
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: In this project, the avatar URL is stored in auth.users user_metadata
-- (raw_user_meta_data->>'avatar_url') via the Supabase Auth API,
-- so we don't need to add an avatar_url column to a profiles table.
