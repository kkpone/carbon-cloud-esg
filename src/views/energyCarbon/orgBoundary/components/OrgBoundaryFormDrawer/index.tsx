import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  type TableColumnsType,
  App,
  Button,
  Col,
  Drawer,
  Form,
  Input,
  Row,
  Spin,
  Table,
  Typography,
} from 'antd';

import { useEffect, useMemo, useRef, useState } from 'react';

import FormDrawerFooter from '@/views/energyCarbon/components/FormDrawerFooter';
import { FORM_CONFIG } from '@/views/energyCarbon/platform/config';

import { getEnergyTypeName } from '@/views/energyCarbon/config/energyList/constant';

import { getOrgBoundaryTypeName } from '../../constant';
import {
  useAddOrgBoundary,
  useEditOrgBoundary,
  useOrgBoundaryDetail,
} from '../../hooks';
import type {
  OrgBoundaryEnergyItem,
  OrgBoundaryEquipmentItem,
  OrgBoundaryInstrumentItem,
  OrgBoundaryListParams,
  OrgBoundaryProductItem,
  OrgBoundaryRecord,
  OrgBoundaryType,
} from '../../types';
import type {
  BoundaryResourceKind,
  BoundaryResourceOption,
} from '../BoundaryResourceSelector';
import BoundaryResourceSelector from '../BoundaryResourceSelector';

import styles from './index.module.css';

const ORG_BOUNDARY_FORM_ID = 'org-boundary-form';
const RESOURCE_FIRST_COLUMN_WIDTH = '34%';
const RESOURCE_SECOND_COLUMN_WIDTH = '26%';

/** 抽屉操作目标；null 表示关闭。 */
export type OrgBoundaryDrawerTarget =
  | { kind: 'new' }
  | { kind: 'view'; record: OrgBoundaryRecord }
  | { kind: 'edit'; record: OrgBoundaryRecord }
  | null;

interface FormValues {
  orgName: string;
  boundaryTypeName: string;
  boundaryName: string;
  boundaryAbbr: string;
  boundaryCode: string;
  remark?: string;
}

interface Props {
  target: OrgBoundaryDrawerTarget;
  orgId: number;
  orgName: string;
  boundaryType: OrgBoundaryType;
  listParams: OrgBoundaryListParams;
  onClose: () => void;
}

