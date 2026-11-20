import { CSSProperties, useEffect, useRef, useState } from 'react';
import { Form } from '@formily/core';
import { FormConsumer } from '@formily/react';
import { isNil } from 'lodash-es';
import { Report } from '@src/sdks_v2/footprint3V2ApiDocs';
import { tryParseJSON } from '@src/utils';
import { streamFetch } from '@/api/streamFetch';
import AIGenerateBtn from '@/views/subModules/CarbonFootprintModel/Certification/CertificationForm/components/AIGenerateBtn';
import { SaaSCalcUncertainty } from '@/views/subModules/CarbonFootprintModel/Certification/CertificationForm/saasService';
import { REPORT_TYPE } from '../../../constant';
import { FormSubReportAccountList } from '../types';
import { updateReportUncertainty } from './qualityEffects';
import {
  AI_COMMON_STRING_FIELDS,
  AI_CARBON_LABEL_EXTRA_FIELDS,
  AI_REDUCTION_STRING_FIELDS,
  FACTORY_EDITABLE_KEYS,
  FACTORY_UNCERTAINTY_KEYS,
  STAGE_EMISSION_KEYS,
  AI_REDUCTION_FIELD_MAP,
  getObjectValue,
} from '../reportUtils';

const { REPORT, COMPARE, CARBON_LABEL, REDUCTION } = REPORT_TYPE;

