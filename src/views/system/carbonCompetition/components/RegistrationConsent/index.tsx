import { Checkbox } from 'antd';
import { useId, useState } from 'react';
import I18N from '@/lang/I18N';
import type { Overview } from '../../types';
import CompetitionRules from '../CompetitionRules';
import styles from './index.module.less';

export default function RegistrationConsent({
  event,
  checked,
  onChange,
  disabled,
}: {
  event: Overview;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const [document, setDocument] = useState<'rules' | 'disclaimer'>();
  const labelId = useId();
  const t = I18N.carbonCompetition.design.legal;
  return (
    <>
      <div className={styles.consent}>
        <Checkbox
          checked={checked}
          disabled={disabled}
          onChange={e => onChange(e.target.checked)}
          aria-labelledby={labelId}
        />
        <span id={labelId}>
          {t.agree}{' '}
          <button type='button' onClick={() => setDocument('rules')}>
            {t.rulesTitle}
          </button>{' '}
          {t.and}{' '}
          <button type='button' onClick={() => setDocument('disclaimer')}>
            {t.disclaimerLink}
          </button>
        </span>
      </div>
      <CompetitionRules
        key={document}
        open={!!document}
        event={event}
        disclaimer={document === 'disclaimer'}
        onClose={() => setDocument(undefined)}
      />
    </>
  );
}
