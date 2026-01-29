import { useState } from "react";
import { IndexCard } from "./IndexCard";
import { IndexBreakdown } from "./IndexBreakdown";
import { PriceIndexBreakdown } from "@/lib/priceIndex";
import { Loader2 } from "lucide-react";
import { CollectionItemWithIndex } from "@/lib/database";

interface IndexRankingProps {
  items: CollectionItemWithIndex[];
  loading: boolean;
}

export const IndexRanking = ({ items, loading }: IndexRankingProps) => {
  const [selectedItem, setSelectedItem] = useState<CollectionItemWithIndex | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  // Filter items that have a price index and sort by score
  const rankedItems = items
    .filter((item) => item.item?.price_index != null)
    .sort((a, b) => (b.item?.price_index || 0) - (a.item?.price_index || 0));

  const handleItemClick = (item: CollectionItemWithIndex) => {
    setSelectedItem(item);
    setBreakdownOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (rankedItems.length === 0) {
    return (
      <div className="p-8 text-center text-foreground-secondary">
        <p>Nenhum item com índice</p>
        <p className="text-sm mt-1">
          Escaneie colecionáveis para calcular o índice de valor
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 space-y-3">
        {rankedItems.map((item, index) => (
          <IndexCard
            key={item.id}
            rank={index + 1}
            image={
              item.image_url ||
              "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=100&h=100&fit=crop"
            }
            brand={item.item?.real_car_brand || ""}
            model={item.item?.real_car_model || ""}
            manufacturer={item.item?.collectible_manufacturer || ""}
            series={item.item?.collectible_series || undefined}
            score={item.item?.price_index || 0}
            tier={item.item?.rarity_tier || "common"}
            onClick={() => handleItemClick(item)}
          />
        ))}
      </div>

      {selectedItem?.item?.index_breakdown && (
        <IndexBreakdown
          open={breakdownOpen}
          onOpenChange={setBreakdownOpen}
          score={selectedItem.item.price_index || 0}
          tier={selectedItem.item.rarity_tier || "common"}
          breakdown={selectedItem.item.index_breakdown}
        />
      )}
    </>
  );
};
