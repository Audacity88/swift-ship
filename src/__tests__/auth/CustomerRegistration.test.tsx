import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerRegistration } from '@/components/features/auth/CustomerRegistration';
import { db } from '@/lib/db';
import { UserRole } from '@/types/enums';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock supabase client
jest.mock('@/lib/db', () => ({
  db: {
    auth: {
      signUp: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

describe('CustomerRegistration Component', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    // Reset all mocks before each test
    jest.clearAllMocks();
    // Mock successful auth signup
    (db.auth.signUp as jest.Mock).mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
      },
      error: null,
    });
  });

  it('renders registration form with all fields', () => {
    render(<CustomerRegistration />);

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument();
  });

  it('handles successful registration with required fields', async () => {
    const user = userEvent.setup();
    render(<CustomerRegistration />);

    // Fill out form
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Submit form
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      // Verify auth signup was called with correct data
      expect(db.auth.signUp).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'password123',
        options: {
          data: {
            name: 'John Doe',
            role: UserRole.CUSTOMER,
          },
        },
      });

      // Verify profile creation
      expect(db.from).toHaveBeenCalledWith('customer_profiles');
      expect(db.from).toHaveBeenCalledWith('user_roles');

      // Verify redirect
      expect(mockRouter.push).toHaveBeenCalledWith('/portal/welcome');
    });
  });

  it('handles successful registration with optional company field', async () => {
    const user = userEvent.setup();
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    (db.from as jest.Mock).mockImplementation(() => ({
      insert: mockInsert,
    }));

    render(<CustomerRegistration />);

    // Fill out form including company
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.type(screen.getByLabelText(/company/i), 'Acme Inc');

    // Submit form
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          company: 'Acme Inc',
        })
      );
    });
  });

  it('handles auth signup error', async () => {
    const user = userEvent.setup();
    (db.auth.signUp as jest.Mock).mockRejectedValueOnce(new Error('Invalid email format'));
    render(<CustomerRegistration />);

    // Fill in form
    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email format');
    });
  });

  it('handles profile creation error', async () => {
    const user = userEvent.setup();
    (db.auth.signUp as jest.Mock).mockResolvedValueOnce({ data: { user: { id: '123' } }, error: null });
    (db.from('customer_profiles').insert as jest.Mock).mockRejectedValueOnce(new Error('Profile creation failed'));
    render(<CustomerRegistration />);

    // Fill in form
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Profile creation failed');
    });
  });

  it('handles social login with Google', async () => {
    const user = userEvent.setup();
    render(<CustomerRegistration />);

    await user.click(screen.getByRole('button', { name: /google/i }));

    await waitFor(() => {
      expect(db.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining('/portal/auth/callback'),
        },
      });
    });
  });

  it('handles social login with GitHub', async () => {
    const user = userEvent.setup();
    render(<CustomerRegistration />);

    await user.click(screen.getByRole('button', { name: /github/i }));

    await waitFor(() => {
      expect(db.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'github',
        options: {
          redirectTo: expect.stringContaining('/portal/auth/callback'),
        },
      });
    });
  });

  it('handles social login error', async () => {
    const user = userEvent.setup();
    (db.auth.signInWithOAuth as jest.Mock).mockRejectedValueOnce({
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
    // Make auth signup take some time
    (db.auth.signUp as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<CustomerRegistration />);

    // Fill out form
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    // Verify button is disabled and shows loading state
    await waitFor(() => {
      expect(submitButton).toHaveAttribute('disabled');
      expect(screen.getByText(/creating account/i)).toBeInTheDocument();
    });
  });
}); 