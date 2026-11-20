import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import {
  EnergyForbidden,
  useEnergySearch,
  useNavigate,
} from '@/views/energyCarbon/hooks/useEnergyNavigation';
/**
 * 业务检索：对标数据管理 - 维护国家能耗标准、行业领先者和节能减排目标指标
 * 路由：/energyCarbon/energyEfficiencyBenchmark/data
 */
import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  Col,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

import AuthButton from '@/views/energyCarbon/components/AuthButton';
import FormDrawerFooter from '@/views/energyCarbon/components/FormDrawerFooter';
import ListSearchForm from '@/views/energyCarbon/components/ListSearchForm';
import PageContainer from '@/views/energyCarbon/components/PageContainer';
import TableActions, {
  getTableActionsColumnWidth,
} from '@/views/energyCarbon/components/TableActions';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
import {
  FORM_CONFIG,
  TABLE_DEFAULT_PAGE_SIZE,
} from '@/views/energyCarbon/platform/config';
import { confirmDelete } from '@/views/energyCarbon/platform/confirmDelete';
import { trimTrailingDecimalZeros } from '../../utils';

import { useLocalizedFormErrors } from '@/views/energyCarbon/hooks/useLocalizedFormErrors';
import {
  addBenchmarkDataApi,
  deleteBenchmarkDataApi,
  editBenchmarkDataApi,
  getBenchmarkDataDetailApi,
  getBenchmarkDataPageApi,
  getBenchmarkOptionsApi,
} from '../services';
import type {
  BenchmarkDataRecord,
  BenchmarkDataSave,
  BenchmarkMetric,
  BenchmarkOptions,
  BenchmarkType,
} from '../types';
import styles from './index.module.css';

const PAGE_PERMISSION = '/energyCarbon/energyEfficiencyBenchmark/data';
const BENCHMARK_DATA_FORM_ID = 'benchmark-data-form';
const BUTTON_PERMISSION = {
  ADD: `${PAGE_PERMISSION}/add`,
  DETAIL: `${PAGE_PERMISSION}/view`,
  EDIT: `${PAGE_PERMISSION}/edit`,
  DELETE: `${PAGE_PERMISSION}/del`,
} as const;

const getBenchmarkDataActionsForWidth = () =>
  [
    {
      key: 'edit',
      label: I18N.common.actions.edit,
      permissionKey: BUTTON_PERMISSION.EDIT,
    },
    {
      key: 'delete',
      label: I18N.common.actions.delete,
      permissionKey: BUTTON_PERMISSION.DELETE,
    },
    {
      key: 'view',
      label: I18N.common.actions.view,
      permissionKey: BUTTON_PERMISSION.DETAIL,
    },
  ] as const;

const METRIC_FIELDS: Array<{
  metric: BenchmarkMetric;
  field: keyof BenchmarkDataSave;
}> = [
  { metric: 1, field: 'comprehensiveEnergy' },
  { metric: 2, field: 'energyConsumption' },
  { metric: 3, field: 'mediumConsumption' },
  { metric: 4, field: 'rawMaterialConsumption' },
  { metric: 5, field: 'cleanEnergyRate' },
  { metric: 6, field: 'renewableEnergyRate' },
  { metric: 7, field: 'energyEfficiency' },
  { metric: 8, field: 'outputValueIntensity' },
  { metric: 9, field: 'addedValueIntensity' },
  { metric: 10, field: 'standardProductIntensity' },
];

const METRIC_DISPLAY_ORDER: Record<BenchmarkType, readonly BenchmarkMetric[]> =
  {
    1: [5, 6, 7, 8, 9, 10],
    2: [5, 6, 7, 8, 9, 10],
    3: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  };

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(TABLE_DEFAULT_PAGE_SIZE),
  year: z.coerce.number().int().min(2000).optional(),
});

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(PAGE_PERMISSION)) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <BenchmarkDataPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

type DrawerTarget =
  | { mode: 'add' }
  | { mode: 'edit' | 'view'; id: number }
  | null;

