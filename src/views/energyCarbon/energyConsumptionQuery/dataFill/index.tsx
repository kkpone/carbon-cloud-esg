import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import {
  EnergyForbidden,
  useEnergySearch,
  useNavigate,
} from '@/views/energyCarbon/hooks/useEnergyNavigation';
/**
 * 业务检索：能耗数据填报 - 按组织维护能耗单据并执行提交审核
 * 路由：/energyCarbon/energyConsumptionQuery/dataFill
 */
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import {
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  TreeSelect,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';
import { z } from 'zod';

import I18N from '@/lang/I18N';
import AuthButton from '@/views/energyCarbon/components/AuthButton';
import ListSearchForm from '@/views/energyCarbon/components/ListSearchForm';
import PageContainer from '@/views/energyCarbon/components/PageContainer';
import { useDataPermissionOrgTree } from '@/views/energyCarbon/hooks/useEnergyOrgTree';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
import { TABLE_DEFAULT_PAGE_SIZE } from '@/views/energyCarbon/platform/config';
import { confirmDelete } from '@/views/energyCarbon/platform/confirmDelete';
import { mapOrgTreeToTreeSelectData } from '@/views/energyCarbon/platform/utils';

import { useLocalizedFormErrors } from '@/views/energyCarbon/hooks/useLocalizedFormErrors';
import { getEnergyConsumptionColumns } from './columns';
import type { EnergyConsumptionDrawerTarget } from './components/EnergyConsumptionFormDrawer';
import EnergyConsumptionFormDrawer from './components/EnergyConsumptionFormDrawer';
import {
  ENERGY_CONSUMPTION_BUTTON_PERMISSION,
  ENERGY_CONSUMPTION_PAGE_PERMISSION,
  getEnergyConsumptionStatusOptions,
} from './constant';
import {
  useAuditEnergyConsumption,
  useDeleteEnergyConsumption,
  useEnergyConsumptionPage,
  useSubmitEnergyConsumption,
} from './hooks';
import styles from './index.module.css';
import type {
  EnergyConsumptionRecord,
  EnergyConsumptionStatus,
  EnergyConsumptionTimeType,
} from './types';

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(TABLE_DEFAULT_PAGE_SIZE),
  orgId: z.coerce.number().int().positive().optional(),
  documentNo: z.string().optional(),
  status: z.coerce.number().int().min(1).max(4).optional(),
  year: z.coerce.number().int().min(1900).max(9999).optional(),
  timeType: z.enum(['year', 'month']).default('year'),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(ENERGY_CONSUMPTION_PAGE_PERMISSION)) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <EnergyConsumptionDataFillPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

interface SearchValues {
  orgId?: number;
  documentNo?: string;
  status?: EnergyConsumptionStatus;
  timeType?: EnergyConsumptionTimeType;
  timeRange?: [Dayjs, Dayjs];
}

interface AuditValues {
  approved: boolean;
  opinion?: string;
}

/** 将按年或按月选择的周期转换为后端使用的闭区间日期。 */
function normalizeTimeRange(
  timeType: EnergyConsumptionTimeType | undefined,
  timeRange: [Dayjs, Dayjs] | undefined,
) {
  const [start, end] = timeRange ?? [];
  if (!start || !end) {
    return { startDate: undefined, endDate: undefined };
  }
  if (timeType === 'month') {
    return {
      startDate: start.startOf('month').format('YYYY-MM-DD'),
      endDate: end.endOf('month').format('YYYY-MM-DD'),
    };
  }
  return {
    startDate: start.startOf('year').format('YYYY-MM-DD'),
    endDate: end.endOf('year').format('YYYY-MM-DD'),
  };
}

