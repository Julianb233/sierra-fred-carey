# Testing Patterns

**Analysis Date:** 2026-01-19

## Test Framework

**Runner:**
- Vitest 4.x
- Config: `vitest.config.ts`

**Assertion Library:**
- Vitest built-in assertions (`expect`)
- Extended with `@testing-library/jest-dom/vitest` for DOM matchers

**Run Commands:**
```bash
npm test              # Run all tests (vitest run)
npm run test:watch    # Watch mode (vitest)
npm run test:coverage # Coverage report (vitest run --coverage)
```

## Test File Organization

**Location:**
- Co-located pattern: `lib/**/__tests__/*.test.ts`
- Separate tests directory: `tests/` for integration and page tests

**Naming:**
- Unit tests: `*.test.ts` or `*.test.tsx`
- Test directories: `__tests__/`

**Structure:**
```
lib/
├── auth/
│   ├── token.ts
│   └── __tests__/
│       └── token.test.ts
├── notifications/
│   ├── validators.ts
│   └── __tests__/
│       └── validators.test.ts
tests/
├── pages/
│   ├── home.test.tsx
│   ├── pricing.test.tsx
│   └── waitlist.test.tsx
└── dashboard-integration.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Component/Module Name', () => {
  describe('function/feature name', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should describe expected behavior', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

**Patterns:**
- Group related tests with nested `describe` blocks
- Use `beforeEach` for setup, `afterEach` for cleanup
- Clear mocks between tests with `vi.clearAllMocks()`
- Use descriptive test names starting with "should"

## Mocking

**Framework:** Vitest `vi` module

**Module Mocking:**
```typescript
// Mock external packages
vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
  del: vi.fn(),
}));

// Mock internal modules with path alias
vi.mock('@/lib/db/neon', () => ({
  sql: vi.fn(),
}));

// Mock with factory function
vi.mock('../ab-test-metrics', () => ({
  compareExperimentVariants: vi.fn(),
}));
```

**Spy on Functions:**
```typescript
let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchSpy = vi.spyOn(global, 'fetch');
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Use the spy
fetchSpy.mockResolvedValueOnce({
  ok: true,
  json: async () => mockResponse,
} as Response);
```

**Access Mocked Functions:**
```typescript
import { compareExperimentVariants } from '../ab-test-metrics';
const mockCompareExperimentVariants = vi.mocked(compareExperimentVariants);

// Set mock return value
mockCompareExperimentVariants.mockResolvedValue(mockData);
```

**What to Mock:**
- External API calls (fetch, database queries)
- Third-party services (Vercel Blob, Supabase)
- Browser APIs not available in jsdom (IntersectionObserver, ResizeObserver)
- Next.js router (`next/navigation`)
- Environment-dependent values

**What NOT to Mock:**
- The code under test
- Pure utility functions
- Type validators and guards

## Fixtures and Factories

**Test Data:**
```typescript
// Define test data inline
const baseExperimentData = {
  experimentName: 'test-experiment',
  winningVariant: {
    variantName: 'variant-a',
    sampleSize: 1500,
    errorRate: 0.02,
    p95LatencyMs: 500,
    successRate: 0.85,
  },
  controlVariant: {
    variantName: 'control',
    sampleSize: 1500,
    errorRate: 0.02,
    successRate: 0.80,
  },
  confidenceLevel: 96,
  testDurationHours: 48,
};

// Spread and override for variations
const insufficientSampleData = {
  ...baseExperimentData,
  winningVariant: { ...baseExperimentData.winningVariant, sampleSize: 50 },
};
```

**Location:**
- Inline within test files
- No separate fixtures directory detected

## Coverage

**Requirements:** None enforced

**Coverage Tool:** V8 (built into Vitest)

**View Coverage:**
```bash
npm run test:coverage
```

**Coverage Config from `vitest.config.ts`:**
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: [
    'node_modules/',
    '.next/',
    '**/*.config.*',
    '**/types/**',
  ],
}
```

