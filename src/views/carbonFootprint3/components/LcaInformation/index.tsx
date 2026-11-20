import { Cascader, FormItem, Input } from '@formily/antd-v5';
import { Field } from '@formily/react';
import { Alert, Collapse, Divider } from 'antd';
import classNames from 'classnames';
import { useAllEnumsBatch } from '@/hooks';
import I18N from '@/lang/I18N';
import { changeFactorM2cascaderOptions } from '@/utils';

import styles from './index.module.less';

/** 产品、核算共用字段契约；JSON 分类编码与报告保持一致。 */
export interface LcaInformation {
  treatmentStandardsRoutes?: string;
  mixNLocationTypes?: string;
  includedActivitiesStart?: string;
  includedActivitiesEnd?: string;
  lcaClassification?: string | null;
  generalComment?: string;
  technologicalApplicability?: string;
  dataCutoffNCompletenessPrinciples?: string;
  annualSupplyOrProductionVolume?: string;
  intendedApplications?: string;
}

export const lcaFieldNames = [
  'treatmentStandardsRoutes',
  'mixNLocationTypes',
  'includedActivitiesStart',
  'includedActivitiesEnd',
  'lcaClassification',
  'generalComment',
  'technologicalApplicability',
  'dataCutoffNCompletenessPrinciples',
  'annualSupplyOrProductionVolume',
  'intendedApplications',
] as const;

/** 仅复制 LCA 字段；分类保留 null（未填写）与空串（主动清空）的区别。 */
export const pickLcaInformation = (source: LcaInformation): LcaInformation =>
  Object.fromEntries(
    lcaFieldNames.map(name => [
      name,
      source[name] ?? (name === 'lcaClassification' ? null : ''),
    ]),
  );

const LcaClassification = ({
  value,
  onChange,
  disabled,
  readOnly,
  placeholder,
}: {
  value?: string | null;
  onChange?: (value: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
}) => {
  const enums = useAllEnumsBatch('productClassification');
  let path: string[] = [];
  if (value) {
    try {
      const parsed: unknown = JSON.parse(value);
      path =
        Array.isArray(parsed) && parsed.every(item => typeof item === 'string')
          ? parsed
          : [];
    } catch {
      path = [];
    }
  }
  return (
    <Cascader
      placeholder={placeholder}
      disabled={disabled || readOnly}
      value={path}
      options={changeFactorM2cascaderOptions(
        enums?.productClassification || [],
      )}
      allowClear
      onChange={next => onChange?.(next?.length ? JSON.stringify(next) : '')}
    />
  );
};

const groups = [
  {
    title: 'basicInformation',
    fields: [
      ['treatmentStandardsRoutes', 'treatmentStandardsRoutes', 40],
      ['mixNLocationTypes', 'mixNLocationTypes', 40],
      ['includedActivitiesStart', 'includedActivitiesStart', 200],
      ['includedActivitiesEnd', 'includedActivitiesEnd', 200],
      ['lcaClassification', 'lcaClassification', 0],
      ['generalComment', 'generalComment', 500],
      ['technologicalApplicability', 'technologicalApplicability', 200],
    ],
  },
  {
    title: 'modelingInformation',
    fields: [
      [
        'dataCutoffNCompletenessPrinciples',
        'dataCutoffNCompletenessPrinciples',
        500,
      ],
      ['annualSupplyOrProductionVolume', 'annualSupplyOrProductionVolume', 40],
    ],
  },
  {
    title: 'managementInformation',
    fields: [['intendedApplications', 'intendedApplications', 200]],
  },
] as const;

/** 嵌入既有 Formily 表单，保存、回显和只读状态沿用父表单。 */
export const LcaInformationFields = ({
  account = false,
  inherited = false,
  expanded = false,
  productModal = false,
  standalone = false,
}: {
  account?: boolean;
  inherited?: boolean;
  expanded?: boolean;
  productModal?: boolean;
  standalone?: boolean;
}) => {
  const isModalLayout = productModal || standalone;
  const content = (
    <div className={isModalLayout ? styles.productLcaFields : undefined}>
      {!productModal && !standalone && (
        <div>{account ? I18N.ilcd.accountLevel : I18N.ilcd.productLevel}</div>
      )}
      {account && (
        <Alert
          type='info'
          showIcon
          message={
            inherited
              ? I18N.ilcd.accountInheritanceHint
              : I18N.ilcd.accountInheritanceHint
          }
        />
      )}
      {groups.map(group => (
        <div key={group.title}>
          {isModalLayout ? (
            <h3 className={styles.groupTitle}>{I18N.ilcd[group.title]}</h3>
          ) : (
            <Divider orientation='left'>{I18N.ilcd[group.title]}</Divider>
          )}
          <div className={isModalLayout ? styles.fieldGrid : undefined}>
            {group.fields.map(([name, title, maxLength]) => (
              <Field
                key={name}
                name={name}
                title={I18N.ilcd[title]}
                decorator={[
                  FormItem,
                  isModalLayout
                    ? {
                        className: classNames(styles.field, {
                          [styles.halfField]:
                            name === 'treatmentStandardsRoutes' ||
                            name === 'mixNLocationTypes' ||
                            name === 'lcaClassification',
                        }),
                      }
                    : {},
                ]}
                component={
                  name === 'lcaClassification'
                    ? [
                        LcaClassification,
                        isModalLayout
                          ? { placeholder: I18N.ilcd.pleaseSelect }
                          : {},
                      ]
                    : [
                        isModalLayout &&
                        (name === 'treatmentStandardsRoutes' ||
                          name === 'mixNLocationTypes')
                          ? Input
                          : Input.TextArea,
                        {
                          maxLength: maxLength || undefined,
                          count: {
                            max: maxLength,
                            show: false,
                            exceedFormatter: (value: string) =>
                              value.slice(0, maxLength),
                          },
                          rows: maxLength > 200 ? 3 : 2,
                        },
                      ]
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (productModal || standalone) return content;

  return (
    <Collapse
      defaultActiveKey={expanded ? ['lca'] : []}
      items={[
        {
          key: 'lca',
          label: I18N.ilcd.lcaInformationManagement,
          children: content,
        },
      ]}
    />
  );
};
