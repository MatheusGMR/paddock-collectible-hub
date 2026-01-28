interface ExploreGridProps {
  items: Array<{
    id: string;
    image: string;
    price?: string;
  }>;
}

export const ExploreGrid = ({ items }: ExploreGridProps) => {
  return (
    <div className="grid grid-cols-2 gap-0.5">
      {items.map((item, index) => {
        // Create varying heights for visual interest
        const isLarge = index % 5 === 0;
        
        return (
          <button 
            key={item.id}
            className={`relative bg-muted overflow-hidden hover:opacity-90 transition-opacity ${
              isLarge ? "col-span-2 aspect-video" : "aspect-square"
            }`}
          >
            <img 
              src={item.image} 
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {item.price && (
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-background/80 backdrop-blur-sm rounded-md">
                <span className="text-xs font-semibold text-foreground">{item.price}</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
