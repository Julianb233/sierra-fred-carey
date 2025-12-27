"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { GlassCard3D } from "@/components/premium/Card3D";
import { GradientBg, FloatingOrbs } from "@/components/premium/GradientBg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ArrowRight, Search } from "lucide-react";
import Link from "next/link";

const categories = ["All", "Product", "Engineering", "Decision Science", "Case Studies"];

const featuredPost = {
  slug: "future-of-decision-making",
  title: "The Future of Decision-Making in the AI Era",
  excerpt: "Explore how artificial intelligence is transforming the way founders and executives make critical business decisions.",
  author: "Fred Carey",
  date: "Dec 20, 2024",
  readTime: "8 min read",
  category: "Decision Science",
  image: "featured",
};

const posts = [
  {
    slug: "scaling-decision-frameworks",
    title: "Scaling Decision Frameworks Across Your Organization",
    excerpt: "Learn how to implement consistent decision-making processes as your company grows.",
    author: "Sarah Chen",
    date: "Dec 18, 2024",
    readTime: "6 min read",
    category: "Product",
  },
  {
    slug: "roi-better-decisions",
    title: "The ROI of Better Decisions: A Data-Driven Analysis",
    excerpt: "Quantifying the impact of improved decision-making on business outcomes.",
    author: "Michael Torres",
    date: "Dec 15, 2024",
    readTime: "10 min read",
    category: "Case Studies",
  },
  {
    slug: "engineering-decision-os",
    title: "Engineering Behind Decision OS: Technical Deep Dive",
    excerpt: "A look under the hood at how we built a scalable decision intelligence platform.",
    author: "Alex Kim",
    date: "Dec 12, 2024",
    readTime: "12 min read",
    category: "Engineering",
  },
  {
    slug: "founder-decision-paralysis",
    title: "Overcoming Decision Paralysis as a Founder",
    excerpt: "Practical strategies to break through analysis paralysis and move forward confidently.",
    author: "Fred Carey",
    date: "Dec 10, 2024",
    readTime: "7 min read",
    category: "Decision Science",
  },
  {
    slug: "integrating-decision-workflows",
    title: "Integrating Decision Workflows into Your Existing Stack",
    excerpt: "Step-by-step guide to seamlessly integrate Decision OS with your tools.",
    author: "Sarah Chen",
    date: "Dec 8, 2024",
    readTime: "5 min read",
    category: "Product",
  },
  {
    slug: "case-study-series-a-pivot",
    title: "Case Study: How a Series A Startup Pivoted Successfully",
    excerpt: "Real-world example of using data-driven decision frameworks during a major pivot.",
    author: "Michael Torres",
    date: "Dec 5, 2024",
    readTime: "9 min read",
    category: "Case Studies",
  },
];

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPosts = posts.filter((post) => {
    const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <GradientBg variant="mesh" />
      <FloatingOrbs />

      <div className="relative z-10 container mx-auto px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-blue-400 to-purple-500 bg-clip-text text-transparent">
            Blog
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Insights on decision-making, product development, and building better businesses.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-16"
        >
          <Link href={`/blog/${featuredPost.slug}`}>
            <GlassCard3D className="overflow-hidden group cursor-pointer">
              <div className="grid md:grid-cols-2 gap-8 p-8">
                <div className="flex flex-col justify-center">
                  <Badge className="w-fit mb-4">{featuredPost.category}</Badge>
                  <h2 className="text-3xl md:text-4xl font-bold mb-4 group-hover:text-primary transition-colors">
                    {featuredPost.title}
                  </h2>
                  <p className="text-lg text-muted-foreground mb-6">
                    {featuredPost.excerpt}
                  </p>
                  <div className="flex items-center space-x-6 text-sm text-muted-foreground mb-6">
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {featuredPost.date}
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      {featuredPost.readTime}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500" />
                    <div>
                      <p className="font-medium">{featuredPost.author}</p>
                      <p className="text-sm text-muted-foreground">Founder & CEO</p>
                    </div>
                  </div>
                </div>
                <div className="aspect-video rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                  <div className="text-6xl">📊</div>
                </div>
              </div>
            </GlassCard3D>
          </Link>
        </motion.div>

        <div className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                size="sm"
              >
                {category}
              </Button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-background/50 border border-border/50 backdrop-blur-sm
                focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
                transition-all duration-300"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post, index) => (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Link href={`/blog/${post.slug}`}>
                <GlassCard3D className="h-full group cursor-pointer hover:shadow-2xl transition-shadow duration-300">
                  <div className="aspect-video rounded-t-lg bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                    <div className="text-4xl">
                      {post.category === "Engineering" ? "⚙️" :
                       post.category === "Product" ? "🚀" :
                       post.category === "Case Studies" ? "📈" : "🧠"}
                    </div>
                  </div>
                  <div className="p-6">
                    <Badge variant="secondary" className="mb-3">{post.category}</Badge>
                    <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {post.date}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {post.readTime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{post.author}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </GlassCard3D>
              </Link>
            </motion.div>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No posts found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
