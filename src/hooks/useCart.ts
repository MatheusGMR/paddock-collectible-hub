import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface CartItem {
  id: string;
  listing_id: string;
  listing: {
    id: string;
    title: string;
    price: number;
    currency: string;
    image_url: string;
    source: string;
    source_name: string;
  };
}

export function useCart() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("cart_items")
        .select("id, listing_id, listings(id, title, price, currency, image_url, source, source_name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: CartItem[] = (data || []).map((row: any) => ({
        id: row.id,
        listing_id: row.listing_id,
        listing: row.listings,
      }));
      setItems(mapped);
    } catch (err) {
      console.error("Error fetching cart:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addItem = useCallback(async (listingId: string) => {
    if (!user) {
      toast({ variant: "destructive", title: "Faça login para adicionar ao carrinho" });
      return false;
    }
    try {
      const { error } = await supabase
        .from("cart_items")
        .insert({ user_id: user.id, listing_id: listingId });

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Item já está no carrinho" });
          return false;
        }
        throw error;
      }
      await fetchCart();
      toast({ title: "Adicionado ao carrinho ✓" });
      return true;
    } catch (err) {
      console.error("Error adding to cart:", err);
      toast({ variant: "destructive", title: "Erro ao adicionar ao carrinho" });
      return false;
    }
  }, [user, fetchCart, toast]);

  const removeItem = useCallback(async (listingId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listingId);

      if (error) throw error;
      setItems(prev => prev.filter(i => i.listing_id !== listingId));
    } catch (err) {
      console.error("Error removing from cart:", err);
    }
  }, [user]);

  const clearCart = useCallback(async () => {
    if (!user) return;
    try {
      await supabase.from("cart_items").delete().eq("user_id", user.id);
      setItems([]);
    } catch (err) {
      console.error("Error clearing cart:", err);
    }
  }, [user]);

  const isInCart = useCallback((listingId: string) => {
    return items.some(i => i.listing_id === listingId);
  }, [items]);

  const checkout = useCallback(async () => {
    if (items.length === 0) return;
    setIsCheckingOut(true);
    try {
      const listingIds = items.map(i => i.listing_id);
      const { data, error } = await supabase.functions.invoke<{ url: string }>(
        "create-cart-payment",
        { body: { listing_ids: listingIds } }
      );
      if (error) throw new Error(error.message);
      if (data?.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast({ variant: "destructive", title: "Erro ao iniciar checkout" });
    } finally {
      setIsCheckingOut(false);
    }
  }, [items, toast]);

  const count = items.length;
  const total = items.reduce((sum, i) => sum + (i.listing?.price || 0), 0);
  const currency = items[0]?.listing?.currency || "BRL";

  return { items, count, total, currency, isLoading, isCheckingOut, addItem, removeItem, clearCart, isInCart, checkout, fetchCart };
}
