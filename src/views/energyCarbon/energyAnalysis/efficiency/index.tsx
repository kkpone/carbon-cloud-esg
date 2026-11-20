import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import { EnergyForbidden } from '@/views/energyCarbon/hooks/useEnergyNavigation';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
/**
 * 业务检索：能源效率分析 - 按组织或具体边界展示连续周期效率趋势
 * 路由：/energyCarbon/energyAnalysis/efficiency
 */
import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';

import EfficiencyAnalysisPage from '../components/EfficiencyAnalysisPage';
import { ENERGY_ANALYSIS_PAGE_PERMISSION } from '../constant';

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(ENERGY_ANALYSIS_PAGE_PERMISSION.EFFICIENCY)) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <EnergyEfficiencyAnalysisPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

/** 固定效率页面与查询按钮权限，分类节点只展开不查询。 */
function EnergyEfficiencyAnalysisPage() {
  useLocale();
  return (
    <EfficiencyAnalysisPage
      title={I18N.energyCarbon.analysisEfficiencyAnalysis}
      permissionKey={ENERGY_ANALYSIS_PAGE_PERMISSION.EFFICIENCY}
    />
  );
}
