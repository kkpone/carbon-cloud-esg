import {
  Alert,
  Empty,
  Form,
  InputNumber,
  message,
  Segmented,
  Select,
  Spin,
} from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import I18N from '@src/lang/I18N';

import {
  getOperationReportOverview,
  saveOperationReportPricing,
} from '@/views/cbamOperationReport/service';
import { requestErrorMessage } from '@/views/cbamOperationReport/utils';

import EmissionChart from './components/EmissionChart';
import {
  getDataOverviewOptions,
  getDataOverviewSummary,
  getFacilityEmissions,
  getPrecursorEmissions,
  getProductEmissions,
  getTaxTrend,
} from './service';
import {
  DataOverviewCompliance,
  DataOverviewEmission,
  DataOverviewOptions,
  DataOverviewSummary,
  DataOverviewTrend,
} from './types';
import styles from './index.module.less';

const EMPTY_OPTIONS: DataOverviewOptions = {
  defaultYear: new Date().getFullYear(),
  years: [],
  reports: [],
  facilities: [],
  products: [],
  precursors: [],
  trendProducts: [],
};

const formatted = (value?: string, digits = 2) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

interface PricingFormValue {
  certificatePriceEur: number;
  originPaidCarbonAmountEur: number;
}

/** 构造年度单位碳税折线。 */
const createTrendSeries = (name: string, color: string, data: number[]) => ({
  name,
  type: 'line',
  smooth: true,
  connectNulls: true,
  showSymbol: true,
  symbol: 'circle',
  symbolSize: 6,
  lineStyle: { width: 1, color },
  itemStyle: {
    color: '#fff',
    borderColor: color,
    borderWidth: 1,
  },
  data,
});

