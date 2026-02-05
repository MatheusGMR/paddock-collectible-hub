import { useState, useEffect } from "react";
import { Bell, Send, Users, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PushStats {
  totalSubscriptions: number;
  topicCounts: Record<string, number>;
}

export const AdminPushSection = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [stats, setStats] = useState<PushStats | null>(null);
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number } | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [topic, setTopic] = useState("all");
  const [imageUrl, setImageUrl] = useState("");

  // Load stats on mount
  const loadStats = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("id, topics");

      if (error) throw error;

      const totalSubscriptions = data?.length || 0;
      const topicCounts: Record<string, number> = {};

      data?.forEach((sub) => {
        if (sub.topics && Array.isArray(sub.topics)) {
          sub.topics.forEach((t: string) => {
            topicCounts[t] = (topicCounts[t] || 0) + 1;
          });
        }
      });

      setStats({ totalSubscriptions, topicCounts });
    } catch (error) {
      console.error("Error loading push stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load stats on component mount
  useEffect(() => {
    loadStats();
  }, []);

  const handleSendPush = async () => {
    if (!title.trim() || !body.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Título e mensagem são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: {
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || undefined,
          image: imageUrl.trim() || undefined,
          topic: topic === "all" ? undefined : topic,
        },
      });

      if (error) throw error;

      setLastResult({ sent: data.sent || 0, failed: data.failed || 0 });

      toast({
        title: "Push enviado!",
        description: `Enviado para ${data.sent} dispositivos.`,
      });

      // Clear form on success
      setTitle("");
      setBody("");
      setUrl("");
      setImageUrl("");
      setTopic("all");

      // Reload stats
      loadStats();
    } catch (error) {
      console.error("Error sending push:", error);
      toast({
        title: "Erro ao enviar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Assinantes Push
          </CardTitle>
          <CardDescription>
            Dispositivos registrados para notificações
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : stats ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <span className="text-sm text-muted-foreground">Total de assinantes</span>
                <span className="text-2xl font-bold text-foreground">
                  {stats.totalSubscriptions}
                </span>
              </div>

              {Object.keys(stats.topicCounts).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Por tópico:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(stats.topicCounts).map(([topic, count]) => (
                      <div
                        key={topic}
                        className="flex items-center justify-between p-3 bg-card border border-border rounded-lg"
                      >
                        <span className="text-sm text-foreground capitalize">{topic}</span>
                        <span className="text-sm font-semibold text-primary">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button variant="outline" size="sm" onClick={loadStats} className="w-full">
                Atualizar estatísticas
              </Button>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              Nenhum dado disponível
            </p>
          )}
        </CardContent>
      </Card>

      {/* Send Push Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Enviar Notificação
          </CardTitle>
          <CardDescription>
            Envie uma notificação push para os usuários
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Topic selector */}
          <div className="space-y-2">
            <Label htmlFor="topic">Público alvo</Label>
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o público" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                <SelectItem value="launches">Lançamentos</SelectItem>
                <SelectItem value="news">Notícias</SelectItem>
                <SelectItem value="deals">Ofertas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Novo lançamento Hot Wheels!"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground text-right">{title.length}/50</p>
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Mensagem *</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Descreva a notificação..."
              maxLength={200}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">{body.length}/200</p>
          </div>

          {/* URL */}
          <div className="space-y-2">
            <Label htmlFor="url">Link (opcional)</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/mercado ou https://..."
            />
            <p className="text-xs text-muted-foreground">
              Para onde o usuário será direcionado ao clicar
            </p>
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <Label htmlFor="image">Imagem (opcional)</Label>
            <Input
              id="image"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {/* Last result */}
          {lastResult && (
            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span className="text-sm text-foreground">
                Último envio: {lastResult.sent} enviados, {lastResult.failed} falharam
              </span>
            </div>
          )}

          {/* Send button */}
          <Button
            onClick={handleSendPush}
            disabled={isSending || !title.trim() || !body.trim()}
            className="w-full"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Enviar Push
              </>
            )}
          </Button>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              As notificações serão enviadas para todos os dispositivos que se inscreveram no tópico selecionado. Use com moderação.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
