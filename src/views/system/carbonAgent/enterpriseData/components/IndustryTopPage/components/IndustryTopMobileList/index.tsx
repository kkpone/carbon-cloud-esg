import I18N from '@src/lang/I18N';
import { Button, Empty, Pagination, Tag } from 'antd';

import { stockCodes } from '../../../../FollowCompany';
import type { Company, IndustryTopItem } from '../../../../types';
import { formatEmissionValue } from '../../utils';
import style from './index.module.less';

type IndustryTopMobileListProps = {
  items: IndustryTopItem[];
  page: number;
  pageSize: number;
  openingId?: string;
  followingId?: string;
  isFollowed: (company: Company) => boolean;
  isFollowPending: (company: Company) => boolean;
  onPageChange: (nextPage: number) => void;
  onOpenCompany: (item: IndustryTopItem) => void;
  onToggleFollow: (item: IndustryTopItem) => void;
};

const IndustryTopMobileList = ({
  items,
  page,
  pageSize,
  openingId = '',
  followingId = '',
  isFollowed,
  isFollowPending,
  onPageChange,
  onOpenCompany,
  onToggleFollow,
}: IndustryTopMobileListProps) => {
  const t = I18N.enterpriseData;
  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize);

  if (!items.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={t.industryTopNoMatch}
      />
    );
  }

  return (
    <>
      <div className={style.list}>
        {pagedItems.map(item => {
          const code = stockCodes(item.company);
          return (
            <article key={item.company.companyId} className={style.card}>
              <div className={style.cardHeader}>
                <div className={style.identity}>
                  <button
                    type='button'
                    className={style.nameButton}
                    disabled={Boolean(openingId)}
                    onClick={() => onOpenCompany(item)}
                  >
                    {item.company.shortName || item.company.name}
                  </button>
                  <div className={style.metaRow}>
                    <Tag>
                      {item.listed
                        ? t.industryTopListedTag
                        : t.industryTopUnlistedTag}
                    </Tag>
                    {code !== '—' ? <span>{code}</span> : null}
                  </div>
                </div>
              </div>
              <div className={style.metrics}>
                <div className={style.metricItem}>
                  <span>{t.industryTopColRevenue}</span>
                  <strong>{formatEmissionValue(item.revenueBillionCny)}</strong>
                </div>
                <div className={style.metricItem}>
                  <span>{t.industryTopColTotalEmissions}</span>
                  <strong>
                    {formatEmissionValue(item.summary.totalEmissions)}
                  </strong>
                </div>
                <div className={style.metricItem}>
                  <span>{t.industryTopColScope1}</span>
                  <strong>{formatEmissionValue(item.summary.scope1)}</strong>
                </div>
                <div className={style.metricItem}>
                  <span>{t.industryTopColScope2}</span>
                  <strong>{formatEmissionValue(item.summary.scope2)}</strong>
                </div>
              </div>
              <div className={style.cardFooter}>
                <Button
                  type='link'
                  loading={openingId === item.company.companyId}
                  disabled={
                    Boolean(openingId) && openingId !== item.company.companyId
                  }
                  onClick={() => onOpenCompany(item)}
                >
                  {t.viewShort}
                </Button>
                <Button
                  type='link'
                  loading={isFollowPending(item.company)}
                  disabled={
                    Boolean(followingId) &&
                    followingId !== item.company.companyId
                  }
                  onClick={() => onToggleFollow(item)}
                >
                  {isFollowed(item.company) ? t.unfollow : t.follow}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      <div className={style.pagination}>
        <Pagination
          current={page}
          pageSize={pageSize}
          total={items.length}
          showSizeChanger={false}
          hideOnSinglePage
          onChange={onPageChange}
        />
      </div>
    </>
  );
};

export default IndustryTopMobileList;
