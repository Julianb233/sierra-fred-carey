"use client";

import { use } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ArrowLeft, Share2, Bookmark, BookOpen } from "lucide-react";
import Link from "next/link";
import Footer from "@/components/footer";

const relatedPosts = [
  {
    slug: "scaling-decision-frameworks",
    title: "Scaling Decision Frameworks",
    category: "Product",
  },
  {
    slug: "roi-better-decisions",
    title: "The ROI of Better Decisions",
    category: "Case Studies",
  },
  {
    slug: "engineering-decision-os",
    title: "Engineering Behind Decision OS",
    category: "Engineering",
  },
];

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-24 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/blog">
            <Button variant="ghost" className="mb-8 text-gray-600 dark:text-gray-400 hover:text-[#ff6a1a]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 md:p-12 border border-gray-200 dark:border-gray-800 mb-8">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff6a1a]/10 text-sm font-medium text-[#ff6a1a] mb-4">
              Decision Science
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
              The Future of Decision-Making in the AI Era
            </h1>

            <div className="flex items-center justify-between mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ff6a1a] to-orange-500" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Fred Carey</p>
                  <p className="text-sm text-gray-500">Founder & CEO</p>
                </div>
              </div>
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Dec 20, 2024
                </span>
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  8 min read
                </span>
              </div>
            </div>

            <div className="aspect-video rounded-xl bg-gradient-to-br from-[#ff6a1a]/20 to-orange-400/20 flex items-center justify-center mb-12 border border-[#ff6a1a]/10">
              <div className="text-8xl">📊</div>
            </div>

            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                As artificial intelligence continues to reshape the business landscape,
                the way we make decisions is undergoing a fundamental transformation.
                This shift isn't just about automation—it's about augmentation.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6 text-gray-900 dark:text-white">The Evolution of Decision-Making</h2>
              <p className="mb-6 text-gray-600 dark:text-gray-400">
                Traditional decision-making processes relied heavily on intuition, past experience,
                and limited data analysis. While these elements remain valuable, they're no longer
                sufficient in today's fast-paced, data-rich environment.
              </p>
              <p className="mb-6 text-gray-600 dark:text-gray-400">
                Modern decision frameworks combine human judgment with AI-powered insights to create
                a more robust and reliable decision-making process. This hybrid approach leverages
                the best of both worlds: human creativity and contextual understanding, paired with
                AI's ability to process vast amounts of data and identify patterns.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6 text-gray-900 dark:text-white">Key Principles for AI-Enhanced Decisions</h2>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start text-gray-600 dark:text-gray-400">
                  <span className="inline-block w-2 h-2 bg-[#ff6a1a] rounded-full mt-2 mr-3" />
                  <span>
                    <strong className="text-gray-900 dark:text-white">Transparency:</strong> Understand how AI arrives at recommendations
                  </span>
                </li>
                <li className="flex items-start text-gray-600 dark:text-gray-400">
                  <span className="inline-block w-2 h-2 bg-[#ff6a1a] rounded-full mt-2 mr-3" />
                  <span>
                    <strong className="text-gray-900 dark:text-white">Context:</strong> Provide AI with relevant business context and constraints
                  </span>
                </li>
                <li className="flex items-start text-gray-600 dark:text-gray-400">
                  <span className="inline-block w-2 h-2 bg-[#ff6a1a] rounded-full mt-2 mr-3" />
                  <span>
                    <strong className="text-gray-900 dark:text-white">Iteration:</strong> Continuously refine decision frameworks based on outcomes
                  </span>
                </li>
                <li className="flex items-start text-gray-600 dark:text-gray-400">
                  <span className="inline-block w-2 h-2 bg-[#ff6a1a] rounded-full mt-2 mr-3" />
                  <span>
                    <strong className="text-gray-900 dark:text-white">Human Oversight:</strong> Maintain human judgment for critical decisions
                  </span>
                </li>
              </ul>

              <h2 className="text-3xl font-bold mt-12 mb-6 text-gray-900 dark:text-white">Practical Applications</h2>
              <p className="mb-6 text-gray-600 dark:text-gray-400">
                We've seen companies across industries successfully implement AI-enhanced decision
                frameworks. From product roadmap prioritization to market expansion strategies,
                the combination of human insight and AI analysis consistently outperforms either
                approach alone.
              </p>
              <p className="mb-6 text-gray-600 dark:text-gray-400">
                The key is not to replace human decision-makers but to empower them with better
                tools, deeper insights, and more comprehensive analysis. This allows leaders to
                focus on what they do best: strategic thinking, stakeholder management, and
                creative problem-solving.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6 text-gray-900 dark:text-white">Looking Ahead</h2>
              <p className="mb-6 text-gray-600 dark:text-gray-400">
                As AI technology continues to advance, we'll see even more sophisticated decision
                support systems emerge. The organizations that thrive will be those that successfully
                integrate these tools into their culture while maintaining the human elements that
                drive innovation and growth.
              </p>
              <p className="mb-6 text-gray-600 dark:text-gray-400">
                The future of decision-making isn't about choosing between human intuition and AI
                analysis—it's about creating systems that leverage both to make better, faster,
                more informed decisions.
              </p>
            </div>

            <div className="flex items-center justify-between mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="hover:border-[#ff6a1a]/30 hover:text-[#ff6a1a]">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" size="sm" className="hover:border-[#ff6a1a]/30 hover:text-[#ff6a1a]">
                  <Bookmark className="w-4 h-4 mr-2" />
                  Bookmark
                </Button>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Related Posts</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((post, index) => (
                <motion.div
                  key={post.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                >
                  <Link href={`/blog/${post.slug}`}>
                    <div className="p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 hover:shadow-xl transition-all cursor-pointer group">
                      <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">
                        {post.category}
                      </span>
                      <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-[#ff6a1a] transition-colors">
                        {post.title}
                      </h4>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
