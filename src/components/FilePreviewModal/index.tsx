import I18N from '@src/lang/I18N';
import { Empty, Image, Modal } from 'antd';
import { FC } from 'react';

import styles from './index.module.less';
import OfficePreview from './components/OfficePreview';
import { PreviewFile } from './types';
import { getPreviewType } from './utils';

interface FilePreviewModalProps {
  file?: PreviewFile;
  onClose: () => void;
  open: boolean;
}

const FilePreviewModal: FC<FilePreviewModalProps> = ({
  file,
  onClose,
  open,
}) => {
  const previewType = file ? getPreviewType(file) : 'unsupported';

  return (
    <Modal
      centered
      destroyOnClose
      footer={null}
      open={open}
      title={file?.name || I18N.supplyChainCarbonManagement.preview}
      width='90vw'
      zIndex={3100}
      onCancel={onClose}
    >
      <div className={styles.previewContent}>
        {file && previewType === 'image' ? (
          <Image alt={file.name} className={styles.image} src={file.url} />
        ) : null}
        {file && previewType === 'pdf' ? (
          <iframe className={styles.pdf} src={file.url} title={file.name} />
        ) : null}
        {file && previewType === 'office' ? (
          <OfficePreview file={file} />
        ) : null}
        {file && previewType === 'unsupported' ? (
          <Empty
            description={I18N.enterpriseCarbonAccount2.filePreviewNotSupported}
          />
        ) : null}
      </div>
    </Modal>
  );
};

export default FilePreviewModal;
