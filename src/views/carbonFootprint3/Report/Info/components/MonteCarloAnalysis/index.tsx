import { renderSelectOption } from '../ReportSelect';
import { useEffect, useRef, useState } from 'react';
import { observer } from '@formily/react';
import { Form } from '@formily/core';
import {
  Button,
  Empty,
  Input,
  InputNumber,
  Menu,
  Progress,
  Radio,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tooltip,
} from 'antd';
import { ColumnsType } from 'antd/es/table';
import I18N from '@src/lang/I18N';
import { Report } from '@src/sdks_v2/footprint3V2ApiDocs';
import { SensitivityProduct } from '../ReportSensitivity';
import { useMonteCarlo } from './hooks/useMonteCarlo';
import {
  MonteCarloDistribution,
  MonteCarloParameter,
  MonteCarloStates,
  MonteCarloScope,
} from './types';
import { getMonteCarloParameters, previewMonteCarloParameter } from './service';
import { ParameterConfig } from './components/ParameterConfig';
import { BulkEdit } from './components/BulkEdit';
import { SimulationResults } from './components/SimulationResults';
import styles from './index.module.less';
import { ALL_EMISSION_LABEL } from '@/views/carbonFootprint3/constant';
import { DescriptionModal } from './components/DescriptionModal';
import { parameterReady } from './validation';
import { AnalysisText } from '@/views/carbonFootprint3/components/AnalysisText';
import { AnalysisIcon } from '@/views/carbonFootprint3/components/AnalysisIcon';
import { useMonteCarloAIDefaults } from './hooks/useMonteCarloAIDefaults';
import { AIDefaultButton } from './components/AIDefaultButton';

interface Props {
  scope?: MonteCarloScope;
  form: Form<Report>;
  products: SensitivityProduct[];
  readOnly: boolean;
}

