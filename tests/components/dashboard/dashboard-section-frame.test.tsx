/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DashboardSectionFrame } from '@/components/dashboard/dashboard-section-frame';

describe('DashboardSectionFrame', () => {
  it('wraps workspace sections in a bounded viewport frame', () => {
    render(
      <DashboardSectionFrame section='messages'>
        <div>Messages workspace</div>
      </DashboardSectionFrame>
    );

    const frame = screen.getByTestId('dashboard-section-frame');
    expect(frame).toHaveAttribute('data-shell-mode', 'workspace');
    expect(frame).toHaveClass('flex', 'h-full', 'min-h-0', 'flex-1', 'overflow-hidden');
  });

  it('leaves page sections in document flow', () => {
    render(
      <DashboardSectionFrame section='sessions'>
        <div>Sessions page</div>
      </DashboardSectionFrame>
    );

    expect(screen.queryByTestId('dashboard-section-frame')).not.toBeInTheDocument();
    expect(screen.getByText('Sessions page')).toBeInTheDocument();
  });
});
