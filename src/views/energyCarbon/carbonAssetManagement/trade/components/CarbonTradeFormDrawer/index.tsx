import {
  Col,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Spin,
  TreeSelect,
} from 'antd';
import BigNumber from 'bignumber.js';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';

import I18N from '@/lang/I18N';
import type { FileInfo } from '@/views/energyCarbon/components/FileUpload';
import FileUpload from '@/views/energyCarbon/components/FileUpload';
import FormDrawerFooter from '@/views/energyCarbon/components/FormDrawerFooter';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import { useDataPermissionOrgTree } from '@/views/energyCarbon/hooks/useEnergyOrgTree';
import { FORM_CONFIG } from '@/views/energyCarbon/platform/config';
import { mapOrgTreeToTreeSelectData } from '@/views/energyCarbon/platform/utils';

import {
  CARBON_ASSET_OPTIONS,
  getCarbonTradeTypeOptions,
  isMarketTrade,
} from '../../constant';
import {
  useAddCarbonTrade,
  useCarbonTradeDetail,
  useEditCarbonTrade,
} from '../../hooks';
import type {
  CarbonAsset,
  CarbonTradeSaveReq,
  CarbonTradeType,
} from '../../types';

import styles from './index.module.css';

const FORM_ID = 'carbon-trade-form';

export type CarbonTradeDrawerTarget =
  | { kind: 'new'; orgId?: number }
  | { kind: 'edit'; id: number }
  | null;

interface Props {
  target: CarbonTradeDrawerTarget;
  onClose: () => void;
}

interface FormValues {
  carbonAsset: CarbonAsset;
  orgId: number;
  tradeType: CarbonTradeType;
  documentNo: string;
  tradeDate: Dayjs;
  complianceYear?: Dayjs;
  counterparty?: string;
  quantity: string;
  tradePrice?: string;
  feeRate?: string;
  contractNo?: string;
  contractName?: string;
  contractFile?: FileInfo[];
}

/** 正十进制乘法保持 HALF_UP 金额显示精度，divisorScale=2 表示百分比。 */
function multiplyDecimal(
  left?: string,
  right?: string,
  resultScale = 2,
  divisorScale = 0,
) {
  if (
    !left ||
    !right ||
    !/^\d+(?:\.\d+)?$/u.test(left) ||
    !/^\d+(?:\.\d+)?$/u.test(right)
  )
    return undefined;
  return new BigNumber(left)
    .multipliedBy(right)
    .dividedBy(new BigNumber(10).pow(divisorScale))
    .toFixed(resultScale, BigNumber.ROUND_HALF_UP);
}

