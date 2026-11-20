import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import {
  EnergyForbidden,
  useEnergySearch,
  useNavigate,
} from '@/views/energyCarbon/hooks/useEnergyNavigation';
/**
 * 业务检索：计量器具 - 按名称、编码和能源查询并维护计量器具主数据
 * 路由：/energyCarbon/config/measuringInstrument
 */
import {
  Button,
  Form,
  Select,
  Space,
  Table,
  TreeSelect,
  Typography,
} from 'antd';
import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { z } from 'zod';
import {
  useMeasuringInstrumentOptions,
  useDeleteMeasuringInstrument,
  useMeasuringEnergyOptions,
  useMeasuringInstrumentPage,
} from './hooks';

import I18N from '@/lang/I18N';
import AuthButton from '@/views/energyCarbon/components/AuthButton';
import ListSearchForm from '@/views/energyCarbon/components/ListSearchForm';
import PageContainer from '@/views/energyCarbon/components/PageContainer';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import { useDataPermissionOrgTree } from '@/views/energyCarbon/hooks/useEnergyOrgTree';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
import { TABLE_DEFAULT_PAGE_SIZE } from '@/views/energyCarbon/platform/config';
import { mapOrgTreeToTreeSelectData } from '@/views/energyCarbon/platform/utils';

import { getMeasuringInstrumentColumns } from './columns';
import MeasuringInstrumentFormDrawer, {
  type MeasuringInstrumentDrawerTarget,
} from './components/MeasuringInstrumentFormDrawer';
import {
  MEASURING_INSTRUMENT_BUTTON_PERMISSION,
  MEASURING_INSTRUMENT_PAGE_PERMISSION,
} from './constant';

import type {
  MeasuringInstrumentListParams,
  MeasuringInstrumentRecord,
} from './types';

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(TABLE_DEFAULT_PAGE_SIZE),
  orgId: z.coerce.number().int().positive().optional(),
  instrumentName: z.string().optional(),
  instrumentCode: z.string().optional(),
  energyId: z.coerce.number().int().positive().optional(),
});

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(MEASURING_INSTRUMENT_PAGE_PERMISSION)) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <MeasuringInstrumentPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

interface SearchValues {
  orgId?: number;
  instrumentName?: string;
  instrumentCode?: string;
  energyId?: number;
}

