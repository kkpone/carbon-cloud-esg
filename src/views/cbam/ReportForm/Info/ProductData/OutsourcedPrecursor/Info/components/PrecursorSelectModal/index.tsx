import {
  Alert,
  Modal,
  Select,
  Space,
  Table,
  type TableColumnsType,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

import I18N from '@/lang/I18N';
import type { Precursor } from '@/views/cbamPrecursor/types';
import {
  getAccountingPrecursorOptions,
  getAccountingPrecursorPage,
} from '@/views/cbam/ReportForm/service';

interface PrecursorSelectModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: (record: Precursor) => void;
}

/** 选择仅更新父表单草稿，最终保存核算数据时才写回后端。 */
const PrecursorSelectModal = ({
  open,
  onCancel,
  onConfirm,
}: PrecursorSelectModalProps) => {
  const [records, setRecords] = useState<Precursor[]>([]);
  const [selected, setSelected] = useState<Precursor>();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [filters, setFilters] = useState<{
    cnCode?: string;
    supplierName?: string;
    precursorName?: string;
  }>({});
  const [options, setOptions] = useState<{
    cnCodes: string[];
    supplierNames: string[];
    precursorNames: string[];
  }>({
    cnCodes: [],
    supplierNames: [],
    precursorNames: [],
  });

  useEffect(() => {
    if (!open) {
      setSelected(undefined);
      setFilters({});
      setPage(1);
      return undefined;
    }
    let active = true;
    getAccountingPrecursorOptions()
      .then(({ data }) => {
        if (active && data?.data) setOptions(data.data);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setLoading(true);
    setFailed(false);
    getAccountingPrecursorPage({ pageNum: page, pageSize: 10, ...filters })
      .then(({ data }) => {
        if (!active) return;
        setRecords(data?.data?.records || []);
        setTotal(data?.data?.total || 0);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, page, filters]);

  const columns: TableColumnsType<Precursor> = [
    { title: I18N.cbamMonitor.cnCodeShort, dataIndex: 'cnCode', width: 130 },
    {
      title: I18N.cbamMonitor.declarationName,
      dataIndex: 'fillTaskName',
      ellipsis: true,
    },
    {
      title: I18N.cbamMonitor.precursorName,
      dataIndex: 'precursorName',
      ellipsis: true,
    },
    {
      title: I18N.cbamMonitor.supplier,
      dataIndex: 'supplierName',
      ellipsis: true,
    },
    {
      title: I18N.cbamMonitor.verificationPeriod,
      width: 220,
      render: (_, record) =>
        record.verificationStartDate && record.verificationEndDate
          ? `${dayjs(record.verificationStartDate).format(
              'YYYY-MM-DD',
            )} ~ ${dayjs(record.verificationEndDate).format('YYYY-MM-DD')}`
          : '-',
    },
    {
      title: I18N.cbamMonitor.embeddedEmission,
      dataIndex: 'embeddedEmission',
      width: 130,
    },
  ];

  return (
    <Modal
      open={open}
      title={I18N.cbamMonitor.selectPrecursor}
      width={1100}
      destroyOnClose
      maskClosable={false}
      onCancel={onCancel}
      okText={I18N.base.confirm}
      cancelText={I18N.Factors.cancel}
      okButtonProps={{ disabled: !selected || loading || failed }}
      onOk={() => selected && onConfirm(selected)}
    >
      <Space wrap style={{ marginBottom: 16 }}>
        {(
          [
            ['cnCode', options.cnCodes, I18N.cbamMonitor.cnCode],
            ['supplierName', options.supplierNames, I18N.cbamMonitor.supplier],
            [
              'precursorName',
              options.precursorNames,
              I18N.cbamMonitor.precursorName,
            ],
          ] as const
        ).map(([key, values, placeholder]) => (
          <Select
            key={key}
            allowClear
            showSearch
            style={{ width: 230 }}
            optionFilterProp='label'
            placeholder={placeholder}
            value={filters[key]}
            options={values.map(value => ({ label: value, value }))}
            onChange={value => {
              setPage(1);
              setSelected(undefined);
              setFilters(current => ({ ...current, [key]: value }));
            }}
          />
        ))}
      </Space>
      {failed && (
        <Alert
          type='error'
          showIcon
          message={I18N.cbam.precursorSelectionLoadFailed}
        />
      )}
      <Table<Precursor>
        rowKey='id'
        columns={columns}
        dataSource={records}
        loading={loading}
        scroll={{ x: 950 }}
        pagination={{
          current: page,
          pageSize: 10,
          total,
          showSizeChanger: false,
          onChange: value => {
            setPage(value);
            setSelected(undefined);
          },
        }}
        rowSelection={{
          type: 'radio',
          selectedRowKeys: selected ? [selected.id] : [],
          onChange: (_, rows) => setSelected(rows[0]),
        }}
      />
    </Modal>
  );
};

export default PrecursorSelectModal;
