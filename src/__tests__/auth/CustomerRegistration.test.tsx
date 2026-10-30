import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerRegistration } from '@/components/features/auth/CustomerRegistration';
import { authService } from '@/lib/services';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/services', () => ({
  authService: {
    registerCustomer: jest.fn(),
    signInWithProvider: jest.fn(),
  },
}));

describe('CustomerRegistration Component', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.mocked(authService.registerCustomer).mockResolvedValue({ user: null, session: null });
    jest.mocked(authService.signInWithProvider).mockResolvedValue(undefined);
  });

  it('renders registration form with all fields', () => {
    render(<CustomerRegistration />);

    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^register$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument();
  });

  it('handles successful registration with required fields', async () => {
    const user = userEvent.setup();
    render(<CustomerRegistration />);

    // Fill out form
    await user.type(screen.getByLabelText(/^name$/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Submit form
    await user.click(screen.getByRole('button', { name: /^register$/i }));

    await waitFor(() => {
      expect(authService.registerCustomer).toHaveBeenCalledWith({}, {
        email: 'john@example.com',
        password: 'password123',
        name: 'John Doe',
        company: '',
      });
      expect(authService.registerCustomer).toHaveBeenCalledTimes(1);

      // Verify redirect
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/confirm-email');
    });
  });

  it('handles successful registration with optional company field', async () => {
    const user = userEvent.setup();
    render(<CustomerRegistration />);

    // Fill out form including company
    await user.type(screen.getByLabelText(/^name$/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.type(screen.getByLabelText(/company/i), 'Acme Inc');

    // Submit form
    await user.click(screen.getByRole('button', { name: /^register$/i }));

    await waitFor(() => {
      expect(authService.registerCustomer).toHaveBeenCalledWith({},
        expect.objectContaining({
          email: 'john@example.com',
          password: 'password123',
          name: 'John Doe',
          company: 'Acme Inc',
        })
      );
    });
  });

  it('handles auth signup error', async () => {
    const user = userEvent.setup();
    jest.mocked(authService.registerCustomer).mockRejectedValueOnce(new Error('Invalid email format'));
    render(<CustomerRegistration />);

    // Fill in form
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.type(screen.getByLabelText(/^name$/i), 'John Doe');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /^register$/i });
    await user.click(submitButton);

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email format');
      expect(authService.registerCustomer).toHaveBeenCalledTimes(1);
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  it('handles registration service errors without redirecting', async () => {
    const user = userEvent.setup();
    jest.mocked(authService.registerCustomer).mockRejectedValueOnce(new Error('Profile creation failed'));
    render(<CustomerRegistration />);

    // Fill in form
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.type(screen.getByLabelText(/^name$/i), 'John Doe');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /^register$/i });
    await user.click(submitButton);

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Profile creation failed');
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  it('handles social login with Google', async () => {
    const user = userEvent.setup();
    render(<CustomerRegistration />);

    await user.click(screen.getByRole('button', { name: /google/i }));

    await waitFor(() => {
      expect(authService.signInWithProvider).toHaveBeenCalledWith({}, 'google', {
        redirectTo: `${window.location.origin}/portal/auth/callback`,
      });
    });
  });

  it('handles social login with GitHub', async () => {
    const user = userEvent.setup();
    render(<CustomerRegistration />);

    await user.click(screen.getByRole('button', { name: /github/i }));

    await waitFor(() => {
      expect(authService.signInWithProvider).toHaveBeenCalledWith({}, 'github', {
        redirectTo: `${window.location.origin}/portal/auth/callback`,
      });
    });
  });

  it('handles social login error', async () => {
    const user = userEvent.setup();
    jest.mocked(authService.signInWithProvider).mockRejectedValueOnce({
      message: 'Failed to connect with Google',
    });

    render(<CustomerRegistration />);

    await user.click(screen.getByRole('button', { name: /google/i }));

    await waitFor(() => {
      expect(screen.getByText('Failed to connect with Google')).toBeInTheDocument();
    });
  });

  it('disables form submission while loading', async () => {
    const user = userEvent.setup();
    let resolveRegistration!: (value: any) => void;
    jest.mocked(authService.registerCustomer).mockImplementationOnce(
      () => new Promise(resolve => { resolveRegistration = resolve; })
    );

    render(<CustomerRegistration />);

    // Fill out form
    await user.type(screen.getByLabelText(/^name$/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /^register$/i });
    await user.click(submitButton);

    // Verify button is disabled and shows loading state
    await waitFor(() => {
      expect(submitButton).toHaveAttribute('disabled');
      expect(screen.getByText(/registering/i)).toBeInTheDocument();
    });
    expect(mockRouter.push).not.toHaveBeenCalled();
    await act(async () => resolveRegistration({ user: null, session: null }));
    expect(mockRouter.push).toHaveBeenCalledWith('/auth/confirm-email');
    expect(screen.getByRole('button', { name: /^register$/i })).toBeEnabled();
  });
});
