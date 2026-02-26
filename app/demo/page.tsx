import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import Footer from "@/components/footer";
import {
  BarChartIcon,
  RocketIcon,
  ReaderIcon,
  ChatBubbleIcon,
} from "@radix-ui/react-icons";
import { Network } from "lucide-react";

const demos = [
  {
    title: "Reality Lens",
    description: "5-dimensional AI analysis of your startup idea",
    href: "/demo/reality-lens",
    icon: <BarChartIcon className="h-6 w-6" />,
  },
  {
    title: "Investor Lens",
    description: "See your startup through an investor's eyes",
    href: "/demo/investor-lens",
    icon: <RocketIcon className="h-6 w-6" />,
  },
  {
    title: "Pitch Deck Review",
    description: "AI-powered slide-by-slide deck analysis",
    href: "/demo/pitch-deck",
    icon: <ReaderIcon className="h-6 w-6" />,
  },
  {
    title: "Virtual Team",
    description: "AI agents working 24/7 on your founder operations",
    href: "/demo/virtual-team",
    icon: <ChatBubbleIcon className="h-6 w-6" />,
  },
  {
    title: "Boardy",
    description: "AI-powered networking and introductions",
    href: "/demo/boardy",
    icon: <Network className="h-6 w-6" />,
  },
];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-[#ff6a1a]/10 text-[#ff6a1a] border-[#ff6a1a]/20">
              Interactive Demos
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Try{" "}
              <span className="bg-gradient-to-r from-[#ff6a1a] via-orange-500 to-[#ff6a1a] bg-clip-text text-transparent">
                Sahara
              </span>{" "}
              Tools
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Explore interactive demos of Sahara&apos;s AI-powered tools for founders.
              Free account required to analyze your startup.
            </p>
          </div>

          <div className="grid gap-4">
            {demos.map((demo) => (
              <Link
                key={demo.href}
                href={demo.href}
                className="flex items-center gap-4 p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:border-[#ff6a1a]/30 hover:shadow-lg transition-all group"
              >
                <div className="p-3 rounded-lg bg-[#ff6a1a]/10 text-[#ff6a1a] group-hover:scale-110 transition-transform">
                  {demo.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {demo.title}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {demo.description}
                  </p>
                </div>
                <span className="text-[#ff6a1a] opacity-0 group-hover:opacity-100 transition-opacity">
                  Try it &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
