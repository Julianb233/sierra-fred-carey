"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { History, ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SessionList } from "@/components/history/session-list";
import { ConversationView } from "@/components/history/conversation-view";

export default function HistoryPage() {
  const router = useRouter();
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>();

  const handleContinueConversation = () => {
    if (selectedSessionId) {
      // Store session ID and navigate to chat
      if (typeof window !== "undefined") {
        sessionStorage.setItem("fred-session-id", selectedSessionId);
      }
      router.push("/chat");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>

              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#ff6a1a]/10">
                  <History className="h-5 w-5 text-[#ff6a1a]" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Decision History
                  </h1>
                  <p className="text-sm text-gray-500">
                    Review past conversations with FRED
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => router.push("/chat")}
              className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              New Conversation
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Session list sidebar */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
        >
          <SessionList
            onSelectSession={setSelectedSessionId}
            selectedSessionId={selectedSessionId}
            className="h-full"
          />
        </motion.aside>

        {/* Conversation view */}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex-1 bg-white dark:bg-gray-900 overflow-hidden"
        >
          {selectedSessionId ? (
            <ConversationView
              sessionId={selectedSessionId}
              onContinue={handleContinueConversation}
              className="h-full"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
                <History className="h-10 w-10 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Select a conversation
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                Choose a conversation from the sidebar to view the full discussion
                and any decisions made with FRED.
              </p>
            </div>
          )}
        </motion.main>
      </div>
    </div>
  );
}
