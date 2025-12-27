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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Document not found</h1>
          <Link href="/documents">
            <Button>Back to Documents</Button>
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
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/documents">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${typeConfig.gradientFrom} ${typeConfig.gradientTo} flex items-center justify-center text-2xl shadow-lg`}>
                  {typeConfig.icon}
                </div>
                <div>
                  <h1 className="font-semibold text-lg">{document.title}</h1>
                  <p className="text-xs text-muted-foreground">{typeConfig.title}</p>
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
                className="gap-2"
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
                className="gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Document metadata */}
          <div className="mb-8 p-6 rounded-xl bg-card/80 backdrop-blur-xl border border-border/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground mb-1">Created</div>
                <div className="font-medium">
                  {new Date(document.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Updated</div>
                <div className="font-medium">
                  {new Date(document.updatedAt).toLocaleDateString()}
                </div>
              </div>
              {document.businessContext?.companyName && (
                <div>
                  <div className="text-muted-foreground mb-1">Company</div>
                  <div className="font-medium">{document.businessContext.companyName}</div>
                </div>
              )}
              {document.businessContext?.industry && (
                <div>
                  <div className="text-muted-foreground mb-1">Industry</div>
                  <div className="font-medium">{document.businessContext.industry}</div>
                </div>
              )}
            </div>
          </div>

          {/* Document editor */}
          <DocumentEditor
            content={content}
            onChange={setContent}
            readOnly={!isEditMode}
          />
        </motion.div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{document.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
