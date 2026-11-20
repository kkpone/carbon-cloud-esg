import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import {
  EnergyForbidden,
  useEnergySearch,
  useNavigate,
} from '@/views/energyCarbon/hooks/useEnergyNavigation';
/**
 * 业务检索：能流分析图 - 按当前组织和自然周期展示四项指标及桑基图
 * 路由：/energyCarbon/energyFlowAnalysis/analysis
 */
import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Radio,
  Spin,
  Statistic,
  Tag,
  TreeSelect,
  Typography,
  theme,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import dayjs, { type Dayjs } from 'dayjs';
import ReactECharts from 'echarts-for-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';

import AuthButton from '@/views/energyCarbon/components/AuthButton';
import PageContainer from '@/views/energyCarbon/components/PageContainer';
import { useDataPermissionOrgTree } from '@/views/energyCarbon/hooks/useEnergyOrgTree';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
import type { OrgTree } from '@/views/energyCarbon/platform/types';

import {
  ENERGY_FLOW_ANALYSIS_PAGE_PERMISSION,
  ENERGY_FLOW_ANALYSIS_PERIOD_TYPE,
  getEnergyFlowAnalysisPeriodOptions,
} from '../constant';
import { useEnergyFlowAnalysisMutation } from '../hooks';
import type {
  EnergyFlowAnalysisPeriodType,
  EnergyFlowAnalysisRequest,
  EnergyFlowAnalysisResponse,
} from '../types';
import {
  buildEnergyFlowSankeyOption,
  defaultEnergyFlowStages,
  displayEnergyFlowValue,
  getEnergyFlowStageLabel,
  isFutureEnergyFlowPeriod,
  normalizeEnergyFlowPeriodDate,
  normalizeEnergyFlowStages,
} from '../utils';

import { useLocalizedFormErrors } from '@/views/energyCarbon/hooks/useLocalizedFormErrors';
import styles from '../index.module.css';

const searchSchema = z.object({
  orgId: z.coerce.number().int().positive().optional(),
  periodType: z.coerce
    .number()
    .pipe(
      z.union([
        z.literal(ENERGY_FLOW_ANALYSIS_PERIOD_TYPE.MONTH),
        z.literal(ENERGY_FLOW_ANALYSIS_PERIOD_TYPE.QUARTER),
        z.literal(ENERGY_FLOW_ANALYSIS_PERIOD_TYPE.YEAR),
      ]),
    )
    .optional(),
  periodDate: z.string().optional(),
});

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(ENERGY_FLOW_ANALYSIS_PAGE_PERMISSION)) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <EnergyFlowAnalysisPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

interface SearchValues {
  orgId: number;
  periodType: EnergyFlowAnalysisPeriodType;
  periodDate: Dayjs;
}

/** 组织树节点只用于选择当前组织；请求始终只提交所选组织 ID，不包含下级组织。 */
function toOrganizationTreeData(nodes: OrgTree[]): DataNode[] {
  return nodes.map(node => ({
    key: String(node.id),
    value: node.id,
    title: node.name,
    children: toOrganizationTreeData(node.children ?? []),
  }));
}

/** 在可见组织树中定位当前组织，避免 URL 中的越权组织进入查询请求。 */
function findOrganization(
  nodes: OrgTree[],
  orgId: number | undefined,
): OrgTree | null {
  if (orgId === undefined) return null;
  for (const node of nodes) {
    if (node.id === orgId) return node;
    const found = findOrganization(node.children ?? [], orgId);
    if (found) return found;
  }
  return null;
}

/** 取当前页面默认周期；URL 传入的日期只作为已归一自然周期的回显值。 */
function getDefaultPeriodDate(
  periodType: EnergyFlowAnalysisPeriodType,
  periodDate?: string,
) {
  const now = dayjs();
  if (periodDate) {
    const parsed = dayjs(periodDate);
    if (
      parsed.isValid() &&
      !isFutureEnergyFlowPeriod(periodType, parsed, now)
    ) {
      return parsed;
    }
  }
  if (periodType === ENERGY_FLOW_ANALYSIS_PERIOD_TYPE.MONTH)
    return now.startOf('month');
  if (periodType === ENERGY_FLOW_ANALYSIS_PERIOD_TYPE.QUARTER) {
    return now.month(Math.floor(now.month() / 3) * 3).startOf('month');
  }
  return now.startOf('year');
}