/** 碳交易新增、编辑抽屉，金额仅即时展示，提交后以后端重算结果为准。 */
export default function CarbonTradeFormDrawer({ target, onClose }: Props) {
  // 关闭动画结束前保留编辑目标，避免成功回调清空父状态后标题、详情和表单先变空。
  const [displayTarget, setDisplayTarget] = useState<Exclude<
    CarbonTradeDrawerTarget,
    null
  > | null>(target);
  const activeTarget = target ?? displayTarget;
  const open = target !== null;
  const isEdit = activeTarget?.kind === 'edit';
  const editId = activeTarget?.kind === 'edit' ? activeTarget.id : undefined;
  const [form] = Form.useForm<FormValues>();
  const { locale } = useLocale();
  const validationLocale = useRef(locale);
  useEffect(() => {
    if (validationLocale.current === locale) return;
    validationLocale.current = locale;
    // 切换语言只刷新已显示的校验错误，不重置表单或触发未报错字段的校验。
    const invalidFields = form
      .getFieldsError()
      .filter(({ errors }) => errors.length > 0)
      .map(({ name }) => name);
    if (invalidFields.length)
      form.validateFields(invalidFields).catch(() => undefined);
  }, [form, locale]);
  const { data: orgTree = [] } = useDataPermissionOrgTree({ enabled: open });
  const orgTreeData = useMemo(
    () => mapOrgTreeToTreeSelectData(orgTree, { disableInactive: true }),
    [orgTree],
  );
  // React Query 4 的禁用查询仍为 isLoading，新增态只等待真正发起的首次详情请求。
  const { data: detail, isInitialLoading: detailLoading } =
    useCarbonTradeDetail(editId);
  const { mutate: addTrade, isLoading: adding } = useAddCarbonTrade();
  const { mutate: editTrade, isLoading: editing } = useEditCarbonTrade();

  // 监听资产、交易类型和计价字段，驱动类型选项、市场字段显隐及前端即时金额展示。
  const carbonAsset = Form.useWatch('carbonAsset', form);
  const tradeType = Form.useWatch('tradeType', form);
  const quantity = Form.useWatch('quantity', form);
  const tradePrice = Form.useWatch('tradePrice', form);
  const feeRate = Form.useWatch('feeRate', form);
  const marketTrade = isMarketTrade(tradeType);
  const ceaCompliance = carbonAsset === 1 && tradeType === 106;
  const tradeAmount = marketTrade
    ? multiplyDecimal(quantity, tradePrice, 2)
    : undefined;
  const settlementFee = marketTrade
    ? multiplyDecimal(tradeAmount, feeRate, 2, 2)
    : undefined;
  const tradeTypeOptions = useMemo(
    () =>
      getCarbonTradeTypeOptions()
        .filter(option => option.carbonAsset === carbonAsset)
        .map(({ label, value }) => ({ label, value })),
    [carbonAsset, locale],
  );

  // 先清空旧组织单据号；异步返回时再次核对组织，防止快速切换导致串号。
  // 上述自动生成流程已停用；凭证号由用户手工填写，组织切换不覆盖输入。

  useEffect(() => {
    if (target) setDisplayTarget(target);
  }, [target]);

  useEffect(() => {
    // 打开新增抽屉时重置默认资产、组织和日期，并在组织存在时主动生成单据号。
    // 当前仅重置资产、组织和日期，不再请求自动生成单据号。
    form.resetFields();
    if (activeTarget?.kind !== 'new') return;
    form.setFieldsValue({
      carbonAsset: 1,
      orgId: activeTarget.orgId,
      tradeDate: dayjs(),
    });
  }, [activeTarget, form]);

  useEffect(() => {
    if (!isEdit || !detail) return;
    // 编辑态以详情接口回填全部可编辑字段，所属组织只展示且不可修改。
    form.setFieldsValue({
      carbonAsset: detail.carbonAsset,
      orgId: detail.orgId,
      tradeType: detail.tradeType,
      documentNo: detail.documentNo,
      tradeDate: dayjs(detail.tradeDate),
      complianceYear: detail.complianceYear
        ? dayjs(`${detail.complianceYear}-01-01`)
        : undefined,
      counterparty: detail.counterparty,
      quantity: String(detail.quantity),
      tradePrice: detail.tradePrice,
      feeRate: detail.feeRate,
      contractNo: detail.contractNo,
      contractName: detail.contractName,
      contractFile: detail.contractFile ? [detail.contractFile] : [],
    });
  }, [detail, form, isEdit]);

  useEffect(() => {
    if (!open || !tradeType || marketTrade) return;
    // 切换到非市场交易时立即清空不可填写字段，避免提交隐藏脏值。
    form.setFieldsValue({
      counterparty: undefined,
      tradePrice: undefined,
      feeRate: undefined,
    });
  }, [form, marketTrade, open, tradeType]);

  const handleFinish = (values: FormValues) => {
    // 仅市场交易提交交易对手方、价格和费率；金额与手续费始终以后端重算为准。
    const request: CarbonTradeSaveReq = {
      carbonAsset: values.carbonAsset,
      orgId: values.orgId,
      tradeType: values.tradeType,
      documentNo: values.documentNo.trim(),
      tradeDate: values.tradeDate.format('YYYY-MM-DD'),
      complianceYear: ceaCompliance ? values.complianceYear?.year() : undefined,
      counterparty: marketTrade
        ? values.counterparty?.trim() || undefined
        : undefined,
      quantity: values.quantity,
      tradePrice: marketTrade ? values.tradePrice : undefined,
      feeRate: marketTrade ? values.feeRate : undefined,
      contractNo: values.contractNo?.trim() || undefined,
      contractName: values.contractName?.trim() || undefined,
      contractFile: values.contractFile?.[0],
    };
    if (activeTarget?.kind === 'edit') {
      // 编辑请求补充交易 ID，成功后由 mutation 刷新列表、详情和账户概览缓存。
      editTrade({ id: activeTarget.id, ...request }, { onSuccess: onClose });
      return;
    }
    // 新增成功后关闭抽屉，缓存刷新由统一 mutation 副作用完成。
    addTrade(request, { onSuccess: onClose });
  };

  return (
    <Drawer
      title={
        isEdit
          ? I18N.energyCarbon.assetEditTrade
          : I18N.energyCarbon.assetAddTrade
      }
      open={open}
      onClose={onClose}
      afterOpenChange={nextOpen => {
        if (!nextOpen) setDisplayTarget(null);
      }}
      destroyOnClose
      placement='right'
      size='large'
      data-testid='carbon-trade-form-drawer'
      footer={
        <FormDrawerFooter
          isView={false}
          onClose={onClose}
          testIdPrefix='carbon-trade-form'
          formId={FORM_ID}
          saveLoading={adding || editing || detailLoading}
        />
      }
    >
      <Spin spinning={detailLoading}>
        <Form<FormValues>
          id={FORM_ID}
          form={form}
          layout='vertical'
          onFinish={handleFinish}
        >
          <section className={styles.sectionBlock}>
            <div className={styles.sectionTitle}>
              {I18N.energyCarbon.assetTradeInformation}
            </div>
            <Row gutter={FORM_CONFIG.gutter}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label={I18N.common.fields.organization}
                  name='orgId'
                  rules={[
                    {
                      required: true,
                      message: I18N.common.validation.organizationRequired,
                    },
                  ]}
                >
                  <TreeSelect
                    treeData={orgTreeData}
                    treeDefaultExpandAll
                    showSearch
                    treeNodeFilterProp='title'
                    placeholder={I18N.common.placeholder.select}
                    disabled={isEdit}
                    data-testid='carbon-trade-form-org'
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label={I18N.energyCarbon.assetCarbonAsset}
                  name='carbonAsset'
                  rules={[
                    {
                      required: true,
                      message: I18N.energyCarbon.assetCarbonAssetRequired,
                    },
                  ]}
                >
                  <Select
                    options={CARBON_ASSET_OPTIONS}
                    placeholder={I18N.common.placeholder.select}
                    data-testid='carbon-trade-form-asset'
                    onChange={() => {
                      form.setFieldsValue({
                        tradeType: undefined,
                        complianceYear: undefined,
                        counterparty: undefined,
                        tradePrice: undefined,
                        feeRate: undefined,
                      });
                    }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label={I18N.energyCarbon.assetTradeType}
                  name='tradeType'
                  rules={[
                    {
                      required: true,
                      message: I18N.energyCarbon.assetTradeTypeRequired,
                    },
                  ]}
                >
                  <Select
                    options={tradeTypeOptions}
                    placeholder={I18N.common.placeholder.select}
                    data-testid='carbon-trade-form-type'
                    onChange={() =>
                      form.setFieldValue('complianceYear', undefined)
                    }
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label={I18N.energyCarbon.tradeVoucher}
                  name='documentNo'
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: I18N.energyCarbon.tradeVoucherRequired,
                    },
                    {
                      max: 100,
                      message: I18N.energyCarbon.max100InputCharacters,
                    },
                  ]}
                >
                  <Input
                    placeholder={I18N.common.placeholder.input}
                    data-testid='carbon-trade-form-document-no'
                  />
                </Form.Item>
              </Col>
              {ceaCompliance && (
                <Col xs={24} sm={12}>
                  <Form.Item
                    name='complianceYear'
                    label={I18N.energyCarbon.tradeComplianceYear}
                    preserve={false}
                    rules={[
                      {
                        required: true,
                        message: I18N.energyCarbon.tradeComplianceYearRequired,
                      },
                      {
                        validator: (_rule, value?: Dayjs) =>
                          !value ||
                          (value.year() >= 2000 &&
                            value.year() <= dayjs().year())
                            ? Promise.resolve()
                            : Promise.reject(
                                new Error(
                                  I18N.energyCarbon.tradeComplianceYearRange,
                                ),
                              ),
                      },
                    ]}
                  >
                    <DatePicker
                      className={styles.complianceYearPicker}
                      picker='year'
                      placeholder={I18N.common.placeholder.select}
                      disabledDate={date =>
                        date.year() < 2000 || date.year() > dayjs().year()
                      }
                      data-testid='carbon-trade-form-compliance-year'
                    />
                  </Form.Item>
                </Col>
              )}
              <Col xs={24} sm={12}>
                <Form.Item
                  label={I18N.energyCarbon.assetTradeDate}
                  name='tradeDate'
                  rules={[
                    {
                      required: true,
                      message: I18N.energyCarbon.assetTradeDateRequired,
                    },
                  ]}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    placeholder={I18N.common.placeholder.select}
                    disabledDate={date => date.isAfter(dayjs().endOf('day'))}
                    data-testid='carbon-trade-form-date'
                  />
                </Form.Item>
              </Col>
              {marketTrade && (
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={I18N.energyCarbon.assetCounterparty}
                    name='counterparty'
                    rules={[
                      {
                        required: true,
                        whitespace: true,
                        message: I18N.energyCarbon.assetCounterpartyRequired,
                      },
                      {
                        max: 100,
                        message: I18N.energyCarbon.max100InputCharacters,
                      },
                    ]}
                  >
                    <Input
                      placeholder={I18N.common.placeholder.input}
                      data-testid='carbon-trade-form-counterparty'
                    />
                  </Form.Item>
                </Col>
              )}
              <Col xs={24} sm={12}>
                <Form.Item
                  label={I18N.energyCarbon.assetTradeQuantity}
                  name='quantity'
                  rules={[
                    {
                      required: true,
                      message: I18N.energyCarbon.assetTradeQuantityRequired,
                    },
                  ]}
                >
                  <InputNumber<string>
                    min='0.001'
                    precision={3}
                    stringMode
                    style={{ width: '100%' }}
                    placeholder={I18N.common.placeholder.input}
                    data-testid='carbon-trade-form-quantity'
                  />
                </Form.Item>
              </Col>
              {marketTrade && (
                <>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={I18N.energyCarbon.assetTradePrice}
                      name='tradePrice'
                      rules={[
                        {
                          required: true,
                          message: I18N.energyCarbon.assetTradePriceRequired,
                        },
                      ]}
                    >
                      <InputNumber<string>
                        min='0.01'
                        precision={2}
                        stringMode
                        style={{ width: '100%' }}
                        placeholder={I18N.common.placeholder.input}
                        data-testid='carbon-trade-form-price'
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label={I18N.energyCarbon.assetTradeAmount}>
                      <Input
                        value={tradeAmount}
                        disabled
                        placeholder={
                          I18N.energyCarbon.assetCalculatedAutomatically
                        }
                        data-testid='carbon-trade-form-amount'
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={I18N.energyCarbon.assetFeeRate}
                      name='feeRate'
                      rules={[
                        {
                          required: true,
                          message: I18N.energyCarbon.assetFeeRateRequired,
                        },
                      ]}
                    >
                      <InputNumber<string>
                        min='0'
                        max='100'
                        precision={4}
                        stringMode
                        style={{ width: '100%' }}
                        placeholder={I18N.common.placeholder.input}
                        data-testid='carbon-trade-form-fee-rate'
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label={I18N.energyCarbon.assetSettlementFee}>
                      <Input
                        value={settlementFee}
                        disabled
                        placeholder={
                          I18N.energyCarbon.assetCalculatedAutomatically
                        }
                        data-testid='carbon-trade-form-settlement-fee'
                      />
                    </Form.Item>
                  </Col>
                </>
              )}
            </Row>
          </section>

          <section className={styles.sectionBlock}>
            <div className={styles.sectionTitle}>
              {I18N.energyCarbon.assetContractInformation}
            </div>
            <Row gutter={FORM_CONFIG.gutter}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label={I18N.energyCarbon.assetContractNumber}
                  name='contractNo'
                  rules={[
                    {
                      max: 100,
                      message: I18N.energyCarbon.max100InputCharacters,
                    },
                  ]}
                >
                  <Input
                    placeholder={I18N.common.placeholder.input}
                    data-testid='carbon-trade-form-contract-no'
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label={I18N.energyCarbon.assetContractName}
                  name='contractName'
                  rules={[
                    {
                      max: 100,
                      message: I18N.energyCarbon.max100InputCharacters,
                    },
                  ]}
                >
                  <Input
                    placeholder={I18N.common.placeholder.input}
                    data-testid='carbon-trade-form-contract-name'
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  label={I18N.energyCarbon.assetContractFile}
                  name='contractFile'
                >
                  <FileUpload
                    maxCount={1}
                    maxSizeMB={50}
                    uploadUrl='/energy/carbonTrade/contract/upload'
                    data-testid='carbon-trade-form-contract-file'
                  />
                </Form.Item>
              </Col>
            </Row>
          </section>
        </Form>
      </Spin>
    </Drawer>
  );
}
