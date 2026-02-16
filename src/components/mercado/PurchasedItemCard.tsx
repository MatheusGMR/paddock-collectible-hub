import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Send, Check, Loader2, Star, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

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
      initial={{ rotateY: 180, opacity: 0, scale: 0.8 }}
      animate={
        isRevealed
          ? { rotateY: 0, opacity: 1, scale: 1 }
          : { rotateY: 180, opacity: 0, scale: 0.8 }
      }
      transition={{
        duration: 0.7,
        delay: index * 0.25,
        type: "spring",
        stiffness: 100,
        damping: 15,
      }}
      style={{ perspective: 1000 }}
      className="w-full"
    >
      <div
        className={cn(
          "rounded-2xl border-2 bg-gradient-to-b overflow-hidden",
          gradient
        )}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover"
          />
          {/* Rarity badge */}
          {item.items?.rarity_tier && (
            <Badge
              variant="outline"
              className={cn(
                "absolute top-3 left-3",
                rarityColors[rarity] || rarityColors.common
              )}
            >
              <Star className="h-3 w-3 mr-1" />
              {t.index?.tiers?.[rarity as keyof typeof t.index.tiers] || rarity}
            </Badge>
          )}
          {/* Price index */}
          {item.items?.price_index != null && (
            <div className="absolute top-3 right-3 bg-background/80 backdrop-blur rounded-full px-3 py-1">
              <span className="text-xs font-bold text-primary">
                #{item.items.price_index}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-bold text-foreground text-lg leading-tight line-clamp-2">
              {item.title}
            </h3>
            {item.items && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm text-muted-foreground">
                  {item.items.real_car_brand} {item.items.real_car_model}
                </span>
                {item.items.real_car_year && (
                  <span className="text-xs text-muted-foreground">
                    ({item.items.real_car_year})
                  </span>
                )}
                {item.items.collectible_scale && (
                  <Badge variant="secondary" className="text-[10px]">
                    {item.items.collectible_scale}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleAdd}
              disabled={added || isAdding || isPublishing}
              variant={added ? "secondary" : "default"}
              className="flex-1 gap-2"
              size="sm"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : added ? (
                <Check className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {added
                ? (t.scanner?.addedToCollection || "Adicionado!")
                : (t.scanner?.addToCollection || "Coleção")}
            </Button>
            <Button
              onClick={handleAddAndPublish}
              disabled={added || isPublishing || isAdding}
              variant="outline"
              className="flex-1 gap-2"
              size="sm"
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Adicionar e Publicar
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
