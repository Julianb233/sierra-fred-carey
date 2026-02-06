"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  LifeBuoy,
  MessageCircle,
  Book,
  Search,
  Zap,
  Shield,
  Settings,
  HelpCircle,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import Footer from "@/components/footer";

const categories = [
  { name: "Getting Started", icon: Zap, color: "bg-[#ff6a1a]" },
  { name: "Account & Billing", icon: Settings, color: "bg-orange-500" },
  { name: "Technical Issues", icon: Shield, color: "bg-amber-500" },
  { name: "Feature Requests", icon: HelpCircle, color: "bg-orange-600" },
];

const knowledgeBase = [
  { title: "How to create your first decision framework", category: "Getting Started", views: "1.2k" },
  { title: "Understanding pricing tiers", category: "Account & Billing", views: "890" },
  { title: "Troubleshooting login issues", category: "Technical Issues", views: "2.1k" },
  { title: "API integration guide", category: "Getting Started", views: "756" },
];

export default function SupportPage() {
  const [formData, setFormData] = useState({
    email: "",
    subject: "",
    category: "",
    priority: "medium",
    description: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setFormData({ email: "", subject: "", category: "", priority: "medium", description: "" });
      setSubmitted(false);
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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
              <LifeBuoy className="w-4 h-4" />
              Support Center
            </motion.span>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gray-900 dark:text-white">
              How Can We <span className="text-[#ff6a1a]">Help?</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              We&apos;re here to help. Get the support you need, when you need it.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Support Options */}
      <section className="relative z-10 px-4 mb-16">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-3 gap-6">
            {[
              {
                icon: MessageCircle,
                title: "Live Chat",
                description: "Chat with our support team",
                badge: "Available 24/7",
                color: "bg-[#ff6a1a]"
              },
              {
                icon: Book,
                title: "Documentation",
                description: "Browse our knowledge base",
                badge: "500+ Articles",
                color: "bg-orange-500"
              },
              {
                icon: LifeBuoy,
                title: "Submit Ticket",
                description: "Get personalized support",
                badge: "< 2hr Response",
                color: "bg-amber-500"
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 hover:shadow-xl transition-all"
              >
                <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mb-4`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{item.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{item.description}</p>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff6a1a]/10 text-sm font-medium text-[#ff6a1a]">
                  {item.badge}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="relative z-10 px-4 pb-16">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Support Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 shadow-xl">
                <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Submit a Support Ticket</h2>

                {submitted ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.2 }}
                    >
                      <CheckCircle2 className="w-20 h-20 text-green-500 mb-6" />
                    </motion.div>
                    <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Ticket Submitted!</h3>
                    <p className="text-gray-500 mb-2">
                      Your ticket #12345 has been created successfully.
                    </p>
                    <p className="text-sm text-gray-400">
                      We&apos;ll respond within 2 hours.
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white" htmlFor="email">
                        Email
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-[#ff6a1a] focus:ring-2 focus:ring-[#ff6a1a]/20 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
                        placeholder="your@email.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white" htmlFor="category">
                        Category
                      </label>
                      <select
                        id="category"
                        name="category"
                        required
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-[#ff6a1a] focus:ring-2 focus:ring-[#ff6a1a]/20 outline-none transition-all text-gray-900 dark:text-white"
                      >
                        <option value="">Select a category</option>
                        {categories.map((cat) => (
                          <option key={cat.name} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white" htmlFor="priority">
                        Priority
                      </label>
                      <select
                        id="priority"
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-[#ff6a1a] focus:ring-2 focus:ring-[#ff6a1a]/20 outline-none transition-all text-gray-900 dark:text-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white" htmlFor="subject">
                        Subject
                      </label>
                      <input
                        id="subject"
                        name="subject"
                        type="text"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-[#ff6a1a] focus:ring-2 focus:ring-[#ff6a1a]/20 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
                        placeholder="Brief description of your issue"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white" htmlFor="description">
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        required
                        value={formData.description}
                        onChange={handleChange}
                        rows={6}
                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-[#ff6a1a] focus:ring-2 focus:ring-[#ff6a1a]/20 outline-none transition-all resize-none text-gray-900 dark:text-white placeholder:text-gray-400"
                        placeholder="Provide detailed information about your issue..."
                      />
                    </div>

                    <Button type="submit" className="w-full bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25" size="lg">
                      Submit Ticket
                    </Button>
                  </form>
                )}
              </div>
            </motion.div>

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-6"
            >
              {/* Popular Topics */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800">
                <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Popular Topics</h3>
                <div className="grid grid-cols-2 gap-4">
                  {categories.map((category) => (
                    <motion.button
                      key={category.name}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-[#ff6a1a]/30 transition-all text-left"
                    >
                      <div className={`w-8 h-8 rounded-lg ${category.color} flex items-center justify-center mb-2`}>
                        <category.icon className="w-4 h-4 text-white" />
                      </div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{category.name}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Knowledge Base */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Knowledge Base</h3>
                  <Link href="/support">
                    <Button variant="ghost" size="sm" className="text-[#ff6a1a] hover:text-[#ea580c]">
                      View All
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
                <div className="space-y-4">
                  {knowledgeBase.map((article, index) => (
                    <motion.div
                      key={article.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-[#ff6a1a]/30 transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium mb-2 text-gray-900 dark:text-white">{article.title}</h4>
                          <div className="flex items-center space-x-3 text-sm text-gray-500">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs">
                              {article.category}
                            </span>
                            <span className="flex items-center">
                              <Search className="w-3 h-3 mr-1" />
                              {article.views}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Live Chat CTA */}
              <div className="bg-gradient-to-br from-[#ff6a1a]/10 to-orange-400/10 rounded-2xl p-8 border border-[#ff6a1a]/20">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-[#ff6a1a]/20 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-[#ff6a1a]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold mb-1 text-gray-900 dark:text-white">Need Immediate Help?</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Start a live chat with our support team</p>
                  </div>
                </div>
                <Button className="w-full mt-4 bg-[#ff6a1a] hover:bg-[#ea580c] text-white">
                  Start Live Chat
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
