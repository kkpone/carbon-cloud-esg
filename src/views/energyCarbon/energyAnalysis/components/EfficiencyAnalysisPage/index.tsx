import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import {
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  Segmented,
  Space,
  Spin,
  Table,
  Tree,
  Typography,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef } from 'react';

import AuthButton from '@/views/energyCarbon/components/AuthButton';
import EnergyCarbonCategoryChart from '@/views/energyCarbon/components/EnergyCarbonCategoryChart';
import PageContainer from '@/views/energyCarbon/components/PageContainer';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';

import { useStatisticsScopeTree } from '../../../energyStatistics/hooks';
import type {
  StatisticsPeriodType,
  StatisticsScopeNode,
} from '../../../energyStatistics/types';
import {
  ENERGY_CARBON_MAXIMUM_PERIOD_COUNT,
  energyCarbonPeriodCount,
} from '../../../utils';
import { useEnergyAnalysisMutation } from '../../hooks';
import type {
  EfficiencyAnalysisRequest,
  EfficiencyAnalysisResponse,
  EfficiencyAnalysisRow,
} from '../../types';
import {
  analysisChartOption,
  displayAnalysisValue,
  findAnalysisScope,
  firstAnalysisOrganization,
  pickerByAnalysisPeriod,
  toAnalysisTreeData,
} from '../../utils';

import { useLocalizedFormErrors } from '@/views/energyCarbon/hooks/useLocalizedFormErrors';
import styles from '../../index.module.css';

interface Props {
  title: string;
  permissionKey: string;
}

interface SearchValues {
  scopeKey: string;
  periodType: StatisticsPeriodType;
  period: [Dayjs, Dayjs];
}

const getPeriodOptions = () =>
  [
    { label: I18N.energyCarbon.analysisByDay, value: 1 },
    { label: I18N.energyCarbon.energyConsumptionStatisticsByMonth, value: 2 },
    { label: I18N.energyCarbon.analysisByQuarter, value: 3 },
    { label: I18N.energyCarbon.energyConsumptionStatisticsByYear, value: 4 },
  ] satisfies Array<{ label: string; value: StatisticsPeriodType }>;

const DEFAULT_EFFICIENCY_PERIOD_TYPE: StatisticsPeriodType = 2;

const getEfficiencyColumns = (): ColumnsType<EfficiencyAnalysisRow> => [
  {
    title: I18N.energyCarbon.energyFormTime,
    dataIndex: 'period',
    width: '33.33%',
  },
  {
    title: I18N.energyCarbon.energyFormBoundary,
    dataIndex: 'boundaryName',
    width: '33.33%',
    render: value => {
      const displayValue = displayAnalysisValue(value);
      return (
        <Typography.Text
          ellipsis={{ tooltip: displayValue }}
          className={styles.singleLineCell}
        >
          {displayValue}
        </Typography.Text>
      );
    },
  },
  {
    title: I18N.energyCarbon.analysisEnergyEfficiencyPercent,
    dataIndex: 'energyEfficiency',
    width: '33.33%',
    align: 'right',
    render: displayAnalysisValue,
  },
];

/** 根据周期生成能源效率默认连续范围：近 7 日、半年、4 季度或 5 年。 */
function defaultEfficiencyPeriod(
  periodType: StatisticsPeriodType,
): [Dayjs, Dayjs] {
  // 所有范围都以当前自然周期为结束，后端会把月、季度和年归一到完整周期。
  const current = dayjs();
  if (periodType === 1) return [current.subtract(6, 'day'), current];
  if (periodType === 2) return [current.subtract(5, 'month'), current];
  if (periodType === 3) return [current.subtract(9, 'month'), current];
  return [current.subtract(4, 'year'), current];
}

/**
 * 业务检索：能源效率分析 - 按组织或具体边界查询连续周期效率趋势和明细
 */
