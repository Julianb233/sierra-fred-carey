"use client"

/**
 * Phase 165 SITE-04: Microsite edit experience with undo/redo and version history
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft,
  Save,
  Undo2,
  Redo2,
  Globe,
  Eye,
  EyeOff,
  Loader2,
  History,
  RotateCcw,
  Trash2,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { BrandingEditor } from "@/components/microsite/branding-editor"
import { ContentEditor } from "@/components/microsite/content-editor"
import { MicrositePreview } from "@/components/microsite/microsite-preview"
import { MicrositeErrorBoundary } from "@/components/microsite/microsite-error-boundary"
import type { Microsite, MicrositeBranding, MicrositeContent, VersionEntry } from "@/lib/microsite/types"

type EditorTab = "content" | "branding" | "seo" | "history"

interface UndoState {
  branding: MicrositeBranding
  content: MicrositeContent
}

export default function MicrositeEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [microsite, setMicrosite] = useState<Microsite | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<EditorTab>("content")
  const [showPreview, setShowPreview] = useState(true)

  // Editable state
  const [title, setTitle] = useState("")
  const [branding, setBranding] = useState<MicrositeBranding | null>(null)
  const [content, setContent] = useState<MicrositeContent | null>(null)
  const [seoTitle, setSeoTitle] = useState("")
  const [seoDescription, setSeoDescription] = useState("")

  // Undo/redo
  const [undoStack, setUndoStack] = useState<UndoState[]>([])
  const [redoStack, setRedoStack] = useState<UndoState[]>([])
  const lastSavedRef = useRef<string>("")

  const fetchMicrosite = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/microsite/${id}`)
      if (!res.ok) {
        setError("Microsite not found")
        return
      }
      const data = await res.json()
      if (data.success && data.microsite) {
        const m = data.microsite as Microsite
        setMicrosite(m)
        setTitle(m.title)
        setBranding(m.branding)
        setContent(m.content)
        setSeoTitle(m.seo_title || "")
        setSeoDescription(m.seo_description || "")
        lastSavedRef.current = JSON.stringify({ branding: m.branding, content: m.content })
      }
    } catch {
      setError("Failed to load microsite")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchMicrosite()
  }, [fetchMicrosite])

  // Push undo state before changes
  const pushUndo = useCallback(() => {
    if (branding && content) {
      setUndoStack((prev) => [...prev.slice(-19), { branding, content }])
      setRedoStack([])
    }
  }, [branding, content])

  const handleBrandingChange = (newBranding: MicrositeBranding) => {
    pushUndo()
    setBranding(newBranding)
  }

  const handleContentChange = (newContent: MicrositeContent) => {
    pushUndo()
    setContent(newContent)
  }

  const handleUndo = () => {
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    if (branding && content) {
      setRedoStack((r) => [...r, { branding, content }])
    }
    setBranding(prev.branding)
    setContent(prev.content)
    setUndoStack((s) => s.slice(0, -1))
  }

  const handleRedo = () => {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    if (branding && content) {
      setUndoStack((s) => [...s, { branding, content }])
    }
    setBranding(next.branding)
    setContent(next.content)
    setRedoStack((r) => r.slice(0, -1))
  }

  const hasChanges = () => {
    if (!branding || !content) return false
    return JSON.stringify({ branding, content }) !== lastSavedRef.current
  }

  const handleSave = async (newStatus?: string) => {
    if (!branding || !content) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = { title, branding, content, seo_title: seoTitle, seo_description: seoDescription }
      if (newStatus) body.status = newStatus

      const res = await fetch(`/api/microsite/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to save")
        return
      }
      setMicrosite(data.microsite)
      lastSavedRef.current = JSON.stringify({ branding, content })
      toast.success(newStatus === "published" ? "Microsite published!" : "Changes saved")
    } catch {
      toast.error("Failed to save. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = async (version: number) => {
    try {
      const res = await fetch(`/api/microsite/${id}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to restore")
        return
      }
      const m = data.microsite as Microsite
      setMicrosite(m)
      setBranding(m.branding)
      setContent(m.content)
      lastSavedRef.current = JSON.stringify({ branding: m.branding, content: m.content })
      toast.success(`Restored to version ${version}`)
    } catch {
      toast.error("Failed to restore version")
    }
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/microsite/${id}`, { method: "DELETE" })
      if (!res.ok) {
        toast.error("Failed to delete")
        return
      }
      toast.success("Microsite deleted")
      router.push("/dashboard/microsite")
    } catch {
      toast.error("Failed to delete")
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (error || !microsite || !branding || !content) {
    return (
      <Card className="border-red-200">
        <CardContent className="flex flex-col items-center py-12 gap-4">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <p className="text-sm text-red-600">{error || "Microsite not found"}</p>
          <Button variant="outline" onClick={() => router.push("/dashboard/microsite")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Microsites
          </Button>
        </CardContent>
      </Card>
    )
  }

  const tabs: { id: EditorTab; label: string }[] = [
    { id: "content", label: "Content" },
    { id: "branding", label: "Branding" },
    { id: "seo", label: "SEO" },
    { id: "history", label: "History" },
  ]

  return (
    <MicrositeErrorBoundary>
      <div className="space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard/microsite")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0"
                />
                <Badge
                  variant={
                    microsite.status === "published" ? "default" : "secondary"
                  }
                >
                  {microsite.status}
                </Badge>
              </div>
              <span className="text-xs text-gray-500">v{microsite.version}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              title="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPreview(!showPreview)}
              title={showPreview ? "Hide preview" : "Show preview"}
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave()}
              disabled={saving || !hasChanges()}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
            {microsite.status === "draft" && (
              <Button
                size="sm"
                onClick={() => handleSave("published")}
                disabled={saving}
                className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
              >
                <Globe className="h-4 w-4 mr-1" /> Publish
              </Button>
            )}
          </div>
        </div>

        {/* Editor tabs */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === t.id
                  ? "border-[#ff6a1a] text-[#ff6a1a]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Main area */}
        <div className={cn("grid gap-6", showPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
          {/* Editor */}
          <Card>
            <CardContent className="pt-6">
              {tab === "content" && (
                <ContentEditor content={content} onChange={handleContentChange} />
              )}
              {tab === "branding" && (
                <BrandingEditor branding={branding} onChange={handleBrandingChange} />
              )}
              {tab === "seo" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>SEO Title</Label>
                    <Input
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      placeholder={title}
                      maxLength={70}
                    />
                    <p className="text-xs text-gray-500">{seoTitle.length}/70 characters</p>
                  </div>
                  <div className="space-y-2">
                    <Label>SEO Description</Label>
                    <Input
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      placeholder="A brief description for search engines..."
                      maxLength={160}
                    />
                    <p className="text-xs text-gray-500">{seoDescription.length}/160 characters</p>
                  </div>
                  {/* Google preview */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-xs text-gray-400 mb-2">Search preview</p>
                    <p className="text-blue-600 text-sm font-medium">
                      {seoTitle || title}
                    </p>
                    <p className="text-green-700 text-xs">joinsahara.com/site/{microsite.slug}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {seoDescription || "No description set"}
                    </p>
                  </div>
                </div>
              )}
              {tab === "history" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <History className="h-4 w-4 text-gray-500" />
                    <h3 className="font-medium text-sm">Version History</h3>
                  </div>
                  {(microsite.version_history as VersionEntry[]).length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-6">
                      No previous versions yet. Versions are saved automatically when you edit.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {(microsite.version_history as VersionEntry[]).map((v) => (
                        <div
                          key={v.version}
                          className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-800"
                        >
                          <div>
                            <span className="text-sm font-medium">Version {v.version}</span>
                            <p className="text-xs text-gray-500">
                              {new Date(v.updated_at).toLocaleString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestore(v.version)}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" /> Restore
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Delete */}
                  <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="w-full">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete Microsite
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this microsite?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. The microsite and all its
                            version history will be permanently deleted.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live Preview */}
          {showPreview && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">Live Preview</h3>
              <MicrositePreview
                template={microsite.template}
                branding={branding}
                content={content}
                className="h-[600px] overflow-y-auto"
                scale={0.45}
              />
            </div>
          )}
        </div>
      </div>
    </MicrositeErrorBoundary>
  )
}
