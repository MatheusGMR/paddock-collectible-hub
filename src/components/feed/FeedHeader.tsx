import { PaddockLogo } from "@/components/icons/PaddockLogo";
import { MessageCircle } from "lucide-react";

export const FeedHeader = () => {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur-lg px-4">
      <PaddockLogo variant="wordmark" size={30} />
      <button className="p-2 text-foreground hover:text-primary transition-colors">
        <MessageCircle className="h-6 w-6" />
      </button>
    </header>
  );
};
