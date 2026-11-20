import { list, record, text } from './protocol';
import type { Data } from './protocol';

export type Field = {
  name: string;
  label: string;
  kind: string;
  required: boolean;
  value?: unknown;
  columns: Field[];
  options: { label: string; value: unknown }[];
  linkedField?: string;
  presets: Data;
};
export function fieldsFrom(payload: Data): Field[] {
  const ui = record(
    payload.ui || record(record(payload.rawInterrupt).value).ui,
  );
  const schema = record(payload.formSchema);
  const fields =
    ui.fields || payload.fields || schema.fields || schema.properties;
  const rows = Array.isArray(fields)
    ? list(fields)
    : Object.entries(record(fields)).map(([name, value]) => ({
        ...record(value),
        name,
      }));
  return rows.map(raw =>
    fieldFrom(
      raw,
      Array.isArray(schema.required) ? schema.required.map(String) : [],
    ),
  );
}
function fieldFrom(raw: Data, required: string[] = []): Field {
  const name = text(raw.name || raw.id || raw.key || raw.field);
  const items = record(raw.items);
  const columns =
    raw.columns || (Array.isArray(raw.items) ? raw.items : items.properties);
  const children = Array.isArray(columns)
    ? list(columns)
    : Object.entries(record(columns)).map(([key, value]) => ({
        ...record(value),
        name: key,
      }));
  const kind = text(raw.kind || raw.type) || 'text';
  return {
    name,
    label: text(raw.label || raw.title) || name,
    kind,
    required: raw.required === true || required.includes(name),
    value: [raw.value, raw.defaultValue, raw.default, raw.default_rows].find(
      value => value !== undefined && value !== null,
    ),
    columns: children.map(child =>
      fieldFrom(
        child,
        Array.isArray(items.required) ? items.required.map(String) : [],
      ),
    ),
    options: (Array.isArray(raw.options) ? raw.options : []).map(option =>
      typeof option === 'object' && option !== null
        ? {
            label: text(
              record(option).label ||
                record(option).name ||
                record(option).value,
            ),
            value: record(option).value,
          }
        : { label: String(option), value: option },
    ),
    linkedField: text(raw.linked_field || raw.linkedField),
    presets: record(raw.linked_presets || raw.linkedPresets),
  };
}
export function initialValues(fields: Field[], values: Data = {}): Data {
  return Object.fromEntries(
    fields.map(field => {
      let value = values[field.name] ?? field.value;
      if (['table', 'array'].includes(field.kind))
        value = (Array.isArray(value) ? value : []).map(row =>
          initialValues(field.columns, record(row)),
        );
      if (value === undefined && ['boolean', 'checkbox'].includes(field.kind))
        value = false;
      if (value === undefined && field.kind === 'multi_select') value = [];
      return [field.name, value];
    }),
  );
}
export function validateFields(
  fields: Field[],
  values: Data,
): string | undefined {
  for (const field of fields) {
    const value = values[field.name];
    if (
      field.required &&
      (value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && !value.length))
    )
      return field.label;
    if (['table', 'array'].includes(field.kind)) {
      for (const row of list(value)) {
        const error = validateFields(field.columns, row);
        if (error) return `${field.label} / ${error}`;
      }
    }
    if (
      value !== undefined &&
      value !== null &&
      ['number', 'integer'].includes(field.kind) &&
      (typeof value !== 'number' ||
        !Number.isFinite(value) ||
        (field.kind === 'integer' && !Number.isInteger(value)))
    )
      return field.label;
  }
  return undefined;
}
