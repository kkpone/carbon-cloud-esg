import I18N from '@/lang/I18N';
import dayjs, { type Dayjs } from 'dayjs';
import type { EChartsOption } from 'echarts';

import {
  ENERGY_FLOW_ANALYSIS_STAGE,
  getEnergyFlowStageLabels,
} from './constant';
import type {
  EnergyFlowAnalysisPeriodType,
  EnergyFlowAnalysisResponse,
  EnergyFlowDecimalValue,
  EnergyFlowLink,
  EnergyFlowStage,
  EnergyFlowStageType,
} from './types';

/** 将接口中的 BigDecimal 兼容值转换为可计算的有限数字。 */
export function toEnergyFlowNumber(
  value: EnergyFlowDecimalValue | null | undefined,
) {
  if (value === null || value === undefined || value === '') return null;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

/** 按后端能流设置保留动态阶段，并补齐固定阶段名称。 */
export function normalizeEnergyFlowStages(
  stages: EnergyFlowStage[],
): EnergyFlowStage[] {
  return stages
    .filter(stage => stage.enabled)
    .map(stage => ({
      ...stage,
      stageName:
        stage.stageName?.trim() || getEnergyFlowStageLabel(stage.stageType),
    }));
}

/** 负值或零值不形成桑基边，避免把负能耗误绘制为正向流量。 */
export function positiveEnergyFlowLinks(links: EnergyFlowLink[]) {
  return links.flatMap(link => {
    const value = toEnergyFlowNumber(link.value);
    return value !== null && value > 0 ? [{ ...link, value }] : [];
  });
}

/** 将接口节点和正向边转换为 ECharts Sankey 配置。 */
export function buildEnergyFlowSankeyOption(
  response: EnergyFlowAnalysisResponse,
  colors: string[],
  mutedTextColor: string,
): EChartsOption {
  // 先按能流设置过滤关闭阶段，保证图表列与组织配置保持一致。
  const stages = normalizeEnergyFlowStages(response.stages);

  // 再过滤非正边；负值在指标和后端统计中保留，但不作为桑基流量绘制。
  const positiveLinks = positiveEnergyFlowLinks(response.links);

  // 最后按接口节点稳定 ID 组装节点，并使用阶段顺序驱动 Sankey 层级。
  const stageOrder = new Map(
    stages.map((stage, index) => [stage.stageType, index]),
  );
  const nodes = response.nodes.map(node => ({
    name: String(node.id),
    displayName: node.name?.trim() || '-',
    value: toEnergyFlowNumber(node.value),
    depth: node.stageType ? stageOrder.get(node.stageType) : undefined,
  }));

  // 建立节点 ID 到业务名称的映射，边提示只使用业务值，不把 flow-stage 等技术标识暴露给用户。
  const nodeDisplayNames = new Map(
    nodes.map(node => [node.name, node.displayName]),
  );

  return {
    color: colors,
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        if (!params || typeof params !== 'object') return '';
        const item = params as {
          dataType?: string;
          data?: {
            displayName?: string;
            sourceName?: string;
            targetName?: string;
            value?: number;
            unit?: string;
          };
          value?: number;
        };
        const value = item.data?.value ?? item.value;
        // 边提示按来源、去向和业务值组装；节点提示仍展示节点业务名称。
        if (
          item.dataType === 'edge' ||
          item.data?.sourceName ||
          item.data?.targetName
        ) {
          const sourceName = item.data?.sourceName || '-';
          const targetName = item.data?.targetName || '-';
          return `${sourceName} → ${targetName}<br/>${
            value === undefined ? '-' : value
          } tce`;
        }
        const displayName = item.data?.displayName || '-';
        return `${displayName}<br/>${value === undefined ? '-' : value} tce`;
      },
    },
    graphic: positiveLinks.length
      ? undefined
      : [
          {
            type: 'text',
            left: 'center',
            top: 'middle',
            style: {
              text: I18N.energyCarbon.analysisNoPositiveFlow,
              fill: mutedTextColor,
            },
          },
        ],
    series: [
      {
        type: 'sankey',
        left: 24,
        right: 132,
        top: 44,
        bottom: 24,
        nodeAlign: 'justify',
        nodeGap: 16,
        nodeWidth: 16,
        draggable: false,
        emphasis: { focus: 'adjacency' },
        data: nodes,
        links: positiveLinks.map(link => ({
          source: String(link.source),
          target: String(link.target),
          sourceName: nodeDisplayNames.get(String(link.source)) || '-',
          targetName: nodeDisplayNames.get(String(link.target)) || '-',
          value: link.value,
        })),
        label: {
          color: mutedTextColor,
          width: 132,
          overflow: 'truncate',
          ellipsis: '...',
          formatter: (params: unknown) => {
            if (!params || typeof params !== 'object') return '';
            const item = params as { data?: { displayName?: string } };
            return item.data?.displayName || '-';
          },
        },
        lineStyle: { color: 'gradient', opacity: 0.42, curveness: 0.5 },
      },
    ],
  };
}

