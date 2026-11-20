import { request } from '@/api/request';
import I18N from '@/lang/I18N';

/**
 * 项目创建者的收数入口能力；显示条件完全由服务端判定。
 * @property enabled 是否满足企业白名单及项目创建者要求
 * @property configured 自建应用和固定人员配置是否齐备
 * @property billingCompanyId 项目指定的付费企业 ID
 * @property billingCompanyName 付费企业展示名
 * @property ownerMatchStatus 服务端按项目负责人绑定手机号匹配员工的结果
 */
export type FeishuCapability = {
  enabled: boolean;
  available?: boolean;
  configured: boolean;
  billingCompanyId?: number;
  billingCompanyName?: string;
  responsiblePeople: { openId: string; name: string }[];
  projectOwnerName?: string;
  ownerMatchStatus?: string;
};

/**
 * 项目与飞书群的绑定概要；暂停或解绑不等于解散群。
 * @property bindingId 服务端绑定 ID
 * @property name 群展示名称
 * @property description 群描述或收数范围
 * @property responsibleName 项目负责人姓名；存量群保留原业务负责人
 * @property status 创建、核对、收数或解绑阶段的当前状态
 * @property version 更新时提交的乐观锁版本
 * @property chatId 建群成功后取得的飞书群 ID，供打开群使用
 * @property createTime 绑定创建时间
 */
export type FeishuGroup = {
  bindingId: string;
  name: string;
  description?: string;
  responsibleName: string;
  ownerOpenId?: string;
  initialOwnerOpenId?: string;
  responsibleOpenId?: string;
  ownerMatchStatus?: string;
  ownerTransferStatus?: string;
  status: 'PENDING' | 'CREATING' | 'CREATE_UNKNOWN' | 'VERIFY_PENDING' | 'ACTIVE' | 'PAUSED' | 'UNBOUND';
  version: number;
  chatId?: string;
  createTime: string;
};

/**
 * 一次固定建群意图；超时重试保持请求键和全部参数不变。
 * @property requestId 客户端稳定请求键
 * @property name 群名称
 * @property description 可选收数范围
 * @property billingCompanyId 已明确展示并确认的费用归属企业
 */
export type CreateGroup = {
  requestId: string;
  name: string;
  description?: string;
  billingCompanyId: number;
};

type Response<T> = { code: number; msg?: string; data: T };

/**
 * 单条群消息收件；归档、分析、资料判定、回复是独立状态。
 * @property receiptId 收件 ID
 * @property messageId 飞书原消息 ID
 * @property fileName 附件名，文字消息可为空
 * @property messageType 原始消息类型
 * @property content 原消息内容
 * @property assetId 归档资产 ID，保留字符串以兼容大整数
 * @property status 原件归档状态
 * @property errorCode 处理异常标识
 * @property sentAt 飞书发送时间
 * @property dispatchStatus 后台分析运行状态
 * @property materialStatus 后续可用性判断
 * @property materialReason 判断依据
 * @property replyStatus 群回复投递状态
 * @property replyText 已登记回复正文
 * @property batchReceiptId 固定收集窗口的批次标识，晚归档不改变归属
 * @property receivedAt 服务端首次接收时间，区别于飞书发送时间
 * @property batchClosesAt 固定收集窗口截止时间
 * @property analysisStatus 独立解析任务状态，不由会话结束推断
 * @property cancelRequested 已受理停止请求，只有 dispatchStatus=CANCELLED 才确认执行已停止
 */
export type FeishuReceipt = {
  receiptId: string; messageId: string; fileName?: string; messageType: string;
  content: string; assetId?: number | string; status: string; errorCode?: string; sentAt: string;
  dispatchStatus?: string; materialStatus?: string; materialReason?: string; replyStatus?: string; replyText?: string;
  batchReceiptId?: string; receivedAt?: string; batchClosesAt?: string; analysisStatus?: string;
  cancelRequested?: boolean;
  analysisJobId?: string; admissionStatus?: string; admittedAnalysisJobId?: string; profileStatus?: string;
  /** 服务端判断是否可人工确认；提交时仍重新检查固定解析版本。 */
  canAdmit?: boolean;
};

/**
 * 一条对外补充请求；DRAFT 尚未发送，SEND_UNKNOWN 不能按失败重新发起。
 * @property requestId 服务端请求 ID
 * @property bindingId 目标群绑定
 * @property sourceSessionId 发起请求的项目会话
 * @property text 已保存正文
 * @property status 草稿、待发送、已发送或结果未知
 * @property messageId 发送成功后飞书返回的消息 ID
 * @property createTime 请求登记时间
 */
