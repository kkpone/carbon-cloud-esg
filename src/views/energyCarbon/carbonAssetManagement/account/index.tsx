import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import {
  EnergyForbidden,
  useEnergySearch,
  useNavigate,
} from '@/views/energyCarbon/hooks/useEnergyNavigation';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
/**
 * 业务检索：碳账户概览 - 按组织数据权限查询 CEA、CCER 账户余量及汇总
 * 路由：/energyCarbon/carbonAssetManagement/account
 */
import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import {
  type TableColumnsType,
  Card,
  Empty,
  Modal,
  Spin,
  Table,
  TreeSelect,
  Typography,
} from 'antd';

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { z } from 'zod';

import PageContainer from '@/views/energyCarbon/components/PageContainer';
import { useDataPermissionOrgTree } from '@/views/energyCarbon/hooks/useEnergyOrgTree';
import type { OrgTree } from '@/views/energyCarbon/platform/types';
import { mapOrgTreeToTreeSelectData } from '@/views/energyCarbon/platform/utils';

import { CARBON_ACCOUNT_PAGE_PERMISSION } from './constant';
import { useCarbonAccountOverview } from './hooks';
import type { CarbonAccountDetailRow, CarbonAssetSummary } from './types';

import styles from './index.module.css';

const searchSchema = z.object({
  orgId: z.coerce.number().int().positive().optional(),
});

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(CARBON_ACCOUNT_PAGE_PERMISSION)) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <CarbonAccountPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

/** 在完整数据权限树中查找组织。 */
function findOrg(nodes: OrgTree[], orgId: number): OrgTree | undefined {
  for (const node of nodes) {
    if (node.id === orgId) return node;
    const child = findOrg(node.children ?? [], orgId);
    if (child) return child;
  }
  return undefined;
}

/** 按页面顺序获取第一个启用组织。 */
function firstEnabledOrg(nodes: OrgTree[]): OrgTree | undefined {
  for (const node of nodes) {
    if (node.orgStatus !== 1) return node;
    const child = firstEnabledOrg(node.children ?? []);
    if (child) return child;
  }
  return undefined;
}

/** 碳账户摘要按需求以“碳资产、余量”两列表格展示接口汇总数据。 */
const getCarbonAccountSummaryColumns =
  (): TableColumnsType<CarbonAssetSummary> => [
    {
      title: I18N.energyCarbon.assetCarbonAsset,
      dataIndex: 'carbonAssetName',
      key: 'carbonAssetName',
    },
    {
      title: I18N.energyCarbon.assetBalance,
      dataIndex: 'balance',
      key: 'balance',
    },
  ];

/** 组织卡片详情按截图固定展示资产总余量及两个组成账户，单位统一为 tCO2。 */
const getCarbonAccountDetailColumns =
  (): TableColumnsType<CarbonAccountDetailRow> => [
    {
      title: I18N.energyCarbon.assetCarbonAsset,
      dataIndex: 'carbonAssetName',
      key: 'carbonAssetName',
    },
    {
      title: I18N.energyCarbon.assetBalance,
      dataIndex: 'balance',
      key: 'balance',
    },
    {
      title: I18N.energyCarbon.assetRegistryBalance,
      dataIndex: 'registryBalance',
      key: 'registryBalance',
    },
    {
      title: I18N.energyCarbon.assetTradingBalance,
      dataIndex: 'tradingBalance',
      key: 'tradingBalance',
    },
  ];

