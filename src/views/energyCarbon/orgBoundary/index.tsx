import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import {
  EnergyForbidden,
  useEnergySearch,
  useNavigate,
} from '@/views/energyCarbon/hooks/useEnergyNavigation';
/**
 * 业务检索：边界设置 - 按组织维护三类边界并配置综合能耗统计口径
 * 路由：/energyCarbon/orgBoundary
 */
import I18N from '@/lang/I18N';
import {
  Button,
  Card,
  Empty,
  Modal,
  Radio,
  Spin,
  Table,
  Tabs,
  Tree,
  Typography,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import {
  type Key,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { z } from 'zod';

import AuthButton from '@/views/energyCarbon/components/AuthButton';
import PageContainer from '@/views/energyCarbon/components/PageContainer';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import { useDataPermissionOrgTree } from '@/views/energyCarbon/hooks/useEnergyOrgTree';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
import { TABLE_DEFAULT_PAGE_SIZE } from '@/views/energyCarbon/platform/config';
import type { OrgTree } from '@/views/energyCarbon/platform/types';

import { getOrgBoundaryColumns } from './columns';
import OrgBoundaryFormDrawer, {
  type OrgBoundaryDrawerTarget,
} from './components/OrgBoundaryFormDrawer';
import {
  ORG_BOUNDARY_BUTTON_PERMISSION,
  ORG_BOUNDARY_PAGE_PERMISSION,
  ORG_BOUNDARY_TYPE,
  getOrgBoundaryTypeName,
  getOrgBoundaryTypeOptions,
} from './constant';
import {
  useDeleteOrgBoundary,
  useOrgBoundaries,
  useOrgStatisticsBoundaryConfig,
  useSaveOrgStatisticsBoundaryConfig,
} from './hooks';
import type {
  OrgBoundaryListParams,
  OrgBoundaryRecord,
  OrgBoundaryType,
} from './types';

import styles from './index.module.css';

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(TABLE_DEFAULT_PAGE_SIZE),
  orgId: z.coerce.number().int().positive().optional(),
  boundaryType: z.coerce.number().int().min(1).max(3).default(1),
});

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(ORG_BOUNDARY_PAGE_PERMISSION)) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <OrgBoundaryPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

/** 在数据权限组织树中按 ID 查找组织。 */
function findOrgById(nodes: OrgTree[], orgId: number): OrgTree | null {
  for (const node of nodes) {
    if (node.id === orgId) return node;
    const child = node.children ? findOrgById(node.children, orgId) : null;
    if (child) return child;
  }
  return null;
}

/** 获取数据权限组织树的第一个可见组织。 */
function getFirstOrg(nodes: OrgTree[]): OrgTree | null {
  return nodes[0] ?? null;
}

/** 收集组织树根节点 ID，首次加载后默认展示一级和二级组织。 */
function getDefaultExpandedOrgKeys(nodes: OrgTree[]): Key[] {
  return nodes.map(node => String(node.id));
}

/** 页面组织统一展示组织名称，避免与能碳列表的组织字段口径不一致。 */
function getOrgDisplayName(org: OrgTree): string {
  return org.name;
}

/** 转换为 Ant Design Tree 数据，禁用组织仍可选中查询但使用弱化样式。 */
function toTreeData(nodes: OrgTree[]): DataNode[] {
  return nodes.map(node => ({
    key: String(node.id),
    title: (
      <Typography.Text
        ellipsis={{ tooltip: getOrgDisplayName(node) }}
        className={node.orgStatus === 1 ? styles.disabledOrg : undefined}
      >
        <span data-testid={`org-boundary-org-${node.id}`}>
          {getOrgDisplayName(node)}
        </span>
      </Typography.Text>
    ),
    children: toTreeData(node.children ?? []),
  }));
}

