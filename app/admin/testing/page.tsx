"use client"

import { useState } from "react"
import { TestAccountManager } from "@/components/admin/test-account-manager"
import { FeedbackDashboard } from "@/components/admin/feedback-dashboard"
import { IterationDashboard } from "./iteration-dashboard"
import { cn } from "@/lib/utils"

type Tab = "accounts" | "feedback" | "iteration"

export default function TestingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("accounts")

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Admin &gt; Testing & QA
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Testing & QA
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage test accounts, run QA protocols, and review user feedback.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab("accounts")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === "accounts"
                ? "border-[#ff6a1a] text-[#ff6a1a]"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            )}
          >
            Test Accounts
          </button>
          <button
            onClick={() => setActiveTab("feedback")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === "feedback"
                ? "border-[#ff6a1a] text-[#ff6a1a]"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            )}
          >
            User Feedback
          </button>
          <button
            onClick={() => setActiveTab("iteration")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === "iteration"
                ? "border-[#ff6a1a] text-[#ff6a1a]"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            )}
          >
            Iteration
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === "accounts" && <TestAccountManager />}
        {activeTab === "feedback" && <FeedbackDashboard />}
        {activeTab === "iteration" && <IterationDashboard />}
      </div>
    </div>
  )
}
