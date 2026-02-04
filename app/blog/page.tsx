"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ArrowRight, Search, BookOpen } from "lucide-react";
import Link from "next/link";
import Footer from "@/components/footer";

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
    <div className="min-h-screen bg-white dark:bg-gray-950 relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-[150px]" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 text-sm font-medium text-[#ff6a1a] mb-6"
            >
              <BookOpen className="w-4 h-4" />
              Fred Carey Blog
            </motion.span>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gray-900 dark:text-white">
              Insights for <span className="text-[#ff6a1a]">Founders</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Insights on decision-making, product development, and building better businesses.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Featured Post */}
      <section className="relative z-10 px-4 mb-16">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link href={`/blog/${featuredPost.slug}`}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden group cursor-pointer hover:border-[#ff6a1a]/30 transition-all">
                <div className="grid md:grid-cols-2 gap-8 p-8">
                  <div className="flex flex-col justify-center">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff6a1a]/10 text-sm font-medium text-[#ff6a1a] w-fit mb-4">
                      {featuredPost.category}
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white group-hover:text-[#ff6a1a] transition-colors">
                      {featuredPost.title}
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                      {featuredPost.excerpt}
                    </p>
                    <div className="flex items-center space-x-6 text-sm text-gray-500 mb-6">
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
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff6a1a] to-orange-500" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{featuredPost.author}</p>
                        <p className="text-sm text-gray-500">Founder & CEO</p>
                      </div>
                    </div>
                  </div>
                  <div className="aspect-video rounded-xl bg-gradient-to-br from-[#ff6a1a]/20 to-orange-400/20 flex items-center justify-center border border-[#ff6a1a]/10">
                    <div className="text-6xl">📊</div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="relative z-10 px-4 mb-12">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category)}
                  size="sm"
                  className={selectedCategory === category ? "bg-[#ff6a1a] hover:bg-[#ea580c] text-white" : ""}
                >
                  {category}
                </Button>
              ))}
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:border-[#ff6a1a] focus:ring-2 focus:ring-[#ff6a1a]/20 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="relative z-10 px-4 pb-16">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post, index) => (
              <motion.div
                key={post.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Link href={`/blog/${post.slug}`}>
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden group cursor-pointer hover:border-[#ff6a1a]/30 hover:shadow-xl transition-all h-full">
                    <div className="aspect-video bg-gradient-to-br from-[#ff6a1a]/10 to-orange-400/10 flex items-center justify-center">
                      <div className="text-4xl">
                        {post.category === "Engineering" ? "⚙️" :
                         post.category === "Product" ? "🚀" :
                         post.category === "Case Studies" ? "📈" : "🧠"}
                      </div>
                    </div>
                    <div className="p-6">
                      <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">
                        {post.category}
                      </span>
                      <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white group-hover:text-[#ff6a1a] transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
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
                        <span className="font-medium text-sm text-gray-900 dark:text-white">{post.author}</span>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 group-hover:text-[#ff6a1a] transition-all" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {filteredPosts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No posts found matching your criteria.</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
