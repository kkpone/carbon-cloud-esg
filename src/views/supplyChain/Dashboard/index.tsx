import ReactECharts from 'echarts-for-react';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { LocaleContext } from '@src/components/LocaleProvider';
import I18N, { LocaleType } from '@src/lang/I18N';
import { Checkbox, Empty, Input, Select, Spin, Tabs } from 'antd';
import {
  FC,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import styles from './index.module.less';
import {
  getDashboardEnterpriseOptions,
  getDashboardEnterpriseStructure,
  getDashboardEnterpriseSupplierTrend,
  getDashboardEnterpriseTrend,
  getDashboardProductLifecycleAnalysis,
  getDashboardProductOptions,
  getDashboardProductTypeAnalysis,
  getDashboardSummary,
  getDashboardSuppliers,
} from './service';
import {
  DashboardProduct,
  DashboardSummary,
  DashboardSupplier,
  EnterpriseStructureAnalysis,
  EnterpriseSupplierTrendAnalysis,
  EnterpriseScopeTrendPoint,
  EnterpriseTrendAnalysis,
  EnterpriseYearOption,
  ProductAnalysis,
  ProductEmissionType,
  ProductChartRow,
} from './type';

const stageColors = [
  '#0CBF9F',
  '#37B1EC',
  '#AA92EF',
  '#E57EA9',
  '#E48B4B',
  '#A7C45D',
  '#8E78D1',
];
const SHOW_PRODUCT_FOOTPRINT_DATA_CARD = false;

/** Figma 4594-1233：Y 轴刻度右缘到绘图区左缘为 64px */
const SOURCE_CHART_PLOT_LEFT = 64;
const SOURCE_CHART_HEIGHT = 297;
const SOURCE_CHART_PLOT_RIGHT = 0;
/** 下方图绘图区最小宽度，左侧留白随 Y 轴名称动态计算 */
const LIFECYCLE_CHART_PLOT_MIN_WIDTH = 360;
const LIFECYCLE_CHART_PLOT_RIGHT = 16;
/** 企业碳排放分析图表 */
const ENTERPRISE_CHART_HEIGHT = 297;
const ENTERPRISE_CHART_PLOT_LEFT = 64;
const ENTERPRISE_CHART_PLOT_RIGHT = 0;
const ENTERPRISE_SCOPE_COLORS = ['#0CBF9F', '#37B1EC', '#AA92EF'];
/** Figma 4794-5160：单柱 12px，相邻柱间距 2px，顶部圆角 4px */
const ENTERPRISE_SCOPE_BAR_WIDTH = 12;
const getEnterpriseScopeBarWidth = (yearCount: number) => {
  if (yearCount <= 3) {
    return 20;
  }
  if (yearCount <= 5) {
    return 16;
  }
  return ENTERPRISE_SCOPE_BAR_WIDTH;
};
const ENTERPRISE_SUPPLIER_COLORS = [
  '#0CBF9F',
  '#37B1EC',
  '#AA92EF',
  '#E57EA9',
  '#E48B4B',
  '#A7C45D',
  '#5267DF',
  '#F0B43C',
];
const ENTERPRISE_STRUCTURE_AXIS_LINE_LEFT = 107;
const ENTERPRISE_STRUCTURE_BAR_HEIGHT = 12;
/** Figma 4590-7019：同组三条 bar 间距 4px */
const ENTERPRISE_STRUCTURE_BAR_GAP = 4;
const ENTERPRISE_STRUCTURE_GROUP_GAP = 24;
/** 同组三条 bar 间距占 bar 高度比例：4 / 12 */
const ENTERPRISE_STRUCTURE_BAR_GAP_RATIO = `${Math.round(
  (ENTERPRISE_STRUCTURE_BAR_GAP / ENTERPRISE_STRUCTURE_BAR_HEIGHT) * 100,
)}%`;
const CHART_AXIS_LABEL_FONT_SIZE = 12;
const CHART_AXIS_COLOR = '#6c757d';
const CHART_AXIS_NAME_COLOR = 'rgba(4, 37, 43, 0.6)';
const CHART_SPLIT_LINE = '#e7eaee';
/** Figma 4590-7003：图表左侧 0 刻度竖线 */
const CHART_AXIS_LINE_COLOR = '#999ea4';

const CHART_AXIS_LABEL_MAX_LENGTH = 6;
/** 坐标轴标签区域宽度，容纳 6 个字 + ... */
const CHART_AXIS_LABEL_WIDTH = 72;

/** 坐标轴名称超过 6 个字时截断并追加 ... */
const truncateAxisLabel = (value: string | number) => {
  const text = String(value ?? '');
  if (text.length <= CHART_AXIS_LABEL_MAX_LENGTH) {
    return text;
  }
  return `${text.slice(0, CHART_AXIS_LABEL_MAX_LENGTH)}...`;
};

const isSupplierAxisLabelTruncated = (fullText: string) =>
  fullText.length >= CHART_AXIS_LABEL_MAX_LENGTH;

const buildSupplierDisplayNames = (fullNames: string[]) =>
  fullNames.map(truncateAxisLabel);

/** 上图 X 轴 / 下图 Y 轴供应商名称公共样式 */
const buildSupplierAxisLabelConfig = (placement: 'x' | 'y') => ({
  color: CHART_AXIS_COLOR,
  fontSize: CHART_AXIS_LABEL_FONT_SIZE,
  lineHeight: 20,
  width: CHART_AXIS_LABEL_WIDTH,
  overflow: 'truncate' as const,
  ...(placement === 'x'
    ? { interval: 0, margin: 12 }
    : { align: 'right' as const, margin: 8 }),
});

const createAxisLabelTooltipHandlers = (
  getContainer: () => HTMLDivElement | null,
  setTip: (tip: { text: string; x: number; y: number } | null) => void,
  axisType: 'xAxis' | 'yAxis' = 'xAxis',
  getFullText?: (value: string, dataIndex?: number) => string,
) => ({
  mouseover: (params: {
    componentType?: string;
    value?: string;
    dataIndex?: number;
    event?: { event: MouseEvent };
  }) => {
    if (
      params.componentType !== axisType ||
      params.value == null ||
      params.value === ''
    ) {
      return;
    }
    const fullText =
      getFullText?.(String(params.value), params.dataIndex) ??
      String(params.value);
    if (!isSupplierAxisLabelTruncated(fullText)) {
      setTip(null);
      return;
    }
    const container = getContainer();
    const mouseEvent = params.event?.event;
    if (!container || !mouseEvent) {
      return;
    }
    const rect = container.getBoundingClientRect();
    setTip({
      text: fullText,
      x: mouseEvent.clientX - rect.left,
      y: mouseEvent.clientY - rect.top - 8,
    });
  },
  mouseout: (params: { componentType?: string }) => {
    if (params.componentType !== axisType) {
      return;
    }
    setTip(null);
  },
  globalout: () => {
    setTip(null);
  },
});

const getSourceChartHeight = () => SOURCE_CHART_HEIGHT;

const getLifecycleChartHeight = (count: number) => {
  const rowBlock = count * 24 + Math.max(count - 1, 0) * 24;
  return Math.max(168, 52 + rowBlock);
};

/** 下图最小宽度：固定标签区 + 绘图区，标签区宽度与上图一致 */
const getLifecycleChartMinWidth = () =>
  CHART_AXIS_LABEL_WIDTH + 16 + LIFECYCLE_CHART_PLOT_MIN_WIDTH;

const getEnterpriseScopeTrend = (
  analysis?: EnterpriseTrendAnalysis,
): EnterpriseScopeTrendPoint[] => {
  const trend = [...(analysis?.trend || [])].sort((left, right) =>
    left.year.localeCompare(right.year),
  );
  return trend.map(item => ({
    year: item.year,
    scopeOne: item.scopeOne ?? 0,
    scopeTwo: item.scopeTwo ?? 0,
    scopeThree: item.scopeThree ?? 0,
    total: item.value,
    supplierNames: item.supplierNames,
  }));
};

type EnterpriseScopeKey = 'scopeOne' | 'scopeTwo' | 'scopeThree';

const ENTERPRISE_SCOPE_META: Array<{
  key: EnterpriseScopeKey;
  labelKey: keyof typeof I18N.supplyChain2;
}> = [
  { key: 'scopeOne', labelKey: 'scopeOne' },
  { key: 'scopeTwo', labelKey: 'scopeTwo' },
  { key: 'scopeThree', labelKey: 'scopeThree' },
];

const getVisibleEnterpriseScopes = (scope: string): EnterpriseScopeKey[] => {
  switch (scope) {
    case 'SCOPE_ONE':
      return ['scopeOne'];
    case 'SCOPE_TWO':
      return ['scopeTwo'];
    case 'SCOPE_THREE':
      return ['scopeThree'];
    case 'SCOPE_ONE_TWO':
      return ['scopeOne', 'scopeTwo'];
    default:
      return ['scopeOne', 'scopeTwo', 'scopeThree'];
  }
};

const buildEnterpriseScopeLegendItems = (visibleScopes: EnterpriseScopeKey[]) =>
  ENTERPRISE_SCOPE_META.filter(item => visibleScopes.includes(item.key)).map(
    item => ({
      key: item.key,
      label: I18N.supplyChain2[item.labelKey],
      color:
        ENTERPRISE_SCOPE_COLORS[
          ENTERPRISE_SCOPE_META.findIndex(meta => meta.key === item.key)
        ],
      shape: 'dot' as const,
    }),
  );

const escapeTooltipHtml = (value: string) =>
  value.replace(/[&<>"']/g, character => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });

const formatEnterpriseTooltip = (
  params: Array<{ seriesName?: string; value?: number }>,
  point?: EnterpriseScopeTrendPoint,
) => {
  const year = point?.year || '-';
  const rows = params
    .map(
      item =>
        `<div style="display:flex;align-items:flex-start;width:100%;font-size:12px;line-height:20px;">
          <span style="flex:none;width:44px;color:rgba(0,0,0,0.85);font-family:'PingFang SC',sans-serif;font-size:12px;font-style:normal;font-weight:400;line-height:20px;">${escapeTooltipHtml(
            item.seriesName || '-',
          )}：</span>
          <span style="flex:1;min-width:0;text-align:center;font-family:'PingFang SC',sans-serif;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Number(
            item.value || 0,
          ).toLocaleString()} tCO₂e</span>
        </div>`,
    )
    .join('');
  const supplierNames = (point?.supplierNames || []).filter(Boolean).join('、');
  return `<div style="width:240px;padding:8px;box-sizing:border-box;color:rgba(0,0,0,0.85);font-family:'PingFang SC',sans-serif;">
    <div style="font-family:'PingFang SC',sans-serif;font-size:14px;font-weight:600;line-height:22px;margin-bottom:4px;">${escapeTooltipHtml(
      year,
    )}年</div>
    <div style="padding-bottom:8px;border-bottom:1px dashed #e5e7eb;">${rows}</div>
    <div style="margin-top:8px;color:#6c757d;font-family:'PingFang SC',sans-serif;font-size:12px;font-style:normal;line-height:20px;">
      <div style="font-family:'PingFang SC',sans-serif;font-size:12px;font-style:normal;font-weight:500;line-height:20px;margin-bottom:4px;">${
        I18N.supplyChain2.participatingStatistics
      }</div>
      <div style="color:#6c757d;text-align:justify;font-family:'PingFang SC',sans-serif;font-size:12px;font-style:normal;font-weight:400;line-height:18px;white-space:normal;overflow-wrap:anywhere;word-break:break-word;">${escapeTooltipHtml(
        supplierNames || '-',
      )}</div>
    </div>
  </div>`;
};

const buildEnterpriseScopeBarOption = (
  scopeTrend: EnterpriseScopeTrendPoint[],
  visibleScopes: EnterpriseScopeKey[],
) => {
  const barWidth = getEnterpriseScopeBarWidth(scopeTrend.length);
  const barGap = `${(2 / barWidth) * 100}%`;
  return {
    color: ENTERPRISE_SCOPE_COLORS,
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      appendToBody: true,
      confine: false,
      extraCssText:
        'z-index: 1000;padding:0;background:#fff;border:0;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.08);',
      formatter: (params: Array<{ seriesName?: string; value?: number }>) => {
        const point = scopeTrend[params[0]?.dataIndex ?? 0];
        return formatEnterpriseTooltip(params, point);
      },
    },
    grid: {
      left: ENTERPRISE_CHART_PLOT_LEFT,
      right: ENTERPRISE_CHART_PLOT_RIGHT,
      top: 11,
      bottom: 31,
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: scopeTrend.map(item => item.year),
      axisLabel: {
        color: CHART_AXIS_COLOR,
        fontSize: CHART_AXIS_LABEL_FONT_SIZE,
        lineHeight: 20,
        margin: 12,
      },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: I18N.template(I18N.supplyChain2.emissionsUnit, { val1: 'tCO₂e' }),
      nameLocation: 'middle',
      nameGap: 50,
      nameRotate: 90,
      nameTextStyle: {
        color: CHART_AXIS_NAME_COLOR,
        fontSize: CHART_AXIS_LABEL_FONT_SIZE,
        align: 'center',
      },
      axisLabel: {
        color: CHART_AXIS_COLOR,
        fontSize: CHART_AXIS_LABEL_FONT_SIZE,
        lineHeight: 20,
        align: 'right',
        margin: 8,
        width: 28,
      },
      splitLine: { lineStyle: { color: CHART_SPLIT_LINE, width: 1 } },
    },
    series: ENTERPRISE_SCOPE_META.filter(item =>
      visibleScopes.includes(item.key),
    ).map(item => {
      const color =
        ENTERPRISE_SCOPE_COLORS[
          ENTERPRISE_SCOPE_META.findIndex(meta => meta.key === item.key)
        ];
      return {
        name: I18N.supplyChain2[item.labelKey],
        type: 'bar',
        barWidth,
        barGap,
        itemStyle: {
          color,
          borderRadius: [4, 4, 0, 0],
        },
        data: scopeTrend.map(point => Number(point[item.key] || 0)),
      };
    }),
  };
};

const buildSupplierTrendLegendItems = (
  rows: EnterpriseSupplierTrendAnalysis['supplierTrend'],
) =>
  rows.map((item, index) => ({
    key: String(item.supplierId),
    label: item.supplierName || '-',
    color:
      ENTERPRISE_SUPPLIER_COLORS[index % ENTERPRISE_SUPPLIER_COLORS.length],
    shape: 'line' as const,
  }));

const buildEnterpriseSupplierLineOption = (
  rows: EnterpriseSupplierTrendAnalysis['supplierTrend'],
  selectedKeys: string[],
) => {
  const years = Array.from(
    new Set(rows.flatMap(item => item.values.map(value => value.year))),
  ).sort();
  const visibleRows = rows
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => selectedKeys.includes(String(item.supplierId)));
  return {
    color: ENTERPRISE_SUPPLIER_COLORS,
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
        lineStyle: { color: '#6c757d', type: 'dashed' },
      },
    },
    grid: {
      left: ENTERPRISE_CHART_PLOT_LEFT,
      right: ENTERPRISE_CHART_PLOT_RIGHT,
      top: 11,
      bottom: 31,
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: years,
      axisLabel: {
        color: CHART_AXIS_COLOR,
        fontSize: CHART_AXIS_LABEL_FONT_SIZE,
        lineHeight: 20,
        margin: 12,
      },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: I18N.template(I18N.supplyChain2.emissionsUnit, { val1: 'tCO₂e' }),
      nameLocation: 'middle',
      nameGap: 50,
      nameRotate: 90,
      nameTextStyle: {
        color: CHART_AXIS_NAME_COLOR,
        fontSize: CHART_AXIS_LABEL_FONT_SIZE,
        align: 'center',
      },
      axisLabel: {
        color: CHART_AXIS_COLOR,
        fontSize: CHART_AXIS_LABEL_FONT_SIZE,
        lineHeight: 20,
        align: 'right',
        margin: 8,
        width: 28,
      },
      splitLine: { lineStyle: { color: CHART_SPLIT_LINE, width: 1 } },
    },
    series: visibleRows.map(({ item, index }) => {
      const color =
        ENTERPRISE_SUPPLIER_COLORS[index % ENTERPRISE_SUPPLIER_COLORS.length];
      return {
        name: item.supplierName || '-',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 2, color },
        itemStyle: { borderWidth: 0, color },
        data: years.map(year => {
          const target = item.values.find(value => value.year === year);
          return Number(target?.value || 0);
        }),
      };
    }),
  };
};

