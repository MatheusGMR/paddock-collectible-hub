import { ChevronRight } from "lucide-react";

interface CollectionListProps {
  items: Array<{
    id: string;
    brand: string;
    model: string;
    year: string;
    scale: string;
    image: string;
  }>;
}

export const CollectionList = ({ items }: CollectionListProps) => {
  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <button 
          key={item.id}
          className="collection-item w-full hover:bg-muted/50 transition-colors"
        >
          {/* Thumbnail */}
          <div className="h-14 w-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
            <img 
              src={item.image} 
              alt={item.model}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Info */}
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-foreground">
              {item.brand} {item.model}
            </p>
            <p className="text-xs text-foreground-secondary">
              {item.year} • {item.scale}
            </p>
          </div>
          
          {/* Arrow */}
          <ChevronRight className="h-5 w-5 text-foreground-secondary" />
        </button>
      ))}
    </div>
  );
};
