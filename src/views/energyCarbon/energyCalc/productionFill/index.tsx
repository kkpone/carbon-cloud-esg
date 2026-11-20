import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import {
  EnergyForbidden,
  useEnergySearch,
  useNavigate,
} from '@/views/energyCarbon/hooks/useEnergyNavigation';
/**
 * 业务检索：生产数据填报 - 按组织和状态维护生产数据及审核流转
 * 路由：/energyCarbon/energyCalc/productionFill
 */
import I18N from '@/lang/I18N';
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

import AuthButton from '@/views/energyCarbon/components/AuthButton';
import ListSearchForm from '@/views/energyCarbon/components/ListSearchForm';
import PageContainer from '@/views/energyCarbon/components/PageContainer';
import { useDataPermissionOrgTree } from '@/views/energyCarbon/hooks/useEnergyOrgTree';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
import { TABLE_DEFAULT_PAGE_SIZE } from '@/views/energyCarbon/platform/config';
import { confirmDelete } from '@/views/energyCarbon/platform/confirmDelete';
import { mapOrgTreeToTreeSelectData } from '@/views/energyCarbon/platform/utils';

import { useLocalizedFormErrors } from '@/views/energyCarbon/hooks/useLocalizedFormErrors';
import { getProductionDataColumns } from './columns';
import type { ProductionDataDrawerTarget } from './components/ProductionDataFormDrawer';
import ProductionDataFormDrawer from './components/ProductionDataFormDrawer';
import {
  PRODUCTION_DATA_BUTTON_PERMISSION,
  PRODUCTION_DATA_PAGE_PERMISSION,
  PRODUCTION_STATUS,
  getProductionStatusOptions,
} from './constant';
import {
  useAuditProductionData,
  useDeleteProductionData,
  useProductionDataPage,
  useSubmitProductionData,
} from './hooks';
import type { ProductionDataRecord, ProductionStatus } from './types';

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(TABLE_DEFAULT_PAGE_SIZE),
  documentNo: z.string().optional(),
  orgId: z.coerce.number().int().positive().optional(),
  year: z.coerce.number().int().min(1900).max(9999).optional(),
  status: z.coerce.number().int().min(1).max(4).optional(),
});

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(PRODUCTION_DATA_PAGE_PERMISSION)) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <ProductionDataFillPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

interface SearchValues {
  documentNo?: string;
  orgId?: number;
  year?: Dayjs;
  status?: ProductionStatus;
}

interface AuditValues {
  approved: boolean;
  opinion?: string;
}