export function useReportAIFill(
  form: { current: Form<Report> },
  readPretty: boolean,
) {
  const abortCtrlRef = useRef<AbortController>();
  const [aiLoading, setAiLoading] = useState(false);
  useEffect(() => () => abortCtrlRef.current?.abort(), []);
  const isFieldEmpty = (value: unknown) =>
    value === undefined || value === null || value === '';

  const getSelectedReportAccountIds = (values: Report) => {
    const reportAccountList =
      (values.reportAccountList as FormSubReportAccountList[]) || [];

    return Array.from(
      new Set(
        reportAccountList.reduce<number[]>((ids, item) => {
          const selectedAccountId = item?.accountName as unknown;
          if (
            selectedAccountId === undefined ||
            selectedAccountId === null ||
            selectedAccountId === ''
          ) {
            return ids;
          }

          const accountNumber = Number(selectedAccountId);
          if (!Number.isNaN(accountNumber)) {
            ids.push(accountNumber);
          }

          return ids;
        }, []),
      ),
    );
  };

  const resolveAiFillRequest = (values: Report) => {
    const reportType = Number(values.type);
    let accountId: number | undefined;
    let compareAccountId: number | undefined;

    if (reportType === REPORT) {
      const accountIds = getSelectedReportAccountIds(values);
      if (!accountIds.length) return undefined;

      [accountId] = accountIds;
    } else {
      if (isFieldEmpty(values.accountName)) return undefined;

      const selectedAccountId = Number(values.accountName);
      if (Number.isNaN(selectedAccountId)) return undefined;
      accountId = selectedAccountId;

      if ([COMPARE, REDUCTION].includes(reportType)) {
        if (isFieldEmpty(values.compareAccountName)) return undefined;

        const selectedCompareAccountId = Number(values.compareAccountName);
        if (Number.isNaN(selectedCompareAccountId)) return undefined;
        compareAccountId = selectedCompareAccountId;
      }
    }

    const isCompareFill = [COMPARE, REDUCTION].includes(reportType);

    return {
      url: `${process.env.REACT_APP_API_URL}/footprint3/report/${
        isCompareFill ? 'aiRptCompareFill' : 'aiRptFill'
      }`,
      data: {
        accountId,
        type: String(reportType),
        ...(isCompareFill ? { compareAccountId } : {}),
      },
    };
  };

  const shouldShowAiGenerateButton = (values: Report) => {
    if (readPretty) return false;

    const reportType = Number(values.type);
    const hasTargetAccount = !isFieldEmpty(values.accountName);
    const hasCompareAccount = !isFieldEmpty(values.compareAccountName);

    if (reportType === REPORT) {
      return getSelectedReportAccountIds(values).length === 1;
    }

    if (reportType === CARBON_LABEL) return hasTargetAccount;

    if ([COMPARE, REDUCTION].includes(reportType)) {
      return hasTargetAccount && hasCompareAccount;
    }

    return false;
  };

  const getStreamMessageText = (txt: unknown) => {
    if (typeof txt === 'string') return txt;
    if (
      txt &&
      typeof txt === 'object' &&
      'text' in txt &&
      typeof (txt as { text?: unknown }).text === 'string'
    ) {
      return (txt as { text: string }).text;
    }

    return '';
  };

  const setAIValue = (path: string, value: unknown) => {
    form.current.setValuesIn(path, value);
    if (isFieldEmpty(value)) return;

    form.current.clearErrors(path);
    form.current.clearErrors(`${path}.*`);
    form.current.clearErrors(`${path}.*.*`);
    Promise.resolve(form.current.validate(path)).catch(() => undefined);
  };

  const fillAIStringFields = ({
    parsed,
    snapshot,
    fields,
    pathPrefix,
  }: {
    parsed: Record<string, any>;
    snapshot?: Record<string, any>;
    fields: string[];
    pathPrefix?: string;
  }) => {
    fields.forEach(key => {
      if (parsed[key] === undefined || !isFieldEmpty(snapshot?.[key])) return;
      setAIValue(pathPrefix ? `${pathPrefix}.${key}` : key, parsed[key]);
    });
  };

  const getFirstDefinedParsedValue = (
    parsed: Record<string, any>,
    parsedPaths: string[],
  ) => {
    let matchedValue: unknown;
    parsedPaths.some(path => {
      const pathValue = getObjectValue(parsed, path);
      if (pathValue !== undefined) {
        matchedValue = pathValue;
        return true;
      }

      if (parsed[path] !== undefined) {
        matchedValue = parsed[path];
        return true;
      }

      return false;
    });

    return matchedValue;
  };

  const fillReductionFields = (
    parsed: Record<string, any>,
    snapshot: Record<string, any>,
  ) => {
    AI_REDUCTION_FIELD_MAP.forEach(({ path, parsedPaths }) => {
      const parsedValue = getFirstDefinedParsedValue(parsed, parsedPaths);
      if (
        parsedValue === undefined ||
        !isFieldEmpty(getObjectValue(snapshot, path))
      ) {
        return;
      }

      setAIValue(path, parsedValue);
    });
  };

  const fillReportFields = (
    parsed: Record<string, any>,
    snapshot: Record<string, any>,
  ) => {
    const productProcess = getFirstDefinedParsedValue(parsed, [
      'productProcess',
      'productionProcess',
    ]);

    if (
      productProcess === undefined ||
      !isFieldEmpty(snapshot.productionProcess)
    ) {
      return;
    }

    setAIValue('productionProcess', productProcess);
  };

  const fillQualityFactorFields = (
    parsed: Record<string, any>,
    snapshot: Record<string, any>,
    factoryUncertaintyRows: Set<number>,
  ) => {
    if (!Array.isArray(parsed.qualityFactor)) return;

    const snapshotFactoryList = snapshot.reportFactoryList || [];
    parsed.qualityFactor.forEach((aiRow: Record<string, any>) => {
      const rowIndex = snapshotFactoryList.findIndex(
        (row: Record<string, any>) =>
          String(row.dataType) === String(aiRow.dataType),
      );
      if (rowIndex === -1) return;

      const snapshotRow = snapshotFactoryList[rowIndex];
      const nextRow = { ...snapshotRow };
      FACTORY_EDITABLE_KEYS.forEach(key => {
        if (aiRow[key] === undefined || !isFieldEmpty(snapshotRow[key])) return;
        setAIValue(`reportFactoryList.${rowIndex}.${key}`, aiRow[key]);
        nextRow[key] = aiRow[key];
      });

      if (
        factoryUncertaintyRows.has(rowIndex) ||
        !isFieldEmpty(snapshotRow.uncertain) ||
        !FACTORY_UNCERTAINTY_KEYS.every(key => !isNil(nextRow[key]))
      ) {
        return;
      }

      factoryUncertaintyRows.add(rowIndex);
      if ([REPORT, COMPARE].includes(Number(form.current.values.type))) {
        updateReportUncertainty(form.current, 'factor', rowIndex, true);
        return;
      }
      SaaSCalcUncertainty({
        ...nextRow,
        type: 1,
      }).then(res => {
        const currentUncertain = form.current.getValuesIn(
          `reportFactoryList.${rowIndex}.uncertain`,
        );
        if (!isFieldEmpty(currentUncertain)) return;
        setAIValue(`reportFactoryList.${rowIndex}.uncertain`, res.data.data);
      });
    });
  };

  const isEmptyProductIndicator = (productIndicator: unknown) =>
    !Array.isArray(productIndicator) ||
    productIndicator.length === 0 ||
    productIndicator.every((row: Record<string, any>) =>
      ['name', 'standard', 'indicatorValue'].every(key =>
        isFieldEmpty(row?.[key]),
      ),
    );

  const fillCarbonLabelFields = (
    parsed: Record<string, any>,
    snapshot: Record<string, any>,
    addedStageRows: Set<string>,
  ) => {
    const snapshotExtra = snapshot.reportExtraInfo || {};

    fillAIStringFields({
      parsed,
      snapshot: snapshotExtra,
      fields: AI_CARBON_LABEL_EXTRA_FIELDS,
      pathPrefix: 'reportExtraInfo',
    });

    if (
      Array.isArray(parsed.productIndicator) &&
      isEmptyProductIndicator(snapshotExtra.productIndicator)
    ) {
      setAIValue('reportExtraInfo.productIndicator', parsed.productIndicator);
    }

    const snapshotStageEmissions = snapshot.stageEmissions || {};
    const aiStageEmissions = parsed.stageEmissions;

    if (!aiStageEmissions) return;

    Object.keys(aiStageEmissions).forEach(stage => {
      if (stage === 'stages') return;
      const aiRows = aiStageEmissions[stage];
      if (!Array.isArray(aiRows)) return;
      const snapshotRows = snapshotStageEmissions[stage];

      aiRows
        .filter((aiRow: Record<string, any>) =>
          STAGE_EMISSION_KEYS.every(key => !isFieldEmpty(aiRow[key])),
        )
        .forEach((aiRow: Record<string, any>) => {
          const rowKey = `${stage}_${aiRow.thirdId}`;
          const snapshotIndex = Array.isArray(snapshotRows)
            ? snapshotRows.findIndex(
                (row: Record<string, any>) =>
                  `${row.thirdId}` === `${aiRow.thirdId}`,
              )
            : -1;

          if (snapshotIndex === -1) {
            const currentRows =
              form.current.values.stageEmissions?.[stage] || [];

            if (!addedStageRows.has(rowKey)) {
              addedStageRows.add(rowKey);
              setAIValue(
                `stageEmissions.${stage}.${currentRows.length}`,
                aiRow,
              );
              return;
            }

            const addedIndex = currentRows.findIndex(
              (row: Record<string, any>) =>
                `${row.thirdId}` === `${aiRow.thirdId}`,
            );
            if (addedIndex !== -1) {
              setAIValue(`stageEmissions.${stage}.${addedIndex}`, aiRow);
            }
            return;
          }

          const snapshotRow = snapshotRows[snapshotIndex];
          STAGE_EMISSION_KEYS.forEach(key => {
            if (aiRow[key] === undefined || !isFieldEmpty(snapshotRow[key]))
              return;
            setAIValue(
              `stageEmissions.${stage}.${snapshotIndex}.${key}`,
              aiRow[key],
            );
          });
        });
    });
  };

  const handleAIGenerate = () => {
    if (aiLoading) {
      abortCtrlRef.current?.abort();
      setAiLoading(false);
      return;
    }

    const { values } = form.current;
    const aiFillRequest = resolveAiFillRequest(values);
    if (!aiFillRequest) return;

    const abortCtrl = new AbortController();
    abortCtrlRef.current = abortCtrl;
    setAiLoading(true);

    const snapshot = JSON.parse(JSON.stringify(values));
    const addedStageRows = new Set<string>();
    const factoryUncertaintyRows = new Set<number>();
    let streamText = '';

    streamFetch({
      url: aiFillRequest.url,
      data: aiFillRequest.data,
      onMessage: (txt: unknown) => {
        const messageText = getStreamMessageText(txt);
        if (!messageText) return;

        streamText += messageText;
        const parsed = tryParseJSON(streamText);
        if (!parsed) return;

        const reportType = Number(snapshot.type);

        if (reportType === CARBON_LABEL) {
          fillCarbonLabelFields(parsed, snapshot, addedStageRows);
        } else if (reportType === REDUCTION) {
          fillReductionFields(parsed, snapshot);
          fillAIStringFields({
            parsed,
            snapshot,
            fields: AI_REDUCTION_STRING_FIELDS,
          });
        } else {
          fillAIStringFields({
            parsed,
            snapshot,
            fields: AI_COMMON_STRING_FIELDS,
          });

          if (reportType === REPORT) {
            fillReportFields(parsed, snapshot);
          }
        }

        fillQualityFactorFields(parsed, snapshot, factoryUncertaintyRows);
      },
      abortCtrl,
    })
      .catch(() => undefined)
      .finally(() => {
        setAiLoading(false);
      });
  };

  const renderAIGenerateButton = (
    visibleTypes: number[],
    style?: CSSProperties,
  ) => (
    <FormConsumer>
      {formIns => {
        const { type } = formIns.values;
        if (
          !visibleTypes.includes(Number(type)) ||
          !shouldShowAiGenerateButton(formIns.values)
        ) {
          return '';
        }

        return (
          <AIGenerateBtn
            loading={aiLoading}
            style={{ margin: '16px 0', ...style }}
            onClick={handleAIGenerate}
          />
        );
      }}
    </FormConsumer>
  );

  return { renderAIGenerateButton };
}
