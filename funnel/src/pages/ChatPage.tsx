import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles } from 'lucide-react'
import { cn, uid } from '@/lib/utils'
import { FRED } from '@/lib/constants'
import {
  type ChatMessage,
  sendMessage,
  loadChatHistory,
  saveChatHistory,
} from '@/lib/chat-service'

const SUGGESTION_CHIPS = [
  "I have a startup idea",
  "Help me with fundraising",
  "Review my business model",
  "Where should I start?",
]

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const stored = loadChatHistory()
    if (stored.length > 0) return stored
    // Initial greeting from Fred
    return [{
      id: uid(),
      role: 'assistant' as const,
      content: FRED.greeting,
      timestamp: new Date(),
    }]
  })
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Save to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 1) {
      saveChatHistory(messages)
    }
  }, [messages])

  const handleSend = useCallback(async (text?: string) => {
    const messageText = (text || input).trim()
    if (!messageText || isLoading) return

    const userMessage: ChatMessage = {
      id: uid(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }

    try {
      const response = await sendMessage(messageText, messages)
      const assistantMessage: ChatMessage = {
        id: uid(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch {
      const errorMessage: ChatMessage = {
        id: uid(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const showSuggestions = messages.length <= 1 && !isLoading

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 pt-2 pb-4"
      >
        <AnimatePresence mode="popLayout">
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i === messages.length - 1 ? 0.1 : 0 }}
              className={cn(
                'flex mb-3',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-[#ff6a1a] to-orange-400 rounded-full flex items-center justify-center mr-2 mt-0.5 shadow-sm">
                  <span className="text-white text-xs font-bold">F</span>
                </div>
              )}
              <div
                className={cn(
                  'max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-[#ff6a1a] text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                )}
              >
                {msg.content.split('\n').map((line, j) => {
                  // Handle bold markdown
                  const parts = line.split(/(\*\*[^*]+\*\*)/g)
                  return (
                    <p key={j} className={j > 0 ? 'mt-2' : ''}>
                      {parts.map((part, k) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={k} className="font-semibold">{part.slice(2, -2)}</strong>
                        }
                        // Handle links
                        const linkParts = part.split(/(\[[^\]]+\]\([^)]+\))/g)
                        return linkParts.map((lp, l) => {
                          const linkMatch = lp.match(/\[([^\]]+)\]\(([^)]+)\)/)
                          if (linkMatch) {
                            return (
                              <a
                                key={l}
                                href={linkMatch[2]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  'underline underline-offset-2',
                                  msg.role === 'user' ? 'text-white/90' : 'text-[#ff6a1a]'
                                )}
                              >
                                {linkMatch[1]}
                              </a>
                            )
                          }
                          return <span key={l}>{lp}</span>
                        })
                      })}
                    </p>
                  )
                })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mb-3"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-[#ff6a1a] to-orange-400 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-bold">F</span>
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
              <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full inline-block" />
              <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full inline-block" />
              <span className="typing-dot w-2 h-2 bg-gray-400 rounded-full inline-block" />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      {showSuggestions && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 pb-2 flex flex-wrap gap-2"
        >
          {SUGGESTION_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => handleSend(chip)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#ff6a1a]/5 hover:bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 rounded-full text-xs font-medium text-[#ff6a1a] transition-colors active:scale-95"
            >
              <Sparkles className="w-3 h-3" />
              {chip}
            </button>
          ))}
        </motion.div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-100 px-4 py-3 bg-white">
        <div className="max-w-lg mx-auto flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask Fred anything..."
              rows={1}
              disabled={isLoading}
              className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff6a1a]/30 focus:border-[#ff6a1a]/50 disabled:opacity-50 transition-all"
              style={{ maxHeight: 120 }}
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className={cn(
              'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200',
              'active:scale-90',
              input.trim() && !isLoading
                ? 'bg-[#ff6a1a] text-white shadow-md shadow-[#ff6a1a]/25 hover:bg-[#ea580c]'
                : 'bg-gray-100 text-gray-300'
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
