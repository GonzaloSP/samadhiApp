/*
  # Add Delete Policy for Meditation Locations

  1. Changes
    - Add RLS policy to allow users to delete their own meditation locations

  2. Security
    - Users can only delete their own location records
    - Maintains data integrity by checking user_id
*/

CREATE POLICY "Users can delete their own location"
  ON meditation_locations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);