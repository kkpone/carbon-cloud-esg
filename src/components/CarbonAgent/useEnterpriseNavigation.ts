import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { checkPermissions } from '@/components/Permission/utils';
import { useUserOrgType, ORG_TYPE } from '@/hooks/useOrgType';
import I18N from '@/lang/I18N';
import { RouteMaps } from '@/router/route-paths';
import {
  getAccountingPeriodList,
  getOrgAccountData,
  getOrgTree,
  getRecentBrowseYear,
} from '@/views/enterpriseCarbonAccount2/AccountingList/service';
import type {
  OrgAccount,
  OrgAccountData,
} from '@/views/enterpriseCarbonAccount2/AccountingList/type';
import { EVersionType } from '@/views/enterpriseCarbonAccount2/accounting/fillData/service';
import { StepType } from '@/views/enterpriseCarbonAccount2/accounting/type';
import { COMPUTATION_STATUS } from '@/views/enterpriseCarbonAccount2/constant';
import { normalizeEnterpriseYear } from './context';
import { api } from './api';
import { text } from './protocol';
import type { Data } from './protocol';

export type EnterpriseNavigationParams = {
  computationId?: string;
  computationPeriod?: string;
  orgId?: string;
  orgName?: string;
  orgNames?: string[];
  periodName?: string;
  versionType?: string;
  year?: string;
  viewMode?: 'list' | 'canvas';
};

export type EnterpriseSubjectGroup = {
  title: string;
  computationPeriod?: number;
  orgList: OrgAccount[];
};

const normalizeYear = (value?: string) => {
  const raw = text(value).trim();
  if (!raw) return '';
  return normalizeEnterpriseYear(raw) || raw.replace(/年/g, '');
};

const normalizeVersionType = (value?: string): EVersionType | '' => {
  const raw = text(value).trim();
  if (raw === EVersionType.iso || /iso/i.test(raw)) {
    return EVersionType.iso;
  }
  if (raw === EVersionType.ghg || /ghg/i.test(raw)) {
    return EVersionType.ghg;
  }
  return '';
};

const extractMainParts = (orgList: OrgAccount[] = []): OrgAccount[] => {
  const result: OrgAccount[] = [];
  const walk = (item: OrgAccount) => {
    if (item.orgType === ORG_TYPE.MAIN_PART) {
      result.push(item);
    }
    item.children?.forEach(walk);
  };
  orgList.forEach(walk);
  return result;
};

const buildSubjectGroups = (
  orgAccountData?: OrgAccountData,
  orgNames?: string[],
): EnterpriseSubjectGroup[] => {
  const groups = (orgAccountData?.orgInfoList || [])
    .map(group => ({
      title: group.title,
      computationPeriod: group.computationPeriod,
      orgList: extractMainParts(group.orgList),
    }))
    .filter(group => group.orgList.length > 0);

  if (!orgNames?.length) {
    return groups;
  }

  const nameSet = new Set(orgNames.map(item => item.trim()).filter(Boolean));
  if (!nameSet.size) {
    return groups;
  }

  const filtered = groups
    .map(group => ({
      ...group,
      orgList: group.orgList.filter(org =>
        nameSet.has((org.orgName || org.name || '').trim()),
      ),
    }))
    .filter(group => group.orgList.length > 0);

  return filtered.length ? filtered : groups;
};

const isStartedMainPart = (org: OrgAccount) =>
  org.status !== COMPUTATION_STATUS.NOT_START && Boolean(org.computationId);

