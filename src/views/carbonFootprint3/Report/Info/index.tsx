import { ReportDialogs } from './components/ReportDialogs';
import { ReportDetails } from './components/ReportDetails';
import { registerReportQualityEffects } from './hooks/qualityEffects';
import { ReportSchemaField as SchemaField } from './ReportSchemaField';
import {
  getAnalysisProducts,
  collectMonteCarloStates,
  resolveGeoName,
  buildOverallDescription,
  normalizeReductionReportValues,
  clearValidationStatus,
  clearFormValueByPath,
  resetBasicInfoValidateFeedback,
  REPORT_DESCRIPTION_VALIDATION_PATTERNS,
  syncValidationByReportType,
  filterReportComparisonAccounts,
} from './reportUtils';
import { useReportAIFill } from './hooks/useReportAIFill';
import { useReportSave } from './hooks/useReportSave';

import { SensitivityConfigs } from '@/views/carbonFootprint3/components/SensitivityTable/types';
import { MonteCarloScope } from './components/MonteCarloAnalysis/types';
/*
 * @@description: 报告 详情、编辑、新增
 * @Author: qifeng qifeng@carbonstop.net
 * @Date: 2023-03-14 15:56:05
 * @LastEditors: zhangmingyao 791813037@qq.com
 * @LastEditTime: 2023-04-20 17:12:25
 * @LastEditors: qifeng qifeng@carbonstop.net
 * @LastEditTime: 2023-04-20 10:12:34
 * @LastEditors: qifeng qifeng@carbonstop.net
 * @LastEditTime: 2023-04-20 11:55:55
 */
import { AnalysisIcon } from '../../components/AnalysisIcon';

import { FormTab } from '@formily/antd-v5';
import {
  Field,
  createForm,
  onFieldChange,
  onFieldInputValueChange,
  onFieldReact,
  onFieldValueChange,
} from '@formily/core';
import { FormConsumer } from '@formily/react';
import { FormActions } from '@src/components/FormActions';
import FormilyCommon from '@src/components/FormilyUtil/FormilyCommon';

import I18N from '@src/lang/I18N';
import { RouteMapsCorbonFootprint3 } from '@src/router/route-paths/corbonFootprint3';
import { PageInfoType } from '@src/router/type';
import {
  GET4bdb60212ecd4780fdc01e40cb88a353,
  GET8981b14f7dda355705d81c48f17aa226,
  Report,
} from '@src/sdks_v2/footprint3V2ApiDocs';
import { changeFactorM2cascaderOptions } from '@src/utils';
import { Radio as AntdRadio, Button, Spin } from 'antd';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';

import { radios } from './datas';
import styles from './index.module.less';
import { basicSchema } from './schemas';
import { FormSubReportAccountList, Options } from './types';
import { changeData2SelectOptions } from './utils';
import { getAccountingInfo } from '../../FootprintAccount/AccountDetail/AccountInfo/service';
import {
  FOOTPRINT_ACCOUNT_TYPE_STATUS_OPTION,
  FootprintAccountStatusType,
} from '../../FootprintAccount/constant';
import {
  getAccountProductData,
  getAccountProductInfo,
} from '../../FootprintAccount/service';
import { ProcessBusinessAccountingTableData } from '../../ProcessBusinessAccounting/type';
import { AnalysisText } from '../../components/AnalysisText';
import './index.less';
import { COMPARISON_REPORT_TYPE, REPORT_TYPE } from '../../constant';
import { getCommonAccountListData } from '../../service';
import { ProductAccountingList } from '../../FootprintAccount/component/ProductSelectAccount/type';
import {
  getCarbonLabelProductType,
  getReportScope,
  getStageEmissions,
} from './service';

import { apiQueryByCompanyId } from '@src/views/dashborad/organization/services';

import { carbonLabelSchema } from '@/views/subModules/CarbonFootprintModel/Certification/CertificationForm/schema';

import { revalidateFieldFeedback } from '@/views/subModules/CarbonFootprintModel/Certification/CertificationForm/utils/revalidateFieldFeedback';

import { useSelector } from 'react-redux';

import { RootState } from '@/store';

import { useCityInfo } from '@src/hooks/useCityInfo';
import { useAllEnumsBatch } from '@src/hooks';

import { activityDataDescMap } from '@/views/subModules/CarbonFootprintModel/Certification/CertificationForm/constant';

const { REPORT, COMPARE, CARBON_LABEL, REDUCTION } = REPORT_TYPE;

const { TARGET } = COMPARISON_REPORT_TYPE;

const { QUICK, PROCESS } = FootprintAccountStatusType;

