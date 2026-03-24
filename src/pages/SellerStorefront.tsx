import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  UserPlus,
  UserMinus,
  MessageCircle,
  Share2,
  ShoppingBag,
  Loader2,
  Grid3X3,
  TrendingUp,
  Store,
  Copy,
  Search,
  MapPin,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/data/marketplaceSources";
import { isFollowing, followUser, unfollowUser, getFollowCounts } from "@/lib/database";
import { MessagesSheet } from "@/components/messages/MessagesSheet";
import { getOrCreateConversation } from "@/lib/api/messages";
import { trackInteraction } from "@/lib/analytics";
import paddockWordmark from "@/assets/paddock-wordmark-new.png";

interface SellerProfile {
  username: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
}

interface SellerInfo {
  business_name: string | null;
  phone: string | null;
  address_city: string | null;
  address_state: string | null;
}

interface StoreListing {
  id: string;
  title: string;
  price: number;
  currency: string;
  image_url: string;
  description: string | null;
  created_at: string;
  item_id: string | null;
}

interface ListingWithItem extends StoreListing {
  rarity_tier?: string | null;
  real_car_brand?: string;
  real_car_model?: string;
}

const RARITY_COLORS: Record<string, string> = {
  "Legendary": "bg-amber-500/90 text-white",
  "Epic": "bg-purple-500/90 text-white",
  "Rare": "bg-blue-500/90 text-white",
  "Uncommon": "bg-green-500/90 text-white",
  "Common": "bg-muted text-muted-foreground",
};

