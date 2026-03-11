import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Brain,
  Clock,
  Users,
  Sparkles,
  Check,
  Star,
  Shield,
  Zap,
  Target,
  TrendingUp,
  MessageCircle,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND } from '@/lib/constants'
import { redirectToProCheckout } from '@/lib/stripe'

interface LandingPageProps {
  onStartChat: () => void
}

/* ─── Testimonials ─── */
const TESTIMONIALS = [
  {
    name: 'Sarah K.',
    role: 'Founder, HealthTech Startup',
    quote: "Fred helped me rethink my entire pitch strategy. I went from getting ghosted by investors to closing a $500K pre-seed in 6 weeks.",
    rating: 5,
  },
  {
    name: 'Marcus D.',
    role: 'First-time Founder',
    quote: "I was spinning my wheels for months. One conversation with Fred and I had clarity on my next 3 moves. Worth every penny.",
    rating: 5,
  },
  {
    name: 'Priya R.',
    role: 'CEO, EdTech Platform',
    quote: "The investor readiness score was a wake-up call. Fred showed me exactly what I needed to fix before approaching VCs.",
    rating: 5,
  },
]

/* ─── Features ─── */
const FEATURES = [
  {
    icon: Brain,
    title: 'AI Coaching by Fred Cary',
    desc: 'Decades of real entrepreneurial experience, distilled into AI that adapts to your situation.',
  },
  {
    icon: Target,
    title: 'Investor Readiness Score',
    desc: 'Know exactly where you stand before approaching investors. No guesswork.',
  },
  {
    icon: TrendingUp,
    title: 'Pitch Deck Review',
    desc: 'AI-powered analysis with actionable feedback on every slide.',
  },
  {
    icon: Users,
    title: 'Virtual Team Agents',
    desc: 'AI-powered CTO, CMO, and CFO to help you make better decisions.',
  },
]

/* ─── Pro plan features ─── */
const PRO_FEATURES = [
  'AI coaching by Fred Cary',
  'Investor Readiness Score',
  'Pitch Deck Review & Scorecard',
  'Strategy Documents (Executive Summary, 30/60/90)',
  'Full Investor Lens (Pre-Seed / Seed / Series A)',
  'Persistent founder memory',
]

