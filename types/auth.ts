/**
 * Authentication Type Definitions
 *
 * Comprehensive TypeScript interfaces for JWT handling, user authentication,
 * and session management across the application.
 */

/**
 * Standard JWT Claims (IANA Registered Claims)
 * https://tools.ietf.org/html/rfc7519#section-4.1
 */
export interface StandardJWTClaims {
  /** Issued at time (seconds since epoch) */
  iat?: number;
  /** Expiration time (seconds since epoch) */
  exp?: number;
  /** Not before time (seconds since epoch) */
  nbf?: number;
  /** Subject - unique identifier for the principal */
  sub?: string;
  /** Issuer */
  iss?: string;
  /** Audience */
  aud?: string | string[];
  /** JWT ID - unique identifier for the token */
  jti?: string;
}

/**
 * User information embedded in JWT payload
 */
export interface UserPayload {
  /** User ID - can come from sub or userId depending on implementation */
  userId?: string;
  /** User email address */
  email?: string;
  /** User display name */
  name?: string;
  /** User role for RBAC */
  role?: UserRole;
  /** Fine-grained permissions */
  permissions?: string[];
  /** Organization ID if multi-tenant */
  organizationId?: string;
}

/**
 * Complete JWT Payload - standard claims + custom user data
 */
export interface JWTPayload extends StandardJWTClaims, UserPayload {
  /** Allow additional custom claims */
  [key: string]: unknown;
}

/**
 * User roles for role-based access control
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
  AGENT = 'agent',
  MODERATOR = 'moderator',
  EDITOR = 'editor',
}

/**
 * Decoded and verified JWT with metadata
 */
export interface DecodedToken {
  /** Verified JWT payload */
  payload: JWTPayload;
  /** Whether the token is valid and not expired */
  isValid: boolean;
  /** Error message if token is invalid */
  error?: string;
}

/**
 * User session stored in database/cache
 */
export interface UserSession {
  /** Session ID */
  id: string;
  /** User ID */
  userId: string;
  /** JWT token */
  token: string;
  /** Token expiration timestamp */
  expiresAt: number;
  /** Session creation timestamp */
  createdAt: number;
  /** Last activity timestamp */
  lastActivityAt: number;
  /** User agent for device tracking */
  userAgent?: string;
  /** IP address for session location */
  ipAddress?: string;
  /** Whether session is active */
  isActive: boolean;
}

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
  /** Remember me flag for longer session duration */
  rememberMe?: boolean;
}

/**
 * Login response with token
 */
export interface LoginResponse {
  /** JWT access token */
  token: string;
  /** Token type (usually "Bearer") */
  tokenType: string;
  /** Token expiration in seconds */
  expiresIn: number;
  /** Refresh token (if using refresh token flow) */
  refreshToken?: string;
  /** User information */
  user: UserData;
}

/**
 * Refresh token request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Refresh token response
 */
export interface RefreshTokenResponse {
  token: string;
  expiresIn: number;
  refreshToken?: string;
}

/**
 * User data returned in responses (no sensitive info)
 */
export interface UserData {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId?: string;
  avatar?: string;
  createdAt: string;
  lastLoginAt?: string;
}

/**
 * Registration request
 */
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  organizationId?: string;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset confirmation
 */
export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

/**
 * Auth error types
 */
export enum AuthErrorType {
  MISSING_TOKEN = 'MISSING_TOKEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  INVALID_CLAIMS = 'INVALID_CLAIMS',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
}

/**
 * Auth error with type classification
 */
export class AuthError extends Error {
  constructor(
    public type: AuthErrorType,
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Middleware request context with auth info
 */
export interface AuthContext {
  /** Is user authenticated */
  isAuthenticated: boolean;
  /** Decoded JWT payload */
  payload?: JWTPayload;
  /** User ID if authenticated */
  userId?: string;
  /** User email if authenticated */
  email?: string;
  /** User role if authenticated */
  role?: UserRole;
  /** Array of permissions */
  permissions: string[];
  /** Raw JWT token */
  token?: string;
}

/**
 * Cookie configuration
 */
export interface CookieConfig {
  /** Cookie name */
  name: string;
  /** Max age in seconds */
  maxAge?: number;
  /** Expires at date */
  expires?: Date;
  /** HTTPS only */
  secure?: boolean;
  /** HTTP only (prevents JS access) */
  httpOnly?: boolean;
  /** SameSite policy */
  sameSite?: 'strict' | 'lax' | 'none';
  /** Cookie path */
  path?: string;
  /** Cookie domain */
  domain?: string;
}

/**
 * JWT signing options
 */
export interface JWTSignOptions {
  /** Secret key for signing */
  secret: string | Uint8Array;
  /** Token expiration (seconds or time string like "7d") */
  expiresIn?: string | number;
  /** Additional claims to include */
  claims?: Record<string, unknown>;
  /** Algorithm (usually HS256) */
  algorithm?: string;
}

/**
 * JWT verification options
 */
export interface JWTVerifyOptions {
  /** Secret key for verification */
  secret: string | Uint8Array;
  /** Algorithms to accept */
  algorithms?: string[];
  /** Audience to validate */
  audience?: string | string[];
  /** Issuer to validate */
  issuer?: string;
}

/**
 * Type guard for checking if user has permission
 */
export function hasPermission(
  context: AuthContext,
  permission: string
): boolean {
  return context.permissions.includes(permission);
}

/**
 * Type guard for checking if user has role
 */
export function hasRole(
  context: AuthContext,
  role: UserRole | UserRole[]
): boolean {
  if (!context.role) return false;
  if (Array.isArray(role)) {
    return role.includes(context.role);
  }
  return context.role === role;
}

/**
 * Type guard for checking if user is admin
 */
export function isAdmin(context: AuthContext): boolean {
  return context.role === UserRole.ADMIN;
}
