import I18N from '@/lang/I18N';
import { Button, Checkbox, Input, InputNumber, Select } from 'antd';
import { useId } from 'react';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useObjectKeys } from '../../../../useObjectKeys';
import { initialValues } from '../../../../forms';
import type { Field } from '../../../../forms';
import { list, text } from '../../../../protocol';
import type { Data } from '../../../../protocol';
import styles from './index.module.less';

export default function Fields({
  fields,
  values,
  disabled,
  onChange,
}: {
  fields: Field[];
  values: Data;
  disabled: boolean;
  onChange: (value: Data) => void;
}) {
  const prefix = useId();
  const { keyFor, inheritKey } = useObjectKeys();
  return (
    <>
      {fields.map(field => {
        const labelId = `${prefix}-${field.name}`;
        const value = values[field.name];
        const update = (next: unknown) =>
          onChange({
            ...values,
            [field.name]: next,
            ...(field.linkedField && field.presets[String(next)] !== undefined
              ? { [field.linkedField]: field.presets[String(next)] }
              : {}),
          });
        const options = field.options.map((option, i) => ({
          label: option.label,
          value: String(i),
        }));
        const selection = (next: unknown) =>
          field.options.findIndex(option => option.value === next);
        return (
          <div className={styles.field} key={field.name}>
            <span id={labelId} className={styles.label}>
              {field.label}
              {field.required && <span className={styles.required}> *</span>}
            </span>
            {['table', 'array'].includes(field.kind) ? (
              <div
                className={styles.rows}
                role='group'
                aria-labelledby={labelId}
              >
                {list(value).map((row, index) => (
                  <div key={keyFor(row)} className={styles.row}>
                    <div className={styles.rowHeader}>
                      <span>
                        {I18N.template(I18N.carbonAgent.rowNumber, {
                          number: index + 1,
                        })}
                      </span>
                      <Button
                        disabled={disabled}
                        type='text'
                        size='small'
                        icon={<DeleteOutlined />}
                        aria-label={I18N.template(
                          I18N.carbonAgent.deleteFieldRow,
                          { field: field.label, number: index + 1 },
                        )}
                        onClick={() =>
                          update(list(value).filter((_, i) => i !== index))
                        }
                      >
                        {I18N.carbonAgent.deleteRow}
                      </Button>
                    </div>
                    <Fields
                      fields={field.columns}
                      values={row}
                      disabled={disabled}
                      onChange={next => {
                        inheritKey(row, next);
                        update(
                          list(value).map((item, i) =>
                            i === index ? next : item,
                          ),
                        );
                      }}
                    />
                  </div>
                ))}
                {!list(value).length && (
                  <p className={styles.empty}>{I18N.carbonAgent.emptyRows}</p>
                )}
                <Button
                  disabled={disabled}
                  type='dashed'
                  icon={<PlusOutlined />}
                  onClick={() =>
                    update([...list(value), initialValues(field.columns)])
                  }
                >
                  {I18N.carbonAgent.addRow}
                </Button>
              </div>
            ) : ['number', 'integer'].includes(field.kind) ? (
              <InputNumber
                aria-labelledby={labelId}
                aria-required={field.required}
                value={typeof value === 'number' ? value : null}
                disabled={disabled}
                precision={field.kind === 'integer' ? 0 : undefined}
                onChange={update}
              />
            ) : ['boolean', 'checkbox'].includes(field.kind) ? (
              <Checkbox
                aria-labelledby={labelId}
                disabled={disabled}
                checked={value === true}
                onChange={event => update(event.target.checked)}
              />
            ) : ['single_select', 'multi_select', 'select'].includes(
                field.kind,
              ) ? (
              <Select
                aria-labelledby={labelId}
                aria-required={field.required}
                disabled={disabled}
                options={options}
                mode={field.kind === 'multi_select' ? 'multiple' : undefined}
                value={
                  field.kind === 'multi_select'
                    ? (Array.isArray(value) ? value : []).map(item =>
                        String(selection(item)),
                      )
                    : selection(value) < 0
                    ? undefined
                    : String(selection(value))
                }
                onChange={next =>
                  update(
                    Array.isArray(next)
                      ? next.map(index => field.options[Number(index)]?.value)
                      : field.options[Number(next)]?.value,
                  )
                }
              />
            ) : (
              <Input.TextArea
                aria-labelledby={labelId}
                aria-required={field.required}
                disabled={disabled}
                autoSize={{ minRows: 1, maxRows: 5 }}
                value={text(value)}
                onChange={event => update(event.target.value)}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
