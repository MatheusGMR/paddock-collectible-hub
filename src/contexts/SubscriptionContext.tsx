import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";

type SubscriptionStatus = "none" | "trial" | "active" | "expired" | "canceled";

interface SubscriptionState {
  status: SubscriptionStatus;
  isNewUser: boolean;
  trialEndsAt: string | null;
  daysLeft: number;
  subscriptionEnd: string | null;
  isLoading: boolean;
}

interface SubscriptionContextType extends SubscriptionState {
  checkSubscription: () => Promise<void>;
  startTrial: () => Promise<boolean>;
  createCheckout: () => Promise<string | null>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user, session } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    status: "none",
    isNewUser: true,
    trialEndsAt: null,
    daysLeft: 0,
    subscriptionEnd: null,
    isLoading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      // Get fresh session to ensure we have a valid token
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        console.error("Error checking subscription:", error);
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      setState({
        status: data.status || "none",
        isNewUser: data.is_new_user ?? true,
        trialEndsAt: data.trial_ends_at || null,
        daysLeft: data.days_left || 0,
        subscriptionEnd: data.subscription_end || null,
        isLoading: false,
      });
    } catch (err) {
      console.error("Failed to check subscription:", err);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  const startTrial = useCallback(async (): Promise<boolean> => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.access_token) return false;

    try {
      const { data, error } = await supabase.functions.invoke("start-trial", {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        console.error("Error starting trial:", error);
        return false;
      }

      if (data.success) {
        setState(prev => ({
          ...prev,
          status: "trial",
          isNewUser: false,
          trialEndsAt: data.trial_ends_at,
          daysLeft: data.days_left || 7,
        }));
        return true;
      }

      return false;
    } catch (err) {
      console.error("Failed to start trial:", err);
      return false;
    }
  }, []);

  const createCheckout = useCallback(async (): Promise<string | null> => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.access_token) return null;

    try {
      const { data, error } = await supabase.functions.invoke("create-subscription", {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        console.error("Error creating checkout:", error);
        return null;
      }

      return data.url || null;
    } catch (err) {
      console.error("Failed to create checkout:", err);
      return null;
    }
  }, []);

  // Check subscription when user logs in
  useEffect(() => {
    if (user && session) {
      checkSubscription();
    } else {
      setState({
        status: "none",
        isNewUser: true,
        trialEndsAt: null,
        daysLeft: 0,
        subscriptionEnd: null,
        isLoading: false,
      });
    }
  }, [user, session, checkSubscription]);

  // Refresh subscription check every 5 minutes (was 1 minute - too aggressive)
  useEffect(() => {
    if (!user || !session) return;

    const interval = setInterval(() => {
      checkSubscription();
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [user, session, checkSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        ...state,
        checkSubscription,
        startTrial,
        createCheckout,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
};