export type FeishuSupplement = {
  requestId: string; bindingId: string; sourceSessionId: string; text: string;
  status: 'DRAFT' | 'PENDING' | 'SENT' | 'SEND_UNKNOWN'; messageId?: string; createTime: string;
};

/**
 * 用户预览确认后的发送参数，资料引用只用于项目内部追溯。
 * @property clientRequestId 稳定发送键，未知结果重试时复用
 * @property bindingId 用户选定的目标群
 * @property sourceSessionId 当前项目会话
 * @property assetIds 关联资料 ID 列表，不作为附件外发
 * @property text 用户确认的最终文字
 * @property confirmed 明确确认标记，固定为 true
 */
export type SupplementRequest = {
  clientRequestId: string; bindingId: string; sourceSessionId: string;
  assetIds: (number | string)[]; text: string; confirmed: true;
};

/** 查询入口开通及配置状态；切换项目时可取消过期请求。 */
export const fetchFeishuCapability = async (projectId: string, signal: AbortSignal) => {
  const response = await request<Response<FeishuCapability>>({
    url: `/ai/agent/projects/${encodeURIComponent(projectId)}/feishu/capability`, signal,
  });
  if (response.data.code !== 200 || !response.data.data) {
    throw new Error(response.data.msg || I18N.feishuCollection.loadFailed);
  }
  return response.data.data;
};

/** 查询项目群绑定，以实际状态决定可发送或可恢复的操作。 */
export const fetchFeishuGroups = async (projectId: string, signal?: AbortSignal) => {
  const response = await request<Response<FeishuGroup[]>>({
    url: `/ai/agent/projects/${encodeURIComponent(projectId)}/feishu/groups`, signal,
  });
  if (response.data.code !== 200 || !Array.isArray(response.data.data)) {
    throw new Error(response.data.msg || I18N.feishuCollection.loadFailed);
  }
  return response.data.data;
};

/** 提交已固定的建群意图，未知结果不生成新请求键。 */
export const createFeishuGroup = async (projectId: string, data: CreateGroup) => {
  const response = await request<Response<FeishuGroup>>({
    method: 'POST', url: `/ai/agent/projects/${encodeURIComponent(projectId)}/feishu/groups`, data,
  });
  if (response.data.code !== 200 || !response.data.data?.bindingId) {
    throw new Error(response.data.msg || I18N.feishuCollection.operationFailed);
  }
  return response.data.data;
};

/** 携带当前版本暂停、恢复、解绑或核对原群，避免旧页面覆盖状态。 */
export const changeFeishuGroup = async (
  projectId: string, group: FeishuGroup, action: 'pause' | 'resume' | 'unbind' | 'recover',
) => {
  const response = await request<Response<FeishuGroup>>({
    method: 'POST',
    url: `/ai/agent/projects/${encodeURIComponent(projectId)}/feishu/groups/${encodeURIComponent(group.bindingId)}/${action}`,
    data: { version: group.version },
  });
  if (response.data.code !== 200 || !response.data.data?.bindingId) {
    throw new Error(response.data.msg || I18N.feishuCollection.operationFailed);
  }
  return response.data.data;
};

/** 查询群收件记录，分别展示归档、分析及回复结果。 */
export const fetchFeishuReceipts = async (projectId: string, bindingId: string, signal?: AbortSignal,
  filters?: { offset: number; limit: number; filter: string }) => {
  const response = await request<Response<FeishuReceipt[]>>({
    url: `/ai/agent/projects/${encodeURIComponent(projectId)}/feishu/groups/${encodeURIComponent(bindingId)}/receipts`, signal, params: filters,
  });
  if (response.data.code !== 200 || !Array.isArray(response.data.data)) throw new Error(response.data.msg || I18N.feishuCollection.loadFailed);
  return response.data.data;
};

/** 重试原附件归档，不直接重新发起 Agent 分析。 */
export const retryFeishuReceipt = async (projectId: string, bindingId: string, receiptId: string) => {
  const response = await request<Response<FeishuReceipt>>({ method: 'POST',
    url: `/ai/agent/projects/${encodeURIComponent(projectId)}/feishu/groups/${encodeURIComponent(bindingId)}/receipts/${encodeURIComponent(receiptId)}/retry`,
  });
  if (response.data.code !== 200 || !response.data.data?.receiptId) throw new Error(response.data.msg || I18N.feishuCollection.operationFailed);
  return response.data.data;
};