type StructureBarRow = {
  label: string;
  fullName: string;
  scopeOne: number;
  scopeTwo: number;
  scopeThree: number;
};

const buildStructureBarRows = (
  structure: EnterpriseStructureAnalysis['structure'],
): StructureBarRow[] =>
  structure.map(item => {
    const fullName = item.supplierName || '-';
    return {
      label: truncateAxisLabel(fullName),
      fullName,
      scopeOne: Number(item.scopeOne || 0),
      scopeTwo: Number(item.scopeTwo || 0),
      scopeThree: Number(item.scopeThree || 0),
    };
  });

const getEnterpriseStructureChartHeight = (supplierCount: number) => {
  const groupHeight =
    ENTERPRISE_STRUCTURE_BAR_HEIGHT * 3 + ENTERPRISE_STRUCTURE_BAR_GAP * 2;
  const rowBlock =
    supplierCount * groupHeight +
    Math.max(supplierCount - 1, 0) * ENTERPRISE_STRUCTURE_GROUP_GAP;
  return Math.max(168, 52 + rowBlock);
};

const buildEnterpriseStructureBarOption = (
  rows: StructureBarRow[],
  visibleScopes: EnterpriseScopeKey[],
) => ({
  color: ENTERPRISE_SCOPE_COLORS,
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    appendToBody: true,
    confine: true,
  },
  grid: {
    left: ENTERPRISE_STRUCTURE_AXIS_LINE_LEFT,
    right: LIFECYCLE_CHART_PLOT_RIGHT,
    top: 12,
    bottom: 40,
    containLabel: false,
  },
  yAxis: {
    type: 'category',
    data: rows.map(row => row.label),
    triggerEvent: true,
    axisTick: { show: false },
    axisLine: {
      show: true,
      lineStyle: { color: CHART_AXIS_LINE_COLOR, width: 1 },
    },
    axisLabel: {
      ...buildSupplierAxisLabelConfig('y'),
    },
  },
  xAxis: {
    type: 'value',
    name: I18N.template(I18N.supplyChain2.emissionsUnit, { val1: 'tCO₂e' }),
    nameLocation: 'middle',
    nameGap: 28,
    nameTextStyle: {
      color: CHART_AXIS_NAME_COLOR,
      fontSize: CHART_AXIS_LABEL_FONT_SIZE,
    },
    axisLabel: {
      color: CHART_AXIS_COLOR,
      margin: 8,
      fontSize: CHART_AXIS_LABEL_FONT_SIZE,
      lineHeight: 20,
    },
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: {
      showMinLine: false,
      lineStyle: { color: CHART_SPLIT_LINE, width: 1 },
    },
  },
  series: [
    visibleScopes.includes('scopeOne') && {
      name: I18N.supplyChain2.scopeOne,
      type: 'bar',
      barWidth: ENTERPRISE_STRUCTURE_BAR_HEIGHT,
      barMaxWidth: ENTERPRISE_STRUCTURE_BAR_HEIGHT,
      barGap: ENTERPRISE_STRUCTURE_BAR_GAP_RATIO,
      barCategoryGap: `${ENTERPRISE_STRUCTURE_GROUP_GAP}px`,
      itemStyle: {
        color: ENTERPRISE_SCOPE_COLORS[0],
        borderRadius: [0, 8, 8, 0],
      },
      data: rows.map(row => row.scopeOne),
    },
    visibleScopes.includes('scopeTwo') && {
      name: I18N.supplyChain2.scopeTwo,
      type: 'bar',
      barWidth: ENTERPRISE_STRUCTURE_BAR_HEIGHT,
      barMaxWidth: ENTERPRISE_STRUCTURE_BAR_HEIGHT,
      barGap: ENTERPRISE_STRUCTURE_BAR_GAP_RATIO,
      barCategoryGap: `${ENTERPRISE_STRUCTURE_GROUP_GAP}px`,
      itemStyle: {
        color: ENTERPRISE_SCOPE_COLORS[1],
        borderRadius: [0, 8, 8, 0],
      },
      data: rows.map(row => row.scopeTwo),
    },
    visibleScopes.includes('scopeThree') && {
      name: I18N.supplyChain2.scopeThree,
      type: 'bar',
      barWidth: ENTERPRISE_STRUCTURE_BAR_HEIGHT,
      barMaxWidth: ENTERPRISE_STRUCTURE_BAR_HEIGHT,
      barGap: ENTERPRISE_STRUCTURE_BAR_GAP_RATIO,
      barCategoryGap: `${ENTERPRISE_STRUCTURE_GROUP_GAP}px`,
      itemStyle: {
        color: ENTERPRISE_SCOPE_COLORS[2],
        borderRadius: [0, 8, 8, 0],
      },
      data: rows.map(row => row.scopeThree),
    },
  ].filter(Boolean),
});