## Test Types

**Unit Tests:**
- Focus on single function/module behavior
- Located in `__tests__/` alongside source
- Mock external dependencies
- Examples: `lib/auth/__tests__/token.test.ts`, `lib/notifications/__tests__/validators.test.ts`

**Component Tests:**
- Use `@testing-library/react` for rendering
- Test user-facing behavior, not implementation
- Wrap async renders in `act()`
- Examples: `tests/pages/home.test.tsx`, `tests/pages/pricing.test.tsx`

**Integration Tests:**
- Test multiple modules working together
- Mock at system boundaries (API, database)
- Example: `tests/dashboard-integration.test.ts`

**E2E Tests:**
- Not detected in current codebase

## Common Patterns

**Async Testing:**
```typescript
it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

// With rejected promise
it('should throw for invalid input', async () => {
  await expect(
    verifyToken('invalid.token.here', testSecret)
  ).rejects.toThrow();
});
```

**Error Testing:**
```typescript
it('should throw error for invalid format', () => {
  expect(() => calculateExpiration('invalid')).toThrow();
});

it('should throw specific error type', async () => {
  await expect(verifyToken('bad', 'secret')).rejects.toThrow('verification failed');
});
```

**React Component Testing:**
```typescript
import { render, screen, act } from '@testing-library/react';

it('should render without crashing', async () => {
  let container: HTMLElement;
  await act(async () => {
    const result = render(<Component />);
    container = result.container;
  });
  expect(container!).toBeDefined();
});

it('should display expected content', async () => {
  await act(async () => {
    render(<PricingPage />);
  });
  expect(screen.getByText('Most Popular')).toBeInTheDocument();
});
```

**Timer Testing:**
```typescript
it('should poll every 30 seconds', () => {
  vi.useFakeTimers();

  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  global.fetch = fetchMock;

  const interval = setInterval(() => fetch('/api/endpoint'), 30000);

  vi.advanceTimersByTime(30000);
  expect(fetchMock).toHaveBeenCalledTimes(1);

  clearInterval(interval);
  vi.useRealTimers();
});
```

**Environment Variable Testing:**
```typescript
describe('environment handling', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use env value when present', () => {
    process.env.MY_VAR = 'custom-value';
    const result = loadConfig();
    expect(result.setting).toBe('custom-value');
  });
});
```

## Setup Files

**Global Setup:** `vitest.setup.ts`

**Key Setup Includes:**
- `@testing-library/jest-dom/vitest` for DOM matchers
- Mock `IntersectionObserver` for framer-motion
- Mock `ResizeObserver`
- Mock `window.matchMedia` for responsive components
- Mock `window.scrollTo`, `requestAnimationFrame`
- Mock `next/navigation` (useRouter, usePathname, useSearchParams)
- Set test environment variables (`JWT_SECRET`)
- Auto-cleanup after each test

**Example from `vitest.setup.ts`:**
```typescript
import { expect, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
globalThis.IntersectionObserver = MockIntersectionObserver as any;

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
```

## Test Environment Configuration

**Vitest Config (`vitest.config.ts`):**
```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'dist'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

**Environment-Specific Tests:**
```typescript
/**
 * @vitest-environment node
 */
// Use for server-side only tests
```

## Writing New Tests

**For a new utility function:**
1. Create `__tests__/` directory next to source file
2. Name test file `{source-file}.test.ts`
3. Import function and test dependencies
4. Group tests with describe blocks
5. Mock external dependencies at module level
6. Clear mocks in beforeEach

**For a new React component:**
1. Add test to `tests/pages/` or co-locate in component directory
2. Use `@testing-library/react` for rendering
3. Wrap renders in `act()` for async components
4. Use screen queries for assertions
5. Test user-visible behavior, not implementation details

**For a new API route:**
1. Create test in `app/api/{route}/__tests__/route.test.ts`
2. Mock database and external services
3. Test request/response format
4. Test error handling paths

---

*Testing analysis: 2026-01-19*
