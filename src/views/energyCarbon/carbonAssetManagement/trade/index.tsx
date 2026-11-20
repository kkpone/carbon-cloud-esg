import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import {
  EnergyForbidden,
  useEnergySearch,
  useNavigate,
} from '@/views/energyCarbon/hooks/useEnergyNavigation';
/**
 * 业务检索：碳交易管理 - 按资产、组织和年度查询交易并维护账户余额
 * 路由：/energyCarbon/carbonAssetManagement/trade
 */
import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import {
  Button,
  DatePicker,
  Form,
  Select,
  Space,
  Table,
  Tooltip,
  TreeSelect,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

import AuthButton from '@/views/energyCarbon/components/AuthButton';
import ListSearchForm from '@/views/energyCarbon/components/ListSearchForm';
import PageContainer from '@/views/energyCarbon/components/PageContainer';
import { useDataPermissionOrgTree } from '@/views/energyCarbon/hooks/useEnergyOrgTree';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
import { TABLE_DEFAULT_PAGE_SIZE } from '@/views/energyCarbon/platform/config';
import { mapOrgTreeToTreeSelectData } from '@/views/energyCarbon/platform/utils';

import { getCarbonTradeColumns } from './columns';
import CarbonTradeDetailDrawer from './components/CarbonTradeDetailDrawer';
import CarbonTradeFormDrawer, {
  type CarbonTradeDrawerTarget,
} from './components/CarbonTradeFormDrawer';
import {
  CARBON_ASSET_OPTIONS,
  CARBON_TRADE_BUTTON_PERMISSION,
  CARBON_TRADE_PAGE_PERMISSION,
} from './constant';
import { useCarbonTradePage, useDeleteCarbonTrade } from './hooks';
import type {
  CarbonAsset,
  CarbonTradeListParams,
  CarbonTradeRecord,
} from './types';

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(TABLE_DEFAULT_PAGE_SIZE),
  carbonAsset: z.coerce.number().int().min(1).max(2).optional(),
  orgId: z.coerce.number().int().positive().optional(),
  year: z.coerce.number().int().min(1900).max(9999).optional(),
});

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(CARBON_TRADE_PAGE_PERMISSION)) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <CarbonTradePage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

interface SearchValues {
  carbonAsset?: CarbonAsset;
  orgId?: number;
  year?: Dayjs;
}

