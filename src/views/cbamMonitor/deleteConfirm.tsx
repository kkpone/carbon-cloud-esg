import { ExclamationCircleFilled } from '@ant-design/icons';
import I18N from '@src/lang/I18N';
import { Modal } from 'antd';
import { ReactNode } from 'react';

import styles from './deleteConfirm.module.less';

interface MonitorDeleteConfirmOptions {
  title: string;
  content: ReactNode;
  /** 默认沿用删除确认文案，其他确认操作可覆盖。 */
  okText?: string;
  /** 长提示完整换行，保留现有删除弹框的单行布局。 */
  multiline?: boolean;
  onOk: () => void | Promise<void>;
}

export const showMonitorDeleteConfirm = ({
  title,
  content,
  okText = I18N.cbamMonitor.confirm,
  multiline = false,
  onOk,
}: MonitorDeleteConfirmOptions) => {
  Modal.confirm({
    className: styles.deleteConfirmModal,
    wrapClassName: styles.deleteConfirmWrap,
    centered: true,
    width: 444,
    icon: null,
    closable: true,
    title,
    content: (
      <div
        className={`${styles.deleteConfirmContent} ${
          multiline ? styles.multilineContent : ''
        }`}
      >
        <ExclamationCircleFilled className={styles.deleteConfirmIcon} />
        <span>{content}</span>
      </div>
    ),
    okText,
    cancelText: I18N.cbamMonitor.cancel,
    onOk,
  });
};
