/**
 * Event Layout
 * Phase 88: Event Launch Kit
 *
 * Minimal standalone layout with no dashboard nav/sidebar.
 * Dark background with Sahara orange accents.
 */

export default function EventLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">{children}</div>
  )
}
