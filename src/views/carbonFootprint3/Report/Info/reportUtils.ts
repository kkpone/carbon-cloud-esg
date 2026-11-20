import { monteCarloRequest } from './components/MonteCarloAnalysis/service';
import { monteCarloConfigReady } from './components/MonteCarloAnalysis/validation';
import { Modal } from 'antd';
import { ProcessBusinessAccountingTableData } from '../../ProcessBusinessAccounting/type';
import { MonteCarloStates } from './components/MonteCarloAnalysis/types';
import { SensitivityProduct } from './components/ReportSensitivity';
import I18N from '@src/lang/I18N';
import { Form, FormPathPattern } from '@formily/core';
import { Report } from '@src/sdks_v2/footprint3V2ApiDocs';
import { tryParseJSON } from '@src/utils';
import { REPORT_TYPE } from '../../constant';
import {
  FootprintAccountListTypeValue,
  FootprintAccountStatusType,
} from '../../FootprintAccount/constant';

const { REPORT, COMPARE, REDUCTION } = REPORT_TYPE;

/** 根据级联地址数组和城市数据解析出地区名称，默认"中国" */
export const resolveGeoName = (
  cityData: any[],
  productionAddressValue?: string[],
): string => {
  if (!productionAddressValue?.length || !cityData.length)
    return I18N.carbonFootprint3.reportAutoFillChina;
  const province = cityData.find(p => p.value === productionAddressValue[0]);
  if (!province) return I18N.carbonFootprint3.reportAutoFillChina;
  if (productionAddressValue.length > 1) {
    const city = (
      province.children as Array<{ value: string; label: string }>
    )?.find(c => c.value === productionAddressValue[1]);
    return city?.label || province.label;
  }
  return province.label;
};

/** 拼接整体描述文本（各句由调用方按当前语言生成） */
export const buildOverallDescription = ({
  lifeCycleLine,
  techDesc,
  timeLine,
  geoLine,
}: {
  lifeCycleLine?: string;
  techDesc: string;
  timeLine?: string;
  geoLine: string;
}): string =>
  [lifeCycleLine, techDesc, timeLine, geoLine].filter(Boolean).join('\n');

export const AI_COMMON_STRING_FIELDS = ['companyProfile', 'suppose'];
export const AI_CARBON_LABEL_EXTRA_FIELDS = [
  'creditCode',
  'legalPerson',
  'companyProfile',
  'verifiedPartyInfo',
  'verifiedPartyAddress',
  'productIntroduction',
  'productImplementStandard',
  'productFunction',
];
export const AI_REDUCTION_STRING_FIELDS = ['description', 'suppose'];
export const FACTORY_EDITABLE_KEYS = [
  'descs',
  'times',
  'region',
  'technology',
  'datas',
  'methodology',
];
export const FACTORY_UNCERTAINTY_KEYS = [
  'times',
  'region',
  'technology',
  'datas',
  'methodology',
];
export const STAGE_EMISSION_KEYS = [
  'source',
  'monitorMethod',
  'monitorFrequency',
  'recordFrequency',
  'monitorEquipmentCheck',
  'dataLackDeal',
];

export type ReductionStageItem = {
  stage?: number;
  name?: string;
};

export type ReductionExtra = {
  stageList?: ReductionStageItem[] | Record<string, ReductionStageItem>;
  targetScence?: string;
  baseScence?: string;
  allAnalysis?: string;
  structureAnalysis?: string;
  potentialAnalysis?: string;
  suggestion?: string;
  [key: string]: unknown;
};

export const REDUCTION_STAGE_LEGACY_KEYS = [
  'lifeCycleStageAName',
  'lifeCycleStageBName',
  'lifeCycleStageCName',
  'lifeCycleStageDName',
  'lifeCycleStageEName',
] as const;

export const LEGACY_REDUCTION_FIELD_KEYS = [
  'projectIntroduction',
  'projectScenarioSetting',
  'benchmarkScenarioSetting',
  ...REDUCTION_STAGE_LEGACY_KEYS,
  'overallAnalysis',
  'reductionStructureAnalysis',
  'reductionPotentialAnalysis',
  'optimizationSuggestions',
] as const;

