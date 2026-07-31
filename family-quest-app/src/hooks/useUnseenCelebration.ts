import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabaseClient';
import { levelForPoints } from '../lib/gamification';
import type { CompletionResult } from '../lib/gamification';
import type { BadgeKey } from '../types/database';

// Surfaces the celebration screen for a payout the current user hasn't seen
// yet -- needed because the two-step report/confirm flow means the person
// who gets paid isn't necessarily looking at the app when confirm_task_completion
// actually runs (the requester confirms, elsewhere, maybe hours later). Not
// a precise before/after diff like the instant-complete path in
// useTaskDetail gets -- just close enough to still feel like a reward:
// points/level/badges are accurate, streak-increased is skipped rather than
// guessed at from a single ledger row.
export function useUnseenCelebration(familyId: string | undefined, userId: string | undefined) {
  const [celebration, setCelebration] = useState<CompletionResult | null>(null);
  const [payoutId, setPayoutId] = useState<string | null>(null);

  useEffect(() => {
    if (!familyId || !userId) return;
    let cancelled = false;

    void (async () => {
      const { data: payout } = await supabase
        .from('quest_payouts')
        .select('*')
        .eq('family_id', familyId)
        .eq('user_id', userId)
        .eq('kind', 'completion')
        .eq('reputation_awarded', true)
        .is('celebration_seen_at', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (cancelled || !payout) return;

      const [{ data: member }, { data: badgeRows }] = await Promise.all([
        supabase.from('family_members').select('points, xp, current_streak').eq('family_id', familyId).eq('user_id', userId).maybeSingle(),
        supabase.from('member_badges').select('badge_key').eq('family_id', familyId).eq('user_id', userId).gte('earned_at', payout.created_at),
      ]);
      if (cancelled || !member) return;

      const newLevel = levelForPoints(member.xp);
      const prevLevel = levelForPoints(Math.max(0, member.xp - payout.xp_delta));

      setPayoutId(payout.id);
      setCelebration({
        pointsGained: payout.points_delta,
        newPoints: member.points,
        newLevel,
        leveledUp: newLevel > prevLevel,
        newStreak: member.current_streak,
        streakIncreased: false,
        newBadges: (badgeRows ?? []).map((b) => b.badge_key as BadgeKey),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [familyId, userId]);

  const dismiss = useCallback(() => {
    if (payoutId) void supabase.rpc('mark_celebration_seen', { p_payout_id: payoutId });
    setCelebration(null);
    setPayoutId(null);
  }, [payoutId]);

  return { celebration, dismiss };
}
