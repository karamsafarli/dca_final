import { Accessibility, User } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { Card, CardHeader, Segmented } from '../ui/primitives';

export function CitizenRoleSelector({ citizenCategory, onChange }) {
  const { t } = useI18n();
  const isSpecialCare = citizenCategory === 'SPECIAL_CARE';

  return (
    <Card aria-labelledby="profile-title">
      <CardHeader id="profile-title" title={t('citizenRoleTitle')} />
      <div className="space-y-2 p-4 pt-3">
        <Segmented
          label={t('profileLabel')}
          value={citizenCategory}
          onChange={onChange}
          options={[
            { value: 'STANDARD', label: t('roleStandard'), icon: <User className="h-4 w-4" aria-hidden="true" /> },
            {
              value: 'SPECIAL_CARE',
              label: t('roleSpecialCare'),
              icon: <Accessibility className="h-4 w-4 text-priority-fg" aria-hidden="true" />,
            },
          ]}
        />
        <p className="text-sm text-muted">
          {isSpecialCare ? t('roleSpecialCareDesc') : t('roleStandardDesc')}
        </p>
      </div>
    </Card>
  );
}