/** 发送预览确认后的文字；响应仍须检查 SENT 或 SEND_UNKNOWN。 */
export const sendFeishuSupplement = async (projectId: string, data: SupplementRequest) => {
  const response = await request<Response<FeishuSupplement>>({ method: 'POST',
    url: `/ai/agent/projects/${encodeURIComponent(projectId)}/feishu/supplements`, data,
  });
  if (response.data.code !== 200 || !response.data.data?.requestId) throw new Error(response.data.msg || I18N.feishuCollection.operationFailed);
  return response.data.data;
};

/** 查询当前会话的补充草稿和发送记录。 */
export const fetchFeishuSupplements = async (projectId: string, sessionId: string, signal?: AbortSignal) => {
  const response = await request<Response<FeishuSupplement[]>>({
    url: `/ai/agent/projects/${encodeURIComponent(projectId)}/feishu/supplements`, params: { sessionId }, signal,
  });
  if (response.data.code !== 200 || !Array.isArray(response.data.data)) throw new Error(response.data.msg || I18N.feishuCollection.loadFailed);
  return response.data.data;
};

/** 读取明确引用该请求的群回复，不自动关联普通聊天。 */
export const fetchFeishuReplies = async (projectId: string, requestId: string, signal?: AbortSignal) => {
  const response = await request<Response<FeishuReceipt[]>>({
    url: `/ai/agent/projects/${encodeURIComponent(projectId)}/feishu/supplements/${encodeURIComponent(requestId)}/replies`, signal,
  });
  if (response.data.code !== 200 || !Array.isArray(response.data.data)) throw new Error(response.data.msg || I18N.feishuCollection.loadFailed);
  return response.data.data;
};

/** 按已保存请求恢复发送，服务端沿用原目标、正文和去重标识。 */
export const recoverFeishuSupplement = async (projectId: string, requestId: string) => {
  const response = await request<Response<FeishuSupplement>>({ method: 'POST',
    url: `/ai/agent/projects/${encodeURIComponent(projectId)}/feishu/supplements/${encodeURIComponent(requestId)}/recover`,
  });
  if (response.data.code !== 200 || !response.data.data?.requestId) throw new Error(response.data.msg || I18N.feishuCollection.operationFailed);
  return response.data.data;
};

/** 确认草稿的最终文字后发送，不能修改已确认的请求。 */
export const confirmFeishuDraft = async (projectId: string, requestId: string, text: string) => {
  const response = await request<Response<FeishuSupplement>>({ method: 'POST',
    url: `/ai/agent/projects/${encodeURIComponent(projectId)}/feishu/supplements/${encodeURIComponent(requestId)}/confirm`,
    data: { text, confirmed: true },
  });
  if (response.data.code !== 200 || !response.data.data?.requestId) throw new Error(response.data.msg || I18N.feishuCollection.operationFailed);
  return response.data.data;
};

/** 携带当前群版本更新名称和描述，不操作群成员。 */
export const updateFeishuGroup = async (projectId: string, group: FeishuGroup, values: { name: string; description?: string }) => {
  const response = await request<Response<FeishuGroup>>({ method: 'POST',
    url: `/ai/agent/projects/${encodeURIComponent(projectId)}/feishu/groups/${encodeURIComponent(group.bindingId)}/update`,
    data: { ...values, version: group.version },
  });
  if (response.data.code !== 200 || !response.data.data?.bindingId) throw new Error(response.data.msg || I18N.feishuCollection.operationFailed);
  return response.data.data;
};

/** 原说明的有权历史候选，最多八项；候选标识绑定服务端保存的文件版本。 */
export type FeishuClarification = {
  queryRef: string;
  queryText: string;
  /** 口径恢复沿用已经确认的目标和说明，不由页面重选或猜测。 */
  status?: string;
  candidateRef?: string;
  relation?: 'supplement' | 'filter' | 'replacement';
  reason?: string;
  candidates: { candidateRef: string; summary: string }[];
  truncated: boolean;
  eventIds: string[];
  sources: { receiptId: string; messageType: string; content?: string; fileName?: string; receivedAt: string }[];
};

/** 查询本群待关联说明，不能把项目其他群的候选混入此列表。 */
export const fetchFeishuClarifications = async (projectId: string, bindingId: string, signal?: AbortSignal) => {
  const response = await request<Response<FeishuClarification[]>>({
    url: `/ai/agent/projects/${encodeURIComponent(projectId)}/feishu/groups/${encodeURIComponent(bindingId)}/clarifications`, signal,
  });
  if (response.data.code !== 200 || !Array.isArray(response.data.data)) throw new Error(response.data.msg || I18N.feishuCollection.loadFailed);
  return response.data.data;
};

