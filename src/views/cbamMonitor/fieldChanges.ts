import I18N from '@/lang/I18N';
import monitorEn from '@/lang/en-US/cbamMonitor';
import { FactorSamplingItem, ProcessMonitorItem } from './types';

/** 旧频次仅保留显示兼容，不新增为可选预设。 */
const legacyMonitoringFrequencyKeys = {
  CONTINUOUS: 'monitorContinuous',
  SHIFT: 'monitorShift',
  DAILY: 'monitorDaily',
  MONTHLY: 'monitorMonthly',
  QUARTERLY: 'monitorQuarterly',
  ANNUAL: 'monitorAnnual',
} as const;

/** 监测频次下拉保留稳定编码，标签跟随分组语言。 */
export const monitoringFrequencyOptions = (english = false) => {
  const labels = english ? monitorEn : I18N.cbamMonitor;
  return [
    ['AT_LEAST_WEEKLY', labels.frequencyWeekly],
    ['AT_LEAST_DAILY', labels.frequencyDaily],
    ['PER_20000T_MIN_6_YEAR', labels.frequency20000],
    ['PER_10000T_MIN_4_YEAR', labels.frequency10000],
    ['PER_5000T_MIN_4_YEAR', labels.frequency5000],
    ['PER_50000T_MIN_4_YEAR', labels.frequency50000],
    ['PER_50000T_CO2_MIN_4_YEAR', labels.frequencyCo2],
  ].map(([value, label]) => ({ value, label }));
};

/** 新旧预设按编码回显，自定义文本保持原样。 */
export function monitoringFrequencyLabel(
  value?: string,
  english = false,
): string {
  const labels = english ? monitorEn : I18N.cbamMonitor;
  const legacyKey =
    legacyMonitoringFrequencyKeys[
      value as keyof typeof legacyMonitoringFrequencyKeys
    ];
  return (
    monitoringFrequencyOptions(english).find(item => item.value === value)
      ?.label ||
    (legacyKey ? labels[legacyKey] : '') ||
    value ||
    ''
  );
}

/** 英文优先显示独立英文内容；英文未填时仅预设编码可直接使用英文资源。 */
export function monitoringFrequencyDisplayValue(
  value?: string,
  valueEn?: string,
  english = false,
): string {
  if (!english) return monitoringFrequencyLabel(value);
  if (valueEn !== undefined && valueEn !== null)
    return monitoringFrequencyLabel(valueEn, true);
  const preset =
    monitoringFrequencyOptions().some(item => item.value === value) ||
    Object.prototype.hasOwnProperty.call(
      legacyMonitoringFrequencyKeys,
      value || '',
    );
  return preset ? monitoringFrequencyLabel(value, true) : '';
}

/** 当前源流监测方法所需的因子类型。 */
export function methodFactorTypes(method: ProcessMonitorItem): string[] {
  if (method.monitorMethod === 'measurement_cems')
    return ['GHG_CONCENTRATION', 'FLUE_GAS_VOLUME', 'BIOMASS_FRACTION'];
  if (method.monitorMethod === 'mass_balance')
    return ['CARBON_CONTENT', 'BIOMASS_FRACTION'];
  if (method.monitorMethod !== 'standard_calculation') return [];
  if (method.sourceType === 'combustion')
    return ['NCV', 'EMISSION_FACTOR', 'OXIDATION_FACTOR', 'BIOMASS_FRACTION'];
  if (method.sourceType === 'process')
    return ['EMISSION_FACTOR', 'CONVERSION_FACTOR', 'BIOMASS_FRACTION'];
  return [];
}

/** 仅页面监测方法发生变化时同步；相同方法下保留用户对因子行的修改和删除。 */
export function synchronizeFactors(
  methods: ProcessMonitorItem[],
  factors: FactorSamplingItem[],
  createKey: () => string,
  previousMethods?: ProcessMonitorItem[],
): FactorSamplingItem[] {
  if (previousMethods) {
    const sourceFields = (rows: ProcessMonitorItem[]) =>
      rows.map(method => [
        method.itemKey,
        method.sourceFlowName,
        method.sourceType,
        method.monitorMethod,
      ]);
    if (
      JSON.stringify(sourceFields(previousMethods)) ===
      JSON.stringify(sourceFields(methods))
    ) {
      return factors;
    }
  }
  const consumed = new Set<FactorSamplingItem>();
  const linkedFactors = methods.flatMap(method => {
    if (!method.itemKey || !method.sourceFlowName?.trim()) return [];
    const previous = previousMethods?.find(
      item => item.itemKey === method.itemKey,
    );
    if (
      previous &&
      previous.sourceFlowName === method.sourceFlowName &&
      previous.sourceType === method.sourceType &&
      previous.monitorMethod === method.monitorMethod
    ) {
      return factors.filter(
        factor => factor.processMonitorItemKey === method.itemKey,
      );
    }
    return methodFactorTypes(method).map(factorType => {
      const existing = factors.find(
        factor =>
          !consumed.has(factor) &&
          factor.factorType === factorType &&
          factor.processMonitorItemKey === method.itemKey,
      );
      if (existing) consumed.add(existing);
      return {
        ...(existing || { itemKey: createKey() }),
        processMonitorItemKey: method.itemKey,
        sourceFlowName: method.sourceFlowName,
        factorType,
      };
    });
  });
  return [
    ...linkedFactors,
    ...factors.filter(factor => !factor.processMonitorItemKey?.trim()),
  ];
}