export default function EfficiencyAnalysisPage({
  title,
  permissionKey,
}: Props) {
  useLocale();
  // 初始化筛选、提示和主题；页面权限同时控制路由、查询按钮和默认请求。
  const [form] = Form.useForm<SearchValues>();
  useLocalizedFormErrors(form);
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const canQuery = useMenuStore(state =>
    state.permissionKeys.has(permissionKey),
  );
  const initializedRef = useRef(false);

  // 范围树保留组织、边界分类和具体边界；分类节点不可选，仅组织和叶子可触发查询。
  const { data: scopeTree = [], isFetching: scopeLoading } =
    useStatisticsScopeTree();
  const mutation = useEnergyAnalysisMutation('efficiency');
  const treeData = useMemo(
    () => toAnalysisTreeData(scopeTree, false),
    [scopeTree],
  );
  // 组织范围树首次加载时展开所有根节点，首屏展示一级和二级组织。
  const defaultExpandedKeys = useMemo(
    () => treeData.map(node => node.key),
    [treeData],
  );
  const scopeKey = Form.useWatch('scopeKey', form);
  const periodType =
    Form.useWatch('periodType', form) ?? DEFAULT_EFFICIENCY_PERIOD_TYPE;
  const data = mutation.data as EfficiencyAnalysisResponse | undefined;
  const colors = [token.colorPrimary, token.colorSuccess, token.colorWarning];

  /** 校验范围和跨度，组装组织或具体边界请求并刷新效率结果。 */
  const runQuery = (values: SearchValues, scopeNode?: StatisticsScopeNode) => {
    // 无查询权限时不发默认或点击请求；分类节点没有 scopeType，也不能进入统计。
    if (!canQuery) return;
    const scope = scopeNode ?? findAnalysisScope(scopeTree, values.scopeKey);
    if (!scope?.scopeType || !scope.orgId) {
      message.warning(I18N.energyCarbon.analysisOrganizationOrBoundaryRequired);
      return;
    }

    // 前端先按自然周期数量拦截超限，后端仍执行同口径最终校验。
    const count = energyCarbonPeriodCount(
      values.periodType,
      values.period[0],
      values.period[1],
    );
    if (count > ENERGY_CARBON_MAXIMUM_PERIOD_COUNT[values.periodType]) {
      message.warning(
        I18N.template(I18N.energyCarbon.analysisPeriodCountLimit, {
          val1: ENERGY_CARBON_MAXIMUM_PERIOD_COUNT[values.periodType],
        }),
      );
      return;
    }

    // 组织请求包含全部可见下级，具体边界请求只携带当前叶子主键。
    const request: EfficiencyAnalysisRequest = {
      scopeType: scope.scopeType,
      orgId: scope.orgId,
      boundaryId: scope.boundaryId,
      periodType: values.periodType,
      startDate: values.period[0].format('YYYY-MM-DD'),
      endDate: values.period[1].format('YYYY-MM-DD'),
    };
    mutation.mutate(request);
  };

  // 首次加载选择第一个组织和近半年；只有 F 权限存在时自动查询。
  useEffect(() => {
    if (initializedRef.current || scopeTree.length === 0) return;
    const scope = firstAnalysisOrganization(scopeTree);
    if (!scope) return;
    const values: SearchValues = {
      scopeKey: scope.key,
      periodType: DEFAULT_EFFICIENCY_PERIOD_TYPE,
      period: defaultEfficiencyPeriod(DEFAULT_EFFICIENCY_PERIOD_TYPE),
    };
    initializedRef.current = true;
    form.setFieldsValue(values);
    if (canQuery) runQuery(values, scope);
  }, [canQuery, form, scopeTree]);

  // 页面左侧提供范围树，右侧按筛选、趋势和表格顺序展示连续周期结果。
  return (
    <PageContainer title={title} permissionKey={permissionKey}>
      <div className={styles.workspace}>
        <Card
          title={I18N.energyCarbon.analysisOrganizationBoundary}
          className={styles.scopeCard}
        >
          <Spin spinning={scopeLoading}>
            {treeData.length ? (
              <Tree
                blockNode
                defaultExpandedKeys={defaultExpandedKeys}
                treeData={treeData}
                titleRender={node => {
                  const title =
                    typeof node.title === 'string' ? node.title : '';
                  return (
                    <Typography.Text
                      ellipsis={{ tooltip: title }}
                      className={styles.treeNodeTitle}
                    >
                      {title}
                    </Typography.Text>
                  );
                }}
                selectedKeys={scopeKey ? [scopeKey] : []}
                onSelect={(keys, info) => {
                  // 分类节点只展开；组织和具体边界沿用当前周期并立即刷新有权限用户的结果。
                  const nextKey = String(keys[0] ?? info.node.key);
                  const scope = findAnalysisScope(scopeTree, nextKey);
                  if (!scope?.selectable || !scope.scopeType) return;
                  form.setFieldValue('scopeKey', nextKey);
                  const values = {
                    ...form.getFieldsValue(),
                    scopeKey: nextKey,
                  };
                  if (canQuery) runQuery(values, scope);
                }}
                className={styles.scopeTree}
                data-testid='efficiency-analysis-scope-tree'
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={I18N.energyCarbon.analysisNoAccessibleBoundaries}
              />
            )}
          </Spin>
        </Card>
        <div className={styles.content}>
          <Card className={styles.filterCard}>
            <Form<SearchValues>
              form={form}
              layout='inline'
              requiredMark={false}
              onFinish={values => runQuery(values)}
            >
              <Form.Item
                name='scopeKey'
                hidden
                rules={[
                  {
                    required: true,
                    message: I18N.energyCarbon.analysisStatisticsScopeRequired,
                  },
                ]}
              >
                <Input type='hidden' />
              </Form.Item>
              <Form.Item
                name='periodType'
                label={I18N.energyCarbon.analysisStatisticsDimension}
                rules={[
                  {
                    required: true,
                    message:
                      I18N.energyCarbon.analysisStatisticsDimensionRequired,
                  },
                ]}
              >
                <Segmented
                  options={getPeriodOptions()}
                  className={styles.periodType}
                  onChange={value => {
                    // 周期切换只重置连续日期范围，保留当前组织或具体边界。
                    const next = value as StatisticsPeriodType;
                    form.setFieldsValue({
                      periodType: next,
                      period: defaultEfficiencyPeriod(next),
                    });
                  }}
                  data-testid='efficiency-analysis-period-type'
                />
              </Form.Item>
              <Form.Item
                name='period'
                label={I18N.energyCarbon.analysisStatisticsPeriod}
                rules={[
                  {
                    required: true,
                    message: I18N.energyCarbon.analysisStatisticsPeriodRequired,
                  },
                ]}
              >
                <DatePicker.RangePicker
                  picker={pickerByAnalysisPeriod(periodType)}
                  disabledDate={date => date.isAfter(dayjs(), 'day')}
                  allowClear={false}
                  data-testid='efficiency-analysis-period'
                />
              </Form.Item>
              <Form.Item>
                <Space>
                  <AuthButton permissionKey={permissionKey}>
                    <Button
                      type='primary'
                      htmlType='submit'
                      loading={mutation.isLoading}
                      data-testid='efficiency-analysis-query'
                    >
                      {I18N.common.actions.search}
                    </Button>
                  </AuthButton>
                  <Button
                    onClick={() => {
                      // 重置恢复首个组织和近半年；无 F 权限时不产生统计请求。
                      const scope = firstAnalysisOrganization(scopeTree);
                      if (!scope) return;
                      const values: SearchValues = {
                        scopeKey: scope.key,
                        periodType: DEFAULT_EFFICIENCY_PERIOD_TYPE,
                        period: defaultEfficiencyPeriod(
                          DEFAULT_EFFICIENCY_PERIOD_TYPE,
                        ),
                      };
                      form.setFieldsValue(values);
                      if (canQuery) runQuery(values, scope);
                    }}
                    data-testid='efficiency-analysis-reset'
                  >
                    {I18N.common.actions.reset}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
          <Card
            title={I18N.energyCarbon.analysisEfficiencyTrend}
            className={styles.resultCard}
          >
            {data?.chart.categories.length ? (
              <EnergyCarbonCategoryChart
                option={analysisChartOption(
                  data.chart,
                  colors,
                  token.colorTextTertiary,
                )}
                className={styles.chart}
                dataTestId='efficiency-analysis-chart'
              />
            ) : (
              <Empty description={I18N.energyCarbon.analysisNoStatistics} />
            )}
          </Card>
          <Card
            title={I18N.energyCarbon.analysisEfficiencyDetails}
            className={styles.resultCard}
          >
            <Table<EfficiencyAnalysisRow>
              rowKey={row => `${row.period}-${row.boundaryName ?? ''}`}
              columns={getEfficiencyColumns()}
              dataSource={data?.table ?? []}
              loading={mutation.isLoading}
              pagination={false}
              scroll={{ x: 680 }}
              data-testid='efficiency-analysis-table'
            />
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