const ReportInfo = () => {
  const history = useHistory();
  const { pathname } = useLocation();
  const [analysisTab, setAnalysisTab] = useState('info');
  const [analysisScope, setAnalysisScope] = useState<MonteCarloScope>();
  const [sensitivityConfigs, setSensitivityConfigs] =
    useState<SensitivityConfigs>({});
  const { pageInfoType, id, comparisonId } = useParams<{
    pageInfoType: PageInfoType;
    id: string;
    comparisonId: string;
  }>();

  /** 是否只读 */
  const readPretty = useMemo(() => pageInfoType === 'show', [pageInfoType]);

  /** 主要针对于初始执行 - 谁知目标产品数据质量评价 */
  const initEditStatus = useRef<boolean>(false);

  const units = useRef<ProcessBusinessAccountingTableData[]>();

  // 用来判断是否批量选中的回显
  const selectProductAccountStatusRef = useRef(false);

  // 核算类型
  const accountTypeRef = useRef<FootprintAccountStatusType>(QUICK);

  const compareUnits = useRef<ProcessBusinessAccountingTableData[]>();

  const [mainLoading, setMainLoading] = useState(false);

  // 选择产品弹框
  const [productModalVisible, setProductModalVisible] = useState(false);

  const [checkedRadio, setcheckedRadio] = useState(Object.keys(radios)[0]);
  const [modalShow, setModalShow] = useState<'activity' | 'factor'>();
  const accountId = useRef<number>();
  const hasSubmitAttemptedRef = useRef(false);
  const onUnitChange = (unitId: number) => {
    const targetUnit = units.current?.find(u => u.id === unitId);
    form.current.setFieldState('.startTime', {
      value: [targetUnit?.startTime, targetUnit?.endTime],
    });
    accountId.current = targetUnit?.id;
    return targetUnit;
  };

  /**
   * 设置核算下拉的每一项node元素
   * @param row 每一项的展示
   * @returns 返回dom元素
   */
  const listNode = (
    row: ProcessBusinessAccountingTableData | ProductAccountingList,
  ): ReactNode => (
    <div className='optionReportNodeMain'>
      <div style={{ maxWidth: 300 }}>
        <AnalysisText value={row.accountName || '-'} />
      </div>

      <div className='optionNodeDate'>
        {row.startTime}
        {I18N.carbonFootprint.to}
        {row.endTime}
      </div>
      <div
        className={`${styles.optionNodeType} ${
          String(row.type) === String(QUICK)
            ? styles.optionNodeTypeQuick
            : styles.optionNodeTypeProcess
        }`}
      >
        {FOOTPRINT_ACCOUNT_TYPE_STATUS_OPTION[row.type]}
      </div>
    </div>
  );

  const isReductionReport = (type?: number) => Number(type) === REDUCTION;

  const getReductionQuickAccountParams = (type?: number) =>
    isReductionReport(type) ? { type: QUICK } : {};

  const isCompletedAccount = (
    account: ProcessBusinessAccountingTableData | ProductAccountingList,
  ) => Number(account.accountStatus) === 2;

  const accountOption = (
    account: ProcessBusinessAccountingTableData | ProductAccountingList,
  ) => ({
    label: account?.accountName,
    value: account.id,
    accountName: account?.accountName,
    accountNameNode: listNode(account),
  });

  const compareAccountOption = (
    account: ProcessBusinessAccountingTableData | ProductAccountingList,
  ) => ({
    label: account?.accountName,
    value: account.id,
    compareAccountNameNode: listNode(account),
    compareAccountName: account?.accountName,
  });

  const getAccountInfo = (productId?: number) =>
    GET4bdb60212ecd4780fdc01e40cb88a353({
      pageNum: 1,
      pageSize: 9999,
      productId,
      accountStatus: isReductionReport(form.current.values.type)
        ? 2
        : undefined,
      ...getReductionQuickAccountParams(form.current.values.type),
    }).then(({ data }) => {
      let result =
        ((data?.data as any)?.rows as ProcessBusinessAccountingTableData[]) ||
        [];
      units.current = result;
      const formValue = form.current.values;
      const reportType = formValue.type;
      let compareUnitDataInfo: ProcessBusinessAccountingTableData | undefined;

      // 如果是产品对比报告 并且存在基准产品的功能单位
      if (
        reportType === COMPARE &&
        compareUnits.current &&
        formValue.compareAccountName
      ) {
        compareUnitDataInfo = compareUnits.current?.find(
          u => String(u.id) === String(formValue.compareAccountName),
        );
      }

      if (formValue.compareAccountName) {
        result = result.filter(productAccountNameData => {
          const isId =
            String(productAccountNameData.id) !==
            String(formValue.compareAccountName);

          if (isReductionReport(reportType)) {
            return isId;
          }

          if (compareUnitDataInfo) {
            return (
              isId && productAccountNameData.type === compareUnitDataInfo.type
            );
          }
          return isId;
        });
      }

      form.current.setFieldState('accountName', {
        dataSource: result
          ?.filter(
            account =>
              (Number(reportType) !== CARBON_LABEL ||
                Number(account.type) === 0) &&
              (!isReductionReport(reportType) || isCompletedAccount(account)),
          )
          ?.map(accountOption),
      });
    });

  /**
   * 清空产品数据质量评价
   */
  const restArrayField = () => {
    form.current.setFieldState('*(reportActivityList, reportFactoryList)', {
      value: undefined,
    });
  };

  const cityDataRef = useRef<any[]>([]);

  const form = useRef(
    createForm<Report>({
      readPretty,
      effects: () => {
        onFieldInputValueChange(
          'reportActivityList.*.activityType',
          (field, formIns) => {
            const fieldValue = field.value as number;
            const { index } = field;
            formIns.setValuesIn(
              `reportActivityList.${index}.descs`,
              activityDataDescMap[fieldValue],
            );
          },
        );
        onFieldInputValueChange('type', (field, formIns) => {
          accountId.current = undefined;
          setAnalysisTab('info');
          setSensitivityConfigs({});
          hasSubmitAttemptedRef.current = false;
          formIns.setValues({
            monteCarloByAccount: undefined,
            uncertaintyMethod: 'TAYLOR',
            reportAccountList: undefined,
            productName: undefined,
            accountName: undefined,
            startTime: undefined,
            compareAccountName: undefined,
            compareProductName: undefined,
            compareStartTime: undefined,
            description: undefined,
            reduceExtra: undefined,
          });
          resetBasicInfoValidateFeedback(formIns);
          syncValidationByReportType(formIns, field.value as number);
        });
        onFieldValueChange(
          'reportAccountList.*.productName',
          (field, newForm) => {
            const fieldValue = field.value as number;
            const amountFieldPath = field.query('.accountName').take()?.path;
            // 获取功能单位表格路径
            const amountInfoFieldPath = field
              .query('.accountInfoList')
              .take()?.path;
            const specificationFieldPath = field
              .query('.specification')
              .take()?.path;
            const periodTimeFieldPath = field.query('.periodTime').take()?.path;

            // 如果删除了产品 需要将关联的功能单位也去掉
            if (!fieldValue) {
              clearFormValueByPath(newForm, amountFieldPath);
              clearFormValueByPath(newForm, amountInfoFieldPath);
              clearFormValueByPath(newForm, specificationFieldPath);
              clearFormValueByPath(newForm, periodTimeFieldPath);
              return;
            }

            const fieldDataSource = field.dataSource as {
              value: number;
              info: ProcessBusinessAccountingTableData;
            }[];

            const fieldInfo = fieldDataSource.find(
              data => data.info.id === fieldValue,
            );

            if (specificationFieldPath && fieldInfo) {
              newForm.setFieldState(specificationFieldPath, {
                value: fieldInfo?.info?.specification,
              });
            }

            if (!amountFieldPath || !amountInfoFieldPath) return;

            // 获取所有产品的核算信息
            getCommonAccountListData({
              productId: fieldValue,
              pageNum: 1,
              pageSize: 9999,
            }).then(({ data }) => {
              // const formValueReportAccountList: FormSubReportAccountList[] =
              //   newForm.getValuesIn('reportAccountList');
              // const formValueReportAccountListAccounId =
              //   formValueReportAccountList.map(list => list.accountName);
              // const accountNamevalue = newForm.getValuesIn(amountFieldPath);

              const accountList = data.data.rows
                .filter(list => list.type === accountTypeRef.current)
                ?.map(list => ({
                  label: list.accountName,
                  value: list.id,
                  accountName: list.accountName,
                  accountNameNode: listNode(list),
                }));

              newForm.setFieldState(amountFieldPath, {
                dataSource: accountList,
              });

              newForm.setValuesIn(amountInfoFieldPath, data.data.rows);

              // 更换产品后：若仍只有一条且功能单位仍属于新产品，则重新自动写入描述
              if (!readPretty) {
                const reportAccountList = newForm.getValuesIn(
                  'reportAccountList',
                ) as FormSubReportAccountList[];
                const completeItems = reportAccountList?.filter(
                  item => item.productName && item.accountName,
                );
                if (completeItems?.length === 1) {
                  const row = data.data.rows.find(
                    r => r.id === completeItems[0].accountName,
                  );
                  if (row && completeItems[0].productName === fieldValue) {
                    autoFillDescriptions({
                      productId: completeItems[0].productName,
                      endTime: row.endTime,
                      stageObjs: row?.stageObjs,
                    }).catch(() => {
                      /* ignore */
                    });
                  } else {
                    setReportDescriptionValues('', '');
                  }
                } else {
                  setReportDescriptionValues('', '');
                }
              }
            });
          },
        );
        onFieldValueChange(
          'reportAccountList.*.accountName',
          async (field, newForm) => {
            const fieldValue = field.value as number;
            if (fieldValue) {
              // 先获取之前接口获取的核算列表
              const amountInfoList: ProductAccountingList[] = field
                .query('.accountInfoList')
                .get('value');

              if (amountInfoList && amountInfoList.length > 0) {
                const amountInfo = amountInfoList.find(
                  info => info.id === fieldValue,
                );

                // 获取到详细核算信息，隐射规格型号和核算周期
                if (amountInfo) {
                  const periodTimeFieldPath = field
                    .query('.periodTime')
                    .take()?.path;

                  // 规格型号和核算周期
                  if (periodTimeFieldPath) {
                    newForm.setFieldState(periodTimeFieldPath, {
                      value: I18N.template(I18N.carbonFootprint3.amoun, {
                        val1: amountInfo.startTime,
                        val2: amountInfo.endTime,
                      }),
                    });
                  }
                }
              }
            }

            // 可编辑模式下，若只有一条完整产品+核算记录，自动写入生产工艺和整体描述
            if (!readPretty) {
              const reportAccountList = newForm.getValuesIn(
                'reportAccountList',
              ) as FormSubReportAccountList[];
              const completeItems = reportAccountList?.filter(
                item => item.productName && item.accountName,
              );

              if (fieldValue && completeItems?.length === 1) {
                const amountInfoList: ProductAccountingList[] = field
                  .query('.accountInfoList')
                  .get('value');
                const amountInfo = amountInfoList?.find(
                  info => info.id === fieldValue,
                );
                if (completeItems[0].productName) {
                  await autoFillDescriptions({
                    productId: completeItems[0].productName,
                    endTime: amountInfo?.endTime,
                    stageObjs: (amountInfo as any)?.stageObjs,
                  });
                }
              } else {
                setReportDescriptionValues('', '');
              }
            }
          },
        );
        onFieldValueChange('accountName', field => {
          const val = field.value;
          const reportType = form.current.values.type;
          if (isReductionReport(reportType)) {
            return;
          }
          const accountInfo = units.current?.find(u => u.id === val);
          const numberType = Number(accountInfo?.type);
          if (accountInfo && numberType !== accountTypeRef.current) {
            accountTypeRef.current = numberType;
            form.current.setValuesIn('accountType', numberType);
            setMainLoading(true);
            getOptions(true, numberType).then(() => setMainLoading(false));
          }
        });
        onFieldInputValueChange('accountName', async (field, formIns) => {
          const { accountName } = formIns.values;
          if (accountName && !isReductionReport(formIns.values.type)) {
            const { data } = await getStageEmissions({
              accountId: accountName,
            });
            const stageEmissionMap = data.data;
            const stages = [...Object.keys(stageEmissionMap).map(Number)];
            formIns.setValuesIn('stageEmissions.stages', stages);
            stages.forEach(stage => {
              formIns.setValuesIn(
                `stageEmissions.${stage}`,
                stageEmissionMap[stage],
              );
            });
          } else {
            formIns.setValuesIn('stageEmissions.stages', undefined);
          }
        });
        onFieldReact('*.stageEmissions.*(0,1,2,3,4,5)', (field, formIns) => {
          const { accountName } = formIns.values;
          const stages = formIns.getValuesIn('stageEmissions.stages');
          const lifeCycle = Number(field.props.name);
          field.visible =
            !!accountName &&
            Array.isArray(stages) &&
            stages.includes(lifeCycle);
        });
        onFieldReact('reportExtraInfo.productType', field => {
          getCarbonLabelProductType().then(({ data }) => {
            field.setComponentProps({
              options: data.data,
            });
          });
        });
        onFieldChange('accountName', (field, nowForm) => {
          // @ts-ignore    // 类型缺失
          const val = field.value;
          const type = nowForm.getValuesIn('type');
          if (val && type !== REPORT) {
            onUnitChange(val);
            // const targetUnit = onUnitChange(val);
            // if (targetUnit?.id && initEditStatus.current === false) {
            //   getOptions(targetUnit.id, true);
            // }

            // 切换目标产品核算单位类型后要动态设置基准产品核算方式功能单位
            if (type === COMPARE && compareUnits.current) {
              const unitDataInfo = units.current?.find(u => u.id === val);
              const dataSourceFilter = compareUnits.current.filter(
                compareUnitInfo =>
                  compareUnitInfo.type === unitDataInfo?.type &&
                  String(compareUnitInfo.id) !== String(unitDataInfo.id),
              );
              const dataSourceMap = dataSourceFilter.map(account => ({
                label: account?.accountName,
                value: account.id,
                compareAccountNameNode: listNode(account),
                compareAccountName: account?.accountName,
              }));
              nowForm.setFieldState('compareAccountName', {
                dataSource: dataSourceMap,
              });
            }
            if (type === REDUCTION && compareUnits.current) {
              const dataSourceMap = compareUnits.current
                .filter(
                  compareUnitInfo =>
                    isCompletedAccount(compareUnitInfo) &&
                    String(compareUnitInfo.id) !== String(val),
                )
                .map(compareAccountOption);
              nowForm.setFieldState('compareAccountName', {
                dataSource: dataSourceMap,
                value:
                  String(nowForm.getValuesIn('compareAccountName')) ===
                  String(val)
                    ? undefined
                    : nowForm.getValuesIn('compareAccountName'),
              });
            }
          } else if (type === COMPARE && compareUnits.current) {
            // 清空功能单位解除限制
            const dataSourceMap = compareUnits.current.map(account => ({
              label: account?.accountName,
              value: account.id,
              compareAccountNameNode: listNode(account),
              compareAccountName: account?.accountName,
            }));

            nowForm.setFieldState('compareAccountName', {
              dataSource: dataSourceMap,
            });
          } else if (type === REDUCTION && compareUnits.current) {
            const dataSourceMap = compareUnits.current
              .filter(isCompletedAccount)
              .map(compareAccountOption);

            nowForm.setFieldState('compareAccountName', {
              dataSource: dataSourceMap,
            });
          }

          if (!val) {
            form.current.setFieldState('startTime', {
              value: undefined,
            });
          }
        });
        onFieldReact('compareAccountName', (field, nowForm) => {
          // @ts-ignore    // 类型缺失
          const val = field.value;
          const { dataSource } = field as Field;
          const type = nowForm.getValuesIn('type');
          if (val && dataSource?.length > 0) {
            const unitDataInfo = compareUnits.current?.find(u => u.id === val);
            form.current.setFieldState('compareStartTime', {
              value: [unitDataInfo?.startTime, unitDataInfo?.endTime],
            });

            if (type === COMPARE && units.current) {
              const dataSourceFilter = units.current.filter(
                accountUnitInfo =>
                  accountUnitInfo.type === unitDataInfo?.type &&
                  String(accountUnitInfo.id) !== String(val),
              );
              const dataSourceMap = dataSourceFilter.map(account => ({
                label: account?.accountName,
                value: account.id,
                accountName: account?.accountName,
                accountNameNode: listNode(account),
              }));

              nowForm.setFieldState('accountName', {
                dataSource: dataSourceMap,
              });
            }
            if (type === REDUCTION && units.current) {
              const dataSourceMap = units.current
                .filter(
                  accountUnitInfo =>
                    isCompletedAccount(accountUnitInfo) &&
                    String(accountUnitInfo.id) !== String(val),
                )
                .map(accountOption);

              nowForm.setFieldState('accountName', {
                dataSource: dataSourceMap,
                value:
                  String(nowForm.getValuesIn('accountName')) === String(val)
                    ? undefined
                    : nowForm.getValuesIn('accountName'),
              });
            }
          } else if (type === COMPARE && units.current) {
            // 清空功能单位解除限制
            const dataSourceMap = units.current.map(account => ({
              label: account?.accountName,
              value: account.id,
              accountName: account?.accountName,
              accountNameNode: listNode(account),
            }));

            nowForm.setFieldState('accountName', {
              dataSource: dataSourceMap,
            });
          } else if (type === REDUCTION && units.current) {
            const dataSourceMap = units.current
              .filter(isCompletedAccount)
              .map(accountOption);

            nowForm.setFieldState('accountName', {
              dataSource: dataSourceMap,
            });
          }

          if (!val) {
            form.current.setFieldState('compareStartTime', {
              value: undefined,
            });
          }
        });
        onFieldChange('productName', field => {
          // @ts-ignore    // 类型缺失
          const val = field.value;
          if (val) {
            form.current.setFieldState('accountName', {
              readPretty: false,
              value: undefined,
            });
            form.current.setFieldState('startTime', {
              value: undefined,
            });

            getAccountInfo(val);
          } else {
            form.current.setFieldState('accountName', {
              readPretty: true,
              value: undefined,
            });
            form.current.setFieldState('startTime', {
              value: undefined,
            });
          }
        });
        onFieldChange('compareProductName', field => {
          // @ts-ignore    // 类型缺失
          const val = field.value;
          if (val) {
            form.current.setFieldState('compareAccountName', {
              readPretty: false,
              value: undefined,
            });
            form.current.setFieldState('compareStartTime', {
              value: undefined,
            });
            const formValue = form.current.values;

            GET4bdb60212ecd4780fdc01e40cb88a353({
              pageNum: 1,
              pageSize: 9999,
              productId: val,
              accountStatus: isReductionReport(formValue.type) ? 2 : undefined,
              ...getReductionQuickAccountParams(formValue.type),
            }).then(({ data }) => {
              const getAccountInfoData = units.current?.find(u => {
                if (!formValue.accountName) return undefined;
                if (String(u.id) === String(formValue.accountName)) {
                  return u;
                }
                return undefined;
              });
              let result =
                ((data?.data as any)
                  ?.rows as ProcessBusinessAccountingTableData[]) || [];
              compareUnits.current = result;
              if (formValue.accountName) {
                result = result.filter(compareAccountNameData => {
                  if (!getAccountInfoData) return true;

                  if (isReductionReport(formValue.type)) {
                    return (
                      String(compareAccountNameData.id) !==
                      String(formValue.accountName)
                    );
                  }

                  return (
                    String(compareAccountNameData.id) !==
                      String(formValue.accountName) &&
                    getAccountInfoData.type === compareAccountNameData.type
                  );
                });
              }

              form.current.setFieldState('compareAccountName', {
                dataSource: result
                  ?.filter(
                    account =>
                      !isReductionReport(formValue.type) ||
                      isCompletedAccount(account),
                  )
                  ?.map(compareAccountOption),
              });
            });
          } else {
            form.current.setFieldState('compareAccountName', {
              readPretty: true,
              value: undefined,
            });
            form.current.setFieldState('compareStartTime', {
              value: undefined,
            });
          }
        });
        registerReportQualityEffects();
        const syncValidationPatterns = [
          'companyProfile',
          'suppose',
          'productionProcess',
          'overallDescription',
          'description',
          'reduceExtra.stageList.*.name',
          'reduceExtra.targetScence',
          'reduceExtra.baseScence',
          'reduceExtra.allAnalysis',
          'reduceExtra.structureAnalysis',
          'reduceExtra.potentialAnalysis',
          'reduceExtra.suggestion',
          'reportExtraInfo.*',
          'reportExtraInfo.productIndicator',
          'reportExtraInfo.productIndicator.*',
          'reportExtraInfo.productIndicator.*.*',
          'reportActivityList.*.*',
          'reportFactoryList.*.*',
          'stageEmissions.*.*',
          'stageEmissions.*.*.*',
        ] as const;
        syncValidationPatterns.forEach(pattern => {
          onFieldValueChange(pattern, revalidateFieldFeedback);
        });
      },
    }),
  );

  const { renderAIGenerateButton } = useReportAIFill(form, readPretty);

  const clearReportDescriptionFeedback = () => {
    if (hasSubmitAttemptedRef.current) return;

    clearValidationStatus(form.current, REPORT_DESCRIPTION_VALIDATION_PATTERNS);
    window.setTimeout(() => {
      if (hasSubmitAttemptedRef.current) return;
      clearValidationStatus(
        form.current,
        REPORT_DESCRIPTION_VALIDATION_PATTERNS,
      );
    }, 0);
  };

  const setReportDescriptionValues = (
    productionProcess: string,
    overallDescription: string,
  ) => {
    form.current.setValuesIn('productionProcess', productionProcess);
    form.current.setValuesIn('overallDescription', overallDescription);
    clearReportDescriptionFeedback();
  };

  const formTab = useMemo(() => FormTab.createFormTab(), []);

  const getOptions = (setDefaultValue?: boolean, type?: number) => {
    const setFieldState = (options: Options) => {
      form.current.setFieldState('*.*.activityType', {
        dataSource: changeData2SelectOptions(options?.activityType),
      });
      form.current.setFieldState('*.*.times', {
        dataSource: changeData2SelectOptions(options?.timeType),
      });
      form.current.setFieldState('*.*.region', {
        dataSource: changeData2SelectOptions(options?.regionType),
      });
      form.current.setFieldState('*.*.technology', {
        dataSource: changeData2SelectOptions(options?.technologyType),
      });
      form.current.setFieldState('*.*.datas', {
        dataSource: changeData2SelectOptions(options?.dataType),
      });
      form.current.setFieldState('*.*.methodology', {
        dataSource: changeData2SelectOptions(options?.methodologyType),
      });
      form.current.setFieldState('*.*.dataType', {
        dataSource: changeData2SelectOptions(options?.reportStage),
      });
    };
    const typeNum = type !== undefined ? type : accountTypeRef.current;

    return getReportScope({ accountType: typeNum }).then(({ data }) => {
      const options = data?.data as MonteCarloScope;
      setAnalysisScope(options);
      const { values } = form.current;
      const { accountName, ...restValues } = values || {};
      if (setDefaultValue)
        form.current.setValues(
          {
            ...restValues,
            reportActivityList: options.reportStage.map(d => ({
              ...d,
              // 接口需要字段
              dataType: d.code,
              ...restValues?.reportActivityList?.find(
                v => Number(v.dataType) === d.code,
              ),
            })),
            reportFactoryList: options.reportStage.map(d => ({
              ...d,
              dataType: d.code,
              ...restValues?.reportFactoryList?.find(
                v => Number(v.dataType) === d.code,
              ),
            })),
          },
          // 'overwrite',
        );
      setFieldState(options);
      return options;
    });
  };

  /**
   * @description: 异步获取产品数据源
   * @param {Field} field
   */
  const useAsyncProductDataSource = () => (field: Field) => {
    field.loading = true;
    getAccountProductData({ pageNum: 1, pageSize: 10000 }).then(back => {
      const enumData = back.data.data.rows;
      field.dataSource = enumData.map(data => ({
        label: data.productName,
        value: data.id,
      }));

      field.loading = false;
    });
  };

  /**
   * @description: 产品列表保存
   * @param {Field} field
   */
  const useAsyncProductList = () => (field: Field) => {
    const fieldValue: number | undefined = field?.value;

    getAccountProductData({ pageNum: 1, pageSize: 10000 }).then(back => {
      const enumData = back.data.data.rows;
      field.dataSource = enumData.map(data => ({
        label: data.productName,
        value: data.id,
        info: data,
      }));

      // 编辑进来需要设置功能单位的dataSource 或者 从批量选择中出来的 也可以触发
      if (
        (pageInfoType !== PageInfoType.add && fieldValue) ||
        (selectProductAccountStatusRef.current && fieldValue)
      ) {
        // 获取功能单位表格路径
        const amountFieldPath = field.query('.accountName').take()?.path;
        const amountInfoFieldPath = field
          .query('.accountInfoList')
          .take()?.path;

        // 获取所有产品的核算信息
        getCommonAccountListData({
          productId: fieldValue,
          pageNum: 1,
          pageSize: 9999,
        }).then(({ data }) => {
          const accountList = data.data.rows
            .filter(list => list.type === accountTypeRef.current)
            ?.map(list => ({
              label: list.accountName,
              value: list.id,
              accountName: list.accountName,
              accountNameNode: readPretty ? list.accountName : listNode(list),
            }));

          if (amountFieldPath && amountInfoFieldPath) {
            form.current.setFieldState(amountFieldPath, {
              dataSource: accountList,
            });

            form.current.setValuesIn(amountInfoFieldPath, data.data.rows);
          }
        });
      }
    });
  };

  /**
   * 提交表前校验
   * @param accountId 目标产品
   * @param compareAccountId 基准产品
   */
  /**
   * 切换核算类型，动态设置所有功能单位
   * @param accountTypeVal 选中的核算类型，快速和过程
   */
  const changeAccountType = async (accountTypeVal: number) => {
    setMainLoading(true);

    restArrayField();

    // 切换快速和过程 更新底部类型
    await getOptions(true, accountTypeVal);

    // 判断是否先选中有值
    const formValueReportAccountList: FormSubReportAccountList[] =
      form.current.getValuesIn('reportAccountList');

    if (formValueReportAccountList?.length > 0) {
      // 将所有的核算选中先清空

      // form.current.setFieldState('reportAccountList.*.accountName', {
      //   value: undefined,
      // });

      // form.current.setValuesIn('reportAccountList.0.accountName', {
      //   value: undefined,
      // });

      form.current.setFieldState('reportAccountList.*.periodTime', {
        value: undefined,
      });

      // 然后根据选中的核算类型 - 过滤掉dataSource
      formValueReportAccountList.forEach((item, index) => {
        form.current.setValuesIn(
          `reportAccountList.${index}.accountName`,
          undefined,
        );

        if (item.productName) {
          const accountInfoList = form.current.getFieldState(
            `reportAccountList.${index}.accountInfoList`,
          )?.value as ProductAccountingList[];

          const accountList = accountInfoList
            .filter(list => list.type === accountTypeVal)
            ?.map(list => ({
              label: list.accountName,
              value: list.id,
              accountName: list.accountName,
              accountNameNode: listNode(list),
            }));
          form.current.setFieldState(`reportAccountList.${index}.accountName`, {
            dataSource: accountList,
          });
        }
      });
    }

    form.current.setValuesIn('accountType', accountTypeVal);
    accountTypeRef.current = accountTypeVal;
    setMainLoading(false);
  };

  /**
   * 自动填入生产工艺/技术描述和整体描述。
   * 仅对代码内固定句式走 I18N；接口返回的 techDesc、stageName、级联地区 label 等一律原样写入，不做翻译。
   * @param productId 产品ID，用于获取 techDesc
   * @param endTime 核算周期结束时间，用于提取基准年
   * @param stageObjs 生命周期阶段列表
   * @param techDescOverride 直接传入的 techDesc，省略则调接口获取
   */
  const autoFillDescriptions = async ({
    productId,
    endTime,
    stageObjs,
    techDescOverride,
  }: {
    productId: number;
    endTime?: string;
    stageObjs?: Array<{ stageName: string }>;
    techDescOverride?: string;
  }) => {
    let techDesc = techDescOverride || '';
    if (!techDesc) {
      try {
        const detail = await getAccountProductInfo({ id: productId });
        techDesc = detail?.data?.data?.techDesc || '';
      } catch (e) {
        /* ignore */
      }
    }
    const productionAddressValue = form.current.getValuesIn(
      'productionAddress',
    ) as string[] | undefined;
    const geoName = resolveGeoName(cityDataRef.current, productionAddressValue);
    const stageSep = I18N.carbonFootprint3.reportAutoFillStageSeparator;
    const stageNames = stageObjs?.map(s => s.stageName).join(stageSep) || '';
    const lifeCycleLine = stageNames
      ? I18N.template(I18N.carbonFootprint3.reportAutoFillScopeIncludes, {
          val1: stageNames,
        })
      : '';
    const endYear = endTime ? new Date(endTime).getFullYear().toString() : '';
    const timeLine = endYear
      ? I18N.template(I18N.carbonFootprint3.reportAutoFillBaseYear, {
          val1: endYear,
        })
      : '';
    const displayGeo =
      geoName === I18N.carbonFootprint3.reportAutoFillChina
        ? I18N.carbonFootprint3.reportAutoFillChina
        : geoName;
    const geoLine = I18N.template(I18N.carbonFootprint3.reportAutoFillRegion, {
      val1: displayGeo,
    });
    const overallDescription = buildOverallDescription({
      lifeCycleLine,
      techDesc,
      timeLine,
      geoLine,
    });
    setReportDescriptionValues(techDesc, overallDescription);
  };

  /**
   * 选中产品回显
   * @param items 选中的产品
   */
  const selectProductModal = async (items: ProductAccountingList[]) => {
    selectProductAccountStatusRef.current = true;
    const formReportAccountList = form.current.getValuesIn(
      'reportAccountList',
    ) as FormSubReportAccountList[];

    const selectData = items.map(item => ({
      accountName: item.id,
      productName: item.productId,
      periodTime: I18N.template(I18N.carbonFootprint3.items3, {
        val1: item.startTime,
        val2: item.endTime,
      }),
      specification: item.specification,
    }));

    const selectValues = [
      ...(formReportAccountList || []),
      ...(selectData || []),
    ];
    const finalList = selectValues.filter(itemInfo => itemInfo.productName);

    // 只有存在产品名称才会显示
    form.current.setValuesIn('reportAccountList', finalList);
    if (hasSubmitAttemptedRef.current) {
      Promise.all([
        form.current.validate('reportAccountList.*.productName'),
        form.current.validate('reportAccountList.*.accountName'),
      ]).catch(() => undefined);
    }
    setProductModalVisible(false);

    if (!readPretty) {
      // 以落下来的总数量为准：恰好1条才反显，否则清空
      if (finalList.length === 1) {
        // 找到本次选中数据中与唯一一条对应的 ProductAccountingList
        const matchedItem = items.find(
          item =>
            item.productId === finalList[0].productName &&
            item.id === finalList[0].accountName,
        );

        if (matchedItem) {
          // 优先取选中数据自带的 techDesc，没有则调详情接口获取
          const rawTechDesc = (
            matchedItem as unknown as Record<string, unknown>
          ).techDesc;
          await autoFillDescriptions({
            productId: matchedItem.productId!,
            endTime: matchedItem.endTime,
            stageObjs: matchedItem.stageObjs,
            techDescOverride:
              typeof rawTechDesc === 'string' && rawTechDesc
                ? rawTechDesc
                : undefined,
          });
        } else {
          // 唯一一条来自历史选择，无法获取详情，清空字段
          setReportDescriptionValues('', '');
        }
      } else {
        // 总数量为0或超过1条时清空两个字段
        setReportDescriptionValues('', '');
      }
    }
  };

  useEffect(() => {
    // 生成报告 跳转进来
    if (pageInfoType === PageInfoType.add && Number(id) > 0) {
      getAccountingInfo({ id }).then(async accountInfo => {
        const { data } = accountInfo.data;
        form.current.setFieldState('.productName', {
          value: data.productId,
        });
        form.current.setFieldState('.accountName', {
          value: data.id,
        });
        accountId.current = data.id;
        form.current.setFieldState('.startTime', {
          value: [data?.startTime, data?.endTime],
        });
        accountTypeRef.current = data.type;
        form.current.setValuesIn('accountType', data.type);
        getOptions(true, data.type);
        form.current.setValuesIn('reportAccountList', [
          {
            accountName: data.id,
            productName: data.productId,
            periodTime: I18N.template(I18N.carbonFootprint3.data, {
              val1: data.startTime,
              val2: data.endTime,
            }),
            specification: data.specification,
          },
        ]);

        // 自动填入生产工艺/技术描述
        // 获取所有产品的核算信息，同时自动填入描述字段
        getCommonAccountListData({
          productId: data.productId,
          pageNum: 1,
          pageSize: 9999,
        }).then(({ data: backData }) => {
          const accountList = backData.data.rows
            .filter(list => list.type === data.type)
            ?.map(list => ({
              label: list.accountName,
              value: list.id,
              accountName: list.accountName,
              accountNameNode: listNode(list),
            }));
          form.current.setFieldState(`reportAccountList.0.accountName`, {
            dataSource: accountList,
          });
          form.current.setFieldState(`reportAccountList.0.accountInfoList`, {
            value: backData.data.rows,
          });

          const amountInfo = backData.data.rows.find(row => row.id === data.id);
          autoFillDescriptions({
            productId: data.productId,
            endTime: data.endTime,
            stageObjs: (amountInfo as any)?.stageObjs,
          });
        });
      });
    }

    // 新增报告，直接调用
    if (pageInfoType === PageInfoType.add && id === 'null') {
      getOptions(true);
    }

    if (pageInfoType !== PageInfoType.add && Number(id) > 0) {
      setMainLoading(true);
      initEditStatus.current = true;
      GET8981b14f7dda355705d81c48f17aa226({ id: Number(id) }).then(
        async res => {
          const result = res?.data?.data
            ? normalizeReductionReportValues(res.data.data as Report)
            : undefined;
          if (result) {
            const restored: SensitivityConfigs = {};
            result.reportAccountList?.forEach(item => {
              restored[String(item.accountId)] = {
                scope: (item.sensitivityScope as string | null) ?? '0',
                description: (item.sensitivityDescription as string) || '',
              };
            });
            setSensitivityConfigs(restored);
            accountTypeRef.current = result.accountType;
            form.current.setValuesIn('accountType', result.accountType);

            if (result.type === CARBON_LABEL) {
              await getAccountInfo(result.productId);
            }

            // 对比报告隐藏产品列表字段，先恢复分析配置，避免字段卸载清除关联数据。
            if (result.type === REPORT || result.type === COMPARE) {
              form.current.setValuesIn(
                'monteCarloByAccount',
                collectMonteCarloStates(result),
              );
            }
            form.current.setValues({
              ...result,
              productName: result.productId,
              accountName: result.accountId,
              reportFactoryList: result.reportFactoryList || [],
              reportActivityList: result.reportActivityList || [],
              productionAddress: result.productionAddress
                ? JSON.parse(result.productionAddress)
                : undefined,
              evaluateProductCategory: result.evaluateProductCategory
                ? JSON.parse(result.evaluateProductCategory)
                : undefined,
              reportAccountList: result.reportAccountList?.map(item => ({
                accountName: item.accountId,
                monteCarloConfig: item.monteCarloConfig,
                monteCarloResult: item.monteCarloResult,
                monteCarloDescription: item.monteCarloDescription,
                productName:
                  item.productId ??
                  (item.baseType === TARGET
                    ? result.productId
                    : result.compareProductId),
                periodTime:
                  item.startTime || item.endTime
                    ? I18N.template(I18N.carbonFootprint3.items3, {
                        val1: item.startTime,
                        val2: item.endTime,
                      })
                    : undefined,
                specification: item.specification,
              })),
            });

            if (result.stageEmissions) {
              form.current.setValuesIn(
                'stageEmissions.stages',
                Object.keys(result.stageEmissions).map(Number),
              );
              Object.keys(result.stageEmissions).forEach(stage => {
                form.current.setValuesIn(
                  `stageEmissions.${stage}`,
                  result.stageEmissions[stage],
                );
              });
            }
            // 新版本碳足迹报告逻辑
            if (result.type === REPORT || result.type === CARBON_LABEL) {
              getOptions().then(options => {
                // 根据 reportStage 设置 table中的数据
                const reportStageCode = options?.reportStage?.reduce(
                  (tmp, next) => tmp.concat(next.code),
                  [] as number[],
                );
                form.current.setValues({
                  reportFactoryList: result?.reportFactoryList?.filter(d =>
                    reportStageCode.includes(Number(d.dataType)),
                  ),
                  reportActivityList: result?.reportActivityList?.filter(d =>
                    reportStageCode.includes(Number(d.dataType)),
                  ),
                });
                setMainLoading(false);
              });
            } else if (result.reportAccountList || result.type === REDUCTION) {
              const apiReportAccountList = (result.reportAccountList ||
                []) as ProductAccountingList[];
              // 目标产品
              const targetDard = apiReportAccountList.filter(
                item => item.baseType === 0,
              );
              // 基准产品
              const stabDard = apiReportAccountList.filter(
                item => item.baseType === 1,
              );
              const targetInfo = {
                ...(targetDard[0] || {}),
                accountId: targetDard[0]?.accountId ?? result.accountId,
                productId: targetDard[0]?.productId ?? result.productId,
              };
              const standardInfo = {
                ...(stabDard[0] || {}),
                accountId: stabDard[0]?.accountId ?? result.compareAccountId,
                productId: stabDard[0]?.productId ?? result.compareProductId,
              };
              if (
                !targetInfo.accountId ||
                !targetInfo.productId ||
                !standardInfo.accountId ||
                !standardInfo.productId
              ) {
                if (
                  (result.type === COMPARE || result.type === REDUCTION) &&
                  result.reportStatus === 0
                ) {
                  // 尚未选完功能单位的草稿，也要加载各自已选产品的核算选项。
                  if (targetInfo.productId) {
                    await getAccountInfo(Number(targetInfo.productId));
                  }
                  if (standardInfo.productId) {
                    form.current.setValuesIn(
                      'compareProductName',
                      Number(standardInfo.productId),
                    );
                    const response = await GET4bdb60212ecd4780fdc01e40cb88a353({
                      pageNum: 1,
                      pageSize: 9999,
                      productId: Number(standardInfo.productId),
                      accountStatus: result.type === REDUCTION ? 2 : undefined,
                      ...getReductionQuickAccountParams(result.type),
                    });
                    const responseData = response.data.data as {
                      rows?: ProcessBusinessAccountingTableData[];
                    };
                    const accounts = responseData?.rows || [];
                    compareUnits.current = accounts;
                    form.current.setFieldState('compareAccountName', {
                      dataSource: filterReportComparisonAccounts(
                        accounts,
                        result.type,
                        targetInfo.accountId,
                        units.current?.find(
                          item =>
                            String(item.id) === String(targetInfo.accountId),
                        )?.type,
                      ).map(compareAccountOption),
                    });
                  }
                  form.current.setValues({
                    productName: targetInfo.productId,
                    accountName: targetInfo.accountId,
                    compareProductName: standardInfo.productId,
                    compareAccountName: standardInfo.accountId,
                  });
                  await getOptions();
                }
                initEditStatus.current = false;
                setMainLoading(false);
                return;
              }
              await getAccountInfo(Number(targetInfo.productId));
              const compareAccountBack =
                await GET4bdb60212ecd4780fdc01e40cb88a353({
                  pageNum: 1,
                  pageSize: 9999,
                  productId: Number(standardInfo.productId),
                  accountStatus: result.type === REDUCTION ? 2 : undefined,
                  ...getReductionQuickAccountParams(result.type),
                });
              let compareAccountList =
                ((compareAccountBack?.data?.data as any)
                  ?.rows as ProcessBusinessAccountingTableData[]) || [];
              compareUnits.current = compareAccountList;
              const targetAccountDetail = units.current?.find(
                item => String(item.id) === String(targetInfo.accountId),
              );
              const standardAccountDetail = compareAccountList.find(
                item => String(item.id) === String(standardInfo.accountId),
              );
              compareAccountList = filterReportComparisonAccounts(
                compareAccountList,
                result.type,
                targetInfo.accountId,
                targetAccountDetail?.type,
              );
              form.current.setFieldState('compareProductName', {
                value: Number(standardInfo.productId),
              });
              form.current.setFieldState('compareAccountName', {
                dataSource: compareAccountList.map(compareAccountOption),
                value: Number(standardInfo.accountId),
              });
              form.current.setFieldState('compareStartTime', {
                value: [
                  standardInfo.startTime || standardAccountDetail?.startTime,
                  standardInfo.endTime || standardAccountDetail?.endTime,
                ],
              });
              form.current.setFieldState('.productName', {
                value: Number(targetInfo.productId),
              });
              form.current.setFieldState('.accountName', {
                value: Number(targetInfo.accountId),
              });
              form.current.setFieldState('.startTime', {
                value: [
                  targetInfo.startTime || targetAccountDetail?.startTime,
                  targetInfo.endTime || targetAccountDetail?.endTime,
                ],
              });
              accountId.current = Number(targetInfo.accountId);

              if (result.type === COMPARE) {
                // 旧版逻辑
                onUnitChange(Number(targetInfo.accountId));
                getOptions().then(options => {
                  // 根据 reportStage 设置 table中的数据
                  const reportStageCode = options?.reportStage?.reduce(
                    (tmp, next) => tmp.concat(next.code),
                    [] as number[],
                  );
                  form.current.setValues({
                    reportFactoryList: result?.reportFactoryList?.filter(d =>
                      reportStageCode.includes(Number(d.dataType)),
                    ),
                    reportActivityList: result?.reportActivityList?.filter(d =>
                      reportStageCode.includes(Number(d.dataType)),
                    ),
                  });
                  setMainLoading(false);
                });
              } else {
                setMainLoading(false);
              }
            }
            initEditStatus.current = false;
            setMainLoading(false);
          }
        },
      );
    }

    // 单独处理对比报告类型
    if (Number(comparisonId) > 0) {
      form.current.setFieldState('type', {
        value: COMPARE,
      });

      getAccountingInfo({ id: comparisonId }).then(accountInfo => {
        const { data } = accountInfo.data;
        form.current.setFieldState('compareProductName', {
          value: data.productId,
        });
        form.current.setFieldState('compareAccountName', {
          value: data.id,
        });
        form.current.setFieldState('compareStartTime', {
          value: [data?.startTime, data?.endTime],
        });
      });
    }
  }, [pathname]);

  const cityData = useCityInfo(2);

  useEffect(() => {
    cityDataRef.current = cityData;
    form.current.setFieldState('productionAddress', {
      dataSource: cityData,
    });
  }, [cityData]);

  const productClassificationEnum = useAllEnumsBatch('productClassification');

  useEffect(() => {
    const options = productClassificationEnum?.productClassification;
    if (options) {
      form.current.setFieldState('evaluateProductCategory', {
        dataSource: changeFactorM2cascaderOptions(options),
      });
    }
  }, [productClassificationEnum]);

  const companyUserInfo = useSelector<RootState, RootState['companyUserInfo']>(
    state => state.companyUserInfo,
  );
  const companyName = companyUserInfo?.userInfo?.companyName;
  const companyId = companyUserInfo?.userInfo?.companyId;

  useEffect(() => {
    if (pageInfoType === PageInfoType.add && companyId) {
      apiQueryByCompanyId({ id: companyId }).then(res => {
        const area = res?.data?.data?.area;
        if (area) {
          try {
            const parsed: string[] = JSON.parse(area);
            form.current.setFieldState('productionAddress', {
              value: parsed.slice(0, 2),
            });
          } catch (e) {
            // area 格式异常时不做回填
          }
        }
      });
    }
  }, [pageInfoType, companyId]);

  useEffect(() => {
    if (pageInfoType === PageInfoType.add) {
      form.current.setValuesIn('reportExtraInfo.producer', companyName);
      form.current.setValuesIn(
        'reportExtraInfo.produceEnterprise',
        companyName,
      );
    }
  }, [companyName, pageInfoType]);

  const { handleSave, subBtnLoading } = useReportSave({
    form,
    accountId,
    accountTypeRef,
    units,
    compareUnits,
    sensitivityConfigs,
    hasSubmitAttemptedRef,
    setAnalysisTab,
  });

  return (
    <div className={`${styles.wrapper} reportMain`}>
      <h2 className={styles.pageTitle}>
        {pageInfoType === PageInfoType.add
          ? I18N.carbonFootprint.newReportAdded
          : readPretty
          ? I18N.carbonFootprint3.details
          : I18N.carbonFootprint.editReport}
      </h2>
      <Spin spinning={mainLoading}>
        <FormilyCommon form={form.current} colon={false}>
          <main>
            <div className={styles.card}>
              <SchemaField
                schema={basicSchema({
                  isEdit: pageInfoType === PageInfoType.edit,
                  productToolbar: (
                    <FormConsumer>
                      {nowFow => {
                        const { type } = nowFow.values;
                        return (
                          <div className={styles.reportAccountList}>
                            {type === REPORT && (
                              <AntdRadio.Group
                                disabled={readPretty}
                                value={nowFow.values.accountType ?? QUICK}
                                onChange={e =>
                                  changeAccountType(e.target.value)
                                }
                              >
                                <AntdRadio.Button value={QUICK}>
                                  {I18N.carbonFootprint3.quickAccounting}
                                </AntdRadio.Button>
                                <AntdRadio.Button value={PROCESS}>
                                  {I18N.carbonFootprint3.processAccounting}
                                </AntdRadio.Button>
                              </AntdRadio.Group>
                            )}

                            {type === REPORT && !readPretty && (
                              <Button
                                icon={<AnalysisIcon name='batchSelect' />}
                                type='default'
                                className='m-l-16'
                                onClick={() => setProductModalVisible(true)}
                              >
                                {I18N.carbonFootprint3.batchSelection}
                              </Button>
                            )}
                          </div>
                        );
                      }}
                    </FormConsumer>
                  ),
                })}
                scope={{ useAsyncProductDataSource, useAsyncProductList }}
              />
              {renderAIGenerateButton([CARBON_LABEL])}
              <SchemaField
                schema={carbonLabelSchema({
                  showProductType: false,
                  productTypePlaceholderVisible: false,
                  visibleReaction: {
                    dependencies: ['type'],
                    fulfill: {
                      state: {
                        componentProps: {
                          style: {
                            display: `{{$deps[0] === ${CARBON_LABEL} ? 'block' : 'none'}}`,
                          },
                        },
                      },
                    },
                  },
                  productTypeReaction: {
                    dependencies: ['type'],
                    fulfill: {
                      schema: {
                        required: `{{$deps[0] == ${CARBON_LABEL}}}`,
                      },
                    },
                  },
                  tableFieldReaction: {
                    dependencies: ['type'],
                    fulfill: {
                      schema: {
                        required: `{{$deps[0] == ${CARBON_LABEL}}}`,
                      },
                    },
                  },
                })}
                scope={{ formTab }}
              />
            </div>
            <ReportDetails
              analysisScope={analysisScope}
              reportId={
                pageInfoType !== PageInfoType.add && Number(id) > 0
                  ? Number(id)
                  : undefined
              }
              analysisTab={analysisTab}
              setAnalysisTab={setAnalysisTab}
              renderAIGenerateButton={renderAIGenerateButton}
              getAnalysisProducts={getAnalysisProducts}
              sensitivityConfigs={sensitivityConfigs}
              setSensitivityConfigs={setSensitivityConfigs}
              readPretty={readPretty}
              setModalShow={setModalShow}
            />
          </main>
        </FormilyCommon>
      </Spin>
      <FormConsumer>
        {() => (
          <FormActions
            place='center'
            className={styles.formActions}
            buttons={[
              ...(!readPretty
                ? [
                    {
                      title: I18N.carbonFootprint.preserve,
                      type: 'primary' as const,
                      loading: subBtnLoading,
                      onClick: () => handleSave(false),
                    },
                  ]
                : []),
              ...(!readPretty
                ? [
                    {
                      title: I18N.carbonFootprint3.analysisSaveDraft,
                      loading: subBtnLoading,
                      onClick: () => handleSave(true),
                    },
                  ]
                : []),
              {
                title: I18N.carbonFootprint.return,
                onClick: async () => {
                  history.push(
                    RouteMapsCorbonFootprint3.carbonFootprint3ProcessReport,
                  );
                },
              },
            ]}
          />
        )}
      </FormConsumer>
      <ReportDialogs
        modalShow={modalShow}
        setModalShow={setModalShow}
        checkedRadio={checkedRadio}
        setcheckedRadio={setcheckedRadio}
        productModalVisible={productModalVisible}
        setProductModalVisible={setProductModalVisible}
        form={form}
        accountType={accountTypeRef.current}
        selectProductModal={selectProductModal}
      />
    </div>
  );
};

export default ReportInfo;
