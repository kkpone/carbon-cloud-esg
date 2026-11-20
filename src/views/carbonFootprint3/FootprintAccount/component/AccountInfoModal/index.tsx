import {
  LcaInformation,
  LcaInformationFields,
  pickLcaInformation,
} from '../../../components/LcaInformation';
/* eslint-disable no-nested-ternary */
import {
  Form,
  FormItem,
  Input,
  DatePicker,
  NumberPicker,
  Cascader,
  Select,
} from '@formily/antd-v5';
import { createForm, onFieldChange } from '@formily/core';
import { FormConsumer, Field } from '@formily/react';
import defaultImg from '@src/assets/svg/accountProductImg.svg';
import I18N from '@src/lang/I18N';
import {
  Button,
  Image,
  Modal,
  Tag,
  Tooltip,
  Cascader as ProductUnitCascader,
} from 'antd';
import { isNil } from 'lodash-es';
import classNames from 'classnames';
import {
  FC,
  useEffect,
  useMemo,
  useRef,
  useState,
  MutableRefObject,
} from 'react';

import { useAICarbonFloating } from '@/components/AICarbonFloating/AICarbonContext';
import { IconAlibaba, IconAlibabaNew } from '@/components/iconfont';
import useFieldUnitDictSource from '@/hooks/useFieldUnitDictSource';
import FormilyImgUpload from '@/views/carbonFootprint3/component/FormilyImgUpload';
import FormilySystemBoundaryRadio from '@/views/carbonFootprint3/component/FormilySystemBoundaryRadio';
import { QUICK_ACCOUNT_LIFE_CYCLE } from '@/views/carbonFootprint3/constant';

import EmbeddedModal from '../../components/EmbeddedModal';
import styles from './index.module.less';
import modalCloseIcon from './assets/task1-close.svg';
import unitArrowIcon from './assets/task1-chevron.svg';
import quantityInfoIcon from './assets/task1-info.svg';
import dateRangeIcon from './assets/task1-range.svg';
import calendarIcon from './assets/task1-calendar.svg';
import dividerIcon from './assets/task1-divider.svg';
import quickAccountIcon from './assets/task1-quick.svg';
import selectedIcon from './assets/task1-selected.svg';
import addImageIcon from './assets/task1-add.svg';
import { getAccountingInfo } from '../../AccountDetail/AccountInfo/service';
import { AccountingInfoData } from '../../AccountDetail/AccountInfo/type';
import { getSelectModelInfo } from '../../SelectModel/service';
import {
  FOOTPRINT_ACCOUNT_TYPE_STATUS_LABEL,
  FootprintAccountLifeCycle,
  FootprintAccountStatusType,
} from '../../constant';
import {
  getPublishedGlobalFactorPreferencePlans,
  getGlobalFactorPreferencePlanInfo,
} from '../GlobalFactorPreference/service';
import { GlobalFactorPreferencePlan } from '../GlobalFactorPreference/type';
import { getAccountProductData, getAccountProductInfo } from '../../service';
import { AccountProductData } from '../../type';

const { MATERIAL, PRODUCT, DISTRIBUTION } = QUICK_ACCOUNT_LIFE_CYCLE;
const ALL_FACTOR_PREFERENCE_VALUE = 'ALL';

type FactorPreferenceValue = string;

type FactorPreferenceOption = {
  value: FactorPreferenceValue;
  label: string;
  sourceNames: string;
};

const getSourceNamesText = (sourceNames?: string) => sourceNames || '-';

const getFactorPreferenceOptions = (
  plans: GlobalFactorPreferencePlan[],
): FactorPreferenceOption[] => [
  {
    value: ALL_FACTOR_PREFERENCE_VALUE,
    label: I18N.carbonFootprint3.whole,
    sourceNames: I18N.carbonFootprint3.allBackgroundDatabaseSources,
  },
  ...plans.map(plan => ({
    value: String(plan.id),
    label: plan.name,
    sourceNames: getSourceNamesText(plan.sourceNames),
  })),
];

