import I18N from '@src/lang/I18N';
import { Button, Empty, Pagination, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import classNames from 'classnames';

import { displayUnit } from '../../../../data';
import { CompanyAvatar, stockCodes } from '../../../../FollowCompany';
import type { Company, IndustryTopItem } from '../../../../types';
import { formatEmissionValue } from '../../utils';
import style from './index.module.less';

type IndustryTopTableProps = {
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

const scope2BasisLabel = (basis?: 'market' | 'location' | 'unknown' | null) => {
  if (basis === 'market') return I18N.enterpriseData.industryTopScope2Market;
  if (basis === 'location') {
    return I18N.enterpriseData.industryTopScope2Location;
  }
  return I18N.enterpriseData.basisUnknown;
};

const IndustryTopTable = ({
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
}: IndustryTopTableProps) => {
  const t = I18N.enterpriseData;
  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize);

  const columns: ColumnsType<IndustryTopItem> = [
    {
      title: t.industryTopColRank,
      key: 'rank',
      width: 72,
      fixed: 'left',
      render: (_, item) => (
        <span
          className={classNames(style.rankBadge, {
            [style.rankTopThree]: item.rank <= 3,
          })}
        >
          {item.rank}
        </span>
      ),
    },
    {
      title: t.company,
      key: 'company',
      width: 240,
      fixed: 'left',
      render: (_, item) => {
        const code = stockCodes(item.company);
        const subtitle = [
          code !== '—' ? code : '',
          item.company.industryCategory || '',
          item.company.registeredRegion || '',
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <div className={style.companyCell}>
            <CompanyAvatar company={item.company} small />
            <div className={style.companyInfo}>
              <button
                type='button'
                className={style.companyLink}
                title={item.company.name}
                disabled={Boolean(openingId)}
                onClick={() => onOpenCompany(item)}
              >
                {item.company.shortName || item.company.name}
              </button>
              <span className={style.companySub}>{subtitle || '—'}</span>
            </div>
          </div>
        );
      },
    },
    {
      title: t.industryTopColListing,
      key: 'listed',
      width: 100,
      render: (_, item) => (
        <Tag
          className={classNames(
            style.entityTag,
            item.listed ? style.listedTag : style.unlistedTag,
          )}
        >
          {item.listed ? t.industryTopListedTag : t.industryTopUnlistedTag}
        </Tag>
      ),
    },
    {
      title: t.industryTopColRevenue,
      key: 'revenue',
      width: 140,
      align: 'right',
      render: (_, item) => (
        <span className={style.metricValue}>
          {formatEmissionValue(item.revenueBillionCny)}
        </span>
      ),
    },
    {
      title: t.industryTopColMarketCap,
      key: 'marketCap',
      width: 130,
      align: 'right',
      render: (_, item) => (
        <span className={style.metricValue}>
          {item.listed ? formatEmissionValue(item.marketCapBillionCny) : '—'}
        </span>
      ),
    },
    {
      title: t.industryTopColTotalEmissions,
      key: 'totalEmissions',
      width: 150,
      align: 'right',
      render: (_, item) => (
        <div className={style.metricValue}>
          <span>{formatEmissionValue(item.summary.totalEmissions)}</span>
          {item.summary.totalEmissions ? (
            <span className={style.metricSub}>
              {displayUnit(item.summary.unit || t.industryTopUnitTco2e)}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      title: t.industryTopColScope1,
      key: 'scope1',
      width: 130,
      align: 'right',
      render: (_, item) => (
        <span className={style.metricValue}>
          {formatEmissionValue(item.summary.scope1)}
        </span>
      ),
    },
    {
      title: t.industryTopColScope2,
      key: 'scope2',
      width: 140,
      align: 'right',
      render: (_, item) => (
        <div className={style.metricValue}>
          <span>{formatEmissionValue(item.summary.scope2)}</span>
          {item.summary.scope2 ? (
            <span className={style.metricSub}>
              {scope2BasisLabel(item.summary.scope2Basis)}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      title: t.industryTopColScope3,
      key: 'scope3',
      width: 130,
      align: 'right',
      render: (_, item) => (
        <span className={style.metricValue}>
          {formatEmissionValue(item.summary.scope3)}
        </span>
      ),
    },
    {
      title: t.industryTopColIntensity,
      key: 'intensity',
      width: 140,
      align: 'right',
      render: (_, item) => (
        <div className={style.metricValue}>
          <span>{formatEmissionValue(item.summary.intensity)}</span>
          {item.summary.intensity ? (
            <span className={style.metricSub}>
              {displayUnit(
                item.summary.intensityUnit || t.industryTopUnitIntensity,
              )}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      title: t.actions,
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, item) => {
        const followed = isFollowed(item.company);
        const followBusy = isFollowPending(item.company);
        return (
          <div className={style.actions}>
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
              loading={followBusy}
              disabled={
                Boolean(followingId) && followingId !== item.company.companyId
              }
              onClick={() => onToggleFollow(item)}
            >
              {followed ? t.unfollow : t.follow}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Table<IndustryTopItem>
        className={style.table}
        rowKey={item => item.company.companyId}
        columns={columns}
        dataSource={pagedItems}
        pagination={false}
        scroll={{ x: 1522 }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t.industryTopNoMatch}
            />
          ),
        }}
      />
      <div className={style.footer}>
        <span>
          {I18N.template(t.industryTopTotalCompanies, { count: items.length })}
        </span>
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

export default IndustryTopTable;
