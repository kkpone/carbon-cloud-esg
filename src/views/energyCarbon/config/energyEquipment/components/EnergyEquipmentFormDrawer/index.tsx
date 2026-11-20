import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import { Col, Drawer, Form, Input, Radio, Row, TreeSelect } from 'antd';
import { useEffect, useMemo } from 'react';

import I18N from '@/lang/I18N';
import FormDrawerFooter from '@/views/energyCarbon/components/FormDrawerFooter';
import { useDataPermissionOrgTree } from '@/views/energyCarbon/hooks/useEnergyOrgTree';
import { FORM_CONFIG } from '@/views/energyCarbon/platform/config';
import { mapOrgTreeToTreeSelectData } from '@/views/energyCarbon/platform/utils';

import { useAddEnergyEquipment, useEditEnergyEquipment } from '../../hooks';
import type { EnergyEquipmentAddReq, EnergyEquipmentRecord } from '../../types';

const ENERGY_EQUIPMENT_FORM_ID = 'energy-equipment-form';

/** 抽屉操作目标；null 表示关闭。 */
export type EnergyEquipmentDrawerTarget =
  | { kind: 'new' }
  | { kind: 'view'; record: EnergyEquipmentRecord }
  | { kind: 'edit'; record: EnergyEquipmentRecord }
  | null;

interface FormValues {
  orgId?: number;
  equipmentName: string;
  equipmentCode: string;
  equipmentModel?: string;
  technicalParameters?: string;
  keyEnergyEquipment: boolean;
  remark?: string;
}

interface Props {
  target: EnergyEquipmentDrawerTarget;
  onClose: () => void;
}

