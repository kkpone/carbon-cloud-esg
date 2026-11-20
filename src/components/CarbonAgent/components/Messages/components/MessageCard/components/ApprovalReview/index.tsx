import I18N from '@/lang/I18N';
import { approvalReviews } from '../../../../../../approvals';
import type { Data } from '../../../../../../protocol';
import styles from './index.module.less';

export default function ApprovalReview({ payload }: { payload: Data }) {
  return (
    <div className={styles.review}>
      <p>{I18N.carbonAgent.approvalHint}</p>
      {approvalReviews(payload).map(action => (
        <section key={action.key}>
          <h4>{action.title}</h4>
          <dl>
            {action.fields.map(field => (
              <div key={field.key}>
                <dt>{field.label}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
