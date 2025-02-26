import { FC, ReactNode } from "react";
import { SidebarProvider } from "../ui/sidebar";
import { AppSidebar } from "./sidebar";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </SidebarProvider>
  );
};
