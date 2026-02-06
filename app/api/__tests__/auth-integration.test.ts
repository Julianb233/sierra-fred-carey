/**
 * API Route Authentication Integration Tests
 *
 * Tests that all protected API routes properly enforce authentication
 * using requireAuth() and return 401 for unauthenticated requests.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Supabase client
const mockGetUser = vi.fn();
const mockGetSession = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: mockGetUser,
      getSession: mockGetSession,
    },
    from: mockFrom,
  })),
}));

// Mock the SQL client to avoid actual database calls
vi.mock('@/lib/db/supabase-sql', () => ({
  sql: vi.fn(() => Promise.resolve([])),
}));

// Mock AI client
vi.mock('@/lib/ai/client', () => ({
  generateTrackedResponse: vi.fn(() => Promise.resolve({
    content: '{"overallScore": 75}',
    requestId: 'req-123',
    responseId: 'resp-123',
    latencyMs: 100,
    variant: 'control',
  })),
}));

// Mock insight extractor
vi.mock('@/lib/ai/insight-extractor', () => ({
  extractInsights: vi.fn(() => Promise.resolve()),
}));

// Mock storage
vi.mock('@/lib/storage/upload', () => ({
  uploadToBlob: vi.fn(() => Promise.resolve({
    url: 'https://blob.example.com/file.pdf',
    name: 'test.pdf',
    size: 1234,
    type: 'application/pdf',
    uploadedAt: new Date().toISOString(),
  })),
  FileValidationError: class extends Error {},
}));

// Mock PDF parser
vi.mock('@/lib/parsers/pdf-parser', () => ({
  parsePDFFromUrl: vi.fn(() => Promise.resolve({
    slides: [],
    totalPages: 10,
    fullText: 'Test content',
    metadata: {},
  })),
  PDFParseError: class extends Error {},
}));

// Mock subscriptions
vi.mock('@/lib/db/subscriptions', () => ({
  getUserSubscription: vi.fn(() => Promise.resolve(null)),
}));

// Mock Stripe config
vi.mock('@/lib/stripe/config', () => ({
  PLANS: {
    FREE: { id: 'free', name: 'Free', price: 0, priceId: null },
    PRO: { id: 'pro', name: 'Pro', price: 99, priceId: 'price_pro' },
    STUDIO: { id: 'studio', name: 'Studio', price: 249, priceId: 'price_studio' },
  },
  getPlanByPriceId: vi.fn(() => null),
}));

// Mock Stripe server
vi.mock('@/lib/stripe/server', () => ({
  createCheckoutSession: vi.fn(() => Promise.resolve({ id: 'sess_123', url: 'https://checkout.stripe.com' })),
  createCustomerPortalSession: vi.fn(() => Promise.resolve({ url: 'https://portal.stripe.com' })),
}));

// Mock rate limiter (used by FRED Reality Lens API)
vi.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ success: true, limit: 5, remaining: 4, reset: 86400 })),
  applyRateLimitHeaders: vi.fn(),
  createRateLimitResponse: vi.fn(),
}));

// Mock FRED Reality Lens engine (used by FRED Reality Lens API)
vi.mock('@/lib/fred/reality-lens', () => ({
  assessIdea: vi.fn(() => Promise.resolve({
    overallScore: 72,
    verdict: 'promising',
    verdictDescription: 'Good potential',
    factors: {},
    topStrengths: [],
    criticalRisks: [],
    nextSteps: [],
    executiveSummary: 'Test summary',
    metadata: { assessmentId: 'test', timestamp: new Date().toISOString(), version: '1.0' },
  })),
  validateInput: vi.fn((body: any) => {
    if (!body || !body.idea || typeof body.idea !== 'string' || body.idea.trim().length < 10) {
      return { valid: false, errors: ['Idea description must be at least 10 characters'] };
    }
    return { valid: true, data: body };
  }),
}));

describe('API Route Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest(url: string, options: RequestInit = {}): NextRequest {
    return new NextRequest(`http://localhost:3000${url}`, options);
  }

  function mockUnauthenticated() {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  }

  function mockAuthenticated(userId = 'user-123') {
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId, email: 'test@example.com', created_at: new Date().toISOString() } },
      error: null,
    });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'token', user: { id: userId } } },
      error: null,
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
  }

  describe('Journey Stats API - /api/journey/stats', () => {
    it('should return 401 for unauthenticated request', async () => {
      mockUnauthenticated();

      const { GET } = await import('@/app/api/journey/stats/route');
      const request = createMockRequest('/api/journey/stats');

      const response = await GET(request);
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.code).toBe('AUTH_REQUIRED');
    });

    it('should return data for authenticated request', async () => {
      mockAuthenticated('user-stats-123');

      const mockSql = (await import('@/lib/db/supabase-sql')).sql as any;
      mockSql.mockResolvedValue([]);

      const { GET } = await import('@/app/api/journey/stats/route');
      const request = createMockRequest('/api/journey/stats');

      const response = await GET(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('Journey Timeline API - /api/journey/timeline', () => {
    it('should return 401 for unauthenticated GET request', async () => {
      mockUnauthenticated();

      const { GET } = await import('@/app/api/journey/timeline/route');
      const request = createMockRequest('/api/journey/timeline');

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('should return 401 for unauthenticated POST request', async () => {
      mockUnauthenticated();

      const { POST } = await import('@/app/api/journey/timeline/route');
      const request = createMockRequest('/api/journey/timeline', {
        method: 'POST',
        body: JSON.stringify({ eventType: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });

  describe('Journey References API - /api/journey/references', () => {
    it('should return 401 for unauthenticated GET request', async () => {
      mockUnauthenticated();

      const { GET } = await import('@/app/api/journey/references/route');
      const request = createMockRequest('/api/journey/references');

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('should return 401 for unauthenticated POST request', async () => {
      mockUnauthenticated();

      const { POST } = await import('@/app/api/journey/references/route');
      const request = createMockRequest('/api/journey/references', {
        method: 'POST',
        body: JSON.stringify({ sourceType: 'chat', title: 'Test', content: 'Test content' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should return 401 for unauthenticated PATCH request', async () => {
      mockUnauthenticated();

      const { PATCH } = await import('@/app/api/journey/references/route');
      const request = createMockRequest('/api/journey/references', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'ref-123', is_actioned: true }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PATCH(request);
      expect(response.status).toBe(401);
    });

    it('should return 401 for unauthenticated DELETE request', async () => {
      mockUnauthenticated();

      const { DELETE } = await import('@/app/api/journey/references/route');
      const request = createMockRequest('/api/journey/references?id=ref-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      expect(response.status).toBe(401);
    });
  });

  describe('User Subscription API - /api/user/subscription', () => {
    it('should return 401 for unauthenticated request', async () => {
      mockUnauthenticated();

      const { GET } = await import('@/app/api/user/subscription/route');
      const request = createMockRequest('/api/user/subscription');

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('should return subscription data for authenticated request', async () => {
      mockAuthenticated('user-sub-123');

      const { GET } = await import('@/app/api/user/subscription/route');
      const request = createMockRequest('/api/user/subscription');

      const response = await GET(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.plan).toBeDefined();
    });
  });

  describe('Pitch Deck Upload API - /api/pitch-deck/upload', () => {
    it('should return 401 for unauthenticated request', async () => {
      mockUnauthenticated();

      const { POST } = await import('@/app/api/pitch-deck/upload/route');

      const formData = new FormData();
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      formData.append('file', file);

      const request = createMockRequest('/api/pitch-deck/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });

  describe('Pitch Deck Parse API - /api/pitch-deck/parse', () => {
    it('should return 401 for unauthenticated request', async () => {
      mockUnauthenticated();

      const { POST } = await import('@/app/api/pitch-deck/parse/route');
      const request = createMockRequest('/api/pitch-deck/parse', {
        method: 'POST',
        body: JSON.stringify({ fileUrl: 'https://example.com/deck.pdf' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });

  describe('Reality Lens API - /api/fred/reality-lens', () => {
    it('should return 401 for unauthenticated POST request', async () => {
      mockUnauthenticated();

      const { POST } = await import('@/app/api/fred/reality-lens/route');
      const request = createMockRequest('/api/fred/reality-lens', {
        method: 'POST',
        body: JSON.stringify({ idea: 'A startup idea for testing purposes that is long enough' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should return 401 for unauthenticated GET request', async () => {
      mockUnauthenticated();

      const { GET } = await import('@/app/api/fred/reality-lens/route');
      const request = createMockRequest('/api/fred/reality-lens');

      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });

  describe('Stripe Checkout API - /api/stripe/checkout', () => {
    it('should return 401 for unauthenticated request', async () => {
      mockUnauthenticated();

      const { POST } = await import('@/app/api/stripe/checkout/route');
      const request = createMockRequest('/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'price_123' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });

  describe('Stripe Portal API - /api/stripe/portal', () => {
    it('should return 401 for unauthenticated request', async () => {
      mockUnauthenticated();

      const { POST } = await import('@/app/api/stripe/portal/route');
      const request = createMockRequest('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });

  describe('Security: User ID cannot be spoofed', () => {
    it('should ignore x-user-id header and use session userId', async () => {
      // Authenticate as user-real-123
      mockAuthenticated('user-real-123');

      const mockSql = (await import('@/lib/db/supabase-sql')).sql as any;
      let capturedUserId: string | null = null;

      mockSql.mockImplementation((strings: TemplateStringsArray, ...values: any[]) => {
        // Capture the userId from the SQL query
        if (values.length > 0 && typeof values[0] === 'string') {
          capturedUserId = values[0];
        }
        return Promise.resolve([]);
      });

      const { GET } = await import('@/app/api/journey/stats/route');

      // Try to spoof with a different user ID in header
      const request = new NextRequest('http://localhost:3000/api/journey/stats', {
        headers: {
          'x-user-id': 'spoofed-user-id',
        },
      });

      await GET(request);

      // The SQL query should use the session user ID, not the spoofed header
      expect(capturedUserId).toBe('user-real-123');
      expect(capturedUserId).not.toBe('spoofed-user-id');
    });
  });
});

describe('API Route Input Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockAuthenticated(userId = 'user-123') {
    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: userId, email: 'test@example.com', created_at: new Date().toISOString() } },
      error: null,
    });
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
  }

  describe('Reality Lens Input Validation (FRED API)', () => {
    it('should return 400 for empty idea', async () => {
      // Mock authenticated user
      const mockGetUser = (await import('@/lib/supabase/server') as any).createClient;
      mockGetUser.mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com', created_at: new Date().toISOString() } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      const { POST } = await import('@/app/api/fred/reality-lens/route');
      const request = new NextRequest('http://localhost:3000/api/fred/reality-lens', {
        method: 'POST',
        body: JSON.stringify({ idea: '' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for idea that is too short', async () => {
      const mockGetUser = (await import('@/lib/supabase/server') as any).createClient;
      mockGetUser.mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com', created_at: new Date().toISOString() } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      const { POST } = await import('@/app/api/fred/reality-lens/route');
      const request = new NextRequest('http://localhost:3000/api/fred/reality-lens', {
        method: 'POST',
        body: JSON.stringify({ idea: 'short' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Journey References Input Validation', () => {
    it('should return 400 for missing required fields in POST', async () => {
      const mockGetUser = (await import('@/lib/supabase/server') as any).createClient;
      mockGetUser.mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com', created_at: new Date().toISOString() } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      const { POST } = await import('@/app/api/journey/references/route');
      const request = new NextRequest('http://localhost:3000/api/journey/references', {
        method: 'POST',
        body: JSON.stringify({ sourceType: 'chat' }), // Missing title and content
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('Missing required fields');
    });

    it('should return 400 for invalid category', async () => {
      const mockGetUser = (await import('@/lib/supabase/server') as any).createClient;
      mockGetUser.mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com', created_at: new Date().toISOString() } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      const { POST } = await import('@/app/api/journey/references/route');
      const request = new NextRequest('http://localhost:3000/api/journey/references', {
        method: 'POST',
        body: JSON.stringify({
          sourceType: 'chat',
          title: 'Test',
          content: 'Test content',
          category: 'invalid_category',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('Invalid category');
    });
  });

  describe('Journey Timeline Input Validation', () => {
    it('should return 400 for missing eventType in POST', async () => {
      const mockGetUser = (await import('@/lib/supabase/server') as any).createClient;
      mockGetUser.mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com', created_at: new Date().toISOString() } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      const { POST } = await import('@/app/api/journey/timeline/route');
      const request = new NextRequest('http://localhost:3000/api/journey/timeline', {
        method: 'POST',
        body: JSON.stringify({}), // Missing eventType
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('eventType');
    });
  });
});
