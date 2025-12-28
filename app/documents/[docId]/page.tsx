"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Edit3, Eye, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentEditor } from "@/components/documents/DocumentEditor";
import { ExportMenu } from "@/components/documents/ExportMenu";
import { mockDocuments, documentTypes } from "@/lib/document-types";
import Link from "next/link";
import Footer from "@/components/footer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DocumentViewerPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.docId as string;

  const document = mockDocuments.find((d) => d.id === docId);
  const typeConfig = document ? documentTypes.find((t) => t.id === document.type) : null;

  const [isEditMode, setIsEditMode] = useState(false);
  const [content, setContent] = useState(document?.content || "");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (!document || !typeConfig) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Document not found</h1>
          <Link href="/documents">
            <Button className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white">Back to Documents</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = {
    draft: {
      label: "Draft",
      color: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    },
    "in-progress": {
      label: "In Progress",
      color: "bg-[#ff6a1a]/10 text-[#ff6a1a]",
    },
    completed: {
      label: "Completed",
      color: "bg-green-500/10 text-green-600 dark:text-green-400",
    },
  };

  const handleDelete = () => {
    // In real app, this would delete the document
    router.push("/documents");
  };

  const handleShare = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    alert("Link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-[150px]" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/documents">
                <Button variant="ghost" size="sm" className="gap-2 text-gray-600 dark:text-gray-400 hover:text-[#ff6a1a]">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ff6a1a] to-orange-500 flex items-center justify-center text-2xl shadow-lg">
                  {typeConfig.icon}
                </div>
                <div>
                  <h1 className="font-semibold text-lg text-gray-900 dark:text-white">{document.title}</h1>
                  <p className="text-xs text-gray-500">{typeConfig.title}</p>
                </div>
              </div>
              <Badge variant="secondary" className={statusConfig[document.status].color}>
                {statusConfig[document.status].label}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
                className="gap-2 hover:border-[#ff6a1a]/30 hover:text-[#ff6a1a]"
              >
                {isEditMode ? (
                  <>
                    <Eye className="w-4 h-4" />
                    View
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </>
                )}
              </Button>
              <ExportMenu content={content} title={document.title} />
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="gap-2 hover:border-[#ff6a1a]/30 hover:text-[#ff6a1a]"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2 text-red-500 hover:bg-red-500/10 hover:border-red-500/30"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-12 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Document metadata */}
          <div className="mb-8 p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500 mb-1">Created</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {new Date(document.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">Updated</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {new Date(document.updatedAt).toLocaleDateString()}
                </div>
              </div>
              {document.businessContext?.companyName && (
                <div>
                  <div className="text-gray-500 mb-1">Company</div>
                  <div className="font-medium text-gray-900 dark:text-white">{document.businessContext.companyName}</div>
                </div>
              )}
              {document.businessContext?.industry && (
                <div>
                  <div className="text-gray-500 mb-1">Industry</div>
                  <div className="font-medium text-gray-900 dark:text-white">{document.businessContext.industry}</div>
                </div>
              )}
            </div>
          </div>

          {/* Document editor */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <DocumentEditor
              content={content}
              onChange={setContent}
              readOnly={!isEditMode}
            />
          </div>
        </motion.div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Delete Document</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete "{document.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="hover:border-gray-300 dark:hover:border-gray-700">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
