import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import {
  EnergyForbidden,
  useEnergySearch,
  useNavigate,
} from '@/views/energyCarbon/hooks/useEnergyNavigation';
/**
 * 业务检索：生产台账 - 查询审核通过后按月生成的生产指标台账
 * 路由：/energyCarbon/energyCalc/productionLedger
 */
import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import {
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
  TreeSelect,
  Typography,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { z } from 'zod';

import FormDrawerFooter from '@/views/energyCarbon/components/FormDrawerFooter';
import ListSearchForm from '@/views/energyCarbon/components/ListSearchForm';
import PageContainer from '@/views/energyCarbon/components/PageContainer';
import { useDataPermissionOrgTree } from '@/views/energyCarbon/hooks/useEnergyOrgTree';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
import {
  FORM_CONFIG,
  TABLE_DEFAULT_PAGE_SIZE,
} from '@/views/energyCarbon/platform/config';
import { mapOrgTreeToTreeSelectData } from '@/views/energyCarbon/platform/utils';

import { trimTrailingDecimalZeros } from '../../utils';
import { PRODUCTION_INDICATOR_TYPE } from '../productionFill/constant';
import { useProductionIndicatorOptions } from '../productionFill/hooks';
import type {
  ProductionIndicatorOption,
  ProductionIndicatorType,
} from '../productionFill/types';
import { getProductionLedgerColumns } from './columns';
import { PRODUCTION_LEDGER_PAGE_PERMISSION } from './constant';
import { useProductionLedgerDetail, useProductionLedgerPage } from './hooks';
import type { ProductionLedgerRecord } from './types';

import styles from './index.module.css';

/** 只读详情中的名称仅在实际溢出时显示完整内容。 */
function nameOptionLabel(value?: string | null) {
  const displayValue = value || '-';
  return (
    <Typography.Text ellipsis={{ tooltip: displayValue }}>
      {displayValue}
    </Typography.Text>
  );
}

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(TABLE_DEFAULT_PAGE_SIZE),
  startMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  endMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  indicatorType: z.coerce.number().int().min(1).max(3).optional(),
  productId: z.coerce.number().int().positive().optional(),
  orgId: z.coerce.number().int().positive().optional(),
});

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(PRODUCTION_LEDGER_PAGE_PERMISSION)) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <ProductionLedgerPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

interface SearchValues {
  period?: [Dayjs, Dayjs];
  indicatorKey?: string;
  orgId?: number;
}

function optionKey(option: ProductionIndicatorOption) {
  return option.indicatorType === PRODUCTION_INDICATOR_TYPE.PRODUCT
    ? `${option.indicatorType}:${option.productId}`
    : String(option.indicatorType);
}

function parseIndicatorKey(value?: string) {
  if (!value) return {};
  const [typeText, productText] = value.split(':');
  return {
    indicatorType: Number(typeText) as ProductionIndicatorType,
    productId: productText ? Number(productText) : undefined,
  };
}

