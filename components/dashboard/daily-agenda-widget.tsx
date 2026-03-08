"use client"

/**
 * Daily Agenda Widget
 * Phase 84: Daily Mentor Guidance
 *
 * Prominently displays "Today, accomplish these 3 things" on the dashboard.
 * Tasks are AI-generated based on founder's stage and context.
 */

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Hammer,
  Users,
  Brain,
  FileText,
  Check,
  Sparkles,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import type { DailyAgenda, DailyTask } from "@/lib/guidance/types"

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_ICONS: Record<DailyTask["category"], typeof Search> = {
  research: Search,
  build: Hammer,
  connect: Users,
  reflect: Brain,
  document: FileText,
}

const PRIORITY_STYLES: Record<DailyTask["priority"], { bg: string; text: string }> = {
  "must-do": { bg: "bg-[#ff6a1a]/10 border-[#ff6a1a]/30", text: "text-[#ff6a1a]" },
  "should-do": { bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-500" },
  stretch: { bg: "bg-gray-500/10 border-gray-500/30", text: "text-gray-500" },
}

// ============================================================================
// Component
// ============================================================================

export function DailyAgendaWidget() {
  const [agenda, setAgenda] = useState<DailyAgenda | null>(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)

  const fetchAgenda = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/daily-agenda")
      if (!res.ok) return
      const json = await res.json()
      if (json.success) {
        setAgenda(json.data)
      }
    } catch (err) {
      console.error("[DailyAgendaWidget] Failed to fetch:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgenda()
  }, [fetchAgenda])

  const handleToggleTask = async (taskId: string) => {
    if (!agenda || completing) return

    const task = agenda.tasks.find((t) => t.id === taskId)
    if (!task || task.completed) return

    setCompleting(taskId)

    try {
      const res = await fetch("/api/dashboard/daily-agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      })

      if (res.ok) {
        const updatedTasks = agenda.tasks.map((t) =>
          t.id === taskId ? { ...t, completed: true } : t
        )
        const newCompletedCount = updatedTasks.filter((t) => t.completed).length

        setAgenda({
          ...agenda,
          tasks: updatedTasks,
          completedCount: newCompletedCount,
        })

        if (newCompletedCount === 3) {
          toast.success("All tasks complete! Great work today.", {
            icon: <Sparkles className="h-5 w-5 text-[#ff6a1a]" />,
            duration: 5000,
          })
        }
      }
    } catch (err) {
      console.error("[DailyAgendaWidget] Failed to complete task:", err)
    } finally {
      setCompleting(null)
    }
  }

  // Loading state: 3 skeleton cards
  if (loading) {
    return (
      <Card className="border-[#ff6a1a]/20 bg-gradient-to-br from-orange-50/50 to-white dark:from-orange-950/10 dark:to-gray-950">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-4 w-96 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!agenda) return null

  const completedCount = agenda.tasks.filter((t) => t.completed).length
  const allComplete = completedCount === 3

  return (
    <Card className="border-[#ff6a1a]/20 bg-gradient-to-br from-orange-50/50 to-white dark:from-orange-950/10 dark:to-gray-950 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Today&apos;s Focus
          </CardTitle>
          <Badge
            variant="outline"
            className={
              allComplete
                ? "bg-green-500/10 text-green-600 border-green-500/30"
                : "bg-[#ff6a1a]/10 text-[#ff6a1a] border-[#ff6a1a]/30"
            }
          >
            {completedCount}/3 completed
          </Badge>
        </div>
        <p className="text-sm text-[#ff6a1a] font-medium mt-1">
          {agenda.greeting}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <AnimatePresence mode="sync">
          {agenda.tasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              index={index}
              onToggle={handleToggleTask}
              isCompleting={completing === task.id}
            />
          ))}
        </AnimatePresence>

        {allComplete && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-3 text-sm font-medium text-green-600 dark:text-green-400"
          >
            <Sparkles className="inline-block h-4 w-4 mr-1" />
            All done! You crushed it today.
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Task Card
// ============================================================================

function TaskCard({
  task,
  index,
  onToggle,
  isCompleting,
}: {
  task: DailyTask
  index: number
  onToggle: (id: string) => void
  isCompleting: boolean
}) {
  const CategoryIcon = CATEGORY_ICONS[task.category]
  const priorityStyle = PRIORITY_STYLES[task.priority]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: task.completed ? 0.98 : 1,
      }}
      transition={{ delay: index * 0.05 }}
      className={`
        relative flex items-start gap-3 p-3 rounded-lg border transition-all
        ${task.completed
          ? "bg-green-50/50 dark:bg-green-950/10 border-green-200/50 dark:border-green-800/30"
          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-[#ff6a1a]/30"
        }
      `}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        disabled={task.completed || isCompleting}
        className={`
          mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all
          ${task.completed
            ? "bg-green-500 border-green-500"
            : "border-gray-300 dark:border-gray-600 hover:border-[#ff6a1a]"
          }
          ${isCompleting ? "animate-pulse" : ""}
        `}
        aria-label={task.completed ? "Task completed" : `Complete task: ${task.title}`}
      >
        {task.completed && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            <Check className="h-3 w-3 text-white" />
          </motion.div>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm font-medium ${
              task.completed
                ? "line-through text-gray-400 dark:text-gray-500"
                : "text-gray-900 dark:text-gray-100"
            }`}
          >
            {task.title}
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${priorityStyle.bg} ${priorityStyle.text} border`}
          >
            {task.priority}
          </Badge>
        </div>
        <p
          className={`text-xs mt-1 ${
            task.completed
              ? "text-gray-400 dark:text-gray-600"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {task.description}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
            <CategoryIcon className="h-3 w-3" />
            {task.category}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            ~{task.estimatedMinutes} min
          </span>
        </div>
      </div>
    </motion.div>
  )
}
