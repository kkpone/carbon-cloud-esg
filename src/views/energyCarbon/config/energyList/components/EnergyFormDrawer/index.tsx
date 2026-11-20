import {
  Button,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Space,
} from 'antd';
import { useEffect } from 'react';

import I18N from '@/lang/I18N';
import FormDrawerFooter from '@/views/energyCarbon/components/FormDrawerFooter';
import LeafCascader from '@/views/energyCarbon/components/LeafCascader';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import { useUnitList } from '@/views/energyCarbon/hooks/useEnergyUnits';
import { FORM_CONFIG } from '@/views/energyCarbon/platform/config';

import { getEnergyTypeOptions } from '../../constant';
import { useAddEnergy, useEditEnergy } from '../../hooks';
import type { EnergyAddReq, EnergyRecord, EnergyType } from '../../types';

const ENERGY_FORM_ID = 'energy-list-form';

/** 抽屉操作目标；null 表示关闭。 */
export type EnergyDrawerTarget =
  | { kind: 'new' }
  | { kind: 'view'; record: EnergyRecord }
  | { kind: 'edit'; record: EnergyRecord }
  | null;

interface FormValues {
  energyName: string;
  unit: string;
  energyType: EnergyType;
  energyForm?: 1 | 2;
  coalCoefficient: string;
  cleanEnergy: boolean;
  renewableEnergy: boolean;
  remark?: string;
}

interface Props {
  target: EnergyDrawerTarget;
  onClose: () => void;
}

