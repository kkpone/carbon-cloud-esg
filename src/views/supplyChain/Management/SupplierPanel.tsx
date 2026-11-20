import { Form } from '@formily/core';
import { checkPermissions } from '@src/components/Permission/utils';
import I18N from '@src/lang/I18N';
import { RouteMapsSupplyChain2 } from '@src/router/route-paths/supplyChain2';
import { Toast } from '@src/utils/Toast';
import { Button, Spin, Tabs } from 'antd';
import classNames from 'classnames';
import { isNil, omit } from 'lodash-es';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { IconAlibabaNew } from '@/components/iconfont';

import styles from './SupplierPanel.module.less';
import basicInfoExpand from './assets/basic-info-expand.svg';
import ProductEmissionCompare from '../Supplier/components/ProductEmissionCompare';
import SupplierDetails from '../Supplier/components/SupplierDetails';
import SupplierEnterpriseCarbonOverview from '../Supplier/components/SupplierEnterpriseCarbonOverview';
import SupplierProductCarbonOverview from '../Supplier/components/SupplierProductCarbonOverview';
import SupplierProductTable from '../Supplier/components/SupplierProductTable';
import { getRecordList, getSupplierTaskSummary } from '../Supplier/service';
import type { SupplierTaskSummary } from '../Supplier/type';
import RecordDrawer from '../components/RecordDrawer';
import { INVITE_STATUS } from '../constant';
import { editSupplier, getSupplierDetails } from '../service';
import type { SupplierDetails as SupplierDetailsType } from '../type';

const TAB_KEYS = {
  PRODUCT_CARBON: 'PRODUCT_CARBON',
  ENTERPRISE_CARBON: 'ENTERPRISE_CARBON',
  PRODUCT_TABLE: 'PRODUCT_TABLE',
};

type SupplierPanelProps = {
  supplierId: number;
  onUpdated: () => void;
};

const EMPTY_SUMMARY: SupplierTaskSummary = {
  product: { processingCount: 0, completedCount: 0 },
  enterprise: { processingCount: 0, completedCount: 0 },
};

