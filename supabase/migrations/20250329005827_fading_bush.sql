/*
  # Add Meditation Locations Support

  1. New Tables
    - `meditation_locations`: Stores user meditation locations
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `latitude` (double precision)
      - `longitude` (double precision)
      - `is_meditating` (boolean)
      - `started_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for location sharing
*/

CREATE TABLE meditation_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  is_meditating boolean DEFAULT true,
  started_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE meditation_locations ENABLE ROW LEVEL SECURITY;

-- Everyone can view meditation locations
CREATE POLICY "Anyone can view meditation locations"
  ON meditation_locations
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own location
CREATE POLICY "Users can update their own location"
  ON meditation_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their meditation status"
  ON meditation_locations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to clean up old meditation locations
CREATE OR REPLACE FUNCTION cleanup_old_meditation_locations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM meditation_locations
  WHERE updated_at < NOW() - INTERVAL '1 hour';
END
$$;