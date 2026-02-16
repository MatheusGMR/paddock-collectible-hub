import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SaleItem {
  id: string;
  sale_price: number;
  currency: string;
  platform_fee_total: number;
  seller_net: number;
  status: string;
  created_at: string;
  paid_out_at: string | null;
  listing_title: string;
  listing_image: string;
}

interface ReceivablesSummary {
  total_sales: number;
  total_revenue: number;
  total_fees: number;
  total_net: number;
  pending_amount: number;
  paid_out_amount: number;
  recent_sales: SaleItem[];
}

export function useSellerReceivables() {
  const { user } = useAuth();
  const [data, setData] = useState<ReceivablesSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReceivables = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.rpc("get_seller_receivables", {
        p_seller_id: user.id,
      });
      if (error) throw error;
      setData(result as unknown as ReceivablesSummary);
    } catch (err) {
      console.error("Error fetching receivables:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchReceivables();
  }, [fetchReceivables]);

  return { data, isLoading, refetch: fetchReceivables };
}
