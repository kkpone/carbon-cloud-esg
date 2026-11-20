import { Form, onFieldInputValueChange } from '@formily/core';
import { Report } from '@src/sdks_v2/footprint3V2ApiDocs';
import { SaaSCalcUncertainty } from '@/views/subModules/CarbonFootprintModel/Certification/CertificationForm/saasService';

const revisions = new WeakMap<Form<Report>, Map<string, number>>();
const scoreFields = [
  'times',
  'region',
  'technology',
  'datas',
  'methodology',
] as const;
const empty = (value: unknown) =>
  value === undefined || value === null || value === '';

function qualityChoices(
  form: Form<Report>,
  kind: 'activity' | 'factor',
  index: number,
) {
  if (kind === 'activity')
    return [form.values.reportActivityList?.[index]?.activityType];
  const row = form.values.reportFactoryList?.[index];
  return scoreFields.map(key => row?.[key]);
}

/** 手填和AI共用建议请求；只回填同一行、同一选择且期间未手动修改的不确定度。 */
export function updateReportUncertainty(
  form: Form<Report>,
  kind: 'activity' | 'factor',
  index: number,
  onlyEmpty = false,
) {
  const list = kind === 'activity' ? 'reportActivityList' : 'reportFactoryList';
  const row = form.values[list]?.[index];
  const path = `${list}.${index}.uncertain`;
  const pending = revisions.get(form) || new Map<string, number>();
  revisions.set(form, pending);
  const version = (pending.get(path) || 0) + 1;
  pending.set(path, version);
  if (!row || (onlyEmpty && !empty(row.uncertain))) return Promise.resolve();
  const choices = qualityChoices(form, kind, index);
  if (choices.some(empty)) return Promise.resolve();
  const signature = JSON.stringify(choices);
  const { uncertain } = row;
  const context = `${form.values.id}:${form.values.type}:${form.values.accountType}`;
  return SaaSCalcUncertainty({ ...row, type: kind === 'activity' ? 0 : 1 })
    .then(response => {
      const current = form.values[list]?.[index];
      const currentChoices = qualityChoices(form, kind, index);
      if (
        current !== row ||
        pending.get(path) !== version ||
        JSON.stringify(currentChoices) !== signature ||
        !Object.is(current?.uncertain, uncertain) ||
        `${form.values.id}:${form.values.type}:${form.values.accountType}` !==
          context
      )
        return;
      form.setValuesIn(path, response.data.data);
    })
    .catch(() => {
      /* 统一请求层处理错误。 */
    });
}

export function registerReportQualityEffects() {
  onFieldInputValueChange(
    '*(reportActivityList,reportFactoryList).*.uncertain',
    (field, form) => {
      const path = field.path.toString();
      const pending = revisions.get(form);
      pending?.set(path, (pending.get(path) || 0) + 1);
    },
  );
  onFieldInputValueChange(
    'reportActivityList.*.activityType',
    (field, form) => {
      updateReportUncertainty(form, 'activity', field.index);
    },
  );
  onFieldInputValueChange(
    'reportFactoryList.*.*(times,region,technology,datas,methodology)',
    (field, form) => {
      updateReportUncertainty(form, 'factor', field.index);
    },
  );
}
