/**
 * 排放源抽屉展示
 */
import { CloseOutlined } from '@ant-design/icons';
import {
  Form,
  FormItem,
  FormGrid,
  Input,
  Select,
  Radio,
  Cascader,
  DatePicker,
  FormLayout,
  ArrayCollapse,
  NumberPicker,
} from '@formily/antd-v5';
import { Field, createForm } from '@formily/core';
import { createSchemaField } from '@formily/react';
import {
  GwpRecordScope,
  GwpScopeContext,
} from '@/components/EmissionGwp/context';
import { FootprintAccountStatusType } from '@/views/carbonFootprint3/FootprintAccount/constant';
import { gwpFieldSchema } from '@/components/EmissionGwp/FormField';
import { toJS } from '@formily/reactive';
import I18N from '@src/lang/I18N';
import { useMount } from 'ahooks';
import { App, Button, Drawer, Modal, Spin, message } from 'antd';
import classNames from 'classnames';
import {
  CSSProperties,
  FC,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import useFieldFlattenUnitDictSource from '@/hooks/useFieldFlattenUnitDataSource';
import useFieldSetValueByLabel from '@/hooks/useFieldSetValueByLabel';
import useFieldUnitDictSource from '@/hooks/useFieldUnitDictSource';
import { CustomHeaderIndex } from '@/views/subModules/CarbonFootprintModel/components/EmissionSourceDrawer/components/CustomHeader';
import { ArrayRemove } from '@/views/subModules/CarbonFootprintModel/components/EmissionSourceDrawer/components/Remove';
import {
  AdditionalFormItemMaps,
  getNewEmissionFactorSchema,
  transportSchema,
  useFactorObjReaction,
  useFactorObjUnitStringReaction,
  useFieldDataSourceReaction,
  useUnitDataSourceReaction,
  useNeedTransportReaction,
} from '@/views/subModules/CarbonFootprintModel/components/EmissionSourceDrawer/transportSchema';
import {
  serviceToForm,
  TransportListTransToService,
} from '@/views/subModules/CarbonFootprintModel/components/EmissionSourceDrawer/transportUtil';
import {
  getEmissionSoureListData,
  getQuickEmissionType,
  postAutoMatchFactor,
  postEmissionSourceAdd,
  postEmissionSourceEdit,
} from '@/views/subModulesCommon/carbonFootprintModel/service';

import ModalEmissionSourceTable from './components/ModalEmissionSourceTable';
import styles from '@/views/subModules/CarbonFootprintModel/components/EmissionSourceDrawer/index.module.less';
import {
  emissionBasicSchema,
  emissionMatchWaySchema,
} from '@/views/subModules/CarbonFootprintModel/components/EmissionSourceDrawer/schema';
import {
  ALL_EMISSION,
  ALL_EMISSION_LABEL,
  ECOINVENT_TEXT,
  EMISSION_TYPE_OPTIONS,
  FactorPatternType,
  MODEL_EMISSION_MATCH_WAY,
  MODEL_EMISSION_MATCH_WAY_ICON,
  MODEL_EMISSION_MATCH_WAY_LABEL,
  shouldHideEcoinventValue,
} from '@/views/subModules/CarbonFootprintModel/constant';
import { QUICK_ACCOUNT_EMISSION } from '@/views/subModules/CarbonFootprintModel/fontprintConstant';
import { EmissionDescriptionPreviewContext } from '@/views/components/CarbonFootprintModel/emissionDescriptionContext';
import FormilyButtonSelect from '@/views/subModules/CarbonFootprintModel/formilyComponents/FormilyButtonSelect';
import FormilyFactor from '@/views/subModules/CarbonFootprintModel/formilyComponents/FormilyFactor';
import {
  EmissionFormDataSource,
  InfoData,
  OptionsTypesData,
} from '@/views/components/CarbonFootprintModel/type';
import { hasFactorObj } from '@/views/subModules/CarbonFootprintModel/util';

type Props = {
  loading: boolean;
  emissionSourceId?: number;
  visible: boolean;
  info: InfoData;
  stage: number;
  initValues?: Record<string, any>;
  readPretty?: boolean;
  copyStatus?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOk?: (values: EmissionFormDataSource) => void;
};

const footerStyle: CSSProperties = {
  padding: '0px 24px',
  height: 52,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const SchemaField = createSchemaField({
  components: {
    FormItem,
    FormGrid,
    Input,
    Select,
    Radio,
    Cascader,
    DatePicker,
    FormilyButtonSelect,
    FormilyFactor,
    ArrayCollapse,
    NumberPicker,
    CustomHeaderIndex,
    ArrayRemove,
    FormLayout,
  },
});

const { FACTOR, FACTOR_CREATE } = MODEL_EMISSION_MATCH_WAY;

const emissionBasicGwpSchema = (
  onBasicNameChange: (name: string) => void,
  enableGwp: boolean,
) => {
  const schema = emissionBasicSchema(onBasicNameChange);
  const grid = schema.properties?.grid;
  if (grid && enableGwp)
    grid.properties = { ...grid.properties, gwpFields: gwpFieldSchema };
  return schema;
};

const EmissionSourceDrawer: FC<Props> = ({
  loading,
  info,
  emissionSourceId,
  stage,
  copyStatus,
  initValues,
  readPretty,
  visible,
  onClose,
  onSuccess,
  onOk,
}) => {
  const showEmissionDescription = useContext(EmissionDescriptionPreviewContext);
  // 缓存当前的表单旧名称，判断是否改变
  const formNameUseRef = useRef('');

  const form = useMemo(
    () =>
      createForm({
        initialValues: {
          ...initValues,
          needTransport:
            initValues?.accountEmissionTransportList?.length ||
            initValues?.type === QUICK_ACCOUNT_EMISSION.TRANS
              ? 2
              : 1,
          accountEmissionTransportList: serviceToForm(
            initValues?.accountEmissionTransportList,
          ),
          factorObj: {
            ...initValues?.factorObj,
            numeratorUnit:
              (initValues?.factorObj?.unit || '').split('/')[0] || undefined,
            denominatorUnit:
              (initValues?.factorObj?.unit || '').split('/')[1] || undefined,
            rate: initValues?.rate,
          },
        } as Record<string, any>,
        readPretty: !!readPretty,
        validateFirst: true,
      }),
    [visible, readPretty],
  );

  const [submitLoading, setSubmitLoading] = useState(loading);

  /** 排放源中的搜索类别 */
  const [emissionOptions, setEmissionOptions] = useState<OptionsTypesData[]>(
    [],
  );

  const [emissionModalVisible, setEmissionModalVisible] = useState(false);

  /** 储存因子数值 */
  const [fealFactor, setFealFactor] = useState<string | number>();

  /** '1'-普通因子 '2'-ecoinvent因子 */
  const [factorPattern, setFactorPattern] = useState<FactorPatternType>();

  /** 根据名称自动匹配因子loading */
  const [autoMatchFactorLoading, setAutoMatchFactorLoading] = useState(false);

  /**
   * 基本信息 名称输入框输入后动态获取因子信息
   * @param newName 名称
   */
  const onBasicNameChange = async (needNew: boolean = false) => {
    // 没有更改表单直接返回
    // if (!form.modified) return;

    // const newName = form.getValuesIn('name');

    if (needNew) {
      if (hasFactorObj(toJS(form.getValuesIn('factorObj')))) {
        return;
      }
    }

    // 名称相同不出发
    // if (formNameUseRef.current === newName) return;

    // 如果因子为手动填写也返回 - 手动填写的因子更改名称不自动匹配因子
    if (
      form.getValuesIn('factorObj.matchWay') === FACTOR_CREATE ||
      form.getValuesIn('matchWay') === FACTOR_CREATE ||
      form.getValuesIn('type') === QUICK_ACCOUNT_EMISSION.TRANS
    )
      return;

    const newName = form.getValuesIn('name');

    // formNameUseRef.current = newName;

    const formType = form.getValuesIn('type');

    /**
     * 运输类不回填此处逻辑
     */
    if (formType === QUICK_ACCOUNT_EMISSION.TRANS) {
      return;
    }

    try {
      // 只有排放源名称更改后才会自动匹配 不论是否已经存在因子 - 3.5.5测试用例评审更改需求 10-08
      setAutoMatchFactorLoading(true);
      const { data } = await postAutoMatchFactor({
        name: newName,
        factorType: '3',
        emissionType: formType ? ALL_EMISSION_LABEL()[formType] : undefined,
      });
      if (data.data) {
        const [numeratorUnit, denominatorUnit] = (data.data.unit || '').split(
          '/',
        );
        const formFactorObjValue = form.getValuesIn('factorObj');
        form.setValuesIn('factorObj', {
          ...formFactorObjValue,
          ...data.data,
          numeratorUnit,
          denominatorUnit,
          matchWay: FACTOR,
        });
        form.setValuesIn('matchWay', FACTOR);
      } else {
        form.setValuesIn('factorObj', undefined);
      }
    } catch (e) {
      form.setValuesIn('factorObj', undefined);
    } finally {
      setAutoMatchFactorLoading(false);
    }
  };

  /**
   * 选择排放源
   * @param emission 排放源信息
   */
  const selectEmission = async (emission: Record<string, any>) => {
    const {
      name,
      type,
      matchWay,
      matchObject,
      unitCode,
      unitName,
      typeExtra,
      rate,
      factorUnit,
      accountEmissionTransportList,
      id: emissionId,
    } = emission;
    const {
      factor,
      institution,
      name: factorName,
      unit,
      year,
      id,
    } = matchObject || {};

    setFactorPattern(
      emission.factorPattern || emission.factorObj?.factorPattern,
    );
    setFealFactor(factor);

    const initialValues: Record<string, any> = {
      type,
      emissionId,
      ...(info.type === FootprintAccountStatusType.QUICK
        ? {
            greenhouseGas: emission.greenhouseGas ?? 'CO2',
            gwpValue: emission.gwpValue ?? '1',
          }
        : {}),
      emissionSourceDescription: emission.emissionSourceDescription ?? '',
      matchWay,
      needTransport: accountEmissionTransportList?.length > 0 ? 2 : 1,
      accountEmissionTransportList: serviceToForm(accountEmissionTransportList),
      factorObj: {
        factorPattern:
          emission.factorObj?.factorPattern || emission.factorPattern,
        ecoinventValueVisible:
          emission.factorObj?.ecoinventValueVisible ??
          emission.ecoinventValueVisible,
        id,
        matchWay,
        factor: shouldHideEcoinventValue({
          factorPattern:
            emission.factorObj?.factorPattern || emission.factorPattern,
          ecoinventValueVisible:
            emission.factorObj?.ecoinventValueVisible ??
            emission.ecoinventValueVisible,
        })
          ? ECOINVENT_TEXT
          : factor,
        institution,
        name: factorName,
        year,
        rate,
        numeratorUnit: (unit || '').split('/')[0] || undefined,
        denominatorUnit: (unit || '').split('/')[1] || undefined,
        unit: factorUnit,
      },
    };
    initialValues.name = name;
    if (type !== ALL_EMISSION.TRANS) {
      form.setFieldState('unitCode', {
        data: { value: unitCode, label: unitName },
      });
    } else if (typeExtra) {
      // switch (typeExtra.way) {
      //   case CALC_WAY.PRODUCT_WEIGHT:
      //     initialValues.typeExtra = {
      //       way: typeExtra.way,
      //       unitCode: typeExtra.unitCode,
      //       weightUnitCode: typeExtra.unitCode,
      //       amount: undefined,
      //       distance: undefined,
      //       name,
      //     };
      //     break;
      //   case CALC_WAY.BEARING_RATIO:
      //     initialValues.typeExtra = {
      //       way: typeExtra.way,
      //       name,
      //       amount: undefined,
      //       distance: undefined,
      //     };
      //     break;
      //   case CALC_WAY.ENERGY_CONSUMPTION:
      //     initialValues.name = name;
      //     initialValues.typeExtra = {
      //       way: typeExtra.way,
      //       // unitCode: typeExtra.unitCode,
      //       name,
      //       amount: undefined,
      //       distance: undefined,
      //     };
      //     form.setFieldState('typeExtra.unitCode', {
      //       data: { label: typeExtra.unitName },
      //     });
      //     break;
      //   default:
      // }
    }

    // 先设置因子信息  因为上面的单位换算比例采用的是监听unitCode  先设置unitCOde会导致表单上因子单位还是旧的
    // form.setValues({
    //   factorObj: initialValues.factorObj,
    // });

    form.setValues({
      accountEmissionTransportList: [],
    });
    form.setValues({
      ...initialValues,
      amount: undefined,
    });
    setEmissionModalVisible(false);
  };

  /** 获取标题 */
  const getTitle = () => {
    if (readPretty) {
      return I18N.carbonFootprint3.viewEmissionSources;
    }

    if (copyStatus) {
      return I18N.carbonFootprint3.copyingEmissionSources;
    }

    if (emissionSourceId) {
      return I18N.carbonFootprint.editEmissionSources2;
    }

    return I18N.carbonFootprint.newEmissionSourcesAdded;
  };
  /**
   * 提交
   */
  const onSubmit = async () => {
    const formValues = await form.submit<Record<string, any>>();
    const { factorObj, typeExtra = {}, ...restValues } = formValues;
    const { rate } = factorObj || {};

    let factorInfo = {};
    if (restValues.type === QUICK_ACCOUNT_EMISSION.TRANS) {
      factorInfo = {
        matchWay: factorObj?.matchWay || restValues.matchWay,
        rate,
        factorObj,
      };
    } else {
      factorInfo = {
        rate,
        factorObj,
      };
    }
    const submitData: EmissionFormDataSource = {
      ...restValues,
      modelId: info.id,
      stage: String(stage),
      name: restValues.name || restValues.selectName,
      type: restValues.type,
      ...factorInfo,
    };
    // 如果因子信息携带了来源  以因子信息的来源为准
    if (
      factorObj?.factorPattern &&
      factorObj?.factorPattern === FactorPatternType.eCoinVent
    ) {
      submitData.factorObj.factor = fealFactor;
    } else if (
      !factorObj?.factorPattern &&
      factorPattern === FactorPatternType.eCoinVent
    ) {
      submitData.factorObj.factor = fealFactor;
    }

    // if (restValues.type !== EMISSION_TYPE_OPTIONS.TRANS) {
    submitData.unitCodeArr = JSON.stringify(restValues.unitCode);
    submitData.unitCode = (restValues.unitCode as unknown as string[])?.[1];
    submitData.unitName =
      (
        form.getFieldState('unitCode')?.inputValues as {
          label: string;
        }[][]
      )?.[1]?.[1]?.label ||
      form.getFieldState('unitCode')?.data?.label ||
      restValues.unitName;
    // } else {
    // 运输类型排放源特殊处理
    // switch (typeExtra.way) {
    //   case CALC_WAY.PRODUCT_WEIGHT:
    //     typeExtra.unitName = TRANS_EMISSION_UNIT_LABEL[typeExtra.unitCode];
    //     typeExtra.distUnitName = I18N.carbonFootprint3.kilometre;
    //     typeExtra.distUnitCode = typeExtra.unitCode;
    //     break;
    //   case CALC_WAY.BEARING_RATIO:
    //     typeExtra.amount = typeExtra.bearingAmount;
    //     typeExtra.distance = typeExtra.bearingDistance;
    //     typeExtra.distUnitName = I18N.carbonFootprint3.kilometre;
    //     typeExtra.bearingAmount = undefined;
    //     typeExtra.bearingDistance = undefined;
    //     break;
    //   case CALC_WAY.ENERGY_CONSUMPTION:
    //     typeExtra.amount = typeExtra.energyAmount;
    //     typeExtra.unitCode = typeExtra.energyUnitCode?.[1];
    //     typeExtra.unitName =
    //       (
    //         form.getFieldState('typeExtra.energyUnitCode').inputValues as {
    //           label: string;
    //         }[][]
    //       )?.[1]?.[1]?.label ||
    //       form.getFieldState('typeExtra.energyUnitCode')?.data?.label;
    //     typeExtra.energyAmount = undefined;
    //     typeExtra.energyUnitCode = undefined;

    //     const unitCodeArrSet = form.getFieldState('typeExtra.energyUnitCode')
    //       ?.inputValues?.[0];

    //     submitData.unitCodeArr = unitCodeArrSet
    //       ? JSON.stringify(restValues.unitCodeArrSet)
    //       : undefined;

    //     break;
    //   default:
    // }
    // submitData.typeExtra = typeExtra;
    // }

    submitData.accountEmissionTransportList = TransportListTransToService(
      restValues.accountEmissionTransportList,
      restValues.name,
    );

    if (onOk) {
      onOk(submitData);
      return;
    }
    try {
      setSubmitLoading(true);
      if (emissionSourceId !== undefined && !copyStatus) {
        await postEmissionSourceEdit({
          ...submitData,
          id: emissionSourceId,
        });
        message.success(I18N.carbonFootprint.editSuccessful);
      } else {
        // 新增排放源
        await postEmissionSourceAdd(submitData);
        message.success(I18N.carbonFootprint.successfullyAdded);
      }
      onSuccess();
      setFactorPattern(FactorPatternType.ordinaryFactor);
    } finally {
      setSubmitLoading(false);
    }
  };

  const useAsyncProductDataSource = () => (field: Field) => {
    field.setState({ loading: true });
    getEmissionSoureListData().then(back => {
      const enumData = back.data.rows;
      field.setState({
        dataSource: enumData.map(data => ({
          label: data.name,
          value: data.name,
        })),
      });
      field.setState({ loading: false });
    });
  };

  /**
   * @description: 设置从接口拿到的输入和排放源类型
   */
  const getOptionTypeData = async () => {
    if (emissionOptions.length > 0) return emissionOptions;
    // 设置输出类型
    const typeData = await getQuickEmissionType({
      stage,
    });
    setEmissionOptions(typeData.data.data);
    return typeData.data.data;
  };

  useMount(async () => {
    const typeData = await getOptionTypeData();
    if (!visible) {
      formNameUseRef.current = '';
    }
    // 动态添加下拉类型
    form.setFieldState('type', {
      dataSource: typeData,
    });
  });

  useEffect(() => {
    if (initValues) {
      const {
        name,
        type,
        amount,
        unitCode,
        matchWay,
        rate,
        typeExtra,
        unitName,
        factorObj,
        accountEmissionTransportList,
        id: emissionId,
      } = initValues;
      form.setValues({
        name: copyStatus
          ? I18N.template(I18N.subModules.names, { val1: name })
          : name,
        type,
        id: emissionId,
        ...(info.type === FootprintAccountStatusType.QUICK
          ? {
              greenhouseGas: initValues.greenhouseGas ?? 'CO2',
              gwpValue: initValues.gwpValue ?? '1',
            }
          : {}),
      });

      if (readPretty && initValues?.supplierObj?.computeCompanyName) {
        initValues.supplierObj.supplierId =
          initValues.supplierObj.computeCompanyName;
      }

      if (type !== EMISSION_TYPE_OPTIONS.TRANS) {
        form.setValues({
          amount,
        });
        form.setFieldState('unitCode', {
          data: {
            value: unitCode,
            label: unitName,
          },
        });
      } else {
        const { way, amount: typeExtraAmount, distance } = typeExtra || {};
        form.setValues({
          typeExtra: {
            name,
            way,
          },
        });

        if (typeExtraAmount !== undefined) {
          form.setValues({
            typeExtra: {
              amount: typeExtraAmount,
            },
          });
        }
        // switch (typeExtra.way) {
        //   case CALC_WAY.PRODUCT_WEIGHT:
        //     initValues.typeExtra = {
        //       way: typeExtra.way,
        //       amount: typeExtra.amount,
        //       distance: typeExtra.distance,
        //       unitCode: typeExtra.unitCode,
        //       unitName: typeExtra.unitName,
        //     };
        //     break;
        //   case CALC_WAY.BEARING_RATIO:
        //     initValues.typeExtra = {
        //       way: typeExtra.way,
        //       bearingAmount: typeExtra.amount,
        //       bearingDistance: typeExtra.distance,
        //     };
        //     break;
        //   case CALC_WAY.ENERGY_CONSUMPTION:
        //     initValues.typeExtra = {
        //       way: typeExtra.way,
        //       energyAmount: typeExtra.amount,
        //     };
        //     form.setFieldState('typeExtra.energyUnitCode', {
        //       data: { value: typeExtra.unitCode, label: typeExtra.unitName },
        //     });
        //     break;
        //   default:
        // }

        if (distance !== undefined) {
          form.setValues({
            typeExtra: {
              distance,
            },
          });
        }
        form.setValues({
          ...initValues,
          needTransport:
            accountEmissionTransportList?.length ||
            type === QUICK_ACCOUNT_EMISSION.TRANS
              ? 2
              : 1,
          accountEmissionTransportList: serviceToForm(
            accountEmissionTransportList,
          ),
          name: copyStatus
            ? I18N.template(I18N.subModules.names, { val1: name })
            : name,
        });
      }

      if (factorObj) {
        const { factorPattern, factor } = factorObj;
        setFealFactor(factor);
        setFactorPattern(factorPattern);

        form.setValues({
          factorObj: {
            ...form.getValuesIn('factorObj'),
            id: factorObj.id,
            name: factorObj.name,
            factorPattern: factorObj.factorPattern,
            ecoinventValueVisible: factorObj.ecoinventValueVisible,
            factor: shouldHideEcoinventValue(factorObj)
              ? ECOINVENT_TEXT
              : factorObj.factor,
            numeratorUnit: (factorObj.unit || '').split('/')[0] || undefined,
            denominatorUnit: (factorObj.unit || '').split('/')[1] || undefined,
            rate,
            matchWay,
            institution: factorObj.institution,
            year: factorObj.year,
            unit: factorObj.unit,
          },
        });
      }
    }
  }, [initValues]);

  const { modal } = App.useApp();

  return (
    <Drawer
      open={visible}
      width={728}
      destroyOnClose
      maskClosable
      closable={false}
      rootClassName={styles.emissionSourceDrawer}
      title={getTitle()}
      extra={
        <CloseOutlined
          className={styles.closeIcon}
          onClick={() => {
            if (readPretty || !form.getFormState().modified) {
              onClose();
              return;
            }
            try {
              modal.confirm({
                title: I18N.carbonFootprint3.confirmToGiveUpWhen,
                onOk: () => {
                  onClose();
                },
              });
            } catch (error) {
              onClose();
            }
          }}
        />
      }
      footerStyle={footerStyle}
      bodyStyle={{
        padding: 16,
      }}
      footer={
        !readPretty ? (
          <div>
            <Button
              rootClassName={styles.btns}
              onClick={() => {
                if (readPretty || !form.getFormState().modified) {
                  onClose();
                  return;
                }
                try {
                  modal.confirm({
                    title: I18N.carbonFootprint3.confirmToGiveUpWhen,
                    onOk: () => {
                      onClose();
                    },
                  });
                } catch (error) {
                  onClose();
                }
              }}
            >
              {I18N.carbonFootprint.cancel}
            </Button>
            <Button
              rootClassName={styles.btns}
              rootStyle={{ marginLeft: 10 }}
              type='primary'
              loading={submitLoading}
              onClick={() => onSubmit()}
            >
              {I18N.carbonFootprint.confirm}
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => {
              if (readPretty || !form.getFormState().modified) {
                onClose();
                return;
              }
              modal.confirm({
                title: I18N.carbonFootprint3.confirmToGiveUpWhen,
                onOk: () => {
                  onClose();
                },
              });
            }}
            rootClassName={styles.btns}
          >
            {I18N.carbonFootprint3.close}
          </Button>
        )
      }
      onClose={onClose}
    >
      <Form form={form} previewTextPlaceholder='-' colon={false}>
        <FormLayout layout='vertical' colon={false}>
          <Spin spinning={loading}>
            <div className={styles.titleContainer}>
              <div className={styles.title}>
                {I18N.carbonFootprint.basicInformation}
              </div>
              {!readPretty && (
                <Button
                  type='primary'
                  onClick={() => setEmissionModalVisible(true)}
                >
                  {I18N.carbonFootprint3.selectingEmissionSources}
                </Button>
              )}
            </div>
            <GwpScopeContext.Provider
              value={info.type === FootprintAccountStatusType.QUICK}
            >
              <GwpRecordScope
                recordKey={`${visible}:${info.id}:${stage}:${
                  emissionSourceId ?? initValues?.id ?? 'new'
                }:${!!copyStatus}`}
                readOnly={readPretty}
              >
                <SchemaField
                  schema={emissionBasicGwpSchema(
                    () => onBasicNameChange(true),
                    info.type === FootprintAccountStatusType.QUICK,
                  )}
                  scope={{
                    useFieldUnitDictSource,
                    useAsyncProductDataSource,
                    useFieldSetValueByLabel,
                    useFieldFlattenUnitDictSource,
                  }}
                />
              </GwpRecordScope>
            </GwpScopeContext.Provider>
            {showEmissionDescription &&
              readPretty &&
              initValues?.type !== QUICK_ACCOUNT_EMISSION.TRANS && (
                <FormItem label='排放源描述'>
                  {initValues?.emissionSourceDescription || '-'}
                </FormItem>
              )}
            <div className={styles.matchWayContainer}>
              <SchemaField
                schema={emissionMatchWaySchema([
                  {
                    value: FACTOR,
                    label: MODEL_EMISSION_MATCH_WAY_LABEL[FACTOR],
                    icon: MODEL_EMISSION_MATCH_WAY_ICON.FACTOR_ICON,
                  },
                ])}
              />
            </div>
            <Spin spinning={autoMatchFactorLoading}>
              <SchemaField
                schema={getNewEmissionFactorSchema(undefined, undefined, () =>
                  onBasicNameChange(),
                )}
                scope={{ AdditionalFormItemMaps }}
              />
            </Spin>
            {/* TODO: sunguangbiao 过程核算抽屉 */}
            <div
              className={classNames(styles.titleContainer, styles.transTitle)}
            >
              <div className={styles.title}>
                {I18N.carbonFootprint3.transportationInformation}
              </div>
            </div>
            <div className={styles.fileContainer}>
              <FormLayout layout='vertical' colon={false}>
                <SchemaField
                  schema={transportSchema()}
                  scope={{
                    useNeedTransportReaction,
                    AdditionalFormItemMaps,
                    useFieldUnitDictSource,
                    useFieldSetValueByLabel,
                    useFactorObjReaction,
                    useFactorObjUnitStringReaction,
                    useFieldDataSourceReaction,
                    useUnitDataSourceReaction,
                  }}
                />
              </FormLayout>
            </div>
          </Spin>
        </FormLayout>
      </Form>
      <Modal
        title={I18N.carbonFootprint3.selectingEmissionSources}
        width={1200}
        maskClosable={false}
        getContainer={false}
        open={emissionModalVisible}
        footer={null}
        style={{
          top: 50,
        }}
        bodyStyle={{
          padding: '0 16px',
        }}
        onCancel={() => setEmissionModalVisible(false)}
      >
        <ModalEmissionSourceTable
          emissionName={
            form.values.name ||
            (form.values.typeExtra && form.values.typeExtra.name) ||
            ''
          }
          tableScrollOptions={{ y: 320 }}
          onCancel={async () => setEmissionModalVisible(false)}
          onConfirm={selectEmission}
          options={emissionOptions}
        />
      </Modal>
    </Drawer>
  );
};

export default EmissionSourceDrawer;