const resolveDefaultFactorPreferenceValue = (
  plans: GlobalFactorPreferencePlan[],
): FactorPreferenceValue => {
  const defaultPlanId = plans.find(plan => plan.isDefault)?.id;
  return isNil(defaultPlanId)
    ? ALL_FACTOR_PREFERENCE_VALUE
    : String(defaultPlanId);
};

const resolveAccountFactorPreferenceValue = (
  value?: number | string,
): FactorPreferenceValue => {
  if (isNil(value) || value === '' || Number(value) === 0) {
    return ALL_FACTOR_PREFERENCE_VALUE;
  }

  return String(value);
};

/** 核算详情写入表单；编辑态额外同步产品 Select 的 dataSource */
const applyAccountInfoToForm = (
  form: ReturnType<typeof createForm>,
  accountData: AccountingInfoData,
  productNameRef: MutableRefObject<string>,
  isReadonly?: boolean,
) => {
  const { unitCode, unitType, unitName, aiStatus, aiType, ...rest } =
    accountData;
  productNameRef.current = accountData.productName;

  // 只读模式用 productName 字段展示，不依赖产品列表接口
  if (!isReadonly) {
    const productOption = {
      label: accountData.productName || '-',
      value: accountData.productId,
    };
    form.setFieldState('productId', state => {
      const list = Array.isArray(state.dataSource) ? [...state.dataSource] : [];
      if (
        !list.some(item => String(item.value) === String(accountData.productId))
      ) {
        list.unshift(productOption);
      }
      return { dataSource: list };
    });
  }

  form.setValues({
    ...rest,
    productName: accountData.productName,
    factorPrefId: resolveAccountFactorPreferenceValue(rest.factorPrefId),
    unitName,
    unit: [unitType, unitCode],
  });
};

/** 只读态：按 factorPrefId 调 /factorPref/info 获取方案名称，0/空为「全部」 */
const fetchFactorPrefDisplayName = async (
  factorPrefId?: number | string,
): Promise<string> => {
  if (
    isNil(factorPrefId) ||
    factorPrefId === '' ||
    Number(factorPrefId) === 0
  ) {
    return I18N.carbonFootprint3.whole;
  }
  try {
    const plan = await getGlobalFactorPreferencePlanInfo(Number(factorPrefId));
    return plan?.name || I18N.carbonFootprint3.whole;
  } catch {
    return I18N.carbonFootprint3.whole;
  }
};

