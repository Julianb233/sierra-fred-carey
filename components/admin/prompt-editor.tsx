"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface PromptEditorProps {
  prompt?: {
    name: string;
    category: string;
    content: string;
    version: number;
  };
  isOpen: boolean;
  onClose: () => void;
  onSave: (prompt: {
    name: string;
    category: string;
    content: string;
  }) => void;
}

export function PromptEditor({
  prompt,
  isOpen,
  onClose,
  onSave,
}: PromptEditorProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (prompt) {
      setName(prompt.name);
      setCategory(prompt.category);
      setContent(prompt.content);
    } else {
      setName("");
      setCategory("");
      setContent("");
    }
    setTestResult(null);
  }, [prompt, isOpen]);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/admin/prompts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptContent: content,
          category,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTestResult(data.result);
      } else {
        setTestResult("Error testing prompt");
      }
    } catch (error) {
      setTestResult("Error testing prompt");
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    onSave({ name, category, content });
  }

  const isEditing = !!prompt;
  const canSave = name.trim() && category.trim() && content.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit Prompt: ${prompt.name}` : "Create New Prompt"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Editing will create version ${prompt.version + 1}`
              : "Create a new AI prompt for your analyzers"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="editor" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="preview">Preview & Test</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prompt-name">Prompt Name</Label>
                <Input
                  id="prompt-name"
                  placeholder="e.g., reality_lens_system"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isEditing}
                />
                {isEditing && (
                  <p className="text-xs text-gray-500">
                    Name cannot be changed for existing prompts
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt-category">Category</Label>
                <Input
                  id="prompt-category"
                  placeholder="e.g., analyzer, coach, system"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="prompt-content">Prompt Content</Label>
                <span className="text-xs text-gray-500">
                  {content.length} characters
                </span>
              </div>
              <Textarea
                id="prompt-content"
                placeholder="Enter your prompt content here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Tips for writing effective prompts:
              </h4>
              <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>Be specific and clear about the task</li>
                <li>Include examples when possible</li>
                <li>Define the expected output format</li>
                <li>Use consistent terminology</li>
                <li>Test with edge cases</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Prompt Preview</Label>
                {isEditing && (
                  <Badge variant="outline">v{prompt.version + 1}</Badge>
                )}
              </div>
              <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-gray-50 dark:bg-gray-900 max-h-[300px] overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {content || "No content yet..."}
                </pre>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Test Prompt</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Send a test request to see how the AI responds with this prompt
              </p>
              <Button
                onClick={handleTest}
                disabled={!content || testing}
                variant="outline"
                className="w-full"
              >
                {testing ? "Testing..." : "Run Test"}
              </Button>

              {testResult && (
                <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-white dark:bg-gray-950 max-h-[200px] overflow-y-auto">
                  <h4 className="text-sm font-semibold mb-2">Test Result:</h4>
                  <pre className="text-xs whitespace-pre-wrap">
                    {testResult}
                  </pre>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="orange"
            onClick={handleSave}
            disabled={!canSave}
          >
            {isEditing ? "Save as New Version" : "Create Prompt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
