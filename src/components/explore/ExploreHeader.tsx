import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export const ExploreHeader = () => {
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-secondary" />
        <Input 
          placeholder="Search collectibles..."
          className="pl-10 bg-muted border-0 text-foreground placeholder:text-foreground-secondary focus-visible:ring-1 focus-visible:ring-primary"
        />
      </div>
    </header>
  );
};
