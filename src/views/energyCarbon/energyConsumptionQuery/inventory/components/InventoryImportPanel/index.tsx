import I18N from '@/lang/I18N';
import FileUpload, {
  type FileInfo,
} from '@/views/energyCarbon/components/FileUpload';
import importStyles from '@/views/energyCarbon/components/ImportFileModal/index.module.css';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import { App, Button, Col, Row } from 'antd';
import { useState } from 'react';
import { useImportInventory, useInventoryTemplate } from '../../hooks';
import styles from './index.module.css';

interface Props {
  /** 受理后切换到导入记录首页，确保新任务参与轮询。 */
  onSubmitted: () => void;
}

/** 模板与上传分栏；批次计数、失败原因和错误文件统一在本人记录中展示。 */
export default function InventoryImportPanel({ onSubmitted }: Props) {
  useLocale();
  const { message } = App.useApp();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const importing = useImportInventory();
  const template = useInventoryTemplate();
  return (
    <div className={styles.panel} data-testid='energy-inventory-import-panel'>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <div className={`${importStyles.section} ${styles.actionSection}`}>
            <p className={importStyles.tips}>
              {I18N.energyCarbon.inventoryImportHelp}
            </p>
            <div>
              <Button
                onClick={() => template.mutate()}
                loading={template.isLoading}
                data-testid='energy-inventory-template'
              >
                {I18N.energyCarbon.inventoryImportTemplate}
              </Button>
            </div>
          </div>
        </Col>
        <Col xs={24} md={12}>
          <div className={`${importStyles.section} ${styles.actionSection}`}>
            <div className={importStyles.uploadedRow}>
              <div className={styles.uploadControl}>
                <FileUpload
                  value={files}
                  onChange={value => {
                    setFiles(value);
                    importing.reset();
                  }}
                  maxCount={1}
                  maxSizeMB={5}
                  accept={['xlsx']}
                  disabled={importing.isLoading}
                  data-testid='energy-inventory-import-file'
                />
              </div>
              <Button
                type='primary'
                loading={importing.isLoading}
                data-testid='energy-inventory-import-submit'
                onClick={() => {
                  if (importing.isLoading) return;
                  const file = files[0];
                  if (!file?.url) {
                    message.warning(
                      I18N.energyCarbon.inventoryImportFileRequired,
                    );
                    return;
                  }
                  importing.mutate(
                    { fileName: file.fileName, fileUrl: file.url },
                    {
                      onSuccess: () => {
                        setFiles([]);
                        onSubmitted();
                      },
                    },
                  );
                }}
              >
                {I18N.energyCarbon.inventoryImport}
              </Button>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}
