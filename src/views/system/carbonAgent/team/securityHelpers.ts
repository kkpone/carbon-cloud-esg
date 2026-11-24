import type {
  DesensitizationWordInput,
  SecurityModelRegion,
  Workspace,
  WorkspaceSecurityPolicy,
} from './types';

export const ZERO_RETENTION_AGREEMENT_PATH = '/agreement/zero-retention';
export const DESENSITIZATION_WORD_MIN_LENGTH = 2;
export const DESENSITIZATION_WORD_MAX_LENGTH = 100;
export const DESENSITIZATION_REPLACEMENT_MAX_LENGTH = 50;
export const DESENSITIZATION_BATCH_MAX_COUNT = 200;
export const DESENSITIZATION_TOTAL_MAX_COUNT = 1000;

export const getZeroRetentionAgreementPath = (
  region?: SecurityModelRegion,
): string =>
  region
    ? `${ZERO_RETENTION_AGREEMENT_PATH}?region=${region.toLowerCase()}`
    : ZERO_RETENTION_AGREEMENT_PATH;

export const getWorkspaceSecurityPolicy = (
  access?: Workspace,
): WorkspaceSecurityPolicy | undefined => {
  if (!access || access.workspaceType !== 'TEAM') return undefined;
  return access.security;
};

export const isSecurityModeActive = (access?: Workspace): boolean =>
  Boolean(getWorkspaceSecurityPolicy(access)?.enabled);

export const canShareWorkspaceConversation = (
  personalWorkspace: boolean,
  access?: Workspace,
): boolean => {
  if (personalWorkspace) return true;
  const policy = getWorkspaceSecurityPolicy(access);
  return Boolean(policy?.enabled && policy.allowSessionShare);
};

export const parseBatchDesensitizationWords = (
  raw: string,
  existingWords: string[] = [],
): {
  items: DesensitizationWordInput[];
  skippedEmpty: number;
  duplicateWords: string[];
  invalidWords: string[];
} => {
  const seen = new Set(existingWords.map(item => item.trim().toLowerCase()));
  const items: DesensitizationWordInput[] = [];
  const duplicateWords: string[] = [];
  const invalidWords: string[] = [];
  let skippedEmpty = 0;

  raw.split(/\r?\n/).forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      skippedEmpty += 1;
      return;
    }
    const parts = trimmedLine.split(/\t|,|，/);
    const word = (parts[0] || '').trim();
    const replacement = (parts[1] || '').trim();
    const category = (parts[2] || '').trim();

    if (
      word.length < DESENSITIZATION_WORD_MIN_LENGTH ||
      word.length > DESENSITIZATION_WORD_MAX_LENGTH ||
      replacement.length > DESENSITIZATION_REPLACEMENT_MAX_LENGTH
    ) {
      invalidWords.push(word || trimmedLine);
      return;
    }

    const normalizedKey = word.toLowerCase();
    if (seen.has(normalizedKey)) {
      duplicateWords.push(word);
      return;
    }

    seen.add(normalizedKey);
    items.push({
      word,
      ...(replacement ? { replacement } : {}),
      ...(category ? { category } : {}),
      enabled: true,
    });
  });

  return { items, skippedEmpty, duplicateWords, invalidWords };
};
