import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SellerDetails {
  id?: string;
  user_id: string;
  business_name?: string;
  document_number?: string;
  phone?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;
  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  bank_account_type?: string;
  pix_key?: string;
  stripe_account_id?: string;
}

export interface InventoryItem {
  id: string;
  title: string;
  price: number;
  currency: string;
  image_url: string;
  description?: string;
  source: string;
  source_name: string;
  created_at: string;
  status: string;
  // sold items extra
  buyer_id?: string;
  sold_at?: string;
  sale_price?: number;
  seller_net?: number;
}

export interface InventoryData {
  active: InventoryItem[];
  sold: InventoryItem[];
  total_active: number;
  total_sold: number;
  total_value: number;
}

export interface CustomerData {
  buyer_id: string;
  buyer_username: string;
  buyer_avatar: string | null;
  buyer_city: string | null;
  total_purchases: number;
  total_spent: number;
  last_purchase_at: string;
  purchases: {
    id: string;
    sale_price: number;
    currency: string;
    created_at: string;
    status: string;
    listing_title: string;
    listing_image: string;
  }[];
}

export interface ReceivablesData {
  total_sales: number;
  total_revenue: number;
  total_fees: number;
  total_net: number;
  pending_amount: number;
  paid_out_amount: number;
  recent_sales: any[];
}

export const useSellerData = () => {
  const { user } = useAuth();
  const [isSeller, setIsSeller] = useState(false);
  const [sellerDetails, setSellerDetails] = useState<SellerDetails | null>(null);
  const [inventory, setInventory] = useState<InventoryData | null>(null);
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [receivables, setReceivables] = useState<ReceivablesData | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSellerStatus = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("is_seller")
      .eq("user_id", user.id)
      .single();
    setIsSeller(data?.is_seller || false);
  }, [user]);

  const activateSeller = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ is_seller: true } as any)
      .eq("user_id", user.id);
    setIsSeller(true);
  };

  const loadSellerDetails = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("seller_details" as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setSellerDetails(data as any);
  }, [user]);

  const saveSellerDetails = async (details: Partial<SellerDetails>) => {
    if (!user) return;
    const existing = sellerDetails?.id;
    if (existing) {
      const { data } = await supabase
        .from("seller_details" as any)
        .update(details as any)
        .eq("user_id", user.id)
        .select()
        .single();
      setSellerDetails(data as any);
    } else {
      const { data } = await supabase
        .from("seller_details" as any)
        .insert({ ...details, user_id: user.id } as any)
        .select()
        .single();
      setSellerDetails(data as any);
    }
  };

  const loadInventory = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.rpc("get_seller_inventory", { p_seller_id: user.id });
    setInventory(data as any);
  }, [user]);

  const loadCustomers = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.rpc("get_seller_customers", { p_seller_id: user.id });
    setCustomers((data as any) || []);
  }, [user]);

  const loadReceivables = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.rpc("get_seller_receivables", { p_seller_id: user.id });
    setReceivables(data as any);
  }, [user]);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      await Promise.all([
        checkSellerStatus(),
        loadSellerDetails(),
        loadInventory(),
        loadCustomers(),
        loadReceivables(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [user, checkSellerStatus, loadSellerDetails, loadInventory, loadCustomers, loadReceivables]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return {
    isSeller,
    sellerDetails,
    inventory,
    customers,
    receivables,
    loading,
    activateSeller,
    saveSellerDetails,
    loadInventory,
    loadCustomers,
    loadReceivables,
    loadAll,
  };
};
