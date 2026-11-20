import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import { EnergyForbidden } from '@/views/energyCarbon/hooks/useEnergyNavigation';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
/**
 * 能源形态分析：按审核时能源形态汇总折标煤，图表与明细共享汇总。
 * 路由：/energyCarbon/energyAnalysis/form
 */
import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import SinglePeriodAnalysisPage from '../components/SinglePeriodAnalysisPage';
import { ENERGY_ANALYSIS_PAGE_PERMISSION } from '../constant';

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(ENERGY_ANALYSIS_PAGE_PERMISSION.FORM)) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <EnergyFormAnalysisPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

/** 复用月季年筛选和当前组织名称，默认当月。 */
function EnergyFormAnalysisPage() {
  useLocale();
  return (
    <SinglePeriodAnalysisPage
      kind='form'
      title={I18N.energyCarbon.energyFormAnalysis}
      permissionKey={ENERGY_ANALYSIS_PAGE_PERMISSION.FORM}
    />
  );
}
