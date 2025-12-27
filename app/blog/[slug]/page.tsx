"use client";

import { motion } from "framer-motion";
import { GlassCard3D } from "@/components/premium/Card3D";
import { GradientBg, FloatingOrbs } from "@/components/premium/GradientBg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ArrowLeft, Share2, Bookmark } from "lucide-react";
import Link from "next/link";

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

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <GradientBg variant="aurora" />
      <FloatingOrbs />

      <div className="relative z-10 container mx-auto px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <Link href="/blog">
            <Button variant="ghost" className="mb-8">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>

          <GlassCard3D className="p-8 md:p-12 mb-8">
            <Badge className="mb-4">Decision Science</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              The Future of Decision-Making in the AI Era
            </h1>
            
            <div className="flex items-center justify-between mb-8 pb-8 border-b border-border/50">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500" />
                <div>
                  <p className="font-semibold">Fred Carey</p>
                  <p className="text-sm text-muted-foreground">Founder & CEO</p>
                </div>
              </div>
              <div className="flex items-center space-x-6 text-sm text-muted-foreground">
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

            <div className="aspect-video rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mb-12">
              <div className="text-8xl">📊</div>
            </div>

            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p className="text-xl text-muted-foreground mb-8">
                As artificial intelligence continues to reshape the business landscape, 
                the way we make decisions is undergoing a fundamental transformation. 
                This shift isn't just about automation—it's about augmentation.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">The Evolution of Decision-Making</h2>
              <p className="mb-6">
                Traditional decision-making processes relied heavily on intuition, past experience, 
                and limited data analysis. While these elements remain valuable, they're no longer 
                sufficient in today's fast-paced, data-rich environment.
              </p>
              <p className="mb-6">
                Modern decision frameworks combine human judgment with AI-powered insights to create 
                a more robust and reliable decision-making process. This hybrid approach leverages 
                the best of both worlds: human creativity and contextual understanding, paired with 
                AI's ability to process vast amounts of data and identify patterns.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">Key Principles for AI-Enhanced Decisions</h2>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-primary rounded-full mt-2 mr-3" />
                  <span>
                    <strong>Transparency:</strong> Understand how AI arrives at recommendations
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-primary rounded-full mt-2 mr-3" />
                  <span>
                    <strong>Context:</strong> Provide AI with relevant business context and constraints
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-primary rounded-full mt-2 mr-3" />
                  <span>
                    <strong>Iteration:</strong> Continuously refine decision frameworks based on outcomes
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-primary rounded-full mt-2 mr-3" />
                  <span>
                    <strong>Human Oversight:</strong> Maintain human judgment for critical decisions
                  </span>
                </li>
              </ul>

              <h2 className="text-3xl font-bold mt-12 mb-6">Practical Applications</h2>
              <p className="mb-6">
                We've seen companies across industries successfully implement AI-enhanced decision 
                frameworks. From product roadmap prioritization to market expansion strategies, 
                the combination of human insight and AI analysis consistently outperforms either 
                approach alone.
              </p>
              <p className="mb-6">
                The key is not to replace human decision-makers but to empower them with better 
                tools, deeper insights, and more comprehensive analysis. This allows leaders to 
                focus on what they do best: strategic thinking, stakeholder management, and 
                creative problem-solving.
              </p>

              <h2 className="text-3xl font-bold mt-12 mb-6">Looking Ahead</h2>
              <p className="mb-6">
                As AI technology continues to advance, we'll see even more sophisticated decision 
                support systems emerge. The organizations that thrive will be those that successfully 
                integrate these tools into their culture while maintaining the human elements that 
                drive innovation and growth.
              </p>
              <p className="mb-6">
                The future of decision-making isn't about choosing between human intuition and AI 
                analysis—it's about creating systems that leverage both to make better, faster, 
                more informed decisions.
              </p>
            </div>

            <div className="flex items-center justify-between mt-12 pt-8 border-t border-border/50">
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" size="sm">
                  <Bookmark className="w-4 h-4 mr-2" />
                  Bookmark
                </Button>
              </div>
            </div>
          </GlassCard3D>

          <div className="mb-12">
            <h3 className="text-2xl font-bold mb-6">Related Posts</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((post, index) => (
                <motion.div
                  key={post.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                >
                  <Link href={`/blog/${post.slug}`}>
                    <GlassCard3D className="p-6 hover:shadow-2xl transition-shadow duration-300 cursor-pointer group">
                      <Badge variant="secondary" className="mb-3">{post.category}</Badge>
                      <h4 className="font-bold group-hover:text-primary transition-colors">
                        {post.title}
                      </h4>
                    </GlassCard3D>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
