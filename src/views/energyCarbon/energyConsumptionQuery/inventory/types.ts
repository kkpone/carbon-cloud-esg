import type { FileInfo } from '@/views/energyCarbon/components/FileUpload';
import type { ImportLogRecord } from '@/views/energyCarbon/components/ImportFileModal/types';
import type { EnergyConsumptionOptions, PageData } from '../dataFill/types';

export type InventoryOptions = EnergyConsumptionOptions;
export type InventoryPage = PageData<InventoryRecord>;
export interface InventoryRecord {
  id: number;
  orgId: number;
  orgName: string;
  documentNo: string;
  inventoryTime: string;
  year: number;
  boundaryId: number;
  boundaryType: number | string;
  boundaryNameSnapshot: string;
  energyId: number;
  energyNameSnapshot: string;
  energyUnitSnapshot: string;
  energyUnitNameSnapshot: string;
  quantity: number | string;
  cost?: number | string | null;
  productIds: number[];
  products: Array<{
    productId: number;
    productNameSnapshot: string;
    productCodeSnapshot?: string;
  }>;
  dataSource?: string;
  remark?: string;
  attachments: FileInfo[];
}
export interface InventorySave {
  id?: number;
  orgId: number;
  documentNo: string;
  inventoryTime: string;
  boundaryId: number;
  energyId: number;
  quantity: string;
  cost?: string;
  productIds: number[];
  dataSource?: string;
  remark?: string;
  attachments: FileInfo[];
}
export interface InventoryListParams {
  pageNum: number;
  pageSize: number;
  documentNo?: string;
  orgId?: number;
  startDate?: string;
  endDate?: string;
}
export interface InventoryImportResult {
  processing?: boolean;
  importRecordId?: number;
  totalCount: number;
  successCount: number;
  failedCount: number;
  errorFileUrl?: string;
  errors: Array<{ rowNumber: number; reason: string }>;
}
/** 库存导入组织逐行取自Excel，不在页面指定整批组织。 */
export interface InventoryImportFile {
  fileName: string;
  fileUrl: string;
}
/** 后端按当前租户及本人限定导入记录，前端只传分页参数。 */
export interface InventoryImportPageParams {
  pageNum: number;
  pageSize: number;
}
/** 库存导入记录补充批次结果，不影响其他业务的公共导入列表。 */
export interface InventoryImportLogRecord extends ImportLogRecord {
  /** 后台处理失败原因，不包含内部 SQL 或堆栈。 */
  errMsg?: string | null;
  /** 非空数据行总数，解析前失败时为 0。 */
  totalCount?: number | null;
  /** 整批保存成功的行数。 */
  successCount?: number | null;
  /** 整批未保存的行数，并非具体错误行数。 */
  failedCount?: number | null;
}
export type InventoryImportLogPage = Pick<
  PageData<InventoryImportLogRecord>,
  'records' | 'total'
>;
export type InventoryDrawerTarget =
  | { kind: 'new' }
  | { kind: 'edit' | 'view'; id: number }
  | null;