/** 明确选择后保存，目标版本变化时展示拒绝原因；声明新资料不建立历史关联。 */
export const confirmFeishuClarification = async (projectId: string, bindingId: string, queryRef: string, data: {
  candidateRef?: string; newMaterial: boolean; relation: 'supplement' | 'filter' | 'replacement'; reason: string;
}) => {
  const response = await request<Response<{ status: string; reason: string }>>({ method: 'POST',
    url: `/ai/agent/projects/${encodeURIComponent(projectId)}/feishu/groups/${encodeURIComponent(bindingId)}/clarifications/${encodeURIComponent(queryRef)}/confirm`, data,
  });
  if (response.data.code !== 200 || !response.data.data) throw new Error(response.data.msg || I18N.feishuCollection.operationFailed);
  return response.data.data;
};

/** 失效后显式重新查找，不修改旧候选；同一请求重试返回原新查询，不自动选中目标。 */
export const refreshFeishuClarification = async (projectId: string, bindingId: string, queryRef: string) => {
  const response = await request<Response<{ queryRef: string }>>({ method: 'POST',
    url: `/ai/agent/projects/${encodeURIComponent(projectId)}/feishu/groups/${encodeURIComponent(bindingId)}/clarifications/${encodeURIComponent(queryRef)}/refresh`,
  });
  if (response.data.code !== 200 || !response.data.data?.queryRef) throw new Error(response.data.msg || I18N.feishuCollection.operationFailed);
  return response.data.data;
};

/** 超出自动去重窗口的群回复；候选只用于创建者核对，不代表服务端已确认发送。 */
export type FeishuNotificationReview = {
  notificationId: string;
  text: string;
  startedAt: string;
  candidates: { messageId: string; sentAt: string }[];
  truncated: boolean;
};

/** 最近二十条待核对通知，独立于文件归档和解析状态。 */
export const fetchFeishuNotificationReviews = async (projectId: string, bindingId: string, signal?: AbortSignal) => {
  const response = await request<Response<FeishuNotificationReview[]>>({
    url: `/ai/agent/projects/${encodeURIComponent(projectId)}/feishu/groups/${encodeURIComponent(bindingId)}/notifications/review`, signal,
  });
  if (response.data.code !== 200 || !Array.isArray(response.data.data)) throw new Error(response.data.msg || I18N.feishuCollection.operationFailed);
  return response.data.data;
};

/** 只读核对原群消息；无结果不触发发送或修改未知状态。 */
export const fetchFeishuNotificationCandidates = async (projectId: string, bindingId: string, id: string) => {
  const response = await request<Response<FeishuNotificationReview>>({
    url: `/ai/agent/projects/${encodeURIComponent(projectId)}/feishu/groups/${encodeURIComponent(bindingId)}/notifications/${encodeURIComponent(id)}/candidates`,
  });
  if (response.data.code !== 200 || !response.data.data || !Array.isArray(response.data.data.candidates)) throw new Error(response.data.msg || I18N.feishuCollection.operationFailed);
  return response.data.data;
};

/** 明确选择群内消息后补记原发送回执，不重新发送。 */
export const confirmFeishuNotification = async (projectId: string, bindingId: string, id: string, messageId: string) => {
  const response = await request<Response<boolean>>({ method: 'POST',
    url: `/ai/agent/projects/${encodeURIComponent(projectId)}/feishu/groups/${encodeURIComponent(bindingId)}/notifications/${encodeURIComponent(id)}/confirm`,
    data: { messageId },
  });
  if (response.data.code !== 200 || response.data.data !== true) throw new Error(response.data.msg || I18N.feishuCollection.operationFailed);
};

/** 人工接受固定的完整解析结果，仅入项目资料库，保留 Agent 原判断。 */
export const admitFeishuReceipt = async (projectId: string, bindingId: string, receiptId: string, analysisJobId: string, reason: string) => {
  const response = await request<Response<boolean>>({ method: 'POST',
    url: `/ai/agent/projects/${encodeURIComponent(projectId)}/feishu/groups/${encodeURIComponent(bindingId)}/receipts/${encodeURIComponent(receiptId)}/admit`,
    data: { analysisJobId, confirmed: true, reason: reason.trim() || undefined },
  });
  if (response.data.code !== 200 || response.data.data !== true) throw new Error(response.data.msg || I18N.feishuCollection.operationFailed);
};
