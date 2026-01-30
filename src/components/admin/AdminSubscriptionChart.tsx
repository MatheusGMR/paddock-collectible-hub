import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SubscriptionStat } from "@/hooks/useAdmin";
import { DollarSign } from "lucide-react";

interface AdminSubscriptionChartProps {
  stats: SubscriptionStat[];
  isLoading: boolean;
}

const statusColors: Record<string, string> = {
  trial: "hsl(var(--primary))",
  active: "hsl(142, 76%, 36%)",
  canceled: "hsl(0, 84%, 60%)",
  expired: "hsl(220, 14%, 45%)",
};

const statusLabels: Record<string, string> = {
  trial: "Trial",
  active: "Ativo",
  canceled: "Cancelado",
  expired: "Expirado",
};

export const AdminSubscriptionChart = ({ stats, isLoading }: AdminSubscriptionChartProps) => {
  // Aggregate by status
  const aggregatedStats = stats.reduce((acc, stat) => {
    const existing = acc.find(s => s.status === stat.status);
    if (existing) {
      existing.count += stat.count;
    } else {
      acc.push({ 
        status: stat.status, 
        count: stat.count,
        label: statusLabels[stat.status] || stat.status 
      });
    }
    return acc;
  }, [] as { status: string; count: number; label: string }[]);

  const totalSubscriptions = aggregatedStats.reduce((sum, s) => sum + s.count, 0);
  const activeCount = aggregatedStats.find(s => s.status === "active")?.count || 0;
  const trialCount = aggregatedStats.find(s => s.status === "trial")?.count || 0;

  // Mock revenue calculation (for demonstration)
  const monthlyRevenue = activeCount * 19.90;
  const potentialRevenue = trialCount * 19.90;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Assinaturas & Receita
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Revenue summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-xs text-muted-foreground">Receita Mensal</p>
            <p className="text-xl font-bold text-green-500">
              R$ {monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground">{activeCount} assinantes ativos</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs text-muted-foreground">Potencial (Trials)</p>
            <p className="text-xl font-bold text-primary">
              R$ {potentialRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground">{trialCount} em trial</p>
          </div>
        </div>

        {/* Chart */}
        {aggregatedStats.length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aggregatedStats} layout="vertical">
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="label" 
                  axisLine={false}
                  tickLine={false}
                  width={80}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value} usuários`, 'Total']}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {aggregatedStats.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={statusColors[entry.status] || 'hsl(var(--muted))'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            Nenhuma assinatura registrada
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 justify-center">
          {Object.entries(statusLabels).map(([status, label]) => (
            <div key={status} className="flex items-center gap-1.5 text-xs">
              <div 
                className="w-3 h-3 rounded" 
                style={{ backgroundColor: statusColors[status] }}
              />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Total: {totalSubscriptions} assinaturas
        </p>
      </CardContent>
    </Card>
  );
};