/** CBAM企业级数据概览。 */
const CbamOverview = () => {
  const [pricingForm] = Form.useForm<PricingFormValue>();
  const selectedReportIdRef = useRef<string | undefined>(undefined);
  const [options, setOptions] = useState<DataOverviewOptions>(EMPTY_OPTIONS);
  const [year, setYear] = useState<number>();
  const [reportId, setReportId] = useState<string>();
  const [facilityId, setFacilityId] = useState<string>();
  const [productCn, setProductCn] = useState<string>();
  const [precursorCn, setPrecursorCn] = useState<string>();
  const [trendCn, setTrendCn] = useState<string>();
  const [summary, setSummary] = useState<DataOverviewSummary>();
  const [compliance, setCompliance] = useState<DataOverviewCompliance>();
  const [activeProductKey, setActiveProductKey] = useState<string>();
  const [facilityData, setFacilityData] = useState<DataOverviewEmission[]>([]);
  const [productData, setProductData] = useState<DataOverviewEmission[]>([]);
  const [precursorData, setPrecursorData] = useState<DataOverviewEmission[]>(
    [],
  );
  const [trendData, setTrendData] = useState<DataOverviewTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricingDirty, setPricingDirty] = useState(false);

  /** 加载指定年度的筛选项与汇总卡片。 */
  const loadYear = useCallback(async (selectedYear: number) => {
    setLoading(true);
    try {
      const [optionResponse, summaryResponse] = await Promise.all([
        getDataOverviewOptions(selectedYear),
        getDataOverviewSummary(selectedYear),
      ]);
      const nextOptions = optionResponse.data?.data || EMPTY_OPTIONS;
      setOptions(nextOptions);
      setSummary(summaryResponse.data?.data);
      setReportId(nextOptions.reports[0]?.value);
      setFacilityId(nextOptions.facilities[0]?.value);
      setProductCn(nextOptions.products[0]?.value);
      setPrecursorCn(nextOptions.precursors[0]?.value);
      setTrendCn(current => current || nextOptions.trendProducts[0]?.value);
    } catch (error) {
      message.error(
        requestErrorMessage(error, I18N.cbamOperationReport.overviewLoadFailed),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getDataOverviewOptions()
      .then(optionResponse => {
        const initialOptions = optionResponse.data?.data || EMPTY_OPTIONS;
        const initialYear = initialOptions.defaultYear;
        setYear(initialYear);
        setTrendCn(initialOptions.trendProducts[0]?.value);
        loadYear(initialYear);
      })
      .catch(error => {
        setLoading(false);
        message.error(
          requestErrorMessage(
            error,
            I18N.cbamOperationReport.overviewLoadFailed,
          ),
        );
      });
  }, [loadYear]);

  useEffect(() => {
    selectedReportIdRef.current = reportId;
    setCompliance(undefined);
    setPricingDirty(false);
    pricingForm.resetFields();
    if (!reportId) return;
    let active = true;
    getOperationReportOverview(Number(reportId))
      .then(response => {
        if (!active) return;
        const value = response.data?.data;
        setCompliance(value);
        setActiveProductKey(value?.products?.[0]?.itemKey || '0');
      })
      .catch(error => {
        if (!active) return;
        message.error(
          requestErrorMessage(
            error,
            I18N.cbamOperationReport.overviewLoadFailed,
          ),
        );
      });
    return () => {
      active = false;
    };
  }, [pricingForm, reportId]);

  useEffect(() => {
    if (!compliance) return;
    pricingForm.setFieldsValue({
      certificatePriceEur: Number(compliance.certificatePriceEur),
      originPaidCarbonAmountEur: Number(compliance.originPaidCarbonAmountEur),
    });
  }, [compliance, pricingForm]);

  useEffect(() => {
    if (!year || !facilityId) return setFacilityData([]);
    getFacilityEmissions(year, Number(facilityId)).then(response =>
      setFacilityData(response.data?.data || []),
    );
  }, [facilityId, year]);

  useEffect(() => {
    if (!year || !productCn) return setProductData([]);
    getProductEmissions(year, productCn).then(response =>
      setProductData(response.data?.data || []),
    );
  }, [productCn, year]);

  useEffect(() => {
    if (!year || !precursorCn) return setPrecursorData([]);
    getPrecursorEmissions(year, precursorCn).then(response =>
      setPrecursorData(response.data?.data || []),
    );
  }, [precursorCn, year]);

  useEffect(() => {
    if (!trendCn) return setTrendData([]);
    getTaxTrend(trendCn).then(response =>
      setTrendData(response.data?.data || []),
    );
  }, [trendCn]);

  /** 保存所选运营报告的履约价格，并刷新依赖价格的汇总和趋势。 */
  const savePricing = async () => {
    if (!reportId || !compliance || !pricingDirty || saving) return;
    setSaving(true);
    try {
      const values = await pricingForm.validateFields();
      const pricingResponse = await saveOperationReportPricing({
        operationId: Number(reportId),
        dataVersion: compliance.dataVersion,
        ...values,
      });
      const value = pricingResponse.data?.data;
      if (selectedReportIdRef.current === reportId) {
        if (value) setCompliance(value);
        setPricingDirty(false);
      }
      if (year) {
        const response = await getDataOverviewSummary(year);
        setSummary(response.data?.data);
      }
      if (trendCn) {
        const response = await getTaxTrend(trendCn);
        setTrendData(response.data?.data || []);
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

  const trendOption = useMemo(
    () => ({
      color: ['#0cbf9f', '#aa92ef'],
      tooltip: { trigger: 'axis' },
      legend: {
        type: 'scroll',
        top: 0,
        left: 'center',
        itemWidth: 16,
        itemHeight: 6,
        itemGap: 40,
        textStyle: { color: '#04252b', fontSize: 12, lineHeight: 20 },
      },
      // 单位文案使用独立纵向区域，刻度宽度由 ECharts 自动预留。
      grid: { left: 12, right: 16, top: 50, bottom: 16, containLabel: true },
      xAxis: {
        type: 'category',
        data: trendData.map(item => String(item.year)),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e7eaee' } },
        axisLabel: {
          margin: 12,
          color: '#6c757d',
          fontSize: 12,
          lineHeight: 18,
        },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#6c757d',
          fontSize: 12,
          formatter: (axisValue: number) => axisValue.toLocaleString(),
        },
        splitLine: { lineStyle: { color: '#e7eaee' } },
      },
      series: [
        createTrendSeries(
          I18N.cbamOperationReport.taxBeforeDeduction,
          '#0cbf9f',
          trendData.map(item => Number(item.costBeforeDeduction || 0)),
        ),
        createTrendSeries(
          I18N.cbamOperationReport.expectedTax,
          '#aa92ef',
          trendData.map(item => Number(item.estimatedTax || 0)),
        ),
      ],
    }),
    [trendData],
  );

  const summaryCards = [
    {
      label: I18N.cbamOperationReport.includedFacilities,
      value: String(summary?.facilityCount || 0),
      unit: I18N.cbamOperationReport.facilityCountUnit,
      tone: 'blue',
    },
    {
      label: I18N.cbamOperationReport.exportedProducts,
      value: String(summary?.productCount || 0),
      unit: I18N.cbamOperationReport.productCategoryUnit,
      tone: 'green',
    },
    {
      label: I18N.cbamOperationReport.totalEmbeddedEmission,
      value: formatted(summary?.totalEmbeddedEmission, 1),
      unit: 'tCO₂e',
      tone: 'purple',
    },
    {
      label: I18N.cbamOperationReport.estimatedTax,
      value: formatted(summary?.estimatedTax),
      unit: I18N.cbamOperationReport.euroUnit,
      tone: 'orange',
    },
  ];
  const activeProduct =
    compliance?.products?.find(
      (item, index) => (item.itemKey || String(index)) === activeProductKey,
    ) || compliance?.products?.[0];

  return (
    <Spin spinning={loading}>
      <div className={styles.page}>
        <section className={styles.summarySection}>
          <header className={styles.pageHeader}>
            <h2>{I18N.cbamOperationReport.dataOverview}</h2>
            <Select
              className={styles.yearSelect}
              value={year}
              suffixIcon={<span className={styles.yearArrow}>⌄</span>}
              options={options.years.map(item => ({
                label: `${item.label}${I18N.cbamOperationReport.yearUnit}`,
                value: Number(item.value),
              }))}
              onChange={value => {
                setYear(value);
                loadYear(value);
              }}
            />
          </header>
          <div className={styles.metricGrid}>
            {summaryCards.map(item => (
              <article className={styles[item.tone]} key={item.label}>
                <span>{item.label}</span>
                <div>
                  <strong>{item.value}</strong>
                  <small>{item.unit}</small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className={styles.content}>
          <section className={styles.complianceCard}>
            <div className={styles.cardHeader}>
              <h3>
                <i />
                {I18N.cbamOperationReport.taxForecastAndCompliance}
              </h3>
              <Select
                value={reportId}
                options={options.reports}
                placeholder={I18N.cbamOperationReport.selectReport}
                onChange={setReportId}
              />
            </div>
            <Alert
              className={styles.notice}
              type='warning'
              showIcon
              closable
              message={I18N.cbamOperationReport.overviewDisclaimer}
            />
            {compliance && activeProduct ? (
              <div className={styles.calculationBody}>
                <div className={styles.stepHeader}>
                  <div>
                    <b>01</b>
                    <span>
                      {I18N.cbamOperationReport.determineChargeableEmission}
                    </span>
                    <strong>
                      {formatted(compliance.chargeableEmission, 1)}
                    </strong>
                    <small>tCO₂e</small>
                  </div>
                  <Segmented
                    value={activeProductKey}
                    onChange={value => setActiveProductKey(String(value))}
                    options={compliance.products.map((item, index) => ({
                      value: item.itemKey || String(index),
                      label: `${
                        item.productName || item.cnCode || index + 1
                      }  ${formatted(item.chargeableEmission, 1)} tCO₂e`,
                    }))}
                  />
                </div>
                <div className={styles.formulaRow}>
                  <div>
                    <span>
                      {I18N.cbamOperationReport.specificEmbeddedEmission}
                    </span>
                    <strong>
                      {formatted(activeProduct.specificEmbeddedEmission, 4)}
                    </strong>
                    <small>tCO₂e/t产品</small>
                  </div>
                  <em>×</em>
                  <div>
                    <span>
                      {I18N.cbamOperationReport.expectedImportQuantity}
                    </span>
                    <strong>
                      {formatted(activeProduct.expectedImportQuantity, 0)}
                    </strong>
                    <small>{activeProduct.unit || 't产品'}</small>
                  </div>
                  <em>=</em>
                  <div>
                    <span>
                      {I18N.cbamOperationReport.declaredEmbeddedEmission}
                    </span>
                    <strong>
                      {formatted(activeProduct.declaredEmbeddedEmission, 1)}
                    </strong>
                    <small>tCO₂e</small>
                  </div>
                </div>
                <div className={styles.formulaRow}>
                  <div>
                    <span>{I18N.cbamOperationReport.unitFreeAllocation}</span>
                    <strong>
                      {formatted(activeProduct.unitFreeAllocation, 4)}
                    </strong>
                    <small>tCO₂e/t产品</small>
                  </div>
                  <em>×</em>
                  <div>
                    <span>
                      {I18N.cbamOperationReport.expectedImportQuantity}
                    </span>
                    <strong>
                      {formatted(activeProduct.expectedImportQuantity, 0)}
                    </strong>
                    <small>{activeProduct.unit || 't产品'}</small>
                  </div>
                  <em>=</em>
                  <div>
                    <span>
                      {I18N.cbamOperationReport.freeAllocationAdjustment}
                    </span>
                    <strong>
                      {formatted(activeProduct.freeAllocationAdjustment, 1)}
                    </strong>
                    <small>tCO₂e</small>
                  </div>
                </div>
                <div className={styles.formulaRow}>
                  <div>
                    <span>
                      {I18N.cbamOperationReport.declaredEmbeddedEmission}
                    </span>
                    <strong>
                      {formatted(activeProduct.declaredEmbeddedEmission, 1)}
                    </strong>
                    <small>tCO₂e</small>
                  </div>
                  <em>−</em>
                  <div>
                    <span>
                      {I18N.cbamOperationReport.freeAllocationAdjustment}
                    </span>
                    <strong>
                      {formatted(activeProduct.freeAllocationAdjustment, 1)}
                    </strong>
                    <small>tCO₂e</small>
                  </div>
                  <em>=</em>
                  <div>
                    <span>{I18N.cbamOperationReport.chargeableEmission}</span>
                    <strong>
                      {formatted(activeProduct.chargeableEmission, 1)}
                    </strong>
                    <small>tCO₂e</small>
                  </div>
                </div>
                <div className={styles.costGrid}>
                  <section>
                    <h4>
                      <b>02</b>
                      {I18N.cbamOperationReport.originPriceDeductionStep}
                    </h4>
                    <Form
                      form={pricingForm}
                      className={styles.pricingForm}
                      onValuesChange={() => setPricingDirty(true)}
                    >
                      <div className={styles.priceRow}>
                        <span>{I18N.cbamOperationReport.certificatePrice}</span>
                        <Form.Item
                          name='certificatePriceEur'
                          rules={[
                            { required: true },
                            { type: 'number', min: 0 },
                          ]}
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
                          {formatted(compliance.certificatePriceEur)} ×{' '}
                          {formatted(compliance.chargeableEmission, 1)} = €
                          {formatted(compliance.costBeforeDeduction)}
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
                          rules={[
                            { required: true },
                            { type: 'number', min: 0 },
                          ]}
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
                  </section>
                  <section>
                    <h4>
                      <b>03</b>
                      {I18N.cbamOperationReport.estimatedTaxResult}
                    </h4>
                    <div className={styles.resultBanner}>
                      <span>
                        {I18N.cbamOperationReport.originCarbonPriceDeduction}：€
                        {formatted(compliance.costBeforeDeduction)} − €
                        {formatted(compliance.originCarbonPriceDeduction)}
                      </span>
                      <strong>
                        € {formatted(compliance.estimatedComplianceCost, 0)}
                      </strong>
                    </div>
                    <div className={styles.estimateNotice}>
                      <div>
                        <InfoCircleOutlined />
                        <span>
                          {
                            I18N.cbamOperationReport
                              .complianceEstimateNoticeTitle
                          }
                        </span>
                      </div>
                      <p>
                        {
                          I18N.cbamOperationReport
                            .complianceEstimateNoticeContent
                        }
                      </p>
                    </div>
                  </section>
                </div>
              </div>
            ) : (
              <Empty
                description={I18N.cbamOperationReport.noCompletedReport}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </section>

          <EmissionChart
            title={I18N.cbamOperationReport.facilityProductEmission}
            placeholder={I18N.cbamOperationReport.selectFacility}
            value={facilityId}
            options={options.facilities}
            data={facilityData}
            singleSeries
            onChange={setFacilityId}
          />
          <EmissionChart
            title={I18N.cbamOperationReport.productEmissionComparison}
            placeholder={I18N.cbamOperationReport.selectProduct}
            value={productCn}
            options={options.products}
            data={productData}
            selectWidth={254}
            onChange={setProductCn}
          />
          <EmissionChart
            title={I18N.cbamOperationReport.precursorEmissionComparison}
            placeholder={I18N.cbamOperationReport.selectPrecursor}
            value={precursorCn}
            options={options.precursors}
            data={precursorData}
            selectWidth={254}
            onChange={setPrecursorCn}
          />
          <section className={styles.trendCard}>
            <div className={styles.cardHeader}>
              <h3>
                <i />
                {I18N.cbamOperationReport.annualUnitTaxTrend}
              </h3>
              <Select
                value={trendCn}
                options={options.trendProducts}
                placeholder={I18N.cbamOperationReport.selectProduct}
                onChange={setTrendCn}
              />
            </div>
            {trendData.length ? (
              <div className={styles.trendPlot}>
                <span className={styles.trendAxisName}>
                  {I18N.cbamOperationReport.unitProductAmount}
                </span>
                <ReactECharts
                  option={trendOption}
                  className={styles.trendChart}
                />
              </div>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </section>
        </div>
      </div>
    </Spin>
  );
};

export default CbamOverview;
