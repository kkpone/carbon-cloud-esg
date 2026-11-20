import I18N from '@/lang/I18N';
import { approvalActions, list, record, text } from './protocol';
import type { Data } from './protocol';

const internalField = (key: string) =>
  /^(session_?id|message_?id|idempotency_?key|checkpoint|resume_?event_?id|interrupt_?id)$/i.test(
    key,
  );

export function approvalValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean')
    return value ? I18N.carbonAgent.yes : I18N.carbonAgent.no;
  if (Array.isArray(value))
    return value.map(approvalValue).filter(Boolean).join(' / ');
  if (typeof value === 'object')
    return Object.entries(record(value))
      .filter(([key]) => !internalField(key))
      .map(([key, item]) => `${key}: ${approvalValue(item)}`)
      .join('\n');
  return text(value);
}

export function approvalReviews(payload: Data) {
  const raw = approvalActions(payload);
  const display = list(payload.displayActionRequests);
  const labels: Record<string, string> = {
    amount: I18N.carbonAgent.activityAmount,
    activityData: I18N.carbonAgent.activityAmount,
    emissionId: I18N.carbonAgent.emissionId,
    sourceId: I18N.carbonAgent.emissionId,
    accountId: I18N.carbonAgent.modelId,
    computationId: I18N.carbonAgent.modelId,
    name: I18N.carbonAgent.emissionName,
    emissionName: I18N.carbonAgent.emissionName,
    sourceName: I18N.carbonAgent.emissionName,
    unitName: I18N.carbonAgent.activityUnit,
    activityUnit: I18N.carbonAgent.activityUnit,
    unit: I18N.carbonAgent.activityUnit,
    accountName: I18N.carbonAgent.accountName,
    orgName: I18N.carbonAgent.enterpriseCarbonAccountingScopeDisplay.replace(
      '：{val1}',
      '',
    ).replace(': {val1}', ''),
    facility: I18N.carbonAgent.facility,
    factor: I18N.carbonAgent.emissionFactor,
    categoryName: I18N.carbonAgent.categoryName,
    year: I18N.carbonAgent.accountingYear,
    versionType: I18N.carbonAgent.ghgStandard,
    productName: I18N.carbonFootprint3.product,
    functionalUnit: I18N.carbonAgent.functionalUnit,
  };
  return (display.length ? display : raw).map((action, index) => {
    const original = display.length
      ? raw.find(item => item.name === action.actionName) || raw[index] || {}
      : action;
    const args = record(original.args);
    const source = Object.keys(record(args.input)).length
      ? record(args.input)
      : args;
    const fields = display.length
      ? list(action.fields).map((field, fieldIndex) => ({
          key: text(field.key) || `field-${fieldIndex}`,
          label:
            text(field.label) || labels[text(field.key)] || text(field.key),
          value: approvalValue(field.displayValue ?? field.value),
        }))
      : Object.entries(source).map(([key, value]) => ({
          key,
          label: labels[key] || key,
          value: approvalValue(value),
        }));
    return {
      key: `${text(action.actionName || original.name)}-${index}`,
      title:
        text(action.actionLabel) ||
        (original.name === 'agent_modeling_emission_update_structured'
          ? I18N.carbonAgent.updateEmission
          : text(action.actionName || original.name)) ||
        I18N.carbonAgent.confirmExecute,
      fields: fields.filter(
        field => !internalField(field.key) && field.value !== '',
      ),
    };
  });
}
