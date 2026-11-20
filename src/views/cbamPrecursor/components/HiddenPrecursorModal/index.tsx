import I18N from '@src/lang/I18N';
import { Button, Modal, Space, Table, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';

import hiddenEmptyIcon from '../../assets/hidden-empty.svg';
import modalCloseIcon from '../../assets/modal-close.svg';
import { Precursor, PrecursorCnCard } from '../../types';
import styles from './index.module.less';

interface Props {
  cn?: PrecursorCnCard;
  open: boolean; loading: boolean; records: Precursor[]; total: number; pageNum: number; pageSize: number;
  onClose: () => void; onPageChange: (pageNum: number, pageSize: number) => void;
  onDetail: (id: number) => void; onRestore: (id: number) => void;
}

export const HiddenPrecursorModal = ({ cn, open, loading, records, total, pageNum, pageSize, onClose, onPageChange, onDetail, onRestore }: Props) => {
  const renderText = (value?: string | number) => {
    const text = value === undefined || value === null || value === '' ? '-' : String(value);
    return <Typography.Text className={styles.cellText} ellipsis={{ tooltip: { title: text, placement: 'topLeft' } }}>{text}</Typography.Text>;
  };
  const columns: ColumnsType<Precursor> = [
    { title: I18N.cbamPrecursor.collectionType, dataIndex: 'sourceTypeName', width: 120, render: renderText },
    { title: I18N.cbamPrecursor.fillName, dataIndex: 'fillTaskName', width: 160, render: renderText },
    { title: I18N.cbamPrecursor.precursorName, dataIndex: 'precursorName', width: 160, render: renderText },
    { title: I18N.cbamPrecursor.supplier, dataIndex: 'supplierName', width: 160, render: renderText },
    { title: I18N.cbamPrecursor.verificationPeriod, width: 210, render: (_, row) => renderText(`${row.verificationStartDate} ~ ${row.verificationEndDate}`) },
    { title: I18N.cbamPrecursor.embeddedEmission, dataIndex: 'embeddedEmission', width: 140, render: value => renderText(`${value} tCO₂e/t`) },
    { title: I18N.cbamPrecursor.operation, width: 120, fixed: 'right', render: (_, row) => <Space size={12}><Button type='link' onClick={() => onRestore(row.id)}>{I18N.cbamPrecursor.restore}</Button><Button type='link' onClick={() => onDetail(row.id)}>{I18N.cbamPrecursor.view}</Button></Space> },
  ];
  return <Modal
    centered
    closable={false}
    className={styles.modal}
    title={<div className={styles.titleRow}><span className={styles.titleText}>{I18N.cbamPrecursor.hiddenModalTitle}</span><button type='button' aria-label='close' onClick={onClose}><img src={modalCloseIcon} alt='' /></button></div>}
    width={904}
    open={open}
    footer={null}
    onCancel={onClose}
  >
    <div className={styles.content}>
      <div className={styles.cnInfo}>
        <span className={styles.cnTitle}><i>CN</i><strong>{cn?.cnCode || '-'}</strong></span>
        <span className={styles.cnName}>{cn?.cnName || '-'}</span>
      </div>
      <Table
        className={styles.table}
        rowKey='id'
        loading={loading}
        columns={columns}
        dataSource={records}
        scroll={records.length ? { x: 1070 } : undefined}
        locale={{ emptyText: <div className={styles.empty}><img src={hiddenEmptyIcon} alt='' /><span>{I18N.cbamPrecursor.noHiddenRecords}</span></div> }}
        pagination={total > pageSize ? { current: pageNum, pageSize, total, showSizeChanger: false, onChange: onPageChange } : false}
      />
    </div>
  </Modal>;
};
