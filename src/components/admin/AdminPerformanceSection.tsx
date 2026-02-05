import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  ThumbsDown
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ScannerPerformanceStats {
  total_scans: number;
  successful_scans: number;
  failed_scans: number;
  success_rate: number;
  errors_by_type: Array<{
    error_type: string;
    count: number;
    percentage: number;
  }>;
  recent_errors: Array<{
    id: string;
    created_at: string;
    user_id: string;
    username: string;
    error_type: string;
    error_message: string;
    function_name: string;
  }>;
  daily_stats: Array<{
    date: string;
    total: number;
    success: number;
    failed: number;
  }>;
  accuracy_feedback: {
    total: number;
    positive: number;
    negative: number;
    by_field: Array<{
      field: string;
      reports: number;
    }>;
  };
}

interface AdminPerformanceSectionProps {
  stats: ScannerPerformanceStats | null;
  isLoading: boolean;
}

const ERROR_TYPE_LABELS: Record<string, string> = {
  ai_timeout: "Timeout IA",
  ai_rate_limit: "Rate Limit",
  image_quality: "Qualidade Imagem",
  identification_failed: "Não Identificado",
  too_many_cars: "Muitos Carros",
  parse_error: "Erro Parse",
  unknown: "Desconhecido",
};

const ERROR_TYPE_COLORS: Record<string, string> = {
  ai_timeout: "#ef4444",
  ai_rate_limit: "#f97316",
  image_quality: "#eab308",
  identification_failed: "#6366f1",
  too_many_cars: "#8b5cf6",
  parse_error: "#ec4899",
  unknown: "#6b7280",
};

const PIE_COLORS = ["#ef4444", "#f97316", "#eab308", "#6366f1", "#8b5cf6", "#ec4899", "#6b7280"];

export const AdminPerformanceSection = ({ stats, isLoading }: AdminPerformanceSectionProps) => {
  const [errorFilter, setErrorFilter] = useState<string>("all");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Nenhum dado de performance disponível.
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const dailyChartData = [...(stats.daily_stats || [])]
    .reverse()
    .map(d => ({
      date: format(new Date(d.date), "dd/MM", { locale: ptBR }),
      sucesso: d.success,
      falha: d.failed,
      total: d.total,
    }));

  const errorPieData = (stats.errors_by_type || []).map((e, i) => ({
    name: ERROR_TYPE_LABELS[e.error_type] || e.error_type,
    value: e.count,
    color: ERROR_TYPE_COLORS[e.error_type] || PIE_COLORS[i % PIE_COLORS.length],
  }));

  // Filter errors
  const filteredErrors = errorFilter === "all"
    ? stats.recent_errors || []
    : (stats.recent_errors || []).filter(e => e.error_type === errorFilter);

  const errorTypes = Array.from(new Set((stats.recent_errors || []).map(e => e.error_type)));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <AdminStatCard
          title="Taxa de Sucesso"
          value={`${stats.success_rate || 0}%`}
          icon={TrendingUp}
          className={stats.success_rate >= 90 ? "border-green-500/30" : stats.success_rate >= 70 ? "border-yellow-500/30" : "border-red-500/30"}
        />
        <AdminStatCard
          title="Total de Scans"
          value={stats.total_scans || 0}
          icon={Activity}
        />
        <AdminStatCard
          title="Sucesso"
          value={stats.successful_scans || 0}
          icon={CheckCircle}
          className="border-green-500/30"
        />
        <AdminStatCard
          title="Erros"
          value={stats.failed_scans || 0}
          icon={XCircle}
          className={stats.failed_scans > 0 ? "border-red-500/30" : ""}
        />
      </div>

      {/* Daily Trend Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Tendência Diária
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))' 
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="sucesso" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name="Sucesso"
                />
                <Line 
                  type="monotone" 
                  dataKey="falha" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="Falha"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">Sem dados no período</p>
          )}
        </CardContent>
      </Card>

      {/* Error Distribution */}
      {errorPieData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Distribuição de Erros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={errorPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {errorPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Accuracy Feedback */}
      {stats.accuracy_feedback && stats.accuracy_feedback.total > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ThumbsDown className="h-5 w-5 text-orange-500" />
              Feedback de Precisão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{stats.accuracy_feedback.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{stats.accuracy_feedback.positive}</p>
                <p className="text-xs text-muted-foreground">Positivos</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{stats.accuracy_feedback.negative}</p>
                <p className="text-xs text-muted-foreground">Negativos</p>
              </div>
            </div>

            {stats.accuracy_feedback.by_field && stats.accuracy_feedback.by_field.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Campos mais reportados:</p>
                <div className="flex flex-wrap gap-2">
                  {stats.accuracy_feedback.by_field.map((f, i) => (
                    <Badge key={i} variant="secondary">
                      {f.field}: {f.reports}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Errors Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Erros Recentes
            </CardTitle>
            <Select value={errorFilter} onValueChange={setErrorFilter}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="Filtrar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {errorTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {ERROR_TYPE_LABELS[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredErrors.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Data</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Mensagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredErrors.slice(0, 20).map((error) => (
                    <TableRow key={error.id}>
                      <TableCell className="text-xs">
                        {format(new Date(error.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-xs">{error.username}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {ERROR_TYPE_LABELS[error.error_type] || error.error_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">
                        {error.error_message || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              Nenhum erro registrado no período
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
