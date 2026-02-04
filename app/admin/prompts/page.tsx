"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PromptEditor } from "@/components/admin/prompt-editor";
import { PlusIcon, SearchIcon } from "lucide-react";

interface PromptVersion {
  id: string;
  version: number;
  content: string;
  isActive: boolean;
  createdAt: string;
}

interface Prompt {
  name: string;
  category: string;
  versions: PromptVersion[];
  activeVersion: number;
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    fetchPrompts();
  }, []);

  async function fetchPrompts() {
    try {
      const response = await fetch("/api/admin/prompts");
      if (response.ok) {
        const data = await response.json();
        setPrompts(data);
      }
    } catch (error) {
      console.error("Error fetching prompts:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleActivateVersion(promptName: string, versionId: string) {
    try {
      const response = await fetch("/api/admin/prompts/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptName, versionId }),
      });

      if (response.ok) {
        fetchPrompts();
      }
    } catch (error) {
      console.error("Error activating version:", error);
    }
  }

  function handleEditPrompt(prompt: Prompt) {
    setSelectedPrompt(prompt);
    setIsEditorOpen(true);
  }

  function handleNewPrompt() {
    setSelectedPrompt(null);
    setIsEditorOpen(true);
  }

  async function handleSavePrompt(data: {
    name: string;
    category: string;
    content: string;
  }) {
    try {
      const response = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setIsEditorOpen(false);
        fetchPrompts();
      }
    } catch (error) {
      console.error("Error saving prompt:", error);
    }
  }

  const filteredPrompts = prompts.filter(
    (prompt) =>
      prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Prompt Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage AI prompts and versions
          </p>
        </div>
        <Button onClick={handleNewPrompt} variant="orange">
          <PlusIcon className="mr-2 h-4 w-4" />
          New Prompt
        </Button>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search prompts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-4">
        {filteredPrompts.map((prompt) => (
          <Card key={prompt.name}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{prompt.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <span>Category: {prompt.category}</span>
                    <span>•</span>
                    <span>Active: v{prompt.activeVersion}</span>
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-[#ff6a1a] text-[#ff6a1a]">
                  v{prompt.activeVersion} active
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {prompt.versions.map((version) => (
                  <Button
                    key={version.id}
                    variant={version.isActive ? "orange" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (!version.isActive) {
                        handleActivateVersion(prompt.name, version.id);
                      }
                    }}
                  >
                    v{version.version}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditPrompt(prompt)}
                >
                  Edit
                </Button>
                <Button variant="outline" size="sm">
                  View History
                </Button>
                <Button variant="outline" size="sm">
                  Test
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredPrompts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No prompts found. Create your first prompt to get started.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <PromptEditor
        prompt={
          selectedPrompt
            ? {
                name: selectedPrompt.name,
                category: selectedPrompt.category,
                content:
                  selectedPrompt.versions.find((v) => v.isActive)?.content ||
                  "",
                version: selectedPrompt.activeVersion,
              }
            : undefined
        }
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSavePrompt}
      />
    </div>
  );
}
