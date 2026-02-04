# Coding Conventions

**Analysis Date:** 2026-01-19

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `MetricsCard.tsx`, `AlertsPanel.tsx`)
- Utility modules: kebab-case (e.g., `ab-test-metrics.ts`, `auto-promotion.ts`)
- Test files: `*.test.ts` or `*.test.tsx` suffix
- Type definition files: lowercase or kebab-case (e.g., `types.ts`, `auth.ts`)
- Index files: `index.ts` for barrel exports

**Functions:**
- camelCase for all functions (e.g., `signJWT`, `verifyTokenSafely`, `sendNotification`)
- Async functions: no special prefix, use `async/await`
- Type guards: prefix with `is` (e.g., `isAlertLevel`, `isTokenExpired`)
- Validators: prefix with `validate` (e.g., `validateNotificationPayload`)
- Assertion functions: prefix with `assert` (e.g., `assertValidPayload`)

**Variables:**
- camelCase for variables and parameters
- UPPER_SNAKE_CASE for constants (e.g., `DEFAULT_THRESHOLDS`, `VALID_ALERT_LEVELS`)
- Boolean variables: use `is`, `has`, `should` prefixes (e.g., `isValid`, `hasPermission`)

**Types:**
- PascalCase for interfaces and types (e.g., `JWTPayload`, `AlertThresholds`)
- Enums: PascalCase with PascalCase members (e.g., `UserRole.ADMIN`)
- Props interfaces: suffix with `Props` (e.g., `MetricsCardProps`)

## Code Style

**Formatting:**
- No dedicated Prettier config - uses ESLint defaults from Next.js
- 2-space indentation (inferred from codebase)
- Single quotes for strings in TypeScript files
- Semicolons at end of statements

**Linting:**
- ESLint with Next.js configuration: `next/core-web-vitals`, `next/typescript`
- Config location: `.eslintrc.json`
- Run with: `npm run lint`

**TypeScript:**
- Strict mode enabled (`"strict": true` in `tsconfig.json`)
- Path alias `@/*` maps to project root
- Target: ES2017
- JSX: react-jsx

## Import Organization

**Order:**
1. External packages (React, Next.js, third-party libraries)
2. Internal modules with path alias (`@/lib/*`, `@/components/*`, `@/types/*`)
3. Relative imports (same directory or nearby files)
4. Types (often imported with `type` keyword)

**Example from `lib/monitoring/alerts.ts`:**
```typescript
import { sendNotification } from '@/lib/notifications';
import { AlertLevel, AlertType } from '@/lib/notifications/types';
```

**Path Aliases:**
- `@/*` - Project root (configured in `tsconfig.json`)

## Error Handling

**Patterns:**
- Use try/catch blocks for async operations
- Return `null` for "safe" functions that should not throw (e.g., `verifyTokenSafely`)
- Throw errors for strict functions (e.g., `verifyToken`)
- Custom error classes with type classification (e.g., `AuthError` with `AuthErrorType`)

**Example from `lib/auth/token.ts`:**
```typescript
export async function verifyTokenSafely(
  token: string,
  secret?: string
): Promise<JWTPayload | null> {
  try {
    const secretKey = secret || getJWTSecret();
    const verified = await jwtVerify(token, secretBuffer);
    return verified.payload as JWTPayload;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Token verification failed:', error.message);
    }
    return null;
  }
}
```

**Validation Pattern:**
- Return `ValidationResult` objects with `{ valid: boolean, errors: string[] }`
- Use type guards for runtime validation (e.g., `isAlertLevel()`)
- Provide sanitize functions alongside validators (e.g., `sanitizePayload`)

## Logging

**Framework:** `console` (native)

**Patterns:**
- Use brackets for context: `[Monitoring]`, `[Auth]`
- Log errors with `console.error()`
- Use `console.warn()` for development warnings
- Include timestamps in metadata for alerts

**Example:**
```typescript
console.log('[Monitoring] Check completed successfully');
console.error('[Monitoring] Error during monitoring check:', error);
```

## Comments

**When to Comment:**
- JSDoc blocks for public API functions
- Inline comments for complex logic
- File headers with purpose description
- Environment-specific notes (e.g., `@vitest-environment node`)

**JSDoc/TSDoc:**
- Use `@param` for parameters
- Use `@returns` for return values
- Use `@throws` for functions that throw
- Include examples in complex functions

**Example from `lib/auth/token.ts`:**
```typescript
/**
 * Sign a JWT token
 *
 * @param payload - Data to include in token
 * @param options - Signing options
 * @returns Signed JWT token
 */
export async function signJWT(
  payload: Record<string, any>,
  options?: { expiresIn?: string | number; secret?: string }
): Promise<string> { ... }
```

## Function Design

**Size:**
- Keep functions focused on single responsibility
- Extract helpers for repeated logic
- Larger orchestration functions acceptable for complex flows

**Parameters:**
- Use options objects for 3+ optional parameters
- Provide sensible defaults
- Use TypeScript optional parameters (`param?: Type`)

**Return Values:**
- Explicit return types on all exported functions
- Use union types for functions that can fail gracefully (e.g., `Promise<T | null>`)
- Return result objects for complex operations

## Module Design

**Exports:**
- Named exports for all functions and types
- Default exports only for React components (page components)
- Barrel exports via `index.ts` for public APIs

**Example from `lib/notifications/index.ts`:**
```typescript
export { sendNotification } from './service';
export * from './types';
export * from './validators';
```

## React Component Patterns

**Client vs Server:**
- Use `"use client"` directive at top for client components
- Server components are default in Next.js App Router
- Client components in `components/` with interactive features

**Props:**
- Define interface above component
- Use destructuring in function signature
- Provide default values where appropriate

**Example from `components/monitoring/MetricsCard.tsx`:**
```typescript
interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down" | "neutral";
  loading?: boolean;
}

export function MetricsCard({
  title,
  value,
  change,
  trend = "neutral",
  loading = false,
}: MetricsCardProps) { ... }
```

**Styling:**
- Tailwind CSS classes
- `cn()` utility for conditional classes (from `lib/utils.ts`)
- Use CSS variables for theming (e.g., `hsl(var(--background))`)
- Dark mode with `dark:` prefix classes

## Constants and Configuration

**Pattern:**
- Define defaults as exported constants
- Allow overrides via function parameters
- Support environment variable configuration
- Provide preset configurations for common use cases

**Example from `lib/ab-testing/promotion-rules.ts`:**
```typescript
export const DEFAULT_PROMOTION_RULES = {
  minSampleSize: 1000,
  minConfidenceLevel: 95,
  requireManualApproval: true,
};

export const AGGRESSIVE_PROMOTION_RULES = {
  minSampleSize: 100,
  minConfidenceLevel: 90,
  requireManualApproval: false,
};
```

## API Route Patterns

**Response Format:**
- Use consistent response structure: `{ success: boolean, data?: T, error?: string }`
- Include timestamp in monitoring responses
- Return appropriate HTTP status codes

**Example:**
```typescript
return NextResponse.json({
  success: true,
  data: { ... },
  timestamp: new Date().toISOString(),
});
```

---

*Convention analysis: 2026-01-19*
