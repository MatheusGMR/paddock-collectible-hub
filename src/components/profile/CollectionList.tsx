import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { CollectibleDetailCard, CollectibleDetailItem } from "@/components/collection/CollectibleDetailCard";

interface CollectionListProps {
  items: CollectibleDetailItem[];
}

export const CollectionList = ({ items }: CollectionListProps) => {
  const [selectedItem, setSelectedItem] = useState<CollectibleDetailItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleItemClick = (item: CollectibleDetailItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  return (
    <>
      <div className="divide-y divide-border">
        {items.map((item) => (
          <button 
            key={item.id}
            onClick={() => handleItemClick(item)}
            className="collection-item w-full hover:bg-muted/50 transition-colors flex items-center gap-3 p-3"
          >
            {/* Thumbnail */}
            <div className="h-14 w-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
              <img 
                src={item.image_url || "/placeholder.svg"} 
                alt={item.item?.real_car_model || "Item"}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Info */}
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">
                {item.item?.real_car_brand} {item.item?.real_car_model}
              </p>
              <p className="text-xs text-foreground-secondary">
                {item.item?.real_car_year} • {item.item?.collectible_scale}
              </p>
            </div>
            
            {/* Arrow */}
            <ChevronRight className="h-5 w-5 text-foreground-secondary" />
          </button>
        ))}
      </div>

      <CollectibleDetailCard
        item={selectedItem}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </>
  );
};
