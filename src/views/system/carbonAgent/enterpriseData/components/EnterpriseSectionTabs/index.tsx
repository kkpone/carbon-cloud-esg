import I18N from '@src/lang/I18N';
import classNames from 'classnames';

import style from './index.module.less';

export type EnterpriseHubTab = 'enterpriseFollows' | 'enterpriseIndustryTop';

type EnterpriseSectionTabsProps = {
  active: EnterpriseHubTab;
  onChange: (next: EnterpriseHubTab) => void;
};

const EnterpriseSectionTabs = ({
  active,
  onChange,
}: EnterpriseSectionTabsProps) => {
  const t = I18N.enterpriseData;
  const items: { key: EnterpriseHubTab; label: string }[] = [
    { key: 'enterpriseFollows', label: t.title },
    { key: 'enterpriseIndustryTop', label: t.industryTopMenu },
  ];

  return (
    <div className={style.tabs} role='tablist' aria-label={t.enterpriseMenu}>
      {items.map(item => {
        const selected = item.key === active;
        return (
          <button
            key={item.key}
            type='button'
            role='tab'
            aria-selected={selected}
            className={classNames(style.tab, {
              [style.tabActive]: selected,
            })}
            onClick={() => {
              if (!selected) onChange(item.key);
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

export default EnterpriseSectionTabs;
