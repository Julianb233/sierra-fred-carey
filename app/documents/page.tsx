"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Filter, FileText, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { mockDocuments, documentTypes } from "@/lib/document-types";
import Link from "next/link";

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);

  const filteredDocuments = mockDocuments.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !filterType || doc.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: mockDocuments.length,
    completed: mockDocuments.filter((d) => d.status === "completed").length,
    inProgress: mockDocuments.filter((d) => d.status === "in-progress").length,
    draft: mockDocuments.filter((d) => d.status === "draft").length,
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <div className="relative border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
        <div className="relative container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Strategy <span className="text-[#ff6a1a]">Documents</span>
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  AI-powered strategic documents for founder decision-making
                </p>
              </div>
              <Link href="/documents/new">
                <Button
                  size="lg"
                  className="gap-2 bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25 hover:shadow-[#ff6a1a]/40"
                >
                  <Plus className="w-5 h-5" />
                  Create Document
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#ff6a1a] flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                    <div className="text-xs text-gray-500">Total Documents</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-green-500/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</div>
                    <div className="text-xs text-gray-500">Completed</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-orange-500/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</div>
                    <div className="text-xs text-gray-500">In Progress</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-500/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-500 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.draft}</div>
                    <div className="text-xs text-gray-500">Drafts</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Filters and search */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:border-[#ff6a1a] focus:ring-2 focus:ring-[#ff6a1a]/20 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
            />
          </div>

          {/* Type filter */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filterType === null ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(null)}
              className={`gap-1 ${filterType === null ? "bg-[#ff6a1a] hover:bg-[#ea580c] text-white" : ""}`}
            >
              <Filter className="w-4 h-4" />
              All
            </Button>
            {documentTypes.map((type) => (
              <Button
                key={type.id}
                variant={filterType === type.id ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType(type.id)}
                className={`gap-1 ${filterType === type.id ? "bg-[#ff6a1a] hover:bg-[#ea580c] text-white" : ""}`}
              >
                <span>{type.icon}</span>
                {type.title}
              </Button>
            ))}
          </div>
        </div>

        {/* Document types showcase */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Document Types</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {documentTypes.map((type, index) => (
              <Link key={type.id} href={`/documents/new?type=${type.id}`}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -4 }}
                  className="group p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 transition-all cursor-pointer hover:shadow-xl"
                >
                  <div className="text-4xl mb-3">{type.icon}</div>
                  <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white group-hover:text-[#ff6a1a] transition-colors">
                    {type.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {type.description}
                  </p>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Documents list */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Your Documents</h2>
          {filteredDocuments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocuments.map((doc, index) => (
                <DocumentCard key={doc.id} document={doc} index={index} />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 px-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
            >
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">No documents found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchQuery || filterType
                  ? "Try adjusting your search or filters"
                  : "Create your first strategy document to get started"}
              </p>
              {!searchQuery && !filterType && (
                <Link href="/documents/new">
                  <Button className="gap-2 bg-[#ff6a1a] hover:bg-[#ea580c] text-white">
                    <Plus className="w-4 h-4" />
                    Create Document
                  </Button>
                </Link>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