const SellerStorefront = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Auth guard: redirect to auth with return URL
  const requireAuth = useCallback((action: () => void) => {
    if (!user) {
      // Store the return URL so user comes back after login
      sessionStorage.setItem("paddock_return_url", `/store/${sellerId}`);
      navigate("/auth");
      return;
    }
    action();
  }, [user, navigate, sellerId]);

  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [sellerInfo, setSellerInfo] = useState<SellerInfo | null>(null);
  const [listings, setListings] = useState<ListingWithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"grid" | "ranking">("grid");
  const [sortBy, setSortBy] = useState<"recent" | "price_asc" | "price_desc">("recent");

  // Social state
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Messages
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(false);

  const isOwnStore = user?.id === sellerId;

  const loadStoreData = useCallback(async () => {
    if (!sellerId) return;
    setLoading(true);

    try {
      const [profileRes, detailsRes, listingsRes, counts] = await Promise.all([
        supabase
          .from("profiles")
          .select("username, avatar_url, bio, city, is_seller")
          .eq("user_id", sellerId)
          .single(),
        supabase
          .from("seller_details")
          .select("business_name, phone, address_city, address_state")
          .eq("user_id", sellerId)
          .maybeSingle(),
        supabase
          .from("listings")
          .select("id, title, price, currency, image_url, description, created_at, item_id")
          .eq("user_id", sellerId)
          .eq("status", "active")
          .order("created_at", { ascending: false }),
        getFollowCounts(sellerId),
      ]);

      if (profileRes.data && profileRes.data.is_seller) {
        setProfile(profileRes.data);
      }
      setSellerInfo(detailsRes.data as SellerInfo | null);
      setFollowCounts(counts);

      // Get listings with item data for rarity
      const rawListings = (listingsRes.data || []) as StoreListing[];
      const itemIds = rawListings.map((l) => l.item_id).filter(Boolean) as string[];

      let itemMap: Record<string, { rarity_tier: string | null; real_car_brand: string; real_car_model: string }> = {};
      if (itemIds.length > 0) {
        const { data: items } = await supabase
          .from("items")
          .select("id, rarity_tier, real_car_brand, real_car_model")
          .in("id", itemIds);
        if (items) {
          for (const item of items) {
            itemMap[item.id] = item;
          }
        }
      }

      const enriched: ListingWithItem[] = rawListings.map((l) => ({
        ...l,
        rarity_tier: l.item_id ? itemMap[l.item_id]?.rarity_tier : null,
        real_car_brand: l.item_id ? itemMap[l.item_id]?.real_car_brand : undefined,
        real_car_model: l.item_id ? itemMap[l.item_id]?.real_car_model : undefined,
      }));

      setListings(enriched);

      // Check follow status
      if (user && user.id !== sellerId) {
        const following = await isFollowing(user.id, sellerId);
        setIsFollowingUser(following);
      }
    } catch (error) {
      console.error("Error loading store:", error);
    } finally {
      setLoading(false);
    }
  }, [sellerId, user]);

  useEffect(() => {
    loadStoreData();
  }, [loadStoreData]);

  const handleFollowToggle = async () => {
    if (!user || !sellerId) return;
    setFollowLoading(true);
    try {
      if (isFollowingUser) {
        await unfollowUser(user.id, sellerId);
        setIsFollowingUser(false);
        setFollowCounts((prev) => ({ ...prev, followers: prev.followers - 1 }));
        trackInteraction("unfollow_user", `user_${sellerId}`);
      } else {
        await followUser(user.id, sellerId);
        setIsFollowingUser(true);
        setFollowCounts((prev) => ({ ...prev, followers: prev.followers + 1 }));
        trackInteraction("follow_user", `user_${sellerId}`);
      }
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    } finally {
      setFollowLoading(false);
    }
  };

  const handleOpenMessages = async () => {
    if (!user || !sellerId) return;
    setLoadingMessage(true);
    try {
      const convId = await getOrCreateConversation(sellerId);
      setConversationId(convId);
      setMessagesOpen(true);
    } catch {
      toast({ title: "Erro ao abrir mensagens", variant: "destructive" });
    } finally {
      setLoadingMessage(false);
    }
  };

  const storeUrl = `${window.location.origin}/store/${sellerId}`;
  const storeName = sellerInfo?.business_name || profile?.username || "Loja";
  const storeLocation = sellerInfo?.address_city
    ? `${sellerInfo.address_city}${sellerInfo.address_state ? `, ${sellerInfo.address_state}` : ""}`
    : profile?.city;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      toast({ title: "Link copiado!" });
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const handleWhatsApp = () => {
    const text = [
      `🏁 *${storeName}* na Paddock`,
      ``,
      `Miniaturas exclusivas, peças raras e colecionáveis selecionados a dedo.`,
      ``,
      `🔍 Veja o catálogo completo:`,
      storeUrl,
      ``,
      `📦 Envio para todo o Brasil`,
      `💳 Pagamento seguro via Apple Pay, Google Pay e cartão`,
    ].join("\n");
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  const filteredListings = listings
    .filter((l) =>
      searchQuery ? l.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
    )
    .sort((a, b) => {
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Ranking: sort by rarity
  const RARITY_ORDER = ["Legendary", "Epic", "Rare", "Uncommon", "Common"];
  const rankedListings = [...filteredListings].sort((a, b) => {
    const ai = RARITY_ORDER.indexOf(a.rarity_tier || "Common");
    const bi = RARITY_ORDER.indexOf(b.rarity_tier || "Common");
    return ai - bi;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-6">
        <Store className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">Loja não encontrada</h1>
        <p className="text-muted-foreground text-center">
          Esta loja não existe ou ainda não foi ativada.
        </p>
        <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header bar */}
      <div className="border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <img src={paddockWordmark} alt="Paddock" style={{ height: 24 }} className="object-contain opacity-80" />
          <Popover>
            <PopoverTrigger asChild>
              <button className="p-2 -mr-2">
                <Share2 className="h-5 w-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2" align="end">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm hover:bg-accent transition-colors"
              >
                <Copy className="h-4 w-4 text-muted-foreground" />
                Copiar link
              </button>
              <button
                onClick={handleWhatsApp}
                className="flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm hover:bg-accent transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-green-500" />
                Enviar via WhatsApp
              </button>
            </PopoverContent>
          </Popover>
        </div>

        {/* Profile Info — same structure as UserProfile */}
        <div className="px-4 pb-4">
          <div className="flex items-start gap-6">
            <div className="flex flex-col items-center">
              <Avatar className="h-20 w-20 ring-2 ring-primary/30">
                <AvatarImage src={profile.avatar_url || ""} alt={storeName} />
                <AvatarFallback className="bg-muted text-2xl font-semibold">
                  {storeName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {storeName}
              </p>
            </div>

            <div className="flex flex-1 justify-around pt-2">
              <StatItem value={listings.length} label="À venda" />
              <StatItem value={followCounts.followers} label="Seguidores" />
              <StatItem value={followCounts.following} label="Seguindo" />
            </div>
          </div>

          {/* Bio & Location */}
          <div className="mt-4 space-y-1">
            <p className="text-sm text-foreground/90 leading-relaxed">
              {profile.bio || "Lojista na Paddock"}
            </p>
            {storeLocation && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {storeLocation}
              </p>
            )}
            <p className="text-xs text-muted-foreground">@{profile.username}</p>
          </div>

          {/* Action Buttons */}
          {!isOwnStore && (
            <div className="flex gap-2 mt-4">
              <Button
                variant={isFollowingUser ? "outline" : "default"}
                onClick={() => requireAuth(handleFollowToggle)}
                disabled={followLoading}
                className="flex-1 gap-2"
              >
                {followLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isFollowingUser ? (
                  <>
                    <UserMinus className="h-4 w-4" />
                    Deixar de seguir
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Seguir
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => requireAuth(handleOpenMessages)}
                disabled={loadingMessage}
                size="icon"
              >
                {loadingMessage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          className={`flex-1 flex items-center justify-center py-3 relative transition-colors ${
            activeTab === "grid" ? "text-foreground" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("grid")}
        >
          <Grid3X3 className="h-6 w-6" />
          {activeTab === "grid" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />}
        </button>
        <button
          className={`flex-1 flex items-center justify-center py-3 relative transition-colors ${
            activeTab === "ranking" ? "text-foreground" : "text-muted-foreground"
          }`}
          onClick={() => setActiveTab("ranking")}
        >
          <TrendingUp className="h-6 w-6" />
          {activeTab === "ranking" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />}
        </button>
      </div>

      {/* Search & Sort */}
      <div className="px-4 py-3 flex items-center gap-2 border-b border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nesta loja..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border h-9 text-sm"
          />
        </div>
        <div className="flex gap-1">
          {(["recent", "price_asc", "price_desc"] as const).map((sort) => {
            const labels = { recent: "Recentes", price_asc: "↓ Preço", price_desc: "↑ Preço" };
            return (
              <Badge
                key={sort}
                variant={sortBy === sort ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap text-[10px] py-0.5 px-2"
                onClick={() => setSortBy(sort)}
              >
                {labels[sort]}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {activeTab === "grid" ? (
        filteredListings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/40" />
            <p className="text-muted-foreground text-center text-sm">
              {searchQuery ? "Nenhum produto encontrado." : "Nenhum anúncio disponível."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-px bg-border">
            {filteredListings.map((listing) => (
              <ListingGridItem key={listing.id} listing={listing} onPress={() => navigate(`/listing/${listing.id}`)} />
            ))}
          </div>
        )
      ) : (
        <div className="divide-y divide-border">
          {rankedListings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <TrendingUp className="h-16 w-16 text-muted-foreground/40" />
              <p className="text-muted-foreground text-center text-sm">Sem itens para rankear.</p>
            </div>
          ) : (
            rankedListings.map((listing, i) => (
              <RankingListItem key={listing.id} listing={listing} rank={i + 1} onPress={() => navigate(`/listing/${listing.id}`)} />
            ))
          )}
        </div>
      )}

      {/* Messages Sheet */}
      <MessagesSheet
        open={messagesOpen}
        onOpenChange={setMessagesOpen}
        initialConversationId={conversationId}
        initialOtherUser={
          profile
            ? {
                user_id: sellerId!,
                username: profile.username,
                avatar_url: profile.avatar_url,
              }
            : null
        }
      />
    </div>
  );
};

/* ─── Sub-components ──────────────────────────────────────────── */

const StatItem = ({ value, label }: { value: number; label: string }) => (
  <div className="text-center">
    <p className="text-lg font-semibold text-foreground">{value.toLocaleString()}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

const ListingGridItem = ({ listing, onPress }: { listing: ListingWithItem; onPress: () => void }) => {
  const rarityClass = listing.rarity_tier ? RARITY_COLORS[listing.rarity_tier] || RARITY_COLORS["Common"] : null;

  return (
    <button onClick={onPress} className="relative aspect-square overflow-hidden bg-card group">
      <img
        src={listing.image_url}
        alt={listing.title}
        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        loading="lazy"
      />
      {/* Rarity badge */}
      {listing.rarity_tier && (
        <span className={`absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${rarityClass}`}>
          {listing.rarity_tier}
        </span>
      )}
      {/* Price overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6">
        <p className="text-xs font-bold text-white">{formatPrice(listing.price, listing.currency)}</p>
      </div>
    </button>
  );
};

const RankingListItem = ({
  listing,
  rank,
  onPress,
}: {
  listing: ListingWithItem;
  rank: number;
  onPress: () => void;
}) => {
  const rarityClass = listing.rarity_tier ? RARITY_COLORS[listing.rarity_tier] || RARITY_COLORS["Common"] : null;

  return (
    <button onClick={onPress} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-accent/50 transition-colors text-left">
      <span className="text-lg font-bold text-muted-foreground w-7 text-center shrink-0">
        {rank}
      </span>
      <div className="h-14 w-14 rounded-lg overflow-hidden bg-muted shrink-0">
        <img src={listing.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{listing.title}</p>
        {listing.real_car_brand && (
          <p className="text-xs text-muted-foreground truncate">
            {listing.real_car_brand} {listing.real_car_model}
          </p>
        )}
        {listing.rarity_tier && (
          <span className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${rarityClass}`}>
            {listing.rarity_tier}
          </span>
        )}
      </div>
      <p className="text-sm font-bold text-primary shrink-0">
        {formatPrice(listing.price, listing.currency)}
      </p>
    </button>
  );
};

export default SellerStorefront;
