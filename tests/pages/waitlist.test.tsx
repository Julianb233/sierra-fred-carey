/**
 * Waitlist Page Tests
 * Tests for the waitlist signup page (/waitlist)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WaitlistPage from '@/app/waitlist/page';

describe('Waitlist Page (/waitlist)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<WaitlistPage />);
    expect(container).toBeDefined();
  });

  it('should display page title and subtitle', () => {
    render(<WaitlistPage />);

    expect(screen.getByText(/Join the/i)).toBeInTheDocument();
    expect(screen.getByText(/Sahara/i)).toBeInTheDocument();
    expect(screen.getByText(/Waitlist/i)).toBeInTheDocument();
  });

  it('should display all 4 benefits', () => {
    render(<WaitlistPage />);

    expect(screen.getByText('Early Access')).toBeInTheDocument();
    expect(screen.getByText('Founder Community')).toBeInTheDocument();
    expect(screen.getByText('Launch Pricing')).toBeInTheDocument();
    expect(screen.getByText('Priority Support')).toBeInTheDocument();
  });

  it('should render form with name, email, and company fields', () => {
    render(<WaitlistPage />);

    expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Company name (optional)')).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    render(<WaitlistPage />);

    const submitButton = screen.getByText('Join the Waitlist');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter your name and email')).toBeInTheDocument();
    });
  });

  it('should validate email format', async () => {
    render(<WaitlistPage />);

    const nameInput = screen.getByPlaceholderText('Your name') as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText('Your email') as HTMLInputElement;
    const submitButton = screen.getByText('Join the Waitlist');

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      })
    ) as any;

    render(<WaitlistPage />);

    const nameInput = screen.getByPlaceholderText('Your name') as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText('Your email') as HTMLInputElement;
    const submitButton = screen.getByText('Join the Waitlist');

    fireEvent.change(nameInput, { target: { value: 'Jane Founder' } });
    fireEvent.change(emailInput, { target: { value: 'jane@startup.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/onboard',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  it('should show loading state during submission', async () => {
    global.fetch = vi.fn(() =>
      new Promise((resolve) =>
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true }),
        } as any), 100)
      )
    );

    render(<WaitlistPage />);

    const nameInput = screen.getByPlaceholderText('Your name') as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText('Your email') as HTMLInputElement;
    const submitButton = screen.getByText('Join the Waitlist');

    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Joining waitlist...')).toBeInTheDocument();
    });
  });

  it('should show success message after submission', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      })
    ) as any;

    render(<WaitlistPage />);

    const nameInput = screen.getByPlaceholderText('Your name') as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText('Your email') as HTMLInputElement;
    const submitButton = screen.getByText('Join the Waitlist');

    fireEvent.change(nameInput, { target: { value: 'Success User' } });
    fireEvent.change(emailInput, { target: { value: 'success@test.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/You're on the list!/i)).toBeInTheDocument();
      expect(screen.getByText(/Success/i)).toBeInTheDocument();
      expect(screen.getByText(/success@test.com/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should handle API errors gracefully', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: async () => ({ error: 'Email already registered' }),
      })
    ) as any;

    render(<WaitlistPage />);

    const nameInput = screen.getByPlaceholderText('Your name') as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText('Your email') as HTMLInputElement;
    const submitButton = screen.getByText('Join the Waitlist');

    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'duplicate@test.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email already registered')).toBeInTheDocument();
    });
  });

  it('should include optional company name in submission', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      })
    ) as any;

    render(<WaitlistPage />);

    const nameInput = screen.getByPlaceholderText('Your name') as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText('Your email') as HTMLInputElement;
    const companyInput = screen.getByPlaceholderText('Company name (optional)') as HTMLInputElement;
    const submitButton = screen.getByText('Join the Waitlist');

    fireEvent.change(nameInput, { target: { value: 'Company User' } });
    fireEvent.change(emailInput, { target: { value: 'ceo@company.com' } });
    fireEvent.change(companyInput, { target: { value: 'My Startup' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.challenges).toContain('My Startup');
    });
  });

  it('should convert email to lowercase', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      })
    ) as any;

    render(<WaitlistPage />);

    const nameInput = screen.getByPlaceholderText('Your name') as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText('Your email') as HTMLInputElement;
    const submitButton = screen.getByText('Join the Waitlist');

    fireEvent.change(nameInput, { target: { value: 'Test' } });
    fireEvent.change(emailInput, { target: { value: 'TEST@EXAMPLE.COM' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.email).toBe('test@example.com');
    });
  });

  it('should have privacy statement', () => {
    render(<WaitlistPage />);

    expect(screen.getByText(/No spam, ever/i)).toBeInTheDocument();
  });

  it('should have "Back to Home" link in header', () => {
    render(<WaitlistPage />);

    const backLink = screen.getByText('Back to Home');
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('should show success state action buttons', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      })
    ) as any;

    render(<WaitlistPage />);

    const nameInput = screen.getByPlaceholderText('Your name') as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText('Your email') as HTMLInputElement;
    const submitButton = screen.getByText('Join the Waitlist');

    fireEvent.change(nameInput, { target: { value: 'Happy User' } });
    fireEvent.change(emailInput, { target: { value: 'happy@user.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Back to Home')).toBeInTheDocument();
      expect(screen.getByText('Explore Links')).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
