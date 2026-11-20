import type { FC } from 'react';

import ProcessingIcon from '../../BatchCreateModel/modeling-tip-icon.svg';
import styles from './index.module.less';

type BatchProcessingTipProps = {
  /** 当前异步任务的提示文案。 */
  message: string;
  /** 侧边栏底部使用紧凑尺寸，允许长文案换行。 */
  compact?: boolean;
};

/** 批量解析与建模共用的图标呼吸、流光和圆点动效提示。 */
const BatchProcessingTip: FC<BatchProcessingTipProps> = ({
  message,
  compact = false,
}) => (
  <div
    className={[styles.modelingTip, compact ? styles.compact : ''].join(' ')}
    role='status'
    aria-live='polite'
  >
    <span className={styles.modelingTipIconWrap}>
      <img src={ProcessingIcon} alt='' className={styles.modelingTipIcon} />
    </span>
    <span className={styles.modelingTipText}>
      {message}
      <span className={styles.modelingTipDots} aria-hidden='true'>
        <span className={styles.modelingTipDot} />
        <span className={styles.modelingTipDot} />
        <span className={styles.modelingTipDot} />
      </span>
    </span>
  </div>
);

export default BatchProcessingTip;
