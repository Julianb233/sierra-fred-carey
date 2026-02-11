"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { CommunityCategory } from "@/lib/communities/types";

export default function CreateCommunityPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CommunityCategory>("general");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Community name is required.";
    else if (name.trim().length < 3) newErrors.name = "Name must be at least 3 characters.";
    else if (name.trim().length > 60) newErrors.name = "Name must be under 60 characters.";

    if (!description.trim()) newErrors.description = "Description is required.";
    else if (description.trim().length < 10) newErrors.description = "Description must be at least 10 characters.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to create community");
      }

      const json = await res.json();
      toast.success("Community created!");
      router.push(`/dashboard/communities/${json.data?.slug || ""}`);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl mx-auto">
      {/* Back link */}
      <Button variant="ghost" asChild className="min-h-[44px] -ml-3">
        <Link href="/dashboard/communities">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Communities
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
          Create a Community
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Start a space for founders to connect and share knowledge.
        </p>
      </div>

      <Card className="border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Name */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-900 dark:text-white">
                Community Name
              </Label>
              <Input
                id="name"
                placeholder="e.g. SaaS Founders"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                }}
                className="text-base"
                maxLength={60}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium text-gray-900 dark:text-white">
                Category
              </Label>
              <Select value={category} onValueChange={(v) => setCategory(v as CommunityCategory)}>
                <SelectTrigger className="text-base h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="industry">Industry</SelectItem>
                  <SelectItem value="stage">Stage</SelectItem>
                  <SelectItem value="topic">Topic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Icon upload placeholder */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-900 dark:text-white">
                Icon (optional)
              </Label>
              <div className="flex items-center justify-center h-11 w-full rounded-md border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:border-[#ff6a1a]/50 transition-colors">
                Upload image
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-900 dark:text-white">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="What is this community about? What kind of founders should join?"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) setErrors((prev) => ({ ...prev, description: "" }));
                }}
                rows={4}
                className="text-base resize-none"
              />
              {errors.description && (
                <p className="text-xs text-red-500">{errors.description}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="orange"
              className="min-h-[44px] min-w-[120px]"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Community"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