export function LandingPage({ onStartChat }: LandingPageProps) {
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const handleProCheckout = async () => {
    try {
      setCheckoutLoading(true)
      setCheckoutError(null)
      await redirectToProCheckout()
    } catch (err) {
      console.error('Checkout error:', err)
      setCheckoutError(err instanceof Error ? err.message : 'Something went wrong')
      setCheckoutLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* ─── HERO ─── */}
      <section className="relative px-5 pt-6 pb-10 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#ff6a1a]/20 rounded-full blur-[80px]" />
          <div className="absolute top-40 -left-20 w-48 h-48 bg-orange-400/15 rounded-full blur-[60px]" />
        </div>

        <div className="relative z-10 max-w-lg mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-5"
          >
            <div className="inline-flex items-center gap-2 bg-[#ff6a1a]/10 px-3.5 py-1.5 rounded-full border border-[#ff6a1a]/25">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff6a1a] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff6a1a]" />
              </span>
              <span className="text-xs font-semibold text-[#ff6a1a]">Live AI Founder Coach</span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4"
          >
            What if you had a{' '}
            <span className="text-[#ff6a1a] relative">
              mentor
              <motion.span
                className="absolute -bottom-1 left-0 w-full h-1.5 bg-[#ff6a1a]/20 rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                style={{ transformOrigin: 'left' }}
              />
            </span>{' '}
            who never sleeps?
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-base text-gray-600 mb-6 leading-relaxed"
          >
            Fred Cary has coached 10,000+ founders and helped raise over $100M. Now his
            experience is available 24/7 as your AI co-founder.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 mb-6"
          >
            <button
              onClick={onStartChat}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#ff6a1a] hover:bg-[#ea580c] text-white font-semibold rounded-full transition-all shadow-lg shadow-[#ff6a1a]/25 active:scale-95 text-sm"
            >
              <MessageCircle className="w-4 h-4" />
              Talk to Fred — Free
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href={BRAND.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3.5 border-2 border-gray-200 hover:border-[#ff6a1a]/50 text-gray-700 font-semibold rounded-full transition-all active:scale-95 text-sm"
            >
              Explore Full Platform
            </a>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap gap-4 text-xs text-gray-500"
          >
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#ff6a1a]" />
              10,000+ Founders
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#ff6a1a]" />
              $100M+ Raised
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#ff6a1a]" />
              No Credit Card
            </span>
          </motion.div>
        </div>
      </section>

      {/* ─── MEET FRED ─── */}
      <section className="px-5 py-10 bg-gray-50">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#ff6a1a] to-orange-400 rounded-full flex items-center justify-center shadow-md shadow-[#ff6a1a]/20">
                <span className="text-white text-xl font-bold">F</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Meet Fred Cary</h2>
                <p className="text-xs text-gray-500">Your AI Founder Coach</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Fred is not just another chatbot. He draws on decades of real entrepreneurial
              experience -- from building companies to coaching thousands of founders through
              every stage from idea to exit.
            </p>
            <blockquote className="border-l-3 border-[#ff6a1a] pl-4 py-1 text-sm italic text-gray-700 mb-4">
              "He's not just AI. He's you -- five years ahead."
            </blockquote>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { icon: Brain, text: 'Learns how you think' },
                { icon: Clock, text: 'Works 24/7' },
                { icon: Users, text: 'Grows with you' },
                { icon: Zap, text: 'Unfair advantage' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * i }}
                  className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5"
                >
                  <item.icon className="w-4 h-4 text-[#ff6a1a] flex-shrink-0" />
                  <span className="text-xs font-medium text-gray-700">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="px-5 py-10">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-6"
          >
            <span className="inline-block text-[10px] font-semibold text-[#ff6a1a] bg-[#ff6a1a]/10 px-3 py-1 rounded-full mb-2 uppercase tracking-wider">
              What You Get
            </span>
            <h2 className="text-xl font-bold text-gray-900">
              Everything a founder needs,{' '}
              <span className="text-[#ff6a1a]">in one place</span>
            </h2>
          </motion.div>

          <div className="space-y-3">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-3 bg-white border border-gray-100 rounded-xl p-4 shadow-sm"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#ff6a1a]/10 to-orange-50 rounded-lg flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-[#ff6a1a]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-0.5">{feature.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF / TESTIMONIALS ─── */}
      <section className="px-5 py-10 bg-gray-50">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-6"
          >
            <span className="inline-block text-[10px] font-semibold text-[#ff6a1a] bg-[#ff6a1a]/10 px-3 py-1 rounded-full mb-2 uppercase tracking-wider">
              Founder Stories
            </span>
            <h2 className="text-xl font-bold text-gray-900">
              Real founders, <span className="text-[#ff6a1a]">real results</span>
            </h2>
          </motion.div>

          <div className="space-y-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 fill-[#ff6a1a] text-[#ff6a1a]" />
                  ))}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mb-3 italic">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-600">
                      {t.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{t.name}</p>
                    <p className="text-[10px] text-gray-500">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section className="px-5 py-10">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-6"
          >
            <span className="inline-block text-[10px] font-semibold text-[#ff6a1a] bg-[#ff6a1a]/10 px-3 py-1 rounded-full mb-2 uppercase tracking-wider">
              Pricing
            </span>
            <h2 className="text-xl font-bold text-gray-900">
              Start free, <span className="text-[#ff6a1a]">upgrade when ready</span>
            </h2>
          </motion.div>

          {/* Free tier */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white border border-gray-200 rounded-xl p-5 mb-3"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Free</h3>
                <p className="text-[10px] text-gray-500">Build trust and habit</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-gray-900">$0</span>
                <span className="text-xs text-gray-400">/mo</span>
              </div>
            </div>
            <ul className="space-y-1.5 mb-4">
              {[
                'AI Coaching with Fred',
                'Strategy & execution reframing',
                'Startup Reality Lens',
                'Red Flag Detection',
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                  <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={onStartChat}
              className="w-full py-2.5 border-2 border-gray-200 hover:border-[#ff6a1a]/50 text-gray-700 hover:text-[#ff6a1a] text-sm font-semibold rounded-full transition-colors"
            >
              Start Free
            </button>
          </motion.div>

          {/* Pro tier */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="relative bg-gradient-to-b from-[#ff6a1a]/5 to-white border-2 border-[#ff6a1a] rounded-xl p-5 shadow-lg shadow-[#ff6a1a]/10"
          >
            {/* Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-[#ff6a1a] text-white px-4 py-1 rounded-full text-[10px] font-semibold shadow-md">
                Most Popular
              </span>
            </div>

            <div className="flex items-center justify-between mb-3 mt-1">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Pro</h3>
                <p className="text-[10px] text-gray-500">Investor-grade readiness</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-gray-900">$99</span>
                <span className="text-xs text-gray-400">/mo</span>
              </div>
            </div>
            <ul className="space-y-1.5 mb-4">
              {PRO_FEATURES.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                  <Check className="w-3.5 h-3.5 text-[#ff6a1a] flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={handleProCheckout}
              disabled={checkoutLoading}
              className={cn(
                'w-full py-2.5 bg-[#ff6a1a] hover:bg-[#ea580c] text-white text-sm font-semibold rounded-full transition-colors text-center shadow-md shadow-[#ff6a1a]/20',
                checkoutLoading && 'opacity-70 cursor-not-allowed'
              )}
            >
              {checkoutLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </span>
              ) : (
                'Start 14-Day Free Trial'
              )}
            </button>
            {checkoutError && (
              <p className="text-[10px] text-red-500 text-center mt-2">{checkoutError}</p>
            )}
            {!checkoutError && (
              <p className="text-[10px] text-gray-400 text-center mt-2">14-day free trial, cancel anytime</p>
            )}
          </motion.div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="px-5 pt-8 pb-24">
        <div className="max-w-lg mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Ready to build something real?
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Every great company started with a conversation.
              Start yours with Fred.
            </p>
            <button
              onClick={onStartChat}
              className={cn(
                'inline-flex items-center gap-2 px-8 py-3.5 bg-[#ff6a1a] hover:bg-[#ea580c] text-white font-semibold rounded-full transition-all',
                'shadow-lg shadow-[#ff6a1a]/25 active:scale-95 text-sm'
              )}
            >
              <MessageCircle className="w-4 h-4" />
              Talk to Fred Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
