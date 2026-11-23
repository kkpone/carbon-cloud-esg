import I18N from '@src/lang/I18N';
import classNames from 'classnames';

import { TOP_INDUSTRIES } from '../../../../industries';
import type { IndustryCode, IndustryOverview } from '../../../../types';
import style from './index.module.less';

type IndustryTabsProps = {
  activeIndustry: IndustryCode;
  overviews: IndustryOverview[];
  onSelect: (industry: IndustryCode) => void;
};

const IndustryTabs = ({
  activeIndustry,
  overviews,
  onSelect,
}: IndustryTabsProps) => {
  const overviewMap = new Map(overviews.map(item => [item.industryCode, item]));
  const t = I18N.enterpriseData;

  return (
    <div className={style.tabs} role='tablist' aria-label={t.industryTopTitle}>
      {TOP_INDUSTRIES.map(industry => {
        const overview = overviewMap.get(industry.code);
        const active = industry.code === activeIndustry;
        const label = industry.getLabel();
        return (
          <button
            key={industry.code}
            type='button'
            role='tab'
            aria-selected={active}
            title={label}
            className={classNames(style.tab, {
              [style.tabActive]: active,
            })}
            onClick={() => onSelect(industry.code)}
          >
            <span className={style.tabName}>{label}</span>
            <span className={style.tabMeta}>
              {overview
                ? I18N.template(t.industryTopCompanyCount, {
                    count: overview.companyCount,
                  })
                : '—'}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default IndustryTabs;
