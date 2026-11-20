import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import { EnergyForbidden } from '@/views/energyCarbon/hooks/useEnergyNavigation';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
/**
 * 业务检索：能耗查询 - 按统计范围、自然周期和能源查询数量及折标煤
 * 路由：/energyCarbon/energyConsumptionQuery/query
 */
import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';

import StatisticsPage from '../../energyStatistics/-StatisticsPage';
import { ENERGY_QUERY_PAGE_PERMISSION } from '../../energyStatistics/constant';

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(ENERGY_QUERY_PAGE_PERMISSION)) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <EnergyQueryPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

/** 复用统一统计工作区，并固定能耗查询页面权限。 */
function EnergyQueryPage() {
  useLocale();
  return (
    <StatisticsPage
      kind='energy'
      title={I18N.energyCarbon.analysisEnergyQuery}
      permissionKey={ENERGY_QUERY_PAGE_PERMISSION}
    />
  );
}
