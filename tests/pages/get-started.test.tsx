/**
 * Get Started Page Tests
 * Tests for the onboarding flow (/get-started)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

  it('should render without crashing', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<OnboardingPage />);
      container = result.container;
    });
    expect(container!).toBeDefined();
  });

  it('should show step 1: stage selection on initial load', async () => {
    await act(async () => {
      render(<OnboardingPage />);
    });

    expect(screen.getByText(/What stage are you at\?/i)).toBeInTheDocument();
    expect(screen.getByText(/3 clicks to get started/i)).toBeInTheDocument();
  });

  it('should display all 4 stage options', async () => {
    await act(async () => {
      render(<OnboardingPage />);
    });

    expect(screen.getByText('Ideation')).toBeInTheDocument();
    expect(screen.getByText('Pre-seed')).toBeInTheDocument();
    expect(screen.getByText('Seed')).toBeInTheDocument();
    expect(screen.getByText('Series A+')).toBeInTheDocument();
  });

  it('should advance to step 2 when stage is selected', async () => {
    await act(async () => {
      render(<OnboardingPage />);
    });

    const ideationButton = screen.getByText('Ideation').closest('button');
    await act(async () => {
      fireEvent.click(ideationButton!);
    });

    await waitFor(() => {
      expect(screen.getByText(/What's your/i)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should display all 6 challenge options in step 2', async () => {
    await act(async () => {
      render(<OnboardingPage />);
    });

    // Select a stage to advance
    const seedButton = screen.getByText('Seed').closest('button');
    await act(async () => {
      fireEvent.click(seedButton!);
    });

    await waitFor(() => {
      expect(screen.getByText('Product-Market Fit')).toBeInTheDocument();
      expect(screen.getByText('Fundraising')).toBeInTheDocument();
      expect(screen.getByText('Team Building')).toBeInTheDocument();
      expect(screen.getByText('Growth & Scaling')).toBeInTheDocument();
      expect(screen.getByText('Unit Economics')).toBeInTheDocument();
      expect(screen.getByText('Strategy')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should show back button in step 2', async () => {
    await act(async () => {
      render(<OnboardingPage />);
    });

    const stageButton = screen.getByText('Pre-seed').closest('button');
    await act(async () => {
      fireEvent.click(stageButton!);
    });

    await waitFor(() => {
      expect(screen.getByText('Back')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should advance to step 3 when challenge is selected', async () => {
    await act(async () => {
      render(<OnboardingPage />);
    });

    // Step 1: Select stage
    const seedButton = screen.getByText('Seed').closest('button');
    await act(async () => {
      fireEvent.click(seedButton!);
    });

    // Wait for step 2
    await waitFor(() => {
      expect(screen.getByText('Fundraising')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Step 2: Select challenge
    const fundraisingButton = screen.getByText('Fundraising').closest('button');
    await act(async () => {
      fireEvent.click(fundraisingButton!);
    });

    await waitFor(() => {
      expect(screen.getByText(/get started/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should validate email in step 3', async () => {
    await act(async () => {
      render(<OnboardingPage />);
    });

    // Navigate to step 3
    await act(async () => {
      fireEvent.click(screen.getByText('Ideation').closest('button')!);
    });

    await waitFor(() => {
      expect(screen.getByText('Product-Market Fit')).toBeInTheDocument();
    }, { timeout: 1000 });

    await act(async () => {
      fireEvent.click(screen.getByText('Product-Market Fit').closest('button')!);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument();
    }, { timeout: 1000 });

    const submitButton = screen.getByText('Start Free Trial');
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Please enter your email')).toBeInTheDocument();
    });
  });

  it('should validate email format', async () => {
    await act(async () => {
      render(<OnboardingPage />);
    });

    // Navigate to step 3
    await act(async () => {
      fireEvent.click(screen.getByText('Series A+').closest('button')!);
    });

    await waitFor(() => {
      expect(screen.getByText('Strategy')).toBeInTheDocument();
    }, { timeout: 1000 });

    await act(async () => {
      fireEvent.click(screen.getByText('Strategy').closest('button')!);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument();
    }, { timeout: 1000 });

    const emailInput = screen.getByPlaceholderText('you@company.com') as HTMLInputElement;
    const submitButton = screen.getByText('Start Free Trial');

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
    });
  });

  it('should display selected stage and challenge in step 3', async () => {
    await act(async () => {
      render(<OnboardingPage />);
    });

    // Navigate through steps
    await act(async () => {
      fireEvent.click(screen.getByText('Seed').closest('button')!);
    });

    await waitFor(() => {
      expect(screen.getByText('Team Building')).toBeInTheDocument();
    }, { timeout: 1000 });

    await act(async () => {
      fireEvent.click(screen.getByText('Team Building').closest('button')!);
    });

    await waitFor(() => {
      // The selected stage and challenge appear as chips in step 3
      const chips = document.querySelectorAll('[class*="rounded-full"]');
      expect(chips.length).toBeGreaterThan(0);
    }, { timeout: 1000 });
  });

  it('should show loading state when submitting', async () => {
    global.fetch = vi.fn(() =>
      new Promise((resolve) =>
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true }),
        } as any), 500)
      )
    );

    await act(async () => {
      render(<OnboardingPage />);
    });

    // Navigate to step 3
    await act(async () => {
      fireEvent.click(screen.getByText('Pre-seed').closest('button')!);
    });

    await waitFor(() => {
      expect(screen.getByText('Fundraising')).toBeInTheDocument();
    }, { timeout: 1000 });

    await act(async () => {
      fireEvent.click(screen.getByText('Fundraising').closest('button')!);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument();
    }, { timeout: 1000 });

    const emailInput = screen.getByPlaceholderText('you@company.com') as HTMLInputElement;
    const submitButton = screen.getByText('Start Free Trial');

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);
    });

    // The button shows "Creating..." during submission
    await waitFor(() => {
      expect(screen.getByText(/Creating/i)).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('should show progress dots', async () => {
    await act(async () => {
      render(<OnboardingPage />);
    });

    // Look for progress indicators (3 dots)
    const dots = document.querySelectorAll('.rounded-full');
    expect(dots.length).toBeGreaterThan(0);
  });

  it('should allow navigation back from step 3', async () => {
    await act(async () => {
      render(<OnboardingPage />);
    });

    // Navigate to step 3
    await act(async () => {
      fireEvent.click(screen.getByText('Seed').closest('button')!);
    });

    await waitFor(() => {
      expect(screen.getByText('Growth & Scaling')).toBeInTheDocument();
    }, { timeout: 1000 });

    await act(async () => {
      fireEvent.click(screen.getByText('Growth & Scaling').closest('button')!);
    });

    await waitFor(() => {
      expect(screen.getByText('Back')).toBeInTheDocument();
    }, { timeout: 1000 });

    const backButtons = screen.getAllByText('Back');
    await act(async () => {
      fireEvent.click(backButtons[backButtons.length - 1]);
    });

    // Should be back to step 2
    await waitFor(() => {
      expect(screen.getByText(/What's your/i)).toBeInTheDocument();
    }, { timeout: 1000 });
  });
});
