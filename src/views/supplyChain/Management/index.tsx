import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import operatorAvatar from '@assets/svg/icon_avatar.svg';
import { Form } from '@formily/core';
import { checkPermissions } from '@src/components/Permission/utils';
import { IconAlibabaNew } from '@src/components/iconfont';
import I18N from '@src/lang/I18N';
import { RouteMapsSupplyChain2 } from '@src/router/route-paths/supplyChain2';
import {
  INVITE_STATUS,
  INVITE_STATUS_LABEL,
  SUPPLIER_STATUS,
  SUPPLIER_STATUS_LABEL,
} from '@src/views/supplyChain/constant';
import {
  Button,
  Empty,
  Input,
  Modal,
  Popover,
  Select,
  Spin,
  Switch,
  Tabs,
} from 'antd';
import classNames from 'classnames';
import { debounce, omit } from 'lodash-es';
import { FC, UIEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { Toast } from '@/utils';

import SupplierPanel from './SupplierPanel';
import chevronDownActive from './assets/chevron-down-active.svg';
import chevronDown from './assets/chevron-down.svg';
import styles from './index.module.less';
import {
  editSupplierStatus,
  getOverviewInfo,
  getSupplierList,
  inviteSupplier,
} from './service';
import type { OverviewInfo } from './type';
import SupplierDetails from '../Supplier/components/SupplierDetails';
import { addSupplier } from '../Supplier/service';
import type { Supplier, SupplierDetails as SupplierDetailsType } from '../type';

const PAGE_SIZE = 50;

const OVERVIEW_CATEGORY = {
  notJoin: {
    label: I18N.supplyChain.notJoined,
    color: '#E2D1F9',
  },
  sentInvitation: {
    label: I18N.supplyChain.sendInvitation,
    color: '#8AAAE5',
  },
  createAccount: {
    label: I18N.supplyChain.createAnAccount,
    color: '#F2BB69',
  },
  joinFill: {
    label: I18N.supplyChain.participateInFillingOut,
    color: '#0CBF9F',
  },
  completeFill: {
    label: I18N.supplyChain.completeTheFillingProcess,
    color: '#048677',
  },
};

type SupplierFilters = {
  companyName?: string;
  inviteStatus?: number | string;
  status?: number;
};

const SupplyChainManagement: FC = () => {
  const history = useHistory();
  const addFormRef = useRef<Form>(null);
  const pendingSelectedId = useRef<number>();
  const listRequestVersion = useRef(0);
  const [currSupplier, setCurrSupplier] = useState<Supplier | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [overViewInfo, setOverviewInfo] = useState<OverviewInfo>({});
  const [supplierList, setSupplierList] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>();
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [supplierListExpanded, setSupplierListExpanded] = useState(true);
  const [filters, setFilters] = useState<SupplierFilters>({
    inviteStatus: 'all',
  });

  /** 刷新供应商参与度 */
  const loadOverview = () => {
    getOverviewInfo().then(({ data }) => {
      setOverviewInfo(data.data);
    });
  };

  /** 新增供应商并按操作类型决定是否邀请 */
  const submitAdd = async (inviteFlag?: boolean) => {
    const form = addFormRef.current;
    if (!form) {
      return;
    }
    const formValues = await form.submit<SupplierDetailsType>();
    const supplierValues = {
      ...formValues,
      supplierIdName: omit(formValues.supplierIdName, 'isManualInput'),
      area: formValues.area ? JSON.stringify(formValues.area) : undefined,
    };
    try {
      setAddLoading(true);
      const response = await addSupplier({ ...supplierValues, inviteFlag });
      pendingSelectedId.current = response.data.data;
      Toast(
        'success',
        inviteFlag
          ? I18N.supplyChain.invitationSuccessful
          : I18N.carbonFootprint.saveSuccessful,
      );
      setAddOpen(false);
      setReloadKey(value => value + 1);
      loadOverview();
    } finally {
      setAddLoading(false);
    }
  };

  const onSearchNameInput = useMemo(
    () =>
      debounce((companyName: string) => {
        setFilters(value => ({ ...value, companyName }));
      }, 300),
    [],
  );

  useEffect(
    () => () => {
      onSearchNameInput.cancel();
    },
    [onSearchNameInput],
  );

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    let active = true;
    listRequestVersion.current += 1;
    const requestVersion = listRequestVersion.current;
    const targetId = pendingSelectedId.current;
    pendingSelectedId.current = undefined;
    setLoading(true);
    setLoadingMore(false);
    setSupplierList([]);
    setTotal(0);
    setPageNum(1);
    if (!targetId) {
      setSelectedSupplierId(undefined);
    }
    getSupplierList({
      pageNum: 1,
      pageSize: PAGE_SIZE,
      ...filters,
      inviteStatus:
        filters.inviteStatus === 'all' ? undefined : filters.inviteStatus,
    })
      .then(({ data }) => {
        if (!active || requestVersion !== listRequestVersion.current) {
          return;
        }
        const rows = data.rows || [];
        setSupplierList(rows);
        setTotal(data.total);
        setPageNum(1);
        setSelectedSupplierId(
          targetId && rows.some(item => item.supplierId === targetId)
            ? targetId
            : rows[0]?.supplierId,
        );
      })
      .finally(() => {
        if (active && requestVersion === listRequestVersion.current) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [filters, reloadKey]);

  /** 滚动到列表底部时加载下一页 */
  const onSupplierScroll = (event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    if (
      loadingMore ||
      supplierList.length >= total ||
      target.scrollHeight - target.scrollTop - target.clientHeight > 80
    ) {
      return;
    }
    const nextPage = pageNum + 1;
    const requestVersion = listRequestVersion.current;
    setLoadingMore(true);
    getSupplierList({
      pageNum: nextPage,
      pageSize: PAGE_SIZE,
      ...filters,
      inviteStatus:
        filters.inviteStatus === 'all' ? undefined : filters.inviteStatus,
    })
      .then(({ data }) => {
        if (requestVersion !== listRequestVersion.current) {
          return;
        }
        setSupplierList(current => {
          const supplierMap = new Map(
            current.map(item => [item.supplierId, item]),
          );
          (data.rows || []).forEach(item => {
            supplierMap.set(item.supplierId, item);
          });
          return Array.from(supplierMap.values());
        });
        setPageNum(nextPage);
        setTotal(data.total);
      })
      .finally(() => {
        if (requestVersion === listRequestVersion.current) {
          setLoadingMore(false);
        }
      });
  };

  /** 切换供应商启用状态 */
  const toggleSupplierStatus = async (supplier: Supplier, status: boolean) => {
    setSupplierList(current =>
      current.map(item =>
        item.supplierId === supplier.supplierId
          ? { ...item, statusLoading: true }
          : item,
      ),
    );
    try {
      await editSupplierStatus({
        supplierId: supplier.supplierId,
        status: Number(status),
      });
      Toast('success', I18N.carbonFootprint.operationSuccessful);
      setSupplierList(current =>
        current.map(item =>
          item.supplierId === supplier.supplierId
            ? {
                ...item,
                status: status
                  ? SUPPLIER_STATUS.ENABLED
                  : SUPPLIER_STATUS.DISABLED,
                statusLoading: false,
              }
            : item,
        ),
      );
    } catch (error) {
      setSupplierList(current =>
        current.map(item =>
          item.supplierId === supplier.supplierId
            ? { ...item, statusLoading: false }
            : item,
        ),
      );
      throw error;
    }
  };

  const overviewContent = (
    <div className={styles.overviewPopover}>
      <div className={styles.overviewTitle}>
        <span>{I18N.supplyChain.totalNumberOfSuppliers}</span>
        <strong>{overViewInfo.all || 0}</strong>
      </div>
      <div className={styles.overviewBar}>
        {Object.entries(OVERVIEW_CATEGORY).map(([key, value]) => (
          <span
            key={key}
            style={{
              background: value.color,
              width: `${
                overViewInfo.all
                  ? ((overViewInfo[key] || 0) / overViewInfo.all) * 100
                  : 0
              }%`,
            }}
          />
        ))}
      </div>
      <div className={styles.overviewLegend}>
        {Object.entries(OVERVIEW_CATEGORY).map(([key, value]) => (
          <div key={key} className={styles.overviewLegendItem}>
            <span
              className={styles.overviewDot}
              style={{ background: value.color }}
            />
            <span className={styles.overviewLabel}>{value.label}：</span>
            <span className={styles.overviewValue}>
              {overViewInfo[key] || 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={styles.supplyChainManage}>
      <Modal
        title={I18N.router.invitingSuppliers}
        open={!!currSupplier}
        width={460}
        okButtonProps={{ loading: inviteLoading }}
        onOk={async () => {
          if (!currSupplier) {
            return;
          }
          try {
            setInviteLoading(true);
            await inviteSupplier({ supplierId: currSupplier.supplierId });
            Toast('success', I18N.supplyChain.invitationSuccessful);
            setCurrSupplier(null);
            pendingSelectedId.current = selectedSupplierId;
            setReloadKey(value => value + 1);
            loadOverview();
          } finally {
            setInviteLoading(false);
          }
        }}
        onCancel={() => setCurrSupplier(null)}
      >
        <span>{I18N.supplyChain.confirmInvitation}</span>
        <span className={styles.modalSupplierName}>
          {currSupplier?.companyName}
        </span>
        <span>？</span>
      </Modal>
      <Modal
        className={styles.addSupplierModal}
        title={I18N.supplyChain2.addNewSuppliers}
        open={addOpen}
        width={728}
        centered
        destroyOnClose
        maskClosable={false}
        onCancel={() => setAddOpen(false)}
        footer={[
          <Button key='cancel' onClick={() => setAddOpen(false)}>
            {I18N.carbonFootprint.cancel}
          </Button>,
          <Button key='save' loading={addLoading} onClick={() => submitAdd()}>
            {I18N.carbonFootprint.preserve}
          </Button>,
          <Button
            key='invite'
            type='primary'
            loading={addLoading}
            onClick={() => submitAdd(true)}
          >
            {I18N.supplyChain.invite}
          </Button>,
        ]}
      >
        <div className={styles.addForm}>
          <SupplierDetails
            isAdd
            columns={2}
            className={styles.addSupplierForm}
            colon={false}
            ref={addFormRef}
          />
        </div>
      </Modal>
      <section className={styles.topSection}>
        <header className={styles.header}>
          <div className={styles.title}>
            {I18N.supplyChain2.supplierManagement}
          </div>
          <Popover
            overlayClassName={styles.overviewPopoverOverlay}
            content={overviewContent}
            placement='bottomRight'
            arrow={false}
            open={overviewOpen}
            trigger='click'
            onOpenChange={setOverviewOpen}
          >
            <button
              className={classNames(styles.involvement, {
                [styles.involvementOpen]: overviewOpen,
              })}
              type='button'
              aria-expanded={overviewOpen}
            >
              <span>{I18N.supplyChain.supplierInvolvement}</span>
              <span
                className={classNames(styles.involvementIcon, {
                  [styles.involvementIconOpen]: overviewOpen,
                })}
              >
                <img
                  src={overviewOpen ? chevronDownActive : chevronDown}
                  alt=''
                />
              </span>
            </button>
          </Popover>
        </header>
        <div className={styles.toolbar}>
          <div className={styles.filterActions}>
            <Input
              className={styles.searchInput}
              placeholder={I18N.carbonFootprint3.supplierName}
              suffix={<SearchOutlined style={{ color: '#999EA4' }} />}
              onChange={event => onSearchNameInput(event.target.value)}
            />
            <Select
              className={styles.statusSelect}
              value={filters.status}
              placeholder={I18N.supplyChain.enableStatus}
              allowClear
              options={Object.values(SUPPLIER_STATUS).map(status => ({
                value: status,
                label: SUPPLIER_STATUS_LABEL[status],
              }))}
              onChange={status => setFilters(value => ({ ...value, status }))}
            />
          </div>
          <div className={styles.toolbarActions}>
            {checkPermissions(
              <Button
                icon={<IconAlibabaNew type='icon-icon-daoru' />}
                onClick={() =>
                  history.push(RouteMapsSupplyChain2.supplyChainSupplierImport)
                }
              >
                {I18N.carbonFootprint.batchImport}
              </Button>,
              'supplier:import',
            )}
            {checkPermissions(
              <Button
                type='primary'
                icon={<PlusOutlined />}
                onClick={() => setAddOpen(true)}
              >
                {I18N.carbonFootprint.newAddition}
              </Button>,
              'supplier:add',
            )}
          </div>
        </div>
        <Tabs
          className={styles.inviteTabs}
          activeKey={`${filters.inviteStatus}`}
          items={[{ key: 'all', label: I18N.carbonFootprint3.whole }]}
          onChange={inviteStatus =>
            setFilters(value => ({ ...value, inviteStatus }))
          }
        />
      </section>
      <main
        className={classNames(styles.workspace, {
          [styles.workspaceCollapsed]: !supplierListExpanded,
        })}
      >
        <aside
          className={classNames(styles.listPanel, {
            [styles.listPanelCollapsed]: !supplierListExpanded,
          })}
        >
          <div className={styles.listHeader}>
            {supplierListExpanded && (
              <span className={styles.listHeaderTitle}>
                <IconAlibabaNew type='icon-icon-xuanzegongyingshang' />
                <span>{I18N.carbonFootprint3.supplier}</span>
              </span>
            )}
            <button
              className={styles.listExpandButton}
              type='button'
              aria-expanded={supplierListExpanded}
              aria-label={
                supplierListExpanded ? '收起供应商列表' : '展开供应商列表'
              }
              title={supplierListExpanded ? '收起供应商列表' : '展开供应商列表'}
              onClick={() => setSupplierListExpanded(value => !value)}
            >
              <img
                className={classNames(styles.listExpandIcon, {
                  [styles.listExpandIconRotated]: supplierListExpanded,
                })}
                src='/supply-dashboard/supplier-expand.svg'
                alt=''
              />
            </button>
          </div>
          <div className={styles.listBody} hidden={!supplierListExpanded}>
            <Spin spinning={loading}>
              <div className={styles.supplierList} onScroll={onSupplierScroll}>
                {!loading && supplierList.length === 0 && (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
                {supplierList.map(supplier => {
                  const editStatusPermission = !!checkPermissions(
                    true,
                    'supplier:status',
                  );
                  return (
                    <div
                      key={supplier.supplierId}
                      className={classNames(styles.supplierCard, {
                        [styles.activeSupplierCard]:
                          selectedSupplierId === supplier.supplierId,
                      })}
                      role='button'
                      tabIndex={0}
                      onClick={() => setSelectedSupplierId(supplier.supplierId)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          setSelectedSupplierId(supplier.supplierId);
                        }
                      }}
                    >
                      <div className={styles.cardHeader}>
                        <span className={styles.cardName}>
                          {supplier.companyName}
                        </span>
                        <Switch
                          size='small'
                          value={!!supplier.status}
                          disabled={
                            supplier.inviteStatus !== INVITE_STATUS.COMPLETE ||
                            !editStatusPermission
                          }
                          loading={supplier.statusLoading}
                          onClick={(_, event) => event.stopPropagation()}
                          onChange={status =>
                            toggleSupplierStatus(supplier, status)
                          }
                        />
                      </div>
                      <div className={styles.cardStatusRow}>
                        <div
                          className={classNames(styles.inviteStatus, {
                            [styles.notInviteStatus]:
                              supplier.inviteStatus ===
                              INVITE_STATUS.NOT_INVITE,
                            [styles.invitingStatus]:
                              supplier.inviteStatus === INVITE_STATUS.INVITING,
                            [styles.rejectInviteStatus]:
                              supplier.inviteStatus === INVITE_STATUS.REJECT,
                            [styles.completeInviteStatus]:
                              supplier.inviteStatus === INVITE_STATUS.COMPLETE,
                          })}
                        >
                          {INVITE_STATUS_LABEL[supplier.inviteStatus]}
                        </div>
                      </div>
                      <div
                        className={classNames(styles.cardMeta, {
                          [styles.cardMetaWithAction]:
                            supplier.inviteStatus === INVITE_STATUS.NOT_INVITE,
                        })}
                      >
                        <span className={styles.operatorBadge}>
                          <img src={operatorAvatar} alt='' />
                          <span>{supplier.updateBy || '-'}</span>
                        </span>
                        <span className={styles.updateTime}>
                          {supplier.updateTime || '-'}
                        </span>
                      </div>
                      {supplier.inviteStatus === INVITE_STATUS.NOT_INVITE && (
                        <Button
                          className={styles.inviteButton}
                          type='link'
                          onClick={event => {
                            event.stopPropagation();
                            setCurrSupplier(supplier);
                          }}
                        >
                          {I18N.supplyChain.invite}
                        </Button>
                      )}
                    </div>
                  );
                })}
                {loadingMore && (
                  <div className={styles.loadMore}>
                    <Spin size='small' />
                  </div>
                )}
              </div>
            </Spin>
          </div>
        </aside>
        <section className={styles.detailPanel}>
          {selectedSupplierId ? (
            <SupplierPanel
              supplierId={selectedSupplierId}
              onUpdated={() => {
                pendingSelectedId.current = selectedSupplierId;
                setReloadKey(value => value + 1);
              }}
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </section>
      </main>
    </div>
  );
};

export default SupplyChainManagement;
