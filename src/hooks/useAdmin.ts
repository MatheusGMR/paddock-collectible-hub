import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AdminStats {
  total_users: number;
  total_items: number;
  total_collection_items: number;
  total_posts: number;
  total_likes: number;
  active_listings: number;
  total_follows: number;
}

export interface SubscriptionStat {
  status: string;
  count: number;
  date: string;
}

export interface UserGrowth {
  date: string;
  new_users: number;
}

export interface AdminUser {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  city: string | null;
  created_at: string;
  collection_count: number;
  posts_count: number;
}

export const useAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc("is_admin");
        
        if (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data === true);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdmin();
  }, [user]);

  return { isAdmin, isLoading };
};

export const useAdminStats = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_admin_stats");
      
      if (error) throw error;
      setStats(data as unknown as AdminStats);
      setError(null);
    } catch (err) {
      console.error("Error fetching admin stats:", err);
      setError("Falha ao carregar estatísticas");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, isLoading, error, refetch: fetchStats };
};

export const useAdminSubscriptionStats = () => {
  const [stats, setStats] = useState<SubscriptionStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.rpc("get_admin_subscription_stats");
        
        if (error) throw error;
        setStats((data as unknown as SubscriptionStat[]) || []);
      } catch (err) {
        console.error("Error fetching subscription stats:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, isLoading };
};

export const useAdminUserGrowth = () => {
  const [growth, setGrowth] = useState<UserGrowth[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGrowth = async () => {
      try {
        const { data, error } = await supabase.rpc("get_admin_user_growth");
        
        if (error) throw error;
        setGrowth((data as unknown as UserGrowth[]) || []);
      } catch (err) {
        console.error("Error fetching user growth:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGrowth();
  }, []);

  return { growth, isLoading };
};

export const useAdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_admin_users");
      
      if (error) throw error;
      setUsers((data as unknown as AdminUser[]) || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return { users, isLoading, refetch: fetchUsers };
};

// Analytics types
export interface PageAnalytics {
  page_views: Array<{
    page_path: string;
    views: number;
    unique_sessions: number;
    avg_duration_ms: number | null;
  }> | null;
  daily_stats: Array<{
    date: string;
    page_views: number;
    interactions: number;
    sessions: number;
    unique_users: number;
  }> | null;
  top_interactions: Array<{
    interaction_target: string;
    interaction_type: string;
    page_path: string;
    count: number;
  }> | null;
  user_flow: Array<{
    from_page: string;
    to_page: string;
    transitions: number;
  }> | null;
  avg_session_duration: number | null;
  device_breakdown: Array<{
    device: string;
    sessions: number;
  }> | null;
  bounce_rate: number | null;
}

export const useAdminPageAnalytics = (daysBack: number = 7) => {
  const [analytics, setAnalytics] = useState<PageAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_admin_page_analytics", {
        days_back: daysBack
      });
      
      if (error) throw error;
      setAnalytics(data as unknown as PageAnalytics);
    } catch (err) {
      console.error("Error fetching page analytics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [daysBack]);

  return { analytics, isLoading, refetch: fetchAnalytics };
};
