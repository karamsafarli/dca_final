import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithI18n } from '../../test/renderWithI18n';
import { SosFeedList } from './SosFeedList';

const pending = {
  id: 1,
  hazardType: 'FIRE',
  citizenName: 'Test',
  citizenStatus: 'SOS',
  status: 'PENDING',
  priorityLevel: 1,
  createdAt: new Date().toISOString(),
  zone: { name: 'Yasamal' },
};

describe('SosFeedList — brigade dispatch is permission-gated', () => {
  it('offers "Dispatch brigade" to dispatchers', () => {
    renderWithI18n(<SosFeedList sosSignals={[pending]} onDispatch={() => {}} />, { lang: 'en' });
    expect(screen.getByRole('button', { name: /dispatch/i })).toBeInTheDocument();
  });

  it('is read-only for observers (no onDispatch permission)', () => {
    renderWithI18n(<SosFeedList sosSignals={[pending]} />, { lang: 'en' });
    expect(screen.queryByRole('button', { name: /dispatch/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Priority/)).toBeInTheDocument();
  });
});
