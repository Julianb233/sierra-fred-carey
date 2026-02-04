# JWT Authentication - Quick Reference

Production-ready JWT middleware with complete type safety for your Next.js application.

## What Was Created

### Core Files
1. **`middleware.ts`** - Main authentication middleware
   - JWT verification using jose library
   - Cookie-based token extraction (checks: token, auth-token, sahara_auth)
   - Protected/public route management
   - Automatic user context propagation via headers

2. **`types/auth.ts`** - Complete TypeScript definitions
   - JWTPayload, UserSession, AuthContext interfaces
   - AuthError class with type classification
   - Helper functions (hasPermission, hasRole, isAdmin)

3. **`lib/auth/token.ts`** - Token utilities
   - signJWT() - Create tokens
   - verifyToken() / verifyTokenSafely() - Validate tokens
   - Helper functions for token handling

4. **`lib/auth/middleware-utils.ts`** - Route and permission logic
   - isProtectedRoute() - Check if route needs auth
   - isPublicRoute() - Check if route is public
   - createAuthContext() - Build auth state
   - Permission and role checking functions

5. **`lib/auth/middleware-example.ts`** - Real-world examples
   - Login/logout endpoints
   - Protected API routes
   - Role-based access control
   - Token refresh

6. **`lib/auth/__tests__/token.test.ts`** - Unit tests
   - Test JWT signing and verification
   - Token expiration tests
   - Error handling tests

7. **`docs/MIDDLEWARE_SETUP.md`** - Complete documentation
8. **`.env.example`** - Updated with JWT configuration

## Quick Start

### 1. Set JWT_SECRET

```bash
# Generate strong secret
JWT_SECRET=$(openssl rand -base64 32)

# Add to .env.local
echo "JWT_SECRET=$JWT_SECRET" >> .env.local
```

### 2. Create Login Endpoint

```typescript
// app/api/auth/login/route.ts
import { signJWT } from '@/lib/auth/token';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  // TODO: Verify credentials
  const user = { id: 'user-123', email, role: 'user' };

  const token = await signJWT(
    { sub: user.id, email: user.email, role: user.role },
    { expiresIn: '7d' }
  );

  const response = NextResponse.json({ token });
  response.cookies.set({
    name: 'token',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
  });

  return response;
}
```

### 3. Access Auth in Server Components

```typescript
// app/dashboard/page.tsx
import { headers } from 'next/headers';

export default async function Dashboard() {
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const email = headersList.get('x-user-email');
  const role = headersList.get('x-user-role');

  return <div>Welcome, {email}!</div>;
}
```

### 4. Protect API Routes

```typescript
// app/api/protected/data/route.ts
import { verifyToken } from '@/lib/auth/token';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await verifyToken(token);
    return NextResponse.json({ data: 'secret', userId: payload.sub });
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
```

## Configuration

### Protected Routes (in middleware.ts)
```typescript
const PROTECTED_ROUTES = {
  paths: ['/dashboard', '/agents', '/documents', '/settings', '/profile'],
  patterns: [/^\/api\/protected\//],
};
```

### Public Routes (in middleware.ts)
```typescript
const PUBLIC_ROUTES = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/favicon.ico',
  '/robots.txt',
]);
```

### Environment Variables
```bash
# Required
JWT_SECRET=your-strong-secret-key

# Optional (sensible defaults provided)
JWT_ACCESS_TOKEN_EXPIRES_IN=7d
JWT_REFRESH_TOKEN_EXPIRES_IN=30d
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_HTTP_ONLY=true
AUTH_COOKIE_SAME_SITE=lax
NODE_ENV=development
```

## Common Patterns

### Check Permissions
```typescript
import { hasPermission } from '@/lib/auth/middleware-utils';
import type { AuthContext } from '@/types/auth';

const authContext: AuthContext = {
  isAuthenticated: true,
  userId: 'user-123',
  role: 'user',
  permissions: ['read:documents', 'write:documents'],
};

if (hasPermission(authContext, 'write:documents')) {
  // Allow write
}
```

