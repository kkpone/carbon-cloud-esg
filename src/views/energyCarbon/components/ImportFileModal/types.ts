/**
 * 全系统公共「文件导入」弹窗类型
 *
 * 与 base `ImportFile` / `IMPORT_RECORD_TYPE` / `IMPORT_STATUS` 语义对齐
 */

import type { FileInfo } from '@/views/energyCarbon/components/FileUpload/types';
import type { TableProps } from 'antd';

/** 导入记录类型（与后端 ImportType 对齐） */
export const IMPORT_RECORD_TYPE = {
  /** LCA 模型清单导入 */
  LCA_MODEL: 4,
  /** 产品 BOM 清单导入 */
  BOM: 5,
  /** LCA 数据集批量导入 */
  DATA_SET: 7,
  /** LCA 结果解释 - 数据质量评价 - 导入评分 */
  LCA_DATA_QUALITY_RATING: 10,
  /** 产品生命周期数据导入 */
  LIFE_CYCLE_DATA: 12,
  /** LCA 过程清单导入 */
  LCA_PROCESS_LIST: 13,
  /** CCDB 因子库因子导入 */
  CCDB_FACTOR: 14,
} as const;

export type ImportRecordType =
  (typeof IMPORT_RECORD_TYPE)[keyof typeof IMPORT_RECORD_TYPE];

/** 导入状态（与 base IMPORT_STATUS 对齐） */
export const IMPORT_STATUS = {
  /** 导入中 */
  PENDING: 0,
  /** 导入成功 */
  IMPORTED: 1,
  /** 导入失败 */
  FAILED: -1,
} as const;

export type ImportStatus = (typeof IMPORT_STATUS)[keyof typeof IMPORT_STATUS];

/** 导入历史分页请求（GET /system/importLog/page） */
export interface ImportLogPageReq {
  /** 关联数据 id（模型 id 或 过程 id） */
  dataId?: number;
  /** 导入内容类型 */
  importType: ImportRecordType | number;
  /** 页码 */
  pageNum: number;
  /** 每页条数 */
  pageSize: number;
}

/** 导入历史记录（与 base ImportLogResp 对齐的核心字段） */
export interface ImportLogRecord {
  id?: number;
  fileName?: string;
  fileUrl?: string;
  failedFileUrl?: string;
  importStatus?: ImportStatus | number;
  importStatus_name?: string;
  createByName?: string;
  importTime?: string;
  dataId?: number;
  importType?: number;
}

/** 通用导入弹窗（模板下载 + 上传 + 导入历史轮询） */
export interface ImportFileModalProps {
  open: boolean;
  title: string;
  dataId: number;
  importType: ImportRecordType | number;
  /** 与域内 `TEMPLATE_FILE_TYPE` 数值一致，走 `/file/template/download` */
  templateType?: number;
  onDownloadTemplate?: () => void | Promise<void>;
  downloadTips?: string;
  uploadTips?: string;
  maxSizeMB?: number;
  /** 导入历史表格列，未传时使用公共默认列 */
  columns?: TableProps<ImportLogRecord>['columns'];
  onImport: (
    file: FileInfo,
    success: () => void,
    fail: () => void,
  ) => void | Promise<void>;
  onCancel: () => void;
  /** 表格 `scroll`，默认 `{ x: 1400, y: 320 }` */
  tableScroll?: TableProps<ImportLogRecord>['scroll'];
}
