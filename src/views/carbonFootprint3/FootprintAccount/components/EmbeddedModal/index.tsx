import type { ModalProps } from 'antd';
import styles from './index.module.less';
/** 同一新增核算弹窗内复用原表单与模板选择，不叠加第二层遮罩。 */
export default function EmbeddedModal({
  children,
  footer,
  className,
}: ModalProps) {
  return (
    <div className={`${styles.content} ${className || ''}`}>
      {children}
      {typeof footer !== 'function' && footer && (
        <div className={styles.footer}>{footer}</div>
      )}
    </div>
  );
}
