import type { Form } from '@formily/core';
import { isEmpty } from '@formily/shared';
import { message } from 'antd';
import { cloneDeep } from 'lodash-es';
import { useRef, useState, type MutableRefObject } from 'react';
import { useHistory, useParams } from 'react-router-dom';

import I18N from '@/lang/I18N';
import { RouteMapsCorbonFootprint3 } from '@/router/route-paths/corbonFootprint3';
import { PageInfoType } from '@/router/type';
import {
  POST78bcf124777efe639e8c76d0c6aea265,
  POSTfdf3917ac048472511d90e1110fbcb73,
  type Report,
} from '@/sdks_v2/footprint3V2ApiDocs';
import { Toast } from '@/utils/Toast';

import type { ProcessBusinessAccountingTableData } from '../../../ProcessBusinessAccounting/type';
import type { SensitivityConfigs } from '../../../components/SensitivityTable/types';
import { COMPARISON_REPORT_TYPE, REPORT_TYPE } from '../../../constant';
import {
  attachMonteCarloStates,
  buildReductionExtra,
  clearLegacyReductionFields,
  collectMonteCarloStates,
  reportMonteCarloComplete,
  syncValidationByReportType,
  verifyReportAccountTypes,
} from '../reportUtils';
import type { FormSubReportAccountList } from '../types';
import { validateDraft } from '../validateDraft';

const { REPORT, COMPARE, CARBON_LABEL, REDUCTION } = REPORT_TYPE;
const { TARGET, STANDARD } = COMPARISON_REPORT_TYPE;

interface Options {
  form: MutableRefObject<Form<Report>>;
  accountId: MutableRefObject<number | undefined>;
  accountTypeRef: MutableRefObject<number>;
  units: MutableRefObject<ProcessBusinessAccountingTableData[] | undefined>;
  compareUnits: MutableRefObject<
    ProcessBusinessAccountingTableData[] | undefined
  >;
  sensitivityConfigs: SensitivityConfigs;
  hasSubmitAttemptedRef: MutableRefObject<boolean>;
  setAnalysisTab: (tab: string) => void;
}

