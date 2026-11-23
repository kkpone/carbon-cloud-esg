import { useMobile } from '@/hooks/use-mobile';
import I18N from '@src/lang/I18N';
import { useQuery } from '@tanstack/react-query';
import { Alert, Input, message, Select } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';

import searchIcon from '../../assets/search.svg';
import { ErrorState, Loading } from '../../components';
import { DEFAULT_INDUSTRY_CODE, isIndustryCode } from '../../industries';
import {
  fetchCandidates,
  fetchIndustryTopList,
  fetchIndustryTopOverviews,
} from '../../service';
import { useEnterpriseData } from '../../state';
import type {
  Company,
  IndustryCode,
  IndustryTopItem,
  IndustryTopRankBy,
  ListingFilter,
} from '../../types';
import IndustryTabs from './components/IndustryTabs';
import IndustryTopMobileList from './components/IndustryTopMobileList';
import IndustryTopTable from './components/IndustryTopTable';
import FollowedPreviewSection from './components/FollowedPreviewSection';
import style from './index.module.less';
import { filterAndSortTopItems } from './utils';

type IndustryTopPageProps = {
  industryParam?: string;
  yearParam?: string;
  onOpenFollows: () => void;
  onCompare: () => void;
  onParamsChange: (next: { industry: IndustryCode; year?: string }) => void;
  onOpenCompany: (
    companyId: string,
    industry: IndustryCode,
    year?: string,
  ) => void;
};

const PAGE_SIZE = 20;