/** 用能设备新增、编辑共用抽屉。 */
export default function EnergyEquipmentFormDrawer({ target, onClose }: Props) {
  const { locale } = useLocale();
  const open = target !== null;
  const isView = target?.kind === 'view';
  const isEdit = target?.kind === 'edit' || isView;
  const record = target && target.kind !== 'new' ? target.record : undefined;
  const orgId = target?.kind === 'new' ? undefined : record?.orgId ?? undefined;
  const orgName = target?.kind === 'new' ? undefined : record?.orgName;
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
  const { data: orgTree = [] } = useDataPermissionOrgTree();
  const orgTreeData = useMemo(
    () => mapOrgTreeToTreeSelectData(orgTree),
    [orgTree],
  );
  const { mutate: addEnergyEquipment, isLoading: adding } =
    useAddEnergyEquipment();
  const { mutate: editEnergyEquipment, isLoading: editing } =
    useEditEnergyEquipment();

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }

    // 每次打开重建组织和六个业务字段，新增组织从当前账号数据权限树选择，避免沿用上次内容。
    form.setFieldsValue({
      orgId,
      equipmentName: isEdit ? target.record.equipmentName : '',
      equipmentCode: isEdit ? target.record.equipmentCode : '',
      equipmentModel: isEdit ? target.record.equipmentModel : undefined,
      technicalParameters: isEdit
        ? target.record.technicalParameters
        : undefined,
      keyEnergyEquipment: isEdit ? target.record.keyEnergyEquipment : false,
      remark: isEdit ? target.record.remark : undefined,
    });
  }, [form, isEdit, open, orgId, target]);

  const handleFinish = (values: FormValues) => {
    // 新增必须提交当前账号数据权限范围内的组织；编辑只提交业务字段，组织归属由后端保留原值。
    const businessFields = {
      equipmentName: values.equipmentName.trim(),
      equipmentCode: values.equipmentCode.trim(),
      equipmentModel: values.equipmentModel?.trim() || undefined,
      technicalParameters: values.technicalParameters?.trim() || undefined,
      keyEnergyEquipment: values.keyEnergyEquipment,
      remark: values.remark?.trim() || undefined,
    };
    if (target?.kind === 'edit') {
      editEnergyEquipment(
        { id: target.record.id, ...businessFields },
        { onSuccess: onClose },
      );
      return;
    }
    if (target?.kind !== 'new') return;
    const selectedOrgId = values.orgId;
    if (selectedOrgId === undefined) {
      form.setFields([
        {
          name: 'orgId',
          errors: [I18N.common.validation.organizationRequired],
        },
      ]);
      return;
    }
    const request: EnergyEquipmentAddReq = {
      orgId: selectedOrgId,
      ...businessFields,
    };
    addEnergyEquipment(request, { onSuccess: onClose });
  };

  return (
    <Drawer
      title={
        isView
          ? I18N.energyCarbon.cfgEquipmentDetails
          : isEdit
          ? I18N.energyCarbon.cfgEditEquipment
          : I18N.energyCarbon.cfgAddEquipment
      }
      open={open}
      onClose={onClose}
      destroyOnClose
      placement='right'
      size='large'
      data-testid='energy-equipment-form-drawer'
      footer={
        <FormDrawerFooter
          isView={isView}
          onClose={onClose}
          testIdPrefix='energy-equipment-form'
          formId={ENERGY_EQUIPMENT_FORM_ID}
          saveLoading={adding || editing}
        />
      }
    >
      <Form<FormValues>
        id={ENERGY_EQUIPMENT_FORM_ID}
        form={form}
        layout='vertical'
        requiredMark={!isView}
        disabled={isView}
        onFinish={handleFinish}
      >
        <Row gutter={FORM_CONFIG.gutter}>
          <Col xs={24} sm={12}>
            {/* 编辑和查看态只展示组织名称，不让 Form 的 orgId 数值覆盖 Input 展示值。 */}
            <Form.Item
              label={I18N.common.fields.organization}
              name={isEdit ? undefined : 'orgId'}
              rules={
                isEdit
                  ? undefined
                  : [
                      {
                        required: true,
                        message: I18N.common.validation.organizationRequired,
                      },
                    ]
              }
            >
              {isEdit ? (
                <Input
                  disabled
                  value={orgName || '-'}
                  data-testid='energy-equipment-form-org'
                />
              ) : (
                <TreeSelect
                  allowClear
                  showSearch
                  treeNodeFilterProp='title'
                  treeData={orgTreeData}
                  treeDefaultExpandAll
                  placeholder={I18N.common.placeholder.select}
                  data-testid='energy-equipment-form-org'
                />
              )}
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={I18N.energyCarbon.cfgEquipmentName}
              name='equipmentName'
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: I18N.energyCarbon.cfgEquipmentNameRequired,
                },
                { max: 100, message: I18N.energyCarbon.max100InputCharacters },
              ]}
            >
              <Input
                placeholder={I18N.common.placeholder.input}
                data-testid='energy-equipment-form-name'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={I18N.energyCarbon.cfgEquipmentCode}
              name='equipmentCode'
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: I18N.energyCarbon.cfgEquipmentCodeRequired,
                },
                { max: 100, message: I18N.energyCarbon.max100InputCharacters },
              ]}
            >
              <Input
                placeholder={I18N.common.placeholder.input}
                data-testid='energy-equipment-form-code'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={I18N.energyCarbon.cfgEquipmentModel}
              name='equipmentModel'
              rules={[
                { max: 100, message: I18N.energyCarbon.max100InputCharacters },
              ]}
            >
              <Input
                placeholder={I18N.common.placeholder.input}
                data-testid='energy-equipment-form-model'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={I18N.energyCarbon.cfgKeyEquipment}
              name='keyEnergyEquipment'
              rules={[
                {
                  required: true,
                  message: I18N.energyCarbon.cfgKeyEquipmentRequired,
                },
              ]}
            >
              <Radio.Group
                options={[
                  { label: I18N.common.answers.yes, value: true },
                  { label: I18N.common.answers.no, value: false },
                ]}
                data-testid='energy-equipment-form-key'
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              label={I18N.energyCarbon.cfgTechnicalParameters}
              name='technicalParameters'
              rules={[
                { max: 500, message: I18N.energyCarbon.cfgMax500Characters },
              ]}
            >
              <Input.TextArea
                rows={4}
                placeholder={I18N.common.placeholder.input}
                data-testid='energy-equipment-form-parameters'
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              label={I18N.common.fields.remark}
              name='remark'
              rules={[
                { max: 500, message: I18N.energyCarbon.cfgMax500Characters },
              ]}
            >
              <Input.TextArea
                rows={4}
                placeholder={I18N.common.placeholder.input}
                data-testid='energy-equipment-form-remark'
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
}