/** 能耗填报列表，操作栏按状态和八个独立权限点控制。 */
function EnergyConsumptionDataFillPage() {
  const { locale } = useLocale();
  const navigate = useNavigate();
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const search = useEnergySearch(searchSchema);
  const [searchForm] = Form.useForm<SearchValues>();
  const [auditForm] = Form.useForm<AuditValues>();
  useLocalizedFormErrors(auditForm);
  const selectedTimeType =
    Form.useWatch('timeType', searchForm) ?? search.timeType;
  const [drawerTarget, setDrawerTarget] =
    useState<EnergyConsumptionDrawerTarget>(null);
  const [auditRecord, setAuditRecord] =
    useState<EnergyConsumptionRecord | null>(null);
  const { data: orgTree = [] } = useDataPermissionOrgTree();
  const orgTreeData = useMemo(
    () => mapOrgTreeToTreeSelectData(orgTree),
    [orgTree],
  );
  const defaultOrgId = search.orgId ?? orgTree[0]?.id;
  const listParams = useMemo(
    () => ({
      pageNum: search.page,
      pageSize: search.pageSize,
      orgId: search.orgId,
      documentNo: search.documentNo?.trim() || undefined,
      status: search.status as EnergyConsumptionStatus | undefined,
      year:
        search.startDate === undefined && search.endDate === undefined
          ? search.year
          : undefined,
      startDate: search.startDate,
      endDate: search.endDate,
    }),
    [search],
  );
  const { data, isFetching, refetch } = useEnergyConsumptionPage(listParams);
  const { mutate: submit, isLoading: submitting } =
    useSubmitEnergyConsumption();
  const { mutate: audit, isLoading: auditing } = useAuditEnergyConsumption();
  const { mutateAsync: deleteRecord, isLoading: deleting } =
    useDeleteEnergyConsumption();

  const columns = useMemo(
    () =>
      getEnergyConsumptionColumns({
        page: search.page,
        pageSize: search.pageSize,
        records: data?.records ?? [],
        permissionKeys,
        onEdit: record => setDrawerTarget({ kind: 'edit', id: record.id }),
        onView: record => setDrawerTarget({ kind: 'view', id: record.id }),
        onSubmit: record => submit(record.id),
        onAudit: record => {
          auditForm.setFieldsValue({ approved: true, opinion: undefined });
          setAuditRecord(record);
        },
        onDelete: record =>
          confirmDelete({
            itemName: I18N.energyCarbon.analysisDocumentNumber,
            itemValue: record.documentNo,
            content:
              record.status === 3
                ? I18N.energyCarbon.analysisDeleteApprovedEnergy
                : undefined,
            onOk: async () => {
              await deleteRecord(record.id);
            },
          }),
      }),
    [
      locale,
      auditForm,
      data?.records,
      deleteRecord,
      permissionKeys,
      search.page,
      search.pageSize,
      submit,
    ],
  );

  return (
    <PageContainer
      title={I18N.energyCarbon.analysisEnergyReporting}
      permissionKey={ENERGY_CONSUMPTION_PAGE_PERMISSION}
      extra={
        <Space>
          <AuthButton permissionKey={ENERGY_CONSUMPTION_BUTTON_PERMISSION.ADD}>
            <Button
              type='primary'
              onClick={() => setDrawerTarget({ kind: 'new' })}
              data-testid='energy-consumption-add'
            >
              {I18N.energyCarbon.analysisAddEnergyData}
            </Button>
          </AuthButton>
          <AuthButton
            permissionKey={ENERGY_CONSUMPTION_BUTTON_PERMISSION.IMPORT}
          >
            <Button
              disabled
              title={I18N.energyCarbon.analysisFeatureUnavailable}
              data-testid='energy-consumption-import'
            >
              {I18N.energyCarbon.analysisImportEnergyData}
            </Button>
          </AuthButton>
        </Space>
      }
    >
      <ListSearchForm<SearchValues>
        form={searchForm}
        requiredMark={false}
        initialValues={{
          orgId: search.orgId,
          documentNo: search.documentNo,
          status: search.status,
          timeType: search.timeType,
          timeRange:
            search.startDate && search.endDate
              ? [dayjs(search.startDate), dayjs(search.endDate)]
              : search.year
              ? [dayjs(`${search.year}-01-01`), dayjs(`${search.year}-12-31`)]
              : undefined,
        }}
        onFinish={values => {
          const { startDate, endDate } = normalizeTimeRange(
            values.timeType,
            values.timeRange,
          );
          navigate({
            to: '/energyCarbon/energyConsumptionQuery/dataFill',
            search: {
              page: 1,
              pageSize: search.pageSize,
              orgId: values.orgId,
              documentNo: values.documentNo?.trim() || undefined,
              status: values.status,
              timeType: values.timeType ?? 'year',
              startDate,
              endDate,
            },
          });
        }}
      >
        <Form.Item name='documentNo'>
          <Input
            allowClear
            maxLength={100}
            placeholder={I18N.energyCarbon.analysisReportNumber}
            data-testid='energy-consumption-search-no'
          />
        </Form.Item>
        <Form.Item name='orgId'>
          <TreeSelect
            allowClear
            showSearch
            treeNodeFilterProp='title'
            treeData={orgTreeData}
            treeDefaultExpandAll
            popupMatchSelectWidth={420}
            dropdownStyle={{ maxWidth: 'calc(100vw - 32px)' }}
            placeholder={I18N.common.fields.organization}
            className='filterFieldWidth'
            data-testid='energy-consumption-search-org'
          />
        </Form.Item>
        {/* 能耗填报日期面板内切换年/月；保留原周期字段用于查询、重置和恢复。 */}
        <Form.Item name='timeType' hidden>
          <Select
            allowClear={false}
            options={[
              {
                label: I18N.energyCarbon.energyConsumptionStatisticsByYear,
                value: 'year',
              },
              {
                label: I18N.energyCarbon.energyConsumptionStatisticsByMonth,
                value: 'month',
              },
            ]}
            placeholder={I18N.energyCarbon.energyConsumptionStatisticsTime}
            className='filterFieldWidth'
            data-testid='energy-consumption-search-time-type'
          />
        </Form.Item>
        <Form.Item name='timeRange'>
          <DatePicker.RangePicker
            picker={selectedTimeType}
            panelRender={panel => (
              <div>
                <div className={styles.periodPanelHeader}>
                  <Radio.Group
                    value={selectedTimeType}
                    onChange={event =>
                      searchForm.setFieldValue('timeType', event.target.value)
                    }
                    size='small'
                    optionType='button'
                    options={[
                      {
                        label:
                          I18N.energyCarbon.energyConsumptionStatisticsByYear,
                        value: 'year',
                      },
                      {
                        label:
                          I18N.energyCarbon.energyConsumptionStatisticsByMonth,
                        value: 'month',
                      },
                    ]}
                    data-testid='energy-consumption-panel-time-type'
                  />
                </div>
                {panel}
              </div>
            )}
            format={selectedTimeType === 'month' ? 'YYYY-MM' : 'YYYY'}
            minDate={dayjs('1900-01-01')}
            maxDate={dayjs()}
            disabledDate={date =>
              selectedTimeType === 'month'
                ? date.year() < 1900 || date.isAfter(dayjs(), 'month')
                : date.year() < 1900 || date.year() > dayjs().year()
            }
            allowClear
            placeholder={[
              I18N.energyCarbon.energyConsumptionStatisticsStartTime,
              I18N.energyCarbon.energyConsumptionStatisticsEndTime,
            ]}
            className='filterFieldWidth'
            data-testid='energy-consumption-search-time-range'
          />
        </Form.Item>
        <Form.Item name='status'>
          <Select
            allowClear
            options={getEnergyConsumptionStatusOptions()}
            placeholder={I18N.common.table.status}
            className='filterFieldWidth'
            data-testid='energy-consumption-search-status'
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button
              type='primary'
              htmlType='submit'
              data-testid='energy-consumption-search'
            >
              {I18N.common.actions.search}
            </Button>
            <Button
              onClick={() => {
                searchForm.setFieldsValue({
                  orgId: undefined,
                  documentNo: undefined,
                  status: undefined,
                  timeType: 'year',
                  timeRange: undefined,
                });
                if (
                  search.page === 1 &&
                  search.orgId === undefined &&
                  search.documentNo === undefined &&
                  search.status === undefined &&
                  search.year === undefined &&
                  search.startDate === undefined &&
                  search.endDate === undefined &&
                  search.timeType === 'year'
                ) {
                  refetch();
                  return;
                }
                navigate({
                  to: '/energyCarbon/energyConsumptionQuery/dataFill',
                  search: { page: 1, pageSize: search.pageSize },
                });
              }}
              data-testid='energy-consumption-reset'
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
        loading={isFetching || submitting || deleting}
        scroll={{ x: 2000 }}
        pagination={{
          current: search.page,
          pageSize: search.pageSize,
          total: data?.total ?? 0,
          showSizeChanger: true,
          showQuickJumper: true,
          onChange: (page, pageSize) => {
            navigate({
              to: '/energyCarbon/energyConsumptionQuery/dataFill',
              search: { ...search, page, pageSize },
            });
          },
        }}
        data-testid='energy-consumption-table'
      />

      <EnergyConsumptionFormDrawer
        target={drawerTarget}
        orgTree={orgTree}
        defaultOrgId={defaultOrgId}
        onClose={() => setDrawerTarget(null)}
      />

      <Modal
        title={I18N.energyCarbon.analysisReviewEnergyData}
        open={auditRecord !== null}
        destroyOnClose
        confirmLoading={auditing}
        onCancel={() => setAuditRecord(null)}
        onOk={() => auditForm.submit()}
        data-testid='energy-consumption-audit-modal'
      >
        <Form<AuditValues>
          form={auditForm}
          layout='vertical'
          onFinish={values => {
            if (!auditRecord) return;
            audit(
              {
                id: auditRecord.id,
                approved: values.approved,
                opinion: values.opinion?.trim() || undefined,
              },
              { onSuccess: () => setAuditRecord(null) },
            );
          }}
        >
          <Form.Item
            name='approved'
            label={I18N.common.audit.result}
            rules={[{ required: true }]}
          >
            <Radio.Group data-testid='energy-consumption-audit-result'>
              <Radio value>{I18N.energyCarbon.analysisApprove}</Radio>
              <Radio value={false}>{I18N.energyCarbon.analysisReject}</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(previous, current) =>
              previous.approved !== current.approved
            }
          >
            {({ getFieldValue }) => (
              <Form.Item
                name='opinion'
                label={
                  getFieldValue('approved')
                    ? I18N.common.audit.comment
                    : I18N.energyCarbon.analysisRejectionReason
                }
                rules={[
                  {
                    required: getFieldValue('approved') === false,
                    message: I18N.energyCarbon.analysisRejectionReasonRequired,
                  },
                ]}
              >
                <Input.TextArea
                  rows={4}
                  maxLength={500}
                  placeholder={I18N.common.placeholder.input}
                  data-testid='energy-consumption-audit-opinion'
                />
              </Form.Item>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
