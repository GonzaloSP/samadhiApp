/*
  # Fix Meditation Locations RLS Policies

  1. Changes
    - Drop existing policies
    - Create new comprehensive policies that handle all operations correctly
    - Ensure upsert operations work properly

  2. Security
    - Maintain data integrity
    - Allow users to manage their own locations
    - Allow public viewing of meditation locations
*/

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Anyone can view meditation locations" ON meditation_locations;
DROP POLICY IF EXISTS "Users can update their own location" ON meditation_locations;
DROP POLICY IF EXISTS "Users can update their meditation status" ON meditation_locations;
DROP POLICY IF EXISTS "Users can delete their own location" ON meditation_locations;

-- Create new comprehensive policies
CREATE POLICY "Anyone can view meditation locations"
  ON meditation_locations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own location"
  ON meditation_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own location"
  ON meditation_locations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own location"
  ON meditation_locations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);