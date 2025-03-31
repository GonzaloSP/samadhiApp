/*
  # Meditation Statistics Schema

  1. New Tables
    - `meditation_sessions`
    - `user_stats`
    - `achievements`
    - `user_achievements`

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Create triggers for stats management
*/

-- Create meditation_sessions table
CREATE TABLE meditation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  duration integer NOT NULL,
  completed boolean DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create user_stats table
CREATE TABLE user_stats (
  user_id uuid PRIMARY KEY REFERENCES auth.users,
  total_minutes integer DEFAULT 0,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  total_sessions integer DEFAULT 0,
  last_session_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create achievements table
CREATE TABLE achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create user_achievements table
CREATE TABLE user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  achievement_id uuid REFERENCES achievements NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Enable Row Level Security
ALTER TABLE meditation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Policies for meditation_sessions
CREATE POLICY "Users can view their own meditation sessions"
  ON meditation_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own meditation sessions"
  ON meditation_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meditation sessions"
  ON meditation_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for user_stats
CREATE POLICY "Users can view their own stats"
  ON user_stats
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
  ON user_stats
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for achievements
CREATE POLICY "Anyone can view achievements"
  ON achievements
  FOR SELECT
  TO authenticated
  USING (true);

-- Policies for user_achievements
CREATE POLICY "Users can view their own achievements"
  ON user_achievements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can unlock achievements"
  ON user_achievements
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Insert default achievements
INSERT INTO achievements (name, description, icon) VALUES
  ('Early Bird', 'Complete a meditation session before 8 AM', 'Sun'),
  ('Night Owl', 'Complete a meditation session after 10 PM', 'Moon'),
  ('Zen Master', 'Complete a 60-minute meditation session', 'Lotus'),
  ('Consistent', 'Maintain a 7-day meditation streak', 'Calendar'),
  ('Dedicated', 'Complete 100 meditation sessions', 'Award'),
  ('Explorer', 'Try all meditation durations', 'Compass'),
  ('Focus Master', 'Complete 10 sessions without pausing', 'Target'),
  ('Rising Star', 'Achieve a 30-day streak', 'Star');

-- Function to create user stats on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_stats (user_id)
  VALUES (new.id);
  RETURN new;
END
$$;

-- Trigger to create user stats on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update stats after session completion
CREATE OR REPLACE FUNCTION public.update_user_stats_after_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_session_date date;
  streak_broken boolean;
BEGIN
  -- Only process completed sessions
  IF NOT NEW.completed THEN
    RETURN NEW;
  END IF;

  -- Get the user's last session date
  SELECT us.last_session_date 
  INTO last_session_date
  FROM user_stats us 
  WHERE us.user_id = NEW.user_id;

  -- Check if streak is broken (more than 1 day gap)
  streak_broken := last_session_date IS NULL OR 
                  NEW.completed_at::date - last_session_date > 1;

  -- Update user stats
  UPDATE user_stats
  SET 
    total_minutes = total_minutes + (NEW.duration / 60),
    total_sessions = total_sessions + 1,
    current_streak = CASE 
      WHEN streak_broken THEN 1
      WHEN NEW.completed_at::date = last_session_date THEN current_streak
      ELSE current_streak + 1
    END,
    longest_streak = GREATEST(
      longest_streak,
      CASE 
        WHEN streak_broken THEN 1
        WHEN NEW.completed_at::date = last_session_date THEN current_streak
        ELSE current_streak + 1
      END
    ),
    last_session_date = NEW.completed_at::date,
    updated_at = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END
$$;

-- Trigger to update stats after session completion
CREATE TRIGGER on_meditation_session_completed
  AFTER INSERT OR UPDATE OF completed
  ON meditation_sessions
  FOR EACH ROW
  WHEN (NEW.completed = true)
  EXECUTE FUNCTION public.update_user_stats_after_session();