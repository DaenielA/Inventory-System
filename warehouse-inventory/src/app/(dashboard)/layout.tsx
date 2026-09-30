import { requireAuth } from "@/lib/authorization";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const { name, role } = session.user;

  return (
    <div className="flex min-h-screen">
      <Sidebar userRole={role} userName={name} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header userRole={role} userName={name} />
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6 overflow-auto">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
