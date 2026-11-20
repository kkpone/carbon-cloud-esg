import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import { EnergyForbidden } from '@/views/energyCarbon/hooks/useEnergyNavigation';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
/**
 * 业务检索：能源消费量计算 - 按组织或边界统计综合能耗及能源占比
 * 路由：/energyCarbon/energyCalc/consumption
 */
import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';

import StatisticsPage from '../../energyStatistics/-StatisticsPage';
import { ENERGY_CONSUMPTION_PAGE_PERMISSION } from '../../energyStatistics/constant';

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(ENERGY_CONSUMPTION_PAGE_PERMISSION)) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <EnergyConsumptionPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

/** 复用统一统计工作区，并固定能源消费量计算页面权限。 */
function EnergyConsumptionPage() {
  useLocale();
  return (
    <StatisticsPage
      kind='consumption'
      title={I18N.energyCarbon.analysisConsumptionCalculation}
      permissionKey={ENERGY_CONSUMPTION_PAGE_PERMISSION}
    />
  );
}
