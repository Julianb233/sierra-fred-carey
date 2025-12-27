"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { GlassCard3D } from "@/components/premium/Card3D";
import { GradientBg, FloatingOrbs } from "@/components/premium/GradientBg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const categories = [
  { name: "Getting Started", icon: Zap, color: "primary" },
  { name: "Account & Billing", icon: Settings, color: "blue" },
  { name: "Technical Issues", icon: Shield, color: "purple" },
  { name: "Feature Requests", icon: HelpCircle, color: "green" },
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
    <div className="relative min-h-screen overflow-hidden bg-background">
      <GradientBg variant="aurora" />
      <FloatingOrbs />

      <div className="relative z-10 container mx-auto px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-purple-400 to-blue-500 bg-clip-text text-transparent">
            Support Center
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We're here to help. Get the support you need, when you need it.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 mb-12">
          {[
            {
              icon: MessageCircle,
              title: "Live Chat",
              description: "Chat with our support team",
              badge: "Available 24/7",
              color: "primary"
            },
            {
              icon: Book,
              title: "Documentation",
              description: "Browse our knowledge base",
              badge: "500+ Articles",
              color: "blue"
            },
            {
              icon: LifeBuoy,
              title: "Submit Ticket",
              description: "Get personalized support",
              badge: "< 2hr Response",
              color: "purple"
            },
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <GlassCard3D className="p-6 hover:shadow-2xl transition-shadow duration-300 h-full">
                <div className={`w-12 h-12 rounded-lg bg-${item.color}-500/10 flex items-center justify-center mb-4`}>
                  <item.icon className={`w-6 h-6 text-${item.color}-500`} />
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-muted-foreground mb-4">{item.description}</p>
                <Badge variant="secondary">{item.badge}</Badge>
              </GlassCard3D>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <GlassCard3D className="p-8">
              <h2 className="text-3xl font-bold mb-6">Submit a Support Ticket</h2>

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
                  <h3 className="text-2xl font-bold mb-4">Ticket Submitted!</h3>
                  <p className="text-muted-foreground mb-2">
                    Your ticket #12345 has been created successfully.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    We'll respond within 2 hours.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2" htmlFor="email">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg bg-background/50 border border-border/50 backdrop-blur-sm
                        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
                        transition-all duration-300"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" htmlFor="category">
                      Category
                    </label>
                    <select
                      id="category"
                      name="category"
                      required
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg bg-background/50 border border-border/50 backdrop-blur-sm
                        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
                        transition-all duration-300"
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
                    <label className="block text-sm font-medium mb-2" htmlFor="priority">
                      Priority
                    </label>
                    <select
                      id="priority"
                      name="priority"
                      value={formData.priority}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg bg-background/50 border border-border/50 backdrop-blur-sm
                        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
                        transition-all duration-300"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" htmlFor="subject">
                      Subject
                    </label>
                    <input
                      id="subject"
                      name="subject"
                      type="text"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg bg-background/50 border border-border/50 backdrop-blur-sm
                        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
                        transition-all duration-300"
                      placeholder="Brief description of your issue"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" htmlFor="description">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      required
                      value={formData.description}
                      onChange={handleChange}
                      rows={6}
                      className="w-full px-4 py-3 rounded-lg bg-background/50 border border-border/50 backdrop-blur-sm
                        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
                        transition-all duration-300 resize-none"
                      placeholder="Provide detailed information about your issue..."
                    />
                  </div>

                  <Button type="submit" className="w-full" size="lg">
                    Submit Ticket
                  </Button>
                </form>
              )}
            </GlassCard3D>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="space-y-6"
          >
            <GlassCard3D className="p-8">
              <h3 className="text-2xl font-bold mb-6">Popular Topics</h3>
              <div className="grid grid-cols-2 gap-4">
                {categories.map((category) => (
                  <motion.button
                    key={category.name}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-4 rounded-lg bg-background/50 border border-border/50
                      hover:border-primary/50 transition-all duration-300 text-left"
                  >
                    <category.icon className="w-6 h-6 text-primary mb-2" />
                    <p className="font-medium text-sm">{category.name}</p>
                  </motion.button>
                ))}
              </div>
            </GlassCard3D>

            <GlassCard3D className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Knowledge Base</h3>
                <Link href="/faq">
                  <Button variant="ghost" size="sm">
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
                    className="p-4 rounded-lg bg-background/30 hover:bg-background/50
                      border border-border/30 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium mb-2">{article.title}</h4>
                        <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                          <Badge variant="secondary">{article.category}</Badge>
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
            </GlassCard3D>

            <GlassCard3D className="p-8 bg-gradient-to-br from-primary/10 to-purple-500/10">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold mb-1">Need Immediate Help?</h4>
                  <p className="text-sm text-muted-foreground">Start a live chat with our support team</p>
                </div>
              </div>
              <Button className="w-full mt-4" variant="outline">
                Start Live Chat
              </Button>
            </GlassCard3D>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
