import { Button, Modal, Space } from 'antd';
import I18N from '@/lang/I18N';
import success from '@/assets/images/carbonCompetition/registration-success.svg';
import styles from './index.module.less';

type Props = {
  open: boolean;
  kind: 'qualification' | 'registration' | 'individual';
  onClose: () => void;
  onInvite?: () => void;
  onTasks?: () => void;
  benefitStatus?: string;
};
export default function RegistrationFeedback({
  open,
  kind,
  onClose,
  onInvite,
  onTasks,
  benefitStatus,
}: Props) {
  const d = I18N.carbonCompetition.design;
  const hint = {
    qualification: d.qualificationSubmittedHint,
    registration: d.registrationSuccessHint,
    individual: d.individualSuccessHint,
  }[kind];
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      closable={false}
      width={400}
      className={styles.modal}
    >
      <div className={styles.feedback}>
        <img src={success} alt='' />
        <h2>
          {kind === 'qualification'
            ? d.qualificationSubmitted
            : kind === 'individual'
            ? d.individualSuccessTitle
            : d.registrationSuccess}
        </h2>
        <p>{hint}</p>
        {kind === 'individual' && (
          <p>
            {benefitStatus === 'SUCCESS'
              ? d.benefitOpened
              : ['PENDING', undefined].includes(benefitStatus)
              ? d.benefitOpening
              : d.benefitPending}
          </p>
        )}
        {kind === 'qualification' ? (
          <Button onClick={onClose}>{d.understood}</Button>
        ) : (
          <Space wrap>
            <Button onClick={onInvite}>
              {kind === 'individual' ? d.copyPersonalInvite : d.copyInvite}
            </Button>
            <Button type='primary' onClick={onTasks}>
              {d.tasks}
            </Button>
          </Space>
        )}
      </div>
    </Modal>
  );
}