const DEFAULT_LIFECYCLE_SELECTED_COUNT = 3;

const sourceTypeColors: Record<number, string> = {
  1: '#0CBF9F',
  2: '#83E5CA',
  3: '#37B1EC',
  4: '#87D4FF',
  5: '#AA92EF',
  6: '#C2B0FB',
  7: '#E57EA9',
  22: '#F4A1C2',
  21: '#E48B4B',
  23: '#F3AB7C',
};

const MetricCard: FC<{
  label: string;
  value: number;
  tone: 'blue' | 'green';
  icon: string;
}> = ({ label, value, tone, icon }) => {
  const { locale } = useContext(LocaleContext);
  return (
    <div
      className={`${styles.metricCard} ${
        styles[`metric${tone[0].toUpperCase()}${tone.slice(1)}`]
      }`}
    >
      <div>
        <div className={styles.metricLabel}>{label}</div>
        <div className={styles.metricValue}>
          {new Intl.NumberFormat(
            locale === LocaleType.enUS ? 'en-US' : 'zh-CN',
            { maximumFractionDigits: 2 },
          ).format(value || 0)}
        </div>
      </div>
      <img className={styles.metricIcon} src={icon} alt='' />
    </div>
  );
};

const SupplierFilterPanel: FC<{
  suppliers: DashboardSupplier[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}> = ({ suppliers, selectedIds, onChange }) => {
  const [keyword, setKeyword] = useState('');
  const [expanded, setExpanded] = useState(true);
  const filteredSuppliers = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return suppliers;
    }
    return suppliers.filter(item =>
      item.name.toLowerCase().includes(normalizedKeyword),
    );
  }, [keyword, suppliers]);

  const filteredSupplierIds = filteredSuppliers.map(item => item.id);
  const selectedFilteredCount = filteredSupplierIds.filter(id =>
    selectedIds.includes(id),
  ).length;
  const allSelected =
    filteredSupplierIds.length > 0 &&
    selectedFilteredCount === filteredSupplierIds.length;

  const toggleSupplier = (supplierId: number, checked: boolean) => {
    const next = checked
      ? [...selectedIds, supplierId]
      : selectedIds.filter(id => id !== supplierId);
    onChange(Array.from(new Set(next)));
  };

  return (
    <aside
      className={`${styles.supplierPanel} ${
        expanded ? '' : styles.supplierPanelCollapsed
      }`}
    >
      <div className={styles.supplierPanelTitle}>
        {expanded ? (
          <span className={styles.supplierPanelTitleText}>
            <img
              className={styles.supplierTitleIcon}
              src='/supply-dashboard/supplier-select.svg'
              alt=''
            />
            {I18N.supplyChain2.suppliersInComparison}
          </span>
        ) : null}
        <button
          type='button'
          className={styles.supplierExpandButton}
          aria-expanded={expanded}
          aria-label={expanded ? '收起供应商列表' : '展开供应商列表'}
          onClick={() => setExpanded(current => !current)}
        >
          <img
            className={`${styles.supplierExpandIcon} ${
              expanded ? styles.supplierExpandIconRotated : ''
            }`}
            src='/supply-dashboard/supplier-expand.svg'
            alt=''
          />
        </button>
      </div>
      <div className={styles.supplierPanelBody} hidden={!expanded}>
        <Input
          allowClear
          className={styles.searchInput}
          suffix={
            <img
              className={styles.searchIcon}
              src='/supply-dashboard/supplier-search.svg'
              alt=''
            />
          }
          placeholder={I18N.supplyChain2.searchSuppliers}
          maxLength={100}
          value={keyword}
          onChange={event => setKeyword(event.target.value)}
        />
        <div className={styles.selectAllRow}>
          <Checkbox
            checked={allSelected}
            indeterminate={!allSelected && selectedFilteredCount > 0}
            onChange={event =>
              onChange(
                event.target.checked
                  ? Array.from(
                      new Set([...selectedIds, ...filteredSupplierIds]),
                    )
                  : selectedIds.filter(id => !filteredSupplierIds.includes(id)),
              )
            }
          >
            {I18N.supplyChain2.selectAll}
          </Checkbox>
          <span>
            {selectedIds.length}/{filteredSuppliers.length}
          </span>
        </div>
        <div className={styles.supplierList}>
          {filteredSuppliers.map(item => {
            const checkboxId = `supply-dashboard-supplier-${item.id}`;
            return (
              <label
                className={`${styles.supplierItem} ${
                  selectedIds.includes(item.id)
                    ? styles.supplierItemSelected
                    : ''
                }`}
                htmlFor={checkboxId}
                key={item.id}
              >
                <Checkbox
                  id={checkboxId}
                  checked={selectedIds.includes(item.id)}
                  onChange={event =>
                    toggleSupplier(item.id, event.target.checked)
                  }
                />
                <span title={item.name}>{item.name}</span>
              </label>
            );
          })}
          {!filteredSuppliers.length && (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={I18N.supplyChain2.noSuppliers}
            />
          )}
        </div>
      </div>
    </aside>
  );
};

