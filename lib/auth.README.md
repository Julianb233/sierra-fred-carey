# Authentication Library - Developer Guide

## Quick Start

### Import the auth utilities
```typescript
import { requireAuth, getOptionalUserId, requireOwnership } from "@/lib/auth";
```

---

## Common Patterns

### 1. Protected API Route (Most Common)

User MUST be authenticated to access this endpoint.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sql } from "@/lib/db/supabase-sql";

export async function GET(request: NextRequest) {
  // Get authenticated user ID - throws 401 if not authenticated
  const userId = await requireAuth();

  // Query user's data
  const data = await sql`
    SELECT * FROM user_data WHERE user_id = ${userId}
  `;

  return NextResponse.json({ data });
}
```

### 2. Optional Authentication

Endpoint works for both authenticated and anonymous users.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getOptionalUserId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  // Get user ID if authenticated, null if not
  const userId = await getOptionalUserId();

  if (userId) {
    // Personalized response for authenticated users
    return NextResponse.json({ message: "Welcome back!", userId });
  } else {
    // Generic response for anonymous users
    return NextResponse.json({ message: "Welcome, guest!" });
  }
}
```

### 3. Resource Ownership Check

Verify user owns a resource before allowing access/modification.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireOwnership } from "@/lib/auth";
import { sql } from "@/lib/db/supabase-sql";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuth();
  const { id } = await params;

  // Fetch the resource
  const [resource] = await sql`
    SELECT * FROM resources WHERE id = ${id}
  `;

  if (!resource) {
    return NextResponse.json(
      { error: "Resource not found" },
      { status: 404 }
    );
  }

  // Verify user owns this resource
  await requireOwnership(userId, resource.user_id);

  // Delete the resource
  await sql`DELETE FROM resources WHERE id = ${id}`;

  return NextResponse.json({ success: true });
}
```

### 4. Get Full User Info

When you need email or metadata in addition to user ID.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  // Access user properties
  console.log(user.id);             // User ID
  console.log(user.email);          // Email address
  console.log(user.emailVerified);  // Email confirmation status
  console.log(user.metadata);       // Custom user metadata

  return NextResponse.json({ user });
}
```

---

## API Reference

### `requireAuth(): Promise<string>`

**Use when:** Endpoint requires authentication

**Returns:** User ID string

**Throws:** 401 Response if not authenticated

```typescript
const userId = await requireAuth();
// If we get here, user is authenticated
```

---

### `getOptionalUserId(): Promise<string | null>`

**Use when:** Endpoint works with or without authentication

**Returns:** User ID string if authenticated, `null` if not

**Never throws**

```typescript
const userId = await getOptionalUserId();
if (userId) {
  // User is authenticated
} else {
  // Anonymous user
}
```

---

### `getAuthUser(): Promise<AuthUser | null>`

**Use when:** You need user email or metadata

**Returns:** `AuthUser` object or `null`

```typescript
interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  metadata?: Record<string, unknown>;
}
```

**Never throws**

```typescript
const user = await getAuthUser();
if (user) {
  console.log(`User ${user.email} is authenticated`);
}
```

---

### `getUserId(): Promise<string | null>`

**Use when:** You want user ID but don't want to throw

**Returns:** User ID string or `null`

**Never throws**

```typescript
const userId = await getUserId();
// Same as getOptionalUserId(), just a different name
```

---

### `requireOwnership(userId: string, resourceUserId: string): Promise<void>`

**Use when:** Verifying user owns a resource

**Returns:** `void` (nothing) if ownership verified

**Throws:** 403 Response if ownership check fails

```typescript
await requireOwnership(authenticatedUserId, resource.userId);
// If we get here, user owns the resource
```

---

### `signOut(): Promise<void>`

**Use when:** Logging user out server-side

**Returns:** `void` (nothing)

**Never throws** (fails silently)

```typescript
await signOut();
// User session is cleared
```

---

## Security Best Practices

### ✅ DO

