import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ChallengeState {
  isActive: boolean;
  target: number;
  current: number;
  progress: number;
  isCompleted: boolean;
  isRewarded: boolean;
  completedAt: string | null;
  isLoading: boolean;
}

export const useCollectionChallenge = () => {
  const { user } = useAuth();
  const [state, setState] = useState<ChallengeState>({
    isActive: false,
    target: 50,
    current: 0,
    progress: 0,
    isCompleted: false,
    isRewarded: false,
    completedAt: null,
    isLoading: true,
  });
  const [showCelebration, setShowCelebration] = useState(false);

  const fetchChallengeStatus = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, isLoading: false, isActive: false }));
      return;
    }

    try {
      // Get subscription data
      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .select("challenge_target, challenge_completed_at, challenge_rewarded, discount_applied")
        .eq("user_id", user.id)
        .single();

      // Get collection count
      const { count } = await supabase
        .from("user_collection")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const collectionCount = count || 0;
      const target = subscription?.challenge_target || 50;
      const isCompleted = !!subscription?.challenge_completed_at;
      const isRewarded = !!subscription?.challenge_rewarded;
      
      // Challenge is active if not completed and not rewarded
      const isActive = !isRewarded;
      
      const progress = Math.min((collectionCount / target) * 100, 100);

      setState({
        isActive,
        target,
        current: collectionCount,
        progress,
        isCompleted,
        isRewarded,
        completedAt: subscription?.challenge_completed_at || null,
        isLoading: false,
      });

      // Show celebration if just completed but not yet rewarded
      if (isCompleted && !isRewarded) {
        setShowCelebration(true);
      }
    } catch (error) {
      console.error("Error fetching challenge status:", error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  const claimReward = useCallback(async () => {
    if (!user) return false;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) return false;

      const { data, error } = await supabase.functions.invoke("claim-challenge-reward", {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) {
        console.error("Error claiming reward:", error);
        return false;
      }

      if (data.success) {
        setState(prev => ({ ...prev, isRewarded: true, isActive: false }));
        setShowCelebration(false);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error claiming reward:", error);
      return false;
    }
  }, [user]);

  const dismissCelebration = useCallback(() => {
    setShowCelebration(false);
  }, []);

  // Fetch status on mount and when user changes
  useEffect(() => {
    fetchChallengeStatus();
  }, [fetchChallengeStatus]);

  // Subscribe to realtime updates on user_collection
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("collection-challenge")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_collection",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch challenge status when a new item is added
          fetchChallengeStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchChallengeStatus]);

  return {
    ...state,
    showCelebration,
    claimReward,
    dismissCelebration,
    refresh: fetchChallengeStatus,
  };
};
