import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Calendar } from "lucide-react";
import { CollectibleDetailCard, CollectibleDetailItem } from "@/components/collection/CollectibleDetailCard";
import { CollectionFilters, CollectionSortOption } from "./CollectionFilters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Component for group icons (brand/manufacturer initials, country flags, year)
const GroupIcon = ({ 
  type, 
  value, 
  label 
}: { 
  type: "brand" | "manufacturer" | "country" | "year"; 
  value: string; 
  label: string;
}) => {
  if (type === "country" && value) {
    // Use flag CDN for country flags
    return (
      <img 
        src={`https://flagcdn.com/w40/${value}.png`}
        alt={label}
        className="w-7 h-5 object-cover rounded-sm shadow-sm"
        onError={(e) => {
          // Fallback to initials if flag doesn't load
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling?.classList.remove('hidden');
        }}
      />
    );
  }
  
  if (type === "year") {
    return (
      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
        <Calendar className="w-4 h-4 text-primary" />
      </div>
    );
  }
  
  // Brand or manufacturer - show colored initials
  const initials = label
    .split(" ")
    .map(word => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
    
  return (
    <div 
      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm"
      style={{ backgroundColor: value }}
    >
      {initials}
    </div>
  );
};

interface CollectionListProps {
  items: CollectibleDetailItem[];
  onItemDeleted?: () => void;
}

// Country ISO codes and labels
const countryData: Record<string, { code: string; label: string }> = {
  "Japan": { code: "jp", label: "Japão" },
  "Japão": { code: "jp", label: "Japão" },
  "USA": { code: "us", label: "EUA" },
  "EUA": { code: "us", label: "EUA" },
  "United States": { code: "us", label: "EUA" },
  "Germany": { code: "de", label: "Alemanha" },
  "Alemanha": { code: "de", label: "Alemanha" },
  "Italy": { code: "it", label: "Itália" },
  "Itália": { code: "it", label: "Itália" },
  "UK": { code: "gb", label: "Reino Unido" },
  "United Kingdom": { code: "gb", label: "Reino Unido" },
  "Reino Unido": { code: "gb", label: "Reino Unido" },
  "France": { code: "fr", label: "França" },
  "França": { code: "fr", label: "França" },
  "Brazil": { code: "br", label: "Brasil" },
  "Brasil": { code: "br", label: "Brasil" },
  "China": { code: "cn", label: "China" },
  "Malaysia": { code: "my", label: "Malásia" },
  "Malásia": { code: "my", label: "Malásia" },
  "Thailand": { code: "th", label: "Tailândia" },
  "Tailândia": { code: "th", label: "Tailândia" },
  "South Korea": { code: "kr", label: "Coreia do Sul" },
  "Coreia do Sul": { code: "kr", label: "Coreia do Sul" },
  "Sweden": { code: "se", label: "Suécia" },
  "Suécia": { code: "se", label: "Suécia" },
  "Spain": { code: "es", label: "Espanha" },
  "Espanha": { code: "es", label: "Espanha" },
};

// Manufacturer brand colors
const manufacturerColors: Record<string, string> = {
  "Hot Wheels": "#cc0000",
  "Matchbox": "#00875a",
  "Tomica": "#e31837",
  "Majorette": "#0055a4",
  "Maisto": "#1a1a1a",
  "Bburago": "#ffd700",
  "Jada Toys": "#7b2d8e",
  "Auto World": "#1e4d2b",
  "Greenlight": "#2d8b2d",
  "M2 Machines": "#333333",
  "Johnny Lightning": "#f5a623",
  "Racing Champions": "#d32f2f",
  "Kyosho": "#000080",
  "Minichamps": "#4a4a4a",
  "AUTOart": "#8b0000",
  "Norev": "#003366",
  "Schuco": "#cc6600",
  "Welly": "#ff6600",
  "Siku": "#ff0000",
};

// Car brand colors
const carBrandColors: Record<string, string> = {
  "BMW": "#0066b1",
  "Mercedes-Benz": "#00adef",
  "Mercedes": "#00adef",
  "Audi": "#bb0a30",
  "Volkswagen": "#001e50",
  "Porsche": "#c00",
  "Ferrari": "#dc0000",
  "Lamborghini": "#ddb321",
  "Ford": "#003478",
  "Chevrolet": "#d1a227",
  "Toyota": "#eb0a1e",
  "Honda": "#cc0000",
  "Nissan": "#c3002f",
  "Mazda": "#101010",
  "Subaru": "#003399",
  "Mitsubishi": "#e60012",
  "Dodge": "#ba0c2f",
  "Jeep": "#1d4d1d",
  "Tesla": "#cc0000",
  "Aston Martin": "#006940",
  "McLaren": "#ff8700",
  "Bugatti": "#be0030",
  "Rolls-Royce": "#680021",
  "Bentley": "#333333",
  "Jaguar": "#1a472a",
  "Land Rover": "#005a2b",
  "Mini": "#000000",
  "Fiat": "#8b0000",
  "Alfa Romeo": "#981e32",
  "Maserati": "#0c2340",
  "Volvo": "#003057",
  "Saab": "#003366",
  "Koenigsegg": "#000000",
  "Pagani": "#1c1c1c",
};

interface GroupedItems {
  key: string;
  label: string;
  iconType: "brand" | "manufacturer" | "country" | "year";
  iconValue: string; // color for brand/manufacturer, country code for country, year string for year
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
      let iconType: "brand" | "manufacturer" | "country" | "year";
      let iconValue = "";
      let label = key;
      
      if (sortOption === "brand") {
        iconType = "brand";
        iconValue = carBrandColors[key] || "#666666";
      } else if (sortOption === "manufacturer") {
        iconType = "manufacturer";
        iconValue = manufacturerColors[key] || "#666666";
      } else if (sortOption === "year") {
        iconType = "year";
        iconValue = key;
      } else {
        iconType = "country";
        const country = countryData[key];
        if (country) {
          iconValue = country.code;
          label = country.label;
        } else {
          iconValue = "";
        }
      }
      
      return {
        key,
        label,
        iconType,
        iconValue,
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
                <GroupIcon 
                  type={group.iconType} 
                  value={group.iconValue} 
                  label={group.label} 
                />
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
