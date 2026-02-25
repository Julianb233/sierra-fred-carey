"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { CommunityCategory } from "@/lib/communities/types";

interface CreateCommunityDialogProps {
  children?: React.ReactNode;
  onCreated?: () => void;
}

export function CreateCommunityDialog({ children, onCreated }: CreateCommunityDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CommunityCategory>("general");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function resetForm() {
    setName("");
    setDescription("");
    setCategory("general");
    setErrors({});
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Community name is required.";
    else if (name.trim().length < 2) newErrors.name = "Name must be at least 2 characters.";
    else if (name.trim().length > 100) newErrors.name = "Name must be under 100 characters.";

    if (!description.trim()) newErrors.description = "Description is required.";
    else if (description.trim().length > 500) newErrors.description = "Description must be under 500 characters.";

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
      setOpen(false);
      resetForm();
      onCreated?.();
      router.push(`/dashboard/communities/${json.data?.slug || ""}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="orange" className="min-h-[44px]">
            <Plus className="h-4 w-4 mr-2" />
            Create Community
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg w-full">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create a Community</DialogTitle>
            <DialogDescription>
              Start a space for founders to connect and share knowledge.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="community-name">Name</Label>
              <Input
                id="community-name"
                placeholder="e.g. SaaS Founders"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((p) => ({ ...p, name: "" }));
                }}
                className="text-base min-h-[44px]"
                maxLength={100}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="community-category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as CommunityCategory)}>
                <SelectTrigger className="text-base min-h-[44px]">
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

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="community-desc">Description</Label>
              <Textarea
                id="community-desc"
                placeholder="What is this community about?"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) setErrors((p) => ({ ...p, description: "" }));
                }}
                rows={3}
                className="text-base resize-none"
                maxLength={500}
              />
              <div className="flex justify-between">
                {errors.description ? (
                  <p className="text-xs text-red-500">{errors.description}</p>
                ) : (
                  <span />
                )}
                <p className="text-xs text-gray-400">{description.length}/500</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px]"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="orange"
              className="min-h-[44px] w-full sm:w-auto"
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