export function useEnterpriseNavigation() {
  const history = useHistory();
  const userOrgType = useUserOrgType();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [subjectPicker, setSubjectPicker] = useState<{
    groups: EnterpriseSubjectGroup[];
    year: string;
    versionType?: string;
    viewMode: 'list' | 'canvas';
  } | null>(null);

  const navigateToMainPart = async ({
    computationId,
    computationPeriod,
    orgId,
    orgName,
    periodName,
    statusHint,
    versionType,
    year,
    viewMode = 'canvas',
  }: {
    computationId: string;
    computationPeriod?: string;
    orgId?: string;
    orgName?: string;
    periodName?: string;
    statusHint?: number;
    versionType?: string;
    year?: string;
    viewMode?: 'list' | 'canvas';
  }) => {
    let info: Data = {};
    try {
      info = await api<Data>(
        `/enterprise/computation?computationId=${encodeURIComponent(
          computationId,
        )}${
          computationPeriod
            ? `&computationPeriod=${encodeURIComponent(computationPeriod)}`
            : ''
        }`,
      );
    } catch {
      // 若仅拿到局部参数仍允许继续拼接路由跳转，由详情页拉取最新状态
    }

    const rawStatus =
      info.computationStatus !== undefined && info.computationStatus !== null
        ? Number(info.computationStatus)
        : statusHint;
    let step = StepType.baseInfo;
    if (rawStatus === COMPUTATION_STATUS.FILLING) {
      step = StepType.fillData;
    } else if (rawStatus === COMPUTATION_STATUS.COMPLETE) {
      step = StepType.result;
    } else if (rawStatus === COMPUTATION_STATUS.BE_SUBMITTED) {
      step =
        userOrgType === ORG_TYPE.ENTERPRISE
          ? StepType.fillData
          : StepType.result;
    }

    const query = new URLSearchParams({
      computationId,
      computationPeriod: text(computationPeriod),
      orgId: text(info.orgId) || text(orgId),
      step: String(step),
      periodName: text(info.period) || text(periodName),
      year: text(info.cyear) || normalizeYear(year),
      orgName: text(info.orgName) || text(orgName),
      viewMode,
    });
    const resolvedVersionType = normalizeVersionType(versionType);
    if (resolvedVersionType) {
      query.set('versionType', resolvedVersionType);
    }

    history.push(
      `${RouteMaps.enterpriseCarbonAccountingAccounting}?${query.toString()}`,
    );
  };

  const openAccounting = async (params: EnterpriseNavigationParams) => {
    if (loading) return;
    if (!checkPermissions(true, 'enterprise:computation:info')) {
      setError(I18N.carbonAgent.viewForbidden);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const viewMode = params.viewMode || 'canvas';
      const computationId = text(params.computationId);
      if (computationId) {
        await navigateToMainPart({
          computationId,
          computationPeriod: text(params.computationPeriod),
          orgId: text(params.orgId),
          orgName: text(params.orgName),
          periodName: text(params.periodName),
          versionType: params.versionType,
          year: params.year,
          viewMode,
        });
        return;
      }

      let year = normalizeYear(params.year);
      let period = text(params.computationPeriod);
      let recentOrgId = '';
      if (!year || !params.orgId) {
        try {
          const recentResp = await getRecentBrowseYear();
          const recent = recentResp?.data?.data;
          if (!year && recent?.year) {
            year = normalizeYear(String(recent.year));
          }
          if (!period && recent?.period !== undefined && recent?.period !== null) {
            period = String(recent.period);
          }
          if (recent?.orgInfo?.id !== undefined && recent?.orgInfo?.id !== null) {
            recentOrgId = String(recent.orgInfo.id);
          }
        } catch {
          // 忽略最近访问记录读取失败，继续按已有参数查询
        }
      }

      if (!year) {
        setError(I18N.carbonAgent.enterpriseNoAvailableAccounting);
        return;
      }

      if (!period) {
        try {
          const periodResp = await getAccountingPeriodList({ cYear: year });
          const firstPeriod = periodResp?.data?.data?.[0];
          if (firstPeriod?.value !== undefined && firstPeriod?.value !== null) {
            period = String(firstPeriod.value);
          }
        } catch {
          // 忽略周期列表读取失败，尝试不带 period 查询组织核算数据
        }
      }

      let rootOrgId = '';
      if (!params.orgId && !recentOrgId) {
        try {
          const treeResp = await getOrgTree({ cYear: year });
          const firstOrg = treeResp?.data?.data?.[0];
          if (firstOrg?.id !== undefined && firstOrg?.id !== null) {
            rootOrgId = String(firstOrg.id);
          }
        } catch {
          // 忽略组织树读取失败，继续尝试已有候选 orgId
        }
      }

      const orgIdCandidates = [
        text(params.orgId),
        recentOrgId,
        rootOrgId,
        '',
      ].filter((item, index, arr) => arr.indexOf(item) === index);
      const accountDataResults = await Promise.allSettled(
        orgIdCandidates.map(candidateOrgId =>
          getOrgAccountData({
            year,
            ...(candidateOrgId ? { orgId: candidateOrgId } : {}),
            ...(period ? { period } : {}),
          }),
        ),
      );
      const orgAccountData = accountDataResults
        .map(result =>
          result.status === 'fulfilled' ? result.value?.data?.data : undefined,
        )
        .find(data => Boolean(data?.orgInfoList?.length));

      const groups = buildSubjectGroups(orgAccountData, params.orgNames);
      const startedSubjects = groups.flatMap(group =>
        group.orgList.filter(isStartedMainPart).map(org => ({ org, group })),
      );

      if (!startedSubjects.length) {
        setError(I18N.carbonAgent.enterpriseNoAvailableAccounting);
        return;
      }

      const targetOrgId = text(params.orgId);
      const directMatch = targetOrgId
        ? startedSubjects.find(({ org }) => String(org.id) === targetOrgId)
        : undefined;
      if (directMatch || startedSubjects.length === 1) {
        const picked = directMatch || startedSubjects[0];
        await navigateToMainPart({
          computationId: String(picked.org.computationId),
          computationPeriod:
            picked.org.computationPeriod !== undefined &&
            picked.org.computationPeriod !== null
              ? String(picked.org.computationPeriod)
              : picked.group.computationPeriod !== undefined &&
                picked.group.computationPeriod !== null
              ? String(picked.group.computationPeriod)
              : period,
          orgId: String(picked.org.id),
          orgName: picked.org.orgName || picked.org.name,
          periodName: picked.group.title,
          statusHint: picked.org.status,
          versionType: params.versionType,
          year,
          viewMode,
        });
        return;
      }

      setSubjectPicker({
        groups,
        year,
        versionType: params.versionType,
        viewMode,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : I18N.carbonAgent.openAccountingFailed,
      );
    } finally {
      setLoading(false);
    }
  };

  const selectSubject = async (org: OrgAccount, periodName: string) => {
    if (loading || !isStartedMainPart(org)) return;
    const picker = subjectPicker;
    setSubjectPicker(null);
    setLoading(true);
    setError('');
    try {
      await navigateToMainPart({
        computationId: String(org.computationId),
        computationPeriod:
          org.computationPeriod !== undefined && org.computationPeriod !== null
            ? String(org.computationPeriod)
            : '',
        orgId: String(org.id),
        orgName: org.orgName || org.name,
        periodName,
        statusHint: org.status,
        versionType: picker?.versionType,
        year: picker?.year,
        viewMode: picker?.viewMode || 'canvas',
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : I18N.carbonAgent.openAccountingFailed,
      );
    } finally {
      setLoading(false);
    }
  };

  const openReportList = (year?: string) => {
    const query = new URLSearchParams();
    if (year) query.set('year', year);
    const search = query.toString();
    history.push(
      `${
        RouteMaps.enterpriseCarbonAccountingcarbonDischargeAccountReportList
      }${search ? `?${search}` : ''}`,
    );
  };

  return {
    openAccounting,
    openReportList,
    subjectPicker,
    closeSubjectPicker: () => setSubjectPicker(null),
    selectSubject,
    error,
    loading,
  };
}
