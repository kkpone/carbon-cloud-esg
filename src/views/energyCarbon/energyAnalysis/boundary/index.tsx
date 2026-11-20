import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import { EnergyForbidden } from '@/views/energyCarbon/hooks/useEnergyNavigation';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
/**
 * 业务检索：边界能耗分析 - 按统一边界分类展示 TOP10 和全量边界结果
 * 路由：/energyCarbon/energyAnalysis/boundary
 */
import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';

import SinglePeriodAnalysisPage from '../components/SinglePeriodAnalysisPage';
import { ENERGY_ANALYSIS_PAGE_PERMISSION } from '../constant';

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(ENERGY_ANALYSIS_PAGE_PERMISSION.BOUNDARY)) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <BoundaryEnergyAnalysisPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

/** 固定边界分析页面与查询按钮权限，保留同名不同主键边界。 */
function BoundaryEnergyAnalysisPage() {
  useLocale();
  return (
    <SinglePeriodAnalysisPage
      kind='boundary'
      title={I18N.energyCarbon.analysisBoundaryEnergyAnalysis}
      permissionKey={ENERGY_ANALYSIS_PAGE_PERMISSION.BOUNDARY}
    />
  );
}
