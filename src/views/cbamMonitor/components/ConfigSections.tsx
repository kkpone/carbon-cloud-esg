import Input from '@/components/CbamTranslation/Input';
import {
  CbamTranslationControls,
  CbamTranslationInputScope,
  useCbamTranslationValue,
  useCbamTranslationText,
  useCbamTranslationEnglish,
} from '@/components/CbamTranslation';
import { countRequiredTableFields } from '@/components/CbamRequiredGroupSummary';
import CbamFieldLabel from '@/components/CbamFieldLabel';
import {
  DownOutlined,
  ExclamationCircleFilled,
  PlusOutlined,
} from '@ant-design/icons';
import I18N from '@src/lang/I18N';
import monitorEn from '@/lang/en-US/cbamMonitor';
import monitorZh from '@/lang/zh-CN/cbamMonitor';
import {
  AutoComplete,
  Button,
  Collapse,
  DatePicker,
  Drawer,
  Form,
  FormInstance,
  InputNumber,
  Pagination,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  TableColumnsType,
  Tooltip,
} from 'antd';
import { Rule } from 'antd/lib/form';
import { NamePath } from 'antd/lib/form/interface';
import { ReactNode, useEffect, useMemo, useState } from 'react';

import {
  CbamDrawerClose,
  CbamDrawerTitle,
} from '@/components/CbamDrawerHeader';

import MonitoringFrequencyInput from './MonitoringFrequencyInput';
import FactorSourceInput from './FactorSourceInput';
import EnergyPropertySelect from './EnergyPropertySelect';
import {
  electricityMethodOptions,
  energyPropertyLabel,
  methodFactorTypes,
  monitoringFrequencyDisplayValue,
  monitorFormulaDetails,
  monitorFormulaText,
} from '../fieldChanges';

import { BusinessEvidenceCard } from './BusinessEvidenceCard';
import { EvidenceSelectModal } from './EvidenceSelectModal';
import { FileObjectUpload } from './FileObjectUpload';
import { PrecursorSelectModal } from './PrecursorSelectModal';
import { ProcessMonitorSection } from './ProcessMonitorSection';
import selectEvidenceIcon from '../assets/select-evidence.svg';
import { showMonitorDeleteConfirm } from '../deleteConfirm';
import styles from '../plan.module.less';
import { getMonitorCnOptions } from '../service';
import {
  FactoryOption,
  FactorSamplingItem,
  MonitorChildDeleteRequest,
  MonitorChildDeleteType,
  MonitorEvidence,
  MonitorEvidenceRelation,
  MonitorPlanPayload,
  MonitorPrecursorOption,
  PfcMonitorItem,
  PrecursorItem,
  ProcessItem,
  ProcessMonitorItem,
  ProcedureItem,
  ResponsibilityItem,
} from '../types';

type DeleteChild = (
  request: Omit<MonitorChildDeleteRequest, 'dataVersion'>,
) => Promise<void>;
type FieldKind =
  | 'input'
  | 'number'
  | 'select'
  | 'multi'
  | 'singleArray'
  | 'textarea'
  | 'readonly'
  | 'autocomplete'
  | 'frequency'
  | 'energy'
  | 'factorSource';
interface FieldSchema {
  /** 字段的填写说明。 */
  tooltip?: string;
  name: string;
  label: string;
  kind?: FieldKind;
  required?: boolean;
  max?: number;
  minWidth?: number;
  flex?: number;
  /** 根据当前编辑项的源流关联限制因子选项。 */
  optionsFor?: (
    values: Record<string, unknown>,
  ) => { label: string; value: string }[];
  options?: {
    label: string;
    value: string | number | boolean;
    labelEn?: string;
  }[];
  loading?: boolean;
  searchable?: boolean;
  placeholder?: string;
  strictOptions?: boolean;
  multiline?: boolean;
  formatValue?: (value: unknown, rowName: number) => string;
  /** 列表可独立渲染展示内容，抽屉继续使用完整字段说明。 */
  renderTableValue?: (value: unknown, rowName: number) => ReactNode;
  onChange?: (value: unknown, rowName: number) => void;
}

/** 程序频次保留原枚举编码，标签在分组内按语言生成。 */
const monitorFrequencyTypes = [
  ['monitorContinuous', 'CONTINUOUS'],
  ['monitorShift', 'SHIFT'],
  ['monitorDaily', 'DAILY'],
  ['monitorMonthly', 'MONTHLY'],
  ['monitorQuarterly', 'QUARTERLY'],
  ['monitorAnnual', 'ANNUAL'],
] as const;

const createItemKey = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const pfcFormulaCode = (method?: string) =>
  ({
    SLOPE_METHOD: 'PFC_SLOPE',
    OVERVOLTAGE_METHOD: 'PFC_OVERVOLTAGE',
  }[method || '']);

const pfcFormulaText = monitorFormulaText;

const isAluminumCnCode = (cnCode?: string) => {
  const prefix = Number((cnCode || '').replace(/\D/g, '').slice(0, 4));
  return prefix >= 7601 && prefix <= 7616;
};