export const AI_REDUCTION_FIELD_MAP = [
  {
    path: 'description',
    parsedPaths: ['description', 'projectIntroduction'],
  },
  {
    path: 'suppose',
    parsedPaths: ['suppose'],
  },
  {
    path: 'reduceExtra.targetScence',
    parsedPaths: [
      'reduceExtra.targetScence',
      'reduceExtra.targetScene',
      'targetScence',
      'targetScene',
      'projectScenarioSetting',
    ],
  },
  {
    path: 'reduceExtra.baseScence',
    parsedPaths: [
      'reduceExtra.baseScence',
      'reduceExtra.baseScene',
      'baseScence',
      'baseScene',
      'benchmarkScenarioSetting',
    ],
  },
  {
    path: 'reduceExtra.allAnalysis',
    parsedPaths: ['reduceExtra.allAnalysis', 'allAnalysis', 'overallAnalysis'],
  },
  {
    path: 'reduceExtra.structureAnalysis',
    parsedPaths: [
      'reduceExtra.structureAnalysis',
      'structureAnalysis',
      'reductionStructureAnalysis',
    ],
  },
  {
    path: 'reduceExtra.potentialAnalysis',
    parsedPaths: [
      'reduceExtra.potentialAnalysis',
      'potentialAnalysis',
      'reductionPotentialAnalysis',
    ],
  },
  {
    path: 'reduceExtra.suggestion',
    parsedPaths: [
      'reduceExtra.suggestion',
      'suggestion',
      'optimizationSuggestions',
    ],
  },
];

export const REDUCTION_STAGE_CODES = [0, 1, 2, 3, 4] as const;

export const getObjectValue = (source: unknown, path: string) => {
  if (!source || typeof source !== 'object') return undefined;

  return path.split('.').reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[key];
  }, source);
};

export const getReductionExtraObject = (
  reduceExtra: unknown,
): ReductionExtra => {
  if (!reduceExtra) return {};
  if (typeof reduceExtra === 'string') {
    const parsed = tryParseJSON(reduceExtra);
    return parsed && typeof parsed === 'object'
      ? (parsed as ReductionExtra)
      : {};
  }
  return typeof reduceExtra === 'object' ? (reduceExtra as ReductionExtra) : {};
};

export const getReductionStageName = (
  stageList: ReductionExtra['stageList'],
  index: number,
) => {
  if (Array.isArray(stageList)) {
    return stageList[index]?.name ?? '';
  }

  if (stageList && typeof stageList === 'object') {
    return stageList[index]?.name ?? '';
  }

  return '';
};

export const normalizeReductionStageList = (
  stageList: ReductionExtra['stageList'],
) =>
  REDUCTION_STAGE_CODES.map((stage, index) => ({
    stage,
    name: getReductionStageName(stageList, index),
  }));

export const buildReductionExtra = (
  values: Report,
): NonNullable<Report['reduceExtra']> => {
  const reduceExtra = getReductionExtraObject(values.reduceExtra);

  return {
    stageList: normalizeReductionStageList(reduceExtra.stageList),
    targetScence:
      reduceExtra.targetScence ?? values.projectScenarioSetting ?? '',
    baseScence: reduceExtra.baseScence ?? values.benchmarkScenarioSetting ?? '',
    allAnalysis: reduceExtra.allAnalysis ?? values.overallAnalysis ?? '',
    structureAnalysis:
      reduceExtra.structureAnalysis ?? values.reductionStructureAnalysis ?? '',
    potentialAnalysis:
      reduceExtra.potentialAnalysis ?? values.reductionPotentialAnalysis ?? '',
    suggestion: reduceExtra.suggestion ?? values.optimizationSuggestions ?? '',
  };
};

export const normalizeReductionReportValues = (report: Report): Report => {
  if (Number(report.type) !== REDUCTION) return report;

  const reduceExtra = getReductionExtraObject(report.reduceExtra);

  return {
    ...report,
    description: report.description ?? report.projectIntroduction,
    reduceExtra: {
      ...reduceExtra,
      stageList: normalizeReductionStageList(reduceExtra.stageList),
      targetScence:
        reduceExtra.targetScence ?? report.projectScenarioSetting ?? '',
      baseScence:
        reduceExtra.baseScence ?? report.benchmarkScenarioSetting ?? '',
      allAnalysis: reduceExtra.allAnalysis ?? report.overallAnalysis ?? '',
      structureAnalysis:
        reduceExtra.structureAnalysis ??
        report.reductionStructureAnalysis ??
        '',
      potentialAnalysis:
        reduceExtra.potentialAnalysis ??
        report.reductionPotentialAnalysis ??
        '',
      suggestion:
        reduceExtra.suggestion ?? report.optimizationSuggestions ?? '',
    },
  };
};

