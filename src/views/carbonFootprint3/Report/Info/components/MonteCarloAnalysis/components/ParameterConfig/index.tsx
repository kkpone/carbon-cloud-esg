import { renderSelectOption } from '../../../ReportSelect';
import { AnalysisText } from '@/views/carbonFootprint3/components/AnalysisText';
import { useEffect, useState } from 'react';
import { Descriptions, Form, Modal, Select, Spin, Tabs } from 'antd';
import I18N from '@src/lang/I18N';
import { previewMonteCarloParameter } from '../../service';
import { defaultParameterNote } from '../../parameterNotes';
import {
  MonteCarloOrigin,
  MonteCarloScope,
  MonteCarloParameter,
  MonteCarloQualityRow,
  MonteCarloPreview,
  MonteCarloUncertaintyConfig,
} from '../../types';
import styles from './index.module.less';
import { AnalysisIcon } from '@/views/carbonFootprint3/components/AnalysisIcon';

interface Props {
  parameter: MonteCarloParameter;
  scope: MonteCarloScope;
  factorQuality?: MonteCarloQualityRow;
  bulk?: boolean;
  onCancel: () => void;
  onApply: (parameter: MonteCarloParameter) => void;
}

const scoreFields = [
  'times',
  'region',
  'technology',
  'datas',
  'methodology',
] as const;

