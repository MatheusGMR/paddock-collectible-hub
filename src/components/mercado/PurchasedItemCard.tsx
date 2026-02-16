import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Send, Check, Loader2, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import paddockLogo from "@/assets/paddock-logo.png";

interface PurchasedItem {
  id: string;
  title: string;
  image_url: string;
  price: number;
  currency: string;
  source_name: string;
  item_id: string | null;
  items?: {
    real_car_brand: string;
    real_car_model: string;
    real_car_year: string | null;
    collectible_manufacturer: string | null;
    collectible_scale: string | null;
    rarity_tier: string | null;
    price_index: number | null;
    [key: string]: any;
  } | null;
}

interface PurchasedItemCardProps {
  item: PurchasedItem;
  index: number;
  onAddToCollection: (item: PurchasedItem) => Promise<void>;
  onAddAndPublish: (item: PurchasedItem) => Promise<void>;
  isRevealed: boolean;
}

const rarityGradients: Record<string, string> = {
  legendary: "from-amber-500/30 to-amber-900/20 border-amber-500/50",
  epic: "from-purple-500/30 to-purple-900/20 border-purple-500/50",
  rare: "from-blue-500/30 to-blue-900/20 border-blue-500/50",
  uncommon: "from-emerald-500/30 to-emerald-900/20 border-emerald-500/50",
  common: "from-muted/50 to-muted/20 border-border",
};

const rarityColors: Record<string, string> = {
  legendary: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  epic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  rare: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  uncommon: "bg-green-500/20 text-green-400 border-green-500/30",
  common: "bg-muted text-muted-foreground border-border",
};

const rarityGlow: Record<string, string> = {
  legendary: "shadow-[0_0_40px_rgba(245,158,11,0.4)]",
  epic: "shadow-[0_0_40px_rgba(168,85,247,0.4)]",
  rare: "shadow-[0_0_40px_rgba(59,130,246,0.4)]",
  uncommon: "shadow-[0_0_40px_rgba(16,185,129,0.3)]",
  common: "",
};

const backGradients: Record<string, string> = {
  legendary: "from-amber-900 via-amber-800 to-yellow-900",
  epic: "from-purple-900 via-purple-800 to-indigo-900",
  rare: "from-blue-900 via-blue-800 to-cyan-900",
  uncommon: "from-emerald-900 via-emerald-800 to-teal-900",
  common: "from-zinc-800 via-zinc-700 to-zinc-800",
};

export function PurchasedItemCard({
  item,
  index,
  onAddToCollection,
  onAddAndPublish,
  isRevealed,
}: PurchasedItemCardProps) {
  const { t } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [added, setAdded] = useState(false);

  const rarity = item.items?.rarity_tier || "common";
  const gradient = rarityGradients[rarity] || rarityGradients.common;
  const glow = rarityGlow[rarity] || "";
  const backGrad = backGradients[rarity] || backGradients.common;

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      await onAddToCollection(item);
      setAdded(true);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddAndPublish = async () => {
    setIsPublishing(true);
    try {
      await onAddAndPublish(item);
      setAdded(true);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.15 }}
      className="w-full"
      style={{ perspective: 1200 }}
    >
      <motion.div
        className="relative w-full"
        style={{ transformStyle: "preserve-3d" }}
        initial={{ rotateY: 180 }}
        animate={{ rotateY: isRevealed ? 0 : 180 }}
        transition={{
          duration: 0.9,
          delay: index * 0.3,
          type: "spring",
          stiffness: 80,
          damping: 14,
        }}
      >
        {/* Front face - revealed item */}
        <div
          style={{ backfaceVisibility: "hidden" }}
          className={cn("rounded-2xl border-2 bg-gradient-to-b overflow-hidden transition-shadow duration-700", gradient, isRevealed && glow)}
        >
          {/* Sparkle burst on reveal */}
          {isRevealed && rarity !== "common" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 2] }}
              transition={{ duration: 1.2, delay: index * 0.3 + 0.6 }}
              className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center"
            >
              <Sparkles className="h-16 w-16 text-primary opacity-60" />
            </motion.div>
          )}

          {/* Image */}
          <div className="relative aspect-[4/3] overflow-hidden">
            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
            {item.items?.rarity_tier && (
              <Badge
                variant="outline"
                className={cn("absolute top-3 left-3", rarityColors[rarity] || rarityColors.common)}
              >
                <Star className="h-3 w-3 mr-1" />
                {t.index?.tiers?.[rarity as keyof typeof t.index.tiers] || rarity}
              </Badge>
            )}
            {item.items?.price_index != null && (
              <div className="absolute top-3 right-3 bg-background/80 backdrop-blur rounded-full px-3 py-1">
                <span className="text-xs font-bold text-primary">#{item.items.price_index}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4 space-y-3">
            <div>
              <h3 className="font-bold text-foreground text-lg leading-tight line-clamp-2">{item.title}</h3>
              {item.items && (
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-sm text-muted-foreground">
                    {item.items.real_car_brand} {item.items.real_car_model}
                  </span>
                  {item.items.real_car_year && (
                    <span className="text-xs text-muted-foreground">({item.items.real_car_year})</span>
                  )}
                  {item.items.collectible_scale && (
                    <Badge variant="secondary" className="text-[10px]">{item.items.collectible_scale}</Badge>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={added || isAdding || isPublishing} variant={added ? "secondary" : "default"} className="flex-1 gap-2" size="sm">
                {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {added ? (t.scanner?.addedToCollection || "Adicionado!") : (t.scanner?.addToCollection || "Coleção")}
              </Button>
              <Button onClick={handleAddAndPublish} disabled={added || isPublishing || isAdding} variant="outline" className="flex-1 gap-2" size="sm">
                {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Adicionar e Publicar
              </Button>
            </div>
          </div>
        </div>

        {/* Back face - mystery card */}
        <div
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          className={cn(
            "absolute inset-0 rounded-2xl border-2 border-primary/30 bg-gradient-to-br overflow-hidden flex flex-col items-center justify-center",
            backGrad
          )}
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 40px)",
            }} />
          </div>
          <motion.div
            animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="relative z-10 flex flex-col items-center gap-4"
          >
            <img src={paddockLogo} alt="Paddock" className="h-16 w-16 opacity-80" />
            <span className="text-white/60 font-bold text-lg tracking-widest uppercase">
              Toque para revelar
            </span>
            <Sparkles className="h-6 w-6 text-primary/60" />
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
