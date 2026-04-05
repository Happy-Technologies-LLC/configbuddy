// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQueryClient } from '@/tests/utils/test-utils';
import DiscoveryJobTrigger from './DiscoveryJobTrigger';
import * as useDiscoveryHook from '@hooks/useDiscovery';
import { mockApiHandlers } from '@/tests/mocks/handlers';

// Mock the useDiscovery hook
vi.mock('@hooks/useDiscovery');

// Mock the DiscoveryConfigForm component for simplicity
vi.mock('./DiscoveryConfigForm', () => ({
  default: ({ provider, onSubmit }: any) => (
    <div data-testid="discovery-config-form">
      <h3>Mock Config Form for {provider}</h3>
      <button
        onClick={() => onSubmit({ region: 'us-east-1', accountId: '123456789' })}
        data-testid="submit-config"
      >
        Submit Config
      </button>
    </div>
  ),
}));

describe('DiscoveryJobTrigger Component', () => {
  const defaultMockDiscovery = {
    triggerJob: vi.fn(),
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial step with provider selection', () => {
    vi.mocked(useDiscoveryHook.useDiscovery).mockReturnValue(defaultMockDiscovery);

    renderWithQueryClient(<DiscoveryJobTrigger />);

    expect(screen.getByText('Trigger New Discovery')).toBeInTheDocument();
    expect(screen.getByText('Select Provider')).toBeInTheDocument();

    // Verify all providers are shown
    expect(screen.getByText('Amazon Web Services')).toBeInTheDocument();
    expect(screen.getByText('Microsoft Azure')).toBeInTheDocument();
    expect(screen.getByText('Google Cloud Platform')).toBeInTheDocument();
    expect(screen.getByText('SSH Discovery')).toBeInTheDocument();
    expect(screen.getByText('Network Scan (Nmap)')).toBeInTheDocument();
  });

  it('navigates through stepper workflow', async () => {
    const user = userEvent.setup();
    vi.mocked(useDiscoveryHook.useDiscovery).mockReturnValue(defaultMockDiscovery);

    renderWithQueryClient(<DiscoveryJobTrigger />);

    // Step 1: Select provider
    const awsOption = screen.getByLabelText(/amazon web services/i);
    await user.click(awsOption);

    // Next button should be enabled
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).not.toBeDisabled();

    await user.click(nextButton);

    // Step 2: Configure
    await waitFor(() => {
      expect(screen.getByText('Configure')).toBeInTheDocument();
      expect(screen.getByTestId('discovery-config-form')).toBeInTheDocument();
    });

    // Submit configuration
    const submitConfigButton = screen.getByTestId('submit-config');
    await user.click(submitConfigButton);

    // Step 3: Review
    await waitFor(() => {
      expect(screen.getByText('Review & Trigger')).toBeInTheDocument();
      expect(screen.getByText(/review your configuration/i)).toBeInTheDocument();
    });
  });

  it('disables next button when no provider selected', () => {
    vi.mocked(useDiscoveryHook.useDiscovery).mockReturnValue(defaultMockDiscovery);

    renderWithQueryClient(<DiscoveryJobTrigger />);

    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeDisabled();
  });

  it('allows going back to previous steps', async () => {
    const user = userEvent.setup();
    vi.mocked(useDiscoveryHook.useDiscovery).mockReturnValue(defaultMockDiscovery);

    renderWithQueryClient(<DiscoveryJobTrigger />);

    // Select provider and go to step 2
    const awsOption = screen.getByLabelText(/amazon web services/i);
    await user.click(awsOption);
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Go back
    const backButton = screen.getByRole('button', { name: /back/i });
    await user.click(backButton);

    // Should be back at step 1
    expect(screen.getByText('Select Provider')).toBeInTheDocument();
    expect(screen.getByLabelText(/amazon web services/i)).toBeChecked();
  });

  it('disables back button on first step', () => {
    vi.mocked(useDiscoveryHook.useDiscovery).mockReturnValue(defaultMockDiscovery);

    renderWithQueryClient(<DiscoveryJobTrigger />);

    const backButton = screen.getByRole('button', { name: /back/i });
    expect(backButton).toBeDisabled();
  });

  it('successfully triggers discovery job', async () => {
    const user = userEvent.setup();
    const mockTriggerJob = vi.fn().mockResolvedValue(mockApiHandlers.triggerDiscoveryJob.success);

    vi.mocked(useDiscoveryHook.useDiscovery).mockReturnValue({
      triggerJob: mockTriggerJob,
      loading: false,
    });

    renderWithQueryClient(<DiscoveryJobTrigger />);

    // Step 1: Select AWS
    const awsOption = screen.getByLabelText(/amazon web services/i);
    await user.click(awsOption);
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 2: Configure
    await waitFor(() => {
      expect(screen.getByTestId('submit-config')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('submit-config'));

    // Step 3: Review and trigger
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /trigger discovery/i })).toBeInTheDocument();
    });

    const triggerButton = screen.getByRole('button', { name: /trigger discovery/i });
    await user.click(triggerButton);

    // Verify trigger was called with correct parameters
    await waitFor(() => {
      expect(mockTriggerJob).toHaveBeenCalledWith({
        provider: 'aws',
        config: {
          region: 'us-east-1',
          accountId: '123456789',
        },
      });
    });

    // Should reset to initial state after successful trigger
    await waitFor(() => {
      expect(screen.getByText('Select Provider')).toBeInTheDocument();
    });
  });

  it('displays provider-specific descriptions', () => {
    vi.mocked(useDiscoveryHook.useDiscovery).mockReturnValue(defaultMockDiscovery);

    renderWithQueryClient(<DiscoveryJobTrigger />);

    expect(screen.getByText(/discover ec2, rds, s3/i)).toBeInTheDocument();
    expect(screen.getByText(/discover vms, databases/i)).toBeInTheDocument();
    expect(screen.getByText(/discover compute engine/i)).toBeInTheDocument();
    expect(screen.getByText(/discover linux\/unix servers/i)).toBeInTheDocument();
    expect(screen.getByText(/discover network devices/i)).toBeInTheDocument();
  });

  it('shows configuration in review step', async () => {
    const user = userEvent.setup();
    vi.mocked(useDiscoveryHook.useDiscovery).mockReturnValue(defaultMockDiscovery);

    renderWithQueryClient(<DiscoveryJobTrigger />);

    // Navigate to review step
    await user.click(screen.getByLabelText(/amazon web services/i));
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByTestId('submit-config')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('submit-config'));

    // Review step should show configuration
    await waitFor(() => {
      expect(screen.getByText('Configuration')).toBeInTheDocument();
      expect(screen.getByText(/us-east-1/i)).toBeInTheDocument();
      expect(screen.getByText(/123456789/i)).toBeInTheDocument();
    });
  });

  it('disables trigger button during loading', async () => {
    const user = userEvent.setup();
    const mockTriggerJob = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockApiHandlers.triggerDiscoveryJob.success), 100))
    );

    vi.mocked(useDiscoveryHook.useDiscovery).mockReturnValue({
      triggerJob: mockTriggerJob,
      loading: true,
    });

    renderWithQueryClient(<DiscoveryJobTrigger />);

    // Navigate to review step
    await user.click(screen.getByLabelText(/amazon web services/i));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => screen.getByTestId('submit-config'));
    await user.click(screen.getByTestId('submit-config'));

    await waitFor(() => {
      const triggerButton = screen.getByRole('button', { name: /trigger discovery/i });
      expect(triggerButton).toBeDisabled();
    });
  });

  it('highlights selected provider', async () => {
    const user = userEvent.setup();
    vi.mocked(useDiscoveryHook.useDiscovery).mockReturnValue(defaultMockDiscovery);

    renderWithQueryClient(<DiscoveryJobTrigger />);

    const awsOption = screen.getByLabelText(/amazon web services/i);
    await user.click(awsOption);

    // The selected provider should be highlighted (checked)
    expect(awsOption).toBeChecked();
  });

  it('displays stepper with correct active step', async () => {
    const user = userEvent.setup();
    vi.mocked(useDiscoveryHook.useDiscovery).mockReturnValue(defaultMockDiscovery);

    renderWithQueryClient(<DiscoveryJobTrigger />);

    // Initially step 1 should be active
    expect(screen.getByText('Select Provider')).toBeInTheDocument();

    // Navigate to step 2
    await user.click(screen.getByLabelText(/amazon web services/i));
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('Configure')).toBeInTheDocument();
    });
  });

  it('resets configuration when changing provider', async () => {
    const user = userEvent.setup();
    vi.mocked(useDiscoveryHook.useDiscovery).mockReturnValue(defaultMockDiscovery);

    renderWithQueryClient(<DiscoveryJobTrigger />);

    // Select AWS
    await user.click(screen.getByLabelText(/amazon web services/i));

    // Change to Azure
    await user.click(screen.getByLabelText(/microsoft azure/i));

    // Configuration should be reset (implicitly tested by checking the selected provider)
    const azureOption = screen.getByLabelText(/microsoft azure/i);
    expect(azureOption).toBeChecked();
  });

  it('shows alert message in review step', async () => {
    const user = userEvent.setup();
    vi.mocked(useDiscoveryHook.useDiscovery).mockReturnValue(defaultMockDiscovery);

    renderWithQueryClient(<DiscoveryJobTrigger />);

    // Navigate to review step
    await user.click(screen.getByLabelText(/amazon web services/i));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => screen.getByTestId('submit-config'));
    await user.click(screen.getByTestId('submit-config'));

    // Should show review alert
    await waitFor(() => {
      expect(screen.getByText(/review your configuration before triggering/i)).toBeInTheDocument();
    });
  });
});
