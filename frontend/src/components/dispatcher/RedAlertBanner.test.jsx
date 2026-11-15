import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/renderWithI18n';
import { RedAlertBanner } from './RedAlertBanner';

const capacityAlert = {
  id: 7,
  alertType: 'CAPACITY_OVERFLOW',
  status: 'ACTIVE',
  occupancyPercent: 97,
  sosCount: 0,
  createdAt: new Date().toISOString(),
  zone: { name: 'Yasamal rayonu' },
  assemblyPoint: { name: 'Olimpiya Stadionu' },
  title: 'Qırmızı Həyəcan: ...',
  message: 'server-side AZ text',
};

const clusterAlert = {
  ...capacityAlert,
  id: 8,
  alertType: 'SOS_CLUSTER',
  occupancyPercent: null,
  sosCount: 5,
  assemblyPoint: null,
};

describe('RedAlertBanner', () => {
  it('describes a >95% capacity alert as an occupancy problem in English', () => {
    renderWithI18n(<RedAlertBanner alerts={[capacityAlert]} />, { lang: 'en' });
    expect(screen.getByText(/Olimpiya Stadionu occupancy reached 97%/)).toBeInTheDocument();
    expect(screen.queryByText(/SOS signals/)).not.toBeInTheDocument();
  });

  it('describes an SOS cluster with the number of distinct citizens', () => {
    renderWithI18n(<RedAlertBanner alerts={[clusterAlert]} />, { lang: 'en' });
    expect(screen.getByText(/SOS signals from 5 different citizens in Yasamal rayonu/)).toBeInTheDocument();
  });

  it('renders the alert in Azerbaijani from translations, not raw server text', () => {
    renderWithI18n(<RedAlertBanner alerts={[capacityAlert]} />, { lang: 'az' });
    expect(screen.getByText(/Olimpiya Stadionu doluluğu 97%-ə çatdı/)).toBeInTheDocument();
    expect(screen.queryByText('server-side AZ text')).not.toBeInTheDocument();
  });

  it('executes and dismisses with one click each', () => {
    const onExecute = vi.fn();
    const onDismiss = vi.fn();
    renderWithI18n(
      <RedAlertBanner alerts={[clusterAlert]} onExecute={onExecute} onDismiss={onDismiss} />,
      { lang: 'en' }
    );
    fireEvent.click(screen.getByRole('button', { name: /Approve & Execute/ }));
    fireEvent.click(screen.getByTitle('Dismiss'));
    expect(onExecute).toHaveBeenCalledWith(8);
    expect(onDismiss).toHaveBeenCalledWith(8);
  });
});
