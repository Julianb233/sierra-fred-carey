# Next.js JWT Middleware Setup Guide

Complete production-ready JWT authentication middleware for Next.js with jose library integration.

## Overview

This middleware provides:
- JWT token validation using the JOSE library (edge-compatible)
- Cookie-based authentication with multiple cookie name support
- Protected and public route definitions
- Automatic token expiration checking
- User context propagation via headers
- TypeScript interfaces and type safety
- Security best practices

## Files Overview

### Core Middleware
- **`middleware.ts`** - Main middleware file (runs on all requests)
  - JWT token extraction from cookies
  - Token signature verification
  - Route-based access control
  - User context propagation

### Authentication Utilities
- **`lib/auth/token.ts`** - JWT token operations
  - `signJWT()` - Create new JWT tokens
  - `verifyToken()` - Verify token signature and expiration
  - `getJWTSecret()` - Load secret from environment
  - Helper functions for token handling

- **`lib/auth/middleware-utils.ts`** - Middleware helper functions
  - Route matching and protection logic
  - Permission and role checking
  - Auth context creation
  - Input validation

### Type Definitions
- **`types/auth.ts`** - Complete TypeScript interfaces
  - `JWTPayload` - JWT payload structure
  - `UserSession` - Session data
  - `AuthContext` - Auth context for middleware
  - Helper types and enums

### Examples
- **`lib/auth/middleware-example.ts`** - Real-world usage examples
  - Login/logout endpoints
  - Protected API routes
  - Role-based access control
  - Token refresh

## Installation

### 1. Install Dependencies

```bash
npm install jose
# or
yarn add jose
# or
pnpm add jose
```

The `jose` library is already included in Next.js Edge Runtime.

### 2. Configure Environment Variables

Update your `.env.local` (or `.env.production` for production):

```bash
# Generate a strong secret:
# openssl rand -base64 32

JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_TOKEN_EXPIRES_IN=7d
JWT_REFRESH_TOKEN_EXPIRES_IN=30d

# For production
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_HTTP_ONLY=true
AUTH_COOKIE_SAME_SITE=lax
```

### 3. Middleware is Already in Place

The `middleware.ts` file is already configured in your project root.

## Usage

### Protected Routes

By default, these routes are protected:
- `/dashboard` and subpaths
- `/agents` and subpaths
- `/documents` and subpaths
- `/settings` and subpaths
- `/profile` and subpaths
- `/api/protected/*` (API routes)

Modify the `PROTECTED_ROUTES` object in `middleware.ts` to change protected routes.

### Public Routes

