import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Trash2, ImagePlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface EditListingSheetProps {
  listing: {
    id: string;
    title: string;
    price: number;
    currency: string;
    image_url: string;
    description?: string;
    status: string;
    source_name: string;
    created_at: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const EditListingSheet = ({ listing, open, onOpenChange, onSaved }: EditListingSheetProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (listing) {
      setTitle(listing.title);
      setPrice(String(listing.price));
      setDescription(listing.description || "");
      setImageUrl(listing.image_url);
    }
  }, [listing]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("collection-images")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("collection-images")
        .getPublicUrl(path);

      setImageUrl(urlData.publicUrl);
      toast({ title: "Imagem atualizada!" });
    } catch (err) {
      toast({ title: "Erro ao enviar imagem", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!listing) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("listings")
        .update({
          title,
          price: parseFloat(price),
          description: description || null,
          image_url: imageUrl,
        })
        .eq("id", listing.id);

      if (error) throw error;

      toast({ title: "Anúncio atualizado com sucesso!" });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!listing) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("listings")
        .delete()
        .eq("id", listing.id);

      if (error) throw error;

      toast({ title: "Anúncio removido" });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Erro ao remover", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  if (!listing) return null;

  const isSold = listing.status === "sold";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Editar Anúncio
            <Badge
              variant="secondary"
              className={isSold ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-500"}
            >
              {isSold ? "Vendido" : "Ativo"}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {/* Image */}
          <div className="space-y-2">
            <Label>Imagem</Label>
            <div className="relative group">
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-48 object-cover rounded-lg border border-border"
              />
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg cursor-pointer">
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                  <ImagePlus className="h-6 w-6 text-white" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">Título</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="edit-price">Preço ({listing.currency})</Label>
            <Input
              id="edit-price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-desc">Descrição</Label>
            <Textarea
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Detalhes adicionais sobre o item..."
            />
          </div>

          {/* Meta info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Fonte: {listing.source_name}</p>
            <p>Criado em: {new Date(listing.created_at).toLocaleDateString("pt-BR")}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving || !title || !price} className="flex-1 gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
            {!isSold && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
                className="gap-2"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Remover
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
