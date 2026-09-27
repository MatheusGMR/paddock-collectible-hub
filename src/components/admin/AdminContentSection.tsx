import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { adminDb } from "./adminUtils";

interface Post { id: string; image_url: string; caption: string | null; created_at: string; user_id: string; likes_count: number }

export const AdminContentSection = () => {
  const { toast } = useToast();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-content"],
    queryFn: async () => {
      const [{ data: posts }, { data: sources }] = await Promise.all([
        adminDb.from("posts").select("id,image_url,caption,created_at,user_id,likes_count").order("created_at", { ascending: false }).limit(60),
        adminDb.from("news_sources").select("id,name,category,is_active,last_fetched_at").order("name"),
      ]);
      const ids = [...new Set((posts || []).map((p: Post) => p.user_id))];
      const { data: profiles } = ids.length ? await adminDb.from("profiles").select("user_id,username").in("user_id", ids) : { data: [] };
      const names = new Map<string, string>((profiles || []).map((p: { user_id: string; username: string }) => [p.user_id, p.username]));
      return { posts: (posts || []) as Post[], sources: sources || [], names };
    },
  });

  const removePost = async (id: string) => {
    if (!confirm("Remover este post do feed?")) return;
    const { error } = await adminDb.from("posts").delete().eq("id", id);
    toast({ title: error ? "Não foi possível remover" : "Post removido", variant: error ? "destructive" : "default" });
    refetch();
  };

  if (isLoading || !data) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Posts recentes</h3>
        <div className="grid grid-cols-3 gap-2">
          {data.posts.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <img src={p.image_url} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover bg-muted" />
              <div className="p-1.5">
                <p className="text-[10px] text-muted-foreground truncate">@{data.names.get(p.user_id) || "—"} · {format(new Date(p.created_at), "dd/MM")}</p>
                <Button size="sm" variant="ghost" className="h-6 w-full text-[11px] text-destructive" onClick={() => removePost(p.id)}>Remover</Button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Fontes de notícias</h3>
        {data.sources.map((s: { id: string; name: string; category: string; is_active: boolean; last_fetched_at: string | null }) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <div>
              <p className="text-sm text-foreground">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.category}{s.last_fetched_at ? ` · atualizada ${format(new Date(s.last_fetched_at), "dd/MM HH:mm")}` : ""}</p>
            </div>
            <span className={`text-xs ${s.is_active ? "text-primary" : "text-muted-foreground"}`}>{s.is_active ? "Ativa" : "Inativa"}</span>
          </div>
        ))}
      </section>
    </div>
  );
};
