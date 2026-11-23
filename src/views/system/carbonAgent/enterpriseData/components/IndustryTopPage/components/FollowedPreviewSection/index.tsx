import I18N from '@src/lang/I18N';
import { Button } from 'antd';

import { FollowCompanyCard } from '../../../../FollowCompany';
import { useEnterpriseData } from '../../../../state';
import style from './index.module.less';

type FollowedPreviewSectionProps = {
  onOpenMore: () => void;
  onCompare: () => void;
};

const MAX_PREVIEW_COUNT = 3;

const FollowedPreviewSection = ({
  onOpenMore,
  onCompare,
}: FollowedPreviewSectionProps) => {
  const state = useEnterpriseData();
  const t = I18N.enterpriseData;
  const follows = (state.follows.data || []).filter(item =>
    Boolean(item.company),
  );
  if (!follows.length) return null;

  const visibleFollows = follows.slice(0, MAX_PREVIEW_COUNT);
  const hasMore = follows.length > MAX_PREVIEW_COUNT;
  const selected = state.selectedCompanyIds;
  const limit = state.entitlement.data?.compareLimit ?? 0;
  const canCompare =
    state.entitlement.isSuccess &&
    !state.entitlement.isError &&
    limit >= 2 &&
    state.follows.isSuccess &&
    !state.follows.isError;

  const toggle = (id: string) =>
    state.setSelectedCompanyIds(current =>
      current.includes(id)
        ? current.filter(value => value !== id)
        : canCompare && current.length < limit
        ? [...current, id]
        : current,
    );

  return (
    <section className={style.section} aria-label={t.followedSectionTitle}>
      <div className={style.header}>
        <div className={style.titleGroup}>
          <h2>{t.followedSectionTitle}</h2>
          <span>
            {I18N.template(t.industryTopCompanyCount, {
              count: follows.length,
            })}
          </span>
        </div>
        <div className={style.actions}>
          {selected.length >= 2 && canCompare ? (
            <Button type='primary' size='small' onClick={onCompare}>
              {t.compare}
            </Button>
          ) : null}
          {hasMore ? (
            <Button type='link' onClick={onOpenMore}>
              {t.viewMoreFollowed}
            </Button>
          ) : null}
        </div>
      </div>
      <div className={style.grid}>
        {visibleFollows.map(follow =>
          follow.company ? (
            <FollowCompanyCard
              key={follow.enterpriseId}
              company={follow.company}
              selected={selected.includes(follow.enterpriseId)}
              disabled={
                !canCompare ||
                (!selected.includes(follow.enterpriseId) &&
                  selected.length >= limit)
              }
              onSelect={() => toggle(follow.enterpriseId)}
              onOpen={() => state.onOpen(follow.enterpriseId)}
            />
          ) : null,
        )}
      </div>
    </section>
  );
};

export default FollowedPreviewSection;
