import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import { EnergyForbidden } from '@/views/energyCarbon/hooks/useEnergyNavigation';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
/**
 * 业务检索：能耗强度计算 - 按组织和生产指标统计综合能耗强度
 * 路由：/energyCarbon/energyCalc/intensity
 */
import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';

import StatisticsPage from '../../energyStatistics/-StatisticsPage';
import { ENERGY_INTENSITY_PAGE_PERMISSION } from '../../energyStatistics/constant';

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(ENERGY_INTENSITY_PAGE_PERMISSION)) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <EnergyIntensityPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

/** 复用统一统计工作区，并固定能耗强度计算页面权限。 */
function EnergyIntensityPage() {
  useLocale();
  return (
    <StatisticsPage
      kind='intensity'
      title={I18N.energyCarbon.analysisIntensityCalculation}
      permissionKey={ENERGY_INTENSITY_PAGE_PERMISSION}
    />
  );
}