/** 能源新增、编辑抽屉，计量单位固定复用 Kernel 单位管理。 */
export default function EnergyFormDrawer({ target, onClose }: Props) {
  const { locale } = useLocale();
  const open = target !== null;
  const isEdit = target?.kind === 'edit';
  const isView = target?.kind === 'view';
  const record = target && target.kind !== 'new' ? target.record : undefined;
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
  const energyType = Form.useWatch('energyType', form);
  const {
    cascaderOptions: unitOptions,
    isLoading: unitLoading,
    isError: unitError,
  } = useUnitList(open);
  const { mutate: addEnergy, isLoading: adding } = useAddEnergy();
  const { mutate: editEnergy, isLoading: editing } = useEditEnergy();
  const unitUnavailable =
    unitError || (!unitLoading && unitOptions.length === 0);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }

    // 每次打开重建七个业务字段，禁止沿用上次新增或编辑内容。
    // 本轮另增独立能源形态，历史缺失及新增均不设置默认值。
    form.setFieldsValue({
      energyName: record?.energyName ?? '',
      unit: record?.unit ?? '',
      energyType: record?.energyType ?? 1,
      energyForm: record?.energyForm ?? undefined,
      coalCoefficient: record ? String(record.coalCoefficient) : '',
      cleanEnergy: record?.cleanEnergy ?? false,
      renewableEnergy: record?.renewableEnergy ?? false,
      remark: record?.remark ?? undefined,
    });
  }, [form, isEdit, open, target]);

  const handleFinish = (values: FormValues) => {
    // 前端只提交七个业务字段，租户和审计字段全部由后端生成。
    // 当前追加能源形态，仅分类为能源时提交；耗能工质不保留隐藏字段。
    const request: EnergyAddReq = {
      ...values,
      energyForm: values.energyType === 1 ? values.energyForm : undefined,
      energyName: values.energyName.trim(),
      remark: values.remark?.trim() || undefined,
    };
    if (target?.kind === 'edit') {
      editEnergy({ id: target.record.id, ...request }, { onSuccess: onClose });
      return;
    }
    addEnergy(request, { onSuccess: onClose });
  };

  return (
    <Drawer
      title={
        isView
          ? I18N.energyCarbon.cfgEnergyDetails
          : isEdit
          ? I18N.energyCarbon.cfgEditEnergy
          : I18N.energyCarbon.cfgAddEnergy
      }
      open={open}
      onClose={onClose}
      destroyOnClose
      placement='right'
      size='large'
      data-testid='energy-list-form-drawer'
      footer={
        unitUnavailable ? (
          <FormDrawerFooter>
            <Space>
              <span>{I18N.energyCarbon.cfgUnitUnavailable}</span>
              <Button onClick={onClose}>{I18N.common.actions.close}</Button>
            </Space>
          </FormDrawerFooter>
        ) : (
          <FormDrawerFooter
            isView={isView}
            onClose={onClose}
            testIdPrefix='energy-list-form'
            formId={ENERGY_FORM_ID}
            saveLoading={adding || editing || unitLoading}
          />
        )
      }
    >
      <Form<FormValues>
        id={ENERGY_FORM_ID}
        form={form}
        layout='vertical'
        requiredMark={!isView}
        disabled={isView}
        onFinish={handleFinish}
      >
        <Row gutter={FORM_CONFIG.gutter}>
          <Col xs={24} sm={12}>
            <Form.Item
              label={I18N.energyCarbon.energyName}
              name='energyName'
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: I18N.energyCarbon.cfgEnergyNameRequired,
                },
                { max: 100, message: I18N.energyCarbon.max100InputCharacters },
              ]}
            >
              <Input
                placeholder={I18N.common.placeholder.input}
                data-testid='energy-list-form-name'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={I18N.energyCarbon.measurementUnit}
              name='unit'
              rules={[
                {
                  required: true,
                  message: I18N.energyCarbon.cfgMeasurementUnitRequired,
                },
              ]}
            >
              <LeafCascader
                options={unitOptions}
                loading={unitLoading}
                disabled={isView || unitError}
                data-testid='energy-list-form-unit'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={I18N.common.shared.category}
              name='energyType'
              rules={[
                {
                  required: true,
                  message: I18N.energyCarbon.cfgCategoryRequired,
                },
              ]}
            >
              <Radio.Group
                options={getEnergyTypeOptions()}
                onChange={() => form.setFieldValue('energyForm', undefined)}
                data-testid='energy-list-form-type'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={I18N.energyCarbon.cfgCoalCoefficient}
              name='coalCoefficient'
              rules={[
                {
                  required: true,
                  message: I18N.energyCarbon.cfgCoalCoefficientRequired,
                },
              ]}
            >
              {/* 保留 10 位小数限制，失焦展示时去掉末尾无意义的 0。 */}
              <InputNumber<string>
                min='0'
                precision={10}
                stringMode
                placeholder={I18N.common.placeholder.input}
                formatter={(value, info) =>
                  info.userTyping
                    ? info.input
                    : String(value ?? '').replace(
                        /(\.\d*?[1-9])0+$|\.0+$/,
                        '$1',
                      )
                }
                style={{ width: '100%' }}
                data-testid='energy-list-form-coefficient'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={I18N.energyCarbon.cfgCleanEnergy}
              name='cleanEnergy'
              rules={[
                {
                  required: true,
                  message: I18N.energyCarbon.cfgCleanEnergyRequired,
                },
              ]}
            >
              <Radio.Group
                options={[
                  { label: I18N.common.answers.yes, value: true },
                  { label: I18N.common.answers.no, value: false },
                ]}
                data-testid='energy-list-form-clean'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={I18N.energyCarbon.cfgRenewableEnergy}
              name='renewableEnergy'
            >
              <Radio.Group
                options={[
                  { label: I18N.common.answers.yes, value: true },
                  { label: I18N.common.answers.no, value: false },
                ]}
                data-testid='energy-list-form-renewable'
              />
            </Form.Item>
          </Col>
          {energyType === 1 && (
            <Col xs={24} sm={12}>
              <Form.Item
                label={I18N.energyCarbon.energyForm}
                name='energyForm'
                rules={[
                  {
                    required: true,
                    message: I18N.energyCarbon.energyFormRequired,
                  },
                ]}
              >
                <Select
                  allowClear
                  placeholder={I18N.common.placeholder.select}
                  data-testid='energy-list-form-energy-form'
                  options={[
                    { label: I18N.energyCarbon.primaryEnergy, value: 1 },
                    { label: I18N.energyCarbon.secondaryEnergy, value: 2 },
                  ]}
                />
              </Form.Item>
            </Col>
          )}
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
                data-testid='energy-list-form-remark'
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
}