function MeasuringInstrumentPage() {
  const { locale } = useLocale();
  const navigate = useNavigate();
  // 页面权限集合传入操作列，编辑、删除和详情按钮均按后端 perms 独立过滤。
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const { page, pageSize, orgId, instrumentName, instrumentCode, energyId } =
    useEnergySearch(searchSchema);
  const [form] = Form.useForm<SearchValues>();
  const [drawerTarget, setDrawerTarget] =
    useState<MeasuringInstrumentDrawerTarget>(null);
  const [energyKeyword, setEnergyKeyword] = useState('');
  const deferredEnergyKeyword = useDeferredValue(energyKeyword);
  const { data: orgTree = [] } = useDataPermissionOrgTree();
  const orgTreeData = useMemo(
    () => mapOrgTreeToTreeSelectData(orgTree),
    [orgTree],
  );

  const listParams = useMemo<MeasuringInstrumentListParams>(
    () => ({
      pageNum: page,
      pageSize,
      orgId,
      instrumentName: instrumentName?.trim() || undefined,
      instrumentCode: instrumentCode?.trim() || undefined,
      energyId,
    }),
    [energyId, instrumentCode, instrumentName, orgId, page, pageSize],
  );
  const { data, isLoading, refetch } = useMeasuringInstrumentPage(listParams);
  const { data: filterOptions } = useMeasuringInstrumentOptions(orgId);
  const { data: energyOptionsData, isLoading: energyLoading } =
    useMeasuringEnergyOptions(deferredEnergyKeyword);
  const { mutateAsync: deleteInstrument, isLoading: deleting } =
    useDeleteMeasuringInstrument();

  const energyOptions = useMemo(
    () =>
      (energyOptionsData ?? []).map(energy => ({
        label: (
          <Typography.Text ellipsis={{ tooltip: energy.name }}>
            {energy.name}
          </Typography.Text>
        ),
        value: energy.id,
      })),
    [energyOptionsData],
  );

  const handleDelete = useCallback(
    async (record: MeasuringInstrumentRecord) => {
      await deleteInstrument(record.id);
      // 删除当前页最后一条时回到上一页，避免停留在空页。
      if ((data?.records.length ?? 0) === 1 && page > 1) {
        await navigate({
          to: '/energyCarbon/config/measuringInstrument',
          search: {
            page: page - 1,
            pageSize,
            orgId,
            instrumentName,
            instrumentCode,
            energyId,
          },
        });
      }
    },
    [
      data?.records.length,
      deleteInstrument,
      energyId,
      instrumentCode,
      instrumentName,
      navigate,
      orgId,
      page,
      pageSize,
    ],
  );

  const columns = useMemo(
    () =>
      getMeasuringInstrumentColumns({
        page,
        pageSize,
        permissionKeys,
        onView: record => setDrawerTarget({ kind: 'view', record }),
        onEdit: record => setDrawerTarget({ kind: 'edit', record }),
        onDelete: handleDelete,
      }),
    [locale, handleDelete, page, pageSize, permissionKeys],
  );

  return (
    <PageContainer
      title={I18N.energyCarbon.measuringInstrument}
      permissionKey={MEASURING_INSTRUMENT_PAGE_PERMISSION}
      extra={
        <AuthButton permissionKey={MEASURING_INSTRUMENT_BUTTON_PERMISSION.ADD}>
          <Button
            type='primary'
            data-testid='measuring-instrument-create'
            onClick={() => setDrawerTarget({ kind: 'new' })}
          >
            {I18N.energyCarbon.cfgAddInstrument}
          </Button>
        </AuthButton>
      }
    >
      <ListSearchForm<SearchValues>
        form={form}
        requiredMark={false}
        initialValues={{ orgId, instrumentName, instrumentCode, energyId }}
        onFinish={values => {
          navigate({
            to: '/energyCarbon/config/measuringInstrument',
            search: {
              page: 1,
              pageSize,
              orgId: values.orgId,
              instrumentName: values.instrumentName?.trim() || undefined,
              instrumentCode: values.instrumentCode?.trim() || undefined,
              energyId: values.energyId,
            },
          });
        }}
      >
        <Form.Item name='instrumentName'>
          <Select
            allowClear
            placeholder={I18N.energyCarbon.cfgInstrumentName}
            showSearch
            optionFilterProp='label'
            options={filterOptions?.names.map(value => ({
              value,
              label: value,
            }))}
            className='filterFieldWidth'
            data-testid='measuring-instrument-search-name'
          />
        </Form.Item>
        <Form.Item name='instrumentCode'>
          <Select
            allowClear
            placeholder={I18N.energyCarbon.cfgInstrumentCode}
            showSearch
            optionFilterProp='label'
            options={filterOptions?.codes.map(value => ({
              value,
              label: value,
            }))}
            className='filterFieldWidth'
            data-testid='measuring-instrument-search-code'
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
            data-testid='measuring-instrument-search-org'
          />
        </Form.Item>
        <Form.Item name='energyId'>
          <Select
            allowClear
            showSearch
            filterOption={false}
            placeholder={I18N.energyCarbon.cfgMeasuredEnergy}
            options={energyOptions}
            loading={energyLoading}
            style={{ width: 180 }}
            onSearch={setEnergyKeyword}
            data-testid='measuring-instrument-search-energy'
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button
              type='primary'
              htmlType='submit'
              data-testid='measuring-instrument-search'
            >
              {I18N.common.actions.search}
            </Button>
            <Button
              data-testid='measuring-instrument-reset'
              onClick={() => {
                // 重置同时清空表单、能源搜索词和 URL 条件；URL 已是默认值时主动刷新。
                form.setFieldsValue({
                  instrumentName: undefined,
                  instrumentCode: undefined,
                  energyId: undefined,
                  orgId: undefined,
                });
                setEnergyKeyword('');
                if (
                  page === 1 &&
                  orgId === undefined &&
                  instrumentName === undefined &&
                  instrumentCode === undefined &&
                  energyId === undefined
                ) {
                  refetch();
                  return;
                }
                navigate({
                  to: '/energyCarbon/config/measuringInstrument',
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
        loading={isLoading || deleting}
        scroll={{ x: 1750 }}
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
          showSizeChanger: true,
          showQuickJumper: true,
          onChange: (nextPage, nextPageSize) => {
            navigate({
              to: '/energyCarbon/config/measuringInstrument',
              search: {
                page: nextPage,
                pageSize: nextPageSize,
                orgId,
                instrumentName,
                instrumentCode,
                energyId,
              },
            });
          },
        }}
        data-testid='measuring-instrument-table'
      />

      <MeasuringInstrumentFormDrawer
        target={drawerTarget}
        onClose={() => setDrawerTarget(null)}
      />
    </PageContainer>
  );
}
