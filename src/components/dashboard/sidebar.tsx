import { CitrusIcon, HomeIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { UserMenu } from "./user-menu";

export async function Sidebar() {
  const session = await auth();

  return (
    <SidebarProvider>
      <ShadcnSidebar side="left" className="border-r">
        <SidebarHeader>
          <div className="flex size-10 items-center text-primary">
            <Link href="/dashboard">
              <CitrusIcon size={24} strokeWidth={1.5} />
            </Link>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Primary navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/dashboard">
                      <HomeIcon size={16} />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Secondary navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/dashboard/billing">
                      <SettingsIcon size={16} />
                      <span>Billing</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <UserMenu user={session?.user} />
        </SidebarFooter>
      </ShadcnSidebar>
    </SidebarProvider>
  );
}