const SupplierPanel: FC<SupplierPanelProps> = ({ supplierId, onUpdated }) => {
  const history = useHistory();
  const supplierFormRef = useRef<Form>(null);
  const loadSequence = useRef(0);
  const productUpdaterRef = useRef<{
    addProduct: () => void;
    selectProduct: () => void;
  }>(null);
  const [supplierDetails, setSupplierDetails] = useState<SupplierDetailsType>();
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [recordList, setRecordList] = useState<Record<string, any>[]>([]);
  const [recordDrawerOpen, setRecordDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [tabKey, setTabKey] = useState(TAB_KEYS.PRODUCT_CARBON);
  const [infoExpanded, setInfoExpanded] = useState(false);

  /** 加载供应商详情、邀请记录和任务汇总 */
  const loadSupplier = useCallback(() => {
    loadSequence.current += 1;
    const sequence = loadSequence.current;
    setLoading(true);
    Promise.all([
      getSupplierDetails({ supplierId }),
      getRecordList({ supplierId }),
      getSupplierTaskSummary({ supplierId }),
    ])
      .then(([detailResp, recordResp, summaryResp]) => {
        if (sequence !== loadSequence.current) {
          return;
        }
        const detail = detailResp.data.data;
        setSupplierDetails({
          ...detail,
          area:
            typeof detail.area === 'string'
              ? JSON.parse(detail.area)
              : detail.area,
        });
        setRecordList(
          (recordResp.data.data || []).map(record => {
            let type = 'initiate';
            if (record.inviteStatus === INVITE_STATUS.REJECT) {
              type = 'fail';
            } else if (record.inviteStatus === INVITE_STATUS.COMPLETE) {
              type = 'success';
            }
            return {
              type,
              name: record.updateName,
              time: record.updateTime,
              operateDesc: record.inviteDesc,
            };
          }),
        );
        setSummary(summaryResp.data.data || EMPTY_SUMMARY);
      })
      .finally(() => {
        if (sequence === loadSequence.current) {
          setLoading(false);
        }
      });
  }, [supplierId]);

  /** 保存供应商详情或重新发起邀请 */
  const submit = async (inviteFlag?: boolean) => {
    const form = supplierFormRef.current;
    if (isNil(form)) {
      return;
    }
    const formValues = await form.submit<SupplierDetailsType>();
    const supplierValues = {
      ...formValues,
      supplierIdName: omit(formValues.supplierIdName, 'isManualInput'),
      area: formValues.area ? JSON.stringify(formValues.area) : undefined,
    };
    try {
      setSubmitLoading(true);
      await editSupplier({ ...supplierValues, inviteFlag });
      Toast(
        'success',
        inviteFlag
          ? I18N.supplyChain.invitationSuccessful
          : I18N.carbonFootprint.saveSuccessful,
      );
      setEditing(false);
      loadSupplier();
      onUpdated();
    } finally {
      setSubmitLoading(false);
    }
  };

  useEffect(() => {
    setEditing(false);
    setInfoExpanded(false);
    setSupplierDetails(undefined);
    setSummary(EMPTY_SUMMARY);
    setRecordList([]);
    setRecordDrawerOpen(false);
    loadSupplier();
    return () => {
      loadSequence.current += 1;
    };
  }, [loadSupplier]);

  const supplierName = supplierDetails?.supplierIdName?.companyName || '';
  const canInvite =
    supplierDetails && supplierDetails.inviteStatus !== INVITE_STATUS.COMPLETE;

  return (
    <Spin spinning={loading}>
      <RecordDrawer
        title={I18N.supplyChain.invitationRecord}
        open={recordDrawerOpen}
        recordList={recordList}
        onClose={() => setRecordDrawerOpen(false)}
      />
      <section className={styles.overviewSection}>
        <div className={styles.panelHeader}>
          <div className={styles.supplierName}>{supplierName}</div>
          <Button
            className={styles.viewAction}
            type='link'
            onClick={() =>
              history.push({
                pathname: RouteMapsSupplyChain2.supplyChainCarbonDataFillList,
                search: `?search=${encodeURIComponent(supplierName)}`,
              })
            }
          >
            {I18N.carbonFootprint.check}
          </Button>
        </div>
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <div className={styles.summaryTitle}>
              {I18N.supplyChain2.productCarbonCollectionTask}
            </div>
            <div className={styles.summaryCounts}>
              <span>
                <strong>{summary.product.processingCount}</strong>
                {I18N.components.inProgress}
              </span>
              <span>
                <strong>{summary.product.completedCount}</strong>
                {I18N.components.completed}
              </span>
            </div>
          </div>
          <div className={styles.summaryItem}>
            <div className={styles.summaryTitle}>
              {I18N.supplyChain2.enterpriseCarbonCollectionTask}
            </div>
            <div className={styles.summaryCounts}>
              <span>
                <strong>{summary.enterprise.processingCount}</strong>
                {I18N.components.inProgress}
              </span>
              <span>
                <strong>{summary.enterprise.completedCount}</strong>
                {I18N.components.completed}
              </span>
            </div>
          </div>
        </div>
        <section className={styles.infoSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              {I18N.carbonFootprint.basicInformation}
            </div>
            <div className={styles.actions}>
              <Button
                className={styles.recordAction}
                type='text'
                icon={<IconAlibabaNew type='icon-icon-yaoqingjilu' />}
                onClick={() => setRecordDrawerOpen(true)}
              >
                {I18N.supplyChain.invitationRecord}
              </Button>
              {editing ? (
                <div className={styles.editActions}>
                  <Button
                    className={styles.saveAction}
                    type='link'
                    loading={submitLoading}
                    onClick={() => submit()}
                  >
                    {I18N.carbonFootprint.preserve}
                  </Button>
                  <Button
                    className={styles.cancelAction}
                    type='link'
                    onClick={() => setEditing(false)}
                  >
                    {I18N.carbonFootprint.cancel}
                  </Button>
                </div>
              ) : (
                infoExpanded &&
                checkPermissions(
                  <Button
                    className={styles.editAction}
                    type='text'
                    onClick={() => setEditing(true)}
                  >
                    {I18N.carbonFootprint.edit}
                  </Button>,
                  'supplier:edit',
                )
              )}
              {!editing && canInvite && (
                <Button loading={submitLoading} onClick={() => submit(true)}>
                  {supplierDetails?.inviteStatus === INVITE_STATUS.NOT_INVITE
                    ? I18N.supplyChain.invite
                    : I18N.supplyChain.reInvite}
                </Button>
              )}
            </div>
          </div>
          {supplierDetails && (
            <SupplierDetails
              isAdd={false}
              readPretty={!editing}
              supplierDetails={supplierDetails}
              className={classNames(styles.basicInfoForm, {
                [styles.basicInfoFormCollapsed]: !infoExpanded,
              })}
              colon={false}
              ref={supplierFormRef}
            />
          )}
          {supplierDetails && (
            <button
              className={styles.infoExpandButton}
              type='button'
              aria-expanded={infoExpanded}
              aria-label={infoExpanded ? '收起基本信息' : '展开基本信息'}
              title={infoExpanded ? '收起基本信息' : '展开基本信息'}
              onClick={() => setInfoExpanded(value => !value)}
            >
              <img
                className={classNames(styles.infoExpandIcon, {
                  [styles.infoExpandIconOpen]: infoExpanded,
                })}
                src={basicInfoExpand}
                alt=''
              />
            </button>
          )}
        </section>
      </section>
      <section className={styles.dataSection}>
        <div className={styles.tabHeader}>
          <Tabs
            activeKey={tabKey}
            items={[
              {
                key: TAB_KEYS.PRODUCT_CARBON,
                label: I18N.supplyChain2.productCarbonData,
              },
              {
                key: TAB_KEYS.ENTERPRISE_CARBON,
                label: I18N.supplyChain2.enterpriseCarbonData,
              },
              {
                key: TAB_KEYS.PRODUCT_TABLE,
                label: I18N.carbonFootprint3.purchasingProducts,
              },
            ]}
            onChange={setTabKey}
          />
          {tabKey === TAB_KEYS.PRODUCT_TABLE &&
            checkPermissions(
              <Button
                type='text'
                icon={<IconAlibabaNew type='icon-icon-xuanzechanpin' />}
                onClick={() => productUpdaterRef.current?.selectProduct()}
              >
                {I18N.carbonFootprint.selectProduct}
              </Button>,
              'supplier:choose:goods',
            )}
        </div>
        {tabKey === TAB_KEYS.PRODUCT_CARBON && (
          <>
            <ProductEmissionCompare supplierId={supplierId} />
            <SupplierProductCarbonOverview supplierId={supplierId} />
          </>
        )}
        {tabKey === TAB_KEYS.ENTERPRISE_CARBON && (
          <SupplierEnterpriseCarbonOverview supplierId={supplierId} />
        )}
        {tabKey === TAB_KEYS.PRODUCT_TABLE && (
          <SupplierProductTable id={supplierId} ref={productUpdaterRef} />
        )}
      </section>
    </Spin>
  );
};

export default SupplierPanel;
