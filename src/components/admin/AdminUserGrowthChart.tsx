import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserGrowth } from "@/hooks/useAdmin";
import { TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AdminUserGrowthChartProps {
  data: UserGrowth[];
  isLoading: boolean;
}

export const AdminUserGrowthChart = ({ data, isLoading }: AdminUserGrowthChartProps) => {
  // Sort by date ascending for chart
  const sortedData = [...data]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(item => ({
      ...item,
      dateLabel: format(new Date(item.date), "dd/MM", { locale: ptBR })
    }));

  const totalNewUsers = data.reduce((sum, d) => sum + d.new_users, 0);
  const avgPerDay = data.length > 0 ? (totalNewUsers / data.length).toFixed(1) : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
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
          <TrendingUp className="h-5 w-5 text-primary" />
          Crescimento de Usuários
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex gap-4">
          <div className="flex-1 p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Novos (30 dias)</p>
            <p className="text-xl font-bold text-foreground">{totalNewUsers}</p>
          </div>
          <div className="flex-1 p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Média/dia</p>
            <p className="text-xl font-bold text-foreground">{avgPerDay}</p>
          </div>
        </div>

        {/* Chart */}
        {sortedData.length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sortedData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="dateLabel" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value} novos usuários`, 'Cadastros']}
                />
                <Area
                  type="monotone"
                  dataKey="new_users"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            Sem dados de crescimento
          </div>
        )}
      </CardContent>
    </Card>
  );
};
