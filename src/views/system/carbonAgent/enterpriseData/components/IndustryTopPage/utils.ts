import type {
  IndustryTopItem,
  IndustryTopRankBy,
  ListingFilter,
} from '../../types';
import { formatDecimal } from '../../data';
import { stockCodes } from '../../FollowCompany';

const parseNumeric = (value?: string | null) => {
  if (value == null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const formatEmissionValue = (value?: string | null) => {
  if (value == null || value.trim() === '') return '—';
  return formatDecimal(value);
};

export const filterAndSortTopItems = (
  records: IndustryTopItem[],
  options: {
    keyword: string;
    listingFilter: ListingFilter;
    rankBy: IndustryTopRankBy;
  },
): IndustryTopItem[] => {
  const query = options.keyword.trim().toLowerCase();
  const filtered = records.filter(item => {
    if (options.listingFilter === 'listed' && !item.listed) return false;
    if (options.listingFilter === 'unlisted' && item.listed) return false;
    if (!query) return true;
    const { company } = item;
    return [
      company.name,
      company.shortName,
      company.unifiedSocialCreditCode,
      company.registeredRegion,
      stockCodes(company),
    ].some(value => value?.toLowerCase().includes(query));
  });

  const getSortValue = (item: IndustryTopItem): number | null => {
    if (options.rankBy === 'revenue') {
      return parseNumeric(item.revenueBillionCny);
    }
    if (options.rankBy === 'marketCap') {
      return item.listed ? parseNumeric(item.marketCapBillionCny) : null;
    }
    if (options.rankBy === 'totalEmissions') {
      return parseNumeric(item.summary.totalEmissions);
    }
    return parseNumeric(item.summary.intensity);
  };

  return [...filtered].sort((a, b) => {
    const valA = getSortValue(a);
    const valB = getSortValue(b);
    if (valA == null && valB == null) return a.rank - b.rank;
    if (valA == null) return 1;
    if (valB == null) return -1;
    if (valA !== valB) return valB - valA;
    return a.rank - b.rank;
  });
};
