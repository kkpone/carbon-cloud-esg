import { Button } from 'antd';
import I18N from '@/lang/I18N';
import pending from '@/assets/images/carbonCompetition/review-pending.svg';
import approved from '@/assets/images/carbonCompetition/review-approved.svg';
import rejected from '@/assets/images/carbonCompetition/review-rejected.svg';
import edit from '@/assets/images/carbonCompetition/review-edit.svg';
import styles from './index.module.less';

type Props = {
  status?: string;
  reason?: string;
  onEdit?: () => void;
  onRefresh: () => void;
  busy: boolean;
};
export default function QualificationStatus({
  status,
  reason,
  onEdit,
  onRefresh,
  busy,
}: Props) {
  const d = I18N.carbonCompetition.design;
  const states = {
    PENDING_REVIEW: {
      icon: pending,
      title: d.reviewPendingTitle,
      hint: d.qualificationSubmittedHint,
      tone: styles.pending,
    },
    APPROVED: {
      icon: approved,
      title: d.reviewApproved,
      hint: d.reviewApprovedHint,
      tone: styles.approved,
    },
    REJECTED: {
      icon: rejected,
      title: d.reviewRejectedTitle,
      hint: reason || d.reviewRejected,
      tone: styles.rejected,
    },
  };
  const state = states[status as keyof typeof states];
  if (!state) return null;
  return (
    <div className={`${styles.status} ${state.tone}`} role='status'>
      <div className={styles.copy}>
        <strong>
          <img src={state.icon} alt='' />
          {state.title}
        </strong>
        <p>{state.hint}</p>
      </div>
      {onEdit && (
        <Button icon={<img src={edit} alt='' />} onClick={onEdit}>
          {d.editInformation}
        </Button>
      )}
      {status === 'PENDING_REVIEW' && (
        <Button loading={busy} onClick={onRefresh}>
          {d.refreshStatus}
        </Button>
      )}
    </div>
  );
}