These routes don't require authentication:
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/api/auth/*` (auth endpoints)
- `/_next/*` (Next.js internals)
- `/public/*` (static public files)
- `/favicon.ico`, `/robots.txt`

### Creating Login Endpoint

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { signJWT } from '@/lib/auth/token';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  // TODO: Validate credentials against your database
  // const user = await db.users.verify(email, password);

  const user = {
    id: 'user-123',
    email: 'user@example.com',
    role: 'user',
  };

  // Create JWT token (7 days expiration)
  const token = await signJWT(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: ['read:documents'],
    },
    { expiresIn: '7d' }
  );

  const response = NextResponse.json({
    token,
    expiresIn: 7 * 24 * 60 * 60,
  });

  // Set secure HTTP-only cookie
  response.cookies.set({
    name: 'token',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });

  return response;
}
```

### Protected API Routes

```typescript
// app/api/protected/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/token';
import { createAuthContext, hasPermission } from '@/lib/auth/middleware-utils';

export async function GET(req: NextRequest) {
  try {
    // Get token from header (set by middleware)
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 401 }
      );
    }

    // Verify token
    const payload = await verifyToken(token);
    const authContext = createAuthContext(payload);

    // Check permission
    if (!hasPermission(authContext, 'read:documents')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      userId: authContext.userId,
      email: authContext.email,
      role: authContext.role,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}
```

### Using Auth Context in Server Components

The middleware automatically adds user info to request headers:

```typescript
// app/dashboard/page.tsx
import { headers } from 'next/headers';

export default async function DashboardPage() {
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const email = headersList.get('x-user-email');
  const role = headersList.get('x-user-role');
  const isAuthenticated = headersList.get('x-user-authenticated') === 'true';

  if (!isAuthenticated) {
    return <div>Not authenticated</div>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>User: {email}</p>
      <p>Role: {role}</p>
    </div>
  );
}
```

### Client-Side Login

```typescript
// components/LoginForm.tsx
'use client';

import { useState } from 'react';

export function LoginForm() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Important!
      });

      if (response.ok) {
        // Token is automatically in cookie
        window.location.href = '/dashboard';
      } else {
        const error = await response.json();
        console.error(error.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

## Configuration

### Changing Protected Routes

Edit the `PROTECTED_ROUTES` constant in `middleware.ts`:

```typescript
const PROTECTED_ROUTES = {
  paths: [
    '/dashboard',
    '/agents',
    '/documents',
    '/admin', // Add new protected path
    '/settings',
    '/profile',
  ],
  patterns: [
    /^\/api\/protected\//,
    /^\/api\/admin\//,  // Add new protected pattern
  ],
};
```

### Changing Public Routes

Edit the `PUBLIC_ROUTES` constant in `middleware.ts`:

```typescript
const PUBLIC_ROUTES = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/privacy-policy',  // Add new public route
  '/favicon.ico',
  '/robots.txt',
]);
```

### Changing Cookie Names

Edit the `COOKIE_NAMES` array in `middleware.ts`:

```typescript
const COOKIE_NAMES = [
  'token',           // Primary cookie name
  'auth-token',      // Fallback names
  'sahara_auth',
  'custom-token',    // Add custom cookie name
];
```

## Security Considerations

### JWT_SECRET

The JWT secret is used to sign and verify tokens. It must be:
- **Strong**: At least 32 characters
- **Random**: Use `openssl rand -base64 32` to generate
- **Unique**: Different for each environment
- **Secure**: Never committed to git
- **Rotatable**: Plan for secret rotation

Generate a production secret:
```bash
openssl rand -base64 32
```

### Token Expiration

Tokens automatically expire based on the `exp` claim. Set appropriate expiration times:
- **Access Token**: 7 days (or less for sensitive apps)
- **Refresh Token**: 30 days

### Secure Cookies

The middleware sets secure cookie flags:
- `httpOnly: true` - Prevents JavaScript access (XSS protection)
- `secure: true` - Only sent over HTTPS in production
- `sameSite: 'lax'` - CSRF protection

### Token Storage

Tokens are stored in HTTP-only cookies (not localStorage) for maximum security:
- Protected from XSS attacks
- Automatically sent with requests
- Cleared on logout

### Rate Limiting

Consider adding rate limiting to auth endpoints:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 h'),
});

export async function POST(req: NextRequest) {
  const ip = req.ip || 'unknown';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  // ... login logic
}
```

## Type Safety

Use the provided types for type-safe authentication:

```typescript
import type { JWTPayload, LoginRequest, UserData } from '@/types/auth';
import { hasRole, hasPermission } from '@/lib/auth/middleware-utils';
import type { AuthContext } from '@/types/auth';

const authContext: AuthContext = {
  isAuthenticated: true,
  userId: 'user-123',
  email: 'user@example.com',
  role: 'user',
  permissions: ['read:documents', 'write:documents'],
};

// Type-safe permission checking
if (hasPermission(authContext, 'write:documents')) {
  // Allow write access
}

// Type-safe role checking
if (hasRole(authContext, 'admin')) {
  // Show admin panel
}
```

## Testing

### Test Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' \
  -v
```

### Test Protected Route

```bash
# With token in Authorization header
curl http://localhost:3000/api/protected/profile \
  -H "Authorization: Bearer <token>" \
  -v

# Or with cookie (automatic)
curl http://localhost:3000/dashboard \
  -b "token=<token>" \
  -v
```

### Test Token Refresh

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -b "token=<token>" \
  -v
```

## Troubleshooting

### "JWT_SECRET environment variable is not set"

**Solution**: Set `JWT_SECRET` in your `.env.local`:
```bash
JWT_SECRET=$(openssl rand -base64 32)
```

### "Token verification failed: signature verification failed"

**Cause**: Wrong secret or token was signed with different secret
**Solution**: Ensure the same secret is used for signing and verification

### "Missing token" or "Invalid token"

**Cause**: Token cookie not set or expired
**Solution**:
- Check that login sets the cookie correctly
- Verify token hasn't expired
- Check cookie secure/sameSite settings match request

### Middleware not running

**Cause**: Route not matched by middleware matcher
**Solution**: Check the `matcher` config in `middleware.ts`

### Cookies not persisting

**Cause**: Browser blocking cookies (secure flag on HTTP, sameSite issues)
**Solution**:
- Use HTTPS in production
- Check sameSite settings
- Test with Chrome DevTools > Application > Cookies

## Production Deployment

### Vercel

Set environment variables in Vercel dashboard:

```
JWT_SECRET = [your-generated-secret]
JWT_ACCESS_TOKEN_EXPIRES_IN = 7d
JWT_REFRESH_TOKEN_EXPIRES_IN = 30d
AUTH_COOKIE_SECURE = true
AUTH_COOKIE_HTTP_ONLY = true
NODE_ENV = production
```

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV JWT_SECRET=$JWT_SECRET

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
docker run -e JWT_SECRET=$(openssl rand -base64 32) myapp
```

### Environment Setup

**Development** (`NODE_ENV=development`):
- Insecure cookies allowed
- Dev-mode secret fallback provided
- Console warnings for security

**Production** (`NODE_ENV=production`):
- Secure cookies enforced (HTTPS only)
- JWT_SECRET required (no fallback)
- No debug logging

## Advanced Usage

### Custom Claims

Add custom claims to tokens:

```typescript
const token = await signJWT({
  sub: user.id,
  email: user.email,
  role: user.role,
  organizationId: org.id,
  tier: 'premium',
  features: ['export', 'api-access', 'sso'],
});
```

### Refresh Token Flow

```typescript
// In your refresh endpoint
const { payload } = await jwtVerify(refreshToken, secret);
const newAccessToken = await signJWT(payload, { expiresIn: '7d' });
const newRefreshToken = await signJWT(payload, { expiresIn: '30d' });

return { accessToken: newAccessToken, refreshToken: newRefreshToken };
```

### Permission-Based Routes

```typescript
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  moderator: ['read:documents', 'write:documents', 'delete:comments'],
  user: ['read:documents', 'write:documents'],
  guest: ['read:documents'],
};

function canAccessEndpoint(role: string, endpoint: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes('*') || permissions.includes(endpoint);
}
```

## Performance

The middleware is optimized for Edge Runtime:
- Uses `jose` (edge-compatible)
- No database calls in middleware
- Early route checks minimize token verification
- Efficient regex patterns for route matching

For additional performance:
- Cache user permissions in token claims
- Use short-lived access tokens with refresh tokens
- Consider CDN-level authentication for static content

## Further Reading

- [jose library documentation](https://github.com/panva/jose)
- [IANA JWT Claims Registry](https://tools.ietf.org/html/rfc7519)
- [Next.js Middleware](https://nextjs.org/docs/advanced-features/middleware)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
