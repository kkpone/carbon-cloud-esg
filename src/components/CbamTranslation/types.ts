/** 后端白名单中的一个可翻译文本字段。 */
export interface TranslationField {
  fieldId: string;
  label: string;
  text?: string;
  textEn?: string;
  editable: boolean;
}

/** 内容状态与操作状态独立。 */
export interface TranslationGroup {
  groupId: string;
  groupName: string;
  status: 'UNTRANSLATED' | 'PARTIAL' | 'TRANSLATED';
  operationStatus: 'NOT_STARTED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  error?: string;
  fields: TranslationField[];
}

/** 全局异步回执只包含英文结果和聚合版本。 */
export interface TranslationTask {
  dataVersion?: number;
  running: boolean;
  updatedAt: number;
  groups: TranslationGroup[];
}
