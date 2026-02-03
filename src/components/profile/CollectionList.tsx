import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { CollectibleDetailCard, CollectibleDetailItem } from "@/components/collection/CollectibleDetailCard";
import { CollectionFilters, CollectionSortOption } from "./CollectionFilters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CollectionListProps {
  items: CollectibleDetailItem[];
  onItemDeleted?: () => void;
}

// Country flags and labels
const countryData: Record<string, { flag: string; label: string }> = {
  "Japan": { flag: "🇯🇵", label: "Japão" },
  "Japão": { flag: "🇯🇵", label: "Japão" },
  "USA": { flag: "🇺🇸", label: "EUA" },
  "EUA": { flag: "🇺🇸", label: "EUA" },
  "United States": { flag: "🇺🇸", label: "EUA" },
  "Germany": { flag: "🇩🇪", label: "Alemanha" },
  "Alemanha": { flag: "🇩🇪", label: "Alemanha" },
  "Italy": { flag: "🇮🇹", label: "Itália" },
  "Itália": { flag: "🇮🇹", label: "Itália" },
  "UK": { flag: "🇬🇧", label: "Reino Unido" },
  "United Kingdom": { flag: "🇬🇧", label: "Reino Unido" },
  "Reino Unido": { flag: "🇬🇧", label: "Reino Unido" },
  "France": { flag: "🇫🇷", label: "França" },
  "França": { flag: "🇫🇷", label: "França" },
  "Brazil": { flag: "🇧🇷", label: "Brasil" },
  "Brasil": { flag: "🇧🇷", label: "Brasil" },
  "China": { flag: "🇨🇳", label: "China" },
  "Malaysia": { flag: "🇲🇾", label: "Malásia" },
  "Malásia": { flag: "🇲🇾", label: "Malásia" },
  "Thailand": { flag: "🇹🇭", label: "Tailândia" },
  "Tailândia": { flag: "🇹🇭", label: "Tailândia" },
  "South Korea": { flag: "🇰🇷", label: "Coreia do Sul" },
  "Coreia do Sul": { flag: "🇰🇷", label: "Coreia do Sul" },
};

// Manufacturer logos (using emojis as fallback, could be replaced with actual logos)
const manufacturerIcons: Record<string, string> = {
  "Hot Wheels": "🔥",
  "Matchbox": "📦",
  "Tomica": "🎌",
  "Majorette": "🇫🇷",
  "Maisto": "⭐",
  "Bburago": "🏎️",
  "Jada Toys": "🎯",
  "Auto World": "🌍",
  "Greenlight": "💚",
  "M2 Machines": "⚙️",
  "Johnny Lightning": "⚡",
  "Racing Champions": "🏁",
  "Kyosho": "🗾",
  "Minichamps": "🔬",
  "AUTOart": "🎨",
  "Norev": "🇫🇷",
  "Schuco": "🇩🇪",
  "Welly": "🌟",
  "Siku": "🚛",
};

interface GroupedItems {
  key: string;
  label: string;
  icon?: string;
  items: CollectibleDetailItem[];
}

