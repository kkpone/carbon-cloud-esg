import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import {
  Button,
  Col,
  Drawer,
  Form,
  Input,
  Row,
  Select,
  Space,
  TreeSelect,
  Typography,
} from 'antd';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';

import I18N from '@/lang/I18N';
import FormDrawerFooter from '@/views/energyCarbon/components/FormDrawerFooter';
import { useDataPermissionOrgTree } from '@/views/energyCarbon/hooks/useEnergyOrgTree';
import { FORM_CONFIG } from '@/views/energyCarbon/platform/config';
import { mapOrgTreeToTreeSelectData } from '@/views/energyCarbon/platform/utils';

import {
  useAddMeasuringInstrument,
  useEditMeasuringInstrument,
  useMeasuringEnergyOptions,
} from '../../hooks';
import type {
  MeasuringInstrumentAddReq,
  MeasuringInstrumentRecord,
} from '../../types';

const MEASURING_INSTRUMENT_FORM_ID = 'measuring-instrument-form';

/** 抽屉操作目标；null 表示关闭。 */
export type MeasuringInstrumentDrawerTarget =
  | { kind: 'new' }
  | { kind: 'view'; record: MeasuringInstrumentRecord }
  | { kind: 'edit'; record: MeasuringInstrumentRecord }
  | null;

interface FormValues {
  orgId?: number;
  instrumentName: string;
  instrumentCode: string;
  specification?: string;
  model?: string;
  energyId: number;
  manufacturer?: string;
  remark?: string;
}

interface Props {
  target: MeasuringInstrumentDrawerTarget;
  onClose: () => void;
}