export function ParameterConfig({
  parameter,
  scope,
  factorQuality,
  bulk,
  onCancel,
  onApply,
}: Props) {
  const [form] = Form.useForm<MonteCarloUncertaintyConfig>();
  const [origin, setOrigin] = useState<MonteCarloOrigin>(
    parameter.uncertaintySource === 'DATA_QUALITY' ? 'DATA_QUALITY' : 'DEFAULT',
  );
  const options = scope;
  const [preview, setPreview] = useState<MonteCarloPreview>();
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const reference = Form.useWatch('reference', form);
  const values = Form.useWatch([], form);
  const serialized = JSON.stringify(values || {});

  useEffect(() => {
    const saved = parameter.configuration || {};
    const inherited: Partial<MonteCarloUncertaintyConfig> = {};
    if (parameter.dataType === 'factor' && factorQuality) {
      scoreFields.forEach(key => {
        const value = factorQuality[key];
        if (value !== undefined && value !== null && value !== '')
          inherited[key] = Number(value);
      });
    }
    form.setFieldsValue({
      reference: scope.monteCarlo.references[0]?.code,
      ...inherited,
      ...saved,
    });
  }, [form, scope]);

  useEffect(() => {
    let cancelled = false;
    const config = JSON.parse(serialized) as MonteCarloUncertaintyConfig;
    const ready =
      origin === 'DEFAULT'
        ? Boolean(config.reference && config.category)
        : scoreFields.every(field => config[field] != null);
    setPreview(undefined);
    if (!ready) return;
    const timeout = setTimeout(() => {
      setLoading(true);
      previewMonteCarloParameter({
        ...parameter,
        mean: parameter.mean ?? 0,
        uncertaintySource: origin,
        configuration: config,
      })
        .then(result => {
          if (!cancelled) setPreview(result);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      setLoading(false);
    };
  }, [serialized, origin]);

  const categoryOptions = scope.monteCarlo.categories
    .filter(row => row.reference === reference)
    .map(row => ({ value: row.code, label: row.name }));
  const qualityFields = [
    {
      name: 'times',
      label: I18N.carbonFootprint3.mcTime,
      options: options?.timeType,
    },
    {
      name: 'region',
      label: I18N.carbonFootprint3.mcRegion,
      options: options?.regionType,
    },
    {
      name: 'technology',
      label: I18N.carbonFootprint3.mcTechnology,
      options: options?.technologyType,
    },
    {
      name: 'datas',
      label: I18N.carbonFootprint3.mcAccuracy,
      options: options?.dataType,
    },
    {
      name: 'methodology',
      label: I18N.carbonFootprint3.mcCompleteness,
      options: scope.monteCarlo.completeness,
    },
  ];

  const apply = async () => {
    await form.validateFields(
      origin === 'DEFAULT' ? ['reference', 'category'] : [...scoreFields],
    );
    if (!preview) return;
    setApplying(true);
    try {
      const applied = {
        ...parameter,
        uncertainty: preview.uncertainty,
        standardDeviation: parameter.valueHidden
          ? null
          : preview.standardDeviation,
        uncertaintySource: origin,
        configuration: form.getFieldsValue(),
      };
      onApply({
        ...applied,
        note: defaultParameterNote(applied, scope.monteCarlo),
      });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Modal
      open
      centered
      width={728}
      className={styles.modal}
      closeIcon={<AnalysisIcon name='close' />}
      title={I18N.carbonFootprint3.mcConfigureUncertainty}
      onCancel={onCancel}
      onOk={() => {
        apply().catch(() => {});
      }}
      okText={I18N.carbonFootprint.confirm}
      confirmLoading={applying}
      okButtonProps={{ disabled: !preview || loading }}
    >
      {!bulk && (
        <p className={styles.description}>
          {parameter.sourceName} ·{' '}
          {parameter.dataType === 'activity'
            ? I18N.carbonFootprint3.mcActivityData
            : I18N.common.fields.emissionFactor}
        </p>
      )}
      <Form form={form} layout='vertical' className={styles.form}>
        <Tabs
          activeKey={origin}
          onChange={key => setOrigin(key as MonteCarloOrigin)}
          items={[
            {
              key: 'DEFAULT',
              label: I18N.carbonFootprint3.mcDefaultConfig,
              children: (
                <div className={styles.defaultFields}>
                  <Form.Item
                    name='reference'
                    label={I18N.carbonFootprint3.mcReference}
                    rules={[{ required: true }]}
                  >
                    <Select
                      title=''
                      optionRender={renderSelectOption}
                      onChange={() => form.setFieldValue('category', undefined)}
                      options={scope.monteCarlo.references.map(row => ({
                        value: row.code,
                        label: row.name,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    name='category'
                    label={I18N.carbonFootprint3.mcCategory}
                    rules={[{ required: true }]}
                  >
                    <Select
                      title=''
                      optionRender={renderSelectOption}
                      options={categoryOptions}
                    />
                  </Form.Item>
                </div>
              ),
            },
            {
              key: 'DATA_QUALITY',
              label: I18N.carbonFootprint3.mcQualityConfig,
              children: (
                <div className={styles.qualityFields}>
                  {qualityFields.map(field => (
                    <Form.Item
                      key={field.name}
                      name={field.name}
                      label={field.label}
                      rules={[{ required: true }]}
                    >
                      <Select
                        title=''
                        optionRender={renderSelectOption}
                        options={field.options?.map(option => ({
                          value: option.code,
                          label: option.name,
                        }))}
                      />
                    </Form.Item>
                  ))}
                </div>
              ),
            },
          ]}
        />
        <Spin spinning={loading}>
          <Descriptions
            className={styles.preview}
            column={3}
            size='small'
            colon={false}
          >
            {!bulk && (
              <Descriptions.Item
                label={
                  parameter.dataType === 'activity'
                    ? I18N.carbonFootprint3.mcActivityData
                    : I18N.carbonFootprint3.mcFactorData
                }
              >
                <AnalysisText
                  value={`${parameter.mean ?? '—'} ${parameter.unit}`}
                />
              </Descriptions.Item>
            )}
            <Descriptions.Item label={I18N.carbonFootprint3.mcUncertainty}>
              <AnalysisText value={`${preview?.uncertainty ?? '—'}%`} />
            </Descriptions.Item>
            {!bulk && (
              <Descriptions.Item
                label={I18N.carbonFootprint3.mcStandardDeviation}
              >
                <AnalysisText
                  value={`${
                    parameter.valueHidden
                      ? '—'
                      : preview?.standardDeviation ?? '—'
                  } ${!parameter.valueHidden ? parameter.unit : ''}`}
                />
              </Descriptions.Item>
            )}
          </Descriptions>
        </Spin>
      </Form>
    </Modal>
  );
}
