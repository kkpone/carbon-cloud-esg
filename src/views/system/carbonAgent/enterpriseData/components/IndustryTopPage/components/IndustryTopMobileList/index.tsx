import I18N from '@src/lang/I18N';
import { Button, Empty, Pagination, Tag } from 'antd';
import classNames from 'classnames';

import { FollowButton } from '../../../../components';
import { stockCodes } from '../../../../FollowCompany';
import type { IndustryTopItem } from '../../../../types';
import { formatEmissionValue } from '../../utils';
import style from './index.module.less';

type IndustryTopMobileListProps = {
  items: IndustryTopItem[];
  page: number;
  pageSize: number;
  isPreview?: boolean;
  openingId?: string;
  onPageChange: (nextPage: number) => void;
  onOpenCompany: (item: IndustryTopItem) => void;
};

const IndustryTopMobileList = ({
  items,
  page,
  pageSize,
  isPreview = false,
  openingId = '',
  onPageChange,
  onOpenCompany,
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
                <span
                  className={classNames(style.rank, {
                    [style.rankTopThree]: item.rank <= 3,
                  })}
                >
                  {item.rank}
                </span>
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
                <FollowButton
                  companyId={item.company.companyId}
                  disabled={isPreview}
                  appearance='link'
                />
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