function CarbonAccountPage() {
  const { locale } = useLocale();
  const carbonAccountSummaryColumns = useMemo(
    () => getCarbonAccountSummaryColumns(),
    [locale],
  );
  const carbonAccountDetailColumns = useMemo(
    () => getCarbonAccountDetailColumns(),
    [locale],
  );
  const navigate = useNavigate();
  const { orgId } = useEnergySearch(searchSchema);
  const [detailOrgId, setDetailOrgId] = useState<number | null>(null);
  const { data: orgTree = [], isLoading: orgLoading } =
    useDataPermissionOrgTree();
  const selectedOrg = useMemo(
    () => (orgId === undefined ? undefined : findOrg(orgTree, orgId)),
    [orgId, orgTree],
  );
  const orgTreeData = useMemo(
    () => mapOrgTreeToTreeSelectData(orgTree, { disableInactive: true }),
    [orgTree],
  );

  // 首次进入或 URL 组织失效时回退到第一个启用且有数据权限的组织。
  useEffect(() => {
    if (!orgTree.length) return;
    if (selectedOrg && selectedOrg.orgStatus !== 1) return;
    const fallback = firstEnabledOrg(orgTree);
    if (!fallback || fallback.id === orgId) return;
    navigate({
      to: '/energyCarbon/carbonAssetManagement/account',
      replace: true,
      search: { orgId: fallback.id },
    });
  }, [navigate, orgId, orgTree, selectedOrg]);

  const activeOrgId =
    selectedOrg && selectedOrg.orgStatus !== 1 ? selectedOrg.id : undefined;
  const { data, isLoading } = useCarbonAccountOverview(activeOrgId);
  // 后端按当前租户、可见组织和未删除交易返回标记；余额为 0 但存在交易的组织仍保留。
  const organizationsWithTrade =
    data?.organizations.filter(
      organization => organization.hasTrade === true,
    ) ?? [];
  const selectedOrganization = organizationsWithTrade.find(
    organization => organization.orgId === detailOrgId,
  );
  const detailRows: CarbonAccountDetailRow[] = selectedOrganization
    ? [
        {
          key: 'CEA',
          carbonAssetName: I18N.energyCarbon.assetCeaAllowance,
          balance: selectedOrganization.ceaBalance,
          registryBalance: selectedOrganization.ceaRegistryBalance,
          tradingBalance: selectedOrganization.ceaTradingBalance,
        },
        {
          key: 'CCER',
          carbonAssetName: 'CCER',
          balance: selectedOrganization.ccerBalance,
          registryBalance: selectedOrganization.ccerRegistryBalance,
          tradingBalance: selectedOrganization.ccerTradingBalance,
        },
      ]
    : [];

  return (
    <PageContainer
      title={I18N.energyCarbon.assetAccountOverview}
      permissionKey={CARBON_ACCOUNT_PAGE_PERMISSION}
    >
      <div className={styles.toolbar}>
        <span className={styles.toolbarLabel}>
          {I18N.common.fields.organization}
        </span>
        <TreeSelect
          value={activeOrgId}
          treeData={orgTreeData}
          treeDefaultExpandAll
          showSearch
          treeNodeFilterProp='title'
          loading={orgLoading}
          placeholder={I18N.common.validation.organizationRequired}
          className={styles.orgSelector}
          data-testid='carbon-account-org'
          onChange={(nextOrgId: number) => {
            navigate({
              to: '/energyCarbon/carbonAssetManagement/account',
              search: { orgId: nextOrgId },
            });
          }}
        />
      </div>

      <Spin spinning={isLoading || orgLoading}>
        {!activeOrgId ? (
          <Empty description={I18N.energyCarbon.assetNoAvailableOrg} />
        ) : (
          <>
            <Table<CarbonAssetSummary>
              className={styles.summaryTable}
              rowKey='carbonAsset'
              columns={carbonAccountSummaryColumns}
              dataSource={data?.assetSummary ?? []}
              pagination={false}
              data-testid='carbon-account-summary-table'
            />

            {organizationsWithTrade.length ? (
              <div className={styles.organizationGrid}>
                {organizationsWithTrade.map(organization => (
                  <Card
                    key={organization.orgId}
                    className={styles.organizationCard}
                    hoverable
                    title={
                      <Typography.Text
                        ellipsis={{ tooltip: organization.orgName }}
                      >
                        {organization.orgName}
                      </Typography.Text>
                    }
                    role='button'
                    tabIndex={0}
                    aria-label={I18N.template(
                      I18N.energyCarbon.assetViewOrgAccount,
                      { orgName: organization.orgName },
                    )}
                    onClick={() => setDetailOrgId(organization.orgId)}
                    onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setDetailOrgId(organization.orgId);
                      }
                    }}
                    data-testid={`carbon-account-org-card-${organization.orgId}`}
                  >
                    <div className={styles.organizationValues}>
                      <div>
                        <div className={styles.balanceLabel}>
                          {I18N.energyCarbon.assetCeaBalance}
                        </div>
                        <div className={styles.balanceValue}>
                          {organization.ceaBalance}
                        </div>
                      </div>
                      <div>
                        <div className={styles.balanceLabel}>
                          {I18N.energyCarbon.assetCcerBalance}
                        </div>
                        <div className={styles.balanceValue}>
                          {organization.ccerBalance}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Empty description={I18N.energyCarbon.assetNoAccountData} />
            )}

            {selectedOrganization ? (
              <Modal
                title={I18N.energyCarbon.assetAccountDetails}
                open
                centered
                width={860}
                footer={null}
                destroyOnClose
                onCancel={() => setDetailOrgId(null)}
              >
                <div
                  className={styles.accountDetail}
                  role='region'
                  aria-label={I18N.template(
                    I18N.energyCarbon.assetOrgAccountDetails,
                    { orgName: selectedOrganization.orgName },
                  )}
                  data-testid='carbon-account-detail'
                >
                  <div className={styles.accountDetailOrg}>
                    {I18N.energyCarbon.assetOrganizationPrefix}
                    {selectedOrganization.orgName}
                  </div>
                  <Table<CarbonAccountDetailRow>
                    bordered
                    size='small'
                    rowKey='key'
                    columns={carbonAccountDetailColumns}
                    dataSource={detailRows}
                    pagination={false}
                    data-testid='carbon-account-detail-table'
                  />
                </div>
              </Modal>
            ) : null}
          </>
        )}
      </Spin>
    </PageContainer>
  );
}