export const clearLegacyReductionFields = (report: Report) => {
  LEGACY_REDUCTION_FIELD_KEYS.forEach(key => {
    report[key] = undefined;
  });
};

export const clearValidationFeedback = (
  formIns: Form<any>,
  patterns: FormPathPattern[],
) => {
  patterns.forEach(pattern => {
    formIns.clearErrors(pattern);
    formIns.setFieldState(pattern, {
      required: false,
      validateStatus: 'success',
      selfErrors: [],
    });
  });
};

export const clearValidationStatus = (
  formIns: Form<any>,
  patterns: FormPathPattern[],
) => {
  patterns.forEach(pattern => {
    formIns.clearErrors(pattern);
    formIns.setFieldState(pattern, {
      validateStatus: 'success',
      selfErrors: [],
    });
  });
};

export const REPORT_ONLY_VALIDATION_PATTERNS: FormPathPattern[] = [
  'companyProfile',
  'grid.companyProfile.companyProfile',
  'productionAddress',
  'grid.productionAddress',
  'evaluateProductCategory',
  'grid.evaluateProductCategory',
  'productionProcess',
  'grid.productionProcessDescriptionCol.productionProcess',
  'overallDescription',
  'grid.overallDescriptionCol.overallDescription',
  'reportActivityList.*.*',
  'reportActivityList.*.*.*',
  'reportFactoryList.*.*',
  'reportFactoryList.*.*.*',
];

export const REPORT_SUPPOSE_VALIDATION_PATTERNS: FormPathPattern[] = [
  'suppose',
  'grid.grids.suppose',
];

export const REPORT_DESCRIPTION_VALIDATION_PATTERNS: FormPathPattern[] = [
  'productionProcess',
  'grid.productionProcessDescriptionCol.productionProcess',
  'overallDescription',
  'grid.overallDescriptionCol.overallDescription',
];

export const syncValidationByReportType = (
  formIns: Form<any>,
  reportType?: number,
) => {
  if (Number(reportType) === REPORT) return;

  clearValidationFeedback(formIns, [
    ...REPORT_ONLY_VALIDATION_PATTERNS,
    ...REPORT_SUPPOSE_VALIDATION_PATTERNS,
  ]);
};

export const getAnalysisProducts = (
  formIns: Form<Report>,
): SensitivityProduct[] => {
  const { values } = formIns;
  const result: SensitivityProduct[] = [];
  const add = (accountId: unknown, productId: unknown, path: string) => {
    if (!accountId) return;
    const options = formIns.getFieldState(path)?.dataSource as
      | { value: number; label: string }[]
      | undefined;
    const { label } =
      options?.find(option => String(option.value) === String(productId)) ?? {};
    const accountPath =
      path === 'compareProductName'
        ? 'compareAccountName'
        : path.replace(/productName$/, 'accountName');
    const accountOptions = formIns.getFieldState(accountPath)?.dataSource as
      | { value: number; label: string }[]
      | undefined;
    const functionalName = accountOptions?.find(
      option => String(option.value) === String(accountId),
    )?.label;
    if (!result.some(item => String(item.accountId) === String(accountId))) {
      result.push({
        accountId: Number(accountId),
        functionalName:
          functionalName || `${label || productId || ''} / ${accountId}`,
        name:
          label ||
          `${I18N.carbonFootprint.productName} ${productId || accountId}`,
      });
    }
  };
  if (values.type === REPORT) {
    values.reportAccountList?.forEach((row, index) =>
      add(
        row.accountName,
        row.productName,
        `reportAccountList.${index}.productName`,
      ),
    );
  } else if (values.type === COMPARE) {
    add(values.accountName, values.productName, 'productName');
    add(
      values.compareAccountName,
      values.compareProductName,
      'compareProductName',
    );
  }
  return result;
};

