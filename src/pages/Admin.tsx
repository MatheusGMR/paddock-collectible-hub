import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  Package, 
  Car, 
  Image, 
  Heart, 
  ShoppingBag, 
  UserPlus,
  Shield,
  ArrowLeft,
  RefreshCw,
  Bot,
  Bell,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  useAdmin, 
  useAdminStats, 
  useAdminSubscriptionStats, 
  useAdminUserGrowth,
  useAdminUsers,
  useAdminPageAnalytics,
  useAdminAIUsage,
  useAdminScannerPerformance
} from "@/hooks/useAdmin";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";
import { AdminSubscriptionChart } from "@/components/admin/AdminSubscriptionChart";
import { AdminUserGrowthChart } from "@/components/admin/AdminUserGrowthChart";
import { AdminAnalyticsSection } from "@/components/admin/AdminAnalyticsSection";
import { AdminAIUsageSection } from "@/components/admin/AdminAIUsageSection";
import { AdminPushSection } from "@/components/admin/AdminPushSection";
import { AdminPerformanceSection } from "@/components/admin/AdminPerformanceSection";
import { useAuth } from "@/contexts/AuthContext";

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading: isCheckingAdmin } = useAdmin();
  const { stats, isLoading: isLoadingStats, refetch: refetchStats } = useAdminStats();
  const { stats: subscriptionStats, isLoading: isLoadingSubs } = useAdminSubscriptionStats();
  const { growth, isLoading: isLoadingGrowth } = useAdminUserGrowth();
  const { users, isLoading: isLoadingUsers, refetch: refetchUsers } = useAdminUsers();
  const [analyticsDays, setAnalyticsDays] = useState(7);
  const { analytics, isLoading: isLoadingAnalytics, refetch: refetchAnalytics } = useAdminPageAnalytics(analyticsDays);
  const [aiDays, setAIDays] = useState(30);
  const { stats: aiStats, isLoading: isLoadingAI, refetch: refetchAI } = useAdminAIUsage(aiDays);
  const [perfDays, setPerfDays] = useState(7);
  const { stats: perfStats, isLoading: isLoadingPerf, refetch: refetchPerf } = useAdminScannerPerformance(perfDays);

  // Redirect if not admin
  useEffect(() => {
    if (!isCheckingAdmin && !isAdmin) {
      navigate("/");
    }
  }, [isCheckingAdmin, isAdmin, navigate]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  const handleRefresh = () => {
    refetchStats();
    refetchUsers();
    refetchAnalytics();
    refetchAI();
    refetchPerf();
  };

  if (isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Shield className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border pt-safe">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Painel Admin
              </h1>
              <p className="text-xs text-muted-foreground">Visão geral da plataforma</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Tabs for different sections */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="text-xs px-1">Geral</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs px-1">Analytics</TabsTrigger>
            <TabsTrigger value="ai" className="text-xs px-1 gap-1">
              <Bot className="h-3 w-3" />
              IA
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-xs px-1 gap-1">
              <Activity className="h-3 w-3" />
              Perf
            </TabsTrigger>
            <TabsTrigger value="push" className="text-xs px-1 gap-1">
              <Bell className="h-3 w-3" />
              Push
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs px-1">Usuários</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-4">
            {/* Stats Grid */}
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Métricas Gerais
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <AdminStatCard
                  title="Usuários"
                  value={stats?.total_users || 0}
                  icon={Users}
                  isLoading={isLoadingStats}
                />
                <AdminStatCard
                  title="Carros Cadastrados"
                  value={stats?.total_items || 0}
                  icon={Car}
                  isLoading={isLoadingStats}
                />
                <AdminStatCard
                  title="Itens na Coleção"
                  value={stats?.total_collection_items || 0}
                  icon={Package}
                  isLoading={isLoadingStats}
                />
                <AdminStatCard
                  title="Posts"
                  value={stats?.total_posts || 0}
                  icon={Image}
                  isLoading={isLoadingStats}
                />
                <AdminStatCard
                  title="Curtidas"
                  value={stats?.total_likes || 0}
                  icon={Heart}
                  isLoading={isLoadingStats}
                />
                <AdminStatCard
                  title="Anúncios Ativos"
                  value={stats?.active_listings || 0}
                  icon={ShoppingBag}
                  isLoading={isLoadingStats}
                />
                <AdminStatCard
                  title="Conexões"
                  value={stats?.total_follows || 0}
                  icon={UserPlus}
                  className="col-span-2"
                  isLoading={isLoadingStats}
                />
              </div>
            </section>

            {/* Charts */}
            <section className="grid gap-4">
              <AdminSubscriptionChart 
                stats={subscriptionStats} 
                isLoading={isLoadingSubs} 
              />
              <AdminUserGrowthChart 
                data={growth} 
                isLoading={isLoadingGrowth} 
              />
            </section>
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            {/* Period selector */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">Período:</span>
              <div className="flex gap-1">
                {[7, 14, 30].map(days => (
                  <Button
                    key={days}
                    variant={analyticsDays === days ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAnalyticsDays(days)}
                  >
                    {days}d
                  </Button>
                ))}
              </div>
            </div>
            <AdminAnalyticsSection 
              analytics={analytics} 
              isLoading={isLoadingAnalytics} 
            />
          </TabsContent>

          <TabsContent value="ai" className="mt-4">
            {/* Period selector */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">Período:</span>
              <div className="flex gap-1">
                {[7, 14, 30].map(days => (
                  <Button
                    key={days}
                    variant={aiDays === days ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAIDays(days)}
                  >
                    {days}d
                  </Button>
                ))}
              </div>
            </div>
            <AdminAIUsageSection 
              stats={aiStats} 
              isLoading={isLoadingAI} 
            />
          </TabsContent>

          <TabsContent value="performance" className="mt-4">
            {/* Period selector */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">Período:</span>
              <div className="flex gap-1">
                {[7, 14, 30].map(days => (
                  <Button
                    key={days}
                    variant={perfDays === days ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPerfDays(days)}
                  >
                    {days}d
                  </Button>
                ))}
              </div>
            </div>
            <AdminPerformanceSection 
              stats={perfStats} 
              isLoading={isLoadingPerf} 
            />
          </TabsContent>

          <TabsContent value="push" className="mt-4">
            <AdminPushSection />
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Usuários Cadastrados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AdminUsersTable users={users} isLoading={isLoadingUsers} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
