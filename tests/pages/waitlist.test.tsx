/**
 * Waitlist Page Tests
 * The /waitlist route now redirects to /get-started.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { redirect } from 'next/navigation';
import WaitlistPage from '@/app/waitlist/page';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(),
}));

describe('Waitlist Page (/waitlist)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call redirect to /get-started on render', async () => {
    await act(async () => {
      render(<WaitlistPage />);
    });

    expect(redirect).toHaveBeenCalledWith('/get-started');
  });

  it('should redirect exactly once', async () => {
    await act(async () => {
      render(<WaitlistPage />);
    });

    expect(redirect).toHaveBeenCalledTimes(1);
  });
});
