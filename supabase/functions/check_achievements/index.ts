import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { user_id, total_minutes, current_streak, total_sessions } = await req.json();

    // Define achievement criteria
    const achievements = [
      {
        name: 'Early Bird',
        description: 'Complete a meditation session before 8 AM',
        condition: () => {
          const hour = new Date().getHours();
          return hour < 8;
        },
      },
      {
        name: 'Zen Master',
        description: 'Complete a 60-minute meditation session',
        condition: () => total_minutes >= 60,
      },
      {
        name: 'Consistent',
        description: 'Maintain a 7-day meditation streak',
        condition: () => current_streak >= 7,
      },
      {
        name: 'Dedicated',
        description: 'Complete 100 meditation sessions',
        condition: () => total_sessions >= 100,
      },
    ];

    // Check for new achievements
    const newAchievements = [];
    for (const achievement of achievements) {
      if (achievement.condition()) {
        // Check if user already has this achievement
        const { data: existingAchievement } = await supabase
          .from('achievements')
          .select('id')
          .eq('name', achievement.name)
          .single();

        if (existingAchievement) {
          const { data: userAchievement } = await supabase
            .from('user_achievements')
            .select()
            .eq('user_id', user_id)
            .eq('achievement_id', existingAchievement.id)
            .single();

          if (!userAchievement) {
            // Award new achievement
            await supabase
              .from('user_achievements')
              .insert({
                user_id,
                achievement_id: existingAchievement.id,
              });

            newAchievements.push({
              id: existingAchievement.id,
              name: achievement.name,
              description: achievement.description,
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify(newAchievements),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});