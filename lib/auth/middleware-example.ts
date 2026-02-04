/**
 * EXAMPLE: How to use authentication in your application
 *
 * This file demonstrates:
 * - Creating JWT tokens for login
 * - Verifying tokens in API routes
 * - Using auth context in route handlers
 * - Setting cookies for authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { signJWT, verifyToken } from './token';
import { createAuthContext, hasRole, hasPermission } from './middleware-utils';
import { UserRole } from '@/types/auth';
import type { LoginRequest, LoginResponse, UserData } from '@/types/auth';

/**
 * EXAMPLE 1: Login endpoint that creates JWT
 *
 * Usage:
 * POST /api/auth/login
 * Content-Type: application/json
 *
 * {
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 */
export async function exampleLoginHandler(
  req: NextRequest
): Promise<NextResponse<LoginResponse | { error: string }>> {
  try {
    const body = (await req.json()) as LoginRequest;

    // TODO: Validate credentials against database
    // const user = await db.users.findUnique({ where: { email: body.email } });
    // if (!user || !bcrypt.compareSync(body.password, user.passwordHash)) {
    //   return NextResponse.json(
    //     { error: 'Invalid credentials' },
    //     { status: 401 }
    //   );
    // }

    // Mock user for this example
    const user = {
      id: 'user-123',
      email: body.email,
      name: 'John Doe',
      role: UserRole.USER,
    };

    // Create JWT token (expires in 7 days by default)
    const token = await signJWT(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: ['read:documents', 'write:documents'],
      },
      { expiresIn: '7d' }
    );

    // Create response with token
    const response = NextResponse.json<LoginResponse>(
      {
        token,
        tokenType: 'Bearer',
        expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: new Date().toISOString(),
        },
      },
      { status: 200 }
    );

    // Set secure HTTP-only cookie with token
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}

/**
 * EXAMPLE 2: Protected API endpoint
 *
 * Usage:
 * GET /api/protected/user-profile
 * Authorization: Bearer <token>
 */
export async function exampleProtectedHandler(
  req: NextRequest
): Promise<NextResponse> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 401 }
      );
    }

    // Verify token
    const payload = await verifyToken(token);
    const authContext = createAuthContext(payload);

    if (!authContext.isAuthenticated) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Now you can use authContext to check permissions
    if (!hasPermission(authContext, 'read:profile')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Return protected data
    return NextResponse.json({
      userId: authContext.userId,
      email: authContext.email,
      role: authContext.role,
      data: 'This is protected data',
    });
  } catch (error) {
    console.error('Protected endpoint error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}

/**
 * EXAMPLE 3: Role-based access control
 *
 * Usage:
 * GET /api/admin/statistics
 * Authorization: Bearer <admin-token>
 */
export async function exampleAdminHandler(
  req: NextRequest
): Promise<NextResponse> {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    const authContext = createAuthContext(payload);

    // Check if user is admin
    if (!hasRole(authContext, UserRole.ADMIN)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Return admin data
    return NextResponse.json({
      stats: {
        totalUsers: 1000,
        totalRevenue: 50000,
        activeAgents: 25,
      },
    });
  } catch (error) {
    console.error('Admin endpoint error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}

/**
 * EXAMPLE 4: Logout endpoint
 *
 * Usage:
 * POST /api/auth/logout
 */
export async function exampleLogoutHandler(
  _req: NextRequest
): Promise<NextResponse> {
  const response = NextResponse.json({ success: true });

  // Clear auth cookie
  response.cookies.delete('token');
  response.cookies.delete('auth-token');
  response.cookies.delete('sahara_auth');

  return response;
}

/**
 * EXAMPLE 5: Refresh token endpoint
 *
 * Usage:
 * POST /api/auth/refresh
 */
export async function exampleRefreshHandler(
  req: NextRequest
): Promise<NextResponse> {
  try {
    // Get current token from cookie
    const token = req.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 401 }
      );
    }

    // Verify existing token
    const payload = await verifyToken(token);

    // Create new token with same claims
    const newToken = await signJWT(payload, { expiresIn: '7d' });

    const response = NextResponse.json({
      token: newToken,
      expiresIn: 7 * 24 * 60 * 60,
    });

    // Update cookie
    response.cookies.set({
      name: 'token',
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 401 }
    );
  }
}

/**
 * EXAMPLE 6: Getting auth context in middleware
 *
 * The middleware automatically attaches headers:
 * - x-user-id: User ID from JWT
 * - x-user-email: User email from JWT
 * - x-user-role: User role from JWT
 * - x-user-authenticated: 'true' if authenticated
 *
 * Usage in Server Components:
 * import { headers } from 'next/headers';
 *
 * export default async function MyComponent() {
 *   const headersList = await headers();
 *   const userId = headersList.get('x-user-id');
 *   const email = headersList.get('x-user-email');
 *   const role = headersList.get('x-user-role');
 *
 *   return (
 *     <div>
 *       <p>User: {email}</p>
 *       <p>Role: {role}</p>
 *     </div>
 *   );
 * }
 */

/**
 * EXAMPLE 7: Client-side token management
 *
 * Usage in Next.js Client Components:
 *
 * 'use client';
 *
 * import { useEffect, useState } from 'react';
 *
 * export function LoginForm() {
 *   const [loading, setLoading] = useState(false);
 *
 *   const handleLogin = async (email: string, password: string) => {
 *     setLoading(true);
 *     try {
 *       const response = await fetch('/api/auth/login', {
 *         method: 'POST',
 *         headers: { 'Content-Type': 'application/json' },
 *         body: JSON.stringify({ email, password }),
 *         credentials: 'include', // Important: include cookies
 *       });
 *
 *       const data = await response.json();
 *
 *       if (response.ok) {
 *         // Token is automatically in cookie
 *         // Redirect to dashboard
 *         window.location.href = '/dashboard';
 *       } else {
 *         console.error(data.error);
 *       }
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={(e) => {
 *       e.preventDefault();
 *       const email = (document.getElementById('email') as HTMLInputElement).value;
 *       const password = (document.getElementById('password') as HTMLInputElement).value;
 *       handleLogin(email, password);
 *     }}>
 *       <input id="email" type="email" required />
 *       <input id="password" type="password" required />
 *       <button disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
 *     </form>
 *   );
 * }
 */

// Export example handlers (don't use in production - these are examples)
export const exampleHandlers = {
  login: exampleLoginHandler,
  protected: exampleProtectedHandler,
  admin: exampleAdminHandler,
  logout: exampleLogoutHandler,
  refresh: exampleRefreshHandler,
};
