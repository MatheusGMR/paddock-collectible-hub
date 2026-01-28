import { ExternalLink } from "lucide-react";
import { SourceBadge } from "./SourceBadge";
import { formatPrice, getSourceByCode } from "@/data/marketplaceSources";
import { cn } from "@/lib/utils";

export interface Listing {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  image_url: string;
  source: string;
  source_name: string;
  source_country: string;
  external_url?: string;
  user_id?: string;
  created_at: string;
}

interface ListingCardProps {
  listing: Listing;
  onClick?: () => void;
}

export const ListingCard = ({ listing, onClick }: ListingCardProps) => {
  const isExternal = !!listing.external_url;
  const sourceData = getSourceByCode(listing.source);

  const handleClick = () => {
    if (isExternal && listing.external_url) {
      window.open(listing.external_url, '_blank', 'noopener,noreferrer');
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-xl bg-card border border-border",
        "transition-all duration-200 hover:shadow-lg hover:border-primary/30",
        "active:scale-[0.98]"
      )}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={listing.image_url}
          alt={listing.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Country Badge */}
        <div className="absolute top-2 right-2">
          <SourceBadge source={listing.source} size="sm" />
        </div>

        {/* External Link Indicator */}
        {isExternal && (
          <div className="absolute top-2 left-2 rounded-full bg-background/80 backdrop-blur-sm p-1.5">
            <ExternalLink className="h-3 w-3 text-foreground-secondary" />
          </div>
        )}

        {/* Price Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
          <p className="text-lg font-bold text-white">
            {formatPrice(listing.price, listing.currency)}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 text-left">
        <h3 className="font-medium text-foreground line-clamp-2 text-sm leading-tight">
          {listing.title}
        </h3>
        <p className="mt-1 text-xs text-foreground-secondary flex items-center gap-1">
          {sourceData?.flag} {listing.source_name}
        </p>
      </div>
    </button>
  );
};
