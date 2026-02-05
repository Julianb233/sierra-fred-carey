/**
 * Documents API Route Tests
 *
 * Tests for /api/documents and /api/documents/[id] endpoints.
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

// Mock the SQL client
const mockSql = vi.fn();
vi.mock('@/lib/db/neon', () => ({
  sql: mockSql,
}));

describe('Documents API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  describe('GET /api/documents/[id]', () => {
    it('should return 401 for unauthenticated request', async () => {
      mockUnauthenticated();

      const { GET } = await import('@/app/api/documents/[id]/route');
      const request = new NextRequest('http://localhost:3000/api/documents/doc-123');

      const response = await GET(request, { params: Promise.resolve({ id: 'doc-123' }) });
      expect(response.status).toBe(401);
    });

    it('should return document for authenticated user who owns it', async () => {
      mockAuthenticated('user-owner-123');

      const mockDocument = {
        id: 'doc-123',
        title: 'Test Document',
        type: 'strategy',
        content: 'Document content here',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockSql.mockResolvedValue([mockDocument]);

      const { GET } = await import('@/app/api/documents/[id]/route');
      const request = new NextRequest('http://localhost:3000/api/documents/doc-123');

      const response = await GET(request, { params: Promise.resolve({ id: 'doc-123' }) });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.document.id).toBe('doc-123');
      expect(body.document.title).toBe('Test Document');
    });

    it('should return 404 if document not found or not owned by user', async () => {
      mockAuthenticated('user-different-123');

      mockSql.mockResolvedValue([]); // Empty result = not found/not owned

      const { GET } = await import('@/app/api/documents/[id]/route');
      const request = new NextRequest('http://localhost:3000/api/documents/doc-other');

      const response = await GET(request, { params: Promise.resolve({ id: 'doc-other' }) });
      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Document not found');
    });
  });

  describe('PATCH /api/documents/[id]', () => {
    it('should return 401 for unauthenticated request', async () => {
      mockUnauthenticated();

      const { PATCH } = await import('@/app/api/documents/[id]/route');
      const request = new NextRequest('http://localhost:3000/api/documents/doc-123', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Title' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'doc-123' }) });
      expect(response.status).toBe(401);
    });

    it('should return 400 if no fields to update', async () => {
      mockAuthenticated('user-123');

      const { PATCH } = await import('@/app/api/documents/[id]/route');
      const request = new NextRequest('http://localhost:3000/api/documents/doc-123', {
        method: 'PATCH',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'doc-123' }) });
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('No fields to update');
    });

    it('should update document title for authenticated owner', async () => {
      mockAuthenticated('user-123');

      const updatedDoc = {
        id: 'doc-123',
        title: 'Updated Title',
        type: 'strategy',
        content: 'Original content',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockSql.mockResolvedValue([updatedDoc]);

      const { PATCH } = await import('@/app/api/documents/[id]/route');
      const request = new NextRequest('http://localhost:3000/api/documents/doc-123', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Title' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'doc-123' }) });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.document.title).toBe('Updated Title');
    });

    it('should return 404 when updating non-existent document', async () => {
      mockAuthenticated('user-123');

      mockSql.mockResolvedValue([]);

      const { PATCH } = await import('@/app/api/documents/[id]/route');
      const request = new NextRequest('http://localhost:3000/api/documents/non-existent', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'New Title' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'non-existent' }) });
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/documents/[id]', () => {
    it('should return 401 for unauthenticated request', async () => {
      mockUnauthenticated();

      const { DELETE } = await import('@/app/api/documents/[id]/route');
      const request = new NextRequest('http://localhost:3000/api/documents/doc-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'doc-123' }) });
      expect(response.status).toBe(401);
    });

    it('should delete document for authenticated owner', async () => {
      mockAuthenticated('user-123');

      mockSql.mockResolvedValue([{ id: 'doc-123' }]);

      const { DELETE } = await import('@/app/api/documents/[id]/route');
      const request = new NextRequest('http://localhost:3000/api/documents/doc-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'doc-123' }) });
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain('deleted');
    });

    it('should return 404 when deleting non-existent document', async () => {
      mockAuthenticated('user-123');

      mockSql.mockResolvedValue([]);

      const { DELETE } = await import('@/app/api/documents/[id]/route');
      const request = new NextRequest('http://localhost:3000/api/documents/non-existent', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'non-existent' }) });
      expect(response.status).toBe(404);
    });

    it('should not allow deleting another user\'s document', async () => {
      mockAuthenticated('user-attacker');

      // SQL query will return empty because user_id doesn't match
      mockSql.mockResolvedValue([]);

      const { DELETE } = await import('@/app/api/documents/[id]/route');
      const request = new NextRequest('http://localhost:3000/api/documents/victim-doc', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'victim-doc' }) });
      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Document not found');
    });
  });

  describe('Security: Query isolation by user_id', () => {
    it('should always include user_id in SQL queries', async () => {
      mockAuthenticated('user-secure-123');

      let capturedQuery: string | null = null;
      let capturedParams: any[] = [];

      mockSql.mockImplementation((strings: TemplateStringsArray, ...values: any[]) => {
        capturedQuery = strings.join('?');
        capturedParams = values;
        return Promise.resolve([]);
      });

      const { GET } = await import('@/app/api/documents/[id]/route');
      const request = new NextRequest('http://localhost:3000/api/documents/doc-target');

      await GET(request, { params: Promise.resolve({ id: 'doc-target' }) });

      // Verify that user_id is part of the query parameters
      expect(capturedParams).toContain('user-secure-123');
      expect(capturedQuery).toContain('user_id');
    });
  });
});
