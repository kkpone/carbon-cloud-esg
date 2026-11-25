import { CopyOutlined } from '@ant-design/icons';
import I18N from '@src/lang/I18N';
import { Button, Modal } from 'antd';
import { FC, useMemo } from 'react';

import { Toast } from '@/utils';
import { copyToClipboard } from '@/utils/clipboard';

import styles from './index.module.less';
import { buildReportSystemPrompt } from '../../promptUtils';
import {
  OutlineSectionNode,
  ReportDetailsType,
  ReportPromptConfig,
} from '../../service';

export interface IPromptConfigModalProps {
  open: boolean;
  value: ReportPromptConfig;
  reportInfo?: Partial<ReportDetailsType>;
  sections: OutlineSectionNode[];
  onCancel: () => void;
  onConfirm?: (config: ReportPromptConfig) => void;
}

export const PromptConfigModal: FC<IPromptConfigModalProps> = ({
  open,
  value,
  reportInfo,
  sections,
  onCancel,
}) => {
  const previewText = useMemo(
    () =>
      buildReportSystemPrompt({
        reportInfo,
        sections,
        config: value,
      }),
    [reportInfo, sections, value],
  );

  const handleCopyPrompt = async () => {
    const ok = await copyToClipboard(previewText);
    if (ok) {
      Toast('success', I18N.esg.copyPromptSuccess);
    }
  };

  return (
    <Modal
      title={I18N.esg.promptPreviewTitle}
      width={800}
      open={open}
      destroyOnClose
      footer={null}
      onCancel={onCancel}
    >
      <div className={styles.body}>
        <div className={styles.field}>
          <div className={styles.previewHeader}>
            <div className={styles.label}>{I18N.esg.promptPreviewTitle}</div>
            <Button
              type='link'
              size='small'
              icon={<CopyOutlined />}
              onClick={handleCopyPrompt}
            >
              {I18N.esg.copyPromptBtn}
            </Button>
          </div>
          <div className={styles.previewBox}>{previewText}</div>
        </div>
      </div>

      <div className={styles.footer}>
        <Button onClick={onCancel}>{I18N.carbonFootprint3.close}</Button>
      </div>
    </Modal>
  );
};
