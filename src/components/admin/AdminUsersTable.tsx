import { useState } from "react";
import { Search, ChevronDown, ChevronUp, User, Package, Image } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AdminUser } from "@/hooks/useAdmin";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AdminUsersTableProps {
  users: AdminUser[];
  isLoading: boolean;
}

type SortKey = "username" | "created_at" | "collection_count" | "posts_count";
type SortOrder = "asc" | "desc";

export const AdminUsersTable = ({ users, isLoading }: AdminUsersTableProps) => {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const filteredUsers = users
    .filter(user => 
      user.username.toLowerCase().includes(search.toLowerCase()) ||
      (user.city?.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc" 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      
      return 0;
    });

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="h-3 w-3 inline ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 inline ml-1" />
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou cidade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table header */}
      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-muted-foreground uppercase tracking-wide border-b border-border">
        <div className="col-span-5">
          <button onClick={() => handleSort("username")} className="hover:text-foreground">
            Usuário <SortIcon columnKey="username" />
          </button>
        </div>
        <div className="col-span-2 text-center">
          <button onClick={() => handleSort("collection_count")} className="hover:text-foreground">
            Coleção <SortIcon columnKey="collection_count" />
          </button>
        </div>
        <div className="col-span-2 text-center">
          <button onClick={() => handleSort("posts_count")} className="hover:text-foreground">
            Posts <SortIcon columnKey="posts_count" />
          </button>
        </div>
        <div className="col-span-3 text-right">
          <button onClick={() => handleSort("created_at")} className="hover:text-foreground">
            Cadastro <SortIcon columnKey="created_at" />
          </button>
        </div>
      </div>

      {/* Users list */}
      <div className="space-y-1 max-h-[400px] overflow-y-auto">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum usuário encontrado
          </div>
        ) : (
          filteredUsers.map(user => (
            <div
              key={user.id}
              className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="col-span-5 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{user.username}</p>
                  {user.city && (
                    <p className="text-xs text-muted-foreground truncate">{user.city}</p>
                  )}
                </div>
              </div>
              <div className="col-span-2 text-center">
                <Badge variant="outline" className="bg-primary/5 border-primary/20">
                  <Package className="h-3 w-3 mr-1" />
                  {user.collection_count}
                </Badge>
              </div>
              <div className="col-span-2 text-center">
                <Badge variant="outline" className="bg-secondary/10 border-secondary/20">
                  <Image className="h-3 w-3 mr-1" />
                  {user.posts_count}
                </Badge>
              </div>
              <div className="col-span-3 text-right text-xs text-muted-foreground">
                {format(new Date(user.created_at), "dd MMM yyyy", { locale: ptBR })}
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {filteredUsers.length} de {users.length} usuários
      </p>
    </div>
  );
};
