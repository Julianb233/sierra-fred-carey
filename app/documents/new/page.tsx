"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { documentTypes, DocumentTypeConfig } from "@/lib/document-types";
import Link from "next/link";
import Footer from "@/components/footer";

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
      <div className="min-h-screen bg-white dark:bg-gray-950 relative overflow-hidden">
        {/* Background blobs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
          <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-[150px]" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-12">
          <Link href="/documents">
            <Button variant="ghost" className="mb-8 gap-2 text-gray-600 dark:text-gray-400 hover:text-[#ff6a1a]">
              <ArrowLeft className="w-4 h-4" />
              Back to Documents
            </Button>
          </Link>

          <div className="mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Choose <span className="text-[#ff6a1a]">Document Type</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
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
                <div className="p-8 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30 transition-all hover:shadow-xl hover:-translate-y-2">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff6a1a] to-orange-500 text-4xl mb-4 shadow-lg`}>
                    {type.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white group-hover:text-[#ff6a1a] transition-colors">
                    {type.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{type.description}</p>
                  <Badge variant="secondary" className="bg-[#ff6a1a]/10 text-[#ff6a1a]">
                    {type.inputs.length} inputs required
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-[#ff6a1a]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-orange-400/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-5xl">
        <Link href="/documents">
          <Button variant="ghost" className="mb-8 gap-2 text-gray-600 dark:text-gray-400 hover:text-[#ff6a1a]">
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
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br from-[#ff6a1a] to-orange-500 flex items-center justify-center text-3xl shadow-lg`}>
                  {selectedType.icon}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{selectedType.title}</h1>
                  <p className="text-gray-600 dark:text-gray-400">{selectedType.description}</p>
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
                  className="p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                >
                  <label className="block mb-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
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
                      className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-[#ff6a1a] focus:ring-2 focus:ring-[#ff6a1a]/20 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
                    />
                  )}

                  {input.type === "textarea" && (
                    <textarea
                      placeholder={input.placeholder}
                      value={formData[input.id] || ""}
                      onChange={(e) => handleInputChange(input.id, e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-[#ff6a1a] focus:ring-2 focus:ring-[#ff6a1a]/20 outline-none transition-all resize-none text-gray-900 dark:text-white placeholder:text-gray-400"
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
                          className="flex-1 px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-[#ff6a1a] focus:ring-2 focus:ring-[#ff6a1a]/20 outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAddTag(input.id)}
                          className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
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
                              className="gap-1 cursor-pointer bg-[#ff6a1a]/10 text-[#ff6a1a] hover:bg-red-500/20"
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
                className="w-full gap-2 bg-[#ff6a1a] hover:bg-[#ea580c] text-white shadow-lg shadow-[#ff6a1a]/25"
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
              className="p-8 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
            >
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Preview</h2>

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
                      <Sparkles className="w-12 h-12 text-[#ff6a1a] mb-4" />
                    </motion.div>
                    <p className="text-gray-500">AI is generating your document...</p>
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
                    <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Document Generated!</h3>
                    <p className="text-gray-500">Redirecting to your new document...</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-gray-400"
                  >
                    <p className="mb-4">Fill out the form to see a preview of your document.</p>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/4" />
                      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-5/6" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function DocumentGeneratorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff6a1a]" />
      </div>
    }>
      <DocumentGeneratorContent />
    </Suspense>
  );
}
