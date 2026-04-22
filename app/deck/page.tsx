import type { Metadata } from "next";
import { DeckContent } from "./deck-content";

export const metadata: Metadata = {
  title: "Sahara | Institutional Founder Intelligence",
  description:
    "Sahara turns founder chaos into institutional-grade signal. Building Ready Companies.",
  openGraph: {
    title: "Sahara | Institutional Founder Intelligence",
    description:
      "Sahara turns founder chaos into institutional-grade signal. Building Ready Companies.",
    images: ["/deck/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sahara | Institutional Founder Intelligence",
    description:
      "Sahara turns founder chaos into institutional-grade signal. Building Ready Companies.",
    images: ["/deck/og-image.png"],
  },
};

export default function DeckPage() {
  return <DeckContent />;
}
