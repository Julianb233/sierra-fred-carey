export default function DeckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="deck-layout">
      <style>{`
        .deck-layout nav,
        .deck-layout [data-navbar] {
          display: none !important;
        }
      `}</style>
      {children}
    </div>
  );
}