### Check Role
```typescript
import { hasRole, isAdmin } from '@/lib/auth/middleware-utils';

if (hasRole(authContext, ['admin', 'moderator'])) {
  // Admin or moderator
}

if (isAdmin(authContext)) {
  // Admin only
}
```

### Client-Side Login
```typescript
'use client';

async function handleLogin(email: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include', // Important!
  });

  if (res.ok) {
    window.location.href = '/dashboard';
  }
}
```

### Extract Token in Route Handler
```typescript
import { extractTokenFromHeader } from '@/lib/auth/token';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return NextResponse.json({ error: 'No token' }, { status: 401 });
  }

  // Use token...
}
```

## File Structure

```
project-root/
├── middleware.ts                          # Main middleware
├── types/
│   └── auth.ts                           # Type definitions
├── lib/auth/
│   ├── token.ts                          # Token utilities
│   ├── middleware-utils.ts               # Route/permission logic
│   ├── middleware-example.ts             # Usage examples
│   └── __tests__/
│       └── token.test.ts                 # Unit tests
├── docs/
│   └── MIDDLEWARE_SETUP.md               # Full documentation
├── .env.example                          # Updated with JWT vars
└── app/
    └── api/auth/                         # Your auth endpoints
```

## Security Features

- **HTTP-Only Cookies**: Token stored securely (XSS protection)
- **Secure Flag**: Only sent over HTTPS in production
- **SameSite Policy**: CSRF protection
- **Signature Verification**: jose library validates JWT signature
- **Expiration Checking**: Automatic token expiration handling
- **Edge Compatible**: Runs on Vercel Edge Runtime
- **Type Safe**: Full TypeScript support

## Testing

```bash
# Test middleware locally
npm run dev

# Test login endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  -v

# Test protected route
curl http://localhost:3000/dashboard -b "token=<token>" -v
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "JWT_SECRET not set" | Add JWT_SECRET to .env.local |
| Token verification failed | Ensure same secret used for signing/verification |
| Cookies not persisting | Use HTTPS in production, check sameSite settings |
| 401 Unauthorized | Check token is in correct cookie or header |
| Middleware not running | Verify route matches middleware matcher config |

## Production Deployment

### Vercel
```bash
vercel env add JWT_SECRET $(openssl rand -base64 32)
vercel env add NODE_ENV production
vercel deploy
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV JWT_SECRET=${JWT_SECRET}
CMD ["npm", "start"]
```

## Next Steps

1. Configure protected routes in middleware.ts
2. Create login endpoint at `/api/auth/login`
3. Create logout endpoint at `/api/auth/logout`
4. Add database user verification
5. Implement password hashing with bcrypt
6. Add refresh token rotation
7. Set up rate limiting on auth endpoints
8. Add audit logging for security events

## File References

- **Middleware**: `/Users/julianbradley/CODEING /sierra-fred-carey/middleware.ts`
- **Types**: `/Users/julianbradley/CODEING /sierra-fred-carey/types/auth.ts`
- **Token Utils**: `/Users/julianbradley/CODEING /sierra-fred-carey/lib/auth/token.ts`
- **Route Utils**: `/Users/julianbradley/CODEING /sierra-fred-carey/lib/auth/middleware-utils.ts`
- **Examples**: `/Users/julianbradley/CODEING /sierra-fred-carey/lib/auth/middleware-example.ts`
- **Tests**: `/Users/julianbradley/CODEING /sierra-fred-carey/lib/auth/__tests__/token.test.ts`
- **Docs**: `/Users/julianbradley/CODEING /sierra-fred-carey/docs/MIDDLEWARE_SETUP.md`

## Additional Resources

- [jose Library Docs](https://github.com/panva/jose)
- [Next.js Middleware Docs](https://nextjs.org/docs/advanced-features/middleware)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [RFC 7519 - JSON Web Token (JWT)](https://tools.ietf.org/html/rfc7519)
