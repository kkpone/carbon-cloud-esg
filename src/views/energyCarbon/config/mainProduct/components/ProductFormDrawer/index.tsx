import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import {
  Button,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Space,
} from 'antd';
import { useEffect } from 'react';

import FormDrawerFooter from '@/views/energyCarbon/components/FormDrawerFooter';
import LeafCascader from '@/views/energyCarbon/components/LeafCascader';
import { useUnitList } from '@/views/energyCarbon/hooks/useEnergyUnits';
import { FORM_CONFIG } from '@/views/energyCarbon/platform/config';

import { useAddProduct, useEditProduct } from '../../hooks';
import type { ProductAddReq, ProductRecord } from '../../types';

const PRODUCT_FORM_ID = 'main-product-form';

export type ProductDrawerTarget =
  | { kind: 'new' }
  | { kind: 'view'; record: ProductRecord }
  | { kind: 'edit'; record: ProductRecord }
  | null;

interface FormValues {
  productName: string;
  productCode: string;
  productSpecification?: string;
  productModel?: string;
  unit: string;
  standardCoefficient: string;
  standardProduct: boolean;
  description?: string;
}

interface Props {
  target: ProductDrawerTarget;
  onClose: () => void;
}

/** 产品新增、编辑、查看抽屉；单位固定复用 Kernel 单位管理。 */
export default function ProductFormDrawer({ target, onClose }: Props) {
  const { locale } = useLocale();
  const open = target !== null;
  const isView = target?.kind === 'view';
  const isEdit = target?.kind === 'edit';
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
  const standardProduct = Form.useWatch('standardProduct', form);
  const {
    cascaderOptions: unitOptions,
    isLoading: unitLoading,
    isError: unitError,
  } = useUnitList(open && !isView);
  const { mutate: addProduct, isLoading: adding } = useAddProduct();
  const { mutate: editProduct, isLoading: editing } = useEditProduct();
  const unitUnavailable =
    !isView && (unitError || (!unitLoading && unitOptions.length === 0));

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }
    form.setFieldsValue({
      productName: record?.productName ?? '',
      productCode: record?.productCode ?? '',
      productSpecification: record?.productSpecification ?? undefined,
      productModel: record?.productModel ?? undefined,
      unit: record?.unit ?? '',
      standardCoefficient: record ? String(record.standardCoefficient) : '',
      standardProduct: record?.standardProduct ?? false,
      description: record?.description ?? undefined,
    });
  }, [form, open, record]);

  useEffect(() => {
    if (!open || !standardProduct) return;
    // 标准产品的折算口径固定为 1，仅自动回填，不禁用输入框，避免额外锁死用户操作。
    form.setFieldValue('standardCoefficient', '1');
  }, [form, open, standardProduct]);

  const handleFinish = (values: FormValues) => {
    // 提交前按标准产品口径归一系数；非标准产品仍保留用户输入值。
    const request: ProductAddReq = {
      ...values,
      standardCoefficient: values.standardProduct
        ? '1'
        : values.standardCoefficient,
      productName: values.productName.trim(),
      productCode: values.productCode.trim(),
      productSpecification: values.productSpecification?.trim() || undefined,
      productModel: values.productModel?.trim() || undefined,
      description: values.description?.trim() || undefined,
    };
    if (target?.kind === 'edit') {
      editProduct({ id: target.record.id, ...request }, { onSuccess: onClose });
      return;
    }
    addProduct(request, { onSuccess: onClose });
  };

  return (
    <Drawer
      title={
        isView
          ? I18N.energyCarbon.cfgMainProductDetails
          : isEdit
          ? I18N.energyCarbon.cfgEditMainProduct
          : I18N.energyCarbon.cfgAddMainProduct
      }
      open={open}
      onClose={onClose}
      destroyOnClose
      placement='right'
      size='large'
      data-testid='main-product-form-drawer'
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
            testIdPrefix='main-product-form'
            formId={PRODUCT_FORM_ID}
            saveLoading={adding || editing || unitLoading}
          />
        )
      }
    >
      <Form<FormValues>
        id={PRODUCT_FORM_ID}
        form={form}
        layout='vertical'
        requiredMark={!isView}
        disabled={isView}
        onFinish={handleFinish}
      >
        <Row gutter={FORM_CONFIG.gutter}>
          <Col xs={24} sm={12}>
            <Form.Item
              label={I18N.common.fields.productName}
              name='productName'
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: I18N.common.shared.productNameRequired,
                },
                { max: 100, message: I18N.energyCarbon.max100InputCharacters },
              ]}
            >
              <Input
                placeholder={I18N.common.placeholder.input}
                data-testid='main-product-form-name'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={I18N.energyCarbon.cfgProductCode}
              name='productCode'
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: I18N.energyCarbon.cfgProductCodeRequired,
                },
                { max: 100, message: I18N.energyCarbon.max100InputCharacters },
              ]}
            >
              <Input
                placeholder={I18N.common.placeholder.input}
                data-testid='main-product-form-code'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={I18N.energyCarbon.cfgProductSpecification}
              name='productSpecification'
              rules={[
                { max: 100, message: I18N.energyCarbon.max100InputCharacters },
              ]}
            >
              <Input
                placeholder={I18N.common.placeholder.input}
                data-testid='main-product-form-specification'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={I18N.energyCarbon.cfgProductModel}
              name='productModel'
              rules={[
                { max: 100, message: I18N.energyCarbon.max100InputCharacters },
              ]}
            >
              <Input
                placeholder={I18N.common.placeholder.input}
                data-testid='main-product-form-model'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            {isView ? (
              <Form.Item label={I18N.energyCarbon.measurementUnit}>
                <Input value={record?.unitName ?? ''} disabled />
              </Form.Item>
            ) : (
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
                  disabled={unitUnavailable}
                  data-testid='main-product-form-unit'
                />
              </Form.Item>
            )}
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={I18N.energyCarbon.cfgStandardCoefficient}
              name='standardCoefficient'
              rules={[
                {
                  required: true,
                  message: I18N.energyCarbon.cfgStandardCoefficientRequired,
                },
              ]}
            >
              {/* 保留 6 位小数限制，失焦展示时去掉末尾无意义的 0。 */}
              <InputNumber<string>
                min='0'
                precision={6}
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
                data-testid='main-product-form-coefficient'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label={I18N.energyCarbon.standardProduct}
              name='standardProduct'
              rules={[
                {
                  required: true,
                  message: I18N.energyCarbon.cfgStandardProductRequired,
                },
              ]}
            >
              <Radio.Group
                options={[
                  { label: I18N.common.answers.yes, value: true },
                  { label: I18N.common.answers.no, value: false },
                ]}
                data-testid='main-product-form-standard'
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              label={I18N.energyCarbon.cfgProductDescription}
              name='description'
              rules={[
                { max: 500, message: I18N.energyCarbon.cfgMax500Characters },
              ]}
            >
              <Input.TextArea
                rows={4}
                placeholder={I18N.common.placeholder.input}
                data-testid='main-product-form-description'
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
}
