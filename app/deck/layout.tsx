export default function DeckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        /* Force light mode for deck page */
        html:has(.deck-root) {
          color-scheme: light !important;
        }
        html:has(.deck-root),
        html:has(.deck-root) body {
          --background: 0 0% 100% !important;
          --foreground: 0 0% 3.9% !important;
          --card: 0 0% 100% !important;
          --card-foreground: 0 0% 3.9% !important;
          --muted: 220 14.3% 95.9% !important;
          --muted-foreground: 220 8.9% 46.1% !important;
          --border: 220 13% 91% !important;
          background: #ffffff !important;
          background-color: #ffffff !important;
          background-image: none !important;
          color: #101828 !important;
        }
        /* Hide PWA install prompts on deck */
        .deck-root ~ div[class*="install"],
        .deck-root ~ div[role="dialog"] {
          display: none !important;
        }
        /* Kill all global gradient/mesh backgrounds */
        html:has(.deck-root) .gradient-mesh,
        html:has(.deck-root) .aurora-bg,
        html:has(.deck-root) .cyber-grid {
          background: transparent !important;
          background-image: none !important;
        }
      `}</style>
      <div className="deck-root">{children}</div>
    </>
  );
}
