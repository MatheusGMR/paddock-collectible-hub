import { Home, ShoppingBag, Camera, Bell, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLanguage } from "@/contexts/LanguageContext";

export const BottomNav = () => {
  const { t } = useLanguage();

  const navItems = [
    { icon: Home, label: t.nav.home, path: "/" },
    { icon: ShoppingBag, label: t.nav.market, path: "/mercado" },
    { icon: Camera, label: t.nav.scanner, path: "/scanner", isCenter: true },
    { icon: Bell, label: t.nav.notifications, path: "/notifications" },
    { icon: User, label: t.nav.profile, path: "/profile" },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg safe-bottom">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className="nav-item flex-1"
            activeClassName="nav-item-active"
          >
            {item.isCenter ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary scanner-glow transition-transform active:scale-95">
                <item.icon className="h-6 w-6 text-primary-foreground" />
              </div>
            ) : (
              <>
                <item.icon className="h-6 w-6" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
