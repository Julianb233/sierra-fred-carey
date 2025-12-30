/**
 * Get Started Page Tests
 * Tests for the onboarding flow (/get-started)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import OnboardingPage from '@/app/get-started/page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock canvas-confetti
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

describe('Get Started Page (/get-started)', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
    });
  });

  it('should render without crashing', () => {
    const { container } = render(<OnboardingPage />);
    expect(container).toBeDefined();
  });

  it('should show step 1: stage selection on initial load', () => {
    render(<OnboardingPage />);

    expect(screen.getByText(/What stage are you at\?/i)).toBeInTheDocument();
    expect(screen.getByText(/3 clicks to get started/i)).toBeInTheDocument();
  });

  it('should display all 4 stage options', () => {
    render(<OnboardingPage />);

    expect(screen.getByText('Ideation')).toBeInTheDocument();
    expect(screen.getByText('Pre-seed')).toBeInTheDocument();
    expect(screen.getByText('Seed')).toBeInTheDocument();
    expect(screen.getByText('Series A+')).toBeInTheDocument();
  });

  it('should advance to step 2 when stage is selected', async () => {
    render(<OnboardingPage />);

    const ideationButton = screen.getByText('Ideation').closest('button');
    fireEvent.click(ideationButton!);

    await waitFor(() => {
      expect(screen.getByText(/What's your #1 challenge\?/i)).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('should display all 6 challenge options in step 2', async () => {
    render(<OnboardingPage />);

    // Select a stage to advance
    const seedButton = screen.getByText('Seed').closest('button');
    fireEvent.click(seedButton!);

    await waitFor(() => {
      expect(screen.getByText('Product-Market Fit')).toBeInTheDocument();
      expect(screen.getByText('Fundraising')).toBeInTheDocument();
      expect(screen.getByText('Team Building')).toBeInTheDocument();
      expect(screen.getByText('Growth & Scaling')).toBeInTheDocument();
      expect(screen.getByText('Unit Economics')).toBeInTheDocument();
      expect(screen.getByText('Strategy')).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('should show back button in step 2', async () => {
    render(<OnboardingPage />);

    const stageButton = screen.getByText('Pre-seed').closest('button');
    fireEvent.click(stageButton!);

    await waitFor(() => {
      expect(screen.getByText('Back')).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('should advance to step 3 when challenge is selected', async () => {
    render(<OnboardingPage />);

    // Step 1: Select stage
    fireEvent.click(screen.getByText('Seed').closest('button')!);

    // Step 2: Select challenge
    await waitFor(() => {
      const fundraisingButton = screen.getByText('Fundraising').closest('button');
      fireEvent.click(fundraisingButton!);
    }, { timeout: 500 });

    await waitFor(() => {
      expect(screen.getByText(/Let's get started!/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should validate email in step 3', async () => {
    render(<OnboardingPage />);

    // Navigate to step 3
    fireEvent.click(screen.getByText('Ideation').closest('button')!);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Product-Market Fit').closest('button')!);
    }, { timeout: 500 });

    await waitFor(() => {
      const emailInput = screen.getByPlaceholderText('you@company.com');
      const submitButton = screen.getByText('Start Free Trial');

      // Try to submit without email
      fireEvent.click(submitButton);

      expect(screen.getByText('Please enter your email')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should validate email format', async () => {
    render(<OnboardingPage />);

    // Navigate to step 3
    fireEvent.click(screen.getByText('Series A+').closest('button')!);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Strategy').closest('button')!);
    }, { timeout: 500 });

    await waitFor(() => {
      const emailInput = screen.getByPlaceholderText('you@company.com') as HTMLInputElement;
      const submitButton = screen.getByText('Start Free Trial');

      // Enter invalid email
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);

      expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should display selected stage and challenge in step 3', async () => {
    render(<OnboardingPage />);

    // Navigate through steps
    fireEvent.click(screen.getByText('Seed').closest('button')!);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Team Building').closest('button')!);
    }, { timeout: 500 });

    await waitFor(() => {
      expect(screen.getByText('Seed')).toBeInTheDocument();
      expect(screen.getByText('Team Building')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should show loading state when submitting', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: async () => ({ error: 'Test error' }),
      })
    ) as any;

    render(<OnboardingPage />);

    // Navigate to step 3
    fireEvent.click(screen.getByText('Pre-seed').closest('button')!);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Fundraising').closest('button')!);
    }, { timeout: 500 });

    await waitFor(async () => {
      const emailInput = screen.getByPlaceholderText('you@company.com') as HTMLInputElement;
      const submitButton = screen.getByText('Start Free Trial');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      // Should show loading text briefly
      await waitFor(() => {
        // The button is disabled during submission
        expect(submitButton).toHaveAttribute('disabled');
      }, { timeout: 100 });
    }, { timeout: 1000 });
  });

  it('should show progress dots', () => {
    render(<OnboardingPage />);

    // Look for progress indicators (3 dots)
    const dots = document.querySelectorAll('.rounded-full');
    expect(dots.length).toBeGreaterThan(0);
  });

  it('should allow navigation back from step 3', async () => {
    render(<OnboardingPage />);

    // Navigate to step 3
    fireEvent.click(screen.getByText('Seed').closest('button')!);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Growth & Scaling').closest('button')!);
    }, { timeout: 500 });

    await waitFor(() => {
      const backButtons = screen.getAllByText('Back');
      fireEvent.click(backButtons[backButtons.length - 1]);

      // Should be back to step 2
      expect(screen.getByText(/What's your #1 challenge\?/i)).toBeInTheDocument();
    }, { timeout: 1000 });
  });
});
