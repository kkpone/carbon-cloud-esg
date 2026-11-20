import Input from '@/components/CbamTranslation/Input';
import {
  CbamTranslationInputScope,
  useCbamTranslationValue,
  useCbamTranslationEnglish,
} from '@/components/CbamTranslation';
import { countRequiredTableFields } from '@/components/CbamRequiredGroupSummary';
import CbamFieldLabel from '@/components/CbamFieldLabel';
import { PlusOutlined } from '@ant-design/icons';
import I18N from '@src/lang/I18N';
import monitorEn from '@/lang/en-US/cbamMonitor';
import {
  Button,
  Drawer,
  Form,
  FormInstance,
  Select,
  Space,
  Table,
  TableColumnsType,
  Tooltip,
} from 'antd';
import { useMemo, useState } from 'react';

import {
  CbamDrawerClose,
  CbamDrawerTitle,
} from '@/components/CbamDrawerHeader';

import MonitoringFrequencyInput from './MonitoringFrequencyInput';
import FactorSourceInput from './FactorSourceInput';
import {
  monitorFormulaDetails,
  monitorFormulaText,
  monitoringFrequencyDisplayValue,
  synchronizeFactors,
} from '../fieldChanges';

import { BusinessEvidenceCard } from './BusinessEvidenceCard';
import { EvidenceSelectModal } from './EvidenceSelectModal';
import selectEvidenceIcon from '../assets/select-evidence.svg';
import { showMonitorDeleteConfirm } from '../deleteConfirm';
import styles from '../plan.module.less';
import {
  MonitorEvidence,
  MonitorEvidenceRelation,
  MonitorChildDeleteRequest,
  MonitorPlanPayload,
  ProcessItem,
  ProcessMonitorItem,
  FactorSamplingItem,
} from '../types';

const PROCESS_MONITOR_PART_CODE = 1;
const DIRECT_STATUS_WIDTH = 100;
const DIRECT_ACTION_WIDTH = 112;
const PROCESS_MONITOR_PATH: [
  'directEmission',
  'processMonitorJson',
  'methods',
] = ['directEmission', 'processMonitorJson', 'methods'];

const ghgTypeOptions = [
  { label: 'CO₂', value: 'CO₂' },
  { label: 'N₂O', value: 'N₂O' },
];

const formulaCode = (item: Partial<ProcessMonitorItem>) => {
  if (!item.sourceType || !item.monitorMethod) return undefined;
  if (item.monitorMethod === 'mass_balance') return 'FLOW_MASS_BALANCE';
  if (item.monitorMethod === 'measurement_cems') return 'MEASUREMENT_CEMS';
  if (item.sourceType === 'combustion') return 'FLOW_COMBUSTION';
  if (item.sourceType === 'process') return 'FLOW_PROCESS_EMISSION';
  return undefined;
};

const formulaText = monitorFormulaText;

const optionLabel = (
  options: { label: string; value: string }[],
  value?: string,
) => options.find(option => option.value === value)?.label || value || '--';

type ProcessMonitorRow = ProcessMonitorItem & { rowIndex: number };

