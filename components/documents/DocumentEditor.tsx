"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DocumentEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

export function DocumentEditor({ content, onChange, readOnly = false }: DocumentEditorProps) {
  const [localContent, setLocalContent] = useState(content);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  useEffect(() => {
    if (localContent === content || readOnly) return;

    const timeout = setTimeout(() => {
      setIsAutoSaving(true);
      onChange(localContent);
      setTimeout(() => {
        setIsAutoSaving(false);
        setLastSaved(new Date());
      }, 500);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [localContent, content, onChange, readOnly]);

  return (
    <div className="relative">
      {/* Auto-save indicator */}
      <AnimatePresence>
        {!readOnly && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -top-12 right-0 flex items-center gap-2"
          >
            {isAutoSaving ? (
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Save className="w-3 h-3 mr-1" />
                </motion.div>
                Saving...
              </Badge>
            ) : lastSaved ? (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                <Save className="w-3 h-3 mr-1" />
                Saved {lastSaved.toLocaleTimeString()}
              </Badge>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor */}
      <div className="relative rounded-xl border border-border/50 bg-card/80 backdrop-blur-xl overflow-hidden">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-blue-500/10 px-6 py-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-sm font-medium text-muted-foreground ml-2">
                {readOnly ? "Document Viewer" : "Editor"}
              </span>
            </div>
            {!readOnly && (
              <Button variant="ghost" size="sm" className="h-7 gap-1">
                <Sparkles className="w-3 h-3" />
                AI Enhance
              </Button>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="p-6">
          {readOnly ? (
            <div
              className="prose prose-gray dark:prose-invert max-w-none
                prose-headings:font-bold prose-headings:tracking-tight
                prose-h1:text-3xl prose-h1:mb-4
                prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
                prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
                prose-p:text-base prose-p:leading-relaxed prose-p:mb-4
                prose-ul:my-4 prose-li:my-1
                prose-strong:font-semibold prose-strong:text-foreground
                prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded"
            >
              {content.split('\n').map((line, i) => {
                if (line.startsWith('# ')) {
                  return <h1 key={i}>{line.replace('# ', '')}</h1>;
                } else if (line.startsWith('## ')) {
                  return <h2 key={i}>{line.replace('## ', '')}</h2>;
                } else if (line.startsWith('### ')) {
                  return <h3 key={i}>{line.replace('### ', '')}</h3>;
                } else if (line.startsWith('- ')) {
                  return <li key={i}>{line.replace('- ', '')}</li>;
                } else if (line.trim()) {
                  return <p key={i}>{line}</p>;
                } else {
                  return <br key={i} />;
                }
              })}
            </div>
          ) : (
            <textarea
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              className="w-full min-h-[600px] bg-transparent border-none outline-none resize-none
                text-base leading-relaxed font-mono
                placeholder:text-muted-foreground/50"
              placeholder="Start writing your document...\n\n# Heading 1\n## Heading 2\n- Bullet point"
            />
          )}
        </div>
      </div>
    </div>
  );
}
