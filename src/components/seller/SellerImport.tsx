import { useState, useRef, useCallback } from "react";
import {
  Upload,
  FileSpreadsheet,
  Image as ImageIcon,
  Loader2,
  Check,
  X,
  Pencil,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  AlertCircle,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { uploadCollectionImage } from "@/lib/uploadImage";
import { toast } from "sonner";
import { formatPrice } from "@/data/marketplaceSources";

interface ImportedItem {
  id: string;
  title: string;
  brand: string;
  model: string;
  year?: string;
  manufacturer?: string;
  scale?: string;
  condition?: string;
  color?: string;
  suggestedPrice: number;
  currency: string;
  notes?: string;
  selected: boolean;
  editing: boolean;
  imageBase64?: string;
  imageUrl?: string;
}

type Phase = "upload" | "processing" | "review" | "publishing";

export const SellerImport = () => {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("upload");
  const [items, setItems] = useState<ImportedItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [publishProgress, setPublishProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processContent = useCallback(
    async (type: "csv" | "text" | "image", content: string) => {
      setPhase("processing");
      setProcessing(true);

      try {
        const { data, error } = await supabase.functions.invoke("process-seller-import", {
          body: { type, content },
        });

        if (error) throw error;

        const rawItems = data?.items || [];
        if (rawItems.length === 0) {
          toast.error("Nenhum item identificado no arquivo.");
          setPhase("upload");
          return;
        }

        const mapped: ImportedItem[] = rawItems.map(
          (item: Record<string, unknown>, idx: number) => ({
            id: `import-${Date.now()}-${idx}`,
            title: (item.title as string) || `${item.brand || ""} ${item.model || ""}`.trim() || "Item desconhecido",
            brand: (item.brand as string) || "",
            model: (item.model as string) || "",
            year: (item.year as string) || "",
            manufacturer: (item.manufacturer as string) || "",
            scale: (item.scale as string) || "",
            condition: (item.condition as string) || "",
            color: (item.color as string) || "",
            suggestedPrice: Number(item.suggestedPrice) || 0,
            currency: (item.currency as string) || "BRL",
            notes: (item.notes as string) || "",
            selected: true,
            editing: false,
          })
        );

        setItems(mapped);
        setPhase("review");
        toast.success(`${mapped.length} itens identificados!`);
      } catch (err) {
        console.error("Import error:", err);
        toast.error("Erro ao processar o arquivo. Tente novamente.");
        setPhase("upload");
      } finally {
        setProcessing(false);
      }
    },
    []
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    const isImage = file.type.startsWith("image/");
    const isCsv = ext === "csv" || file.type === "text/csv";
    const isText = ext === "txt" || ext === "tsv";
    const isPdf = ext === "pdf";

    if (isPdf) {
      toast.info("PDFs serão processados como imagem. Aguarde...");
      // For PDFs we ask the user to take a screenshot or use image mode
      // For simplicity, try reading as text first
      try {
        const text = await readFileAsText(file);
        if (text.length > 100) {
          await processContent("text", text);
        } else {
          toast.error("PDF não pôde ser lido como texto. Tente com uma imagem ou CSV.");
          return;
        }
      } catch {
        toast.error("Erro ao ler o PDF. Tente com CSV ou imagem.");
      }
      return;
    }

    if (isImage) {
      const base64 = await readFileAsBase64(file);
      await processContent("image", base64);
      return;
    }

    if (isCsv || isText) {
      const text = await readFileAsText(file);
      await processContent("csv", text);
      return;
    }

    // Try as text
    try {
      const text = await readFileAsText(file);
      if (text.length > 20) {
        await processContent("text", text);
      } else {
        toast.error("Formato não suportado. Use CSV, imagem ou texto.");
      }
    } catch {
      toast.error("Não foi possível ler o arquivo.");
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await readFileAsBase64(file);
    await processContent("image", base64);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i))
    );
  };

  const toggleAll = (selected: boolean) => {
    setItems((prev) => prev.map((i) => ({ ...i, selected })));
  };

  const updateItem = (id: string, field: keyof ImportedItem, value: string | number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  const selectedItems = items.filter((i) => i.selected);

  const publishItems = async () => {
    if (!user || selectedItems.length === 0) return;
    setPhase("publishing");
    setPublishing(true);
    setPublishProgress({ current: 0, total: selectedItems.length });

    let successCount = 0;

    for (let idx = 0; idx < selectedItems.length; idx++) {
      const item = selectedItems[idx];
      setPublishProgress({ current: idx + 1, total: selectedItems.length });

      try {
        // 1. Create item in items table
        const { data: itemData, error: itemError } = await supabase
          .from("items")
          .insert({
            real_car_brand: item.brand || "N/A",
            real_car_model: item.model || "N/A",
            real_car_year: item.year || null,
            collectible_manufacturer: item.manufacturer || null,
            collectible_scale: item.scale || null,
            collectible_condition: item.condition || null,
            collectible_color: item.color || null,
            collectible_notes: item.notes || null,
          })
          .select("id")
          .single();

        if (itemError) {
          console.error("Item insert error:", itemError);
          continue;
        }

        // 2. Use a placeholder image if none provided
        const imageUrl =
          item.imageUrl ||
          `https://placehold.co/400x400/1a1a2e/e0e0e0?text=${encodeURIComponent(
            item.brand && item.model ? `${item.brand} ${item.model}` : item.title.substring(0, 20)
          )}`;

        // 3. Create listing
        const { error: listingError } = await supabase.from("listings").insert({
          user_id: user.id,
          item_id: itemData.id,
          title: item.title,
          description: [
            item.manufacturer && `Fabricante: ${item.manufacturer}`,
            item.scale && `Escala: ${item.scale}`,
            item.condition && `Condição: ${item.condition}`,
            item.color && `Cor: ${item.color}`,
            item.year && `Ano: ${item.year}`,
            item.notes,
          ]
            .filter(Boolean)
            .join("\n"),
          price: item.suggestedPrice,
          currency: item.currency,
          image_url: imageUrl,
          source: "paddock",
          source_name: "Paddock",
          source_country: "BR",
          status: "active",
        });

        if (listingError) {
          console.error("Listing insert error:", listingError);
          continue;
        }

        successCount++;
      } catch (err) {
        console.error("Publish error for item:", item.title, err);
      }
    }

    setPublishing(false);

    if (successCount > 0) {
      toast.success(`${successCount} anúncios publicados com sucesso!`);
      setItems([]);
      setPhase("upload");
    } else {
      toast.error("Nenhum anúncio pôde ser publicado.");
      setPhase("review");
    }
  };

  // ====== UPLOAD PHASE ======
  if (phase === "upload") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Importar Inventário</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Carregue seu estoque via planilha, CSV, imagem ou foto do catálogo
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* CSV/Spreadsheet */}
          <Card
            className="border-border hover:border-primary/40 transition-colors cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <FileSpreadsheet className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Planilha / CSV</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos: .csv, .tsv, .txt
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Image */}
          <Card
            className="border-border hover:border-primary/40 transition-colors cursor-pointer group"
            onClick={() => imageInputRef.current?.click()}
          >
            <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <ImageIcon className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Imagem / Foto</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Foto de catálogo, lista ou etiquetas
                </p>
              </div>
            </CardContent>
          </Card>

          {/* PDF/Text */}
          <Card
            className="border-border hover:border-primary/40 transition-colors cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <FileText className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">PDF / Texto</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Documento com lista de itens
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.txt,.pdf,text/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        <Card className="border-dashed border-2 border-border bg-muted/30">
          <CardContent className="p-8 flex flex-col items-center gap-3 text-center">
            <Upload className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Ou arraste um arquivo aqui
            </p>
            <p className="text-xs text-muted-foreground/70">
              O sistema identifica automaticamente marca, modelo, escala e sugere preços
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ====== PROCESSING PHASE ======
  if (phase === "processing") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="text-center">
          <h2 className="text-lg font-bold text-foreground">Processando inventário...</h2>
          <p className="text-sm text-muted-foreground mt-1">
            A IA está identificando cada item do seu arquivo
          </p>
        </div>
      </div>
    );
  }

  // ====== PUBLISHING PHASE ======
  if (phase === "publishing") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="text-center">
          <h2 className="text-lg font-bold text-foreground">Publicando anúncios...</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {publishProgress.current} de {publishProgress.total} itens
          </p>
          <div className="w-48 h-1.5 bg-muted rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{
                width: `${publishProgress.total > 0 ? (publishProgress.current / publishProgress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ====== REVIEW PHASE ======
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Revisar Itens</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedItems.length} de {items.length} selecionados para publicação
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setItems([]);
              setPhase("upload");
            }}
          >
            <X className="h-4 w-4 mr-1" /> Cancelar
          </Button>
          <Button
            size="sm"
            disabled={selectedItems.length === 0 || publishing}
            onClick={publishItems}
            className="gap-2"
          >
            <ShoppingBag className="h-4 w-4" />
            Publicar {selectedItems.length} {selectedItems.length === 1 ? "anúncio" : "anúncios"}
          </Button>
        </div>
      </div>

      {/* Select All */}
      <div className="flex items-center gap-3 px-1">
        <Checkbox
          checked={items.every((i) => i.selected)}
          onCheckedChange={(v) => toggleAll(!!v)}
        />
        <span className="text-sm text-muted-foreground">Selecionar todos</span>
      </div>

      {/* Items List */}
      <div className="space-y-2">
        <AnimatePresence>
          {items.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
            >
              <Card
                className={`border-border transition-colors ${
                  item.selected ? "bg-card" : "bg-muted/30 opacity-60"
                }`}
              >
                <CardContent className="p-4">
                  {/* Main row */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={item.selected}
                      onCheckedChange={() => toggleItem(item.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        {item.title}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {item.manufacturer && (
                          <Badge variant="outline" className="text-xs">
                            {item.manufacturer}
                          </Badge>
                        )}
                        {item.scale && (
                          <Badge variant="outline" className="text-xs">
                            {item.scale}
                          </Badge>
                        )}
                        {item.color && (
                          <Badge variant="outline" className="text-xs">
                            {item.color}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      <p className="font-bold text-foreground">
                        {formatPrice(item.suggestedPrice, item.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">sugerido</p>
                    </div>

                    {/* Expand/Collapse */}
                    <button
                      onClick={() =>
                        setExpandedItem(expandedItem === item.id ? null : item.id)
                      }
                      className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                    >
                      {expandedItem === item.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Expanded edit area */}
                  <AnimatePresence>
                    {expandedItem === item.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
                          <div>
                            <label className="text-xs text-muted-foreground">Título</label>
                            <Input
                              value={item.title}
                              onChange={(e) => updateItem(item.id, "title", e.target.value)}
                              className="mt-1 h-8 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Marca</label>
                            <Input
                              value={item.brand}
                              onChange={(e) => updateItem(item.id, "brand", e.target.value)}
                              className="mt-1 h-8 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Modelo</label>
                            <Input
                              value={item.model}
                              onChange={(e) => updateItem(item.id, "model", e.target.value)}
                              className="mt-1 h-8 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Fabricante</label>
                            <Input
                              value={item.manufacturer || ""}
                              onChange={(e) => updateItem(item.id, "manufacturer", e.target.value)}
                              className="mt-1 h-8 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Escala</label>
                            <Input
                              value={item.scale || ""}
                              onChange={(e) => updateItem(item.id, "scale", e.target.value)}
                              className="mt-1 h-8 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Preço (R$)</label>
                            <Input
                              type="number"
                              value={item.suggestedPrice}
                              onChange={(e) =>
                                updateItem(item.id, "suggestedPrice", parseFloat(e.target.value) || 0)
                              }
                              className="mt-1 h-8 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Cor</label>
                            <Input
                              value={item.color || ""}
                              onChange={(e) => updateItem(item.id, "color", e.target.value)}
                              className="mt-1 h-8 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Condição</label>
                            <Input
                              value={item.condition || ""}
                              onChange={(e) => updateItem(item.id, "condition", e.target.value)}
                              className="mt-1 h-8 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Ano</label>
                            <Input
                              value={item.year || ""}
                              onChange={(e) => updateItem(item.id, "year", e.target.value)}
                              className="mt-1 h-8 text-sm"
                            />
                          </div>
                        </div>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-3 italic">
                            💡 {item.notes}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom action bar */}
      {selectedItems.length > 0 && (
        <div className="sticky bottom-4 flex justify-center">
          <Button
            size="lg"
            onClick={publishItems}
            disabled={publishing}
            className="gap-2 shadow-lg"
          >
            <ShoppingBag className="h-5 w-5" />
            Publicar {selectedItems.length} {selectedItems.length === 1 ? "anúncio" : "anúncios"}
          </Button>
        </div>
      )}
    </div>
  );
};
