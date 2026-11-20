import { InfoCircleOutlined } from '@ant-design/icons';
import { Empty, Form, InputNumber, message, Segmented, Spin } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import I18N from '@src/lang/I18N';

import {
  getOperationReportOverview,
  saveOperationReportPricing,
} from '../../../service';
import { OperationReportOverview } from '../../../types';
import { requestErrorMessage } from '../../../utils';
import styles from './index.module.less';

interface ReportOverviewProps {
  operationId: number;
  /** Agent 内嵌时按面板宽度适配，独立页面保留原布局。 */
  embedded?: boolean;
  readonly?: boolean;
  onDataVersionChange?: (dataVersion: number) => void;
}

interface PricingFormValue {
  certificatePriceEur: number;
  originPaidCarbonAmountEur: number;
}

const numberText = (value?: string, digits = 2, minimumDigits = digits) => {
  const number = Number(value || 0);
  return Number.isFinite(number)
    ? number.toLocaleString(undefined, {
        minimumFractionDigits: minimumDigits,
        maximumFractionDigits: digits,
      })
    : '-';
};

/** 单份运营报告的排放汇总与履约测算。 */
const ReportOverview = ({
  operationId,
  embedded = false,
  readonly = false,
  onDataVersionChange,
}: ReportOverviewProps) => {
  const [form] = Form.useForm<PricingFormValue>();
  const [overview, setOverview] = useState<OperationReportOverview>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pricingDirty, setPricingDirty] = useState(false);
  const [activeProduct, setActiveProduct] = useState<string>();

  /** 加载当前报告概览。 */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getOperationReportOverview(operationId);
      const value = response.data?.data;
      setOverview(value);
      if (value) {
        form.setFieldsValue({
          certificatePriceEur: Number(value.certificatePriceEur),
          originPaidCarbonAmountEur: Number(value.originPaidCarbonAmountEur),
        });
        setPricingDirty(false);
        setActiveProduct(value.products?.[0]?.itemKey || '0');
      }
    } catch (error) {
      message.error(
        requestErrorMessage(
          error,
          I18N.cbamOperationReport.reportOverviewLoadFailed,
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [form, operationId]);

  useEffect(() => {
    load();
  }, [load]);

  /** 保存报告级独立价格，并使用后端返回值刷新测算。 */
  const savePricing = async () => {
    if (!overview || !pricingDirty || saving) return;
    setSaving(true);
    try {
      const values = await form.validateFields();
      const response = await saveOperationReportPricing({
        operationId,
        dataVersion: overview.dataVersion,
        ...values,
      });
      const value = response.data?.data;
      if (value) {
        setOverview(value);
        setPricingDirty(false);
        onDataVersionChange?.(value.dataVersion);
      }
      message.success(I18N.cbamOperationReport.priceSaveSuccess);
    } catch (error) {
      message.error(
        requestErrorMessage(error, I18N.cbamOperationReport.priceSaveFailed),
      );
    } finally {
      setSaving(false);
    }
  };

  const activeItem = useMemo(
    () =>
      overview?.products?.find(
        (item, index) => (item.itemKey || String(index)) === activeProduct,
      ) || overview?.products?.[0],
    [activeProduct, overview],
  );

  const metrics = [
    [I18N.cbamOperationReport.directEmission, overview?.directEmission],
    [I18N.cbamOperationReport.indirectEmission, overview?.indirectEmission],
    [
      I18N.cbamOperationReport.precursorInputEmission,
      overview?.precursorInputEmission,
    ],
    [
      I18N.cbamOperationReport.totalEmbeddedEmission,
      overview?.totalEmbeddedEmission,
    ],
  ];

  if (!loading && !overview)
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;

  return (
    <Spin spinning={loading}>
      <div className={`${styles.page} ${embedded ? styles.embedded : ''}`}>
        <section className={styles.metricGrid}>
          {metrics.map(([label, value]) => (
            <article className={styles.metricItem} key={label}>
              <span>{label}</span>
              <div>
                <strong>{numberText(value, 3, 0)}</strong>
                <small>tCO₂e</small>
              </div>
            </article>
          ))}
        </section>

        {overview && activeItem ? (
          <section className={styles.complianceSection}>
            <div className={styles.stepHeader}>
              <div>
                <b>01</b>
                <span>
                  {I18N.cbamOperationReport.determineChargeableEmission}
                </span>
                <strong>{numberText(overview.chargeableEmission, 1)}</strong>
                <small>tCO₂e</small>
              </div>
              <Segmented
                value={activeProduct}
                onChange={value => setActiveProduct(String(value))}
                options={overview.products.map((item, index) => ({
                  value: item.itemKey || String(index),
                  label: `${
                    item.productName || item.cnCode || index + 1
                  }  ${numberText(item.chargeableEmission, 1)} tCO₂e`,
                }))}
              />
            </div>

            <div className={styles.formulaRow}>
              <div>
                <span>{I18N.cbamOperationReport.specificEmbeddedEmission}</span>
                <strong>
                  {numberText(activeItem.specificEmbeddedEmission, 4)}
                </strong>
                <small>tCO₂e/t产品</small>
              </div>
              <em>×</em>
              <div>
                <span>{I18N.cbamOperationReport.expectedImportQuantity}</span>
                <strong>
                  {numberText(activeItem.expectedImportQuantity, 0)}
                </strong>
                <small>{activeItem.unit || 't产品'}</small>
              </div>
              <em>=</em>
              <div>
                <span>{I18N.cbamOperationReport.declaredEmbeddedEmission}</span>
                <strong>
                  {numberText(activeItem.declaredEmbeddedEmission, 1)}
                </strong>
                <small>tCO₂e</small>
              </div>
            </div>

            <div className={styles.formulaRow}>
              <div>
                <span>{I18N.cbamOperationReport.unitFreeAllocation}</span>
                <strong>{numberText(activeItem.unitFreeAllocation, 4)}</strong>
                <small>tCO₂e/t产品</small>
              </div>
              <em>×</em>
              <div>
                <span>{I18N.cbamOperationReport.expectedImportQuantity}</span>
                <strong>
                  {numberText(activeItem.expectedImportQuantity, 0)}
                </strong>
                <small>{activeItem.unit || 't产品'}</small>
              </div>
              <em>=</em>
              <div>
                <span>{I18N.cbamOperationReport.freeAllocationAdjustment}</span>
                <strong>
                  {numberText(activeItem.freeAllocationAdjustment, 1)}
                </strong>
                <small>tCO₂e</small>
              </div>
            </div>

            <div className={styles.formulaRow}>
              <div>
                <span>{I18N.cbamOperationReport.declaredEmbeddedEmission}</span>
                <strong>
                  {numberText(activeItem.declaredEmbeddedEmission, 1)}
                </strong>
                <small>tCO₂e</small>
              </div>
              <em>−</em>
              <div>
                <span>{I18N.cbamOperationReport.freeAllocationAdjustment}</span>
                <strong>
                  {numberText(activeItem.freeAllocationAdjustment, 1)}
                </strong>
                <small>tCO₂e</small>
              </div>
              <em>=</em>
              <div>
                <span>{I18N.cbamOperationReport.chargeableEmission}</span>
                <strong>{numberText(activeItem.chargeableEmission, 1)}</strong>
                <small>tCO₂e</small>
              </div>
            </div>

            <div className={styles.costGrid}>
              <section>
                <h4>
                  <b>02</b>
                  {I18N.cbamOperationReport.originPriceDeductionStep}
                </h4>
                <Spin spinning={saving}>
                  <Form
                    form={form}
                    className={styles.pricingForm}
                    disabled={readonly}
                    onValuesChange={() => setPricingDirty(true)}
                  >
                    <div className={styles.priceRow}>
                      <span>{I18N.cbamOperationReport.certificatePrice}</span>
                      <Form.Item
                        name='certificatePriceEur'
                        rules={[{ required: true }, { type: 'number', min: 0 }]}
                      >
                        <InputNumber
                          min={0}
                          precision={2}
                          controls={false}
                          addonAfter='EUR/tCO₂e'
                          onBlur={savePricing}
                        />
                      </Form.Item>
                    </div>
                    <div className={styles.costFormula}>
                      <span>
                        {I18N.cbamOperationReport.costBeforeDeduction}
                      </span>
                      <strong>
                        {numberText(overview.certificatePriceEur)} ×{' '}
                        {numberText(overview.chargeableEmission, 1)} = €
                        {numberText(overview.costBeforeDeduction)}
                      </strong>
                    </div>
                    <div className={styles.priceRow}>
                      <div className={styles.priceLabel}>
                        <span>
                          {I18N.cbamOperationReport.originPaidCarbonAmount}
                        </span>
                        <small>
                          <InfoCircleOutlined />
                          {I18N.cbamOperationReport.paidCarbonPriceHint}
                        </small>
                      </div>
                      <Form.Item
                        name='originPaidCarbonAmountEur'
                        rules={[{ required: true }, { type: 'number', min: 0 }]}
                      >
                        <InputNumber
                          min={0}
                          precision={2}
                          controls={false}
                          addonAfter='EUR'
                          onBlur={savePricing}
                        />
                      </Form.Item>
                    </div>
                  </Form>
                </Spin>
              </section>

              <section>
                <h4>
                  <b>03</b>
                  {I18N.cbamOperationReport.estimatedTaxResult}
                </h4>
                <div className={styles.resultBanner}>
                  <span>
                    {I18N.cbamOperationReport.originCarbonPriceDeduction}：€
                    {numberText(overview.costBeforeDeduction)} − €
                    {numberText(overview.originCarbonPriceDeduction)}
                  </span>
                  <strong>
                    € {numberText(overview.estimatedComplianceCost, 0)}
                  </strong>
                </div>
                <div className={styles.estimateNotice}>
                  <div>
                    <InfoCircleOutlined />
                    <span>
                      {I18N.cbamOperationReport.complianceEstimateNoticeTitle}
                    </span>
                  </div>
                  <p>
                    {I18N.cbamOperationReport.complianceEstimateNoticeContent}
                  </p>
                </div>
              </section>
            </div>
          </section>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </div>
    </Spin>
  );
};

export default ReportOverview;
