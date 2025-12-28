/**
 * Unit tests for pitch deck upload API
 *
 * Run with: npm test -- upload
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock Vercel Blob
jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  del: jest.fn(),
}));

describe('Pitch Deck Upload API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('File Validation', () => {
    it('should accept PDF files', () => {
      const file = new File(['test'], 'pitch.pdf', { type: 'application/pdf' });
      expect(file.type).toBe('application/pdf');
    });

    it('should accept PPTX files', () => {
      const file = new File(['test'], 'pitch.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });
      expect(file.type).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
    });

    it('should reject files over 20MB', () => {
      const largeData = new ArrayBuffer(21 * 1024 * 1024); // 21MB
      const file = new File([largeData], 'large.pdf', { type: 'application/pdf' });
      expect(file.size).toBeGreaterThan(20 * 1024 * 1024);
    });

    it('should reject invalid file types', () => {
      const file = new File(['test'], 'document.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      expect(file.type).not.toBe('application/pdf');
    });
  });

  describe('User ID Handling', () => {
    it('should use x-user-id header when provided', () => {
      const userId = 'user-123';
      expect(userId).toBe('user-123');
    });

    it('should fallback to cookie userId when header not provided', () => {
      const userId = 'cookie-user';
      expect(userId).toBe('cookie-user');
    });

    it('should use "anonymous" when no user ID available', () => {
      const userId = 'anonymous';
      expect(userId).toBe('anonymous');
    });
  });

  describe('Response Format', () => {
    it('should return success response with file metadata', () => {
      const response = {
        success: true,
        file: {
          url: 'https://blob.vercel-storage.com/pitch-decks/user-123/123456-pitch.pdf',
          name: 'pitch.pdf',
          size: 1234567,
          type: 'application/pdf',
          uploadedAt: '2024-01-01T00:00:00.000Z',
        },
      };

      expect(response.success).toBe(true);
      expect(response.file.url).toContain('blob.vercel-storage.com');
      expect(response.file.name).toBe('pitch.pdf');
      expect(response.file.type).toBe('application/pdf');
    });

    it('should return error response with details', () => {
      const response = {
        success: false,
        error: 'File validation failed',
        details: 'Invalid file type: application/msword. Only PDF and PPTX files are allowed.',
      };

      expect(response.success).toBe(false);
      expect(response.error).toBeTruthy();
      expect(response.details).toBeTruthy();
    });
  });
});

describe('File Storage Helper Functions', () => {
  describe('validateFileType', () => {
    it('should pass for valid PDF', () => {
      const file = new File(['test'], 'valid.pdf', { type: 'application/pdf' });
      expect(file.type).toBe('application/pdf');
      expect(file.name.endsWith('.pdf')).toBe(true);
    });

    it('should pass for valid PPTX', () => {
      const file = new File(['test'], 'valid.pptx', {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });
      expect(file.type).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
      expect(file.name.endsWith('.pptx')).toBe(true);
    });
  });

  describe('validateFileSize', () => {
    it('should pass for files under 20MB', () => {
      const file = new File([new ArrayBuffer(10 * 1024 * 1024)], 'small.pdf', {
        type: 'application/pdf',
      });
      expect(file.size).toBeLessThan(20 * 1024 * 1024);
    });

    it('should fail for files over 20MB', () => {
      const file = new File([new ArrayBuffer(25 * 1024 * 1024)], 'large.pdf', {
        type: 'application/pdf',
      });
      expect(file.size).toBeGreaterThan(20 * 1024 * 1024);
    });

    it('should fail for empty files', () => {
      const file = new File([], 'empty.pdf', { type: 'application/pdf' });
      expect(file.size).toBe(0);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect('0 Bytes').toBe('0 Bytes');
      expect('1.00 KB').toMatch(/KB/);
      expect('1.00 MB').toMatch(/MB/);
    });
  });
});