```typescript
// ✅ Get userId from server-side session
const userId = await requireAuth();

// ✅ Filter database queries by authenticated userId
const data = await sql`
  SELECT * FROM table WHERE user_id = ${userId}
`;

// ✅ Verify ownership before modifications
await requireOwnership(userId, resource.userId);

// ✅ Use try/catch if needed
try {
  const userId = await requireAuth();
} catch (error) {
  // Handle 401 response
}
```

### ❌ DON'T

```typescript
// ❌ NEVER trust client headers
const userId = request.headers.get("x-user-id");

// ❌ NEVER use "anonymous" fallback for user data
const userId = someUserId || "anonymous";

// ❌ NEVER accept userId from request body
const { userId } = await request.json();

// ❌ NEVER skip authentication for "convenience"
const userId = "test-user-123";
```

---

## Error Handling

### When `requireAuth()` Throws

```typescript
try {
  const userId = await requireAuth();
  // Process authenticated request
} catch (error) {
  // Error is a Response object with status 401
  if (error instanceof Response) {
    return error; // Return the 401 response
  }
  throw error; // Unexpected error
}
```

### When `requireOwnership()` Throws

```typescript
try {
  await requireOwnership(userId, resource.userId);
  // User owns the resource
} catch (error) {
  // Error is a Response object with status 403
  if (error instanceof Response) {
    return error; // Return the 403 response
  }
  throw error; // Unexpected error
}
```

**Note:** In most cases, you don't need try/catch - Next.js will handle the thrown Response.

---

## Middleware vs API Auth

### Middleware
- Runs BEFORE page/API routes
- Checks if user is authenticated
- Redirects to `/login` if not
- Protects entire routes (e.g., `/dashboard/*`)

### API Route Auth
- Runs INSIDE API route handler
- Gets actual user ID from session
- Returns 401 if not authenticated
- Independent validation (defense in depth)

**Both are needed** for maximum security!

---

## Testing

### Test with authenticated user
```typescript
// In your test, create a Supabase session first
const supabase = createClient();
await supabase.auth.signInWithPassword({
  email: "test@example.com",
  password: "password123"
});

// Then call your API
const response = await fetch("/api/protected", {
  // Session cookie automatically included
});
```

### Test without authentication
```typescript
// No session setup needed
const response = await fetch("/api/protected");
expect(response.status).toBe(401);
```

---

## Migration Guide

### Old Pattern (INSECURE)
```typescript
export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id") || "anonymous";
  // ... rest of code
}
```

### New Pattern (SECURE)
```typescript
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userId = await requireAuth();
  // ... rest of code (no other changes needed!)
}
```

**That's it!** Two line change:
1. Import `requireAuth`
2. Replace userId extraction with `await requireAuth()`

---

## Troubleshooting

### "401 Unauthorized" error
**Cause:** User not authenticated
**Fix:** Ensure user is logged in

### "403 Forbidden" error
**Cause:** User doesn't own the resource
**Fix:** Verify resource belongs to user

### Session not persisting
**Cause:** Cookie issues
**Fix:** Check HTTPS in production, verify cookie domain

### TypeScript errors
**Cause:** Async/await not used
**Fix:** Always `await` auth functions

---

## Examples in Codebase

See these files for working examples:

- `/root/github-repos/sierra-fred-carey/app/api/journey/milestones/route.ts` - Protected route
- `/root/github-repos/sierra-fred-carey/app/api/journey/insights/route.ts` - Protected route
- `/root/github-repos/sierra-fred-carey/app/api/chat/route.ts` - Optional auth
- `/root/github-repos/sierra-fred-carey/app/api/documents/route.ts` - Protected route

---

## Questions?

1. Check `/root/github-repos/sierra-fred-carey/SECURITY_FIX_SUMMARY.md` for overview
2. Review `/root/github-repos/sierra-fred-carey/lib/auth.ts` for implementation
3. See examples in `/root/github-repos/sierra-fred-carey/app/api/` routes
