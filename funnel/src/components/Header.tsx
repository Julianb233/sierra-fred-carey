import { ExternalLink } from 'lucide-react'
import { BRAND } from '@/lib/constants'

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-200/60">
      <div className="max-w-lg mx-auto flex items-center justify-between h-14 px-4">
        {/* Logo + Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-[#ff6a1a] to-orange-400 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 leading-tight">
              {BRAND.name}
            </span>
            <span className="text-[10px] text-gray-400 leading-tight">
              Founder OS
            </span>
          </div>
        </div>

        {/* CTA to full platform */}
        <a
          href={BRAND.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff6a1a] hover:bg-[#ea580c] text-white text-xs font-semibold rounded-full transition-colors shadow-sm shadow-[#ff6a1a]/20"
        >
          Full Platform
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </header>
  )
}
