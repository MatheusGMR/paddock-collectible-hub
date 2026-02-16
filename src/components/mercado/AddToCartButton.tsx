import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AddToCartButtonProps {
  listingId: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
  showLabel?: boolean;
}

export const AddToCartButton = ({
  listingId,
  size = "default",
  variant = "outline",
  className,
  showLabel = true,
}: AddToCartButtonProps) => {
  const { addItem, isInCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const inCart = isInCart(listingId);

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inCart) return;
    setIsAdding(true);
    await addItem(listingId);
    setIsAdding(false);
  };

  return (
    <Button
      variant={inCart ? "secondary" : variant}
      size={size}
      className={cn("gap-2", className)}
      onClick={handleAdd}
      disabled={isAdding || inCart}
    >
      {isAdding ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : inCart ? (
        <Check className="h-4 w-4" />
      ) : (
        <ShoppingCart className="h-4 w-4" />
      )}
      {showLabel && (inCart ? "No carrinho" : "Adicionar")}
    </Button>
  );
};