/** 保存入口共享草稿、完成校验及分析配置序列化。 */
export function useReportSave({
  form,
  accountId,
  accountTypeRef,
  units,
  compareUnits,
  sensitivityConfigs,
  hasSubmitAttemptedRef,
  setAnalysisTab,
}: Options) {
  const history = useHistory();
  const { pageInfoType, id } = useParams<{
    pageInfoType: PageInfoType;
    id: string;
  }>();
  const [subBtnLoading, setSubBtnLoading] = useState(false);
  const saveSubmittingRef = useRef(false);
  const handleSave = async (draft: boolean) => {
    if (saveSubmittingRef.current) return;
    saveSubmittingRef.current = true;
    setSubBtnLoading(true);
    hasSubmitAttemptedRef.current = !draft;
    // 判断是否先选中有值
    const formValueReportAccountList: FormSubReportAccountList[] =
      form.current.getValuesIn('reportAccountList');
    formValueReportAccountList?.forEach((list, listIndex) => {
      if (!list.productName && !list.accountName) {
        form.current.setFieldState(
          `reportAccountList.${listIndex}.productName`,
          {
            required: false,
          },
        );
        form.current.setFieldState(
          `reportAccountList.${listIndex}.accountName`,
          {
            required: false,
          },
        );
      }
    });
    syncValidationByReportType(
      form.current,
      form.current.values.type as number,
    );
    try {
      if (!draft && !reportMonteCarloComplete(form.current)) {
        setAnalysisTab('evaluation');
        message.warning(I18N.carbonFootprint3.mcCompleteParameters);
        return;
      }
      const persist = async (values: Report) => {
        const monteStates = collectMonteCarloStates(values);
        setSubBtnLoading(true);

        values.productId = values.productName
          ? Number(values.productName)
          : undefined;

        if (values.type !== CARBON_LABEL) {
          values.reportExtraInfo = undefined;
          values.stageEmissions = undefined;
        } else if (values.stageEmissions) {
          values.stageEmissions.stages = undefined;
        }
        values.reportFactoryList = values?.reportFactoryList?.map(back => {
          const valArr = Object.values(back);
          const keyArr = Object.keys(back);

          valArr.forEach((val, indexVal) => {
            if (val === undefined) {
              back[keyArr[indexVal]] = '';
            }
          });

          return back;
        });
        // 处理新增的产品报告列表
        values.reportAccountList = values?.reportAccountList
          ?.filter(list => !isEmpty(list))
          ?.map(back => ({
            accountId: back.accountName ? Number(back.accountName) : undefined,
            productId: back.productName ? Number(back.productName) : undefined,
          }));

        const selectedAccountId = values.accountName
          ? Number(values.accountName)
          : values.type === REPORT
          ? accountId.current
          : undefined;
        const compareAccountId = values.compareAccountName
          ? Number(values.compareAccountName)
          : undefined;

        if (draft && (values.type === COMPARE || values.type === REDUCTION)) {
          values.reportAccountList = [
            {
              accountId: selectedAccountId,
              productId: values.productId,
              baseType: TARGET,
            },
            {
              accountId: compareAccountId,
              productId: values.compareProductName
                ? Number(values.compareProductName)
                : undefined,
              baseType: STANDARD,
            },
          ].filter(item => item.accountId || item.productId);
        }

        // 说明是对标报告 - 需要校验核算方式
        if (values.type === COMPARE && compareAccountId && selectedAccountId) {
          const compareStatus = verifyReportAccountTypes(
            selectedAccountId,
            compareAccountId,
            units.current,
            compareUnits.current,
          );

          // 如果校验失败直接返回
          if (!compareStatus) {
            setSubBtnLoading(false);
            return;
          }

          // 处理新增的产品报告列表
          values.reportAccountList = [
            {
              accountId: selectedAccountId,
              productId: values.productId,
              baseType: TARGET,
            },

            {
              accountId: compareAccountId,
              productId: values.compareProductName
                ? Number(values.compareProductName)
                : undefined,
              baseType: STANDARD,
            },
          ];
        }

        if (
          values.type === REDUCTION &&
          selectedAccountId &&
          compareAccountId
        ) {
          values.reportAccountList = [
            {
              accountId: selectedAccountId,
              baseType: TARGET,
            },
            {
              accountId: compareAccountId,
              baseType: STANDARD,
            },
          ];
        }

        const selectedAccountInfo = units.current?.find(
          item => String(item.id) === String(selectedAccountId),
        );
        const reductionExtra =
          values.type === REDUCTION ? buildReductionExtra(values) : undefined;
        const report: Report = {
          ...values,
          reportStatus: draft ? 0 : 1,
          accountType:
            values.type === REDUCTION && selectedAccountInfo
              ? Number(selectedAccountInfo.type)
              : accountTypeRef.current,
          accountId: selectedAccountId,
          compareAccountId,
          compareProductId: values.compareProductName
            ? Number(values.compareProductName)
            : undefined,
          compareStartTime: undefined,
          startTime: undefined,
          reportActivityList:
            values.type === REDUCTION ? undefined : values.reportActivityList,
          reportFactoryList:
            values.type === REDUCTION ? undefined : values.reportFactoryList,
          reportExtraInfo:
            values.type === REDUCTION ? undefined : values.reportExtraInfo,
          stageEmissions:
            values.type === REDUCTION ? undefined : values.stageEmissions,
          productionAddress:
            values.type === REPORT && values.productionAddress
              ? JSON.stringify(values.productionAddress)
              : undefined,
          evaluateProductCategory:
            values.type === REPORT && values.evaluateProductCategory
              ? JSON.stringify(values.evaluateProductCategory)
              : undefined,
          reduceExtra: reductionExtra,
        };

        // 如果不是产品对比报告 - 需要去掉基准产品的数据
        if (report.type !== COMPARE && report.type !== REDUCTION) {
          report.compareAccountId = undefined;
          report.compareAccountName = undefined;
          report.compareProductId = undefined;
          report.compareProductName = undefined;
        }

        if (report.type !== REDUCTION) {
          report.reduceExtra = undefined;
          clearLegacyReductionFields(report);
        } else {
          report.companyProfile = undefined;
          report.productionProcess = undefined;
          report.overallDescription = undefined;
          clearLegacyReductionFields(report);
        }

        if (report.type === REPORT || report.type === COMPARE) {
          report.reportAccountList = report.reportAccountList?.map(item => ({
            ...item,
            sensitivityScope:
              sensitivityConfigs[String(item.accountId)]?.scope ?? '0',
            sensitivityDescription:
              sensitivityConfigs[String(item.accountId)]?.description || '',
          }));
        }
        attachMonteCarloStates(report, monteStates);
        if (pageInfoType === PageInfoType.add) {
          await POSTfdf3917ac048472511d90e1110fbcb73({
            report,
          })
            .then(({ data }) => {
              if (data?.code === 200) {
                Toast('success', I18N.carbonFootprint3.createdSuccessfully);
                history.push(
                  RouteMapsCorbonFootprint3.carbonFootprint3ProcessReport,
                );
              }
            })
            .catch(() => {
              setSubBtnLoading(false);
            });
        }
        if (pageInfoType === PageInfoType.edit) {
          await POST78bcf124777efe639e8c76d0c6aea265({
            report: { ...report, id: Number(id) },
          })
            .then(({ data }) => {
              if (data?.code === 200) {
                Toast('success', I18N.carbonFootprint.modifiedSuccessfully);
                history.push(
                  RouteMapsCorbonFootprint3.carbonFootprint3ProcessReport,
                );
              }
              setSubBtnLoading(false);
            })
            .catch(() => {
              setSubBtnLoading(false);
            });
        }
      };
      if (draft) {
        if (!form.current.values.reportName?.trim()) {
          message.warning(I18N.carbonFootprint3.analysisReportNameRequired);
          return;
        }
        await validateDraft(form.current);
        await persist(cloneDeep(form.current.values));
      } else {
        await form.current.submit(persist);
      }
    } catch (error) {
      if (!form.current.invalid) throw error;
      const evaluationError = form.current.errors.some(feedback =>
        /^(reportActivityList|reportFactoryList)(\.|$)/.test(
          feedback.path || '',
        ),
      );
      setAnalysisTab(evaluationError ? 'evaluation' : 'info');
    } finally {
      saveSubmittingRef.current = false;
      setSubBtnLoading(false);
    }
  };
  return { handleSave, subBtnLoading };
}
