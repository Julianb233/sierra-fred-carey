export const metadata = {
  title: "Launch Dashboard — Sahara",
  description: "Sahara launch readiness tracker",
};

export default function LaunchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <main className="max-w-7xl mx-auto py-6 px-4">
        {children}
      </main>
    </div>
  );
}
