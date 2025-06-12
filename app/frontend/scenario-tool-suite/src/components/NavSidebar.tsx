
import { Link } from "react-router-dom";
import { 
  FileText,
  CheckSquare,
  Play
} from "lucide-react";
import { 
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { useLocation } from "react-router-dom";

export default function NavSidebar({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  const menuItems = [
    {
      title: "Scenario Generator",
      path: "/generator",
      icon: FileText,
    },
    {
      title: "Scenario Validator",
      path: "/validator",
      icon: CheckSquare,
    },
    {
      title: "Scenario Player",
      path: "/",
      icon: Play,
    },
  ];
  
  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <Sidebar collapsible="icon">
          <SidebarContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton 
                    asChild
                    isActive={location.pathname === item.path}
                    tooltip={item.title}
                  >
                    <Link to={item.path}>
                      <item.icon size={20} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        
        <div className="flex-1 bg-background">
          <div className="p-2 md:p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <SidebarTrigger />
                <h2 className="ml-2 text-lg font-semibold">OpenSCENARIO Tool Suite</h2>
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
