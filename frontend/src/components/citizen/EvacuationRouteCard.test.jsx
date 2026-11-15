import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/renderWithI18n';
import { EvacuationRouteCard } from './EvacuationRouteCard';

const basePlan = {
  accessibleOnly: true,
  recommendedPoint: null,
  rerouted: true,
  rerouteReasons: ['ACCESSIBILITY_REQUIRED', 'NO_ACCESSIBLE_ROUTE'],
  assistanceRequired: 'NO_ACCESSIBLE_ROUTE',
  blockedRoads: [],
  assemblyPoints: [],
};

describe('EvacuationRouteCard — no route available', () => {
  it('explains there is no step-free route and offers one-click medical transport', () => {
    const onRequestAssistance = vi.fn();
    renderWithI18n(<EvacuationRouteCard plan={basePlan} onRequestAssistance={onRequestAssistance} />, {
      lang: 'en',
    });
    expect(screen.getByRole('alert')).toHaveTextContent('No step-free (ramp) route available');
    fireEvent.click(screen.getByRole('button', { name: /Request medical transport/ }));
    expect(onRequestAssistance).toHaveBeenCalledTimes(1);
  });

  it('uses the generic message when no point is reachable at all', () => {
    renderWithI18n(
      <EvacuationRouteCard
        plan={{ ...basePlan, accessibleOnly: false, assistanceRequired: 'NO_REACHABLE_POINT' }}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Əlçatan toplanış məntəqəsi yoxdur');
  });

  it('shows no assistance panel when a route exists', () => {
    renderWithI18n(<EvacuationRouteCard plan={{ ...basePlan, assistanceRequired: null }} />);
    expect(screen.queryByTestId('assistance-required')).not.toBeInTheDocument();
  });
});
