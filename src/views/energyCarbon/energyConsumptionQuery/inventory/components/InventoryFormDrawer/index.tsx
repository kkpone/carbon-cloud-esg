import I18N from '@/lang/I18N';
import FileUpload from '@/views/energyCarbon/components/FileUpload';
import FormDrawerFooter from '@/views/energyCarbon/components/FormDrawerFooter';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import { useDataPermissionOrgTree } from '@/views/energyCarbon/hooks/useEnergyOrgTree';
import { getOrgBoundaryTypeName } from '@/views/energyCarbon/orgBoundary/constant';
import type { OrgBoundaryType } from '@/views/energyCarbon/orgBoundary/types';
import { FORM_CONFIG } from '@/views/energyCarbon/platform/config';
import { mapOrgTreeToTreeSelectData } from '@/views/energyCarbon/platform/utils';
import {
  Cascader,
  Col,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  TreeSelect,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect, useRef } from 'react';
import {
  useInventoryBoundaries,
  useInventoryDetail,
  useInventoryDocumentNo,
  useInventoryResources,
  useSaveInventory,
} from '../../hooks';
import type { InventoryDrawerTarget, InventorySave } from '../../types';
import styles from './index.module.css';

interface Props {
  target: Exclude<InventoryDrawerTarget, null>;
  onClose: () => void;
}
interface InventoryForm
  extends Omit<InventorySave, 'inventoryTime' | 'boundaryId'> {
  inventoryTime: Dayjs;
  boundaryPath: [number, number];
}
const FORM_ID = 'energy-inventory-form';