/** 按公式编码分别读取公式和参数说明，说明仅用于前端展示。 */
export function monitorFormulaDetails(code?: string): {
  formula: string;
  description: string;
} {
  const values: Record<string, [string, string]> = {
    FLOW_COMBUSTION: [
      'Emi = FQi × NCVi × EFi × OFi × (1-Bio)',
      I18N.cbamMonitor.formulaCombustionParameters,
    ],
    FLOW_PROCESS_EMISSION: [
      'Emj = ADj × EFj × CFj × (1-Bio)',
      I18N.cbamMonitor.formulaProcessParameters,
    ],
    FLOW_MASS_BALANCE: [
      'EmMB = Σ(ADk × CCk × 3.664) × (1-Bio)',
      I18N.cbamMonitor.formulaMassParameters,
    ],
    MEASUREMENT_CEMS: [
      'GHGEm.total = Σ(GHGconc.i × Vi) ÷ 1000000 × (1-Bio)',
      I18N.cbamMonitor.formulaCemsParameters,
    ],
    PFC_SLOPE: [
      'EmCF4.duct = AEM × (SEFCF4 / 1000) × PrAl\nEmC2F6.duct = EmCF4.duct × FC2F6',
      I18N.cbamMonitor.formulaSlopeParameters,
    ],
    PFC_OVERVOLTAGE: [
      'EmCF4.duct = OVC × (AEO / CE) × PrAl × 0.001\nEmC2F6.duct = EmCF4.duct × FC2F6',
      I18N.cbamMonitor.formulaOvervoltageParameters,
    ],
  };
  const value = values[code || ''];
  return { formula: value?.[0] || '--', description: value?.[1] || '' };
}

/** 抽屉内完整展示公式及说明，接口仍只保存公式编码。 */
export function monitorFormulaText(code?: string): string {
  const { formula, description } = monitorFormulaDetails(code);
  return description ? `${formula}\n\n${description}` : formula;
}

/** 能源属性一级分组及其二级值，叶子值直接保存，兼容原字符串字段。 */
export const energyPropertyOptions = (english = false) => {
  const labels = english ? monitorEn : I18N.cbamMonitor;
  return [
    [
      labels.energyRenewable,
      [
        labels.energySolar,
        labels.energyWind,
        labels.energyHydro,
        labels.energyGeothermal,
        labels.energyOcean,
        labels.energyBiomass,
      ],
    ],
    [
      labels.energyFossil,
      [labels.energyCoal, labels.energyGas, labels.energyOil],
    ],
    [labels.energyNuclear, [labels.energyNuclearPower]],
    [
      labels.energyWaste,
      [
        labels.energyMunicipalWaste,
        labels.energyIndustrialWaste,
        labels.energyWasteHeat,
        labels.energyWastePressure,
        labels.energyByproductGas,
      ],
    ],
    [labels.energyMixed, [labels.energyMixedDescription]],
    [labels.other, [labels.energyOtherDescription]],
    [labels.pendingConfirmation, [labels.energyUnknownDescription]],
  ].map(([label, children], groupIndex) => ({
    label: label as string,
    value: `ENERGY_${groupIndex}`,
    children: (children as string[]).map((label, index) => ({
      label,
      value: `ENERGY_${groupIndex}_${index}`,
    })),
  }));
};

/** 将发电下拉编码还原为当前语言文案，兼容旧的自由文本。 */
export function energyPropertyLabel(value?: string, english = false): string {
  return (
    energyPropertyOptions(english)
      .flatMap(group => group.children)
      .find(item => item.value === value)?.label ||
    value ||
    '--'
  );
}

/** 设施发电的两个独立方法共用同一组展示映射。 */
export const electricityMethodOptions = (english = false) => {
  const labels = english ? monitorEn : I18N.cbamMonitor;
  return {
    metering: [
      { value: 'DIRECT_METER', label: labels.meteringDirect },
      { value: 'POWER_INTEGRATION', label: labels.meteringIntegration },
      { value: 'BALANCE_DIFFERENCE', label: labels.meteringBalance },
      { value: 'ENGINEERING_MODEL', label: labels.meteringModel },
    ],
    allocation: [
      { value: 'DIRECT_ATTRIBUTION', label: labels.allocationDirect },
      {
        value: 'MEASURED_ELECTRICITY',
        label: labels.allocationMeasured,
      },
      { value: 'PHYSICAL_RELATION', label: labels.allocationPhysical },
      { value: 'ECONOMIC_VALUE', label: labels.allocationEconomic },
      { value: 'CHP', label: labels.allocationChp },
      {
        value: 'ENGINEERING_ESTIMATE',
        label: labels.allocationEngineering,
      },
      { value: 'OTHER', label: labels.other },
      { value: 'UNCONFIRMED', label: labels.pendingConfirmation },
    ],
  };
};

/** 报告只读视图兼容旧合并字段，新字段分别翻译后展示。 */
export function electricityMethodsLabel(
  item?: {
    meteringMethod?: string;
    allocationMethod?: string;
    meteringAllocationMethod?: string;
  },
  english = false,
): string {
  if (!item?.meteringMethod && !item?.allocationMethod)
    return item?.meteringAllocationMethod || '--';
  const options = electricityMethodOptions(english);
  return [
    options.metering.find(option => option.value === item?.meteringMethod)
      ?.label || item?.meteringMethod,
    options.allocation.find(option => option.value === item?.allocationMethod)
      ?.label || item?.allocationMethod,
  ]
    .filter(Boolean)
    .join(' / ');
}
