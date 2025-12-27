"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { documentTypes, DocumentTypeConfig } from "@/lib/document-types";
import Link from "next/link";

function DocumentGeneratorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const typeParam = searchParams.get("type");
  
  const [selectedType, setSelectedType] = useState<DocumentTypeConfig | null>(
    typeParam ? documentTypes.find((t) => t.id === typeParam) || null : null
  );
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);
  const [tags, setTags] = useState<Record<string, string[]>>({});
  const [currentTag, setCurrentTag] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeParam && !selectedType) {
      const type = documentTypes.find((t) => t.id === typeParam);
      if (type) setSelectedType(type);
    }
  }, [typeParam, selectedType]);

  const handleInputChange = (id: string, value: any) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleAddTag = (inputId: string) => {
    const tag = currentTag[inputId]?.trim();
    if (tag) {
      setTags((prev) => ({
        ...prev,
        [inputId]: [...(prev[inputId] || []), tag],
      }));
      setCurrentTag((prev) => ({ ...prev, [inputId]: "" }));
      handleInputChange(inputId, [...(tags[inputId] || []), tag]);
    }
  };

  const handleRemoveTag = (inputId: string, index: number) => {
    const newTags = tags[inputId].filter((_, i) => i !== index);
    setTags((prev) => ({ ...prev, [inputId]: newTags }));
    handleInputChange(inputId, newTags);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    // Simulate AI generation
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    // Mock generated content based on type
    const mockContent = `# ${selectedType?.title} - ${formData.companyName || formData.role || "Strategic Document"}\n\n## Executive Summary\nThis document provides a comprehensive analysis based on your inputs...\n\n## Key Insights\n- Strategic insight 1\n- Strategic insight 2\n- Strategic insight 3\n\n## Detailed Analysis\nBased on the information provided, we recommend...`;
    
    setGeneratedDoc(mockContent);
    setIsGenerating(false);
    
    // Redirect to the new document
    setTimeout(() => {
      router.push("/documents/doc-5"); // In real app, use actual doc ID
    }, 1500);
  };

  const canGenerate = selectedType?.inputs.every((input) => {
    if (!input.required) return true;
    const value = formData[input.id];
    return value && (Array.isArray(value) ? value.length > 0 : value.trim() !== "");
  }) || false;

  if (!selectedType) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4">
          <Link href="/documents">
            <Button variant="ghost" className="mb-8 gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Documents
            </Button>
          </Link>

          <div className="mb-12">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-blue-500 bg-clip-text text-transparent mb-4">
              Choose Document Type
            </h1>
            <p className="text-lg text-muted-foreground">
              Select the type of strategic document you want to create
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {documentTypes.map((type, index) => (
              <motion.div
                key={type.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedType(type)}
                className="group cursor-pointer"
              >
                <div className="p-8 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 hover:border-primary/30 transition-all hover:shadow-xl hover:-translate-y-2">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${type.gradientFrom} ${type.gradientTo} text-4xl mb-4 shadow-lg`}>
                    {type.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {type.title}
                  </h3>
                  <p className="text-muted-foreground mb-4">{type.description}</p>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {type.inputs.length} inputs required
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <Link href="/documents">
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Documents
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${selectedType.gradientFrom} ${selectedType.gradientTo} flex items-center justify-center text-3xl shadow-lg`}>
                  {selectedType.icon}
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{selectedType.title}</h1>
                  <p className="text-muted-foreground">{selectedType.description}</p>
                </div>
              </div>
            </motion.div>

            <div className="space-y-6">
              {selectedType.inputs.map((input, index) => (
                <motion.div
                  key={input.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 rounded-xl bg-card/80 backdrop-blur-xl border border-border/50"
                >
                  <label className="block mb-2">
                    <span className="font-semibold">
                      {input.label}
                      {input.required && <span className="text-red-500 ml-1">*</span>}
                    </span>
                  </label>

                  {input.type === "text" && (
                    <input
                      type="text"
                      placeholder={input.placeholder}
                      value={formData[input.id] || ""}
                      onChange={(e) => handleInputChange(input.id, e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-background border border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  )}

                  {input.type === "textarea" && (
                    <textarea
                      placeholder={input.placeholder}
                      value={formData[input.id] || ""}
                      onChange={(e) => handleInputChange(input.id, e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 rounded-lg bg-background border border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                    />
                  )}

                  {input.type === "tags" && (
                    <div>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          placeholder={input.placeholder}
                          value={currentTag[input.id] || ""}
                          onChange={(e) =>
                            setCurrentTag((prev) => ({ ...prev, [input.id]: e.target.value }))
                          }
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddTag(input.id);
                            }
                          }}
                          className="flex-1 px-4 py-2 rounded-lg bg-background border border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAddTag(input.id)}
                        >
                          Add
                        </Button>
                      </div>
                      {tags[input.id]?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {tags[input.id].map((tag, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="gap-1 cursor-pointer hover:bg-destructive/20"
                              onClick={() => handleRemoveTag(input.id, i)}
                            >
                              {tag}
                              <span className="text-xs">×</span>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8"
            >
              <Button
                size="lg"
                className="w-full gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 shadow-lg shadow-primary/25"
                onClick={handleGenerate}
                disabled={!canGenerate || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Document...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate with AI
                  </>
                )}
              </Button>
            </motion.div>
          </div>

          {/* Preview */}
          <div className="lg:sticky lg:top-8 h-fit">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-8 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50"
            >
              <h2 className="text-xl font-bold mb-4">Preview</h2>
              
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div
                    key="generating"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-12"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="w-12 h-12 text-primary mb-4" />
                    </motion.div>
                    <p className="text-muted-foreground">AI is generating your document...</p>
                  </motion.div>
                ) : generatedDoc ? (
                  <motion.div
                    key="generated"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-center py-12"
                  >
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Document Generated!</h3>
                    <p className="text-muted-foreground">Redirecting to your new document...</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-muted-foreground/50"
                  >
                    <p className="mb-4">Fill out the form to see a preview of your document.</p>
                    <div className="space-y-3">
                      <div className="h-4 bg-muted-foreground/10 rounded animate-pulse" />
                      <div className="h-4 bg-muted-foreground/10 rounded animate-pulse w-3/4" />
                      <div className="h-4 bg-muted-foreground/10 rounded animate-pulse w-5/6" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DocumentGeneratorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <DocumentGeneratorContent />
    </Suspense>
  );
}