function OrgBoundaryPage() {
  const { locale } = useLocale();
  const navigate = useNavigate();
  // 页面权限集合传入边界操作列和统计配置按钮，避免仅依赖前端状态判断。
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const { page, pageSize, orgId, boundaryType } = useEnergySearch(searchSchema);
  const selectedType = boundaryType as OrgBoundaryType;

  const { data: orgTree = [], isLoading: orgTreeLoading } =
    useDataPermissionOrgTree();
  const selectedOrg = useMemo(
    () => (orgId === undefined ? null : findOrgById(orgTree, orgId)),
    [orgId, orgTree],
  );
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
  const [drawerTarget, setDrawerTarget] =
    useState<OrgBoundaryDrawerTarget>(null);
  const [statisticsConfigOpen, setStatisticsConfigOpen] = useState(false);
  const [statisticsBoundaryType, setStatisticsBoundaryType] =
    useState<OrgBoundaryType>(ORG_BOUNDARY_TYPE.PRODUCTION_SYSTEM);
  const syncedConfigOrgId = useRef<number | undefined>(undefined);

  // 组织树加载后自动选择首个可见组织；URL 中失效的组织也回退到首个可见组织。
  useEffect(() => {
    if (!orgTree.length) return;
    const fallbackOrg = getFirstOrg(orgTree);
    const targetOrg = selectedOrg ?? fallbackOrg;
    if (!targetOrg || targetOrg.id === orgId) return;
    navigate({
      to: '/energyCarbon/orgBoundary',
      replace: true,
      search: {
        page: 1,
        pageSize,
        orgId: targetOrg.id,
        boundaryType: selectedType,
      },
    });
  }, [navigate, orgId, orgTree, pageSize, selectedOrg, selectedType]);

  // 异步组织树首次返回时只展开根节点，深层组织由用户继续展开。
  useEffect(() => {
    if (!orgTree.length) return;
    setExpandedKeys(getDefaultExpandedOrgKeys(orgTree));
  }, [orgTree]);

  const orgDisabled = selectedOrg?.orgStatus === 1;
  const { data: statisticsConfig } = useOrgStatisticsBoundaryConfig(
    selectedOrg?.id,
    selectedOrg !== null,
  );
  const effectiveStatisticsBoundaryType =
    statisticsConfig?.boundaryType ?? ORG_BOUNDARY_TYPE.PRODUCTION_SYSTEM;
  const { mutate: saveStatisticsConfig, isLoading: statisticsConfigSaving } =
    useSaveOrgStatisticsBoundaryConfig();

  // 切换组织、Tab 或组织状态时关闭旧上下文抽屉，避免向禁用组织提交编辑内容。
  useEffect(() => {
    setDrawerTarget(null);
  }, [orgDisabled, orgId, selectedType]);

  // 每次切换组织仅同步一次其默认类型；用户在同一组织手动切换 Tab 不会被覆盖。
  useEffect(() => {
    if (!selectedOrg || !statisticsConfig) return;
    if (syncedConfigOrgId.current === selectedOrg.id) return;
    syncedConfigOrgId.current = selectedOrg.id;
    if (statisticsConfig.boundaryType === selectedType) return;
    navigate({
      to: '/energyCarbon/orgBoundary',
      replace: true,
      search: {
        page: 1,
        pageSize,
        orgId: selectedOrg.id,
        boundaryType: statisticsConfig.boundaryType,
      },
    });
  }, [navigate, pageSize, selectedOrg, selectedType, statisticsConfig]);

  const listParams = useMemo<OrgBoundaryListParams>(
    () => ({
      pageNum: page,
      pageSize,
      orgId: selectedOrg?.id ?? 0,
      boundaryType: selectedType,
    }),
    [page, pageSize, selectedOrg?.id, selectedType],
  );

  const { data, isLoading: listLoading } = useOrgBoundaries(
    listParams,
    selectedOrg !== null && !orgDisabled,
  );
  const { mutateAsync: deleteBoundary, isLoading: deleting } =
    useDeleteOrgBoundary(listParams);

  const handleDelete = useCallback(
    async (record: OrgBoundaryRecord) => {
      await deleteBoundary(record.id);
      // 删除当前页最后一条数据时回到上一页，避免停留在无数据的空页。
      if ((data?.records.length ?? 0) === 1 && page > 1) {
        await navigate({
          to: '/energyCarbon/orgBoundary',
          search: {
            page: page - 1,
            pageSize,
            orgId: selectedOrg?.id,
            boundaryType: selectedType,
          },
        });
      }
    },
    [
      data?.records.length,
      deleteBoundary,
      navigate,
      page,
      pageSize,
      selectedOrg?.id,
      selectedType,
    ],
  );

  const columns = useMemo(
    () =>
      getOrgBoundaryColumns({
        disabled: orgDisabled,
        permissionKeys,
        onEdit: record => setDrawerTarget({ kind: 'edit', record }),
        onView: record => setDrawerTarget({ kind: 'view', record }),
        onDelete: handleDelete,
      }),
    [locale, handleDelete, orgDisabled, permissionKeys],
  );

  const treeData = useMemo(() => toTreeData(orgTree), [orgTree]);

  return (
    <PageContainer
      title={I18N.energyCarbon.cfgBoundaryManagement}
      permissionKey={ORG_BOUNDARY_PAGE_PERMISSION}
    >
      <div className={styles.workspace}>
        <Card
          title={I18N.energyCarbon.organizationList}
          className={styles.treeCard}
        >
          <Spin spinning={orgTreeLoading}>
            {treeData.length ? (
              <Tree
                blockNode
                treeData={treeData}
                selectedKeys={selectedOrg ? [String(selectedOrg.id)] : []}
                expandedKeys={expandedKeys}
                onExpand={setExpandedKeys}
                onSelect={keys => {
                  const selectedId = Number(keys[0]);
                  if (!Number.isFinite(selectedId)) return;
                  navigate({
                    to: '/energyCarbon/orgBoundary',
                    search: {
                      page: 1,
                      pageSize,
                      orgId: selectedId,
                      boundaryType: selectedType,
                    },
                  });
                }}
                className={styles.tree}
                data-testid='org-boundary-org-tree'
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={I18N.energyCarbon.noAccessibleOrganizations}
              />
            )}
          </Spin>
        </Card>

        <Card
          title={
            selectedOrg ? (
              <Typography.Text
                ellipsis={{ tooltip: getOrgDisplayName(selectedOrg) }}
              >
                {getOrgDisplayName(selectedOrg)}
              </Typography.Text>
            ) : (
              I18N.energyCarbon.cfgBoundaryList
            )
          }
          extra={
            // 统计口径文字和设置入口固定保留在当前组织卡片标题栏。
            <div className={styles.statisticsBoundaryActions}>
              {selectedOrg ? (
                <span className={styles.statisticsBoundarySummary}>
                  {I18N.energyCarbon.cfgStatisticsBoundaryLabel}
                  {getOrgBoundaryTypeName(effectiveStatisticsBoundaryType)}
                </span>
              ) : null}
              <AuthButton
                permissionKey={ORG_BOUNDARY_BUTTON_PERMISSION.STATISTICS_CONFIG}
              >
                <Button
                  type='primary'
                  disabled={!selectedOrg || orgDisabled}
                  data-testid='org-boundary-statistics-config'
                  onClick={() => {
                    setStatisticsBoundaryType(effectiveStatisticsBoundaryType);
                    setStatisticsConfigOpen(true);
                  }}
                >
                  {I18N.energyCarbon.cfgSettings}
                </Button>
              </AuthButton>
            </div>
          }
          className={styles.contentCard}
        >
          <Tabs
            activeKey={String(selectedType)}
            items={getOrgBoundaryTypeOptions().map(option => ({
              key: String(option.value),
              label: option.label,
            }))}
            tabBarExtraContent={
              // 新增入口固定跟随边界类型 Tab，保持操作对象和当前位置一致。
              <AuthButton permissionKey={ORG_BOUNDARY_BUTTON_PERMISSION.ADD}>
                <Button
                  type='primary'
                  disabled={!selectedOrg || orgDisabled}
                  data-testid='org-boundary-create'
                  onClick={() => setDrawerTarget({ kind: 'new' })}
                >
                  {I18N.energyCarbon.cfgAddBoundary}
                </Button>
              </AuthButton>
            }
            onChange={key => {
              navigate({
                to: '/energyCarbon/orgBoundary',
                search: {
                  page: 1,
                  pageSize,
                  orgId: selectedOrg?.id,
                  boundaryType: Number(key) as OrgBoundaryType,
                },
              });
            }}
            data-testid='org-boundary-type-tabs'
          />

          {selectedOrg ? (
            <Table
              rowKey='id'
              columns={columns}
              dataSource={orgDisabled ? [] : data?.records ?? []}
              loading={!orgDisabled && (listLoading || deleting)}
              scroll={{ x: 740 }}
              pagination={{
                current: page,
                pageSize,
                total: orgDisabled ? 0 : data?.total ?? 0,
                showSizeChanger: true,
                onChange: (nextPage, nextPageSize) => {
                  navigate({
                    to: '/energyCarbon/orgBoundary',
                    search: {
                      page: nextPage,
                      pageSize: nextPageSize,
                      orgId: selectedOrg.id,
                      boundaryType: selectedType,
                    },
                  });
                },
              }}
              data-testid='org-boundary-table'
            />
          ) : (
            <Empty description={I18N.energyCarbon.organizationRequired} />
          )}
        </Card>
      </div>

      <OrgBoundaryFormDrawer
        target={drawerTarget}
        orgId={selectedOrg?.id ?? 0}
        orgName={selectedOrg ? getOrgDisplayName(selectedOrg) : ''}
        boundaryType={selectedType}
        listParams={listParams}
        onClose={() => setDrawerTarget(null)}
      />

      <Modal
        title={I18N.energyCarbon.cfgStatisticsBoundary}
        open={statisticsConfigOpen}
        confirmLoading={statisticsConfigSaving}
        okText={I18N.common.actions.save}
        onCancel={() => setStatisticsConfigOpen(false)}
        onOk={() => {
          if (!selectedOrg) return;
          saveStatisticsConfig(
            { orgId: selectedOrg.id, boundaryType: statisticsBoundaryType },
            {
              onSuccess: config => {
                setStatisticsConfigOpen(false);
                navigate({
                  to: '/energyCarbon/orgBoundary',
                  search: {
                    page: 1,
                    pageSize,
                    orgId: config.orgId,
                    boundaryType: config.boundaryType,
                  },
                });
              },
            },
          );
        }}
        data-testid='org-boundary-statistics-config-modal'
      >
        <Radio.Group
          value={statisticsBoundaryType}
          onChange={event =>
            setStatisticsBoundaryType(event.target.value as OrgBoundaryType)
          }
          options={getOrgBoundaryTypeOptions().map(option => ({
            label: option.label,
            value: option.value,
          }))}
          data-testid='org-boundary-statistics-config-type'
        />
      </Modal>
    </PageContainer>
  );
}
