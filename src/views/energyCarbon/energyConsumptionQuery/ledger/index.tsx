import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import {
  EnergyForbidden,
  useEnergySearch,
  useNavigate,
} from '@/views/energyCarbon/hooks/useEnergyNavigation';
/**
 * 业务检索：能耗台账 - 查询审核通过后按日拆分的能耗台账
 * 路由：/energyCarbon/energyConsumptionQuery/ledger
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
import dayjs, { type Dayjs } from 'dayjs';
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

import { useEnergyOptions } from '../../config/energyList/hooks';
import { trimTrailingDecimalZeros } from '../../utils';
import {
  getEnergyConsumptionDataTypeName,
  getEnergyFlowDirectionName,
} from '../dataFill/constant';
import { getEnergyLedgerColumns } from './columns';
import { ENERGY_LEDGER_PAGE_PERMISSION } from './constant';
import { useEnergyLedgerDetail, useEnergyLedgerPage } from './hooks';
import type { EnergyLedgerRecord, EnergyLedgerResource } from './types';

import styles from './index.module.css';

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(TABLE_DEFAULT_PAGE_SIZE),
  orgId: z.coerce.number().int().positive().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  energyName: z.string().optional(),
});

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(ENERGY_LEDGER_PAGE_PERMISSION)) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <EnergyLedgerPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

interface SearchValues {
  orgId?: number;
  period?: [Dayjs, Dayjs];
  energyName?: string;
}

/** 详情选择器中的名称仅在实际溢出时显示完整内容。 */
function nameOptionLabel(value?: string | null) {
  const displayValue = value || '-';
  return (
    <Typography.Text ellipsis={{ tooltip: displayValue }}>
      {displayValue}
    </Typography.Text>
  );
}

/** 将台账资源 ID 对应的当前名称转换成禁用多选框需要的选项。 */
function toResourceOptions(resources?: EnergyLedgerResource[]) {
  return (
    resources?.map(resource => ({
      value: resource.id,
      label: nameOptionLabel(resource.name),
    })) ?? []
  );
}

