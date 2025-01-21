import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerProfile } from '@/components/features/portal/CustomerProfile';
import type { CustomerProfile as CustomerProfileType, PortalPreferences } from '@/types/portal';

// Mock data
const mockProfile: CustomerProfileType = {
  id: 'test-id',
  name: 'John Doe',
  email: 'john@example.com',
  company: 'Acme Inc',
  jobTitle: 'Software Engineer',
  timezone: 'America/New_York',
  language: 'en',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPreferences: PortalPreferences = {
  emailNotifications: {
    ticketUpdates: true,
    articleUpdates: false,
    newsletter: true,
  },
  displayPreferences: {
    theme: 'light',
    language: 'en',
    articlesPerPage: 10,
  },
  categorySubscriptions: ['general', 'billing'],
};

const mockAvailableLanguages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
];

const mockAvailableTimezones = [
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
];

describe('CustomerProfile Component', () => {
  const mockOnUpdateProfile = jest.fn();
  const mockOnUpdatePreferences = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnUpdateProfile.mockResolvedValue(undefined);
    mockOnUpdatePreferences.mockResolvedValue(undefined);
  });

  const renderComponent = () => {
    return render(
      <CustomerProfile
        profile={mockProfile}
        preferences={mockPreferences}
        availableLanguages={mockAvailableLanguages}
        availableTimezones={mockAvailableTimezones}
        onUpdateProfile={mockOnUpdateProfile}
        onUpdatePreferences={mockOnUpdatePreferences}
      />
    );
  };

  it('renders profile information form with pre-filled values', () => {
    renderComponent();

    // Check form fields
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Acme Inc')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument();
    
    // Check select values using aria-label
    expect(screen.getByRole('combobox', { name: /timezone/i })).toHaveTextContent('Eastern Time');
    expect(screen.getByRole('combobox', { name: /language/i })).toHaveTextContent('English');
  });

  it('renders preferences form with correct initial state', () => {
    renderComponent();

    // Check theme select
    expect(screen.getByRole('combobox', { name: /theme/i })).toHaveTextContent('Light');
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
  });

  it('handles profile form submission with valid data', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Update name field
    const nameInput = screen.getByDisplayValue('John Doe');
    await user.clear(nameInput);
    await user.type(nameInput, 'Jane Smith');

    // Submit form
    const saveButton = screen.getByRole('button', { name: /save profile/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Jane Smith',
        })
      );
    });
  });

  it('handles preferences form submission', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Toggle email notification preferences
    const ticketUpdatesSwitch = screen.getByRole('switch', { name: /ticket updates/i });
    await user.click(ticketUpdatesSwitch);

    // Submit form
    const saveButton = screen.getByRole('button', { name: /save preferences/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          emailNotifications: expect.objectContaining({
            ticketUpdates: false,
          }),
        })
      );
    });
  });

  it('validates required fields in profile form', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Clear required fields
    const nameInput = screen.getByDisplayValue('John Doe');
    const emailInput = screen.getByDisplayValue('john@example.com');
    await user.clear(nameInput);
    await user.clear(emailInput);

    // Submit form
    const saveButton = screen.getByRole('button', { name: /save profile/i });
    await user.click(saveButton);

    // Check for validation messages
    await waitFor(() => {
      expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument();
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });

    // Verify that onUpdateProfile was not called
    expect(mockOnUpdateProfile).not.toHaveBeenCalled();
  });

  it('handles timezone selection', async () => {
    renderComponent();

    // Get the form and submit with new values
    const submitButton = screen.getByRole('button', { name: /save profile/i });
    const form = submitButton.closest('form');
    if (!form) throw new Error('Form not found');

    await act(async () => {
      fireEvent.submit(form, {
        target: {
          timezone: { value: 'America/Los_Angeles' }
        }
      });
    });

    await waitFor(() => {
      expect(mockOnUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockProfile,
          timezone: 'America/Los_Angeles',
        })
      );
    });
  });

  it('handles language selection', async () => {
    renderComponent();

    // Get the form and submit with new values
    const submitButton = screen.getByRole('button', { name: /save profile/i });
    const form = submitButton.closest('form');
    if (!form) throw new Error('Form not found');

    await act(async () => {
      fireEvent.submit(form, {
        target: {
          language: { value: 'es' }
        }
      });
    });

    await waitFor(() => {
      expect(mockOnUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockProfile,
          language: 'es',
        })
      );
    });
  });

  it('disables submit buttons while updating', async () => {
    const user = userEvent.setup();
    // Make the update take some time
    mockOnUpdateProfile.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    renderComponent();

    // Submit profile form
    const saveButton = screen.getByRole('button', { name: /save profile/i });
    await user.click(saveButton);

    // Verify button is disabled during update
    expect(saveButton).toBeDisabled();

    // Wait for update to complete
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });

  it('handles update errors gracefully', async () => {
    mockOnUpdateProfile.mockRejectedValueOnce(new Error('Failed to update profile'));
    renderComponent();

    // Get the form and submit with new values
    const submitButton = screen.getByRole('button', { name: /save profile/i });
    const form = submitButton.closest('form');
    if (!form) throw new Error('Form not found');

    await act(async () => {
      fireEvent.submit(form, {
        target: {
          name: { value: 'Jane Doe' }
        }
      });
    });

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to update profile');
    });
  });
}); 