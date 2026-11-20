import { Alert, Input, Select, Tag } from 'antd';
import {
  ArrowUpOutlined,
  LoadingOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import I18N from '@/lang/I18N';
import { api } from '../../api';
import { list, text } from '../../protocol';
import type { Attachment, Skill } from '../../protocol';
import { useObjectKeys } from '../../useObjectKeys';
import modelingAdd from '../../assets/modeling-add.svg';
import modelingSendDisabled from '../../assets/modeling-send-disabled.svg';
import modelingChevron from '../../assets/modeling-chevron.svg';
import styles from './index.module.less';

const SKILL_LABELS: Record<Skill, () => string> = {
  build_model: () => I18N.carbonAgent.modelingSkill,
  model_update: () => I18N.carbonAgent.updateModel,
  data_analysis: () => I18N.carbonAgent.analyzeData,
  enterprise_modeling: () => I18N.carbonAgent.enterpriseAccountingSkill,
  enterprise_data_analysis: () => I18N.carbonAgent.analyzeData,
  enterprise_generate_report: () => I18N.carbonAgent.skillGenerateReport,
};

export type ComposerValue = {
  message: string;
  files: File[];
  attachments?: Attachment[];
  skill?: Skill;
  scope?: number;
  factorScope?: string;
};
export default function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  busy,
  onCancel,
  modeling = false,
  skills,
}: {
  value: ComposerValue;
  onChange: (value: Partial<ComposerValue>) => void;
  onSubmit: () => void;
  disabled?: boolean;
  busy?: boolean;
  onCancel?: () => void;
  modeling?: boolean;
  skills?: Skill[];
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const { keyFor } = useObjectKeys();
  const [options, setOptions] = useState<{ label: string; value: string }[]>(
    [],
  );
  const [error, setError] = useState('');
  useEffect(() => {
    if (!modeling) return;
    const abort = new AbortController();
    api<unknown>('/footprint3/account/factorScopes', undefined, abort.signal)
      .then(result =>
        setOptions(
          list(result).map(item => ({
            label: text(item.label || item.name),
            value: text(item.value ?? item.id),
          })),
        ),
      )
      .catch(cause => {
        if (!abort.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : I18N.carbonAgent.factorOptionsFailed,
          );
      });
    return () => abort.abort();
  }, [modeling]);
  const sendDisabled =
    disabled ||
    busy ||
    (!value.message.trim() &&
      !value.files.length &&
      !value.attachments?.length);
  return (
    <div
      className={`${styles.composer} ${modeling ? styles.modeling : ''} ${
        busy ? styles.busy : ''
      }`}
    >
      {error && (
        <Alert
          type='warning'
          message={error}
          closable
          onClose={() => setError('')}
        />
      )}
      <div className={styles.files}>
        {value.files.map((file, index) => (
          <Tag
            key={keyFor(file)}
            closable={!disabled && !busy}
            onClose={() =>
              onChange({ files: value.files.filter((_, i) => i !== index) })
            }
          >
            {file.name}
          </Tag>
        ))}
        {value.attachments?.map(file => (
          <Tag
            key={file.fileId}
            closable={!disabled && !busy}
            onClose={() =>
              onChange({
                attachments: value.attachments?.filter(
                  item => item.fileId !== file.fileId,
                ),
              })
            }
          >
            {I18N.template(I18N.carbonAgent.uploadedFile, { name: file.name })}
          </Tag>
        ))}
      </div>
      <Input.TextArea
        aria-label={I18N.carbonAgent.messageLabel}
        placeholder={
          modeling
            ? I18N.productCarbonFootprintAI.placeholder
            : I18N.carbonAgent.messagePlaceholder
        }
        autoSize={{ minRows: 2, maxRows: 6 }}
        value={value.message}
        maxLength={20000}
        disabled={disabled || busy}
        variant='borderless'
        onChange={event => onChange({ message: event.target.value })}
        onKeyDown={event => {
          if (
            event.key === 'Enter' &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            if (!disabled && !busy) onSubmit();
          }
        }}
      />
      <div className={styles.actions}>
        <button
          type='button'
          className={styles.upload}
          aria-label={I18N.productCarbonFootprintAI.uploadFile}
          title={I18N.carbonAgent.uploadHint}
          disabled={disabled || busy}
          onClick={() => fileInput.current?.click()}
        >
          {modeling ? <img src={modelingAdd} alt='' /> : <PlusOutlined />}
        </button>
        <input
          ref={fileInput}
          hidden
          type='file'
          multiple
          aria-label={I18N.productCarbonFootprintAI.uploadFile}
          disabled={disabled || busy}
          onChange={event => {
            const files = Array.from(event.target.files || []);
            event.target.value = '';
            if (files.some(file => file.size > 20 * 1024 * 1024)) {
              setError(I18N.carbonAgent.fileTooLarge);
              return;
            }
            if (
              files.length +
                value.files.length +
                (value.attachments?.length || 0) >
              20
            ) {
              setError(I18N.carbonAgent.tooManyFiles);
              return;
            }
            setError('');
            onChange({ files: [...value.files, ...files] });
          }}
        />
        {modeling ? (
          <>
            <span className={styles.divider} aria-hidden />
            <span className={styles.skill}>
              {I18N.carbonAgent.modelingSkill}
            </span>
            <Select
              suffixIcon={<img src={modelingChevron} alt='' />}
              aria-label={I18N.carbonFootprint3.lifeCycle}
              size='small'
              value={value.scope ?? 1}
              disabled={disabled || busy}
              options={[
                { label: I18N.productCarbonFootprintAI.scopeHalf, value: 0 },
                { label: I18N.productCarbonFootprintAI.scopeFull, value: 1 },
              ]}
              onChange={scope => onChange({ scope })}
            />
            <Select
              suffixIcon={<img src={modelingChevron} alt='' />}
              aria-label={
                I18N.productCarbonFootprintAI.factorPreferencePlaceholder
              }
              placeholder={
                I18N.productCarbonFootprintAI.factorPreferencePlaceholder
              }
              allowClear
              size='small'
              options={options}
              value={value.factorScope}
              disabled={disabled || busy}
              onChange={factorScope => onChange({ factorScope })}
            />
          </>
        ) : skills?.length ? (
          <div
            className={styles.skills}
            role='group'
            aria-label={I18N.carbonAgent.skillLabel}
          >
            {skills.map(skill => (
              <button
                key={skill}
                type='button'
                className={styles.skillOption}
                aria-pressed={value.skill === skill}
                disabled={disabled || busy}
                onClick={() =>
                  onChange({ skill: value.skill === skill ? undefined : skill })
                }
              >
                {SKILL_LABELS[skill]?.() || skill}
              </button>
            ))}
          </div>
        ) : value.skill === 'build_model' ? (
          <span className={styles.skill}>{I18N.carbonAgent.modelingSkill}</span>
        ) : value.skill ? (
          <Select
            aria-label={I18N.carbonAgent.skillLabel}
            size='small'
            value={value.skill}
            disabled={disabled || busy}
            options={(value.skill.startsWith('enterprise_')
              ? [
                  'enterprise_modeling',
                  'enterprise_data_analysis',
                  'enterprise_generate_report',
                ]
              : ['model_update', 'data_analysis']
            ).map(skill => ({
              value: skill as Skill,
              label: SKILL_LABELS[skill as Skill](),
            }))}
            onChange={skill => onChange({ skill })}
          />
        ) : null}
        {busy && onCancel ? (
          <button className={styles.stop} type='button' onClick={onCancel}>
            <span aria-hidden='true' />
            {I18N.carbonAgent.stop}
          </button>
        ) : (
          <button
            className={`${styles.send} ${modeling ? styles.modelingSend : ''}`}
            type='button'
            aria-label={I18N.productCarbonFootprintAI.altSend}
            disabled={sendDisabled}
            onClick={onSubmit}
          >
            {busy ? (
              <LoadingOutlined spin />
            ) : modeling && sendDisabled ? (
              <img src={modelingSendDisabled} alt='' />
            ) : (
              <ArrowUpOutlined />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