/** 逐日台账列表和只读详情。 */
function EnergyLedgerPage() {
  const { locale } = useLocale();
  const navigate = useNavigate();
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const search = useEnergySearch(searchSchema);
  const [form] = Form.useForm<SearchValues>();
  const [detailId, setDetailId] = useState<number>();
  const { data: orgTree = [] } = useDataPermissionOrgTree();
  const orgTreeData = useMemo(
    () => mapOrgTreeToTreeSelectData(orgTree),
    [orgTree],
  );
  const { data: energyOptions = [], isFetching: energyOptionsLoading } =
    useEnergyOptions();
  const energySelectOptions = useMemo(
    () =>
      energyOptions.map(energy => ({ label: energy.name, value: energy.name })),
    [energyOptions],
  );
  const params = useMemo(
    () => ({
      pageNum: search.page,
      pageSize: search.pageSize,
      orgId: search.orgId,
      startDate: search.startDate,
      endDate: search.endDate,
      energyName: search.energyName?.trim() || undefined,
    }),
    [search],
  );
  const { data, isFetching, refetch } = useEnergyLedgerPage(params);
  const { data: detail, isFetching: detailLoading } =
    useEnergyLedgerDetail(detailId);
  const columns = useMemo(
    () =>
      getEnergyLedgerColumns(
        search.page,
        search.pageSize,
        permissionKeys,
        (record: EnergyLedgerRecord) => setDetailId(record.id),
      ),
    [locale, permissionKeys, search.page, search.pageSize],
  );

  return (
    <PageContainer
      title={I18N.energyCarbon.analysisEnergyLedger}
      permissionKey={ENERGY_LEDGER_PAGE_PERMISSION}
    >
      <ListSearchForm<SearchValues>
        form={form}
        requiredMark={false}
        initialValues={{
          orgId: search.orgId,
          period:
            search.startDate && search.endDate
              ? [dayjs(search.startDate), dayjs(search.endDate)]
              : undefined,
          energyName: search.energyName,
        }}
        onFinish={values => {
          navigate({
            to: '/energyCarbon/energyConsumptionQuery/ledger',
            search: {
              page: 1,
              pageSize: search.pageSize,
              orgId: values.orgId,
              startDate: values.period?.[0].format('YYYY-MM-DD'),
              endDate: values.period?.[1].format('YYYY-MM-DD'),
              energyName: values.energyName?.trim() || undefined,
            },
          });
        }}
      >
        <Form.Item name='period'>
          <DatePicker.RangePicker
            format='YYYY-MM-DD'
            placeholder={[
              I18N.common.shared.startDate,
              I18N.common.shared.endDate,
            ]}
            data-testid='energy-ledger-search-period'
          />
        </Form.Item>
        <Form.Item name='energyName'>
          <Select
            className={styles.energyNameFilter}
            allowClear
            showSearch
            optionFilterProp='label'
            options={energySelectOptions}
            loading={energyOptionsLoading}
            placeholder={I18N.energyCarbon.energyName}
            data-testid='energy-ledger-search-energy-name'
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
            data-testid='energy-ledger-search-org'
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button
              type='primary'
              htmlType='submit'
              data-testid='energy-ledger-search'
            >
              {I18N.common.actions.search}
            </Button>
            <Button
              onClick={() => {
                form.setFieldsValue({
                  orgId: undefined,
                  period: undefined,
                  energyName: undefined,
                });
                if (
                  search.page === 1 &&
                  search.orgId === undefined &&
                  search.startDate === undefined &&
                  search.endDate === undefined &&
                  search.energyName === undefined
                ) {
                  refetch();
                  return;
                }
                navigate({
                  to: '/energyCarbon/energyConsumptionQuery/ledger',
                  search: { page: 1, pageSize: search.pageSize },
                });
              }}
              data-testid='energy-ledger-reset'
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
              to: '/energyCarbon/energyConsumptionQuery/ledger',
              search: { ...search, page, pageSize },
            });
          },
        }}
        data-testid='energy-ledger-table'
      />

      <Drawer
        title={I18N.energyCarbon.analysisEnergyLedgerDetails}
        open={detailId !== undefined}
        placement='right'
        size='large'
        footer={
          <FormDrawerFooter
            isView
            onClose={() => setDetailId(undefined)}
            formId='energy-ledger-detail-form'
            testIdPrefix='energy-ledger-detail'
          />
        }
        onClose={() => setDetailId(undefined)}
        loading={detailLoading}
        destroyOnClose
        data-testid='energy-ledger-detail-drawer'
      >
        <Form
          id='energy-ledger-detail-form'
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
                  data-testid='energy-ledger-detail-org'
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={I18N.energyCarbon.analysisReportNumber}>
                <Input
                  value={detail?.documentNo}
                  placeholder='-'
                  data-testid='energy-ledger-detail-document-no'
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label={I18N.energyCarbon.analysisDate}>
                <DatePicker
                  value={detail?.ledgerDate ? dayjs(detail.ledgerDate) : null}
                  className={styles.fullWidth}
                  placeholder='-'
                  data-testid='energy-ledger-detail-date'
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={I18N.energyCarbon.analysisStatisticsBoundary}>
                <Select
                  value={detail?.boundaryName}
                  options={
                    detail?.boundaryName
                      ? [
                          {
                            value: detail.boundaryName,
                            label: nameOptionLabel(detail.boundaryName),
                          },
                        ]
                      : []
                  }
                  placeholder='-'
                  data-testid='energy-ledger-detail-boundary'
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={I18N.common.fields.dataType}>
                <Select
                  value={
                    detail
                      ? getEnergyConsumptionDataTypeName(detail.dataType)
                      : undefined
                  }
                  options={
                    detail
                      ? [
                          {
                            value: getEnergyConsumptionDataTypeName(
                              detail.dataType,
                            ),
                            label: getEnergyConsumptionDataTypeName(
                              detail.dataType,
                            ),
                          },
                        ]
                      : []
                  }
                  placeholder='-'
                  data-testid='energy-ledger-detail-data-type'
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={I18N.common.shared.exchangeDirection}>
                <Select
                  value={
                    detail
                      ? getEnergyFlowDirectionName(detail.flowDirection)
                      : undefined
                  }
                  options={
                    detail
                      ? [
                          {
                            value: getEnergyFlowDirectionName(
                              detail.flowDirection,
                            ),
                            label: getEnergyFlowDirectionName(
                              detail.flowDirection,
                            ),
                          },
                        ]
                      : []
                  }
                  placeholder='-'
                  data-testid='energy-ledger-detail-flow-direction'
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  Number(detail?.flowDirection) === 1
                    ? I18N.energyCarbon.analysisSourceBoundary
                    : Number(detail?.flowDirection) === 2
                    ? I18N.energyCarbon.analysisDestinationBoundary
                    : I18N.energyCarbon.analysisRelatedBoundary
                }
              >
                <Select
                  value={detail?.relatedBoundaryName}
                  options={
                    detail?.relatedBoundaryName
                      ? [
                          {
                            value: detail.relatedBoundaryName,
                            label: nameOptionLabel(detail.relatedBoundaryName),
                          },
                        ]
                      : []
                  }
                  placeholder='-'
                  data-testid='energy-ledger-detail-related-boundary'
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={I18N.energyCarbon.energyName}>
                <Select
                  value={detail?.energyName}
                  options={
                    detail?.energyName
                      ? [
                          {
                            value: detail.energyName,
                            label: nameOptionLabel(detail.energyName),
                          },
                        ]
                      : []
                  }
                  placeholder='-'
                  data-testid='energy-ledger-detail-energy'
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={I18N.common.fields.quantity}>
                <Space.Compact className={styles.numberGroup}>
                  <InputNumber
                    stringMode
                    value={
                      detail?.quantity === undefined
                        ? undefined
                        : String(detail.quantity)
                    }
                    precision={3}
                    formatter={value =>
                      trimTrailingDecimalZeros(String(value ?? ''))
                    }
                    className={styles.numberInput}
                    placeholder='-'
                    data-testid='energy-ledger-detail-quantity'
                  />
                  <Input
                    value={detail?.unitName ?? '-'}
                    className={styles.numberUnit}
                    title={detail?.unitName ?? '-'}
                    data-testid='energy-ledger-detail-unit'
                  />
                </Space.Compact>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={I18N.energyCarbon.analysisValueYuan}>
                <InputNumber
                  stringMode
                  value={
                    detail?.cost === null || detail?.cost === undefined
                      ? undefined
                      : String(detail.cost)
                  }
                  precision={3}
                  formatter={value =>
                    trimTrailingDecimalZeros(String(value ?? ''))
                  }
                  className={styles.fullWidth}
                  placeholder='-'
                  data-testid='energy-ledger-detail-cost'
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label={I18N.energyCarbon.relatedProduct}>
                <Select
                  mode='multiple'
                  value={detail?.products.map(resource => resource.id) ?? []}
                  options={toResourceOptions(detail?.products)}
                  placeholder='-'
                  data-testid='energy-ledger-detail-products'
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label={I18N.energyCarbon.energyEquipment}>
                <Select
                  mode='multiple'
                  value={detail?.equipments.map(resource => resource.id) ?? []}
                  options={toResourceOptions(detail?.equipments)}
                  placeholder='-'
                  data-testid='energy-ledger-detail-equipments'
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label={I18N.energyCarbon.measuringInstrument}>
                <Select
                  mode='multiple'
                  value={
                    detail?.measuringInstruments.map(resource => resource.id) ??
                    []
                  }
                  options={toResourceOptions(detail?.measuringInstruments)}
                  placeholder='-'
                  data-testid='energy-ledger-detail-instruments'
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label={I18N.common.fields.dataSource}>
                <Input
                  value={detail?.dataSource ?? undefined}
                  placeholder='-'
                  data-testid='energy-ledger-detail-source'
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Drawer>
    </PageContainer>
  );
}