function BenchmarkDataDrawer({
  target,
  options,
  onClose,
}: {
  target: DrawerTarget;
  options?: BenchmarkOptions;
  onClose: () => void;
}) {
  useLocale();
  const { message } = App.useApp();
  const [form] = Form.useForm<BenchmarkDataSave>();
  useLocalizedFormErrors(form);
  const [displayTarget, setDisplayTarget] = useState<Exclude<
    DrawerTarget,
    null
  > | null>(target);
  const activeTarget = target ?? displayTarget;
  const queryClient = useQueryClient();
  const isView = activeTarget?.mode === 'view';
  const detailId =
    activeTarget && 'id' in activeTarget ? activeTarget.id : undefined;
  const { data: detail, isFetching } = useQuery({
    queryKey: ['benchmark-data', 'detail', detailId],
    queryFn: () =>
      getBenchmarkDataDetailApi(detailId as number).then(
        response => response.data.data,
      ),
    enabled: detailId !== undefined,
  });
  const saveMutation = useMutation({
    mutationFn: async (values: BenchmarkDataSave) => {
      if (activeTarget?.mode === 'edit') {
        await editBenchmarkDataApi({ ...values, id: activeTarget.id });
      } else {
        await addBenchmarkDataApi(values);
      }
    },
    onSuccess: () => {
      message.success(
        activeTarget?.mode === 'edit'
          ? I18N.common.feedback.saveSuccess
          : I18N.common.feedback.addSuccess,
      );
      queryClient.invalidateQueries({ queryKey: ['benchmark-data', 'list'] });
      onClose();
    },
  });
  const benchmarkType = Form.useWatch('benchmarkType', form);

  useEffect(() => {
    if (target) setDisplayTarget(target);
  }, [target]);

  useEffect(() => {
    if (!activeTarget) return;
    // 新增按当前年度和默认类型起步；编辑只回填可提交的输入指标，服务端计算的动态名称和单位不进入表单。
    if (activeTarget.mode === 'add') {
      form.resetFields();
      form.setFieldsValue({
        benchmarkYear: new Date().getFullYear(),
        benchmarkType: 1,
      });
    } else if (detail) {
      form.setFieldsValue(detail);
    }
  }, [activeTarget, detail, form]);

  const applicableMetrics = useMemo(() => {
    // 适用范围和标准产品可用性以后端选项为准，展示顺序按需求文档固定。
    const metrics = (options?.metrics ?? []).filter(metric => {
      if (!metric.available) return false;
      if (benchmarkType === 1) return metric.nationalApplicable;
      if (benchmarkType === 2) return metric.industryApplicable;
      return metric.targetApplicable;
    });
    const order =
      METRIC_DISPLAY_ORDER[
        benchmarkType === 3 ? 3 : benchmarkType === 2 ? 2 : 1
      ];
    return metrics.sort(
      (left, right) => order.indexOf(left.value) - order.indexOf(right.value),
    );
  }, [benchmarkType, options?.metrics]);

  const submit = async () => {
    const values = await form.validateFields();
    // 至少保留一个当前类型适用且已填写的指标；提交前删除不适用字段，防止编辑残留值绕过服务端语义。
    const hasMetric = METRIC_FIELDS.some(
      ({ metric, field }) =>
        applicableMetrics.some(option => option.value === metric) &&
        values[field] !== null &&
        values[field] !== undefined &&
        values[field] !== '',
    );
    if (!hasMetric) {
      message.error(I18N.energyCarbon.analysisApplicableIndicatorRequired);
      return;
    }
    const applicableFields = new Set(
      METRIC_FIELDS.filter(({ metric }) =>
        applicableMetrics.some(option => option.value === metric),
      ).map(({ field }) => field),
    );
    const payload = { ...values };
    for (const { field } of METRIC_FIELDS) {
      if (!applicableFields.has(field)) delete payload[field];
    }
    saveMutation.mutate(payload);
  };

  return (
    <Drawer
      open={target !== null}
      width={760}
      title={
        activeTarget?.mode === 'add'
          ? I18N.energyCarbon.analysisAddBenchmark
          : activeTarget?.mode === 'edit'
          ? I18N.energyCarbon.analysisEditBenchmark
          : I18N.energyCarbon.analysisBenchmarkDetails
      }
      onClose={onClose}
      afterOpenChange={open => {
        if (!open) setDisplayTarget(null);
      }}
      loading={isFetching}
      footer={
        <FormDrawerFooter
          isView={isView}
          onClose={onClose}
          testIdPrefix='benchmark-data-form'
          formId={BENCHMARK_DATA_FORM_ID}
          saveLoading={saveMutation.isLoading}
        />
      }
    >
      <Form
        id={BENCHMARK_DATA_FORM_ID}
        form={form}
        layout='vertical'
        disabled={isView}
        onFinish={() => {
          submit();
        }}
      >
        <Row gutter={FORM_CONFIG.gutter}>
          <Col xs={24} sm={12}>
            <Form.Item
              name='benchmarkYear'
              label={I18N.energyCarbon.year}
              rules={[
                { required: true, message: I18N.energyCarbon.yearRequired },
              ]}
              getValueProps={(value?: number) => ({
                value: value ? dayjs(`${value}-01-01`) : undefined,
              })}
              getValueFromEvent={(value?: Dayjs) => value?.year()}
            >
              <DatePicker
                picker='year'
                format='YYYY'
                minDate={dayjs('2000-01-01')}
                maxDate={dayjs()}
                allowClear
                placeholder={I18N.common.placeholder.select}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name='benchmarkType'
              label={I18N.energyCarbon.analysisBenchmarkType}
              rules={[
                {
                  required: true,
                  message: I18N.energyCarbon.analysisBenchmarkTypeRequired,
                },
              ]}
            >
              <Select
                options={options?.types}
                placeholder={I18N.common.placeholder.select}
                onChange={value => {
                  const nextType = value as BenchmarkType;
                  form.setFieldValue('benchmarkName', undefined);
                  // 国家和行业对标不允许填写指标1-4，切换类型时只清理这四项并保留仍适用的指标。
                  if (nextType === 1 || nextType === 2) {
                    for (const { metric, field } of METRIC_FIELDS) {
                      if (metric <= 4) form.setFieldValue(field, undefined);
                    }
                  }
                }}
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name='benchmarkName'
              label={I18N.energyCarbon.analysisBenchmarkName}
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: I18N.energyCarbon.analysisBenchmarkNameRequired,
                },
              ]}
            >
              {benchmarkType === 3 ? (
                <Select
                  showSearch
                  placeholder={I18N.common.placeholder.select}
                  options={options?.targetOrganizations.map(item => ({
                    label: item.label,
                    value: item.label,
                  }))}
                />
              ) : (
                <Input
                  maxLength={100}
                  placeholder={I18N.common.placeholder.input}
                />
              )}
            </Form.Item>
          </Col>
        </Row>
        {/* 指标按统一表单栅格两列排列，沿用全局间距并在窄屏自动单列。 */}
        <Row gutter={FORM_CONFIG.gutter}>
          {applicableMetrics.map(metric => {
            const field = METRIC_FIELDS.find(
              item => item.metric === metric.value,
            )?.field;
            if (!field) return null;
            const label =
              metric.value === 10 &&
              options?.standardProductName &&
              options.standardProductMetricUnit
                ? I18N.template(
                    I18N.energyCarbon.analysisStandardProductIntensityUnit,
                    {
                      val1: options.standardProductMetricUnit,
                      val2: options.standardProductName,
                    },
                  )
                : `${metric.label}${metric.unit ? `（${metric.unit}）` : ''}`;
            return (
              <Col key={metric.value} xs={24} sm={12}>
                <Form.Item
                  name={field}
                  label={
                    <Typography.Text
                      ellipsis={{ tooltip: label }}
                      className={styles.metricLabel}
                    >
                      {label}
                    </Typography.Text>
                  }
                  rules={[
                    {
                      validator: (_rule, value) =>
                        value === null || value === undefined || value === ''
                          ? Promise.resolve()
                          : Number(value) === 0
                          ? Promise.reject(
                              new Error(
                                I18N.energyCarbon.analysisIndicatorNonzero,
                              ),
                            )
                          : Promise.resolve(),
                    },
                  ]}
                >
                  <InputNumber<string>
                    stringMode
                    precision={6}
                    style={{ width: '100%' }}
                    placeholder={I18N.common.placeholder.input}
                    formatter={(value, info) =>
                      info.userTyping
                        ? info.input
                        : trimTrailingDecimalZeros(String(value ?? ''))
                    }
                    onBlur={() => {
                      const value = form.getFieldValue(field);
                      if (
                        value !== null &&
                        value !== undefined &&
                        value !== '' &&
                        Number(value) === 0
                      ) {
                        form.setFieldValue(field, undefined);
                      } else if (
                        value !== null &&
                        value !== undefined &&
                        value !== ''
                      ) {
                        const normalized = trimTrailingDecimalZeros(
                          String(value),
                        );
                        if (normalized !== String(value))
                          form.setFieldValue(field, normalized);
                      }
                    }}
                  />
                </Form.Item>
              </Col>
            );
          })}
        </Row>
        <Form.Item name='dataSource' label={I18N.common.fields.dataSource}>
          <Input.TextArea
            maxLength={500}
            rows={2}
            placeholder={I18N.common.placeholder.input}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