function CarbonTradePage() {
  const { locale } = useLocale();
  const navigate = useNavigate();
  const { page, pageSize, carbonAsset, orgId, year } =
    useEnergySearch(searchSchema);
  const [form] = Form.useForm<SearchValues>();
  const [drawerTarget, setDrawerTarget] =
    useState<CarbonTradeDrawerTarget>(null);
  const [detailId, setDetailId] = useState<number>();
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const { data: orgTree = [] } = useDataPermissionOrgTree();
  const orgTreeData = useMemo(
    () => mapOrgTreeToTreeSelectData(orgTree, { disableInactive: true }),
    [orgTree],
  );

  useEffect(() => {
    form.setFieldsValue({
      carbonAsset: carbonAsset as CarbonAsset | undefined,
      orgId,
      year: year ? dayjs(String(year), 'YYYY') : undefined,
    });
  }, [carbonAsset, form, orgId, year]);

  const listParams = useMemo<CarbonTradeListParams>(
    () => ({
      pageNum: page,
      pageSize,
      carbonAsset: carbonAsset as CarbonAsset | undefined,
      orgId,
      year,
    }),
    [carbonAsset, orgId, page, pageSize, year],
  );
  const { data, isLoading } = useCarbonTradePage(listParams);
  const { mutateAsync: deleteTrade, isLoading: deleting } =
    useDeleteCarbonTrade();

  const handleDelete = useCallback(
    async (record: CarbonTradeRecord) => {
      await deleteTrade(record.id);
      if ((data?.records.length ?? 0) === 1 && page > 1) {
        await navigate({
          to: '/energyCarbon/carbonAssetManagement/trade',
          search: {
            page: page - 1,
            pageSize,
            carbonAsset,
            orgId,
            year,
          },
        });
      }
    },
    [
      carbonAsset,
      data?.records.length,
      deleteTrade,
      navigate,
      orgId,
      page,
      pageSize,
      year,
    ],
  );

  const columns = useMemo(
    () =>
      getCarbonTradeColumns({
        page,
        pageSize,
        permissionKeys,
        onEdit: record => setDrawerTarget({ kind: 'edit', id: record.id }),
        onDetail: record => setDetailId(record.id),
        onDelete: handleDelete,
      }),
    [handleDelete, page, pageSize, permissionKeys, locale],
  );

  return (
    <PageContainer
      title={I18N.energyCarbon.assetTradeManagement}
      permissionKey={CARBON_TRADE_PAGE_PERMISSION}
      extra={
        <Space>
          <AuthButton permissionKey={CARBON_TRADE_BUTTON_PERMISSION.ADD}>
            <Button
              type='primary'
              data-testid='carbon-trade-create'
              onClick={() => setDrawerTarget({ kind: 'new', orgId })}
            >
              {I18N.energyCarbon.assetAddTrade}
            </Button>
          </AuthButton>
          <AuthButton permissionKey={CARBON_TRADE_BUTTON_PERMISSION.IMPORT}>
            <Tooltip title={I18N.energyCarbon.assetImportUnavailable}>
              <span>
                <Button disabled data-testid='carbon-trade-import'>
                  {I18N.energyCarbon.assetImportTrade}
                </Button>
              </span>
            </Tooltip>
          </AuthButton>
        </Space>
      }
    >
      <ListSearchForm<SearchValues>
        form={form}
        requiredMark={false}
        onFinish={values => {
          navigate({
            to: '/energyCarbon/carbonAssetManagement/trade',
            search: {
              page: 1,
              pageSize,
              carbonAsset: values.carbonAsset,
              orgId: values.orgId,
              year: values.year?.year(),
            },
          });
        }}
      >
        <Form.Item name='carbonAsset'>
          <Select
            allowClear
            placeholder={I18N.energyCarbon.assetCarbonAsset}
            options={CARBON_ASSET_OPTIONS}
            style={{ width: 150 }}
            data-testid='carbon-trade-search-asset'
          />
        </Form.Item>
        <Form.Item name='orgId'>
          <TreeSelect
            allowClear
            treeData={orgTreeData}
            treeDefaultExpandAll
            showSearch
            treeNodeFilterProp='title'
            placeholder={I18N.common.fields.organization}
            style={{ width: 240 }}
            data-testid='carbon-trade-search-org'
          />
        </Form.Item>
        <Form.Item name='year'>
          <DatePicker
            picker='year'
            placeholder={I18N.energyCarbon.assetTradeYear}
            data-testid='carbon-trade-search-year'
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button
              type='primary'
              htmlType='submit'
              data-testid='carbon-trade-search'
            >
              {I18N.common.actions.search}
            </Button>
            <Button
              data-testid='carbon-trade-reset'
              onClick={() => {
                form.resetFields();
                navigate({
                  to: '/energyCarbon/carbonAssetManagement/trade',
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
        scroll={{ x: 1500 }}
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
          showSizeChanger: true,
          showQuickJumper: true,
          onChange: (nextPage, nextPageSize) => {
            navigate({
              to: '/energyCarbon/carbonAssetManagement/trade',
              search: {
                page: nextPage,
                pageSize: nextPageSize,
                carbonAsset,
                orgId,
                year,
              },
            });
          },
        }}
        data-testid='carbon-trade-table'
      />

      <CarbonTradeFormDrawer
        target={drawerTarget}
        onClose={() => setDrawerTarget(null)}
      />
      <CarbonTradeDetailDrawer
        id={detailId}
        onClose={() => setDetailId(undefined)}
      />
    </PageContainer>
  );
}
