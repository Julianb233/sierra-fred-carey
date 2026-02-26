import React from 'react'
import { expect, afterEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Mock framer-motion so motion.* components render as plain HTML elements in JSDOM
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    motion: new Proxy({} as typeof actual.motion, {
      get: (_target, prop: string) => {
        const Component = (props: Record<string, unknown>) => {
          const { children, ...rest } = props;
          const { initial, animate, exit, transition, variants, whileHover, whileTap, whileFocus, whileInView, layout, layoutId, onAnimationComplete, onAnimationStart, ...htmlProps } = rest;
          return React.createElement(prop as string, htmlProps, children as React.ReactNode);
        };
        return Component;
      }
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock IntersectionObserver for framer-motion and other libraries
class MockIntersectionObserver {
  readonly root: Element | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {}

  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn().mockReturnValue([])
}

globalThis.IntersectionObserver = MockIntersectionObserver as any

// Mock ResizeObserver
class MockResizeObserver {
  constructor(callback: ResizeObserverCallback) {}
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

globalThis.ResizeObserver = MockResizeObserver as any

// Only run browser-specific mocks if window is defined (jsdom environment)
if (typeof window !== 'undefined') {
  const { cleanup } = await import('@testing-library/react')

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  // Mock scrollTo
  window.scrollTo = vi.fn() as any

  // Mock requestAnimationFrame and cancelAnimationFrame
  window.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 0)) as any
  window.cancelAnimationFrame = vi.fn((id) => clearTimeout(id)) as any

  // Cleanup after each test
  afterEach(() => {
    cleanup()
  })
}

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock environment variables for tests
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only'
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key'
