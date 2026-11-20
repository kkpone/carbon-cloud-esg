/** 用户选中的固定解析定位。服务端会重新核验权限、原件版本及结果可用性。 */
export type AgentMaterialReference = {
  assetId: number | string;
  jobId: string;
  revision: number;
  fileVersion: number;
  fileHash: string;
  status: 'READY' | 'PARTIAL';
};

/** 附件在选择、发送与历史回显之间保留的解析定位，不把解析序号当作原件版本。 */
export type AgentMaterialSelection = {
  analysisJobId?: string;
  materialAnalysis?: AgentMaterialReference;
};

/** 历史数据可能来自旧版本；只接受完整定位，不用最新解析补齐缺失信息。 */
export function normalizeMaterialReference(value: unknown): AgentMaterialReference | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const { assetId, jobId, revision, fileVersion, fileHash, status } = record;
  if ((typeof assetId !== 'string' && typeof assetId !== 'number') || !String(assetId).trim()
    || typeof jobId !== 'string' || !jobId.trim()
    || typeof revision !== 'number' || !Number.isInteger(revision) || revision < 1
    || typeof fileVersion !== 'number' || !Number.isInteger(fileVersion) || fileVersion < 1
    || typeof fileHash !== 'string' || !fileHash.trim()
    || (status !== 'READY' && status !== 'PARTIAL')) return undefined;
  return { assetId, jobId, revision, fileVersion, fileHash, status };
}

/** 普通附件只发送原 fileId；固定版本仅提交定位，显示元数据由 Java 重建。 */
export function materialAttachmentRequest(file: AgentMaterialSelection & {
  fileId: string; assetId?: number | string;
}): { fileId: string; assetId?: number | string; analysisJobId?: string } {
  return file.analysisJobId
    ? { fileId: file.fileId, assetId: file.assetId, analysisJobId: file.analysisJobId }
    : { fileId: file.fileId };
}
