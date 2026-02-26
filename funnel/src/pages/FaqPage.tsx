import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FAQ_ITEMS, BRAND } from '@/lib/constants'

export function FaqPage() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set())

  const toggle = (index: number) => {
    setOpenItems(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h1 className="text-xl font-bold text-gray-900">
          Frequently Asked <span className="text-[#ff6a1a]">Questions</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Everything you need to know about Sahara
        </p>
      </motion.div>

      {/* FAQ Items */}
      <div className="max-w-lg mx-auto space-y-2.5">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openItems.has(index)

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
            >
              <div
                className={cn(
                  'border rounded-xl overflow-hidden transition-all duration-200',
                  isOpen
                    ? 'border-[#ff6a1a]/30 bg-[#ff6a1a]/[0.02] shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}
              >
                {/* Question */}
                <button
                  onClick={() => toggle(index)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 flex-shrink-0 text-gray-400 transition-transform duration-200',
                      isOpen && 'rotate-180 text-[#ff6a1a]'
                    )}
                  />
                </button>

                {/* Answer */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed">
                        {item.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Still have questions CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 mb-20 text-center"
      >
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 max-w-lg mx-auto">
          <p className="text-sm font-semibold text-gray-900 mb-1">
            Still have questions?
          </p>
          <p className="text-xs text-gray-500 mb-3">
            Chat with Fred — he can answer anything about startups, fundraising, or the Sahara platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <a
              href={BRAND.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#ff6a1a] hover:bg-[#ea580c] text-white text-sm font-semibold rounded-full transition-colors shadow-md shadow-[#ff6a1a]/20"
            >
              Join Sahara
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