/** 选择统计维度对应的日期控件粒度和格式。 */
function datePickerProps(periodType: EnergyFlowAnalysisPeriodType) {
  if (periodType === ENERGY_FLOW_ANALYSIS_PERIOD_TYPE.MONTH) {
    return { picker: 'month' as const, format: 'YYYY-MM' };
  }
  if (periodType === ENERGY_FLOW_ANALYSIS_PERIOD_TYPE.QUARTER) {
    return { picker: 'quarter' as const, format: 'YYYY-[Q]Q' };
  }
  return { picker: 'year' as const, format: 'YYYY' };
}

/** 能流分析图页面：组织和周期筛选驱动指标卡、动态阶段列和桑基图。 */
function EnergyFlowAnalysisPage() {
  const { locale } = useLocale();
  const [form] = Form.useForm<SearchValues>();
  useLocalizedFormErrors(form);
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const search = useEnergySearch(searchSchema);
  const { orgId, periodDate } = search;
  const periodType =
    search.periodType ?? ENERGY_FLOW_ANALYSIS_PERIOD_TYPE.MONTH;
  const hasPeriodType = search.periodType !== undefined;
  const canQuery = useMenuStore(state =>
    state.permissionKeys.has(ENERGY_FLOW_ANALYSIS_PAGE_PERMISSION),
  );
  const { data: orgTree = [], isLoading: orgLoading } =
    useDataPermissionOrgTree();
  const selectedOrg = useMemo(
    () => findOrganization(orgTree, orgId),
    [orgId, orgTree],
  );
  const orgTreeData = useMemo(() => toOrganizationTreeData(orgTree), [orgTree]);
  const { isLoading, mutateAsync, reset } = useEnergyFlowAnalysisMutation();
  const selectedPeriodType = Form.useWatch('periodType', form) ?? periodType;
  const requestSequenceRef = useRef(0);
  const [result, setResult] = useState<EnergyFlowAnalysisResponse>();
  const [queryError, setQueryError] = useState<Error | 'queryFailed' | null>(
    null,
  );

  // 先递增请求序号并清除旧状态，再调用 TanStack Mutation；只有最新序号的响应才能写入页面结果。
  const runAnalysis = useCallback(
    async (request: EnergyFlowAnalysisRequest) => {
      const requestSequence = requestSequenceRef.current + 1;
      requestSequenceRef.current = requestSequence;
      setResult(undefined);
      setQueryError(null);
      reset();
      try {
        const nextResult = await mutateAsync(request);
        // 旧组织或旧周期的请求即使晚返回，也不能覆盖当前筛选条件对应的结果。
        if (requestSequence !== requestSequenceRef.current) return;
        setResult(nextResult);
      } catch (error) {
        // 旧请求的异常同样丢弃，避免旧错误覆盖新组织或新周期的成功结果。
        if (requestSequence !== requestSequenceRef.current) return;
        setQueryError(error instanceof Error ? error : 'queryFailed');
      }
    },
    [mutateAsync, reset],
  );

  // 重置操作使当前请求失效并清除旧图；普通筛选变化保留已查询结果，查询提交后才刷新图表。
  const resetResultForResetAction = useCallback(() => {
    requestSequenceRef.current += 1;
    setResult(undefined);
    setQueryError(null);
    reset();
  }, [reset]);

  const handleFilterValuesChange = useCallback(
    (changedValues: Partial<SearchValues>) => {
      const nextPeriodType = changedValues.periodType;
      if (nextPeriodType === undefined) return;
      form.setFieldValue('periodDate', getDefaultPeriodDate(nextPeriodType));
    },
    [form],
  );

  // 组织树返回后补齐默认组织和当前自然周期；未来周期会回退到当前周期，不扩大后端统计范围。
  useEffect(() => {
    if (!orgTree.length) return;
    const defaultOrg = selectedOrg ?? orgTree[0];
    const nextDate = getDefaultPeriodDate(periodType, periodDate);
    const nextPeriodDate = normalizeEnergyFlowPeriodDate(periodType, nextDate);
    if (
      orgId !== defaultOrg.id ||
      !hasPeriodType ||
      periodDate !== nextPeriodDate
    ) {
      navigate({
        to: '/energyCarbon/energyFlowAnalysis/analysis',
        replace: true,
        search: {
          orgId: defaultOrg.id,
          periodType,
          periodDate: nextPeriodDate,
        },
      });
    }
  }, [
    hasPeriodType,
    navigate,
    orgId,
    orgTree,
    periodDate,
    periodType,
    selectedOrg,
  ]);

  // URL 确定后回填表单并查询；URL 每次变化都重新执行，支持浏览器前进后退恢复对应结果。
  useEffect(() => {
    if (!selectedOrg || !canQuery) return;
    const currentPeriodDate = getDefaultPeriodDate(periodType, periodDate);
    const normalizedPeriodDate = normalizeEnergyFlowPeriodDate(
      periodType,
      currentPeriodDate,
    );
    // URL 尚未补齐或未归一时只等待上一个 effect 同步，避免用旧参数提前发起请求。
    if (!hasPeriodType || !orgId || periodDate !== normalizedPeriodDate) return;
    form.setFieldsValue({
      orgId: selectedOrg.id,
      periodType,
      periodDate: currentPeriodDate,
    });
    runAnalysis({
      orgId: selectedOrg.id,
      periodType,
      periodDate: normalizedPeriodDate,
    });
  }, [
    canQuery,
    form,
    hasPeriodType,
    orgId,
    periodDate,
    periodType,
    runAnalysis,
    selectedOrg,
  ]);

  // 提交前按当前组织树校验 values.orgId，再校验未来周期并同步 URL；URL 未变化时直接重试当前请求。
  const submit = (values: SearchValues) => {
    const submittedOrg = findOrganization(orgTree, values.orgId);
    if (!submittedOrg) {
      message.error(I18N.energyCarbon.analysisAccessibleOrganizationRequired);
      return;
    }
    if (isFutureEnergyFlowPeriod(values.periodType, values.periodDate)) {
      message.error(I18N.energyCarbon.analysisStatisticsPeriodFuture);
      return;
    }
    const request: EnergyFlowAnalysisRequest = {
      orgId: values.orgId,
      periodType: values.periodType,
      periodDate: normalizeEnergyFlowPeriodDate(
        values.periodType,
        values.periodDate,
      ),
    };
    if (
      hasPeriodType &&
      orgId === request.orgId &&
      periodDate === request.periodDate
    ) {
      runAnalysis(request);
      return;
    }
    navigate({
      to: '/energyCarbon/energyFlowAnalysis/analysis',
      search: {
        orgId: request.orgId,
        periodType: request.periodType,
        periodDate: request.periodDate,
      },
    });
  };

  // 无正向数据时固定展示六个阶段，保留完整流程骨架；有数据时继续服从组织能流设置。
  // 储存空态也服从服务端配置，已加载的零数据响应保留实际开关。
  const stageSource = result?.stages ?? defaultEnergyFlowStages();
  const stages = normalizeEnergyFlowStages(stageSource);
  const sankeyOption = useMemo(() => {
    if (!result) return undefined;
    return buildEnergyFlowSankeyOption(
      result,
      [
        token.colorPrimary,
        token.colorSuccess,
        token.colorWarning,
        token.colorInfo,
      ],
      token.colorTextSecondary,
    );
  }, [
    locale,
    result,
    token.colorInfo,
    token.colorPrimary,
    token.colorSuccess,
    token.colorTextSecondary,
    token.colorWarning,
  ]);

  return (
    <PageContainer
      title={I18N.energyCarbon.analysisFlowDiagram}
      permissionKey={ENERGY_FLOW_ANALYSIS_PAGE_PERMISSION}
    >
      <div className={styles.workspace}>
        <Card size='small' className={styles.filterCard}>
          <Form<SearchValues>
            form={form}
            layout='inline'
            requiredMark={false}
            onFinish={submit}
            onValuesChange={handleFilterValuesChange}
          >
            <div className={styles.filters}>
              <Form.Item
                name='orgId'
                label={I18N.common.fields.organization}
                className={styles.filterItemWide}
                rules={[
                  {
                    required: true,
                    message: I18N.common.validation.organizationRequired,
                  },
                ]}
              >
                <TreeSelect
                  className={styles.orgSelect}
                  treeData={orgTreeData}
                  loading={orgLoading}
                  treeDefaultExpandAll
                  showSearch
                  treeNodeFilterProp='title'
                  placeholder={I18N.common.placeholder.select}
                  allowClear={false}
                  data-testid='energy-flow-analysis-org'
                />
              </Form.Item>
              <Form.Item
                name='periodType'
                label={I18N.energyCarbon.analysisStatisticsDimension}
                className={styles.filterItemPeriod}
                rules={[
                  {
                    required: true,
                    message:
                      I18N.energyCarbon.analysisStatisticsDimensionRequired,
                  },
                ]}
              >
                <Radio.Group
                  className={styles.periodTypeGroup}
                  optionType='button'
                  buttonStyle='solid'
                  options={[...getEnergyFlowAnalysisPeriodOptions()]}
                  data-testid='energy-flow-analysis-period-type'
                />
              </Form.Item>
              <Form.Item
                name='periodDate'
                label={I18N.energyCarbon.analysisStatisticsPeriod}
                className={styles.filterItem}
                rules={[
                  {
                    required: true,
                    message: I18N.energyCarbon.analysisStatisticsPeriodRequired,
                  },
                ]}
              >
                <DatePicker
                  {...datePickerProps(selectedPeriodType)}
                  allowClear={false}
                  disabledDate={current =>
                    isFutureEnergyFlowPeriod(selectedPeriodType, current)
                  }
                  data-testid='energy-flow-analysis-period-date'
                />
              </Form.Item>
              <div className={styles.filterActions}>
                <AuthButton
                  permissionKey={ENERGY_FLOW_ANALYSIS_PAGE_PERMISSION}
                >
                  <Button
                    type='primary'
                    htmlType='submit'
                    loading={isLoading}
                    disabled={orgLoading || !orgTree.length}
                    data-testid='energy-flow-analysis-query'
                  >
                    {I18N.common.actions.search}
                  </Button>
                </AuthButton>
                <Button
                  htmlType='button'
                  onClick={() => {
                    const resetPeriodType =
                      ENERGY_FLOW_ANALYSIS_PERIOD_TYPE.MONTH;
                    const resetPeriodDate = dayjs().startOf('month');
                    const resetOrgId = selectedOrg?.id;
                    resetResultForResetAction();
                    form.setFieldsValue({
                      orgId: resetOrgId,
                      periodType: resetPeriodType,
                      periodDate: resetPeriodDate,
                    });
                    if (resetOrgId === undefined) return;
                    const resetRequest: EnergyFlowAnalysisRequest = {
                      orgId: resetOrgId,
                      periodType: resetPeriodType,
                      periodDate: normalizeEnergyFlowPeriodDate(
                        resetPeriodType,
                        resetPeriodDate,
                      ),
                    };
                    if (
                      hasPeriodType &&
                      orgId === resetRequest.orgId &&
                      periodDate === resetRequest.periodDate
                    ) {
                      runAnalysis(resetRequest);
                      return;
                    }
                    navigate({
                      to: '/energyCarbon/energyFlowAnalysis/analysis',
                      search: {
                        orgId: resetRequest.orgId,
                        periodType: resetRequest.periodType,
                        periodDate: resetRequest.periodDate,
                      },
                    });
                  }}
                  data-testid='energy-flow-analysis-reset'
                >
                  {I18N.common.actions.reset}
                </Button>
              </div>
            </div>
          </Form>
        </Card>

        {queryError ? (
          <Alert
            type='error'
            showIcon
            message={I18N.energyCarbon.analysisFlowQueryFailed}
            description={
              queryError === 'queryFailed'
                ? I18N.energyCarbon.analysisFlowQueryFailed
                : queryError.message || I18N.energyCarbon.analysisRetryLater
            }
            action={
              <Button
                size='small'
                onClick={() => form.submit()}
                data-testid='energy-flow-analysis-retry'
              >
                {I18N.energyCarbon.analysisRetry}
              </Button>
            }
          />
        ) : null}

        {/* 查询开始会清除旧结果；loading 必须位于结果分支外，避免请求期间误显示“请选择条件”。 */}
        {isLoading ? (
          <Card size='small'>
            <div className={styles.emptyChart} aria-live='polite'>
              <Spin tip={I18N.energyCarbon.analysisFlowLoading} />
            </div>
          </Card>
        ) : result ? (
          <>
            <div className={styles.metricGrid}>
              <Card size='small' className={styles.metricCard}>
                <Statistic
                  title={
                    <span className={styles.metricTitle}>
                      {I18N.energyCarbon.analysisComprehensiveEnergyTce}
                    </span>
                  }
                  value={displayEnergyFlowValue(
                    result.metrics.comprehensiveEnergy,
                  )}
                  data-testid='energy-flow-analysis-comprehensive-energy'
                />
              </Card>
              <Card size='small' className={styles.metricCard}>
                <Statistic
                  title={
                    <span className={styles.metricTitle}>
                      {I18N.energyCarbon.analysisCleanEnergyPercent}
                    </span>
                  }
                  value={displayEnergyFlowValue(
                    result.metrics.cleanEnergyRate,
                    2,
                  )}
                  data-testid='energy-flow-analysis-clean-rate'
                />
              </Card>
              <Card size='small' className={styles.metricCard}>
                <Statistic
                  title={
                    <span className={styles.metricTitle}>
                      {I18N.energyCarbon.analysisRenewableEnergyPercent}
                    </span>
                  }
                  value={displayEnergyFlowValue(
                    result.metrics.renewableEnergyRate,
                    2,
                  )}
                  data-testid='energy-flow-analysis-renewable-rate'
                />
              </Card>
              <Card size='small' className={styles.metricCard}>
                <Statistic
                  title={
                    <span className={styles.metricTitle}>
                      {I18N.energyCarbon.analysisEnergyEfficiencyPercent}
                    </span>
                  }
                  value={displayEnergyFlowValue(
                    result.metrics.energyEfficiency,
                    2,
                  )}
                  data-testid='energy-flow-analysis-efficiency'
                />
              </Card>
            </div>

            <Card
              title={
                <div className={styles.stageCardTitle}>
                  <span>{I18N.energyCarbon.analysisFlowDiagram}</span>
                  {selectedOrg ? (
                    <Typography.Text
                      className={styles.stageCardOrg}
                      ellipsis={{ tooltip: selectedOrg.name }}
                    >
                      {selectedOrg.name}
                    </Typography.Text>
                  ) : null}
                </div>
              }
              size='small'
              className={styles.stageCard}
            >
              <div
                className={styles.stageHeader}
                aria-label={I18N.energyCarbon.analysisFlowAnalysisStages}
              >
                {/* 用零宽 Flex 锚点，将每个阶段标题中心对齐到 Sankey 对应柱中心。 */}
                {stages.map(stage => {
                  const stageLabel =
                    stage.stageName || getEnergyFlowStageLabel(stage.stageType);
                  return (
                    <div
                      key={stage.stageType}
                      className={styles.stageHeaderItem}
                    >
                      <Tag
                        color='blue'
                        className={styles.stageTag}
                        title={stageLabel}
                      >
                        {stageLabel}
                      </Tag>
                    </div>
                  );
                })}
              </div>
              {sankeyOption ? (
                <div data-testid='energy-flow-analysis-sankey'>
                  <ReactECharts
                    option={sankeyOption}
                    notMerge
                    lazyUpdate
                    className={styles.chart}
                    opts={{ renderer: 'canvas' }}
                  />
                </div>
              ) : (
                <div className={styles.emptyChart}>
                  <Empty description={I18N.energyCarbon.analysisNoFlowData} />
                </div>
              )}
            </Card>
          </>
        ) : (
          <Card size='small'>
            <Empty
              description={
                canQuery
                  ? I18N.energyCarbon.analysisSelectFlowConditions
                  : I18N.energyCarbon.analysisNoQueryPermissionYet
              }
            />
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
