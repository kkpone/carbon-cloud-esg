import I18N from '@src/lang/I18N';
import { Modal } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { getSavedFactorScope } from '@/components/FormilyUtil/FormilyFactor/customFactorReuse/scope';
import type {
  SavedCustomFactor,
  SavedFactorService,
} from '@/components/FormilyUtil/FormilyFactor/customFactorReuse/types';
import SavedFactorList from '@/components/SavedFactorList';

import styles from './index.module.less';

type Props = {
  service: SavedFactorService;
  onClose: () => void;
  onChange?: () => void;
};

export default function SavedFactorManager({
  service,
  onClose,
  onChange,
}: Props) {
  const [revision, setRevision] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<SavedCustomFactor>();
  const [deleting, setDeleting] = useState(false);
  const active = useRef(false);
  const scope = useRef(getSavedFactorScope());
  const deletePending = useRef(false);
  const text = I18N.customFactorReuse;

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  const remove = async () => {
    if (!deleteTarget || deletePending.current) return;
    deletePending.current = true;
    setDeleting(true);
    try {
      await service.remove(deleteTarget.id);
      if (!active.current || scope.current !== getSavedFactorScope()) return;
      setDeleteTarget(undefined);
      setRevision(value => value + 1);
      onChange?.();
    } catch {
      // Keep confirmation open; the request layer reports the failure.
    } finally {
      deletePending.current = false;
      if (active.current && scope.current === getSavedFactorScope())
        setDeleting(false);
    }
  };

  return (
    <>
      <Modal
        open
        title={text.manage}
        width='80%'
        className={styles.dialog}
        centered
        destroyOnClose
        maskClosable={!deleting}
        keyboard={!deleting}
        onCancel={() => {
          if (!deletePending.current) onClose();
        }}
        footer={null}
      >
        <SavedFactorList
          service={service}
          revision={revision}
          mode='manage'
          deletingId={deleting ? deleteTarget?.id : undefined}
          onDelete={setDeleteTarget}
        />
      </Modal>
      <Modal
        open={!!deleteTarget}
        title={text.deleteConfirm}
        confirmLoading={deleting}
        okText={text.confirm}
        cancelText={text.cancel}
        okButtonProps={{ danger: true }}
        cancelButtonProps={{ disabled: deleting }}
        closable={!deleting}
        keyboard={!deleting}
        maskClosable={false}
        onOk={remove}
        onCancel={() => {
          if (!deletePending.current) setDeleteTarget(undefined);
        }}
      >
        {deleteTarget?.name}
      </Modal>
    </>
  );
}
