import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import { EnergyForbidden } from '@/views/energyCarbon/hooks/useEnergyNavigation';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
/**
 * 业务检索：能耗结构分析 - 展示能源利用率、正折标煤结构和全量明细
 * 路由：/energyCarbon/energyAnalysis/structure
 */
import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';

import SinglePeriodAnalysisPage from '../components/SinglePeriodAnalysisPage';
import { ENERGY_ANALYSIS_PAGE_PERMISSION } from '../constant';

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(ENERGY_ANALYSIS_PAGE_PERMISSION.STRUCTURE)) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <EnergyStructureAnalysisPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

/** 固定结构分析页面与查询按钮权限，饼图仅展示正折标煤。 */
function EnergyStructureAnalysisPage() {
  useLocale();
  return (
    <SinglePeriodAnalysisPage
      kind='structure'
      title={I18N.energyCarbon.analysisStructureAnalysis}
      permissionKey={ENERGY_ANALYSIS_PAGE_PERMISSION.STRUCTURE}
    />
  );
}
