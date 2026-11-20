import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import { EnergyForbidden } from '@/views/energyCarbon/hooks/useEnergyNavigation';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
/**
 * 业务检索：能耗数据概览 - 按组织和自然周期展示十项指标及同比环比
 * 路由：/energyCarbon/energyAnalysis/overview
 */
import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';

import SinglePeriodAnalysisPage from '../components/SinglePeriodAnalysisPage';
import { ENERGY_ANALYSIS_PAGE_PERMISSION } from '../constant';

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(ENERGY_ANALYSIS_PAGE_PERMISSION.OVERVIEW)) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <EnergyOverviewPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

/** 固定概览页面权限，结果区展示十项指标。 */
function EnergyOverviewPage() {
  useLocale();
  return (
    <SinglePeriodAnalysisPage
      kind='overview'
      title={I18N.energyCarbon.analysisEnergyOverview}
      permissionKey={ENERGY_ANALYSIS_PAGE_PERMISSION.OVERVIEW}
    />
  );
}
