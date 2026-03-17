import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Store,
  MapPin,
  MessageCircle,
  Share2,
  ShoppingBag,
  Loader2,
  ArrowLeft,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/data/marketplaceSources";
import paddockWordmark from "@/assets/paddock-wordmark-new.png";
import paddockLogo from "@/assets/paddock-logo.png";

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
}

const SellerStorefront = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [sellerInfo, setSellerInfo] = useState<SellerInfo | null>(null);
  const [listings, setListings] = useState<StoreListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "price_asc" | "price_desc">("recent");

  const loadStoreData = useCallback(async () => {
    if (!sellerId) return;
    setLoading(true);

    try {
      const [profileRes, detailsRes, listingsRes] = await Promise.all([
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
          .select("id, title, price, currency, image_url, description, created_at")
          .eq("user_id", sellerId)
          .eq("status", "active")
          .order("created_at", { ascending: false }),
      ]);

      if (profileRes.data && profileRes.data.is_seller) {
        setProfile(profileRes.data);
      }
      setSellerInfo(detailsRes.data as SellerInfo | null);
      setListings((listingsRes.data as StoreListing[]) || []);
    } catch (error) {
      console.error("Error loading store:", error);
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    loadStoreData();
  }, [loadStoreData]);

  const filteredListings = listings
    .filter((l) =>
      searchQuery ? l.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
    )
    .sort((a, b) => {
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const storeName = sellerInfo?.business_name || profile?.username || "Loja";
  const storeLocation = sellerInfo?.address_city
    ? `${sellerInfo.address_city}${sellerInfo.address_state ? `, ${sellerInfo.address_state}` : ""}`
    : profile?.city;

  const handleShare = () => {
    const url = window.location.href;
    const text = [
      `🏁 *${storeName}* na Paddock`,
      ``,
      `Miniaturas exclusivas e colecionáveis selecionados.`,
      ``,
      `🔍 Veja o catálogo: ${url}`,
    ].join("\n");
    if (navigator.share) {
      navigator.share({ title: storeName, text, url });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  const handleContactSeller = () => {
    if (sellerInfo?.phone) {
      const msg = encodeURIComponent(`Olá! Vi sua loja na Paddock e gostaria de saber mais.`);
      window.open(`https://wa.me/${sellerInfo.phone.replace(/\D/g, "")}?text=${msg}`, "_blank");
    }
  };

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
    <div className="min-h-screen bg-background">
      {/* Top Nav Bar */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14 sm:px-6">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 sm:hidden">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <img src={paddockWordmark} alt="Paddock" className="h-5 opacity-80" />
          <Button variant="ghost" size="icon" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative overflow-hidden">
        {/* Gradient background with glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-background to-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/5 blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <Avatar className="h-24 w-24 sm:h-28 sm:w-28 ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
                <AvatarImage src={profile.avatar_url || ""} alt={storeName} />
                <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                  {storeName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </motion.div>

            {/* Store Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1 text-center sm:text-left"
            >
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{storeName}</h1>
              <p className="text-sm text-muted-foreground mt-1">@{profile.username}</p>
              {storeLocation && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1 justify-center sm:justify-start">
                  <MapPin className="h-3.5 w-3.5" /> {storeLocation}
                </p>
              )}
              {profile.bio && (
                <p className="text-sm text-foreground/80 mt-3 max-w-md">{profile.bio}</p>
              )}
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex gap-2 shrink-0"
            >
              {sellerInfo?.phone && (
                <Button onClick={handleContactSeller} className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Contato
                </Button>
              )}
              <Button variant="outline" onClick={handleShare} className="gap-2">
                <Share2 className="h-4 w-4" />
                Compartilhar
              </Button>
            </motion.div>
          </div>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center sm:justify-start gap-6 mt-6 pt-6 border-t border-border"
          >
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">{listings.length}</p>
              <p className="text-xs text-muted-foreground">Anúncios</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Search & Filter Bar */}
      <section className="sticky top-14 z-30 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nesta loja..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>
          <div className="flex gap-1.5">
            {(["recent", "price_asc", "price_desc"] as const).map((sort) => {
              const labels = { recent: "Recentes", price_asc: "Menor preço", price_desc: "Maior preço" };
              return (
                <Badge
                  key={sort}
                  variant={sortBy === sort ? "default" : "outline"}
                  className="cursor-pointer whitespace-nowrap text-xs py-1 px-2.5"
                  onClick={() => setSortBy(sort)}
                >
                  {labels[sort]}
                </Badge>
              );
            })}
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {filteredListings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/40" />
            <p className="text-muted-foreground text-center">
              {searchQuery
                ? "Nenhum produto encontrado para essa busca."
                : "Esta loja ainda não possui anúncios."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredListings.map((listing, i) => (
              <motion.button
                key={listing.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3 }}
                onClick={() => navigate(`/listing/${listing.id}`)}
                className="group relative w-full overflow-hidden rounded-xl bg-card border border-border transition-all duration-200 hover:border-primary/30 active:scale-[0.98] text-left"
              >
                {/* Image */}
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <img
                    src={listing.image_url}
                    alt={listing.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
                    <p className="text-lg font-bold text-white">
                      {formatPrice(listing.price, listing.currency)}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="p-3">
                  <h3 className="font-medium text-foreground line-clamp-2 text-sm leading-tight">
                    {listing.title}
                  </h3>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col items-center gap-4">
          <img src={paddockLogo} alt="Paddock" className="h-8 opacity-40" />
          <p className="text-xs text-muted-foreground text-center">
            Miniaturas, colecionáveis e paixão por carros.
          </p>
          <p className="text-xs text-muted-foreground/50">
            © {new Date().getFullYear()} Paddock
          </p>
        </div>
      </footer>
    </div>
  );
};

export default SellerStorefront;
