import { useState, useEffect } from "react";
import { Newspaper, Users, Car, Gamepad2, Flag } from "lucide-react";

export type FeedFilter = "all" | "posts_only" | "collectibles" | "motorsport" | "cars";

interface FeedContentFilterProps {
  value: FeedFilter;
  onChange: (filter: FeedFilter) => void;
}

const filters: { key: FeedFilter; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "Tudo", icon: <Newspaper className="h-3.5 w-3.5" /> },
  { key: "posts_only", label: "Só Posts", icon: <Users className="h-3.5 w-3.5" /> },
  { key: "collectibles", label: "Colecionáveis", icon: <Gamepad2 className="h-3.5 w-3.5" /> },
  { key: "motorsport", label: "Motorsport", icon: <Flag className="h-3.5 w-3.5" /> },
  { key: "cars", label: "Carros", icon: <Car className="h-3.5 w-3.5" /> },
];

export const FeedContentFilter = ({ value, onChange }: FeedContentFilterProps) => {
  return (
    <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
      {filters.map((f) => {
        const isActive = value === f.key;
        return (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {f.icon}
            {f.label}
          </button>
        );
      })}
    </div>
  );
};
