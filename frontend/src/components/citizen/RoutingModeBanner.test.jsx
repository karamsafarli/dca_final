import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithI18n } from '../../test/renderWithI18n';
import { RoutingModeBanner } from './RoutingModeBanner';

describe('RoutingModeBanner (Challenge Drop #2)', () => {
  it('is hidden while the external routing API is online', () => {
    renderWithI18n(<RoutingModeBanner routing={{ mode: 'ONLINE', degraded: false }} />);
    expect(screen.queryByTestId('routing-offline-banner')).not.toBeInTheDocument();
  });

  it('shows the required "Oflayn / Ehtiyat marşrut rejimində işləyir" notice in Azerbaijani', () => {
    renderWithI18n(
      <RoutingModeBanner
        routing={{ mode: 'FALLBACK_LOCAL_GRAPH', degraded: true, reason: 'EXTERNAL_UNAVAILABLE' }}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent('Oflayn / Ehtiyat marşrut rejimində işləyir');
    expect(screen.getByText(/yerli ehtiyat yol bazası/)).toBeInTheDocument();
    expect(screen.getByText(/HTTP 503/)).toBeInTheDocument();
  });

  it('explains timeouts and cached routes in English', () => {
    renderWithI18n(
      <RoutingModeBanner
        routing={{
          mode: 'FALLBACK_CACHE',
          degraded: true,
          reason: 'EXTERNAL_TIMEOUT',
          cachedAt: '2026-11-15T10:42:00Z',
        }}
      />,
      { lang: 'en' }
    );
    expect(screen.getByText('Running in offline / backup route mode')).toBeInTheDocument();
    expect(screen.getByText(/last cached route/)).toBeInTheDocument();
    expect(screen.getByText(/exceeded 5 seconds/)).toBeInTheDocument();
  });
});
