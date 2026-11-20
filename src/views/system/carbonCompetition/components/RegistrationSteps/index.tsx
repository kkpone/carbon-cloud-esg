import I18N from '@/lang/I18N';
import { CheckOutlined } from '@ant-design/icons';
import styles from './index.module.less';

export default function RegistrationSteps({
  current,
  onCompany,
  onMembers,
}: {
  current: 1 | 2;
  onCompany?: () => void;
  onMembers?: () => void;
}) {
  const d = I18N.carbonCompetition.design;
  return (
    <ol className={styles.steps}>
      <li
        className={current === 1 ? styles.active : styles.complete}
        aria-current={current === 1 ? 'step' : undefined}
      >
        <button
          type='button'
          disabled={current === 1 || !onCompany}
          onClick={onCompany}
        >
          <span className={styles.number}>
            {current === 2 ? <CheckOutlined /> : 1}
          </span>
          {d.companyInfo}
        </button>
      </li>
      <li
        aria-hidden
        className={`${styles.line} ${current === 2 ? styles.completeLine : ''}`}
      />
      <li
        className={current === 2 ? styles.active : ''}
        aria-current={current === 2 ? 'step' : undefined}
      >
        <button
          type='button'
          disabled={current === 2 || !onMembers}
          onClick={onMembers}
        >
          <span className={styles.number}>2</span>
          {d.membersStep}
        </button>
      </li>
    </ol>
  );
}
