import { request } from '@/api/request';
import I18N from '@/lang/I18N';
import type { AgentProjectFile } from '../../service';
import { normalizeMaterialReference, type AgentMaterialReference } from '../../materialReference';

/**
 * 单份资料的一次解析版本概要，与原文件版本分开维护。
 * @property jobId 固定解析任务 ID
 * @property revision 解析版本序号
 * @property fileVersion 原件版本
 * @property fileHash 原件内容哈希
 * @property status 解析任务状态，READY 不代表核算资料齐全
 * @property summary 分析摘要，不代替完整提取块
 * @property errorCode 解析异常标识
 * @property createTime 解析版本创建时间
 * @property bindingId 解析所属的收数绑定
 */
export type Analysis = {
  jobId: string; revision: number; fileVersion: number; fileHash: string; status: string;
  summary?: string; errorCode?: string; createTime: string; bindingId: string;
  /** 已确认的历史口径及其来源解析版本；失去发布资格后仍保留历史结果。 */
  scopeRef?: string; sourceJobId?: string; processingScope?: string; publishable?: boolean;
  /** 服务端资料库准入资格，false 的尝试仅供收件记录查看。 */
  selectable?: boolean | null;
};
/**
 * 项目资料及解析状态，保留最新尝试和历史可用结果。
 * @property file 原件信息；assetId 为项目资产，workspaceFileId 用于附件引用
 * @property analysisStatus 最新解析状态
 * @property latestAnalysis 最近一次解析尝试，可处于失败状态
 * @property reusableAnalysis 匹配当前原件且已完成或部分完成的可复用版本
 * @property sources 每次群收件的来源、发送时间和资料可用性判断
 */
export type Material = {
  file: { assetId: string | number; fileName: string; fileSize: number; version: number; workspaceFileId: string;
    fileHash?: string; fileType?: string; createTime?: string; uploaderUserName?: string; uploaderCompanyName?: string;
    admissionStatus?: string; admittedAnalysisJobId?: string };
  analysisStatus: string; latestAnalysis?: Analysis; reusableAnalysis?: Analysis;
  sources: { receiptId: string; bindingId: string; groupName: string; sentAt: string;
    materialStatus?: string; materialReason?: string; senderName?: string | null; senderOpenId?: string }[];
  supplements?: { receiptId: string; bindingId: string; groupName: string; sentAt: string; text: string }[];
};
export type MaterialPage = {
  items: Material[]; total: number; nextOffset?: number | null;
  counts: { all: number; manual: number; feishu: number };
  groups: { bindingId: string; name: string; count: number }[];
};
/** 新版逐文件提取结果；覆盖范围与证据保留原语义，不换算成虚构的页数比例。 */
export type CollectionResult = {
  materialId: string; status: 'ready' | 'partial' | 'failed';
  resultKind: 'original_extract' | 'scoped_derivation'; coverage: 'complete' | 'partial' | 'unsupported';
  processedScope: string; contentArtifactRef?: string | null; derivationRule: string; unprocessedReasons: string[];
  evidence: { sourceType: 'excel_cell' | 'excel_aggregation' | 'document_region'; materialVersion: number;
    sheet?: string; cell?: string; range?: string; page?: number; region?: string; derivationRule: string;
    matchedRowCount?: number }[];
};
/**
 * 指定解析版本的一页完整提取内容，保留覆盖范围和原始定位。
 * @property analysis 当前解析版本
 * @property coverage 总处理单元、已处理数量、计量单位与未处理部分
 * @property missingItems 业务资料缺项
 * @property warnings 提取限制或数据疑点
 * @property chunks 内容块列表，chunkId 标识块，locator 定位原件，content 保留完整文本
 * @property totalChunks 该版本提取块总数
 * @property nextOffset 下一页偏移，空表示读取完成
 * @property supplements 后续明确关联的文字原文及关联依据，不覆盖原解析版本
 */
export type AnalysisPage = {
  analysis: Analysis;
  coverage?: { totalUnits: number; processedUnits: number; unit: string; unprocessed: string[] };
  missingItems: string[]; warnings: string[];
  chunks: { chunkId: string; locator: string; content: string }[];
  totalChunks: number; nextOffset?: number | null;
  supplements: { receiptId: string; messageId: string; content: string; reason: string; sentAt: string }[];
  /** 第一页返回新版完整元数据；后续内容页继续使用同一解析版本。 */
  collectionResult?: CollectionResult | null;
};
type Response<T> = { code: number; msg?: string; data: T };
const base = (projectId: string) => `/ai/agent/projects/${encodeURIComponent(projectId)}/materials`;