/** 计量器具新增、编辑抽屉，计量能源固定复用 Kernel 能源目录。 */
export default function MeasuringInstrumentFormDrawer({
  target,
  onClose,
}: Props) {
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
  const [energyKeyword, setEnergyKeyword] = useState('');
  const deferredEnergyKeyword = useDeferredValue(energyKeyword);
  const {
    data: energyOptionsData,
    isLoading: energyLoading,
    isError: energyError,
  } = useMeasuringEnergyOptions(deferredEnergyKeyword);
  const { mutate: addInstrument, isLoading: adding } =
    useAddMeasuringInstrument();
  const { mutate: editInstrument, isLoading: editing } =
    useEditMeasuringInstrument();

  const energyOptions = useMemo(() => {
    const options = (energyOptionsData ?? []).map(energy => ({
      label: (
        <Typography.Text ellipsis={{ tooltip: energy.name }}>
          {energy.name}
        </Typography.Text>
      ),
      value: energy.id,
    }));
    // 编辑历史数据时保留当前仍有效但不在搜索结果中的能源选项。
    if (
      target?.kind === 'edit' &&
      target.record.energyName &&
      !options.some(option => option.value === target.record.energyId)
    ) {
      options.unshift({
        label: (
          <Typography.Text ellipsis={{ tooltip: target.record.energyName }}>
            {target.record.energyName}
          </Typography.Text>
        ),
        value: target.record.energyId,
      });
    }
    return options;
  }, [energyOptionsData, target]);
  const energyUnavailable =
    energyError ||
    (!energyLoading && !deferredEnergyKeyword && energyOptions.length === 0);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setEnergyKeyword('');
      return;
    }

    // 每次打开重建组织和七个业务字段，新增组织从当前账号数据权限树选择，避免沿用上次内容。
    form.setFieldsValue({
      orgId,
      instrumentName: isEdit ? target.record.instrumentName : '',
      instrumentCode: isEdit ? target.record.instrumentCode : '',
      specification: isEdit
        ? target.record.specification ?? undefined
        : undefined,
      model: isEdit ? target.record.model ?? undefined : undefined,
      energyId:
        isEdit && target.record.energyName ? target.record.energyId : undefined,
      manufacturer: isEdit
        ? target.record.manufacturer ?? undefined
        : undefined,
      remark: isEdit ? target.record.remark ?? undefined : undefined,
    });
  }, [form, isEdit, open, orgId, target]);

  const handleFinish = (values: FormValues) => {
    // 新增必须提交当前账号数据权限范围内的组织；编辑只提交业务字段，组织归属由后端保留原值。
    const businessFields = {
      instrumentName: values.instrumentName.trim(),
      instrumentCode: values.instrumentCode.trim(),
      specification: values.specification?.trim() || undefined,
      model: values.model?.trim() || undefined,
      energyId: values.energyId,
      manufacturer: values.manufacturer?.trim() || undefined,
      remark: values.remark?.trim() || undefined,
    };
    if (target?.kind === 'edit') {
      editInstrument(
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
    const request: MeasuringInstrumentAddReq = {
      orgId: selectedOrgId,
      ...businessFields,
    };
    addInstrument(request, { onSuccess: onClose });
  };

  return (
    <Drawer
      title={
        isView
          ? I18N.energyCarbon.cfgInstrumentDetails
          : isEdit
          ? I18N.energyCarbon.cfgEditInstrument
          : I18N.energyCarbon.cfgAddInstrument
      }
      open={open}
      onClose={onClose}
      destroyOnClose
      placement='right'
      size='large'
      data-testid='measuring-instrument-form-drawer'
      footer={
        energyUnavailable ? (
          <FormDrawerFooter>
            <Space>
              <span>{I18N.energyCarbon.cfgMeasuredEnergyUnavailable}</span>
              <Button onClick={onClose}>{I18N.common.actions.close}</Button>
            </Space>
          </FormDrawerFooter>
        ) : (
          <FormDrawerFooter
            isView={isView}
            onClose={onClose}
            testIdPrefix='measuring-instrument-form'
            formId={MEASURING_INSTRUMENT_FORM_ID}
            saveLoading={adding || editing || energyLoading}
          />
        )
      }
    >
      <Form<FormValues>
        id={MEASURING_INSTRUMENT_FORM_ID}
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
                  data-testid='measuring-instrument-form-org'
                />
              ) : (
                <TreeSelect
                  allowClear
                  showSearch
                  treeNodeFilterProp='title'
                  treeData={orgTreeData}
                  treeDefaultExpandAll
                  placeholder={I18N.common.placeholder.select}
                  data-testid='measuring-instrument-form-org'
                />
              )}
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={I18N.energyCarbon.cfgInstrumentName}
              name='instrumentName'
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: I18N.energyCarbon.cfgInstrumentNameRequired,
                },
                { max: 100, message: I18N.energyCarbon.max100InputCharacters },
              ]}
            >
              <Input
                disabled={isView}
                placeholder={I18N.common.placeholder.input}
                data-testid='measuring-instrument-form-name'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={I18N.energyCarbon.cfgInstrumentCode}
              name='instrumentCode'
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: I18N.energyCarbon.cfgInstrumentCodeRequired,
                },
                { max: 100, message: I18N.energyCarbon.max100InputCharacters },
              ]}
            >
              <Input
                disabled={isView}
                placeholder={I18N.common.placeholder.input}
                data-testid='measuring-instrument-form-code'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={I18N.energyCarbon.cfgSpecification}
              name='specification'
              rules={[
                { max: 100, message: I18N.energyCarbon.max100InputCharacters },
              ]}
            >
              <Input
                disabled={isView}
                placeholder={I18N.common.placeholder.input}
                data-testid='measuring-instrument-form-specification'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={I18N.energyCarbon.cfgModel}
              name='model'
              rules={[
                { max: 100, message: I18N.energyCarbon.max100InputCharacters },
              ]}
            >
              <Input
                disabled={isView}
                placeholder={I18N.common.placeholder.input}
                data-testid='measuring-instrument-form-model'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={I18N.energyCarbon.cfgMeasuredEnergy}
              name='energyId'
              rules={[
                {
                  required: true,
                  message: I18N.energyCarbon.cfgMeasuredEnergyRequired,
                },
              ]}
            >
              <Select
                showSearch
                allowClear
                filterOption={false}
                options={energyOptions}
                loading={energyLoading}
                disabled={isView || energyError}
                placeholder={I18N.energyCarbon.cfgSelectOrSearchEnergy}
                onSearch={setEnergyKeyword}
                data-testid='measuring-instrument-form-energy'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={I18N.energyCarbon.cfgManufacturer}
              name='manufacturer'
              rules={[
                { max: 100, message: I18N.energyCarbon.max100InputCharacters },
              ]}
            >
              <Input
                disabled={isView}
                placeholder={I18N.common.placeholder.input}
                data-testid='measuring-instrument-form-manufacturer'
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
                disabled={isView}
                rows={4}
                placeholder={I18N.common.placeholder.input}
                data-testid='measuring-instrument-form-remark'
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
}