/** 按月份、生产指标和组织查询审核通过后生成的生产台账。 */
function ProductionLedgerPage() {
  const { locale } = useLocale();
  const navigate = useNavigate();
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const search = useEnergySearch(searchSchema);
  const [form] = Form.useForm<SearchValues>();
  const [detailId, setDetailId] = useState<number>();
  const { data: orgTree = [] } = useDataPermissionOrgTree();
  const { data: indicatorOptions = [] } = useProductionIndicatorOptions();
  const orgTreeData = useMemo(
    () => mapOrgTreeToTreeSelectData(orgTree),
    [orgTree],
  );
  const indicatorSelectOptions = useMemo(
    () =>
      indicatorOptions.map(option => ({
        label:
          option.indicatorType === PRODUCTION_INDICATOR_TYPE.PRODUCT
            ? I18N.template(I18N.energyCarbon.analysisProductLabel, {
                val1: option.indicatorName,
              })
            : option.indicatorName,
        value: optionKey(option),
      })),
    [locale, indicatorOptions],
  );
  const params = useMemo(
    () => ({
      pageNum: search.page,
      pageSize: search.pageSize,
      startMonth: search.startMonth,
      endMonth: search.endMonth,
      indicatorType: search.indicatorType as
        | ProductionIndicatorType
        | undefined,
      productId: search.productId,
      orgId: search.orgId,
    }),
    [search],
  );
  const { data, isFetching, refetch } = useProductionLedgerPage(params);
  const { data: detail, isFetching: detailLoading } =
    useProductionLedgerDetail(detailId);
  const columns = useMemo(
    () =>
      getProductionLedgerColumns(
        search.page,
        search.pageSize,
        permissionKeys,
        (record: ProductionLedgerRecord) => setDetailId(record.id),
      ),
    [locale, permissionKeys, search.page, search.pageSize],
  );
  const initialIndicatorKey = search.indicatorType
    ? search.indicatorType === PRODUCTION_INDICATOR_TYPE.PRODUCT
      ? `${search.indicatorType}:${search.productId}`
      : String(search.indicatorType)
    : undefined;

  return (
    <PageContainer
      title={I18N.energyCarbon.analysisProductionLedger}
      permissionKey={PRODUCTION_LEDGER_PAGE_PERMISSION}
    >
      <ListSearchForm<SearchValues>
        form={form}
        requiredMark={false}
        initialValues={{
          period:
            search.startMonth && search.endMonth
              ? [
                  dayjs(`${search.startMonth}-01`),
                  dayjs(`${search.endMonth}-01`),
                ]
              : undefined,
          indicatorKey: initialIndicatorKey,
          orgId: search.orgId,
        }}
        onFinish={values => {
          const indicator = parseIndicatorKey(values.indicatorKey);
          navigate({
            to: '/energyCarbon/energyCalc/productionLedger',
            search: {
              page: 1,
              pageSize: search.pageSize,
              startMonth: values.period?.[0].format('YYYY-MM'),
              endMonth: values.period?.[1].format('YYYY-MM'),
              indicatorType: indicator.indicatorType,
              productId: indicator.productId,
              orgId: values.orgId,
            },
          });
        }}
      >
        <Form.Item name='period'>
          <DatePicker.RangePicker
            picker='month'
            format='YYYY-MM'
            placeholder={[
              I18N.energyCarbon.analysisStartMonth,
              I18N.energyCarbon.analysisEndMonth,
            ]}
            data-testid='production-ledger-search-period'
          />
        </Form.Item>
        <Form.Item name='indicatorKey'>
          <Select
            allowClear
            showSearch
            optionFilterProp='label'
            options={indicatorSelectOptions}
            placeholder={I18N.energyCarbon.analysisProductionIndicator}
            className='filterFieldWidth'
            data-testid='production-ledger-search-indicator'
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
            data-testid='production-ledger-search-org'
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button
              type='primary'
              htmlType='submit'
              data-testid='production-ledger-search'
            >
              {I18N.common.actions.search}
            </Button>
            <Button
              onClick={() => {
                form.setFieldsValue({
                  period: undefined,
                  indicatorKey: undefined,
                  orgId: undefined,
                });
                if (
                  search.page === 1 &&
                  search.startMonth === undefined &&
                  search.endMonth === undefined &&
                  search.indicatorType === undefined &&
                  search.productId === undefined &&
                  search.orgId === undefined
                ) {
                  refetch();
                  return;
                }
                navigate({
                  to: '/energyCarbon/energyCalc/productionLedger',
                  search: { page: 1, pageSize: search.pageSize },
                });
              }}
              data-testid='production-ledger-reset'
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
        loading={isFetching}
        scroll={{ x: 1000 }}
        pagination={{
          current: search.page,
          pageSize: search.pageSize,
          total: data?.total ?? 0,
          showSizeChanger: true,
          showQuickJumper: true,
          onChange: (page, pageSize) => {
            navigate({
              to: '/energyCarbon/energyCalc/productionLedger',
              search: { ...search, page, pageSize },
            });
          },
        }}
        data-testid='production-ledger-table'
      />

      {/* 生产台账详情使用右侧抽屉承载，查看时保留列表查询和分页上下文。 */}
      <Drawer
        title={I18N.energyCarbon.analysisProductionLedgerDetails}
        open={detailId !== undefined}
        size='large'
        footer={
          <FormDrawerFooter
            isView
            onClose={() => setDetailId(undefined)}
            formId='production-ledger-detail-form'
            testIdPrefix='production-ledger-detail'
          />
        }
        onClose={() => setDetailId(undefined)}
        loading={detailLoading}
        destroyOnClose
        placement='right'
        data-testid='production-ledger-detail-drawer'
      >
        <Form
          id='production-ledger-detail-form'
          layout='vertical'
          requiredMark={false}
          disabled
        >
          <Row gutter={FORM_CONFIG.gutter}>
            <Col xs={24} sm={12}>
              <Form.Item label={I18N.common.fields.organization}>
                <Select
                  value={detail?.orgName}
                  options={
                    detail?.orgName
                      ? [
                          {
                            value: detail.orgName,
                            label: nameOptionLabel(detail.orgName),
                          },
                        ]
                      : []
                  }
                  placeholder='-'
                  data-testid='production-ledger-detail-org'
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={I18N.energyCarbon.analysisReportNumber}>
                <Input
                  value={detail?.documentNo}
                  placeholder='-'
                  data-testid='production-ledger-detail-document-no'
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label={I18N.energyCarbon.analysisYearMonth}>
                <DatePicker
                  picker='month'
                  format='YYYY-MM'
                  value={detail?.ledgerMonth ? dayjs(detail.ledgerMonth) : null}
                  className={styles.fullWidth}
                  placeholder='-'
                  data-testid='production-ledger-detail-month'
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={I18N.energyCarbon.analysisProductionIndicator}>
                <Select
                  value={detail?.indicatorName}
                  options={
                    detail?.indicatorName
                      ? [
                          {
                            value: detail.indicatorName,
                            label: nameOptionLabel(detail.indicatorName),
                          },
                        ]
                      : []
                  }
                  placeholder='-'
                  data-testid='production-ledger-detail-indicator'
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={I18N.common.fields.quantity}>
                <Space.Compact className={styles.quantityGroup}>
                  <InputNumber
                    stringMode
                    value={
                      detail?.quantity === undefined
                        ? undefined
                        : String(detail.quantity)
                    }
                    precision={4}
                    formatter={value =>
                      trimTrailingDecimalZeros(String(value ?? ''))
                    }
                    className={styles.quantityInput}
                    placeholder='-'
                    data-testid='production-ledger-detail-quantity'
                  />
                  <Input
                    value={detail?.unitName ?? '-'}
                    className={styles.quantityUnit}
                    title={detail?.unitName ?? '-'}
                    data-unit-length={Math.min(
                      Math.max(
                        Array.from(detail?.unitName?.trim() || '-').length,
                        1,
                      ),
                      6,
                    )}
                    data-testid='production-ledger-detail-unit'
                  />
                </Space.Compact>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label={I18N.common.fields.dataSource}>
                <Input
                  value={detail?.dataSource ?? undefined}
                  placeholder='-'
                  data-testid='production-ledger-detail-source'
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Drawer>
    </PageContainer>
  );
}
