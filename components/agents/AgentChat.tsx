"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Copy, ThumbsUp, ThumbsDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
}

interface AgentChatProps {
  agentName: string;
  agentColor: string;
  suggestedPrompts: string[];
  quickActions: { label: string; action: string }[];
}

const colorMap = {
  blue: {
    gradient: "from-blue-500 to-blue-600",
    text: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  purple: {
    gradient: "from-purple-500 to-purple-600",
    text: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
  },
  green: {
    gradient: "from-green-500 to-green-600",
    text: "text-green-500",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
  },
  orange: {
    gradient: "from-orange-500 to-orange-600",
    text: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
  },
  pink: {
    gradient: "from-pink-500 to-pink-600",
    text: "text-pink-500",
    bg: "bg-pink-500/10",
    border: "border-pink-500/30",
  },
  indigo: {
    gradient: "from-indigo-500 to-indigo-600",
    text: "text-indigo-500",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
  },
  teal: {
    gradient: "from-teal-500 to-teal-600",
    text: "text-teal-500",
    bg: "bg-teal-500/10",
    border: "border-teal-500/30",
  },
  cyan: {
    gradient: "from-cyan-500 to-cyan-600",
    text: "text-cyan-500",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
  },
  emerald: {
    gradient: "from-emerald-500 to-emerald-600",
    text: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  slate: {
    gradient: "from-slate-500 to-slate-600",
    text: "text-slate-500",
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
  },
};

export default function AgentChat({
  agentName,
  agentColor,
  suggestedPrompts,
  quickActions,
}: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "agent",
      content: `Hi! I'm ${agentName}. How can I help you today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const colors = colorMap[agentColor as keyof typeof colorMap];

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate agent response
    setTimeout(() => {
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        content: "I'm processing your request. This is a demo response.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="flex flex-col h-[500px] md:h-[600px] rounded-2xl bg-gray-50 dark:bg-gradient-to-br dark:from-white/5 dark:to-white/0 border border-gray-200 dark:border-white/10 dark:backdrop-blur-xl overflow-hidden shadow-lg dark:shadow-none">
      {/* Quick Actions Bar */}
      <div className="p-4 border-b border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 dark:backdrop-blur-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {quickActions.map((action, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg ${colors.bg} border ${colors.border}
                whitespace-nowrap text-sm font-medium transition-all hover:shadow-lg ${colors.text}`}
            >
              <Zap className="w-4 h-4" />
              {action.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] ${
                  message.role === "user"
                    ? `bg-gradient-to-r ${colors.gradient} text-white`
                    : "bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                } rounded-2xl p-4`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs opacity-60">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {message.role === "agent" && (
                    <div className="flex items-center gap-1 ml-auto">
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors text-gray-500 dark:text-gray-400">
                        <Copy className="w-3 h-3" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors text-gray-500 dark:text-gray-400">
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors text-gray-500 dark:text-gray-400">
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-2xl p-4">
              <div className="flex gap-2">
                <motion.div
                  className={`w-2 h-2 rounded-full bg-gradient-to-r ${colors.gradient}`}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className={`w-2 h-2 rounded-full bg-gradient-to-r ${colors.gradient}`}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className={`w-2 h-2 rounded-full bg-gradient-to-r ${colors.gradient}`}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Suggested Prompts */}
      {messages.length === 1 && (
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className={`w-4 h-4 ${colors.text}`} />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Suggested prompts</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {suggestedPrompts.map((prompt, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handlePromptClick(prompt)}
                className="text-left p-3 min-h-[44px] rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-sm text-gray-700 dark:text-gray-300"
              >
                {prompt}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 dark:backdrop-blur-sm">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder={`Message ${agentName}...`}
            className="flex-1 px-4 py-3 rounded-lg bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 focus:border-gray-400 dark:focus:border-white/20
              focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-white/10 transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim()}
            className={`px-6 bg-gradient-to-r ${colors.gradient} hover:opacity-90 transition-opacity`}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
