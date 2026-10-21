import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { Header } from '../src/features/navigation/components/Header';
import { renderWithClient } from './helpers';

const baseProps = { refetchInterval: 5000, setRefetchInterval: vi.fn(), isFetching: false, onManualRefresh: vi.fn() };

describe('dashboard chrome', () => {
  it.each([
    ['connecting', 'Connecting'], ['ready', 'Systems Ready'], ['not_ready', 'Not Ready · Partial Outage'], ['error', 'Connection Failed'],
  ] as const)('reflects the %s readiness state', (status, label) => {
    renderWithClient(<Header {...baseProps} activeTab="overview" setActiveTab={vi.fn()} status={status} />);
    expect(screen.getByText(label)).toBeTruthy();
  });

  it('keeps polling settings collapsed and preserves explicit refresh controls', () => {
    const setInterval = vi.fn(), refresh = vi.fn();
    renderWithClient(<Header {...baseProps} setRefetchInterval={setInterval} onManualRefresh={refresh} activeTab="overview" setActiveTab={vi.fn()} status="ready" />);
    const settings = screen.getByText('Refresh settings').closest('details');
    expect(settings?.open).toBe(false);
    fireEvent.click(screen.getByText('Refresh settings'));
    fireEvent.change(screen.getByLabelText('Background polling interval'), { target: { value: '0' } });
    expect(setInterval).toHaveBeenCalledWith(0);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh telemetry' }));
    expect(refresh).toHaveBeenCalledOnce();
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByText(/6.4k nodes|6.4k articles/)).toBeNull();
  });

  it('marks an explicit demo separately and never fabricates a ready status', () => {
    renderWithClient(<Header {...baseProps} activeTab="overview" setActiveTab={vi.fn()} status="error" demoMode />);
    expect(screen.getByText('Demo Telemetry · simulated')).toBeTruthy();
    expect(screen.getByText('Connection Failed')).toBeTruthy();
    expect(screen.queryByText('Systems Ready')).toBeNull();
  });
});