const ChartPanel: FC<{
  title: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, extra, children, className }) => (
  <section className={`${styles.chartPanel} ${className || ''}`}>
    <div className={styles.panelHeader}>
      <div className={styles.panelTitle}>{title}</div>
      {extra}
    </div>
    {children}
  </section>
);

const ChartLegend: FC<{
  className?: string;
  items: Array<{
    key: string;
    label: string;
    color: string;
    shape?: 'dot' | 'line';
  }>;
  selectable?: boolean;
  selectedKeys?: string[];
  onToggle?: (key: string) => void;
}> = ({
  className,
  items,
  selectable = false,
  selectedKeys = [],
  onToggle,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const updateScrollState = useCallback(() => {
    const viewport = viewportRef.current;
    const list = listRef.current;
    if (!viewport || !list) {
      return;
    }
    const overflowing = list.scrollWidth > viewport.clientWidth + 1;
    setIsOverflowing(overflowing);
    setCanScrollLeft(list.scrollLeft > 0);
    setCanScrollRight(
      list.scrollLeft + list.clientWidth < list.scrollWidth - 1,
    );
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const list = listRef.current;
    if (!viewport || !list) {
      return undefined;
    }
    updateScrollState();
    list.addEventListener('scroll', updateScrollState);
    window.addEventListener('resize', updateScrollState);
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(viewport);
    observer.observe(list);
    return () => {
      list.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
      observer.disconnect();
    };
  }, [items, updateScrollState]);

  const scroll = (distance: number) =>
    listRef.current?.scrollBy({ left: distance, behavior: 'smooth' });
  const renderMarker = (item: { color: string; shape?: 'dot' | 'line' }) =>
    item.shape === 'line' ? (
      <span
        className={styles.chartLegendLineMarker}
        style={{ ['--legend-color' as string]: item.color }}
        aria-hidden
      />
    ) : (
      <i
        className={styles.chartLegendDot}
        style={{ backgroundColor: item.color }}
      />
    );
  return (
    <div
      className={`${styles.chartLegend} ${
        isOverflowing
          ? styles.chartLegendScrollable
          : styles.chartLegendCentered
      } ${className || ''}`}
    >
      {isOverflowing && (
        <button
          type='button'
          className={styles.legendArrow}
          aria-label={I18N.supplyChain2.previous}
          disabled={!canScrollLeft}
          onClick={() => scroll(-180)}
        >
          <LeftOutlined />
        </button>
      )}
      <div className={styles.chartLegendViewport} ref={viewportRef}>
        <div className={styles.chartLegendItems} ref={listRef}>
          {items.map(item =>
            selectable ? (
              <button
                type='button'
                className={`${styles.chartLegendItem} ${
                  styles.chartLegendItemButton
                } ${
                  selectedKeys.includes(item.key)
                    ? styles.chartLegendItemSelected
                    : ''
                }`}
                aria-pressed={selectedKeys.includes(item.key)}
                key={item.key}
                onClick={() => onToggle?.(item.key)}
              >
                {renderMarker(item)}
                <span>{item.label}</span>
              </button>
            ) : (
              <span className={styles.chartLegendItem} key={item.key}>
                {renderMarker(item)}
                <span>{item.label}</span>
              </span>
            ),
          )}
        </div>
      </div>
      {isOverflowing && (
        <button
          type='button'
          className={styles.legendArrow}
          aria-label={I18N.supplyChain2.next}
          disabled={!canScrollRight}
          onClick={() => scroll(180)}
        >
          <RightOutlined />
        </button>
      )}
    </div>
  );
};

const emissionTypeLabel = (type: ProductEmissionType) => {
  if ([9, 10, 11].includes(type.code) && type.name) {
    return type.name;
  }
  const labels: Record<number, string> = {
    1: I18N.supplyChain2.emissionTypeMain,
    2: I18N.supplyChain2.emissionTypeAssistant,
    3: I18N.supplyChain2.emissionTypePackaging,
    4: I18N.supplyChain2.emissionTypeRecycle,
    5: I18N.supplyChain2.emissionTypeEnergy,
    6: I18N.supplyChain2.emissionTypeWater,
    7: I18N.supplyChain2.emissionTypeTrans,
    22: I18N.supplyChain2.emissionTypeWasteWater,
    21: I18N.supplyChain2.emissionTypeWasteGas,
    23: I18N.supplyChain2.emissionTypeWasteSolid,
    8: I18N.supplyChain2.emissionTypeProcess,
    9: I18N.supplyChain2.emissionTypeUse,
    10: I18N.supplyChain2.emissionTypeWasteDisposal,
    24: I18N.supplyChain2.emissionTypeWasteRecycle,
    41: I18N.supplyChain2.emissionTypeOthers,
  };
  return labels[type.code] || type.name;
};

const sourceTypeNameCodes: Record<string, number> = {
  主料: 1,
  辅料: 2,
  包装材料: 3,
  再生材料: 4,
  能耗: 5,
  水耗: 6,
  运输: 7,
  废水: 22,
  废气: 21,
  固体废弃物: 23,
  加工: 8,
  使用: 9,
  废弃处置: 10,
  可再生废料: 24,
  其他: 41,
};

const getSourceTypesFromSources = (
  sources: ProductAnalysis['sources'] | undefined,
): ProductEmissionType[] => {
  if (!Array.isArray(sources)) {
    return [];
  }
  const types = new Map<number, ProductEmissionType>();
  sources.forEach(item => {
    if (!item || Number(item.emission) <= 0) {
      return;
    }
    const code =
      typeof item.type === 'number'
        ? item.type
        : sourceTypeNameCodes[item.name];
    if (typeof code !== 'number') {
      return;
    }
    types.set(code, {
      code,
      name: emissionTypeLabel({ code, name: item.name }),
    });
  });
  return Array.from(types.values());
};

const lifecycleLabel = (name: string) =>
  ({
    原材料获取: I18N.supplyChain2.lifecycleRawMaterial,
    生产制造: I18N.supplyChain2.lifecycleManufacturing,
    分销存储: I18N.supplyChain2.lifecycleDistribution,
    分销和储存: I18N.supplyChain2.lifecycleDistribution,
    产品使用: I18N.supplyChain2.lifecycleUse,
    废弃处置: I18N.supplyChain2.lifecycleWaste,
  }[name] || name);

const buildProductTypeSeries = (
  rows: ProductChartRow[],
  types: ProductEmissionType[],
) =>
  types.map(type => ({
    name: emissionTypeLabel(type),
    type: 'bar',
    stack: 'emission',
    barMaxWidth: 24,
    barCategoryGap: '20%',
    itemStyle: {
      color: sourceTypeColors[type.code] || stageColors[0],
      borderRadius: 2,
    },
    data: rows.map(row => Number(row.values?.[String(type.code)] || 0)),
  }));

const buildLifecycleSeries = (
  rows: ProductChartRow[],
  stages: string[],
  allStages: string[],
) =>
  stages.map(stage => {
    const colorIndex = Math.max(allStages.indexOf(stage), 0);
    return {
      name: lifecycleLabel(stage),
      type: 'bar',
      stack: 'emission',
      barMaxWidth: 24,
      barCategoryGap: 24,
      itemStyle: {
        color: stageColors[colorIndex % stageColors.length],
        borderRadius: 2,
      },
      data: rows.map(row => Number(row.values?.[stage] || 0)),
    };
  });

const ProductAnalysisView: FC = () => {
  const [suppliers, setSuppliers] = useState<DashboardSupplier[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<number[]>([]);
  const [sourceProducts, setSourceProducts] = useState<DashboardProduct[]>([]);
  const [lifecycleProducts, setLifecycleProducts] = useState<
    DashboardProduct[]
  >([]);
  const [sourceProductId, setSourceProductId] = useState<number>();
  const [lifecycleProductId, setLifecycleProductId] = useState<number>();
  const [sourceAnalysis, setSourceAnalysis] = useState<ProductAnalysis>();
  const [lifecycleAnalysis, setLifecycleAnalysis] = useState<ProductAnalysis>();
  const [selectedSourceTypeCodes, setSelectedSourceTypeCodes] = useState<
    number[]
  >([]);
  const [selectedLifecycleStageKeys, setSelectedLifecycleStageKeys] = useState<
    string[]
  >([]);
  const [loading, setLoading] = useState(false);
  const sourceChartWrapRef = useRef<HTMLDivElement>(null);
  const lifecycleChartWrapRef = useRef<HTMLDivElement>(null);
  const [supplierAxisTip, setSupplierAxisTip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const [lifecycleAxisTip, setLifecycleAxisTip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const sourceChartRef = useRef<ReactECharts>(null);

  useEffect(() => {
    getDashboardSuppliers({ analysisType: 'PRODUCT' }).then(({ data }) => {
      const nextSuppliers = data.data || [];
      setSuppliers(nextSuppliers);
      setSelectedSupplierIds(nextSuppliers.map(item => item.id));
    });
  }, []);

  useEffect(() => {
    if (!selectedSupplierIds.length) {
      setSourceProducts([]);
      setLifecycleProducts([]);
      setSourceProductId(undefined);
      setLifecycleProductId(undefined);
      return;
    }
    Promise.all([
      getDashboardProductOptions({
        supplierIds: selectedSupplierIds,
        excludeManual: true,
      }),
      getDashboardProductOptions({
        supplierIds: selectedSupplierIds,
        excludeManual: false,
      }),
    ]).then(([sourceResponse, lifecycleResponse]) => {
      const nextSourceProducts = sourceResponse.data.data || [];
      const nextLifecycleProducts = lifecycleResponse.data.data || [];
      setSourceProducts(nextSourceProducts);
      setLifecycleProducts(nextLifecycleProducts);
      setSourceProductId(current =>
        current && nextSourceProducts.some(item => item.id === current)
          ? current
          : nextSourceProducts[0]?.id,
      );
      setLifecycleProductId(current =>
        current && nextLifecycleProducts.some(item => item.id === current)
          ? current
          : nextLifecycleProducts[0]?.id,
      );
    });
  }, [selectedSupplierIds]);

  useEffect(() => {
    if (!selectedSupplierIds.length) {
      setSourceAnalysis(undefined);
      setLifecycleAnalysis(undefined);
      return;
    }
    if (!sourceProductId && !lifecycleProductId) {
      setSourceAnalysis(undefined);
      setLifecycleAnalysis(undefined);
      return;
    }
    setLoading(true);
    Promise.all([
      sourceProductId
        ? getDashboardProductTypeAnalysis({
            supplierIds: selectedSupplierIds,
            purchaseGoodsId: sourceProductId,
          })
        : Promise.resolve(undefined),
      lifecycleProductId
        ? getDashboardProductLifecycleAnalysis({
            supplierIds: selectedSupplierIds,
            purchaseGoodsId: lifecycleProductId,
          })
        : Promise.resolve(undefined),
    ])
      .then(([sourceResponse, lifecycleResponse]) => {
        setSourceAnalysis(sourceResponse?.data.data);
        setLifecycleAnalysis(lifecycleResponse?.data.data);
      })
      .finally(() => setLoading(false));
  }, [lifecycleProductId, selectedSupplierIds, sourceProductId]);

  const toProductOptions = (items: DashboardProduct[]) =>
    items.map(item => ({
      label: `${item.name}${
        item.specification ? ` · ${item.specification}` : ''
      }`,
      value: item.id,
    }));
  const sourceProductOptions = toProductOptions(sourceProducts);
  const lifecycleProductOptions = toProductOptions(lifecycleProducts);
  const sourceRows = sourceAnalysis?.sourceChart || [];
  const lifecycleRows = lifecycleAnalysis?.lifecycleChart || [];
  const sourceTypes = getSourceTypesFromSources(sourceAnalysis?.sources);
  const sourceTypeSignature = sourceTypes.map(type => type.code).join(',');
  const lifecycleStages = lifecycleAnalysis?.lifecycleStages || [];
  const lifecycleStageSignature = lifecycleStages.join(',');
  const sourceSupplierFullNames = useMemo(
    () => sourceRows.map(item => item.supplierName || '-'),
    [sourceRows],
  );
  const sourceSupplierDisplayNames = useMemo(
    () => buildSupplierDisplayNames(sourceSupplierFullNames),
    [sourceSupplierFullNames],
  );
  const lifecycleSupplierFullNames = useMemo(
    () => lifecycleRows.map(item => item.supplierName || '-'),
    [lifecycleRows],
  );
  const lifecycleSupplierDisplayNames = useMemo(
    () => buildSupplierDisplayNames(lifecycleSupplierFullNames),
    [lifecycleSupplierFullNames],
  );
  const sourceChartEvents = useMemo(
    () =>
      createAxisLabelTooltipHandlers(
        () => sourceChartWrapRef.current,
        setSupplierAxisTip,
        'xAxis',
        (_value, index) => sourceSupplierFullNames[index ?? 0] ?? _value,
      ),
    [sourceSupplierFullNames],
  );
  const lifecycleChartEvents = useMemo(
    () =>
      createAxisLabelTooltipHandlers(
        () => lifecycleChartWrapRef.current,
        setLifecycleAxisTip,
        'yAxis',
        (_value, index) => lifecycleSupplierFullNames[index ?? 0] ?? _value,
      ),
    [lifecycleSupplierFullNames],
  );
  const lifecycleChartMinWidth = useMemo(() => getLifecycleChartMinWidth(), []);
  const productUnit = 'kgCO₂e';
  const lifecycleProductUnit = 'kgCO₂e';
  const lifecycleLegendItems = lifecycleStages.map((stage, index) => ({
    key: stage,
    label: lifecycleLabel(stage),
    color: stageColors[index % stageColors.length],
  }));
  const activeLifecycleStages = lifecycleStages.filter(stage =>
    selectedLifecycleStageKeys.includes(stage),
  );
  const visibleSourceTypes = sourceTypes.filter(type =>
    selectedSourceTypeCodes.includes(type.code),
  );

  useEffect(() => {
    setSelectedSourceTypeCodes(sourceTypes.map(type => type.code));
  }, [sourceTypeSignature]);

  useEffect(() => {
    setSelectedLifecycleStageKeys(
      lifecycleStages.slice(0, DEFAULT_LIFECYCLE_SELECTED_COUNT),
    );
  }, [lifecycleStageSignature]);

  return (
    <div className={styles.analysisLayout}>
      <SupplierFilterPanel
        suppliers={suppliers}
        selectedIds={selectedSupplierIds}
        onChange={setSelectedSupplierIds}
      />
      <Spin spinning={loading}>
        <div className={styles.chartStack}>
          <ChartPanel
            className={styles.productChartPanel}
            title={I18N.supplyChain2.supplierProductEmissionTypeAnalysis}
            extra={
              <Select
                className={styles.chartSelect}
                value={sourceProductId}
                options={sourceProductOptions}
                placeholder={I18N.supplyChain2.selectProduct}
                onChange={setSourceProductId}
              />
            }
          >
            <ChartLegend
              items={sourceTypes.map(type => ({
                key: String(type.code),
                label: type.name,
                color: sourceTypeColors[type.code] || stageColors[0],
              }))}
              selectable
              selectedKeys={selectedSourceTypeCodes.map(String)}
              onToggle={key => {
                const code = Number(key);
                setSelectedSourceTypeCodes(current =>
                  current.includes(code)
                    ? current.filter(item => item !== code)
                    : [...current, code],
                );
              }}
            />
            {!sourceAnalysis || !sourceRows.length ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={I18N.supplyChain2.noData}
              />
            ) : (
              <div className={styles.chartWithAxisTip} ref={sourceChartWrapRef}>
                <ReactECharts
                  notMerge
                  ref={sourceChartRef}
                  className={styles.productChart}
                  onEvents={sourceChartEvents}
                  style={{ height: getSourceChartHeight() }}
                  option={{
                    color: stageColors,
                    tooltip: {
                      trigger: 'axis',
                      axisPointer: { type: 'shadow' },
                    },
                    grid: {
                      left: SOURCE_CHART_PLOT_LEFT,
                      right: SOURCE_CHART_PLOT_RIGHT,
                      top: 11,
                      bottom: 31,
                      containLabel: false,
                    },
                    xAxis: {
                      type: 'category',
                      data: sourceSupplierDisplayNames,
                      triggerEvent: true,
                      axisLabel: buildSupplierAxisLabelConfig('x'),
                      axisTick: { alignWithLabel: true, show: false },
                      axisLine: { show: false },
                    },
                    yAxis: {
                      type: 'value',
                      name: I18N.template(I18N.supplyChain2.emissionsUnit, {
                        val1: productUnit,
                      }),
                      nameLocation: 'middle',
                      nameGap: 50,
                      nameRotate: 90,
                      nameTextStyle: {
                        color: CHART_AXIS_NAME_COLOR,
                        fontSize: 12,
                        align: 'center',
                      },
                      axisLabel: {
                        color: CHART_AXIS_COLOR,
                        fontSize: 12,
                        lineHeight: 20,
                        align: 'right',
                        margin: 8,
                        width: 28,
                      },
                      splitLine: {
                        lineStyle: { color: CHART_SPLIT_LINE, width: 1 },
                      },
                    },
                    series: buildProductTypeSeries(
                      sourceRows,
                      visibleSourceTypes,
                    ),
                  }}
                />
                {supplierAxisTip ? (
                  <div
                    className={styles.axisLabelTip}
                    style={{ left: supplierAxisTip.x, top: supplierAxisTip.y }}
                  >
                    {supplierAxisTip.text}
                  </div>
                ) : null}
              </div>
            )}
          </ChartPanel>
          <ChartPanel
            className={styles.lifecycleChartPanel}
            title={I18N.supplyChain2.supplierProductEmissionRanking}
            extra={
              <Select
                className={styles.chartSelect}
                value={lifecycleProductId}
                options={lifecycleProductOptions}
                placeholder={I18N.supplyChain2.selectProduct}
                onChange={setLifecycleProductId}
              />
            }
          >
            <ChartLegend
              className={styles.lifecycleChartLegend}
              items={lifecycleLegendItems}
              selectable
              selectedKeys={selectedLifecycleStageKeys}
              onToggle={key => {
                setSelectedLifecycleStageKeys(current =>
                  current.includes(key)
                    ? current.filter(item => item !== key)
                    : [...current, key],
                );
              }}
            />
            {!lifecycleAnalysis || !lifecycleRows.length ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={I18N.supplyChain2.noData}
              />
            ) : (
              <div
                className={styles.chartWithAxisTip}
                ref={lifecycleChartWrapRef}
              >
                <div className={styles.lifecycleChartScroll}>
                  <ReactECharts
                    notMerge
                    className={styles.lifecycleChart}
                    onEvents={lifecycleChartEvents}
                    style={{
                      height: getLifecycleChartHeight(lifecycleRows.length),
                      minWidth: lifecycleChartMinWidth,
                    }}
                    option={{
                      color: stageColors,
                      tooltip: {
                        trigger: 'axis',
                        axisPointer: { type: 'shadow' },
                        appendToBody: true,
                        confine: false,
                        extraCssText: 'z-index: 1000;',
                      },
                      grid: {
                        left: 8,
                        right: LIFECYCLE_CHART_PLOT_RIGHT,
                        top: 12,
                        bottom: 40,
                        containLabel: true,
                      },
                      yAxis: {
                        type: 'category',
                        data: lifecycleSupplierDisplayNames,
                        triggerEvent: true,
                        axisLabel: buildSupplierAxisLabelConfig('y'),
                        axisTick: { show: false },
                        axisLine: { show: false },
                      },
                      xAxis: {
                        type: 'value',
                        name: I18N.template(I18N.supplyChain2.emissionsUnit, {
                          val1: lifecycleProductUnit,
                        }),
                        nameLocation: 'middle',
                        nameGap: 28,
                        nameTextStyle: {
                          color: CHART_AXIS_NAME_COLOR,
                          fontSize: 12,
                        },
                        axisLabel: {
                          color: CHART_AXIS_COLOR,
                          margin: 8,
                          fontSize: 12,
                          lineHeight: 20,
                        },
                        splitLine: {
                          lineStyle: { color: CHART_SPLIT_LINE, width: 1 },
                        },
                      },
                      series: buildLifecycleSeries(
                        lifecycleRows,
                        activeLifecycleStages,
                        lifecycleStages,
                      ),
                    }}
                  />
                </div>
                {lifecycleAxisTip ? (
                  <div
                    className={styles.axisLabelTip}
                    style={{
                      left: lifecycleAxisTip.x,
                      top: lifecycleAxisTip.y,
                    }}
                  >
                    {lifecycleAxisTip.text}
                  </div>
                ) : null}
              </div>
            )}
          </ChartPanel>
        </div>
      </Spin>
    </div>
  );
};

const EnterpriseAnalysisView: FC = () => {
  const [suppliers, setSuppliers] = useState<DashboardSupplier[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<number[]>([]);
  const [years, setYears] = useState<EnterpriseYearOption[]>([]);
  const [structureYear, setStructureYear] = useState<string>();
  const [scopeTrendYears, setScopeTrendYears] = useState<5 | 10 | 15>(5);
  const [supplierTrendYears, setSupplierTrendYears] = useState<5 | 10 | 15>(5);
  const [scope, setScope] = useState('ALL');
  const [trendAnalysis, setTrendAnalysis] = useState<EnterpriseTrendAnalysis>();
  const [structureAnalysis, setStructureAnalysis] =
    useState<EnterpriseStructureAnalysis>();
  const [supplierTrendAnalysis, setSupplierTrendAnalysis] =
    useState<EnterpriseSupplierTrendAnalysis>();
  const [selectedTrendSupplierKeys, setSelectedTrendSupplierKeys] = useState<
    string[]
  >([]);
  const [selectedTrendScopeKeys, setSelectedTrendScopeKeys] = useState<
    EnterpriseScopeKey[]
  >(['scopeOne', 'scopeTwo', 'scopeThree']);
  const [selectedStructureScopeKeys, setSelectedStructureScopeKeys] = useState<
    EnterpriseScopeKey[]
  >(['scopeOne', 'scopeTwo', 'scopeThree']);
  const [loading, setLoading] = useState(false);
  const pendingEnterpriseRequestsRef = useRef(0);
  const structureChartWrapRef = useRef<HTMLDivElement>(null);
  const [structureAxisTip, setStructureAxisTip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    getDashboardSuppliers({ analysisType: 'ENTERPRISE' }).then(({ data }) => {
      const nextSuppliers = data.data || [];
      setSuppliers(nextSuppliers);
      setSelectedSupplierIds(nextSuppliers.map(item => item.id));
    });
  }, []);

  useEffect(() => {
    if (!selectedSupplierIds.length) {
      setYears([]);
      setStructureYear(undefined);
      return;
    }
    getDashboardEnterpriseOptions({ supplierIds: selectedSupplierIds }).then(
      ({ data }) => {
        const options = data.data || [];
        const sortedOptions = [...options].sort((left, right) =>
          right.year.localeCompare(left.year),
        );
        setYears(sortedOptions);
        setStructureYear(current =>
          current && sortedOptions.some(option => option.year === current)
            ? current
            : sortedOptions[0]?.year,
        );
      },
    );
  }, [selectedSupplierIds]);

  useEffect(() => {
    if (!selectedSupplierIds.length) {
      setTrendAnalysis(undefined);
      return;
    }
    let cancelled = false;
    pendingEnterpriseRequestsRef.current += 1;
    setLoading(true);
    getDashboardEnterpriseTrend({
      supplierIds: selectedSupplierIds,
      trendYears: scopeTrendYears,
    })
      .then(trendResult => {
        if (cancelled) {
          return;
        }
        setTrendAnalysis(trendResult.data.data);
      })
      .finally(() => {
        pendingEnterpriseRequestsRef.current -= 1;
        if (pendingEnterpriseRequestsRef.current === 0) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSupplierIds, scopeTrendYears]);

  useEffect(() => {
    if (!selectedSupplierIds.length) {
      setSupplierTrendAnalysis(undefined);
      return;
    }
    let cancelled = false;
    pendingEnterpriseRequestsRef.current += 1;
    setLoading(true);
    getDashboardEnterpriseSupplierTrend({
      supplierIds: selectedSupplierIds,
      trendYears: supplierTrendYears,
      scope,
    })
      .then(supplierTrendResult => {
        if (cancelled) {
          return;
        }
        setSupplierTrendAnalysis(supplierTrendResult.data.data);
      })
      .finally(() => {
        pendingEnterpriseRequestsRef.current -= 1;
        if (pendingEnterpriseRequestsRef.current === 0) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [scope, selectedSupplierIds, supplierTrendYears]);

  useEffect(() => {
    if (!selectedSupplierIds.length) {
      setStructureAnalysis(undefined);
      return;
    }
    getDashboardEnterpriseStructure({
      supplierIds: selectedSupplierIds,
      structureYear,
    }).then(({ data }) => setStructureAnalysis(data.data));
  }, [structureYear, selectedSupplierIds]);

  const structureOptions = years.map(item => ({
    label: item.year,
    value: item.year,
  }));
  const trendYearOptions = [5, 10, 15].map(value => ({
    label: I18N.template(I18N.supplyChain2.recentYears, { val1: value }),
    value,
  }));
  const scopeOptions = [
    { label: I18N.supplyChain2.all, value: 'ALL' },
    { label: I18N.supplyChain2.scopeOne, value: 'SCOPE_ONE' },
    { label: I18N.supplyChain2.scopeTwo, value: 'SCOPE_TWO' },
    { label: I18N.supplyChain2.scopeThree, value: 'SCOPE_THREE' },
    { label: I18N.supplyChain2.scopeOneTwo, value: 'SCOPE_ONE_TWO' },
  ];
  const structure = structureAnalysis?.structure || [];
  const scopeTrend = getEnterpriseScopeTrend(trendAnalysis);
  const supplierTrend = supplierTrendAnalysis?.supplierTrend || [];
  const allScopeKeys = getVisibleEnterpriseScopes('ALL');
  const structureBarRows = useMemo(
    () => buildStructureBarRows(structure),
    [structure],
  );
  const structureChartMinWidth = useMemo(() => getLifecycleChartMinWidth(), []);
  const structureChartEvents = useMemo(
    () =>
      createAxisLabelTooltipHandlers(
        () => structureChartWrapRef.current,
        setStructureAxisTip,
        'yAxis',
        (_value, index) => structureBarRows[index ?? 0]?.fullName ?? _value,
      ),
    [structureBarRows],
  );
  const scopeLegendItems = buildEnterpriseScopeLegendItems(allScopeKeys);
  const hasScopeTrend = scopeTrend.length > 0;
  const supplierLegendItems = buildSupplierTrendLegendItems(supplierTrend);
  const hasSupplierTrend = supplierTrend.length > 0;

  useEffect(() => {
    const keys = supplierTrend.map(item => String(item.supplierId));
    setSelectedTrendSupplierKeys(current => {
      const retained = current.filter(key => keys.includes(key));
      return retained.length ? retained : keys;
    });
  }, [supplierTrend]);

  const toggleTrendSupplier = (key: string) => {
    setSelectedTrendSupplierKeys(current =>
      current.includes(key)
        ? current.filter(item => item !== key)
        : [...current, key],
    );
  };

  const toggleTrendScopeKey = (key: string) => {
    setSelectedTrendScopeKeys(current =>
      current.includes(key as EnterpriseScopeKey)
        ? current.filter(item => item !== key)
        : [...current, key as EnterpriseScopeKey],
    );
  };

  const toggleStructureScopeKey = (key: string) => {
    setSelectedStructureScopeKeys(current =>
      current.includes(key as EnterpriseScopeKey)
        ? current.filter(item => item !== key)
        : [...current, key as EnterpriseScopeKey],
    );
  };

  const activeTrendScopeKeys = allScopeKeys.filter(key =>
    selectedTrendScopeKeys.includes(key),
  );
  const activeStructureScopeKeys = allScopeKeys.filter(key =>
    selectedStructureScopeKeys.includes(key),
  );

  return (
    <div className={styles.analysisLayout}>
      <SupplierFilterPanel
        suppliers={suppliers}
        selectedIds={selectedSupplierIds}
        onChange={setSelectedSupplierIds}
      />
      <Spin spinning={loading}>
        <div className={styles.chartStack}>
          <ChartPanel
            className={styles.enterpriseChartPanel}
            title={I18N.supplyChain2.supplierEnterpriseEmissionTrend}
            extra={
              <Select
                className={`${styles.chartSelect} ${styles.enterpriseTrendSelect}`}
                value={scopeTrendYears}
                options={trendYearOptions}
                onChange={value => setScopeTrendYears(value as 5 | 10 | 15)}
              />
            }
          >
            <ChartLegend
              className={styles.enterpriseChartLegend}
              items={scopeLegendItems}
              selectable
              selectedKeys={selectedTrendScopeKeys}
              onToggle={toggleTrendScopeKey}
            />
            {!hasScopeTrend ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={I18N.supplyChain2.noData}
              />
            ) : (
              <ReactECharts
                notMerge
                className={styles.enterpriseChart}
                style={{ height: ENTERPRISE_CHART_HEIGHT }}
                option={buildEnterpriseScopeBarOption(
                  scopeTrend,
                  activeTrendScopeKeys,
                )}
              />
            )}
          </ChartPanel>
          <ChartPanel
            className={styles.enterpriseChartPanel}
            title={I18N.supplyChain2.supplierEnterpriseStructureComparison}
            extra={
              <Select
                className={`${styles.chartSelect} ${styles.enterpriseYearSelect}`}
                value={structureYear}
                options={structureOptions}
                placeholder={I18N.supplyChain2.selectYear}
                onChange={setStructureYear}
              />
            }
          >
            <ChartLegend
              className={styles.enterpriseChartLegend}
              items={scopeLegendItems.map(item => ({
                ...item,
                shape: 'dot' as const,
              }))}
              selectable
              selectedKeys={selectedStructureScopeKeys}
              onToggle={toggleStructureScopeKey}
            />
            {!structure.length ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={I18N.supplyChain2.noData}
              />
            ) : (
              <div
                className={styles.chartWithAxisTip}
                ref={structureChartWrapRef}
              >
                <div className={styles.enterpriseChartScroll}>
                  <ReactECharts
                    notMerge
                    className={styles.enterpriseChart}
                    onEvents={structureChartEvents}
                    style={{
                      height: getEnterpriseStructureChartHeight(
                        structure.length,
                      ),
                      minWidth: structureChartMinWidth,
                    }}
                    option={buildEnterpriseStructureBarOption(
                      structureBarRows,
                      activeStructureScopeKeys,
                    )}
                  />
                </div>
                {structureAxisTip ? (
                  <div
                    className={styles.axisLabelTip}
                    style={{
                      left: structureAxisTip.x,
                      top: structureAxisTip.y,
                    }}
                  >
                    {structureAxisTip.text}
                  </div>
                ) : null}
              </div>
            )}
          </ChartPanel>
          <ChartPanel
            className={styles.enterpriseChartPanel}
            title={I18N.supplyChain2.supplierEnterpriseAnnualEmissionTrend}
            extra={
              <div className={styles.chartControls}>
                <Select
                  className={`${styles.chartSelect} ${styles.enterpriseTrendSelect}`}
                  value={supplierTrendYears}
                  options={trendYearOptions}
                  onChange={value =>
                    setSupplierTrendYears(value as 5 | 10 | 15)
                  }
                />
                <Select
                  className={`${styles.chartSelect} ${styles.enterpriseScopeSelect}`}
                  value={scope}
                  options={scopeOptions}
                  onChange={setScope}
                />
              </div>
            }
          >
            <ChartLegend
              className={styles.enterpriseChartLegend}
              items={supplierLegendItems}
              selectable
              selectedKeys={selectedTrendSupplierKeys}
              onToggle={toggleTrendSupplier}
            />
            {!hasSupplierTrend ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={I18N.supplyChain2.noData}
              />
            ) : (
              <ReactECharts
                notMerge
                className={styles.enterpriseChart}
                style={{ height: ENTERPRISE_CHART_HEIGHT }}
                option={buildEnterpriseSupplierLineOption(
                  supplierTrend,
                  selectedTrendSupplierKeys,
                )}
              />
            )}
          </ChartPanel>
        </div>
      </Spin>
    </div>
  );
};

const Dashboard: FC = () => {
  const [summary, setSummary] = useState<DashboardSummary>();

  useEffect(() => {
    getDashboardSummary().then(({ data }) => setSummary(data.data));
  }, []);

  const tabItems = useMemo(
    () => [
      {
        key: 'enterprise',
        label: I18N.supplyChain2.enterpriseEmissionAnalysis,
        children: <EnterpriseAnalysisView />,
      },
      {
        key: 'product',
        label: I18N.supplyChain2.productEmissionAnalysis,
        children: <ProductAnalysisView />,
      },
    ],
    [],
  );

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1>{I18N.supplyChain2.dashboardTitle}</h1>
        <div
          className={`${styles.metricGrid} ${
            SHOW_PRODUCT_FOOTPRINT_DATA_CARD ? '' : styles.metricGridSingle
          }`}
        >
          <MetricCard
            label={I18N.supplyChain2.activeSuppliers}
            value={summary?.activeSupplierCount || 0}
            tone='blue'
            icon='/supply-dashboard/active-supplier.svg'
          />
          {SHOW_PRODUCT_FOOTPRINT_DATA_CARD ? (
            <MetricCard
              label={I18N.supplyChain2.productFootprintDataReporting}
              value={summary?.footprintDataCount || 0}
              tone='green'
              icon='/supply-dashboard/footprint-data.svg'
            />
          ) : null}
        </div>
      </header>
      <main className={styles.content}>
        <Tabs className={styles.dashboardTabs} items={tabItems} />
      </main>
    </div>
  );
};

export default Dashboard;
