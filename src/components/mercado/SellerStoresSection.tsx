import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Store, MapPin, ChevronRight, ShoppingBag } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface SellerStore {
  user_id: string;
  username: string;
  avatar_url: string | null;
  city: string | null;
  business_name: string | null;
  listing_count: number;
}

export const SellerStoresSection = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [stores, setStores] = useState<SellerStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        // Get all seller profiles
        const { data: sellers } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url, city")
          .eq("is_seller", true);

        if (!sellers || sellers.length === 0) {
          setStores([]);
          setLoading(false);
          return;
        }

        const sellerIds = sellers.map((s) => s.user_id);

        // Get business names and listing counts in parallel
        const [detailsRes, listingsRes] = await Promise.all([
          supabase
            .from("seller_details")
            .select("user_id, business_name")
            .in("user_id", sellerIds),
          supabase
            .from("listings")
            .select("user_id")
            .in("user_id", sellerIds)
            .eq("status", "active"),
        ]);

        const detailsMap = new Map(
          (detailsRes.data || []).map((d) => [d.user_id, d.business_name])
        );

        // Count listings per seller
        const countMap = new Map<string, number>();
        (listingsRes.data || []).forEach((l) => {
          countMap.set(l.user_id!, (countMap.get(l.user_id!) || 0) + 1);
        });

        const mapped: SellerStore[] = sellers
          .map((s) => ({
            user_id: s.user_id,
            username: s.username,
            avatar_url: s.avatar_url,
            city: s.city,
            business_name: detailsMap.get(s.user_id) || null,
            listing_count: countMap.get(s.user_id) || 0,
          }))
          .filter((s) => s.listing_count > 0)
          .sort((a, b) => b.listing_count - a.listing_count);

        setStores(mapped);
      } catch (error) {
        console.error("Error fetching stores:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  if (loading || stores.length === 0) return null;

  const labels = {
    pt: { title: "Lojas", items: "anúncios", seeAll: "Ver loja" },
    en: { title: "Stores", items: "listings", seeAll: "View store" },
  };
  const t = labels[language === "pt-BR" ? "pt" : "en"];

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="flex items-center gap-2 mb-3">
        <Store className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">{t.title}</h2>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {stores.map((store) => (
          <button
            key={store.user_id}
            onClick={() => navigate(`/store/${store.user_id}`)}
            className={cn(
              "flex-shrink-0 w-36 rounded-xl bg-card border border-border p-3",
              "flex flex-col items-center gap-2 text-center",
              "transition-all duration-200 hover:border-primary/30 hover:shadow-md",
              "active:scale-[0.97]"
            )}
          >
            <Avatar className="h-12 w-12 ring-1 ring-primary/20">
              <AvatarImage src={store.avatar_url || ""} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                {(store.business_name || store.username)[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="w-full">
              <p className="text-xs font-medium text-foreground truncate">
                {store.business_name || store.username}
              </p>
              {store.city && (
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mt-0.5">
                  <MapPin className="h-2.5 w-2.5" />
                  {store.city}
                </p>
              )}
            </div>

            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
              <ShoppingBag className="h-2.5 w-2.5 mr-1" />
              {store.listing_count} {t.items}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
};
