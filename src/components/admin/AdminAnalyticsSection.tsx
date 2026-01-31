import { BarChart3, Clock, MousePointer2, ArrowRight, Smartphone, Monitor, Tablet, TrendingUp, TrendingDown, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageAnalytics } from "@/hooks/useAdmin";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface AdminAnalyticsSectionProps {
  analytics: PageAnalytics | null;
  isLoading: boolean;
}

const formatDuration = (ms: number | null): string => {
  if (!ms) return "0s";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const formatPagePath = (path: string): string => {
  if (path === "/") return "Home";
  const name = path.replace(/^\//, "").replace(/-/g, " ");
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const DEVICE_COLORS = {
  mobile: "hsl(var(--primary))",
  tablet: "hsl(var(--accent))",
  desktop: "hsl(var(--muted-foreground))",
  unknown: "hsl(var(--border))"
};

const DEVICE_ICONS = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor
};

export const AdminAnalyticsSection = ({ analytics, isLoading }: AdminAnalyticsSectionProps) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum dado de analytics disponível</p>
          <p className="text-xs text-muted-foreground mt-1">Os dados aparecerão conforme os usuários navegam no app</p>
        </CardContent>
      </Card>
    );
  }

  const totalSessions = analytics.device_breakdown?.reduce((sum, d) => sum + d.sessions, 0) || 0;
  const totalPageViews = analytics.page_views?.reduce((sum, p) => sum + p.views, 0) || 0;
  const totalInteractions = analytics.top_interactions?.reduce((sum, i) => sum + i.count, 0) || 0;

  // Prepare chart data
  const dailyChartData = analytics.daily_stats?.slice().reverse().slice(-7).map(d => ({
    date: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    views: d.page_views,
    interactions: d.interactions,
    sessions: d.sessions
  })) || [];

  const deviceChartData = analytics.device_breakdown?.map(d => ({
    name: d.device === "mobile" ? "Mobile" : d.device === "tablet" ? "Tablet" : d.device === "desktop" ? "Desktop" : "Outro",
    value: d.sessions,
    color: DEVICE_COLORS[d.device as keyof typeof DEVICE_COLORS] || DEVICE_COLORS.unknown
  })) || [];

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        Analytics & Comportamento
      </h2>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Sessões</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalSessions.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-accent-foreground" />
              <span className="text-xs text-muted-foreground">Tempo Médio</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatDuration(analytics.avg_session_duration)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <MousePointer2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Interações</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalInteractions.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              {(analytics.bounce_rate || 0) > 50 ? (
                <TrendingDown className="h-4 w-4 text-destructive" />
              ) : (
                <TrendingUp className="h-4 w-4 text-primary" />
              )}
              <span className="text-xs text-muted-foreground">Bounce Rate</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {analytics.bounce_rate?.toFixed(1) || 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Activity Chart */}
      {dailyChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Atividade Diária</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar dataKey="views" name="Views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="interactions" name="Interações" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 justify-center mt-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded bg-primary" />
                Views
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded bg-muted-foreground" />
                Interações
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Page Views & Devices */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Pages */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Páginas Mais Visitadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.page_views?.slice(0, 5).map((page, idx) => (
              <div key={page.page_path} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate max-w-[60%]">
                    {formatPagePath(page.page_path)}
                  </span>
                  <span className="text-muted-foreground">{page.views} views</span>
                </div>
                <Progress 
                  value={(page.views / (analytics.page_views?.[0]?.views || 1)) * 100} 
                  className="h-1.5"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{page.unique_sessions} sessões</span>
                  <span>{formatDuration(page.avg_duration_ms)}</span>
                </div>
              </div>
            ))}
            {(!analytics.page_views || analytics.page_views.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dispositivos</CardTitle>
          </CardHeader>
          <CardContent>
            {deviceChartData.length > 0 ? (
              <>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {deviceChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {deviceChartData.map(device => {
                    const Icon = DEVICE_ICONS[device.name.toLowerCase() as keyof typeof DEVICE_ICONS] || Monitor;
                    const percentage = ((device.value / totalSessions) * 100).toFixed(0);
                    return (
                      <Badge key={device.name} variant="outline" className="gap-1">
                        <Icon className="h-3 w-3" />
                        {device.name} {percentage}%
                      </Badge>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Flow */}
      {analytics.user_flow && analytics.user_flow.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Fluxo de Navegação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.user_flow.slice(0, 6).map((flow, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/30"
                >
                  <Badge variant="secondary" className="text-xs">
                    {formatPagePath(flow.from_page)}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <Badge variant="secondary" className="text-xs">
                    {formatPagePath(flow.to_page)}
                  </Badge>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {flow.transitions}x
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Interactions */}
      {analytics.top_interactions && analytics.top_interactions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Interações Principais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.top_interactions.slice(0, 8).map((interaction, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MousePointer2 className="h-3 w-3 text-primary flex-shrink-0" />
                    <span className="truncate font-medium">{interaction.interaction_target}</span>
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">
                      {interaction.interaction_type}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground ml-2">{interaction.count}x</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
};