/** 检索项目资料并按服务端游标分页，来源与解析状态分别筛选。 */
export async function searchMaterials(projectId: string, filters: {
  keyword?: string; source?: string; bindingId?: string; status?: string; offset: number;
}, signal?: AbortSignal) {
  const result = await request<Response<MaterialPage>>({
    url: base(projectId), params: { ...filters, limit: 20 }, signal,
  });
  if (result.data.code !== 200 || !result.data.data) throw new Error(result.data.msg || I18N.feishuCollection.materialLoadFailed);
  return result.data.data;
}
/** 查询某份资料的所有解析版本，不触发重解析。 */
export async function materialVersions(projectId: string, assetId: string | number, signal?: AbortSignal) {
  const result = await request<Response<Analysis[]>>({ url: `${base(projectId)}/${assetId}/analyses`, signal });
  if (result.data.code !== 200 || !Array.isArray(result.data.data)) throw new Error(result.data.msg || I18N.feishuCollection.materialLoadFailed);
  return result.data.data;
}

/** 使用真实来源记录补充文件列表，翻页避免第 20 份之后的飞书资料漏标。 */
export async function fetchFeishuMaterialSources(projectId: string, signal: AbortSignal) {
  const sources: Record<string, string> = {};
  let offset = 0;
  while (!signal.aborted) {
    // 下一页游标由本页响应提供，需按顺序读取。
    // eslint-disable-next-line no-await-in-loop
    const page = await searchMaterials(projectId, { source: 'feishu', offset }, signal);
    for (const item of page.items) {
      if (item.sources.length) sources[String(item.file.assetId)] = [...new Set(item.sources
        .map(origin => origin.groupName).filter(Boolean))].join(' / ') || I18N.feishuCollection.syncedFromFeishu;
    }
    if (page.nextOffset == null || page.nextOffset <= offset) break;
    offset = page.nextOffset;
  }
  return sources;
}

/** 自动固定当前可用解析版本；接口失败或准入不通过时不降级为原件。 */
export async function resolveProjectMaterialSelection(projectId: string, file: AgentProjectFile, signal: AbortSignal) {
  const versions = await materialVersions(projectId, file.assetId, signal);
  let selected: AgentMaterialReference | undefined;
  for (const version of versions) {
    const reference = normalizeMaterialReference({ ...version, assetId: file.assetId });
    if (reference && version.publishable !== false && version.selectable !== false
      && (file.version == null || version.fileVersion === file.version)
      && (!file.fileHash || version.fileHash === file.fileHash)
      && (!selected || reference.revision > selected.revision)) selected = reference;
  }
  if (!selected && versions.some(version => version.selectable === false)) throw new Error('MATERIAL_NOT_ADMITTED');
  return { ...file, analysisJobId: selected?.jobId, materialAnalysis: selected };
}
/** 读取固定版本的内容页，翻页时保持 jobId 不变，避免混合版本。 */
export async function readAnalysis(projectId: string, assetId: string | number, jobId: string, offset: number, signal?: AbortSignal) {
  const result = await request<Response<AnalysisPage>>({
    url: `${base(projectId)}/${assetId}/analyses/${encodeURIComponent(jobId)}`, params: { offset, limit: 10 }, signal,
  });
  if (result.data.code !== 200 || !result.data.data) throw new Error(result.data.msg || I18N.feishuCollection.materialLoadFailed);
  return result.data.data;
}
/** 用户明确确认后发起重新分析；调用方在响应未知时保留 requestKey。 */
export async function reanalyzeMaterial(projectId: string, assetId: string | number, bindingId: string, requestKey: string) {
  const result = await request<Response<Analysis>>({ method: 'POST', url: `${base(projectId)}/${assetId}/analyses`,
    data: { bindingId, requestKey, confirmed: true } });
  if (result.data.code !== 200 || !result.data.data) throw new Error(result.data.msg || I18N.feishuCollection.operationFailed);
  return result.data.data;
}
/** 恢复原有可重试的解析任务，服务端核验原运行已终止。 */
export async function retryMaterialAnalysis(projectId: string, jobId: string) {
  const result = await request<Response<Analysis>>({ method: 'POST', url: `${base(projectId)}/analyses/${encodeURIComponent(jobId)}/retry` });
  if (result.data.code !== 200 || !result.data.data) throw new Error(result.data.msg || I18N.feishuCollection.operationFailed);
  return result.data.data;
}