/** 生产数据列表，状态操作严格对应填报、审核、驳回和通过四种状态。 */
function ProductionDataFillPage() {
  const { locale } = useLocale();
  const navigate = useNavigate();
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const search = useEnergySearch(searchSchema);
  const [searchForm] = Form.useForm<SearchValues>();
  const [auditForm] = Form.useForm<AuditValues>();
  useLocalizedFormErrors(auditForm);
  const [drawerTarget, setDrawerTarget] =
    useState<ProductionDataDrawerTarget>(null);
  const [auditRecord, setAuditRecord] = useState<ProductionDataRecord | null>(
    null,
  );
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
      documentNo: search.documentNo?.trim() || undefined,
      orgId: search.orgId,
      year: search.year,
      status: search.status as ProductionStatus | undefined,
    }),
    [search],
  );
  const { data, isFetching, refetch } = useProductionDataPage(listParams);
  const { mutate: submit, isLoading: submitting } = useSubmitProductionData();
  const { mutate: audit, isLoading: auditing } = useAuditProductionData();
  const { mutateAsync: deleteRecord, isLoading: deleting } =
    useDeleteProductionData();

  const columns = useMemo(
    () =>
      getProductionDataColumns({
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
              record.status === PRODUCTION_STATUS.APPROVED
                ? I18N.energyCarbon.analysisDeleteApprovedProduction
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
      title={I18N.energyCarbon.analysisProductionReporting}
      permissionKey={PRODUCTION_DATA_PAGE_PERMISSION}
      extra={
        <Space>
          <AuthButton permissionKey={PRODUCTION_DATA_BUTTON_PERMISSION.ADD}>
            <Button
              type='primary'
              onClick={() => setDrawerTarget({ kind: 'new', defaultOrgId })}
              data-testid='production-data-add'
            >
              {I18N.energyCarbon.analysisAddProductionData}
            </Button>
          </AuthButton>
          <AuthButton permissionKey={PRODUCTION_DATA_BUTTON_PERMISSION.IMPORT}>
            <Button
              disabled
              title={I18N.energyCarbon.analysisFeatureUnavailable}
              data-testid='production-data-import'
            >
              {I18N.energyCarbon.analysisImportProductionData}
            </Button>
          </AuthButton>
        </Space>
      }
    >
      <ListSearchForm<SearchValues>
        form={searchForm}
        requiredMark={false}
        initialValues={{
          documentNo: search.documentNo,
          orgId: search.orgId,
          year: search.year ? dayjs(`${search.year}-01-01`) : undefined,
          status: search.status,
        }}
        onFinish={values => {
          navigate({
            to: '/energyCarbon/energyCalc/productionFill',
            search: {
              page: 1,
              pageSize: search.pageSize,
              documentNo: values.documentNo?.trim() || undefined,
              orgId: values.orgId,
              year: values.year?.year(),
              status: values.status,
            },
          });
        }}
      >
        <Form.Item name='documentNo'>
          <Input
            allowClear
            maxLength={100}
            placeholder={I18N.energyCarbon.analysisReportNumber}
            data-testid='production-data-search-no'
          />
        </Form.Item>
        <Form.Item name='orgId'>
          <TreeSelect
            allowClear
            showSearch
            treeNodeFilterProp='title'
            treeData={orgTreeData}
            treeDefaultExpandAll
            placeholder={I18N.common.fields.organization}
            className='filterFieldWidth'
            data-testid='production-data-search-org'
          />
        </Form.Item>
        <Form.Item
          name='year'
          rules={[
            {
              validator: (_rule, value?: Dayjs) => {
                if (!value || value.year() <= dayjs().year()) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error(I18N.energyCarbon.analysisStatisticsYearFuture),
                );
              },
            },
          ]}
        >
          <DatePicker
            picker='year'
            format='YYYY'
            minDate={dayjs('1900-01-01')}
            maxDate={dayjs()}
            allowClear
            placeholder={I18N.energyCarbon.analysisStatisticsYear}
            className='filterFieldWidth'
            data-testid='production-data-search-year'
          />
        </Form.Item>
        <Form.Item name='status'>
          <Select
            allowClear
            options={getProductionStatusOptions()}
            placeholder={I18N.common.table.status}
            className='filterFieldWidth'
            data-testid='production-data-search-status'
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button
              type='primary'
              htmlType='submit'
              data-testid='production-data-search'
            >
              {I18N.common.actions.search}
            </Button>
            <Button
              onClick={() => {
                searchForm.setFieldsValue({
                  documentNo: undefined,
                  orgId: undefined,
                  year: undefined,
                  status: undefined,
                });
                if (
                  search.page === 1 &&
                  search.documentNo === undefined &&
                  search.orgId === undefined &&
                  search.year === undefined &&
                  search.status === undefined
                ) {
                  refetch();
                  return;
                }
                navigate({
                  to: '/energyCarbon/energyCalc/productionFill',
                  search: { page: 1, pageSize: search.pageSize },
                });
              }}
              data-testid='production-data-reset'
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
        scroll={{ x: 1600 }}
        pagination={{
          current: search.page,
          pageSize: search.pageSize,
          total: data?.total ?? 0,
          showSizeChanger: true,
          showQuickJumper: true,
          onChange: (page, pageSize) => {
            navigate({
              to: '/energyCarbon/energyCalc/productionFill',
              search: { ...search, page, pageSize },
            });
          },
        }}
        data-testid='production-data-table'
      />

      <ProductionDataFormDrawer
        target={drawerTarget}
        onClose={() => setDrawerTarget(null)}
      />

      <Modal
        title={I18N.energyCarbon.analysisReviewProductionData}
        open={auditRecord !== null}
        destroyOnClose
        confirmLoading={auditing}
        onCancel={() => setAuditRecord(null)}
        onOk={() => auditForm.submit()}
        data-testid='production-data-audit-modal'
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
            rules={[
              { required: true, message: I18N.common.audit.resultRequired },
            ]}
          >
            <Radio.Group data-testid='production-data-audit-result'>
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
                  data-testid='production-data-audit-opinion'
                />
              </Form.Item>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
