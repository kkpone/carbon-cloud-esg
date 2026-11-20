import I18N from '@/lang/I18N';
import type { AgentMaterialReference } from '../../materialReference';
import style from './index.module.less';

/** 输入框及历史附件共用版本标记，直接展示当次选择，不查询最新结果。 */
export default function MaterialReferenceLabel({ reference }: { reference?: AgentMaterialReference }) {
  if (!reference) return null;
  const version = I18N.template(I18N.feishuCollection.selectedAnalysisVersion, { val1: reference.revision });
  const status = reference.status === 'PARTIAL' ? I18N.feishuCollection.analysisPartial : I18N.feishuCollection.analysisReady;
  const original = I18N.template(I18N.feishuCollection.originalFileVersion, { val1: reference.fileVersion });
  return <span className={style.label} title={[version, original, status].join(' · ')}>
    <span>{version}</span>
    {reference.status === 'PARTIAL' && <span className={style.partial}>{status}</span>}
  </span>;
}
