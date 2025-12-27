"use client";

import { motion } from "framer-motion";
import { FileText, Clock, CheckCircle2, Circle } from "lucide-react";
import { Document, documentTypes } from "@/lib/document-types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface DocumentCardProps {
  document: Document;
  index: number;
}

export function DocumentCard({ document, index }: DocumentCardProps) {
  const typeConfig = documentTypes.find((t) => t.id === document.type);
  
  const statusConfig = {
    draft: {
      icon: Circle,
      label: "Draft",
      color: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    },
    "in-progress": {
      icon: Clock,
      label: "In Progress",
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    completed: {
      icon: CheckCircle2,
      label: "Completed",
      color: "bg-green-500/10 text-green-600 dark:text-green-400",
    },
  };

  const status = statusConfig[document.status];
  const StatusIcon = status.icon;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
    >
      <Link href={`/documents/${document.id}`}>
        <Card className="group relative overflow-hidden border border-border/50 bg-card/80 backdrop-blur-xl hover:border-primary/30 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10">
          {/* Gradient overlay */}
          <div
            className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${typeConfig?.gradientFrom} ${typeConfig?.gradientTo} blur-3xl -z-10`}
            style={{ transform: "scale(0.8)" }}
          />

          {/* Content */}
          <div className="relative p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <motion.div
                  className={`text-3xl w-12 h-12 rounded-xl bg-gradient-to-br ${typeConfig?.gradientFrom} ${typeConfig?.gradientTo} flex items-center justify-center shadow-lg`}
                  whileHover={{ rotate: [0, -10, 10, -10, 0], transition: { duration: 0.5 } }}
                >
                  {typeConfig?.icon}
                </motion.div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                    {document.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {typeConfig?.title}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className={status.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>

            {/* Preview */}
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {document.content.split('\n').find((line) => line.trim() && !line.startsWith('#'))?.trim() || 'No preview available'}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(document.updatedAt)}
              </div>
              <motion.div
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                initial={false}
              >
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  <FileText className="w-3 h-3 mr-1" />
                  Open
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Glassmorphism shine effect */}
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300"
            style={{
              background:
                "radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.1) 0%, transparent 50%)",
            }}
          />
        </Card>
      </Link>
    </motion.div>
  );
}