export const MonteCarloAnalysis = observer(
  ({ scope, form, products, readOnly }: Props) => {
    const [selectedProduct, setSelectedProduct] = useState<number>();
    const accountId = products.some(
      product => product.accountId === selectedProduct,
    )
      ? selectedProduct
      : products[0]?.accountId;
    const [kind, setKind] = useState<'activity' | 'factor'>('activity');
    const [search, setSearch] = useState('');
    const [stage, setStage] = useState<number>();
    const [distributionFilter, setDistributionFilter] =
      useState<MonteCarloDistribution>();
    const [descriptionOpen, setDescriptionOpen] = useState(false);
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [configuring, setConfiguring] = useState<string>();
    const [bulk, setBulk] = useState(false);
    const generation = useRef(0);
    useEffect(
      () => () => {
        generation.current++;
      },
      [form.values.id, form.values.type, form.values.accountType],
    );
    const enabled = form.values.uncertaintyMethod === 'MONTE_CARLO';
    const { state, loading, changeConfig, changeDescription, calculate } =
      useMonteCarlo(form, accountId, readOnly, enabled, scope?.monteCarlo);
    const aiDefaults = useMonteCarloAIDefaults(
      form,
      accountId,
      enabled,
      readOnly,
      changeConfig,
      scope?.monteCarlo,
    );
    const distributions = (scope?.monteCarlo?.distributions || []).map(row => ({
      value: row.code,
      label: row.name,
    }));
    const stages = [
      I18N.carbonFootprint3.mcStageMaterial,
      I18N.carbonFootprint3.mcStageProduction,
      I18N.carbonFootprint3.mcStageDistribution,
      I18N.carbonFootprint3.mcStageUse,
      I18N.carbonFootprint3.mcStageWaste,
    ];

    useEffect(() => {
      setSelectedKeys([]);
      setConfiguring(undefined);
      setBulk(false);
    }, [accountId, kind]);

    const rows = state.config.parameters;
    const visibleRows = rows.filter(
      row =>
        row.dataType === kind &&
        (stage === undefined || row.stage === stage) &&
        (!distributionFilter || row.distribution === distributionFilter) &&
        row.sourceName.includes(search),
    );
    const selected = rows.filter(
      row => row.dataType === kind && selectedKeys.includes(row.id),
    );
    const currentParameter = rows.find(row => row.id === configuring);
    const activeCount = rows.filter(row => row.dataType === 'activity');
    const factorCount = rows.filter(row => row.dataType === 'factor');
    const editable = !readOnly;

    const changeParameter = (
      id: string,
      patch: Partial<MonteCarloParameter>,
      manual = true,
    ) => {
      const original = rows.find(row => row.id === id);
      if (original) aiDefaults.markEdited(original, patch);
      const affectsCalculation = (
        ['mean', 'uncertainty', 'distribution'] as const
      ).some(
        key =>
          patch[key] !== undefined &&
          String(patch[key]) !== String(original?.[key]),
      );
      changeConfig(
        {
          ...state.config,
          parameters: rows.map(row =>
            row.id === id
              ? {
                  ...row,
                  ...patch,
                  ...(manual ? { uncertaintySource: 'MANUAL' as const } : {}),
                }
              : row,
          ),
        },
        affectsCalculation,
      );
    };

    const preview = async (row: MonteCarloParameter) => {
      if (row.mean === null || row.uncertainty === null || row.valueHidden)
        return;
      const version = generation.current;
      const key = JSON.stringify([row.mean, row.uncertainty]);
      try {
        const result = await previewMonteCarloParameter({
          ...row,
          uncertaintySource: 'MANUAL',
        });
        if (version !== generation.current) return;
        const latest = (
          form.getValuesIn('monteCarloByAccount') as
            | MonteCarloStates
            | undefined
        )?.[accountId || 0];
        if (!latest) return;
        const match = latest.config.parameters.find(item => item.id === row.id);
        if (!match || JSON.stringify([match.mean, match.uncertainty]) !== key)
          return;
        // 防止建议接口的迟到响应覆盖用户刚修改的其他字段。
        changeConfig(
          {
            ...latest.config,
            parameters: latest.config.parameters.map(item =>
              item.id === row.id
                ? { ...item, standardDeviation: result.standardDeviation }
                : item,
            ),
          },
          false,
        );
      } catch {
        /* 请求层统一提示。 */
      }
    };

    const columns: ColumnsType<MonteCarloParameter> = [
      {
        title: I18N.carbonFootprint3.mcSourceName,
        dataIndex: 'sourceName',
        render: (value: string) => <AnalysisText value={value} />,
        width: 200,
        fixed: 'left',
      },
      {
        title: I18N.carbonFootprint3.sensitivitySourceType,
        dataIndex: 'sourceType',
        width: 140,
        render: (value: number) =>
          (value === 0
            ? I18N.carbonFootprint3.unitProcess
            : (ALL_EMISSION_LABEL() as Record<number, string>)[value]) ??
          String(value),
      },
      {
        title: I18N.carbonFootprint3.mcStage,
        dataIndex: 'stage',
        width: 160,
        render: value => stages[value],
      },
      {
        title: I18N.carbonFootprint3.mcDistribution,
        width: 160,
        render: (_, row) => (
          <Select
            title=''
            optionRender={renderSelectOption}
            className={styles.fullWidth}
            disabled={!editable}
            value={row.distribution}
            options={distributions}
            onChange={value => changeParameter(row.id, { distribution: value })}
          />
        ),
      },
      {
        title: (
          <Space size={8} className={styles.columnTitle}>
            {kind === 'activity'
              ? I18N.carbonFootprint3.mcActivityData
              : I18N.carbonFootprint3.mcFactorData}
            <Tooltip
              title={
                kind === 'activity'
                  ? I18N.carbonFootprint3.mcMeanActivityHint
                  : I18N.carbonFootprint3.mcMeanFactorHint
              }
            >
              <span className={styles.helpIcon}>
                <AnalysisIcon name='info' />
              </span>
            </Tooltip>
          </Space>
        ),
        width: 360,
        render: (_, row) => (
          <div className={styles.meanCell}>
            <InputNumber<string | number>
              addonAfter={row.unit}
              className={styles.fullWidth}
              stringMode
              disabled={!editable || row.valueHidden}
              value={row.mean}
              maxLength={20}
              controls={false}
              min={row.dataType === 'activity' ? 0 : undefined}
              onChange={value =>
                changeParameter(row.id, {
                  mean: value,
                  standardDeviation: null,
                })
              }
              onBlur={() => {
                preview(row);
              }}
            />
          </div>
        ),
      },
      {
        title: (
          <Space size={8} className={styles.columnTitle}>
            {I18N.carbonFootprint3.mcUncertainty}
            <Tooltip
              title={
                kind === 'activity'
                  ? I18N.carbonFootprint3.mcMeanActivityHint
                  : I18N.carbonFootprint3.mcMeanFactorHint
              }
            >
              <span className={styles.helpIcon}>
                <AnalysisIcon name='info' />
              </span>
            </Tooltip>
          </Space>
        ),
        width: 340,
        render: (_, row) => (
          <div className={styles.uncertaintyCell}>
            <InputNumber<string | number>
              addonAfter='%'
              stringMode
              disabled={!editable}
              value={row.uncertainty}
              min={0}
              precision={4}
              maxLength={10}
              controls={false}
              onChange={value =>
                changeParameter(row.id, {
                  uncertainty: value,
                  standardDeviation: null,
                })
              }
              onBlur={() => {
                preview(row);
              }}
            />
            <div className={styles.deviation}>
              <span>{I18N.carbonFootprint3.mcStandardDeviation}</span>
              <div className={styles.deviationValue}>
                <AnalysisText
                  value={`${
                    row.standardDeviation == null ||
                    row.standardDeviation === ''
                      ? '—'
                      : Number(row.standardDeviation).toFixed(4)
                  } ${row.unit}`}
                />
              </div>
            </div>
          </div>
        ),
      },
      {
        title: I18N.carbonFootprint3.mcOrigin,
        width: 170,
        render: (_, row) => {
          const labels = {
            MANUAL: I18N.carbonFootprint3.mcManual,
            DEFAULT: I18N.carbonFootprint3.mcDefaultOrigin,
            DATA_QUALITY: I18N.carbonFootprint3.mcQualityOrigin,
          };
          return (
            <Space size={4}>
              <span
                className={
                  row.uncertaintySource === 'DATA_QUALITY'
                    ? styles.qualityTag
                    : row.uncertaintySource === 'MANUAL'
                    ? styles.manualTag
                    : styles.defaultTag
                }
              >
                {row.uncertaintySource ? labels[row.uncertaintySource] : '—'}
              </span>
              {editable && (
                <Button
                  type='text'
                  size='small'
                  aria-label={I18N.carbonFootprint3.mcConfigure}
                  icon={<AnalysisIcon name='configure' />}
                  onClick={() => setConfiguring(row.id)}
                />
              )}
            </Space>
          );
        },
      },
      {
        title: I18N.carbonFootprint3.mcNote,
        width: 280,
        render: (_, row) => (
          <Input.TextArea
            autoSize={{ minRows: 2, maxRows: 2 }}
            disabled={!editable}
            value={row.note}
            maxLength={200}
            onChange={event =>
              changeParameter(row.id, { note: event.target.value }, false)
            }
          />
        ),
      },
    ];

    return (
      <section className={styles.section}>
        <Space className={styles.heading} size={16}>
          <h4>{I18N.carbonFootprint3.mcTitle}</h4>
          <Switch
            disabled={readOnly}
            checked={enabled}
            onChange={value => {
              form.setValuesIn(
                'uncertaintyMethod',
                value ? 'MONTE_CARLO' : 'TAYLOR',
              );
            }}
          />
        </Space>
        <p className={styles.moduleHint}>
          {I18N.carbonFootprint3.mcModuleHint}
        </p>
        {enabled &&
          (!products.length ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <div className={styles.layout}>
              <Menu
                mode='horizontal'
                className={styles.products}
                selectedKeys={accountId ? [String(accountId)] : []}
                onClick={({ key }) => setSelectedProduct(Number(key))}
                items={products.map(product => ({
                  key: String(product.accountId),
                  label: (
                    <AnalysisText
                      value={product.functionalName || product.name}
                    />
                  ),
                }))}
              />
              <Spin spinning={loading} wrapperClassName={styles.content}>
                <div className={styles.summaryToolbar}>
                  <Space size={20} wrap>
                    <span>
                      {I18N.carbonFootprint3.mcActivityCompleted}{' '}
                      {activeCount.filter(parameterReady).length}/
                      {activeCount.length}
                    </span>
                    <span>
                      {I18N.carbonFootprint3.mcFactorCompleted}{' '}
                      {factorCount.filter(parameterReady).length}/
                      {factorCount.length}
                    </span>
                  </Space>
                  <Space size={16} wrap>
                    <span>{I18N.carbonFootprint3.mcIterations}</span>
                    <InputNumber
                      disabled={readOnly}
                      min={1}
                      max={99999}
                      precision={0}
                      value={state.config.iterations}
                      onChange={value =>
                        changeConfig({ ...state.config, iterations: value })
                      }
                    />
                    {!readOnly && (
                      <div className={styles.calculate}>
                        <Tooltip
                          title={
                            rows.every(parameterReady) &&
                            state.config.iterations
                              ? undefined
                              : I18N.carbonFootprint3.mcCompleteParameters
                          }
                        >
                          <Button
                            type='primary'
                            icon={<AnalysisIcon name='calculate' />}
                            loading={state.running}
                            disabled={
                              state.running ||
                              loading ||
                              !rows.length ||
                              !rows.every(parameterReady) ||
                              !state.config.iterations
                            }
                            onClick={() => {
                              calculate();
                            }}
                          >
                            {I18N.carbonFootprint3.mcCalculate}
                          </Button>
                        </Tooltip>
                        {state.running && (
                          <Progress
                            percent={state.progress || 0}
                            status='active'
                          />
                        )}
                      </div>
                    )}
                  </Space>
                </div>
                <SimulationResults state={state} />
                <h4 className={styles.detailsTitle}>
                  {I18N.carbonFootprint3.mcParameterDetails}
                </h4>
                <div className={styles.detailHeading}>
                  <Radio.Group
                    value={kind}
                    onChange={event => setKind(event.target.value)}
                    options={[
                      {
                        value: 'activity',
                        label: I18N.carbonFootprint3.mcActivityData,
                      },
                      {
                        value: 'factor',
                        label: I18N.carbonFootprint3.mcFactorData,
                      },
                    ]}
                    optionType='button'
                    className={styles.kindTabs}
                  />
                  <Button
                    icon={<AnalysisIcon name='description' />}
                    onClick={() => setDescriptionOpen(true)}
                  >
                    {I18N.carbonFootprint3.mcDescription}
                  </Button>
                </div>
                <div className={styles.toolbar}>
                  <Space wrap size={16}>
                    <Input
                      allowClear
                      suffix={<AnalysisIcon name='search' />}
                      className={styles.search}
                      value={search}
                      maxLength={20}
                      placeholder={I18N.carbonFootprint3.mcSourceName}
                      onChange={event => setSearch(event.target.value)}
                    />
                    <Select
                      title=''
                      optionRender={renderSelectOption}
                      allowClear
                      className={styles.stage}
                      value={stage}
                      placeholder={I18N.carbonFootprint3.mcStage}
                      onChange={setStage}
                      options={stages.map((label, value) => ({ label, value }))}
                    />
                    <Select
                      title=''
                      optionRender={renderSelectOption}
                      allowClear
                      className={styles.stage}
                      value={distributionFilter}
                      placeholder={I18N.carbonFootprint3.mcDistribution}
                      options={distributions}
                      onChange={setDistributionFilter}
                    />
                  </Space>
                  {!readOnly && (
                    <Space size={16} wrap>
                      <span>
                        {I18N.template(I18N.carbonFootprint3.mcSelectedCount, {
                          count: selected.length,
                        })}
                      </span>
                      {!!selectedKeys.length && (
                        <Button type='link' onClick={() => setSelectedKeys([])}>
                          {I18N.carbonFootprint3.mcClearSelection}
                        </Button>
                      )}
                      <Button
                        disabled={!selected.length}
                        icon={<AnalysisIcon name='edit' />}
                        onClick={() => setBulk(true)}
                      >
                        {I18N.carbonFootprint3.mcBulkEdit}
                      </Button>
                      <AIDefaultButton
                        loading={aiDefaults.loading}
                        progress={aiDefaults.progress}
                        disabled={loading || !rows.length || aiDefaults.loading}
                        onClick={() => {
                          aiDefaults.fill();
                        }}
                      />
                    </Space>
                  )}
                </div>
                <Table
                  rowKey='id'
                  size='small'
                  className={styles.parameterTable}
                  dataSource={visibleRows}
                  columns={columns}
                  scroll={{ x: 1860 }}
                  tableLayout='fixed'
                  rowSelection={
                    readOnly
                      ? undefined
                      : {
                          columnWidth: 48,
                          selectedRowKeys: selectedKeys,
                          preserveSelectedRowKeys: true,
                          onChange: keys => setSelectedKeys(keys.map(String)),
                        }
                  }
                />
                {state.description && (
                  <p className={styles.description}>{state.description}</p>
                )}
              </Spin>
            </div>
          ))}
        {descriptionOpen && (
          <DescriptionModal
            key={accountId}
            name={
              products.find(product => product.accountId === accountId)?.name ||
              ''
            }
            value={state.description}
            readOnly={readOnly}
            onCancel={() => setDescriptionOpen(false)}
            onSave={value => {
              changeDescription(value);
              setDescriptionOpen(false);
            }}
          />
        )}
        {currentParameter && scope?.monteCarlo && (
          <ParameterConfig
            parameter={currentParameter}
            scope={scope}
            factorQuality={form.values.reportFactoryList?.find(
              row =>
                Number(row.dataType) ===
                (currentParameter.qualityCategory ?? currentParameter.stage),
            )}
            onCancel={() => setConfiguring(undefined)}
            onApply={parameter => {
              changeParameter(parameter.id, parameter, false);
              setConfiguring(undefined);
            }}
          />
        )}
        {bulk && selected[0] && scope?.monteCarlo && (
          <BulkEdit
            parameter={
              selected.every(
                row =>
                  JSON.stringify(row.configuration) ===
                  JSON.stringify(selected[0].configuration),
              )
                ? selected[0]
                : { ...selected[0], configuration: undefined }
            }
            selectedCount={selected.length}
            scope={scope}
            factorQuality={
              selected.every(
                row =>
                  (row.qualityCategory ?? row.stage) ===
                  (selected[0].qualityCategory ?? selected[0].stage),
              )
                ? form.values.reportFactoryList?.find(
                    row =>
                      Number(row.dataType) ===
                      (selected[0].qualityCategory ?? selected[0].stage),
                  )
                : undefined
            }
            distributions={distributions}
            onCancel={() => setBulk(false)}
            onApply={patch => {
              const selectedSet = new Set(selected.map(row => row.id));
              selected.forEach(row => aiDefaults.markEdited(row, patch));
              const config = {
                ...state.config,
                parameters: rows.map(row =>
                  selectedSet.has(row.id)
                    ? { ...row, ...patch, standardDeviation: null }
                    : row,
                ),
              };
              changeConfig(config);
              setBulk(false);
              if (!accountId) return;
              const version = generation.current;
              getMonteCarloParameters({
                accountId,
                reportId: form.values.id,
                config,
                reportActivityList: form.values.reportActivityList,
                reportFactoryList: form.values.reportFactoryList,
              })
                .then(({ parameters }) => {
                  if (version !== generation.current) return;
                  const latest = (
                    form.getValuesIn('monteCarloByAccount') as
                      | MonteCarloStates
                      | undefined
                  )?.[accountId];
                  if (!latest) return;
                  const refreshed = new Map(
                    parameters.map(row => [row.id, row]),
                  );
                  changeConfig(
                    {
                      ...latest.config,
                      parameters: latest.config.parameters.map(row => {
                        const result = refreshed.get(row.id);
                        return result &&
                          String(result.mean) === String(row.mean) &&
                          String(result.uncertainty) === String(row.uncertainty)
                          ? {
                              ...row,
                              standardDeviation: result.standardDeviation,
                            }
                          : row;
                      }),
                    },
                    false,
                  );
                })
                .catch(() => {
                  /* 请求层统一提示。 */
                });
            }}
          />
        )}
      </section>
    );
  },
);
