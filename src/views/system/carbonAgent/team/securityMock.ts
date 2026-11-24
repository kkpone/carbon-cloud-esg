import { SET_COMPANY_USER_INFO } from '@src/store/actionTypes';
import { getLoginStorage } from '@src/utils/feishuSession';

import type {
  DesensitizationWord,
  DesensitizationWordInput,
  Page,
  SecurityConfig,
  SecurityConfigUpdate,
  Workspace,
  WorkspaceSecurityPolicy,
} from './types';

const SECURITY_MOCK_STORAGE_PREFIX = 'carbon-agent-team-security-mock:';

type MockSecurityStore = {
  config: SecurityConfig;
  words: DesensitizationWord[];
};

const DEFAULT_MOCK_STORE: MockSecurityStore = {
  config: {
    enabled: false,
    modelRegion: 'DOMESTIC',
    allowSessionShare: false,
    version: 1,
  },
  words: [],
};

const readCurrentCompanyId = (): string => {
  if (typeof window === 'undefined') return 'default';
  try {
    const raw = getLoginStorage().getItem(SET_COMPANY_USER_INFO);
    if (!raw) return 'default';
    const parsed = JSON.parse(raw) as {
      companyId?: string | number;
      userInfo?: { companyId?: string | number };
    };
    return String(parsed.userInfo?.companyId || parsed.companyId || 'default');
  } catch {
    return 'default';
  }
};

const readStore = (companyId = readCurrentCompanyId()): MockSecurityStore => {
  if (typeof window === 'undefined') return DEFAULT_MOCK_STORE;
  try {
    const raw = window.localStorage.getItem(
      `${SECURITY_MOCK_STORAGE_PREFIX}${companyId}`,
    );
    if (!raw) return DEFAULT_MOCK_STORE;
    const parsed = JSON.parse(raw) as Partial<MockSecurityStore>;
    return {
      config: {
        ...DEFAULT_MOCK_STORE.config,
        ...(parsed.config || {}),
      },
      words: Array.isArray(parsed.words) ? parsed.words : [],
    };
  } catch {
    return DEFAULT_MOCK_STORE;
  }
};

const writeStore = (
  store: MockSecurityStore,
  companyId = readCurrentCompanyId(),
) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${SECURITY_MOCK_STORAGE_PREFIX}${companyId}`,
      JSON.stringify(store),
    );
  } catch {
    // ignore storage quota errors
  }
};

const nowBeijingText = () =>
  new Date(Date.now() + 8 * 3600 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');

export const isSecurityApiUnavailable = (error: unknown): boolean => {
  const err = error as {
    response?: { status?: number; data?: { code?: number } };
    status?: number;
  };
  const status = err?.response?.status ?? err?.status;
  const code = err?.response?.data?.code;
  return status === 404 || status === 405 || status === 501 || code === 404;
};

export const getMockSecurityConfig = (): SecurityConfig => readStore().config;

export const saveMockSecurityConfig = (
  data: SecurityConfigUpdate,
): SecurityConfig => {
  const current = readStore();
  const nextConfig: SecurityConfig = {
    enabled: data.enabled,
    modelRegion: data.modelRegion,
    allowSessionShare: data.allowSessionShare,
    version: (current.config.version || 0) + 1,
    updateTime: nowBeijingText(),
  };
  writeStore({ ...current, config: nextConfig });
  return nextConfig;
};

export const getMockDesensitizationWords = (params: {
  keyword?: string;
  enabled?: boolean;
  pageNum?: number;
  pageSize?: number;
}): Page<DesensitizationWord> => {
  const { words } = readStore();
  const keyword = (params.keyword || '').trim().toLowerCase();
  const filtered = words.filter(item => {
    if (
      typeof params.enabled === 'boolean' &&
      item.enabled !== params.enabled
    ) {
      return false;
    }
    if (!keyword) return true;
    return (
      item.word.toLowerCase().includes(keyword) ||
      (item.replacement || '').toLowerCase().includes(keyword) ||
      (item.category || '').toLowerCase().includes(keyword)
    );
  });
  const pageNum = Math.max(1, params.pageNum || 1);
  const pageSize = Math.max(1, params.pageSize || 10);
  const start = (pageNum - 1) * pageSize;
  return {
    pageNum,
    pageSize,
    total: filtered.length,
    rows: filtered.slice(start, start + pageSize),
  };
};

export const createMockDesensitizationWords = (
  items: DesensitizationWordInput[],
): DesensitizationWord[] => {
  const current = readStore();
  const existingSet = new Set(
    current.words.map(item => item.word.trim().toLowerCase()),
  );
  const created: DesensitizationWord[] = [];
  const timestamp = nowBeijingText();
  items.forEach((item, index) => {
    const word = item.word.trim();
    if (!word) return;
    const normalized = word.toLowerCase();
    if (existingSet.has(normalized)) {
      throw new Error('AGENT_SECURITY_WORD_DUPLICATE');
    }
    existingSet.add(normalized);
    created.push({
      id: `mock-${Date.now()}-${index}`,
      word,
      replacement: item.replacement?.trim() || undefined,
      category: item.category?.trim() || undefined,
      enabled: item.enabled ?? true,
      updateTime: timestamp,
    });
  });
  writeStore({
    ...current,
    words: [...created, ...current.words],
  });
  return created;
};

export const updateMockDesensitizationWord = (
  id: string,
  data: DesensitizationWordInput,
): DesensitizationWord => {
  const current = readStore();
  const word = data.word.trim();
  const normalized = word.toLowerCase();
  if (
    current.words.some(
      item => item.id !== id && item.word.trim().toLowerCase() === normalized,
    )
  ) {
    throw new Error('AGENT_SECURITY_WORD_DUPLICATE');
  }
  let updated: DesensitizationWord | undefined;
  const nextWords = current.words.map(item => {
    if (item.id !== id) return item;
    updated = {
      ...item,
      word,
      replacement: data.replacement?.trim() || undefined,
      category: data.category?.trim() || undefined,
      enabled: data.enabled ?? item.enabled,
      updateTime: nowBeijingText(),
    };
    return updated;
  });
  if (!updated) {
    throw new Error('AGENT_CONTEXT_CONFLICT');
  }
  writeStore({ ...current, words: nextWords });
  return updated;
};

export const deleteMockDesensitizationWord = (id: string) => {
  const current = readStore();
  writeStore({
    ...current,
    words: current.words.filter(item => item.id !== id),
  });
};

export const hydrateWorkspaceSecurity = (workspace: Workspace): Workspace => {
  if (workspace.workspaceType !== 'TEAM' || workspace.security) {
    return workspace;
  }
  const store = readStore(
    String(workspace.companyId || readCurrentCompanyId()),
  );
  const activeWordCount = store.words.filter(item => item.enabled).length;
  const policy: WorkspaceSecurityPolicy = {
    enabled: store.config.enabled,
    modelRegion: store.config.modelRegion,
    desensitizationEnabled: store.config.enabled && activeWordCount > 0,
    desensitizationWordCount: activeWordCount,
    allowSessionShare: store.config.allowSessionShare,
  };
  return {
    ...workspace,
    security: policy,
  };
};
