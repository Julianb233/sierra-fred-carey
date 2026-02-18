import DashboardLayout from "@/app/dashboard/layout";

export default function CheckInsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