const Section = ({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) => (
  <section className={`${styles.section} ${className || ''}`}>
    <h3>
      {title}
      <CbamTranslationControls
        groupId={
          title === I18N.cbamMonitor.planDateAndVersion
            ? 'PLAN_IDENTITY'
            : title === I18N.cbamMonitor.operatorFacilityIdentification
            ? 'FACILITY'
            : undefined
        }
      />
    </h3>
    {description && <p className={styles.sectionDescription}>{description}</p>}
    {children}
  </section>
);

const ReadOnlyFactoryField = ({
  label,
  value,
  required,
}: {
  label: string;
  value?: string;
  required?: boolean;
}) => (
  <Form.Item label={label} required={required}>
    <Input
      className={styles.readOnlyFactoryField}
      value={value || ''}
      readOnly
      placeholder='--'
    />
  </Form.Item>
);

const fieldControl = (
  field: FieldSchema,
  onChange?: (value: unknown) => void,
) => {
  if (field.kind === 'factorSource')
    return (
      <FactorSourceInput
        options={(field.options || []).map(option => ({
          label: option.label,
          labelEn: option.labelEn,
          value: String(option.value),
        }))}
      />
    );
  if (field.kind === 'frequency') return <MonitoringFrequencyInput />;
  if (field.kind === 'energy') return <EnergyPropertySelect />;
  if (field.kind === 'textarea')
    return <Input.TextArea rows={4} maxLength={field.max} />;
  if (field.kind === 'number') return <InputNumber min={0} max={field.max} />;
  if (field.kind === 'readonly') return <Input readOnly />;
  if (field.kind === 'autocomplete') {
    return (
      <AutoComplete
        allowClear
        maxLength={field.max}
        options={field.options}
        placeholder={field.placeholder || I18N.cbamMonitor.select}
        showArrow
        suffixIcon={<DownOutlined />}
        filterOption={false}
        onChange={onChange}
      />
    );
  }
  if (
    field.kind === 'select' ||
    field.kind === 'multi' ||
    field.kind === 'singleArray'
  ) {
    return (
      <Select
        allowClear={field.kind !== 'multi'}
        className={field.kind === 'multi' ? styles.multiSelect : undefined}
        mode={field.kind === 'multi' ? 'multiple' : undefined}
        maxTagCount={field.kind === 'multi' ? 2 : undefined}
        options={field.options}
        placeholder={field.placeholder || I18N.cbamMonitor.select}
        loading={field.loading}
        showSearch={field.searchable}
        optionFilterProp={field.searchable ? 'label' : undefined}
        onChange={onChange}
      />
    );
  }
  return <Input maxLength={field.max} placeholder={I18N.cbamMonitor.enter} />;
};

const maxLengthRule = (field: string, max: number): Rule => ({
  max,
  message: I18N.template(I18N.cbamMonitor.fieldLengthExceeded, { field, max }),
});

const fieldRules = (field: FieldSchema): Rule[] => [
  {
    required: field.required,
    message: I18N.template(I18N.cbamMonitor.requiredField, {
      field: field.label,
    }),
  },
  ...(field.max !== undefined &&
  !['number', 'select', 'multi', 'singleArray'].includes(field.kind || '')
    ? [maxLengthRule(field.label, field.max)]
    : []),
  ...(['multi', 'singleArray'].includes(field.kind || '')
    ? [{ type: 'array' as const }]
    : []),
  ...(field.strictOptions
    ? [
        {
          validator: (_: unknown, value?: string | number | boolean) =>
            value === undefined ||
            value === null ||
            value === '' ||
            field.options?.some(option => option.value === value)
              ? Promise.resolve()
              : Promise.reject(new Error(I18N.cbamMonitor.cnCodeOptionOnly)),
        },
      ]
    : []),
];

const confirmRemoveItem = (onOk: () => void | Promise<void>) => {
  showMonitorDeleteConfirm({
    title: I18N.cbamMonitor.confirmDeleteItem,
    content: I18N.cbamMonitor.deleteItemTip,
    onOk,
  });
};

const ResponsibilitySection = ({
  onDeleteChild,
}: {
  onDeleteChild?: DeleteChild;
}) => {
  const form = Form.useFormInstance();
  const translateValue = useCbamTranslationValue();
  const [editingRow, setEditingRow] = useState<number>();
  const responsibilities =
    Form.useWatch<ResponsibilityItem[]>(
      ['controlConfirmation', 'divideWorkJson', 'responsibilities'],
      { form, preserve: true },
    ) || [];
  return (
    <section className={styles.controlSubsection}>
      <h4>{I18N.cbamMonitor.responsibilities}</h4>
      <Form.List
        name={['controlConfirmation', 'divideWorkJson', 'responsibilities']}
      >
        {(rows, { add, remove }) => (
          <>
            <div
              className={styles.responsibilityTable}
              data-cbam-required-missing={countRequiredTableFields(
                responsibilities,
                ['positionName'],
                true,
              )}
            >
              <div className={styles.responsibilityHeader}>
                <span className={styles.requiredHeaderMark}>*</span>
                {I18N.cbamMonitor.positionTitle}
              </div>
              <div className={styles.responsibilityHeader}>
                {I18N.cbamMonitor.responsibility}
              </div>
              <div className={styles.responsibilityHeader}>
                {I18N.cbamMonitor.operation}
              </div>
              {rows.map(row => {
                const editing = editingRow === row.name;
                return (
                  <div className={styles.responsibilityRow} key={row.key}>
                    <div className={styles.responsibilityCell}>
                      {editing ? (
                        <Form.Item
                          name={[row.name, 'positionName']}
                          rules={fieldRules({
                            name: 'positionName',
                            label: I18N.cbamMonitor.positionTitle,
                            required: true,
                            max: 40,
                          })}
                        >
                          <Input
                            maxLength={40}
                            placeholder={I18N.cbamMonitor.enter}
                          />
                        </Form.Item>
                      ) : (
                        <Form.Item noStyle shouldUpdate>
                          {({ getFieldValue }) =>
                            translateValue(
                              `controlConfirmation.divideWorkJson.responsibilities.${row.name}.positionName`,
                              getFieldValue([
                                'controlConfirmation',
                                'divideWorkJson',
                                'responsibilities',
                                row.name,
                                'positionName',
                              ]) || '--',
                            )
                          }
                        </Form.Item>
                      )}
                    </div>
                    <div className={styles.responsibilityCell}>
                      {editing ? (
                        <Form.Item
                          name={[row.name, 'responsibility']}
                          rules={[
                            maxLengthRule(I18N.cbamMonitor.responsibility, 200),
                          ]}
                        >
                          <Input
                            maxLength={200}
                            placeholder={I18N.cbamMonitor.enter}
                          />
                        </Form.Item>
                      ) : (
                        <Form.Item noStyle shouldUpdate>
                          {({ getFieldValue }) =>
                            translateValue(
                              `controlConfirmation.divideWorkJson.responsibilities.${row.name}.responsibility`,
                              getFieldValue([
                                'controlConfirmation',
                                'divideWorkJson',
                                'responsibilities',
                                row.name,
                                'responsibility',
                              ]) || '--',
                            )
                          }
                        </Form.Item>
                      )}
                    </div>
                    <div
                      className={`${styles.responsibilityCell} ${styles.responsibilityActions}`}
                    >
                      <Button
                        type='link'
                        onClick={() =>
                          setEditingRow(editing ? undefined : row.name)
                        }
                      >
                        {editing
                          ? I18N.cbamMonitor.done
                          : I18N.cbamMonitor.edit}
                      </Button>
                      <Button
                        type='link'
                        danger
                        onClick={() =>
                          confirmRemoveItem(async () => {
                            const itemKey = form.getFieldValue([
                              'controlConfirmation',
                              'divideWorkJson',
                              'responsibilities',
                              row.name,
                              'itemKey',
                            ]);
                            const positionName = form.getFieldValue([
                              'controlConfirmation',
                              'divideWorkJson',
                              'responsibilities',
                              row.name,
                              'positionName',
                            ]);
                            if (itemKey)
                              await onDeleteChild?.({
                                target: 'RESPONSIBILITY',
                                itemKey,
                              });
                            remove(row.name);
                            if (positionName) {
                              const procedurePaths = [
                                [
                                  'controlConfirmation',
                                  'manageEvaluateJson',
                                  'procedures',
                                ],
                                [
                                  'controlConfirmation',
                                  'dataFlowJson',
                                  'procedures',
                                ],
                                [
                                  'controlConfirmation',
                                  'controlActivityJson',
                                  'procedures',
                                ],
                                [
                                  'controlConfirmation',
                                  'otherProcedureJson',
                                  'procedures',
                                ],
                              ];
                              const looseForm = form as FormInstance;
                              procedurePaths.forEach(path => {
                                const procedures = looseForm.getFieldValue(
                                  path,
                                ) as ProcedureItem[] | undefined;
                                looseForm.setFieldValue(
                                  path,
                                  (procedures || []).map(procedure =>
                                    procedure.positionOrDepartment ===
                                    positionName
                                      ? {
                                          ...procedure,
                                          positionOrDepartment: undefined,
                                        }
                                      : procedure,
                                  ),
                                );
                              });
                            }
                            setEditingRow(undefined);
                          })
                        }
                      >
                        {I18N.cbamMonitor.delete}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <Button
              className={styles.controlAddButton}
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingRow(rows.length);
                add({ itemKey: createItemKey(), sortNo: rows.length + 1 });
              }}
            >
              {I18N.cbamMonitor.addResponsibility}
            </Button>
          </>
        )}
      </Form.List>
    </section>
  );
};

const ProcedureCardHeader = ({
  name,
  index,
  numbered,
  fallbackTitle,
  fixedTitles,
  referenceRequired,
}: {
  name: NamePath;
  index: number;
  numbered: boolean;
  fallbackTitle: string;
  fixedTitles?: Record<string, string>;
  referenceRequired: boolean;
}) => (
  <Form.Item noStyle shouldUpdate>
    {({ getFieldValue }) => {
      const item = (getFieldValue(name) || {}) as ProcedureItem;
      const outsourced = item.procedureType === 'OUTSOURCED_PROCESS';
      const disabled = outsourced && item.enabled === false;
      const configured =
        disabled ||
        [
          'title',
          ...(!outsourced ? ['positionOrDepartment'] : []),
          ...(referenceRequired ? ['referenceNo'] : []),
          'frequency',
          'recordLocation',
        ].every(field => {
          const value = item[field];
          return (
            value !== undefined &&
            value !== null &&
            (typeof value !== 'string' || Boolean(value.trim()))
          );
        });
      const automaticTitle = item.title?.match(
        /^(补充程序|Supplementary Procedure)\s+\d+$/,
      );
      const displayTitle =
        (item.procedureType && fixedTitles?.[item.procedureType]) ||
        (automaticTitle
          ? `${I18N.cbamMonitor.supplementaryProcedure} ${
              item.sortNo || index + 1
            }`
          : item.title) ||
        fallbackTitle;
      return (
        <div className={styles.procedureCardHeader}>
          <span
            className={
              configured ? styles.configuredTag : styles.pendingConfigurationTag
            }
          >
            {configured
              ? I18N.cbamMonitor.configured
              : I18N.cbamMonitor.pendingConfiguration}
          </span>
          <span className={styles.procedureCardTitle}>
            {`${
              numbered ? `${String.fromCharCode(97 + index)}. ` : ''
            }${displayTitle}`}
            {outsourced && (
              <span className={styles.procedureCardTip}>
                {I18N.cbamMonitor.outsourcedProcessTip}
              </span>
            )}
          </span>
        </div>
      );
    }}
  </Form.Item>
);

const ProcedureListSection = ({
  title,
  groupId,
  name,
  positionOptions,
  addable,
  management,
  numbered = true,
  fixedTitles,
  deleteTarget,
  onDeleteChild,
}: {
  title?: string;
  /** 频次选项跟随所属分组的语言选择。 */
  groupId: string;
  name: NamePath;
  positionOptions: { label: string; value: string }[];
  addable?: boolean;
  management?: boolean;
  numbered?: boolean;
  fixedTitles?: Record<string, string>;
  deleteTarget: MonitorChildDeleteType;
  onDeleteChild?: DeleteChild;
}) => {
  const form = Form.useFormInstance();
  const procedures = Form.useWatch(name, { form, preserve: true }) || [];
  const translateText = useCbamTranslationText();
  const monitorFrequencyOptions = monitorFrequencyTypes.map(([key, value]) => ({
    value,
    label: translateText(groupId, monitorZh[key], monitorEn[key]),
  }));
  const referenceRequired = [
    'MANAGE_EVALUATE_PROCEDURE',
    'DATA_FLOW_PROCEDURE',
    'CONTROL_ACTIVITY_PROCEDURE',
  ].includes(deleteTarget);
  return (
    <section
      className={`${styles.controlSubsection} ${
        management ? styles.managementProcedureSubsection : ''
      }`}
    >
      {title && <h4>{title}</h4>}
      <Form.List name={name}>
        {(rows, { add, remove }) => (
          <>
            <div className={styles.procedureCardList}>
              {rows.map((row, rowIndex) => {
                const outsourced =
                  procedures[rowIndex]?.procedureType === 'OUTSOURCED_PROCESS';
                const enabled = procedures[rowIndex]?.enabled !== false;
                const rowPath = [...(name as (string | number)[]), row.name];
                const fallbackTitle = addable
                  ? `${I18N.cbamMonitor.supplementaryProcedure} ${rowIndex + 1}`
                  : `${title || I18N.cbamMonitor.procedure} ${rowIndex + 1}`;
                const deleteProcedure = () =>
                  confirmRemoveItem(async () => {
                    const itemKey = form.getFieldValue([...rowPath, 'itemKey']);
                    if (itemKey)
                      await onDeleteChild?.({ target: deleteTarget, itemKey });
                    const procedures = (form.getFieldValue(name) ||
                      []) as ProcedureItem[];
                    const remainingProcedures = procedures
                      .filter((_, index) => index !== row.name)
                      .map((procedure, index) => {
                        const sequence = index + 1;
                        const automaticTitle = procedure.title?.match(
                          /^(补充程序|Supplementary Procedure)\s+\d+$/,
                        );
                        return {
                          ...procedure,
                          sortNo: sequence,
                          title: automaticTitle
                            ? `${automaticTitle[1]} ${sequence}`
                            : procedure.title?.trim() ||
                              `${I18N.cbamMonitor.supplementaryProcedure} ${sequence}`,
                        };
                      });
                    remove(row.name);
                    form.setFieldValue(name, remainingProcedures);
                  });
                return (
                  <Collapse
                    className={`${styles.procedureCard} ${styles.controlProcedureCard}`}
                    defaultActiveKey={rowIndex < 2 ? 'form' : undefined}
                    expandIconPosition='end'
                    expandIcon={({ isActive }) => (
                      <DownOutlined rotate={isActive ? 0 : -90} />
                    )}
                    key={row.key}
                    items={[
                      {
                        key: 'form',
                        // 提前挂载折叠表单，首次进入即可统计所有程序必填项。
                        forceRender: true,
                        extra: addable ? (
                          <Button
                            className={styles.procedureDeleteButton}
                            danger
                            type='text'
                            onClick={event => {
                              event.stopPropagation();
                              deleteProcedure();
                            }}
                          >
                            {I18N.cbamMonitor.delete}
                          </Button>
                        ) : outsourced ? (
                          <div onClick={event => event.stopPropagation()}>
                            <Form.Item
                              name={[row.name, 'enabled']}
                              valuePropName='checked'
                              initialValue
                              noStyle
                            >
                              <Switch />
                            </Form.Item>
                          </div>
                        ) : undefined,
                        label: (
                          <ProcedureCardHeader
                            name={rowPath}
                            index={rowIndex}
                            numbered={numbered}
                            fallbackTitle={fallbackTitle}
                            fixedTitles={fixedTitles}
                            referenceRequired={referenceRequired}
                          />
                        ),
                        children:
                          outsourced && !enabled ? undefined : (
                            <div className={styles.procedureFormGrid}>
                              <Form.Item
                                name={[row.name, 'title']}
                                label={I18N.cbamMonitor.procedureTitle}
                                rules={fieldRules({
                                  name: 'title',
                                  label: I18N.cbamMonitor.procedureTitle,
                                  required: true,
                                  max: 40,
                                })}
                              >
                                <Input
                                  maxLength={40}
                                  placeholder={I18N.cbamMonitor.enter}
                                />
                              </Form.Item>
                              <Form.Item
                                name={[row.name, 'referenceNo']}
                                label={I18N.cbamMonitor.procedureReference}
                                rules={[
                                  {
                                    required: referenceRequired,
                                    whitespace: referenceRequired,
                                    max: 40,
                                  },
                                ]}
                              >
                                <Input
                                  maxLength={40}
                                  placeholder={I18N.cbamMonitor.enter}
                                />
                              </Form.Item>
                              <Form.Item
                                name={[row.name, 'positionOrDepartment']}
                                label={I18N.cbamMonitor.responsibleDepartment}
                                rules={fieldRules({
                                  name: 'positionOrDepartment',
                                  label: I18N.cbamMonitor.responsibleDepartment,
                                  required: !outsourced,
                                })}
                              >
                                <Select
                                  allowClear
                                  options={positionOptions}
                                  showSearch
                                  optionFilterProp='label'
                                  placeholder={I18N.cbamMonitor.select}
                                />
                              </Form.Item>
                              <Form.Item
                                name={[row.name, 'recordLocation']}
                                label={
                                  <CbamFieldLabel
                                    hint={I18N.cbamMonitor.recordLocationHint}
                                  >
                                    {I18N.cbamMonitor.recordLocation}
                                  </CbamFieldLabel>
                                }
                                rules={fieldRules({
                                  name: 'recordLocation',
                                  label: I18N.cbamMonitor.recordLocation,
                                  required: true,
                                  max: 40,
                                })}
                              >
                                <Input
                                  maxLength={40}
                                  placeholder={I18N.cbamMonitor.enter}
                                />
                              </Form.Item>
                              <Form.Item
                                name={[row.name, 'mainRisk']}
                                label={I18N.cbamMonitor.mainRisk}
                                rules={[{ max: 200 }]}
                              >
                                <Input
                                  maxLength={200}
                                  placeholder={I18N.cbamMonitor.enter}
                                />
                              </Form.Item>
                              <Form.Item
                                name={[row.name, 'frequency']}
                                label={I18N.cbamMonitor.frequency}
                                rules={fieldRules({
                                  name: 'frequency',
                                  label: I18N.cbamMonitor.frequency,
                                  required: true,
                                })}
                              >
                                <Select
                                  allowClear
                                  options={monitorFrequencyOptions}
                                  placeholder={I18N.cbamMonitor.select}
                                />
                              </Form.Item>
                              <Form.Item
                                className={styles.procedureDescription}
                                name={[row.name, 'description']}
                                label={
                                  I18N.cbamMonitor.procedureControlDescription
                                }
                                rules={[{ max: 1000 }]}
                              >
                                <Input
                                  maxLength={1000}
                                  placeholder={I18N.cbamMonitor.enter}
                                />
                              </Form.Item>
                            </div>
                          ),
                      },
                    ]}
                  />
                );
              })}
            </div>
            {addable && (
              <Button
                className={styles.controlAddButton}
                icon={<PlusOutlined />}
                onClick={() => {
                  const procedures = (form.getFieldValue(name) ||
                    []) as ProcedureItem[];
                  const nextNo =
                    Math.max(
                      0,
                      ...procedures.map(
                        (item, index) => item.sortNo || index + 1,
                      ),
                    ) + 1;
                  add({
                    itemKey: createItemKey(),
                    sortNo: nextNo,
                    title: `${I18N.cbamMonitor.supplementaryProcedure} ${nextNo}`,
                  });
                }}
              >
                {I18N.cbamMonitor.addProcedure}
              </Button>
            )}
          </>
        )}
      </Form.List>
    </section>
  );
};

const GOODS_PAGE_SIZE = 10;
const DIRECT_STATUS_WIDTH = 100;
const DIRECT_ACTION_WIDTH = 112;
const GoodsTableSection = ({
  name,
  fields,
  addText,
  actionWidth = 96,
  columnMinWidth = 180,
  onSelectPrecursor,
  onRemove,
  deleteTarget,
  onDeleteChild,
  evidencePartCode,
  editText,
  onAddEvidence,
  onEditEvidence,
  normalizeItem,
  requiredRows = false,
  borderless = false,
}: {
  name: NamePath;
  fields: FieldSchema[];
  addText: string;
  actionWidth?: number;
  columnMinWidth?: number;
  onSelectPrecursor?: (rowName: number) => void;
  onRemove?: (itemKey?: string) => void;
  deleteTarget: MonitorChildDeleteType;
  onDeleteChild?: DeleteChild;
  evidencePartCode?: number;
  editText?: string;
  onAddEvidence?: (
    itemKey: string,
    onCreated: (evidenceId: number) => void,
  ) => void;
  onEditEvidence?: (evidenceId: number) => void;
  normalizeItem?: (item: Record<string, unknown>) => Record<string, unknown>;
  requiredRows?: boolean;
  borderless?: boolean;
}) => {
  const form = Form.useFormInstance();
  const translateValue = useCbamTranslationValue();
  const [editor] = Form.useForm<Record<string, unknown>>();
  const editorValues =
    Form.useWatch([], { form: editor, preserve: true }) || {};
  const [currentPage, setCurrentPage] = useState(1);
  const [editingRow, setEditingRow] = useState<number>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const evidences =
    Form.useWatch<MonitorEvidence[]>('evidences', {
      form,
      preserve: true,
    }) || [];
  const evidenceRelations =
    Form.useWatch<MonitorEvidenceRelation[]>('evidenceRelations', {
      form,
      preserve: true,
    }) || [];
  const editorEvidenceIds =
    Form.useWatch<number[]>('evidenceIds', editor) || [];
  const listItems =
    Form.useWatch<Record<string, unknown>[]>(name, {
      form,
      preserve: true,
    }) || [];
  const requiredFields = fields
    .filter(field => field.required)
    .map(field => field.name);
  // 含必填字段的表格为空时也计一项待完善，与完整度的至少一行口径一致。
  const missingRequiredFields =
    requiredRows || requiredFields.length
      ? countRequiredTableFields(listItems, requiredFields, true)
      : undefined;
  const showEvidenceStatus = evidencePartCode !== undefined;
  const statusColumn = showEvidenceStatus ? ` ${DIRECT_STATUS_WIDTH}px` : '';
  const fieldColumns = fields
    .map(
      field =>
        `minmax(${field.minWidth || columnMinWidth}px, ${field.flex || 1}fr)`,
    )
    .join(' ');
  const editorFields = [
    ...fields.filter(field => field.kind !== 'readonly'),
    ...fields.filter(field => field.kind === 'readonly'),
  ];
  const gridTemplateColumns = `${fieldColumns}${statusColumn} ${actionWidth}px`;
  const tableMinWidth =
    fields.reduce(
      (total, field) => total + (field.minWidth || columnMinWidth),
      0,
    ) +
    (showEvidenceStatus ? DIRECT_STATUS_WIDTH : 0) +
    actionWidth;
  const relatedEvidences = evidences.filter(
    evidence =>
      evidence.id !== undefined && editorEvidenceIds.includes(evidence.id),
  );
  const selectableEvidences = evidences.filter(
    evidence =>
      evidence.id !== undefined && !editorEvidenceIds.includes(evidence.id),
  );
  const closeEditor = () => {
    setDrawerOpen(false);
    setEditingRow(undefined);
    editor.resetFields();
  };
  const openEditor = (rowName?: number) => {
    setEditingRow(rowName);
    const current =
      rowName === undefined
        ? { itemKey: createItemKey(), sortNo: listItems.length + 1 }
        : listItems[rowName];
    editor.resetFields();
    editor.setFieldsValue(
      (normalizeItem ? normalizeItem(current) : current) as Parameters<
        typeof editor.setFieldsValue
      >[0],
    );
    setDrawerOpen(true);
  };
  const saveEditor = () => {
    const values = editor.getFieldsValue(true);
    const nextItem = normalizeItem ? normalizeItem(values) : values;
    const nextItems =
      editingRow === undefined
        ? [...listItems, nextItem]
        : listItems.map((item, index) =>
            index === editingRow ? nextItem : item,
          );
    form.setFieldValue(name, nextItems);
    if (editingRow === undefined) {
      setCurrentPage(Math.ceil(nextItems.length / GOODS_PAGE_SIZE));
    }
    closeEditor();
  };
  const relateSelectedEvidence = (evidenceIds: number[]) => {
    const itemKey = editor.getFieldValue('itemKey') as string;
    editor.setFieldValue(
      'evidenceIds',
      Array.from(new Set([...editorEvidenceIds, ...evidenceIds])),
    );
    form.setFieldValue('evidenceRelations', [
      ...evidenceRelations,
      ...evidenceIds.map(evidenceId => ({
        evidenceId,
        partCode: evidencePartCode as number,
        itemKey,
      })),
    ]);
    setEvidenceModalOpen(false);
  };
  const unlinkEvidence = (evidenceId?: number) => {
    if (evidenceId === undefined) return;
    const relation = evidenceRelations.find(
      item =>
        item.evidenceId === evidenceId &&
        item.partCode === evidencePartCode &&
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
          evidenceRelations.filter(
            item =>
              !(
                item.evidenceId === evidenceId &&
                item.partCode === evidencePartCode &&
                item.itemKey === editor.getFieldValue('itemKey')
              ),
          ),
        );
        const nextEvidenceIds = editorEvidenceIds.filter(
          id => id !== evidenceId,
        );
        editor.setFieldValue('evidenceIds', nextEvidenceIds);
        if (editingRow !== undefined) {
          form.setFieldValue(
            [...(name as (string | number)[]), editingRow, 'evidenceIds'],
            nextEvidenceIds,
          );
        }
      },
    });
  };
  const evidenceEditor = showEvidenceStatus ? (
    <>
      <Drawer
        closable={false}
        destroyOnClose
        open={drawerOpen}
        rootClassName={styles.processMonitorDrawer}
        title={
          <CbamDrawerTitle>
            {editingRow === undefined ? addText : editText || addText}
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
          path={[...(name as (string | number)[]), editingRow ?? 0]}
          form={editor}
        >
          <Form
            form={editor}
            layout='vertical'
            onValuesChange={() => {
              if (!normalizeItem) return;
              const normalized = normalizeItem(editor.getFieldsValue(true));
              Object.entries(normalized).forEach(([key, value]) => {
                if (editor.getFieldValue(key) !== value)
                  editor.setFieldValue(key, value);
              });
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
              {editorFields.map(field =>
                field.kind === 'readonly' ? (
                  <Form.Item noStyle shouldUpdate key={field.name}>
                    {() => (
                      <Form.Item
                        className={styles.processMonitorFormulaField}
                        label={
                          <CbamFieldLabel hint={field.tooltip}>
                            {field.label}
                          </CbamFieldLabel>
                        }
                      >
                        <div
                          className={`${styles.processMonitorFormulaValue} ${
                            field.multiline
                              ? styles.processMonitorFormulaValueMultiline
                              : ''
                          }`}
                        >
                          {field.formatValue
                            ? field.formatValue(
                                editor.getFieldValue(field.name),
                                editingRow || 0,
                              )
                            : editor.getFieldValue(field.name) || '--'}
                        </div>
                      </Form.Item>
                    )}
                  </Form.Item>
                ) : (
                  <Form.Item
                    className={
                      field.kind === 'textarea'
                        ? styles.processMonitorWideField
                        : undefined
                    }
                    key={field.name}
                    name={field.name}
                    label={
                      <CbamFieldLabel hint={field.tooltip}>
                        {field.label}
                      </CbamFieldLabel>
                    }
                    rules={fieldRules({
                      ...field,
                      options:
                        field.optionsFor?.(editorValues) || field.options,
                    })}
                    getValueProps={
                      field.kind === 'singleArray'
                        ? value => ({
                            value: Array.isArray(value) ? value[0] : value,
                          })
                        : undefined
                    }
                    getValueFromEvent={
                      field.kind === 'singleArray'
                        ? value =>
                            value === undefined || value === null ? [] : [value]
                        : undefined
                    }
                  >
                    {fieldControl(
                      {
                        ...field,
                        options:
                          field.optionsFor?.(editorValues) || field.options,
                      },
                      value => field.onChange?.(value, editingRow || 0),
                    )}
                  </Form.Item>
                ),
              )}
              <div className={styles.processMonitorEvidenceField}>
                <div className={styles.processMonitorEvidenceHeader}>
                  <span>{I18N.cbamMonitor.evidenceStatus}</span>
                  <Space size={12}>
                    <Button
                      className={styles.evidenceAddButton}
                      icon={<PlusOutlined />}
                      onClick={() => {
                        const itemKey = editor.getFieldValue(
                          'itemKey',
                        ) as string;
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
  ) : null;
  return (
    <>
      <Form.List
        name={name}
        rules={
          requiredRows
            ? [
                {
                  validator: async (_, rows?: unknown[]) =>
                    rows?.length
                      ? Promise.resolve()
                      : Promise.reject(
                          new Error(I18N.cbamMonitor.requiredItemsIncomplete),
                        ),
                },
              ]
            : undefined
        }
      >
        {(rows, { add, remove }, { errors }) => {
          const totalPages = Math.max(
            1,
            Math.ceil(rows.length / GOODS_PAGE_SIZE),
          );
          const safePage = Math.min(currentPage, totalPages);
          const visibleRows = rows.slice(
            (safePage - 1) * GOODS_PAGE_SIZE,
            safePage * GOODS_PAGE_SIZE,
          );
          const handleAdd = () => {
            add({ itemKey: createItemKey(), sortNo: rows.length + 1 });
            setCurrentPage(Math.ceil((rows.length + 1) / GOODS_PAGE_SIZE));
          };
          const handleRemove = (rowName: number) => {
            const itemKey = form.getFieldValue([
              ...(name as (string | number)[]),
              rowName,
              'itemKey',
            ]);
            remove(rowName);
            if (evidencePartCode !== undefined && itemKey) {
              form.setFieldValue(
                'evidenceRelations',
                evidenceRelations.filter(
                  relation =>
                    !(
                      relation.partCode === evidencePartCode &&
                      relation.itemKey === itemKey
                    ),
                ),
              );
            }
            if (editingRow === rowName) setEditingRow(undefined);
            onRemove?.(itemKey);
            setCurrentPage(
              Math.min(
                safePage,
                Math.max(1, Math.ceil((rows.length - 1) / GOODS_PAGE_SIZE)),
              ),
            );
          };
          const confirmRowRemove = (rowName: number) =>
            confirmRemoveItem(async () => {
              const itemKey = form.getFieldValue([
                ...(name as (string | number)[]),
                rowName,
                'itemKey',
              ]);
              if (itemKey)
                await onDeleteChild?.({ target: deleteTarget, itemKey });
              handleRemove(rowName);
            });
          if (showEvidenceStatus) {
            type DirectTableRow = { key: number; name: number };
            const displayFieldValue = (field: FieldSchema, rowName: number) => {
              const value = form.getFieldValue([
                ...(name as (string | number)[]),
                rowName,
                field.name,
              ]);
              const path = [
                ...(name as (string | number)[]),
                rowName,
                field.name,
              ].join('.');
              if (field.formatValue)
                return translateValue(path, field.formatValue(value, rowName));
              const values = Array.isArray(value) ? value : [value];
              const displayValue = values
                .filter(
                  item => item !== undefined && item !== null && item !== '',
                )
                .map(
                  item =>
                    field.options?.find(option => option.value === item)
                      ?.label || String(item),
                )
                .join('、');
              return translateValue(path, displayValue || '--');
            };
            const columns: TableColumnsType<DirectTableRow> = [
              ...fields.map(field => ({
                title: (
                  <CbamFieldLabel hint={field.tooltip}>
                    {field.label}
                  </CbamFieldLabel>
                ),
                key: field.name,
                width: field.minWidth || columnMinWidth,
                render: (_: unknown, row: DirectTableRow) => (
                  <Form.Item noStyle shouldUpdate>
                    {() => (
                      <span
                        className={`${styles.directTableCell} ${
                          field.multiline ? styles.directTableCellMultiline : ''
                        }`}
                        title={
                          field.renderTableValue
                            ? undefined
                            : displayFieldValue(field, row.name)
                        }
                      >
                        {field.renderTableValue
                          ? field.renderTableValue(
                              form.getFieldValue([
                                ...(name as (string | number)[]),
                                row.name,
                                field.name,
                              ]),
                              row.name,
                            )
                          : displayFieldValue(field, row.name)}
                      </span>
                    )}
                  </Form.Item>
                ),
              })),
              {
                title: I18N.cbamMonitor.evidenceStatus,
                key: 'evidenceStatus',
                fixed: 'right',
                width: DIRECT_STATUS_WIDTH,
                render: (_: unknown, row: DirectTableRow) => {
                  const evidenceIds = form.getFieldValue([
                    ...(name as (string | number)[]),
                    row.name,
                    'evidenceIds',
                  ]) as number[] | undefined;
                  const configured = Boolean(evidenceIds?.length);
                  return (
                    <span
                      className={
                        configured
                          ? styles.configuredTag
                          : styles.pendingConfigurationTag
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
                width: actionWidth,
                render: (_: unknown, row: DirectTableRow) => (
                  <div className={styles.directTableActions}>
                    <Button
                      type='text'
                      className={styles.directEditButton}
                      onClick={() => openEditor(row.name)}
                    >
                      {I18N.cbamMonitor.edit}
                    </Button>
                    <Button
                      type='text'
                      danger
                      className={styles.directDeleteButton}
                      onClick={() => confirmRowRemove(row.name)}
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
                  className={`${styles.processMonitorTable} ${
                    borderless ? styles.processMonitorTableBorderless : ''
                  }`}
                  data-cbam-required-missing={missingRequiredFields}
                >
                  <Table<DirectTableRow>
                    columns={columns}
                    dataSource={visibleRows}
                    locale={{ emptyText: null }}
                    pagination={false}
                    rowKey='key'
                    scroll={{ x: tableMinWidth }}
                  />
                </div>
                <Button
                  className={styles.goodsAddRowButton}
                  icon={<PlusOutlined />}
                  onClick={() => openEditor()}
                >
                  {addText}
                </Button>
                {rows.length > GOODS_PAGE_SIZE && (
                  <Pagination
                    className={styles.goodsPagination}
                    current={safePage}
                    pageSize={GOODS_PAGE_SIZE}
                    showSizeChanger={false}
                    total={rows.length}
                    onChange={setCurrentPage}
                  />
                )}
              </>
            );
          }
          return (
            <>
              <div
                className={styles.goodsTableViewport}
                data-cbam-required-missing={missingRequiredFields}
              >
                <div
                  className={styles.goodsTable}
                  style={{ minWidth: tableMinWidth }}
                >
                  <div
                    className={styles.goodsTableHeader}
                    style={{ gridTemplateColumns }}
                  >
                    {fields.map(field => (
                      <div key={field.name}>
                        <CbamFieldLabel hint={field.tooltip}>
                          {field.label}
                        </CbamFieldLabel>
                      </div>
                    ))}
                    {showEvidenceStatus && (
                      <div className={styles.directStatusColumn}>
                        {I18N.cbamMonitor.evidenceStatus}
                      </div>
                    )}
                    <div
                      className={
                        showEvidenceStatus
                          ? styles.directActionColumn
                          : undefined
                      }
                    >
                      {I18N.cbamMonitor.operation}
                    </div>
                  </div>
                  {visibleRows.map(row => {
                    const evidenceIds = form.getFieldValue([
                      ...(name as (string | number)[]),
                      row.name,
                      'evidenceIds',
                    ]) as number[] | undefined;
                    const evidenceConfigured = Boolean(evidenceIds?.length);
                    return (
                      <div
                        className={styles.goodsTableRow}
                        style={{ gridTemplateColumns }}
                        key={row.key}
                      >
                        {fields.map(field => (
                          <div
                            className={styles.goodsTableCell}
                            key={field.name}
                          >
                            <Form.Item
                              name={[row.name, field.name]}
                              rules={fieldRules(field)}
                              getValueProps={
                                field.kind === 'singleArray'
                                  ? value => ({
                                      value: Array.isArray(value)
                                        ? value[0]
                                        : value,
                                    })
                                  : undefined
                              }
                              getValueFromEvent={
                                field.kind === 'singleArray'
                                  ? value =>
                                      value === undefined || value === null
                                        ? []
                                        : [value]
                                  : undefined
                              }
                            >
                              {fieldControl(field, value =>
                                field.onChange?.(value, row.name),
                              )}
                            </Form.Item>
                          </div>
                        ))}
                        {showEvidenceStatus && (
                          <div
                            className={`${styles.goodsTableCell} ${styles.directStatusColumn}`}
                          >
                            <span
                              className={
                                evidenceConfigured
                                  ? styles.configuredTag
                                  : styles.pendingConfigurationTag
                              }
                            >
                              {evidenceConfigured
                                ? I18N.cbamMonitor.configured
                                : I18N.cbamMonitor.pendingConfiguration}
                            </span>
                          </div>
                        )}
                        <div
                          className={`${styles.goodsTableCell} ${
                            styles.goodsTableAction
                          } ${
                            showEvidenceStatus ? styles.directActionColumn : ''
                          }`}
                        >
                          {onSelectPrecursor && (
                            <Button
                              type='text'
                              className={styles.selectPrecursorButton}
                              onClick={() => onSelectPrecursor(row.name)}
                            >
                              {I18N.cbamMonitor.selectPrecursor}
                            </Button>
                          )}
                          <Button
                            type='text'
                            danger
                            className={
                              showEvidenceStatus
                                ? styles.directDeleteButton
                                : undefined
                            }
                            onClick={() => confirmRowRemove(row.name)}
                          >
                            {I18N.cbamMonitor.delete}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <Button
                className={styles.goodsAddRowButton}
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                {addText}
              </Button>
              <Form.ErrorList errors={errors} />
              {rows.length > GOODS_PAGE_SIZE && (
                <Pagination
                  className={styles.goodsPagination}
                  current={safePage}
                  pageSize={GOODS_PAGE_SIZE}
                  showSizeChanger={false}
                  total={rows.length}
                  onChange={setCurrentPage}
                />
              )}
            </>
          );
        }}
      </Form.List>
      {evidenceEditor}
    </>
  );
};

const ConditionEvidenceLink = ({
  name,
  partCode,
  onAddEvidence,
  onEditEvidence,
  onDeleteChild,
  onConfigChange,
  label = I18N.cbamMonitor.proofMaterials,
  hint = I18N.cbamMonitor.proofMaterialsHint,
}: {
  name: NamePath;
  partCode: number;
  onAddEvidence?: (
    partCode: number,
    itemKey: string,
    onCreated: (evidenceId: number) => void,
  ) => void;
  onEditEvidence?: (evidenceId: number) => void;
  onDeleteChild?: DeleteChild;
  onConfigChange?: () => void;
  label?: string;
  hint?: string;
}) => {
  const form = Form.useFormInstance();
  const itemKeyPath = [...(name as (string | number)[]), 'itemKey'];
  const evidenceIdsPath = [...(name as (string | number)[]), 'evidenceIds'];
  const applicablePath = [...(name as (string | number)[]), 'applicable'];
  const applicable = Form.useWatch<boolean | undefined>(applicablePath, {
    form,
    preserve: true,
  });
  const evidenceIds =
    Form.useWatch<number[]>(evidenceIdsPath, { form, preserve: true }) || [];
  const evidences =
    Form.useWatch<MonitorEvidence[]>('evidences', { form, preserve: true }) ||
    [];
  const relations =
    Form.useWatch<MonitorEvidenceRelation[]>('evidenceRelations', {
      form,
      preserve: true,
    }) || [];
  const [selectOpen, setSelectOpen] = useState(false);
  const relatedEvidences = evidences.filter(
    item => item.id !== undefined && evidenceIds.includes(item.id),
  );
  const selectableEvidences = evidences.filter(
    item => item.id !== undefined && !evidenceIds.includes(item.id),
  );
  if (applicable === false) return null;
  const unlink = (evidenceId: number) => {
    const itemKey = form.getFieldValue(itemKeyPath) as string | undefined;
    const relation = relations.find(
      item =>
        item.evidenceId === evidenceId &&
        item.partCode === partCode &&
        item.itemKey === itemKey,
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
          evidenceIdsPath,
          evidenceIds.filter(id => id !== evidenceId),
        );
        form.setFieldValue(
          'evidenceRelations',
          relations.filter(
            item =>
              !(
                item.evidenceId === evidenceId &&
                item.partCode === partCode &&
                item.itemKey === itemKey
              ),
          ),
        );
        onConfigChange?.();
      },
    });
  };
  // 证明材料为自定义区块，显式计入标题统计，口径与业务完整度一致。
  return (
    <div
      className={styles.conditionEvidenceBlock}
      data-cbam-required-missing={
        relatedEvidences.some(evidence => evidence.evidenceType?.trim()) ? 0 : 1
      }
    >
      <span className={styles.conditionEvidenceLabel}>
        <span className={styles.conditionEvidenceRequired}>*</span>
        {label}
      </span>
      <span className={styles.conditionEvidenceHint}>{hint}</span>
      <Space size={16}>
        <Button
          className={styles.evidenceAddButton}
          icon={<PlusOutlined />}
          onClick={() => {
            const itemKey = form.getFieldValue(itemKeyPath) || createItemKey();
            form.setFieldValue(itemKeyPath, itemKey);
            onAddEvidence?.(partCode, itemKey, evidenceId => {
              form.setFieldValue(
                evidenceIdsPath,
                Array.from(
                  new Set([
                    ...(form.getFieldValue(evidenceIdsPath) || []),
                    evidenceId,
                  ]),
                ),
              );
              onConfigChange?.();
            });
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
          onClick={() => setSelectOpen(true)}
        >
          {I18N.cbamMonitor.selectEvidence}
        </Button>
      </Space>
      <div className={styles.processMonitorEvidenceCards}>
        {relatedEvidences.map(evidence => (
          <BusinessEvidenceCard
            evidence={evidence}
            key={evidence.id}
            onDelete={unlink}
            onEdit={evidenceId => onEditEvidence?.(evidenceId)}
          />
        ))}
      </div>
      <EvidenceSelectModal
        evidences={selectableEvidences}
        open={selectOpen}
        onCancel={() => setSelectOpen(false)}
        onConfirm={selectedIds => {
          const itemKey = form.getFieldValue(itemKeyPath) || createItemKey();
          form.setFieldValue(itemKeyPath, itemKey);
          form.setFieldValue(
            evidenceIdsPath,
            Array.from(new Set([...evidenceIds, ...selectedIds])),
          );
          form.setFieldValue('evidenceRelations', [
            ...relations,
            ...selectedIds.map(evidenceId => ({
              evidenceId,
              partCode,
              itemKey,
            })),
          ]);
          onConfigChange?.();
          setSelectOpen(false);
        }}
      />
    </div>
  );
};

const ConditionNotice = ({ children }: { children: ReactNode }) => (
  <div className={styles.conditionNotice}>
    <ExclamationCircleFilled />
    <span>{children}</span>
  </div>
);

const ConditionApplicableFields = ({
  name,
  label,
  children,
}: {
  name: NamePath;
  label: string;
  children: ReactNode;
}) => (
  <div className={styles.conditionApplicableFields}>
    <Form.Item
      name={[...(name as (string | number)[]), 'applicable']}
      label={label}
      initialValue
    >
      <Radio.Group>
        <Radio value>{I18N.cbamMonitor.yes}</Radio>
        <Radio value={false}>{I18N.cbamMonitor.no}</Radio>
      </Radio.Group>
    </Form.Item>
    <Form.Item noStyle shouldUpdate>
      {({ getFieldValue }) =>
        getFieldValue([...(name as (string | number)[]), 'applicable']) !==
        false ? (
          children
        ) : (
          <Form.Item
            // 选否后无适用必填项，保留统计标记以显示已完成配置。
            data-cbam-required-missing={0}
            name={[...(name as (string | number)[]), 'notApplicableReason']}
            label={I18N.cbamMonitor.notApplicableDescription}
            rules={[{ max: 100 }]}
          >
            <Input maxLength={100} />
          </Form.Item>
        )
      }
    </Form.Item>
  </div>
);

/** 关联选项可同时展示中英文名称，始终使用 itemKey 保存关联。 */
const optionFields = (
  labelKey: 'productName' | 'precursorName' | 'processName' | 'sourceFlowName',
  values: {
    itemKey?: string;
    productName?: string;
    productNameEn?: string;
    precursorName?: string;
    precursorNameEn?: string;
    processName?: string;
    processNameEn?: string;
    sourceFlowName?: string;
  }[] = [],
  englishLabelKey?: 'productNameEn' | 'precursorNameEn' | 'processNameEn',
) =>
  values.flatMap(item => {
    const label = [
      item[labelKey],
      englishLabelKey ? item[englishLabelKey] : undefined,
    ]
      .map(value => value?.trim())
      .filter(Boolean)
      .join(' - ');
    return item.itemKey && label ? [{ label, value: item.itemKey }] : [];
  });

export const ConfigSections = ({
  activeNav,
  countryOptions,
  form,
  factories,
  factory,
  onAddEvidence,
  onEditEvidence,
  onDeleteChild,
  onConfigChange,
  readonly = false,
}: {
  activeNav: string;
  countryOptions: { label: string; value: string }[];
  form: FormInstance<MonitorPlanPayload>;
  factories: FactoryOption[];
  factory?: FactoryOption;
  onAddEvidence?: (
    partCode: number,
    itemKey: string,
    onCreated: (evidenceId: number) => void,
  ) => void;
  onEditEvidence?: (evidenceId: number) => void;
  onDeleteChild?: DeleteChild;
  onConfigChange?: () => void;
  readonly?: boolean;
}) => {
  const productEnglish = useCbamTranslationEnglish('PRODUCT_COMPOSITION');
  const productEnums = productEnglish ? monitorEn : I18N.cbamMonitor;
  const precursorEnglish = useCbamTranslationEnglish(
    'PRECURSOR_SUPPLIER_ORIGIN',
  );
  const precursorEnums = precursorEnglish ? monitorEn : I18N.cbamMonitor;
  const factorEnums = useCbamTranslationEnglish('FACTOR_SAMPLING')
    ? monitorEn
    : I18N.cbamMonitor;
  const pfcEnglish = useCbamTranslationEnglish('PFC_MONITOR');
  const pfcEnums = pfcEnglish ? monitorEn : I18N.cbamMonitor;
  const heatEnums = useCbamTranslationEnglish('MEASURABLE_HEAT')
    ? monitorEn
    : I18N.cbamMonitor;
  const wasteGasEnums = useCbamTranslationEnglish('WASTE_GAS')
    ? monitorEn
    : I18N.cbamMonitor;
  const facilityElectricityEnglish = useCbamTranslationEnglish(
    'FACILITY_ELECTRICITY',
  );
  const electricityEnums = facilityElectricityEnglish
    ? monitorEn
    : I18N.cbamMonitor;
  const factorTypeOptions = [
    [factorEnums.netLowerCalorificValue, 'NCV'],
    [factorEnums.emissionFactor, 'EMISSION_FACTOR'],
    [factorEnums.oxidationFactor, 'OXIDATION_FACTOR'],
    [factorEnums.conversionFactor, 'CONVERSION_FACTOR'],
    [factorEnums.materialCarbonContent, 'CARBON_CONTENT'],
    [factorEnums.biomassContentRatio, 'BIOMASS_FRACTION'],
    [factorEnums.ghgConcentration, 'GHG_CONCENTRATION'],
    [factorEnums.flueGasVolume, 'FLUE_GAS_VOLUME'],
  ].map(([label, value]) => ({ label, value }));
  const looseForm = form as FormInstance;
  const [cnOptions, setCnOptions] = useState<
    { label: string; value: string; cnNameZh?: string; cnNameEn?: string }[]
  >([]);
  // CN 字典保留双语原文，各分组只切换显示标签，不改写编码和功能单位。
  const productCnOptions = useMemo(
    () =>
      cnOptions.map(option => ({
        ...option,
        label: [
          option.value,
          productEnglish ? option.cnNameEn : option.cnNameZh,
        ]
          .filter(Boolean)
          .join(' / '),
      })),
    [cnOptions, productEnglish],
  );
  const precursorCnOptions = useMemo(
    () =>
      cnOptions.map(option => ({
        ...option,
        label: [
          option.value,
          precursorEnglish ? option.cnNameEn : option.cnNameZh,
        ]
          .filter(Boolean)
          .join(' / '),
      })),
    [cnOptions, precursorEnglish],
  );
  const [cnOptionsLoaded, setCnOptionsLoaded] = useState(false);
  const [cnOptionsLoading, setCnOptionsLoading] = useState(false);
  const [selectingPrecursorRow, setSelectingPrecursorRow] = useState<number>();
  const products = Form.useWatch(['goodsBoundary', 'productJson', 'products'], {
    form,
    preserve: true,
  });
  const precursors = Form.useWatch(
    ['goodsBoundary', 'precursorJson', 'precursors'],
    {
      form,
      preserve: true,
    },
  );
  const processes = Form.useWatch(
    ['goodsBoundary', 'processJson', 'processes'],
    {
      form,
      preserve: true,
    },
  );
  const methods = Form.useWatch<ProcessMonitorItem[]>(
    ['directEmission', 'processMonitorJson', 'methods'],
    {
      form,
      preserve: true,
    },
  );
  const factorSamplingItems = Form.useWatch<FactorSamplingItem[]>(
    ['directEmission', 'factorSamplingJson', 'factors'],
    { form, preserve: true },
  );
  const pfcMethods = Form.useWatch<PfcMonitorItem[]>(
    ['directEmission', 'pfcMonitorJson', 'methods'],
    { form, preserve: true },
  );
  const pfcApplicable = Form.useWatch<boolean>(
    ['directEmission', 'pfcMonitorJson', 'applicable'],
    { form, preserve: true },
  );
  const responsibilities = Form.useWatch(
    ['controlConfirmation', 'divideWorkJson', 'responsibilities'],
    form,
  ) as ResponsibilityItem[] | undefined;
  const positionOptions = useMemo(
    () =>
      (responsibilities || [])
        .filter(item => item.positionName)
        .map(item => ({
          label: [item.positionName, item.positionNameEn]
            .filter(value => value?.trim())
            .join(' - '),
          value: item.positionName || '',
        })),
    [responsibilities],
  );
  const refs = useMemo(
    () => ({
      products: optionFields('productName', products, 'productNameEn'),
      precursors: optionFields('precursorName', precursors, 'precursorNameEn'),
      processes: optionFields('processName', processes, 'processNameEn'),
    }),
    [precursors, processes, products],
  );
  const sourceFlowOptions = useMemo(() => {
    const options = new Map<
      string,
      { label: string; labelEn?: string; value: string }
    >();
    for (const item of [...(methods || []), ...(factorSamplingItems || [])]) {
      const label = item.sourceFlowName?.trim() || '';
      const labelEn = item.sourceFlowNameEn?.trim();
      const value = label || item.itemKey;
      if (value && (label || labelEn) && !options.has(value)) {
        options.set(value, { label, labelEn, value });
      }
    }
    return Array.from(options.values());
  }, [factorSamplingItems, methods]);
  const aluminumProcessOptions = useMemo(() => {
    const aluminumProductKeys = new Set(
      (products || [])
        .filter(product => isAluminumCnCode(product.cnCode))
        .map(product => product.itemKey)
        .filter(Boolean),
    );
    return optionFields(
      'processName',
      (processes || []).filter(process =>
        process.productItemKeys?.some(itemKey =>
          aluminumProductKeys.has(itemKey),
        ),
      ),
      'processNameEn',
    );
  }, [processes, products]);
  useEffect(() => {
    if (
      products === undefined ||
      processes === undefined ||
      aluminumProcessOptions.length ||
      pfcApplicable === false
    )
      return;
    form.setFieldValue(
      ['directEmission', 'pfcMonitorJson', 'applicable'],
      false,
    );
    const reasonPath: [
      'directEmission',
      'pfcMonitorJson',
      'notApplicableReason',
    ] = ['directEmission', 'pfcMonitorJson', 'notApplicableReason'];
    if (!form.getFieldValue(reasonPath)?.trim()) {
      form.setFieldValue(reasonPath, I18N.cbamMonitor.pfcNotApplicableDefault);
    }
    onConfigChange?.();
  }, [
    aluminumProcessOptions.length,
    form,
    onConfigChange,
    pfcApplicable,
    processes,
    products,
  ]);
  useEffect(() => {
    if (
      products === undefined ||
      processes === undefined ||
      !pfcMethods?.length
    )
      return;
    const validProcessKeys = new Set(
      aluminumProcessOptions.map(option => option.value),
    );
    let changed = false;
    const nextMethods = pfcMethods.map(method => {
      if (!method.processItemKey || validProcessKeys.has(method.processItemKey))
        return method;
      changed = true;
      return { ...method, processItemKey: undefined };
    });
    if (!changed) return;
    form.setFieldValue(
      ['directEmission', 'pfcMonitorJson', 'methods'],
      nextMethods,
    );
    onConfigChange?.();
  }, [
    aluminumProcessOptions,
    form,
    onConfigChange,
    pfcMethods,
    processes,
    products,
  ]);
  useEffect(() => {
    if (processes === undefined || !methods?.length) return;
    const validProcessKeys = new Set(
      (processes || []).flatMap(process =>
        process.itemKey && process.processName?.trim() ? [process.itemKey] : [],
      ),
    );
    let changed = false;
    const nextMethods = methods.map(method => {
      if (!method.processItemKey || validProcessKeys.has(method.processItemKey))
        return method;
      changed = true;
      return { ...method, processItemKey: undefined };
    });
    if (!changed) return;
    form.setFieldValue(
      ['directEmission', 'processMonitorJson', 'methods'],
      nextMethods,
    );
    onConfigChange?.();
  }, [form, methods, onConfigChange, processes]);
  const removeProcessReference = (
    fieldName: 'productItemKeys' | 'precursorItemKeys',
    itemKey?: string,
  ) => {
    if (!itemKey) return;
    const currentProcesses = form.getFieldValue([
      'goodsBoundary',
      'processJson',
      'processes',
    ]) as ProcessItem[] | undefined;
    let changed = false;
    const nextProcesses = (currentProcesses || []).map(process => {
      const currentItemKeys = process[fieldName];
      const nextItemKeys = currentItemKeys?.filter(
        currentItemKey => currentItemKey !== itemKey,
      );
      if (nextItemKeys?.length === currentItemKeys?.length) return process;
      changed = true;
      return {
        ...process,
        [fieldName]: nextItemKeys,
      };
    });
    if (changed)
      form.setFieldValue(
        ['goodsBoundary', 'processJson', 'processes'],
        nextProcesses,
      );
  };
  const clearListReference = (
    path: (string | number)[],
    fieldName: string,
    itemKey?: string,
  ) => {
    if (!itemKey) return;
    const items = looseForm.getFieldValue(path) as
      | Record<string, unknown>[]
      | undefined;
    const nextItems = (items || []).map(item =>
      item[fieldName] === itemKey ? { ...item, [fieldName]: undefined } : item,
    );
    looseForm.setFieldValue(path, nextItems);
  };
  const removeDependentProcessReferences = (itemKey?: string) => {
    const paths = [
      ['goodsBoundary', 'nonCbamGoodsJson', 'goods'],
      ['directEmission', 'processMonitorJson', 'methods'],
      ['directEmission', 'pfcMonitorJson', 'methods'],
      ['condition', 'measurableHeatJson', 'heatFlows'],
      ['condition', 'facilityElectricityJson', 'generators'],
      ['condition', 'wasteGasJson', 'wasteGasFlows'],
    ];
    paths.forEach(path => clearListReference(path, 'processItemKey', itemKey));
    onConfigChange?.();
  };
  useEffect(() => {
    if (activeNav !== 'goods' || cnOptionsLoaded) return undefined;
    let active = true;
    setCnOptionsLoading(true);
    getMonitorCnOptions()
      .then(({ data }) => {
        if (!active) return;
        const records = data?.data?.records || [];
        setCnOptions(
          records
            .filter(item => item.defaultCode)
            .map(item => ({
              label: [item.defaultCode, item.defaultName]
                .filter(Boolean)
                .join(' / '),
              value: item.defaultCode || '',
              cnNameZh: item.cnNameZh,
              cnNameEn: item.cnNameEn,
            })),
        );
      })
      .catch(() => {
        if (active) setCnOptions([]);
      })
      .finally(() => {
        if (active) {
          setCnOptionsLoading(false);
          setCnOptionsLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [activeNav, cnOptionsLoaded]);
  const handlePrecursorSelected = (record: MonitorPrecursorOption) => {
    if (selectingPrecursorRow === undefined) return;
    const path: ['goodsBoundary', 'precursorJson', 'precursors', number] = [
      'goodsBoundary',
      'precursorJson',
      'precursors',
      selectingPrecursorRow,
    ];
    const current = (form.getFieldValue(path) || {}) as PrecursorItem;
    form.setFieldValue(path, {
      ...current,
      sourceId: record.id,
      cnCode: record.cnCode,
      precursorName: record.precursorName,
      emissionBasis: 'MEASURED_VALUE',
      supplierName: record.supplyName,
      sourceFacility: record.sourceFacility || current.sourceFacility,
      originCountry: record.countryValue || record.countryName,
      verificationPeriod: record.verificationPeriod,
      embeddedEmission: record.embeddedEmission,
    });
    setSelectingPrecursorRow(undefined);
  };

  if (activeNav === 'identity') {
    return (
      <>
        <Section
          className={styles.identityPlanSection}
          title={I18N.cbamMonitor.planDateAndVersion}
        >
          <div className={styles.identityFormGrid}>
            <Form.Item
              name='planName'
              label={I18N.cbamMonitor.planName}
              rules={[{ required: true }]}
            >
              <Input maxLength={100} placeholder={I18N.cbamMonitor.enter} />
            </Form.Item>
            <Form.Item
              name='planDate'
              label={I18N.cbamMonitor.planDate}
              rules={[{ required: true }]}
            >
              <DatePicker />
            </Form.Item>
            <Form.Item
              name='versionNo'
              label={I18N.cbamMonitor.versionNo}
              rules={[
                { required: true },
                { pattern: /^V/, message: I18N.cbamMonitor.versionNoRule },
              ]}
            >
              <Input
                maxLength={40}
                placeholder={I18N.cbamMonitor.versionNoExample}
              />
            </Form.Item>
            <Form.Item
              name='year'
              label={I18N.cbamMonitor.reportingYear}
              rules={[{ required: true }]}
            >
              <Select
                options={Array.from(
                  { length: new Date().getFullYear() - 2023 + 4 },
                  (_, index) => 2023 + index,
                ).map(year => ({ label: year, value: year }))}
              />
            </Form.Item>
            <Form.Item
              name='effectiveDate'
              label={I18N.cbamMonitor.effectiveDate}
              rules={[{ required: true }]}
            >
              <DatePicker />
            </Form.Item>
            <Form.Item
              name='changeReason'
              label={I18N.cbamMonitor.versionChangeReason}
              rules={[{ max: 200 }]}
            >
              <Input
                maxLength={200}
                placeholder={I18N.cbamMonitor.versionChangeReasonHint}
              />
            </Form.Item>
          </div>
        </Section>
        <Section
          title={I18N.cbamMonitor.operatorFacilityIdentification}
          description={I18N.cbamMonitor.operatorFacilityIdentificationHint}
        >
          <div className={styles.identitySubsection}>
            <h4>{I18N.cbamMonitor.factoryIdentificationAndAddress}</h4>
            <div className={styles.identityFormGrid}>
              <Form.Item
                name='factoryId'
                label={I18N.cbamMonitor.factoryName}
                rules={[{ required: true }]}
              >
                <Select
                  showSearch
                  optionFilterProp='label'
                  placeholder={I18N.cbamMonitor.selectFactory}
                  options={factories.map(item => ({
                    label: [item.factorName, item.factoryCode]
                      .filter(Boolean)
                      .join(' / '),
                    value: item.id,
                  }))}
                />
              </Form.Item>
              <ReadOnlyFactoryField
                label={I18N.cbamMonitor.uniqueIdentifier}
                value={factory?.factoryCode}
                required
              />
              <ReadOnlyFactoryField
                label={I18N.cbamMonitor.portUnLocode}
                value={factory?.locationCode}
                required
              />
              <ReadOnlyFactoryField
                label={I18N.cbamMonitor.postalCode}
                value={factory?.postalCode}
                required
              />
              <ReadOnlyFactoryField
                label={I18N.cbamMonitor.country}
                value={factory?.countryName || factory?.country}
                required
              />
              <ReadOnlyFactoryField
                label={I18N.cbamMonitor.city}
                value={factory?.city}
                required
              />
              <ReadOnlyFactoryField
                label={I18N.cbamMonitor.chineseAddress}
                value={factory?.detailedAddress}
                required
              />
              <ReadOnlyFactoryField
                label={I18N.cbamMonitor.englishAddress}
                value={factory?.addressEn}
                required
              />
              <ReadOnlyFactoryField
                label={I18N.cbamMonitor.longitude}
                value={factory?.longitude}
                required
              />
              <ReadOnlyFactoryField
                label={I18N.cbamMonitor.latitude}
                value={factory?.latitude}
                required
              />
            </div>
          </div>
          <div className={styles.identitySubsection}>
            <h4>{I18N.cbamMonitor.operatorInformation}</h4>
            <div className={styles.identityFormGrid}>
              <Form.Item
                name={['facility', 'facilityJson', 'operatorName']}
                label={I18N.cbamMonitor.operatorName}
                rules={[{ required: true, max: 100 }]}
              >
                <Input maxLength={100} placeholder={I18N.cbamMonitor.enter} />
              </Form.Item>
              <Form.Item
                name={['facility', 'facilityJson', 'registNo']}
                label={I18N.cbamMonitor.unifiedSocialCreditCode}
                rules={[{ required: true, max: 40 }]}
              >
                <Input maxLength={40} placeholder={I18N.cbamMonitor.enter} />
              </Form.Item>
            </div>
          </div>
          <div className={styles.identityTextSection}>
            <Form.Item
              name={['facility', 'facilityJson', 'activityOverview']}
              label={I18N.cbamMonitor.facilityActivityOverview}
              rules={[{ required: true, max: 1000 }]}
            >
              <Input.TextArea
                className={styles.identityTextArea}
                maxLength={1000}
                placeholder={I18N.cbamMonitor.enter}
              />
            </Form.Item>
          </div>
          <div className={styles.identityTextSection}>
            <Form.Item
              name={['facility', 'facilityJson', 'processDescription']}
              label={I18N.cbamMonitor.processDescription}
              rules={[{ required: true, max: 1000 }]}
            >
              <Input.TextArea
                className={styles.identityTextArea}
                maxLength={1000}
                placeholder={I18N.cbamMonitor.enter}
              />
            </Form.Item>
          </div>
        </Section>
      </>
    );
  }

  if (activeNav === 'goods') {
    const goodsCollapseItems = [
      {
        key: 'products',
        label: (
          <span>
            {I18N.cbamMonitor.productListComposition}
            <CbamTranslationControls groupId='PRODUCT_COMPOSITION' />
          </span>
        ),
        children: (
          <GoodsTableSection
            name={['goodsBoundary', 'productJson', 'products']}
            addText={I18N.cbamMonitor.addGoods}
            deleteTarget='PRODUCT'
            onDeleteChild={onDeleteChild}
            onRemove={itemKey =>
              removeProcessReference('productItemKeys', itemKey)
            }
            requiredRows
            fields={[
              {
                name: 'cnCode',
                label: I18N.cbamMonitor.cnCode,
                kind: 'select',
                required: true,
                options: productCnOptions,
                loading: cnOptionsLoading,
                searchable: true,
                strictOptions: true,
                onChange: (value, rowName) => {
                  // 仅成功选中 CN 编码时生成，清空编码不改写功能单位。
                  const option = cnOptions.find(item => item.value === value);
                  if (!option) return;
                  const code = String(value).replace(/\s/g, '');
                  const unit = code === '27160000' ? 'MWh' : 't';
                  const cnName =
                    option.cnNameZh ||
                    option.label.split(' / ').slice(1).join(' / ');
                  form.setFieldValue(
                    [
                      'goodsBoundary',
                      'productJson',
                      'products',
                      rowName,
                      'functionalUnit',
                    ],
                    `1${unit}${cnName}`,
                  );
                  const englishPath = [
                    'goodsBoundary',
                    'productJson',
                    'products',
                    rowName,
                    'functionalUnitEn',
                  ];
                  if (
                    !looseForm.getFieldValue(englishPath) &&
                    option.cnNameEn
                  ) {
                    looseForm.setFieldValue(
                      englishPath,
                      `1${unit}${option.cnNameEn}`,
                    );
                  }
                  onConfigChange?.();
                },
              },
              {
                name: 'productName',
                label: I18N.cbamMonitor.productName,
                required: true,
                max: 40,
              },
              {
                name: 'functionalUnit',
                label: I18N.cbamMonitor.functionalUnit,
                required: true,
                max: 500,
              },
              {
                name: 'productType',
                label: I18N.cbamMonitor.productType,
                kind: 'select',
                required: true,
                options: [
                  {
                    label: productEnums.soldProduct,
                    value: 'SOLD_PRODUCT',
                  },
                  {
                    label: productEnums.intermediateProduct,
                    value: 'INTERMEDIATE_PRODUCT',
                  },
                ],
              },
            ]}
          />
        ),
      },
      {
        key: 'precursors',
        label: (
          <span>
            {I18N.cbamMonitor.purchasedPrecursors}
            <CbamTranslationControls groupId='PRECURSOR_SUPPLIER_ORIGIN' />
          </span>
        ),
        children: (
          <GoodsTableSection
            name={['goodsBoundary', 'precursorJson', 'precursors']}
            addText={I18N.cbamMonitor.addPrecursor}
            actionWidth={80}
            columnMinWidth={140}
            deleteTarget='PRECURSOR'
            onDeleteChild={onDeleteChild}
            onRemove={itemKey =>
              removeProcessReference('precursorItemKeys', itemKey)
            }
            requiredRows
            fields={[
              {
                name: 'cnCode',
                label: I18N.cbamMonitor.cnCode,
                kind: 'select',
                required: true,
                options: precursorCnOptions,
                loading: cnOptionsLoading,
                searchable: true,
                strictOptions: true,
              },
              {
                name: 'precursorName',
                label: I18N.cbamMonitor.precursorName,
                required: true,
                max: 40,
              },
              {
                name: 'emissionBasis',
                label: I18N.cbamMonitor.emissionDataBasis,
                kind: 'select',
                required: true,
                options: [
                  {
                    label: precursorEnums.measuredValue,
                    value: 'MEASURED_VALUE',
                  },
                  {
                    label: precursorEnums.defaultValue,
                    value: 'DEFAULT_VALUE',
                  },
                ],
              },
              {
                name: 'supplierName',
                label: I18N.cbamMonitor.supplierName,
                required: true,
                max: 40,
              },
              {
                name: 'sourceFacility',
                label: I18N.cbamMonitor.sourceFacility,
                tooltip: I18N.cbamMonitor.sourceFacilityHint,
                required: true,
                max: 40,
              },
              {
                name: 'originCountry',
                label: I18N.cbamMonitor.countryOfOrigin,
                kind: 'select',
                required: true,
                options: countryOptions,
                searchable: true,
              },
            ]}
          />
        ),
      },
      {
        key: 'processes',
        label: (
          <span>
            {I18N.cbamMonitor.processGoodsMapping}
            <CbamTranslationControls groupId='PROCESS_GOODS' />
          </span>
        ),
        children: (
          <GoodsTableSection
            name={['goodsBoundary', 'processJson', 'processes']}
            addText={I18N.cbamMonitor.addProcess}
            actionWidth={80}
            deleteTarget='PROCESS'
            onDeleteChild={onDeleteChild}
            onRemove={removeDependentProcessReferences}
            fields={[
              {
                name: 'processName',
                label: I18N.cbamMonitor.processName,
                required: true,
                max: 40,
                minWidth: 140,
              },
              {
                name: 'productItemKeys',
                label: I18N.cbamMonitor.relatedProducts,
                kind: 'singleArray',
                required: true,
                options: refs.products,
                searchable: true,
                minWidth: 280,
                flex: 2,
              },
              {
                name: 'precursorItemKeys',
                label: I18N.cbamMonitor.relatedPrecursors,
                kind: 'multi',
                required: true,
                options: refs.precursors,
                searchable: true,
                minWidth: 180,
              },
              {
                name: 'productionRoute',
                label: I18N.cbamMonitor.productionRoute,
                required: true,
                max: 40,
                minWidth: 140,
              },
              {
                name: 'description',
                label: I18N.cbamMonitor.processDetail,
                required: true,
                max: 200,
                minWidth: 220,
              },
            ]}
          />
        ),
      },
      {
        key: 'nonCbamGoods',
        label: (
          <span>
            {I18N.cbamMonitor.nonCbamGoodsAllocation}
            <CbamTranslationControls groupId='NON_CBAM_GOODS' />
          </span>
        ),
        children: (
          <GoodsTableSection
            name={['goodsBoundary', 'nonCbamGoodsJson', 'goods']}
            requiredRows
            addText={I18N.cbamMonitor.addNonCbamGoods}
            deleteTarget='NON_CBAM_GOODS'
            onDeleteChild={onDeleteChild}
            fields={[
              {
                name: 'processItemKey',
                label: I18N.cbamMonitor.process,
                kind: 'select',
                required: true,
                options: refs.processes,
                searchable: true,
              },
              {
                name: 'goodsName',
                label: I18N.cbamMonitor.goodsName,
                required: true,
                max: 40,
              },
              {
                name: 'allocationMethod',
                label: I18N.cbamMonitor.allocationMethod,
                required: true,
                max: 200,
              },
              {
                name: 'allocationRate',
                label: I18N.cbamMonitor.allocationRate,
                tooltip: I18N.cbamMonitor.allocationRateHint,
                kind: 'number',
                required: true,
                max: 100,
              },
            ]}
          />
        ),
      },
      {
        key: 'systemBoundary',
        label: (
          <span>
            {I18N.cbamMonitor.systemBoundaryDiagram}
            <CbamTranslationControls groupId='SYSTEM_BOUNDARY' />
          </span>
        ),
        children: (
          <div className={styles.goodsBoundaryForm}>
            <Form.Item
              name={['goodsBoundary', 'systemBoundaryJson', 'files']}
              label={I18N.cbamMonitor.systemBoundaryFile}
              rules={[
                {
                  required: true,
                  type: 'array',
                  min: 1,
                  message: I18N.cbamMonitor.uploadBoundaryFile,
                },
              ]}
            >
              <FileObjectUpload
                disabled={readonly}
                maxCount={5}
                maxSize={20}
                variant='boundary'
                onDelete={file =>
                  onDeleteChild?.({
                    target: 'SYSTEM_BOUNDARY_FILE',
                    fileUrl: file.url,
                    fileName: file.name,
                    uploadTime: file.uploadTime,
                  })
                }
              />
            </Form.Item>
            <Form.Item
              name={[
                'goodsBoundary',
                'systemBoundaryJson',
                'boundaryDescription',
              ]}
              label={I18N.cbamMonitor.systemBoundaryDescription}
              rules={[{ required: true, max: 1000 }]}
            >
              <Input.TextArea
                className={styles.boundaryDescription}
                maxLength={1000}
              />
            </Form.Item>
          </div>
        ),
      },
    ];
    return (
      <>
        <Collapse
          className={styles.goodsCollapse}
          defaultActiveKey='products'
          expandIcon={({ isActive }) => (
            <DownOutlined rotate={isActive ? 0 : -90} />
          )}
          items={goodsCollapseItems.map(item => ({
            ...item,
            forceRender: true,
          }))}
        />
        <PrecursorSelectModal
          cnOptions={precursorCnOptions}
          open={selectingPrecursorRow !== undefined}
          onCancel={() => setSelectingPrecursorRow(undefined)}
          onConfirm={handlePrecursorSelected}
        />
      </>
    );
  }

  if (activeNav === 'direct') {
    const directCollapseItems = [
      {
        key: 'processMonitor',
        label: (
          <span>
            {I18N.cbamMonitor.processMonitoringMethods}
            <CbamTranslationControls groupId='DATA_MONITOR_METHOD' />
          </span>
        ),
        children: (
          <ProcessMonitorSection
            form={form}
            onMethodsChange={onConfigChange}
            processes={processes}
            sourceFlowOptions={sourceFlowOptions}
            onAddEvidence={(itemKey, onCreated) =>
              onAddEvidence?.(1, itemKey, onCreated)
            }
            onEditEvidence={onEditEvidence}
            onDeleteChild={onDeleteChild}
          />
        ),
      },
      {
        key: 'factorSampling',
        label: (
          <span>
            {I18N.cbamMonitor.calculationFactorsSampling}
            <CbamTranslationControls groupId='FACTOR_SAMPLING' />
          </span>
        ),
        children: (
          <GoodsTableSection
            name={['directEmission', 'factorSamplingJson', 'factors']}
            normalizeItem={item => {
              const method = methods?.find(
                value => value.itemKey === item.processMonitorItemKey,
              );
              return {
                ...item,
                sourceFlowName: method?.sourceFlowName || item.sourceFlowName,
                factorType: (method
                  ? methodFactorTypes(method)
                  : factorTypeOptions.map(option => option.value)
                ).includes(String(item.factorType))
                  ? item.factorType
                  : undefined,
              };
            }}
            addText={I18N.cbamMonitor.addCalculationFactor}
            deleteTarget='FACTOR_SAMPLING'
            onDeleteChild={onDeleteChild}
            actionWidth={DIRECT_ACTION_WIDTH}
            columnMinWidth={160}
            evidencePartCode={2}
            editText={I18N.cbamMonitor.editCalculationFactor}
            onAddEvidence={(itemKey, onCreated) =>
              onAddEvidence?.(2, itemKey, onCreated)
            }
            onEditEvidence={onEditEvidence}
            fields={[
              {
                name: 'sourceFlowName',
                label: I18N.cbamMonitor.sourceFlow,
                kind: 'factorSource',
                required: true,
                max: 40,
                options: (methods || [])
                  .filter(
                    method =>
                      method.itemKey &&
                      (method.sourceFlowName || method.sourceFlowNameEn),
                  )
                  .map(method => ({
                    label: method.sourceFlowName || '',
                    labelEn: method.sourceFlowNameEn,
                    value: method.itemKey || '',
                  })),
              },
              {
                name: 'factorType',
                label: I18N.cbamMonitor.factorType,
                kind: 'select',
                required: true,
                searchable: true,
                strictOptions: true,
                options: factorTypeOptions,
                optionsFor: values => {
                  const method = methods?.find(
                    item => item.itemKey === values.processMonitorItemKey,
                  );
                  return method
                    ? factorTypeOptions.filter(option =>
                        methodFactorTypes(method).includes(option.value),
                      )
                    : factorTypeOptions;
                },
              },
              {
                name: 'acquisitionPath',
                label: I18N.cbamMonitor.acquisitionPath,
                max: 40,
              },
              {
                name: 'sourceName',
                label: I18N.cbamMonitor.source,
                required: true,
                max: 40,
              },
              {
                name: 'sourceVersion',
                label: I18N.cbamMonitor.sourceVersion,
                max: 40,
              },
              {
                name: 'samplingPlan',
                label: I18N.cbamMonitor.samplingPlan,
                kind: 'textarea',
                required: true,
                max: 200,
              },
              {
                name: 'laboratory',
                label: I18N.cbamMonitor.laboratory,
                tooltip: I18N.cbamMonitor.laboratoryHint,
                required: true,
                max: 40,
              },
              {
                name: 'laboratoryMethod',
                label: I18N.cbamMonitor.laboratoryMethod,
                tooltip: I18N.cbamMonitor.laboratoryMethodHint,
                required: true,
                max: 1000,
              },
            ]}
          />
        ),
      },
      {
        key: 'pfcMonitor',
        label: (
          <span>
            {I18N.cbamMonitor.pfcMonitoring}
            <CbamTranslationControls groupId='PFC_MONITOR' />
          </span>
        ),
        children: (
          <div className={styles.directApplicableContent}>
            <Form.Item
              className={styles.pfcApplicableToggle}
              name={['directEmission', 'pfcMonitorJson', 'applicable']}
              label={I18N.cbamMonitor.applicable}
              initialValue
            >
              <Radio.Group
                onChange={event => {
                  const reasonPath: [
                    'directEmission',
                    'pfcMonitorJson',
                    'notApplicableReason',
                  ] = [
                    'directEmission',
                    'pfcMonitorJson',
                    'notApplicableReason',
                  ];
                  if (
                    !event.target.value &&
                    !form.getFieldValue(reasonPath)?.trim()
                  ) {
                    form.setFieldValue(
                      reasonPath,
                      I18N.cbamMonitor.pfcNotApplicableDefault,
                    );
                  }
                }}
              >
                <Radio value disabled={!aluminumProcessOptions.length}>
                  {I18N.cbamMonitor.yes}
                </Radio>
                <Radio value={false}>{I18N.cbamMonitor.no}</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue }) =>
                getFieldValue([
                  'directEmission',
                  'pfcMonitorJson',
                  'applicable',
                ]) !== false ? (
                  <div className={styles.pfcApplicableConfiguration}>
                    <ConditionNotice>
                      {I18N.cbamMonitor.pfcMonitoringNotice}
                    </ConditionNotice>
                    <GoodsTableSection
                      name={['directEmission', 'pfcMonitorJson', 'methods']}
                      addText={I18N.cbamMonitor.addPfcMethod}
                      deleteTarget='PFC_MONITOR'
                      onDeleteChild={onDeleteChild}
                      actionWidth={DIRECT_ACTION_WIDTH}
                      columnMinWidth={160}
                      evidencePartCode={3}
                      borderless
                      editText={I18N.cbamMonitor.editPfcMethod}
                      onAddEvidence={(itemKey, onCreated) =>
                        onAddEvidence?.(3, itemKey, onCreated)
                      }
                      onEditEvidence={onEditEvidence}
                      normalizeItem={item => ({
                        ...item,
                        processItemKey: aluminumProcessOptions.some(
                          option => option.value === item.processItemKey,
                        )
                          ? item.processItemKey
                          : undefined,
                        formulaCode: pfcFormulaCode(item.method as string),
                      })}
                      fields={[
                        {
                          name: 'processItemKey',
                          label: I18N.cbamMonitor.processName,
                          kind: 'select',
                          required: true,
                          options: aluminumProcessOptions,
                          searchable: true,
                          placeholder: I18N.cbamMonitor.enterOrSelect,
                          minWidth: 180,
                        },
                        {
                          name: 'technology',
                          label: I18N.cbamMonitor.technologyType,
                          required: true,
                          max: 40,
                        },
                        {
                          name: 'method',
                          label: I18N.cbamMonitor.method,
                          kind: 'select',
                          required: true,
                          options: [
                            {
                              label: pfcEnums.slopeMethod,
                              value: 'SLOPE_METHOD',
                            },
                            {
                              label: pfcEnums.overvoltageMethod,
                              value: 'OVERVOLTAGE_METHOD',
                            },
                          ],
                        },
                        {
                          name: 'formulaCode',
                          label: I18N.cbamMonitor.calculationFormula,
                          kind: 'readonly',
                          minWidth: 360,
                          multiline: true,
                          formatValue: value => pfcFormulaText(value as string),
                          renderTableValue: value => {
                            const { formula, description } =
                              monitorFormulaDetails(value as string);
                            return (
                              <Tooltip title={description || undefined}>
                                <span>{formula}</span>
                              </Tooltip>
                            );
                          },
                        },
                        {
                          name: 'dataSource',
                          label: I18N.cbamMonitor.dataSource,
                          required: true,
                          max: 40,
                        },
                        {
                          name: 'frequency',
                          label: I18N.cbamMonitor.monitoringFrequency,
                          kind: 'frequency',
                          renderTableValue: (value, rowName) =>
                            monitoringFrequencyDisplayValue(
                              String(value || ''),
                              pfcMethods?.[rowName]?.frequencyEn,
                              pfcEnglish,
                            ),
                          required: true,
                          max: 40,
                        },
                        {
                          name: 'equipment',
                          label: I18N.cbamMonitor.measuringEquipment,
                          required: true,
                          max: 40,
                        },
                        {
                          name: 'location',
                          label: I18N.cbamMonitor.equipmentLocation,
                          max: 40,
                        },
                        {
                          name: 'uncertainty',
                          label: I18N.cbamMonitor.uncertainty,
                          tooltip: I18N.cbamMonitor.uncertaintyHint,
                          max: 10,
                        },
                        {
                          name: 'calibration',
                          label: I18N.cbamMonitor.calibrationMethod,
                          required: true,
                          max: 200,
                        },
                        {
                          name: 'missingDataMethod',
                          label: I18N.cbamMonitor.missingDataMethod,
                          kind: 'textarea',
                          max: 1000,
                          minWidth: 220,
                        },
                      ]}
                    />
                  </div>
                ) : (
                  <Form.Item
                    // PFC不适用时与其他条件项使用相同的完成提示。
                    data-cbam-required-missing={0}
                    name={[
                      'directEmission',
                      'pfcMonitorJson',
                      'notApplicableReason',
                    ]}
                    label={I18N.cbamMonitor.notApplicableDescription}
                    initialValue={I18N.cbamMonitor.pfcNotApplicableDefault}
                    rules={[{ max: 100 }]}
                  >
                    <Input maxLength={100} />
                  </Form.Item>
                )
              }
            </Form.Item>
          </div>
        ),
      },
    ];
    return (
      <Collapse
        className={styles.goodsCollapse}
        defaultActiveKey='processMonitor'
        expandIcon={({ isActive }) => (
          <DownOutlined rotate={isActive ? 0 : -90} />
        )}
        items={directCollapseItems.map(item => ({
          ...item,
          forceRender: true,
        }))}
      />
    );
  }

  if (activeNav === 'condition') {
    const conditionCollapseItems = [
      {
        key: 'zeroRatedFuel',
        label: (
          <span>
            {I18N.cbamMonitor.zeroRatedFuels}
            <CbamTranslationControls groupId='ZERO_RATED_FUEL' />
          </span>
        ),
        children: (
          <div className={styles.conditionGroupContent}>
            <ConditionApplicableFields
              name={['condition', 'zeroRatedFuelJson']}
              label={I18N.template(I18N.cbamMonitor.whetherApplicable, {
                item: I18N.cbamMonitor.zeroRatedFuels,
              })}
            >
              <div className={styles.conditionFields}>
                <Form.Item
                  name={['condition', 'zeroRatedFuelJson', 'description']}
                  label={I18N.cbamMonitor.zeroRatedFuelDescription}
                  rules={[{ required: true, max: 1000 }]}
                >
                  <Input.TextArea
                    className={styles.conditionTextArea}
                    maxLength={1000}
                  />
                </Form.Item>
                <Form.Item
                  name={[
                    'condition',
                    'zeroRatedFuelJson',
                    'additionalDescription',
                  ]}
                  label={I18N.cbamMonitor.description}
                  rules={[{ max: 1000 }]}
                >
                  <Input.TextArea
                    className={styles.conditionTextArea}
                    maxLength={1000}
                    placeholder={
                      I18N.cbamMonitor
                        .zeroRatedFuelAdditionalDescriptionPlaceholder
                    }
                  />
                </Form.Item>
                <ConditionEvidenceLink
                  name={['condition', 'zeroRatedFuelJson']}
                  partCode={4}
                  onAddEvidence={onAddEvidence}
                  onEditEvidence={onEditEvidence}
                  onDeleteChild={onDeleteChild}
                  onConfigChange={onConfigChange}
                />
              </div>
            </ConditionApplicableFields>
          </div>
        ),
      },
      {
        key: 'measurableHeat',
        label: (
          <span>
            {I18N.cbamMonitor.measurableHeatFlows}
            <CbamTranslationControls groupId='MEASURABLE_HEAT' />
          </span>
        ),
        children: (
          <div className={styles.conditionGroupContent}>
            <ConditionApplicableFields
              name={['condition', 'measurableHeatJson']}
              label={I18N.cbamMonitor.measurableHeatQuestion}
            >
              <GoodsTableSection
                name={['condition', 'measurableHeatJson', 'heatFlows']}
                addText={I18N.cbamMonitor.addHeatFlow}
                columnMinWidth={160}
                deleteTarget='MEASURABLE_HEAT'
                onDeleteChild={onDeleteChild}
                actionWidth={DIRECT_ACTION_WIDTH}
                evidencePartCode={5}
                editText={I18N.cbamMonitor.editHeatFlow}
                onAddEvidence={(itemKey, onCreated) =>
                  onAddEvidence?.(5, itemKey, onCreated)
                }
                onEditEvidence={onEditEvidence}
                fields={[
                  {
                    name: 'direction',
                    label: I18N.cbamMonitor.direction,
                    kind: 'select',
                    required: true,
                    options: [
                      { label: heatEnums.input, value: 'INPUT' },
                      { label: heatEnums.output, value: 'OUTPUT' },
                    ],
                  },
                  {
                    name: 'medium',
                    label: I18N.cbamMonitor.medium,
                    kind: 'autocomplete',
                    required: true,
                    max: 40,
                    options: [
                      I18N.cbamMonitor.steam,
                      I18N.cbamMonitor.hotWater,
                      I18N.cbamMonitor.other,
                    ].map(value => ({ label: value, value })),
                    placeholder: I18N.cbamMonitor.enterOrSelect,
                  },
                  {
                    name: 'counterparty',
                    label: I18N.cbamMonitor.counterpartyFacility,
                    max: 40,
                  },
                  {
                    name: 'processItemKey',
                    label: I18N.cbamMonitor.belongingProcess,
                    kind: 'select',
                    required: true,
                    options: refs.processes,
                    searchable: true,
                  },
                  {
                    name: 'allocationMethod',
                    label: I18N.cbamMonitor.emissionAllocationMethod,
                    required: true,
                    max: 100,
                  },
                  {
                    name: 'meteringPoint',
                    label: I18N.cbamMonitor.meteringPoint,
                    required: true,
                    max: 100,
                  },
                ]}
              />
            </ConditionApplicableFields>
          </div>
        ),
      },
      {
        key: 'facilityElectricity',
        label: (
          <span>
            {I18N.cbamMonitor.onsiteElectricityEvidence}
            <CbamTranslationControls groupId='FACILITY_ELECTRICITY' />
          </span>
        ),
        children: (
          <div className={styles.conditionGroupContent}>
            <div
              className={`${styles.conditionSubsection} ${styles.facilityGenerationSubsection}`}
            >
              <ConditionApplicableFields
                name={['condition', 'facilityElectricityJson']}
                label={I18N.cbamMonitor.onsiteElectricityGeneration}
              >
                <GoodsTableSection
                  name={['condition', 'facilityElectricityJson', 'generators']}
                  addText={I18N.cbamMonitor.addGenerator}
                  columnMinWidth={180}
                  deleteTarget='FACILITY_ELECTRICITY'
                  onDeleteChild={onDeleteChild}
                  actionWidth={DIRECT_ACTION_WIDTH}
                  evidencePartCode={6}
                  editText={I18N.cbamMonitor.editGenerator}
                  onAddEvidence={(itemKey, onCreated) =>
                    onAddEvidence?.(6, itemKey, onCreated)
                  }
                  onEditEvidence={onEditEvidence}
                  fields={[
                    {
                      name: 'generationMode',
                      label: I18N.cbamMonitor.generationMode,
                      required: true,
                      max: 40,
                    },
                    {
                      name: 'energyProperty',
                      label: I18N.cbamMonitor.energyProperty,
                      kind: 'energy',
                      required: true,
                      formatValue: value =>
                        energyPropertyLabel(
                          String(value || ''),
                          facilityElectricityEnglish,
                        ),
                    },
                    {
                      name: 'includedInOutputBoundary',
                      label: I18N.cbamMonitor.includedInOutputBoundary,
                      kind: 'select',
                      required: true,
                      options: [
                        { label: electricityEnums.yes, value: true },
                        { label: electricityEnums.no, value: false },
                      ],
                    },
                    {
                      name: 'processItemKey',
                      label: I18N.cbamMonitor.belongingProcess,
                      kind: 'select',
                      required: true,
                      options: refs.processes,
                      searchable: true,
                    },
                    {
                      name: 'meteringMethod',
                      label: I18N.cbamMonitor.meteringMethod,
                      tooltip: I18N.cbamMonitor.meteringAllocationMethodHint,
                      kind: 'select',
                      required: true,
                      options: electricityMethodOptions(
                        facilityElectricityEnglish,
                      ).metering,
                    },
                    {
                      name: 'allocationMethod',
                      label: I18N.cbamMonitor.allocationMethod,
                      kind: 'select',
                      required: true,
                      options: electricityMethodOptions(
                        facilityElectricityEnglish,
                      ).allocation,
                    },
                  ]}
                />
              </ConditionApplicableFields>
            </div>
            <div
              className={`${styles.conditionSubsection} ${styles.electricityFactorSubsection}`}
            >
              <h4>{I18N.cbamMonitor.electricityFactorMeasuredInfo}</h4>
              <ConditionApplicableFields
                name={['condition', 'electricityFactorJson']}
                label={I18N.template(I18N.cbamMonitor.whetherApplicable, {
                  item: I18N.cbamMonitor.electricityFactorMeasuredInfo,
                })}
              >
                <Form.Item
                  name={['condition', 'electricityFactorJson', 'description']}
                  label={I18N.cbamMonitor.indirectEmissionEvidenceDescription}
                  rules={[{ required: true, max: 1000 }]}
                >
                  <Input.TextArea
                    className={styles.conditionTextArea}
                    maxLength={1000}
                    placeholder={
                      I18N.cbamMonitor.indirectEmissionEvidencePlaceholder
                    }
                  />
                </Form.Item>
                <Form.Item
                  name={[
                    'condition',
                    'electricityFactorJson',
                    'additionalDescription',
                  ]}
                  label={I18N.cbamMonitor.description}
                  rules={[{ max: 1000 }]}
                >
                  <Input.TextArea
                    className={styles.conditionTextArea}
                    maxLength={1000}
                    placeholder={
                      I18N.cbamMonitor
                        .electricityFactorAdditionalDescriptionPlaceholder
                    }
                  />
                </Form.Item>
              </ConditionApplicableFields>
            </div>
            <ConditionEvidenceLink
              name={['condition', 'electricityFactorJson']}
              partCode={6}
              hint={I18N.cbamMonitor.electricityProofMaterialsHint}
              onAddEvidence={onAddEvidence}
              onEditEvidence={onEditEvidence}
              onDeleteChild={onDeleteChild}
              onConfigChange={onConfigChange}
            />
          </div>
        ),
      },
      {
        key: 'wasteGas',
        label: (
          <span>
            {I18N.cbamMonitor.wasteGasTransfers}
            <CbamTranslationControls groupId='WASTE_GAS' />
          </span>
        ),
        children: (
          <div className={styles.conditionGroupContent}>
            <ConditionApplicableFields
              name={['condition', 'wasteGasJson']}
              label={I18N.template(I18N.cbamMonitor.whetherApplicable, {
                item: I18N.cbamMonitor.wasteGasTransfers,
              })}
            >
              <GoodsTableSection
                name={['condition', 'wasteGasJson', 'wasteGasFlows']}
                addText={I18N.cbamMonitor.addWasteGas}
                columnMinWidth={180}
                deleteTarget='WASTE_GAS'
                onDeleteChild={onDeleteChild}
                actionWidth={DIRECT_ACTION_WIDTH}
                evidencePartCode={7}
                editText={I18N.cbamMonitor.editWasteGas}
                onAddEvidence={(itemKey, onCreated) =>
                  onAddEvidence?.(7, itemKey, onCreated)
                }
                onEditEvidence={onEditEvidence}
                fields={[
                  {
                    name: 'wasteGasType',
                    label: I18N.cbamMonitor.wasteGasType,
                    required: true,
                    max: 40,
                  },
                  {
                    name: 'flowModes',
                    label: I18N.cbamMonitor.mode,
                    kind: 'multi',
                    options: [
                      { label: wasteGasEnums.produce, value: 'PRODUCE' },
                      { label: wasteGasEnums.use, value: 'USE' },
                      { label: wasteGasEnums.input, value: 'INPUT' },
                      { label: wasteGasEnums.output, value: 'OUTPUT' },
                    ],
                  },
                  {
                    name: 'counterparty',
                    label: I18N.cbamMonitor.counterpartyFacility,
                    max: 40,
                  },
                  {
                    name: 'processItemKey',
                    label: I18N.cbamMonitor.belongingProcess,
                    kind: 'select',
                    required: true,
                    options: refs.processes,
                    searchable: true,
                  },
                  {
                    name: 'method',
                    label: I18N.cbamMonitor.monitoringAllocationMethod,
                    tooltip: I18N.cbamMonitor.monitoringAllocationMethodHint,
                    required: true,
                    max: 100,
                  },
                ]}
              />
            </ConditionApplicableFields>
          </div>
        ),
      },
      {
        key: 'co2Stage',
        label: (
          <span>
            {I18N.cbamMonitor.co2CaptureUse}
            <CbamTranslationControls groupId='CO2_STAGE' />
          </span>
        ),
        children: (
          <div className={styles.conditionGroupContent}>
            <ConditionApplicableFields
              name={['condition', 'co2StageJson']}
              label={I18N.cbamMonitor.applicable}
            >
              <div
                className={`${styles.conditionFields} ${styles.conditionCompactFields}`}
              >
                <ConditionNotice>
                  {I18N.cbamMonitor.co2ApplicabilityNotice}
                </ConditionNotice>
                <ConditionEvidenceLink
                  name={['condition', 'co2StageJson']}
                  partCode={8}
                  onAddEvidence={onAddEvidence}
                  onEditEvidence={onEditEvidence}
                  onDeleteChild={onDeleteChild}
                  onConfigChange={onConfigChange}
                  label={I18N.cbamMonitor.co2EvidenceTitle}
                  hint={I18N.cbamMonitor.co2EvidenceHint}
                />
              </div>
            </ConditionApplicableFields>
          </div>
        ),
      },
    ];
    return (
      <Collapse
        className={`${styles.goodsCollapse} ${styles.conditionCollapse}`}
        defaultActiveKey='zeroRatedFuel'
        expandIcon={({ isActive }) => (
          <DownOutlined rotate={isActive ? 0 : -90} />
        )}
        items={conditionCollapseItems.map(item => ({
          ...item,
          forceRender: true,
        }))}
      />
    );
  }

  const controlCollapseItems = [
    {
      key: 'managementEvaluation',
      label: (
        <span>
          {I18N.cbamMonitor.managementResponsibilitiesEvaluation}
          <CbamTranslationControls groupId='MANAGEMENT' />
        </span>
      ),
      children: (
        <div className={styles.controlGroupContent}>
          <ResponsibilitySection onDeleteChild={onDeleteChild} />
          <ProcedureListSection
            title={I18N.cbamMonitor.managementEvaluation}
            groupId='MANAGEMENT'
            name={['controlConfirmation', 'manageEvaluateJson', 'procedures']}
            positionOptions={positionOptions}
            management
            deleteTarget='MANAGE_EVALUATE_PROCEDURE'
            onDeleteChild={onDeleteChild}
            fixedTitles={{
              RESPONSIBILITY_ASSIGNMENT:
                I18N.cbamMonitor.responsibilityAssignmentProcedure,
              PLAN_REGULAR_EVALUATION:
                I18N.cbamMonitor.planRegularEvaluationProcedure,
              IMPROVEMENT_REPORT_DEADLINE:
                I18N.cbamMonitor.improvementReportDeadlineProcedure,
            }}
          />
        </div>
      ),
    },
    {
      key: 'dataFlow',
      label: (
        <span>
          {I18N.cbamMonitor.dataFlowActivities}
          <CbamTranslationControls groupId='DATA_FLOW' />
        </span>
      ),
      children: (
        <ProcedureListSection
          groupId='DATA_FLOW'
          name={['controlConfirmation', 'dataFlowJson', 'procedures']}
          positionOptions={positionOptions}
          numbered={false}
          fixedTitles={{ DATA_FLOW: I18N.cbamMonitor.dataFlowProcedure }}
          deleteTarget='DATA_FLOW_PROCEDURE'
          onDeleteChild={onDeleteChild}
        />
      ),
    },
    {
      key: 'controlActivity',
      label: (
        <span>
          {I18N.cbamMonitor.controlActivities}
          <CbamTranslationControls groupId='CONTROL_ACTIVITY' />
        </span>
      ),
      children: (
        <div className={styles.controlGroupContent}>
          <div className={styles.controlActivityMeta}>
            <Form.Item
              name={[
                'controlConfirmation',
                'controlActivityJson',
                'writtenRiskAssessmentRef',
              ]}
              label={I18N.cbamMonitor.writtenRiskAssessmentReference}
              rules={[{ max: 200 }]}
            >
              <Input maxLength={200} placeholder={I18N.cbamMonitor.enter} />
            </Form.Item>
            <Form.Item
              name={[
                'controlConfirmation',
                'controlActivityJson',
                'includedInEnvironmentalManagementSystem',
              ]}
              label={I18N.cbamMonitor.includedInEnvironmentalManagementSystem}
              initialValue
            >
              <Radio.Group>
                <Radio value>{I18N.cbamMonitor.yes}</Radio>
                <Radio value={false}>{I18N.cbamMonitor.no}</Radio>
              </Radio.Group>
            </Form.Item>
          </div>
          <ProcedureListSection
            groupId='CONTROL_ACTIVITY'
            name={['controlConfirmation', 'controlActivityJson', 'procedures']}
            positionOptions={positionOptions}
            deleteTarget='CONTROL_ACTIVITY_PROCEDURE'
            onDeleteChild={onDeleteChild}
            fixedTitles={{
              RISK_ASSESSMENT: I18N.cbamMonitor.riskAssessmentProcedure,
              MEASUREMENT_QUALITY_ASSURANCE:
                I18N.cbamMonitor.measurementQualityAssuranceProcedure,
              IT_QUALITY_ASSURANCE:
                I18N.cbamMonitor.itQualityAssuranceProcedure,
              INTERNAL_REVIEW: I18N.cbamMonitor.internalReviewProcedure,
              CORRECTIVE_ACTION: I18N.cbamMonitor.correctiveActionProcedure,
              OUTSOURCED_PROCESS: I18N.cbamMonitor.outsourcedProcessProcedure,
              DATA_GAP: I18N.cbamMonitor.dataGapProcedure,
              RECORD_KEEPING: I18N.cbamMonitor.recordKeepingProcedure,
            }}
          />
        </div>
      ),
    },
    {
      key: 'otherProcedure',
      label: (
        <span>
          {I18N.cbamMonitor.otherProcedures}
          <CbamTranslationControls groupId='OTHER_PROCEDURE' />
        </span>
      ),
      children: (
        <ProcedureListSection
          groupId='OTHER_PROCEDURE'
          name={['controlConfirmation', 'otherProcedureJson', 'procedures']}
          positionOptions={positionOptions}
          addable
          numbered={false}
          deleteTarget='OTHER_PROCEDURE'
          onDeleteChild={onDeleteChild}
        />
      ),
    },
  ];
  return (
    <Collapse
      className={`${styles.goodsCollapse} ${styles.controlCollapse}`}
      defaultActiveKey='managementEvaluation'
      expandIcon={({ isActive }) => (
        <DownOutlined rotate={isActive ? 0 : -90} />
      )}
      items={controlCollapseItems.map(item => ({
        ...item,
        forceRender: true,
      }))}
    />
  );
};
