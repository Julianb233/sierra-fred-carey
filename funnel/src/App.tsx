import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Header } from '@/components/Header'
import { BottomNav, type Tab } from '@/components/BottomNav'
import { ChatPage } from '@/pages/ChatPage'
import { JourneyPage } from '@/pages/JourneyPage'
import { FaqPage } from '@/pages/FaqPage'

const TAB_STORAGE_KEY = 'sahara-funnel-tab'

function getInitialTab(): Tab {
  const stored = sessionStorage.getItem(TAB_STORAGE_KEY) as Tab | null
  if (stored && ['chat', 'journey', 'faq'].includes(stored)) return stored
  return 'chat'
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab)

  useEffect(() => {
    sessionStorage.setItem(TAB_STORAGE_KEY, activeTab)
  }, [activeTab])

  return (
    <div className="h-dvh flex flex-col bg-white overflow-hidden">
      <Header />

      {/* Main content area — below header, above bottom nav */}
      <main className="flex-1 mt-14 mb-16 overflow-hidden">
        <div className="h-full max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'chat' && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <ChatPage />
              </motion.div>
            )}
            {activeTab === 'journey' && (
              <motion.div
                key="journey"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <JourneyPage />
              </motion.div>
            )}
            {activeTab === 'faq' && (
              <motion.div
                key="faq"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <FaqPage />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
