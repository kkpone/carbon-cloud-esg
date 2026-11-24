import { FileProtectOutlined } from '@ant-design/icons';
import { Radio } from 'antd';
import classNames from 'classnames';

import { withCurrentLocalePrefix } from '@/router/localePath';

import { teamText } from '../../../i18n';
import { getZeroRetentionAgreementPath } from '../../../securityHelpers';
import type { SecurityModelRegion } from '../../../types';
import style from './index.module.less';

type ModelRegionCardProps = {
  disabled: boolean;
  saving: boolean;
  value: SecurityModelRegion;
  onChange: (region: SecurityModelRegion) => void;
};

const REGION_OPTIONS: {
  value: SecurityModelRegion;
  titleKey: 'securityModelDomesticTitle' | 'securityModelOverseasTitle';
  descKey: 'securityModelDomesticDesc' | 'securityModelOverseasDesc';
}[] = [
  {
    value: 'DOMESTIC',
    titleKey: 'securityModelDomesticTitle',
    descKey: 'securityModelDomesticDesc',
  },
  {
    value: 'OVERSEAS',
    titleKey: 'securityModelOverseasTitle',
    descKey: 'securityModelOverseasDesc',
  },
];

const ModelRegionCard = ({
  disabled,
  saving,
  value,
  onChange,
}: ModelRegionCardProps) => (
  <section
    className={classNames(style.card, { [style.cardDisabled]: disabled })}
  >
    <div className={style.header}>
      <h3>{teamText('securityModelSectionTitle')}</h3>
      <p>{teamText('securityModelSectionDescription')}</p>
    </div>
    <div className={style.optionGrid} role='radiogroup'>
      {REGION_OPTIONS.map(option => {
        const selected = value === option.value;
        const isLocked = disabled || saving;
        const agreementHref = withCurrentLocalePrefix(
          getZeroRetentionAgreementPath(option.value),
        );
        return (
          <div
            key={option.value}
            role='radio'
            aria-checked={selected}
            aria-disabled={isLocked}
            tabIndex={isLocked ? -1 : 0}
            className={classNames(style.optionCard, {
              [style.optionCardSelected]: selected,
              [style.optionCardDisabled]: isLocked,
            })}
            onClick={() => {
              if (!isLocked && !selected) onChange(option.value);
            }}
            onKeyDown={event => {
              if (
                !isLocked &&
                !selected &&
                (event.key === 'Enter' || event.key === ' ')
              ) {
                event.preventDefault();
                onChange(option.value);
              }
            }}
          >
            <div className={style.optionTop}>
              <Radio checked={selected} disabled={isLocked}>
                <span className={style.optionTitle}>
                  {teamText(option.titleKey)}
                </span>
              </Radio>
            </div>
            <p className={style.optionDesc}>{teamText(option.descKey)}</p>
            <a
              className={style.agreementLink}
              href={agreementHref}
              target='_blank'
              rel='noopener noreferrer'
              onClick={event => event.stopPropagation()}
            >
              <FileProtectOutlined />
              <span>{teamText('securityZeroRetentionAgreement')}</span>
            </a>
          </div>
        );
      })}
    </div>
  </section>
);

export default ModelRegionCard;
