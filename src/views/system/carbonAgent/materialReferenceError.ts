/** 固定解析引用在执行前被拒绝；不能当作断流去恢复上一轮，也不能自动改用原件。 */
export class MaterialReferenceError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'MaterialReferenceError';
  }
}

const MATERIAL_REFERENCE_ERRORS = new Set([
  'MATERIAL_REFERENCE_INVALID',
  'MATERIAL_VERSION_CHANGED',
  'MATERIAL_ANALYSIS_NOT_REUSABLE',
  'MATERIAL_NOT_ADMITTED',
  'MATERIAL_REFERENCE_REQUIRES_PROJECT_SESSION',
]);

/** 仅识别服务端明确返回的业务码，不通过正文包含某个词来推断失败。 */
export function materialReferenceError(payload: unknown): MaterialReferenceError | undefined {
  let value = payload;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return undefined; }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const code = [record.code, record.msg, record.message].find(
    item => typeof item === 'string' && MATERIAL_REFERENCE_ERRORS.has(item),
  );
  return typeof code === 'string' ? new MaterialReferenceError(code) : undefined;
}
