import { useMobile } from '@/hooks/use-mobile';
import I18N from '@src/lang/I18N';
import { useQuery } from '@tanstack/react-query';
import { Alert, Input, Select, Switch } from 'antd';
import { useEffect, useId, useMemo, useState } from 'react';

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
import IndustrySummaryCards from './components/IndustrySummaryCards';
import IndustryTabs from './components/IndustryTabs';
import IndustryTopMobileList from './components/IndustryTopMobileList';
import IndustryTopTable from './components/IndustryTopTable';
import EnterpriseSectionTabs from '../EnterpriseSectionTabs';
import type { EnterpriseHubTab } from '../EnterpriseSectionTabs';
import style from './index.module.less';
import { filterAndSortTopItems } from './utils';

type IndustryTopPageProps = {
  industryParam?: string;
  yearParam?: string;
  onSwitchTab: (next: EnterpriseHubTab) => void;
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
  onSwitchTab,
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
  const [disclosedOnly, setDisclosedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [openingId, setOpeningId] = useState('');
  const disclosedSwitchId = useId();

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
  }, [
    activeIndustry,
    yearParam,
    keyword,
    rankBy,
    listingFilter,
    disclosedOnly,
  ]);

  const activeYear = listQuery.data?.year || yearParam || '';
  const availableYears = listQuery.data?.availableYears || [];
  const isPreview = Boolean(listQuery.data?.isPreview);

  const filteredItems = useMemo(
    () =>
      filterAndSortTopItems(listQuery.data?.records || [], {
        keyword,
        listingFilter,
        disclosedOnly,
        rankBy,
      }),
    [listQuery.data?.records, keyword, listingFilter, disclosedOnly, rankBy],
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

  const handleOpenCompany = async (item: IndustryTopItem) => {
    const { company } = item;
    if (!isPreview) {
      onOpenCompany(company.companyId, activeIndustry, activeYear || undefined);
      return;
    }
    if (openingId) return;
    setOpeningId(company.companyId);
    try {
      const result = await fetchCandidates(company.name, 1);
      const matched = findExactCompany(result.records, company);
      onOpenCompany(
        matched ? matched.companyId : company.companyId,
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
        <EnterpriseSectionTabs
          active='enterpriseIndustryTop'
          onChange={onSwitchTab}
        />
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
        {listQuery.data ? (
          <IndustrySummaryCards
            total={listQuery.data.total}
            disclosedCount={listQuery.data.disclosedCount}
            medianEmissions={listQuery.data.medianEmissions}
            medianUnit={listQuery.data.medianUnit}
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
          <div className={style.filtersRight}>
            <div className={style.disclosedToggle}>
              <Switch
                id={disclosedSwitchId}
                size='small'
                checked={disclosedOnly}
                onChange={setDisclosedOnly}
              />
              <label htmlFor={disclosedSwitchId}>
                {t.industryTopDisclosedOnly}
              </label>
            </div>
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
              isPreview={isPreview}
              openingId={openingId}
              onPageChange={setPage}
              onOpenCompany={handleOpenCompany}
            />
          ) : (
            <IndustryTopTable
              items={filteredItems}
              page={page}
              pageSize={PAGE_SIZE}
              isPreview={isPreview}
              openingId={openingId}
              onPageChange={setPage}
              onOpenCompany={handleOpenCompany}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default IndustryTopPage;
