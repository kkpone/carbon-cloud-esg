import I18N from '@/lang/I18N';
import { useState } from 'react';
import { Button, Alert } from 'antd';
import { fieldsFrom, initialValues, validateFields } from '../../forms';
import { buildResume, record, text } from '../../protocol';
import type { Data } from '../../protocol';
import { useCarbonAgent } from '../../context';
import {
  ACCOUNTING_PURPOSE_FORM,
  purposeRecord,
} from '../../enterprise/accountingPurpose';
import EnterpriseAccountingPurposeForm from '../EnterpriseAccountingPurposeForm';
import Fields from './components/Fields';
import styles from './index.module.less';

export default function AgentForm({
  payload,
  draftId,
  disabled,
  onSubmit,
}: {
  payload: Data;
  draftId: string;
  disabled: boolean;
  onSubmit: (body: Data) => void;
}) {
  const agent = useCarbonAgent();
  const fields = fieldsFrom(payload);
  const ui = record(
    payload.ui || record(record(payload.rawInterrupt).value).ui,
  );
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState(
    () =>
      agent.chat?.formDrafts[draftId] ||
      initialValues(fields, record(ui.initial_values)),
  );
  const [error, setError] = useState('');
  const processed = payload.processed === true || payload.resolved === true;
  if (payload.formName === ACCOUNTING_PURPOSE_FORM) {
    return (
      <EnterpriseAccountingPurposeForm
        key={text(payload.resumeEventId || draftId)}
        ui={{
          ...ui,
          initial_values: payload.accountingPurposeDraft || ui.initial_values,
        }}
        receipt={purposeRecord(payload.accountingPurposeConfirmation)}
        disabled={disabled || processed}
        submitting={submitting}
        onSubmit={(value, message) => {
          setSubmitting(true);
          Promise.resolve(
            onSubmit({
              ...buildResume(payload, 'submit', value),
              message,
            }),
          ).finally(() => setSubmitting(false));
        }}
        onCancel={() => onSubmit(buildResume(payload, 'cancel'))}
      />
    );
  }
  const submit = (action: string) => {
    try {
      const invalid =
        action === 'submit' ? validateFields(fields, values) : undefined;
      if (invalid) {
        setError(
          I18N.template(I18N.carbonAgent.checkField, { field: invalid }),
        );
        return;
      }
      onSubmit(
        buildResume(payload, action, action === 'submit' ? values : undefined),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : I18N.carbonAgent.submitFailed,
      );
    }
  };
  return (
    <section className={styles.form}>
      <header className={styles.header}>
        <strong>
          {text(ui.title || payload.title) || I18N.carbonAgent.formTitle}
        </strong>
        {processed && (
          <span className={styles.status}>{I18N.carbonAgent.processed}</span>
        )}
      </header>
      <div className={styles.panel}>
        {!!text(ui.description || payload.description) && (
          <p className={styles.description}>
            {text(ui.description || payload.description)}
          </p>
        )}
        <Fields
          fields={fields}
          values={values}
          disabled={disabled}
          onChange={next => {
            setError('');
            setValues(next);
            agent.saveFormDraft(draftId, next);
          }}
        />
        {error && <Alert showIcon type='error' message={error} />}
        <div className={styles.actions}>
          <Button
            disabled={disabled || !record(payload.resumeRequest).cancel}
            onClick={() => submit('cancel')}
          >
            {I18N.carbonFootprint3.cancel}
          </Button>
          <Button
            type='primary'
            disabled={
              disabled ||
              !fields.length ||
              !record(payload.resumeRequest).submit
            }
            onClick={() => submit('submit')}
          >
            {I18N.carbonAgent.confirmContinue}
          </Button>
        </div>
      </div>
    </section>
  );
}
