/**
 * 导入历史列（与 base `components/ImportFile/column.tsx` 字段对齐）
 */

import { type TableColumnsType, Tag } from 'antd';

import I18N from '@/lang/I18N';
import { createTableActionsColumn } from '@/views/energyCarbon/components/TableActions';
import { withTableColumnEmptyRender } from '@/views/energyCarbon/platform/tableColumn';
import { IMPORT_STATUS, type ImportLogRecord } from './types';
import { downloadByUrl } from './util';

export const STATUS_TAG: Record<number, { color: string }> = {
  [IMPORT_STATUS.PENDING]: { color: 'orange' },
  [IMPORT_STATUS.IMPORTED]: { color: 'green' },
  [IMPORT_STATUS.FAILED]: { color: 'red' },
};

function getImportStatusText(status: number | undefined) {
  if (status === IMPORT_STATUS.PENDING) return I18N.importFile.status.pending;
  if (status === IMPORT_STATUS.IMPORTED) return I18N.importFile.status.imported;
  if (status === IMPORT_STATUS.FAILED) return I18N.importFile.status.failed;
  return '-';
}

function renderImportStatus(v: number | undefined, record: ImportLogRecord) {
  const cfg = v !== undefined ? STATUS_TAG[v] : undefined;
  return (
    <Tag color={cfg?.color}>
      {record.importStatus_name ?? getImportStatusText(v)}
    </Tag>
  );
}

function createImportActionColumn(fixed?: 'right') {
  return createTableActionsColumn<ImportLogRecord>({
    fixed,
    rowHidden: record => !record.fileUrl && !record.failedFileUrl,
    actions: [
      {
        key: 'source-file',
        label: I18N.importFile.sourceFile,
        hidden: record => !record.fileUrl,
        testId: 'import-log-source-file',
        onClick: record => {
          if (record.fileUrl) downloadByUrl(record.fileUrl, record.fileName);
        },
      },
      {
        key: 'failed-file',
        label: I18N.importFile.failedFile,
        hidden: record => !record.failedFileUrl,
        danger: true,
        testId: 'import-log-failed-file',
        onClick: record => {
          if (!record.failedFileUrl) return;
          downloadByUrl(
            record.failedFileUrl,
            record.fileName ? `error_${record.fileName}` : undefined,
          );
        },
      },
    ],
  });
}

/** 基础导入历史列 */
export function buildBasicImportLogColumns(): TableColumnsType<ImportLogRecord> {
  return withTableColumnEmptyRender<ImportLogRecord>([
    {
      title: I18N.common.table.index,
      key: 'index',
      width: 80,
      render: (_v, _r, idx) => idx + 1,
    },
    {
      title: I18N.common.shared.fileName,
      dataIndex: 'fileName',
      width: 220,
      ellipsis: true,
    },
    {
      title: I18N.common.table.status,
      dataIndex: 'importStatus',
      width: 120,
      render: renderImportStatus,
    },
    {
      title: I18N.importFile.columns.operator,
      dataIndex: 'createByName',
      width: 140,
      ellipsis: true,
    },
    {
      title: I18N.importFile.columns.importTime,
      dataIndex: 'importTime',
      width: 180,
      ellipsis: true,
    },
    createImportActionColumn(),
  ]);
}

export function buildImportLogColumns(): TableColumnsType<ImportLogRecord> {
  return withTableColumnEmptyRender<ImportLogRecord>([
    {
      title: I18N.common.table.index,
      key: 'index',
      width: 80,
      render: (_v, _r, idx) => idx + 1,
      fixed: 'left',
    },
    {
      title: I18N.common.shared.fileName,
      dataIndex: 'fileName',
      width: 220,
      ellipsis: true,
      fixed: 'left',
    },
    {
      title: I18N.common.fields.organization,
      dataIndex: 'orgName',
      width: 150,
      ellipsis: true,
    },
    {
      title: I18N.importFile.columns.totalCount,
      dataIndex: 'totalCount',
      ellipsis: true,
    },
    {
      title: I18N.importFile.columns.successCount,
      dataIndex: 'successCount',
      ellipsis: true,
    },
    {
      title: I18N.importFile.columns.failedCount,
      dataIndex: 'failedCount',
      ellipsis: true,
    },
    {
      title: I18N.common.table.status,
      dataIndex: 'importStatus',
      width: 120,
      render: renderImportStatus,
    },
    {
      title: I18N.importFile.columns.operator,
      dataIndex: 'createByName',
      width: 140,
      ellipsis: true,
    },
    {
      title: I18N.importFile.columns.importTime,
      dataIndex: 'importTime',
      width: 180,
      ellipsis: true,
    },
    createImportActionColumn('right'),
  ]);
}