/** 统一四项指标卡的显示值；缺失值保持“-”，不把缺数误报为 0。 */
export function displayEnergyFlowValue(
  value: EnergyFlowDecimalValue | null | undefined,
  fractionDigits = 6,
) {
  const normalized = toEnergyFlowNumber(value);
  if (normalized === null) return '-';
  return normalized.toLocaleString('zh-CN', {
    maximumFractionDigits: fractionDigits,
  });
}

/** 将页面周期维度归一为接口使用的自然周期起始日期。 */
export function normalizeEnergyFlowPeriodDate(
  periodType: EnergyFlowAnalysisPeriodType,
  value: Dayjs,
) {
  if (periodType === 2) return value.startOf('month').format('YYYY-MM-DD');
  if (periodType === 4) return value.startOf('year').format('YYYY-MM-DD');
  return value
    .month(Math.floor(value.month() / 3) * 3)
    .startOf('month')
    .format('YYYY-MM-DD');
}

/** 按月、季度、年度分别比较自然周期，禁止页面选择晚于当前周期的日期。 */
export function isFutureEnergyFlowPeriod(
  periodType: EnergyFlowAnalysisPeriodType,
  value: Dayjs,
  now = dayjs(),
) {
  const currentPeriod = dayjs(value);
  if (periodType === 2) {
    return currentPeriod.startOf('month').isAfter(now.startOf('month'));
  }
  if (periodType === 3) {
    const currentQuarterStart = now
      .month(Math.floor(now.month() / 3) * 3)
      .startOf('month');
    return currentPeriod
      .month(Math.floor(currentPeriod.month() / 3) * 3)
      .startOf('month')
      .isAfter(currentQuarterStart);
  }
  return currentPeriod.startOf('year').isAfter(now.startOf('year'));
}

/** 返回六个固定阶段；空数据时完整展示流程骨架，不受中间阶段开关影响。 */
export function defaultEnergyFlowStages(): EnergyFlowStage[] {
  return [1, 7, 2, 3, 4, 5, 6].map(stageType => ({
    stageType: stageType as EnergyFlowStageType,
    stageName: getEnergyFlowStageLabel(stageType as EnergyFlowStageType),
    enabled: stageType !== 7,
  }));
}

/** 将后端数值阶段编码映射为需求固定阶段文案。 */
export function getEnergyFlowStageLabel(stageType: EnergyFlowStageType) {
  const stageKeys: Record<
    EnergyFlowStageType,
    keyof ReturnType<typeof getEnergyFlowStageLabels>
  > = {
    1: ENERGY_FLOW_ANALYSIS_STAGE.ENERGY_INPUT,
    7: ENERGY_FLOW_ANALYSIS_STAGE.ENERGY_STORAGE,
    2: ENERGY_FLOW_ANALYSIS_STAGE.ENERGY_TRANSMISSION,
    3: ENERGY_FLOW_ANALYSIS_STAGE.ENERGY_CONVERSION,
    4: ENERGY_FLOW_ANALYSIS_STAGE.CONVERSION_TRANSMISSION,
    5: ENERGY_FLOW_ANALYSIS_STAGE.ENERGY_USE,
    6: ENERGY_FLOW_ANALYSIS_STAGE.USE_OR_LOSS,
  };
  return getEnergyFlowStageLabels()[stageKeys[stageType]];
}
