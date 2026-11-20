import { useState } from 'react';
import { Button, Modal, InputNumber, Select, Space, Switch } from 'antd';
import I18N from '@src/lang/I18N';
import {
  MonteCarloDistribution,
  MonteCarloScope,
  MonteCarloParameter,
  MonteCarloQualityRow,
} from '../../types';
import { ParameterConfig } from '../ParameterConfig';
import styles from './index.module.less';
import { AnalysisIcon } from '@/views/carbonFootprint3/components/AnalysisIcon';

interface Props {
  parameter: MonteCarloParameter;
  scope: MonteCarloScope;
  factorQuality?: MonteCarloQualityRow;
  selectedCount: number;
  distributions: { value: MonteCarloDistribution; label: string }[];
  onCancel: () => void;
  onApply: (patch: Partial<MonteCarloParameter>) => void;
}

export function BulkEdit({
  parameter,
  scope,
  factorQuality,
  selectedCount,
  distributions,
  onCancel,
  onApply,
}: Props) {
  const [distributionEnabled, setDistributionEnabled] = useState(false);
  const [uncertaintyEnabled, setUncertaintyEnabled] = useState(false);
  const [distribution, setDistribution] = useState(parameter.distribution);
  const [uncertainty, setUncertainty] = useState(parameter.uncertainty);
  const [configured, setConfigured] = useState<MonteCarloParameter>();
  const [showConfig, setShowConfig] = useState(false);
  const valid =
    (distributionEnabled || uncertaintyEnabled) &&
    (!distributionEnabled || Boolean(distribution)) &&
    (!uncertaintyEnabled ||
      (uncertainty != null &&
        uncertainty !== '' &&
        Number.isFinite(Number(uncertainty)) &&
        Number(uncertainty) >= 0));

  const apply = () => {
    const patch: Partial<MonteCarloParameter> = {};
    if (distributionEnabled) {
      patch.distribution = distribution;
      patch.uncertaintySource = 'MANUAL';
    }
    if (uncertaintyEnabled) {
      patch.uncertainty = uncertainty;
      patch.uncertaintySource = distributionEnabled
        ? 'MANUAL'
        : configured?.uncertaintySource || 'MANUAL';
      if (configured && !distributionEnabled) patch.note = configured.note;
      patch.configuration = configured?.configuration;
    }
    onApply(patch);
  };

  return (
    <>
      <Modal
        open
        centered
        className={styles.modal}
        closeIcon={<AnalysisIcon name='close' />}
        title={I18N.carbonFootprint3.mcBulkEditTitle}
        onCancel={onCancel}
        width={480}
        onOk={apply}
        okText={I18N.carbonFootprint.confirm}
        okButtonProps={{ disabled: !valid }}
      >
        <p>
          {parameter.dataType === 'activity'
            ? I18N.carbonFootprint3.mcActivityData
            : I18N.carbonFootprint3.mcFactorData}
          :{' '}
          {I18N.template(I18N.carbonFootprint3.mcSelectedCount, {
            count: selectedCount,
          })}
        </p>
        <p className={styles.hint}>
          <AnalysisIcon name='info' />
          {I18N.carbonFootprint3.mcBulkHint}
        </p>
        <div
          className={distributionEnabled ? styles.enabledField : styles.field}
        >
          <div className={styles.fieldHeader}>
            <div>
              <strong>{I18N.carbonFootprint3.mcDistribution}</strong>
              <p>
                {distributionEnabled
                  ? I18N.template(I18N.carbonFootprint3.mcSelectedCount, {
                      count: selectedCount,
                    })
                  : I18N.carbonFootprint3.mcBulkKeepOriginal}
              </p>
            </div>
            <Space>
              <span>{I18N.carbonFootprint3.mcBulkModifyField}</span>
              <Switch
                checked={distributionEnabled}
                onChange={setDistributionEnabled}
              />
            </Space>
          </div>
          {distributionEnabled && (
            <div className={styles.fieldBody}>
              <p>{I18N.carbonFootprint3.mcBulkUniformValue}</p>
              <Select
                title=''
                value={distribution}
                onChange={setDistribution}
                options={distributions}
              />
            </div>
          )}
        </div>
        <div
          className={uncertaintyEnabled ? styles.enabledField : styles.field}
        >
          <div className={styles.fieldHeader}>
            <div>
              <strong>{I18N.carbonFootprint3.mcUncertainty}</strong>
              <p>
                {uncertaintyEnabled
                  ? I18N.template(I18N.carbonFootprint3.mcSelectedCount, {
                      count: selectedCount,
                    })
                  : I18N.carbonFootprint3.mcBulkKeepOriginal}
              </p>
            </div>
            <Space>
              <span>{I18N.carbonFootprint3.mcBulkModifyField}</span>
              <Switch
                checked={uncertaintyEnabled}
                onChange={setUncertaintyEnabled}
              />
            </Space>
          </div>
          {uncertaintyEnabled && (
            <div className={styles.fieldBody}>
              <div className={styles.valueLabel}>
                <span>{I18N.carbonFootprint3.mcBulkUniformValue}</span>
                <Button
                  type='link'
                  icon={<AnalysisIcon name='configure' />}
                  onClick={() => setShowConfig(true)}
                >
                  {I18N.carbonFootprint3.mcConfigure}
                </Button>
              </div>
              <InputNumber<string | number>
                stringMode
                min={0}
                precision={4}
                maxLength={10}
                value={uncertainty}
                addonAfter='%'
                onChange={value => {
                  setUncertainty(value);
                  setConfigured(undefined);
                }}
              />
            </div>
          )}
        </div>
      </Modal>
      {showConfig && (
        <ParameterConfig
          parameter={{ ...parameter, ...configured, mean: 0, uncertainty }}
          scope={scope}
          factorQuality={factorQuality}
          bulk
          onCancel={() => setShowConfig(false)}
          onApply={value => {
            setUncertainty(value.uncertainty);
            setConfigured(value);
            setShowConfig(false);
          }}
        />
      )}
    </>
  );
}