export const CollectionList = ({ items, onItemDeleted }: CollectionListProps) => {
  const [selectedItem, setSelectedItem] = useState<CollectibleDetailItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sortOption, setSortOption] = useState<CollectionSortOption>("brand");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const handleItemClick = (item: CollectibleDetailItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const handleDeleteItem = async (id: string) => {
    const { error } = await supabase
      .from("user_collection")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao remover item da coleção");
      throw error;
    }

    toast.success("Item removido da coleção");
    onItemDeleted?.();
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Process items based on sort option
  const processedData = useMemo(() => {
    if (sortOption === "name") {
      // Sort alphabetically by car name
      return {
        grouped: false,
        items: [...items].sort((a, b) => {
          const nameA = `${a.item?.real_car_brand || ""} ${a.item?.real_car_model || ""}`.toLowerCase();
          const nameB = `${b.item?.real_car_brand || ""} ${b.item?.real_car_model || ""}`.toLowerCase();
          return nameA.localeCompare(nameB, "pt-BR");
        }),
      };
    }

    // Group items
    const groups: Record<string, CollectibleDetailItem[]> = {};
    
    items.forEach(item => {
      let key: string;
      
      if (sortOption === "brand") {
        key = item.item?.real_car_brand || "Outros";
      } else if (sortOption === "manufacturer") {
        key = item.item?.collectible_manufacturer || "Outros";
      } else if (sortOption === "year") {
        key = item.item?.real_car_year || "Sem ano";
      } else {
        // Country - use origin field
        key = item.item?.collectible_origin || "Outros";
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });

    // Convert to array and sort alphabetically
    const groupedArray: GroupedItems[] = Object.entries(groups).map(([key, groupItems]) => {
      let icon: string | undefined;
      let label = key;
      
      if (sortOption === "brand") {
        icon = "🚗";
      } else if (sortOption === "manufacturer") {
        icon = manufacturerIcons[key] || "📦";
      } else if (sortOption === "year") {
        icon = "📅";
      } else {
        const country = countryData[key];
        if (country) {
          icon = country.flag;
          label = country.label;
        } else {
          icon = "🌍";
        }
      }
      
      return {
        key,
        label,
        icon,
        items: groupItems.sort((a, b) => {
          const nameA = `${a.item?.real_car_brand || ""} ${a.item?.real_car_model || ""}`.toLowerCase();
          const nameB = `${b.item?.real_car_brand || ""} ${b.item?.real_car_model || ""}`.toLowerCase();
          return nameA.localeCompare(nameB, "pt-BR");
        }),
      };
    }).sort((a, b) => a.label.localeCompare(b.label, "pt-BR")); // Sort alphabetically A-Z

    return { grouped: true, groups: groupedArray };
  }, [items, sortOption]);

  // Expand all groups initially when switching to grouped view
  useMemo(() => {
    if ('groups' in processedData && processedData.groups) {
      setExpandedGroups(new Set(processedData.groups.map(g => g.key)));
    }
  }, [sortOption]);

  return (
    <>
      <CollectionFilters activeSort={sortOption} onSortChange={setSortOption} />
      
      {processedData.grouped && 'groups' in processedData ? (
        // Grouped view (by manufacturer or country)
        <div className="divide-y divide-border">
          {processedData.groups.map(group => (
            <div key={group.key}>
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center gap-3 p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <span className="text-xl">{group.icon}</span>
                <div className="flex-1 text-left">
                  <span className="font-semibold text-foreground">{group.label}</span>
                  <span className="text-foreground-secondary text-sm ml-2">
                    ({group.items.length})
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-foreground-secondary transition-transform",
                    expandedGroups.has(group.key) && "rotate-180"
                  )}
                />
              </button>
              
              {/* Group items */}
              {expandedGroups.has(group.key) && (
                <div className="divide-y divide-border/50">
                  {group.items.map(item => (
                    <ItemRow key={item.id} item={item} onClick={() => handleItemClick(item)} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // Flat list view (by name)
        <div className="divide-y divide-border">
          {'items' in processedData && processedData.items.map(item => (
            <ItemRow key={item.id} item={item} onClick={() => handleItemClick(item)} />
          ))}
        </div>
      )}

      <CollectibleDetailCard
        item={selectedItem}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onDelete={handleDeleteItem}
      />
    </>
  );
};

// Extracted item row component
const ItemRow = ({ item, onClick }: { item: CollectibleDetailItem; onClick: () => void }) => (
  <button 
    onClick={onClick}
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
    <div className="flex-1 text-left min-w-0">
      <p className="text-sm font-medium text-foreground truncate">
        {item.item?.real_car_brand} {item.item?.real_car_model}
      </p>
      <p className="text-xs text-foreground-secondary truncate">
        {item.item?.real_car_year} • {item.item?.collectible_scale}
      </p>
    </div>
    
    {/* Arrow */}
    <ChevronRight className="h-5 w-5 text-foreground-secondary flex-shrink-0" />
  </button>
);
