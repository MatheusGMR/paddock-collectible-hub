interface PaddockLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const PaddockLogo = ({ className = "", size = 40, showText = false }: PaddockLogoProps) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Stylized P Symbol */}
      <div 
        className="relative flex items-center justify-center rounded-icon bg-gradient-to-br from-primary to-secondary"
        style={{ width: size, height: size }}
      >
        <span 
          className="font-semibold text-primary-foreground"
          style={{ fontSize: size * 0.5 }}
        >
          P
        </span>
      </div>
      
      {showText && (
        <span className="text-xl font-semibold tracking-tight text-foreground">
          PADDOCK
        </span>
      )}
    </div>
  );
};
