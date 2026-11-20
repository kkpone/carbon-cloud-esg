import { useState } from 'react';
import { Input, Modal } from 'antd';
import I18N from '@src/lang/I18N';
import styles from './index.module.less';
import { AnalysisIcon } from '@/views/carbonFootprint3/components/AnalysisIcon';

interface Props {
  name: string;
  value: string;
  readOnly: boolean;
  onCancel: () => void;
  onSave: (value: string) => void;
}
export function DescriptionModal({
  name,
  value,
  readOnly,
  onCancel,
  onSave,
}: Props) {
  const [description, setDescription] = useState(value);
  return (
    <Modal
      open
      centered
      width={480}
      className={styles.modal}
      closeIcon={<AnalysisIcon name='close' />}
      title={I18N.carbonFootprint3.mcDescription}
      okText={I18N.carbonFootprint.confirm}
      onCancel={onCancel}
      onOk={() => onSave(description)}
      okButtonProps={{ disabled: readOnly }}
    >
      <p className={styles.name}>{name}</p>
      <Input.TextArea
        disabled={readOnly}
        value={description}
        maxLength={1000}
        showCount
        rows={6}
        onChange={event => setDescription(event.target.value)}
      />
    </Modal>
  );
}
