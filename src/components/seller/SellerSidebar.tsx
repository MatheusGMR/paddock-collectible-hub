import { Package, DollarSign, User, Users, ArrowLeft } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import paddockLogo from "@/assets/paddock-logo.png";

const items = [
  { title: "Estoque", url: "/seller", icon: Package },
  { title: "Financeiro", url: "/seller/financeiro", icon: DollarSign },
  { title: "Conta", url: "/seller/conta", icon: User },
  { title: "Clientes", url: "/seller/clientes", icon: Users },
];

export const SellerSidebar = () => {
  const navigate = useNavigate();

  return (
    <Sidebar className="w-60 border-r border-border bg-card">
      <SidebarContent>
        <div className="p-4 flex items-center gap-3 border-b border-border">
          <img src={paddockLogo} alt="Paddock" className="h-8 w-8" />
          <div>
            <p className="text-sm font-semibold text-foreground">Paddock</p>
            <p className="text-xs text-muted-foreground">Painel do Lojista</p>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/seller"}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 border-t border-border">
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao App
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};
