export default {
  downloadTips:
    'Download the import template first, fill it in, then upload it.',
  uploadTips:
    'Only .xlsx files are supported. Single file must not exceed {val1}MB',
  reupload: 'Re-upload',
  history: 'Import history',
  refresh: 'Refresh',
  sourceFile: 'Source file',
  failedFile: 'Error data',
  status: {
    pending: 'Importing',
    imported: 'Imported',
    failed: 'Import failed',
  },
  columns: {
    totalCount: 'Total',
    successCount: 'Imported',
    failedCount: 'Errors',
    operator: 'Operator',
    importTime: 'Import time',
  },
  templateNames: {
    lcaModel: 'lca-model-import-template.xlsx',
    bom: 'bom-import-template.xlsx',
    dataSet: 'dataset-import-template.xlsx',
    supplierData: 'supplier-data-import-template.xlsx',
    lifeCycleData: 'life-cycle-data-import-template.xlsx',
    processList: 'process-list-import-template.xlsx',
    emissionFactor: 'emission-factor-import-template.xlsx',
  },
  downloadFailedWithStatus: 'Download failed: HTTP {val1}',
  downloadFailed: 'Download failed',
};