export const verifyReportAccountTypes = (
  willAccountId: number,
  compareAccountId: number,
  accounts?: ProcessBusinessAccountingTableData[],
  compareAccounts?: ProcessBusinessAccountingTableData[],
) => {
  const accountInfo = accounts?.find(u => u.id === willAccountId);
  const compareAccountInfo = compareAccounts?.find(
    u => u.id === compareAccountId,
  );

  if (!accountInfo || !compareAccountInfo) {
    Modal.error({
      title: I18N.carbonFootprint3.errorMessage,
      content: I18N.carbonFootprint3.functionalUnitCore,
    });
    return false;
  }

  if (accountInfo.type !== compareAccountInfo.type) {
    Modal.warning({
      title: I18N.carbonFootprint.prompt,
      content: I18N.carbonFootprint3.targetProductFunction,
    });
    return false;
  }

  return true;
};

/** 完整报告和未选完核算的草稿沿用相同的基准核算限制。 */
export function filterReportComparisonAccounts(
  accounts: ProcessBusinessAccountingTableData[],
  reportType: Report['type'],
  targetAccountId?: number,
  targetAccountType?: string | number,
) {
  return accounts.filter(account => {
    if (String(account.id) === String(targetAccountId)) return false;
    if (reportType === REDUCTION) {
      return (
        Number(account.accountStatus) ===
          FootprintAccountListTypeValue.COMPLETE &&
        Number(account.type) === FootprintAccountStatusType.QUICK
      );
    }
    return (
      targetAccountType === undefined ||
      Number(account.type) === Number(targetAccountType)
    );
  });
}

/** 先收集页面配置，避免原保存流程整理核算关联时丢失未打开产品的配置。 */
export function collectMonteCarloStates(values: Report): MonteCarloStates {
  const states: MonteCarloStates = {};
  values.reportAccountList?.forEach(row => {
    // 接口的 accountName 是名称，表单的 accountName 才是选中的 ID。
    const accountId = row.accountId ?? row.accountName;
    if (!accountId || !row.monteCarloConfig) return;
    states[String(accountId)] = {
      config:
        typeof row.monteCarloConfig === 'string'
          ? JSON.parse(row.monteCarloConfig)
          : row.monteCarloConfig,
      result: row.monteCarloResult
        ? typeof row.monteCarloResult === 'string'
          ? JSON.parse(row.monteCarloResult)
          : row.monteCarloResult
        : undefined,
      description: row.monteCarloDescription || '',
      parametersLoaded: true,
    };
  });
  return {
    ...states,
    ...(values.monteCarloByAccount as MonteCarloStates | undefined),
  };
}

export function attachMonteCarloStates(
  report: Report,
  states: MonteCarloStates,
) {
  delete report.monteCarloByAccount;
  if (
    report.type !== REPORT_TYPE.REPORT &&
    report.type !== REPORT_TYPE.COMPARE
  ) {
    report.uncertaintyMethod = undefined;
    return;
  }
  report.uncertaintyMethod = report.uncertaintyMethod || 'TAYLOR';
  report.reportAccountList = report.reportAccountList?.map(row => {
    const state = states[String(row.accountId)];
    const { monteCarloResult, monteCarloConfigured, ...fields } = row;
    if (!state) return fields;
    return {
      ...fields,
      monteCarloConfig: monteCarloRequest({
        accountId: Number(row.accountId),
        config: state.config,
      }).config,
      monteCarloCalculationId: state.result?.calculationId,
      monteCarloDescription: state.description,
    };
  });
}

export const clearFormValueByPath = (
  newForm: Form<Report>,
  fieldPath?: FormPathPattern,
) => {
  if (!fieldPath) return;
  newForm.setFieldState(fieldPath, {
    value: undefined,
    dataSource: undefined,
  });
};

export const resetBasicInfoValidateFeedback = (formIns: Form<Report>) => {
  [
    'productName',
    'accountName',
    'startTime',
    'compareProductName',
    'compareAccountName',
    'compareStartTime',
  ].forEach(path => {
    formIns.clearErrors(path);
    formIns.setFieldState(path, {
      validateStatus: 'success',
      selfErrors: [],
    });
  });
};

export function reportMonteCarloComplete(form: Form<Report>) {
  if (
    (form.values.type !== REPORT && form.values.type !== COMPARE) ||
    form.values.uncertaintyMethod !== 'MONTE_CARLO'
  )
    return true;
  const states = collectMonteCarloStates(form.values);
  return getAnalysisProducts(form).every(product => {
    const state = states[product.accountId];
    return monteCarloConfigReady(state?.config, state?.parametersLoaded);
  });
}