function BenchmarkDataPage() {
  const { locale } = useLocale();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { page, pageSize, year } = useEnergySearch(searchSchema);
  const [form] = Form.useForm<{ year?: Dayjs }>();
  const [drawerTarget, setDrawerTarget] = useState<DrawerTarget>(null);
  const queryClient = useQueryClient();
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const { data: options } = useQuery({
    queryKey: ['benchmark-data', 'options'],
    queryFn: () =>
      getBenchmarkOptionsApi().then(response => response.data.data),
  });
  const { data, isLoading } = useQuery({
    queryKey: ['benchmark-data', 'list', { page, pageSize, year }],
    queryFn: () =>
      getBenchmarkDataPageApi({ pageNum: page, pageSize, year }).then(
        response => response.data.data,
      ),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteBenchmarkDataApi,
    onSuccess: () => {
      message.success(I18N.common.feedback.deleteSuccess);
      queryClient.invalidateQueries({ queryKey: ['benchmark-data', 'list'] });
    },
  });

  useEffect(
    () =>
      form.setFieldsValue({ year: year ? dayjs(`${year}-01-01`) : undefined }),
    [form, year],
  );

  const columns = useMemo<ColumnsType<BenchmarkDataRecord>>(() => {
    const actionColumnWidth = getTableActionsColumnWidth(
      getBenchmarkDataActionsForWidth(),
      { permissionKeys },
    );
    return [
      {
        title: I18N.common.table.index,
        width: 72,
        fixed: 'left',
        render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
      },
      {
        title: I18N.energyCarbon.year,
        dataIndex: 'benchmarkYear',
        width: 90,
        fixed: 'left',
      },
      {
        title: I18N.energyCarbon.analysisBenchmarkType,
        dataIndex: 'benchmarkTypeName',
        width: 130,
        render: value => <Tag>{value}</Tag>,
      },
      {
        title: I18N.energyCarbon.analysisBenchmarkName,
        dataIndex: 'benchmarkName',
        width: 180,
        ellipsis: { showTitle: false },
        render: value => {
          const displayValue = value || '-';
          return (
            <Typography.Text ellipsis={{ tooltip: displayValue }}>
              {displayValue}
            </Typography.Text>
          );
        },
      },
      {
        title: I18N.common.table.updateBy,
        dataIndex: 'updateByName',
        width: 110,
        render: value => value || '-',
      },
      {
        title: I18N.common.table.updateTime,
        dataIndex: 'updateTime',
        width: 170,
        render: value => value || '-',
      },
      {
        title: I18N.energyCarbon.actionsColumn,
        width: actionColumnWidth,
        fixed: 'right',
        render: (_value, record) => (
          <TableActions
            testIdPrefix={`benchmark-data-${record.id}`}
            actions={[
              {
                key: 'edit',
                label: I18N.common.actions.edit,
                permissionKey: BUTTON_PERMISSION.EDIT,
                onClick: () => setDrawerTarget({ mode: 'edit', id: record.id }),
              },
              {
                key: 'delete',
                label: I18N.common.actions.delete,
                permissionKey: BUTTON_PERMISSION.DELETE,
                danger: true,
                onClick: () =>
                  confirmDelete({
                    content:
                      I18N.energyCarbon.analysisDeleteBenchmarkConfirmation,
                    onOk: () => deleteMutation.mutate(record.id),
                  }),
              },
              {
                key: 'view',
                label: I18N.common.actions.view,
                permissionKey: BUTTON_PERMISSION.DETAIL,
                onClick: () => setDrawerTarget({ mode: 'view', id: record.id }),
              },
            ]}
          />
        ),
      },
    ];
  }, [locale, deleteMutation, page, pageSize, permissionKeys]);

  return (
    <PageContainer
      title={I18N.energyCarbon.analysisBenchmarkManagement}
      permissionKey={PAGE_PERMISSION}
      extra={
        <AuthButton permissionKey={BUTTON_PERMISSION.ADD}>
          <Button
            type='primary'
            onClick={() => setDrawerTarget({ mode: 'add' })}
          >
            {I18N.energyCarbon.analysisAddBenchmark}
          </Button>
        </AuthButton>
      }
    >
      <ListSearchForm
        form={form}
        requiredMark={false}
        onFinish={values => {
          navigate({
            to: '/energyCarbon/energyEfficiencyBenchmark/data',
            search: { page: 1, pageSize, year: values.year?.year() },
          });
        }}
      >
        <Form.Item name='year'>
          <DatePicker
            picker='year'
            format='YYYY'
            minDate={dayjs('2000-01-01')}
            maxDate={dayjs()}
            allowClear
            placeholder={I18N.energyCarbon.year}
            className='filterFieldWidth'
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type='primary' htmlType='submit'>
              {I18N.common.actions.search}
            </Button>
            <Button
              onClick={() => {
                form.resetFields();
                navigate({
                  to: '/energyCarbon/energyEfficiencyBenchmark/data',
                  search: { page: 1, pageSize },
                });
              }}
            >
              {I18N.common.actions.reset}
            </Button>
          </Space>
        </Form.Item>
      </ListSearchForm>
      <Table
        rowKey='id'
        columns={columns}
        dataSource={data?.records ?? []}
        loading={isLoading || deleteMutation.isLoading}
        scroll={{ x: 900 }}
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
          showSizeChanger: true,
          showQuickJumper: true,
          onChange: (nextPage, nextPageSize) => {
            navigate({
              to: '/energyCarbon/energyEfficiencyBenchmark/data',
              search: { page: nextPage, pageSize: nextPageSize, year },
            });
          },
        }}
      />
      <BenchmarkDataDrawer
        target={drawerTarget}
        options={options}
        onClose={() => setDrawerTarget(null)}
      />
    </PageContainer>
  );
}
