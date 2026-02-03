import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background pt-safe">
      <main className="pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};
