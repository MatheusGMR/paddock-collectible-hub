import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, ImagePlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface NewListingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  storeName?: string | null;
}

export const NewListingSheet = ({ open, onOpenChange, onCreated, storeName }: NewListingSheetProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle("");
    setPrice("");
    setDescription("");
    setImageUrl("");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("collection-images")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("collection-images").getPublicUrl(path);
      setImageUrl(urlData.publicUrl);
      toast({ title: "Foto adicionada!" });
    } catch {
      toast({ title: "Erro ao enviar imagem", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleCreate = async () => {
    if (!user) {
      toast({ title: "Faça login para anunciar", variant: "destructive" });
      return;
    }
    const parsedPrice = parseFloat(price.replace(",", "."));
    if (!title.trim() || !imageUrl || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      toast({ title: "Preencha foto, título e preço válido", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("listings").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        price: parsedPrice,
        currency: "BRL",
        image_url: imageUrl,
        source: "paddock",
        source_name: storeName || "Paddock",
        source_country: "BR",
        status: "active",
      });

      if (error) throw error;

      toast({ title: "Anúncio publicado!" });
      reset();
      onCreated();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Erro ao publicar anúncio",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Novo Anúncio</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          <div className="space-y-2">
            <Label>Foto do colecionável</Label>
            <label className="relative flex h-48 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/30">
              {imageUrl ? (
                <img src={imageUrl} alt={title || "Novo anúncio"} className="h-full w-full object-contain" />
              ) : uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <span className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                  <ImagePlus className="h-6 w-6" />
                  Adicionar foto
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading || saving}
              />
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-title">Título</Label>
            <Input
              id="new-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Hot Wheels Porsche 911 GT3 1/64"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-price">Preço (BRL)</Label>
            <Input
              id="new-price"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-desc">Descrição</Label>
            <Textarea
              id="new-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Estado, série, embalagem..."
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={saving || uploading || !title || !price || !imageUrl}
            className="w-full gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Publicar anúncio
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
