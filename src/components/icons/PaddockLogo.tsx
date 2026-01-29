import paddockIcon from "@/assets/paddock-logo.png";
import paddockWordmark from "@/assets/paddock-wordmark.png";

interface PaddockLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  variant?: "icon" | "wordmark";
}

export const PaddockLogo = ({ 
  className = "", 
  size = 40, 
  showText = false,
  variant = "icon"
}: PaddockLogoProps) => {
  // If showText is true or variant is wordmark, show the full wordmark
  if (showText || variant === "wordmark") {
    return (
      <img
        src={paddockWordmark}
        alt="Paddock"
        className={className}
        style={{ 
          height: size,
          width: "auto",
          objectFit: "contain"
        }}
      />
    );
  }

  // Default: show icon only
  return (
    <img
      src={paddockIcon}
      alt="Paddock"
      className={className}
      style={{ 
        width: size, 
        height: size,
        objectFit: "contain"
      }}
    />
  );
};
