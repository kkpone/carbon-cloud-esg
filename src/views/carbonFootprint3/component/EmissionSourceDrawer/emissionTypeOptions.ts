import I18N from '@src/lang/I18N';
import { ALL_EMISSION_LABEL } from '../../constant';
import { OptionsTypesData, QuickAccountLifeCycleStage } from '../../type';
import { getQuickEmissionType } from '../AccessoryDrawer/EmissionDrawer/service';

/** 快速核算按入口生命周期限制可选类型，保留历史类型编码。 */
const STAGE_EMISSION_TYPES: Record<QuickAccountLifeCycleStage, number[]> = {
  0: [1, 2, 3, 4],
  1: [5, 7, 21, 22, 23, 24],
  2: [5, 7],
  3: [5],
  4: [23, 24],
};

/** 类型文案跟随当前语言，快速核算使用 PRD 新名称。 */
const getQuickEmissionTypeLabels = (): Record<number, string> => ({
  ...ALL_EMISSION_LABEL(),
  5: I18N.carbonFootprint3.task1Energy,
  24: I18N.carbonFootprint3.task1RecyclableWaste,
});

/** 每次打开读取当前阶段；模型库继续使用原接口选项。 */
export const loadEmissionTypeOptions = async (
  params: { stage: QuickAccountLifeCycleStage },
  restrictToStage: boolean,
): Promise<OptionsTypesData[]> => {
  const response = await getQuickEmissionType(params);
  const options = response.data.data;
  if (!restrictToStage) return options;
  const allowedTypes = STAGE_EMISSION_TYPES[params.stage] || [];
  const labels = getQuickEmissionTypeLabels();
  return options
    .filter(option => allowedTypes.includes(Number(option.value)))
    .map(option => ({
      ...option,
      value: Number(option.value),
      label: labels[Number(option.value)] || option.label,
    }));
};

/** 历史类型只用于原值回显，不能再次选择；不自动迁移或清空已保存数据。 */
export const withHistoricalEmissionType = (
  options: OptionsTypesData[],
  currentType: number,
): (OptionsTypesData & { disabled?: boolean })[] => {
  if (options.some(option => option.value === Number(currentType))) {
    return options;
  }
  const labels = getQuickEmissionTypeLabels();
  const label = labels[currentType];
  if (!label) return options;
  return [...options, { value: Number(currentType), label, disabled: true }];
};
