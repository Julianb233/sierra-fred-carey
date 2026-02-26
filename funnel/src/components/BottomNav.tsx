import { MessageCircle, Map, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Tab = 'chat' | 'journey' | 'faq'

interface BottomNavProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  unreadCount?: number
}

const tabs = [
  { id: 'chat' as Tab, label: 'Chat', icon: MessageCircle },
  { id: 'journey' as Tab, label: 'Journey', icon: Map },
  { id: 'faq' as Tab, label: 'FAQ', icon: HelpCircle },
]

export function BottomNav({ activeTab, onTabChange, unreadCount = 0 }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-gray-200/60 safe-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 w-20 h-full rounded-xl transition-all duration-200',
                'active:scale-95',
                isActive
                  ? 'text-[#ff6a1a]'
                  : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'w-5 h-5 transition-all duration-200',
                    isActive && 'stroke-[2.5px]'
                  )}
                />
                {tab.id === 'chat' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 bg-[#ff6a1a] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium transition-all duration-200',
                  isActive && 'font-semibold'
                )}
              >
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-1 w-8 h-0.5 bg-[#ff6a1a] rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