/** 业务检索：边界管理 - 新增、查看或编辑组织边界及四类绑定资源 */
export default function OrgBoundaryFormDrawer({
  target,
  orgId,
  orgName,
  boundaryType,
  listParams,
  onClose,
}: Props) {
  const { locale } = useLocale();
  // 关闭动画期间保留最后一次操作目标，避免 target 清空后标题和表单瞬间切回新增态。
  const activeTargetRef = useRef<Exclude<OrgBoundaryDrawerTarget, null> | null>(
    null,
  );
  if (target) {
    activeTargetRef.current = target;
  }
  const activeTarget = target ?? activeTargetRef.current;
  const open = target !== null;
  const isView = activeTarget?.kind === 'view';
  const isEdit = activeTarget?.kind === 'edit' || isView;
  const detailId = isEdit ? activeTarget.record.id : undefined;
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  // 语言切换只更新已显示的校验错误，不重置输入或触发未报错字段校验。
  useEffect(() => {
    const fields = form
      .getFieldsError()
      .filter(field => field.errors.length > 0);
    if (fields.length) {
      form
        .validateFields(fields.map(field => field.name))
        .catch(() => undefined);
    }
  }, [form, locale]);
  const [selectorKind, setSelectorKind] = useState<BoundaryResourceKind | null>(
    null,
  );
  const [energies, setEnergies] = useState<OrgBoundaryEnergyItem[]>([]);
  const [products, setProducts] = useState<OrgBoundaryProductItem[]>([]);
  const [equipments, setEquipments] = useState<OrgBoundaryEquipmentItem[]>([]);
  const [instruments, setInstruments] = useState<OrgBoundaryInstrumentItem[]>(
    [],
  );
  const { data: detail, isFetching: detailLoading } = useOrgBoundaryDetail(
    detailId,
    open && isEdit,
  );
  const { mutate: addBoundary, isLoading: adding } =
    useAddOrgBoundary(listParams);
  const { mutate: editBoundary, isLoading: editing } =
    useEditOrgBoundary(listParams);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (isEdit && !detail) {
      return;
    }

    // 编辑和查看以详情接口为准；新增以当前组织与 Tab 作为固定上下文。
    form.resetFields();
    form.setFieldsValue({
      orgName,
      boundaryTypeName: getOrgBoundaryTypeName(boundaryType),
      boundaryName: detail?.boundaryName ?? '',
      boundaryAbbr: detail?.boundaryAbbr ?? '',
      boundaryCode: detail?.boundaryCode ?? '',
      remark: detail?.remark ?? '',
    });
    setEnergies(detail?.energies ?? []);
    setProducts(detail?.products ?? []);
    setEquipments(detail?.equipments ?? []);
    setInstruments(detail?.measuringInstruments ?? []);
  }, [boundaryType, detail, form, isEdit, open, orgName]);

  // 语言切换仅更新只读分类文案，保留当前表单和已选择资源。
  useEffect(() => {
    if (!open) return;
    form.setFieldValue(
      'boundaryTypeName',
      getOrgBoundaryTypeName(boundaryType),
    );
  }, [boundaryType, form, locale, open]);

  const handleAfterOpenChange = (visible: boolean) => {
    if (visible) return;
    // 抽屉完全关闭后再清理表单和资源，关闭动画只展示原操作目标，不闪现空白新增态。
    setSelectorKind(null);
    setEnergies([]);
    setProducts([]);
    setEquipments([]);
    setInstruments([]);
  };

  const selectedOptions = useMemo<BoundaryResourceOption[]>(() => {
    if (selectorKind === 'energy') {
      return energies.map(item => ({
        id: item.energyId,
        name: item.energyName,
        energyType: item.energyType,
        unitName: item.unitName,
      }));
    }
    if (selectorKind === 'product') {
      return products.map(item => ({
        id: item.productId,
        name: item.productName,
        code: item.productCode,
        unitName: item.unitName,
      }));
    }
    if (selectorKind === 'equipment') {
      return equipments.map(item => ({
        id: item.equipmentId,
        name: item.equipmentName,
        code: item.equipmentCode,
        keyEnergyEquipment: item.keyEnergyEquipment,
      }));
    }
    if (selectorKind === 'instrument') {
      return instruments.map(item => ({
        id: item.instrumentId,
        name: item.instrumentName,
        code: item.instrumentCode,
        energyName: item.energyName,
      }));
    }
    return [];
  }, [energies, equipments, instruments, products, selectorKind]);

  const handleResourceConfirm = (items: BoundaryResourceOption[]) => {
    if (selectorKind === 'energy') {
      // 能源只保留一次选择，分类实时使用能源主数据 energyType。
      setEnergies(
        items.map(item => ({
          energyId: item.id,
          energyName: item.name,
          energyType: item.energyType as 1 | 2,
          unitName: item.unitName,
        })),
      );
    } else if (selectorKind === 'product') {
      setProducts(
        items.map(item => ({
          productId: item.id,
          productName: item.name,
          productCode: item.code,
          unitName: item.unitName,
        })),
      );
    } else if (selectorKind === 'equipment') {
      setEquipments(
        items.map(item => ({
          equipmentId: item.id,
          equipmentName: item.name,
          equipmentCode: item.code,
          keyEnergyEquipment: item.keyEnergyEquipment,
        })),
      );
    } else if (selectorKind === 'instrument') {
      setInstruments(
        items.map(item => ({
          instrumentId: item.id,
          instrumentName: item.name,
          instrumentCode: item.code,
          energyName: item.energyName,
        })),
      );
    }
    setSelectorKind(null);
  };

  const handleFinish = (values: FormValues) => {
    if (target?.kind === 'edit' && !detail) {
      message.error(I18N.energyCarbon.cfgBoundaryDetailsUnavailable);
      return;
    }
    // 提交仅携带主数据 ID；名称、编号和计量能源均由详情接口实时解析。
    const editableValues = {
      boundaryName: values.boundaryName.trim(),
      boundaryAbbr: values.boundaryAbbr.trim(),
      boundaryCode: values.boundaryCode.trim(),
      remark: values.remark?.trim() || undefined,
      energyIds: energies.map(item => item.energyId),
      productIds: products.map(item => item.productId),
      equipmentIds: equipments.map(item => item.equipmentId),
      measuringInstrumentIds: instruments.map(item => item.instrumentId),
    };

    if (target?.kind === 'edit') {
      editBoundary(
        { id: target.record.id, ...editableValues },
        { onSuccess: onClose },
      );
      return;
    }
    addBoundary(
      { orgId, boundaryType, ...editableValues },
      { onSuccess: onClose },
    );
  };

  const operationColumn = <T,>(onDelete: (record: T) => void) => ({
    title: I18N.energyCarbon.actionsColumn,
    key: 'action',
    width: 72,
    render: (_: unknown, record: T) => (
      <Button
        type='text'
        danger
        icon={<DeleteOutlined />}
        aria-label={I18N.common.actions.delete}
        onClick={() => onDelete(record)}
      />
    ),
  });

  const energyColumns: TableColumnsType<OrgBoundaryEnergyItem> = [
    {
      title: I18N.energyCarbon.energyName,
      dataIndex: 'energyName',
      width: RESOURCE_FIRST_COLUMN_WIDTH,
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
      title: I18N.common.shared.category,
      dataIndex: 'energyType',
      width: RESOURCE_SECOND_COLUMN_WIDTH,
      render: value => (value ? getEnergyTypeName(value) : '-'),
    },
    {
      title: I18N.energyCarbon.measurementUnit,
      dataIndex: 'unitName',
      render: value => value || '-',
    },
    ...(!isView
      ? [
          operationColumn<OrgBoundaryEnergyItem>(record =>
            setEnergies(current =>
              current.filter(item => item.energyId !== record.energyId),
            ),
          ),
        ]
      : []),
  ];

  const productColumns: TableColumnsType<OrgBoundaryProductItem> = [
    {
      title: I18N.common.fields.productName,
      dataIndex: 'productName',
      width: RESOURCE_FIRST_COLUMN_WIDTH,
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
      title: I18N.energyCarbon.cfgProductCode,
      dataIndex: 'productCode',
      width: RESOURCE_SECOND_COLUMN_WIDTH,
      render: value => value || '-',
    },
    {
      title: I18N.energyCarbon.measurementUnit,
      dataIndex: 'unitName',
      render: value => value || '-',
    },
    ...(!isView
      ? [
          operationColumn<OrgBoundaryProductItem>(record =>
            setProducts(current =>
              current.filter(item => item.productId !== record.productId),
            ),
          ),
        ]
      : []),
  ];

  const equipmentColumns: TableColumnsType<OrgBoundaryEquipmentItem> = [
    {
      title: I18N.energyCarbon.cfgEquipmentName,
      dataIndex: 'equipmentName',
      width: RESOURCE_FIRST_COLUMN_WIDTH,
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
      title: I18N.energyCarbon.cfgEquipmentCode,
      dataIndex: 'equipmentCode',
      width: RESOURCE_SECOND_COLUMN_WIDTH,
      render: value => value || '-',
    },
    {
      title: I18N.energyCarbon.cfgKeyEquipment,
      dataIndex: 'keyEnergyEquipment',
      render: value => {
        if (value === undefined || value === null) return '-';
        return value ? I18N.common.answers.yes : I18N.common.answers.no;
      },
    },
    ...(!isView
      ? [
          operationColumn<OrgBoundaryEquipmentItem>(record =>
            setEquipments(current =>
              current.filter(item => item.equipmentId !== record.equipmentId),
            ),
          ),
        ]
      : []),
  ];

  const instrumentColumns: TableColumnsType<OrgBoundaryInstrumentItem> = [
    {
      title: I18N.energyCarbon.cfgInstrumentName,
      dataIndex: 'instrumentName',
      width: RESOURCE_FIRST_COLUMN_WIDTH,
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
      title: I18N.energyCarbon.cfgInstrumentCode,
      dataIndex: 'instrumentCode',
      width: RESOURCE_SECOND_COLUMN_WIDTH,
      render: value => value || '-',
    },
    {
      title: I18N.energyCarbon.cfgMeasuredEnergy,
      dataIndex: 'energyName',
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
    ...(!isView
      ? [
          operationColumn<OrgBoundaryInstrumentItem>(record =>
            setInstruments(current =>
              current.filter(item => item.instrumentId !== record.instrumentId),
            ),
          ),
        ]
      : []),
  ];

  return (
    <Drawer
      title={
        isView
          ? I18N.energyCarbon.cfgBoundaryDetails
          : isEdit
          ? I18N.energyCarbon.cfgEditBoundary
          : I18N.energyCarbon.cfgAddBoundary
      }
      open={open}
      onClose={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnClose
      placement='right'
      width={1000}
      data-testid='org-boundary-form-drawer'
      footer={
        <FormDrawerFooter
          isView={isView}
          onClose={onClose}
          testIdPrefix='org-boundary-form'
          formId={ORG_BOUNDARY_FORM_ID}
          saveLoading={adding || editing}
        />
      }
    >
      <Spin spinning={Boolean(isEdit && detailLoading)}>
        <Form<FormValues>
          id={ORG_BOUNDARY_FORM_ID}
          form={form}
          layout='vertical'
          requiredMark={!isView}
          disabled={isView}
          className={styles.form}
          onFinish={handleFinish}
        >
          <section className={styles.sectionBlock}>
            <div className={styles.sectionTitle}>
              {I18N.energyCarbon.cfgBasicInformation}
            </div>
            <Row gutter={FORM_CONFIG.gutter}>
              <Col xs={24} md={12} xl={8}>
                <Form.Item
                  label={I18N.common.fields.organization}
                  name='orgName'
                >
                  <Input disabled data-testid='org-boundary-form-org' />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} xl={8}>
                <Form.Item
                  label={I18N.energyCarbon.boundaryCategory}
                  name='boundaryTypeName'
                >
                  <Input disabled data-testid='org-boundary-form-type' />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} xl={8}>
                <Form.Item
                  label={I18N.energyCarbon.energyFormBoundary}
                  name='boundaryName'
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: I18N.energyCarbon.cfgBoundaryNameRequired,
                    },
                    {
                      max: 100,
                      message: I18N.energyCarbon.max100InputCharacters,
                    },
                  ]}
                >
                  <Input
                    placeholder={I18N.common.placeholder.input}
                    data-testid='org-boundary-form-name'
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} xl={8}>
                <Form.Item
                  label={I18N.energyCarbon.cfgBoundaryAbbr}
                  name='boundaryAbbr'
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: I18N.energyCarbon.cfgBoundaryAbbrRequired,
                    },
                    {
                      max: 100,
                      message: I18N.energyCarbon.max100InputCharacters,
                    },
                  ]}
                >
                  <Input
                    placeholder={I18N.common.placeholder.input}
                    data-testid='org-boundary-form-abbr'
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} xl={8}>
                <Form.Item
                  label={I18N.energyCarbon.cfgBoundaryCode}
                  name='boundaryCode'
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: I18N.energyCarbon.cfgBoundaryCodeRequired,
                    },
                    {
                      max: 100,
                      message: I18N.energyCarbon.max100InputCharacters,
                    },
                  ]}
                >
                  <Input
                    placeholder={I18N.common.placeholder.input}
                    data-testid='org-boundary-form-code'
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  label={I18N.common.fields.remark}
                  name='remark'
                  rules={[
                    {
                      max: 500,
                      message: I18N.energyCarbon.cfgMax500Characters,
                    },
                  ]}
                >
                  <Input.TextArea
                    placeholder={I18N.common.placeholder.input}
                    rows={3}
                  />
                </Form.Item>
              </Col>
            </Row>
          </section>

          <section className={styles.sectionBlock}>
            <div className={styles.sectionTitle}>
              {I18N.energyCarbon.cfgBoundarySettings}
            </div>
            <ResourceTable
              title={I18N.energyCarbon.cfgEnergyVarieties}
              rowKey='energyId'
              dataSource={energies}
              columns={energyColumns}
              addText={I18N.energyCarbon.cfgSelectEnergy}
              isView={isView}
              onAdd={() => setSelectorKind('energy')}
            />
            <ResourceTable
              title={I18N.energyCarbon.relatedProduct}
              rowKey='productId'
              dataSource={products}
              columns={productColumns}
              addText={I18N.energyCarbon.cfgSelectProduct}
              isView={isView}
              onAdd={() => setSelectorKind('product')}
            />
            <ResourceTable
              title={I18N.energyCarbon.energyEquipment}
              rowKey='equipmentId'
              dataSource={equipments}
              columns={equipmentColumns}
              addText={I18N.energyCarbon.cfgSelectEquipment}
              isView={isView}
              onAdd={() => setSelectorKind('equipment')}
            />
            <ResourceTable
              title={I18N.energyCarbon.measuringInstrument}
              rowKey='instrumentId'
              dataSource={instruments}
              columns={instrumentColumns}
              addText={I18N.energyCarbon.cfgSelectInstrument}
              isView={isView}
              onAdd={() => setSelectorKind('instrument')}
            />
          </section>
        </Form>
      </Spin>

      {selectorKind && (
        <BoundaryResourceSelector
          open
          kind={selectorKind}
          selectedItems={selectedOptions}
          onCancel={() => setSelectorKind(null)}
          onConfirm={handleResourceConfirm}
        />
      )}
    </Drawer>
  );
}

interface ResourceTableProps<T extends object> {
  title: string;
  rowKey: string | ((record: T) => string);
  dataSource: T[];
  columns: TableColumnsType<T>;
  addText: string;
  isView: boolean;
  onAdd: () => void;
}

/** 单类边界资源展示区，避免四类字段混在一张空列较多的表中。 */
function ResourceTable<T extends object>({
  title,
  rowKey,
  dataSource,
  columns,
  addText,
  isView,
  onAdd,
}: ResourceTableProps<T>) {
  return (
    <div className={styles.resourceBlock}>
      <div className={styles.resourceTitle}>{title}</div>
      <Table<T>
        rowKey={rowKey}
        size='small'
        tableLayout='fixed'
        pagination={false}
        dataSource={dataSource}
        columns={columns}
        className={styles.resourceTable}
      />
      {!isView && (
        <Button
          type='dashed'
          block
          icon={<PlusOutlined />}
          className={styles.addResourceButton}
          onClick={onAdd}
        >
          {addText}
        </Button>
      )}
    </div>
  );
}