const AccountInfoModal: FC<{
  open: boolean;
  embedded?: boolean;
  lcaOnly?: boolean;
  readonly?: boolean;
  /** 编辑态 disabled：保留输入框/下拉框，不可改（仅核算详情弹框 shareFlag 场景） */
  formDisabled?: boolean;
  productId?: string;
  accountType?: number;
  accountId?: string | number;
  modelId?: number;
  apiExtraParams?: Record<string, any>;
  isCopy?: boolean;
  onClose: () => void;
  scopeDisabled?: boolean;
  onConfirm: (val: Record<string, any>) => Promise<void> | void;
}> = ({
  open,
  embedded,
  lcaOnly,
  productId,
  accountType,
  accountId,
  modelId,
  readonly,
  formDisabled,
  isCopy,
  apiExtraParams,
  onClose,
  onConfirm,
  scopeDisabled,
}) => {
  const [accountInfo, setAccountInfo] = useState<AccountingInfoData>();

  const [productInfo, setProductInfo] = useState<AccountProductData>();

  const [factorPreferencePlans, setFactorPreferencePlans] = useState<
    GlobalFactorPreferencePlan[]
  >([]);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [lcaDraftForm, setLcaDraftForm] = useState<ReturnType<
    typeof createForm
  > | null>(null);

  const unitNameRef = useRef('');
  const productNameRef = useRef('');
  const manualProductRef = useRef(false);
  const factorPreferencePlansRef = useRef<GlobalFactorPreferencePlan[]>([]);
  const factorPreferencePlansLoadedRef = useRef(false);
  /** 产品列表缓存，用于切换产品时更新顶部预览图等 */
  const productRowsRef = useRef<AccountProductData[]>([]);
  /** 产品切换请求序号，避免较早的产品详情覆盖当前选择。 */
  const productSelectionRequestRef = useRef(0);

  const { isExpanded } = useAICarbonFloating();

  /** readPretty 纯文本；formDisabled 时保留输入框/下拉框 disabled */
  const isFormReadPretty = Boolean(readonly && !formDisabled);
  const isModalReadonly = Boolean(readonly || formDisabled);
  const isLcaView = lcaOnly || !!lcaDraftForm;
  /** 核算详情回填后再挂载字段，避免 Formily 缓存初始文案与组件配置。 */
  const accountInfoLoading = !isNil(accountId) && !accountInfo;

  const cancelCurrentModal = () => {
    if (lcaDraftForm) {
      setLcaDraftForm(null);
    } else {
      onClose();
    }
  };

  const factorPreferenceOptions = useMemo<FactorPreferenceOption[]>(
    () => getFactorPreferenceOptions(factorPreferencePlans),
    [factorPreferencePlans],
  );

  const renderFactorPreferenceOption = (option: {
    data?: FactorPreferenceOption;
  }) => {
    const label = option.data?.label || '-';
    const sourceNames = option.data?.sourceNames || '-';

    return (
      <div className={styles.factorPreferenceOption}>
        <div className={styles.factorPreferenceOptionName} title={label}>
          {label}
        </div>
        <div
          className={styles.factorPreferenceOptionSource}
          title={sourceNames}
        >
          {sourceNames}
        </div>
      </div>
    );
  };

  const form = useMemo(
    () =>
      createForm({
        readPretty: isFormReadPretty,
        disabled: !!formDisabled,
        effects: () => {
          onFieldChange('unit', ['value', 'dataSource'], field => {
            const { value = [], dataSource = [] } = field as unknown as {
              value: string[];
              dataSource: {
                value: string;
                label: string;
                children: { value: string; label: string }[];
              }[];
            };
            if (value.length > 0 && dataSource.length > 0) {
              for (let i = 0; i < dataSource.length; i += 1) {
                const unitType = dataSource[i];
                for (let j = 0; j < unitType.children.length; j += 1) {
                  const unit = unitType.children[j];
                  if (unit.value === value[1]) {
                    unitNameRef.current = unit.label;
                    form.setValues({ unitName: unit.label });
                    return;
                  }
                }
              }
            }
          });
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, isCopy, isFormReadPretty, formDisabled],
  );

  const isQuickAccount =
    (accountInfo?.type ?? accountType) === FootprintAccountStatusType.QUICK;
  const isQuickLayout = isQuickAccount && !isLcaView;
  const amountTitle = isQuickAccount ? (
    <span className={styles.quantityLabel}>
      {I18N.carbonFootprint3.task1FunctionalQuantity}
      <Tooltip title={I18N.carbonFootprint3.task1FunctionalQuantityHint}>
        <img
          src={quantityInfoIcon}
          alt={I18N.carbonFootprint3.task1FunctionalQuantityHint}
        />
      </Tooltip>
    </span>
  ) : (
    I18N.carbonFootprint.accountingQuantity
  );

  const submit = async () => {
    setSubmitLoading(true);
    try {
      const {
        unit,
        productId: productIdValue,
        factorPrefId: factorPrefIdValue,
        ...values
      } = await form.submit<{
        unit: string[];
        productId: string;
        factorPrefId?: FactorPreferenceValue;
        supplierName?: string;
      }>();
      const factorPrefId =
        factorPrefIdValue === ALL_FACTOR_PREFERENCE_VALUE ||
        isNil(factorPrefIdValue)
          ? 0
          : Number(factorPrefIdValue);
      await onConfirm({
        unitCode: unit?.[1],
        unitType: unit?.[0],
        productId: !manualProductRef.current ? productIdValue : null,
        ...values,
        factorPrefId,
      });
      onClose();
    } finally {
      setSubmitLoading(false);
    }
  };

  /** 编辑核算内的 LCA 仅回填草稿，随外层核算保存统一提交。 */
  const saveLcaDraft = async () => {
    if (!lcaDraftForm) return;
    const values = await lcaDraftForm.submit<LcaInformation>();
    form.setValues(pickLcaInformation(values));
    setLcaDraftForm(null);
  };

  /** 关弹后清空：与 destroyOnClose 配合，避免再次打开时残留图片、文案与表单值 */
  const clearModalState = () => {
    form.reset();
    setLcaDraftForm(null);
    setAccountInfo(undefined);
    setProductInfo(undefined);
    setFactorPreferencePlans([]);
    setSubmitLoading(false);
    unitNameRef.current = '';
    productNameRef.current = '';
    manualProductRef.current = false;
    factorPreferencePlansRef.current = [];
    factorPreferencePlansLoadedRef.current = false;
    productRowsRef.current = [];
    productSelectionRequestRef.current += 1;
  };

  useEffect(() => {
    if (!open) {
      setLcaDraftForm(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || isFormReadPretty) {
      return undefined;
    }

    let cancelled = false;
    getPublishedGlobalFactorPreferencePlans().then(plans => {
      if (cancelled) {
        return;
      }

      factorPreferencePlansRef.current = plans;
      factorPreferencePlansLoadedRef.current = true;
      setFactorPreferencePlans(plans);
      form.setFieldState('factorPrefId', {
        dataSource: getFactorPreferenceOptions(plans),
      });
      form.setValues({
        factorPrefId: !isNil(accountId)
          ? resolveAccountFactorPreferenceValue(form.values.factorPrefId)
          : resolveDefaultFactorPreferenceValue(plans),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [open, form, accountId, isFormReadPretty]);

  useEffect(() => {
    if (open) {
      if (!isFormReadPretty) {
        getAccountProductData({ pageNum: 1, pageSize: 10000 }).then(resp => {
          const enumData = resp.data.data.rows;
          productRowsRef.current = enumData;
          form.setFieldState('productId', {
            dataSource: enumData.map(data => ({
              label: data.productName,
              value: data.id,
              unitCode: data.accountUnitCode,
              isCustom: false,
            })),
          });
        });
      }
      if (!isNil(accountId)) {
        getAccountingInfo({ id: accountId as string, ...apiExtraParams }).then(
          async ({ data }) => {
            setAccountInfo(data.data);
            applyAccountInfoToForm(
              form,
              data.data,
              productNameRef,
              isFormReadPretty,
            );
            if (isFormReadPretty) {
              const factorPrefName = await fetchFactorPrefDisplayName(
                data.data.factorPrefId,
              );
              form.setValuesIn('factorPrefName', factorPrefName);
            }
          },
        );
      } else {
        if (!isNil(productId)) {
          getAccountProductInfo({ id: productId }).then(({ data }) => {
            const info = data.data;
            productNameRef.current = info.productName;

            setProductInfo(info);
            form.setValues({
              ...pickLcaInformation(info),
              productId: info.id,
              productName: info.productName,
              unitName: info.accountUnitName,
              unit: [info.unitType, info.accountUnitCode],
            });
          });
        }
        if (!isNil(accountType)) {
          form.setValues({
            type: accountType,
            ...(isNil(form.values.scope)
              ? { scope: FootprintAccountLifeCycle.FULL }
              : {}),
            scopeValue:
              accountType === FootprintAccountStatusType.QUICK
                ? `${MATERIAL},${PRODUCT},${DISTRIBUTION},`
                : `${PRODUCT},${DISTRIBUTION},`,
          });
        }
        if (!isNil(modelId)) {
          getSelectModelInfo({ id: modelId }).then(({ data }) => {
            const {
              amount,
              type,
              scope,
              scopeValue,
              specification,
              unitName,
              unitCodeArr,
            } = data.data as unknown as Record<string, any>;
            form.setValues({
              amount,
              type,
              scope,
              scopeValue,
              specification,
              unit: unitCodeArr ? JSON.parse(unitCodeArr) : undefined,
              unitName,
              modelId,
            });
          });
        }
      }
    }
  }, [
    open,
    accountId,
    accountType,
    modelId,
    apiExtraParams,
    productId,
    form,
    isFormReadPretty,
    isModalReadonly,
  ]);

  const Container = embedded ? EmbeddedModal : Modal;
  return (
    <Container
      title={
        isLcaView ? (
          <div className={styles.lcaTitle}>
            {I18N.ilcd.lcaInformationManagement}
            <Tag color='green'>{I18N.ilcd.accountLevel}</Tag>
          </div>
        ) : isModalReadonly ? (
          I18N.carbonFootprint3.accountingDetails
        ) : isNil(accountId) ? (
          I18N.carbonFootprint3.addAccounting
        ) : isCopy ? (
          I18N.carbonFootprint3.copyAccountingLetter
        ) : (
          I18N.carbonFootprint3.editAccountingLetter
        )
      }
      zIndex={isExpanded ? 20000 : undefined}
      open={open}
      loading={accountInfoLoading}
      width={isLcaView ? 960 : isQuickLayout ? 1104 : 888}
      className={classNames({
        [styles.lcaModal]: isLcaView,
        [styles.quickAccountModal]: isQuickLayout,
      })}
      closeIcon={
        isQuickLayout ? <img src={modalCloseIcon} alt='' /> : undefined
      }
      destroyOnClose
      afterClose={clearModalState}
      centered
      okText={
        isQuickLayout
          ? I18N.carbonFootprint.confirm
          : I18N.carbonFootprint.preserve
      }
      cancelText={
        isModalReadonly
          ? I18N.carbonFootprint3.close
          : I18N.carbonFootprint.cancel
      }
      okButtonProps={{
        loading: submitLoading,
        style: { display: isModalReadonly ? 'none' : 'inline' },
      }}
      footer={
        <div className={styles.modalFooter}>
          {!isLcaView && (
            <Button
              className={styles.lcaEntry}
              onClick={() =>
                setLcaDraftForm(
                  createForm({
                    values: pickLcaInformation(form.values),
                    readPretty: isModalReadonly,
                  }),
                )
              }
            >
              {I18N.ilcd.lcaInformationManagement}
            </Button>
          )}
          <div className={styles.footerActions}>
            <Button onClick={cancelCurrentModal}>
              {isModalReadonly
                ? I18N.carbonFootprint3.close
                : I18N.carbonFootprint.cancel}
            </Button>
            {!isModalReadonly && (
              <Button
                type='primary'
                loading={submitLoading}
                onClick={() => (lcaDraftForm ? saveLcaDraft() : submit())}
              >
                {isQuickLayout
                  ? I18N.carbonFootprint.confirm
                  : I18N.carbonFootprint.preserve}
              </Button>
            )}
          </div>
        </div>
      }
      onClose={cancelCurrentModal}
      onCancel={cancelCurrentModal}
      onOk={() => (lcaDraftForm ? saveLcaDraft() : submit())}
    >
      <Form
        form={form}
        layout='vertical'
        colon={false}
        className={classNames({
          [styles.lcaForm]: !!lcaOnly,
          [styles.modalFormReadonly]: !!formDisabled,
          [styles.lcaBaseFormHidden]: !!lcaDraftForm,
        })}
      >
        <div hidden={lcaOnly}>
          <div className={styles.header}>
            <Image
              width={152}
              height={152}
              preview={{ getContainer: false }}
              src={
                productInfo?.productPic || accountInfo?.productPic || defaultImg
              }
              onClick={e => {
                e.stopPropagation();
              }}
            />
            <div className={styles.infoGrid}>
              {isFormReadPretty ? (
                <Field
                  name='productName'
                  required
                  title={I18N.carbonFootprint.productName}
                  decorator={[FormItem]}
                  component={[
                    Input,
                    { placeholder: I18N.carbonFootprint.productName },
                  ]}
                />
              ) : (
                <Field
                  name='productId'
                  required
                  title={I18N.carbonFootprint.productName}
                  decorator={[FormItem]}
                  component={[
                    Select,
                    {
                      disabled: !!formDisabled || (!isCopy && !!productId),
                      showSearch: true,
                      optionFilterProp: 'label',
                      suffixIcon: isQuickLayout ? (
                        <img src={unitArrowIcon} alt='' />
                      ) : undefined,
                      placeholder: I18N.carbonFootprint.pleaseSelect,
                      onBlur: (e: { target: HTMLInputElement }) => {
                        if (formDisabled) return;
                        const searchText = e.target.value;
                        if (searchText) {
                          manualProductRef.current = true;
                          form.setValues({
                            productName: searchText,
                            productId: searchText,
                          });
                          productNameRef.current = searchText;
                        }
                      },
                      onChange: (val: string | number | null | undefined) => {
                        if (formDisabled) return;
                        if (val === undefined || val === null || val === '') {
                          return;
                        }
                        manualProductRef.current = false;
                        const row = productRowsRef.current.find(
                          p => String(p.id) === String(val),
                        );
                        if (row) {
                          productNameRef.current = row.productName;
                          form.setValues({ productName: row.productName });
                          setProductInfo(row);
                          if (isNil(accountId)) {
                            const requestId =
                              ++productSelectionRequestRef.current;
                            getAccountProductInfo({ id: val }).then(
                              ({ data }) => {
                                if (
                                  requestId !==
                                  productSelectionRequestRef.current
                                ) {
                                  return;
                                }
                                // 模型库创建核算时，使用当前产品已维护的 LCA 信息。
                                const productInfo = data.data;
                                setProductInfo(productInfo);
                                form.setValues({
                                  ...pickLcaInformation(productInfo),
                                  productName: productInfo.productName,
                                  unitName: productInfo.accountUnitName,
                                  unit: [
                                    productInfo.unitType,
                                    productInfo.accountUnitCode,
                                  ],
                                });
                              },
                            );
                          }
                        }
                      },
                    },
                  ]}
                />
              )}
              <div className={styles.amountGrid}>
                <Field
                  name='amount'
                  required
                  title={amountTitle}
                  decorator={[
                    FormItem,
                    {
                      labelWidth: isQuickLayout
                        ? 'calc(200% + 12px)'
                        : undefined,
                      // 跨列标签需高于右侧单位表单项，避免提示图标被遮挡。
                      labelStyle: isQuickLayout ? { zIndex: 1 } : undefined,
                    },
                  ]}
                  component={[
                    NumberPicker,
                    {
                      disabled: !!formDisabled,
                      placeholder: isQuickAccount
                        ? I18N.carbonFootprint3.task1FunctionalQuantity
                        : I18N.carbonFootprint.accountingQuantity,
                      controls: false,
                      min: 0,
                      max: 10000000000,
                      onBlur: () => {
                        setTimeout(() => {
                          const { accountName, amount } = form.values;
                          if (!accountName && !isNil(amount)) {
                            form.setValues({
                              accountName: `${amount}${unitNameRef.current}${productNameRef.current}`,
                            });
                          }
                        });
                      },
                    },
                  ]}
                />
                <Field
                  name='unit'
                  required
                  title=' '
                  decorator={[FormItem, { asterisk: false }]}
                  component={[
                    Cascader,
                    {
                      suffixIcon: isQuickLayout ? (
                        <img src={unitArrowIcon} alt='' />
                      ) : undefined,
                      disabled: !!formDisabled,
                      showSearch: true,
                      placeholder: I18N.carbonFootprint.unit,
                    },
                  ]}
                  reactions={[useFieldUnitDictSource('factorUnitM')]}
                />
              </div>
              <Field
                name='accountName'
                required
                title={I18N.carbonFootprint3.functionalUnits}
                decorator={[FormItem]}
                component={[
                  Input,
                  {
                    disabled: !!formDisabled,
                    placeholder: I18N.carbonFootprint3.functionalUnits,
                  },
                ]}
              />
              <Field
                name='[startTime,endTime]'
                required
                title={I18N.carbonFootprint.accountingCycle}
                decorator={[FormItem]}
                component={[
                  DatePicker.RangePicker,
                  {
                    disabled: !!formDisabled,
                    suffixIcon: isQuickLayout ? (
                      <img src={calendarIcon} alt='' />
                    ) : undefined,
                    separator: isQuickLayout ? (
                      <img src={dateRangeIcon} alt='' />
                    ) : undefined,
                  },
                ]}
              />
              {isQuickAccount && (
                <div className={styles.amountGrid}>
                  <Field
                    name='productAmount'
                    title={
                      <span className={styles.quantityLabel}>
                        {I18N.carbonFootprint3.task1ProductionAmount}
                        <Tooltip
                          title={I18N.carbonFootprint3.task1ProductionHint}
                        >
                          <img
                            src={quantityInfoIcon}
                            alt={I18N.carbonFootprint3.task1ProductionHint}
                          />
                        </Tooltip>
                      </span>
                    }
                    decorator={[FormItem]}
                    validator={(value: string | number | null | undefined) => {
                      if (value === undefined || value === null || value === '')
                        return '';
                      const text = String(value);
                      return text.length <= 40 &&
                        /^[0-9]+(?:\.[0-9]{1,9})?$/.test(text) &&
                        Number(text) > 0
                        ? ''
                        : I18N.carbonFootprint3.task1InvalidProductionAmount;
                    }}
                    component={[
                      NumberPicker,
                      {
                        disabled: !!formDisabled,
                        stringMode: true,
                        precision: 9,
                        formatter: (
                          value: string | number | undefined,
                          info: { userTyping: boolean; input: string },
                        ) =>
                          info.userTyping
                            ? info.input
                            : String(value ?? '').replace(
                                /(?:\.0+|(\.\d*?)0+)$/,
                                '$1',
                              ),
                        controls: false,
                        maxLength: 40,
                        min: '0.000000001',
                        placeholder:
                          I18N.carbonFootprint3.task1ProductionAmount,
                      },
                    ]}
                  />
                  <div className={styles.productionUnit}>
                    <FormConsumer>
                      {current => (
                        <ProductUnitCascader
                          aria-label={I18N.carbonFootprint.unit}
                          disabled
                          value={current.values.unit}
                          options={current.query('unit').get('dataSource')}
                          suffixIcon={<img src={unitArrowIcon} alt='' />}
                        />
                      )}
                    </FormConsumer>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className={styles.splitLine}>
            {isQuickLayout && <img src={dividerIcon} alt='' />}
          </div>
          <FormConsumer>
            {formIns => {
              const { type } = formIns.values as { type: number };
              if (isNil(type)) {
                return '';
              }

              return (
                <div
                  className={classNames(styles.accountTypeContent, {
                    [styles.accountTypeReadonly]: !!formDisabled,
                  })}
                >
                  <div>{I18N.carbonFootprint3.accountingMethod}</div>
                  <div className={styles.accountType}>
                    {isQuickLayout ? (
                      <img src={quickAccountIcon} alt='' />
                    ) : (
                      <IconAlibaba
                        className={styles.accountTypeIcon}
                        type={
                          type === FootprintAccountStatusType.QUICK
                            ? 'icon-icon_kuaisu'
                            : 'icon-icon_qiehuanzhikeshihua'
                        }
                      />
                    )}
                    <div className={styles.accountTypeName}>
                      {FOOTPRINT_ACCOUNT_TYPE_STATUS_LABEL[type]}
                    </div>
                    {isQuickLayout ? (
                      <span className={styles.accountTypeCheckIcon}>
                        <img src={selectedIcon} alt='' />
                      </span>
                    ) : (
                      <IconAlibabaNew
                        className={styles.accountTypeCheckIcon}
                        type='icon-slect'
                      />
                    )}
                  </div>
                </div>
              );
            }}
          </FormConsumer>

          <Field
            name='scope'
            title={I18N.carbonFootprint.systemBoundary}
            required
            disabled={scopeDisabled || !!formDisabled}
            decorator={[FormItem]}
            component={[
              FormilySystemBoundaryRadio,
              {
                className: isQuickLayout ? styles.quickBoundary : undefined,
                accountType: isQuickLayout
                  ? FootprintAccountStatusType.QUICK
                  : undefined,
                selectionIcon: isQuickLayout ? (
                  <img src={selectedIcon} alt='' />
                ) : undefined,
                fullCycleDetails: isQuickLayout
                  ? I18N.carbonFootprint3.task1FullCycleDetails
                  : undefined,
              },
            ]}
          />
          <div className={styles.extraInfoGrid}>
            {isFormReadPretty ? (
              <Field
                name='factorPrefName'
                title={I18N.carbonFootprint3.backgroundDatabaseRange}
                decorator={[FormItem]}
                component={[
                  Input,
                  {
                    placeholder: I18N.carbonFootprint3.backgroundDatabaseRange,
                  },
                ]}
              />
            ) : (
              <Field
                name='factorPrefId'
                title={I18N.carbonFootprint3.backgroundDatabaseRange}
                decorator={[FormItem]}
                component={[
                  Select,
                  {
                    disabled: !!formDisabled,
                    className: styles.factorPreferenceSelect,
                    suffixIcon: isQuickLayout ? (
                      <img src={unitArrowIcon} alt='' />
                    ) : undefined,
                    popupClassName: styles.factorPreferencePopup,
                    popupMatchSelectWidth: true,
                    optionFilterProp: 'label',
                    optionLabelProp: 'label',
                    dataSource: factorPreferenceOptions,
                    placeholder:
                      I18N.carbonFootprint3.selectGlobalFactorPreferencePlan,
                    allowClear: true,
                    showSearch: true,
                    optionRender: renderFactorPreferenceOption,
                  },
                ]}
              />
            )}
            <Field
              name='supplierName'
              title={I18N.carbonFootprint3.supplier}
              decorator={[FormItem]}
              component={[
                Input,
                {
                  disabled: !!formDisabled,
                },
              ]}
            />
          </div>
          <Field
            name='files'
            title={
              isQuickLayout ? (
                <span className={styles.uploadLabel}>
                  {I18N.carbonFootprint3.task1ProductionDiagram}
                  <small>{I18N.carbonFootprint3.supportPng4}</small>
                </span>
              ) : (
                I18N.carbonFootprint.systemBoundaryEngineer
              )
            }
            decorator={[
              FormItem,
              { className: isQuickLayout ? styles.quickUpload : undefined },
            ]}
            component={[
              FormilyImgUpload,
              {
                noDescribe: isQuickLayout,
                uploadIcon: isQuickLayout ? (
                  <img src={addImageIcon} alt='' />
                ) : undefined,
              },
            ]}
          />
        </div>
        {lcaOnly && (
          <LcaInformationFields
            expanded
            account
            standalone
            inherited={isNil(accountId) && !!productInfo}
          />
        )}
      </Form>
      {lcaDraftForm && (
        <Form
          form={lcaDraftForm}
          layout='vertical'
          colon={false}
          className={styles.lcaForm}
        >
          <LcaInformationFields
            expanded
            account
            standalone
            inherited={isNil(accountId) && !!productInfo}
          />
        </Form>
      )}
    </Container>
  );
};

export default AccountInfoModal;
