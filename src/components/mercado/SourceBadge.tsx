import { getSourceByCode } from "@/data/marketplaceSources";
import { cn } from "@/lib/utils";

interface SourceBadgeProps {
  source: string;
  showName?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export const SourceBadge = ({ 
  source, 
  showName = false, 
  size = "sm",
  className 
}: SourceBadgeProps) => {
  const sourceData = getSourceByCode(source);
  
  if (!sourceData) return null;

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
  };

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-background/80 backdrop-blur-sm font-medium",
        sizeClasses[size],
        className
      )}
    >
      <span>{sourceData.flag}</span>
      {showName && <span className="text-foreground-secondary">{sourceData.name}</span>}
    </div>
  );
};
