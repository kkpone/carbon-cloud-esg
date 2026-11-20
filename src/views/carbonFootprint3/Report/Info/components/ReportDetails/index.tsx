import { Dispatch, ReactNode, SetStateAction, useState } from 'react';
import { Form } from '@formily/core';
import { FormConsumer } from '@formily/react';
import { Tabs, Button, Tooltip } from 'antd';
import {
  DownOutlined,
  InfoCircleOutlined,
  UpOutlined,
} from '@ant-design/icons';
import I18N from '@src/lang/I18N';
import { AnalysisIcon } from '@/views/carbonFootprint3/components/AnalysisIcon';
import { Report } from '@src/sdks_v2/footprint3V2ApiDocs';
import { REPORT_TYPE } from '../../../../constant';
import { ReportSchemaField as SchemaField } from '../../ReportSchemaField';
import {
  dataSchema,
  emissiondataSchema,
  reportMsgSchema,
  reductionLifeCycleSchema,
  reductionReportIntroSchema,
  reductionReportRestSchema,
} from '../../schemas';
import { ReportSensitivity, SensitivityProduct } from '../ReportSensitivity';
import { SensitivityConfigs } from '@/views/carbonFootprint3/components/SensitivityTable/types';
import styles from './index.module.less';
import { MonteCarloAnalysis } from '../MonteCarloAnalysis';
import { MonteCarloScope } from '../MonteCarloAnalysis/types';

const { REPORT, COMPARE, CARBON_LABEL, REDUCTION } = REPORT_TYPE;

interface Props {
  analysisScope?: MonteCarloScope;
  reportId?: number;
  analysisTab: string;
  setAnalysisTab: (tab: string) => void;
  renderAIGenerateButton: (types: number[]) => ReactNode;
  getAnalysisProducts: (form: Form<Report>) => SensitivityProduct[];
  sensitivityConfigs: SensitivityConfigs;
  setSensitivityConfigs: Dispatch<SetStateAction<SensitivityConfigs>>;
  readPretty: boolean;
  setModalShow: (kind: 'activity' | 'factor') => void;
}

export function ReportDetails({
  analysisScope,
  reportId,
  analysisTab,
  setAnalysisTab,
  renderAIGenerateButton,
  getAnalysisProducts,
  sensitivityConfigs,
  setSensitivityConfigs,
  readPretty,
  setModalShow,
}: Props) {
  const [lifeCycleExpanded, setLifeCycleExpanded] = useState(true);
  return (
    <FormConsumer>
      {form => {
        const { type } = form.values;

        if (type === CARBON_LABEL) {
          return '';
        }

        if (type === REDUCTION) {
          return (
            <div className={styles.card}>
              <h4 className={styles.title}>
                {I18N.carbonFootprint3.reportInformation}
              </h4>
              {renderAIGenerateButton([REDUCTION])}
              <SchemaField schema={reductionReportIntroSchema()} />
              <div className={styles.lifeCycleHeaderGrid}>
                <div className={styles.lifeCycleHeader}>
                  <div className={styles.lifeCycleTitle}>
                    {I18N.carbonFootprint3.lifeCycleInformation}
                    <Tooltip
                      title={I18N.carbonFootprint3.lifeCycleInformationTip}
                    >
                      <InfoCircleOutlined className={styles.lifeCycleTipIcon} />
                    </Tooltip>
                  </div>
                  <Button
                    type='link'
                    className={styles.lifeCycleToggle}
                    onClick={() => setLifeCycleExpanded(pre => !pre)}
                  >
                    {lifeCycleExpanded
                      ? I18N.carbonFootprint.putItAway
                      : I18N.carbonFootprint.launch}
                    {lifeCycleExpanded ? <UpOutlined /> : <DownOutlined />}
                  </Button>
                </div>
                <div />
              </div>
              {lifeCycleExpanded && (
                <SchemaField schema={reductionLifeCycleSchema()} />
              )}
              <SchemaField schema={reductionReportRestSchema()} />
            </div>
          );
        }

        return (
          <section className={styles.analysisCard}>
            <Tabs
              activeKey={analysisTab}
              onChange={setAnalysisTab}
              items={[
                {
                  key: 'info',
                  label: I18N.carbonFootprint3.analysisReportInfo,
                },
                {
                  key: 'sensitivity',
                  label: I18N.carbonFootprint3.sensitivityTitle,
                },
                {
                  key: 'evaluation',
                  label: I18N.carbonFootprint3.analysisResultEvaluation,
                },
              ]}
            />
            <div
              style={{
                display: analysisTab === 'info' ? undefined : 'none',
              }}
              className={`${styles.card} ${styles.reportInfo}`}
            >
              <h4 className={styles.title}>
                {I18N.carbonFootprint3.reportInformation}
              </h4>
              {renderAIGenerateButton([REPORT, COMPARE])}
              <SchemaField schema={reportMsgSchema()} />
            </div>
            {analysisTab === 'sensitivity' && (
              <ReportSensitivity
                reportId={reportId}
                products={getAnalysisProducts(form)}
                configs={sensitivityConfigs}
                onChange={setSensitivityConfigs}
                readOnly={readPretty}
              />
            )}
            <div
              style={{
                display: analysisTab === 'evaluation' ? undefined : 'none',
              }}
              className={`${styles.card} ${styles.evaluation}`}
            >
              <FormConsumer>
                {nowFow => {
                  const { type } = nowFow.values;
                  return (
                    <h4 className={styles.title}>
                      {type === COMPARE
                        ? `${I18N.carbonFootprint3.target} `
                        : ''}
                      {I18N.carbonFootprint3.productDataQuality}
                    </h4>
                  );
                }}
              </FormConsumer>

              <div className={styles.activityData}>
                <span>
                  {type === REPORT && (
                    <span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>
                  )}
                  {I18N.carbonFootprint3.activityData}
                </span>
                <span
                  className={styles.textPrimary}
                  onClick={() => {
                    setModalShow('activity');
                  }}
                >
                  {I18N.carbonFootprint3.activityDataQuality}
                  <AnalysisIcon name='quality' />
                </span>
              </div>
              <SchemaField schema={dataSchema()} />
              <div className={styles.emissions}>
                <span>
                  {type === REPORT && (
                    <span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>
                  )}
                  {I18N.carbonFootprint.emissionFactors}
                </span>
                <span
                  className={styles.textPrimary}
                  onClick={() => {
                    setModalShow('factor');
                  }}
                >
                  {I18N.carbonFootprint3.numberOfEmissionFactors2}
                  <AnalysisIcon name='quality' />
                </span>
              </div>
              <SchemaField schema={emissiondataSchema()} />
              <MonteCarloAnalysis
                scope={analysisScope}
                form={form}
                products={getAnalysisProducts(form)}
                readOnly={readPretty}
              />
            </div>
          </section>
        );
      }}
    </FormConsumer>
  );
}