export const ProcessMonitorSection = ({
  form,
  processes,
  sourceFlowOptions,
  onAddEvidence,
  onEditEvidence,
  onDeleteChild,
  onMethodsChange,
}: {
  form: FormInstance<MonitorPlanPayload>;
  /** 方法和自动带入因子写回后刷新页面完整度。 */
  onMethodsChange?: () => void;
  processes?: ProcessItem[];
  sourceFlowOptions: { label: string; labelEn?: string; value: string }[];
  onAddEvidence?: (
    itemKey: string,
    onCreated: (evidenceId: number) => void,
  ) => void;
  onEditEvidence?: (evidenceId: number) => void;
  onDeleteChild?: (
    request: Omit<MonitorChildDeleteRequest, 'dataVersion'>,
  ) => Promise<void>;
}) => {
  const watchedMethods = Form.useWatch<ProcessMonitorItem[]>(
    PROCESS_MONITOR_PATH,
    {
      form,
      preserve: true,
    },
  );
  const evidences =
    Form.useWatch<MonitorEvidence[]>('evidences', {
      form,
      preserve: true,
    }) || [];
  const watchedRelations = Form.useWatch<MonitorEvidenceRelation[]>(
    'evidenceRelations',
    {
      form,
      preserve: true,
    },
  );
  const methods = useMemo(() => watchedMethods || [], [watchedMethods]);
  const relations = useMemo(() => watchedRelations || [], [watchedRelations]);
  const [editor] = Form.useForm<ProcessMonitorItem>();
  const [editingIndex, setEditingIndex] = useState<number>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const editorEvidenceIds =
    Form.useWatch<number[]>('evidenceIds', editor) || [];

  const processOptions = useMemo(
    () =>
      (processes || []).flatMap(process => {
        const label = [process.processName, process.processNameEn]
          .map(value => value?.trim())
          .filter(Boolean)
          .join(' - ');
        return process.itemKey && label
          ? [{ label, value: process.itemKey }]
          : [];
      }),
    [processes],
  );
  const processNameMap = useMemo(
    () => new Map(processOptions.map(option => [option.value, option.label])),
    [processOptions],
  );
  const relatedEvidences = evidences.filter(
    evidence =>
      evidence.id !== undefined && editorEvidenceIds.includes(evidence.id),
  );
  const selectableEvidences = evidences.filter(
    evidence =>
      evidence.id !== undefined && !editorEvidenceIds.includes(evidence.id),
  );

  const openEditor = (rowIndex?: number) => {
    setEditingIndex(rowIndex);
    const current = rowIndex === undefined ? undefined : methods[rowIndex];
    const initial = current || {
      itemKey: `${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 10)}`,
      sortNo: methods.length + 1,
      ghgType: 'CO₂',
    };
    editor.setFieldsValue({
      ...initial,
      formulaCode: formulaCode(initial),
    });
    setDrawerOpen(true);
  };

  const closeEditor = () => {
    setDrawerOpen(false);
    setEditingIndex(undefined);
    editor.resetFields();
  };

  /** 自动带入仅由页面修改监测方法触发，回显和保存均保留因子列表原值。 */
  const updateMethods = (nextMethods: ProcessMonitorItem[]) => {
    form.setFieldValue(PROCESS_MONITOR_PATH, nextMethods);
    const path: ['directEmission', 'factorSamplingJson', 'factors'] = [
      'directEmission',
      'factorSamplingJson',
      'factors',
    ];
    const factors = (form.getFieldValue(path) || []) as FactorSamplingItem[];
    const nextFactors = synchronizeFactors(
      nextMethods,
      factors,
      () =>
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
      methods,
    );
    if (nextFactors !== factors) {
      form.setFieldValue(path, nextFactors);
      const factorKeys = new Set(nextFactors.map(item => item.itemKey));
      form.setFieldValue(
        'evidenceRelations',
        relations.filter(
          relation =>
            relation.partCode !== 2 || factorKeys.has(relation.itemKey),
        ),
      );
    }
    onMethodsChange?.();
  };

  const saveEditor = () => {
    const values = editor.getFieldsValue(true);
    const nextItem = { ...values, formulaCode: formulaCode(values) };
    const nextMethods =
      editingIndex === undefined
        ? [...methods, nextItem]
        : methods.map((method, index) =>
            index === editingIndex ? nextItem : method,
          );
    updateMethods(nextMethods);
    closeEditor();
  };

  const removeMethod = (rowIndex: number) => {
    const itemKey = methods[rowIndex]?.itemKey;
    showMonitorDeleteConfirm({
      title: I18N.cbamMonitor.confirmDeleteItem,
      content: I18N.cbamMonitor.deleteItemTip,
      onOk: async () => {
        if (itemKey)
          await onDeleteChild?.({ target: 'PROCESS_MONITOR', itemKey });
        updateMethods(methods.filter((_, index) => index !== rowIndex));
        form.setFieldValue(
          'evidenceRelations',
          (
            (form.getFieldValue('evidenceRelations') ||
              []) as MonitorEvidenceRelation[]
          ).filter(
            relation =>
              !(
                relation.partCode === PROCESS_MONITOR_PART_CODE &&
                relation.itemKey === itemKey
              ),
          ),
        );
      },
    });
  };

  const relateSelectedEvidence = (evidenceIds: number[]) => {
    const itemKey = editor.getFieldValue('itemKey');
    editor.setFieldValue(
      'evidenceIds',
      Array.from(new Set([...editorEvidenceIds, ...evidenceIds])),
    );
    form.setFieldValue('evidenceRelations', [
      ...relations,
      ...evidenceIds.map(evidenceId => ({
        evidenceId,
        partCode: PROCESS_MONITOR_PART_CODE,
        itemKey,
      })),
    ]);
    setEvidenceModalOpen(false);
  };

  const unlinkEvidence = (evidenceId?: number) => {
    if (evidenceId === undefined) return;
    const relation = relations.find(
      item =>
        item.evidenceId === evidenceId &&
        item.partCode === PROCESS_MONITOR_PART_CODE &&
        item.itemKey === editor.getFieldValue('itemKey'),
    );
    showMonitorDeleteConfirm({
      title: I18N.cbamMonitor.confirmDeleteItem,
      content: I18N.cbamMonitor.deleteItemTip,
      onOk: async () => {
        if (relation?.id) {
          await onDeleteChild?.({
            target: 'EVIDENCE_RELATION',
            relationId: relation.id,
          });
        }
        form.setFieldValue(
          'evidenceRelations',
          relations.filter(
            item =>
              !(
                item.evidenceId === evidenceId &&
                item.partCode === PROCESS_MONITOR_PART_CODE &&
                item.itemKey === editor.getFieldValue('itemKey')
              ),
          ),
        );
        const nextEvidenceIds = editorEvidenceIds.filter(
          id => id !== evidenceId,
        );
        editor.setFieldValue('evidenceIds', nextEvidenceIds);
        if (editingIndex !== undefined) {
          form.setFieldValue(
            [...PROCESS_MONITOR_PATH, editingIndex, 'evidenceIds'],
            nextEvidenceIds,
          );
        }
      },
    });
  };

  const monitorEnglish = useCbamTranslationEnglish('DATA_MONITOR_METHOD');
  const monitorEnums = monitorEnglish ? monitorEn : I18N.cbamMonitor;
  const sourceTypeOptions = [
    { label: monitorEnums.combustionFlow, value: 'combustion' },
    { label: monitorEnums.processFlow, value: 'process' },
  ];

  const monitorMethodOptions = [
    {
      label: monitorEnums.standardCalculation,
      value: 'standard_calculation',
    },
    { label: monitorEnums.massBalance, value: 'mass_balance' },
    { label: monitorEnums.measurementCems, value: 'measurement_cems' },
  ];
  const translateValue = useCbamTranslationValue();
  const rows = methods.map((method, rowIndex) => ({ ...method, rowIndex }));
  const columns: TableColumnsType<ProcessMonitorRow> = [
    {
      title: I18N.cbamMonitor.processName,
      dataIndex: 'processItemKey',
      width: 148,
      ellipsis: true,
      render: value => processNameMap.get(value) || '--',
    },
    {
      title: I18N.cbamMonitor.sourceFlow,
      dataIndex: 'sourceFlowName',
      render: (value, record) =>
        translateValue(
          `directEmission.processMonitorJson.methods.${record.rowIndex}.sourceFlowName`,
          value || '--',
        ),
      width: 140,
      ellipsis: true,
    },
    {
      title: I18N.cbamMonitor.emissionMechanism,
      dataIndex: 'sourceType',
      width: 110,
      render: value => optionLabel(sourceTypeOptions, value),
    },
    {
      title: I18N.cbamMonitor.ghgType,
      dataIndex: 'ghgType',
      width: 124,
      render: (value?: string) => value || '--',
    },
    {
      title: I18N.cbamMonitor.monitoringMethod,
      dataIndex: 'monitorMethod',
      width: 160,
      render: value => optionLabel(monitorMethodOptions, value),
    },
    {
      title: I18N.cbamMonitor.calculationFormula,
      dataIndex: 'formulaCode',
      width: 220,
      render: (value, record) => {
        const { formula, description } = monitorFormulaDetails(
          value || formulaCode(record),
        );
        return (
          <Tooltip title={description || undefined}>
            <span className={styles.directTableCellMultiline}>{formula}</span>
          </Tooltip>
        );
      },
    },
    {
      title: I18N.cbamMonitor.dataSource,
      dataIndex: 'dataSource',
      render: (value, record) =>
        translateValue(
          `directEmission.processMonitorJson.methods.${record.rowIndex}.dataSource`,
          value || '--',
        ),
      width: 140,
      ellipsis: true,
    },
    {
      title: I18N.cbamMonitor.monitoringFrequency,
      dataIndex: 'frequency',
      width: 110,
      render: (value, record) =>
        monitoringFrequencyDisplayValue(
          value,
          record.frequencyEn,
          monitorEnglish,
        ),
    },
    {
      title: I18N.cbamMonitor.measuringEquipment,
      dataIndex: 'equipment',
      render: (value, record) =>
        translateValue(
          `directEmission.processMonitorJson.methods.${record.rowIndex}.equipment`,
          value || '--',
        ),
      width: 140,
      ellipsis: true,
    },
    {
      title: I18N.cbamMonitor.equipmentLocation,
      dataIndex: 'location',
      render: (value, record) =>
        translateValue(
          `directEmission.processMonitorJson.methods.${record.rowIndex}.location`,
          value || '--',
        ),
      width: 140,
      ellipsis: true,
    },
    {
      title: (
        <CbamFieldLabel ellipsis hint={I18N.cbamMonitor.uncertaintyHint}>
          {I18N.cbamMonitor.uncertainty}
        </CbamFieldLabel>
      ),
      dataIndex: 'uncertainty',
      width: 140,
      ellipsis: true,
    },
    {
      title: I18N.cbamMonitor.calibrationMethod,
      dataIndex: 'calibration',
      render: (value, record) =>
        translateValue(
          `directEmission.processMonitorJson.methods.${record.rowIndex}.calibration`,
          value || '--',
        ),
      width: 180,
      ellipsis: true,
    },
    {
      title: I18N.cbamMonitor.missingDataMethod,
      dataIndex: 'missingDataMethod',
      render: (value, record) =>
        translateValue(
          `directEmission.processMonitorJson.methods.${record.rowIndex}.missingDataMethod`,
          value || '--',
        ),
      width: 220,
      ellipsis: true,
    },
    {
      title: I18N.cbamMonitor.evidenceStatus,
      key: 'evidenceStatus',
      fixed: 'right',
      width: DIRECT_STATUS_WIDTH,
      render: (_, record) => {
        const configured = Boolean(record.evidenceIds?.length);
        return (
          <span
            className={
              configured ? styles.configuredTag : styles.pendingConfigurationTag
            }
          >
            {configured
              ? I18N.cbamMonitor.configured
              : I18N.cbamMonitor.pendingConfiguration}
          </span>
        );
      },
    },
    {
      title: I18N.cbamMonitor.operation,
      key: 'operation',
      fixed: 'right',
      width: DIRECT_ACTION_WIDTH,
      render: (_, record) => (
        <div className={styles.directTableActions}>
          <Button
            className={styles.directEditButton}
            type='text'
            onClick={() => openEditor(record.rowIndex)}
          >
            {I18N.cbamMonitor.edit}
          </Button>
          <Button
            className={styles.directDeleteButton}
            type='text'
            danger
            onClick={() => removeMethod(record.rowIndex)}
          >
            {I18N.cbamMonitor.delete}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div
        className={styles.processMonitorTable}
        data-cbam-required-missing={countRequiredTableFields(
          methods,
          [
            'processItemKey',
            'sourceFlowName',
            'sourceType',
            'ghgType',
            'monitorMethod',
            'dataSource',
            'frequency',
            'equipment',
            'calibration',
          ],
          true,
        )}
      >
        <Table<ProcessMonitorRow>
          columns={columns}
          dataSource={rows}
          pagination={false}
          rowKey={record => record.itemKey || record.rowIndex}
          locale={{ emptyText: null }}
          scroll={{ x: 2184 }}
        />
      </div>
      <Button
        className={styles.goodsAddRowButton}
        icon={<PlusOutlined />}
        onClick={() => openEditor()}
      >
        {I18N.cbamMonitor.addMonitoringMethod}
      </Button>
      <Drawer
        closable={false}
        destroyOnClose
        open={drawerOpen}
        rootClassName={styles.processMonitorDrawer}
        title={
          <CbamDrawerTitle>
            {editingIndex === undefined
              ? I18N.cbamMonitor.addMonitoringMethod
              : I18N.cbamMonitor.editMonitoringMethod}
          </CbamDrawerTitle>
        }
        width={724}
        extra={<CbamDrawerClose onClick={closeEditor} />}
        footer={
          <div className={styles.drawerActions}>
            <Button onClick={closeEditor}>{I18N.cbamMonitor.cancel}</Button>
            <Button type='primary' onClick={saveEditor}>
              {I18N.cbamMonitor.confirm}
            </Button>
          </div>
        }
        onClose={closeEditor}
      >
        <CbamTranslationInputScope
          path={[
            'directEmission',
            'processMonitorJson',
            'methods',
            editingIndex ?? 0,
          ]}
          form={editor}
        >
          <Form
            form={editor}
            layout='vertical'
            onValuesChange={(_, values) => {
              const nextFormulaCode = formulaCode(values);
              if (values.formulaCode !== nextFormulaCode)
                editor.setFieldValue('formulaCode', nextFormulaCode);
            }}
          >
            <div className={styles.processMonitorFormGrid}>
              <Form.Item name='itemKey' hidden>
                <Input />
              </Form.Item>
              <Form.Item name='sortNo' hidden>
                <Input />
              </Form.Item>
              <Form.Item name='evidenceIds' hidden>
                <Input />
              </Form.Item>
              <Form.Item name='formulaCode' hidden>
                <Input />
              </Form.Item>
              <Form.Item
                name='processItemKey'
                label={I18N.cbamMonitor.processName}
                rules={[{ required: true }]}
              >
                <Select
                  allowClear
                  options={processOptions}
                  showSearch
                  optionFilterProp='label'
                  placeholder={I18N.cbamMonitor.select}
                />
              </Form.Item>
              <Form.Item
                name='sourceFlowName'
                label={I18N.cbamMonitor.sourceFlow}
                rules={[{ required: true, max: 40 }]}
              >
                <FactorSourceInput
                  options={sourceFlowOptions}
                  groupId='DATA_MONITOR_METHOD'
                  linkMonitorItem={false}
                />
              </Form.Item>
              <Form.Item
                name='sourceType'
                label={I18N.cbamMonitor.emissionMechanism}
                rules={[{ required: true }]}
              >
                <Select
                  allowClear
                  options={sourceTypeOptions}
                  placeholder={I18N.cbamMonitor.select}
                />
              </Form.Item>
              <Form.Item
                name='ghgType'
                label={I18N.cbamMonitor.ghgType}
                rules={[{ required: true }]}
              >
                <Select
                  allowClear
                  options={ghgTypeOptions}
                  placeholder={I18N.cbamMonitor.select}
                />
              </Form.Item>
              <Form.Item
                name='monitorMethod'
                label={I18N.cbamMonitor.monitoringMethod}
                rules={[{ required: true }]}
              >
                <Select
                  allowClear
                  options={monitorMethodOptions}
                  placeholder={I18N.cbamMonitor.select}
                />
              </Form.Item>
              <Form.Item
                name='dataSource'
                label={I18N.cbamMonitor.dataSource}
                rules={[{ required: true, max: 40 }]}
              >
                <Input maxLength={40} placeholder={I18N.cbamMonitor.enter} />
              </Form.Item>
              <Form.Item
                name='frequency'
                label={I18N.cbamMonitor.monitoringFrequency}
                rules={[{ required: true, max: 40 }]}
              >
                <MonitoringFrequencyInput groupId='DATA_MONITOR_METHOD' />
              </Form.Item>
              <Form.Item
                name='equipment'
                label={I18N.cbamMonitor.measuringEquipment}
                rules={[{ required: true, max: 40 }]}
              >
                <Input maxLength={40} placeholder={I18N.cbamMonitor.enter} />
              </Form.Item>
              <Form.Item
                name='location'
                label={I18N.cbamMonitor.equipmentLocation}
                rules={[{ max: 40 }]}
              >
                <Input maxLength={40} placeholder={I18N.cbamMonitor.enter} />
              </Form.Item>
              <Form.Item
                name='uncertainty'
                label={
                  <CbamFieldLabel hint={I18N.cbamMonitor.uncertaintyHint}>
                    {I18N.cbamMonitor.uncertainty}
                  </CbamFieldLabel>
                }
                rules={[{ max: 10 }]}
              >
                <Input
                  maxLength={10}
                  placeholder={I18N.cbamMonitor.uncertaintyPlaceholder}
                />
              </Form.Item>
              <Form.Item
                name='calibration'
                label={I18N.cbamMonitor.calibrationMethod}
                rules={[{ required: true, max: 200 }]}
              >
                <Input
                  maxLength={200}
                  placeholder={I18N.cbamMonitor.calibrationPlaceholder}
                />
              </Form.Item>
              <Form.Item
                className={styles.processMonitorWideField}
                name='missingDataMethod'
                label={I18N.cbamMonitor.missingDataMethod}
                rules={[{ max: 1000 }]}
              >
                <Input.TextArea
                  maxLength={1000}
                  rows={4}
                  placeholder={I18N.cbamMonitor.missingDataMethodPlaceholder}
                />
              </Form.Item>
              <Form.Item shouldUpdate noStyle>
                {() => (
                  <Form.Item
                    className={styles.processMonitorFormulaField}
                    label={I18N.cbamMonitor.calculationFormula}
                  >
                    <div className={styles.processMonitorFormulaValue}>
                      {formulaText(editor.getFieldValue('formulaCode'))}
                    </div>
                  </Form.Item>
                )}
              </Form.Item>
              <div className={styles.processMonitorEvidenceField}>
                <div className={styles.processMonitorEvidenceHeader}>
                  <span>{I18N.cbamMonitor.evidenceStatus}</span>
                  <Space size={12}>
                    <Button
                      className={styles.evidenceAddButton}
                      icon={<PlusOutlined />}
                      onClick={() => {
                        const itemKey = editor.getFieldValue('itemKey');
                        if (!itemKey) return;
                        onAddEvidence?.(itemKey, evidenceId =>
                          editor.setFieldValue(
                            'evidenceIds',
                            Array.from(
                              new Set([
                                ...(editor.getFieldValue('evidenceIds') || []),
                                evidenceId,
                              ]),
                            ),
                          ),
                        );
                      }}
                    >
                      {I18N.cbamMonitor.addEvidence}
                    </Button>
                    <Button
                      className={styles.evidenceSelectButton}
                      icon={
                        <img
                          alt=''
                          className={styles.evidenceSelectIcon}
                          src={selectEvidenceIcon}
                        />
                      }
                      onClick={() => setEvidenceModalOpen(true)}
                    >
                      {I18N.cbamMonitor.selectEvidence}
                    </Button>
                  </Space>
                </div>
                <div className={styles.processMonitorEvidenceCards}>
                  {relatedEvidences.map(evidence => (
                    <BusinessEvidenceCard
                      evidence={evidence}
                      key={evidence.id}
                      onDelete={unlinkEvidence}
                      onEdit={evidenceId => onEditEvidence?.(evidenceId)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Form>
        </CbamTranslationInputScope>
      </Drawer>
      <EvidenceSelectModal
        evidences={selectableEvidences}
        open={evidenceModalOpen}
        onCancel={() => setEvidenceModalOpen(false)}
        onConfirm={relateSelectedEvidence}
      />
    </>
  );
};
