import type { IndustryTopItem } from '../../types';
import { formatDecimal } from '../../data';
import { stockCodes } from '../../FollowCompany';

export const formatEmissionValue = (value?: string | null) => {
  if (value == null || value.trim() === '') return '—';
  return formatDecimal(value);
};

export const filterAndSortTopItems = (
  records: IndustryTopItem[],
  options: {
    keyword: string;
  },
): IndustryTopItem[] => {
  const query = options.keyword.trim().toLowerCase();
  const filtered = records.filter(item => {
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

  return [...filtered].sort((a, b) => a.rank - b.rank);
};