/** 库存盘点一单一个组织/时刻/边界/能源，保存立即生效；查看保留历史快照。 */
export default function InventoryFormDrawer({ target, onClose }: Props) {
  useLocale();
  const [form] = Form.useForm<InventoryForm>();
  const viewing = target.kind === 'view';
  const editing = target.kind === 'edit';
  const id = target.kind === 'new' ? undefined : target.id;
  const { data: orgTree = [] } = useDataPermissionOrgTree();
  const orgId = Form.useWatch('orgId', form);
  const path = Form.useWatch('boundaryPath', form);
  const energyId = Form.useWatch('energyId', form);
  const boundaryId = path?.[1];
  const { data: detail, isFetching: detailLoading } = useInventoryDetail(id);
  const boundaries = useInventoryBoundaries(orgId, !viewing);
  const resources = useInventoryResources(boundaryId, !viewing);
  const number = useInventoryDocumentNo();
  const save = useSaveInventory(editing);
  const changedBoundary = useRef<number | undefined>(undefined);
  const numberVersion = useRef(0);
  useEffect(() => {
    if (!detail) return;
    form.setFieldsValue({
      ...detail,
      inventoryTime: dayjs(detail.inventoryTime),
      boundaryPath: [Number(detail.boundaryType), detail.boundaryId],
      quantity: String(detail.quantity),
      cost: detail.cost == null ? undefined : String(detail.cost),
      productIds: detail.productIds ?? [],
      attachments: detail.attachments ?? [],
    });
  }, [detail, form]);
  useEffect(() => {
    // 用户切换边界后仅剔除新边界无效产品；详情初始化不改历史快照。
    if (!resources.data || changedBoundary.current !== boundaryId) return;
    const allowed = new Set(resources.data.products.map(product => product.id));
    form.setFieldValue(
      'productIds',
      (form.getFieldValue('productIds') ?? []).filter((productId: number) =>
        allowed.has(productId),
      ),
    );
    changedBoundary.current = undefined;
  }, [boundaryId, form, resources.data]);
  // 新增库存盘点无详情、未选择能源时，不能将两个 undefined 判为能源未变后读取快照。
  const energyUnchanged = detail != null && detail.energyId === energyId;
  const unit = energyUnchanged
    ? detail.energyUnitNameSnapshot
    : resources.data?.energies.find(energy => energy.id === energyId)?.unitName;
  const boundaryOptions =
    viewing && detail
      ? [
          {
            value: Number(detail.boundaryType),
            label: getOrgBoundaryTypeName(
              Number(detail.boundaryType) as OrgBoundaryType,
            ),
            children: [
              { value: detail.boundaryId, label: detail.boundaryNameSnapshot },
            ],
          },
        ]
      : (boundaries.data?.boundaries ?? []).map(group => ({
          value: group.type,
          label: group.typeName,
          children: group.children.map(boundary => ({
            value: boundary.id,
            label: boundary.name,
          })),
        }));
  const energyOptions =
    viewing && detail
      ? [{ value: detail.energyId, label: detail.energyNameSnapshot }]
      : resources.data?.energies.map(energy => ({
          value: energy.id,
          label: energy.name,
        })) ?? [];
  const required = (message: string) => [{ required: true, message }];
  const nonnegative = {
    validator: async (_: unknown, value: unknown) => {
      if (value != null && Number(value) < 0)
        throw new Error(I18N.energyCarbon.analysisQuantityNonnegative);
    },
  };
  const costNonnegative = {
    validator: async (_: unknown, value: unknown) => {
      if (value != null && Number(value) < 0)
        throw new Error(I18N.energyCarbon.analysisValueNonnegative);
    },
  };
  const finish = (values: InventoryForm) => {
    const { boundaryPath, ...fields } = values;
    // 关联产品不再注册表单项，读取已回填的原值，避免编辑其他字段时清空历史关联。
    save.mutate(
      {
        ...fields,
        id,
        boundaryId: boundaryPath[1],
        inventoryTime: values.inventoryTime
          .second(0)
          .millisecond(0)
          .format('YYYY-MM-DDTHH:mm:ss'),
        documentNo: values.documentNo.trim(),
        quantity: String(values.quantity),
        cost: values.cost == null ? undefined : String(values.cost),
        productIds: form.getFieldValue('productIds') ?? [],
        attachments: values.attachments ?? [],
      },
      { onSuccess: onClose },
    );
  };
  return (
    <Drawer
      title={
        viewing
          ? I18N.energyCarbon.inventoryView
          : editing
          ? I18N.energyCarbon.inventoryEdit
          : I18N.energyCarbon.inventoryAdd
      }
      open
      onClose={onClose}
      size='large'
      destroyOnClose
      data-testid='energy-inventory-drawer'
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          isView={viewing}
          onClose={onClose}
          saveLoading={
            save.isLoading ||
            detailLoading ||
            number.isLoading ||
            resources.isFetching ||
            boundaries.isFetching
          }
          testIdPrefix='energy-inventory'
        />
      }
    >
      <Form<InventoryForm>
        form={form}
        id={FORM_ID}
        layout='vertical'
        disabled={viewing || detailLoading}
        requiredMark={!viewing}
        initialValues={{ productIds: [], attachments: [] }}
        onFinish={finish}
      >
        <Row gutter={FORM_CONFIG.gutter}>
          <Col xs={24} sm={12}>
            <Form.Item
              name='orgId'
              label={I18N.common.fields.organization}
              rules={required(I18N.common.validation.organizationRequired)}
            >
              <TreeSelect
                disabled={editing || viewing || detailLoading}
                treeData={mapOrgTreeToTreeSelectData(orgTree)}
                treeDefaultExpandAll={target.kind === 'new'}
                placeholder={I18N.common.placeholder.select}
                className={styles.fullWidth}
                data-testid='energy-inventory-org'
                onChange={(nextOrgId: number) => {
                  form.setFieldsValue({
                    boundaryPath: undefined,
                    energyId: undefined,
                    productIds: [],
                    documentNo: undefined,
                  });
                  const version = ++numberVersion.current;
                  number.mutateAsync(nextOrgId).then(documentNo => {
                    if (numberVersion.current === version)
                      form.setFieldValue('documentNo', documentNo);
                  });
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name='documentNo'
              label={I18N.energyCarbon.inventoryDocumentNo}
              rules={[
                ...required(I18N.energyCarbon.inventoryNoRequired),
                {
                  pattern: /^PD/,
                  message: I18N.energyCarbon.inventoryNoPrefix,
                },
              ]}
            >
              <Input
                placeholder={I18N.common.placeholder.input}
                data-testid='energy-inventory-document-no'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name='inventoryTime'
              label={I18N.energyCarbon.inventoryTime}
              rules={[
                ...required(I18N.energyCarbon.inventoryTimeRequired),
                {
                  validator: async (_: unknown, value: Dayjs | undefined) => {
                    if (value && value.isAfter(dayjs(), 'day'))
                      throw new Error(I18N.energyCarbon.inventoryTimeFuture);
                  },
                },
              ]}
            >
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format='YYYY-MM-DD HH:mm'
                maxDate={dayjs().endOf('day')}
                placeholder={I18N.common.placeholder.select}
                className={styles.fullWidth}
                data-testid='energy-inventory-time'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name='boundaryPath'
              label={I18N.energyCarbon.analysisStatisticsBoundary}
              rules={required(
                I18N.energyCarbon.analysisStatisticsBoundaryRequired,
              )}
            >
              <Cascader
                options={boundaryOptions}
                disabled={viewing || !orgId}
                placeholder={I18N.common.placeholder.select}
                data-testid='energy-inventory-boundary'
                onChange={nextPath => {
                  changedBoundary.current = nextPath?.[1] as number | undefined;
                  form.setFieldValue('energyId', undefined);
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name='energyId'
              label={I18N.energyCarbon.energyName}
              rules={required(I18N.energyCarbon.analysisEnergyRequired)}
            >
              <Select
                options={energyOptions}
                disabled={viewing || !boundaryId}
                loading={resources.isFetching}
                placeholder={I18N.common.placeholder.select}
                data-testid='energy-inventory-energy'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={I18N.energyCarbon.inventoryQuantity}
              required={!viewing}
            >
              <Form.Item
                name='quantity'
                noStyle
                rules={[
                  ...required(I18N.common.validation.quantityRequired),
                  nonnegative,
                ]}
              >
                <InputNumber
                  stringMode
                  addonAfter={
                    <span className={styles.quantityUnit}>{unit ?? '-'}</span>
                  }
                  placeholder={I18N.common.placeholder.input}
                  rootClassName={styles.quantityGroup}
                  className={styles.quantityInput}
                  data-testid='energy-inventory-quantity'
                />
              </Form.Item>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name='cost'
              label={I18N.energyCarbon.analysisValueYuan}
              rules={[costNonnegative]}
            >
              <InputNumber
                stringMode
                placeholder={I18N.common.placeholder.input}
                className={styles.fullWidth}
                data-testid='energy-inventory-cost'
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name='dataSource' label={I18N.common.fields.dataSource}>
              <Input
                placeholder={I18N.common.placeholder.input}
                data-testid='energy-inventory-source'
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name='remark' label={I18N.common.fields.remark}>
              <Input.TextArea
                rows={3}
                placeholder={I18N.common.placeholder.input}
                data-testid='energy-inventory-remark'
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name='attachments'
              label={I18N.energyCarbon.inventoryAttachments}
            >
              <FileUpload
                maxCount={10}
                maxSizeMB={50}
                disabled={viewing}
                data-testid='energy-inventory-attachments'
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
}