const IndustryTopPage = ({
  industryParam,
  yearParam,
  onOpenFollows,
  onCompare,
  onParamsChange,
  onOpenCompany,
}: IndustryTopPageProps) => {
  const state = useEnterpriseData();
  const isMobile = useMobile();
  const t = I18N.enterpriseData;
  const activeIndustry: IndustryCode = isIndustryCode(industryParam)
    ? industryParam
    : DEFAULT_INDUSTRY_CODE;

  const [keyword, setKeyword] = useState('');
  const [rankBy, setRankBy] = useState<IndustryTopRankBy>('revenue');
  const [listingFilter, setListingFilter] = useState<ListingFilter>('all');
  const [page, setPage] = useState(1);
  const [openingId, setOpeningId] = useState('');
  const [followingId, setFollowingId] = useState('');
  const resolvedCompanyIdMapRef = useRef<Map<string, string>>(new Map());

  const overviewsQuery = useQuery({
    queryKey: ['enterpriseData', state.scope, 'industryTopOverviews'],
    queryFn: ({ signal }) => fetchIndustryTopOverviews(signal),
    enabled: state.enabled,
    retry: false,
    staleTime: 60000,
  });

  const listQuery = useQuery({
    queryKey: [
      'enterpriseData',
      state.scope,
      'industryTopList',
      activeIndustry,
      yearParam || '',
    ],
    queryFn: ({ signal }) =>
      fetchIndustryTopList(
        {
          industryCode: activeIndustry,
          year: yearParam || undefined,
        },
        signal,
      ),
    enabled: state.enabled,
    retry: false,
    staleTime: 60000,
  });

  useEffect(() => {
    setPage(1);
  }, [activeIndustry, yearParam, keyword, rankBy, listingFilter]);

  const activeYear = listQuery.data?.year || yearParam || '';
  const availableYears = listQuery.data?.availableYears || [];
  const isPreview = Boolean(listQuery.data?.isPreview);

  const filteredItems = useMemo(
    () =>
      filterAndSortTopItems(listQuery.data?.records || [], {
        keyword,
        listingFilter,
        rankBy,
      }),
    [listQuery.data?.records, keyword, listingFilter, rankBy],
  );

  const rankBasisText = useMemo(() => {
    if (rankBy === 'marketCap') return t.industryTopRankBasisMarketCap;
    if (rankBy === 'totalEmissions') return t.industryTopRankBasisEmissions;
    if (rankBy === 'intensity') return t.industryTopRankBasisIntensity;
    return t.industryTopRankBasisRevenue;
  }, [rankBy, t]);

  const handleIndustrySelect = (nextIndustry: IndustryCode) => {
    onParamsChange({ industry: nextIndustry, year: yearParam });
  };

  const handleYearChange = (nextYear: string) => {
    onParamsChange({ industry: activeIndustry, year: nextYear });
  };

  const findExactCompany = (records: Company[], target: Company) => {
    const targetCodes = new Set(
      (target.securities || []).map(item => item.code.toUpperCase()),
    );
    return (
      records.find(
        item =>
          item.name === target.name ||
          (target.shortName && item.shortName === target.shortName) ||
          (item.securities || []).some(security =>
            targetCodes.has(security.code.toUpperCase()),
          ),
      ) || records[0]
    );
  };

  const resolveBackendCompanyId = async (company: Company) => {
    if (!isPreview) return company.companyId;
    const cached = resolvedCompanyIdMapRef.current.get(company.companyId);
    if (cached) return cached;
    const result = await fetchCandidates(company.name, 1);
    const matched = findExactCompany(result.records, company);
    if (matched?.companyId) {
      resolvedCompanyIdMapRef.current.set(company.companyId, matched.companyId);
      return matched.companyId;
    }
    return null;
  };

  const findFollowedEnterpriseId = (company: Company) => {
    const follows = state.follows.data || [];
    const cachedId = resolvedCompanyIdMapRef.current.get(company.companyId);
    const targetCodes = new Set(
      (company.securities || []).map(item => item.code.toUpperCase()),
    );
    const matched = follows.find(follow => {
      if (
        follow.enterpriseId === company.companyId ||
        (cachedId && follow.enterpriseId === cachedId)
      ) {
        return true;
      }
      const followedCompany = follow.company;
      if (!followedCompany) return false;
      return (
        followedCompany.name === company.name ||
        (company.shortName &&
          followedCompany.shortName === company.shortName) ||
        (followedCompany.securities || []).some(security =>
          targetCodes.has(security.code.toUpperCase()),
        )
      );
    });
    return matched?.enterpriseId || null;
  };

  const handleToggleFollow = async (item: IndustryTopItem) => {
    const { company } = item;
    if (!state.enabled) {
      message.warning(t.readonly);
      return;
    }
    if (followingId) return;
    if (state.follows.isError || state.entitlement.isError) {
      message.error(t.limitsFailed);
      return;
    }
    const followedEnterpriseId = findFollowedEnterpriseId(company);
    if (followedEnterpriseId) {
      setFollowingId(company.companyId);
      try {
        await state.mutateFollow(followedEnterpriseId, false);
      } finally {
        setFollowingId('');
      }
      return;
    }
    const count = state.follows.data?.length ?? 0;
    const limit = state.entitlement.data?.followLimit ?? 0;
    if (!state.follows.isSuccess || !state.entitlement.isSuccess) {
      message.warning(t.limitsFailed);
      return;
    }
    if (limit <= 0) {
      message.warning(t.followUnavailable);
      return;
    }
    if (count >= limit) {
      message.warning(I18N.template(t.followLimitExceeded, { limit }));
      return;
    }
    setFollowingId(company.companyId);
    try {
      const targetId = await resolveBackendCompanyId(company);
      if (!targetId) {
        message.warning(t.followCompanyNotFound);
        return;
      }
      await state.mutateFollow(targetId, true);
    } catch {
      message.error(t.requestFailed);
    } finally {
      setFollowingId('');
    }
  };

  const handleOpenCompany = async (item: IndustryTopItem) => {
    const { company } = item;
    if (!isPreview) {
      onOpenCompany(company.companyId, activeIndustry, activeYear || undefined);
      return;
    }
    if (openingId) return;
    setOpeningId(company.companyId);
    try {
      const resolvedId = await resolveBackendCompanyId(company);
      onOpenCompany(
        resolvedId || company.companyId,
        activeIndustry,
        activeYear || undefined,
      );
    } catch {
      onOpenCompany(company.companyId, activeIndustry, activeYear || undefined);
    } finally {
      setOpeningId('');
    }
  };

  return (
    <div className={style.page}>
      <header className={style.header}>
        <h1>{t.industryTopTitle}</h1>
        <div className={style.headerMeta}>
          <span>{rankBasisText}</span>
          {listQuery.data?.updatedAt ? (
            <span>
              {I18N.template(t.industryTopUpdatedAt, {
                time: listQuery.data.updatedAt,
              })}
            </span>
          ) : null}
        </div>
      </header>
      <div className={style.body}>
        <FollowedPreviewSection
          onOpenMore={onOpenFollows}
          onCompare={onCompare}
        />
        <div className={style.subHeader}>
          <p>{t.industryTopSubtitle}</p>
        </div>
        <IndustryTabs
          activeIndustry={activeIndustry}
          overviews={overviewsQuery.data?.items || []}
          onSelect={handleIndustrySelect}
        />
        {isPreview ? (
          <Alert
            className={style.banner}
            type='info'
            showIcon
            message={t.industryTopPreviewBanner}
          />
        ) : null}
        <div className={style.toolbar}>
          <div className={style.filtersLeft}>
            <Input
              className={style.search}
              allowClear
              prefix={<img src={searchIcon} alt='' />}
              placeholder={t.industryTopSearchPlaceholder}
              aria-label={t.industryTopSearchPlaceholder}
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
            />
            {availableYears.length ? (
              <Select
                className={style.select}
                aria-label={t.industryTopYearLabel}
                value={activeYear}
                options={availableYears.map(year => ({
                  label: year,
                  value: year,
                }))}
                onChange={handleYearChange}
              />
            ) : null}
            <Select<IndustryTopRankBy>
              className={style.select}
              aria-label={t.industryTopRankByLabel}
              value={rankBy}
              options={[
                { value: 'revenue', label: t.industryTopRankByRevenue },
                { value: 'marketCap', label: t.industryTopRankByMarketCap },
                {
                  value: 'totalEmissions',
                  label: t.industryTopRankByEmissions,
                },
                { value: 'intensity', label: t.industryTopRankByIntensity },
              ]}
              onChange={setRankBy}
            />
            <Select<ListingFilter>
              className={style.select}
              aria-label={t.industryTopListingFilterLabel}
              value={listingFilter}
              options={[
                { value: 'all', label: t.industryTopListingAll },
                { value: 'listed', label: t.industryTopListingListed },
                { value: 'unlisted', label: t.industryTopListingUnlisted },
              ]}
              onChange={setListingFilter}
            />
          </div>
        </div>
        <div className={style.tableCard}>
          {listQuery.isError ? (
            <ErrorState
              error={listQuery.error}
              onRetry={() => listQuery.refetch()}
            />
          ) : listQuery.isLoading ? (
            <Loading />
          ) : isMobile ? (
            <IndustryTopMobileList
              items={filteredItems}
              page={page}
              pageSize={PAGE_SIZE}
              openingId={openingId}
              followingId={followingId}
              isFollowed={company => Boolean(findFollowedEnterpriseId(company))}
              isFollowPending={company => {
                const followedId = findFollowedEnterpriseId(company);
                return (
                  followingId === company.companyId ||
                  state.pending.includes(company.companyId) ||
                  Boolean(followedId && state.pending.includes(followedId))
                );
              }}
              onPageChange={setPage}
              onOpenCompany={handleOpenCompany}
              onToggleFollow={handleToggleFollow}
            />
          ) : (
            <IndustryTopTable
              items={filteredItems}
              page={page}
              pageSize={PAGE_SIZE}
              openingId={openingId}
              followingId={followingId}
              isFollowed={company => Boolean(findFollowedEnterpriseId(company))}
              isFollowPending={company => {
                const followedId = findFollowedEnterpriseId(company);
                return (
                  followingId === company.companyId ||
                  state.pending.includes(company.companyId) ||
                  Boolean(followedId && state.pending.includes(followedId))
                );
              }}
              onPageChange={setPage}
              onOpenCompany={handleOpenCompany}
              onToggleFollow={handleToggleFollow}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default IndustryTopPage;
